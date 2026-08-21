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
 * Les journées qui gardent leur format chiffré, quoi qu'on change au rythme.
 *
 * ⚠️ CE N'EST PAS UN RÉGLAGE, C'EST UNE LAISSE D'EAU — et ce qu'elle marque,
 * c'est UNE JOURNÉE QUI A DES RÉPONSES EN BASE, pas une journée passée. Une
 * journée répondue en chiffré a ses réponses dans `scrutin_banalo_reponses`, son
 * résultat dans des liens de partage, et sa relecture dans `JourneePrecedente` :
 * la basculer en mots échouerait tout ça d'un coup — l'écran chercherait une
 * grille là où il y a des nombres, et les réponses déjà déposées deviendraient
 * inatteignables.
 *
 * ⚠️ ELLE NE SE MODIFIE DONC PAS AU JUGÉ, MAIS SUR UNE REQUÊTE. La journée 2 a
 * été rendue aux mots le 21 août 2026, en cours de journée, après avoir vérifié
 * qu'elle n'avait reçu AUCUNE réponse, dans aucune des quatre langues :
 *
 *     select jour, langue, count(*) from scrutin_banalo_reponses group by 1, 2;
 *
 * Tant que ce compte est nul pour une journée, son format est encore libre. Dès
 * qu'il ne l'est plus, il est figé pour de bon.
 */
export const JOURNEES_PARUES = 1;

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
