// Accès aux données Suffrage (tables scrutin_ du projet OpenSM partagé).
import { createClient } from "@/lib/supabase/client";
import type { Ballot, Option, Recipe } from "@/lib/voting/types";

export type PollStatus = "open" | "closed";
export type AccessMode = "open" | "invite";

export interface District {
  name: string;
  electors: number;
}

export interface PollRow {
  id: string;
  token: string;
  question: string;
  options: Option[];
  recipe: Recipe;
  created_at: string;
  status: PollStatus;
  hide_results: boolean;
  access_mode: AccessMode;
  districts: District[] | null;
}

export interface VoterInput {
  label: string;
  district: number | null;
}

export interface Voter {
  label: string;
  token: string;
  voted: boolean;
  district: number | null;
}

export interface VoterContext {
  poll_token: string;
  label: string;
  voted: boolean;
  status: PollStatus;
  district: number | null;
}

const POLL_COLS = "id, token, question, options, recipe, created_at, status, hide_results, access_mode, districts";

/** SHA-256 hex (mêmes octets que sha256(convert_to(...,'UTF8')) côté Postgres). */
async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface CreatePollOptions {
  hideResults?: boolean;
  accessMode?: AccessMode;
  districts?: District[] | null;
}

/**
 * Enregistre un scrutin et renvoie son token de partage + le secret d'admin.
 * Le secret reste chez le créateur ; seul son hash est stocké en base.
 */
export async function createPoll(
  question: string,
  options: Option[],
  recipe: Recipe,
  opts: CreatePollOptions = {},
): Promise<{ token: string; secret: string }> {
  const supabase = createClient();
  const secret = crypto.randomUUID();
  const admin_hash = await sha256Hex(secret);
  const { data, error } = await supabase
    .from("scrutin_polls")
    .insert({
      question,
      options,
      recipe,
      created_by: null,
      admin_hash,
      hide_results: opts.hideResults ?? false,
      access_mode: opts.accessMode ?? "open",
      districts: opts.districts ?? null,
    })
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
    .select(POLL_COLS)
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  return (data as PollRow | null) ?? null;
}

/** Dépose un bulletin (mode ouvert). Bloqué par RLS si le scrutin est clos ou sur invitation. */
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

// ---------- gestion (admin via secret) ----------

export async function closePoll(token: string, secret: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("close_poll", { p_token: token, p_secret: secret });
  if (error) throw error;
  return data === true;
}

export async function reopenPoll(token: string, secret: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("reopen_poll", { p_token: token, p_secret: secret });
  if (error) throw error;
  return data === true;
}

/** Ajoute des votants (corps électoral) et renvoie leurs jetons nominatifs. */
export async function addVoters(
  token: string,
  secret: string,
  voters: VoterInput[],
): Promise<{ label: string; token: string; district: number | null }[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("add_voters", {
    p_token: token,
    p_secret: secret,
    p_voters: voters,
  });
  if (error) throw error;
  return (data ?? []) as { label: string; token: string; district: number | null }[];
}

/** Liste des votants d'un scrutin (réservé à l'organisateur). */
export async function getVoters(token: string, secret: string): Promise<Voter[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_voters", { p_token: token, p_secret: secret });
  if (error) throw error;
  return (data ?? []) as Voter[];
}

/** Contexte d'un votant invité (page de vote nominative). */
export async function getVoterContext(voterToken: string): Promise<VoterContext | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_voter_context", { p_voter_token: voterToken });
  if (error) throw error;
  return (data as VoterContext | null) ?? null;
}

/** Dépose un bulletin nominatif. Renvoie 'ok' | 'already' | 'closed' | 'invalid'. */
export async function castInvitedBallot(voterToken: string, b: Ballot): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("cast_invited_ballot", {
    p_voter_token: voterToken,
    p_ranking: b.ranking,
    p_grades: b.grades,
    p_district: b.district,
  });
  if (error) throw error;
  return data as string;
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

/** Scrutins rattachés au compte connecté (Mes scrutins cloud). */
export async function getMyPolls(): Promise<PollRow[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("scrutin_polls")
    .select(POLL_COLS)
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PollRow[];
}
