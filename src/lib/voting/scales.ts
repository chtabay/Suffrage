// Échelles de mentions du jugement majoritaire (et des sondages gradués).
//
// La mécanique du JM (médiane par option) est inchangée ; seule la SÉMANTIQUE de
// l'échelle varie. L'échelle électorale par défaut (« À rejeter … Très bien »)
// juge une aptitude à être choisi — inadaptée quand on MESURE un avis ou qu'on
// dresse un ÉTAT DES LIEUX. On propose donc des presets d'échelle, portés dans
// `recipe.scale` (jsonb, zéro migration), résolus ici en un point unique.
//
// Contrainte v1 : 6 crans partout (le moteur présume des indices 0–5 à plusieurs
// endroits). On ne fait varier que les LIBELLÉS et les COULEURS.
import type { Recipe } from "./types";
import { GRADES, GRADE_COLORS } from "./systems";

export type GradeScaleKey =
  | "mentions"
  | "agreement"
  | "severity"
  | "frequency"
  | "satisfaction"
  | "priority";

export const SCALE_KEYS: GradeScaleKey[] = [
  "mentions",
  "agreement",
  "severity",
  "frequency",
  "satisfaction",
  "priority",
];

export interface GradeScale {
  /** Libellés du plus bas au plus haut, par locale (6 crans). */
  labels: Record<string, string[]>;
  /** Couleur de chaque cran (même ordre que les libellés). */
  colors: string[];
}

// Rampe rouge→vert (électorale/adhésion), réutilisée pour les échelles bipolaires.
const RAMP_RG = GRADE_COLORS;
// Rampe vert→rouge : le HAUT est « négatif » (gravité, charge qui pèse).
const RAMP_GR = [...GRADE_COLORS].slice().reverse();
// Rampe monochrome d'intensité (fréquence : ni bien ni mal, juste plus/moins).
const RAMP_TEAL = ["#cfe8ea", "#a5d5d9", "#77c0c6", "#49aab2", "#2b8f98", "#166f78"];
// Rampe ambre d'urgence (priorité : intensité croissante, sans « mauvais » en bas).
const RAMP_AMBER = ["#fdecc8", "#fbd88a", "#f7bf4f", "#f0a92e", "#e08c14", "#b96f06"];

export const GRADE_SCALES: Record<GradeScaleKey, GradeScale> = {
  // Défaut = l'échelle électorale historique (fr = GRADES). Les libellés du
  // bulletin ET du résultat passent désormais par ici (fin de la double source
  // de vérité i18n `grade0..5` vs constante GRADES).
  mentions: {
    labels: {
      fr: GRADES,
      en: ["Reject", "Poor", "Fair", "Good", "Very good", "Excellent"],
      es: ["A rechazar", "Insuficiente", "Aceptable", "Bastante bien", "Bien", "Excelente"],
      pcm: ["Reject", "Poor", "Fair", "Good", "Very good", "Excellent"],
    },
    colors: RAMP_RG,
  },
  // Mesurer un avis : échelle d'accord bipolaire (sans neutre → force un penchant).
  agreement: {
    labels: {
      fr: ["Pas du tout d'accord", "Pas d'accord", "Plutôt pas d'accord", "Plutôt d'accord", "D'accord", "Tout à fait d'accord"],
      en: ["Strongly disagree", "Disagree", "Somewhat disagree", "Somewhat agree", "Agree", "Strongly agree"],
      es: ["Totalmente en desacuerdo", "En desacuerdo", "Más bien en desacuerdo", "Más bien de acuerdo", "De acuerdo", "Totalmente de acuerdo"],
      pcm: ["I no gree at all", "I no gree", "I small no gree", "I small gree", "I gree", "I gree well well"],
    },
    colors: RAMP_RG,
  },
  // État des lieux : ce qui pèse / gravité (unipolaire ; haut = lourd = rouge).
  severity: {
    labels: {
      fr: ["Pas du tout", "Très peu", "Un peu", "Moyennement", "Beaucoup", "Énormément"],
      en: ["Not at all", "Very little", "A little", "Moderately", "A lot", "Enormously"],
      es: ["Para nada", "Muy poco", "Un poco", "Moderadamente", "Mucho", "Muchísimo"],
      pcm: ["Not at all", "Very small", "Small", "Medium", "Plenty", "Too much"],
    },
    colors: RAMP_GR,
  },
  // État des lieux : fréquence.
  frequency: {
    labels: {
      fr: ["Jamais", "Rarement", "Parfois", "Souvent", "Très souvent", "Toujours"],
      en: ["Never", "Rarely", "Sometimes", "Often", "Very often", "Always"],
      es: ["Nunca", "Rara vez", "A veces", "A menudo", "Muy a menudo", "Siempre"],
      pcm: ["Never", "Rarely", "Sometimes", "Often", "Very often", "Always"],
    },
    colors: RAMP_TEAL,
  },
  // Mesurer un avis : satisfaction bipolaire.
  satisfaction: {
    labels: {
      fr: ["Très insatisfait", "Insatisfait", "Plutôt insatisfait", "Plutôt satisfait", "Satisfait", "Très satisfait"],
      en: ["Very dissatisfied", "Dissatisfied", "Somewhat dissatisfied", "Somewhat satisfied", "Satisfied", "Very satisfied"],
      es: ["Muy insatisfecho", "Insatisfecho", "Más bien insatisfecho", "Más bien satisfecho", "Satisfecho", "Muy satisfecho"],
      pcm: ["Very vex", "Vex", "Small vex", "Small happy", "Happy", "Very happy"],
    },
    colors: RAMP_RG,
  },
  // État des lieux : priorité (unipolaire, intensité croissante).
  priority: {
    labels: {
      fr: ["Pas prioritaire", "Peu prioritaire", "Assez prioritaire", "Prioritaire", "Très prioritaire", "Absolument prioritaire"],
      en: ["Not a priority", "Low priority", "Somewhat a priority", "A priority", "High priority", "Top priority"],
      es: ["No prioritario", "Poco prioritario", "Algo prioritario", "Prioritario", "Muy prioritario", "Máxima prioridad"],
      pcm: ["No be priority", "Small priority", "Somewhat priority", "Priority", "High priority", "Top priority"],
    },
    colors: RAMP_AMBER,
  },
};

/** Normalise une clé d'échelle (défaut : mentions). */
export function scaleKey(scale?: string): GradeScaleKey {
  return scale && (SCALE_KEYS as string[]).includes(scale) ? (scale as GradeScaleKey) : "mentions";
}

/** Libellés + couleurs de l'échelle d'un scrutin, pour la locale donnée. */
export function resolveScale(
  recipe: Pick<Recipe, "scale">,
  locale: string = "fr",
): { labels: string[]; colors: string[]; key: GradeScaleKey } {
  const key = scaleKey(recipe.scale);
  const def = GRADE_SCALES[key];
  const labels = def.labels[locale] ?? def.labels.en ?? def.labels.fr;
  return { labels, colors: def.colors, key };
}
