import { NextResponse } from "next/server";
import { closeExpiredAndNotify } from "@/lib/push";
import { APP_URL } from "@/lib/voting/aiPrompt";

// Cron quotidien (Vercel) : ferme les scrutins échus et envoie résultats + rappels.
// Vercel ajoute « Authorization: Bearer <CRON_SECRET> » si la variable existe.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Échoue FERMÉ. L'écriture précédente — `if (cronSecret && …)` — désarmait la
  // garde quand la variable était absente : un simple GET public clôturait alors
  // TOUS les scrutins échus et déclenchait toutes les notifications. Une variable
  // oubliée doit casser le cron, pas ouvrir la porte.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Liens des notifications = domaine canonique (jamais l'URL de déploiement Vercel,
  // protégée par Vercel Authentication) → sinon « se connecter à Vercel » au clic.
  const r = await closeExpiredAndNotify(APP_URL);
  return NextResponse.json({ ok: true, ...r });
}
