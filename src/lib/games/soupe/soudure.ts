/**
 * La soudure et le gabarit — PUR, sans I/O.
 *
 * CE QUE CE MODULE APPORTE, ET POURQUOI IL A FALLU LE MESURER TROIS FOIS
 *
 * Le bassin savait faire vivre des espèces, pas en fabriquer. Il leur accordait
 * une réplication proportionnelle à ce que le milieu leur payait — c'est-à-dire
 * qu'il OFFRAIT la copie, exactement comme l'atelier du deuxième acte. Or se
 * recopier soi-même est le problème difficile de l'origine de la vie ; un jeu
 * qui le donne en cadeau a déjà raconté sa fin.
 *
 * Ici une molécule ne se copie pas. Elle est SOUDÉE à partir de deux autres, et
 * la soudure va d'autant plus vite qu'une troisième molécule tient les deux
 * morceaux en place. C'est la ligation sur gabarit.
 *
 * TROIS RÈGLES ONT ÉTÉ ESSAYÉES ET DEUX REJETÉES PAR LA MESURE :
 *
 *   1. « Le catalyseur ressemble au produit. » Tautologique : toute molécule se
 *      ressemble à elle-même, donc chacune catalysait sa propre fabrication.
 *      Mesuré : 402 auto-réplicateurs solitaires sur 429 molécules. Le cadeau
 *      qu'on voulait retirer revenait par la fenêtre.
 *
 *   2. « La nourriture, ce sont les atomes. » L'ensemble sortait vide, et ce
 *      n'était pas un bug : aucune molécule ne peut catalyser la formation d'un
 *      dimère, dont le contour (longueur 2) est trop court pour offrir une
 *      prise. Rien ne démarrait jamais. C'est LE PROBLÈME DE L'AMORÇAGE, il est
 *      réel, et sa résolution l'est aussi — un catalyseur n'autorise pas une
 *      réaction, il l'accélère. Les liaisons spontanées existent, lentement.
 *      Le premier acte du jeu EST déjà ce régime non catalysé.
 *
 *   3. « Deux molécules se soudent dans toute position libre. » Mesuré : sept
 *      mille molécules atteignables depuis une main de six, et les neuf mains
 *      essayées fermaient toutes un cycle. Une règle qui réussit toujours n'est
 *      pas une règle, et sept mille espèces ne se montrent pas à l'écran.
 *
 * D'où la règle retenue, qui est aussi la plus chimique des trois : LA COUTURE
 * DOIT SE RECONNAÎTRE. Deux molécules ne se lient que là où chaque contact
 * apparie C avec N, ou S avec S. C'est la forme qui décide avec qui on se lie —
 * la thèse du jeu depuis le premier acte, poursuivie d'un cran.
 *
 * ⚠️ CE FICHIER EST UN PORTAGE, PAS UN ORIGINAL — voir `types.ts`. La règle vient
 * de `chtabay/Ludonatif-3` (`soupe/src/soudure.js`), où douze tests l'éprouvent.
 * Les commentaires sont conservés mot pour mot ; seuls les types sont ajoutés.
 *
 * ⚠️ AUCUNE TRANSMUTATION. Les atomes se conservent : une soudure ne fait que
 * réunir. C↔N est un APPARIEMENT, comme deux bases qui se reconnaissent, jamais
 * un carbone qui deviendrait de l'azote.
 */

import type { Cellule, CelluleCodee, Code, Grille } from "./types";

import { ATOMES, COTE, caseA, grilleVide } from "./grille";
import { visage } from "./visage";
import { cellulesDe } from "./soupe";

/**
 * QUI RECONNAÎT QUI. Le carbone et l'azote s'apparient ; le soufre s'apparie
 * avec lui-même. Trois atomes, un seul appariement croisé : c'est le minimum
 * pour que la reconnaissance porte de l'information sans être triviale.
 */
export const COMPLEMENT: Readonly<Record<Code, Code>> = Object.freeze({ C: "N", N: "C", S: "S" });

/**
 * La longueur du segment de contour qu'un gabarit doit reconnaître.
 *
 * ⚠️ DEUX, ET C'EST MESURÉ. À trois, la catalyse tombe à zéro pour des molécules
 * de quatre atomes : leur contour est trop court pour offrir deux prises de
 * longueur trois. À deux, on compte 27 catalyseurs par réaction — assez pour que
 * la catalyse existe, pas assez pour qu'elle soit gratuite.
 */
export const PRISE = 2;

/** Les cellules d'une grille, avec leur atome. */
function cellulesCodees(grille: Grille): CelluleCodee[] {
  return cellulesDe(grille).map(({ r, c }: Cellule) => ({ r, c, code: caseA(grille, r, c) as Code }));
}

/** Ramène un jeu de cellules contre l'origine. */
function coller(cellules: CelluleCodee[]): CelluleCodee[] {
  const r0 = Math.min(...cellules.map((x) => x.r));
  const c0 = Math.min(...cellules.map((x) => x.c));
  return cellules.map((x) => ({ r: x.r - r0, c: x.c - c0, code: x.code }));
}

/** Un quart de tour. */
function pivoter(cellules: CelluleCodee[]): CelluleCodee[] {
  return coller(cellules.map((x) => ({ r: x.c, c: -x.r, code: x.code })));
}

/**
 * L'EMPREINTE d'une molécule : sa forme ET ses atomes, à la rotation près.
 *
 * ⚠️ CE N'EST PAS LE VISAGE, et la distinction compte ici. Le visage ne lit que
 * le CONTOUR : deux molécules différentes peuvent le partager, ce qui est sans
 * conséquence quand on ne fait que les juger, mais désastreux quand on les
 * soude — on collerait une forme et on obtiendrait l'autre. L'empreinte
 * identifie l'objet ; le visage dit ce que le monde en voit.
 *
 * Le miroir n'est PAS ramené à l'original : une molécule et son reflet sont deux
 * choses distinctes. Mesuré sur 213 molécules réelles, 55 % ont un visage
 * différent de celui de leur reflet — la chiralité est là, et la soudure lui
 * donne enfin un emploi, puisqu'un reflet n'a pas les mêmes partenaires.
 */
export function empreinte(grille: Grille): string {
  let meilleure: string | null = null;
  let cellules = coller(cellulesCodees(grille));
  for (let quart = 0; quart < 4; quart++) {
    const cle = cellules
      .map((x) => `${x.r},${x.c},${x.code}`)
      .sort()
      .join("|");
    if (meilleure === null || cle < meilleure) meilleure = cle;
    cellules = pivoter(cellules);
  }
  // Quatre quarts de tour ont toujours produit au moins une clé : le `null` de
  // départ n'existe plus ici, et TypeScript ne peut pas le savoir seul.
  return meilleure as string;
}

/** Les segments de longueur {@link PRISE} d'un visage, lu comme un anneau. */
export function prises(visageMolecule: string, longueur: number = PRISE): Set<string> {
  const out = new Set<string>();
  if (visageMolecule.length < longueur) return out;
  for (let i = 0; i < visageMolecule.length; i++) {
    let s = "";
    for (let j = 0; j < longueur; j++) s += visageMolecule[(i + j) % visageMolecule.length];
    out.add(s);
  }
  return out;
}

/**
 * Le complément d'un segment, LU À L'ENVERS.
 *
 * À l'envers parce que deux bords qui se rencontrent courent en sens opposés —
 * comme deux brins antiparallèles. Ce n'est pas une coquetterie : dans l'autre
 * sens, un gabarit reconnaîtrait des molécules qu'il ne peut pas tenir.
 */
export function complementInverse(segment: string): string {
  return [...segment]
    .reverse()
    .map((code) => COMPLEMENT[code as Code])
    .join("");
}

/**
 * X TIENT-IL Y ? Vrai si le contour de X présente le complément inversé d'un
 * segment du contour de Y — c'est-à-dire s'il peut s'y appliquer.
 */
export function tient(visageX: string, visageY: string, longueur: number = PRISE): boolean {
  const chezX = prises(visageX, longueur);
  for (const segment of prises(visageY, longueur)) {
    if (chezX.has(complementInverse(segment))) return true;
  }
  return false;
}

/**
 * X TIENT-IL A ET B CÔTE À CÔTE ? La vraie question d'une ligation sur gabarit.
 *
 * ⚠️ « TENIR L'UN QUELQUE PART ET L'AUTRE QUELQUE PART » NE SUFFIT PAS, et c'est
 * une faute de géométrie, pas de rigueur. Un gabarit sert à AMENER deux morceaux
 * l'un contre l'autre ; s'il reconnaît le premier sur une face et le second sur
 * la face opposée, il ne les rapproche de rien. La règle laxiste se mesure : 42 %
 * des couples tenus par une molécule pêchée quelconque, et jusqu'à 99,6 % pour
 * les grandes molécules — un catalyseur qui catalyse tout n'informe sur rien, et
 * le choix de ce qu'on sème n'aurait plus aucune portée.
 *
 * On exige donc que le contour de X présente, EN POSITIONS CONSÉCUTIVES, de quoi
 * accueillir A puis B. La sélectivité tombe de moitié (28 % → 14 % pour un
 * tétramère, 42 % → 24 % pour une molécule pêchée), et surtout un contour de
 * moins de deux prises ne tient plus rien : les briques ne catalysent pas, ce
 * qui est exact — un dimère n'a pas de quoi poser deux morceaux.
 */
export function tientEnsemble(
  visageX: string,
  visageA: string,
  visageB: string,
  longueur: number = PRISE,
): boolean {
  if (visageX.length < 2 * longueur) return false;
  const chezA = new Set([...prises(visageA, longueur)].map(complementInverse));
  const chezB = new Set([...prises(visageB, longueur)].map(complementInverse));
  if (chezA.size === 0 || chezB.size === 0) return false;
  for (let i = 0; i < visageX.length; i++) {
    let bande = "";
    for (let j = 0; j < 2 * longueur; j++) bande += visageX[(i + j) % visageX.length];
    const gauche = bande.slice(0, longueur);
    const droite = bande.slice(longueur);
    if ((chezA.has(gauche) && chezB.has(droite)) || (chezB.has(gauche) && chezA.has(droite))) return true;
  }
  return false;
}

/** Une grille à partir de cellules codées, recollée dans le coin. */
function enGrille(cellules: CelluleCodee[]): Grille {
  const g = grilleVide();
  for (const { r, c, code } of coller(cellules)) g[r][c] = code;
  return g;
}

/**
 * TOUTES LES SOUDURES LÉGALES DE DEUX MOLÉCULES.
 *
 * On essaie B dans ses quatre orientations, contre chaque face de chaque cellule
 * de A. Une position n'est retenue que si :
 *   · rien ne se chevauche,
 *   · CHAQUE CONTACT à travers la couture apparie deux complémentaires,
 *   · aucune valence n'est dépassée,
 *   · et le produit tient dans le canevas.
 *
 * @returns les produits, par empreinte
 */
export function souder(
  grilleA: Grille,
  grilleB: Grille,
  tailleMax: number = COTE * 2,
): Map<string, Grille> {
  const A = coller(cellulesCodees(grilleA));
  const produits = new Map<string, Grille>();
  if (A.length === 0) return produits;

  let B = coller(cellulesCodees(grilleB));
  if (B.length === 0 || A.length + B.length > tailleMax) return produits;

  const VOISINS = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (let quart = 0; quart < 4; quart++) {
    for (const ancre of A) {
      for (const mobile of B) {
        for (const [dr, dc] of VOISINS) {
          const decalR = ancre.r + dr - mobile.r;
          const decalC = ancre.c + dc - mobile.c;
          const pose = B.map((x) => ({ r: x.r + decalR, c: x.c + decalC, code: x.code }));

          if (pose.some((x) => A.some((y) => y.r === x.r && y.c === x.c))) continue;

          // LA COUTURE SE RECONNAÎT : chaque contact apparie deux complémentaires.
          let coutureOk = true;
          let contacts = 0;
          for (const x of pose) {
            for (const [vr, vc] of VOISINS) {
              const contre = A.find((y) => y.r === x.r + vr && y.c === x.c + vc);
              if (!contre) continue;
              contacts += 1;
              if (COMPLEMENT[contre.code] !== x.code) {
                coutureOk = false;
                break;
              }
            }
            if (!coutureOk) break;
          }
          if (!coutureOk || contacts === 0) continue;

          const ensemble = [...A, ...pose];
          const trop = ensemble.some((x) => {
            const n = ensemble.filter((y) => Math.abs(y.r - x.r) + Math.abs(y.c - x.c) === 1).length;
            return n > ATOMES[x.code].valence;
          });
          if (trop) continue;

          const hauteur = Math.max(...ensemble.map((x) => x.r)) - Math.min(...ensemble.map((x) => x.r)) + 1;
          const largeur = Math.max(...ensemble.map((x) => x.c)) - Math.min(...ensemble.map((x) => x.c)) + 1;
          if (hauteur > COTE || largeur > COTE) continue;

          const g = enGrille(ensemble);
          const cle = empreinte(g);
          if (!produits.has(cle)) produits.set(cle, g);
        }
      }
    }
    B = pivoter(B);
  }
  return produits;
}

/** Le visage d'une grille, sans avoir à recalculer ses cellules ailleurs. */
export function visageDe(grille: Grille): string {
  return visage(grille, cellulesDe(grille));
}
