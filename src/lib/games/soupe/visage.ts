/**
 * Le visage d'une molécule — PUR, sans I/O, sans dépendance.
 *
 * IDÉE CENTRALE DU JEU. Une molécule n'est pas définie par une figure qu'un
 * développeur aurait nommée : elle est définie par ce que le milieu voit d'elle,
 * c'est-à-dire par sa SURFACE. Les atomes enfouis à l'intérieur tiennent
 * l'édifice ; seuls ceux du pourtour rencontrent le monde.
 *
 * Le visage est donc la suite des atomes rencontrés en faisant le tour du
 * fragment. C'est une propriété purement géométrique : rien n'est écrit à la
 * main, tout se déduit de l'arrangement. Deux molécules de même composition mais
 * d'agencement différent n'ont pas le même visage — et n'auront donc pas le même
 * destin.
 *
 * Deux choix méritent d'être explicites :
 *
 *  1. INVARIANCE PAR ROTATION. Une molécule qui flotte n'a pas d'orientation
 *     privilégiée : on retient la rotation la plus petite dans l'ordre
 *     lexicographique, pour que la même molécule ait toujours le même visage.
 *
 *  2. PAS D'INVARIANCE PAR MIROIR. Une molécule et son image dans un miroir
 *     restent DEUX molécules distinctes. C'est vrai en chimie — la chiralité
 *     sépare des composés aux effets opposés — et c'est vrai ici : deux visages
 *     symétriques ouvriront des serrures différentes.
 */

import type { Cellule, Code, Grille } from "./types";

/** Ce que le contour rend au dehors : une cellule, son atome, le côté longé. */
interface Arete {
  cellule: Cellule;
  atome: Code;
  cote: string;
}

/** Ce que le parcours manipule en chemin — avec de quoi enchaîner les arêtes. */
interface AreteComplete extends Arete {
  depart: number[];
  arrivee: number[];
  direction: number;
}


import { COTE, DIRECTIONS, caseA } from "./grille";

/**
 * Directions, dans l'ordre horaire de l'écran (les lignes croissent vers le bas).
 * L'ordre est porteur : « tourner à droite » signifie avancer d'un cran ici.
 */
const HORAIRE = [
  { nom: "est", dr: 0, dc: 1 },
  { nom: "sud", dr: 1, dc: 0 },
  { nom: "ouest", dr: 0, dc: -1 },
  { nom: "nord", dr: -1, dc: 0 },
];

const INDEX_DIRECTION = new Map(HORAIRE.map((d, i) => [`${d.dr},${d.dc}`, i]));

/**
 * Les quatre côtés d'une case, orientés dans le sens horaire, en coordonnées de
 * COIN — le coin (r, c) est le coin haut-gauche de la case (r, c).
 *
 * Parcourus dans cet ordre, l'intérieur de la case reste toujours à droite. Cette
 * convention est ce qui permet, plus bas, de suivre le bord sans jamais le perdre.
 */
const COTES = [
  // côté      voisin qui le rend exposé        départ            arrivée
  { nom: "haut", dr: -1, dc: 0, de: [0, 0], vers: [0, 1] },
  { nom: "droite", dr: 0, dc: 1, de: [0, 1], vers: [1, 1] },
  { nom: "bas", dr: 1, dc: 0, de: [1, 1], vers: [1, 0] },
  { nom: "gauche", dr: 0, dc: -1, de: [1, 0], vers: [0, 0] },
];

const cleCoin = (r: number, c: number) => `${r},${c}`;

/**
 * Recense les arêtes de bord d'un fragment, indexées par leur coin de départ.
 * Une arête existe dès qu'un côté de case donne sur le vide ou sur l'extérieur.
 */
function aretesDeBord(grille: Grille, cellules: Cellule[]): Map<string, AreteComplete[]> {
  const dedans = new Set(cellules.map(({ r, c }) => `${r},${c}`));
  const parDepart = new Map<string, AreteComplete[]>();

  for (const { r, c } of cellules) {
    for (const cote of COTES) {
      const voisin = `${r + cote.dr},${c + cote.dc}`;
      const estExpose = !dedans.has(voisin);
      if (!estExpose) continue;

      const depart = [r + cote.de[0], c + cote.de[1]];
      const arrivee = [r + cote.vers[0], c + cote.vers[1]];
      const arete = {
        cellule: { r, c },
        atome: caseA(grille, r, c) as Code,
        depart,
        arrivee,
        direction: INDEX_DIRECTION.get(`${arrivee[0] - depart[0]},${arrivee[1] - depart[1]}`) as number,
        cote: cote.nom,
      };

      const cle = cleCoin(depart[0], depart[1]);
      if (!parDepart.has(cle)) parDepart.set(cle, []);
      (parDepart.get(cle) as AreteComplete[]).push(arete);
    }
  }

  return parDepart;
}

/**
 * Fait le tour EXTÉRIEUR d'un fragment et rend les arêtes dans l'ordre du parcours.
 *
 * On part du côté haut de la case la plus haute puis la plus à gauche : ce côté
 * est nécessairement sur le bord extérieur, jamais sur celui d'une cavité. On
 * suit ensuite les arêtes bout à bout.
 *
 * Au passage d'un PINCEMENT — deux cases qui ne se touchent que par un coin,
 * reliées par un chemin plus loin — deux arêtes repartent du même coin. On
 * choisit alors le virage le plus à droite : c'est ce qui garde l'intérieur du
 * bon côté et fait longer la forme au lieu de sauter sur l'autre branche.
 *
 * @returns {{cellule:{r:number,c:number}, atome:string, cote:string}[]}
 */
export function contour(grille: Grille, cellules: Cellule[]): Arete[] {
  if (cellules.length === 0) return [];

  const parDepart = aretesDeBord(grille, cellules);

  const depart = [...cellules].sort((a, b) => a.r - b.r || a.c - b.c)[0];
  const premiere = (parDepart.get(cleCoin(depart.r, depart.c)) ?? []).find(
    (a) => a.cote === "haut" && a.cellule.r === depart.r && a.cellule.c === depart.c,
  );
  // Une case la plus haute a forcément son côté haut exposé.
  if (!premiere) return [];

  const parcours: AreteComplete[] = [premiere];
  let courante = premiere;
  const gardeFou = 4 * COTE * COTE + 4;

  while (parcours.length < gardeFou) {
    const candidates = parDepart.get(cleCoin(courante.arrivee[0], courante.arrivee[1])) ?? [];
    if (candidates.length === 0) break;

    // Virage le plus à droite : dans l'ordre horaire, on repart au plus tôt
    // depuis la direction courante. `+1` d'abord, c'est-à-dire un quart de tour
    // à droite, puis tout droit, puis à gauche, puis demi-tour.
    let suivante: AreteComplete | null = null;
    let meilleur = Infinity;
    for (const c of candidates) {
      const rotation = (c.direction - courante.direction + 4) % 4;
      const rang = rotation === 1 ? 0 : rotation === 0 ? 1 : rotation === 3 ? 2 : 3;
      if (rang < meilleur) {
        meilleur = rang;
        suivante = c;
      }
    }
    if (!suivante) break;

    if (suivante === premiere) break; // la boucle est refermée
    parcours.push(suivante);
    courante = suivante;
  }

  return parcours.map(({ cellule, atome, cote }) => ({ cellule, atome, cote }));
}

/**
 * Réduit une suite CYCLIQUE en supprimant les répétitions consécutives.
 * Le caractère cyclique compte : une suite qui se referme sur elle-même voit sa
 * dernière plage fusionner avec la première si elles portent la même valeur.
 */
function plagesCycliques(suite: string[]): string[] {
  if (suite.length === 0) return [];
  const plages: string[] = [];
  for (const v of suite) {
    if (plages.length === 0 || plages[plages.length - 1] !== v) plages.push(v);
  }
  while (plages.length > 1 && plages[0] === plages[plages.length - 1]) plages.pop();
  return plages;
}

/** Plus petite rotation d'une chaîne, dans l'ordre lexicographique. */
function rotationCanonique(chaine: string): string {
  if (chaine.length <= 1) return chaine;
  let meilleure = chaine;
  for (let i = 1; i < chaine.length; i++) {
    const candidate = chaine.slice(i) + chaine.slice(0, i);
    if (candidate < meilleure) meilleure = candidate;
  }
  return meilleure;
}

/**
 * LE VISAGE : la suite des atomes rencontrés en faisant le tour, sous sa forme
 * canonique.
 *
 * On replie les passages consécutifs sur une MÊME CASE — une case qui offre
 * trois côtés d'affilée n'est qu'un seul atome de surface. On ne replie PAS les
 * atomes identiques de cases voisines : deux carbones côte à côte présentent
 * deux fois plus de carbone au milieu qu'un seul, et le visage doit le dire.
 *
 * C'est la nuance qui distingue un dimère `C-N` (visage `CN`) d'un trimère en L
 * `C,C,N` (visage `CCN`) : même alternance, surface différente.
 *
 * @returns {string} par exemple `"CN"`, `"CCN"`, `"CNCS"`
 */
export function visage(grille: Grille, cellules: Cellule[]): string {
  const tour = contour(grille, cellules);
  if (tour.length === 0) return "";
  const cases = plagesCycliques(tour.map((a) => `${a.cellule.r},${a.cellule.c}`));
  const parCle = new Map(tour.map((a) => [`${a.cellule.r},${a.cellule.c}`, a.atome]));
  return rotationCanonique(cases.map((cle) => parCle.get(cle)).join(""));
}

/**
 * Les cases exposées d'un fragment, sans doublon — celles qui touchent le vide
 * ou le bord. Le reste est enfoui, et ne sert qu'à tenir.
 */
export function surface(grille: Grille, cellules: Cellule[]): Cellule[] {
  const dedans = new Set(cellules.map(({ r, c }) => `${r},${c}`));
  return cellules.filter(({ r, c }) =>
    DIRECTIONS.some(([dr, dc]) => !dedans.has(`${r + dr},${c + dc}`)),
  );
}

/** Les cases enfouies — aucune de leurs faces ne touche l'extérieur. */
export function coeur(grille: Grille, cellules: Cellule[]): Cellule[] {
  const exposees = new Set(surface(grille, cellules).map(({ r, c }) => `${r},${c}`));
  return cellules.filter(({ r, c }) => !exposees.has(`${r},${c}`));
}
