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

/**
 * Points possibles pour une réponse.
 *
 * ⚠️ CENT, AVEC UNE DÉCIMALE — et les deux moitiés de cette phrase comptent.
 * La BASE est de la présentation pure : « 87,5 sur 100 » et « 875 sur 1000 »
 * sont la même valeur aux mêmes paliers (mesuré : 188 scores distincts sur
 * 214 joueurs dans les deux cas, paquets d'ex aequo identiques). La DÉCIMALE,
 * elle, porte toute la résolution : cent paliers entiers au lieu de mille font
 * remonter les ex aequo médians de 28 à 259 sur 20 000 joueurs. Retirer la
 * décimale « pour faire propre » refabriquerait en petit le problème des cinq
 * paliers.
 */
export const POINTS_MAX = 100;

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
 *     points = 100 − 100·log₁₀(facteur), borné à [0 ; 100], arrondi au dixième
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
 * passe presque exactement par les repères déjà annoncés — ×1,25 → 90,3 (contre
 * 100), ×2 → 69,9 (contre 60), ×5 → 30,1 (contre 30), ×10 → 0. Rien n'a
 * été retuné ; on a seulement cessé d'écraser la valeur sur le bas de sa
 * tranche. Et l'énoncé est plus court qu'avant, ce qui compte : le barème doit
 * rester vérifiable de tête, et il est maintenant écrit à l'écran.
 *
 * ⚠️ LE ZÉRO RESTE UN PAQUET, ET C'EST VOULU. Au-delà de ×10 tout le monde a la
 * même note. « Raté d'un facteur dix ou plus » est UNE information ; départager
 * un joueur à ×50 d'un joueur à ×500 serait du bruit, et ferait dépendre le bas
 * du classement des fautes de frappe.
 *
 * ⚠️ L'ARRONDI AU DIXIÈME N'EST PAS COSMÉTIQUE : LE RANG SE CALCULE DESSUS.
 * Classer sur la valeur exacte et n'afficher que deux décimales montrerait deux
 * joueurs au même score avec deux rangs différents — l'écran se contredirait
 * tout seul. La base fait pareil, en `numeric`, où l'égalité est exacte.
 */
export function pointsDe(facteur: number): number {
  if (!Number.isFinite(facteur) || facteur >= 10) return 0;
  if (facteur <= 1) return POINTS_MAX;
  return Math.round((100 - 100 * Math.log10(facteur)) * 10) / 10;
}

/**
 * En dessous de ce nombre de réponses, on n'affiche NI centile NI rang.
 *
 * ⚠️ IL VALAIT 20, ET IL EST TOMBÉ À 2. Le motif écrit était « 3e sur 7 n'est
 * pas un rang, c'est du bruit » ; il est parti pour la même raison que le
 * plancher de score avant lui — ce qu'il protégeait valait moins que ce qu'il
 * coûtait. Vu sur la vraie journée 2, à six votants : la carte se réduisait à
 * « 9 voix » et rien d'autre, sans aucune échelle, là où « 2e sur 6 » en donne
 * une, grossière mais vraie. Et le format « mots » en a d'autant plus besoin
 * que sa somme dépend du nombre de votants et de la nature du thème.
 *
 * ⚠️ DEUX, ET PAS UN. Seul votant, on est « 1er sur 1 » avec 0 % de joueurs
 * devant : ce n'est pas un classement, c'est une tautologie — la même que le
 * 100 du premier arrivé sur le format chiffré.
 *
 * ⚠️ CE QUE ÇA REND EST GROSSIER, ET C'EST ASSUMÉ : à six votants le centile
 * avance par pas de 17 points. C'est aussi pourquoi l'écran met la PART devant
 * le rang — le rang brut, lui, empire mécaniquement quand la foule grandit.
 *
 * La valeur vit aussi en base (`v_min_position`), dans les deux fonctions
 * d'état : `20260822-banalo-position-des-deux.sql`. Les deux bougent ensemble.
 */
export const VOTANTS_MIN = 2;

/**
 * En dessous de ce nombre de votants, la COURBE DES SCORES ne se dessine pas.
 *
 * ⚠️ CE N'EST PAS `VOTANTS_MIN`, ET LES DEUX NE DOIVENT PAS SE CONFONDRE. Un
 * centile grossier reste VRAI : « 3e sur 6 » dit quelque chose, même par pas de
 * 17 points. Un histogramme grossier, lui, MENT — il dessine une forme là où il
 * n'y a que du bruit. Sur la vraie journée 2 (11 joueurs), la courbe vaut
 * [2,1,1,3,4] : un joueur de plus ou de moins déplace une barre d'un quart.
 *
 * Le seuil vise DIX JOUEURS PAR BARRE. Le nombre de barres suit la foule
 * (`least(10, greatest(4, votants / 2))`), donc il plafonne à dix : il faut une
 * centaine de votants pour dix par barre, cinquante pour cinq. On prend
 * cinquante — la moitié du confort, le double de ce qui serait manifestement
 * faux — et on le relèvera sur des journées réelles plutôt que sur une intuition.
 *
 * ⚠️ CONSÉQUENCE ASSUMÉE : à onze joueurs, la courbe NE S'AFFICHE PAS. Ce n'est
 * pas un défaut, c'est le sujet — elle attend une foule, et elle s'allumera
 * seule le jour où elle arrivera.
 */
export const COURBE_MIN = 50;

/** Au-delà de ce facteur, tout le monde est à zéro et personne n'est départagé. */
export const FACTEUR_PLAFOND = 10;

export interface Position {
  /** Rang olympique : à écart égal, même rang. */
  rang: number;
  /** Combien partagent exactement cet écart, celui-ci compris. */
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
 * Où se situe un joueur dans la foule du jour, D'APRÈS SON ÉCART.
 *
 * ⚠️ ON CLASSE SUR LE FACTEUR, PAS SUR LES POINTS, ET C'EST UNE CORRECTION.
 * Les premières versions classaient sur le score ARRONDI, avec un raisonnement
 * qui semblait prudent : « même score affiché, même rang », pour que l'écran ne
 * se contredise pas quand deux amis comparent leurs téléphones. C'était payer
 * trop cher — arrondir avant de compter déclare identiques deux joueurs dont
 * les réponses diffèrent vraiment, pour éviter une surprise purement
 * cosmétique. Mesuré en base : sur 200 réponses toutes distinctes, l'arrondi
 * fabriquait des paquets d'ex aequo ; le facteur en rend ZÉRO.
 *
 * Le rang est la chose PRÉCISE ; le score affiché n'est qu'un résumé lisible de
 * cette chose. C'est le résumé qui s'efface devant le rang, pas l'inverse.
 *
 * Le score étant une fonction strictement décroissante du facteur, classer par
 * facteur croissant donne exactement le même ORDRE — mais sans arrondi. Deux
 * joueurs sont donc ex aequo si et seulement si leur écart est le même, c'est-à-
 * dire s'ils ont donné la même réponse, ou les deux réponses symétriques (÷k et
 * ×k) — qui méritent l'égalité, puisque tout le barème est bâti sur elle.
 *
 * ⚠️ LE PLAFOND N'EST PAS UNE PRÉCAUTION, C'EST LE PAQUET DES ZÉROS. Sans lui,
 * un joueur à ×50 passerait devant un joueur à ×500 alors que l'écran affiche
 * 0,0 aux deux : on classerait des fautes de frappe.
 *
 * ⚠️ ET C'EST LA PART QU'ON MET DEVANT, pas le rang. Le rang provisoire va
 * MÉCANIQUEMENT empirer : 38e sur 210 à midi, 412e sur 2 300 le lendemain, sans
 * avoir rien fait de mal. Un joueur qui a vu le premier chiffre et découvre le
 * second se croira floué. La part, elle, ne bouge pas — c'est donc elle qui
 * porte le sens, et le rang se lit en second, pour comprendre sa position.
 */
export function positionDe(monFacteur: number, tousLesFacteurs: number[]): Position {
  const borne = (f: number) => Math.min(Number.isFinite(f) ? f : FACTEUR_PLAFOND, FACTEUR_PLAFOND);
  const mien = borne(monFacteur);
  const tous = tousLesFacteurs.map(borne);
  const votants = tous.length;
  // Petit facteur = meilleur.
  const meilleurs = tous.filter((f) => f < mien).length;
  const exAequo = tous.filter((f) => f === mien).length;
  return {
    rang: meilleurs + 1,
    exAequo,
    votants,
    // Aucun « +1 » : c'est ce qui rend la valeur stable quand la foule grandit.
    // Zéro est une vraie valeur — personne n'a fait mieux, et c'est à dire.
    partMieux: votants >= VOTANTS_MIN ? Math.round((100 * meilleurs) / votants) : null,
  };
}
