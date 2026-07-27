import { NextResponse } from "next/server";
import { buildNewUrl } from "@/lib/voting/draft";
import { isAssignMethod } from "@/lib/assign/methods";
import { publicMethodToSystem } from "@/lib/voting/methods";
import { SCALE_KEYS } from "@/lib/voting/scales";

// API publique sans état : transforme un brouillon structuré en URL /new prête à ouvrir.
// POST /api/poll-drafts  { title, description?, options[]|dates[], media?[], method, deadline, source, why } -> { draft_url }

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
  const b = (body ?? {}) as Record<string, unknown>;

  const title = typeof b.title === "string" ? b.title.trim().slice(0, 200) : undefined;
  const description = typeof b.description === "string" ? b.description.trim().slice(0, 500) : undefined;
  const options = Array.isArray(b.options)
    ? b.options
        .filter((o): o is string => typeof o === "string")
        .map((o) => o.trim())
        .filter(Boolean)
        .slice(0, 12)
    : undefined;
  const media = Array.isArray(b.media)
    ? b.media.map((m) => (typeof m === "string" ? m : "")).slice(0, 12)
    : undefined;
  // Localisations (liens de carte) et commentaires, alignés par index sur options.
  const places = Array.isArray(b.places)
    ? b.places.map((m) => (typeof m === "string" ? m : "")).slice(0, 12)
    : undefined;
  const notes = Array.isArray(b.notes)
    ? b.notes.map((m) => (typeof m === "string" ? m.slice(0, 200) : "")).slice(0, 12)
    : undefined;
  const dates = Array.isArray(b.dates)
    ? b.dates.filter((d): d is string => typeof d === "string").map((d) => d.trim()).filter(Boolean).slice(0, 12)
    : undefined;
  const methodInput = typeof b.method === "string" ? b.method : undefined;
  const method = methodInput && publicMethodToSystem(methodInput) ? methodInput : undefined;
  // Affectation : méthode dédiée + participants (+ côté 2 pour deux groupes).
  const assignInput = typeof b.assign === "string" ? b.assign.trim() : undefined;
  const assign = assignInput && isAssignMethod(assignInput) ? assignInput : undefined;
  const participants = Array.isArray(b.participants)
    ? b.participants.filter((p): p is string => typeof p === "string").map((p) => p.trim()).filter(Boolean).slice(0, 60)
    : undefined;
  const sideb = Array.isArray(b.sideb)
    ? b.sideb.filter((p): p is string => typeof p === "string").map((p) => p.trim()).filter(Boolean).slice(0, 60)
    : undefined;
  const per = typeof b.per === "number" && Number.isInteger(b.per) && b.per >= 2 && b.per <= 6 ? b.per : undefined;
  const survey = b.survey === true || b.survey === 1 || b.survey === "1" || b.survey === "true" ? true : undefined;
  const scale =
    typeof b.scale === "string" && (SCALE_KEYS as string[]).includes(b.scale.trim()) ? b.scale.trim() : undefined;
  const deadline = typeof b.deadline === "string" ? b.deadline.slice(0, 40) : undefined;
  const source = typeof b.source === "string" ? b.source.trim().slice(0, 40) : undefined;
  const why = typeof b.why === "string" ? b.why.trim().slice(0, 280) : undefined;

  const origin = new URL(req.url).origin;
  const draft_url = buildNewUrl(origin, { title, description, options, media, places, notes, dates, method, assign, participants, sideb, per, survey, scale, deadline, source, why });

  return NextResponse.json(
    {
      draft_url,
      ignored: methodInput && !method ? { method: `méthode inconnue « ${methodInput} » (voir ${origin}/ai)` } : undefined,
    },
    { headers: CORS },
  );
}
