"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { getResolutionBallots, type ResolutionRow } from "@/lib/db/events";
import { compute } from "@/lib/voting/engine";
import type { Ballot, ComputeResult } from "@/lib/voting/types";
import ResultCard from "./ResultCard";
import { FONT_DISPLAY, INK, MUTED, SUBINK } from "./theme";

// Vote pondéré : on duplique chaque bulletin selon le poids du membre (tantièmes…)
// avant le dépouillement — exact pour des poids entiers, sans toucher au moteur.
function expand(rows: { ballot: Ballot; weight: number }[]): Ballot[] {
  const out: Ballot[] = [];
  for (const r of rows) for (let i = 0; i < Math.max(1, r.weight); i++) out.push(r.ballot);
  return out;
}

interface Cell {
  result: ComputeResult | null;
  voters: number;
}

export default function EventResults({ resolutions, convenedCount }: { resolutions: ResolutionRow[]; convenedCount: number }) {
  const t = useTranslations("Org");
  const locale = useLocale();
  const [data, setData] = useState<Record<string, Cell>>({});

  useEffect(() => {
    let cancel = false;
    (async () => {
      const entries: Record<string, Cell> = {};
      for (const r of resolutions) {
        try {
          const rows = await getResolutionBallots(r.id);
          entries[r.id] = {
            result: compute({ recipe: r.recipe, options: r.options, ballots: expand(rows) }, locale),
            voters: rows.length,
          };
        } catch {
          entries[r.id] = { result: null, voters: 0 };
        }
      }
      if (!cancel) setData(entries);
    })();
    return () => {
      cancel = true;
    };
  }, [resolutions, locale]);

  if (!resolutions.length) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19, marginBottom: 12 }}>{t("results")}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {resolutions.map((r) => {
          const d = data[r.id];
          if (!d) return null;
          if (!d.result)
            return (
              <div key={r.id} style={{ background: "#fff", border: `2.5px solid ${INK}`, borderRadius: 16, padding: "16px 18px" }}>
                <div style={{ fontWeight: 700 }}>{r.question}</div>
                <div style={{ color: MUTED, marginTop: 6, fontSize: 14 }}>{t("resNoBallots")}</div>
              </div>
            );
          return (
            <div key={r.id}>
              <div style={{ fontSize: 12.5, color: SUBINK, fontWeight: 700, marginBottom: 6 }}>
                {t("participation", { voted: d.voters, total: convenedCount })}
              </div>
              <ResultCard result={d.result} question={r.question} ballotCount={d.voters} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
