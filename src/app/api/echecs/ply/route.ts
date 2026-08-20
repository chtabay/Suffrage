// L'ARBITRE — la seule pièce du jeu qui connaisse les règles des échecs.
//
// ⚠️ POURQUOI UNE ROUTE, ET PAS LE NAVIGATEUR. Sans compte, n'importe qui peut
// poster ce qu'il veut à une RPC : si le client calculait les coups légaux, il
// suffirait d'en inventer un. C'est donc ici, côté serveur, que chess.js tourne
// — et le résultat est ÉCRIT EN BASE comme une donnée. Voter revient ensuite à
// vérifier une appartenance à cette liste, et Postgres n'a pas une ligne de
// logique d'échecs.
//
// ⚠️ POURQUOI PAS LE NAVIGATEUR DE L'HÔTE NON PLUS : la partie dépendrait d'un
// téléphone allumé. Le motif retenu est celui qui est déjà en production pour
// /api/circles/join — clé anonyme + un secret que seul le serveur connaît.
//
// ⚠️ TOUT EST IDEMPOTENT, et ce n'est pas du confort : les crons Vercel en
// Hobby sont à la journée, donc aucune clôture ne peut venir d'un ordonnanceur.
// C'est le premier client qui constate la fin qui appelle cette route, et ils
// peuvent être six cents dans la même seconde. Les gardes vivent dans le
// `WHERE` des `UPDATE` côté base ; ici, on se contente de ne jamais rien
// supposer sur l'ordre d'arrivée.
import { NextResponse } from "next/server";
import { Chess } from "chess.js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.NOTIFY_SECRET;

/** UCI : la notation qu'on STOCKE. La notation algébrique, elle, est LOCALISÉE
 *  (« Cf3 » en français, « Nf3 » en anglais) et ne se calcule qu'à l'affichage. */
function uci(m: { from: string; to: string; promotion?: string }): string {
  return m.from + m.to + (m.promotion ?? "");
}

function legalOf(game: Chess): string[] {
  return game.moves({ verbose: true }).map((m) => uci(m));
}

/** Mat, pat, ou l'une des nulles. `null` si la partie continue. */
function outcomeOf(game: Chess): { outcome: string; winner: string | null } | null {
  if (game.isCheckmate()) {
    // Le camp au trait est mat : c'est l'AUTRE qui gagne.
    return { outcome: "checkmate", winner: game.turn() === "w" ? "b" : "w" };
  }
  if (game.isStalemate()) return { outcome: "stalemate", winner: null };
  if (game.isDraw()) return { outcome: "draw", winner: null };
  return null;
}

export async function POST(req: Request) {
  if (!SECRET) return NextResponse.json({ status: "unconfigured" }, { status: 500 });
  const body = (await req.json().catch(() => ({}))) as {
    code?: string;
    token?: string;
    action?: string;
  };
  const code = (body.code || "").trim().toUpperCase();
  const token = (body.token || "").trim() || null;
  const action = body.action === "start" ? "start" : "close";
  if (!code) return NextResponse.json({ status: "not_found" }, { status: 400 });

  const supabase = await createClient();
  const state = await supabase.rpc("echecs_state", { p_code: code, p_token: token });
  if (state.error) return NextResponse.json({ status: "error" }, { status: 500 });
  const s = state.data as {
    status: string;
    roomStatus: string;
    roundNo: number;
    ply: number | null;
    turn: string | null;
    fen: string | null;
    teams: { w: number; b: number };
  };
  if (s?.status !== "ok") return NextResponse.json({ status: "not_found" }, { status: 404 });

  // ─────────────────────────────────────────────── OUVRIR LA PARTIE
  if (action === "start") {
    if (s.roomStatus !== "lobby") return NextResponse.json({ status: "already" });
    // Deux équipes, sinon il n'y a pas de partie. C'est la seule condition —
    // aucun plafond, aucun minimum par équipe au-delà de un.
    if (!s.teams || s.teams.w < 1 || s.teams.b < 1) {
      return NextResponse.json({ status: "need_teams" });
    }
    const game = new Chess();
    const r = await supabase.rpc("echecs_open", {
      p_secret: SECRET, p_code: code, p_from: s.roundNo,
      p_ply: 1, p_turn: "w", p_fen: game.fen(), p_legal: legalOf(game),
      p_last_uci: null, p_last_san: null, p_runoff: false, p_method: "plurality",
    });
    if (r.error) return NextResponse.json({ status: "error" }, { status: 500 });
    return NextResponse.json(r.data);
  }

  // ─────────────────────────────────────────────── CLORE UN TOUR
  if (s.roomStatus !== "playing" || !s.fen) return NextResponse.json({ status: "closed" });

  const closed = await supabase.rpc("echecs_close", {
    p_secret: SECRET, p_code: code, p_token: token,
  });
  if (closed.error) return NextResponse.json({ status: "error" }, { status: 500 });
  const c = closed.data as {
    status: string;
    result?: { move?: string | null; tied?: string[] | null };
  };
  if (c?.status !== "ok" || !c.result) return NextResponse.json(c ?? { status: "error" });

  const game = new Chess(s.fen);

  // ÉGALITÉ : un second tour, entre les seuls ex æquo, À L'APPROBATION —
  // reposer la même question ne trancherait que 18 % du temps (mesuré). Même
  // position, même camp : c'est le même coup qu'on rejoue.
  if (c.result.tied && c.result.tied.length > 1) {
    const r = await supabase.rpc("echecs_open", {
      p_secret: SECRET, p_code: code, p_from: s.roundNo,
      p_ply: s.ply, p_turn: s.turn, p_fen: s.fen, p_legal: c.result.tied,
      p_last_uci: null, p_last_san: null, p_runoff: true, p_method: "approval",
    });
    if (r.error) return NextResponse.json({ status: "error" }, { status: 500 });
    return NextResponse.json({ status: "ok", runoff: true, tied: c.result.tied });
  }

  const chosen = c.result.move;
  if (!chosen) return NextResponse.json({ status: "no_move" });

  // On rejoue le coup choisi. Il vient de la liste que CETTE route a écrite au
  // tour précédent : il est légal par construction. Le `try` n'existe que pour
  // le cas où une position aurait été altérée à la main en base.
  let san: string;
  try {
    const played = game.move({
      from: chosen.slice(0, 2), to: chosen.slice(2, 4),
      promotion: chosen.length > 4 ? chosen.slice(4) : undefined,
    });
    san = played.san;
  } catch {
    return NextResponse.json({ status: "corrupt" }, { status: 500 });
  }

  const over = outcomeOf(game);
  if (over) {
    const r = await supabase.rpc("echecs_finish", {
      p_secret: SECRET, p_code: code, p_outcome: over.outcome, p_winner: over.winner,
    });
    if (r.error) return NextResponse.json({ status: "error" }, { status: 500 });
    return NextResponse.json({ status: "ok", move: chosen, san, ...over });
  }

  const r = await supabase.rpc("echecs_open", {
    p_secret: SECRET, p_code: code, p_from: s.roundNo,
    p_ply: (s.ply ?? 0) + 1, p_turn: game.turn(), p_fen: game.fen(),
    p_legal: legalOf(game),
    // ⚠️ À PLAT, pas en objet : `scrutin_game_json_bound` refuse les objets
    // imbriqués dans un `prompt`, et elle a refusé bruyamment le premier essai.
    // `san` sert d'historique ; l'écran le RECALCULE dans la langue du joueur.
    p_last_uci: chosen, p_last_san: san,
    p_runoff: false, p_method: "plurality",
  });
  if (r.error) return NextResponse.json({ status: "error" }, { status: 500 });
  return NextResponse.json({ status: "ok", move: chosen, san });
}
