// Couche d'accès « événements / associations » (socle des expériences avancées).
// Modèle : Espace (organisation) → Membres (roster réutilisable) → Événement →
// Résolutions (= scrutin_polls en mode `invite`, rattachés par `event_id`).
// CRUD organisateur via RLS (clé auth.uid()) ; vote votant via RPC gardées.
import { createClient } from "@/lib/supabase/client";
import type { Ballot, Option, Recipe } from "@/lib/voting/types";

// ---------------------------------------------------------------- types

export interface Space {
  id: string;
  name: string;
  created_at: string;
}

export interface Member {
  id: string;
  space_id: string;
  name: string;
  email: string | null;
  district: number | null;
  weight: number;
}
export interface MemberInput {
  name: string;
  email?: string | null;
  district?: number | null;
  weight?: number;
}

export type EventMode = "async" | "live";
export type EventStatus = "draft" | "open" | "closed";

export interface EventRow {
  id: string;
  space_id: string | null;
  title: string;
  description: string | null;
  mode: EventMode;
  status: EventStatus;
  current_poll_id: string | null;
  opens_at: string | null;
  closes_at: string | null;
  created_at: string;
  enroll_open: boolean;
  enroll_cap: number | null;
  enroll_closes_at: string | null;
  enroll_token: string;
  quorum: number;
}

export interface EventMember {
  id: string;
  event_id: string;
  member_id: string | null;
  name: string;
  email: string | null;
  district: number | null;
  weight: number;
  token: string;
  invited_at: string | null;
  self_enrolled: boolean;
}

/** Contexte public d'une page d'inscription (sortie de get_enroll_info). */
export interface EnrollInfo {
  status: "open" | "closed" | "invalid";
  title?: string;
  cap?: number | null;
  count?: number;
  full?: boolean;
}

/** Une résolution telle que stockée (scrutin_polls rattaché à un événement). */
export interface ResolutionRow {
  id: string;
  token: string;
  question: string;
  description: string | null;
  options: Option[];
  recipe: Recipe;
  status: "open" | "closed";
  order_index: number;
  closes_at: string | null;
}

/** Vue votant (sortie de la RPC get_event_context). */
export interface EventContext {
  event: {
    title: string;
    description: string | null;
    mode: EventMode;
    status: EventStatus;
    closes_at: string | null;
    current_poll_id: string | null;
  };
  member: { name: string };
  resolutions: {
    id: string;
    token: string;
    question: string;
    description: string | null;
    options: Option[];
    recipe: Recipe;
    status: string;
    order_index: number;
    voted: boolean;
  }[];
}

const SPACE_COLS = "id, name, created_at";
const MEMBER_COLS = "id, space_id, name, email, district, weight";
const EVENT_COLS =
  "id, space_id, title, description, mode, status, current_poll_id, opens_at, closes_at, created_at, enroll_open, enroll_cap, enroll_closes_at, enroll_token, quorum";
const EVENT_MEMBER_COLS =
  "id, event_id, member_id, name, email, district, weight, token, invited_at, self_enrolled";
const RESOLUTION_COLS = "id, token, question, description, options, recipe, status, order_index, closes_at";

async function uid(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("auth required");
  return user.id;
}

// ---------------------------------------------------------------- espaces

export async function createSpace(name: string): Promise<Space> {
  const supabase = createClient();
  const owner_id = await uid();
  const { data, error } = await supabase
    .from("scrutin_spaces")
    .insert({ owner_id, name: name.trim().slice(0, 120) })
    .select(SPACE_COLS)
    .single();
  if (error) throw error;
  return data as Space;
}

export async function listSpaces(): Promise<Space[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scrutin_spaces")
    .select(SPACE_COLS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Space[];
}

export interface SpaceStats extends Space {
  members: number;
  events_open: number;
  events_closed: number;
  events_draft: number;
}

/** Espaces de l'organisateur avec stats (membres, événements par statut) en une requête. */
export async function listSpacesWithStats(): Promise<SpaceStats[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_spaces_with_stats");
  if (error) throw error;
  return (data as SpaceStats[] | null) ?? [];
}

export async function getSpace(id: string): Promise<Space | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("scrutin_spaces").select(SPACE_COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Space | null) ?? null;
}

export async function renameSpace(id: string, name: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scrutin_spaces").update({ name: name.trim().slice(0, 120) }).eq("id", id);
  if (error) throw error;
}

export async function deleteSpace(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scrutin_spaces").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------- roster (membres)

export async function listMembers(spaceId: string): Promise<Member[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scrutin_members")
    .select(MEMBER_COLS)
    .eq("space_id", spaceId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Member[];
}

export async function addMembers(spaceId: string, members: MemberInput[]): Promise<Member[]> {
  const supabase = createClient();
  const rows = members
    .filter((m) => m.name.trim())
    .map((m) => ({
      space_id: spaceId,
      name: m.name.trim().slice(0, 120),
      email: m.email?.trim() || null,
      district: m.district ?? null,
      weight: Math.max(1, Math.round(m.weight ?? 1)),
    }));
  if (!rows.length) return [];
  const { data, error } = await supabase.from("scrutin_members").insert(rows).select(MEMBER_COLS);
  if (error) throw error;
  return (data ?? []) as Member[];
}

export async function updateMember(id: string, patch: Partial<MemberInput>): Promise<void> {
  const supabase = createClient();
  const upd: Record<string, unknown> = {};
  if (patch.name !== undefined) upd.name = patch.name.trim().slice(0, 120);
  if (patch.email !== undefined) upd.email = patch.email?.trim() || null;
  if (patch.district !== undefined) upd.district = patch.district;
  if (patch.weight !== undefined) upd.weight = Math.max(1, Math.round(patch.weight ?? 1));
  const { error } = await supabase.from("scrutin_members").update(upd).eq("id", id);
  if (error) throw error;
}

export async function removeMember(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scrutin_members").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------- événements

export async function createEvent(
  spaceId: string,
  a: { title: string; description?: string | null; mode?: EventMode },
): Promise<EventRow> {
  const supabase = createClient();
  const owner_id = await uid();
  const { data, error } = await supabase
    .from("scrutin_events")
    .insert({
      space_id: spaceId,
      owner_id,
      title: a.title.trim().slice(0, 150),
      description: a.description?.trim() || null,
      mode: a.mode ?? "async",
    })
    .select(EVENT_COLS)
    .single();
  if (error) throw error;
  return data as EventRow;
}

export async function listEvents(spaceId: string): Promise<EventRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scrutin_events")
    .select(EVENT_COLS)
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

export async function getEvent(id: string): Promise<EventRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("scrutin_events").select(EVENT_COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as EventRow | null) ?? null;
}

export interface EventPatch {
  title?: string;
  description?: string | null;
  mode?: EventMode;
  status?: EventStatus;
  current_poll_id?: string | null;
  opens_at?: string | null;
  closes_at?: string | null;
  enroll_open?: boolean;
  enroll_cap?: number | null;
  enroll_closes_at?: string | null;
  quorum?: number;
}
export async function updateEvent(id: string, patch: EventPatch): Promise<void> {
  const supabase = createClient();
  const upd: Record<string, unknown> = { ...patch };
  if (patch.title !== undefined) upd.title = patch.title.trim().slice(0, 150);
  if (patch.description !== undefined) upd.description = patch.description?.trim() || null;
  const { error } = await supabase.from("scrutin_events").update(upd).eq("id", id);
  if (error) throw error;
}

export async function deleteEvent(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scrutin_events").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------- résolutions

/** Crée une résolution = un scrutin `invite` rattaché à l'événement (possédé par l'orga). */
export async function addResolution(
  eventId: string,
  a: { question: string; description?: string | null; options: Option[]; recipe: Recipe; orderIndex: number },
): Promise<{ id: string; token: string }> {
  const supabase = createClient();
  const created_by = await uid();
  // admin_hash : non utilisé pour une résolution (gérée par RLS owner), valeur aléatoire.
  const admin_hash = crypto.randomUUID().replace(/-/g, "");
  const { data, error } = await supabase
    .from("scrutin_polls")
    .insert({
      question: a.question.trim().slice(0, 200),
      description: a.description?.trim() || null,
      options: a.options,
      recipe: a.recipe,
      created_by,
      admin_hash,
      access_mode: "invite", // verrou : le vote anonyme public est bloqué par la RLS
      event_id: eventId,
      order_index: a.orderIndex,
    })
    .select("id, token")
    .single();
  if (error) throw error;
  return { id: data.id as string, token: data.token as string };
}

export async function listResolutions(eventId: string): Promise<ResolutionRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scrutin_polls")
    .select(RESOLUTION_COLS)
    .eq("event_id", eventId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ResolutionRow[];
}

export async function setResolutionStatus(pollId: string, status: "open" | "closed"): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scrutin_polls").update({ status }).eq("id", pollId);
  if (error) throw error;
}

export async function removeResolution(pollId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scrutin_polls").delete().eq("id", pollId);
  if (error) throw error;
}

// ---------------------------------------------------------------- convocation

/** Snapshot des membres choisis → `event_members` (avec jeton de vote unique). */
export async function convene(eventId: string, members: Member[]): Promise<EventMember[]> {
  const supabase = createClient();
  const rows = members.map((m) => ({
    event_id: eventId,
    member_id: m.id,
    name: m.name,
    email: m.email,
    district: m.district,
    weight: m.weight,
  }));
  if (!rows.length) return [];
  const { data, error } = await supabase.from("scrutin_event_members").insert(rows).select(EVENT_MEMBER_COLS);
  if (error) throw error;
  return (data ?? []) as EventMember[];
}

export async function listConvened(eventId: string): Promise<EventMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scrutin_event_members")
    .select(EVENT_MEMBER_COLS)
    .eq("event_id", eventId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EventMember[];
}

export async function removeConvened(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scrutin_event_members").delete().eq("id", id);
  if (error) throw error;
}

export async function markInvited(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const supabase = createClient();
  const { error } = await supabase
    .from("scrutin_event_members")
    .update({ invited_at: new Date().toISOString() })
    .in("id", ids);
  if (error) throw error;
}

// ---------------------------------------------------------------- vote (votant, RPC gardées)

/** Contexte public d'inscription (titre + état), pour la page /rejoindre. Anon. */
export async function getEnrollInfo(enrollToken: string): Promise<EnrollInfo> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_enroll_info", { p_enroll_token: enrollToken });
  if (error) throw error;
  return (data as EnrollInfo | null) ?? { status: "invalid" };
}

/** Bulletin anonyme renvoyé pour le bilan votant (pas d'identité). */
export interface VoterBallot {
  ranking: number[];
  grades: Record<number, number>;
  district: number | null;
  weight: number;
}
export interface EventResultsData {
  status: "closed" | "not_closed" | "invalid";
  title?: string;
  quorum?: number;
  convened?: number;
  resolutions?: (ResolutionRow & { ballots: VoterBallot[] })[];
}

/** Résultats d'un événement CLOS pour un votant (jeton nominatif). Bulletins anonymes. */
export async function getEventResults(token: string): Promise<EventResultsData> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_event_results", { p_token: token });
  if (error) throw error;
  return (data as EventResultsData | null) ?? { status: "invalid" };
}

export async function getEventContext(token: string): Promise<EventContext | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_event_context", { p_token: token });
  if (error) throw error;
  return (data as EventContext | null) ?? null;
}

/** Dépose le bulletin d'un convoqué pour une résolution. → 'ok' | 'already' | 'closed' | 'invalid'. */
export async function castEventBallot(
  token: string,
  pollToken: string,
  b: Ballot,
  note?: { comment?: string; author?: string },
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("cast_event_ballot", {
    p_token: token,
    p_poll_token: pollToken,
    p_ranking: b.ranking,
    p_grades: b.grades,
    p_district: b.district ?? null,
    p_comment: note?.comment?.trim().slice(0, 280) || null,
    p_author: note?.author?.trim().slice(0, 40) || null,
  });
  if (error) throw error;
  return data as string;
}

// ---------------------------------------------------------------- résultats (lecture pondérée)

/** Nombre de bulletins déposés pour une résolution (léger, pour le suivi live). */
export async function countResolutionVotes(pollId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("scrutin_ballots")
    .select("*", { count: "exact", head: true })
    .eq("poll_id", pollId);
  if (error) throw error;
  return count ?? 0;
}

/** Bulletins d'une résolution avec le poids du votant (membre convoqué). Pour le dépouillement. */
export async function getResolutionBallots(pollId: string): Promise<{ ballot: Ballot; weight: number }[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scrutin_ballots")
    .select("ranking, grades, district, scrutin_event_members(weight)")
    .eq("poll_id", pollId);
  if (error) throw error;
  type Row = { ranking: number[]; grades: Record<number, number>; district: number | null; scrutin_event_members: { weight: number } | null };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    ballot: { ranking: r.ranking, grades: r.grades, district: r.district ?? 0 },
    weight: r.scrutin_event_members?.weight ?? 1,
  }));
}
