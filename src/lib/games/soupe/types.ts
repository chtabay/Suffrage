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
  /** Ce que le milieu VERSE par tour dans le bassin du troisième acte. */
  flux?: Compte;
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
  /** L'armoire s'est-elle rouverte faute de quoi bâtir ? */
  reamorce: boolean;
}

/* ═══════════════════════ LE TROISIÈME ACTE : LE BASSIN ═══════════════════════ */

/**
 * Une espèce du bassin : une molécule, et combien il y en a.
 *
 * ⚠️ ELLE NE PORTE PAS UNE `Description` ENTIÈRE, et c'est délibéré. Le bassin
 * n'a que faire du rendement, de l'exposition ou des atomes enfouis : ce sont
 * les grandeurs des deux premiers actes, où le milieu PAIE. Ici rien n'est payé,
 * et une espèce se réduit à ce qui décide de son sort — sa forme, sa matière,
 * ce qui la fait tenir, et son nombre.
 */
export interface Espece {
  empreinte: string;
  grille: Grille;
  visage: string;
  taille: number;
  composition: Compte;
  cohesion: number;
  effectif: number;
}

/** L'état du bassin. */
export interface EtatBassin {
  libres: Compte;
  especes: Espece[];
  /** Les visages de la collection du joueur : les seuls qui catalysent. */
  catalogue: string[];
  tours: number;
  nes: number;
  morts: number;
  soudures: number;
  /** L'empreinte de la molécule qu'on cherche à faire tenir, ou `null`. */
  cible: string | null;
  /** Depuis combien de tours d'affilée elle est là. */
  tenue: number;
  /** Le plus long séjour qu'elle ait obtenu. */
  record: number;
  /**
   * CE QUE LA PARTIE AURA FAIT, EN ENTIER.
   *
   * ⚠️ LE TOUR SE COMPTAIT, LA PARTIE NON — on ne pouvait donc rien raconter
   * d'elle, alors que c'est là qu'est l'histoire : une molécule fabriquée quatre
   * cents fois et refusée quatre cents fois, ce n'est pas un tour, c'est un destin.
   */
  refusees: number;
  refusCible: number;
  expulsees: number;
  /** Le tour où la cible est entrée pour la première fois, ou `null`. */
  entreeAu: number | null;
}

/** Ce qu'un tour de bassin a produit. */
export interface BilanBassin {
  verses: number;
  morts: number;
  nes: number;
  soudures: number;
  dissipes: number;
  emportes: number;
  exportes: number;
  /** Des soudures qui ont eu lieu chimiquement et que la place a annulées. */
  refusees: number;
  /** Combien d'entre elles étaient la cible du joueur. */
  refusCible: number;
  /** Des espèces chassées pour faire de la place à une nouvelle venue. */
  expulsees: number;
  /** Le bassin est-il plein d'espèces établies à la fin du tour ? */
  plein: boolean;
  /** Pourquoi la cible a quitté le bassin ce tour-ci, ou `null`. */
  sortieCible: "attrition" | "concurrence" | "courant" | null;
  /** La cible vient-elle d'entrer dans le bassin ? */
  entreeCible: boolean;
  /**
   * LE DERNIER REMPLACEMENT DU TOUR : qui est arrivé, qui a cédé la place.
   *
   * ⚠️ UN COMPTEUR N'EST PAS UN RÉCIT. Le bilan savait qu'il y avait eu deux
   * mille expulsions et jamais lesquelles. Deux formes suffisent à faire un
   * événement — et la forme est ce que l'écran sait déjà dessiner.
   */
  remplacement: { grillePartie: Grille; taille: number; effectif: number; grilleVenue?: Grille } | null;
}

/**
 * CE QUE LE MONDE A FAIT, tour par tour.
 *
 * ⚠️ DES ÉVÉNEMENTS, PAS DES PHRASES — comme le journal, et pour la même raison :
 * les quatre langues doivent pouvoir le dire chacune à sa façon. Du français
 * ici le rendrait intraduisible.
 */
export type EvenementMonde =
  | { quoi: "cibleEntre"; tour: number; fois?: number; jusqua?: number }
  | { quoi: "cibleSort"; cause: "attrition" | "concurrence" | "courant"; apres: number; tour: number; fois?: number; jusqua?: number }
  | { quoi: "cibleRefoulee"; combien: number; tour: number; fois?: number; jusqua?: number }
  | { quoi: "remplacement"; grilleVenue: Grille; grillePartie: Grille; effectif: number; tour: number; fois?: number; jusqua?: number }
  | { quoi: "refoulees"; combien: number; soudures: number; tour: number; fois?: number; jusqua?: number }
  | { quoi: "briques"; combien: number; tour: number; fois?: number; jusqua?: number }
  | { quoi: "calme"; tour: number; fois?: number; jusqua?: number }
  /**
   * ET CE QUE L'ATELIER FAIT — même chronique, même raison.
   *
   * ⚠️ « JE NE SAIS PAS QUAND J'AI FAIT QUELQUE CHOSE DE PRODUCTIF. » Le seul
   * signal était « dernier tour — 1 bâtie », en gris, effacé au tour suivant.
   * L'atelier comptait déjà ses copies bâties, ses copies perdues et son
   * réamorçage : tout était calculé et rien n'était dit.
   */
  | { quoi: "batie"; combien: number; gagne: number; tour: number; fois?: number; jusqua?: number }
  | { quoi: "perdue"; combien: number; perd: number; tour: number; fois?: number; jusqua?: number }
  | { quoi: "reamorce"; tour: number; fois?: number; jusqua?: number }
  | { quoi: "produit"; combien: number; tour: number; fois?: number; jusqua?: number }
  | { quoi: "attente"; tour: number; fois?: number; jusqua?: number };

/** Une soudure possible, telle que l'écran doit la montrer. */
export interface Fabrication {
  a: Espece;
  b: Espece;
  produit: Grille;
  empreinte: string;
  visage: string;
  gabarits: number;
  rencontres: number;
  chance: number;
}

/** Un chemin vers la cible : deux briques, et ce qui les tient. */
export interface Voie {
  a: Espece;
  b: Espece;
  gabarits: number;
  chance: number;
  tenants: Espece[];
}

/** Une molécule du catalogue qui accélérerait une voie. */
export interface Renfort {
  grille: Grille;
  visage: string;
  gain: number;
}

/** Ce que l'écran du troisième acte a le droit de dire. */
export interface Soutiens {
  present: number;
  tenue: number;
  voies: Voie[];
  /** Les gabarits du catalogue qui manquent au bassin, le plus utile d'abord. */
  aider: Renfort[];
  /** Ceux qui y sont déjà : ils servent, mais il n'y a rien à faire pour eux. */
  dejaLa: Renfort[];
}

/** Ce qui manque pour en déposer un de plus. */
export interface ManqueAtome {
  code: Code;
  requis: number;
  disponible: number;
  manque: number;
}

/** Une espèce qu'on peut retirer, et ce qu'elle rendrait. */
export interface Retirable extends Espece {
  rendu: Compte;
  utile: number;
  /** Ce qu'elle pèse, donc ce qu'elle bloque. */
  masse: number;
}

/** Le conseil complet du troisième acte. */
export interface ConseilBassin extends Soutiens {
  objectif: number;
  restant: number;
  /** Le gabarit le plus utile que la collection offre, ou `null`. */
  renfort: Renfort | null;
  /** Combien d'exemplaires de ce gabarit le bassin peut réellement payer. */
  payables: number;
  gagne: boolean;
  /** Le bassin est-il plein ? Alors rien de neuf n'y entre. */
  plein: boolean;
  /** Combien de changements d'avis il reste sur la cible. */
  revisions: number;
  /** Les deux autres cibles du passage, quand le recours est ouvert. */
  autresCibles: { grille: Grille; visage: string; empreinte: string; outils: number; composition: Compte }[];
  /** Ce que le changement d'avis coûterait : le meilleur séjour obtenu. */
  coutDuChangement: number;
  manque: ManqueAtome[];
  inutiles: Retirable[];
  /**
   * LE MUR : la plus légère espèce à sacrifier quand `inutiles` est vide et que
   * la porte reste fermée, ou `null`. Elle coûte une voie, et c'est la seule
   * porte — mesuré, attendre coûte dix parties sur soixante.
   */
  sacrifice: Retirable | null;
}

/** Une cible proposée au joueur, avec de quoi choisir. */
export interface CibleProposee {
  grille: Grille;
  visage: string;
  empreinte: string;
  voies: number;
  outils: number;
  composition: Compte;
  plusRare: { code: Code; requis: number; verse: number } | null;
  tension: number;
}

/** La molécule qu'on cherche à faire tenir. */
export interface Cible {
  grille: Grille;
  visage: string;
  empreinte: string;
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
export type NomPanneau = "milieu" | "soupe" | "collection" | "atelier" | "bassin";

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
  acte: 1 | 2 | 3;
  milieu: Milieu;
  soupe: EtatSoupe;
  collection: Piece[];
  atelier: EtatAtelier;
  bassin: EtatBassin;
  cible: Cible | null;
  panneaux: NomPanneau[];
  journal: EvenementJournal[];
  prochainePiece: number;
  bilanAtelier: BilanAtelier | null;
  bilanBassin: BilanBassin | null;
  /** Ce que le monde a fait, tour par tour. Voir `evenementDuTour`. */
  chronique: EvenementMonde[];
  /** Les trois cibles proposées au passage : on peut encore passer aux autres. */
  cibles: { grille: Grille; visage: string; empreinte: string; outils: number; composition: Compte }[];
  /** Combien de changements d'avis il reste. */
  revisions: number;
}

/** Ce qui s'est passé, sous une forme que l'écran traduira. */
export type EvenementJournal =
  | { quoi: "preleve"; visage: string; rendement: number }
  | { quoi: "rejete"; visage: string }
  | { quoi: "fonde"; visage: string; rendement: number }
  | { quoi: "gabarit"; visage: string; perdues: number }
  | { quoi: "bassin"; visage: string; objectif: number }
  | { quoi: "seme"; visage: string; combien: number; remisAZero: boolean }
  | { quoi: "sansAtomes" }
  | { quoi: "retire"; visage: string }
  | { quoi: "cibleNonSemable" }
  /** Le joueur a changé d'avis sur la cible — et ce que ça lui a coûté. */
  | { quoi: "revise"; visage: string; perdu: number };
