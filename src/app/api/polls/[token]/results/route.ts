import { NextResponse } from "next/server";
import { getPollShareInfo } from "@/lib/db/pollMeta";

// GET /api/polls/<token>/results — le dépouillement en JSON.
//
// Ce calcul existait déjà et tournait en production tous les jours : il
// n'alimentait qu'une image d'aperçu et un message Slack. Cette route ne fait
// que lui donner une sortie lisible par une machine.
//
// Pas de clé agent : le TOKEN est la clé. Quiconque a le lien de vote voit déjà
// le résultat sur la page et dans l'aperçu de partage — un JSON n'expose rien de
// plus. La garde réelle est ailleurs : tant que le scrutin n'est pas clos, le
// détail n'est pas calculé du tout.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const info = await getPollShareInfo(token, { fresh: true, full: true });
  if (!info) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const open = info.phase !== "closed";
  return NextResponse.json({
    question: info.question,
    description: info.description,
    method: { key: info.methodKey, name: info.methodName, color: info.methodColor },
    assign_method: info.assignKey,
    options: info.options.map((o) => ({ name: o.name, icon: o.icon ?? null, at: o.at ?? null, end: o.end ?? null })),
    phase: info.phase,
    visibility: info.visibility,
    hide_results: info.hideResults,
    ballot_count: info.ballotCount,
    // Tant que le vote est ouvert, on ne renvoie NI décompte NI classement :
    // publier un résultat partiel, c'est influencer la fin du scrutin.
    result: open
      ? null
      : info.result
        ? {
            has_winner: Boolean(info.result.hasWinner),
            no_winner: Boolean(info.result.noWinner),
            no_winner_label: info.result.noWinnerLabel ?? null,
            winner: info.winner,
            tally_label: info.result.tallyLabel,
            // `bars` est déjà classé par le moteur : la tête de liste n'est PAS
            // le vainqueur pour autant (voir has_winner — un cycle de Condorcet
            // trie sans désigner personne).
            bars: info.result.bars.map((b) => ({
              name: b.name,
              icon: b.icon,
              value: b.value,
              label: b.valueLabel,
              pct: b.pct,
              grades: b.dist ?? null,
            })),
            counterfactual: info.result.counterfactual,
          }
        : null,
  });
}
