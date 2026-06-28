import type { ComputeResult } from "./voting/types";

export function waUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function buildVoteShareText(question: string, url: string, locale = "fr"): string {
  return locale === "en" ? `🗳️ ${question}\nVote here: ${url}` : `🗳️ ${question}\nVotez ici : ${url}`;
}

export function buildResultText(
  question: string,
  result: ComputeResult,
  ballotCount: number,
  optionsCount: number,
  url: string,
  locale = "fr",
  methodName: string = result.methodName,
): string {
  const en = locale === "en";
  const verdict = result.hasWinner
    ? en
      ? `Result: ${result.winnerName} wins (${methodName}).`
      : `Résultat : ${result.winnerName} l'emporte (${methodName}).`
    : en
      ? `Result: ${result.noWinnerLabel ?? "no winner"} (${methodName}).`
      : `Résultat : ${result.noWinnerLabel ?? "pas de vainqueur"} (${methodName}).`;
  const stats = `${ballotCount} participant${ballotCount > 1 ? "s" : ""}, ${optionsCount} options.`;
  return en
    ? `🗳️ ${question}\n${verdict}\n${stats}\nDetails: ${url}`
    : `🗳️ ${question}\n${verdict}\n${stats}\nDétail : ${url}`;
}
