// Voisinage éditorial entre fiches : maillage interne (chaque page en cite
// trois autres) et aide au choix. Défini UNE fois, sans langue — les noms
// affichés viennent d'i18n. Un lecteur arrivé sur « Condorcet » doit pouvoir
// glisser vers Borda ou le jugement majoritaire sans repasser par l'index.
export const RELATED: Record<string, string[]> = {
  simple_vote: ["two_round", "approval", "condorcet"],
  two_round: ["simple_vote", "condorcet", "majority_judgment"],
  approval: ["simple_vote", "majority_judgment", "borda"],
  borda: ["condorcet", "approval", "majority_judgment"],
  condorcet: ["borda", "condorcet_random", "majority_judgment"],
  condorcet_random: ["condorcet", "borda", "simple_vote"],
  majority_judgment: ["condorcet", "approval", "borda"],
  proportional: ["list", "grand_electors", "simple_vote"],
  list: ["proportional", "two_round", "grand_electors"],
  grand_electors: ["proportional", "simple_vote", "list"],
  serial_dictatorship: ["optimal_sum", "top_trading_cycles", "gale_shapley"],
  optimal_sum: ["serial_dictatorship", "gale_shapley", "top_trading_cycles"],
  top_trading_cycles: ["serial_dictatorship", "optimal_sum", "stable_roommates"],
  stable_roommates: ["gale_shapley", "top_trading_cycles", "optimal_sum"],
  gale_shapley: ["stable_roommates", "optimal_sum", "serial_dictatorship"],
};
