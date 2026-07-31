import { NextResponse } from "next/server";
import { denyAgent } from "@/lib/api/agentAuth";
import { enqueueCampaign, workerKey } from "@/lib/agent/campaigns";
import { screen } from "@/lib/agent/screen";

// POST /api/agent/campaigns — dépose une question dans la file de l'avatar.
//
// C'est la COUTURE du système : ce que le rédacteur (un modèle, plus tard) doit
// produire, et rien d'autre. Tant qu'il n'existe pas, on dépose à la main et la
// boucle tourne quand même de bout en bout — publication, clôture, analyse.
//
// La source n'accepte QU'un lien et un nom d'éditeur. Ni titre, ni chapô, ni
// résumé : le droit voisin ne couvre ni les liens ni les faits, mais l'exception
// « très courts extraits » tombe dès que la reprise dispense de consulter la
// source. Le schéma n'a d'ailleurs aucune colonne où les mettre.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    usage:
      "POST (Authorization: Bearer <AGENT_KEY>) { question, options: string[], method?, sourceUrl?, sourcePublisher?, publishAt?, closeAt? }",
    note: "La question est passée au filtre des catégories interdites AVANT d'entrer en file, puis à nouveau juste avant publication.",
    source:
      "sourceUrl et sourcePublisher uniquement. Aucun titre ni résumé de presse n'est accepté ni stocké.",
  });
}

export async function POST(req: Request) {
  const denied = denyAgent(req);
  if (denied) return denied;

  const key = workerKey();
  if (!key) return NextResponse.json({ error: "agent_worker_disabled" }, { status: 503 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;

  const question = typeof b.question === "string" ? b.question.trim() : "";
  const options = Array.isArray(b.options)
    ? b.options.map((o) => String(o).trim()).filter(Boolean)
    : [];
  if (question.length < 8) return NextResponse.json({ error: "question_required" }, { status: 400 });
  if (options.length < 2) return NextResponse.json({ error: "options_required" }, { status: 400 });

  // Filtre à l'entrée : le refus est immédiat et EXPLIQUÉ, pour que l'appelant
  // corrige plutôt que de découvrir un blocage silencieux trois jours plus tard.
  // Ce n'est pas la garde principale — celle-ci est rejouée avant publication.
  const verdict = screen(question, options);
  if (!verdict.ok) {
    return NextResponse.json({ error: "blocked", reason: verdict.reason }, { status: 422 });
  }

  const iso = (v: unknown) =>
    typeof v === "string" && !isNaN(Date.parse(v)) ? new Date(v).toISOString() : null;

  const id = await enqueueCampaign(key, {
    question,
    options,
    method: typeof b.method === "string" ? b.method : undefined,
    sourceUrl: typeof b.sourceUrl === "string" ? b.sourceUrl.slice(0, 500) : null,
    sourcePublisher: typeof b.sourcePublisher === "string" ? b.sourcePublisher.slice(0, 120) : null,
    publishAt: iso(b.publishAt),
    closeAt: iso(b.closeAt),
  });

  // null = la base a refusé, et le cas le plus probable est que l'avatar n'est
  // pas armé (interrupteur à l'arrêt ou clé qui ne correspond pas).
  if (!id) return NextResponse.json({ error: "enqueue_refused_or_disarmed" }, { status: 409 });

  return NextResponse.json({ id, state: "draft" }, { status: 201 });
}
