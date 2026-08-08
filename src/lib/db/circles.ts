// Cercles — accès client.
//
// Un cercle n'est pas un objet nouveau : c'est un `scrutin_spaces` dont le lien
// d'adhésion est ouvert (`join_open`). Voir docs/cercles-spec.md.
//
// Ce fichier ne contient QUE ce qui est appelable depuis le navigateur. La
// demande d'adhésion et sa confirmation en sont volontairement absentes : leurs
// RPC sont gardées par le secret serveur et passent par /api/circles/*, pour que
// le jeton personnel ne transite que par l'email de son destinataire.
import { createClient } from "@/lib/supabase/client";

/** Vitrine publique d'un cercle (sortie de `get_circle_info`). */
export interface CircleInfo {
  status: "open" | "closed" | "full" | "invalid";
  name?: string;
  pitch?: string | null;
  /** `null` = ce cercle n'a pris aucun engagement de fréquence : on n'affiche alors rien. */
  solicit_per_day?: number | null;
}

/**
 * Un sous-ensemble durable du cercle, NOMMÉ PAR LE GROUPE. Placet n'impose aucun
 * vocabulaire : ce sont des niveaux d'adhésion chez l'un, des villes chez l'autre.
 * `rank` est facultatif — renseigné, il déclare une échelle et l'interface peut
 * proposer « ce niveau et au-dessus » ; nul, c'est une simple étiquette.
 */
export interface Segment {
  id: string;
  space_id: string;
  name: string;
  rank: number | null;
  position: number;
}

/** Une consultation vue depuis la page personnelle du membre. */
export interface MemberConsultation {
  title: string;
  status: "draft" | "open" | "closed";
  secret_ballot: boolean;
  closes_at: string | null;
  token: string;
  voted: boolean;
  /** Public convoqué, figé à l'ouverture. `null` = tout le cercle. */
  audience: string | null;
}

/** Page personnelle du membre (sortie de `get_member_home`). */
export interface MemberHome {
  status: "ok" | "invalid";
  circle?: string;
  pitch?: string | null;
  solicit_per_day?: number | null;
  /** Conversation de groupe — servie aux seuls membres CONFIRMÉS, jamais sur la page publique. */
  chat_url?: string | null;
  name?: string;
  email?: string | null;
  self_joined?: boolean;
  consent_at?: string | null;
  /** Ses propres segments — ce que le cercle sait de lui doit lui être lisible. */
  segments?: string[];
  consultations?: MemberConsultation[];
}

export async function getCircleInfo(joinToken: string): Promise<CircleInfo> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_circle_info", { p_join_token: joinToken });
  if (error) throw error;
  return (data as CircleInfo | null) ?? { status: "invalid" };
}

export async function getMemberHome(token: string): Promise<MemberHome> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_member_home", { p_token: token });
  if (error) throw error;
  return (data as MemberHome | null) ?? { status: "invalid" };
}

/**
 * Le retrait. Le jeton EST le titre : il vient de la boîte de son destinataire.
 * Les bulletins déjà déposés survivent — scellés, ils n'ont jamais porté de nom ;
 * sur une assemblée close, la convocation est anonymisée plutôt que supprimée,
 * pour ne pas modifier un résultat déjà acquis.
 */
export async function leaveCircle(token: string): Promise<{ status: string; circle?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("leave_circle", { p_token: token });
  if (error) throw error;
  return (data as { status: string; circle?: string } | null) ?? { status: "invalid" };
}

// `openCircleConsultation` a été retiré (P3) : le formulaire du cercle a
// disparu, et le parcours normal passe par `setPollAudience` (participation.ts),
// qui porte les mêmes garanties — attachées au TYPE d'audience, pas au chemin.
// La RPC `open_circle_consultation` subsiste en base comme simple raccourci.

/** Une réponse nominative : qui a répondu quoi. */
export interface NamedAnswer {
  name: string;
  ranking: unknown;
  grades: unknown;
}
export interface NamedAnswers {
  /** `sealed` : la consultation est scellée, il n'y a PAS de noms à donner. */
  status: "ok" | "sealed" | "forbidden" | "invalid";
  resolutions?: {
    id: string;
    question: string;
    options: unknown;
    answers: NamedAnswer[];
    pending: string[];
  }[];
}

/**
 * Qui a répondu quoi — le seul intérêt du mode nominatif.
 * La RPC REFUSE sur une consultation scellée : la garde est en base, pas ici,
 * pour qu'un futur branchement au mauvais endroit se heurte à un mur.
 */
export async function getNamedAnswers(eventId: string): Promise<NamedAnswers> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_event_named_answers", { p_event_id: eventId });
  if (error) throw error;
  return (data as NamedAnswers | null) ?? { status: "invalid" };
}

// ------------------------------------------------------------------ segments
// CRUD direct en table (données d'animateur, protégées par RLS sur la propriété
// de l'espace) — pas de RPC : rien ici ne demande de privilège particulier.

export async function listSegments(spaceId: string): Promise<Segment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scrutin_segments")
    .select("id, space_id, name, rank, position")
    .eq("space_id", spaceId)
    .order("position");
  if (error) throw error;
  return (data ?? []) as Segment[];
}

export async function createSegment(spaceId: string, name: string, rank: number | null, position: number): Promise<Segment> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scrutin_segments")
    .insert({ space_id: spaceId, name: name.trim().slice(0, 60), rank, position })
    .select("id, space_id, name, rank, position")
    .single();
  if (error) throw error;
  return data as Segment;
}

/**
 * Renommer un segment, ou lui donner un rang — geste absent du produit jusqu'ici.
 * Sans lui, corriger une faute de frappe passait par la SUPPRESSION, qui casse
 * en cascade tous les rattachements (`on delete cascade`). Aucune migration :
 * la policy `segments_owner` est `for all`.
 */
export async function updateSegment(id: string, patch: { name?: string; rank?: number | null }): Promise<void> {
  const supabase = createClient();
  const body: Record<string, unknown> = {};
  if (patch.name !== undefined) body.name = patch.name.trim().slice(0, 60);
  if (patch.rank !== undefined) body.rank = patch.rank;
  if (!Object.keys(body).length) return;
  const { error } = await supabase.from("scrutin_segments").update(body).eq("id", id);
  if (error) throw error;
}

export async function deleteSegment(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scrutin_segments").delete().eq("id", id);
  if (error) throw error;
}

/** Rattachements membre → segment de tout un espace, en une requête. */
export async function listMemberSegments(spaceId: string): Promise<Record<string, string[]>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scrutin_member_segments")
    .select("member_id, segment_id, scrutin_segments!inner(space_id)")
    .eq("scrutin_segments.space_id", spaceId);
  if (error) throw error;
  const out: Record<string, string[]> = {};
  for (const row of (data ?? []) as { member_id: string; segment_id: string }[]) {
    (out[row.member_id] ??= []).push(row.segment_id);
  }
  return out;
}

export async function assignSegment(memberId: string, segmentId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("scrutin_member_segments")
    .upsert({ member_id: memberId, segment_id: segmentId }, { onConflict: "member_id,segment_id" });
  if (error) throw error;
}

/**
 * Affecte un segment à PLUSIEURS membres en un seul appel.
 *
 * Le geste coûtait douze écritures réseau pour douze personnes — trois clics
 * chacune, trente-six pour une saison. Or la gestion d'un groupe doit rester
 * faisable SEUL, et ce sera le cas majoritaire : quand une personne fait tout,
 * le coût dominant n'est pas la coordination, c'est la répétition.
 *
 * La base vérifie la propriété du segment ET n'affecte que des membres du même
 * groupe — un identifiant glissé dans le tableau ne fait entrer personne d'un
 * autre groupe dans le public d'une consultation. Idempotente : le nombre rendu
 * est celui des rattachements réellement créés.
 */
export async function assignSegmentBulk(segmentId: string, memberIds: string[]): Promise<number> {
  if (!memberIds.length) return 0;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("assign_segment_bulk", {
    p_segment_id: segmentId,
    p_member_ids: memberIds,
  });
  if (error) throw error;
  return (data as number | null) ?? 0;
}

export async function unassignSegment(memberId: string, segmentId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("scrutin_member_segments")
    .delete()
    .eq("member_id", memberId)
    .eq("segment_id", segmentId);
  if (error) throw error;
}
