import { NextResponse } from "next/server";
import { buildNewUrl } from "@/lib/voting/draft";
import { parseDraftBody } from "@/lib/api/draftBody";

// API publique sans état : transforme un brouillon structuré en URL /new prête à ouvrir.
// POST /api/poll-drafts  { title, description?, options[]|dates[], media?[], method, deadline, source, why } -> { draft_url }
//
// Même vocabulaire d'entrée que POST /api/polls, qui lui CRÉE le scrutin : cette
// route-ci reste le chemin sans authentification, parce qu'elle n'écrit rien.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export function GET(req: Request) {
  const origin = new URL(req.url).origin;
  return NextResponse.json(
    {
      usage:
        "POST un JSON { title, description?, options[] OU dates[] (vote de créneaux ISO), media?[] (illustrations), places?[] (liens de carte : les options localisées apparaissent sur la carte du vote), notes?[] (commentaires), method, deadline, source, why } et recevez { draft_url }.",
      creates_nothing: "Cette route ne crée aucun scrutin. Pour en créer un réellement : POST /api/polls (clé agent requise).",
      methods_doc: `${origin}/ai`,
      example: {
        title: "On dîne où vendredi ?",
        description: "Budget 25 €/pers, à côté du bureau.",
        options: ["🍕 Chez Mario", "🍣 Kyoto", "🥗 Le Potager"],
        media: ["https://exemple.com/mario-menu.pdf", "", ""],
        places: [
          "https://www.google.com/maps/place/.../@48.8584,2.2945,17z",
          "https://maps.app.goo.gl/abc123",
          "",
        ],
        notes: ["Terrasse chauffée", "À 5 min à pied", "Menu végétarien"],
        method: "majority_judgment",
        source: "api",
      },
    },
    { headers: CORS },
  );
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400, headers: CORS });
  }
  const origin = new URL(req.url).origin;
  const { fields, ignored } = parseDraftBody(body, origin);

  return NextResponse.json({ draft_url: buildNewUrl(origin, fields), ignored }, { headers: CORS });
}
