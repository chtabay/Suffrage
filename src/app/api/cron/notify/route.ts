import { NextResponse } from "next/server";
import { closeExpiredAndNotify } from "@/lib/push";
import { APP_URL } from "@/lib/voting/aiPrompt";

// Cron quotidien (Vercel) : ferme les scrutins échus et envoie résultats + rappels.
// Vercel ajoute « Authorization: Bearer <CRON_SECRET> » si la variable existe.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Liens des notifications = domaine canonique (jamais l'URL de déploiement Vercel,
  // protégée par Vercel Authentication) → sinon « se connecter à Vercel » au clic.
  const r = await closeExpiredAndNotify(APP_URL);
  return NextResponse.json({ ok: true, ...r });
}
