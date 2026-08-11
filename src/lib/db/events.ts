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
  /** Un espace EST un cercle si et seulement si `join_open`. Pas de table dédiée. */
  join_open: boolean;
  join_token: string;
  join_cap: number | null;
  join_closes_at: string | null;
  pitch: string | null;
  /** Plafond de consultations par jour. `null` = aucune limite, et on n'affiche alors aucun chiffre. */
  solicit_per_day: number | null;
  /** Lien d'invitation à la conversation de groupe. Hôtes restreints par contrainte en base. */
  chat_url: string | null;
}

export interface Member {
  id: string;
  space_id: string;
  name: string;
  email: string | null;
  district: number | null;
  weight: number;
  // Le jeton personnel du membre N'EST PLUS de ce type : il ne descend plus au
  // navigateur (voir MEMBER_COLS). Le déclarer ici mentirait au compilateur —
  // il vaudrait `undefined` à l'exécution — et la première personne à s'y fier
  // rouvrirait la brèche. Le retirer du type, c'est faire garder la règle par
  // `tsc` plutôt que par la mémoire. Les chemins SERVEUR qui en ont besoin
  // (l'envoi des convocations, le lien de retrait) le relisent eux-mêmes.
  self_joined: boolean;
  consent_at: string | null;
  consent_source: string | null;
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
  /**
   * Bulletin scellé : le bulletin est écrit SANS identité et l'unicité passe par
   * l'émargement (scrutin_event_signins). Le secret est une propriété de la
   * CONSULTATION, pas du cercle — n'importe quel groupe peut en profiter.
   */
  secret_ballot: boolean;
  /**
   * Le public convoqué, FIGÉ EN TEXTE à la convocation — pour qu'un segment
   * renommé ou supprimé ne réécrive pas l'histoire d'une consultation tenue.
   * Ne jamais le remplacer par une jointure sur `scrutin_segments`.
   *
   * ⚠️ Il n'est écrit que par `set_poll_audience` et `open_circle_consultation`,
   * donc par le seul parcours `/new?espace=`. Une consultation née de l'éditeur
   * (le seul parcours à plusieurs questions) le laisse à `null` QUEL QUE SOIT le
   * public réellement convoqué : `null` ne veut donc PAS dire « tout le cercle ».
   */
  audience_label: string | null;
}

export interface EventMember {
  id: string;
  event_id: string;
  member_id: string | null;
  name: string;
  email: string | null;
  district: number | null;
  weight: number;
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
    secret_ballot?: boolean;
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

const SPACE_COLS =
  "id, name, created_at, join_open, join_token, join_cap, join_closes_at, pitch, solicit_per_day, chat_url";
// ⚠️ `token` EST VOLONTAIREMENT ABSENT, et il ne doit jamais y revenir.
//
// C'est le jeton personnel du membre : celui de sa page `/m/<token>`, donc un
// TITRE D'ACCÈS à son identité. Tant qu'il descendait ici, la réponse réseau de
// `listMembers` en livrait un par membre au navigateur de l'animateur — et
// `get_member_home(p_token)` est exécutable par `anon` et rend, pour chaque
// consultation, un booléen `voted` calculé sur l'ÉMARGEMENT quand elle est
// scellée. Jeton par jeton, l'animateur reconstituait donc nominativement la
// liste des émargeants d'une consultation à bulletin scellé : la promesse faite
// au votant tombait par un chemin que le correctif du 2026-08-07 n'avait pas vu.
//
// Vérifié avant retrait : aucun composant client ne lit `Member.token`.
//
// ⚠️ ET LA COLONNE SŒUR EST PARTIE AVEC, POUR LA MÊME RAISON. Le commentaire qui
// vivait ici écartait `scrutin_event_members.token` au motif que « l'animateur a
// le droit de le distribuer puisqu'il l'envoie ». C'est un argument sur le droit
// de DIFFUSER ; il ne dit rien de l'ORACLE que la DÉTENTION ouvre. Détenir les N
// jetons d'un coup n'est pas le même pouvoir que remettre un lien à quelqu'un :
// `get_event_context(p_token)` est exécutable par PUBLIC et rend `voted` calculé
// sur les ÉMARGEMENTS dès que la consultation est scellée, si bien qu'un appel
// par jeton reconstituait nominativement la liste des émargeants d'un bulletin
// scellé. La brèche du 2026-08-07, rouverte par la colonne voisine.
//
// Le jeton se demande désormais À L'UNITÉ (`getConvocationLink`), et la demande
// est refusée en scellé. Laisser tsc garder la règle : le type ne le porte plus.
const MEMBER_COLS = "id, space_id, name, email, district, weight, self_joined, consent_at, consent_source";
const EVENT_COLS =
  "id, space_id, title, description, mode, status, current_poll_id, opens_at, closes_at, created_at, enroll_open, enroll_cap, enroll_closes_at, enroll_token, quorum, secret_ballot, audience_label";
const EVENT_MEMBER_COLS =
  "id, event_id, member_id, name, email, district, weight, invited_at, self_enrolled";
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

/** Réglages d'un espace, dont son ouverture en cercle. */
export interface SpacePatch {
  name?: string;
  join_open?: boolean;
  join_cap?: number | null;
  join_closes_at?: string | null;
  pitch?: string | null;
  /** `null` = aucun engagement de fréquence ; la page d'adhésion n'affiche alors rien. */
  solicit_per_day?: number | null;
  chat_url?: string | null;
}

/**
 * Met à jour un espace. Peut ÉCHOUER volontairement : un déclencheur en base
 * refuse d'ouvrir un cercle tant qu'un membre est sans adresse email (il serait
 * injoignable, donc jamais convoqué et sans moyen de se retirer). L'appelant doit
 * présenter ce refus, pas l'avaler.
 */
/**
 * Hôtes autorisés pour le lien de conversation. Ce contrôle est un CONFORT : la
 * vraie garde est une contrainte CHECK en base, parce qu'une validation côté
 * client se contourne en appelant l'API REST directement. Le bouton porte le nom
 * du cercle — il ne doit pas pouvoir mener ailleurs.
 */
export function isChatUrl(raw: string): boolean {
  return /^https:\/\/(chat\.whatsapp\.com|wa\.me)\/[^\s]{1,255}$/.test(raw.trim());
}

export async function updateSpace(id: string, patch: SpacePatch): Promise<void> {
  const supabase = createClient();
  const upd: Record<string, unknown> = { ...patch };
  if (patch.name !== undefined) upd.name = patch.name.trim().slice(0, 120);
  if (patch.pitch !== undefined) upd.pitch = patch.pitch?.trim().slice(0, 400) || null;
  const { error } = await supabase.from("scrutin_spaces").update(upd).eq("id", id);
  if (error) throw error;
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
      // Décision 3 de la spec des cercles : un membre ajouté par l'animateur est
      // marqué comme tel. Il n'a rien demandé — on doit pouvoir le distinguer
      // d'un adhérent volontaire, et le lui dire dans son premier email.
      consent_source: "import",
      consent_at: new Date().toISOString(),
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

/**
 * Retirer quelqu'un du groupe.
 *
 * ⚠️ CE N'EST PAS UN `delete` SUR `scrutin_members`, et c'est tout le sujet.
 * `scrutin_event_members.member_id` est `ON DELETE SET NULL` : la convocation
 * SURVIVAIT au retrait, avec son nom, son adresse et surtout son JETON
 * inchangés — et `cast_event_ballot` identifie le votant par le seul jeton,
 * sans jamais tester l'appartenance au roster. La personne retirée continuait
 * donc de voter dans toutes les consultations ouvertes du groupe, avec le lien
 * qu'elle avait déjà ; son nom et son adresse restaient en base indéfiniment ;
 * et `leave_circle` ne pouvait plus les atteindre, puisqu'elle apparie sur
 * `member_id`, désormais nul.
 *
 * `remove_member` rejoue littéralement `leave_circle` : les deux sorties d'un
 * groupe doivent laisser la base dans le même état.
 */
export async function removeMember(id: string): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("remove_member", { p_member_id: id });
  if (error) throw error;
  const status = (data as { status?: string } | null)?.status;
  if (status !== "ok") throw new Error(status ?? "remove_failed");
}

/**
 * Le lien personnel d'UN convoqué, à la demande.
 *
 * Il ne descend plus avec la liste (voir EVENT_MEMBER_COLS) : détenir les N
 * jetons ouvrait, en scellé, un oracle nominatif sur les émargements. La RPC
 * refuse en `sealed` — le refus est la fonctionnalité, pas une limitation à
 * contourner.
 */
export async function getConvocationLink(eventMemberId: string): Promise<{ status: string; token?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_convocation_link", { p_event_member_id: eventMemberId });
  if (error) throw error;
  return (data as { status: string; token?: string } | null) ?? { status: "invalid" };
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

/**
 * Agrégats d'une consultation, pour le tableau de bord et la vue de gestion.
 *
 * `convened` est la TAILLE D'UN PUBLIC que l'animateur a lui-même choisi, pas un
 * taux de réponse : il ne dit rien d'un bulletin, et aucun seuil ne s'y applique.
 * Il répond à la seule question qu'on ne pouvait pas poser jusqu'ici — « à
 * combien de personnes cette consultation s'adresse-t-elle ? » — quand
 * `audience_label` est nul, ce qui est le cas de toute consultation née de
 * l'éditeur.
 *
 * `signed` compte des PERSONNES ayant participé, jamais ce qu'elles ont répondu :
 * l'émargement en scellé, le bulletin rattaché sinon, et `distinct` des deux
 * côtés pour qu'une consultation à plusieurs questions ne compte pas la même
 * personne une fois par question.
 *
 * ⚠️ CE CHIFFRE A ÉTÉ RETENU UN LOT ENTIER, et il faut savoir pourquoi avant de
 * le déplacer ailleurs : tant que le dépouillement d'une consultation scellée
 * restait lisible PENDANT le vote, un compteur de participation indiquait à
 * l'animateur le moment exact où envoyer un lien individuel et relire l'écart.
 * Il n'est affichable que depuis le correctif du 2026-08-07.
 */
export interface EventStats {
  questions: number;
  convened: number;
  signed: number;
}

export async function getSpaceEventStats(spaceId: string): Promise<Record<string, EventStats>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_space_event_stats", { p_space_id: spaceId });
  if (error) throw error;
  return (data as Record<string, EventStats> | null) ?? {};
}

/**
 * Les demandes d'adhésion non confirmées et non périmées.
 *
 * L'ÂGE DE LA PLUS ANCIENNE, et pas seulement le compte : « 3 en attente » ne
 * discrimine rien — trois clics d'il y a deux minutes ne demandent rien, trois
 * confirmations perdues à 70 h de la péremption sont irrattrapables (la fenêtre
 * est de 72 h). Jamais de nom ni d'adresse : la file contient des adresses NON
 * confirmées, et en rendre une rouvrirait l'oracle d'appartenance.
 */
export interface JoinPending {
  count: number;
  oldest_at: string | null;
}

/**
 * Les demandes d'adhésion en attente, ou `null` — même règle que
 * `getSpaceOverview` : un NULL de RPC gardée par `auth.uid()` est un REFUS, pas
 * une donnée.
 *
 * ⚠️ IL Y AVAIT UN `?? { count: 0 }` ICI. La fonction agrégeait (count, min) sur
 * une jointure gardée, et un agrégat sur zéro ligne rend UNE ligne : hors
 * périmètre, elle répondait `{count: 0, oldest_at: null}` sans erreur —
 * indiscernable de « personne n'attend ». Le tableau de bord masque alors tout
 * le bloc, y compris l'alerte « la plus ancienne a 70 h » qui est la seule
 * raison d'être du chiffre : la fenêtre de péremption est de 72 h, et on laisse
 * expirer des confirmations qu'on ne peut pas rattraper.
 */
export async function getSpaceJoinPending(spaceId: string): Promise<JoinPending | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_space_join_pending", { p_space_id: spaceId });
  if (error) throw error;
  return data as JoinPending | null;
}

/**
 * Les quatre chiffres de membres et les effectifs par segment, EN UNE REQUÊTE.
 *
 * POURQUOI. Le tableau de bord d'un groupe a cessé d'énumérer À L'ÉCRAN, mais
 * pas AU RÉSEAU : il appelait `listMembers` (toutes les lignes du roster) et
 * `listMemberSegments` (toute la table de rattachement) pour ne rendre AUCUNE
 * ligne — juste « 47 membres · 3 sans adresse » et « Bénévoles · 12 ». Sur un
 * groupe de 500 personnes, c'est ~1 000 lignes transportées et parcourues dans
 * le navigateur avant le premier pixel utile, pour produire huit entiers.
 *
 * Le motif existait déjà à côté (`get_spaces_with_stats`) ; il manquait ici.
 *
 * AUCUNE DONNÉE NOMINATIVE NE SORT. La fonction ne rend que des comptes et les
 * segments eux-mêmes — jamais un nom, jamais une adresse. C'est une page de
 * gouvernance : la liste vit dans /membres, qui elle assume de la charger.
 */
export interface SpaceOverview {
  members: { total: number; self_joined: number; no_email: number; no_segment: number };
  segments: { id: string; name: string; rank: number | null; position: number; count: number }[];
}

/**
 * Les huit entiers du tableau de bord, ou `null` — et `null` VEUT DIRE QUELQUE
 * CHOSE.
 *
 * ⚠️ IL Y AVAIT UN `?? EMPTY_OVERVIEW` ICI, ET IL DÉSARMAIT LE GARDE-FOU DE LA
 * PAGE. `get_space_overview` est gardée par `owner_id = auth.uid()` : quand la
 * ligne ne sort pas, elle ne renvoie pas une erreur, elle renvoie un NULL SQL.
 * Le `??` en faisait `{total: 0, …}` — indiscernable d'un groupe vide. Or le
 * tableau de bord est bâti sur trois valeurs (« je sais », « je ne sais pas
 * encore », « je n'ai pas pu savoir ») et son écran de premier jour refuse
 * justement de s'afficher tant que les agrégats ne sont pas REÇUS, avec ce
 * commentaire : « 0 membre · 0 consultation est exactement ce que produit un
 * chargement en échec ». Le repli fabriquait la valeur que la précaution
 * cherchait à écarter.
 *
 * Chemin réel : `load()` fait deux vagues ; le groupe est supprimé entre les
 * deux, ou la session expire. `getSpace` a réussi, la RPC rend NULL, et
 * l'animateur lit « 0 membre » sur un groupe qui en compte 200, sans le moindre
 * message.
 *
 * LA RÈGLE, à retenir pour toute RPC gardée par `auth.uid()` : un NULL n'est pas
 * une donnée, c'est un refus.
 */
export async function getSpaceOverview(spaceId: string): Promise<SpaceOverview | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_space_overview", { p_space_id: spaceId });
  if (error) throw error;
  return data as SpaceOverview | null;
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
  secret_ballot?: boolean;
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

/**
 * Résolution d'affectation close : convoqués + classements (RPC publique par
 * token de résolution — ne renvoie des lignes qu'une fois le vote terminé).
 */
export async function getEventAssignData(
  resolutionToken: string,
): Promise<{ label: string; ranking: number[] | null; voted: boolean }[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_event_assign_data", { p_token: resolutionToken });
  if (error) throw error;
  return ((data ?? []) as { label: string; ranking: number[] | null; voted: boolean }[]).map((r) => ({
    label: r.label,
    ranking: Array.isArray(r.ranking) ? r.ranking : null,
    voted: Boolean(r.voted),
  }));
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
  /** `too_few` : consultation scellée sous le seuil de dépouillement. */
  status: "closed" | "not_closed" | "invalid" | "forbidden" | "too_few";
  title?: string;
  quorum?: number;
  convened?: number;
  secret_ballot?: boolean;
  /** Renseignés seulement quand status = 'too_few'. */
  ballots?: number;
  min?: number;
  resolutions?: (ResolutionRow & { ballots: VoterBallot[] })[];
}

/** Résultats d'un événement CLOS pour un votant (jeton nominatif). Bulletins anonymes. */
export async function getEventResults(token: string): Promise<EventResultsData> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_event_results", { p_token: token });
  if (error) throw error;
  return (data as EventResultsData | null) ?? { status: "invalid" };
}

/**
 * Résultats vus par l'ORGANISATEUR. Indispensable pour une consultation scellée :
 * une policy RESTRICTIVE retire ces bulletins de toute lecture directe, donc
 * `getResolutionBallots` renverrait zéro. La RPC est le seul chemin, et elle
 * applique le seuil de dépouillement — l'organisateur n'a aucun privilège dessus.
 */
export async function getEventResultsOwner(eventId: string): Promise<EventResultsData> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_event_results_owner", { p_event_id: eventId });
  if (error) throw error;
  return (data as EventResultsData | null) ?? { status: "invalid" };
}

// `getVotedMemberIds` a été retirée : elle n'avait aucun appelant côté
// navigateur, et le seul écran qui l'aurait justifiée — une liste nominative
// des non-répondants — est désormais interdit (sur un résultat unanime, elle
// attribue nommément le même vote à chacun). La relance passe par la route
// serveur, qui appelle `get_event_voted_members` directement.

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

/**
 * ⚠️ NE VAUT QUE HORS BULLETIN SCELLÉ, et ce n'est pas un détail d'usage.
 *
 * En scellé le bulletin est écrit SANS `event_member_id` — c'est le principe du
 * sceau — et la policy restrictive `scrutin_ballots_hide_secret` retire ces
 * bulletins de toute lecture directe. Cette fonction rend donc structurellement
 * 0, quel que soit le nombre de votants. L'appeler sur une consultation scellée
 * n'est pas une approximation : c'est un chiffre faux, et l'écran qui l'affiche
 * fait relancer des gens qui ont déjà voté.
 *
 * Le suivi d'une consultation scellée passe par les ÉMARGEMENTS, une seule fois
 * au montage et sous le plancher des 5 convoqués (`ratioVisible`) — jamais en
 * sondage répété, qui rouvrirait l'oracle que le sceau ferme.
 */
export async function countEventVoters(pollIds: string[]): Promise<number> {
  if (!pollIds.length) return 0;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scrutin_ballots")
    .select("event_member_id")
    .in("poll_id", pollIds)
    .not("event_member_id", "is", null);
  if (error) throw error;
  const seen = new Set<string>();
  for (const r of (data ?? []) as { event_member_id: string | null }[]) if (r.event_member_id) seen.add(r.event_member_id);
  return seen.size;
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
