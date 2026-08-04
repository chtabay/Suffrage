"use client";

// Page d'adhésion à un cercle — calque de JoinForm, avec une différence de fond :
// elle ne dit JAMAIS « vous êtes déjà inscrit ». Ce serait un oracle
// d'appartenance interrogeable par n'importe qui avec une liste d'adresses. Le
// succès est donc identique pour une adresse connue et une adresse inconnue ;
// c'est l'email, lu par le seul propriétaire de l'adresse, qui fait la différence.
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getCircleInfo, type CircleInfo } from "@/lib/db/circles";
import PlacetMark from "./PlacetMark";
import { CREAM, FONT_BODY, FONT_DISPLAY, GREEN, GREENTXT, INK, MUTED, SUBINK } from "./theme";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const card = {
  background: "#fff",
  border: `2.5px solid ${INK}`,
  borderRadius: 18,
  padding: "22px 24px",
  boxShadow: `5px 5px 0 ${INK}`,
} as const;

export function CircleShell({ children }: { children: React.ReactNode }) {
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

export default function CircleJoinForm({ token }: { token: string }) {
  const t = useTranslations("Circle");
  const locale = useLocale();
  const [info, setInfo] = useState<CircleInfo | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const i = await getCircleInfo(token);
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
      const r = await fetch("/api/circles/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, name: name.trim(), email: email.trim(), locale }),
      });
      const d = (await r.json().catch(() => ({}))) as { status?: string };
      // 'ok' couvre indifféremment le nouveau venu, l'adresse déjà membre et la
      // demande déjà en cours : rien ici ne permet de les distinguer.
      if (d.status === "ok") setDone(true);
      else if (d.status === "closed") setInfo((i) => (i ? { ...i, status: "closed" } : i));
      else if (d.status === "full") setInfo((i) => (i ? { ...i, status: "full" } : i));
      else if (d.status === "invalid") setErr(t("errInvalid"));
      else setErr(t("errGeneric"));
    } catch {
      setErr(t("errGeneric"));
    }
    setBusy(false);
  };

  if (!info) return <CircleShell><div style={{ ...card, color: MUTED }}>{t("loading")}</div></CircleShell>;

  if (info.status === "invalid")
    return (
      <CircleShell>
        <div style={card}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22 }}>{t("invalidTitle")}</div>
          <div style={{ color: SUBINK, marginTop: 8, lineHeight: 1.55 }}>{t("invalidDesc")}</div>
        </div>
      </CircleShell>
    );

  if (info.status === "closed" || info.status === "full")
    return (
      <CircleShell>
        <div style={card}>
          {info.name && <div style={{ fontWeight: 700, color: SUBINK, fontSize: 14 }}>{info.name}</div>}
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22, marginTop: 4 }}>
            {info.status === "full" ? t("fullTitle") : t("closedTitle")}
          </div>
          <div style={{ color: SUBINK, marginTop: 8, lineHeight: 1.55 }}>
            {info.status === "full" ? t("fullDesc") : t("closedDesc")}
          </div>
        </div>
      </CircleShell>
    );

  if (done)
    return (
      <CircleShell>
        <div style={{ ...card, borderColor: GREEN, boxShadow: `5px 5px 0 ${GREEN}` }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22 }}>{t("sentTitle")}</div>
          <div style={{ color: SUBINK, marginTop: 8, lineHeight: 1.55 }}>{t("sentDesc", { email: email.trim() })}</div>
          <div style={{ color: MUTED, marginTop: 10, fontSize: 13, lineHeight: 1.5 }}>{t("sentNote")}</div>
        </div>
      </CircleShell>
    );

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
    <CircleShell>
      <div style={card}>
        <div style={{ fontWeight: 700, color: SUBINK, fontSize: 14 }}>{info.name}</div>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 26, letterSpacing: "-0.02em", margin: "4px 0 0" }}>
          {t("joinTitle")}
        </h1>
        {info.pitch && <p style={{ color: SUBINK, marginTop: 8, lineHeight: 1.55, fontSize: 14.5 }}>{info.pitch}</p>}

        {/* Ce qu'on garantit vraiment — écrit avant de demander l'adresse, pas
            après. Chaque ligne correspond à une propriété tenue par la base. */}
        <ul style={{ margin: "14px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 7 }}>
          {[t("promiseEmail"), t("promiseSecret"), t("promiseLeave")].map((line) => (
            <li key={line} style={{ display: "flex", gap: 9, fontSize: 13.5, color: SUBINK, lineHeight: 1.45 }}>
              <span aria-hidden style={{ color: GREENTXT, fontWeight: 900 }}>✓</span>
              <span>{line}</span>
            </li>
          ))}
          {/* L'engagement de fréquence n'apparaît QUE si ce cercle en a pris un.
              Jamais un chiffre générique promis par Placet à sa place. */}
          {info.solicit_per_day != null && (
            <li style={{ display: "flex", gap: 9, fontSize: 13.5, color: SUBINK, lineHeight: 1.45 }}>
              <span aria-hidden style={{ color: GREENTXT, fontWeight: 900 }}>✓</span>
              <span>{t("promisePace", { n: info.solicit_per_day })}</span>
            </li>
          )}
        </ul>

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
    </CircleShell>
  );
}
