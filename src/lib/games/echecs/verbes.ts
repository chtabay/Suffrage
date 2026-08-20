// ÉCHECS COLLABORATIFS — les verbes.
//
// ⚠️ DEUX FAMILLES, ET ELLES NE PASSENT PAS PAR LE MÊME CHEMIN. Ce que le
// joueur fait (rejoindre, choisir son camp, voter) va directement aux RPC,
// gardées par le JETON. Ce qui touche à la POSITION (ouvrir la partie, clore un
// tour) passe par `/api/echecs/ply` : ces verbes-là sont gardés par un secret
// que seul le serveur connaît, parce que c'est l'arbitre — et un client qui
// pourrait les appeler pourrait inventer un coup légal.
import { createClient } from "@/lib/supabase/client";
import type { EchecsState, Uci } from "./regles";

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data as T;
}

/**
 * L'état, appelé en boucle par tout le monde.
 * ⚠️ C'est aussi le battement de présence : il met `seen_at` à jour, et c'est
 * lui qui alimente « 612 joueurs présents » sans jamais énumérer personne.
 */
export function state(code: string, token?: string | null): Promise<EchecsState> {
  return rpc<EchecsState>("echecs_state", { p_code: code, p_token: token ?? null });
}

/** Choisir son camp — ou en changer, tant que la partie n'a pas commencé. */
export function team(token: string, camp: "w" | "b"): Promise<{ status: string; team?: string }> {
  return rpc("echecs_team", { p_token: token, p_team: camp });
}

/**
 * Déposer son bulletin.
 *
 * ⚠️ TOUJOURS UNE LISTE, MÊME À UN SEUL COUP. C'est ce qui ouvre le §19 : la
 * pluralité n'est que le cas où la liste fait exactement un élément, et
 * l'approbation le cas où elle en fait plusieurs. Un jour, Borda et le jugement
 * majoritaire tiendront dans la même colonne, sans migration de bulletins.
 *
 * ⚠️ ET C'EST UN REMPLACEMENT, pas un ajout : `scrutin_game_entries_uk` garantit
 * un bulletin par siège et par manche, et le verbe fait un `on conflict do
 * update`. On peut changer d'avis tant que le tour est ouvert.
 */
export function vote(token: string, coups: Uci[]): Promise<{ status: string }> {
  return rpc("echecs_vote", { p_token: token, p_moves: coups });
}

// ───────────────────────────────────────────────────────────── l'arbitre
//
// ⚠️ IDEMPOTENTS, ET CE N'EST PAS DU CONFORT. Aucune clôture ne peut venir d'un
// ordonnanceur (les crons Vercel en Hobby sont à la journée) : c'est le premier
// client qui constate la fin qui appelle. Ils peuvent être six cents dans la
// même seconde — d'où les gardes dans le `WHERE` des `UPDATE`, côté base.

async function arbitre(code: string, action: "start" | "close", token?: string | null) {
  const r = await fetch("/api/echecs/ply", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, action, token: token ?? null }),
  });
  return (await r.json().catch(() => ({ status: "error" }))) as {
    status: string;
    runoff?: boolean;
    tied?: Uci[];
    move?: Uci;
    san?: string;
    outcome?: string;
    winner?: string | null;
  };
}

/** Ouvrir la partie. Refusé tant que les deux camps ne sont pas peuplés. */
export function start(code: string, token?: string | null) {
  return arbitre(code, "start", token);
}

/**
 * Clore le tour. Deux appelants légitimes, et le verbe en base les distingue :
 * un membre de l'équipe AU TRAIT qui dit « on est prêts », ou n'importe qui une
 * fois la soupape expirée. Un spectateur ne peut pas presser l'équipe adverse.
 */
export function close(code: string, token?: string | null) {
  return arbitre(code, "close", token);
}
