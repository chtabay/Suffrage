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
