// LE PROGRAMME DES JOURNÉES — quel format tombe quel jour.
//
// Banalo du jour a deux formats : un NOMBRE à estimer, et six MOTS à trouver.
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
// ⚠️ LES QUINZE PREMIÈRES JOURNÉES NE BOUGENT PAS. Elles sont déjà sorties, ou
// vont sortir, avec leur question chiffrée ; changer le format d'une journée
// publiée reviendrait à changer le jeu sous les pieds de qui l'a commencée. Les
// mots démarrent donc APRÈS le stock de nombres, et l'alternance commence là.
import { QUESTIONS, questionDe, type Question } from "@/content/banalo/questions";
import { casesDe, themeDe } from "@/content/banalo/mots";
import type { Theme } from "./themes";

export type Programme =
  | { type: "nombre"; question: Question }
  | { type: "mots"; theme: Theme; cases: number };

/** Combien de journées chiffrées ouvrent le calendrier, avant l'alternance. */
export const JOURNEES_CHIFFREES = QUESTIONS.length;

/**
 * Le format d'une journée donnée.
 *
 * Après le stock initial, on alterne une journée sur deux. L'alternance vaut
 * mieux que deux blocs : elle évite qu'un joueur venu pour les nombres trouve
 * soixante-dix journées de mots d'affilée, et elle fait que chaque format garde
 * son rythme propre plutôt que de s'épuiser d'un coup.
 */
export function programmeDe(jour: number): Programme {
  const apres = jour - JOURNEES_CHIFFREES;
  if (apres <= 0) return { type: "nombre", question: questionDe(jour) };
  if (apres % 2 === 1) {
    // Journées de mots : 1re, 2e, 3e… au fil des `apres` impairs.
    const theme = themeDe((apres + 1) / 2);
    return { type: "mots", theme, cases: casesDe(theme) };
  }
  // Journées chiffrées : la rotation reprend où le stock initial s'est arrêté.
  return { type: "nombre", question: questionDe(JOURNEES_CHIFFREES + apres / 2) };
}
