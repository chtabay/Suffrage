// LE CONTRAT ENTRE L'ÉCRAN ET LE SERVEUR.
//
// Il tient en trois formes, et son intérêt est surtout dans ce qu'il NE contient
// pas : tant que le joueur n'a pas gagné, la réponse du serveur ne porte qu'un
// entier. Pas de nom de critère, pas de liste de pays chauds, pas de « il vous
// manque le critère 3 » — rien qui, lu dans l'onglet réseau, abrège la partie.

/** Un critère, tel qu'il est montré APRÈS la victoire — et jamais avant. */
export interface CritereRevele {
  libelle: string;
  /** Ce qu'on apprend. Absent pour les critères purement descriptifs. */
  eclairage?: string;
  source: { nom: string; url: string; date: string };
}

export interface Revelation {
  criteres: CritereRevele[];
  /**
   * Le score théorique de CHAQUE pays : c'est la carte complète, la récompense
   * qui permet de relire la partie (§4.3). Elle n'arrive qu'avec la victoire.
   */
  scores: Record<string, number>;
}

export interface ReponseEssai {
  /** 0 à 5. */
  score: number;
  /**
   * Recouvrements de TOUTE la partie : `communs[i][j]` = combien de critères du
   * jour les essais `i` et `j` satisfont tous les deux, le nouvel essai compris
   * et placé en dernier.
   *
   * Elle repart de zéro à chaque essai plutôt que de s'allonger d'une ligne :
   * une partie reprise après rechargement n'a alors aucun trou à afficher.
   * Un nombre, jamais un nom de critère — voir `communsEntre`.
   */
  communs?: number[][];
  /** Présente uniquement quand `score === 5`. */
  revelation?: Revelation;
}

/** Un essai, tel que l'écran le garde et le rejoue au rechargement. */
export interface Essai {
  pays: string;
  score: number;
}
