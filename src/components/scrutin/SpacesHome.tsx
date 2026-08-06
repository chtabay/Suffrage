"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { createSpace, listSpacesWithStats, type SpaceStats } from "@/lib/db/events";
import { getMyFeed, type MyFeed } from "@/lib/db/participation";
import PlacetMark from "./PlacetMark";
import Nav from "./Nav";
import { CORAL, CREAM, FONT_BODY, FONT_DISPLAY, GREENTXT, INK, MUTED, REDTXT, SUBINK } from "./theme";

const card = {
  background: "#fff",
  border: `2.5px solid ${INK}`,
  borderRadius: 18,
  padding: "20px 22px",
  boxShadow: `5px 5px 0 ${INK}`,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Coquille des surfaces du COMPTE (mes votes, mes scrutins, groupes).
 *
 * Elle n'offrait qu'un logo ramenant à l'accueil : depuis n'importe laquelle de
 * ces pages, rejoindre une autre imposait un aller-retour par la page d'accueil.
 * La navigation y est désormais montée — elle est autonome depuis qu'elle ne
 * dépend plus du contrôleur de création.
 */
export function OrgShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: FONT_BODY }}>
      <Nav />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 18px 90px" }}>
        {children}
      </div>
    </div>
  );
}

export default function SpacesHome() {
  const t = useTranslations("Org");
  const { user, loading, signIn, signInWithEmail, signInPassword, signUpPassword, resetPassword, updatePassword } = useAuth();
  const [spaces, setSpaces] = useState<SpaceStats[]>([]);
  // Les cercles où je suis MEMBRE — pas animateur. C'est le premier consommateur
  // de l'identité de participant : sans le rattachement compte ↔ appartenance,
  // cette liste ne pouvait tout simplement pas être calculée.
  const [mine, setMine] = useState<MyFeed | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [magic, setMagic] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [pwTab, setPwTab] = useState<"magic" | "password">("magic");
  const [password, setPassword] = useState("");
  const [pwMode, setPwMode] = useState<"signin" | "signup">("signin");
  const [pwState, setPwState] = useState<"idle" | "busy" | "error" | "confirm" | "reset">("idle");
  const [recovery, setRecovery] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [recState, setRecState] = useState<"idle" | "busy" | "done" | "error">("idle");

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("recovery") === "1") {
      setRecovery(true);
    }
  }, []);

  const sendMagic = async () => {
    if (!EMAIL_RE.test(email.trim()) || magic === "sending") return;
    setMagic("sending");
    setMagic((await signInWithEmail(email)) ? "sent" : "error");
  };

  const okPw = EMAIL_RE.test(email.trim()) && password.length >= 6;
  const doPassword = async () => {
    if (!okPw || pwState === "busy") return;
    setPwState("busy");
    if (pwMode === "signin") {
      setPwState((await signInPassword(email, password)) === "ok" ? "idle" : "error");
    } else {
      const r = await signUpPassword(email, password);
      setPwState(r === "ok" ? "idle" : r === "confirm" ? "confirm" : "error");
    }
  };
  const doForgot = async () => {
    if (!EMAIL_RE.test(email.trim())) return setPwState("error");
    setPwState("busy");
    setPwState((await resetPassword(email)) ? "reset" : "error");
  };
  const doRecovery = async () => {
    if (newPw.length < 6 || recState === "busy") return;
    setRecState("busy");
    setRecState((await updatePassword(newPw)) ? "done" : "error");
  };

  const load = useCallback(async () => {
    if (!user) return;
    try {
      // En parallèle : ce que j'anime, et ce à quoi je suis convié. Deux rôles
      // distincts sur la même page — le rattachement lui-même est fait par
      // useAuth à la connexion.
      const [sp, part] = await Promise.all([listSpacesWithStats(), getMyFeed().catch(() => null)]);
      setSpaces(sp);
      setMine(part);
    } catch {
      /* noop */
    }
    setReady(true);
  }, [user]);
  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const s = await createSpace(name);
      setSpaces((l) => [{ ...s, members: 0, events_open: 0, events_closed: 0, events_draft: 0 }, ...l]);
      setName("");
    } catch {
      /* noop */
    }
    setBusy(false);
  };

  if (loading) return <OrgShell><div style={{ ...card, color: MUTED }}>{t("loading")}</div></OrgShell>;

  if (recovery)
    return (
      <OrgShell>
        <div style={card}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22 }}>{t("recoveryTitle")}</div>
          {recState === "done" ? (
            <>
              <div style={{ color: GREENTXT, fontWeight: 700, marginTop: 12 }}>{t("recoveryDone")}</div>
              <button
                onClick={() => setRecovery(false)}
                className="dc-bright"
                style={{ marginTop: 14, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, cursor: "pointer", border: `2.5px solid ${INK}`, background: INK, color: "#fff", padding: "11px 18px", borderRadius: 12 }}
              >
                {t("recoveryContinue")}
              </button>
            </>
          ) : (
            <>
              <input
                type="password"
                value={newPw}
                onChange={(e) => {
                  setNewPw(e.target.value);
                  if (recState === "error") setRecState("idle");
                }}
                onKeyDown={(e) => e.key === "Enter" && doRecovery()}
                placeholder={t("recoveryNewPw")}
                style={{ width: "100%", marginTop: 12, fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, padding: "11px 13px", border: `2px solid ${INK}`, borderRadius: 11 }}
              />
              <button
                onClick={doRecovery}
                disabled={recState === "busy" || newPw.length < 6}
                className="dc-bright"
                style={{ marginTop: 10, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, cursor: newPw.length >= 6 ? "pointer" : "not-allowed", border: `2.5px solid ${INK}`, background: INK, color: "#fff", padding: "11px 18px", borderRadius: 12, opacity: newPw.length >= 6 ? 1 : 0.6 }}
              >
                {t("recoverySave")}
              </button>
              {recState === "error" && <div style={{ color: REDTXT, fontWeight: 700, fontSize: 13.5, marginTop: 9 }}>{t("recoveryErr")}</div>}
              <div style={{ marginTop: 9, fontSize: 12, color: MUTED }}>{t("pwMin")}</div>
            </>
          )}
        </div>
      </OrgShell>
    );

  if (!user)
    return (
      <OrgShell>
        <div style={card}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 24 }}>{t("spacesTitle")}</div>
          <div style={{ color: SUBINK, marginTop: 10, lineHeight: 1.55 }}>{t("signInPrompt")}</div>
          <button
            onClick={signIn}
            className="dc-bright"
            style={{ marginTop: 18, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15.5, cursor: "pointer", border: `2.5px solid ${INK}`, background: INK, color: "#fff", padding: "12px 18px", borderRadius: 12 }}
          >
            {t("signIn")}
          </button>
          <div style={{ marginTop: 18, borderTop: `2px dashed #E4DBC6`, paddingTop: 16 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {(["magic", "password"] as const).map((tb) => (
                <button
                  key={tb}
                  onClick={() => setPwTab(tb)}
                  style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 13, cursor: "pointer", border: `2px solid ${INK}`, background: pwTab === tb ? INK : "#fff", color: pwTab === tb ? "#fff" : INK, padding: "7px 13px", borderRadius: 9 }}
                >
                  {t(tb === "magic" ? "tabMagic" : "tabPassword")}
                </button>
              ))}
            </div>

            {pwTab === "magic" ? (
              <>
                {magic === "sent" ? (
                  <div style={{ color: GREENTXT, fontWeight: 700, fontSize: 14, lineHeight: 1.5 }}>{t("magicSent", { email: email.trim() })}</div>
                ) : (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      type="email"
                      inputMode="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (magic === "error") setMagic("idle");
                      }}
                      onKeyDown={(e) => e.key === "Enter" && sendMagic()}
                      placeholder={t("signInEmail")}
                      style={{ flex: 1, minWidth: 200, fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, padding: "11px 13px", border: `2px solid ${INK}`, borderRadius: 11 }}
                    />
                    <button
                      onClick={sendMagic}
                      disabled={magic === "sending" || !EMAIL_RE.test(email.trim())}
                      style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14.5, cursor: EMAIL_RE.test(email.trim()) ? "pointer" : "not-allowed", border: `2.5px solid ${INK}`, background: "#FFB627", color: INK, padding: "11px 16px", borderRadius: 11, opacity: EMAIL_RE.test(email.trim()) ? 1 : 0.6 }}
                    >
                      {magic === "sending" ? t("magicSending") : t("magicCta")}
                    </button>
                  </div>
                )}
                {magic === "error" && <div style={{ color: REDTXT, fontWeight: 700, fontSize: 13.5, marginTop: 9 }}>{t("magicErr")}</div>}
                {magic !== "sent" && <div style={{ marginTop: 10, fontSize: 12, color: MUTED, lineHeight: 1.5 }}>{t("magicHint")}</div>}
              </>
            ) : (
              <>
                <input
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (pwState === "error") setPwState("idle");
                  }}
                  placeholder={t("signInEmail")}
                  style={{ width: "100%", fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, padding: "11px 13px", border: `2px solid ${INK}`, borderRadius: 11 }}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (pwState === "error") setPwState("idle");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && doPassword()}
                  placeholder={t("pwPlaceholder")}
                  style={{ width: "100%", marginTop: 8, fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, padding: "11px 13px", border: `2px solid ${INK}`, borderRadius: 11 }}
                />
                <button
                  onClick={doPassword}
                  disabled={pwState === "busy" || !okPw}
                  className="dc-bright"
                  style={{ marginTop: 10, width: "100%", fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, cursor: okPw ? "pointer" : "not-allowed", border: `2.5px solid ${INK}`, background: INK, color: "#fff", padding: "11px 18px", borderRadius: 12, opacity: okPw && pwState !== "busy" ? 1 : 0.6 }}
                >
                  {pwMode === "signin" ? t("pwSignIn") : t("pwSignUp")}
                </button>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 11, flexWrap: "wrap" }}>
                  <button
                    onClick={() => {
                      setPwMode(pwMode === "signin" ? "signup" : "signin");
                      setPwState("idle");
                    }}
                    style={{ border: "none", background: "none", color: SUBINK, cursor: "pointer", fontSize: 13, fontWeight: 700, textDecoration: "underline", padding: 0 }}
                  >
                    {pwMode === "signin" ? t("pwToSignUp") : t("pwToSignIn")}
                  </button>
                  {pwMode === "signin" && (
                    <button onClick={doForgot} style={{ border: "none", background: "none", color: SUBINK, cursor: "pointer", fontSize: 13, fontWeight: 700, textDecoration: "underline", padding: 0 }}>
                      {t("pwForgot")}
                    </button>
                  )}
                </div>
                {pwState === "error" && <div style={{ color: REDTXT, fontWeight: 700, fontSize: 13.5, marginTop: 9 }}>{t("pwError")}</div>}
                {pwState === "confirm" && <div style={{ color: GREENTXT, fontWeight: 700, fontSize: 13.5, marginTop: 9, lineHeight: 1.5 }}>{t("pwConfirm", { email: email.trim() })}</div>}
                {pwState === "reset" && <div style={{ color: GREENTXT, fontWeight: 700, fontSize: 13.5, marginTop: 9, lineHeight: 1.5 }}>{t("pwResetSent", { email: email.trim() })}</div>}
                <div style={{ marginTop: 9, fontSize: 12, color: MUTED }}>{t("pwMin")}</div>
              </>
            )}
          </div>
        </div>

        {/* Sous les boutons : description complète de ce que débloque la connexion. */}
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 17 }}>{t("featuresTitle")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: 13 }}>
            {(
              [
                ["🏛️", "featMembersLabel", "featMembersText"],
                ["📅", "featEventsLabel", "featEventsText"],
                ["📧", "featConvokeLabel", "featConvokeText"],
                ["⚖️", "featRulesLabel", "featRulesText"],
                ["📊", "featTrackLabel", "featTrackText"],
              ] as const
            ).map(([icon, lk, tk]) => (
              <div key={lk} style={{ display: "flex", gap: 11 }}>
                <span style={{ flex: "none", fontSize: 18, lineHeight: 1.4 }}>{icon}</span>
                <span style={{ fontSize: 14, lineHeight: 1.5, color: SUBINK }}>
                  <b style={{ color: INK }}>{t(lk)}</b> — {t(tk)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </OrgShell>
    );

  return (
    <OrgShell>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: "clamp(28px,5vw,40px)", letterSpacing: "-0.03em", margin: 0 }}>
        {t("spacesTitle")}
      </h1>
      <p style={{ fontSize: 16, color: SUBINK, lineHeight: 1.5, marginTop: 10, maxWidth: "58ch" }}>{t("spacesSubtitle")}</p>

      {/* Aide « qu'est-ce qu'un espace » — utilisateur déjà connecté, aucun mot sur le compte. */}
      <div style={{ background: CREAM, border: `2px solid ${INK}`, borderRadius: 14, padding: "15px 18px", marginTop: 16 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, marginBottom: 10 }}>{t("howTitle")}</div>
        {(
          [
            ["👥", "howMembersLabel", "howMembersText"],
            ["📅", "howEventsLabel", "howEventsText"],
            ["🗳️", "howVotesLabel", "howVotesText"],
          ] as const
        ).map(([icon, lk, tk]) => (
          <div key={lk} style={{ display: "flex", gap: 9, fontSize: 13.5, color: SUBINK, lineHeight: 1.5, marginBottom: 6 }}>
            <span style={{ flex: "none" }}>{icon}</span>
            <span>
              <b style={{ color: INK }}>{t(lk)}</b> — {t(tk)}
            </span>
          </div>
        ))}
      </div>

      <div style={{ ...card, marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder={t("newSpacePlaceholder")}
          style={{ flex: 1, minWidth: 220, fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, padding: "11px 13px", border: `2px solid ${INK}`, borderRadius: 11 }}
        />
        <button
          onClick={create}
          disabled={busy}
          className="dc-bright"
          style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, cursor: "pointer", border: `2.5px solid ${INK}`, background: "#FFB627", color: INK, padding: "11px 20px", borderRadius: 11 }}
        >
          {t("create")}
        </button>
      </div>

      {/* ---- Les cercles dont je suis MEMBRE ----
          Distinct des groupes que j'anime : ici je suis convié, pas responsable.
          Surface volontairement minimale — la vue unifiée du connecté (à répondre,
          historique, public) viendra la remplacer. */}
      {(mine?.circles ?? []).length > 0 && (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>{t("myCirclesTitle")}</div>
          <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4, lineHeight: 1.45 }}>{t("myCirclesHint")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
            {(mine?.circles ?? []).map((c) => {
              const aRepondre = (mine?.todo ?? []).filter((x) => x.circle === c.name).length;
              return (
                <a
                  key={c.space_id}
                  href={`/m/${c.member_token}`}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: CREAM, border: `2px solid ${INK}`, borderRadius: 11, padding: "11px 13px", textDecoration: "none", color: INK }}
                >
                  <span style={{ fontWeight: 800, fontSize: 15 }}>{c.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: aRepondre ? CORAL : MUTED }}>
                    {aRepondre ? t("myCirclesToAnswer", { count: aRepondre }) : t("myCirclesNothing")}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        {ready && !spaces.length && <div style={{ ...card, color: MUTED }}>{t("noSpaces")}</div>}
        {spaces.map((s) => (
          <Link
            key={s.id}
            href={`/espaces/${s.id}`}
            style={{ ...card, display: "flex", flexDirection: "column", gap: 8, textDecoration: "none", color: INK }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>{s.name}</span>
              <span style={{ fontWeight: 700, color: SUBINK, fontSize: 14 }}>{t("open")} →</span>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 13, color: SUBINK, fontWeight: 600 }}>
              <span>{t("memberCount", { count: s.members })}</span>
              {s.events_open > 0 && <span style={{ color: GREENTXT }}>{t("statOpen", { count: s.events_open })}</span>}
              {s.events_closed > 0 && <span>{t("statClosed", { count: s.events_closed })}</span>}
              {s.events_draft > 0 && <span style={{ color: MUTED }}>{t("statDraft", { count: s.events_draft })}</span>}
            </div>
          </Link>
        ))}
      </div>
    </OrgShell>
  );
}
