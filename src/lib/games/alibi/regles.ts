// ALIBI — les types du jeu, et les deux ou trois règles qui vivent côté client.
//
// LA RÈGLE, EN UNE PHRASE : chaque manche le serveur range tout le monde dans
// trois pièces — sauf un, qui rôdait ; chacun déclare où il était et combien ils
// étaient, et l'arithmétique des bulletins désigne la pièce qui en compte un de
// trop.
//
// ⚠️ AUCUNE RÈGLE DE JEU NE VIT ICI. Le tirage du coupable, la répartition en
// pièces et le dépouillement sont ENTIÈREMENT en base (voir la migration
// 20260812-jeu-alibi.sql). C'est délibéré : dans Banalo, le client de l'hôte
// tire le thème et l'envoie ; le même chemin donnerait ici la réponse à l'hôte,
// qui saurait qui est le coupable. Ce fichier ne fait que TYPER ce que le
// serveur envoie et NOMMER ce qui s'affiche.

/** Le nombre de manches, fixe. Quatre d'enquête, puis l'accusation. */
export const ROUNDS_TOTAL = 5;

/** Vrai quand la manche `no` est celle de l'accusation finale. */
export function isVerdictRound(no: number, total = ROUNDS_TOTAL): boolean {
  return no >= total;
}

/**
 * MA CARTE — ce que le serveur ne dit qu'à moi.
 *
 * Elle arrive dans `me.secret` de `get_game_room`, et NULLE PART AILLEURS :
 * ni dans la liste des joueurs, ni dans l'énoncé de la manche, ni dans le
 * résultat. C'est le seul chemin par lequel un secret sort, et il est sous le
 * jeton du joueur.
 */
export interface AlibiSecret {
  role: "innocent" | "culprit";
  /** Manche à laquelle cette carte se rapporte : une carte périmée ne s'affiche pas. */
  roundNo: number;
  /** Index de la pièce dans `prompt.places` (0, 1 ou 2). */
  room: number;
  /** Clé de la pièce, pour l'affichage. */
  place: string;
  /** Combien ils étaient dans cette pièce. Vrai, toujours. */
  count: number;
  /**
   * LE CHOIX DU COUPABLE, et lui seul l'a. Cinq noms tirés au sort avec leur
   * pièce et son compte : il peut déclarer l'une de ces pièces pour entraîner
   * quelqu'un avec lui, ou s'en tenir à son propre souvenir.
   *
   * Pourquoi cinq et pourquoi tirés : s'il choisissait dans TOUTE la table, il
   * collerait systématiquement l'enfant de huit ans à son alibi et gagnerait le
   * duel final contre quelqu'un qui ne sait pas se défendre.
   */
  slate?: AlibiSlate[];
}

export interface AlibiSlate {
  name: string;
  room: number;
  place: string;
  count: number;
}

/** Ce que j'ai déposé cette manche. */
export interface AlibiMine {
  room?: number;
  count?: number;
  hunch?: string;
  accuse?: string;
}

/** Le verdict d'une pièce, calculé par le serveur sur les seuls bulletins. */
export type RoomVerdict =
  /** Autant de bulletins que le nombre annoncé : tous ses occupants sont blanchis. */
  | "clean"
  /** Un bulletin de trop : le coupable est là-dedans. */
  | "extra"
  /** Quelqu'un a annoncé un autre nombre que ses colocataires : c'est lui. */
  | "liar";

export interface AlibiRoomResult {
  room: number;
  place: string;
  said: number;
  ballots: number;
  names: string[];
  verdict: RoomVerdict;
  odd: string[];
}

export interface AlibiResult {
  rule: string;
  /** Manche d'enquête. */
  rooms?: AlibiRoomResult[];
  /** Le vivier, RESSERRÉ de manche en manche : c'est là que la déduction se fait. */
  suspects?: string[];
  /** Blanchis par CETTE manche. */
  cleared?: string[];
  /**
   * Taille du vivier à la manche PRÉCÉDENTE — servie par le serveur, parce que
   * `get_game_room` ne rend que la manche courante et que l'écran ne pouvait
   * donc pas dire de combien on a resserré. C'est pourtant tout ce que la table
   * vient chercher, et la spec chiffre ce croisement à 32 points de taux de
   * résolution.
   */
  previous?: number | null;
  /** Manche finale seulement. */
  final?: boolean;
  culprit?: string;
  votes?: Record<string, number>;
  accused?: string[];
  /**
   * Les carnets de toute la table, manche par manche. ⚠️ UNIQUEMENT dans le
   * résultat FINAL : ils vivaient dans le résultat de CHAQUE manche, que
   * `get_game_room` sert à quiconque connaît le code — alors que l'écran promet
   * en quatre langues « personne ne le verra avant la fin ».
   */
  carnets?: Record<string, string[]>;
  hit?: boolean;
  size?: number;
  scores?: Record<string, number>;
}

/**
 * Ce que la carte du joueur vaut POUR LA MANCHE EN COURS.
 *
 * ⚠️ La carte est réécrite à chaque manche, et le sondage peut arriver entre
 * l'ouverture d'une manche et la réécriture. Sans cette garde, un joueur verrait
 * une demi-seconde la pièce de la manche PRÉCÉDENTE et déposerait un bulletin
 * faux — qui le désignerait comme menteur au dépouillement.
 */
export function cardFor(secret: AlibiSecret | null | undefined, roundNo: number): AlibiSecret | null {
  if (!secret || typeof secret.roundNo !== "number") return null;
  return secret.roundNo === roundNo ? secret : null;
}

/** Les libellés d'un verdict de pièce, côté couleur. */
export function verdictTone(v: RoomVerdict): "good" | "bad" | "warn" {
  return v === "clean" ? "good" : v === "liar" ? "bad" : "warn";
}
