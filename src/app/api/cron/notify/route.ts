import { NextResponse } from "next/server";
import { closeExpiredAndNotify } from "@/lib/push";

// Cron quotidien (Vercel) : ferme les scrutins échus et envoie résultats + rappels.
// Vercel ajoute « Authorization: Bearer <CRON_SECRET> » si la variable existe.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const origin = new URL(req.url).origin;
  const r = await closeExpiredAndNotify(origin);
  return NextResponse.json({ ok: true, ...r });
}
