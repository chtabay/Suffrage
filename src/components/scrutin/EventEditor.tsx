"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import {
  addResolution,
  convene,
  getEvent,
  listConvened,
  listMembers,
  listResolutions,
  removeResolution,
  updateEvent,
  type EventMember,
  type EventRow,
  type Member,
  type ResolutionRow,
} from "@/lib/db/events";
import { recipeForSystem, resolveKey } from "@/lib/voting/engine";
import { APP_URL } from "@/lib/voting/aiPrompt";
import { splitLeadingEmoji } from "@/lib/voting/draft";
import { SYSTEM_ORDER } from "@/lib/voting/systems";
import { OrgShell } from "./SpacesHome";
import EventResults from "./EventResults";
import { CREAM, FONT_BODY, FONT_DISPLAY, GREEN, INK, MUTED, REDTXT, SUBINK } from "./theme";

const card = {
  background: "#fff",
  border: `2.5px solid ${INK}`,
  borderRadius: 18,
  padding: "20px 22px",
  boxShadow: `5px 5px 0 ${INK}`,
} as const;

const btn = (bg: string, fg: string) =>
  ({
    fontFamily: FONT_DISPLAY,
    fontWeight: 800,
    fontSize: 14.5,
    cursor: "pointer",
    border: `2.5px solid ${INK}`,
    background: bg,
    color: fg,
    padding: "11px 18px",
    borderRadius: 11,
  }) as const;

export default function EventEditor({ eventId }: { eventId: string }) {
  const t = useTranslations("Org");
  const tm = useTranslations("Methods");
  const locale = useLocale();
  // Préréglage du cas le plus courant en AG : Pour / Contre / Abstention (localisé).
  const presetOpts = () => [t("presetFor"), t("presetAgainst"), t("presetAbstain")];
  const { user, loading } = useAuth();
  const [ev, setEv] = useState<EventRow | null>(null);
  const [resolutions, setResolutions] = useState<ResolutionRow[]>([]);
  const [roster, setRoster] = useState<Member[]>([]);
  const [convened, setConvened] = useState<EventMember[]>([]);
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState<string[]>(presetOpts);
  const [method, setMethod] = useState("fptp");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [sendMsg, setSendMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [capInput, setCapInput] = useState("");
  const [majority, setMajority] = useState(50);
  const [quorumInput, setQuorumInput] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    const e = await getEvent(eventId);
    setEv(e);
    if (e) {
      setCapInput(e.enroll_cap != null ? String(e.enroll_cap) : "");
      setQuorumInput(e.quorum ? String(e.quorum) : "");
      const [r, c] = await Promise.all([listResolutions(eventId), listConvened(eventId)]);
      setResolutions(r);
      setConvened(c);
      if (e.space_id) setRoster(await listMembers(e.space_id));
    }
  }, [user, eventId]);
  useEffect(() => {
    load();
  }, [load]);

  const setOpt = (i: number, v: string) => setOpts((a) => a.map((o, j) => (j === i ? v : o)));
  const addOpt = () => setOpts((a) => (a.length < 8 ? [...a, ""] : a));
  const removeOpt = (i: number) => setOpts((a) => (a.length > 2 ? a.filter((_, j) => j !== i) : a));
  const canAddRes = q.trim().length > 0 && opts.filter((o) => o.trim()).length >= 2;

  const addRes = async () => {
    if (!canAddRes || busy) return;
    const options = opts
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 8)
      .map((l) => {
        const { icon, name } = splitLeadingEmoji(l, "•");
        return { icon, name: name.slice(0, 80) };
      });
    setBusy(true);
    try {
      await addResolution(eventId, { question: q, options, recipe: { ...recipeForSystem(method), threshold: majority }, orderIndex: resolutions.length });
      setResolutions(await listResolutions(eventId));
      setQ("");
      setOpts(presetOpts());
    } catch {
      /* noop */
    }
    setBusy(false);
  };

  const delRes = async (id: string) => {
    await removeResolution(id);
    setResolutions((l) => l.filter((r) => r.id !== id));
  };

  const doConvene = async () => {
    const have = new Set(convened.map((c) => c.member_id));
    const toAdd = roster.filter((m) => !have.has(m.id));
    if (!toAdd.length || busy) return;
    setBusy(true);
    try {
      const added = await convene(eventId, toAdd);
      setConvened((c) => [...c, ...added]);
    } catch {
      /* noop */
    }
    setBusy(false);
  };

  const setStatus = async (status: "draft" | "open" | "closed") => {
    await updateEvent(eventId, { status });
    setEv((e) => (e ? { ...e, status } : e));
  };

  const copy = (token: string) => {
    navigator.clipboard?.writeText(`${APP_URL}/e/${token}`);
    setCopied(token);
    setTimeout(() => setCopied((c) => (c === token ? null : c)), 1600);
  };

  const enrollUrl = ev?.enroll_token ? `${APP_URL}/rejoindre/${ev.enroll_token}` : "";
  const enrolledCount = convened.filter((c) => c.self_enrolled).length;

  const toggleEnroll = async () => {
    if (!ev) return;
    const next = !ev.enroll_open;
    await updateEvent(eventId, { enroll_open: next });
    setEv((e) => (e ? { ...e, enroll_open: next } : e));
  };

  const saveCap = async () => {
    const n = capInput.trim() ? Math.max(1, parseInt(capInput, 10) || 1) : null;
    await updateEvent(eventId, { enroll_cap: n });
    setEv((e) => (e ? { ...e, enroll_cap: n } : e));
    setCapInput(n != null ? String(n) : "");
  };

  const copyEnroll = () => {
    navigator.clipboard?.writeText(enrollUrl);
    setCopied("__enroll__");
    setTimeout(() => setCopied((c) => (c === "__enroll__" ? null : c)), 1600);
  };

  const saveQuorum = async () => {
    const n = Math.min(100, Math.max(0, parseInt(quorumInput, 10) || 0));
    await updateEvent(eventId, { quorum: n });
    setEv((e) => (e ? { ...e, quorum: n } : e));
    setQuorumInput(n ? String(n) : "");
  };

  const sendConvocations = async () => {
    if (sending) return;
    setSending(true);
    setSendMsg("");
    try {
      const res = await fetch(`/api/events/${eventId}/convoke`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      if (res.ok) {
        const d = (await res.json()) as { sent: number; total: number };
        setSendMsg(t("sentResult", { sent: d.sent, total: d.total }));
        load();
      } else {
        setSendMsg(t("emailError"));
      }
    } catch {
      setSendMsg(t("emailError"));
    }
    setSending(false);
  };

  if (loading) return <OrgShell><div style={{ ...card, color: MUTED }}>{t("loading")}</div></OrgShell>;
  if (!user) return <OrgShell><div style={card}>{t("signInPrompt")}</div></OrgShell>;
  if (!ev) return <OrgShell><div style={{ ...card, color: MUTED }}>{t("loading")}</div></OrgShell>;

  const statusKey = ev.status === "open" ? "statusOpen" : ev.status === "closed" ? "statusClosed" : "statusDraft";

  return (
    <OrgShell>
      {ev.space_id && (
        <Link href={`/espaces/${ev.space_id}`} style={{ color: SUBINK, fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
          {t("backToSpace")}
        </Link>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "10px 0 0", flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: "clamp(24px,5vw,34px)", letterSpacing: "-0.03em", margin: 0 }}>{ev.title}</h1>
        <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", background: ev.status === "open" ? GREEN : INK, padding: "5px 11px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.04em" }}>{t(statusKey)}</span>
      </div>

      {ev.status === "draft" && <div style={{ ...card, marginTop: 16, background: "#fff4e0" }}>{t("draftHint")}</div>}

      {/* ---- Résolutions ---- */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19 }}>{t("resolutions")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 13 }}>
          {!resolutions.length && <div style={{ color: MUTED, fontSize: 14 }}>{t("noResolutions")}</div>}
          {resolutions.map((r, i) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, background: CREAM, border: `2px solid ${INK}`, borderRadius: 11, padding: "10px 13px" }}>
              <span style={{ fontWeight: 800, color: SUBINK, fontSize: 13 }}>{i + 1}</span>
              <span style={{ fontWeight: 700, fontSize: 14.5, flex: 1 }}>{r.question}</span>
              <span style={{ fontSize: 12, color: SUBINK, fontWeight: 700 }}>{tm(`${resolveKey(r.recipe)}.name`)}</span>
              {ev.status === "draft" && (
                <button onClick={() => delRes(r.id)} style={{ border: "none", background: "none", color: REDTXT, cursor: "pointer", fontSize: 17, lineHeight: 1 }}>×</button>
              )}
            </div>
          ))}
        </div>

        {ev.status === "draft" && (
          <div style={{ marginTop: 15, borderTop: `2px dashed #E4DBC6`, paddingTop: 15 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: SUBINK, marginBottom: 8 }}>{t("addResolutionTitle")}</div>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("resQuestionPlaceholder")} style={{ width: "100%", fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, padding: "10px 12px", border: `2px solid ${INK}`, borderRadius: 11, marginBottom: 8 }} />
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: SUBINK, marginBottom: 6 }}>{t("resOptionsTitle")}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {opts.map((o, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      value={o}
                      onChange={(e) => setOpt(i, e.target.value)}
                      placeholder={t("resOptionPlaceholder", { n: i + 1 })}
                      style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 14, padding: "9px 11px", border: `2px solid ${INK}`, borderRadius: 10 }}
                    />
                    {opts.length > 2 && (
                      <button onClick={() => removeOpt(i)} title={t("remove")} style={{ border: "none", background: "none", color: REDTXT, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 7 }}>
                {opts.length < 8 && (
                  <button onClick={addOpt} style={{ border: `2px dashed ${INK}`, background: "none", color: SUBINK, cursor: "pointer", fontSize: 13, fontWeight: 700, padding: "7px 12px", borderRadius: 10 }}>
                    {t("addOption")}
                  </button>
                )}
                <button onClick={() => setOpts(presetOpts())} style={{ border: `2px dashed ${INK}`, background: "none", color: SUBINK, cursor: "pointer", fontSize: 13, fontWeight: 700, padding: "7px 12px", borderRadius: 10 }}>
                  {t("presetButton")}
                </button>
                <button onClick={() => setOpts(["", ""])} style={{ border: `2px dashed ${INK}`, background: "none", color: MUTED, cursor: "pointer", fontSize: 13, fontWeight: 700, padding: "7px 12px", borderRadius: 10 }}>
                  {t("clearOptions")}
                </button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: SUBINK }}>{t("resMethod")}</span>
              <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, padding: "9px 11px", border: `2px solid ${INK}`, borderRadius: 10, background: "#fff" }}>
                {SYSTEM_ORDER.map((k) => (
                  <option key={k} value={k}>{tm(`${k}.name`)}</option>
                ))}
              </select>
              {(method === "fptp" || method === "runoff") && (
                <>
                  <span style={{ fontWeight: 700, fontSize: 13, color: SUBINK }}>{t("resMajority")}</span>
                  <select value={majority} onChange={(e) => setMajority(Number(e.target.value))} style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, padding: "9px 11px", border: `2px solid ${INK}`, borderRadius: 10, background: "#fff" }}>
                    <option value={50}>{t("thrAbsolute")}</option>
                    <option value={67}>{t("thrTwoThirds")}</option>
                    <option value={75}>{t("thrThreeQuarters")}</option>
                  </select>
                </>
              )}
              <button onClick={addRes} disabled={busy || !canAddRes} style={{ ...btn("#FFB627", INK), marginLeft: "auto", opacity: canAddRes ? 1 : 0.5, cursor: canAddRes ? "pointer" : "not-allowed" }}>{t("addResolution")}</button>
            </div>
          </div>
        )}
      </div>

      {/* ---- Convocation ---- */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19 }}>{t("convocation")}</div>
          <span style={{ color: SUBINK, fontWeight: 700, fontSize: 14 }}>{t("convenedCount", { count: convened.length })}</span>
        </div>
        {convened.length < roster.length && (
          <button onClick={doConvene} disabled={busy} style={{ ...btn(INK, "#fff"), marginTop: 13 }}>{t("convene")}</button>
        )}
        {convened.length > 0 && (
          <>
            <div style={{ fontSize: 12.5, color: MUTED, margin: "13px 0 8px" }}>{t("shareHint")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {convened.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, background: CREAM, border: `2px solid ${INK}`, borderRadius: 11, padding: "9px 12px" }}>
                  <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{c.name}</span>
                  {c.invited_at && <span style={{ fontSize: 11, fontWeight: 800, color: GREEN }}>{t("invitedBadge")}</span>}
                  <button onClick={() => copy(c.token)} style={{ border: `2px solid ${INK}`, background: copied === c.token ? GREEN : "#fff", color: copied === c.token ? "#fff" : INK, cursor: "pointer", fontSize: 12.5, fontWeight: 700, padding: "6px 11px", borderRadius: 9 }}>
                    {copied === c.token ? t("copied") : t("copyLink")}
                  </button>
                </div>
              ))}
            </div>
            {convened.some((c) => c.email) && (
              <button
                onClick={sendConvocations}
                disabled={sending}
                style={{ ...btn("#FFB627", INK), marginTop: 12, opacity: sending ? 0.6 : 1, cursor: sending ? "wait" : "pointer" }}
              >
                {sending ? t("sendingConvocations") : convened.some((c) => c.invited_at) ? t("resendConvocations") : t("sendConvocations")}
              </button>
            )}
            {sendMsg && <div style={{ marginTop: 10, fontWeight: 700, fontSize: 13.5, color: GREEN }}>{sendMsg}</div>}
          </>
        )}
      </div>

      {/* ---- Inscription ouverte ---- */}
      {ev.status !== "closed" && (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19 }}>{t("enrollTitle")}</div>
            {ev.enroll_open && <span style={{ color: SUBINK, fontWeight: 700, fontSize: 14 }}>{t("enrollEnrolled", { count: enrolledCount })}</span>}
          </div>
          <div style={{ fontSize: 12.5, color: MUTED, margin: "8px 0 12px" }}>{t("enrollHint")}</div>
          {!ev.enroll_open ? (
            <button onClick={toggleEnroll} style={btn(INK, "#fff")}>{t("enrollEnable")}</button>
          ) : (
            <>
              <div style={{ fontSize: 12.5, color: SUBINK, fontWeight: 700, marginBottom: 6 }}>{t("enrollShareHint")}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  readOnly
                  value={enrollUrl}
                  onFocus={(e) => e.target.select()}
                  style={{ flex: 1, minWidth: 220, fontFamily: FONT_BODY, fontSize: 13, padding: "9px 11px", border: `2px solid ${INK}`, borderRadius: 10, background: CREAM }}
                />
                <button
                  onClick={copyEnroll}
                  style={{ border: `2px solid ${INK}`, background: copied === "__enroll__" ? GREEN : "#fff", color: copied === "__enroll__" ? "#fff" : INK, cursor: "pointer", fontSize: 12.5, fontWeight: 700, padding: "8px 13px", borderRadius: 9 }}
                >
                  {copied === "__enroll__" ? t("copied") : t("copyLink")}
                </button>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: SUBINK }}>{t("enrollCap")}</span>
                <input
                  value={capInput}
                  onChange={(e) => setCapInput(e.target.value.replace(/[^0-9]/g, ""))}
                  onBlur={saveCap}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  placeholder={t("enrollCapPlaceholder")}
                  inputMode="numeric"
                  style={{ width: 110, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, padding: "8px 11px", border: `2px solid ${INK}`, borderRadius: 10 }}
                />
                <button onClick={toggleEnroll} style={{ ...btn("#fff", INK), marginLeft: "auto" }}>{t("enrollDisable")}</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ---- Quorum (paramètre d'événement) ---- */}
      {ev.status !== "closed" && (
        <div style={{ ...card, marginTop: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: SUBINK }}>{t("quorumLabel")}</span>
          <input
            value={quorumInput}
            onChange={(e) => setQuorumInput(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={saveQuorum}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            placeholder="0"
            inputMode="numeric"
            style={{ width: 80, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, padding: "8px 11px", border: `2px solid ${INK}`, borderRadius: 10 }}
          />
          <span style={{ fontSize: 13, color: MUTED }}>{t("quorumHint")}</span>
        </div>
      )}

      {/* ---- Résultats ---- */}
      {ev.status !== "draft" && <EventResults resolutions={resolutions} convenedCount={convened.length} quorum={ev.quorum} />}

      {/* ---- Ouverture / clôture ---- */}
      <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {ev.status === "draft" && (
          <button
            onClick={() => (resolutions.length ? setStatus("open") : alert(t("needResolutions")))}
            style={btn(GREEN, "#fff")}
          >
            {t("openEvent")}
          </button>
        )}
        {ev.status === "open" && <button onClick={() => setStatus("closed")} style={btn(INK, "#fff")}>{t("closeEvent")}</button>}
        {ev.status === "closed" && <button onClick={() => setStatus("open")} style={btn("#fff", INK)}>{t("reopenEvent")}</button>}
      </div>
    </OrgShell>
  );
}
