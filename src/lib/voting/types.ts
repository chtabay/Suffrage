// Types du moteur de scrutin — portés depuis la maquette Scrutin.dc.html.

export type CountingMethod =
  | "majority"
  | "condorcet"
  | "mj"
  | "approval"
  | "borda"
  | "proportional"
  | "list";

export type Suffrage = "direct" | "indirect";
export type ElectorSplit = "wta" | "prop";
export type Qualif = "top2" | "thr10";

/** Configuration compositionnelle d'un mode de scrutin. */
export interface Recipe {
  suffrage: Suffrage;
  counting: CountingMethod;
  rounds: 1 | 2;
  qualif: Qualif;
  random: boolean;
  /** Décompte interne à chaque circonscription (suffrage indirect). */
  localCounting: CountingMethod;
  electorSplit: ElectorSplit;
  threshold: number;
  /**
   * Scrutin d'AFFECTATION (pas d'élection d'un gagnant) : clé de la méthode
   * (src/lib/assign/methods.ts). Le bulletin reste un classement (counting est
   * alors posé sur "borda" pour réutiliser le mode « rank ») ; le dépouillement
   * passe par le moteur d'affectation, pas par compute().
   */
  assign?: string;
  /** Affectation « bourse d'échanges » (TTC) : dotation de départ, label → index d'option. */
  assignEndow?: Record<string, number>;
  /** Affectation deux groupes (Gale-Shapley) : nombre d'options du côté 1 (proposant). */
  assignA?: number;
  /** Affectation deux groupes : capacités du côté 2 (aligné sur ses options). */
  assignCaps?: number[];
}

export interface Option {
  icon: string;
  name: string;
  /** Illustration facultative associée au choix (image, vidéo, document…). */
  url?: string;
  /** Pour un vote « dates » : créneau date/heure (valeur datetime-local). */
  at?: string;
}

/** Un bulletin normalisé : classement complet + mentions + circonscription. */
export interface Ballot {
  ranking: number[];
  grades: Record<number, number>;
  district: number;
}

export type BallotMode = "single" | "approve" | "rank" | "grade";

export interface SystemDef {
  key: string;
  name: string;
  family: string;
  color: string;
  tint: string;
  icon: string;
  tagline: string;
  /** Atout principal, en 2-3 mots : le bénéfice clé montré sur la carte d'aperçu. */
  strength: string;
  how: string;
  pros: string[];
  cons: string[];
}

export interface ResultBar {
  idx: number;
  name: string;
  icon: string;
  color: string;
  value: number;
  valColor: string;
  valueLabel: string;
  pct: number;
}

export interface ResultStep {
  n: number;
  text: string;
}

export interface ComputeResult {
  color: string;
  methodName: string;
  methodKey: string;
  hasWinner?: boolean;
  noWinner?: boolean;
  noWinnerLabel?: string;
  winnerName?: string;
  winnerIcon?: string;
  bars: ResultBar[];
  tallyLabel: string;
  steps: ResultStep[];
  counterfactual: string;
}

/** Description résolue d'une recette (nom, couleur, avantages/inconvénients…). */
export interface RecipeDescription {
  color: string;
  icon: string;
  family: string;
  decisiveLabel: string;
  shortName: string;
  name: string;
  how: string;
  pros: string[];
  cons: string[];
}
