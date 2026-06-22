import { NextResponse } from "next/server";
import { addSubscription } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";

// Enregistre un abonnement push. `pollToken` (votant) vient du corps ; le
// `userId` (organisateur) est lu depuis la SESSION serveur — jamais du client.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { endpoint?: string; p256dh?: string; auth?: string; pollToken?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "json invalide" }, { status: 400 });
  }
  const { endpoint, p256dh, auth, pollToken } = body;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "abonnement incomplet" }, { status: 400 });
  }

  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    /* pas de session : abonnement votant seulement */
  }

  const ok = await addSubscription({ endpoint, p256dh, auth, userId, pollToken: pollToken ?? null });
  return NextResponse.json({ ok });
}
