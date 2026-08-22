// LES JEUX QUOTIDIENS, VUS DEPUIS UNE SEULE PAGE.
//
// ⚠️ CE FICHIER NE CONNAÎT AUCUN JEU EN PARTICULIER, et c'est son intérêt. Il
// rend une JOURNÉE JOUÉE — un numéro, un centile — sous la même forme quel que
// soit le jeu, parce que c'est la seule chose qui se compare entre eux.
//
// ⚠️ ET LE CENTILE EST CETTE SEULE CHOSE. Un nombre d'essais (Cinq sur cinq) et
// une somme de voix (Banalo, format « mots ») ne s'additionnent pas ; le sur-100
// de Banalo ne veut même pas dire la même chose d'un thème à l'autre — son
// maximum ATTEIGNABLE vaut 67,8 sur un thème serré et 13,7 sur un thème ouvert.
// « X % ont fait mieux » veut dire la même chose partout, tous les jours.
//
// ⚠️ IL EST NULLABLE, TOUJOURS. Une journée jouée seul n'a pas de position, et
// `0` voudrait dire « premier » — le repli le plus flatteur possible sur une
// donnée absente.
import { createClient } from "@/lib/supabase/client";

/** Une journée jouée, dans l'unité commune aux jeux. */
export interface JourneeCommune {
  jour: number;
  /** Le pourcentage de joueurs qui ont fait mieux. Plus c'est bas, mieux c'est. */
  mieux: number | null;
  /** Le chiffre PROPRE au jeu — des essais, des voix — pour l'afficher tel quel. */
  brut: number | null;
}

function litJournees(brut: unknown, cleBrut: string): JourneeCommune[] | null {
  const d = brut as Record<string, unknown> | null;
  if (!d || d.status !== "ok" || !Array.isArray(d.journees)) return null;
  return (d.journees as Record<string, unknown>[])
    .map((j) => {
      const jour = typeof j.jour === "number" ? j.jour : null;
      if (jour === null) return null;
      const v = j[cleBrut];
      return {
        jour,
        mieux: typeof j.mieux === "number" ? j.mieux : null,
        brut: typeof v === "number" ? v : null,
      } satisfies JourneeCommune;
    })
    .filter((j): j is JourneeCommune => j !== null);
}

/**
 * Mes journées de Cinq sur cinq.
 *
 * ⚠️ SON CENTILE EST CALCULÉ À LA LECTURE, il n'est pas stocké : le jeu ne garde
 * que le nombre d'essais. Voir `20260825-jeux-historique-pays.sql`.
 */
export async function mesJourneesPays(): Promise<JourneeCommune[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_game_pays_historique");
  if (error) return null;
  return litJournees(data, "essais");
}

/** Mes journées de Banalo du jour. Son centile, lui, est rangé en base. */
export async function mesJourneesBanalo(): Promise<JourneeCommune[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_banalo_historique");
  if (error) return null;
  return litJournees(data, "points");
}
