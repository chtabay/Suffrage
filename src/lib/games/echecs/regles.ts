// ÉCHECS COLLABORATIFS — le contrat que l'écran lit, et rien d'autre.
//
// ⚠️ IL N'Y A PAS DE LISTE DE JOUEURS ICI, ET C'EST VOULU. `echecs_state` ne
// rend que des NOMBRES : mesuré, une réponse par joueur pèse 552 Ko et 1,1 Go/s
// à 4 000 participants qui sondent toutes les deux secondes, quand celle-ci
// tient en ~519 octets — la même à neuf joueurs qu'à soixante-neuf. Toute
// tentation d'afficher « qui est là » ramènerait le mur d'échelle.
//
// ⚠️ ET PAS DE RÈGLES D'ÉCHECS NON PLUS. Les coups légaux sont une DONNÉE,
// écrite en base par l'arbitre (`/api/echecs/ply`). Sans compte, un client qui
// calculerait lui-même les coups pourrait en inventer un.

/** Un coup, en UCI (`e2e4`, `e7e8q`) : la notation qu'on stocke. */
export type Uci = string;

export interface EchecsResult {
  rule: "echecs-v1";
  method: "plurality" | "approval";
  /** Le dépouillement complet, une ligne par coup reçu. */
  tally: { move: Uci; n: number }[];
  /** ⚠️ Des PERSONNES, pas des approbations : en approbation la somme des voix
   *  dépasse le nombre de votants, et « 7 voix sur 4 votants » n'a aucun sens. */
  voters: number;
  /** Les ex æquo qui ouvrent un second tour. `null` s'il n'y en a pas. */
  tied: Uci[] | null;
  /** Le coup retenu. `null` seulement pendant qu'un départage s'ouvre. */
  move: Uci | null;
  /** Le sort a tranché — soit un départage encore à égalité, soit le silence. */
  drawn: boolean;
  /** Personne n'a voté : la soupape a joué au hasard. */
  silent: boolean;
  // Écrits par `echecs_finish`, sur la dernière manche seulement.
  final?: boolean;
  outcome?: "checkmate" | "stalemate" | "draw" | "resign";
  winner?: "w" | "b" | null;
  /** La notation du coup qui conclut — « Dh4# ». Voir l'étage 7. */
  san?: string | null;
  plies?: number;
  ballots?: number;
  /** Tous les joueurs passés par la salle, présents ou non. */
  peak?: number;
}

/**
 * Le dépouillement du coup PRÉCÉDENT, qui voyage avec la manche en cours.
 *
 * ⚠️ IL N'EXISTE QUE PARCE QUE LA RÉVÉLATION N'A PAS D'ÉCRAN À ELLE. Clore un
 * tour ouvre le suivant dans la même requête (rien ne le rouvrirait sinon : les
 * crons Vercel en Hobby sont à la journée), donc le dépouillement de la manche
 * close devient aussitôt illisible. Il est rendu ici, et s'affiche AU-DESSUS de
 * la position — on voit l'échiquier et ce que l'équipe a décidé.
 */
export interface EchecsPrev {
  move: Uci | null;
  /** L'algébrique ANGLAISE, telle qu'écrite par l'arbitre : l'écran la traduit. */
  san: string | null;
  voters: number;
  drawn: boolean;
  silent: boolean;
  runoff: boolean;
  method: "plurality" | "approval";
  turn: "w" | "b" | null;
  /** ⚠️ ÉCRÊTÉ À CINQ LIGNES par la base — `kinds` dit combien il y en avait. */
  tally: { move: Uci; n: number }[];
  kinds: number;
}

export interface EchecsState {
  status: "ok" | "not_found";
  code: string;
  roomStatus: "lobby" | "playing" | "ended";
  roundNo: number;
  locale: string;
  /** Le demi-coup, à partir de 1. `null` tant que la partie n'a pas commencé. */
  ply: number | null;
  turn: "w" | "b" | null;
  fen: string | null;
  legal: Uci[];
  last: { uci: Uci; san: string } | null;
  /** Le dépouillement du coup précédent. `null` au tout premier tour. */
  prev: EchecsPrev | null;
  method: "plurality" | "approval";
  runoff: boolean;
  phase: "contribution" | "reveal" | null;
  /** La SOUPAPE, pas une pendule — voir `valveRestante`. */
  valveAt: string | null;
  /** Des effectifs, jamais des noms. */
  teams: { w: number; b: number };
  /** Combien de personnes peuvent voter en ce moment. */
  active: number;
  /** Combien de bulletins sont arrivés. La RÉPARTITION n'arrive qu'au dépouillement. */
  votes: number;
  result: EchecsResult | null;
  me: {
    name: string;
    team: "w" | "b" | null;
    /** MON choix, jamais celui d'un autre. */
    mine: Uci[];
    canVote: boolean;
  } | null;
}

/** Le camp qui n'est pas au trait — celui qui regarde. */
export function adverse(t: "w" | "b"): "w" | "b" {
  return t === "w" ? "b" : "w";
}

/**
 * Les secondes qu'il reste à la soupape, ou `null` s'il n'y en a pas.
 *
 * ⚠️ CE N'EST PAS UNE PENDULE, et l'écran ne doit jamais la présenter comme
 * telle. En mode salon, l'équipe active clôt quand elle a fini ; ce délai
 * n'existe que pour qu'une table qui se disperse ne fige pas la partie. Un
 * compte à rebours affiché en gros transformerait un jeu de délibération en jeu
 * de rapidité — exactement ce que le §7 refuse.
 */
export function valveRestante(valveAt: string | null, maintenant = Date.now()): number | null {
  if (!valveAt) return null;
  const t = Date.parse(valveAt);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((t - maintenant) / 1000));
}

/**
 * Faut-il appeler l'arbitre ? Deux cas, et deux seulement.
 *
 * ⚠️ IL N'Y A AUCUN ORDONNANCEUR DERRIÈRE CE JEU : les crons Vercel en Hobby
 * sont à la journée, à ±59 min près. C'est donc le premier client qui CONSTATE
 * la fin qui la déclenche — et ils peuvent être six cents dans la même seconde,
 * d'où l'idempotence des verbes en base.
 */
export function doitClore(s: EchecsState, maintenant = Date.now()): boolean {
  if (s.roomStatus !== "playing" || s.phase !== "contribution") return false;
  const reste = valveRestante(s.valveAt, maintenant);
  return reste !== null && reste <= 0;
}

/** Le libellé d'un camp, pour composer une clé i18n en clair côté écran. */
export function campKey(t: "w" | "b" | null | undefined): "blancs" | "noirs" | null {
  return t === "w" ? "blancs" : t === "b" ? "noirs" : null;
}
