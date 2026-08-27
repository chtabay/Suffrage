/**
 * La partie — l'orchestration des actes. PUR, sans I/O.
 *
 * C'EST ICI QUE SE JOUE LE PARI STRUCTUREL DU PROJET.
 *
 * Le prototype précédent empilait des machines : chacune avait son écran, son
 * état, son interface, et toutes restaient ouvertes. Quatre machines ont produit
 * quatre mille lignes d'interface sans un seul composant partagé, et l'écran
 * n'aurait fait que croître. La leçon vient d'Universal Paperclips, qui ne fait
 * jamais naviguer et surtout qui RETIRE : quand la matière est convertie,
 * l'argent disparaît, le marché s'en va, tout le premier acte s'évapore. C'est
 * ce qui lui permet de rester lisible malgré des centaines de projets.
 *
 * On applique la règle littéralement : L'ÉCRAN A QUATRE EMPLACEMENTS, ET OUVRIR
 * UN PANNEAU EN FERME UN AUTRE. Ce n'est pas une contrainte d'affichage, c'est
 * une contrainte de conception — une mécanique nouvelle doit désigner celle
 * qu'elle remplace, faute de quoi elle n'entre pas. Si elle ne remplace rien,
 * c'est qu'elle appartient à un autre jeu.
 *
 * Le deuxième acte referme donc la soupe. Le joueur ne pêche plus à la main :
 * son gabarit se réplique sans lui. Il perd un pouvoir en gagnant une échelle —
 * et il le perd pour de bon, comme on ne revient pas acheter du fil quand il
 * n'y a plus de matière.
 */
import type {
  Alea,
  CibleProposee,
  Code,
  Compte,
  ConseilBassin,
  BilanAtelier,
  BilanBassin,
  EvenementJournal,
  EvenementMonde,
  Espece,
  Gabarit,
  Grille,
  Manque,
  NomPanneau,
  Partie,
  Retirable,
} from "./types";


import { alea, PREMIER_MILIEU } from "./milieu";
import { decrire } from "./molecule";
import { agiter, cellulesDe, prelever, soupeVide } from "./soupe";
import { PRIX, acheterAtome, atelierVide, coutEnAtomes, fixerGabarit, tic } from "./atelier";
import { empreinte, tientEnsemble, visageDe } from "./soudure";
import {
  BRIQUES,
  ESPECES_MAX,
  OBJECTIF,
  bassinVide,
  ciblesProposees,
  combienPossible,
  ensemencer,
  espece,
  manquePour,
  nourriture,
  rendrait,
  retirer,
  soutiens,
  tourDeBassin,
  viser,
  voiesVers,
} from "./bassin";

/** Le nombre d'emplacements de l'écran. Le chiffre est arbitraire ; la règle ne l'est pas. */
export const EMPLACEMENTS = 4;

/**
 * Le nombre de pièces que la collection peut porter.
 *
 * Sans plafond, prélever ne coûte rien : on garde tout, on trie plus tard, et le
 * choix du gabarit se réduit à lire la plus grande colonne d'un tableau de
 * trente lignes. Mesuré autrement : le premier acte offre une molécule payante
 * dès la première agitation, mais la meilleure met une quarantaine d'agitations
 * à paraître — six fois plus rentable. Toute la tension du premier acte tient
 * dans cet écart, et elle n'existe que si garder oblige à jeter.
 *
 * La collection est donc une LISTE COURTE, pas un musée.
 */
export const PLACES_COLLECTION = 6;

/** Les panneaux existants, et ce qu'ils montrent. */
export const PANNEAUX: Readonly<Record<NomPanneau, string>> = Object.freeze({
  milieu: "Ce que le monde recherche",
  soupe: "La soupe",
  collection: "Ce que vous avez gardé",
  atelier: "L'atelier",
  bassin: "Le bassin",
});

/**
 * COMBIEN D'INDIVIDUS UN SEMIS DÉPOSE D'UN COUP, quand les atomes le permettent.
 *
 * ⚠️ DIX, ET C'EST CE QUI SÉPARE UN JEU D'UNE DÉCORATION. Semer un individu dans
 * un bassin qui en porte deux cents ne change rien de mesurable : à ce régime, le
 * joueur qui suivait le conseil passait de 7 réussites sur 72 à 9 — l'écart du
 * bruit. Par lots de dix, il passe à 20 sur 72, et le séjour moyen d'une cible
 * triple. Une intervention doit peser autant que ce contre quoi elle pèse.
 */
export const LOT_SEMIS = 10;

/**
 * L'ÉNERGIE AU-DELÀ DE LAQUELLE LE DEUXIÈME ACTE N'A PLUS RIEN À DIRE.
 *
 * C'est le seuil que l'écran annonce déjà comme objectif de l'atelier ; le
 * troisième acte s'ouvre exactement là, et pas ailleurs. Un seuil affiché qui ne
 * déclenche rien, et un passage qui s'ouvrirait à un autre moment, feraient deux
 * objectifs pour un seul acte.
 */
export const HORIZON_ATELIER = 400;

/** Une partie neuve : le premier acte, trois panneaux ouverts, un emplacement libre. */
export function nouvellePartie(graine = 1): Partie {
  return {
    graine,
    acte: 1,
    milieu: PREMIER_MILIEU,
    soupe: soupeVide(),
    collection: [],
    atelier: atelierVide(),
    bassin: bassinVide(),
    cible: null,
    panneaux: ["milieu", "soupe", "collection"],
    journal: [],
    chronique: [],
    cibles: [],
    revisions: 0,
    prochainePiece: 1,
    bilanAtelier: null,
    bilanBassin: null,
  };
}

/** Un générateur dérivé de la graine et du nombre d'agitations : la partie se rejoue. */
function rngDe(partie: Partie): Alea {
  return alea(
    partie.graine * 7919 +
      partie.soupe.agitations * 104729 +
      partie.atelier.tics * 31 +
      partie.bassin.tours * 7,
  );
}

/**
 * Ajoute un ÉVÉNEMENT au journal — ce que le joueur doit pouvoir relire.
 *
 * ⚠️ UN ÉVÉNEMENT, PAS UNE PHRASE, et c'est le portage sur Placet qui l'a
 * imposé. La règle d'origine écrivait « Prélevé CCN — rendement 3 » directement
 * dans l'état : lisible, mais français pour toujours. Dans une application à
 * quatre langues, un état qui contient de la prose est un état intraduisible —
 * et le traduire à l'écriture aurait figé la langue au moment du clic, de sorte
 * qu'un joueur qui change de langue relirait un journal mi-français mi-anglais.
 *
 * L'événement porte les faits ; l'écran les met en mots, à chaque rendu.
 */
function noter(partie: Partie, evenement: EvenementJournal): EvenementJournal[] {
  return [...partie.journal.slice(-19), evenement];
}

/** AGITER : le geste du premier acte. */
export function agiterLaSoupe(partie: Partie, force: number): Partie {
  if (!partie.panneaux.includes("soupe")) return partie;
  const { etat } = agiter(partie.soupe, { force, apport: 4 }, rngDe(partie));
  return { ...partie, soupe: etat };
}

/** Les molécules de la soupe, décrites et jugées par le milieu du moment. */
export function moleculesVisibles(partie: Partie) {
  return partie.soupe.molecules.map((mol) => ({
    id: mol.id,
    grille: mol.grille,
    ...decrire(mol.grille, cellulesDe(mol.grille), partie.milieu),
  }));
}

/** La collection est-elle pleine ? Si oui, garder exige d'abord de jeter. */
export function collectionPleine(partie: Partie): boolean {
  return partie.collection.length >= PLACES_COLLECTION;
}

/** PRÉLEVER : le seul geste délibéré du premier acte. */
export function preleverMolecule(partie: Partie, id: number): Partie {
  const mol = partie.soupe.molecules.find((m) => m.id === id);
  if (!mol) return partie;
  if (collectionPleine(partie)) return partie;

  const piece = {
    piece: partie.prochainePiece,
    grille: mol.grille,
    ...decrire(mol.grille, cellulesDe(mol.grille), partie.milieu),
  };

  return {
    ...partie,
    soupe: prelever(partie.soupe, id),
    collection: [...partie.collection, piece],
    prochainePiece: partie.prochainePiece + 1,
    journal: noter(partie, { quoi: "preleve", visage: piece.visage, rendement: piece.rendement ?? 0 }),
  };
}

/**
 * REJETER : rendre une pièce, pour faire de la place.
 *
 * LA MATIÈRE RETOURNE À LA SOUPE, L'AGENCEMENT EST PERDU. Ce partage n'est pas
 * un détail d'équilibrage, c'est le sujet du premier acte.
 *
 * Une première version gardait tout : les atomes d'une pièce rejetée
 * disparaissaient du monde. Joué au navigateur, le défaut a sauté aux yeux —
 * la soupe compte trente-deux atomes en tout, et quatre pièces gardées en
 * immobilisaient dix-sept. Un joueur qui pêchait, comparait et jetait vidait
 * définitivement son monde sans avoir rien fait de déraisonnable, et plus
 * aucune molécule ne pouvait naître. Une impasse qu'aucun test ne voyait,
 * puisque aucun test ne jouait ce geste-là.
 *
 * Rendre la matière supprime l'impasse sans rien coûter à la tension : ce qui
 * est cher n'a jamais été les atomes — on en rachète — mais la FORME, qui a
 * demandé quarante agitations pour paraître et ne reviendra pas.
 *
 * Rejeter la pièce qui sert de gabarit ne casse pas l'atelier : celui-ci en a
 * pris une empreinte au moment où il a été fondé, et une empreinte ne dépend
 * plus de son modèle.
 */
export function rejeterPiece(partie: Partie, piece: number): Partie {
  const partante = partie.collection.find((p) => p.piece === piece);
  if (!partante) return partie;

  const libres = { ...partie.soupe.libres };
  for (const [code, n] of Object.entries(partante.composition) as [Code, number][]) {
    libres[code] = (libres[code] ?? 0) + n;
  }

  return {
    ...partie,
    soupe: { ...partie.soupe, libres },
    collection: partie.collection.filter((p) => p.piece !== piece),
    journal: noter(partie, { quoi: "rejete", visage: partante.visage }),
  };
}

/**
 * Peut-on passer au deuxième acte ?
 *
 * Il ne suffit pas d'avoir gardé quelque chose : il faut avoir gardé quelque
 * chose QUE LE MILIEU PAIE. Sans ce garde-fou, un joueur pourrait fonder son
 * atelier sur une molécule stérile et regarder une machine tourner à vide, sans
 * comprendre que la faute remonte à un choix fait deux minutes plus tôt.
 */
export function peutOuvrirLatelier(partie: Partie): boolean {
  return partie.acte === 1 && partie.collection.some((p) => (p.rendement ?? 0) > 0);
}

/** Ce que le joueur perdra en ouvrant l'atelier — à lui montrer AVANT qu'il choisisse. */
export function cequeLatelierFerme() {
  return {
    ferme: "soupe",
    consequence:
      "La soupe se referme. Vous ne prélèverez plus à la main : votre gabarit se réplique sans vous.",
    definitif: true,
  };
}

/**
 * OUVRIR L'ATELIER — le passage au deuxième acte, et la fermeture du premier.
 *
 * Le geste est irréversible, et c'est tout son sens. On ne referme pas la soupe
 * par manque de place : on la referme parce que le joueur a cessé d'être celui
 * qui pêche. Rendre le retour possible ôterait sa portée au choix du gabarit —
 * il suffirait d'en essayer un autre.
 */
export function ouvrirLatelier(partie: Partie, piece: number): Partie {
  if (!peutOuvrirLatelier(partie)) return partie;
  const choisie = partie.collection.find((p) => p.piece === piece);
  if (!choisie || (choisie.rendement ?? 0) <= 0) return partie;

  const panneaux: NomPanneau[] = [...partie.panneaux.filter((p) => p !== "soupe"), "atelier"];
  if (panneaux.length > EMPLACEMENTS) {
    throw new Error("Le budget d'emplacements est dépassé : un panneau aurait dû être fermé.");
  }

  return {
    ...partie,
    // Le monde change : la chronique du précédent n'a plus cours.
    chronique: [],
    acte: 2,
    atelier: fixerGabarit(partie.atelier, choisie.grille, partie.milieu),
    panneaux,
    journal: noter(partie, {
      quoi: "fonde",
      visage: choisie.visage,
      rendement: choisie.rendement ?? 0,
    }),
  };
}

/**
 * CHANGER DE GABARIT, sans rouvrir la soupe.
 *
 * La fermeture du premier acte porte sur LE GESTE DE PÊCHER, pas sur la molécule
 * choisie. Verrouiller aussi le gabarit rendrait un premier clic fatal : un
 * joueur qui désigne une molécule au rendement brut flatteur mais trop fragile
 * verrait tout mourir sans recours, et sans jamais comprendre pourquoi.
 *
 * Le changement a son prix — les copies en cours ne se convertissent pas, elles
 * sont perdues. Assez pour qu'on y réfléchisse, pas assez pour qu'on abandonne.
 */
export function changerGabarit(partie: Partie, piece: number): Partie {
  if (partie.acte !== 2) return partie;
  const choisie = partie.collection.find((x) => x.piece === piece);
  if (!choisie || (choisie.rendement ?? 0) <= 0) return partie;
  if (partie.atelier.gabarit && choisie.visage === partie.atelier.gabarit.visage) return partie;

  const perdues = partie.atelier.copies;
  return {
    ...partie,
    atelier: fixerGabarit(partie.atelier, choisie.grille, partie.milieu),
    journal: noter(partie, { quoi: "gabarit", visage: choisie.visage, perdues }),
  };
}

/**
 * UN TOUR D'ATELIER : le geste du deuxième acte.
 *
 * On retient le bilan du dernier tour. Une machine qui tourne seule doit dire ce
 * qu'elle vient de faire, sinon le joueur ne voit que des compteurs qui bougent
 * et n'apprend jamais à quoi attribuer leur mouvement — en particulier il ne
 * distingue pas « je manque d'atomes » de « mes copies se défont ».
 */
/**
 * L'ÉVÉNEMENT DU TOUR D'ATELIER — le pendant de `evenementDuTour` pour l'acte 2.
 *
 * L'ordre suit ce que le joueur cherche : ce qu'il vient d'obtenir d'abord, ce
 * qu'il vient de perdre ensuite, l'attente en dernier.
 */
export function evenementDatelier(bilan: BilanAtelier | null, gabarit: Gabarit | null): EvenementMonde | null {
  if (!bilan) return null;
  const rendement = gabarit?.rendement ?? 0;
  if (bilan.baties > 0) return { quoi: "batie", combien: bilan.baties, gagne: bilan.baties * rendement, tour: 0 };
  if (bilan.reamorce) return { quoi: "reamorce", tour: 0 };
  if (bilan.perdues > 0) return { quoi: "perdue", combien: bilan.perdues, perd: bilan.perdues * rendement, tour: 0 };
  if (bilan.produit > 0) return { quoi: "produit", combien: bilan.produit, tour: 0 };
  return { quoi: "attente", tour: 0 };
}

export function ticLatelier(partie: Partie): Partie {
  if (!partie.panneaux.includes("atelier")) return partie;
  const { etat, bilan } = tic(partie.atelier, partie.milieu, rngDe(partie));
  const brut = evenementDatelier(bilan, etat.gabarit);
  const evenement = brut ? ({ ...brut, tour: etat.tics } as EvenementMonde) : null;
  return {
    ...partie,
    atelier: etat,
    bilanAtelier: bilan,
    // La même chronique qu'au bassin, et pour la même raison : le monde fait des
    // choses et l'écran n'en disait qu'une ligne, effacée au tour suivant.
    chronique: evenement
      ? replier(partie.chronique ?? [], evenement) ??
        [...(partie.chronique ?? []).slice(-(CHRONIQUE - 1)), evenement]
      : partie.chronique,
  };
}

/** Acheter un atome sur la réserve. */
export function acheter(partie: Partie, code: Code): Partie {
  return { ...partie, atelier: acheterAtome(partie.atelier, code) };
}

/**
 * CE QUI MANQUE pour bâtir une copie de plus, et si la réserve permet de l'acheter.
 *
 * L'atelier s'arrête quand un atome vient à manquer — c'est voulu, c'est la
 * dépense du deuxième acte, et c'est ce qui donne au joueur quelque chose à
 * faire entre deux tours. Mais une machine qui s'arrête sans dire pourquoi est
 * une machine cassée du point de vue de celui qui la regarde. On expose donc le
 * manque, pour que l'écran puisse le nommer plutôt que de laisser deviner.
 */
export function cequiManque(partie: Partie): Manque[] {
  const { gabarit, atomes, reserve } = partie.atelier;
  if (!gabarit) return [];
  return (Object.entries(gabarit.composition) as [Code, number][])
    .map(([code, requis]) => ({
      code,
      requis,
      disponible: atomes[code] ?? 0,
      manque: Math.max(0, requis - (atomes[code] ?? 0)),
      prix: PRIX[code],
      abordable: reserve >= PRIX[code],
    }))
    .filter((x) => x.manque > 0);
}

/* ═══════════════════════ LE TROISIÈME ACTE : LE BASSIN ═══════════════════════
 *
 * CE QU'IL RETIRE : LA COPIE OFFERTE. L'atelier accordait la réplication d'office
 * — il suffisait d'avoir les atomes. Or se recopier soi-même est le problème
 * difficile de l'origine de la vie, et un jeu qui le donne en cadeau a déjà
 * raconté sa fin. Dans le bassin, personne ne se copie : une molécule est SOUDÉE
 * à partir de deux autres, et la soudure va d'autant plus vite qu'une troisième
 * tient les deux morceaux côte à côte.
 *
 * IL FAUT DONC UN COLLECTIF, et c'est tout le sujet. Le bassin laissé à lui-même
 * en installe un : sur cent quatre molécules possibles, une douzaine s'y
 * maintiennent, et lesquelles dépend du flux du milieu. Le joueur, lui, en
 * désigne une AUTRE — une que le courant emporterait — et doit lui construire le
 * soutien qui la fera rester.
 */

/**
 * Peut-on ouvrir le bassin ?
 *
 * Il faut que l'atelier ait tourné pour de bon. Ouvrir le troisième acte sur un
 * atelier qui n'a rien produit, ce serait retirer au joueur une mécanique qu'il
 * n'a pas encore vue fonctionner — et le passage n'aurait plus rien à lui
 * apprendre, puisqu'il est tout entier dans ce qu'il enlève.
 */
export function peutOuvrirLeBassin(partie: Partie): boolean {
  return partie.acte === 2 && partie.atelier.produitTotal >= HORIZON_ATELIER;
}

/** Ce que le joueur perdra en ouvrant le bassin — à lui montrer AVANT qu'il choisisse. */
export function cequeLeBassinFerme(): { ferme: NomPanneau; consequence: string; definitif: boolean } {
  return {
    ferme: "atelier",
    consequence:
      "L'atelier se referme et verse son stock dans le bassin. Plus rien ne se recopiera tout seul : " +
      "une molécule ne s'obtient qu'en soudant deux autres, et il faut qu'une troisième les tienne.",
    definitif: true,
  };
}

/**
 * LES TROIS CIBLES PROPOSÉES, avec de quoi choisir en connaissance de cause.
 *
 * On donne ce qui est calculable sans simuler : par combien de couples de briques
 * la molécule peut se faire, et combien de pièces de la collection sauraient
 * tenir ces couples. Une cible à une seule voie et sans outil est un pari ; une
 * cible à trois voies dont deux sont outillées est un travail.
 */
export function ciblesDuBassin(partie: Partie): CibleProposee[] {
  const rng = alea(partie.graine * 15485863 + 7);
  const flux = partie.milieu.flux ?? {};
  const juger = (grille: Grille): CibleProposee => {
    const voies = voiesVers(grille);
    // Une pièce sert d'outil si son contour sait tenir les deux briques d'une voie.
    const outils = partie.collection.filter((piece) => {
      const v = visageDe(piece.grille);
      return voies.some((voie) => tientEnsemble(v, visageDe(voie.a), visageDe(voie.b)));
    });

    /**
     * ⚠️ CE QUI FAIT VRAIMENT LA DIFFICULTÉ : L'ATOME RARE QU'ELLE RÉCLAME.
     * On affichait « N voies pour la faire ». Mesuré sur l'univers entier : les
     * CENT QUATRE tétramères ont exactement UNE voie, sans exception. Un chiffre
     * constant occupe une ligne et n'apprend rien.
     *
     * Ce qui varie, c'est le rapport entre ce que la molécule réclame et ce que
     * le milieu verse. Un bassin qui reçoit vingt-quatre carbones pour quatre
     * soufres rend une molécule à deux soufres coûteuse à faire ET à semer — et
     * c'est aussi la leçon qu'on veut faire passer sur le flux.
     */
    const composition = espece(grille, partie.milieu).composition;
    let plusRare: CibleProposee["plusRare"] = null;
    let tension = 0;
    for (const [code, n] of Object.entries(composition) as [Code, number][]) {
      const verse = flux[code] ?? 0;
      const t = verse === 0 ? Infinity : n / verse;
      if (t > tension) {
        tension = t;
        plusRare = { code, requis: n, verse };
      }
    }
    return {
      grille,
      visage: visageDe(grille),
      empreinte: empreinte(grille),
      voies: voies.length,
      outils: outils.length,
      composition,
      plusRare,
      tension,
    };
  };

  /**
   * ⚠️ TROIS DIFFICULTÉS, PAS TROIS TIRAGES. Trois cibles tirées au hasard sont
   * souvent trois fois la même épreuve, et un choix entre trois équivalents n'est
   * pas un choix. On en juge une douzaine et on garde les extrêmes et le milieu :
   * la mieux outillée, la plus nue, et une entre les deux. L'écran dit de chacune
   * par combien de voies elle se fait et combien de vos molécules l'aident — de
   * quoi décider entre un travail et un pari.
   */
  const juges = ciblesProposees(rng, 12, partie.milieu).map(juger);
  juges.sort((a, b) => b.outils - a.outils || a.tension - b.tension);
  if (juges.length <= 3) return juges;
  return [juges[0], juges[Math.floor(juges.length / 2)], juges[juges.length - 1]];
}

/**
 * OUVRIR LE BASSIN — le passage au troisième acte, et la fermeture du deuxième.
 *
 * ⚠️ L'ATELIER SE VIDE DANS LE BASSIN, il ne s'évapore pas. Ses atomes en réserve
 * et ceux de ses copies deviennent la matière de départ. C'est la même exigence
 * qu'au premier acte quand on rejette une pièce : la forme se perd, la matière
 * reste. Un joueur qui voit disparaître son stock ne comprend pas ce qu'il gagne.
 */
export function ouvrirLeBassin(partie: Partie, cibleGrille: Grille): Partie {
  if (!peutOuvrirLeBassin(partie)) return partie;
  const proposees = ciblesDuBassin(partie);
  const choisie = proposees.find((c) => c.empreinte === empreinte(cibleGrille));
  if (!choisie) return partie;

  const libres: Compte = { ...partie.atelier.atomes };
  if (partie.atelier.gabarit) {
    for (const [code, n] of Object.entries(coutEnAtomes(partie.atelier.gabarit)) as [Code, number][]) {
      libres[code] = (libres[code] ?? 0) + n * partie.atelier.copies;
    }
  }

  const panneaux: NomPanneau[] = [...partie.panneaux.filter((p) => p !== "atelier"), "bassin"];
  if (panneaux.length > EMPLACEMENTS) {
    throw new Error("Le budget d'emplacements est dépassé : un panneau aurait dû être fermé.");
  }

  // Les six briques amorcent le bassin : c'est ce que la chimie aveugle sait faire.
  let bassin = viser(bassinVide(libres), choisie.grille);
  for (const brique of BRIQUES) bassin = ensemencer(bassin, brique, partie.milieu);

  /**
   * ⚠️ LES TROIS CIBLES DU PASSAGE SONT RETENUES, ET DEUX CHANGEMENTS D'AVIS
   * OUVERTS. Mesuré : l'acte se décidait au douzième tour et durait quatre
   * cents, et 43 % des tours passés à attendre n'offraient aucun bouton. Pouvoir
   * revenir sur son choix fait passer 12 parties gagnées sur 60 à 28, et les
   * tours sans bouton de 29 % à 18 %.
   *
   * ⚠️ MAIS DEUX, PAS UNE INFINITÉ : sans borne, la conduite optimale devient
   * « re-viser jusqu'à tomber sur une cible facile » — 47 sur 60, et le jeu
   * n'est plus qu'un tirage qu'on relance.
   */
  const REVISIONS = 2;

  return {
    ...partie,
    // Le monde change : la chronique du précédent n'a plus cours.
    chronique: [],
    acte: 3,
    atelier: { ...partie.atelier, copies: 0, atomes: { C: 0, N: 0, S: 0 } },
    bassin,
    cible: { grille: choisie.grille, visage: choisie.visage, empreinte: choisie.empreinte },
    cibles: proposees.map((c) => ({ grille: c.grille, visage: c.visage, empreinte: c.empreinte, outils: c.outils })),
    revisions: REVISIONS,
    panneaux,
    journal: noter(partie, { quoi: "bassin", visage: choisie.visage, objectif: OBJECTIF }),
  };
}

/**
 * SEMER un lot dans le bassin. C'est le geste du troisième acte.
 *
 * ⚠️ IL SE PAIE EN ATOMES DU BASSIN, et le lot s'arrête là où la matière s'arrête.
 * Semer sans compter vide le sac qui nourrit tout le monde.
 *
 * ⚠️ ET LA CIBLE, ELLE, NE SE SÈME PAS. C'est la règle qui décide de tout l'acte,
 * et il a fallu deux mesures pour la trouver. La première a montré qu'on gagnait
 * en ressemant la cible sans arrêt ; on a donc remis son séjour à zéro à chaque
 * semis. La seconde a montré que cela ne suffisait pas — il restait à la semer UNE
 * SEULE FOIS au départ :
 *
 *      on sème la cible ×10                    89 % de réussite
 *      on sème la cible ×10 ET un gabarit      89 %  ← le gabarit ne sert à rien
 *      on ne sème rien                          9 %
 *      on ne sème QU'UN GABARIT                32 %  ← une décision, enfin
 *
 * Tant qu'on pouvait poser la cible soi-même, la collection entière ne servait à
 * rien, et le joueur le sentait sans pouvoir le nommer. On ne met donc plus la
 * molécule dans le bassin : ON REND LE BASSIN CAPABLE DE LA FAIRE. Le seul levier
 * qui reste est le gabarit — c'est-à-dire ce qu'on a pêché au premier acte.
 */
export function semerDansLeBassin(partie: Partie, grille: Grille, combien: number = LOT_SEMIS): Partie {
  if (partie.acte !== 3) return partie;
  if (partie.cible && empreinte(grille) === partie.cible.empreinte) {
    return { ...partie, journal: noter(partie, { quoi: "cibleNonSemable" }) };
  }
  let bassin = partie.bassin;
  let poses = 0;
  for (let i = 0; i < combien; i++) {
    const apres = ensemencer(bassin, grille, partie.milieu);
    if (apres === bassin) break;
    bassin = apres;
    poses += 1;
  }
  if (poses === 0) {
    return { ...partie, journal: noter(partie, { quoi: "sansAtomes" }) };
  }
  return {
    ...partie,
    bassin,
    journal: noter(partie, { quoi: "seme", visage: visageDe(grille), combien: poses, remisAZero: false }),
  };
}

/** Combien d'exemplaires d'une pièce le bassin peut payer, pour l'annoncer au bouton. */
export function lotPayable(partie: Partie, grille: Grille, combien: number = LOT_SEMIS): number {
  if (partie.acte !== 3) return 0;
  return combienPossible(partie.bassin, grille, partie.milieu, combien);
}

/** RETIRER une espèce du bassin pour libérer une place. Ses atomes y retournent. */
export function retirerDuBassin(partie: Partie, empreinteCible: string): Partie {
  if (partie.acte !== 3) return partie;
  const partante = partie.bassin.especes.find((e) => e.empreinte === empreinteCible);
  if (!partante || nourriture(partante)) return partie;
  return {
    ...partie,
    bassin: retirer(partie.bassin, empreinteCible),
    journal: noter(partie, { quoi: "retire", visage: partante.visage }),
  };
}

/** UN TOUR DE BASSIN : le temps qui passe au troisième acte. */
/**
 * L'ÉVÉNEMENT DU TOUR — ce que le monde vient de faire.
 *
 * ⚠️ UN SEUL PAR TOUR, LE PLUS LOURD. Le bassin fait quatre-vingts choses par
 * tour ; les énumérer serait un vidage de compteurs. L'ordre est celui de ce qui
 * décide de la partie : la cible d'abord, la concurrence ensuite, le train-train
 * en dernier.
 */
export function evenementDuTour(bilan: BilanBassin | null, avant: number): EvenementMonde | null {
  if (!bilan) return null;
  if (bilan.sortieCible) return { quoi: "cibleSort", cause: bilan.sortieCible, apres: avant, tour: 0 };
  if (bilan.entreeCible) return { quoi: "cibleEntre", tour: 0 };
  if (bilan.refusCible > 0) return { quoi: "cibleRefoulee", combien: bilan.refusCible, tour: 0 };
  if (bilan.remplacement && bilan.remplacement.grilleVenue) {
    return {
      quoi: "remplacement",
      grilleVenue: bilan.remplacement.grilleVenue,
      grillePartie: bilan.remplacement.grillePartie,
      effectif: bilan.remplacement.effectif,
      tour: 0,
    };
  }
  if (bilan.refusees > 0) return { quoi: "refoulees", combien: bilan.refusees, soudures: bilan.soudures, tour: 0 };
  if (bilan.nes > 0) return { quoi: "briques", combien: bilan.nes, tour: 0 };
  return { quoi: "calme", tour: 0 };
}

/** Combien d'événements du monde on garde sous les yeux. */
export const CHRONIQUE = 6;

/**
 * REPLIE UN ÉVÉNEMENT DANS LE PRÉCÉDENT S'IL EST DE MÊME NATURE.
 *
 * ⚠️ CE QUI SE RÉPÈTE SE REPLIE — SANS EXCEPTION, et l'absence d'exception est
 * la règle. Une première version exemptait les natures qu'on avait décrétées
 * « notables », et l'écran a aussitôt affiché quatre lignes identiques : la
 * catégorie décrétée à la main était le problème. Ce qui est notable ressort
 * parce que ça CHANGE. Une molécule refusée cinq tours d'affilée est une seule
 * nouvelle, pas cinq.
 */
function replier(chronique: EvenementMonde[], arrivant: EvenementMonde): EvenementMonde[] | null {
  const dernier = chronique[chronique.length - 1];
  if (!dernier || dernier.quoi !== arrivant.quoi) return null;
  const cumul: Record<string, unknown> = { ...dernier, fois: (dernier.fois ?? 1) + 1, jusqua: arrivant.tour };
  for (const [cle, valeur] of Object.entries(arrivant)) {
    if (cle === "quoi" || cle === "tour") continue;
    cumul[cle] = typeof valeur === "number" ? ((dernier as Record<string, unknown>)[cle] as number ?? 0) + valeur : valeur;
  }
  return [...chronique.slice(0, -1), cumul as unknown as EvenementMonde];
}

/**
 * CHANGER D'AVIS SUR LA CIBLE — le troisième geste du bassin.
 *
 * ⚠️ IL COÛTE LE RECORD, ET C'EST LE PRIX JUSTE. `viser` remet le séjour et le
 * meilleur séjour à zéro. Qui tient déjà quarante tours y réfléchira ; qui n'est
 * jamais entré ne perd rien — la situation même où l'on veut qu'il puisse bouger.
 *
 * ⚠️ LE BASSIN, LUI, NE REPART PAS. On ne change que ce qu'on vise ; espèces,
 * gabarits et matière demeurent. Le monde ne se soucie pas de ce qu'on espère
 * de lui, et la chronique continue puisque c'est son histoire, pas la nôtre.
 */
export function reviserLaCible(partie: Partie, empreinteVoulue: string): Partie {
  if (partie.acte !== 3 || !partie.cible) return partie;
  if ((partie.revisions ?? 0) <= 0) return partie;
  if (empreinteVoulue === partie.cible.empreinte) return partie;
  const voulue = (partie.cibles ?? []).find((c) => c.empreinte === empreinteVoulue);
  if (!voulue) return partie;

  return {
    ...partie,
    bassin: viser(partie.bassin, voulue.grille),
    cible: { grille: voulue.grille, visage: voulue.visage, empreinte: voulue.empreinte },
    revisions: partie.revisions - 1,
    journal: noter(partie, { quoi: "revise", visage: voulue.visage, perdu: partie.bassin.record ?? 0 }),
  };
}

export function ticDuBassin(partie: Partie): Partie {
  if (!partie.panneaux.includes("bassin")) return partie;
  const tenueAvant = partie.bassin.tenue ?? 0;
  const { etat, bilan } = tourDeBassin(partie.bassin, partie.milieu, rngDe(partie));
  const brut = evenementDuTour(bilan, tenueAvant);
  const evenement = brut ? ({ ...brut, tour: etat.tours } as EvenementMonde) : null;
  return {
    ...partie,
    bassin: etat,
    bilanBassin: bilan,
    /**
     * LA CHRONIQUE DU MONDE, distincte du journal. Le journal enregistre ce que
     * le JOUEUR décide ; rien ne disait ce que le bassin fait, alors qu'il fait
     * quatre-vingts choses par tour et que 43 % des tours passés à attendre que
     * la cible entre n'offrent aucun bouton.
     */
    chronique: evenement
      ? replier(partie.chronique ?? [], evenement) ??
        [...(partie.chronique ?? []).slice(-(CHRONIQUE - 1)), evenement]
      : partie.chronique,
  };
}

/**
 * CE QUE L'ÉCRAN DU TROISIÈME ACTE A LE DROIT DE DIRE.
 *
 * ⚠️ LE MAILLON MANQUANT, PAS LES COMPTEURS. Le reproche revenu à chaque essai
 * est qu'on ne sait pas ce qui est attendu ; une population qui monte et descend
 * n'y répond pas. Ici la réponse tient en une ligne par voie : il faut telle
 * brique et telle autre, telle molécule présente les tient — ou bien il en manque
 * une, et on dit laquelle semer et ce qu'elle rapporterait.
 */
export function conseilDuBassin(partie: Partie): ConseilBassin | null {
  if (partie.acte !== 3 || !partie.cible) return null;
  const catalogue = partie.collection.map((p) => p.grille);
  const cible = partie.cible;
  const s = soutiens(partie.bassin, cible.grille, catalogue);
  const restant = Math.max(0, OBJECTIF - (partie.bassin.tenue ?? 0));

  /**
   * ⚠️ CE QUI MANQUE, C'EST POUR SEMER L'OUTIL, PLUS POUR SEMER LA CIBLE. Tant
   * que la cible pouvait être posée à la main, l'atome qui manquait était le sien.
   * Maintenant qu'elle doit être FABRIQUÉE, le seul semis qui reste est celui du
   * gabarit — et c'est donc son coût qu'il faut annoncer.
   */
  const renfort = s.aider[0] ?? null;
  const composition = renfort ? espece(renfort.grille, partie.milieu).composition : {};
  const manque = manquePour(partie.bassin, composition);
  const rares = new Set<Code>(manque.map((m) => m.code));
  const plein = partie.bassin.especes.filter((e) => !nourriture(e)).length >= ESPECES_MAX;

  const detailler = (e: Espece): Retirable => {
    const rendu = rendrait(e);
    // `utile` ne compte QUE les atomes qui manquent : une espèce qui rend six
    // azotes quand c'est du soufre qu'on cherche ne vaut rien, et l'écran ne
    // doit pas la recommander comme si elle valait quelque chose.
    return {
      ...e,
      rendu,
      utile: [...rares].reduce((n, code) => n + (rendu[code] ?? 0), 0),
      /** Ce qu'elle pèse, donc ce qu'elle bloque. */
      masse: e.effectif * e.taille,
    };
  };
  const sansElles = partie.bassin.especes.filter(
    (e) => !nourriture(e) && e.empreinte !== cible.empreinte,
  );
  const inutiles = sansElles
    .filter((e) => !s.voies.some((v) => v.tenants.some((t) => t.empreinte === e.empreinte)))
    .map(detailler)
    .sort((a, b) => b.utile - a.utile || b.masse - a.masse);

  return {
    ...s,
    objectif: OBJECTIF,
    restant,
    /** Le gabarit le plus utile que la collection offre, ou `null`. */
    renfort,
    /** Combien d'exemplaires de ce gabarit le bassin peut réellement payer. */
    payables: renfort ? combienPossible(partie.bassin, renfort.grille, partie.milieu, LOT_SEMIS) : 0,
    /** Les atomes qui empêchent de le semer. */
    manque,
    gagne: (partie.bassin.record ?? 0) >= OBJECTIF,
    /**
     * LE BASSIN EST-IL PLEIN ? Mesuré : il l'est 99 % du temps, et alors plus
     * aucune soudure neuve n'entre. C'est l'état qui décide du troisième acte et
     * aucun écran ne le nommait — il ne montrait qu'un inventaire.
     */
    plein,
    /**
     * ⚠️ ON NE LES PROPOSE QUE QUAND LA MOLÉCULE EST ABSENTE. Offrir de changer
     * d'avis pendant qu'elle tient serait inviter à jeter ce qu'on vient de
     * gagner : ce geste est un recours, pas une option permanente.
     */
    revisions: partie.revisions ?? 0,
    autresCibles:
      (partie.revisions ?? 0) > 0 && s.present === 0
        ? (partie.cibles ?? []).filter((c) => c.empreinte !== partie.cible!.empreinte)
        : [],
    coutDuChangement: partie.bassin.record ?? 0,
    /**
     * LES ESPÈCES QU'ON PEUT RETIRER SANS SE PRIVER : ni la cible, ni un gabarit
     * qui sert. Chacune porte ce qu'elle RENDRAIT, et surtout LA PLACE qu'elle
     * libère.
     *
     * ⚠️ CE N'EST PAS LAQUELLE ON RETIRE QUI COMPTE, C'EST QU'ON RETIRE. Le
     * bassin tient huit espèces ; quand elles y sont, une soudure neuve — un
     * individu de taille 4, donc de masse 4 — n'entre plus, puisqu'il faut peser
     * autant que la plus faible population installée. Retirer n'importe laquelle
     * fait retomber le compte sous huit, et la suivante entre sans condition.
     * Mesuré sur soixante parties de quatre cents tours : sans retirer, 13 sont
     * gagnées ; en retirant chaque tour la plus GROSSE de cette liste, 48 ; la
     * plus FAIBLE, 51. L'écart entre les deux est du bruit, l'écart avec zéro ne
     * l'est pas. Le tri sert donc l'arbitrage SECONDAIRE — quel atome me revient
     * — et l'écran doit dire le motif PREMIER, qui est la place.
     */
    inutiles,
    /**
     * LE MUR : plus rien de libre à retirer, et la porte toujours fermée.
     *
     * ⚠️ « IL FAUT ATTENDRE QU'UNE ESPÈCE S'ÉTEIGNE D'ELLE-MÊME » ÉTAIT FAUX, et
     * c'était le dernier cul-de-sac du jeu — deux testeurs s'y sont arrêtés,
     * l'écran ne leur proposant plus aucun geste. C'est le joueur qui l'atteint
     * EN JOUANT BIEN : il sème ses gabarits et retire ce qui ne sert pas, si
     * bien que les huit places finissent tenues par des espèces qui servent
     * TOUTES. Sur la graine 1, en suivant le conseil, 212 des 233 tours à porte
     * fermée sont ce mur-là.
     *
     * Mesuré sur soixante parties : en attendant, 34 sont gagnées et 5 129 tours
     * se passent sans un geste possible ; en retirant quand même le gabarit le
     * plus léger, 44 sont gagnées et il ne reste AUCUN tour muet. Le
     * sacrifice coûte une voie et le bassin en fournit déjà plus qu'il n'en faut
     * — la demi-saturation est à douze gabarits, le bassin en tient soixante à
     * cent vingt.
     *
     * On le désigne donc, avec son prix, plutôt que d'inviter à attendre.
     */
    sacrifice:
      plein && s.present === 0 && inutiles.length === 0
        ? (sansElles.map(detailler).sort((a, b) => a.masse - b.masse)[0] ?? null)
        : null,
  };
}



/** Le troisième acte est-il gagné ? */
export function bassinGagne(partie: Partie): boolean {
  return partie.acte === 3 && (partie.bassin.record ?? 0) >= OBJECTIF;
}

/**
 * L'état de l'écran, prêt à afficher : uniquement les panneaux ouverts, dans
 * l'ordre. C'est la seule source de vérité de ce que le joueur voit — l'interface
 * n'a rien à décider.
 */
export function ecran(partie: Partie) {
  return partie.panneaux.map((nom) => ({ nom, titre: PANNEAUX[nom] }));
}
