import { NextResponse } from "next/server";
import { buildNewUrl } from "@/lib/voting/draft";
import { isAssignMethod } from "@/lib/assign/methods";
import { publicMethodToSystem } from "@/lib/voting/methods";

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
        "POST un JSON { title, description?, options[] OU dates[] (vote de créneaux ISO), media?[], method, deadline, source, why } et recevez { draft_url }.",
      methods_doc: `${origin}/ai`,
      example: {
        title: "On part où ce week-end ?",
        description: "Budget 80 €/pers, départ vendredi soir.",
        options: ["La montagne", "Le bord de mer", "La campagne"],
        media: ["https://exemple.com/montagne.jpg", "", "https://exemple.com/campagne.jpg"],
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
  const deadline = typeof b.deadline === "string" ? b.deadline.slice(0, 40) : undefined;
  const source = typeof b.source === "string" ? b.source.trim().slice(0, 40) : undefined;
  const why = typeof b.why === "string" ? b.why.trim().slice(0, 280) : undefined;

  const origin = new URL(req.url).origin;
  const draft_url = buildNewUrl(origin, { title, description, options, media, dates, method, assign, participants, sideb, per, survey, deadline, source, why });

  return NextResponse.json(
    {
      draft_url,
      ignored: methodInput && !method ? { method: `méthode inconnue « ${methodInput} » (voir ${origin}/ai)` } : undefined,
    },
    { headers: CORS },
  );
}
