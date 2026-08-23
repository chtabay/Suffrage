import { NextResponse } from "next/server";
import { addSubscription } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";

// Enregistre un abonnement push. `pollToken` (votant) vient du corps ; le
// `userId` (organisateur, ou joueur des jeux quotidiens) est lu depuis la
// SESSION serveur — jamais du client.
//
// `fuseau` et `langue` viennent du corps eux aussi, et c'est sans risque : ils
// ne désignent personne et ne donnent aucun droit. Un client qui mentirait sur
// les deux ne se punirait que lui-même, en recevant ses propres notifications à
// la mauvaise heure et dans la mauvaise langue. La base les valide de toute
// façon — un fuseau inventé y entre en `null` plutôt que de faire échouer
// l'abonnement.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: {
    endpoint?: string;
    p256dh?: string;
    auth?: string;
    pollToken?: string | null;
    fuseau?: string | null;
    langue?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "json invalide" }, { status: 400 });
  }
  const { endpoint, p256dh, auth, pollToken, fuseau, langue } = body;
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

  const ok = await addSubscription({
    endpoint,
    p256dh,
    auth,
    userId,
    pollToken: pollToken ?? null,
    fuseau: fuseau ?? null,
    langue: langue ?? null,
  });
  return NextResponse.json({ ok });
}
