/**
 * Le milieu — PUR, sans I/O, sans dépendance.
 *
 * Le milieu est ce qui donne leur valeur aux molécules, et il ne les connaît
 * pas. Il ne sait reconnaître que de courts MOTIFS DE SURFACE. Chaque fois qu'un
 * motif qu'il recherche apparaît sur le visage d'une molécule, il le paie ;
 * chaque fois qu'un motif qu'il tolère mal y apparaît, il le fait payer.
 *
 * C'est ce qui permet à un changement de milieu de réévaluer d'un coup toutes
 * les molécules du monde, sans que rien d'autre ne bouge. La molécule qui
 * prospérait devient médiocre, et une autre, restée jusque-là sans intérêt,
 * devient la bonne. La sélection ne demande aucune machinerie supplémentaire :
 * elle est déjà là dès qu'il existe deux milieux.
 *
 * Les milieux sont ENGENDRÉS, pas écrits. Un entier suffit à en produire un, et
 * le même entier produit toujours le même — de sorte qu'un milieu se nomme, se
 * partage et se retrouve.
 */

import type { Alea, Compte, Milieu, Motif } from "./types";


import { CODES } from "./grille";

/** Générateur déterministe (mulberry32). Deux mêmes graines, deux mêmes milieux. */
export function alea(graine: number): Alea {
  let a = graine >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * LE PREMIER MILIEU, et le seul qui soit écrit à la main.
 *
 * Il est simple — un motif, positif, de longueur deux — pour que le joueur
 * puisse formuler la règle du monde en une phrase après trois agitations :
 * « ici, c'est le carbone accolé à l'azote qui rapporte ».
 *
 * IL RÉCOMPENSE UN MOTIF MIXTE, ET C'EST DÉLIBÉRÉ. Une première version payait
 * `CC`, et la mesure a montré qu'elle ne posait aucun problème au joueur : le
 * carbone lie le plus fort, se ramifie le plus, coûte le moins cher. Payer le
 * carbone en faisait un choix sans alternative, et le meilleur rendement se
 * trouvait être aussi le meilleur rendement net — donc aucune décision.
 *
 * En payant `CN`, le milieu exige ce qu'aucun atome ne donne seul : il faut du
 * carbone pour tenir et de l'azote pour rapporter, et il faut surtout qu'ils se
 * touchent EN SURFACE. La composition ne suffit pas, l'agencement décide — ce
 * qui est exactement la leçon que le premier acte doit enseigner.
 */
export const PREMIER_MILIEU: Milieu = Object.freeze({
  graine: 0,
  rang: 0,
  nom: "L'eau tiède",
  description: "Un milieu clément. Le carbone accolé à l'azote y rapporte, et rien n'y nuit.",
  motifs: Object.freeze([Object.freeze({ motif: "CN", valeur: 3 })]),
  // Le flux ne sert qu'au troisième acte ; le premier milieu en porte un par
  // uniformité, pour qu'aucun code n'ait à traiter son absence comme un cas.
  flux: Object.freeze({ C: 24, N: 12, S: 8 }),
  // Agitation faible : dans un milieu d'apprentissage, un gabarit médiocre doit
  // rapporter peu, pas condamner la partie. Mesuré : à 0,8 le dimère CN avait un
  // rendement net négatif et l'atelier mourait en trois cents tours ; à 0,5 il
  // survit mal, ce qui est la bonne punition — visible, pas définitive.
  agitation: 0.5,
});

/** Toutes les suites d'atomes d'une longueur donnée, dans un ordre stable. */
function motifsPossibles(longueur: number): string[] {
  let suites = [""];
  for (let i = 0; i < longueur; i++) {
    suites = suites.flatMap((s) => CODES.map((code) => s + code));
  }
  return suites;
}

/**
 * Engendre un milieu depuis une graine.
 *
 * La difficulté monte avec `rang` : les premiers milieux offrent peu de motifs,
 * courts et bienveillants ; les suivants en portent davantage, plus longs, et
 * certains hostiles. Un motif hostile n'est pas une punition arbitraire — c'est
 * ce qui rend la grande surface risquée, et donc la forme compacte défendable.
 *
 * @param {number} graine  identifie le milieu ; la même graine rend le même milieu
 * @param {number} rang    0 = début de partie ; au-delà, le milieu se complique
 */
export function engendrerMilieu(graine: number, rang = 0): Milieu {
  const rng = alea(graine * 2654435761);

  const nbMotifs = Math.min(2 + Math.floor(rang / 2), 5);
  const partHostile = Math.min(0.15 + rang * 0.06, 0.45);

  const dejaPris = new Set();
  const motifs: Motif[] = [];

  for (let i = 0; i < nbMotifs; i++) {
    // Les motifs longs sont rares au début : ils sont plus difficiles à obtenir
    // sur un visage, donc plus rémunérateurs, donc réservés aux milieux mûrs.
    const longueur = rang >= 2 && rng() < 0.35 ? 3 : 2;
    const candidats = motifsPossibles(longueur).filter((m) => !dejaPris.has(m));
    if (candidats.length === 0) break;

    const motif = candidats[Math.floor(rng() * candidats.length)];
    dejaPris.add(motif);

    const hostile = rng() < partHostile;
    const ampleur = longueur === 3 ? 3 : 1;
    const valeur = hostile
      ? -(1 + Math.floor(rng() * 2)) * ampleur
      : (1 + Math.floor(rng() * 3)) * ampleur;

    motifs.push({ motif, valeur });
  }

  // Un milieu sans aucune occasion serait une impasse, pas une épreuve.
  if (!motifs.some((m) => m.valeur > 0)) {
    motifs[0] = { motif: motifs[0].motif, valeur: 2 };
  }

  return {
    graine,
    rang,
    nom: nommer(graine),
    /**
     * CE QUE LE MILIEU VERSE, par tour, dans le bassin du troisième acte.
     *
     * ⚠️ C'EST LE FLUX QUI FAIT LA DÉCISION, PAS LE TARIF. Deux milieux peuvent
     * payer le même motif et n'appeler pas du tout le même assortiment : une eau
     * qui déverse du carbone et peu d'azote rend les molécules riches en azote
     * lentes à se faire, si rentables soient-elles. C'est le seul endroit du jeu
     * où la RARETÉ existe, et elle est la matière première de la sélection.
     */
    flux: engendrerFlux(graine),
    description: decrireMilieu(motifs),
    motifs,
    // AGITATION DU MILIEU : ce qu'il fait subir aux molécules qui y vivent.
    // C'est elle qui use les copies du deuxième acte et les individus du
    // troisième, toujours avec la loi du premier.
    //
    // ⚠️ LA PENTE A ÉTÉ RETENDUE APRÈS MESURE SUR LE BASSIN. À `0,8 + rang×0,18`
    // elle atteignait 1,7 au cinquième rang, et là une seule espèce sur seize
    // gardait une croissance positive : le bassin s'éteignait quoi qu'on y
    // mette. Une usure qui tue tout ne sélectionne rien — elle ne laisse pas de
    // choix, elle en supprime. La pente est donc plus douce, et c'est la
    // difficulté du MOTIF, pas celle de l'usure, qui portera la montée.
    agitation: Number((0.6 + rang * 0.1).toFixed(2)),
  };
}

/**
 * Un flux déséquilibré, dérivé de la graine.
 *
 * Quarante atomes par tour, répartis inégalement : un atome abondant, un moyen,
 * un rare. Un flux plat rendrait toutes les compositions équivalentes et il n'y
 * aurait plus rien à arbitrer.
 *
 * ⚠️ LA QUANTITÉ EST UN PLAFOND DE VIVANT, PAS UN RÉGLAGE DE CONFORT. Le flux
 * versait dix atomes ; toutes pertes faites, le bassin ne pouvait alors tenir
 * qu'une quarantaine de dimères, donc au plus cinq soudures par tour, réparties
 * sur cent produits possibles. Aucune molécule ne pouvait dépasser six individus
 * et rien ne s'installait jamais : la matière, et non la chimie, était la limite.
 * Le rapport 6:3:1 est inchangé — c'est lui qui porte la décision, et la rareté
 * relative reste exactement la même.
 */
function engendrerFlux(graine: number): Compte {
  const rng = alea(graine * 2246822519 + 101);
  const parts = [24, 12, 4];
  const ordre = [...CODES];
  // Mélange : c'est le tirage qui décide quel atome est abondant ici.
  for (let i = ordre.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ordre[i], ordre[j]] = [ordre[j], ordre[i]];
  }
  const flux: Compte = {};
  ordre.forEach((code, i) => {
    flux[code] = parts[i];
  });
  return flux;
}

/**
 * Un nom prononçable, dérivé de la graine. Sert à ce qu'un milieu se retienne et
 * se raconte — « je l'ai trouvée dans la Vase Ocre » vaut mieux qu'un numéro.
 */
function nommer(graine: number): string {
  const debuts = ["Vase", "Saumure", "Cendre", "Argile", "Lagune", "Fange", "Brume", "Salure"];
  const teintes = ["ocre", "pâle", "noire", "amère", "tiède", "vive", "lente", "âcre"];
  const rng = alea(graine * 40503 + 7);
  return `${debuts[Math.floor(rng() * debuts.length)]} ${teintes[Math.floor(rng() * teintes.length)]}`;
}

/** Une phrase qui dit ce que le milieu cherche et ce qu'il tolère mal. */
function decrireMilieu(motifs: Motif[]): string {
  const bons = motifs.filter((m) => m.valeur > 0).map((m) => m.motif);
  const mauvais = motifs.filter((m) => m.valeur < 0).map((m) => m.motif);
  const phrases: string[] = [];
  if (bons.length > 0) phrases.push(`recherche ${bons.join(", ")}`);
  if (mauvais.length > 0) phrases.push(`supporte mal ${mauvais.join(", ")}`);
  return phrases.join(" · ");
}

/** La suite des milieux d'une partie : le premier est écrit, les autres suivent. */
export function milieuAuRang(rang: number): Milieu {
  if (rang === 0) return PREMIER_MILIEU;
  return engendrerMilieu(rang * 7919 + 13, rang);
}
