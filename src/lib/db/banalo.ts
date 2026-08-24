// BANALO DU JOUR, VU DE LA BASE — deux appels, et le second suffit à jouer.
//
// Les fonctions d'en face sont `security definer` derrière une table à RLS
// active et SANS policy : il n'existe aucun chemin de lecture directe, pour
// personne. Voir `supabase/migrations/20260820-banalo-du-jour.sql`.
//
// ⚠️ C'EST LA BASE QUI NOTE, PAS L'ÉCRAN. `bareme.ts` sait calculer la même
// chose et sert de spécification exécutable, mais il ne doit jamais servir à
// afficher un score : le navigateur n'a pas les réponses des autres, donc pas la
// médiane. Tout ce que l'écran montre vient de `scrutin_banalo_etat`.
//
// ⚠️ UN ÉCHEC N'EST JAMAIS REPLIÉ SUR UN ÉTAT VIDE. Règle du dépôt : un NULL
// rendu par une RPC est un REFUS, pas une donnée. Rendre `{ repondu: false }`
// sur une panne réseau proposerait de rejouer à quelqu'un qui a déjà répondu —
// et comme le dépôt est définitif, sa seconde réponse serait ignorée en silence
// et il croirait avoir joué un autre nombre. `null` veut dire « on ne sait
// pas », et l'écran doit le dire.
import { createClient } from "@/lib/supabase/client";

/**
 * L'état d'une journée pour un joueur. Trois régimes, et l'écran doit savoir
 * dire les trois — voir l'en-tête de la migration :
 *
 *  · pas encore répondu           → `repondu: false`
 *  · répondu                      → la note est là, à n'importe quel effectif ;
 *    la position (`rang`, `partMieux`) n'arrive qu'au-delà du plancher de 20.
 *
 * ⚠️ `assez` N'EST PLUS UN VERROU, C'EST UNE RÉSERVE. Il valait « il existe une
 * note » et gardait tout l'écran de résultat derrière cinq votants ; il vaut
 * maintenant « cette note s'appuie-t-elle sur assez de monde ? », et l'écran
 * s'en sert pour DIRE, pas pour CACHER — la phrase sous le score, et le choix
 * entre inviter et partager. Voir `20260822-banalo-sans-plancher.sql`.
 */
/**
 * LA RÉPARTITION D'UNE JOURNÉE CLOSE — la bande d'histogramme, prête à dessiner.
 *
 * ⚠️ TOUT EST DÉCIDÉ EN BASE, y compris le nombre de barres et l'index des deux
 * repères. C'est voulu : l'écran ne doit pas pouvoir recalculer une position
 * autrement que la base, sinon le repère « la foule » finirait un jour à côté de
 * la barre qui contient vraiment la médiane.
 */
export interface Repartition {
  /** log₁₀ du bord GAUCHE de la première barre. */
  gauche: number;
  /** Largeur d'une barre, en décades — une fraction : 1/6, 1/3, 1/2 ou 1. */
  pas: number;
  /** L'effectif de chaque barre. Les queues sont repliées dans les barres des bords. */
  seaux: number[];
  /** Index de la barre où tombe ma réponse. */
  mien: number;
  /** Index de la barre où tombe la médiane. */
  foule: number;
}

export interface EtatBanalo {
  repondu: boolean;
  /** Combien ont répondu à cette question, dans cette langue. */
  votants: number;
  /**
   * La foule est assez nombreuse pour que la médiane veuille dire quelque chose.
   * ⚠️ NE COMMANDE PLUS L'EXISTENCE DU SCORE — voir l'en-tête du fichier.
   */
  assez: boolean;
  /** Ma réponse, telle qu'elle est enregistrée. Autorité sur ce que le navigateur croit avoir envoyé. */
  mienne: number | null;
  mediane: number | null;
  /** L'écart en facteur : 2 veut dire « le double ou la moitié ». */
  facteur: number | null;
  points: number | null;
  rang: number | null;
  /** Combien partagent exactement ce score, moi compris. */
  exAequo: number | null;
  /**
   * La part des joueurs qui ont fait strictement mieux, en pourcentage.
   * `null` tant que l'effectif est sous le plancher de position.
   *
   * ⚠️ C'EST ELLE QU'ON MET DEVANT, pas le rang : le rang provisoire empire
   * mécaniquement quand la foule grandit, la part ne bouge pas.
   */
  partMieux: number | null;
  /**
   * La bande de répartition, ou `null` tant que la journée est ouverte.
   *
   * ⚠️ SCELLÉE COMME LA MÉDIANE, et pour une raison plus forte encore : un
   * histogramme montre la bosse, donc la médiane, sans demander le moindre
   * raisonnement. Voir `20260821-banalo-repartition-du-jour.sql`.
   */
  repartition: Repartition | null;
}

/** Le jsonb rendu par la base. Les clés y sont en minuscules — Postgres n'a pas de camelCase. */
interface EtatBrut {
  status?: string;
  repondu?: boolean;
  votants?: number;
  assez?: boolean;
  mienne?: number | null;
  mediane?: number | null;
  facteur?: number | null;
  points?: number | null;
  rang?: number | null;
  exaequo?: number | null;
  partmieux?: number | null;
  repartition?: unknown;
}

/**
 * Le jsonb de la base vers l'état de l'écran.
 *
 * Exporté pour être éprouvé seul : il porte deux règles qui ne se voient pas à
 * la relecture — l'infini sérialisé en chaîne, et le rang qui s'éteint avec la
 * part.
 */
export function traduis(brut: unknown): EtatBanalo | null {
  const e = brut as EtatBrut | null;
  // `status` différent de `ok` = refus (jeton mal formé, langue inconnue,
  // réponse hors bornes). Ce n'est pas un état de jeu, c'est un non.
  if (!e || e.status !== "ok") return null;
  // ⚠️ `facteur` peut valoir l'infini côté Postgres, qui le sérialise en la
  // chaîne « Infinity ». Sans ce filtre, l'écran afficherait « ×Infinity ».
  const nombre = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
  // ⚠️ LE RANG SUIT LA PART, ET NE SURVIT PAS SANS ELLE. La base rend toujours
  // `rang`, mais ne rend `partmieux` qu'au-delà du plancher de position — et
  // c'est précisément là que « 7e sur 8 joueurs » cesse d'être un rang pour
  // devenir du bruit (`VOTANTS_MIN`, dans `bareme.ts`). Vu à l'écran, sur une
  // journée à huit votants : la part disparaissait et le rang restait, c'est-à-
  // dire exactement le chiffre que la règle voulait taire. On l'éteint ICI et
  // pas dans l'écran, pour qu'aucun futur appelant ne puisse le rallumer.
  const partMieux = nombre(e.partmieux);
  return {
    repondu: e.repondu === true,
    votants: nombre(e.votants) ?? 0,
    assez: e.assez === true,
    mienne: nombre(e.mienne),
    repartition: litRepartition(e.repartition),
    mediane: nombre(e.mediane),
    facteur: nombre(e.facteur),
    points: nombre(e.points),
    rang: partMieux === null ? null : nombre(e.rang),
    exAequo: partMieux === null ? null : nombre(e.exaequo),
    partMieux,
  };
}

/**
 * La bande de répartition, ou `null`.
 *
 * ⚠️ ELLE EST REFUSÉE EN BLOC OU ACCEPTÉE EN BLOC. Une bande à qui il manque un
 * repère n'est pas une bande à moitié : elle dessinerait « vous » sur la
 * première barre par défaut, c'est-à-dire un mensonge tranquille. On préfère ne
 * rien montrer — le bloc entier se tait.
 */
function litRepartition(brut: unknown): Repartition | null {
  const r = brut as Partial<Repartition> | null | undefined;
  if (!r || !Array.isArray(r.seaux) || r.seaux.length === 0) return null;
  const seaux = r.seaux.map((v) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : -1));
  if (seaux.some((v) => v < 0)) return null;
  const entier = (v: unknown) =>
    typeof v === "number" && Number.isInteger(v) && v >= 0 && v < seaux.length ? v : null;
  const gauche = typeof r.gauche === "number" && Number.isFinite(r.gauche) ? r.gauche : null;
  const pas = typeof r.pas === "number" && Number.isFinite(r.pas) && r.pas > 0 ? r.pas : null;
  const mien = entier(r.mien);
  const foule = entier(r.foule);
  if (gauche === null || pas === null || mien === null || foule === null) return null;
  return { gauche, pas, seaux, mien, foule };
}

/**
 * La courbe des scores, ou `null`.
 *
 * ⚠️ REFUSÉE EN BLOC, comme la bande de répartition. Une courbe à qui il manque
 * son repère dessinerait « vous » sur la première barre par défaut — un mensonge
 * tranquille, et le genre de défaut qu'aucun joueur ne signalera jamais.
 */
function litCourbe(brut: unknown): Courbe | null {
  const c = brut as Partial<Courbe> | null | undefined;
  if (!c || !Array.isArray(c.seaux) || c.seaux.length === 0) return null;
  const seaux = c.seaux.map((v) => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : -1));
  if (seaux.some((v) => v < 0)) return null;
  const fini = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const bas = fini(c.bas);
  const haut = fini(c.haut);
  const mien =
    typeof c.mien === "number" && Number.isInteger(c.mien) && c.mien >= 0 && c.mien < seaux.length
      ? c.mien
      : null;
  if (bas === null || haut === null || mien === null || haut < bas) return null;
  return { bas, haut, seaux, mien };
}

/**
 * Dépose une réponse et rend l'état qui en découle, en un seul aller-retour.
 *
 * ⚠️ LE DÉPÔT EST DÉFINITIF, ET LA BASE FAIT FOI. Un second appel n'écrase rien
 * (`on conflict do nothing`) : il rend l'état de la PREMIÈRE réponse. Ce n'est
 * pas une commodité, c'est la règle du jeu — sans elle, on répondrait n'importe
 * quoi, on lirait la médiane rendue, et on la redéposerait pour marquer 10 tous
 * les jours. L'écran doit donc afficher `mienne` tel que rendu, jamais le nombre
 * que le joueur vient de taper.
 */
export async function repond(
  jeton: string,
  jour: number,
  langue: string,
  reponse: number,
): Promise<EtatBanalo | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_banalo_repondre", {
    p_jeton: jeton,
    p_jour: jour,
    p_langue: langue,
    p_reponse: reponse,
  });
  if (error) return null;
  return traduis(data);
}

/**
 * L'état d'une journée sans rien déposer.
 *
 * Sert au retour sur la page — « j'ai déjà joué, où en est le dépouillement ? »
 * — et à la relecture de la veille : la note d'un joueur bouge encore tant que
 * la journée est ouverte, puisque la médiane bouge.
 */

/**
 * LE JETON SOUS LEQUEL CE JOUEUR A JOUÉ CETTE JOURNÉE — pas forcément celui de
 * ce navigateur.
 *
 * ⚠️ SANS ÇA, UN SECOND APPAREIL ANNONCE « vous n'avez pas encore joué ».
 * Signalé par un joueur qui s'était connecté ailleurs avec le même compte : les
 * fonctions d'état ne connaissent que le jeton, qui est propre au navigateur.
 * La base sait résoudre (`scrutin_banalo_mon_jeton`) ; encore faut-il le lui
 * demander.
 *
 * ⚠️ ON NE LA DEMANDE QUE S'IL Y A UNE SESSION, et la lecture est LOCALE
 * (`getSession` lit le cookie, sans réseau) : un joueur sans compte ne paie
 * donc aucun aller-retour de plus, et c'est l'immense majorité.
 *
 * ⚠️ ET LE RÉSULTAT EST GARDÉ POUR LA VIE DE LA PAGE. `etat` est rappelée après
 * chaque dépôt et à chaque relecture de la veille ; résoudre à chaque fois
 * doublerait le trafic de l'écran pour une réponse qui ne change pas.
 */
const jetonsResolus = new Map<string, string>();

async function jetonDeLaJournee(jeton: string, jour: number, langue: string): Promise<string> {
  const cle = `${jeton}|${jour}|${langue}`;
  const garde = jetonsResolus.get(cle);
  if (garde) return garde;
  const supabase = createClient();
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return jeton;
  const { data, error } = await supabase.rpc("scrutin_banalo_mon_jeton", {
    p_jeton: jeton,
    p_jour: jour,
    p_langue: langue,
  });
  // ⚠️ UNE PANNE RETOMBE SUR LE JETON LOCAL. Rendre `null` ferait disparaître
  // la partie de quelqu'un qui joue ici et maintenant, pour réparer le cas d'un
  // second appareil — on casserait le cas courant pour soigner le rare.
  const resolu = !error && typeof data === "string" && data.length > 0 ? data : jeton;
  jetonsResolus.set(cle, resolu);
  return resolu;
}

export async function etat(jeton: string, jour: number, langue: string): Promise<EtatBanalo | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_banalo_etat", {
    p_jeton: await jetonDeLaJournee(jeton, jour, langue),
    p_jour: jour,
    p_langue: langue,
  });
  if (error) return null;
  return traduis(data);
}

// ─────────────────────────────────────────────────────── le format « mots »

/**
 * Une case de la grille, avec ce que la foule en a fait.
 *
 * ⚠️ ELLE DIT TOUT DÈS LE DÉPÔT, comme le dépouillement du jeu de groupe — le
 * scellement des parts est tombé (`20260822-banalo-mots-eval-immediate.sql`).
 * Ce qui n'a jamais été rendu, et ne le sera pas, c'est le mot d'un AUTRE
 * joueur : la grille est bâtie sur `where jeton = moi`, elle est
 * structurellement incapable d'en porter un.
 *
 * ⚠️ `joueurs` COMPTE LE JOUEUR LUI-MÊME, donc `1` veut dire « personne d'autre
 * ne l'a écrit ». C'est cette valeur, et jamais `part`, qui dit l'orphelin :
 * la part vaut 50 % à deux votants et 0,0 % à dix mille, pour le même mot
 * partagé par personne.
 */
export interface CaseBanalo {
  /** Le mot tel que le joueur l'a tapé — jamais la forme normalisée. */
  mot: string;
  /** Combien de joueurs l'ont donné, CELUI-CI COMPRIS — donc `1` = personne d'autre. */
  joueurs: number | null;
  /** La part correspondante, en pourcentage, déjà arrondie par la base. */
  part: number | null;
}

/**
 * LA COURBE DES SCORES — où se posent les JOUEURS, et où l'on est dedans.
 *
 * ⚠️ CE N'EST PAS UN DOUBLON DU CENTILE, ET C'EST MESURÉ. Un centile est un
 * RANG : il est uniforme par construction, donc il ne peut pas dire si la foule
 * s'est serrée. Simulé à 3 000 joueurs, la même courbe prend deux formes
 * inverses selon la nature du thème — bosse en haut sur un thème serré, bosse en
 * bas sur un thème ouvert. Deux joueurs au 50e centile de ces deux journées ne
 * sont pas dans la même situation, et seule la densité le montre.
 *
 * ⚠️ ET ELLE NE PARLE QUE DU FORMAT « MOTS ». Côté chiffré, le score est
 * `100 − 100·log₁₀(facteur)` et le facteur est le rapport à la médiane : un
 * histogramme des scores y serait celui des réponses REPLIÉ sur la médiane,
 * c'est-à-dire `RepartitionDuJour` en moins riche.
 */
export interface Courbe {
  /** Le plus petit score de la journée — le bord gauche de la première barre. */
  bas: number;
  /** Le plus grand — le bord droit de la dernière. */
  haut: number;
  /** Combien de joueurs dans chaque barre. La somme fait le nombre de votants. */
  seaux: number[];
  /** Index de la barre où je tombe. Calculé EN BASE, jamais ici. */
  mien: number;
}

/**
 * LA FORME D'UNE JOURNÉE DE MOTS — la foule s'est-elle serrée, ou éparpillée ?
 *
 * ⚠️ LES BARRES DES AUTRES SONT MUETTES : on rend leur hauteur, jamais leur
 * libellé. Nommer les mots les plus donnés reviendrait à diffuser du texte libre
 * écrit par des joueurs à tous les autres — voir
 * `20260822-banalo-mots-concentration.sql`. Les mots du JOUEUR, eux, portent
 * leur nom : il les a déjà sous les yeux dans la grille juste au-dessus.
 */
export interface Concentration {
  /** Les dix premiers mots de la journée, du plus donné au moins donné. */
  barres: { part: number; mien: boolean; mot: string | null }[];
  /** Combien de mots distincts la journée a produits. */
  distincts: number;
  /** Quelle part de toutes les réponses les `cases` premiers mots représentent. */
  couverture: number | null;
  cases: number;
}

/**
 * L'état d'une journée de mots. Même grammaire que `EtatBanalo` — trois régimes,
 * et l'écran doit savoir dire les trois.
 */
export interface EtatMots {
  repondu: boolean;
  votants: number;
  /** Même métier que sur `EtatBanalo` : une réserve à afficher, pas un verrou. */
  assez: boolean;
  /** La distribution des scores du jour, avec l'index de ma barre. */
  courbe: Courbe | null;
  /** Le nombre de cases de la journée, lu en base et non chez le client. */
  cases: number;
  grille: CaseBanalo[];
  /**
   * La somme des effectifs de mes réponses. C'EST LA VALEUR QUI CLASSE, et elle
   * est entière : deux joueurs sont ex aequo si et seulement si leurs totaux
   * sont exactement égaux. Aucun arrondi n'intervient.
   */
  total: number | null;
  /**
   * Le score affiché : la part MOYENNE des joueurs qui ont donné les mêmes
   * réponses. « 51,3 » veut dire « en moyenne, 51,3 % des joueurs ont écrit ce
   * que vous avez écrit » — une phrase, pas un réglage.
   */
  points: number | null;
  rang: number | null;
  exAequo: number | null;
  partMieux: number | null;
  /** La forme de la journée, ou `null` tant qu'elle est ouverte. */
  concentration: Concentration | null;
}

interface EtatMotsBrut {
  status?: string;
  repondu?: boolean;
  votants?: number;
  assez?: boolean;
  courbe?: unknown;
  cases?: number;
  grille?: unknown;
  total?: number | null;
  points?: number | null;
  rang?: number | null;
  exaequo?: number | null;
  partmieux?: number | null;
  concentration?: unknown;
}

/**
 * La forme de la journée, ou `null`.
 *
 * ⚠️ REFUSÉE EN BLOC, comme la bande des nombres : une barre sans hauteur
 * dessinerait un vide au milieu d'un diagramme, et le joueur lirait une panne
 * là où il n'y a qu'une donnée manquante.
 */
function litConcentration(brut: unknown): Concentration | null {
  const c = brut as Partial<Concentration> | null | undefined;
  if (!c || !Array.isArray(c.barres) || c.barres.length === 0) return null;
  const barres = c.barres.map((b) => ({
    part: typeof b?.part === "number" && Number.isFinite(b.part) ? b.part : -1,
    mien: b?.mien === true,
    // ⚠️ ON N'ACCEPTE UN LIBELLÉ QUE SUR UNE BARRE À SOI. Si la base en rendait
    // un ailleurs — régression, main mal assurée — l'écran ne l'affichera pas.
    mot: b?.mien === true && typeof b?.mot === "string" ? b.mot : null,
  }));
  if (barres.some((b) => b.part < 0)) return null;
  const cases = typeof c.cases === "number" && Number.isInteger(c.cases) && c.cases > 0 ? c.cases : null;
  if (cases === null) return null;
  return {
    barres,
    distincts: typeof c.distincts === "number" && Number.isFinite(c.distincts) ? c.distincts : 0,
    couverture: typeof c.couverture === "number" && Number.isFinite(c.couverture) ? c.couverture : null,
    cases,
  };
}

/** Exporté pour être éprouvé seul, comme `traduis` : il porte la même règle du
 *  rang qui s'éteint avec la part, et elle ne se voit pas à la relecture. */
export function traduisMots(brut: unknown): EtatMots | null {
  const e = brut as EtatMotsBrut | null;
  if (!e || e.status !== "ok") return null;
  const nombre = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const grille: CaseBanalo[] = Array.isArray(e.grille)
    ? (e.grille as Record<string, unknown>[]).map((c) => ({
        mot: typeof c?.mot === "string" ? c.mot : "",
        // ⚠️ PAS DE `?? 0` ICI. « 0 joueur a écrit ce mot » et « on ne vous le
        // dira pas encore » ne sont pas la même chose, et le premier est faux :
        // le joueur l'a écrit, donc l'effectif vaut au moins un.
        joueurs: nombre(c?.joueurs),
        part: nombre(c?.part),
      }))
    : [];
  // ⚠️ MÊME RÈGLE QUE POUR LE FORMAT CHIFFRÉ : le rang s'éteint avec la part.
  // La base rend toujours `rang`, mais ne rend `partmieux` qu'au-delà du
  // plancher de position — et c'est là que « 7e sur 8 » cesse d'être un rang
  // pour devenir du bruit.
  const partMieux = nombre(e.partmieux);
  return {
    repondu: e.repondu === true,
    votants: nombre(e.votants) ?? 0,
    assez: e.assez === true,
    courbe: litCourbe(e.courbe),
    cases: nombre(e.cases) ?? 0,
    concentration: litConcentration(e.concentration),
    grille,
    total: nombre(e.total),
    points: nombre(e.points),
    rang: partMieux === null ? null : nombre(e.rang),
    exAequo: partMieux === null ? null : nombre(e.exaequo),
    partMieux,
  };
}

/**
 * Dépose une grille et rend l'état qui en découle.
 *
 * ⚠️ LE DÉPÔT EST DÉFINITIF, ET LA GARDE EST CÔTÉ BASE. Un second appel ne
 * complète rien : voir `20260820-banalo-mots-depot-unique.sql`, où la première
 * version laissait des trous de rang qu'un second envoi venait remplir après
 * avoir lu les parts. L'écran doit donc afficher la grille RENDUE, jamais celle
 * que le joueur vient de taper.
 *
 * ⚠️ `secondes` EST MESURÉ ET NE CLASSE RIEN. Même posture que Cinq sur cinq,
 * qui stocke `secondes` et classe sur les essais. On saura sur données réelles
 * si le temps sépare quelque chose ; en attendant il ne décide de rien.
 */
export async function repondMots(
  jeton: string,
  jour: number,
  langue: string,
  theme: string,
  mots: string[],
  secondes?: number,
): Promise<EtatMots | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_banalo_mots_repondre", {
    p_jeton: jeton,
    p_jour: jour,
    p_langue: langue,
    p_theme: theme,
    p_mots: mots,
    p_secondes: Number.isFinite(secondes) ? Math.round(secondes as number) : null,
  });
  if (error) return null;
  return traduisMots(data);
}

/** L'état d'une journée de mots sans rien déposer. */
export async function etatMots(
  jeton: string,
  jour: number,
  langue: string,
  theme: string,
): Promise<EtatMots | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_banalo_mots_etat", {
    p_jeton: await jetonDeLaJournee(jeton, jour, langue),
    p_jour: jour,
    p_langue: langue,
    p_theme: theme,
  });
  if (error) return null;
  return traduisMots(data);
}

// ──────────────────────────────────────────────────── le tableau du jour

/**
 * Une ligne du tableau : un nom et un score, jamais un mot.
 *
 * ⚠️ `index` ET `nom` SONT EXCLUSIFS, et c'est la règle du jeu : un nom pris dans
 * la liste PROPOSÉE se stocke par son index — c'est ce qui le garde TRADUIT pour
 * les autres lecteurs du tableau — là où un nom écrit est figé dans sa langue
 * (`nom`). La base le tient par une contrainte, pas par du code d'écran.
 *
 * ⚠️ LE TEXTE LIBRE N'EXIGE PLUS DE COMPTE depuis le 24/08
 * (`20260913-jeux-nom-libre-sans-compte.sql`) : les joueurs refusaient les noms
 * tout faits et ne figuraient nulle part. Un nom écrit sans compte ne vaut que
 * pour sa journée ; avec un compte, c'est le pseudo du compte qui nomme, résolu
 * à la lecture, et `nom` reste vide.
 */
export interface LigneTableau {
  /** Le rang du nom dans la liste proposée, ou `null` si le nom a été écrit. */
  index: number | null;
  /** Le nom écrit, ou `null` si le nom vient de la liste — ou d'un pseudo de compte. */
  nom: string | null;
  score: number;
  moi: boolean;
}

export interface Tableau {
  /** Combien de joueurs ont déposé un nom aujourd'hui. */
  inscrits: number;
  /**
   * Ce joueur a-t-il déposé un nom ?
   *
   * ⚠️ ÇA NE SE DÉDUIT PAS DES LIGNES, et c'est pour ça que la base le rend à
   * part. Sous le plancher de deux inscrits la liste est vide : le SEUL inscrit
   * de la journée serait indiscernable de quelqu'un qui n'a rien déposé, on lui
   * reproposerait le formulaire et la base répondrait « deja » à un joueur qui
   * n'a rien demandé.
   */
  inscrit: boolean;
  /**
   * Mon pseudo de compte a été retiré par un modérateur : je suis inscrit mais
   * ma ligne n'apparaît plus.
   *
   * ⚠️ IL EST RENDU À PART POUR LA MÊME RAISON QUE `inscrit` : sans lui, le
   * joueur se voit inscrit et absent de la liste, sans un mot — et une
   * information absente sans phrase se lit comme une panne.
   */
  bloque: boolean;
  /** La tête de liste, ordonnée par score (dix lignes — voir la migration). */
  lignes: LigneTableau[];
  /**
   * Ma ligne, SI je suis inscrit mais hors de la tête de liste.
   *
   * ⚠️ Un tableau où l'on ne se trouve pas est un tableau qui parle des autres.
   */
  moi: (Omit<LigneTableau, "moi"> & { place: number }) | null;
}

/** Une ligne est acceptée en bloc, ou jetée. Une ligne à moitié ne se dessine pas. */
function litLigne(brut: unknown): LigneTableau | null {
  const l = brut as Record<string, unknown> | null;
  if (!l) return null;
  const index = typeof l.index === "number" && Number.isInteger(l.index) && l.index >= 0 ? l.index : null;
  const nom = typeof l.nom === "string" && l.nom.trim().length > 0 ? l.nom : null;
  const score = typeof l.score === "number" && Number.isFinite(l.score) ? l.score : null;
  // ⚠️ EXACTEMENT L'UN DES DEUX. Une ligne qui porterait les deux, ou aucun,
  // vient d'une base abîmée : on la jette plutôt que d'inventer un nom.
  if (score === null || (index === null) === (nom === null)) return null;
  return { index, nom, score, moi: l.moi === true };
}

export function litTableau(brut: unknown): Tableau | null {
  const t = brut as Record<string, unknown> | null;
  if (!t || t.status !== "ok") return null;
  const brutes = Array.isArray(t.lignes) ? t.lignes : [];
  const lignes = brutes.map(litLigne).filter((l): l is LigneTableau => l !== null);
  // Une seule ligne abîmée ne doit pas emporter le tableau entier : contrairement
  // à une bande dessinée, une liste amputée d'une ligne reste lisible et vraie.
  const m = litLigne(t.moi);
  const place = (t.moi as Record<string, unknown> | null)?.place;
  return {
    inscrits: typeof t.inscrits === "number" ? t.inscrits : 0,
    inscrit: t.inscrit === true,
    bloque: t.bloque === true,
    lignes,
    moi:
      m && typeof place === "number" && Number.isInteger(place)
        ? { index: m.index, nom: m.nom, score: m.score, place }
        : null,
  };
}

export async function litTableauDuJour(
  jeton: string,
  jour: number,
  langue: string,
  theme: string | null,
  /**
   * À partir de combien d'inscrits la base rend ses lignes.
   *
   * ⚠️ DEUX PAR DÉFAUT, ET UN SEUL POUR UNE JOURNÉE CLOSE. Sur la journée en
   * cours, une liste d'une ligne est une RÉCOMPENSE servie à quelqu'un qui n'a
   * battu personne — le « 1er sur 1 » que le produit refuse partout. Sur une
   * journée arrêtée c'est un RELEVÉ : « voilà qui figurait ce jour-là ». Un
   * relevé d'une ligne est court, il n'est pas faux, et le taire laisse un
   * silence que le joueur lit comme une panne.
   */
  min?: number,
): Promise<Tableau | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_banalo_tableau", {
    // ⚠️ LE JETON RÉSOLU, COMME POUR L'ÉTAT. `20260910` avait posé la règle « le
    // jeton se résout avant tout le reste » et ne l'avait appliquée qu'aux deux
    // fonctions d'état ; le NOM était resté sur le jeton brut. Sur un second
    // appareil, ma ligne cessait donc d'être la mienne — `moi` comparait un
    // jeton qui n'avait jamais répondu.
    p_jeton: await jetonDeLaJournee(jeton, jour, langue),
    p_jour: jour,
    p_langue: langue,
    p_theme: theme,
    p_min: min,
  });
  if (error) return null;
  return litTableau(data);
}

/**
 * Le résultat d'un dépôt de nom, tel que la base le rend.
 *
 * `pris` : quelqu'un porte déjà ce nom aujourd'hui. `deja` : ce joueur a déjà
 * déposé.
 *
 * ⚠️ `compte` NE PEUT PLUS ARRIVER SUR CES CHEMINS depuis le 24/08 : il disait
 * « du texte libre sans compte », qui était LA règle et ne l'est plus. Le
 * vocabulaire est gardé — la base peut encore le rendre ailleurs — et l'écran le
 * replie sur « panne », faute d'avoir quoi que ce soit d'utile à en dire.
 */
/**
 * ⚠️ LE VOCABULAIRE EST CELUI DU PSEUDO DE COMPTE, parce que le dépôt passe
 * maintenant par lui. `bloque` : un modérateur a retiré ce pseudo. `pseudo` : le
 * compte n'en a pas et rien n'a été proposé. `court`/`long`/`pris` : les bornes
 * du pseudo, appliquées ici aussi — il n'y a plus deux règlements pour la même
 * chose.
 */
export type DepotNom =
  | "ok"
  | "pris"
  | "deja"
  | "compte"
  | "bloque"
  | "pseudo"
  | "court"
  | "long"
  | "refus"
  | "panne";

export async function deposerNom(
  jeton: string,
  jour: number,
  langue: string,
  choix: ChoixDeNom,
): Promise<DepotNom> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_banalo_nom_deposer", {
    // ⚠️ ET SURTOUT AU DÉPÔT : c'est lui qui FABRIQUAIT le défaut. L'inscription
    // d'office se déclenche au rendu de l'après-partie ; sur un second appareil
    // — où l'écran s'affiche parce que l'état suit le compte — elle déposait un
    // nom sous le jeton BRUT de cet appareil, qui n'a aucune réponse. La journée
    // portait alors deux lignes pour un compte, dont une invisible au tableau,
    // et l'effectif comptait les deux.
    p_jeton: await jetonDeLaJournee(jeton, jour, langue),
    p_jour: jour,
    p_langue: langue,
    ...nomEnArgs(choix),
  });
  // ⚠️ UNE PANNE N'EST PAS UN REFUS. Replier l'erreur réseau sur « refus »
  // ferait croire au joueur que son nom a été jugé, alors que rien n'est parti.
  if (error) return "panne";
  const s = (data as Record<string, unknown> | null)?.status;
  return s === "ok" || s === "pris" || s === "deja" || s === "compte" ||
    s === "bloque" || s === "pseudo" || s === "court" || s === "long"
    ? s
    : "refus";
}

// ──────────────────────────────────────────────────────────── la tablée

/**
 * UN MEMBRE D'UNE TABLÉE, POUR LA JOURNÉE EN COURS.
 *
 * ⚠️ `joue` ET `score` NE DISENT PAS LA MÊME CHOSE, et il faut les deux. Un
 * membre qui a joué dans une AUTRE langue a bien joué — mais sa foule n'est pas
 * la mienne, donc son score ne se compare pas au mien et la base ne le rend pas.
 * Replier ce cas sur « n'a pas joué » serait mentir sur quelqu'un qui a joué.
 */
export interface MembreTablee {
  /** Le rang du nom dans le vocabulaire fermé, ou `null` si le nom est libre. */
  index: number | null;
  /** Le nom libre d'un membre connecté, ou `null` si le nom vient de la liste. */
  nom: string | null;
  joue: boolean;
  /** Son résultat, dans MA foule. `null` s'il a joué ailleurs, ou si je n'ai pas joué. */
  score: number | null;
  moi: boolean;
}

export interface Tablee {
  code: string;
  membres: MembreTablee[];
}

/** Une ligne à moitié ne se dessine pas — même règle que le tableau du jour. */
function litMembre(brut: unknown): MembreTablee | null {
  const m = brut as Record<string, unknown> | null;
  if (!m) return null;
  const index = typeof m.index === "number" && Number.isInteger(m.index) && m.index >= 0 ? m.index : null;
  const nom = typeof m.nom === "string" && m.nom.trim().length > 0 ? m.nom : null;
  // ⚠️ EXACTEMENT L'UN DES DEUX : une ligne qui porterait les deux, ou aucun,
  // vient d'une base abîmée. On la jette plutôt que d'inventer un nom.
  if ((index === null) === (nom === null)) return null;
  return {
    index,
    nom,
    joue: m.joue === true,
    // ⚠️ PAS DE `?? 0`. « 0 » est un score réel — celui de qui n'a rien partagé —
    // et l'afficher pour quelqu'un dont on ignore le résultat serait une accusation.
    score: typeof m.score === "number" && Number.isFinite(m.score) ? m.score : null,
    moi: m.moi === true,
  };
}

export function litTablees(brut: unknown): Tablee[] | null {
  const d = brut as Record<string, unknown> | null;
  if (!d || d.status !== "ok" || !Array.isArray(d.tablees)) return null;
  return (d.tablees as Record<string, unknown>[])
    .map((t) => {
      const code = typeof t.code === "string" ? t.code : null;
      const bruts = Array.isArray(t.membres) ? t.membres : [];
      const membres = bruts.map(litMembre).filter((m): m is MembreTablee => m !== null);
      return code && membres.length > 0 ? { code, membres } : null;
    })
    .filter((t): t is Tablee => t !== null);
}

/**
 * Mes tablées, pour la journée en cours.
 *
 * ⚠️ LA GARDE ANTI-ANCRAGE EST EN BASE, PAS ICI. Tant que je n'ai pas répondu,
 * la fonction d'en face ne rend AUCUN score — seulement qui a joué. Le §5 de
 * `docs/regularite-des-joueurs.md` l'avait posé pour la comparaison : le score
 * d'un ami ne divulgue rien, mais il ancre et met une pression que le jeu ne
 * demande pas.
 */
export async function mesTablees(
  jeton: string,
  jour: number,
  langue: string,
  theme: string | null,
): Promise<Tablee[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_banalo_tablee_du_jour", {
    p_jeton: jeton,
    p_jour: jour,
    p_langue: langue,
    p_theme: theme,
  });
  if (error) return null;
  return litTablees(data);
}

/**
 * Ce qu'un nom peut être.
 *
 * `index` : pris dans la liste fermée — le seul chemin sans compte.
 * `compte` : le pseudo du compte, que la base résout elle-même. AUCUN libellé ne
 *   part d'ici, et c'est ce qui fait qu'un pseudo changé — ou retiré par la
 *   Régie — se répercute sur toutes les journées sans réécrire une ligne.
 * `nom` : le premier pseudo d'un compte qui n'en a pas encore. Il n'est pas
 *   stocké avec la journée : il DEVIENT le pseudo du compte.
 */
export type ChoixDeNom = { index: number } | { compte: true } | { nom: string };

const nomEnArgs = (choix: ChoixDeNom) => ({
  p_index: "index" in choix ? choix.index : null,
  p_nom: "nom" in choix ? choix.nom : null,
});

/** Même vocabulaire que `DepotNom` : le nom passe par le pseudo de compte. */
export type SouciDeNom = "compte" | "bloque" | "pseudo" | "court" | "long" | "pris";

export type CreationTablee =
  | { status: "ok"; code: string }
  | { status: SouciDeNom | "trop" | "refus" | "panne" };

export async function creerTablee(jeton: string, choix: ChoixDeNom): Promise<CreationTablee> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_banalo_tablee_creer", {
    p_jeton: jeton,
    ...nomEnArgs(choix),
  });
  // ⚠️ UNE PANNE N'EST PAS UN REFUS : rien n'est parti, et le dire autrement
  // ferait croire au joueur que sa tablée a été jugée.
  if (error) return { status: "panne" };
  const d = data as Record<string, unknown> | null;
  const s = d?.status;
  if (s === "ok" && typeof d?.code === "string") return { status: "ok", code: d.code };
  return {
    status:
      s === "compte" || s === "trop" || s === "bloque" || s === "pseudo" ||
      s === "court" || s === "long" || s === "pris"
        ? s
        : "refus",
  };
}

export type EntreeTablee = "ok" | "deja" | SouciDeNom | "inconnue" | "pleine" | "refus" | "panne";

export async function rejoindreTablee(
  jeton: string,
  code: string,
  choix: ChoixDeNom,
): Promise<EntreeTablee> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_banalo_tablee_rejoindre", {
    p_jeton: jeton,
    p_code: code,
    ...nomEnArgs(choix),
  });
  if (error) return "panne";
  const s = (data as Record<string, unknown> | null)?.status;
  return s === "ok" || s === "pris" || s === "deja" || s === "compte" || s === "inconnue" ||
    s === "pleine" || s === "bloque" || s === "pseudo" || s === "court" || s === "long"
    ? s
    : "refus";
}

// ────────────────────────────────────────────────────────── le compte

/**
 * Ce qu'un compte garde, et que le navigateur ne sait pas faire.
 *
 * ⚠️ LE RÉSUMÉ EST EN CENTILES, PLUS EN POINTS. Le score sur 100 n'est pas
 * comparable d'un format à l'autre : mesuré à 3 000 joueurs, son maximum
 * ATTEIGNABLE vaut 67,8 sur un thème serré et 13,7 sur un thème ouvert, donc
 * « moyenne : 35 » mélangeait des journées où 35 était hors d'atteinte par le
 * haut et d'autres où c'était médiocre. Le centile, lui, est un rang : il veut
 * dire la même chose tous les jours. Voir `20260824-banalo-historique.sql`.
 *
 * ⚠️ ET LE MEILLEUR CENTILE EST LE PLUS PETIT — c'est le pourcentage de joueurs
 * qui ont fait MIEUX. Zéro veut dire premier de la journée.
 */
export interface BilanBanalo {
  parties: number;
  centileMoyen: number | null;
  centileMeilleur: number | null;
  serie: number;
  /** Numéro de la dernière journée de la série : l'écran seul sait si elle est vivante. */
  serieFin: number | null;
}

/**
 * LA DERNIÈRE JOURNÉE CLOSE QUE CE NAVIGATEUR A JOUÉE, ou `null`.
 *
 * ⚠️ « CLOSE », PAS « DERNIÈRE JOUÉE » : `maSerie` rend déjà le plus grand jour
 * joué, mais s'en servir ferait disparaître le résultat arrêté pour quelqu'un
 * qui vient de jouer aujourd'hui alors qu'il avait joué la veille. D'où
 * `avant`, et d'où une fonction à part.
 *
 * ⚠️ ET C'EST CE QUI TIENT LIEU DE NOTIFICATION. Le jeu ne prévient personne —
 * `docs/regularite-des-joueurs.md` §7 a écarté le RAPPEL quotidien par écrit, et
 * rien n'a encore été construit du côté du §6 — donc le jeu GARDE le résultat
 * arrêté et le rend quand le joueur revient, le lendemain ou
 * trois semaines plus tard. Le jour rendu a forcément encore ses réponses,
 * puisque la fonction lit les tables qui se purgent.
 */
export async function derniereJourneeClose(jeton: string, avant: number): Promise<number | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_banalo_derniere", {
    p_jeton: jeton,
    p_avant: avant,
  });
  if (error) return null;
  const j = (data as Record<string, unknown> | null)?.jour;
  return typeof j === "number" && Number.isInteger(j) && j >= 1 ? j : null;
}

/**
 * La série d'un navigateur, SANS COMPTE.
 *
 * ⚠️ ELLE VIENT DU SERVEUR ICI, ALORS QUE CELLE DE CINQ SUR CINQ VIT DANS LE
 * `localStorage`. Ce n'est pas une divergence de style : là-bas la partie ne
 * quitte jamais le navigateur tant qu'on ne se connecte pas, donc le serveur ne
 * sait rien. Ici les réponses sont déjà en base sous le jeton anonyme — les
 * redemander au navigateur serait garder deux vérités pour une seule donnée,
 * et c'est toujours la copie qui finit par mentir.
 */
export async function maSerie(jeton: string): Promise<{ jours: number; fin: number | null } | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_banalo_serie", { p_jeton: jeton });
  if (error || !data) return null;
  const d = data as { jours?: number; fin?: number | null };
  return { jours: Number(d.jours) || 0, fin: typeof d.fin === "number" ? d.fin : null };
}

/**
 * La série est-elle ENCORE VIVANTE aujourd'hui ?
 *
 * ⚠️ LA BASE NE PEUT PAS RÉPONDRE À ÇA, et c'est délibéré : elle ne connaît ni
 * le fuseau du joueur ni la charnière de 11 h 30. Elle rend donc la dernière
 * journée de la suite, et c'est l'écran — qui sait quel jour on est — qui décide.
 * Hier est admis parce que la journée d'aujourd'hui n'est pas encore jouée quand
 * on ouvre la page.
 */
export function serieVivante(serie: { jours: number; fin: number | null } | null, jourActuel: number): number {
  if (!serie || serie.fin === null) return 0;
  return serie.fin === jourActuel || serie.fin === jourActuel - 1 ? serie.jours : 0;
}

/**
 * Range les résultats de ce navigateur sur le compte connecté.
 *
 * ⚠️ AUCUN SCORE NE PART D'ICI, contrairement à `enregistreResultats` de Cinq
 * sur cinq qui envoie un lot calculé dans le navigateur. On envoie le JETON, et
 * le serveur recalcule tout avec les mêmes fonctions que l'écran. Personne ne
 * peut s'inventer un palmarès.
 *
 * Idempotente : à appeler à chaque connexion sans se demander si c'est déjà fait.
 */
export async function rattache(jeton: string): Promise<number | null> {
  const supabase = createClient();
  // ⚠️ ON MARQUE LES RÉPONSES AVANT DE LES RÉSUMER. `rattacher` lit le jeton
  // pour écrire un résumé de compte, mais ne touchait jamais les lignes de
  // réponse : elles restaient anonymes, donc invisibles depuis un autre
  // appareil. `adopter` leur pose le compte — c'est exact, pas déduit, puisque
  // c'est le navigateur qui a joué qui le demande.
  await supabase.rpc("scrutin_banalo_adopter", { p_jeton: jeton });
  const { data, error } = await supabase.rpc("scrutin_banalo_rattacher", { p_jeton: jeton });
  if (error) return null;
  return typeof data === "number" ? data : null;
}

/**
 * UNE JOURNÉE DE MON HISTORIQUE.
 *
 * ⚠️ NI MOT NI RÉPONSE N'EN FONT PARTIE, et le LIBELLÉ non plus : le thème ou
 * la question se calculent dans le navigateur avec `programmeDe(jour)`, dans la
 * langue de l'écran. Les faire descendre de la base doublerait une source de
 * vérité, et les rendrait dans la langue où la journée a été jouée.
 */
export interface JourneeJouee {
  jour: number;
  format: "nombre" | "mots";
  langue: string;
  /** Le score sur 100 tel que la base le garde — montré seulement en chiffré. */
  points: number | null;
  /** Le pourcentage de joueurs qui ont fait mieux. `null` sous le plancher de position. */
  mieux: number | null;
}

/**
 * Mon historique, ou `null` si l'appel a été refusé.
 *
 * ⚠️ IL SURVIT À LA PURGE DES RÉPONSES : `scrutin_banalo_results` n'est purgée
 * par rien, et c'est exactement ce qu'un compte apporte — les réponses brutes,
 * elles, s'effacent à trente jours.
 */
export async function monHistoriqueBanalo(): Promise<JourneeJouee[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_banalo_historique");
  if (error) return null;
  const d = data as Record<string, unknown> | null;
  if (!d || d.status !== "ok" || !Array.isArray(d.journees)) return null;
  return (d.journees as Record<string, unknown>[])
    .map((j) => {
      const jour = typeof j.jour === "number" ? j.jour : null;
      const format = j.format === "mots" || j.format === "nombre" ? j.format : null;
      if (jour === null || format === null) return null;
      return {
        jour,
        format,
        langue: typeof j.langue === "string" ? j.langue : "fr",
        // ⚠️ PAS DE `?? 0`. « 0 % ont fait mieux » veut dire premier de la
        // journée : c'est le repli le plus flatteur possible sur une donnée
        // absente, et il tomberait sur toutes les journées jouées seul.
        points: typeof j.points === "number" ? j.points : null,
        mieux: typeof j.mieux === "number" ? j.mieux : null,
      } satisfies JourneeJouee;
    })
    .filter((j): j is JourneeJouee => j !== null);
}

/** Mon bilan, ou `null` si l'appel a été refusé (pas de session, réseau…). */
export async function monBilanBanalo(): Promise<BilanBanalo | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_banalo_moi");
  if (error || !data) return null;
  return data as BilanBanalo;
}
