// LA NUIT DU FANTÔME — les verbes. Tous gardés par le JETON, jamais par un
// rôle : sur une soirée de deux heures, l'hôte va poser son téléphone, et la
// partie ne doit pas s'arrêter avec lui.
import { createClient } from "@/lib/supabase/client";
import type { FantomeState } from "./regles";

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data as T;
}

/**
 * L'état propre au Fantôme, appelé EN PARALLÈLE de `getRoom`.
 * ⚠️ Deux RPC et non une branche dans `get_game_room` : celle-ci est partagée
 * avec Alibi, un chantier clos, et la réécrire pour y greffer ce jeu ferait
 * courir un risque à trois jeux en production pour gagner un aller-retour.
 */
export function state(code: string, token?: string | null): Promise<FantomeState> {
  return rpc<FantomeState>("fantome_state", { p_code: code, p_token: token ?? null });
}

// ────────────────────────────────────────────────────────── le portrait
//
// ⚠️ LE SECRET D'APPAIRAGE NE PASSE JAMAIS PAR L'URL : il est rendu une fois
// ici et vit dans le localStorage de l'appareil posé. Une URL porteuse ferait
// du préparateur un oracle — il rouvrirait chaque portrait sur son téléphone et
// lirait tous les codes de la maison.
export function pairBorne(code: string, place: string): Promise<{ status: string; secret?: string; place?: string }> {
  return rpc("fantome_borne_pair", { p_code: code, p_place: place });
}

export interface BornePoll {
  status: "ok" | "not_found";
  place?: string;
  code?: string;
  roomStatus?: string;
  roundNo?: number;
  /** Le glas : tous les portraits vacillent ensemble. */
  toll?: boolean;
}

/** Battement du portrait : il réclame son code et signale qu'il est vivant. */
export function pollBorne(secret: string): Promise<BornePoll> {
  return rpc<BornePoll>("fantome_borne_poll", { p_secret: secret });
}

// ────────────────────────────────────────────────────────── le joueur

export type BeatAnswer = {
  status: "started" | "beat" | "done" | "need_sign" | "no_code" | "too_fast" | "closed" | "left" | "invalid";
  place?: string;
  duo?: boolean;
  elapsed?: number;
};

/** Saisir le code d'un portrait : commence, poursuit ou achève une ronde. */
export function beat(token: string, code: string): Promise<BeatAnswer> {
  return rpc<BeatAnswer>("fantome_beat", { p_token: token, p_code: code });
}

export type SignAnswer = {
  status: "ok" | "no_seal" | "not_here" | "too_often" | "no_stint" | "closed" | "invalid";
  name?: string;
};

/** La signature croisée d'une ronde à deux : chacun tape le sceau de l'autre. */
export function sign(token: string, seal: string): Promise<SignAnswer> {
  return rpc<SignAnswer>("fantome_sign", { p_token: token, p_seal: seal });
}

/** Hanter (Fantôme seul). Un innocent reçoit `no_charge`, comme s'il n'y en avait pas. */
export function haunt(token: string, code: string): Promise<{ status: string; place?: string }> {
  return rpc("fantome_haunt", { p_token: token, p_code: code });
}

/** ⚠️ Enregistre QU'UNE photo a été prise. Jamais l'image, nulle part. */
export function photo(token: string): Promise<{ status: string }> {
  return rpc("fantome_photo", { p_token: token });
}

/** « Je préfère être derrière l'objectif ». Ne coûte aucun point, se défait en silence. */
export function photoOk(token: string, ok: boolean): Promise<{ status: string }> {
  return rpc("fantome_photo_ok", { p_token: token, p_ok: ok });
}

/** Accuser — la réunion se résout d'elle-même au dernier bulletin. */
export function vote(token: string, name: string): Promise<{ status: string }> {
  return rpc("fantome_vote", { p_token: token, p_name: name });
}

/** Calcule la résolution quand la dernière manche est votée. */
export function finish(token: string): Promise<{ status: string }> {
  return rpc("fantome_finish", { p_token: token });
}
