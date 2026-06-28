"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getEnrollInfo, type EnrollInfo } from "@/lib/db/events";
import PlacetMark from "./PlacetMark";
import { CREAM, FONT_BODY, FONT_DISPLAY, GREEN, INK, MUTED, SUBINK } from "./theme";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const card = {
  background: "#fff",
  border: `2.5px solid ${INK}`,
  borderRadius: 18,
  padding: "22px 24px",
  boxShadow: `5px 5px 0 ${INK}`,
} as const;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: FONT_BODY }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 18px 90px" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 11, marginBottom: 20, textDecoration: "none", color: INK }}>
          <PlacetMark size={36} />
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 21, letterSpacing: "-0.02em" }}>Placet</span>
        </Link>
        {children}
      </div>
    </div>
  );
}

export default function JoinForm({ token }: { token: string }) {
  const t = useTranslations("Join");
  const locale = useLocale();
  const [info, setInfo] = useState<EnrollInfo | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"form" | "done" | "already">("form");
  const [emailed, setEmailed] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const i = await getEnrollInfo(token);
        if (!cancel) setInfo(i);
      } catch {
        if (!cancel) setInfo({ status: "invalid" });
      }
    })();
    return () => {
      cancel = true;
    };
  }, [token]);

  const submit = async () => {
    if (busy) return;
    setErr("");
    if (!name.trim() || !EMAIL_RE.test(email.trim())) {
      setErr(t("errInvalid"));
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/events/enroll", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, name: name.trim(), email: email.trim(), locale }),
      });
      const d = (await r.json().catch(() => ({}))) as { status?: string; emailed?: boolean };
      if (d.status === "ok") {
        setEmailed(Boolean(d.emailed));
        setPhase("done");
      } else if (d.status === "already") {
        setPhase("already");
      } else if (d.status === "full") {
        setInfo((i) => (i ? { ...i, full: true } : i));
      } else if (d.status === "closed") {
        setInfo((i) => (i ? { ...i, status: "closed" } : i));
      } else if (d.status === "invalid") {
        setErr(t("errInvalid"));
      } else {
        setErr(t("errGeneric"));
      }
    } catch {
      setErr(t("errGeneric"));
    }
    setBusy(false);
  };

  // ---- états terminaux / bloquants ----
  if (!info) return <Shell><div style={{ ...card, color: MUTED }}>{t("loading")}</div></Shell>;

  if (info.status === "invalid")
    return (
      <Shell>
        <div style={card}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22 }}>{t("invalidTitle")}</div>
          <div style={{ color: SUBINK, marginTop: 8, lineHeight: 1.55 }}>{t("invalidDesc")}</div>
        </div>
      </Shell>
    );

  if (info.status === "closed")
    return (
      <Shell>
        <div style={card}>
          {info.title && <div style={{ fontWeight: 700, color: SUBINK, fontSize: 14 }}>{info.title}</div>}
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22, marginTop: 4 }}>{t("closedTitle")}</div>
          <div style={{ color: SUBINK, marginTop: 8, lineHeight: 1.55 }}>{t("closedDesc")}</div>
        </div>
      </Shell>
    );

  if (phase === "done")
    return (
      <Shell>
        <div style={{ ...card, borderColor: GREEN, boxShadow: `5px 5px 0 ${GREEN}` }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22 }}>{t("doneTitle")}</div>
          <div style={{ color: SUBINK, marginTop: 8, lineHeight: 1.55 }}>
            {emailed ? t("doneDesc", { email: email.trim() }) : t("doneNoEmail")}
          </div>
        </div>
      </Shell>
    );

  if (phase === "already")
    return (
      <Shell>
        <div style={card}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22 }}>{t("alreadyTitle")}</div>
          <div style={{ color: SUBINK, marginTop: 8, lineHeight: 1.55 }}>{t("alreadyDesc")}</div>
        </div>
      </Shell>
    );

  if (info.full)
    return (
      <Shell>
        <div style={card}>
          {info.title && <div style={{ fontWeight: 700, color: SUBINK, fontSize: 14 }}>{info.title}</div>}
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22, marginTop: 4 }}>{t("fullTitle")}</div>
          <div style={{ color: SUBINK, marginTop: 8, lineHeight: 1.55 }}>{t("fullDesc")}</div>
        </div>
      </Shell>
    );

  // ---- formulaire d'inscription ----
  const inputStyle = {
    width: "100%",
    fontFamily: FONT_BODY,
    fontSize: 15,
    fontWeight: 600,
    padding: "12px 13px",
    border: `2px solid ${INK}`,
    borderRadius: 11,
    marginTop: 10,
  } as const;

  return (
    <Shell>
      <div style={card}>
        {info.title && <div style={{ fontWeight: 700, color: SUBINK, fontSize: 14 }}>{info.title}</div>}
        <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 26, letterSpacing: "-0.02em", margin: "4px 0 0" }}>{t("joinTitle")}</h1>
        <p style={{ color: SUBINK, marginTop: 8, lineHeight: 1.55, fontSize: 14.5 }}>{t("joinSubtitle")}</p>
        {info.cap != null && (
          <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 700, color: MUTED }}>
            {t("capLine", { count: info.count ?? 0, cap: info.cap })}
          </div>
        )}

        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} style={inputStyle} />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={t("emailPlaceholder")}
          type="email"
          inputMode="email"
          style={inputStyle}
        />
        {err && <div style={{ color: "#c0341d", fontWeight: 700, fontSize: 13.5, marginTop: 9 }}>{err}</div>}

        <button
          onClick={submit}
          disabled={busy}
          className="dc-bright"
          style={{ marginTop: 14, width: "100%", fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16, cursor: "pointer", border: `2.5px solid ${INK}`, background: INK, color: "#fff", padding: "13px 18px", borderRadius: 12 }}
        >
          {busy ? t("submitting") : t("submit")}
        </button>
        <div style={{ marginTop: 10, fontSize: 11.5, color: MUTED, lineHeight: 1.5 }}>{t("privacyNote")}</div>
      </div>
    </Shell>
  );
}
