// Identité de PARTICIPANT — le pont entre un compte et ce à quoi il est convié.
//
// POURQUOI CE FICHIER EXISTE. Jusqu'ici un compte connecté n'était jamais qu'un
// ORGANISATEUR : les seules colonnes reliées à `auth.users` étaient `owner_id`,
// `created_by` et l'admin. L'appartenance à un cercle vivait dans
// `scrutin_members`, identifiée par un email et un jeton reçu par courrier ; la
// participation à un scrutin public vivait dans le `localStorage` du navigateur.
// « Les consultations de mes cercles » et « mon historique » étaient donc
// littéralement incalculables — pas difficiles à afficher : impossibles à obtenir.
//
// Le lien vit dans une table SÉPARÉE (`scrutin_member_links`) et non dans une
// colonne de `scrutin_members` : cette dernière est lisible par l'animateur, qui
// apprendrait alors quels membres possèdent un compte Placet. Ce n'est pas son
// affaire. Même principe que l'émargement du bulletin scellé.
import { createClient } from "@/lib/supabase/client";

/** Un cercle auquel le compte connecté appartient (comme MEMBRE, pas comme animateur). */
export interface MyCircle {
  space_id: string;
  name: string;
  pitch: string | null;
  /** Son jeton personnel — la même page `/m/<token>` que celle reçue par email. */
  member_token: string;
  since: string | null;
  solicit_per_day: number | null;
}

/** Une consultation ADRESSÉE au compte connecté via l'un de ses cercles. */
export interface MyConsultation {
  title: string;
  status: "draft" | "open" | "closed";
  secret_ballot: boolean;
  audience: string | null;
  closes_at: string | null;
  circle: string;
  token: string;
  voted: boolean;
}

export interface MyParticipations {
  status: "ok" | "anonymous";
  circles?: MyCircle[];
  consultations?: MyConsultation[];
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

/** Ce à quoi le compte connecté est convié. Ne lit jamais un bulletin. */
export async function getMyParticipations(): Promise<MyParticipations> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_my_participations");
  if (error) throw error;
  return (data as MyParticipations | null) ?? { status: "anonymous" };
}

/**
 * Défait un rattachement : le compte cesse de voir ce cercle dans ses listes.
 * NE le fait PAS sortir du cercle — pour cela il y a `leaveCircle`, qui efface
 * ses données. Deux gestes distincts, et il ne faut pas les confondre.
 */
export async function unlinkMembership(memberId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scrutin_member_links").delete().eq("member_id", memberId);
  if (error) throw error;
}
