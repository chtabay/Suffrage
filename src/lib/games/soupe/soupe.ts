/**
 * La soupe et son agitation — PUR, sans I/O. Le générateur aléatoire est fourni
 * par l'appelant : une même graine rejoue exactement la même partie.
 *
 * PREMIER ACTE. Le joueur ne pose pas d'atomes. Il agite, et les atomes
 * s'assemblent tout seuls — ou se défont. Son seul geste est de choisir AVEC
 * QUELLE FORCE il secoue, puis de prélever ce qui lui plaît.
 *
 * POURQUOI LA SOUPE N'EST PAS UNE GRILLE
 *
 * Une première version faisait flotter tous les atomes sur une même grille 6×6.
 * Elle a été abandonnée après mesure, et la raison mérite d'être écrite pour
 * qu'on ne la refasse pas : sur une grille partagée, tout finit par se toucher.
 * Un germe capture la soupe entière et il ne reste plus qu'UNE masse — mesuré à
 * chaque force d'agitation, avec ou sans contrainte de valence. Or un jeu de
 * sélection a besoin de plusieurs candidats à comparer ; une masse unique n'offre
 * aucun choix.
 *
 * La soupe est donc une POPULATION. Chaque molécule occupe son propre canevas et
 * n'a pas de position dans le monde — dans un liquide agité, l'endroit où une
 * molécule dérive ne veut rien dire. Ce qui compte, c'est ce qui existe.
 *
 * TROIS MOUVEMENTS, dans cet ordre :
 *   1. RUPTURE   — l'agitation éprouve chaque atome ; les mal tenus se détachent,
 *                  et une molécule peut se rompre en deux.
 *   2. CAPTURE   — les atomes libres se fixent là où la valence les accepte.
 *   3. NUCLÉATION— deux atomes libres se rencontrent et forment un couple.
 *
 * Rien n'assemble : un atome qui se pose contre un autre est lié par ce seul
 * fait. Et la force d'agitation est le seul réglage du joueur — c'est elle qui
 * décide si la soupe fabrique de grandes choses fragiles ou de petites solides.
 */

import type {
  Alea,
  BilanAgitation,
  Cellule,
  CelluleCodee,
  Code,
  Compte,
  EtatSoupe,
  Grille,
  MoleculeSoupe,
} from "./types";


import { ATOMES, CODES, COTE, caseA, copier, dansLaGrille, DIRECTIONS, fragments, grilleVide } from "./grille";
import { forceLiaison } from "./molecule";

/** Nombre de molécules que la soupe peut porter de front. Au-delà, elle sature. */
export const CAPACITE = 7;

/** Une soupe au repos : aucun édifice, un stock d'atomes libres. */
export function soupeVide(libres: Compte = { C: 14, N: 9, S: 9 }): EtatSoupe {
  return { libres: { ...libres }, molecules: [], agitations: 0, prochainId: 1 };
}

/**
 * ATTACHEMENT d'un atome : la somme des forces qui le retiennent.
 *
 * C'est la grandeur que l'agitation vient éprouver, atome par atome. Une molécule
 * ne casse donc pas d'un bloc : elle perd d'abord ses atomes les plus mal tenus,
 * et une longue chaîne se rompt à son maillon faible, jamais au hasard.
 */
export function attachement(grille: Grille, r: number, c: number): number {
  const code = caseA(grille, r, c);
  if (code === null) return 0;
  let total = 0;
  for (const [dr, dc] of DIRECTIONS) {
    const voisin = caseA(grille, r + dr, c + dc);
    if (voisin !== null) total += forceLiaison(code, voisin);
  }
  return total;
}

/** Nombre de voisins occupés d'une case. */
function voisinsOccupes(grille: Grille, r: number, c: number): number {
  let n = 0;
  for (const [dr, dc] of DIRECTIONS) {
    if (caseA(grille, r + dr, c + dc) !== null) n++;
  }
  return n;
}

/**
 * Une case peut-elle ACCUEILLIR tel atome sans violer aucune valence ?
 *
 * Deux conditions, et la seconde est celle qu'on oublie : il ne suffit pas que
 * le nouvel arrivant supporte ses voisins, il faut aussi que chacun de ses
 * voisins le supporte, LUI. Un soufre déjà entouré de deux atomes refuse le
 * troisième — et c'est ce refus, répété, qui donne leurs formes aux molécules :
 * le soufre ne fait que des chaînes, le carbone peut bâtir des blocs.
 */
export function peutAccueillir(grille: Grille, r: number, c: number, code: Code): boolean {
  if (!dansLaGrille(r, c)) return false;
  if (caseA(grille, r, c) !== null) return false;
  if (voisinsOccupes(grille, r, c) > ATOMES[code].valence) return false;

  for (const [dr, dc] of DIRECTIONS) {
    const voisin = caseA(grille, r + dr, c + dc);
    if (voisin === null) continue;
    if (voisinsOccupes(grille, r + dr, c + dc) + 1 > ATOMES[voisin].valence) return false;
  }
  return true;
}

/** Tire un élément au hasard, ou `null` si la liste est vide. */
function tirer<T>(liste: T[], rng: Alea): T | null {
  return liste.length === 0 ? null : liste[Math.floor(rng() * liste.length)];
}

/** Mélange une copie — l'ordre de traitement ne doit rien décider. */
function melanger<T>(liste: T[], rng: Alea): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/** Les cases occupées d'un canevas. */
export function cellulesDe(grille: Grille): Cellule[] {
  const cellules: Cellule[] = [];
  for (let r = 0; r < COTE; r++) {
    for (let c = 0; c < COTE; c++) {
      if (caseA(grille, r, c) !== null) cellules.push({ r, c });
    }
  }
  return cellules;
}

/**
 * Recentre un fragment sur son canevas, pour qu'il ait de la place de tous les
 * côtés. Une molécule collée au bord ne pourrait plus croître que d'un côté :
 * la géométrie du canevas deviendrait une contrainte de jeu, ce qu'elle n'est pas.
 */
export function recentrer(cellulesAvecCode: CelluleCodee[]): Grille {
  const rs = cellulesAvecCode.map((x) => x.r);
  const cs = cellulesAvecCode.map((x) => x.c);
  const hauteur = Math.max(...rs) - Math.min(...rs) + 1;
  const largeur = Math.max(...cs) - Math.min(...cs) + 1;
  const dr = Math.floor((COTE - hauteur) / 2) - Math.min(...rs);
  const dc = Math.floor((COTE - largeur) / 2) - Math.min(...cs);

  const grille = grilleVide();
  for (const { r, c, code } of cellulesAvecCode) grille[r + dr][c + dc] = code;
  return grille;
}

/** Crée une molécule à partir de cases portant leur atome. */
function molecule(id: number, cellulesAvecCode: CelluleCodee[]): MoleculeSoupe {
  return { id, grille: recentrer(cellulesAvecCode) };
}

/** Ajoute un atome libre au sac. */
function rendre(libres: Compte, code: Code, n = 1): void {
  libres[code] = (libres[code] ?? 0) + n;
}

/**
 * CHANCE QU'UN ATOME LÂCHE, entre 0 et 1.
 *
 * La force d'agitation n'est pas un couperet, c'est une TEMPÉRATURE. Un seuil
 * binaire — « en dessous de F, ça casse » — rendait la croissance monotone :
 * une molécule ne faisait que grossir, puisque chaque atome capturé augmentait
 * l'attachement des autres. Plus rien ne se détachait jamais, la soupe se figeait
 * et n'explorait qu'une dizaine de formes. Mesuré, puis corrigé.
 *
 * Avec une loi exponentielle, tout peut lâcher, mais pas également : un atome
 * tenu par une seule liaison de soufre part souvent, un carbone entouré de
 * quatre voisins ne part presque jamais. Il en résulte un ÉQUILIBRE — les
 * molécules grandissent tant que la capture l'emporte, et s'érodent dès que
 * l'agitation l'emporte — au lieu d'une croissance sans retour.
 */
export function chanceDeLacher(attachementAtome: number, force: number): number {
  if (force <= 0) return 0;
  return Math.exp(-attachementAtome / force);
}

/**
 * UNE AGITATION.
 *
 * @param {object} etat
 * @param {{force:number, apport?:number}} reglage
 *   `force`  : ce que l'agitation arrache. Comparée à l'attachement de chaque atome.
 *   `apport` : nombre d'atomes libres qui tentent de se fixer à chaque tour.
 * @returns {{etat:object, bilan:object}}
 */
export function agiter(
  etat: EtatSoupe,
  { force, apport = 4 }: { force: number; apport?: number },
  rng: Alea = Math.random,
): { etat: EtatSoupe; bilan: BilanAgitation } {
  const libres = { ...etat.libres };
  const bilan = { detaches: 0, ruptures: 0, captures: 0, nucleations: 0, tenus: 0 };
  let prochainId = etat.prochainId;

  // ── 1. RUPTURE ────────────────────────────────────────────────────────────
  const survivantes: MoleculeSoupe[] = [];
  for (const mol of etat.molecules) {
    const grille = copier(mol.grille);

    // On mesure AVANT de rien retirer : sinon les premiers départs changeraient
    // le sort des suivants, et le résultat dépendrait de l'ordre de parcours.
    const mesures = cellulesDe(grille).map(({ r, c }) => ({ r, c, tenu: attachement(grille, r, c) }));

    for (const { r, c, tenu } of mesures) {
      const code = caseA(grille, r, c);
      if (code === null) continue;
      if (rng() >= chanceDeLacher(tenu, force)) {
        bilan.tenus += 1;
        continue;
      }
      grille[r][c] = null;
      rendre(libres, code);
      bilan.detaches += 1;
    }

    // Ce qui reste peut s'être scindé : chaque morceau devient une molécule.
    const morceaux = fragments(grille);
    if (morceaux.length > 1) bilan.ruptures += morceaux.length - 1;

    for (const morceau of morceaux) {
      if (morceau.length === 1) {
        // Un atome seul n'est plus une molécule : il retourne au sac.
        rendre(libres, caseA(grille, morceau[0].r, morceau[0].c) as Code);
        continue;
      }
      const avecCode = morceau.map(({ r, c }) => ({ r, c, code: caseA(grille, r, c) as Code }));
      survivantes.push(molecule(mol.id, avecCode));
    }
  }

  // ── 2. CAPTURE ────────────────────────────────────────────────────────────
  // Les atomes libres se fixent là où la valence les accepte. Une molécule dont
  // toutes les places sont saturées n'accepte plus rien : elle cesse de croître
  // sans qu'aucune taille maximale n'ait été décrétée.
  const molecules = survivantes.map((m) => ({ ...m, grille: copier(m.grille) }));
  for (let essai = 0; essai < apport; essai++) {
    const code = tirer(
      CODES.filter((x) => (libres[x] ?? 0) > 0),
      rng,
    );
    if (code === null) break;
    if (molecules.length === 0) break;

    const cible = tirer(molecules, rng);
    if (cible === null) break;
    const places: Cellule[] = [];
    for (const { r, c } of cellulesDe(cible.grille)) {
      for (const [dr, dc] of DIRECTIONS) {
        if (peutAccueillir(cible.grille, r + dr, c + dc, code)) places.push({ r: r + dr, c: c + dc });
      }
    }
    const ou = tirer(places, rng);
    if (ou === null) continue; // saturée : l'atome reste libre

    cible.grille[ou.r][ou.c] = code;
    libres[code] = (libres[code] ?? 0) - 1;
    bilan.captures += 1;

    // La croissance peut avoir collé la molécule au bord : on la recentre.
    const avecCode = cellulesDe(cible.grille).map(({ r, c }) => ({
      r,
      c,
      code: caseA(cible.grille, r, c) as Code,
    }));
    cible.grille = recentrer(avecCode);
  }

  // ── 3. NUCLÉATION ─────────────────────────────────────────────────────────
  // Deux atomes libres se rencontrent. C'est la seule façon dont une molécule
  // NAÎT — sans quoi une soupe vidée de ses molécules ne repartirait jamais.
  while (molecules.length < CAPACITE) {
    const disponibles = CODES.filter((x) => (libres[x] ?? 0) > 0);
    const total = disponibles.reduce((s, x) => s + (libres[x] ?? 0), 0);
    if (total < 2) break;

    const a = tirer(disponibles, rng);
    if (a === null) break;
    libres[a] = (libres[a] ?? 0) - 1;
    const b = tirer(
      CODES.filter((x) => (libres[x] ?? 0) > 0),
      rng,
    );
    if (b === null) {
      rendre(libres, a);
      break;
    }
    libres[b] = (libres[b] ?? 0) - 1;

    // Aucun seuil ici : le couple naît, et l'agitation le jugera au tour suivant
    // comme elle juge tout le reste. Un seuil de naissance aurait interdit à une
    // agitation vive de produire quoi que ce soit — la soupe serait restée vide.
    molecules.push(
      molecule(prochainId++, [
        { r: 0, c: 0, code: a },
        { r: 0, c: 1, code: b },
      ]),
    );
    bilan.nucleations += 1;
  }

  return {
    etat: {
      libres,
      molecules: melanger(molecules, rng),
      agitations: etat.agitations + 1,
      prochainId,
    },
    bilan,
  };
}

/** PRÉLEVER : la molécule quitte la soupe. Le seul geste délibéré du premier acte. */
export function prelever(etat: EtatSoupe, id: number): EtatSoupe {
  return { ...etat, molecules: etat.molecules.filter((m) => m.id !== id) };
}

/** Rendre une molécule à la soupe sous forme d'atomes libres. */
export function dissoudre(etat: EtatSoupe, id: number): EtatSoupe {
  const mol = etat.molecules.find((m) => m.id === id);
  if (!mol) return etat;
  const libres = { ...etat.libres };
  for (const { r, c } of cellulesDe(mol.grille)) rendre(libres, caseA(mol.grille, r, c) as Code);
  return { ...etat, libres, molecules: etat.molecules.filter((m) => m.id !== id) };
}

/** Tous les atomes en jeu, libres et engagés. Sert d'invariant de conservation. */
export function inventaire(etat: EtatSoupe): Compte {
  const total = { ...etat.libres };
  for (const mol of etat.molecules) {
    for (const { r, c } of cellulesDe(mol.grille)) {
      const code = caseA(mol.grille, r, c) as Code;
      total[code] = (total[code] ?? 0) + 1;
    }
  }
  return total;
}

/** Forces d'agitation proposées au joueur. Le nom compte plus que le nombre. */
export const FORCES = Object.freeze([
  {
    nom: "remuer",
    force: 1,
    description: "Tout tient, même le soufre. La soupe s'encombre de grandes choses molles.",
  },
  {
    nom: "secouer",
    force: 2.5,
    description: "Le soufre ne tient plus seul. Restent le carbone et l'azote bien entourés.",
  },
  {
    nom: "battre",
    force: 4.5,
    description: "Rien ne survit qu'au prix de plusieurs liaisons. Peu de molécules, denses.",
  },
]);
