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

/** Mon rang du jour. `rang: null` = journée pas encore enregistrée, ce n'est pas une erreur. */
export async function monRang(jour: number): Promise<RangPays | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_game_pays_rank", { p_jour: jour });
  if (error || !data) return null;
  return data as RangPays;
}
