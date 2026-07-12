// Catalogue des méthodes d'affectation exposées dans l'UI (P1).
// Les textes (nom, fiche avantages/pièges) vivent dans i18n : Assign.methods.<key>.
// TTC (dotation initiale) et Gale-Shapley deux groupes (Parcoursup) : moteur prêt, UI en P2.

export type AssignMethodKey =
  | "serial_dictatorship"
  | "optimal_sum"
  | "top_trading_cycles"
  | "stable_roommates"
  | "gale_shapley";

export interface AssignMethodDef {
  key: AssignMethodKey;
  color: string;
  tint: string;
  icon: string;
  /** true = des personnes classent des objets ; false = les participants se classent entre eux. */
  oneSided: boolean;
  /** true = chacun possède déjà un objet au départ (dotation requise, effectifs égaux). */
  endowed?: boolean;
  /** true = deux groupes qui se classent mutuellement (côté 1 propose, côté 2 dispose). */
  twoLists?: boolean;
}

export const ASSIGN_METHODS: Record<AssignMethodKey, AssignMethodDef> = {
  serial_dictatorship: { key: "serial_dictatorship", color: "#FFB627", tint: "#FFF0CC", icon: "🎲", oneSided: true },
  optimal_sum: { key: "optimal_sum", color: "#2E8BFF", tint: "#D9E9FF", icon: "🧮", oneSided: true },
  top_trading_cycles: { key: "top_trading_cycles", color: "#17B8A6", tint: "#D3F3EF", icon: "🔄", oneSided: true, endowed: true },
  stable_roommates: { key: "stable_roommates", color: "#E84AA8", tint: "#FBDBEE", icon: "🤝", oneSided: false },
  gale_shapley: { key: "gale_shapley", color: "#9B5BD6", tint: "#EBDDF9", icon: "🎓", oneSided: false, twoLists: true },
};

export const ASSIGN_METHOD_KEYS = Object.keys(ASSIGN_METHODS) as AssignMethodKey[];

export const isAssignMethod = (k: unknown): k is AssignMethodKey =>
  typeof k === "string" && k in ASSIGN_METHODS;
