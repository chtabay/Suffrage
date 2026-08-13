// RÔDEURS — les verbes du joueur. Tous gardés par le JETON, jamais par un rôle :
// sur une soirée de deux heures, l'hôte va poser son téléphone, et la partie de
// onze personnes ne doit pas s'arrêter avec lui.
import { createClient } from "@/lib/supabase/client";

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export type MeetAnswer = {
  status:
    | "ok"
    | "already"
    | "complice"
    | "no_seal"
    | "self"
    | "too_many"
    | "closed"
    | "bad_place"
    | "left"
    | "not_started"
    | "invalid";
  name?: string;
};

/** Taper le code de quelqu'un : la rencontre est scellée, l'alibi est écrit. */
export function meet(token: string, seal: string, place: string): Promise<MeetAnswer> {
  return rpc<MeetAnswer>("rodeurs_meet", { p_token: token, p_seal: seal, p_place: place });
}

export type MarkAnswer = {
  status:
    | "ok"
    | "no_meet"
    | "no_alibi"
    | "no_fake_left"
    | "complice"
    | "closed"
    | "forbidden"
    | "not_started"
    | "invalid";
  faked?: boolean;
};

/**
 * Poser sa marque (rôdeur seul). `alibiMeetId` dépense une fausse piste : la
 * pièce annoncée devient celle de CETTE rencontre-là — une pièce où l'on était
 * vraiment, jamais une pièce inventée.
 */
export function mark(token: string, meetId: string, alibiMeetId?: string | null): Promise<MarkAnswer> {
  return rpc<MarkAnswer>("rodeurs_mark", {
    p_token: token,
    p_meet_id: meetId,
    p_alibi_meet_id: alibiMeetId ?? null,
  });
}

/** Publier son lot (+1 point ; brûle une mission secrète de la manche). */
export function publish(token: string): Promise<{ status: "ok" | "nothing" | "invalid" }> {
  return rpc("rodeurs_publish", { p_token: token });
}

/** Accuser — la confrontation se résout toute seule au dernier vote. */
export function vote(token: string, name: string): Promise<{ status: "ok" | "closed" | "done" | "bad_target" | "left" | "invalid" }> {
  return rpc("rodeurs_vote", { p_token: token, p_name: name });
}

/** Déclarer sa bande d'âge — au salon seulement, publique par conception. */
export function setBand(token: string, band: "petit" | "moyen" | "grand"): Promise<{ status: "ok" | "closed" | "invalid" }> {
  return rpc("rodeurs_band", { p_token: token, p_band: band });
}

/** « Je vais me coucher. » Quitter, c'est se rendre : un rôdeur qui part est révélé. */
export function leave(token: string): Promise<{ status: "ok" | "invalid"; wasRodeur?: boolean }> {
  return rpc("rodeurs_leave", { p_token: token });
}
