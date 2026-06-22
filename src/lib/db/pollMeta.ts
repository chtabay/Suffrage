import { compute, describeRecipe } from "@/lib/voting/engine";
import type { Ballot, Option, Recipe } from "@/lib/voting/types";

// Lecture serveur (REST + clé anon) des infos d'un scrutin pour les balises
// Open Graph et l'image d'aperçu : question, méthode, options, phase, et — si le
// scrutin est CLOS (résultat public) — le nombre de votes et le gagnant calculé.
export interface PollShareInfo {
  question: string;
  description: string | null;
  methodName: string;
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

export async function getPollShareInfo(token: string): Promise<PollShareInfo | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return null;
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  try {
    const res = await fetch(
      `${base}/rest/v1/scrutin_polls?token=eq.${encodeURIComponent(token)}` +
        `&select=id,question,description,options,recipe,status,opens_at,closes_at,districts&limit=1`,
      { headers, next: { revalidate: 30 } },
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
    if (phase === "closed") {
      const br = await fetch(
        `${base}/rest/v1/scrutin_ballots?poll_id=eq.${encodeURIComponent(p.id)}&select=ranking,grades,district`,
        { headers, next: { revalidate: 30 } },
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
