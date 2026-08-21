// LE MOTEUR DU « PAYS DU JOUR » — noter, valider, dater.
//
// Trois responsabilités, et rien d'autre :
//   · NOTER  : combien des cinq critères du jour un pays satisfait-il ;
//   · VALIDER: une combinaison de cinq critères fait-elle une journée jouable ;
//   · DATER  : quelle journée est-on, en heure de Paris.
//
// ⚠️ CE FICHIER TOUCHE LES CRITÈRES : il est donc, comme eux, réservé au serveur.
// Ce qui est utilisable partout (couleurs du gradient, texte de partage) vit
// dans `partage.ts` et `palette.ts`, qui ne connaissent que des NOMBRES.
import {
  CARDINAL_MAX,
  CARDINAL_MIN,
  CRITERE_PAR_ID,
  cardinal,
  etiquetteDe,
  type Critere,
} from "@/content/pays/criteres";
import { PAYS, type Pays } from "@/content/pays/referentiel";

export const NB_CRITERES = 5;

/** Le score d'un pays : combien des critères du jour il satisfait, de 0 à 5. */
export function scoreDe(p: Pays, criteres: Critere[]): number {
  return criteres.reduce((n, c) => n + (c.verifie(p) ? 1 : 0), 0);
}

/** Tous les scores de la journée, par code pays. C'est la carte complète. */
export function scoresDeTous(criteres: Critere[]): Record<string, number> {
  return Object.fromEntries(PAYS.map((p) => [p.id, scoreDe(p, criteres)]));
}

/** `[combien de 0/5, de 1/5, … de 5/5]`. */
export function distributionDe(scores: Record<string, number>): number[] {
  const d = [0, 0, 0, 0, 0, 0];
  for (const s of Object.values(scores)) d[s]++;
  return d;
}

/**
 * L'ORDRE CANONIQUE des cinq critères d'une journée : du plus courant au plus
 * rare, le plus rare en dernier.
 *
 * ⚠️ C'EST LUI QUI REND LES CASES LISIBLES. L'écran montre cinq cases par essai,
 * remplies quand le pays satisfait le critère de ce rang. Elles ne servent à
 * quelque chose QUE si le rang veut dire la même chose d'un essai à l'autre :
 * c'est ce qui permet de voir, sans un mot, que la France et les États-Unis
 * partagent la deuxième et pas la quatrième.
 *
 * L'ordre est stable pour une journée donnée et ne dépend d'aucun aléa : palier
 * croissant, puis identifiant. L'identifiant n'est jamais montré — il ne sert
 * qu'à départager deux critères de même rareté toujours de la même façon.
 */
const RANG_PALIER: Record<string, number> = {
  large: 0,
  intermediaire: 1,
  discriminant: 2,
  specifique: 3,
  signature: 4,
};

export function ordreCanonique(criteres: Critere[]): Critere[] {
  return [...criteres].sort(
    (a, b) => (RANG_PALIER[a.palier] ?? 0) - (RANG_PALIER[b.palier] ?? 0) || a.id.localeCompare(b.id),
  );
}

/**
 * Les cinq cases d'un pays : 1 quand il satisfait le critère de ce rang.
 *
 * ⚠️ CECI DIT AU JOUEUR *LESQUELS* DES CRITÈRES SONT SATISFAITS, et c'est une
 * entorse assumée au §3.3 — décidée après avoir joué. Ce que le §3.3 protège
 * vraiment, c'est la SURPRISE DE LA RÉVÉLATION : elle est intacte, puisqu'une
 * case pleine ne dit pas de quoi le critère parle. Ce qu'il coûtait, en
 * revanche, était réel : deux essais à 3/5 étaient indiscernables alors qu'ils
 * ne se ressemblaient pas, et le joueur ne pouvait rien déduire de deux essais
 * successifs — mesuré, 5,5 essais pour un solveur parfait contre 3,9 en
 * montrant le détail. La case remplace d'un coup l'affichage du recouvrement et
 * celui de la rareté, qui disaient tous deux moins, chacun de son côté.
 */
export function casesDe(p: Pays, ordonnes: Critere[]): number[] {
  return ordonnes.map((c) => (c.verifie(p) ? 1 : 0));
}

/** Les cases de chaque essai d'une suite, recalculées en entier à chaque fois. */
export function casesDeTous(pays: Pays[], ordonnes: Critere[]): number[][] {
  return pays.map((p) => casesDe(p, ordonnes));
}

// ---------------------------------------------------------------------------
// VALIDATION D'UNE JOURNÉE
//
// Le pipeline de la spec (§6.2), dans l'ordre : on part des critères, on note
// tout le monde, ET SEULEMENT ENSUITE on regarde qui est la réponse. Choisir le
// pays d'abord conduit à fabriquer des critères pour l'isoler — c'est-à-dire à
// écrire les « seuils artificiels » que le §5.4 interdit.
// ---------------------------------------------------------------------------

/** Bornes de distribution. Point de départ à instrumenter, pas dogme (§6.3). */
export const BORNES = {
  quatreMin: 2,
  quatreMax: 15,
  troisMin: 8,
  troisMax: 40,
  /** Sous ce nombre de 0-2/5, les sondes lointaines n'apprennent plus rien. */
  froidsMin: 60,
  /** Marge exigée autour d'un seuil chiffré, pour la réponse et ses poursuivants. */
  margeSeuil: 0.05,
};

export interface Bilan {
  criteres: string[];
  /** Le pays à 5/5, s'il est unique. */
  cible: string | null;
  distribution: number[];
  /** Les 4/5, avec le critère qui leur manque : c'est le sel du puzzle. */
  quasi: { pays: string; manque: string }[];
  /** Combien de critères DIFFÉRENTS sont ratés par les 4/5 (§6.4). */
  diversiteQuasi: number;
  /** Ce qui cloche. Vide = journée publiable. */
  defauts: string[];
  /** Note éditoriale, 0 à 100. Sert à CLASSER les journées valides, pas à trier le vrai du faux. */
  note: number;
}

/**
 * Éprouve une combinaison de cinq critères et dit tout ce qu'on sait d'elle.
 *
 * Ne lève jamais : une combinaison mauvaise est une réponse, pas une erreur —
 * le générateur en essaie des dizaines de milliers.
 */
export function evalueJournee(ids: string[]): Bilan {
  const defauts: string[] = [];
  const criteres = ids.map((id) => CRITERE_PAR_ID[id]);
  if (criteres.some((c) => !c)) {
    return {
      criteres: ids,
      cible: null,
      distribution: [0, 0, 0, 0, 0, 0],
      quasi: [],
      diversiteQuasi: 0,
      defauts: ["critère inconnu"],
      note: 0,
    };
  }

  const scores = scoresDeTous(criteres);
  const distribution = distributionDe(scores);
  const cinq = PAYS.filter((p) => scores[p.id] === NB_CRITERES);
  const cible = cinq.length === 1 ? cinq[0].id : null;

  // 1. L'invariant absolu (§6.1). Tout le reste est du réglage ; celui-ci, non.
  if (cinq.length === 0) defauts.push("aucun pays à 5/5");
  if (cinq.length > 1) defauts.push(`${cinq.length} pays à 5/5`);

  // 2. Deux critères de la même famille diraient deux fois la même chose (§5.4).
  const familles = new Set(criteres.map((c) => c.famille));
  if (familles.size < NB_CRITERES) defauts.push("deux critères de la même famille");

  // 2 bis. L'INCLUSION, que la famille ne voit pas.
  //
  // ⚠️ TROUVÉ EN JOUANT, PAS EN RELISANT. La journée des Maldives a servi
  // « l'équateur traverse le pays » ET « le pays est situé entre les deux
  // tropiques » : deux familles différentes, deux libellés différents — et un
  // critère pour rien, puisque tout pays traversé par l'équateur est entre les
  // tropiques. Un critère toujours vrai quand un autre l'est ne discrimine
  // personne : il gonfle le score de la cible sans jamais séparer deux
  // candidats, et le joueur qui découvre les deux à la révélation a le
  // sentiment très juste de s'être fait compter deux fois la même chose.
  //
  // La famille ne pouvait pas l'attraper : elle range par SUJET, et ces deux-là
  // parlent bien de deux choses. C'est l'ensemble des pays qu'il faut comparer.
  for (const a of criteres) {
    for (const b of criteres) {
      if (a === b) continue;
      const paysA = PAYS.filter((p) => a.verifie(p));
      if (paysA.every((p) => b.verifie(p))) defauts.push(`${a.id} est contenu dans ${b.id}`);
    }
  }

  // 3. Un critère trop étroit désigne presque la réponse à lui seul (§6.5).
  for (const c of criteres) {
    const n = cardinal(c);
    if (n < CARDINAL_MIN) defauts.push(`${c.id} ne vaut que pour ${n} pays`);
    if (n > CARDINAL_MAX) defauts.push(`${c.id} vaut pour ${n} pays`);
  }

  // 4. L'étagement éditorial (§5.2) : sans un critère large, tout le monde est
  //    froid dès le premier essai ; sans critère pointu, la journée est molle.
  const paliers = new Set(criteres.map((c) => c.palier));
  if (!paliers.has("large")) defauts.push("aucun critère large");
  if (!paliers.has("signature") && !paliers.has("specifique")) defauts.push("aucun critère spécifique ni signature");

  // 5. La forme du gradient (§6.3).
  const [z, un, deux, trois, quatre] = distribution;
  if (quatre < BORNES.quatreMin) defauts.push(`${quatre} pays à 4/5`);
  if (quatre > BORNES.quatreMax) defauts.push(`${quatre} pays à 4/5`);
  if (trois < BORNES.troisMin) defauts.push(`${trois} pays à 3/5`);
  if (trois > BORNES.troisMax) defauts.push(`${trois} pays à 3/5`);
  if (z + un + deux < BORNES.froidsMin) defauts.push("trop peu de pays froids");

  // 6. Les quasi-solutions, et la variété de leurs échecs (§6.4). Si tous les
  //    4/5 ratent LE MÊME critère, la journée n'est plus un croisement : c'est
  //    un filtre final déguisé, et le joueur le sent.
  const quasi = PAYS.filter((p) => scores[p.id] === NB_CRITERES - 1).map((p) => ({
    pays: p.id,
    manque: criteres.find((c) => !c.verifie(p))!.id,
  }));
  const diversiteQuasi = new Set(quasi.map((q) => q.manque)).size;
  if (quasi.length >= 3 && diversiteQuasi < 2) defauts.push("tous les 4/5 ratent le même critère");

  // 7. LA MARGE DES SEUILS. La population de 2018 n'est pas celle du téléphone
  //    du joueur : si la réponse — ou un poursuivant qui ne rate que ce
  //    critère-là — se tient à moins de 5 % d'un seuil, la journée se joue sur
  //    une donnée périmée. On la jette.
  const aRisque = [
    ...(cible ? [cible] : []),
    ...quasi.filter((q) => CRITERE_PAR_ID[q.manque]?.seuil).map((q) => q.pays),
  ];
  for (const id of aRisque) {
    const p = PAYS.find((x) => x.id === id)!;
    for (const c of criteres) {
      if (!c.seuil) continue;
      const ecart = Math.abs(c.seuil.lecture(p) - c.seuil.valeur) / Math.abs(c.seuil.valeur);
      if (ecart < BORNES.margeSeuil) defauts.push(`${id} est à ${(ecart * 100).toFixed(1)} % du seuil de ${c.id}`);
    }
  }

  return { criteres: ids, cible, distribution, quasi, diversiteQuasi, defauts, note: note(distribution, quasi.length, diversiteQuasi, criteres) };
}

/**
 * Note éditoriale d'une journée VALIDE. Elle ne dit pas « bon / mauvais » — les
 * défauts s'en chargent — mais « laquelle publier d'abord » quand mille
 * combinaisons passent le filtre.
 *
 * Aucune de ces pondérations n'est mesurée : ce sont des paris, à corriger quand
 * les analytics diront ce qu'est vraiment une bonne journée (§6.3, §13).
 */
function note(distribution: number[], nbQuasi: number, diversite: number, criteres: Critere[]): number {
  const [, , , trois, quatre] = distribution;
  // Un 4/5 est le moment le plus satisfaisant du jeu ; trop de 4/5 et la
  // dernière marche devient un tirage au sort. L'optimum est autour de six.
  const pointsQuatre = 25 - Math.min(25, Math.abs(quatre - 6) * 4);
  // Les 3/5 sont la rampe : c'est par eux qu'on remonte.
  const pointsTrois = 20 - Math.min(20, Math.abs(trois - 20));
  // Des quasi-solutions qui échouent pour des raisons DIFFÉRENTES.
  const pointsDiversite = Math.min(20, diversite * 7);
  // Cinq familles, cinq paliers : la journée raconte cinq choses, pas une.
  const pointsPaliers = new Set(criteres.map((c) => c.palier)).size * 5;
  const pointsSignature = criteres.some((c) => c.palier === "signature") ? 15 : 0;
  return Math.max(0, Math.min(100, pointsQuatre + pointsTrois + pointsDiversite + pointsPaliers + pointsSignature + (nbQuasi ? 0 : -30)));
}

// ---------------------------------------------------------------------------
// LE CALENDRIER
// ---------------------------------------------------------------------------
// DATER — délégué à `calendrier.ts`, qui n'importe aucun contenu et peut donc,
// lui, être lu par le navigateur. Réexporté ici pour que le serveur trouve tout
// au même endroit qu'avant.
export { FUSEAU, ORIGINE, dateCivile, numeroDeJournee } from "./calendrier";

// ---------------------------------------------------------------------------
// LES PICTOS — ce qui débloque le joueur qui plafonne, sans lui donner la
// réponse.
//
// LE DÉFAUT TRAITÉ, tel qu'il a été rapporté : « il m'a fallu 156 tentatives ;
// à partir de la 50e, mes conclusions n'ont pas évolué. » Les cinq cases disent
// QUELLES positions deux pays partagent, jamais de quoi elles parlent : passé un
// certain point, le joueur a toutes les cases allumées et reste incapable de les
// interpréter. Le picto lui donne le domaine, pas le critère.
//
// ⚠️ POURQUOI UN COMPTEUR D'ESSAIS, ET PAS « UNE CASE JAMAIS REMPLIE ».
// Ce second déclencheur paraissait plus fin — n'aider que là où le joueur est
// aveugle — mais il ne se déclencherait presque jamais. Probabilité qu'une case
// soit encore éteinte, mesurée sur les 51 journées :
//
//     case            après 10   après 15   après 25
//     1 large            12 %        6 %        2 %
//     3 discriminant     10 %        5 %        2 %
//     5 signature        36 %       24 %       11 %
//
// Passé une quinzaine d'essais tout est allumé. Le blocage n'est donc pas « une
// case reste noire », c'est « les cases sont allumées et je ne sais pas ce
// qu'elles disent » — et seul un compteur simple répond à ça.
//
// ⚠️ LE SEUIL N'EST ÉCRIT NULLE PART AILLEURS, et surtout pas dans le texte
// affiché : `pictosAide` décrit ce que le joueur voit sans citer de nombre. Une
// aide qui annoncerait « après 15 essais » se démentirait au premier réglage,
// dans les quatre langues et sans que rien ne le signale.
export const ESSAIS_AVANT_PICTOS = 15;

/**
 * Les étiquettes montrables après `nbEssais` essais, une par case, dans la
 * langue de l'écran.
 *
 * ⚠️ LA CASE 5 NE PARLE JAMAIS. L'étagère `signature` ne compte que 7 critères :
 * quel que soit le grain, son étiquette laisserait trop peu de candidats. C'est
 * aussi, et surtout, la case qui fait la recherche — 28 % des pays à 4/5 ne
 * ratent qu'elle. La taire est un choix de jeu autant qu'une protection.
 *
 * Le reste de la garde vit dans `cleEtiquette` : elle ne descend jamais sous
 * `SEUIL_ETIQUETTE` critères possibles, donc il n'y a plus de cas particulier à
 * traiter ici. Une case peut rendre `null` — c'est que même la catégorie serait
 * trop précise pour ce palier.
 */
export function pictosDe(
  criteres: Critere[],
  nbEssais: number,
  locale: string,
): ({ picto: string; texte: string } | null)[] {
  if (nbEssais < ESSAIS_AVANT_PICTOS) return criteres.map(() => null);
  return criteres.map((c, k) => (k === criteres.length - 1 ? null : etiquetteDe(c, locale)));
}

// ---------------------------------------------------------------------------
// LE COUP DE POUCE — un pays offert à qui s'enlise vraiment.
//
// LE DÉFAUT TRAITÉ, c'est la SUITE de celui des pictos : « il m'a fallu 156
// tentatives ; à partir de la 50e, mes conclusions n'ont pas évolué. » Les
// étiquettes arrivent bien avant et ne suffisent pas — elles disent de quoi
// parlent quatre critères, pas où chercher. Passé cinquante essais, le joueur
// n'a plus besoin d'un mot, il a besoin d'un FAIT NOUVEAU.
//
// ⚠️ CE QU'ON OFFRE EST UN PAYS, PAS UNE INFORMATION EN PLUS. C'est ce qui rend
// l'aide sûre et lisible : un pays et ses cinq cases, exactement le vocabulaire
// que le joueur manipule depuis cinquante coups. Rien de nouveau à comprendre,
// aucune fuite sur la bibliothèque de critères.
//
// ⚠️ ET IL NE PEUT PAS RÉSOUDRE LA PARTIE : on n'offre qu'un pays à 4/5, donc
// jamais la réponse. Mesuré sur les 51 journées, il en existe de 2 à 10 par
// jour, médiane 6 — en offrir un laisse largement de quoi chercher.
//
// ⚠️ ON PRÉFÈRE UN 4/5 QUI REMPLIT LA CINQUIÈME CASE, et c'est tout l'intérêt.
// La cinquième est celle qui ne parle jamais (l'étagère `signature` est trop
// mince pour l'étiqueter) et c'est elle qui fait la recherche — 28 % des pays à
// 4/5 ne ratent qu'elle. Un pays qui la remplit prouve au joueur qu'elle EST
// atteignable et lui montre un exemple ; un pays qui la rate ne lui apprend
// rien qu'il n'ait déjà vu cinquante fois. Mesuré : les 51 journées en ont au
// moins un, médiane 5.
//
// ⚠️ IL NE COMPTE PAS COMME UN ESSAI. Le classement se fait au nombre d'essais,
// et facturer une aide que le joueur n'a pas demandée serait doublement injuste.
// Le risque de fausser le classement est nul en pratique : elle n'arrive qu'à
// cinquante essais, très loin derrière la médiane du jour.
export const ESSAIS_AVANT_COUP_DE_POUCE = 50;

/** Le pays offert et ses cinq cases, ou `null` s'il est trop tôt. */
export function coupDePouceDe(
  ordonnes: Critere[],
  essayes: string[],
  nbEssais: number,
): { pays: string; cases: number[] } | null {
  if (nbEssais < ESSAIS_AVANT_COUP_DE_POUCE) return null;
  const vus = new Set(essayes);
  // ⚠️ TRIÉ PAR CODE, PAS AU HASARD. Deux appels de suite doivent rendre le même
  // pays : un coup de pouce qui change à chaque essai serait illisible, et un
  // joueur qui recharge la page verrait une aide différente de celle qu'il a
  // notée. Le référentiel est déjà dans un ordre stable, on n'y touche pas.
  const candidats = PAYS.filter((p) => !vus.has(p.id))
    .map((p) => ({ p, score: scoreDe(p, ordonnes), cinq: ordonnes[ordonnes.length - 1].verifie(p) }))
    .filter((x) => x.score < NB_CRITERES);
  if (candidats.length === 0) return null;
  const meilleur = Math.max(...candidats.map((x) => x.score));
  const bons = candidats.filter((x) => x.score === meilleur);
  // Le repli est explicite : si aucun des meilleurs ne remplit la cinquième
  // case, on en offre un quand même — un exemple à 4/5 reste un fait nouveau.
  const choisi = bons.find((x) => x.cinq) ?? bons[0];
  return { pays: choisi.p.id, cases: casesDe(choisi.p, ordonnes) };
}
