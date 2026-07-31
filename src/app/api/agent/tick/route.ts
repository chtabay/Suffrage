import { NextResponse } from "next/server";
import { tick } from "@/lib/agent/worker";
import { workerKey } from "@/lib/agent/campaigns";

// GET /api/agent/tick — un passage de la machine à états de l'avatar.
//
// Déclenché par le cron. DEUX gardes, et les deux échouent FERMÉ :
//   1. CRON_SECRET protège la route (même écriture que /api/cron/notify, dont
//      la version laxiste — `if (secret && …)` — avait ouvert la clôture de
//      tous les scrutins à un simple GET public, commit 19d944d) ;
//   2. AGENT_WORKER_KEY arme la machine côté base. Sans elle, `agent_due` rend
//      vide : le worker tourne à blanc et ne publie rien.
//
// La seconde garde n'est pas redondante : elle permet d'arrêter l'avatar par un
// UPDATE en base, sans déploiement — l'exigence « couper en trente secondes ».
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const key = workerKey();
  if (!key) return NextResponse.json({ error: "agent_worker_disabled" }, { status: 503 });

  return NextResponse.json({ ok: true, ...(await tick(key)) });
}
