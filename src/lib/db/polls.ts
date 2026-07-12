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
  description: string | null;
  options: Option[];
  recipe: Recipe;
  created_at: string;
  status: PollStatus;
  hide_results: boolean;
  access_mode: AccessMode;
  districts: District[] | null;
  opens_at: string | null;
  closes_at: string | null;
  close_on_complete: boolean;
  quorum: number | null;
  slot_minutes: number | null;
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

const POLL_COLS =
  "id, token, question, description, options, recipe, created_at, status, hide_results, access_mode, districts, opens_at, closes_at, close_on_complete, quorum, slot_minutes";

/** SHA-256 hex (mêmes octets que sha256(convert_to(...,'UTF8')) côté Postgres). */
async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface CreatePollOptions {
  description?: string | null;
  hideResults?: boolean;
  accessMode?: AccessMode;
  districts?: District[] | null;
  opensAt?: string | null;
  closesAt?: string | null;
  closeOnComplete?: boolean;
  quorum?: number | null;
  slotMinutes?: number | null;
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
      description: opts.description?.trim() || null,
      options,
      recipe,
      created_by: null,
      admin_hash,
      hide_results: opts.hideResults ?? false,
      access_mode: opts.accessMode ?? "open",
      districts: opts.districts ?? null,
      opens_at: opts.opensAt ?? null,
      closes_at: opts.closesAt ?? null,
      close_on_complete: opts.closeOnComplete ?? false,
      quorum: opts.quorum ?? null,
      slot_minutes: opts.slotMinutes ?? null,
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

export type Phase = "scheduled" | "open" | "closed";

/** Phase effective d'un scrutin (statut manuel + bornes temporelles). */
export function pollPhase(p: PollRow, now: number = Date.now()): Phase {
  if (p.status === "closed") return "closed";
  if (p.closes_at && now >= Date.parse(p.closes_at)) return "closed";
  if (p.opens_at && now < Date.parse(p.opens_at)) return "scheduled";
  return "open";
}

/** Note facultative jointe à un bulletin (commentaire + pseudo libre). */
export interface BallotNote {
  comment?: string;
  author?: string;
}

const cleanNote = (n?: BallotNote) => ({
  comment: n?.comment?.trim().slice(0, 280) || null,
  author: n?.author?.trim().slice(0, 40) || null,
});

/** Dépose un bulletin (mode ouvert). Bloqué par RLS si le scrutin est clos ou sur invitation. */
export async function addBallot(pollId: string, b: Ballot, note?: BallotNote): Promise<void> {
  const supabase = createClient();
  const { comment, author } = cleanNote(note);
  const { error } = await supabase
    .from("scrutin_ballots")
    .insert({ poll_id: pollId, ranking: b.ranking, grades: b.grades, district: b.district, comment, author });
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

export interface BallotComment {
  author: string | null;
  comment: string;
  created_at: string;
}

/** Messages laissés par les votants (détachés des choix). À n'afficher que si les résultats sont publics. */
export async function getComments(pollId: string): Promise<BallotComment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scrutin_ballots")
    .select("author, comment, created_at")
    .eq("poll_id", pollId)
    .not("comment", "is", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as BallotComment[];
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
export async function castInvitedBallot(voterToken: string, b: Ballot, note?: BallotNote): Promise<string> {
  const supabase = createClient();
  const { comment, author } = cleanNote(note);
  const { data, error } = await supabase.rpc("cast_invited_ballot", {
    p_voter_token: voterToken,
    p_ranking: b.ranking,
    p_grades: b.grades,
    p_district: b.district,
    p_comment: comment,
    p_author: author,
  });
  if (error) throw error;
  return data as string;
}

/**
 * Données d'une affectation close : votants + classements (RPC publique par
 * token, ne renvoie des lignes que pour un scrutin d'affectation CLOS — les
 * classements deviennent alors visibles des participants, c'est ce qui rend
 * le calcul vérifiable).
 */
export async function getAssignData(
  token: string,
): Promise<{ label: string; ranking: number[] | null; voted: boolean }[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_assign_data", { p_token: token });
  if (error) throw error;
  return ((data ?? []) as { label: string; ranking: number[] | null; voted: boolean }[]).map((r) => ({
    label: r.label,
    ranking: Array.isArray(r.ranking) ? r.ranking : null,
    voted: Boolean(r.voted),
  }));
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
