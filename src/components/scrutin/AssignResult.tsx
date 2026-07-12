"use client";

import { useTranslations } from "next-intl";
import type { Option, Recipe } from "@/lib/voting/types";
import { runAssignment, type AssignRowData } from "@/lib/assign/run";
import { ASSIGN_METHODS, isAssignMethod } from "@/lib/assign/methods";
import { completeRanking } from "@/lib/assign/engine";
import { candColor } from "@/lib/voting/systems";
import { CREAM, FONT_BODY, FONT_DISPLAY, INK, MUTED, SUBINK } from "./theme";

/**
 * Résultat d'une affectation close : tableau personne → objet (sens unique) ou
 * liste de binômes, avec la narration de la méthode. Le calcul est refait côté
 * client à partir des classements publiés (vérifiabilité).
 */
export default function AssignResult({
  poll,
  rows,
}: {
  /** Scrutin autonome (PollRow) ou résolution d'événement — seuls token/options/recipe servent. */
  poll: { token: string; options: Option[]; recipe: Recipe };
  rows: AssignRowData[];
}) {
  const ta = useTranslations("Assign");
  const key = poll.recipe.assign;
  if (!isAssignMethod(key) || rows.length === 0) return null;
  const def = ASSIGN_METHODS[key];
  const names = poll.options.map((o) => o.name);
  const outcome = runAssignment(key, poll.token, rows, names, poll.recipe.assignEndow, poll.recipe.assignA, poll.recipe.assignCaps);
  const optionOfPerson = (p: number) => names.findIndex((n) => n === rows[p].label);
  const rankBadge = (personIdx: number, optIdx: number) => {
    if (!rows[personIdx].voted) return null;
    const pos = completeRanking(rows[personIdx].ranking ?? [], names.length).indexOf(optIdx);
    if (pos < 0) return null;
    return (
      <span style={{ flex: "none", fontSize: 11.5, fontWeight: 800, background: def.tint, border: `1.5px solid ${INK}`, borderRadius: 999, padding: "2px 8px", color: INK }}>
        {ta("gotRank", { n: pos + 1 })}
      </span>
    );
  };
  const notVotedBadge = (personIdx: number) =>
    rows[personIdx].voted ? null : (
      <span style={{ flex: "none", fontSize: 11, fontWeight: 700, color: MUTED }}>· {ta("notVoted")}</span>
    );

  const row = (children: React.ReactNode, k: string | number) => (
    <div
      key={k}
      style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: CREAM, border: `2px solid ${INK}`, borderRadius: 12, padding: "10px 13px", fontFamily: FONT_BODY }}
    >
      {children}
    </div>
  );

  return (
    <div style={{ background: "#fff", border: `2.5px solid ${INK}`, borderRadius: 20, padding: 22, boxShadow: `5px 5px 0 ${def.color}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 22 }}>{def.icon}</span>
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19 }}>
          {def.oneSided || def.twoLists ? ta("resultTitle") : ta("pairsTitle")}
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: SUBINK }}>· {ta(`methods.${key}.name`)}</span>
      </div>

      {outcome.fallback && (
        <div style={{ marginTop: 14, background: "#fff4e0", border: `2px solid ${INK}`, borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#8a5a00" }}>⚠️ {ta("fallbackTitle")}</div>
          <div style={{ fontSize: 13, color: "#8a5a00", marginTop: 5, lineHeight: 1.5 }}>{ta("fallbackText")}</div>
        </div>
      )}

      {outcome.order && (
        <div style={{ marginTop: 12, fontSize: 12.5, color: SUBINK, lineHeight: 1.5 }}>
          🎲 {ta("orderNote")}{" "}
          <b style={{ color: INK }}>{outcome.order.map((i) => rows[i]?.label ?? "?").join(" → ")}</b>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 16 }}>
        {def.oneSided && outcome.assignment
          ? rows.map((r, i) => {
              const oi = outcome.assignment![i];
              return row(
                <>
                  <span style={{ fontWeight: 800, fontSize: 14.5, color: INK }}>{r.label}</span>
                  {outcome.endowment && (
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: MUTED }}>
                      ({ta("owned")} {poll.options[outcome.endowment[i]]?.name})
                    </span>
                  )}
                  {notVotedBadge(i)}
                  <span style={{ flex: 1 }} />
                  {oi === null ? (
                    <span style={{ fontSize: 13, fontWeight: 700, color: MUTED }}>{ta("unassigned")}</span>
                  ) : (
                    <>
                      <span style={{ width: 28, height: 28, flex: "none", borderRadius: 8, border: `2px solid ${INK}`, background: candColor(oi), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                        {poll.options[oi]?.icon}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: INK }}>{poll.options[oi]?.name}</span>
                      {rankBadge(i, oi)}
                    </>
                  )}
                </>,
                i,
              );
            })
          : outcome.matches
            ? (() => {
                const nA = poll.recipe.assignA ?? 0;
                const matchedA = new Set(outcome.matches.map((m) => m.a));
                const unmatchedA = rows
                  .map((_, i) => i)
                  .filter((i) => {
                    const oi = optionOfPerson(i);
                    return oi >= 0 && oi < nA && !matchedA.has(i);
                  });
                return (
                  <>
                    {outcome.matches.map((m) =>
                      row(
                        <>
                          <span style={{ fontWeight: 800, fontSize: 14.5, color: INK }}>{rows[m.a].label}</span>
                          {rankBadge(m.a, optionOfPerson(m.b))}
                          {notVotedBadge(m.a)}
                          <span style={{ fontWeight: 800, color: SUBINK }}>→</span>
                          <span style={{ fontWeight: 800, fontSize: 14.5, color: INK }}>{rows[m.b].label}</span>
                          {rankBadge(m.b, optionOfPerson(m.a))}
                          {notVotedBadge(m.b)}
                        </>,
                        `${m.a}-${m.b}`,
                      ),
                    )}
                    {unmatchedA.map((i) =>
                      row(
                        <>
                          <span style={{ fontWeight: 800, fontSize: 14.5, color: INK }}>{rows[i].label}</span>
                          <span style={{ flex: 1 }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: MUTED }}>{ta("unassigned")}</span>
                        </>,
                        `u${i}`,
                      ),
                    )}
                  </>
                );
              })()
          : outcome.partner
            ? rows
                .map((_, i) => i)
                .filter((i) => outcome.partner![i] > i)
                .map((i) => {
                  const j = outcome.partner![i];
                  return row(
                    <>
                      <span style={{ fontWeight: 800, fontSize: 14.5, color: INK }}>{rows[i].label}</span>
                      {rankBadge(i, optionOfPerson(j))}
                      {notVotedBadge(i)}
                      <span style={{ fontWeight: 800, color: SUBINK }}>↔</span>
                      <span style={{ fontWeight: 800, fontSize: 14.5, color: INK }}>{rows[j].label}</span>
                      {rankBadge(j, optionOfPerson(i))}
                      {notVotedBadge(j)}
                    </>,
                    `${i}-${j}`,
                  );
                })
            : null}
      </div>

      <div style={{ marginTop: 16, fontSize: 12.5, color: SUBINK, lineHeight: 1.5 }}>{ta(`methods.${key}.how`)}</div>
      <div style={{ marginTop: 8, fontSize: 12, color: MUTED, lineHeight: 1.5 }}>{ta("transparencyNote")}</div>
    </div>
  );
}
