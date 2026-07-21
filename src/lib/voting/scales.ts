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
  | "dissatisfaction"
  | "priority";

export const SCALE_KEYS: GradeScaleKey[] = [
  "mentions",
  "agreement",
  "severity",
  "frequency",
  "satisfaction",
  "dissatisfaction",
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
// Rampe divergente 5 crans (bipolaire AVEC neutre au centre) : rouge → gris → vert.
const RAMP_DIV5 = ["#d23b3b", "#e8905a", "#dcdfe4", "#6bbf59", "#1f8a4c"];

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
  // Mesurer un avis : échelle d'accord bipolaire à 5 crans AVEC neutre au centre
  // (convention sondage la plus courante — nombre de crans libre, cf. V3).
  agreement: {
    labels: {
      fr: ["Pas du tout d'accord", "Plutôt pas d'accord", "Neutre", "Plutôt d'accord", "Tout à fait d'accord"],
      en: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
      es: ["Totalmente en desacuerdo", "En desacuerdo", "Neutral", "De acuerdo", "Totalmente de acuerdo"],
      pcm: ["I no gree at all", "I no gree", "Neutral", "I gree", "I gree well well"],
    },
    colors: RAMP_DIV5,
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
  // Mesurer un avis : satisfaction bipolaire à 5 crans AVEC neutre au centre.
  satisfaction: {
    labels: {
      fr: ["Très insatisfait", "Insatisfait", "Neutre", "Satisfait", "Très satisfait"],
      en: ["Very dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very satisfied"],
      es: ["Muy insatisfecho", "Insatisfecho", "Neutral", "Satisfecho", "Muy satisfecho"],
      pcm: ["Very vex", "Vex", "Neutral", "Happy", "Very happy"],
    },
    colors: RAMP_DIV5,
  },
  // État des lieux : insatisfaction (unipolaire, degré croissant ; haut = très
  // insatisfait = rouge). Distinct de `satisfaction` (bipolaire) : ici on mesure
  // uniquement l'intensité du mécontentement (irritants, points de friction).
  dissatisfaction: {
    labels: {
      fr: ["Pas du tout insatisfait", "Légèrement insatisfait", "Modérément insatisfait", "Assez insatisfait", "Très insatisfait", "Extrêmement insatisfait"],
      en: ["Not at all dissatisfied", "Slightly dissatisfied", "Moderately dissatisfied", "Fairly dissatisfied", "Very dissatisfied", "Extremely dissatisfied"],
      es: ["Nada insatisfecho", "Ligeramente insatisfecho", "Moderadamente insatisfecho", "Bastante insatisfecho", "Muy insatisfecho", "Extremadamente insatisfecho"],
      pcm: ["I no vex at all", "I vex small", "I vex small-small", "I vex", "I vex well", "I vex die"],
    },
    colors: RAMP_GR,
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

/**
 * Couleur de texte lisible sur un fond de cran : encre sur les teintes claires
 * (bas des rampes gravité/fréquence/priorité), blanc sur les foncées. Seuil calé
 * pour NE PAS changer l'aspect de l'échelle électorale par défaut (tout en blanc).
 */
export function textOn(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255; // Rec. 601
  return lum > 0.72 ? "#16213A" : "#fff";
}

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
