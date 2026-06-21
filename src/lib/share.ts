import type { ComputeResult } from "./voting/types";

export function waUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function buildVoteShareText(question: string, url: string): string {
  return `🗳️ ${question}\nVotez ici : ${url}`;
}

export function buildResultText(
  question: string,
  result: ComputeResult,
  ballotCount: number,
  optionsCount: number,
  url: string,
): string {
  const verdict = result.hasWinner
    ? `Résultat : ${result.winnerName} l'emporte (${result.methodName}).`
    : `Résultat : ${result.noWinnerLabel ?? "pas de vainqueur"} (${result.methodName}).`;
  const stats = `${ballotCount} participant${ballotCount > 1 ? "s" : ""}, ${optionsCount} options.`;
  return `🗳️ ${question}\n${verdict}\n${stats}\nDétail : ${url}`;
}
