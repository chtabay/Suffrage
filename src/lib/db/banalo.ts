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
 *  · répondu, foule trop mince    → `repondu: true, assez: false` (aucune note)
 *  · répondu et dépouillé         → `assez: true`, avec la note ; la position
 *    (`rang`, `partMieux`) n'arrive qu'au-delà d'un second plancher.
 */
export interface EtatBanalo {
  repondu: boolean;
  /** Combien ont répondu à cette question, dans cette langue. */
  votants: number;
  /** La note existe : la foule est assez nombreuse pour que la médiane veuille dire quelque chose. */
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
    mediane: nombre(e.mediane),
    facteur: nombre(e.facteur),
    points: nombre(e.points),
    rang: partMieux === null ? null : nombre(e.rang),
    exAequo: partMieux === null ? null : nombre(e.exaequo),
    partMieux,
  };
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
export async function etat(jeton: string, jour: number, langue: string): Promise<EtatBanalo | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_banalo_etat", {
    p_jeton: jeton,
    p_jour: jour,
    p_langue: langue,
  });
  if (error) return null;
  return traduis(data);
}

// ─────────────────────────────────────────────────────── le format « mots »

/** Une case de la grille, avec ce que la foule en a fait. */
export interface CaseBanalo {
  /** Le mot tel que le joueur l'a tapé — jamais la forme normalisée. */
  mot: string;
  /** Combien de joueurs l'ont donné, celui-ci compris. */
  joueurs: number;
  /** La part correspondante, en pourcentage, déjà arrondie par la base. */
  part: number | null;
}

/**
 * L'état d'une journée de mots. Même grammaire que `EtatBanalo` — trois régimes,
 * et l'écran doit savoir dire les trois.
 */
export interface EtatMots {
  repondu: boolean;
  votants: number;
  assez: boolean;
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
}

interface EtatMotsBrut {
  status?: string;
  repondu?: boolean;
  votants?: number;
  assez?: boolean;
  cases?: number;
  grille?: unknown;
  total?: number | null;
  points?: number | null;
  rang?: number | null;
  exaequo?: number | null;
  partmieux?: number | null;
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
        joueurs: nombre(c?.joueurs) ?? 0,
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
    cases: nombre(e.cases) ?? 0,
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
    p_jeton: jeton,
    p_jour: jour,
    p_langue: langue,
    p_theme: theme,
  });
  if (error) return null;
  return traduisMots(data);
}
