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
import { CARDINAL_MAX, CARDINAL_MIN, CRITERE_PAR_ID, cardinal, type Critere } from "@/content/pays/criteres";
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

/**
 * Fuseau produit. Explicite, parce qu'un jeu quotidien SANS fuseau déclaré
 * change de journée au milieu d'une partie pour la moitié de ses joueurs.
 */
export const FUSEAU = "Europe/Paris";

/** Origine du calendrier : la journée n° 1. */
export const ORIGINE = "2026-01-01";

const CIVIL = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSEAU,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * La date CIVILE à Paris, `AAAA-MM-JJ`.
 *
 * On passe par `Intl` plutôt que par un décalage en heures : le décalage de
 * Paris vaut +1 ou +2 selon la saison, et une soustraction fixe fait basculer la
 * journée une heure trop tôt six mois par an.
 */
export function dateCivile(quand: Date = new Date()): string {
  return CIVIL.format(quand);
}

/** Numéro de journée depuis l'origine : 1 le premier jour. */
export function numeroDeJournee(dateIso: string): number {
  const jour = 86_400_000;
  // Minuit UTC des deux dates civiles : la soustraction ne traverse alors aucun
  // changement d'heure, puisqu'il n'y en a pas en UTC.
  const ms = Date.parse(`${dateIso}T00:00:00Z`) - Date.parse(`${ORIGINE}T00:00:00Z`);
  return Math.floor(ms / jour) + 1;
}
