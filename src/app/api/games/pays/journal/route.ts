import { NextResponse } from "next/server";
import { journalise, type Evenement } from "@/lib/games/pays/journal";

// LES ÉVÉNEMENTS QUE LE SERVEUR NE VOIT PAS AUTREMENT.
//
// L'essai passe déjà par l'API : on en tire les parties commencées, le nombre
// d'essais, le taux de victoire, le score moyen au n-ième essai, les pays de
// première sonde. Le reste de la liste de la spec (§13) — l'ouverture de la
// carte complète, un clic sur une source, un partage, le délai avant le premier
// essai — n'existe que dans le navigateur. D'où cette porte, minuscule.
//
// ⚠️ ELLE N'ACCEPTE QUE CE QU'ELLE CONNAÎT. Un point d'entrée qui recopie dans les
// journaux ce qu'on lui envoie est une injection de journal offerte à qui passe :
// le nom d'événement est validé contre une liste fermée, et les seuls champs
// libres sont des NOMBRES.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIS: Evenement[] = ["partie", "premier", "fini", "carte-complete", "source", "partage"];

export async function POST(req: Request) {
  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const { evt, jour, essais, secondes, partie } = (corps ?? {}) as Record<string, unknown>;

  if (typeof evt !== "string" || !ADMIS.includes(evt as Evenement)) return NextResponse.json({ ok: false }, { status: 400 });

  const entier = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 1e6 ? Math.round(v) : -1);

  journalise(evt as Evenement, {
    jour: entier(jour),
    essais: entier(essais),
    secondes: entier(secondes),
    partie: typeof partie === "string" && /^[a-z0-9]{6,24}$/.test(partie) ? partie : "?",
  });

  // Un « beacon » ne lit jamais sa réponse : on répond court, et on ne fait
  // jamais échouer le jeu pour une mesure.
  return NextResponse.json({ ok: true });
}
