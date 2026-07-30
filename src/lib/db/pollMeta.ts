import { compute, describeRecipe, resolveKey } from "@/lib/voting/engine";
import type { Ballot, ComputeResult, Option, Recipe } from "@/lib/voting/types";

// Lecture serveur (REST + clé anon) des infos d'un scrutin pour les balises
// Open Graph et l'image d'aperçu : question, méthode, options, phase, et — si le
// scrutin est CLOS (résultat public) — le nombre de votes et le gagnant calculé.
export interface PollShareInfo {
  question: string;
  description: string | null;
  methodName: string;
  methodKey: string;
  methodColor: string;
  /** Scrutin d'affectation : clé de méthode (namespace i18n Assign), sinon null. */
  assignKey: string | null;
  options: Option[];
  phase: "scheduled" | "open" | "closed";
  ballotCount: number;
  winner: { name: string; icon: string } | null;
  /** Feed public : pilote l'indexation robots de la page /v/{token}. */
  visibility: "private" | "public";
  /** Résultats masqués pendant le vote (ils redeviennent visibles à la clôture). */
  hideResults: boolean;
  /**
   * Dépouillement complet — seulement avec `opts.full`, et seulement une fois
   * le scrutin CLOS. Sert la route JSON ; l'aperçu OG n'en a pas besoin et ne
   * paie donc pas ce calcul.
   */
  result?: ComputeResult | null;
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
  visibility: "private" | "public" | null;
  hide_results: boolean | null;
}

export async function getPollShareInfo(
  token: string,
  opts: { fresh?: boolean; full?: boolean } = {},
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
        `&select=id,question,description,options,recipe,status,opens_at,closes_at,districts,visibility,hide_results&limit=1`,
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
    let result: ComputeResult | null = null;
    // On ne lit les bulletins que si le résultat est public (scrutin clos) : pas de fuite.
    // Un SONDAGE n'a pas de gagnant à annoncer, mais il a un panorama — donc on
    // le dépouille quand même en mode `full`, alors que l'aperçu OG s'en passe.
    if (phase === "closed" && !p.recipe.assign && (opts.full || !p.recipe.survey)) {
      const br = await fetch(
        `${base}/rest/v1/scrutin_ballots?poll_id=eq.${encodeURIComponent(p.id)}&select=ranking,grades,district`,
        { headers, ...cacheInit },
      );
      if (br.ok) {
        const ballots = (await br.json()) as Ballot[];
        ballotCount = ballots.length;
        const districtElectors = p.districts ? p.districts.map((d) => d.electors) : undefined;
        const r = compute({ recipe: p.recipe, options: p.options, ballots, districtElectors });
        if (r?.hasWinner && r.winnerName && !p.recipe.survey) {
          winner = { name: r.winnerName, icon: r.winnerIcon ?? "🏆" };
        }
        if (opts.full) result = r ?? null;
      }
    }

    return {
      question: p.question,
      description: p.description,
      methodName: desc.name,
      methodKey: resolveKey(p.recipe),
      assignKey: typeof p.recipe.assign === "string" ? p.recipe.assign : null,
      methodColor: desc.color,
      options: p.options,
      phase,
      ballotCount,
      winner,
      // Défaut prudent : privé (jamais indexé) si la colonne manque.
      visibility: p.visibility === "public" ? "public" : "private",
      hideResults: p.hide_results === true,
      ...(opts.full ? { result } : {}),
    };
  } catch {
    return null;
  }
}
