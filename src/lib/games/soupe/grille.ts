/**
 * La grille et ses fragments — PUR, sans I/O, sans dépendance.
 *
 * On garde du prototype précédent la seule chose qui méritait de l'être : une
 * grille 6×6. Elle est assez petite pour tenir entière sous l'œil, et assez
 * grande pour que l'arrangement ait des conséquences.
 *
 * Ce qui change : rien ici ne connaît de « motif ». Aucune table. Une molécule
 * n'est pas une figure reconnue, c'est un FRAGMENT CONNEXE — un groupe d'atomes
 * qui se tiennent. Ce que ce fragment fait se calcule ailleurs, à partir de sa
 * seule géométrie.
 */

import type { CaseGrille, Cellule, Code, Grille } from "./types";


/** Côté de la grille. */
export const COTE = 6;

/**
 * Les atomes. Trois suffisent : la richesse ne vient pas de leur nombre mais de
 * leurs arrangements. Chacun porte trois traits dont tout le reste découlera.
 *
 *  - `liaison`  : ce qu'il apporte à la cohésion quand il touche un voisin.
 *  - `avidite`  : ce qu'il réclame au milieu quand il est exposé en surface.
 *  - `valence`  : le nombre de voisins qu'il peut supporter. Au-delà, il refuse.
 *
 * LA VALENCE EST LA CONTRAINTE LA PLUS FÉCONDE des trois. Sans elle, tout ce qui
 * flotte finit par s'agglomérer en une seule masse — un germe capture la soupe
 * entière et il ne reste plus rien à choisir. Avec elle, un atome saturé refuse
 * les nouveaux venus : les agrégats cessent de croître, plusieurs molécules
 * coexistent, et surtout les FORMES POSSIBLES diffèrent selon la matière. Le
 * soufre, qui ne supporte que deux voisins, ne fait jamais que des chaînes ; le
 * carbone, qui en supporte quatre, peut bâtir des blocs. La variété structurelle
 * découle d'un seul nombre par atome, sans qu'aucune forme soit décrite.
 *
 * Les valeurs sont volontairement dissemblables et non ordonnées : aucun atome
 * n'est « meilleur », chacun est bon à autre chose. C'est ce qui empêche la
 * partie de se réduire à « empiler le meilleur atome ».
 */
export const ATOMES = {
  //         symbole  liaison  avidité  valence
  C: { code: "C", liaison: 3, avidite: 1, valence: 4, nom: "carbone" },
  N: { code: "N", liaison: 2, avidite: 3, valence: 3, nom: "azote" },
  S: { code: "S", liaison: 1, avidite: 2, valence: 2, nom: "soufre" },
};

/** Codes des atomes, dans un ordre stable. */
export const CODES = Object.keys(ATOMES) as Code[];

/** Case vide dans la notation textuelle d'une grille. */
export const VIDE = ".";

/**
 * Crée une grille vide. Une case vaut `null` ou un code d'atome.
 * @returns {(string|null)[][]}
 */
export function grilleVide(): Grille {
  return Array.from({ length: COTE }, () => Array.from({ length: COTE }, () => null));
}

/** Vrai si (r, c) tombe dans la grille. */
export function dansLaGrille(r: number, c: number): boolean {
  return r >= 0 && r < COTE && c >= 0 && c < COTE;
}

/**
 * Lit une case en tolérant les coordonnées hors grille (elles valent `null`).
 * Centralise le débordement : partout ailleurs on raisonne sans `undefined`.
 */
export function caseA(grille: Grille, r: number, c: number): CaseGrille {
  if (!dansLaGrille(r, c)) return null;
  return grille[r]?.[c] ?? null;
}

/** Les quatre voisins orthogonaux. La diagonale ne lie pas : deux atomes en coin se touchent sans se tenir. */
export const DIRECTIONS = [
  [-1, 0], // nord
  [0, 1], // est
  [1, 0], // sud
  [0, -1], // ouest
];

/**
 * Découpe la grille en fragments connexes (connexité 4).
 *
 * Chaque fragment est une molécule candidate. Les cases isolées en font partie :
 * un atome seul est un fragment de taille 1, et c'est le cas limite qui rend la
 * suite cohérente — il a une cohésion nulle et une surface totale.
 *
 * @returns {{r:number,c:number}[][]} les fragments, chacun trié en ordre de lecture
 */
export function fragments(grille: Grille): Cellule[][] {
  const vus = new Set();
  const trouves = [];

  for (let r = 0; r < COTE; r++) {
    for (let c = 0; c < COTE; c++) {
      if (caseA(grille, r, c) === null) continue;
      const cle = r * COTE + c;
      if (vus.has(cle)) continue;

      const pile: number[][] = [[r, c]];
      vus.add(cle);
      const frag: Cellule[] = [];

      while (pile.length > 0) {
        const [y, x] = pile.pop() as number[];
        frag.push({ r: y, c: x });
        for (const [dy, dx] of DIRECTIONS) {
          const ny = y + dy;
          const nx = x + dx;
          if (caseA(grille, ny, nx) === null) continue;
          const nCle = ny * COTE + nx;
          if (vus.has(nCle)) continue;
          vus.add(nCle);
          pile.push([ny, nx]);
        }
      }

      frag.sort((a, b) => a.r - b.r || a.c - b.c);
      trouves.push(frag);
    }
  }

  return trouves;
}

/**
 * Construit une grille depuis sa notation textuelle : une chaîne par ligne, un
 * caractère par case (`C`, `N`, `S`, ou `.` pour une case vide).
 *
 * ```js
 * lire(["CN....", ".S....", "......", "......", "......", "......"]);
 * ```
 * @throws si la grille n'est pas 6×6 ou porte un caractère inconnu.
 */
export function lire(lignes: string[]): Grille {
  if (lignes.length !== COTE) {
    throw new Error(`Une grille compte ${COTE} lignes, ${lignes.length} fournie(s).`);
  }
  return lignes.map((ligne, r) => {
    if (ligne.length !== COTE) {
      throw new Error(`La ligne ${r} compte ${ligne.length} caractères au lieu de ${COTE}.`);
    }
    return [...ligne].map((ch, c) => {
      if (ch === VIDE) return null;
      if (!(ch in ATOMES)) throw new Error(`Atome « ${ch} » inconnu en (${r}, ${c}).`);
      return ch as Code;
    });
  });
}

/** Notation textuelle d'une grille — réciproque de {@link lire}. */
export function ecrire(grille: Grille): string[] {
  return grille.map((ligne) => ligne.map((cell) => cell ?? VIDE).join(""));
}

/** Copie modifiable d'une grille. */
export function copier(grille: Grille): Grille {
  return grille.map((ligne) => [...ligne]);
}

/**
 * Extrait un fragment dans sa propre grille, recadré sur son coin haut-gauche.
 * Sert à comparer deux molécules indépendamment de l'endroit où elles flottaient.
 */
export function recadrer(grille: Grille, frag: Cellule[]): Grille {
  const r0 = Math.min(...frag.map((p) => p.r));
  const c0 = Math.min(...frag.map((p) => p.c));
  const hauteur = Math.max(...frag.map((p) => p.r)) - r0 + 1;
  const largeur = Math.max(...frag.map((p) => p.c)) - c0 + 1;

  const petite: Grille = Array.from({ length: hauteur }, () =>
    Array.from({ length: largeur }, () => null as CaseGrille),
  );
  for (const { r, c } of frag) {
    petite[r - r0][c - c0] = grille[r][c];
  }
  return petite;
}
