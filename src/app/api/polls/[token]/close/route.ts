import { NextResponse } from "next/server";
import { denyAgent } from "@/lib/api/agentAuth";
import { closePollServer, setPollVisibilityServer } from "@/lib/db/pollsServer";

// POST /api/polls/<token>/close  { secret, publish? } — clôture à l'heure voulue.
//
// Le cron quotidien (08:00 UTC) ferme déjà les scrutins échus, mais un agent qui
// publie un résultat ne peut pas attendre jusqu'à huit heures du matin. Deux
// gardes, pas une : la clé agent pour atteindre la route, le secret d'admin du
// scrutin pour agir dessus — la clé seule ne permet pas de fermer le vote d'autrui.
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const denied = denyAgent(req);
  if (denied) return denied;

  const { token } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const secret = typeof b.secret === "string" ? b.secret : "";
  if (!secret) return NextResponse.json({ error: "secret_required" }, { status: 400 });

  const closed = await closePollServer(token, secret);
  if (!closed) return NextResponse.json({ error: "close_refused" }, { status: 403 });

  // Publier APRÈS la clôture : c'est le moment où la liste est figée et où le
  // résultat existe — donc le seul où mettre le scrutin sur /explorer a du sens
  // si on ne l'a pas fait à la création.
  const published = b.publish === true ? await setPollVisibilityServer(token, secret, true) : undefined;

  const origin = new URL(req.url).origin;
  return NextResponse.json({ closed: true, published, results_url: `${origin}/api/polls/${token}/results` });
}
