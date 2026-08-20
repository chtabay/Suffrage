// LE FORMAT « MOTS » DE BANALO DU JOUR — un thème, six cases, et la foule décide.
//
// ⚠️ CE FICHIER N'EST PAS `lib/games/banalo/themes.ts`, ET C'EST VOULU. Les 70
// thèmes appartiennent au jeu de salon, qui est clos ; on les LIT sans les
// toucher. Tout ce qui est propre au mode quotidien vit ici.
//
// ═══════════════════════════════════════════════ ce que le barème demande, et
//                                                 pourquoi le nombre de cases
//                                                 est une donnée de CONTENU
//
// La règle est celle du Banalo de salon — **être banal** : une réponse rapporte
// d'autant plus que d'autres joueurs l'ont donnée. Deux propriétés en découlent,
// toutes deux mesurées :
//
//  · **Elle résiste à l'entente.** Quatre-vingt-dix complices sur trois mille
//    atterrissent au 85ᵉ centile : pour gagner il faut ÊTRE la foule. Le barème
//    inverse — récompenser la rareté corroborée, que proposait l'étude — laisse
//    CINQ complices gagner la journée d'emblée sur trois cents joueurs, parce
//    que « rare mais confirmé par plusieurs » est exactement ce qu'une petite
//    entente fabrique. Aucune forme de courbe ne rattrape ça.
//
//  · **Elle s'effondre si les cases ne dépassent pas l'évidence.** Là est tout
//    le réglage. Sur trois mille joueurs qui optimisent tous :
//
//        cases   évidentes   totaux distincts   plus gros paquet
//          3         3               1              100 %
//          6         3             367                0,8 %
//          6         4             147                2,0 %
//          6         5              23               13,9 %
//          7         5             131                2,1 %
//          8         5             283                1,1 %
//
//    Trois cases NE FORCENT RIEN quand trois réponses sont évidentes : tout le
//    monde écrit les mêmes et tout le monde est premier. Le jeu vit dans l'écart
//    entre le nombre de cases et le nombre de réponses évidentes.
//
// ⚠️ ET « COMBIEN DE RÉPONSES SONT ÉVIDENTES » NE SE DEVINE PAS. « La pizza » en
// a peut-être cinq (tomate, fromage, pâte, four, Italie), « La magie » peut-être
// trois. On ne peut pas le savoir avant de jouer — et la purge à sept jours
// interdit de l'apprendre par accumulation. D'où `CASES_PAR_DEFAUT` partout au
// départ, et `CASES` pour les exceptions qu'on découvrira : un thème dont le
// dépouillement montre un gros paquet d'ex aequo EN HAUT prend une case de plus.
// Une seule case divise le paquet par six.
import { THEMES, type Theme } from "@/lib/games/banalo/themes";

/**
 * Six cases : le choix par défaut, tant qu'on n'a rien mesuré sur un thème.
 *
 * Trois cases seraient l'évidence pure ; huit ramèneraient le remplissage que le
 * jeu de salon reproche à ses huit mots. Six laisse trois cases « offertes »,
 * qui font plaisir et ne classent personne, et trois qui font le jeu.
 */
export const CASES_PAR_DEFAUT = 6;

/** Bornes dures : l'écran, la base et le barème s'y fient. */
export const CASES_MIN = 5;
export const CASES_MAX = 8;

/**
 * Les thèmes dont on a MESURÉ que l'évidence est large, avec leur nombre de
 * cases relevé. Vide au lancement : on ne remplit cette table que sur données
 * réelles, jamais sur intuition — c'est tout l'objet du corpus anonyme.
 */
export const CASES: Record<string, number> = {};

/** Le thème d'une journée de mots. Le stock tourne en rond, comme les questions. */
export function themeDe(numero: number): Theme {
  const i = (((numero - 1) % THEMES.length) + THEMES.length) % THEMES.length;
  return THEMES[i]!;
}

/**
 * L'identifiant STABLE d'un thème, indépendant de la langue.
 *
 * ⚠️ IL SERT DE CLÉ DE FOULE EN BASE, donc il ne doit jamais bouger : le
 * français est arbitraire mais fixe, là où l'indice dans `THEMES` se décalerait
 * au premier thème inséré au milieu.
 */
export function cleTheme(t: Theme): string {
  return t.fr;
}

/** Combien de cases pour ce thème. */
export function casesDe(t: Theme): number {
  const n = CASES[cleTheme(t)] ?? CASES_PAR_DEFAUT;
  return Math.min(CASES_MAX, Math.max(CASES_MIN, n));
}

export const NB_THEMES = THEMES.length;
