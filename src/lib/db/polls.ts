// Accès aux données Suffrage (tables scrutin_ du projet OpenSM partagé).
import { createClient } from "@/lib/supabase/client";
import type { Ballot, Option, Recipe } from "@/lib/voting/types";

export interface PollRow {
  id: string;
  token: string;
  question: string;
  options: Option[];
  recipe: Recipe;
  created_at: string;
}

/** SHA-256 hex (mêmes octets que sha256(convert_to(...,'UTF8')) côté Postgres). */
async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Enregistre un scrutin et renvoie son token de partage + le secret d'admin.
 * Le secret reste chez le créateur ; seul son hash est stocké en base.
 */
export async function createPoll(
  question: string,
  options: Option[],
  recipe: Recipe,
): Promise<{ token: string; secret: string }> {
  const supabase = createClient();
  const secret = crypto.randomUUID();
  const admin_hash = await sha256Hex(secret);
  const { data, error } = await supabase
    .from("scrutin_polls")
    .insert({ question, options, recipe, created_by: null, admin_hash })
    .select("token")
    .single();
  if (error) throw error;
  return { token: data.token as string, secret };
}

/** Charge un scrutin par son token (null si introuvable). */
export async function getPollByToken(token: string): Promise<PollRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scrutin_polls")
    .select("id, token, question, options, recipe, created_at")
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  return (data as PollRow | null) ?? null;
}

/** Dépose un bulletin dans l'urne d'un scrutin. */
export async function addBallot(pollId: string, b: Ballot): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("scrutin_ballots")
    .insert({ poll_id: pollId, ranking: b.ranking, grades: b.grades, district: b.district });
  if (error) throw error;
}

/** Récupère tous les bulletins d'un scrutin pour le dépouillement. */
export async function getBallots(pollId: string): Promise<Ballot[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scrutin_ballots")
    .select("ranking, grades, district")
    .eq("poll_id", pollId);
  if (error) throw error;
  return (data ?? []) as Ballot[];
}

/**
 * Rattache au compte connecté les scrutins anonymes créés sur cet appareil,
 * en présentant leur secret d'admin. Renvoie le nombre réclamé.
 */
export async function claimPolls(creds: { token: string; secret: string }[]): Promise<number> {
  const supabase = createClient();
  let claimed = 0;
  for (const c of creds) {
    const { data, error } = await supabase.rpc("claim_poll", { p_token: c.token, p_secret: c.secret });
    if (!error && data === true) claimed += 1;
  }
  return claimed;
}
