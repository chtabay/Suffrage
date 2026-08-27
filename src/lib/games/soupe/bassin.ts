/**
 * Le bassin — TROISIÈME ACTE. PUR, sans I/O, générateur injecté.
 *
 * CE QU'IL RETIRE, ET POURQUOI C'EST LUI QUI DÉCIDE DU RESTE
 *
 * La règle du projet est qu'une mécanique nouvelle doit désigner celle qu'elle
 * remplace. Le bassin en retire trois :
 *
 *   · L'ACHAT D'ATOMES. Le milieu ne paie plus un tarif, il VERSE. Un flux
 *     limité tombe à chaque tour et c'est tout ce qu'il y aura. La boutique n'a
 *     plus d'objet, l'énergie non plus.
 *   · LE MODÈLE UNIQUE. L'atelier ne répliquait qu'une molécule ; le bassin en
 *     porte plusieurs, qui se disputent le même flux.
 *   · ET SURTOUT LA COPIE OFFERTE. Une molécule ne se recopie plus. Elle est
 *     SOUDÉE à partir de deux autres, et la soudure va d'autant plus vite qu'une
 *     troisième tient les morceaux en place.
 *
 * Ce dernier retrait est le sujet du troisième acte. Se recopier soi-même est le
 * problème difficile de l'origine de la vie ; l'atelier l'escamotait en
 * l'accordant d'office. Ici, personne ne se fabrique seul — mesuré sur des
 * milliers de réactions, zéro auto-réplicateur solitaire. Il faut un COLLECTIF.
 *
 * QUATRE MOUVEMENTS :
 *   1. VERSEMENT   — le milieu verse son flux.
 *   2. ATTRITION   — les individus mal tenus se défont, ET RENDENT LEURS ATOMES.
 *   3. NUCLÉATION  — deux atomes libres se collent au hasard. C'est la chimie
 *                    sans reconnaissance, lente et aveugle : la NOURRITURE.
 *   4. SOUDURE     — deux molécules se lient là où leurs bords se reconnaissent,
 *                    d'autant plus vite qu'un gabarit les tient.
 *   puis la FUITE : ce que personne n'a capté se dissipe.
 *
 * ⚠️ CE FICHIER EST UN PORTAGE, PAS UN ORIGINAL — voir `types.ts`. La règle vient
 * de `chtabay/Ludonatif-3` (`soupe/src/bassin.js`), où vingt-cinq tests
 * l'éprouvent et `npm run mesure-bassin` la mesure. Les commentaires sont
 * conservés mot pour mot ; seuls les types sont ajoutés.
 *
 * ⚠️ POURQUOI LA NUCLÉATION EXISTE, ET CE QU'ELLE CORRIGE. Sans elle, l'ensemble
 * autocatalytique sortait VIDE à la mesure, et ce n'était pas un bug : aucune
 * molécule ne peut catalyser la formation d'un dimère, dont le contour (longueur
 * deux) est trop court pour offrir une prise. Rien ne pouvait jamais démarrer.
 * C'est LE PROBLÈME DE L'AMORÇAGE, il est réel, et sa résolution l'est aussi —
 * un catalyseur n'autorise pas une réaction, il l'accélère. Les liaisons
 * spontanées existent, lentement. Le premier acte du jeu EST déjà ce régime.
 */

import type {
  Alea,
  BilanBassin,
  Code,
  Compte,
  Espece,
  EtatBassin,
  Fabrication,
  Grille,
  ManqueAtome,
  Milieu,
  Renfort,
  Soutiens,
} from "./types";

import { CODES } from "./grille";
import { decrire } from "./molecule";
import { cellulesDe, chanceDeLacher, recentrer } from "./soupe";
import { empreinte, souder, tientEnsemble, visageDe } from "./soudure";

/** Un produit de soudure, décrit une fois pour toutes. */
interface Produit {
  grille: Grille;
  empreinte: string;
  visage: string;
}

/** Un couple de briques qui mène à une cible. */
interface VoieBrute {
  a: Grille;
  b: Grille;
}

/**
 * Combien d'espèces le bassin porte de front.
 *
 * ⚠️ CE N'EST PAS UN PLAFOND ARBITRAIRE MAIS UNE PLACE DISPUTÉE. Une première
 * version refusait simplement les nouvelles venues quand le bassin était plein :
 * le premier arrivé restait pour toujours, ce qui est le contraire d'une
 * écologie et se lisait comme une limite technique. Ici, la place se prend — la
 * plus faible cède, et ses atomes retournent au bassin.
 *
 * ⚠️ LA NOURRITURE N'OCCUPE PAS DE PLACE. Les dimères que la nucléation fabrique
 * sont le FOOD SET du bassin : le milieu les fournit sans fin, ils ne sont le
 * résultat d'aucun choix, et ils n'ont rien à disputer à personne. Les compter
 * comme des espèces était une faute aux conséquences mesurables — six des huit
 * places leur revenaient d'office, il n'en restait que deux pour tout le reste,
 * et les tétramères s'y bousculaient sans jamais s'installer : quatre-vingt-dix
 * d'entre eux traversaient le bassin en quatre cents tours, aucun ne durant.
 * Les huit places sont pour ce qui est FABRIQUÉ.
 */
export const ESPECES_MAX = 8;

/** Ce qui est nourriture : ce que la chimie aveugle sait faire toute seule. */
export const nourriture = (esp: { taille: number }): boolean => esp.taille <= 2;

/**
 * LA PLUS GROSSE MOLÉCULE QUE CE BASSIN TIENT.
 *
 * ⚠️ QUATRE, ET C'EST L'ARITHMÉTIQUE QUI L'IMPOSE, PAS LE CONFORT D'AFFICHAGE.
 * Un cycle exige qu'une espèce déjà présente soit REFABRIQUÉE ; sinon rien ne se
 * maintient, tout se disperse. Or la répétition dépend de la taille de l'univers.
 * On a énuméré l'univers atteignable depuis la seule nucléation :
 *
 *      plafond 4 →    110 molécules  (6 dimères + 104 tétramères)
 *      plafond 6 →  2 415 molécules  (les 110, plus 2 305 hexamères)
 *
 * Avec huit places, un bassin de plafond 6 ne repasse jamais deux fois par la
 * même molécule : mesuré, ZÉRO fabrication sur des milliers ne reproduisait une
 * espèce présente, et aucune espèce ne tenait cent tours. Ce n'était pas un
 * défaut de catalyse — elle fonctionnait — mais un espace trop vaste pour qu'on
 * y repasse. C'est la catastrophe d'erreur d'Eigen, transposée : au-delà d'une
 * certaine taille, l'information ne se transmet plus, elle se dilue.
 *
 * ⚠️ LE TROISIÈME ACTE NE PARLE DONC PAS DE TAILLE MAIS D'ORGANISATION. On n'y
 * fabrique pas de plus grosses molécules qu'au premier acte ; on y fabrique un
 * COLLECTIF qui se tient. C'est un saut d'échelle d'une autre nature, et c'est
 * le seul qui soit honnête ici.
 */
export const TAILLE_MAX = 4;

/**
 * LA PART DES ATOMES LIBRES QUE LA CHIMIE AVEUGLE COLLE DEUX À DEUX PAR TOUR.
 *
 * ⚠️ UN TAUX, PAS UN DÉBIT, ET C'EST UNE CORRECTION DE FOND. Une première
 * version nucléait trois dimères par tour, quoi qu'il flotte. Le bassin s'est
 * retrouvé riche en matière et pauvre en molécules : mesuré, 91 atomes libres en
 * permanence et 3 489 dissipés en quatre cents tours, pour une population de 7,7
 * individus — soit à peine plus d'UN par espèce. À ce compte, aucune espèce ne
 * survit à un jet malheureux, aucun gabarit n'est jamais assez nombreux pour
 * peser, et le troisième acte n'a pas de matière à organiser.
 *
 * Une réaction bimoléculaire va d'autant plus vite qu'il y a de quoi réagir :
 * son débit est proportionnel à ce qui flotte. Rendre la nucléation
 * proportionnelle, c'est à la fois plus juste et ce qui donne au bassin une
 * population — la matière est alors captée avant de se dissiper.
 */
export const NUCLEATION = 0.5;

/** La chance qu'une soudure aboutisse sans qu'aucun gabarit ne la tienne. */
export const SPONTANEE = 0.02;

/** La chance qu'elle atteint quand les gabarits abondent. */
export const CATALYSEE = 0.6;

/**
 * LE NOMBRE DE GABARITS QUI PORTE UNE RÉACTION À MI-CHEMIN.
 *
 * ⚠️ LA CATALYSE SATURE, ELLE NE S'ADDITIONNE PAS. Une première version ajoutait
 * une part fixe par individu de gabarit : avec une population qui se compte en
 * dizaines, toute réaction atteignait aussitôt son plafond, et une chimie où tout
 * réussit ne choisit plus rien. C'est la loi de Michaelis et Menten : au-delà
 * d'un certain point, ce n'est plus le catalyseur qui manque mais les réactifs,
 * et en ajouter n'accélère plus rien.
 */
export const DEMI_GABARITS = 12;

/**
 * LA PART DES RENCONTRES POSSIBLES QUI ONT LIEU À CHAQUE TOUR.
 *
 * ⚠️ SANS ELLE, RIEN NE PEUT CROÎTRE, DONC RIEN NE PEUT ÊTRE SÉLECTIONNÉ, ET LE
 * TROISIÈME ACTE N'A PAS DE SUJET. C'est l'oubli le plus grave qu'ait connu ce
 * bassin : une réaction se tentait UNE FOIS par tour, qu'il y eût deux réactifs
 * ou deux cents. Une espèce abondante ne fabriquait donc pas plus vite qu'une
 * espèce solitaire, et l'abondance ne servait à rien.
 *
 * Mesuré dans cet état : sur quatre cents tours, CENT tétramères différents
 * traversaient les huit places du bassin sans qu'aucun ne dépasse vingt-neuf
 * tours ni six individus. Le bassin visitait tout son univers et ne s'arrêtait
 * nulle part — faute de la boucle de rétroaction que l'action de masse fournit :
 * plus une molécule est nombreuse, plus elle catalyse, donc plus elle est faite.
 *
 * Deux molécules se rencontrent d'autant plus souvent qu'elles sont nombreuses :
 * c'est la loi d'action de masse, la plus élémentaire de toute la chimie.
 */
export const RENCONTRE = 0.05;

/** Combien de fois deux espèces se rencontrent dans un tour. */
export function rencontres(a: Espece, b: Espece): number {
  const couples = a === b || a.empreinte === b.empreinte
    ? (a.effectif * (a.effectif - 1)) / 2
    : a.effectif * b.effectif;
  const plafond = a.empreinte === b.empreinte ? Math.floor(a.effectif / 2) : Math.min(a.effectif, b.effectif);
  return Math.min(Math.round(couples * RENCONTRE), plafond);
}

/** La chance qu'une soudure aboutisse, selon le nombre de gabarits présents. */
export function chanceDeSouder(gabarits: number): number {
  return SPONTANEE + (CATALYSEE - SPONTANEE) * (gabarits / (gabarits + DEMI_GABARITS));
}

/**
 * LA PART DE CE QUI FLOTTE QUI S'EN VA À CHAQUE TOUR.
 *
 * Sans sortie, le bassin est un tas et non un courant : les atomes versés
 * s'accumulent, la population n'est plus bornée par un DÉBIT mais par le STOCK
 * total jamais versé de l'atome rare, et deux espèces qui réclament ce même
 * atome se partagent exactement le même tas. Une fuite rend le surplus
 * PÉRISSABLE : il ne vaut plus rien si personne ne le prend dans le tour.
 *
 * ⚠️ LA MATIÈRE N'EST DONC PAS CONSERVÉE ICI, et c'est voulu : un bassin est un
 * système ouvert. L'invariant de conservation vaut pour la soupe du premier
 * acte, qui est un monde clos ; pas pour celui-ci.
 */
export const FUITE = 0.1;

/**
 * LA PART DES INDIVIDUS QUE LE COURANT EMPORTE À CHAQUE TOUR, ATOMES COMPRIS.
 *
 * ⚠️ SANS LAVAGE, SE REFAIRE NE SERT À RIEN — et c'est ce qui empêchait tout
 * cycle de se fermer. La fuite ne s'appliquait qu'aux atomes libres : une
 * molécule une fois soudée restait pour toujours, sauf à se défaire. Le bassin
 * se remplissait donc de molécules à la taille maximale, plus rien ne pouvait s'y
 * souder, et il se figeait. Mesuré : population stable à 5–8 individus, et zéro
 * cycle fermé sur douze parties de quatre cents tours.
 *
 * Un bassin réel a un courant, et le courant emporte tout : c'est un chémostat.
 * Ce qui n'est pas CONTINUELLEMENT REFAIT disparaît. C'est exactement la
 * pression qui donne sa valeur à un cycle autocatalytique — sans elle, exister
 * une fois suffit, et le troisième acte n'a plus de sujet.
 *
 * ⚠️ ET LES ATOMES PARTENT AVEC. Un individu lavé n'est pas défait, il s'en va :
 * sa matière quitte le bassin. C'est ce qui distingue le lavage de l'attrition.
 */
export const LAVAGE = 0.04;

/** Un bassin vide, prêt à recevoir un flux et des espèces. */
export function bassinVide(libres: Compte = { C: 0, N: 0, S: 0 }): EtatBassin {
  return {
    libres: { ...libres },
    especes: [],
    tours: 0,
    nes: 0,
    morts: 0,
    soudures: 0,
    /** L'empreinte de la molécule qu'on cherche à faire tenir, ou `null`. */
    cible: null,
    /** Depuis combien de tours d'affilée elle est là. */
    tenue: 0,
    /** Le plus long séjour qu'elle ait obtenu. */
    record: 0,
    // Les totaux de la partie : c'est d'eux que se tire son récit.
    refusees: 0,
    refusCible: 0,
    expulsees: 0,
    entreeAu: null,
  };
}

/** DÉSIGNER la molécule qu'on veut faire tenir. Le compte repart de zéro. */
export function viser(etat: EtatBassin, grilleCible: Grille): EtatBassin {
  return { ...etat, cible: empreinte(grilleCible), tenue: 0, record: 0 };
}

function verser(libres: Compte, compte: Compte): void {
  for (const [code, n] of Object.entries(compte) as [Code, number][]) libres[code] = (libres[code] ?? 0) + n;
}

function prendre(libres: Compte, composition: Compte): boolean {
  const paires = Object.entries(composition) as [Code, number][];
  for (const [code, n] of paires) if ((libres[code] ?? 0) < n) return false;
  for (const [code, n] of paires) libres[code] = (libres[code] ?? 0) - n;
  return true;
}

/**
 * Décrit une molécule comme ESPÈCE du bassin.
 *
 * ⚠️ L'IDENTITÉ EST L'EMPREINTE, PAS LE VISAGE. Le visage ne lit que le
 * contour : deux molécules différentes peuvent le partager, ce qui était sans
 * conséquence quand on se contentait de les juger, et devient faux dès qu'on les
 * soude — on collerait une forme et on obtiendrait l'autre. Le visage reste,
 * parce que c'est lui que le monde voit et que toute la chimie de
 * reconnaissance le lit.
 */
export function espece(grille: Grille, milieu?: Milieu, effectif = 0): Espece {
  const d = decrire(grille, cellulesDe(grille), milieu);
  return {
    empreinte: empreinte(grille),
    grille: grille.map((ligne) => [...ligne]),
    visage: d.visage,
    taille: d.taille,
    composition: d.composition,
    cohesion: d.cohesion,
    effectif,
  };
}

/** La casse d'une espèce, par individu et par tour. */
export function fragilite(esp: Espece, milieu: Milieu): number {
  return chanceDeLacher(esp.cohesion, milieu.agitation ?? 1);
}

/**
 * Fait de la place quand le bassin est plein : LA PLUS PETITE PRÉSENCE CÈDE.
 *
 * C'est une extinction par concurrence, pas un refus administratif.
 *
 * ⚠️ ON PÈSE LA MASSE, PAS LE NOMBRE, et la nuance est vitale. Une première
 * version chassait la moins nombreuse — c'est-à-dire, systématiquement, la
 * grosse molécule soudée, qui est rare PAR CONSTRUCTION puisqu'elle demande
 * deux réactifs et un gabarit. La règle éliminait donc exactement ce que le
 * troisième acte cherche à produire, et le bassin serait resté une poussière de
 * dimères pour toujours.
 *
 * En pesant `effectif × taille`, un hexamère solitaire (6) l'emporte sur un
 * dimère solitaire (2) : ce qui a coûté cher à fabriquer résiste mieux à la
 * cohue. Ses atomes retournent au bassin — la matière ne se perd que par la fuite.
 */
function chasserLaPlusFaible(especes: Espece[], libres: Compte, bilan: BilanBassin | null = null): Espece[] {
  const candidates = especes.filter((e) => !nourriture(e));
  if (candidates.length === 0) return especes;
  const masse = (e: Espece) => e.effectif * e.taille;
  let faible = candidates[0];
  for (const e of candidates) if (masse(e) < masse(faible)) faible = e;
  for (let i = 0; i < faible.effectif; i++) verser(libres, faible.composition);
  if (bilan) {
    bilan.expulsees += 1;
    // La FORME, pas le contour : « CCCNS » est un code, pas un nom.
    bilan.remplacement = { grillePartie: faible.grille, taille: faible.taille, effectif: faible.effectif };
  }
  return especes.filter((e) => e.empreinte !== faible.empreinte);
}

/**
 * Installe un individu d'une espèce. Rend `{ especes, entree }`.
 *
 * ⚠️ QUAND LE BASSIN EST PLEIN, LA NOUVEAUTÉ DOIT VALOIR PLUS QUE LA PLUS FAIBLE.
 * Une première version laissait toute molécule neuve chasser quelqu'un : la
 * nouveauté l'emportait donc TOUJOURS sur l'installé, ce qui est l'exact contraire
 * d'une sélection. Mesuré : cent tétramères traversaient huit places en quatre
 * cents tours, aucun ne s'installant jamais. Un individu qui arrive ne délogera
 * pas une population établie ; il doit d'abord peser autant qu'elle.
 *
 * ⚠️ SAUF CE QUE LE JOUEUR SÈME (`force`), qui trouve toujours sa place. Semer est
 * un geste délibéré et c'est la seule prise du joueur sur le bassin : il lui
 * garantit un pied à terre, jamais une survie.
 */
function installer(
  especes: Espece[],
  libres: Compte,
  neuve: Espece,
  combien = 1,
  force = false,
  bilan: BilanBassin | null = null,
): { especes: Espece[]; entree: boolean } {
  const place = especes.findIndex((e) => e.empreinte === neuve.empreinte);
  if (place !== -1) {
    const liste = [...especes];
    liste[place] = { ...liste[place], effectif: liste[place].effectif + combien };
    return { especes: liste, entree: true };
  }
  let liste = especes;
  if (!nourriture(neuve) && liste.filter((e) => !nourriture(e)).length >= ESPECES_MAX) {
    const masse = (e: Espece) => e.effectif * e.taille;
    const faible = liste.filter((e) => !nourriture(e)).reduce((x, y) => (masse(y) < masse(x) ? y : x));
    if (!force && combien * neuve.taille < masse(faible)) return { especes, entree: false };
    liste = chasserLaPlusFaible(liste, libres, bilan);
    if (bilan && bilan.remplacement) bilan.remplacement.grilleVenue = neuve.grille;
  }
  return { especes: [...liste, { ...neuve, effectif: combien }], entree: true };
}

/**
 * ENSEMENCER : mettre un individu de plus dans le bassin.
 *
 * ⚠️ IL SE PAIE EN ATOMES DU BASSIN. Un joueur qui sème sans compter vide le sac
 * qui nourrit tout le monde, y compris ses propres espèces. C'est aussi ce qui
 * interdit la stratégie qui tuerait le troisième acte : tout semer et regarder.
 */
export function ensemencer(etat: EtatBassin, grille: Grille, milieu: Milieu): EtatBassin {
  const nouvelle = espece(grille, milieu, 0);
  const libres = { ...etat.libres };
  if (!prendre(libres, nouvelle.composition)) return etat;
  const { especes } = installer(etat.especes, libres, nouvelle, 1, true);
  return { ...etat, libres, especes, nes: etat.nes + 1 };
}

/** RETIRER une espèce entière. Ses atomes retournent au bassin. */
export function retirer(etat: EtatBassin, empreinteCible: string): EtatBassin {
  const partante = etat.especes.find((e) => e.empreinte === empreinteCible);
  if (!partante) return etat;
  const libres = { ...etat.libres };
  for (let i = 0; i < partante.effectif; i++) verser(libres, partante.composition);
  return { ...etat, libres, especes: etat.especes.filter((e) => e.empreinte !== empreinteCible) };
}

/**
 * Le cache des soudures possibles entre deux formes.
 *
 * ⚠️ C'EST UN CACHE, PAS UN ÉTAT. `souder` est une fonction pure de deux
 * grilles : mémoriser son résultat ne rend pas le module impur, et sans cela un
 * tour recalculerait des centaines de placements pour rien. La partie reste
 * rejouable à l'identique.
 */
const memoire = new Map<string, Produit[]>();
function souduresDe(a: Espece, b: Espece): Produit[] {
  const cle = `${a.empreinte}»${b.empreinte}`;
  if (!memoire.has(cle)) {
    memoire.set(
      cle,
      [...souder(a.grille, b.grille, TAILLE_MAX).values()]
        .map((grille) => ({
          grille,
          empreinte: empreinte(grille),
          visage: visageDe(grille),
        }))
        /**
         * ⚠️ ON TRIE, ET C'EST L'INVARIANT DU PROJET QUI EN DÉPEND : une graine,
         * une partie. La clé du cache est faite de deux EMPREINTES, mais la valeur
         * dépend de l'orientation des GRILLES reçues — or l'empreinte est
         * canonique à la rotation près, la grille non. Deux exemplaires d'une même
         * espèce, l'un né par nucléation et l'autre sorti d'une soudure, peuvent
         * donc porter la même empreinte et des grilles tournées différemment, et
         * remplir le cache dans deux ordres différents. Comme le tour tire son
         * produit AU HASARD dans cette liste, la même graine ne rejouerait plus la
         * même partie selon ce qui a tourné avant elle. Trier rend la clé
         * suffisante, et l'invariant vrai par construction plutôt que par chance.
         */
        .sort((x, y) => (x.empreinte < y.empreinte ? -1 : x.empreinte > y.empreinte ? 1 : 0)),
    );
  }
  return memoire.get(cle) as Produit[];
}

/**
 * LE VIVIER DE GABARITS D'UNE RENCONTRE : tous les individus présents dont le
 * contour reconnaît à la fois l'un et l'autre réactif.
 *
 * ⚠️ IL NE DÉPEND QUE DES DEUX RÉACTIFS, jamais du produit — c'est ce qui rend le
 * calcul honnête et rapide à la fois. Le produit n'intervient qu'à la fin, pour
 * s'exclure lui-même : une molécule ne catalyse pas sa propre fabrication, sans
 * quoi la règle redevient la tautologie mesurée et rejetée dans `soudure.js`.
 */
function vivier(especes: Espece[], a: Espece, b: Espece) {
  const pool = new Map<string, number>();
  for (const x of especes) {
    if (tientEnsemble(x.visage, a.visage, b.visage)) {
      pool.set(x.visage, (pool.get(x.visage) ?? 0) + x.effectif);
    }
  }
  let total = 0;
  for (const n of pool.values()) total += n;
  return { total, parVisage: pool };
}

const gabaritsPour = (
  vv: { total: number; parVisage: Map<string, number> },
  visageProduit: string,
): number => vv.total - (vv.parVisage.get(visageProduit) ?? 0);

/**
 * QUI FABRIQUE QUI, dans l'état présent du bassin.
 *
 * ⚠️ C'EST CE QUE L'ÉCRAN DOIT MONTRER, et rien d'autre. Le reproche revenu à
 * chaque essai est qu'on ne sait pas ce qui est attendu ; ici la réponse est un
 * graphe minuscule — telle molécule plus telle autre en font une troisième, et
 * tel gabarit accélère la chose. Montrer le maillon MANQUANT vaut mieux que
 * n'importe quel compteur.
 *
 */
export function fabrications(etat: { especes: Espece[] }): Fabrication[] {
  const liste: Fabrication[] = [];
  for (let i = 0; i < etat.especes.length; i++) {
    for (let j = i; j < etat.especes.length; j++) {
      const a = etat.especes[i];
      const b = etat.especes[j];
      if (i === j && a.effectif < 2) continue;
      const produits = souduresDe(a, b);
      if (produits.length === 0) continue;
      const vv = vivier(etat.especes, a, b);
      for (const p of produits) {
        const gabarits = gabaritsPour(vv, p.visage);
        liste.push({
          a,
          b,
          produit: p.grille,
          empreinte: p.empreinte,
          visage: p.visage,
          gabarits,
          rencontres: rencontres(a, b),
          chance: chanceDeSouder(gabarits),
        });
      }
    }
  }
  return liste;
}

/**
 * COMBIEN DE TOURS D'AFFILÉE UNE CIBLE DOIT TENIR POUR ÊTRE DITE INSTALLÉE.
 *
 * Plus de deux fois ce que le seul hasard du courant accorde à un individu isolé
 * (un vingt-cinquième par tour, soit vingt-cinq tours). Au-delà, ce n'est plus de
 * la chance : la molécule est REFABRIQUÉE aussi vite qu'elle disparaît.
 *
 * ⚠️ SOIXANTE, ET LA BARRE A ÉTÉ MESURÉE, PAS CHOISIE. Sur soixante-douze cibles
 * tirées au hasard dans trois milieux :
 *
 *      abandonnée à elle-même        3/72   ( 4 %)
 *      aidée par un joueur qui ne
 *      fait qu'appliquer le conseil  20/72  (28 %)
 *
 * À cent, le même joueur ne passait plus que dix fois sur soixante-douze, et
 * l'écart avec le hasard devenait invisible ; à quarante, la moitié des parties
 * passaient sans qu'on ait rien compris. Et l'issue est franchement binaire :
 * une cible qui tient soixante tours en tient presque toujours quatre cents. Ce
 * n'est donc pas un seuil de patience, c'est le moment où le collectif prend.
 */
export const OBJECTIF = 60;

/**
 * LES SIX BRIQUES : tout ce que la chimie aveugle sait faire seule.
 *
 * C'est le « food set » du bassin, au sens exact de la théorie des ensembles
 * autocatalytiques : ce que le milieu fournit sans qu'on ait rien à décider.
 * Tout le reste du bassin en descend.
 */
export const BRIQUES = Object.freeze(
  (() => {
    const vues = new Map();
    for (const a of CODES) {
      for (const b of CODES) {
        const grille = recentrer([
          { r: 0, c: 0, code: a },
          { r: 0, c: 1, code: b },
        ]);
        const cle = empreinte(grille);
        if (!vues.has(cle)) vues.set(cle, grille);
      }
    }
    return [...vues.values()];
  })(),
);

const voiesMemo = new Map<string, VoieBrute[]>();
/**
 * LES CHEMINS QUI MÈNENT À UNE MOLÉCULE : quels couples de briques la font.
 *
 * ⚠️ ON LES CALCULE DEPUIS LES BRIQUES, PAS DEPUIS LE BASSIN, et c'est ce qui
 * permet de montrer un maillon MANQUANT. Une voie dont un réactif est absent
 * n'apparaîtrait jamais si on ne listait que ce qui est là, et c'est précisément
 * celle-là que le joueur a besoin de voir.
 */
export function voiesVers(grilleCible: Grille): VoieBrute[] {
  const cible = empreinte(grilleCible);
  if (!voiesMemo.has(cible)) {
    const out: VoieBrute[] = [];
    for (let i = 0; i < BRIQUES.length; i++) {
      for (let j = i; j < BRIQUES.length; j++) {
        for (const p of souder(BRIQUES[i], BRIQUES[j], TAILLE_MAX).values()) {
          if (empreinte(p) === cible) {
            out.push({ a: BRIQUES[i], b: BRIQUES[j] });
            break;
          }
        }
      }
    }
    voiesMemo.set(cible, out);
  }
  return voiesMemo.get(cible) as VoieBrute[];
}

/**
 * CE QUI FABRIQUE LA CIBLE, ET CE QUI MANQUE POUR L'AIDER.
 *
 * ⚠️ C'EST TOUT CE QUE L'ÉCRAN DU TROISIÈME ACTE A LE DROIT DE DIRE. Le reproche
 * revenu à chaque essai est qu'on ne sait pas ce qui est attendu ; un compteur de
 * population n'y répond pas. Ici la réponse tient en une ligne par voie : il faut
 * telle brique et telle autre, et telle molécule présente tient les deux — ou
 * bien il en manque une, et on dit laquelle semer.
 *
 * `catalogue` est ce que le joueur a pêché au premier acte : c'est parmi cela, et
 * seulement cela, qu'on peut lui conseiller quelque chose.
 *
 */
export function soutiens(etat: EtatBassin, grilleCible: Grille, catalogue: Grille[] = []): Soutiens {
  const cible = empreinte(grilleCible);
  const vCible = visageDe(grilleCible);
  const dans = new Map(etat.especes.map((e) => [e.empreinte, e]));

  const voies = voiesVers(grilleCible).map(({ a, b }) => {
    // Sans milieu : un réactif absent existe et tient, mais on ne prétend pas
    // savoir ce qu'il vaut ici — on n'a besoin que de son contour.
    const ea = dans.get(empreinte(a)) ?? espece(a, undefined, 0);
    const eb = dans.get(empreinte(b)) ?? espece(b, undefined, 0);
    const vv = vivier(etat.especes, ea, eb);
    const gabarits = gabaritsPour(vv, vCible);
    return {
      a: ea,
      b: eb,
      gabarits,
      chance: chanceDeSouder(gabarits),
      // Les espèces présentes qui tiennent les deux réactifs, la plus nombreuse d'abord.
      tenants: etat.especes
        .filter((x) => x.visage !== vCible && tientEnsemble(x.visage, ea.visage, eb.visage))
        .sort((x, y) => y.effectif - x.effectif),
    };
  });
  voies.sort((x, y) => y.chance - x.chance);

  /**
   * CE QU'IL FAUDRAIT SEMER : parmi le catalogue, ce qui tiendrait les réactifs
   * d'une voie. On chiffre le gain, pas l'intention.
   *
   * ⚠️ ON SÉPARE « AUCUNE NE SAIT » DE « ELLES Y SONT DÉJÀ », et la nuance n'est
   * pas cosmétique : la première version écartait d'emblée les pièces présentes
   * dans le bassin, si bien que l'écran annonçait « aucune de vos molécules ne
   * sait tenir ces deux morceaux » au moment précis où le bon gabarit tournait
   * dedans. Une explication fausse est pire qu'une explication absente — c'est
   * exactement ce qu'on cherche à corriger ici.
   */
  const aider: Renfort[] = [];
  const dejaLa: Renfort[] = [];
  for (const grille of catalogue) {
    const cle = empreinte(grille);
    if (cle === cible) continue;
    const v = visageDe(grille);
    if (v === vCible) continue;
    let gain = 0;
    for (const voie of voies) {
      if (!tientEnsemble(v, voie.a.visage, voie.b.visage)) continue;
      gain = Math.max(gain, chanceDeSouder(voie.gabarits + 1) - voie.chance);
    }
    if (gain <= 0) continue;
    if (dans.has(cle)) dejaLa.push({ grille, visage: v, gain });
    else aider.push({ grille, visage: v, gain });
  }
  aider.sort((x, y) => y.gain - x.gain);
  dejaLa.sort((x, y) => y.gain - x.gain);

  return {
    present: dans.get(cible)?.effectif ?? 0,
    tenue: etat.tenue ?? 0,
    voies,
    /** Les gabarits du catalogue qui manquent au bassin, le plus utile d'abord. */
    aider,
    /** Ceux qui y sont déjà : ils servent, mais il n'y a rien à faire pour eux. */
    dejaLa,
  };
}

/**
 * UNE MOLÉCULE PEUT-ELLE TENIR DANS CE BASSIN ?
 *
 * ⚠️ RÈGLE TROUVÉE EN MESURANT UN PIÈGE, ET LE PIÈGE ÉTAIT GRAVE. Le tirage
 * proposait au joueur, 44 % du temps, une cible que rien ne pouvait faire tenir :
 * sur 44 cibles portant deux soufres ou plus, ZÉRO n'a jamais atteint l'objectif,
 * contre 41 sur 46 pour les autres. Le joueur choisissait, jouait, échouait, et
 * rien à l'écran ne pouvait le lui expliquer.
 *
 * Le seuil n'est pas un nombre magique : c'est LE LAVAGE lui-même. Une molécule
 * qui se défait plus vite que le courant ne l'emporte ne peut jamais s'installer,
 * quoi qu'on fasse — la refabriquer ne rattrape pas ce que l'agitation défait.
 * Mesuré sur les 104 tétramères, semés puis laissés seuls trois cents tours :
 *
 *      casse ≤ 4 % par tour   60 cibles   49 atteignent l'objectif
 *      casse >  4 % par tour   44 cibles    2 y arrivent
 *
 * ⚠️ ET LA CAUSE EST CHIMIQUE, PAS ARBITRAIRE. Le soufre ne prend que deux
 * voisins et ne lie que faiblement : une molécule qui en porte deux ou plus a une
 * cohésion de 1,27 contre 1,92 sans soufre, donc se défait 5,4 fois plus vite. Le
 * soufre est un atome de charnière, pas de charpente — et l'écran doit le dire au
 * lieu de laisser le joueur le découvrir par l'échec.
 */
export function tenable(grille: Grille, milieu: Milieu): boolean {
  return fragilite(espece(grille, milieu), milieu) <= LAVAGE;
}

let universMemo: Map<string, Grille> | null = null;
/**
 * TOUT CE QUE LES BRIQUES SAVENT FAIRE. Cent dix molécules : les six dimères et
 * les cent quatre tétramères qu'ils soudent. C'est l'univers entier du bassin, et
 * sa petitesse est ce qui rend la répétition — donc l'auto-entretien — possible.
 */
export function universAtteignable(): Map<string, Grille> {
  if (universMemo) return universMemo;
  const vus = new Map(BRIQUES.map((b) => [empreinte(b), b]));
  let front = [...vus.values()];
  while (front.length) {
    const neufs = [];
    for (const x of front) {
      for (const y of vus.values()) {
        for (const p of souder(x, y, TAILLE_MAX).values()) {
          const cle = empreinte(p);
          if (vus.has(cle)) continue;
          vus.set(cle, p);
          neufs.push(p);
        }
      }
    }
    front = neufs;
  }
  universMemo = vus;
  return vus;
}

/**
 * TROIS CIBLES À PROPOSER AU JOUEUR.
 *
 * ⚠️ ELLES NE VIENNENT PAS DE LA COLLECTION, ET C'EST UNE CONSTATATION, PAS UN
 * CHOIX DE CONFORT. Mesuré sur deux cents parties du premier acte : les molécules
 * qu'on pêche font de trois à vingt et un atomes, médiane six, et une collection
 * de six n'offre une molécule fabricable par le bassin que trois fois sur huit.
 * Viser sa propre pêche condamnerait donc cinq joueurs sur huit à une impasse.
 *
 * La collection n'est pas perdue pour autant : elle devient la BOÎTE À OUTILS.
 * Un contour long fait un bon gabarit, et une molécule trop grosse pour être
 * refabriquée ici s'use et s'en va — un réactif qu'on dépense, pas un habitant.
 */
export function ciblesProposees(rng: Alea, combien = 3, milieu?: Milieu): Grille[] {
  const fabricables = [...universAtteignable().values()].filter(
    (g) => g.flat().filter(Boolean).length > 2 && voiesVers(g).length > 0,
  );
  // On ne propose jamais ce que rien ne peut faire tenir : c'était 44 % du
  // tirage, pour un taux de réussite de zéro sur quarante-quatre.
  let candidates = milieu === undefined ? fabricables : fabricables.filter((g) => tenable(g, milieu));

  /**
   * ⚠️ FILET : DANS UNE EAU PLUS RUDE, LE FILTRE NE LAISSE PRESQUE RIEN PASSER.
   * `tenable` se mesure contre l'agitation du milieu ; à 0,5 il garde 60 cibles
   * sur 104, mais à 0,7 il n'en garde que DEUX, et le tirage n'aurait plus de quoi
   * en proposer trois. Le jeu ne quitte jamais la première eau aujourd'hui, mais
   * une règle qui s'effondre dès qu'on change un chiffre ailleurs n'est pas une
   * règle. À défaut d'assez de tenables, on prend LES MOINS FRAGILES : elles
   * restent le meilleur choix possible ici, et l'écran dira leur fragilité.
   */
  if (candidates.length < combien && milieu !== undefined) {
    candidates = [...fabricables].sort(
      (a, b) => fragilite(espece(a, milieu), milieu) - fragilite(espece(b, milieu), milieu),
    );
  }
  const tirees: Grille[] = [];
  const vus = new Set<string>();
  let garde = 0;
  while (tirees.length < combien && garde++ < 500) {
    const g = candidates[Math.floor(rng() * candidates.length)];
    const cle = empreinte(g);
    if (vus.has(cle)) continue;
    vus.add(cle);
    tirees.push(g);
  }
  return tirees;
}

/**
 * UN TOUR DE BASSIN.
 *
 * ⚠️ LE BILAN COMPTE AUSSI CE QUI N'A PAS EU LIEU, et c'est le plus important.
 * Mesuré sur vingt-quatre parties de quatre cents tours : 82 % des soudures
 * chimiquement réussies sont annulées faute de place, et la cible elle-même est
 * fabriquée puis refusée près de quatre cents fois par partie. Tant que le
 * bilan ne comptait que les réussites, l'écran ne POUVAIT pas dire au joueur
 * pourquoi rien n'arrivait : il n'y avait pas de mot pour l'événement le plus
 * fréquent de son bassin. On ne raconte pas ce qu'on ne compte pas.
 */
export function tourDeBassin(
  etat: EtatBassin,
  milieu: Milieu,
  rng: Alea = Math.random,
): { etat: EtatBassin; bilan: BilanBassin } {
  const bilan: BilanBassin = {
    verses: 0,
    morts: 0,
    nes: 0,
    soudures: 0,
    dissipes: 0,
    emportes: 0,
    exportes: 0,
    refusees: 0,
    refusCible: 0,
    expulsees: 0,
    plein: false,
    sortieCible: null,
    entreeCible: false,
    remplacement: null,
  };
  const libres = { ...etat.libres };
  const cible = etat.cible;
  const laCible = (liste: Espece[]) => cible !== null && liste.some((e) => e.empreinte === cible);
  const cibleAuDepart = laCible(etat.especes);

  // ── 1. VERSEMENT ──────────────────────────────────────────────────────────
  const flux = milieu.flux ?? {};
  verser(libres, flux);
  bilan.verses = Object.values(flux).reduce((s: number, n) => s + (n ?? 0), 0);

  // ── 2. ATTRITION ──────────────────────────────────────────────────────────
  // La loi du premier acte : la cohésion contre l'agitation. Ce qui se défait
  // retourne au bassin — c'est ce recyclage qui fait circuler la matière.
  let especes: Espece[] = [];
  for (const esp of etat.especes) {
    const risque = fragilite(esp, milieu);
    let perdus = 0;
    for (let i = 0; i < esp.effectif; i++) if (rng() < risque) perdus += 1;
    for (let i = 0; i < perdus; i++) verser(libres, esp.composition);
    bilan.morts += perdus;
    if (esp.effectif - perdus > 0) especes.push({ ...esp, effectif: esp.effectif - perdus });
  }

  // Ce qui s'est défait tout seul : la cohésion a cédé, personne ne l'a poussé.
  if (cibleAuDepart && !laCible(especes)) bilan.sortieCible = "attrition";

  // ── 3. NUCLÉATION ─────────────────────────────────────────────────────────
  // La chimie aveugle : deux atomes libres se collent sans se reconnaître. Elle
  // est la seule source de nourriture, et elle résout l'amorçage.
  const flottants = CODES.reduce((s, code) => s + (libres[code] ?? 0), 0);
  const essais = Math.round((flottants * NUCLEATION) / 2);
  for (let i = 0; i < essais; i++) {
    const dispo = (): Code[] => CODES.filter((x) => (libres[x] ?? 0) > 0);
    if (dispo().length === 0) break;
    const premiers = dispo();
    const a = premiers[Math.floor(rng() * premiers.length)] as Code;
    libres[a] = (libres[a] ?? 0) - 1;
    const seconds = dispo();
    if (seconds.length === 0) {
      libres[a] = (libres[a] ?? 0) + 1;
      break;
    }
    const b = seconds[Math.floor(rng() * seconds.length)] as Code;
    libres[b] = (libres[b] ?? 0) - 1;
    const grille = recentrer([
      { r: 0, c: 0, code: a },
      { r: 0, c: 1, code: b },
    ]);
    const arrivee = installer(especes, libres, espece(grille, milieu), 1, false, bilan);
    if (!arrivee.entree) {
      // Le bassin est plein de plus fort que ce dimère : ses deux atomes restent libres.
      libres[a] = (libres[a] ?? 0) + 1;
      libres[b] = (libres[b] ?? 0) + 1;
      continue;
    }
    especes = arrivee.especes;
    bilan.nes += 1;
  }

  // ── 4. SOUDURE ────────────────────────────────────────────────────────────
  // La chimie qui reconnaît. Deux molécules se lient là où leurs bords
  // s'apparient, et un gabarit présent accélère la chose sans y être consommé.
  // On travaille sur une photographie du début de phase : deux espèces se
  // rencontrent selon ce qu'elles étaient, non selon ce que le tour en a déjà fait.
  const debut = especes.map((e) => ({ ...e }));
  for (let i = 0; i < debut.length; i++) {
    for (let j = i; j < debut.length; j++) {
      const produits = souduresDe(debut[i], debut[j]);
      if (produits.length === 0) continue;
      const essais = rencontres(debut[i], debut[j]);
      if (essais < 1) continue;

      const vv = vivier(debut, debut[i], debut[j]);
      for (let k = 0; k < essais; k++) {
        const a = especes.find((e) => e.empreinte === debut[i].empreinte);
        const b = especes.find((e) => e.empreinte === debut[j].empreinte);
        if (!a || !b) break;
        if (a === b ? a.effectif < 2 : a.effectif < 1 || b.effectif < 1) break;

        const p = produits[Math.floor(rng() * produits.length)];
        if (rng() >= chanceDeSouder(gabaritsPour(vv, p.visage))) continue;

        // ⚠️ LE PRODUIT NE COÛTE AUCUN ATOME LIBRE : il est fait des deux réactifs,
        // qui viennent d'être consommés. Les atomes se conservent — souder ne fait
        // que réunir, jamais transmuter.
        const avant = especes.map((e) => (e === a || e === b ? { ...e } : e));
        const ia = avant.findIndex((e) => e.empreinte === a.empreinte);
        const ib = avant.findIndex((e) => e.empreinte === b.empreinte);
        avant[ia].effectif -= 1;
        avant[ib].effectif -= 1;
        const arrivee = installer(
          avant.filter((e) => e.effectif > 0),
          libres,
          espece(p.grille, milieu),
          1,
          false,
          bilan,
        );
        // Refusée faute de place : la soudure n'a pas lieu, les réactifs restent.
        // ⚠️ ON LA COMPTE. C'est l'événement le plus fréquent du bassin, et il
        // était le seul qu'aucun compteur ne portait.
        if (!arrivee.entree) {
          bilan.refusees += 1;
          if (cible !== null && p.empreinte === cible) bilan.refusCible += 1;
          continue;
        }
        especes = arrivee.especes;
        bilan.soudures += 1;
      }
    }
  }
  especes = especes.filter((e) => e.effectif > 0);
  // Ce qui s'est fait chasser : une nouvelle venue pesait plus que lui.
  if (cibleAuDepart && !laCible(especes) && bilan.sortieCible === null) bilan.sortieCible = "concurrence";
  const avantLeCourant = laCible(especes);

  // ── 5. LAVAGE ET FUITE ────────────────────────────────────────────────────
  // Le courant emporte tout : les atomes qui flottent, et les individus eux-
  // mêmes. Ce qui n'est pas continuellement refait s'en va.
  especes = especes
    .map((e) => {
      let emportes = 0;
      for (let i = 0; i < e.effectif; i++) if (rng() < LAVAGE) emportes += 1;
      bilan.emportes += emportes;
      // La matière part AVEC eux : c'est ce qui distingue le lavage de l'attrition.
      bilan.exportes += emportes * e.taille;
      return { ...e, effectif: e.effectif - emportes };
    })
    .filter((e) => e.effectif > 0);

  for (const code of CODES) {
    const reste = libres[code] ?? 0;
    const perdu = Math.floor(reste * FUITE);
    libres[code] = reste - perdu;
    bilan.dissipes += perdu;
  }

  // Ce que le courant a emporté. Mesuré : c'est la plus RARE des trois causes,
  // et c'était pourtant la seule que l'écran nommait.
  if (avantLeCourant && !laCible(especes) && bilan.sortieCible === null) bilan.sortieCible = "courant";
  bilan.entreeCible = !cibleAuDepart && laCible(especes);
  bilan.plein = especes.filter((e) => !nourriture(e)).length >= ESPECES_MAX;

  // LA TENUE DE LA CIBLE : un séjour ininterrompu, remis à zéro dès qu'elle sort.
  const survit = etat.cible !== null && especes.some((e) => e.empreinte === etat.cible);
  const tenue = survit ? (etat.tenue ?? 0) + 1 : 0;

  return {
    etat: {
      ...etat,
      libres,
      especes,
      tenue,
      record: Math.max(etat.record ?? 0, tenue),
      tours: etat.tours + 1,
      nes: etat.nes + bilan.nes,
      morts: etat.morts + bilan.morts,
      soudures: (etat.soudures ?? 0) + bilan.soudures,
      refusees: (etat.refusees ?? 0) + bilan.refusees,
      refusCible: (etat.refusCible ?? 0) + bilan.refusCible,
      expulsees: (etat.expulsees ?? 0) + bilan.expulsees,
      entreeAu: etat.entreeAu ?? (bilan.entreeCible ? etat.tours + 1 : null),
    },
    bilan,
  };
}

/**
 * CE QUI MANQUE POUR EN DÉPOSER UN DE PLUS.
 *
 * ⚠️ « PAS ASSEZ D'ATOMES » N'EST PAS UNE INFORMATION, C'EST UN REFUS. Le bassin
 * est un budget d'atomes rares : le flux verse 24 carbones pour 4 soufres, et la
 * nucléation consomme le rare aussitôt qu'il tombe. Un joueur voit donc
 * couramment cinquante carbones libres et zéro azote, et son geste principal lui
 * est refusé sans qu'on lui dise ni lequel manque, ni que la réponse est à
 * l'écran — retirer une espèce rend TOUS ses atomes au bassin.
 */
export function manquePour(etat: EtatBassin, composition: Compte): ManqueAtome[] {
  const out: ManqueAtome[] = [];
  for (const [code, n] of Object.entries(composition) as [Code, number][]) {
    const disponible = etat.libres[code] ?? 0;
    if (disponible < n) out.push({ code, requis: n, disponible, manque: n - disponible });
  }
  return out;
}

/** Ce qu'une espèce rendrait au bassin si on la retirait. */
export function rendrait(esp: Espece): Compte {
  const out: Compte = {};
  for (const [code, n] of Object.entries(esp.composition) as [Code, number][]) out[code] = n * esp.effectif;
  return out;
}

/**
 * COMBIEN D'EXEMPLAIRES LE BASSIN PEUT RÉELLEMENT EN PAYER, MAINTENANT.
 *
 * ⚠️ LE BOUTON ANNONÇAIT « ×10 » ET DÉPOSAIT 1,7 EXEMPLAIRE EN MOYENNE, sans rien
 * dire. Mesuré sur vingt-quatre parties : 63 % des semis conseillés étaient
 * refusés faute d'atomes, et les autres tronqués en silence. Le joueur cliquait,
 * voyait le bassin ne presque pas bouger, et n'avait aucun moyen de comprendre
 * que la matière — et non son idée — venait de lui être refusée. Un écran qui
 * promet dix et en donne deux est pire qu'un écran qui annonce deux.
 */
export function combienPossible(
  etat: EtatBassin,
  grille: Grille,
  milieu: Milieu,
  combien = 1,
): number {
  const { composition } = espece(grille, milieu);
  let possible = combien;
  for (const [code, n] of Object.entries(composition) as [Code, number][]) {
    possible = Math.min(possible, Math.floor((etat.libres[code] ?? 0) / n));
  }
  return Math.max(0, possible);
}

/** La population totale du bassin, toutes espèces confondues. */
export function population(etat: EtatBassin): number {
  return etat.especes.reduce((s, e) => s + e.effectif, 0);
}

/** Tous les atomes en jeu — flottants et engagés. */
export function inventaireBassin(etat: EtatBassin): Compte {
  const total = { ...etat.libres };
  for (const esp of etat.especes) {
    for (const [code, n] of Object.entries(esp.composition) as [Code, number][]) {
      total[code] = (total[code] ?? 0) + n * esp.effectif;
    }
  }
  for (const code of CODES) total[code] = total[code] ?? 0;
  return total;
}
