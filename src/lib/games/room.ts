// SALLE DE JEU — la couche générique, celle qu'un second jeu ne réécrira pas.
//
// Ce fichier ne connaît RIEN de Banalo : ni mot, ni thème, ni barème. Il sait
// qu'une salle porte un jeu, des joueurs qui entrent et sortent, des manches qui
// passent d'une phase à l'autre, des contributions privées puis révélées, et un
// hôte qui donne le tempo. Le contenu d'une contribution (`payload`) et celui
// d'un énoncé (`prompt`) sont des `jsonb` opaques : c'est là que vit le jeu.
//
// POURQUOI PAS `scrutin_polls`. Un scrutin de Placet fige ses options à
// l'ouverture (les bulletins les référencent par index) et porte une méthode de
// dépouillement ; une manche de jeu accepte des réponses libres écrites par les
// joueurs et cumule un score de manche en manche. Voir l'en-tête de
// supabase/migrations/20260810-jeux-salle-et-unanimo.sql.
//
// LE SECRET N'EST PAS GARDÉ ICI. Les quatre tables `scrutin_game_*` ont la RLS
// active et AUCUNE policy : le navigateur n'a aucun chemin de lecture directe.
// Tout passe par les RPC ci-dessous, et `get_game_room` ne rend les réponses des
// autres qu'une fois la manche révélée. Ce fichier ne fait donc pas la police —
// il ne pourrait pas mentir même s'il le voulait.
import { createClient } from "@/lib/supabase/client";

export type RoomStatus = "lobby" | "playing" | "ended";
export type RoundPhase = "contribution" | "reveal";

/** Énoncé d'une manche. `kind` appartient au jeu ; la salle ne l'interprète pas. */
export interface RoundPrompt {
  kind?: string;
  text?: string;
  emoji?: string;
}

export interface RoomPlayer {
  name: string;
  score: number;
  /** Manche d'entrée : « arrivé manche 4 » se lit ici, et rien ne se compense. */
  joinedRound: number;
  isHost: boolean;
  isMe: boolean;
  /** Faux pour un retardataire qui attend la manche suivante. */
  playing: boolean;
  /** A envoyé sa contribution pour la manche en cours. Jamais son contenu. */
  done: boolean;
  /** Plus de signe de vie depuis 90 s — un téléphone posé, pas une faute. */
  idle: boolean;
  /** Rôdeurs : bande d'âge déclarée (publique par conception) et départ au lit. */
  band?: string | null;
  left?: boolean;
}

export interface RoomRound<TMine, TResult> {
  no: number;
  prompt: RoundPrompt;
  phase: RoundPhase;
  submitted: number;
  /** MES réponses (jamais celles des autres). */
  mine: TMine | null;
  /** Renseigné uniquement en phase `reveal`. */
  result: TResult | null;
}

export interface RoomState<TMine = unknown, TResult = unknown> {
  status: "ok";
  game: string;
  code: string;
  roomStatus: RoomStatus;
  roundNo: number;
  roundsTotal: number;
  settings: Record<string, unknown>;
  locale: string;
  /** Salle suivante ouverte par l'hôte (« rejouer ») — sinon null. */
  nextCode: string | null;
  /** Énoncés déjà joués : c'est au client de l'hôte de ne pas se répéter. */
  usedPrompts: string[];
  players: RoomPlayer[];
  /** Joueurs attendus sur la manche en cours (les retardataires n'y sont pas). */
  expected: number;
  /**
   * `secret` : ce que le serveur ne dit QU'À MOI (Alibi : ma pièce et son
   * nombre d'occupants ; Banalo : rien). Il ne sort que par cet objet, déjà
   * sous le jeton — jamais par `players`, `round` ni `result`.
   */
  me: {
    name: string;
    isHost: boolean;
    score: number;
    joinedRound: number;
    secret?: unknown;
    band?: string | null;
    left?: boolean;
    /** Rôdeurs : MES rencontres de la manche, et « on t'a approché » au reveal. */
    meets?: unknown;
    approached?: unknown;
  } | null;
  round: RoomRound<TMine, TResult> | null;
}

export type RoomAnswer<TMine = unknown, TResult = unknown> =
  | RoomState<TMine, TResult>
  | { status: "not_found" };

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data as T;
}

/** État de la salle vu par le porteur de ce jeton (ou par un simple curieux). */
export function getRoom<TMine = unknown, TResult = unknown>(
  code: string,
  token?: string | null,
): Promise<RoomAnswer<TMine, TResult>> {
  return rpc<RoomAnswer<TMine, TResult>>("get_game_room", { p_code: code, p_token: token ?? null });
}

export interface Seat {
  code: string;
  token: string;
  name: string;
  isHost: boolean;
}

export type CreateAnswer = { status: "ok"; code: string; token: string; name: string } | { status: string };
export type JoinAnswer =
  | { status: "ok"; token: string; name: string; joinedRound: number }
  // `started` : le roster de ce jeu se ferme au lancement. C'est une RÈGLE
  // (Alibi : laisser entrer quelqu'un en cours de partie lui donnerait une
  // carte pré-remplie, donc un renseignement gratuit au coupable), pas un
  // plafond — l'écran doit le dire autrement que « salle pleine ».
  | { status: "not_found" | "name_taken" | "no_name" | "full" | "started" };

/** Ouvre une salle. Le créateur devient le premier joueur ET l'hôte. */
export function createRoom(
  game: string,
  name: string,
  rounds: number,
  settings: Record<string, unknown>,
  locale: string,
): Promise<CreateAnswer> {
  return rpc<CreateAnswer>("game_create", {
    p_game: game,
    p_name: name,
    p_rounds: rounds,
    p_settings: settings,
    p_locale: locale,
  });
}

/** Rejoint une salle avec un pseudo. Aucun compte, jamais. */
export function joinRoom(code: string, name: string): Promise<JoinAnswer> {
  return rpc<JoinAnswer>("game_join", { p_code: code, p_name: name });
}

export type SubmitAnswer =
  | { status: "ok"; words?: string[] }
  | { status: "invalid" | "no_round" | "closed" | "waiting" };

/** Dépose (ou corrige) ma contribution. Le serveur dédoublonne et plafonne. */
export function submitEntry(token: string, payload: Record<string, unknown>): Promise<SubmitAnswer> {
  return rpc<SubmitAnswer>("game_submit", { p_token: token, p_payload: payload });
}

type HostAnswer = { status: string; [k: string]: unknown };

/** Verbes de l'hôte. Le serveur refuse (`forbidden`) à tout autre jeton. */
export const host = {
  nextRound: (token: string, prompt: RoundPrompt) =>
    rpc<HostAnswer>("game_next_round", { p_token: token, p_prompt: prompt }),
  /** Clôt les contributions même si tout le monde n'a pas répondu. */
  reveal: (token: string) => rpc<HostAnswer>("game_reveal", { p_token: token }),
  setRounds: (token: string, total: number) =>
    rpc<HostAnswer>("game_set_rounds", { p_token: token, p_total: total }),
  end: (token: string) => rpc<HostAnswer>("game_end", { p_token: token }),
  /** Ouvre une salle neuve et fait pointer l'ancienne vers elle. */
  replay: (token: string) => rpc<HostAnswer>("game_replay", { p_token: token }),
};

// ───────────────────────────────────────────────────── identité locale
//
// Le jeton de joueur est un TITRE D'ACCÈS : il reste dans le navigateur de son
// porteur et ne sert qu'à s'adresser au serveur. Aucun compte n'est demandé —
// c'est le même modèle que le jeton de votant d'un scrutin sur invitation.
//
// Le pseudo est mémorisé À PART, sans salle : c'est lui qui permet de rejoindre
// la partie suivante d'un seul geste quand l'hôte relance.

const SEAT_KEY = (code: string) => `placet.game.${code.toUpperCase()}`;
const NICK_KEY = "placet.game.nick";

export function getSeat(code: string): Seat | null {
  if (typeof window === "undefined" || !code) return null;
  try {
    const raw = window.localStorage.getItem(SEAT_KEY(code));
    if (!raw) return null;
    const s = JSON.parse(raw) as Seat;
    return s && typeof s.token === "string" && s.token ? s : null;
  } catch {
    return null;
  }
}

export function saveSeat(seat: Seat): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEAT_KEY(seat.code), JSON.stringify(seat));
    window.localStorage.setItem(NICK_KEY, seat.name);
  } catch {
    /* quota ou navigation privée : on joue quand même, on ne retrouvera pas la place */
  }
}

/** Le dernier pseudo utilisé, pour ne pas le retaper à chaque partie. */
export function lastNick(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(NICK_KEY) ?? "";
  } catch {
    return "";
  }
}
