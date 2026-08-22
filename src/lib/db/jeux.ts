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

// ──────────────────────────────────────────── le pseudo, et le classement sur la durée

/**
 * MON PSEUDO DE COMPTE.
 *
 * ⚠️ C'EST LE SEUL NOM DU PRODUIT QUI SURVIT À UNE JOURNÉE, et c'est la
 * contrepartie du classement sur la durée : sans nom qui persiste, il n'y a rien
 * à cumuler. Partout ailleurs — tableau du jour, groupe d'amis — le nom vit dans
 * son contexte et meurt avec lui. Voir `20260825-jeux-pseudo-et-cumul.sql`.
 */
export interface MonPseudo {
  pseudo: string | null;
  /** Un modérateur l'a retiré : le joueur doit en poser un autre. */
  bloque: boolean;
}

export async function monPseudo(): Promise<MonPseudo | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_jeux_pseudo_moi");
  if (error) return null;
  const d = data as Record<string, unknown> | null;
  if (!d) return null;
  return { pseudo: typeof d.pseudo === "string" ? d.pseudo : null, bloque: d.bloque === true };
}

export type DepotPseudo = "ok" | "pris" | "court" | "long" | "refus" | "panne";

export async function poserPseudo(pseudo: string): Promise<DepotPseudo> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_jeux_pseudo_poser", { p_pseudo: pseudo });
  // ⚠️ UNE PANNE N'EST PAS UN REFUS : rien n'est parti, et le dire autrement
  // ferait croire au joueur que son nom a été jugé.
  if (error) return "panne";
  const s = (data as Record<string, unknown> | null)?.status;
  return s === "ok" || s === "pris" || s === "court" || s === "long" ? s : "refus";
}

/** Une ligne du classement sur la durée. Un pseudo, une moyenne, un effectif. */
export interface LigneCumul {
  place: number;
  pseudo: string;
  /** Le centile moyen sur la fenêtre. Plus c'est bas, mieux c'est. */
  moyenne: number;
  journees: number;
  moi: boolean;
}

export interface Cumul {
  joueurs: number;
  lignes: LigneCumul[];
  /** Ma ligne, même hors de la tête de liste. `null` si je ne suis pas classé. */
  moi: Omit<LigneCumul, "moi"> | null;
  /** Ma place il y a une semaine, pour dire la progression. `null` si je n'étais pas classé. */
  avant: number | null;
}

/** Les trois portées du classement sur la durée. */
export type PorteeCumul = "banalo" | "pays" | "tout";

function litLigne(brut: unknown): LigneCumul | null {
  const l = brut as Record<string, unknown> | null;
  if (!l) return null;
  const place = typeof l.place === "number" ? l.place : null;
  const pseudo = typeof l.pseudo === "string" && l.pseudo.trim().length > 0 ? l.pseudo : null;
  const moyenne = typeof l.moyenne === "number" ? l.moyenne : Number(l.moyenne);
  if (place === null || pseudo === null || !Number.isFinite(moyenne)) return null;
  return {
    place,
    pseudo,
    moyenne,
    journees: typeof l.journees === "number" ? l.journees : 0,
    moi: l.moi === true,
  };
}

/**
 * Le classement sur la durée — trente journées glissantes.
 *
 * ⚠️ LES DEUX NUMÉROS DE JOURNÉE VIENNENT D'ICI, un par jeu : les deux
 * calendriers n'ont ni la même origine ni la même charnière (11 h 30 pour
 * Banalo, minuit pour Cinq sur cinq), et la base ne connaît ni fuseau ni
 * charnière. C'est la même règle que partout dans ces jeux.
 *
 * ⚠️ ET IL SE LIT SANS COMPTE. Il faut un compte pour Y FIGURER, pas pour le
 * regarder : un classement qu'on ne peut pas voir avant de s'inscrire ne donne
 * aucune raison de s'inscrire.
 */
export async function cumul(
  jourBanalo: number,
  jourPays: number,
  portee: PorteeCumul,
): Promise<Cumul | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_jeux_cumul", {
    p_jour_banalo: jourBanalo,
    p_jour_pays: jourPays,
    p_jeu: portee,
  });
  if (error) return null;
  const d = data as Record<string, unknown> | null;
  if (!d || d.status !== "ok") return null;
  const brutes = Array.isArray(d.lignes) ? d.lignes : [];
  const moi = litLigne(d.moi);
  return {
    joueurs: typeof d.joueurs === "number" ? d.joueurs : 0,
    lignes: brutes.map(litLigne).filter((l): l is LigneCumul => l !== null),
    moi: moi ? { place: moi.place, pseudo: moi.pseudo, moyenne: moi.moyenne, journees: moi.journees } : null,
    // ⚠️ PAS DE REPLI SUR ZÉRO. « place 0 la semaine dernière » n'existe pas, et
    // afficher une progression inventée est pire que n'en afficher aucune.
    avant: typeof d.avant === "number" ? d.avant : null,
  };
}
