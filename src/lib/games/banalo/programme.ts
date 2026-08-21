// LE PROGRAMME DES JOURNÉES — quel format tombe quel jour.
//
// Banalo du jour a deux formats : un NOMBRE à estimer, et des MOTS à trouver.
// Ils partagent la journée, la charnière de 11 h 30, le jeton et la purge ; seul
// ce qu'on tape change.
//
// ⚠️ LES DEUX FORMATS DISENT LA MÊME CHOSE AU JOUEUR, et ce n'est pas un hasard
// heureux : c'est ce qui autorise à les mélanger. L'étude avertissait que « deux
// barèmes inverses cohabitent » — viser le centre pour une question, viser la
// bande rare pour une autre — et qu'un joueur qui applique le mauvais perd sans
// comprendre pourquoi. En choisissant le barème du CENTRE pour les mots, cet
// avertissement tombe : nombre ou mots, la consigne est **répondez comme la
// foule**. Il n'y a plus rien à expliquer d'un jour à l'autre.
//
// ⚠️ LE FORMAT CHIFFRÉ NE PASSE PLUS QU'UNE FOIS PAR SEMAINE, et c'est un retour
// de terrain, pas un calcul. Estimer un grand nombre marche très bien de temps
// en temps ; EN SÉRIE, ça ne convainc pas — chaque journée ressemble à la
// veille, et le geste (taper un ordre de grandeur au jugé) s'use beaucoup plus
// vite que celui d'écrire six mots. Le format chiffré devient donc le rendez-
// vous de la semaine, et les mots portent le quotidien.
//
// Effet secondaire, et il est bon : à une question par semaine, les 15 questions
// chiffrées tiennent quinze semaines au lieu de trente journées. ⚠️ En revanche
// les 68 thèmes, tirés six fois par semaine, font onze semaines — c'est
// désormais LE STOCK QUI SE VIDE LE PREMIER. Le jour où on voudra allonger le
// calendrier, c'est là qu'il faut ajouter, pas dans les questions.
import { QUESTIONS, questionDe, type Question } from "@/content/banalo/questions";
import { casesDe, themeDe } from "@/content/banalo/mots";
import type { Theme } from "./themes";

export type Programme =
  | { type: "nombre"; question: Question }
  | { type: "mots"; theme: Theme; cases: number };

/** Combien de questions chiffrées existent en stock. */
export const JOURNEES_CHIFFREES = QUESTIONS.length;

/**
 * Les journées DÉJÀ PARUES quand le rythme a changé, le 21 août 2026.
 *
 * ⚠️ CE N'EST PAS UN RÉGLAGE, C'EST UNE LAISSE D'EAU. Ces journées-là sont
 * sorties en format chiffré : des joueurs y ont répondu, leurs réponses sont en
 * base sous ce format, et leur résultat voyage dans des liens de partage.
 * Changer leur format après coup rendrait la journée précédente illisible et
 * ferait chercher une grille de mots là où il y a des nombres.
 *
 * Elle ne baisse JAMAIS. Elle ne monte que si l'on rebasculait des journées
 * déjà parues vers le chiffré, ce qui n'arrivera pas.
 */
export const JOURNEES_PARUES = 2;

/** Une journée chiffrée toutes les sept, à partir de la première non parue. */
export const CYCLE = 7;

/**
 * Le format d'une journée donnée.
 *
 * Après les journées déjà parues, la semaine est réglée ainsi : six journées de
 * mots, puis la journée chiffrée. Le rang de la journée DANS SON PROPRE FORMAT
 * sert d'index — ce qui fait que chaque stock tourne à son rythme et
 * qu'aucune question, aucun thème, n'est sauté.
 *
 * ⚠️ LA JOURNÉE CHIFFRÉE EST EN FIN DE CYCLE, PAS AU DÉBUT, et c'est le point
 * qu'on ne voit qu'en imprimant le calendrier. Les deux journées déjà parues
 * sont chiffrées ; ouvrir le premier cycle par une chiffrée en aurait fait
 * TROIS D'AFFILÉE — précisément la série qu'on cherche à casser. En la mettant
 * au bout, la première non parue est une journée de mots et l'écart maximal est
 * laissé derrière.
 */
export function programmeDe(jour: number): Programme {
  // ⚠️ AVANT LA PREMIÈRE JOURNÉE PARUE AUSSI. Une horloge farfelue (un client
  // qui se croit en 2019) demande la journée −500 : elle doit rendre un jeu,
  // pas un écran blanc. Le modulo de `questionDe` s'en charge.
  if (jour <= JOURNEES_PARUES) return { type: "nombre", question: questionDe(jour) };

  const apres = jour - JOURNEES_PARUES - 1; // 0 pour la première journée réglée
  // Combien de journées chiffrées se sont déjà présentées, celle-ci comprise.
  const chiffrees = Math.floor((apres + 1) / CYCLE);

  if (apres % CYCLE === CYCLE - 1) {
    // Les journées parues comptent dans la suite des questions : sinon on
    // repasserait la question n° 1 au bout d'une semaine.
    return { type: "nombre", question: questionDe(JOURNEES_PARUES + chiffrees) };
  }
  // Le rang de cette journée parmi les journées de MOTS : toutes les journées
  // réglées, moins les chiffrées déjà passées.
  const theme = themeDe(apres + 1 - chiffrees);
  return { type: "mots", theme, cases: casesDe(theme) };
}
