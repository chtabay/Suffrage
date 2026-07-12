import { compute, describeRecipe, resolveKey } from "@/lib/voting/engine";
import type { Ballot, Option, Recipe } from "@/lib/voting/types";

// Lecture serveur (REST + clé anon) des infos d'un scrutin pour les balises
// Open Graph et l'image d'aperçu : question, méthode, options, phase, et — si le
// scrutin est CLOS (résultat public) — le nombre de votes et le gagnant calculé.
export interface PollShareInfo {
  question: string;
  description: string | null;
  methodName: string;
  methodKey: string;
  methodColor: string;
  options: Option[];
  phase: "scheduled" | "open" | "closed";
  ballotCount: number;
  winner: { name: string; icon: string } | null;
}

interface Row {
  id: string;
  question: string;
  description: string | null;
  options: Option[];
  recipe: Recipe;
  status: string;
  opens_at: string | null;
  closes_at: string | null;
  districts: { name: string; electors: number }[] | null;
}

export async function getPollShareInfo(
  token: string,
  opts: { fresh?: boolean } = {},
): Promise<PollShareInfo | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return null;
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  // Aperçus OG : cache 30 s (perf). Post de résultat Slack juste après la clôture :
  // lecture fraîche obligatoire, sinon la ligne « open » en cache masque le passage
  // à « closed » et le dépouillement est sauté (0 vote).
  const cacheInit = opts.fresh ? { cache: "no-store" as const } : { next: { revalidate: 30 } };
  try {
    const res = await fetch(
      `${base}/rest/v1/scrutin_polls?token=eq.${encodeURIComponent(token)}` +
        `&select=id,question,description,options,recipe,status,opens_at,closes_at,districts&limit=1`,
      { headers, ...cacheInit },
    );
    if (!res.ok) return null;
    const p = ((await res.json()) as Row[])[0];
    if (!p) return null;

    const now = Date.now();
    const phase: PollShareInfo["phase"] =
      p.status === "closed" || (p.closes_at && now >= Date.parse(p.closes_at))
        ? "closed"
        : p.opens_at && now < Date.parse(p.opens_at)
          ? "scheduled"
          : "open";

    const desc = describeRecipe(p.recipe);

    let ballotCount = 0;
    let winner: { name: string; icon: string } | null = null;
    // On ne lit les bulletins que si le résultat est public (scrutin clos) : pas de fuite.
    // Affectation : pas de « gagnant » à annoncer — compute() n'a pas de sens ici.
    if (phase === "closed" && !p.recipe.assign) {
      const br = await fetch(
        `${base}/rest/v1/scrutin_ballots?poll_id=eq.${encodeURIComponent(p.id)}&select=ranking,grades,district`,
        { headers, ...cacheInit },
      );
      if (br.ok) {
        const ballots = (await br.json()) as Ballot[];
        ballotCount = ballots.length;
        const districtElectors = p.districts ? p.districts.map((d) => d.electors) : undefined;
        const r = compute({ recipe: p.recipe, options: p.options, ballots, districtElectors });
        if (r?.hasWinner && r.winnerName) winner = { name: r.winnerName, icon: r.winnerIcon ?? "🏆" };
      }
    }

    return {
      question: p.question,
      description: p.description,
      methodName: desc.name,
      methodKey: resolveKey(p.recipe),
      methodColor: desc.color,
      options: p.options,
      phase,
      ballotCount,
      winner,
    };
  } catch {
    return null;
  }
}
