// QUELLE JOURNÉE JOUE-T-ON — et avec quels critères.
//
// ⚠️ SERVEUR UNIQUEMENT : ce module touche `journees.ts`, qui contient toutes les
// réponses. Il n'est importé que par les routes d'API et par la page (composant
// serveur), jamais par un composant client.
import { CRITERE_PAR_ID, type Critere } from "@/content/pays/criteres";
import { JOURNEES } from "@/content/pays/journees";
import { dateCivile, numeroDeJournee } from "./moteur";

/** Le numéro de la journée en cours, à l'heure de Paris. 1 = journée d'origine. */
export function numeroDuJour(quand: Date = new Date()): number {
  return numeroDeJournee(dateCivile(quand));
}

/**
 * Les cinq critères d'une journée donnée.
 *
 * ⚠️ LE STOCK TOURNE EN ROND QUAND IL EST ÉPUISÉ. Cinquante-trois journées, puis
 * la cinquante-quatrième rejoue la première. Ce n'est pas l'idéal, mais c'est le
 * seul comportement qui ne casse pas : la spec (§14) demande de traiter le cas
 * « puzzle manquant pour la journée », et un écran d'erreur un matin serait pire
 * qu'une reprise. Le vrai remède est de relancer `scripts/pays-journees.ts` avec
 * une bibliothèque de critères enrichie — le compte de journées restantes est
 * dans le journal de génération, pas caché.
 */
export function journeeDe(numero: number): { criteres: Critere[]; cible: string; index: number } {
  // Modulo positif : un numéro négatif (horloge client farfelue) doit retomber
  // sur une journée valide, pas sur `undefined`.
  const index = ((((numero - 1) % JOURNEES.length) + JOURNEES.length) % JOURNEES.length);
  const j = JOURNEES[index];
  return { criteres: j.criteres.map((id) => CRITERE_PAR_ID[id]), cible: j.cible, index };
}

export const NB_JOURNEES = JOURNEES.length;
