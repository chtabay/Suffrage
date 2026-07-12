"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { castEventBallot, getEventContext, getEventResults, type EventContext, type EventResultsData } from "@/lib/db/events";
import { useAuth } from "@/lib/auth/useAuth";
import { Link } from "@/i18n/navigation";
import {
  describeRecipe,
  methodMode,
  normalizeFromApproved,
  normalizeFromGrades,
  normalizeFromRank,
  normalizeFromSingle,
  operativeMethod,
} from "@/lib/voting/engine";
import type { Ballot, BallotMode } from "@/lib/voting/types";
import BallotCard, { EMPTY_DRAFT, type BallotDraft } from "./BallotCard";
import { ASSIGN_METHODS, isAssignMethod } from "@/lib/assign/methods";
import EventResults from "./EventResults";
import PlacetMark from "./PlacetMark";
import { CREAM, FONT_BODY, FONT_DISPLAY, GREEN, INK, MUTED, SUBINK } from "./theme";

type Resolution = EventContext["resolutions"][number];

function draftToBallot(mode: BallotMode, d: BallotDraft, n: number): Ballot | null {
  const seed = Math.floor(Math.random() * 100000);
  if (mode === "single") return d.choice === null ? null : normalizeFromSingle(d.choice, n, seed);
  if (mode === "approve") return d.approved.length ? normalizeFromApproved(d.approved, n, seed) : null;
  if (mode === "rank") return d.rank.length ? normalizeFromRank(d.rank, n, seed) : null;
  return normalizeFromGrades(d.grades, n, seed);
}

const card = {
  background: "#fff",
  border: `2.5px solid ${INK}`,
  borderRadius: 18,
  padding: "20px 22px",
  boxShadow: `5px 5px 0 ${INK}`,
} as const;

export default function LivretVote({ token }: { token: string }) {
  const t = useTranslations("Livret");
  const tv = useTranslations("Vote");
  const ta = useTranslations("Assign");
  const { user, loading: authLoading } = useAuth();
  const [ctx, setCtx] = useState<EventContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, BallotDraft>>({});
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});
  const [results, setResults] = useState<EventResultsData | null>(null);

  const load = useCallback(async () => {
    try {
      const c = await getEventContext(token);
      setCtx(c);
      if (c) {
        setVoted(new Set(c.resolutions.filter((r) => r.voted).map((r) => r.token)));
        if (c.event.status === "closed") setResults(await getEventResults(token));
      }
    } catch {
      setCtx(null);
    }
    setLoading(false);
  }, [token]);
  useEffect(() => {
    load();
  }, [load]);

  // Mode live : on rafraîchit pour suivre la résolution ouverte par l'organisateur.
  useEffect(() => {
    if (ctx?.event.mode !== "live" || ctx.event.status !== "open") return;
    const id = setInterval(() => load(), 4000);
    return () => clearInterval(id);
  }, [ctx?.event.mode, ctx?.event.status, load]);

  const setD = (rt: string, fn: (d: BallotDraft) => BallotDraft) =>
    setDrafts((all) => ({ ...all, [rt]: fn(all[rt] ?? EMPTY_DRAFT) }));

  const submit = async (res: Resolution) => {
    const mode = methodMode(operativeMethod(res.recipe));
    // Affectation : classement COMPLET exigé (pas de complétion aléatoire).
    if (isAssignMethod(res.recipe.assign) && (drafts[res.token]?.rank.length ?? 0) < res.options.length) {
      setErr((e) => ({ ...e, [res.token]: ta("instructionAssign") }));
      return;
    }
    const b = draftToBallot(mode, drafts[res.token] ?? EMPTY_DRAFT, res.options.length);
    if (!b) {
      setErr((e) => ({ ...e, [res.token]: t("emptyBallot") }));
      return;
    }
    setBusy(res.token);
    setErr((e) => ({ ...e, [res.token]: "" }));
    try {
      const r = await castEventBallot(token, res.token, b);
      if (r === "ok" || r === "already") setVoted((v) => new Set(v).add(res.token));
      else setErr((e) => ({ ...e, [res.token]: t(r === "closed" ? "resClosed" : "error") }));
    } catch {
      setErr((e) => ({ ...e, [res.token]: t("error") }));
    }
    setBusy(null);
  };

  // Bulletins (anonymes) par résolution, pour réutiliser EventResults côté votant.
  const ballotsMap = useMemo(() => {
    const m: Record<string, { ballot: Ballot; weight: number }[]> = {};
    for (const r of results?.resolutions ?? [])
      m[r.id] = r.ballots.map((b) => ({ ballot: { ranking: b.ranking, grades: b.grades, district: b.district ?? 0 }, weight: b.weight }));
    return m;
  }, [results]);

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: FONT_BODY }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 18px 90px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
          <PlacetMark size={36} />
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 21, letterSpacing: "-0.02em" }}>Placet</span>
        </div>
        {children}
      </div>
    </div>
  );

  if (loading) return <Shell><div style={{ ...card, color: MUTED }}>{t("loading")}</div></Shell>;
  if (!ctx) return <Shell><div style={{ ...card }}><b>{t("invalidTitle")}</b><div style={{ color: MUTED, marginTop: 6 }}>{t("invalidDesc")}</div></div></Shell>;

  const ev = ctx.event;
  const total = ctx.resolutions.length;
  const done = ctx.resolutions.filter((r) => voted.has(r.token)).length;

  return (
    <Shell>
      <div style={{ ...card, background: INK, color: "#fff", boxShadow: `5px 5px 0 ${GREEN}` }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: "clamp(22px,5vw,30px)", lineHeight: 1.1 }}>
          {ev.title}
        </div>
        {ev.description && <div style={{ fontSize: 14.5, color: "#cdd3df", marginTop: 8, lineHeight: 1.5 }}>{ev.description}</div>}
        <div style={{ fontSize: 13.5, color: "#aeb6c6", marginTop: 12 }}>
          {t("votingAs", { name: ctx.member.name })} · {t("progress", { done, total })}
        </div>
      </div>

      {ev.status === "draft" && (
        <div style={{ ...card, marginTop: 16, background: "#fff4e0" }}>{t("notOpen")}</div>
      )}
      {ev.status === "closed" && (
        <div style={{ ...card, marginTop: 16, background: "#fff4e0" }}>{t("eventClosed")}</div>
      )}

      {ev.status === "closed" && results?.status === "closed" && (
        <EventResults
          resolutions={results.resolutions ?? []}
          convenedCount={results.convened ?? 0}
          quorum={results.quorum ?? 0}
          getBallots={(r) => Promise.resolve(ballotsMap[r.id] ?? [])}
        />
      )}

      {ev.status !== "closed" && (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
        {ctx.resolutions.map((res, idx) => {
          const isVoted = voted.has(res.token);
          const liveLocked = ev.mode === "live" && ev.current_poll_id != null && ev.current_poll_id !== res.id;
          const locked = ev.status !== "open" || res.status === "closed";
          const mode = methodMode(operativeMethod(res.recipe));
          const aKey = isAssignMethod(res.recipe.assign) ? res.recipe.assign : null;
          const color = aKey ? ASSIGN_METHODS[aKey].color : describeRecipe(res.recipe).color;
          return (
            <div key={res.token} style={card}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: SUBINK, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {t("resolution", { n: idx + 1 })}
              </div>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19, marginTop: 4, lineHeight: 1.15 }}>
                {res.question}
              </div>
              {res.description && <div style={{ fontSize: 14, color: MUTED, marginTop: 6, lineHeight: 1.5 }}>{res.description}</div>}

              {isVoted ? (
                <div style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700, color: GREEN }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", background: GREEN, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>✓</span>
                  {t("voted")}
                </div>
              ) : locked ? (
                <div style={{ marginTop: 14, color: MUTED, fontWeight: 600 }}>{t("resClosed")}</div>
              ) : liveLocked ? (
                <div style={{ marginTop: 14, color: MUTED, fontWeight: 600 }}>🔒 {t("upcoming")}</div>
              ) : (
                <div style={{ marginTop: 14 }}>
                  {aKey && (
                    <div style={{ fontSize: 13, fontWeight: 600, color: MUTED, marginBottom: 10, lineHeight: 1.45 }}>
                      {ta("instructionAssign")}
                    </div>
                  )}
                  <BallotCard
                    mode={mode}
                    options={res.options}
                    color={color}
                    draft={drafts[res.token] ?? EMPTY_DRAFT}
                    onChoice={(i) => setD(res.token, (d) => ({ ...d, choice: i }))}
                    onToggle={(i) =>
                      setD(res.token, (d) => ({
                        ...d,
                        approved: d.approved.includes(i) ? d.approved.filter((x) => x !== i) : [...d.approved, i],
                      }))
                    }
                    onRank={(i) => setD(res.token, (d) => (d.rank.includes(i) ? d : { ...d, rank: [...d.rank, i] }))}
                    onResetRank={() => setD(res.token, (d) => ({ ...d, rank: [] }))}
                    onGrade={(i, gi) => setD(res.token, (d) => ({ ...d, grades: { ...d.grades, [i]: gi } }))}
                  />
                  {err[res.token] && <div style={{ color: "#c0392b", fontSize: 13.5, marginTop: 10 }}>{err[res.token]}</div>}
                  <button
                    onClick={() => submit(res)}
                    disabled={busy === res.token}
                    className="dc-bright"
                    style={{
                      marginTop: 14,
                      width: "100%",
                      fontFamily: FONT_DISPLAY,
                      fontWeight: 800,
                      fontSize: 15.5,
                      cursor: "pointer",
                      border: `2.5px solid ${INK}`,
                      background: color,
                      color: "#fff",
                      padding: 13,
                      borderRadius: 12,
                    }}
                  >
                    {busy === res.token ? tv("submitting") : t("voteResolution")}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {total > 0 && done === total && (
        <div style={{ ...card, marginTop: 16, background: "#e7f7df", borderColor: INK }}>
          <b>{t("allDoneTitle")}</b>
          <div style={{ color: SUBINK, marginTop: 6 }}>{t("allDoneDesc")}</div>
        </div>
      )}

      {/* Conversion : le votant n'a pas de compte → on lui propose d'en créer un. */}
      {done > 0 && !authLoading && !user && (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>{t("accountTitle")}</div>
          <div style={{ color: SUBINK, marginTop: 8, lineHeight: 1.55, fontSize: 14.5 }}>{t("accountDesc")}</div>
          <Link
            href="/espaces"
            className="dc-bright"
            style={{ display: "inline-block", marginTop: 14, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, cursor: "pointer", border: `2.5px solid ${INK}`, background: INK, color: "#fff", padding: "12px 18px", borderRadius: 12, textDecoration: "none" }}
          >
            {t("accountCta")}
          </Link>
        </div>
      )}
    </Shell>
  );
}
