"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { createSpace, listSpacesWithStats, type SpaceStats } from "@/lib/db/events";
import PlacetMark from "./PlacetMark";
import { CREAM, FONT_BODY, FONT_DISPLAY, GREEN, INK, MUTED, REDTXT, SUBINK } from "./theme";

const card = {
  background: "#fff",
  border: `2.5px solid ${INK}`,
  borderRadius: 18,
  padding: "20px 22px",
  boxShadow: `5px 5px 0 ${INK}`,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function OrgShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: FONT_BODY }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 18px 90px" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 11, marginBottom: 20, textDecoration: "none", color: INK }}>
          <PlacetMark size={36} />
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 21, letterSpacing: "-0.02em" }}>Placet</span>
        </Link>
        {children}
      </div>
    </div>
  );
}

export default function SpacesHome() {
  const t = useTranslations("Org");
  const { user, loading, signIn, signInWithEmail } = useAuth();
  const [spaces, setSpaces] = useState<SpaceStats[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [magic, setMagic] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const sendMagic = async () => {
    if (!EMAIL_RE.test(email.trim()) || magic === "sending") return;
    setMagic("sending");
    setMagic((await signInWithEmail(email)) ? "sent" : "error");
  };

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setSpaces(await listSpacesWithStats());
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
            <div style={{ fontWeight: 700, fontSize: 13, color: SUBINK, marginBottom: 9 }}>{t("orEmail")}</div>
            {magic === "sent" ? (
              <div style={{ color: GREEN, fontWeight: 700, fontSize: 14, lineHeight: 1.5 }}>{t("magicSent", { email: email.trim() })}</div>
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
              {s.events_open > 0 && <span style={{ color: GREEN }}>{t("statOpen", { count: s.events_open })}</span>}
              {s.events_closed > 0 && <span>{t("statClosed", { count: s.events_closed })}</span>}
              {s.events_draft > 0 && <span style={{ color: MUTED }}>{t("statDraft", { count: s.events_draft })}</span>}
            </div>
          </Link>
        ))}
      </div>
    </OrgShell>
  );
}
