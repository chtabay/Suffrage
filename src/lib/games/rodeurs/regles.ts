// RÔDEURS — les types du jeu, et ce qui vit côté client. Spec : docs/rodeurs-spec.md.
//
// LA RÈGLE, EN UNE PHRASE : chaque fois que quelqu'un tape ton code, vous avez
// la preuve que vous étiez ensemble ; trois d'entre vous rôdent et doivent,
// chaque manche, approcher quelqu'un qu'ils ont vraiment croisé — la victime
// apprend la pièce, et le rôdeur est forcément dans sa liste.
//
// ⚠️ AUCUNE RÈGLE DE JEU NE VIT ICI. Le tirage des rôdeurs, les missions, le
// dépouillement et le score sont ENTIÈREMENT en base (migrations
// 20260813-jeu-rodeurs-*). Ce fichier TYPE ce que le serveur envoie, et NOMME ce
// qui s'affiche.

/** Cinq manches, fixe. La partie s'arrête plus tôt si tous les rôdeurs tombent. */
export const ROUNDS_TOTAL = 5;

/** À moins de cinq, la donne refuse de distribuer — il n'y a pas de foule. */
export const MIN_PLAYERS = 5;

/**
 * Les pièces proposées quand on scelle une rencontre. EXACTEMENT celles que la
 * donne peut viser dans une mission `DANS_LIEU` (tableau `v_places` de
 * `scrutin_game_rodeurs_deal`) : offrir une pièce que les missions ignorent
 * rendrait « fais-toi valider dans la véranda » inaccomplissable sans que le
 * joueur y soit pour rien. Les libellés viennent de `alibi/lieux.ts` — la
 * maison est la même.
 */
export const RODEURS_PLACES = ["cuisine", "salon", "jardin", "terrasse", "couloir", "veranda"] as const;

export type Band = "petit" | "moyen" | "grand";

/** Ma mission, telle que la donne l'écrit dans `me.secret`. */
export interface RodeursMission {
  pattern: string;
  args: { cible?: string; lieu?: string; n?: number };
  secret: boolean;
}

/**
 * MON SECRET — ce que le serveur ne dit qu'à moi, via `me.secret`.
 * `complices` n'est rempli que pour un rôdeur ; `seal` change à chaque manche.
 */
export interface RodeursSecret {
  role: "habitant" | "rodeur";
  complices: string[];
  faux_left: number;
  seal?: string;
  roundNo?: number;
  mission?: RodeursMission;
}

/** Une de MES rencontres de la manche (il faut son id pour poser une marque). */
export interface RodeursMeet {
  id: string;
  name: string;
  place: string;
}

/** « On t'a approché » — servi au reveal, à la victime seule. */
export interface RodeursApproached {
  /** null = lot réduit à un nom : pas de pièce, le lot est tout ton carnet. */
  place: string | null;
  published: boolean;
}

export interface RodeursLot {
  place: string | null;
  names: string[];
  published: boolean;
  victim: string | null;
}

export interface RodeursResult {
  rule: string;
  lots?: RodeursLot[];
  noMeet?: string[];
  asleep?: string[];
  marks?: number;
  /** La confrontation, une fois résolue. */
  light?: string | null;
  wasRodeur?: boolean;
  /** La résolution finale. */
  final?: boolean;
  rodeurs?: string[];
  caught?: number;
  wrong?: number;
  outcome?: "nette" | "un_reste" | "perdu";
  hit?: boolean;
  size?: number;
  scores?: Record<string, number>;
}

/** Ce que j'ai déposé (le vote de confrontation passe par les entries). */
export interface RodeursMine {
  accuse?: string;
}

/**
 * Le secret vaut-il pour la manche en cours ? La donne réécrit `secret` à
 * chaque ouverture, et le sondage peut arriver entre les deux : sans cette
 * garde on afficherait une demi-seconde le sceau de la manche PRÉCÉDENTE — que
 * quelqu'un pourrait taper, créant une rencontre fantôme.
 */
export function secretFor(secret: RodeursSecret | null | undefined, roundNo: number): RodeursSecret | null {
  if (!secret || typeof secret.roundNo !== "number") return null;
  return secret.roundNo === roundNo ? secret : null;
}
