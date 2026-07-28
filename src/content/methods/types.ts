// Contenu de fond des fiches /methodes/<clé> : histoire, mécanique, exemple
// chiffré, usages, limites, FAQ. Volontairement HORS de messages/*.json — ces
// textes sont longs, éditoriaux, et n'ont rien à faire dans un fichier d'UI
// (le garde-fou de parité i18n compterait des centaines de clés de prose).
// Les TITRES de section, eux, restent dans i18n (namespace `Deep`).

export interface DeepExample {
  /** Le décor de l'exemple, en une phrase. */
  intro: string;
  /** En-têtes du tableau de bulletins. */
  head: string[];
  rows: string[][];
  /** Le dépouillement, étape par étape. */
  steps: string[];
  /** Ce que l'exemple démontre (pas seulement qui gagne). */
  result: string;
}

export interface DeepFiche {
  /** Chapô : 1-2 phrases, sert aussi de meta description. */
  summary: string;
  /** D'où ça vient : dates, noms, sources. */
  history: string[];
  /** La mécanique exacte, au-delà de la fiche courte. */
  mechanics: string[];
  example: DeepExample;
  /** Où on s'en sert pour de vrai. */
  useCases: string[];
  /** Limites et théorèmes — `t` = le nom du problème, `d` = ce qu'il implique. */
  limits: { t: string; d: string }[];
  faq: { q: string; a: string }[];
}

export type DeepFiches = Record<string, DeepFiche>;
