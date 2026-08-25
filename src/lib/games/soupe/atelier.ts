/**
 * L'atelier — DEUXIÈME ACTE. PUR, sans I/O.
 *
 * Le joueur cesse de pêcher dans la soupe. Il désigne UNE molécule comme
 * gabarit, et celui-ci se réplique tout seul. C'est le moment de délégation :
 * la main se retire, la règle continue.
 *
 * TOUT LE JEU DU DEUXIÈME ACTE TIENT DANS LE CHOIX DU GABARIT, et ce choix est
 * un arbitrage à trois branches — les trois grandeurs déjà établies au premier
 * acte, dont aucune n'est ici perdue :
 *
 *   RENDEMENT  ce qu'une copie rapporte à chaque tour, dans ce milieu-ci.
 *   COÛT       les atomes qu'il faut réunir pour en bâtir une de plus. Une
 *              molécule avide d'un atome rare se réplique lentement.
 *   COHÉSION   ce qui la fait tenir. Une copie mal liée se défait, et il faut
 *              la rebâtir : un fort rendement peut être entièrement mangé par
 *              l'attrition.
 *
 * Aucune de ces trois n'est dominante. La molécule la plus rentable est souvent
 * la plus fragile, la plus solide est souvent la plus pauvre, et la moins chère
 * ne vaut rien dans le milieu du moment. Il n'existe donc pas de meilleur
 * gabarit dans l'absolu — seulement un meilleur gabarit ICI, ce qui est
 * exactement ce qu'on attend d'un jeu de sélection.
 */

import type {
  Alea,
  BilanAtelier,
  Code,
  Compte,
  EtatAtelier,
  Gabarit,
  Grille,
  Milieu,
} from "./types";


import { ATOMES, CODES } from "./grille";
import { decrire } from "./molecule";
import { chanceDeLacher, cellulesDe } from "./soupe";

/** Ce qu'une copie perdue rend en atomes : rien. Une molécule qui se défait se disperse. */
const RECUPERATION = 0;

/** Ce que coûte un atome, payé sur la réserve. L'azote est rare, donc cher. */
export const PRIX: Readonly<Record<Code, number>> = Object.freeze({ C: 6, N: 14, S: 9 });

/** Nombre de copies que l'atelier peut bâtir par tour, au plus. */
export const CADENCE = 2;

/** Un atelier à l'arrêt : pas de gabarit, pas de copies, une petite avance. */
export function atelierVide(atomes: Compte = { C: 6, N: 3, S: 3 }): EtatAtelier {
  return { gabarit: null, copies: 0, atomes: { ...atomes }, reserve: 0, tics: 0, produitTotal: 0 };
}

/**
 * FIXER LE GABARIT. Le geste qui ouvre le deuxième acte.
 *
 * On garde la molécule sous forme de grille, et on retient sa description : le
 * gabarit ne change plus, c'est justement ce qui en fait un gabarit. Ses copies
 * seront toutes identiques — la variation, s'il doit y en avoir, appartient à
 * un acte ultérieur.
 */
export function fixerGabarit(etat: EtatAtelier, grilleMolecule: Grille, milieu: Milieu): EtatAtelier {
  const cellules = cellulesDe(grilleMolecule);
  if (cellules.length < 2) throw new Error("Un gabarit demande au moins deux atomes.");

  const description = decrire(grilleMolecule, cellules, milieu);

  /**
   * L'ATELIER OUVRE AVEC DE QUOI BÂTIR SA PREMIÈRE COPIE.
   *
   * ⚠️ DÉFAUT TROUVÉ EN JOUANT, PAS EN TESTANT — et c'était le pire du jeu : il
   * rendait le tout premier geste du deuxième acte irrémédiable. L'atelier
   * ouvrait avec une avance fixe (6 C, 3 N, 3 S) ; fonder sur une molécule plus
   * grosse que cette avance donnait zéro copie, donc zéro production, donc une
   * réserve à zéro, donc aucun achat possible. La partie était morte à la
   * seconde où elle commençait, et rien à l'écran ne reliait cet arrêt au choix
   * fait juste avant. Or ce choix-là est précisément celui qu'on veut que le
   * joueur ose : les grosses molécules sont les plus rémunératrices.
   *
   * On complète donc le stock jusqu'à la composition du gabarit — pas au-delà.
   * La première copie est garantie ; la deuxième se mérite.
   *
   * ⚠️ SEULEMENT À L'OUVERTURE, jamais sur un changement de gabarit. Sinon on
   * ferait le tour des gabarits pour se remplir les poches : passer à un modèle
   * riche en carbone pour en recevoir, puis à un modèle riche en azote pour en
   * recevoir aussi. Changer de gabarit garde son prix — les copies en cours —
   * et garde son risque.
   */
  const atomes = { ...etat.atomes };
  if (etat.gabarit === null) {
    for (const [code, n] of Object.entries(description.composition) as [Code, number][]) {
      atomes[code] = Math.max(atomes[code] ?? 0, n);
    }
  }

  return {
    ...etat,
    gabarit: {
      grille: grilleMolecule.map((ligne) => [...ligne]),
      ...description,
    },
    atomes,
    copies: 0,
  };
}

/** Coût en atomes d'une copie : sa composition, exactement. */
export function coutEnAtomes(gabarit: Gabarit): Compte {
  return { ...gabarit.composition };
}

/** L'atelier a-t-il de quoi bâtir une copie de plus ? */
export function peutBatir(etat: EtatAtelier): boolean {
  if (!etat.gabarit) return false;
  const cout = coutEnAtomes(etat.gabarit);
  return CODES.every((code) => (etat.atomes[code] ?? 0) >= (cout[code] ?? 0));
}

/**
 * CHANCE QU'UNE COPIE SE DÉFASSE en un tour.
 *
 * On réemploie la loi du premier acte, appliquée cette fois à la molécule
 * entière : sa cohésion contre l'agitation du milieu. Une molécule qui tenait
 * mal dans la soupe tient mal partout — la leçon du premier acte reste vraie
 * dans le second, et le joueur n'a pas à réapprendre.
 */
export function chanceDeSeDefaire(gabarit: Gabarit, milieu: Milieu): number {
  return chanceDeLacher(gabarit.cohesion, milieu.agitation ?? 1);
}

/**
 * UN TOUR D'ATELIER. Trois temps, et l'ordre compte.
 *
 *  1. ATTRITION  — chaque copie est éprouvée. Ce qui se défait est perdu.
 *  2. PRODUCTION — les survivantes versent leur rendement à la réserve. Un
 *                  rendement négatif appauvrit : un milieu hostile coûte.
 *  3. RÉPLICATION— on bâtit tant qu'il y a des atomes, dans la limite de la cadence.
 *
 * Éprouver AVANT de produire, c'est refuser de payer les copies qui viennent de
 * disparaître. Bâtir APRÈS, c'est empêcher qu'une copie naisse et meure dans le
 * même tour sans avoir rien rapporté.
 */
export function tic(
  etat: EtatAtelier,
  milieu: Milieu,
  rng: Alea = Math.random,
): { etat: EtatAtelier; bilan: BilanAtelier } {
  if (!etat.gabarit) return { etat: { ...etat, tics: etat.tics + 1 }, bilan: { perdues: 0, baties: 0, produit: 0 } };

  const bilan = { perdues: 0, baties: 0, produit: 0 };
  const atomes = { ...etat.atomes };
  let copies = etat.copies;

  // 1. Attrition.
  const risque = chanceDeSeDefaire(etat.gabarit, milieu);
  for (let i = 0; i < copies; i++) {
    if (rng() < risque) bilan.perdues += 1;
  }
  copies -= bilan.perdues;
  if (RECUPERATION > 0) {
    for (const [code, n] of Object.entries(coutEnAtomes(etat.gabarit)) as [Code, number][]) {
      atomes[code] = (atomes[code] ?? 0) + Math.floor(n * bilan.perdues * RECUPERATION);
    }
  }

  // 2. Production.
  bilan.produit = copies * (etat.gabarit.rendement ?? 0);
  const reserve = Math.max(0, etat.reserve + bilan.produit);

  // 3. Réplication.
  const cout = coutEnAtomes(etat.gabarit);
  const apres = { ...etat, atomes, copies, reserve };
  for (let i = 0; i < CADENCE; i++) {
    if (!peutBatir(apres)) break;
    for (const [code, n] of Object.entries(cout) as [Code, number][]) {
      apres.atomes[code] = (apres.atomes[code] ?? 0) - n;
    }
    apres.copies += 1;
    bilan.baties += 1;
  }

  return {
    etat: {
      ...apres,
      tics: etat.tics + 1,
      produitTotal: etat.produitTotal + Math.max(0, bilan.produit),
    },
    bilan,
  };
}

/** Acheter un atome sur la réserve. La seule dépense du deuxième acte. */
export function acheterAtome(etat: EtatAtelier, code: Code): EtatAtelier {
  const prix = PRIX[code];
  if (etat.reserve < prix) return etat;
  return {
    ...etat,
    reserve: etat.reserve - prix,
    atomes: { ...etat.atomes, [code]: (etat.atomes[code] ?? 0) + 1 },
  };
}

/**
 * Ce qu'un gabarit vaut vraiment, tout compris : le rendement qu'il reste une
 * fois payée l'attrition qu'il impose.
 *
 * Sert à comparer deux gabarits sans avoir à simuler — et à montrer au joueur
 * que la molécule la plus rentable n'est pas toujours celle qui rapporte le plus.
 */
export function rendementNet(gabarit: Gabarit, milieu: Milieu): number {
  const risque = chanceDeSeDefaire(gabarit, milieu);
  return (gabarit.rendement ?? 0) - risque * coutEnEnergie(gabarit);
}

/**
 * CE QU'UNE COPIE COÛTE EN ÉNERGIE, au prix du marché.
 *
 * ⚠️ LA TENSION DU DEUXIÈME ACTE TIENT DANS CE SEUL NOMBRE, et il n'était écrit
 * nulle part. L'azote est à la fois ce que le milieu paie ET l'atome le plus
 * cher (14 contre 6 pour le carbone) : la molécule la plus rentable est donc
 * aussi la plus chère à répliquer. Le joueur voyait « +9 par copie » d'un côté
 * et « acheter azote — 14 » de l'autre, sans que rien ne relie les deux.
 */
export function coutEnEnergie(gabarit: Gabarit): number {
  return (Object.entries(coutEnAtomes(gabarit)) as [Code, number][]).reduce(
    (s, [code, n]) => s + n * PRIX[code],
    0,
  );
}

/** Description lisible d'un gabarit, pour l'écran. */
export function presenter(gabarit: Gabarit, milieu: Milieu) {
  const cout = coutEnAtomes(gabarit);
  return {
    visage: gabarit.visage,
    taille: gabarit.taille,
    coutEnergie: coutEnEnergie(gabarit),
    /** En combien de tours une copie se rembourse-t-elle ? `null` si jamais. */
    amortissement:
      (gabarit.rendement ?? 0) > 0 ? Math.ceil(coutEnEnergie(gabarit) / (gabarit.rendement as number)) : null,
    composition: (Object.entries(cout) as [Code, number][])
      .map(([code, n]) => `${n} ${ATOMES[code].code}`)
      .join(" · "),
    rendement: gabarit.rendement,
    cohesion: Number(gabarit.cohesion.toFixed(2)),
    fragilite: Number((100 * chanceDeSeDefaire(gabarit, milieu)).toFixed(1)),
    net: Number(rendementNet(gabarit, milieu).toFixed(2)),
  };
}
