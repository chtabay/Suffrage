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
   * Pour chaque essai de la partie, cinq 0/1 : la case du rang `k` est pleine
   * quand le pays satisfait le k-ième critère du jour, du plus courant au plus
   * rare. Le rang veut dire la même chose d'un essai à l'autre — c'est ce qui
   * rend deux essais comparables à l'œil.
   *
   * Une position, jamais un sujet : une case pleine ne dit pas de quoi le
   * critère parle. La révélation reste entière.
   */
  cases?: number[][];
  /**
   * Une étiquette par case, ou `null` quand la case se tait : de quoi PARLE le
   * critère de ce rang, jamais lequel c'est. N'arrive qu'au seuil d'essais fixé
   * par `ESSAIS_AVANT_PICTOS` — le nombre ne se recopie nulle part ailleurs.
   *
   * Le texte est déjà résolu dans la langue de l'écran, comme les libellés de la
   * révélation : le navigateur ne reçoit qu'une chaîne et un emoji. Le grain
   * varie d'une case à l'autre — voir `cleEtiquette`.
   *
   * ⚠️ La cinquième est toujours `null` — l'étagère `signature` est trop mince
   * pour qu'une étiquette ne désigne pas le critère, et c'est elle qui fait la
   * recherche. Voir `pictosDe`.
   */
  pictos?: ({ picto: string; texte: string } | null)[];
  /**
   * UN PAYS OFFERT, à partir de cinquante essais — voir `coupDePouceDe`.
   *
   * ⚠️ C'EST TOUJOURS UN PAYS À MOINS DE 5/5 : l'aide ne peut pas résoudre la
   * partie. Elle donne un fait nouveau dans le vocabulaire du jeu (un pays,
   * cinq cases), pas une information d'un autre ordre.
   */
  coupDePouce?: { pays: string; nom: string; cases: number[] };
  /** Présente uniquement quand `score === 5`. */
  revelation?: Revelation;
}

/** Un essai, tel que l'écran le garde et le rejoue au rechargement. */
export interface Essai {
  pays: string;
  score: number;
}
