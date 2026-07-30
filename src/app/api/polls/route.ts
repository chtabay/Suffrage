import { NextResponse } from "next/server";
import { buildNewUrl, parseDraft } from "@/lib/voting/draft";
import { parseDraftBody } from "@/lib/api/draftBody";
import { denyAgent } from "@/lib/api/agentAuth";
import { createPollServer, setPollVisibilityServer } from "@/lib/db/pollsServer";
import { APP_URL } from "@/lib/voting/aiPrompt";

// POST /api/polls — CRÉE réellement un scrutin, pour un agent.
//
// Même vocabulaire d'entrée que /api/poll-drafts, plus { closesAt, publish,
// hideResults, closeOnComplete, quorum }. Réservé : clé agent en Bearer.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  return NextResponse.json({
    usage:
      "POST (Authorization: Bearer <AGENT_KEY>) le même JSON que /api/poll-drafts, plus closesAt (ISO), publish (bool), hideResults (bool), closeOnComplete (bool), quorum (int). Renvoie { token, secret, share_url, admin_url }.",
    warning:
      "Le secret n'est renvoyé QU'À LA CRÉATION : la base n'en garde que le sha256. Perdu, le scrutin ne peut plus être ni clôturé ni publié.",
    methods_doc: `${origin}/ai`,
  });
}

export async function POST(req: Request) {
  const denied = denyAgent(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const origin = new URL(req.url).origin;
  const { fields, ignored } = parseDraftBody(body, origin);

  if (!fields.title) return NextResponse.json({ error: "title_required" }, { status: 400 });

  // Aller-retour VOLONTAIRE par l'URL : on construit le lien /new qu'un humain
  // aurait ouvert, puis on le relit avec le MÊME analyseur que l'écran de
  // création. L'API ne peut donc pas interpréter un brouillon autrement que
  // l'app — toute divergence future casserait les deux d'un coup, pas une seule.
  const qs = Object.fromEntries(new URL(buildNewUrl(origin, fields)).searchParams);
  const draft = parseDraft(qs);

  if (!draft.options?.length || !draft.recipe) {
    return NextResponse.json({ error: "options_required", ignored }, { status: 400 });
  }
  // L'affectation exige un roster et une résolution : hors du chemin agent v1.
  if (draft.optionKind === "assign") {
    return NextResponse.json({ error: "assign_not_supported_yet" }, { status: 400 });
  }

  const closesAt = typeof b.closesAt === "string" && !isNaN(Date.parse(b.closesAt)) ? b.closesAt : null;
  const created = await createPollServer(draft.question ?? fields.title, draft.options, draft.recipe, {
    description: draft.description ?? null,
    closesAt,
    hideResults: b.hideResults === true,
    closeOnComplete: b.closeOnComplete === true,
    quorum: typeof b.quorum === "number" && Number.isInteger(b.quorum) && b.quorum > 0 ? b.quorum : null,
  });
  if (!created) return NextResponse.json({ error: "create_failed" }, { status: 502 });

  // La publication est une SECONDE opération, jamais un effet de bord de la
  // création : elle peut échouer seule (quota, liste non figée) sans annuler le
  // scrutin, et l'appelant doit savoir laquelle des deux a échoué.
  const published = b.publish === true ? await setPollVisibilityServer(created.token, created.secret, true) : undefined;

  return NextResponse.json(
    {
      token: created.token,
      secret: created.secret,
      share_url: `${APP_URL}/v/${created.token}`,
      admin_url: `${APP_URL}/v/${created.token}?k=${created.secret}`,
      results_url: `${origin}/api/polls/${created.token}/results`,
      published,
      ignored,
    },
    { status: 201 },
  );
}
