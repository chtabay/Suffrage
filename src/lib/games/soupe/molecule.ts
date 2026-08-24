/**
 * Ce qu'une molécule EST, et ce qu'elle FAIT — PUR, sans I/O, sans dépendance.
 *
 * Tout ici se calcule depuis la géométrie. Aucune propriété n'est stockée,
 * aucune n'est écrite à la main : il n'existe pas de table où l'on pourrait lire
 * qu'une figure vaut tant. C'est la différence entre une grille de mots-croisés,
 * qui s'épuise quand on l'a finie, et une règle, dont l'espace ne s'épuise pas.
 *
 * TROIS GRANDEURS, ET UNE TENSION ENTRE ELLES
 *
 *  - La COHÉSION vient des liaisons intérieures. Elle dit si la molécule tient
 *    quand on secoue la soupe.
 *  - L'EXPOSITION est la part d'atomes qui touchent le monde. Les atomes enfouis
 *    tiennent l'édifice sans jamais rien produire.
 *  - Le RENDEMENT vient du visage confronté au milieu.
 *
 * Elles se contrarient, et c'est voulu : une molécule étalée montre beaucoup de
 * surface — donc produit — mais tient mal et ramasse aussi ce que le milieu a de
 * mauvais. Une molécule compacte tient bien et ne risque rien, mais ne récolte
 * presque rien. Il n'y a pas de forme optimale, seulement des formes adaptées à
 * un milieu. C'est de là que doit naître la sélection.
 */

import type { Cellule, Code, Compte, Description, Grille, Milieu } from "./types";

/** Une liaison entre deux cases voisines, et ce qu'elle vaut. */
interface Liaison {
  a: Cellule;
  b: Cellule;
  force: number;
}


import { ATOMES, DIRECTIONS, caseA } from "./grille";
import { coeur, surface, visage } from "./visage";

/**
 * Force d'une liaison entre deux atomes voisins : la moyenne de ce que chacun
 * apporte. Symétrique par construction — une liaison n'a pas de sens de lecture.
 */
export function forceLiaison(codeA: Code, codeB: Code): number {
  return (ATOMES[codeA].liaison + ATOMES[codeB].liaison) / 2;
}

/**
 * Recense les liaisons intérieures d'un fragment : une par paire de cases
 * voisines, jamais comptée deux fois.
 *
 * @returns {{a:{r,c}, b:{r,c}, force:number}[]}
 */
export function liaisons(grille: Grille, cellules: Cellule[]): Liaison[] {
  const dedans = new Set(cellules.map(({ r, c }) => `${r},${c}`));
  const vues = new Set();
  const trouvees: Liaison[] = [];

  for (const { r, c } of cellules) {
    for (const [dr, dc] of DIRECTIONS) {
      const nr = r + dr;
      const nc = c + dc;
      if (!dedans.has(`${nr},${nc}`)) continue;

      // Une liaison appartient à la paire, pas à l'une des deux cases.
      const cle = r < nr || (r === nr && c < nc) ? `${r},${c}|${nr},${nc}` : `${nr},${nc}|${r},${c}`;
      if (vues.has(cle)) continue;
      vues.add(cle);

      trouvees.push({
        a: { r, c },
        b: { r: nr, c: nc },
        force: forceLiaison(caseA(grille, r, c) as Code, caseA(grille, nr, nc) as Code),
      });
    }
  }

  return trouvees;
}

/**
 * COHÉSION : la force de liaison dont dispose chaque atome, en moyenne.
 *
 * Un atome seul vaut 0 — il n'est tenu par rien. Une chaîne tend vers la force
 * de ses liaisons, un bloc plein vers le double, puisque chaque atome y participe
 * à davantage de liaisons. La grandeur est donc bornée en pratique, et lisible.
 */
export function cohesion(grille: Grille, cellules: Cellule[]): number {
  if (cellules.length === 0) return 0;
  const total = liaisons(grille, cellules).reduce((s, l) => s + l.force, 0);
  return total / cellules.length;
}

/**
 * EXPOSITION : la part des atomes qui touchent le monde, entre 0 et 1.
 * Vaut 1 pour toute petite molécule — il faut une certaine masse avant de
 * pouvoir enfouir quoi que ce soit.
 */
export function exposition(grille: Grille, cellules: Cellule[]): number {
  if (cellules.length === 0) return 0;
  return surface(grille, cellules).length / cellules.length;
}

/**
 * AVIDITÉ : ce que la surface réclame au milieu. Somme sur les atomes exposés.
 * Sert de coût : une molécule très avide consomme plus pour tourner.
 */
export function avidite(grille: Grille, cellules: Cellule[]): number {
  return surface(grille, cellules).reduce(
    (s, { r, c }) => s + ATOMES[caseA(grille, r, c) as Code].avidite,
    0,
  );
}

/**
 * Compte les occurrences d'un motif dans un visage lu comme un ANNEAU.
 *
 * Le caractère cyclique n'est pas un détail : un visage n'a ni début ni fin, et
 * un motif à cheval sur la « couture » est une occurrence comme une autre. La
 * mécanique entière du rendement en dépend.
 */
export function occurrences(visageMolecule: string, motif: string): number {
  if (!visageMolecule || !motif || motif.length > visageMolecule.length) return 0;
  const anneau = visageMolecule + visageMolecule.slice(0, motif.length - 1);
  let n = 0;
  for (let i = 0; i < visageMolecule.length; i++) {
    if (anneau.startsWith(motif, i)) n++;
  }
  return n;
}

/**
 * RENDEMENT : ce que la molécule produit dans un milieu donné.
 *
 * Le milieu ne reconnaît pas des molécules, il reconnaît des MOTIFS DE SURFACE —
 * de courtes suites d'atomes. Chaque fois qu'un motif du milieu apparaît sur le
 * visage, il paie sa valeur. Certaines valeurs sont négatives : le milieu ne
 * contient pas que des occasions.
 *
 * Trois conséquences, toutes voulues :
 *  - l'ARRANGEMENT décide, pas la composition : deux molécules faites des mêmes
 *    atomes rendent différemment si leur surface ne les présente pas dans le
 *    même ordre ;
 *  - changer de milieu réévalue toutes les molécules d'un coup, sans rien
 *    recalculer d'autre ;
 *  - une grande surface récolte le bon ET le mauvais.
 */
export function rendement(visageMolecule: string, milieu: Milieu): number {
  let total = 0;
  for (const { motif, valeur } of milieu.motifs) {
    total += occurrences(visageMolecule, motif) * valeur;
  }
  return total;
}

/**
 * Description complète d'un fragment. Une seule traversée, tout en découle.
 *
 * `milieu` est facultatif : sans lui, la molécule existe et tient, mais on ne
 * sait pas encore ce qu'elle vaut — c'est exactement l'état du premier acte,
 * avant que le monde ne se mette à choisir.
 */
export function decrire(grille: Grille, cellules: Cellule[], milieu: Milieu | null = null): Description {
  const v = visage(grille, cellules);
  const composition: Compte = {};
  for (const { r, c } of cellules) {
    const code = caseA(grille, r, c) as Code;
    composition[code] = (composition[code] ?? 0) + 1;
  }

  return {
    cellules,
    taille: cellules.length,
    composition,
    visage: v,
    cohesion: cohesion(grille, cellules),
    exposition: exposition(grille, cellules),
    avidite: avidite(grille, cellules),
    enfouis: coeur(grille, cellules).length,
    rendement: milieu ? rendement(v, milieu) : null,
  };
}
