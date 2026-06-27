// Création d'un scrutin CÔTÉ SERVEUR (routes API : Slack, Teams, agents…).
// Insert direct via REST + clé anon (même modèle que push.ts/pollMeta.ts) : pas de
// client navigateur, pas de service-role. RLS de scrutin_polls inchangée (insert anon
// autorisé, created_by null), donc aucun privilège supplémentaire.
import crypto from "crypto";
import type { Option, Recipe } from "@/lib/voting/types";

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Enregistre un scrutin et renvoie son token public (null si échec). */
export async function createPollServer(
  question: string,
  options: Option[],
  recipe: Recipe,
  opts: { description?: string | null; closesAt?: string | null } = {},
): Promise<string | null> {
  if (!BASE || !KEY) return null;
  // Le secret d'admin n'est utile à personne ici (clôture par échéance via le cron) :
  // on en stocke seulement le hash, comme le fait l'app.
  const secret = crypto.randomUUID();
  const admin_hash = crypto.createHash("sha256").update(secret).digest("hex");
  try {
    const res = await fetch(`${BASE}/rest/v1/scrutin_polls`, {
      method: "POST",
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        question,
        description: opts.description ?? null,
        options,
        recipe,
        created_by: null,
        admin_hash,
        hide_results: false,
        access_mode: "open",
        districts: null,
        opens_at: null,
        closes_at: opts.closesAt ?? null,
        close_on_complete: false,
        quorum: null,
      }),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { token: string }[];
    return rows?.[0]?.token ?? null;
  } catch {
    return null;
  }
}
