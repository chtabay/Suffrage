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
import type { Alea, Code, EvenementJournal, Manque, NomPanneau, Partie } from "./types";


import { alea, PREMIER_MILIEU } from "./milieu";
import { decrire } from "./molecule";
import { agiter, cellulesDe, prelever, soupeVide } from "./soupe";
import { PRIX, acheterAtome, atelierVide, fixerGabarit, tic } from "./atelier";

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
});

/** Une partie neuve : le premier acte, trois panneaux ouverts, un emplacement libre. */
export function nouvellePartie(graine = 1): Partie {
  return {
    graine,
    acte: 1,
    milieu: PREMIER_MILIEU,
    soupe: soupeVide(),
    collection: [],
    atelier: atelierVide(),
    panneaux: ["milieu", "soupe", "collection"],
    journal: [],
    prochainePiece: 1,
    bilanAtelier: null,
  };
}

/** Un générateur dérivé de la graine et du nombre d'agitations : la partie se rejoue. */
function rngDe(partie: Partie): Alea {
  return alea(partie.graine * 7919 + partie.soupe.agitations * 104729 + partie.atelier.tics * 31);
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
export function ticLatelier(partie: Partie): Partie {
  if (!partie.panneaux.includes("atelier")) return partie;
  const { etat, bilan } = tic(partie.atelier, partie.milieu, rngDe(partie));
  return { ...partie, atelier: etat, bilanAtelier: bilan };
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

/**
 * L'état de l'écran, prêt à afficher : uniquement les panneaux ouverts, dans
 * l'ordre. C'est la seule source de vérité de ce que le joueur voit — l'interface
 * n'a rien à décider.
 */
export function ecran(partie: Partie) {
  return partie.panneaux.map((nom) => ({ nom, titre: PANNEAUX[nom] }));
}
