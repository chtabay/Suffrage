// LA NUIT DU FANTÔME — les types du jeu. Spec : docs/fantome-spec.md.
//
// ⚠️ AUCUNE RÈGLE NE VIT ICI. Les rôles, la donne, la fenêtre de hantise, le
// dépouillement et le score sont ENTIÈREMENT en base (migrations
// 20260814-jeu-fantome-*). Ce fichier TYPE ce que le serveur envoie.

/** Quatre manches. La partie s'arrête plus tôt si le Fantôme est démasqué. */
export const ROUNDS_TOTAL = 4;

/** À moins de cinq, la donne refuse de distribuer : il n'y a pas de foule. */
export const MIN_PLAYERS = 5;

/**
 * ⚠️ TROIS PORTRAITS AU MINIMUM, ET CE N'EST PAS UN CONFORT. Le matériel pèse
 * plus que tous les réglages du jeu : 5 bornes valent +12 points au village,
 * 2 bornes en coûtent 18. En dessous de trois, l'enquête n'a plus assez de
 * lieux distincts pour blanchir qui que ce soit.
 */
export const MIN_BORNES = 3;

/** Durée d'une ronde, et cadence de battement — le serveur fait foi. */
export const RONDE_SECONDS = 90;
export const BEAT_MAX_GAP = 35;

export type Role = "heritier" | "clause" | "complice" | "fantome";

/** MON secret, tel que la donne l'écrit. Ne sort que par `me` de get_game_room. */
export interface FantomeSecret {
  role: Role;
  /** Rempli seulement pour le Fantôme et son complice — ils se connaissent. */
  complices: string[];
  roundNo?: number;
  plan?: { duo: boolean }[];
  /** La carte photo de la manche (clé, libellée par l'i18n). */
  card?: string;
}

/** Ma ronde en cours, servie par `fantome_state`. */
export interface FantomeStint {
  place: string;
  duo: boolean;
  signed: boolean;
  elapsed: number;
  /** Secondes depuis mon dernier battement : au-delà de 35, la ronde se rompt. */
  since: number;
}

export interface FantomeState {
  status: "ok" | "not_found";
  bornes?: { place: string; alive: boolean }[];
  gauge?: number;
  target?: number;
  me?: {
    seal: string;
    photoOk: boolean | null;
    photoDone: boolean;
    doneThisRound: number;
    stint: FantomeStint | null;
    /** ⚠️ Ne sort QUE pour le Fantôme : `left` = secondes restantes. */
    charge: { left: number } | null;
  } | null;
}

/** Un événement de la manche, publié à la réunion. */
export interface FantomeEvent {
  kind: "charge" | "panne";
  at: string | null;
  place: string | null;
  lost: boolean;
  cleared: string[];
  /** ⚠️ « Sans trace », JAMAIS « suspects » : ne pas pointer arrive à tout le monde. */
  silent: string[];
}

export interface FantomeResult {
  rule: string;
  events?: FantomeEvent[];
  gauge?: number;
  target?: number;
  asleep?: string[];
  light?: string | null;
  wasGhost?: boolean;
  final?: boolean;
  ghost?: string;
  outcome?: "demasque" | "testament" | "manoir";
  hit?: boolean;
  size?: number;
  scores?: Record<string, number>;
}

export interface FantomeMine {
  accuse?: string;
}

/**
 * Le secret vaut-il pour la manche en cours ? La donne le réécrit à chaque
 * ouverture, et le sondage peut arriver entre les deux : sans cette garde on
 * afficherait une demi-seconde la consigne de la manche PRÉCÉDENTE.
 */
export function secretFor(s: FantomeSecret | null | undefined, roundNo: number): FantomeSecret | null {
  if (!s || typeof s.roundNo !== "number") return null;
  return s.roundNo === roundNo ? s : null;
}
