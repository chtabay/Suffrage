// Identité de PARTICIPANT — le pont entre un compte et ce à quoi il est convié.
//
// POURQUOI CE FICHIER EXISTE. Jusqu'à P0, un compte connecté n'était jamais qu'un
// ORGANISATEUR : les seules colonnes reliées à `auth.users` étaient `owner_id`,
// `created_by` et l'admin. L'appartenance à un cercle vivait dans
// `scrutin_members`, identifiée par un email et un jeton reçu par courrier ; la
// participation à un scrutin public vivait dans le `localStorage`. « Ce qui
// m'attend » était donc littéralement incalculable — pas difficile à afficher :
// impossible à obtenir.
//
// Le lien vit dans une table SÉPARÉE (`scrutin_member_links`) et non dans une
// colonne de `scrutin_members` : cette dernière est lisible par l'animateur, qui
// apprendrait alors quels membres possèdent un compte Placet. Ce n'est pas son
// affaire. Même principe que l'émargement du bulletin scellé.
import { createClient } from "@/lib/supabase/client";

/** Un cercle auquel le compte appartient comme MEMBRE (pas comme animateur). */
export interface MyCircle {
  space_id: string;
  name: string;
  pitch: string | null;
  /** Son jeton personnel — la même page `/m/<token>` que celle reçue par email. */
  member_token: string;
  since: string | null;
  solicit_per_day: number | null;
}

/** Une consultation qui m'est adressée, à répondre ou déjà répondue. */
export interface FeedConsultation {
  title: string;
  circle: string;
  token: string;
  secret_ballot: boolean;
  audience?: string | null;
  status?: "open" | "closed";
  closes_at: string | null;
}

export interface MyFeed {
  status: "ok" | "anonymous";
  circles?: MyCircle[];
  /** Ce qui m'attend — la seule section réellement actionnable. */
  todo?: FeedConsultation[];
  /**
   * Ce à quoi j'ai déjà répondu. Ne contient QUE des participations : mes
   * créations vivent dans « Mes consultations », qui le fait déjà et le fait
   * bien. Deux listes des mêmes scrutins finiraient par diverger.
   */
  answered?: FeedConsultation[];
  /** Mes votes hors cercle (publics ou par lien), depuis le registre en base. */
  publicVotes?: { question: string; token: string; status: string; closes_at: string | null; marked_on: string }[];
}

/**
 * Rattache le compte courant aux membres qui portent SON adresse.
 *
 * Le rattachement n'a lieu que sur un email **vérifié** : sans cette condition,
 * s'inscrire avec l'adresse d'un tiers suffirait à hériter de ses cercles. La
 * vérification est faite en base, pas ici.
 *
 * Idempotent — appelable à chaque connexion sans effet de bord. Renvoie le
 * nombre de liens NOUVELLEMENT créés.
 */
export async function linkMyMemberships(): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("link_my_memberships");
  if (error) throw error;
  return (data as number | null) ?? 0;
}

/**
 * Tout ce que le connecté doit voir, en un appel. Ne lit jamais un bulletin :
 * l'état « répondu » vient de l'émargement en scellé, du rattachement du bulletin
 * sinon.
 */
export async function getMyFeed(): Promise<MyFeed> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_my_feed");
  if (error) throw error;
  return (data as MyFeed | null) ?? { status: "anonymous" };
}

/**
 * Défait un rattachement : le compte cesse de voir ce cercle dans ses listes.
 * NE le fait PAS sortir du cercle — pour cela il y a `leaveCircle`, qui efface
 * ses données. Deux gestes distincts, à ne pas confondre.
 */
export async function unlinkMembership(memberId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scrutin_member_links").delete().eq("member_id", memberId);
  if (error) throw error;
}

/**
 * Donne une audience « roster » à un scrutin — depuis le parcours NORMAL, sans
 * passer par le formulaire dédié du cercle.
 *
 * Les quatre garanties (convoquer tout le segment ou refuser, seuil de 5 en
 * scellé, plafond du jour, scellé assumé) sont portées par le TYPE D'AUDIENCE en
 * base, pas par ce chemin d'appel : viser un segment d'une personne est refusé
 * ici comme ailleurs.
 */
export interface SetAudienceResult {
  status: "ok" | "capped" | "too_small" | "not_a_circle" | "bad_segment" | "forbidden" | "invalid" | "already_voted";
  event_id?: string;
  poll_token?: string;
  convened?: number;
  audience?: string | null;
  sealed?: boolean;
  cap?: number;
  today?: number;
  roster?: number;
  min?: number;
}

export async function setPollAudience(args: {
  pollId: string;
  spaceId: string;
  segmentIds?: string[];
  sealed?: boolean;
}): Promise<SetAudienceResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("set_poll_audience", {
    p_poll_id: args.pollId,
    p_space_id: args.spaceId,
    p_segment_ids: args.segmentIds?.length ? args.segmentIds : null,
    p_sealed: args.sealed ?? true,
  });
  if (error) throw error;
  return (data as SetAudienceResult | null) ?? { status: "invalid" };
}

/**
 * Adresse à un groupe un scrutin qu'on vient de créer, à partir de son JETON.
 *
 * Le parcours de création ne connaît que le jeton (`createPoll` ne rend pas
 * l'identifiant) ; la policy propriétaire permet de le résoudre. Les quatre
 * garanties restent portées par la base — viser un segment d'une personne est
 * refusé ici comme ailleurs.
 */
export async function setPollAudienceByToken(args: {
  token: string;
  spaceId: string;
  segmentIds?: string[];
  sealed?: boolean;
}): Promise<SetAudienceResult> {
  const supabase = createClient();
  const { data: poll, error } = await supabase
    .from("scrutin_polls")
    .select("id")
    .eq("token", args.token)
    .maybeSingle();
  if (error) throw error;
  if (!poll) return { status: "forbidden" };
  return setPollAudience({
    pollId: (poll as { id: string }).id,
    spaceId: args.spaceId,
    segmentIds: args.segmentIds,
    sealed: args.sealed,
  });
}
