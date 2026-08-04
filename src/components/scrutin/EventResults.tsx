"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { getEventAssignData, getResolutionBallots, type ResolutionRow } from "@/lib/db/events";
import { compute } from "@/lib/voting/engine";
import type { Ballot, ComputeResult } from "@/lib/voting/types";
import { isAssignMethod } from "@/lib/assign/methods";
import type { AssignRowData } from "@/lib/assign/run";
import AssignResult from "./AssignResult";
import ResultCard from "./ResultCard";
import { FONT_DISPLAY, GREENTXT, INK, MUTED, REDTXT, SUBINK } from "./theme";

// Vote pondéré : on duplique chaque bulletin selon le poids du membre (tantièmes…)
// avant le dépouillement — exact pour des poids entiers, sans toucher au moteur.
function expand(rows: { ballot: Ballot; weight: number }[]): Ballot[] {
  const out: Ballot[] = [];
  for (const r of rows) for (let i = 0; i < Math.max(1, r.weight); i++) out.push(r.ballot);
  return out;
}

// Majorité requise par la résolution (recipe.threshold). Arithmétique entière exacte :
// >1/2 (absolue), ≥2/3, ≥3/4 — pas d'imprécision flottante.
function meetsThreshold(support: number, total: number, threshold: number): boolean {
  if (threshold >= 75) return support * 4 >= total * 3;
  if (threshold >= 67) return support * 3 >= total * 2;
  return support * 2 > total;
}

interface Verdict {
  adopted: boolean;
  sharePct: number;
  threshold: number;
}

interface Cell {
  result: ComputeResult | null;
  /** Résolution d'affectation : lignes convoqué + classement (pas de compute()). */
  assignRows: AssignRowData[] | null;
  voters: number;
  verdict: Verdict | null;
  required: number; // 0 = pas de quorum
  quorumMet: boolean;
}

export default function EventResults({
  resolutions,
  convenedCount,
  quorum,
  getBallots,
}: {
  resolutions: ResolutionRow[];
  convenedCount: number;
  quorum: number;
  // Source des bulletins. Défaut = lecture organisateur (RLS) ; le bilan votant
  // injecte les bulletins déjà récupérés (anonymes) via get_event_results.
  getBallots?: (r: ResolutionRow) => Promise<{ ballot: Ballot; weight: number }[]>;
}) {
  const t = useTranslations("Org");
  const locale = useLocale();
  const [data, setData] = useState<Record<string, Cell>>({});

  useEffect(() => {
    let cancel = false;
    (async () => {
      const entries: Record<string, Cell> = {};
      for (const r of resolutions) {
        try {
          // Affectation : votants + classements via la RPC dédiée (post-clôture),
          // le calcul vit dans AssignResult — pas de compute() ni de verdict.
          if (isAssignMethod(r.recipe.assign)) {
            const aRows = await getEventAssignData(r.token);
            const votedN = aRows.filter((x) => x.voted).length;
            const req = quorum > 0 ? Math.ceil((quorum / 100) * convenedCount) : 0;
            entries[r.id] = {
              result: null,
              assignRows: aRows,
              voters: votedN,
              verdict: null,
              required: req,
              quorumMet: req === 0 || votedN >= req,
            };
            continue;
          }
          const rows = await (getBallots ? getBallots(r) : getResolutionBallots(r.id));
          const expanded = expand(rows);
          const result = compute({ recipe: r.recipe, options: r.options, ballots: expanded }, locale);
          // Verdict (majorité qualifiée) — seulement pour le décompte majoritaire,
          // seul cadre où « Pour/Contre + seuil » a un sens standard.
          let verdict: Verdict | null = null;
          if (result && r.recipe.counting === "majority" && expanded.length) {
            const winnerIdx = result.bars[0]?.idx ?? 0;
            const support = expanded.filter((b) => b.ranking[0] === winnerIdx).length;
            verdict = {
              adopted: meetsThreshold(support, expanded.length, r.recipe.threshold),
              sharePct: Math.round((100 * support) / expanded.length),
              threshold: r.recipe.threshold,
            };
          }
          const required = quorum > 0 ? Math.ceil((quorum / 100) * convenedCount) : 0;
          entries[r.id] = {
            result,
            assignRows: null,
            voters: rows.length,
            verdict,
            required,
            quorumMet: required === 0 || rows.length >= required,
          };
        } catch {
          entries[r.id] = { result: null, assignRows: null, voters: 0, verdict: null, required: 0, quorumMet: true };
        }
      }
      if (!cancel) setData(entries);
    })();
    return () => {
      cancel = true;
    };
    // getBallots est volontairement hors deps : il lit des données déjà stables
    // (ballotsMap mémoïsé) ; l'inclure relancerait le fetch à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolutions, locale, quorum, convenedCount]);

  if (!resolutions.length) return null;

  // Synthèse : conditions du vote (corps électoral, quorum) + bilan adoptées/rejetées.
  const cells = resolutions.map((r) => data[r.id]).filter(Boolean) as Cell[];
  const adopted = cells.filter((c) => c.verdict && c.quorumMet && c.verdict.adopted).length;
  const rejected = cells.filter((c) => c.verdict && c.quorumMet && !c.verdict.adopted).length;
  const quorumFailed = cells.filter((c) => c.required > 0 && !c.quorumMet).length;
  const required = quorum > 0 ? Math.ceil((quorum / 100) * convenedCount) : 0;

  const thresholdLabel = (thr: number) =>
    thr >= 75 ? t("thrThreeQuarters") : thr >= 67 ? t("thrTwoThirds") : t("thrAbsolute");

  const badge = (bg: string, fg: string, text: string) => (
    <span style={{ fontSize: 12, fontWeight: 800, color: fg, background: bg, padding: "4px 10px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.03em" }}>
      {text}
    </span>
  );

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19, marginBottom: 12 }}>{t("results")}</div>

      <div style={{ background: "#fff", border: `2.5px solid ${INK}`, borderRadius: 16, padding: "13px 16px", marginBottom: 14, boxShadow: `4px 4px 0 ${INK}` }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15.5, marginBottom: 7 }}>{t("recapTitle")}</div>
        <div style={{ fontSize: 12.5, color: SUBINK, fontWeight: 600, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span>{t("recapElectorate", { count: convenedCount })}</span>
          <span style={{ color: MUTED }}>·</span>
          <span>{required > 0 ? t("recapQuorumReq", { pct: quorum, votes: required }) : t("recapQuorumNone")}</span>
        </div>
        {adopted + rejected > 0 && (
          <div style={{ fontSize: 14.5, fontWeight: 800, marginTop: 8, color: INK }}>
            {t("recapOutcome", { adopted, rejected })}
            {quorumFailed > 0 && <span style={{ color: REDTXT, fontWeight: 700 }}> {t("recapQuorumFailed", { count: quorumFailed })}</span>}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {resolutions.map((r) => {
          const d = data[r.id];
          if (!d) return null;
          // Résolution d'affectation : participation + quorum, puis le tableau d'affectation.
          if (d.assignRows) {
            return (
              <div key={r.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, color: SUBINK, fontWeight: 700 }}>
                    {t("participation", { voted: d.voters, total: convenedCount })}
                  </span>
                  {d.required > 0 &&
                    (d.quorumMet
                      ? badge("#e7f6ec", GREENTXT, t("quorumMet"))
                      : badge("#fdecec", REDTXT, t("quorumNotMet", { required: d.required })))}
                </div>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{r.question}</div>
                {d.voters > 0 ? (
                  <AssignResult poll={r} rows={d.assignRows} />
                ) : (
                  <div style={{ background: "#fff", border: `2.5px solid ${INK}`, borderRadius: 16, padding: "16px 18px", color: MUTED, fontSize: 14 }}>
                    {t("resNoBallots")}
                  </div>
                )}
              </div>
            );
          }
          if (!d.result)
            return (
              <div key={r.id} style={{ background: "#fff", border: `2.5px solid ${INK}`, borderRadius: 16, padding: "16px 18px" }}>
                <div style={{ fontWeight: 700 }}>{r.question}</div>
                <div style={{ color: MUTED, marginTop: 6, fontSize: 14 }}>{t("resNoBallots")}</div>
              </div>
            );
          return (
            <div key={r.id}>
              {/* bandeau participation + quorum + verdict */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, color: SUBINK, fontWeight: 700 }}>
                  {t("participation", { voted: d.voters, total: convenedCount })}
                </span>
                {d.required > 0 &&
                  (d.quorumMet
                    ? badge("#e7f6ec", GREENTXT, t("quorumMet"))
                    : badge("#fdecec", REDTXT, t("quorumNotMet", { required: d.required })))}
                {d.verdict &&
                  d.quorumMet &&
                  (d.verdict.adopted
                    ? badge("#e7f6ec", GREENTXT, t("adopted"))
                    : badge("#fdecec", REDTXT, t("rejected")))}
                {d.verdict && d.quorumMet && (
                  <span style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>
                    {t("verdictDetail", { share: d.verdict.sharePct, threshold: thresholdLabel(d.verdict.threshold) })}
                  </span>
                )}
              </div>
              <ResultCard result={d.result} question={r.question} ballotCount={d.voters} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
