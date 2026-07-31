import { NextResponse } from "next/server";
import { notifyPoll } from "@/lib/push";
import { postSlackResult } from "@/lib/slack/result";
import { APP_URL } from "@/lib/voting/aiPrompt";

// Déclencheur direct (appelé par le client après un vote) : si le scrutin vient
// d'être clos (ex. dernier votant en mode complétude), envoie la notif résultats.
// Idempotent (dédup côté RPC), donc sans risque d'être appelé plusieurs fois.
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  let token: unknown;
  try {
    token = (await req.json())?.token;
  } catch {
    /* corps invalide */
  }
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "token requis" }, { status: 400, headers: CORS });
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let sent = 0;
  if (base && key) {
    // Par la RPC : voir get_poll — la lecture directe de la table suppose une
    // policy ouverte à tous, qui laisse lister les scrutins privés.
    const res = await fetch(`${base}/rest/v1/rpc/get_poll`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_token: token }),
    });
    if (res.ok) {
      const p = ((await res.json()) as { status: string; closes_at: string | null }[])[0];
      const closed = !!p && (p.status === "closed" || (!!p.closes_at && Date.now() >= Date.parse(p.closes_at)));
      if (closed) {
        sent = await notifyPoll(token, "results", {
          title: "Résultats disponibles",
          body: "Le vote est clos — découvrez le résultat.",
          url: `${APP_URL}/v/${token}`,
        });
        await postSlackResult(token); // no-op si le scrutin ne vient pas de Slack
      }
    }
  }
  return NextResponse.json({ ok: true, sent }, { headers: CORS });
}
