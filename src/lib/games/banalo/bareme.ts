// LE BARÈME DE BANALO DU JOUR — noter un nombre contre une foule.
//
// Ce fichier ne connaît que des NOMBRES : aucune question, aucun joueur. Il est
// donc utilisable des deux côtés, et testable seul.
//
// ⚠️ ON NE CHERCHE PAS LA VÉRITÉ, ET C'EST ASSUMÉ. La référence est la réponse
// COMMUNE, pas la réponse juste. Sur « combien de battements de cœur dans une
// vie », la foule tombera sans doute près du vrai ; sur « combien de fenêtres à
// Paris », elle peut être collectivement très loin, et le jeu la récompensera
// quand même. C'est cohérent avec le nom du jeu — être banal, pas avoir raison —
// mais l'écran doit le dire, sinon quelqu'un viendra reprocher au jeu de s'être
// trompé.

/** Points possibles pour une réponse. Le maximum tient dans un chiffre. */
export const POINTS_MAX = 10;

/**
 * La référence du jour : la MÉDIANE, jamais la moyenne.
 *
 * ⚠️ MESURÉ, et l'écart est violent. Sur mille estimations dont 1 % d'absurdités
 * (le troll, l'unité confondue, le doigt qui glisse), pour une vérité à 4 200 :
 *
 *     moyenne arithmétique   3,6 × 10⁸   ← détruite
 *     moyenne géométrique        4 646   ← encore tirée vers le haut
 *     MÉDIANE                    3 930   ← tient
 *
 * Une seule réponse à 10¹⁵ suffit à emporter une moyenne ; elle ne déplace la
 * médiane que d'un rang.
 */
export function medianeDe(valeurs: number[]): number {
  const bonnes = valeurs.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (bonnes.length === 0) return 0;
  const m = Math.floor(bonnes.length / 2);
  // ⚠️ EFFECTIF PAIR : ON PREND LA VALEUR DU BAS, ON N'INTERPOLE PAS. Ce n'est
  // pas la médiane la plus élégante — une moyenne géométrique des deux centrales
  // serait « plus juste » sur une grandeur qui s'étale sur des ordres de
  // grandeur. Mais l'AUTORITÉ est `percentile_disc(0.5)` en base, qui rend
  // toujours une valeur OBSERVÉE, et deux calculs qui divergent d'un cheveu
  // donneraient deux scores différents au même joueur selon qui a répondu.
  // Ici on préfère l'accord exact à la finesse.
  return bonnes[bonnes.length % 2 ? m : m - 1]!;
}

/**
 * L'écart, exprimé en FACTEUR : combien de fois la réponse est trop grande ou
 * trop petite. `2` veut dire « le double ou la moitié », dans les deux sens.
 *
 * ⚠️ EN FACTEURS, PAS EN UNITÉS, et c'est ce qui rend le jeu juste. Deux joueurs
 * également bons, l'un à ÷3 et l'autre à ×3 de la médiane :
 *
 *     écart linéaire       2 620  vs  7 860   → le prudent gagne toujours
 *     écart logarithmique   0,48  vs   0,48   → à égalité, comme il se doit
 *
 * Noter au linéaire récompenserait systématiquement celui qui sous-estime, ce
 * qui n'est pas une compétence.
 */
export function facteurDe(reponse: number, reference: number): number {
  if (!(reponse > 0) || !(reference > 0)) return Infinity;
  return reponse >= reference ? reponse / reference : reference / reponse;
}

/**
 * Les points d'une réponse : **dix, moins dix par facteur dix d'écart.**
 *
 *     points = 10 − 10·log₁₀(facteur), borné à [0 ; 10], arrondi au centième
 *
 * ⚠️ C'ÉTAIT CINQ PALIERS, ET LES CINQ PALIERS NE CLASSAIENT RIEN. Mesuré sur
 * une foule simulée (log-normale d'écart-type ×3, plus 1 % d'absurdités) :
 *
 *                       scores distincts   ex aequo   plus gros paquet
 *     paliers,    214 joueurs        5       100 %        42 %
 *     paliers, 20 000 joueurs        5       100 %        38 %
 *     CONTINU,    214 joueurs      188                     2,3 %
 *     CONTINU, 20 000 joueurs      944                     4,7 %
 *
 * Avec cinq valeurs possibles, le rang et la part n'avaient plus rien à
 * mesurer : un joueur sur trois partageait son score avec sept mille autres, et
 * « 63e sur 214 » était surtout une coïncidence de comptage.
 *
 * ⚠️ CE N'EST PAS UN NOUVEAU BARÈME, C'EST L'ANCIEN SANS LES MARCHES. La courbe
 * passe presque exactement par les repères déjà annoncés — ×1,25 → 9,03 (contre
 * 10), ×2 → 6,99 (contre 6), ×5 → 3,01 (contre 3), ×10 → 0 (contre 0). Rien n'a
 * été retuné ; on a seulement cessé d'écraser la valeur sur le bas de sa
 * tranche. Et l'énoncé est plus court qu'avant, ce qui compte : le barème doit
 * rester vérifiable de tête, et il est maintenant écrit à l'écran.
 *
 * ⚠️ LE ZÉRO RESTE UN PAQUET, ET C'EST VOULU. Au-delà de ×10 tout le monde a la
 * même note. « Raté d'un facteur dix ou plus » est UNE information ; départager
 * un joueur à ×50 d'un joueur à ×500 serait du bruit, et ferait dépendre le bas
 * du classement des fautes de frappe.
 *
 * ⚠️ L'ARRONDI AU CENTIÈME N'EST PAS COSMÉTIQUE : LE RANG SE CALCULE DESSUS.
 * Classer sur la valeur exacte et n'afficher que deux décimales montrerait deux
 * joueurs au même score avec deux rangs différents — l'écran se contredirait
 * tout seul. La base fait pareil, en `numeric`, où l'égalité est exacte.
 */
export function pointsDe(facteur: number): number {
  if (!Number.isFinite(facteur) || facteur >= 10) return 0;
  if (facteur <= 1) return POINTS_MAX;
  return Math.round((10 - 10 * Math.log10(facteur)) * 100) / 100;
}

/**
 * En dessous de ce nombre de réponses, on n'affiche NI centile NI rang.
 *
 * ⚠️ « 3e sur 7 » n'est pas un rang, c'est du bruit — et il n'y a pas encore
 * d'ex aequo à compter. C'est la même règle que pour les pourcentages : ce qu'on
 * affiche suit le nombre de votants. En dessous, on dit que le dépouillement
 * commence.
 */
export const VOTANTS_MIN = 20;

export interface Position {
  /** Rang olympique : à score égal, même rang. */
  rang: number;
  /** Combien partagent exactement ce score, celui-ci compris. */
  exAequo: number;
  votants: number;
  /**
   * La part des joueurs qui ont fait STRICTEMENT mieux, en pourcentage.
   * `null` tant que l'effectif est sous le plancher.
   *
   * ⚠️ SANS LE « +1 » DU RANG, ET C'EST TOUT L'INTÉRÊT. La première version
   * calculait `(meilleurs + 1) / votants`, ce qui paraît naturel puisque c'est
   * le rang divisé par l'effectif — mais le « +1 » pèse 1 point à cent votants
   * et 0,1 à mille. La même performance affichait donc 21 % à midi et 20 % le
   * lendemain : le chiffre censé NE PAS bouger bougeait, ce qui lui retirait sa
   * seule raison d'être. Attrapé par le test, pas à la relecture.
   */
  partMieux: number | null;
}

/**
 * Où se situe un score dans la foule du jour.
 *
 * ⚠️ LE RANG EST OLYMPIQUE, comme celui de Cinq sur cinq et pour la même raison :
 * à score égal, même rang. Sinon deux joueurs identiques sont départagés par
 * l'ordre d'arrivée, et c'est le fuseau horaire qu'on récompense.
 *
 * ⚠️ ET C'EST LA PART QU'ON MET DEVANT, pas le rang. Le rang provisoire va
 * MÉCANIQUEMENT empirer : 38e sur 210 à midi, 412e sur 2 300 le lendemain, sans
 * avoir rien fait de mal. Un joueur qui a vu le premier chiffre et découvre le
 * second se croira floué. La part, elle, ne bouge pas — c'est donc elle qui
 * porte le sens, et le rang se lit en second, pour comprendre sa position.
 */
export function positionDe(monScore: number, tousLesScores: number[]): Position {
  const votants = tousLesScores.length;
  const meilleurs = tousLesScores.filter((s) => s > monScore).length;
  const exAequo = tousLesScores.filter((s) => s === monScore).length;
  return {
    rang: meilleurs + 1,
    exAequo,
    votants,
    // Aucun « +1 » : c'est ce qui rend la valeur stable quand la foule grandit.
    // Zéro est une vraie valeur — personne n'a fait mieux, et c'est à dire.
    partMieux: votants >= VOTANTS_MIN ? Math.round((100 * meilleurs) / votants) : null,
  };
}
