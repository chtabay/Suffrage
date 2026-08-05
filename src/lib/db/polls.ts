// Accès aux données Suffrage (tables scrutin_ du projet OpenSM partagé).
import { createClient } from "@/lib/supabase/client";
import type { Ballot, Option, Recipe } from "@/lib/voting/types";

/**
 * 'proposals' = phase amont de COLLECTE (les votants ajoutent des options avant
 * le vote, uniquement en mode invitation) ; l'organisateur bascule ensuite en
 * 'open' (open_voting), ce qui fige les options — les bulletins référencent les
 * options par index, donc plus aucune mutation après ouverture.
 */
export type PollStatus = "proposals" | "open" | "closed";
export type AccessMode = "open" | "invite";
/** Visibilité du feed public : private = lien seulement (défaut), public = listé sur /explorer. */
export type PollVisibility = "private" | "public";

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
  /** Compte propriétaire (scrutin réclamé). Sert uniquement de booléen côté client. */
  created_by: string | null;
  /** Feed public : la publication passe UNIQUEMENT par la RPC set_poll_visibility. */
  visibility: PollVisibility;
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
  "id, token, question, description, options, recipe, created_at, status, hide_results, access_mode, districts, opens_at, closes_at, close_on_complete, quorum, slot_minutes, created_by, visibility";

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
  /** Statut initial. Omis → défaut base ('open'). 'proposals' ouvre la phase de collecte. */
  initialStatus?: PollStatus;
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
      ...(opts.initialStatus ? { status: opts.initialStatus } : {}),
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

/**
 * Charge un scrutin par son token (null si introuvable).
 *
 * Passe par la RPC `get_poll` et NON par la table : lire directement
 * `scrutin_polls` suppose une policy ouverte à tous, qui laisse alors lister
 * les scrutins privés — token compris, c'est-à-dire leur accès. La fonction
 * rend un scrutin contre son token, et rien d'autre.
 */
export async function getPollByToken(token: string): Promise<PollRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_poll", { p_token: token });
  if (error) throw error;
  return ((data as PollRow[] | null)?.[0] as PollRow | undefined) ?? null;
}

export type Phase = "proposals" | "scheduled" | "open" | "closed";

/** Phase effective d'un scrutin (statut manuel + bornes temporelles). */
export function pollPhase(p: PollRow, now: number = Date.now()): Phase {
  // La collecte prime : tant que l'organisateur n'a pas ouvert le vote, on reste
  // en 'proposals' (les bornes temporelles ne s'appliquent qu'au vote lui-même).
  if (p.status === "proposals") return "proposals";
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

/**
 * Dépose un bulletin (mode ouvert). Bloqué par RLS si le scrutin est clos ou sur
 * invitation. Le bulletin ne porte AUCUN commentaire : le « mot au groupe » va
 * dans une table dédiée (voir addComment), détachée du choix — secret du vote.
 */
export async function addBallot(pollId: string, b: Ballot): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("scrutin_ballots")
    .insert({ poll_id: pollId, ranking: b.ranking, grades: b.grades, district: b.district });
  if (error) throw error;
}

/**
 * Dépose un « mot au groupe » (commentaire public + pseudo facultatif), dans la
 * table dédiée scrutin_comments — jamais rattaché à un bulletin. Renvoie
 * 'ok' | 'empty' | 'not_found' | 'closed'.
 */
export async function addComment(token: string, body: string, author?: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("add_comment", {
    p_token: token,
    p_body: body,
    p_author: author?.trim() || null,
  });
  if (error) throw error;
  return data as string;
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

/** Mots au groupe (table dédiée, détachés des choix). À n'afficher que si les résultats sont publics. */
export async function getComments(token: string): Promise<BallotComment[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_comments", { p_token: token });
  if (error) throw error;
  return ((data ?? []) as BallotComment[]) || [];
}

// ---------- messages privés à l'organisateur ----------

export interface PollMessage {
  body: string;
  contact: string | null;
  created_at: string;
}

/**
 * Dépose un message privé pour l'organisateur (détaché du bulletin — aucun lien
 * possible avec un choix de vote). Réservé aux scrutins rattachés à un compte.
 * Renvoie 'ok' | 'empty' | 'not_found' | 'no_owner'.
 */
export async function leavePollMessage(token: string, body: string, contact?: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("leave_poll_message", {
    p_token: token,
    p_body: body,
    p_contact: contact?.trim() || null,
  });
  if (error) throw error;
  return data as string;
}

/** Messages privés reçus (organisateur : secret d'admin ou compte propriétaire). */
export async function getPollMessages(token: string, secret?: string): Promise<PollMessage[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_poll_messages", {
    p_token: token,
    p_secret: secret ?? null,
  });
  if (error) throw error;
  return ((data ?? []) as PollMessage[]) || [];
}

// ---------- feed public (visibilité, signalement, vote dédupliqué) ----------

/** Raisons de signalement acceptées par la RPC report_poll. */
export type ReportReason = "spam" | "offensive" | "illegal" | "other";

/**
 * Publie (ou dépublie) un scrutin sur le feed public. Passe par la RPC :
 * une policy RESTRICTIVE interdit tout INSERT/UPDATE client de visibility.
 * Renvoie 'ok' | 'invalid' | 'rate_limited' (5 publications / 24 h) |
 * 'collecting' (publication refusée tant que la liste n'est pas figée).
 */
export async function setPollVisibility(token: string, secret: string, isPublic: boolean): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("set_poll_visibility", {
    p_token: token,
    p_secret: secret,
    p_public: isPublic,
  });
  if (error) throw error;
  return data as string;
}

/**
 * Signalement anonyme d'un scrutin public (masquage automatique à 3 signalements).
 * Renvoie 'ok' | 'already' | 'not_found'.
 */
export async function reportPoll(token: string, reason: ReportReason, detail?: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("report_poll", {
    p_token: token,
    p_reason: reason,
    p_detail: detail?.trim() || null,
  });
  if (error) throw error;
  return data as string;
}

/**
 * Dépose un bulletin sur un scrutin PUBLIC, avec déduplication par empreinte IP
 * DÉTACHÉE du bulletin (le choix reste secret). Le vote privé, lui, garde addBallot.
 * Renvoie 'ok' | 'already' | 'closed' | 'notopen' | 'invalid'.
 */
export async function castPublicBallot(token: string, b: Ballot): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("cast_public_ballot", {
    p_token: token,
    p_ranking: b.ranking,
    p_grades: b.grades,
    p_district: b.district,
  });
  if (error) throw error;
  return data as string;
}

/**
 * Marque, pour le COMPTE connecté, « j'ai voté ici » — jamais le bulletin, et une
 * date au jour près (le modèle de l'émargement). Remplace le localStorage comme
 * mémoire longue : l'historique survit désormais au changement d'appareil.
 * Silencieuse et sans effet pour un anonyme ; ne doit jamais faire échouer un vote.
 */
export function markMyVote(token: string): void {
  const supabase = createClient();
  void supabase.rpc("mark_my_vote", { p_token: token }).then(
    () => {},
    () => {},
  );
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

/**
 * Phase de propositions : un votant invité ajoute une option pendant la collecte.
 * Réservé aux scrutins en mode invitation et en statut 'proposals' (jamais public).
 * Renvoie 'ok' | 'invalid' | 'notcollecting' | 'full' | 'empty' | 'dup'.
 */
export async function addProposal(
  voterToken: string,
  name: string,
  icon?: string,
  url?: string,
  note?: string,
  place?: string,
  lat?: number,
  lng?: number,
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("add_proposal", {
    p_voter_token: voterToken,
    p_name: name,
    p_icon: icon?.trim() || null,
    p_url: url?.trim() || null,
    p_note: note?.trim() || null,
    p_place: place?.trim() || null,
    p_lat: lat ?? null,
    p_lng: lng ?? null,
  });
  if (error) throw error;
  return data as string;
}

/**
 * Phase de propositions en mode OUVERT : une personne ayant le lien (privé)
 * ajoute une option. Autorisé seulement si accès ouvert + status 'proposals' +
 * visibilité privée. Renvoie 'ok' | 'invalid' | 'notcollecting' | 'full' | 'empty' | 'dup'.
 */
export async function addProposalOpen(
  pollToken: string,
  name: string,
  icon?: string,
  url?: string,
  note?: string,
  place?: string,
  lat?: number,
  lng?: number,
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("add_proposal_open", {
    p_poll_token: pollToken,
    p_name: name,
    p_icon: icon?.trim() || null,
    p_url: url?.trim() || null,
    p_note: note?.trim() || null,
    p_place: place?.trim() || null,
    p_lat: lat ?? null,
    p_lng: lng ?? null,
  });
  if (error) throw error;
  return data as string;
}

/**
 * Ajuste le commentaire d'une proposition (curation par l'organisateur).
 * Uniquement pendant la collecte : après ouverture, changer le libellé d'une
 * option sous les yeux des votants fausserait le scrutin.
 * Renvoie 'ok' | 'invalid' | 'notcollecting' | 'range'.
 */
export async function editProposalNote(
  token: string,
  secret: string,
  index: number,
  note: string,
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("edit_proposal", {
    p_token: token,
    p_secret: secret,
    p_index: index,
    p_note: note.trim() || null,
  });
  if (error) throw error;
  return data as string;
}

/**
 * Retrait d'une option proposée par l'organisateur, UNIQUEMENT pendant la
 * collecte (aucun bulletin déposé → l'index ne référence encore aucun vote).
 */
export async function removeProposal(token: string, secret: string, index: number): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("remove_proposal", {
    p_token: token,
    p_secret: secret,
    p_index: index,
  });
  if (error) throw error;
  return data === true;
}

/**
 * Ouvre le vote (organisateur) : fige les options et passe de 'proposals' à
 * 'open'. Idempotent (renvoie false si le scrutin n'était pas en collecte).
 */
export async function openVoting(token: string, secret: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("open_voting", { p_token: token, p_secret: secret });
  if (error) throw error;
  return data === true;
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
