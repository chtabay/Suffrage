// LE COMPTE, VU DU JEU — trois appels, et aucun n'est nécessaire pour jouer.
//
// Les trois fonctions d'en face sont `security definer` derrière une table à RLS
// active et SANS policy : il n'existe aucun chemin de lecture directe, pour
// personne. Voir `supabase/migrations/20260818-jeu-pays-resultats.sql`.
//
// ⚠️ UN ÉCHEC N'EST JAMAIS REPLIÉ SUR UNE VALEUR VIDE. La règle du dépôt est
// écrite avec du sang : « un NULL rendu par une RPC gardée par `auth.uid()` est
// un REFUS, pas une donnée ». Un bilan `null` veut dire « on ne sait pas » et
// l'écran n'affiche alors rien — jamais « 0 partie », qui ferait croire à un
// joueur de trente jours qu'il a tout perdu.
import { createClient } from "@/lib/supabase/client";
import { monJetonPays } from "@/lib/games/pays/jeton";
import type { Resultat } from "@/lib/games/pays/local";

export interface BilanPays {
  parties: number;
  moyenne: number | null;
  meilleur: number | null;
  serie: number;
  /** Numéro de la dernière journée de la série : l'écran seul sait si elle est vivante. */
  serieFin: number | null;
}

export interface RangPays {
  joueurs: number;
  rang: number | null;
  essais: number | null;
  median: number | null;
  /**
   * Combien de joueurs ont fait EXACTEMENT le même nombre d'essais, moi compris.
   *
   * ⚠️ CE N'EST PAS UN DÉTAIL D'AFFICHAGE : le nombre d'essais est un petit
   * entier, donc les ex aequo ne sont pas un cas rare mais le cas normal — et le
   * barème de saison les fait PARTAGER les places qu'ils occupent. « 3e » tout
   * seul laisserait croire à un solo.
   */
  exaequo?: number;
}

/**
 * Range un lot de résultats sur le compte connecté.
 *
 * Appelée à CHAQUE connexion avec tout ce que le navigateur a gardé : la
 * fonction est idempotente et garde le meilleur essai, donc la répéter ne coûte
 * qu'un aller-retour. C'est ce qui permet de ne pas avoir à retenir « ai-je déjà
 * rattaché ce navigateur ? ».
 */
export async function enregistreResultats(lot: Resultat[]): Promise<number | null> {
  if (!lot.length) return 0;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_game_pays_save", { p_lot: lot });
  if (error) return null;
  return typeof data === "number" ? data : null;
}

/** Mon bilan, ou `null` si l'appel a été refusé (pas de session, réseau…). */
export async function monBilan(): Promise<BilanPays | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_game_pays_me");
  if (error || !data) return null;
  return data as BilanPays;
}

/**
 * DÉPOSER LA PARTIE QU'ON VIENT DE FINIR, avec ou sans compte.
 *
 * ⚠️ C'EST CE QUI FAIT QUE LE JEU COMPTE SA FOULE. Avant, seul un compte
 * laissait une trace : « votre rang du jour » se calculait sur deux ou trois
 * comptes pendant que trente personnes jouaient. Un joueur sans compte écrit
 * maintenant sous un jeton anonyme (`pays/jeton.ts`), qui disparaît dès qu'un
 * compte adopte la partie.
 *
 * Elle rend la POSITION dans la foulée : c'est l'instant où le joueur la
 * regarde, et le faire en deux appels doublerait l'aller-retour.
 */
export async function deposePartie(
  jour: number,
  essais: number,
  secondes: number | null,
): Promise<RangPays | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_game_pays_jouer", {
    p_jour: jour,
    p_essais: essais,
    p_secondes: secondes,
    p_jeton: monJetonPays(),
  });
  if (error || !data) return null;
  return data as RangPays;
}

/**
 * Ma position du jour. `rang: null` = journée pas encore jouée, ce n'est pas une
 * erreur — et `joueurs` est renseigné quand même, parce que « personne n'a
 * encore joué » et « je n'ai pas encore joué » sont deux choses différentes.
 */
export async function maPosition(jour: number): Promise<RangPays | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_game_pays_position", {
    p_jour: jour,
    p_jeton: monJetonPays(),
  });
  if (error || !data) return null;
  return data as RangPays;
}

/**
 * Adopter les parties jouées sans compte sur ce navigateur.
 *
 * ⚠️ ELLE FUSIONNE, ELLE N'ÉCRASE PAS, et elle est idempotente : une journée
 * présente des deux côtés garde le meilleur essai, puis la ligne anonyme
 * disparaît — sinon le joueur compterait deux fois dans sa propre foule.
 * Appelée à chaque connexion, comme `enregistreResultats`.
 */
export async function rattachePays(): Promise<number | null> {
  const jeton = monJetonPays();
  if (!jeton) return null;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_game_pays_rattacher", { p_jeton: jeton });
  if (error) return null;
  return typeof data === "number" ? data : null;
}
