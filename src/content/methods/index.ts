import type { DeepFiche, DeepFiches } from "./types";
import fr from "./fr";
import en from "./en";
import es from "./es";
import pcm from "./pcm";

const ALL: Record<string, DeepFiches> = { fr, en, es, pcm };

/**
 * Fiche de fond d'une méthode, dans la langue demandée. Double repli : locale
 * inconnue → français, clé non traduite → français. Une fiche affichée en
 * français vaut mieux qu'une page amputée de sa moitié.
 */
export function deepFiche(locale: string, key: string): DeepFiche | undefined {
  return ALL[locale]?.[key] ?? fr[key];
}

export type { DeepFiche, DeepExample, DeepFiches } from "./types";
export { RELATED } from "./related";
