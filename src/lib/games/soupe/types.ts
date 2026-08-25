// LES TYPES DE LA SOUPE — écrits une fois, pour que les sept modules de la règle
// parlent de la même chose.
//
// ⚠️ CE DOSSIER EST UN PORTAGE, PAS UN ORIGINAL. La règle vient du dépôt
// `chtabay/Ludonatif-3` (`soupe/src/*.js`), où elle est éprouvée par 73 tests
// sous `node --test` et mesurée par `outils/mesurer.js`. Les fichiers ont été
// copiés tels quels et seulement ANNOTÉS : aucune ligne de logique n'a été
// réécrite, et les commentaires d'origine — qui portent les décisions et les
// mesures — sont conservés mot pour mot.
//
// Conséquence à connaître avant de « corriger » quoi que ce soit ici : une
// correction faite dans ce dossier ne vaut que pour Placet, et divergera de la
// version testée. Les corrections de RÈGLE se font là-bas, puis se recopient.
// Ce qui appartient en propre à Placet, c'est l'écran (`components/games/soupe`),
// pas la règle.

/** Les trois atomes. Le monde entier est fait de ces trois lettres. */
export type Code = "C" | "N" | "S";

/** Une case du canevas : un atome, ou rien. */
export type CaseGrille = Code | null;

/** Le canevas d'une molécule — un carré de `COTE` × `COTE`. */
export type Grille = CaseGrille[][];

/** Une position sur le canevas. */
export interface Cellule {
  r: number;
  c: number;
}

/** Une position qui porte son atome. */
export interface CelluleCodee extends Cellule {
  r: number;
  c: number;
  code: Code;
}

/** Un générateur pseudo-aléatoire injecté : la partie se rejoue. */
export type Alea = () => number;

/** Combien de chaque atome — libres, requis, ou en réserve. */
export type Compte = Partial<Record<Code, number>>;

/** Ce qu'un milieu recherche, ou tolère mal. */
export interface Motif {
  motif: string;
  valeur: number;
}

/** Ce que le monde paie, et ce qu'il fait subir. */
export interface Milieu {
  graine: number;
  rang: number;
  nom: string;
  description: string;
  motifs: readonly Motif[];
  agitation: number;
}

/** Tout ce qu'on sait d'une molécule après une seule traversée. */
export interface Description {
  cellules: Cellule[];
  taille: number;
  composition: Compte;
  visage: string;
  cohesion: number;
  exposition: number;
  avidite: number;
  enfouis: number;
  /** `null` tant qu'aucun milieu n'est venu la juger. */
  rendement: number | null;
}

/** Une molécule qui flotte dans la soupe. */
export interface MoleculeSoupe {
  id: number;
  grille: Grille;
}

/** L'état de la soupe : une population, pas une grille partagée. */
export interface EtatSoupe {
  libres: Compte;
  molecules: MoleculeSoupe[];
  agitations: number;
  prochainId: number;
}

/** Ce qu'une agitation a produit. */
export interface BilanAgitation {
  detaches: number;
  ruptures: number;
  captures: number;
  nucleations: number;
  tenus: number;
}

/** Le modèle que l'atelier réplique. */
export interface Gabarit extends Description {
  grille: Grille;
}

/** L'état de l'atelier. */
export interface EtatAtelier {
  gabarit: Gabarit | null;
  copies: number;
  atomes: Compte;
  reserve: number;
  tics: number;
  produitTotal: number;
}

/** Ce qu'un tour d'atelier a produit. */
export interface BilanAtelier {
  perdues: number;
  baties: number;
  produit: number;
}

/** Une molécule gardée par le joueur. */
export interface Piece extends Description {
  piece: number;
  grille: Grille;
}

/** Ce qui manque pour bâtir une copie de plus. */
export interface Manque {
  code: Code;
  requis: number;
  disponible: number;
  manque: number;
  prix: number;
  abordable: boolean;
}

/** Un panneau de l'écran. Ouvrir l'un en ferme un autre. */
export type NomPanneau = "milieu" | "soupe" | "collection" | "atelier";

/**
 * L'état complet d'une partie.
 *
 * ⚠️ `journal` porte des ÉVÉNEMENTS, pas des phrases. Le portage sur Placet l'a
 * imposé : la règle d'origine notait « Prélevé CCN — rendement 3 » en français
 * dans l'état, ce qui aurait rendu le journal intraduisible dans une application
 * à quatre langues. Un événement se traduit à l'affichage ; une phrase, non.
 */
export interface Partie {
  graine: number;
  acte: 1 | 2;
  milieu: Milieu;
  soupe: EtatSoupe;
  collection: Piece[];
  atelier: EtatAtelier;
  panneaux: NomPanneau[];
  journal: EvenementJournal[];
  prochainePiece: number;
  bilanAtelier: BilanAtelier | null;
}

/** Ce qui s'est passé, sous une forme que l'écran traduira. */
export type EvenementJournal =
  | { quoi: "preleve"; visage: string; rendement: number }
  | { quoi: "rejete"; visage: string }
  | { quoi: "fonde"; visage: string; rendement: number }
  | { quoi: "gabarit"; visage: string; perdues: number };
