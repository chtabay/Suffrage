import type { ComputeResult } from "./voting/types";
import { pickLocale } from "@/i18n/locales";

export function waUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function buildVoteShareText(question: string, url: string, locale = "fr"): string {
  const here = pickLocale(locale, { fr: "Votez ici :", en: "Vote here:", es: "Vota aquí:" });
  return `🗳️ ${question}\n${here} ${url}`;
}

export function buildResultText(
  question: string,
  result: ComputeResult,
  ballotCount: number,
  optionsCount: number,
  url: string,
  locale = "fr",
  methodName: string = result.methodName,
  survey = false,
): string {
  // Sondage : pas de gagnant à annoncer — on partage le panorama.
  if (survey) {
    const line = pickLocale(locale, {
      fr: `Résultats du sondage (${methodName}) — ${ballotCount} participant${ballotCount > 1 ? "s" : ""}, ${optionsCount} options.`,
      en: `Survey results (${methodName}) — ${ballotCount} participant${ballotCount > 1 ? "s" : ""}, ${optionsCount} options.`,
      es: `Resultados de la encuesta (${methodName}) — ${ballotCount} participante${ballotCount > 1 ? "s" : ""}, ${optionsCount} opciones.`,
    });
    const tail = pickLocale(locale, { fr: "Panorama complet :", en: "Full picture:", es: "Panorama completo:" });
    return `📊 ${question}\n${line}\n${tail} ${url}`;
  }
  const subject = result.hasWinner
    ? result.winnerName
    : result.noWinnerLabel ?? pickLocale(locale, { fr: "pas de vainqueur", en: "no winner", es: "sin ganador" });
  const verdict = result.hasWinner
    ? pickLocale(locale, {
        fr: `Résultat : ${subject} l'emporte (${methodName}).`,
        en: `Result: ${subject} wins (${methodName}).`,
        es: `Resultado: ${subject} gana (${methodName}).`,
      })
    : pickLocale(locale, {
        fr: `Résultat : ${subject} (${methodName}).`,
        en: `Result: ${subject} (${methodName}).`,
        es: `Resultado: ${subject} (${methodName}).`,
      });
  const stats = pickLocale(locale, {
    fr: `${ballotCount} participant${ballotCount > 1 ? "s" : ""}, ${optionsCount} options.`,
    en: `${ballotCount} participant${ballotCount > 1 ? "s" : ""}, ${optionsCount} options.`,
    es: `${ballotCount} participante${ballotCount > 1 ? "s" : ""}, ${optionsCount} opciones.`,
  });
  const tail = pickLocale(locale, { fr: "Détail :", en: "Details:", es: "Detalle:" });
  return `🗳️ ${question}\n${verdict}\n${stats}\n${tail} ${url}`;
}
