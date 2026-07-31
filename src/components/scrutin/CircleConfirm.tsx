"use client";

// 2e temps du double opt-in. Cette page ne confirme RIEN à l'affichage : elle
// attend un clic, qui déclenche un POST. Les passerelles anti-phishing
// d'entreprise visitent les liens des emails pour les inspecter — si la
// confirmation se faisait au chargement (GET), elles la valideraient toutes
// seules et le double opt-in ne vaudrait plus rien.
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CircleShell } from "./CircleJoinForm";
import { FONT_DISPLAY, GREEN, INK, MUTED, SUBINK } from "./theme";

const card = {
  background: "#fff",
  border: `2.5px solid ${INK}`,
  borderRadius: 18,
  padding: "22px 24px",
  boxShadow: `5px 5px 0 ${INK}`,
} as const;

export default function CircleConfirm({ token }: { token: string }) {
  const t = useTranslations("Circle");
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"idle" | "ok" | "expired" | "error">("idle");
  const [home, setHome] = useState("");

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/circles/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, locale }),
      });
      const d = (await r.json().catch(() => ({}))) as { status?: string; home?: string };
      if (d.status === "ok" && d.home) {
        setHome(d.home);
        setState("ok");
      } else if (d.status === "expired" || d.status === "invalid") {
        setState("expired");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
    setBusy(false);
  };

  if (state === "ok")
    return (
      <CircleShell>
        <div style={{ ...card, borderColor: GREEN, boxShadow: `5px 5px 0 ${GREEN}` }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22 }}>{t("confirmedTitle")}</div>
          <div style={{ color: SUBINK, marginTop: 8, lineHeight: 1.55 }}>{t("confirmedDesc")}</div>
          <a
            href={home}
            className="dc-bright"
            style={{ display: "block", textAlign: "center", marginTop: 16, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16, textDecoration: "none", border: `2.5px solid ${INK}`, background: INK, color: "#fff", padding: "13px 18px", borderRadius: 12 }}
          >
            {t("confirmedCta")}
          </a>
        </div>
      </CircleShell>
    );

  if (state === "expired")
    return (
      <CircleShell>
        <div style={card}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22 }}>{t("expiredTitle")}</div>
          <div style={{ color: SUBINK, marginTop: 8, lineHeight: 1.55 }}>{t("expiredDesc")}</div>
        </div>
      </CircleShell>
    );

  return (
    <CircleShell>
      <div style={card}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22 }}>{t("confirmTitle")}</div>
        <div style={{ color: SUBINK, marginTop: 8, lineHeight: 1.55 }}>{t("confirmDesc")}</div>
        {state === "error" && (
          <div style={{ color: "#c0341d", fontWeight: 700, fontSize: 13.5, marginTop: 10 }}>{t("errGeneric")}</div>
        )}
        <button
          onClick={confirm}
          disabled={busy}
          className="dc-bright"
          style={{ marginTop: 16, width: "100%", fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16, cursor: "pointer", border: `2.5px solid ${INK}`, background: INK, color: "#fff", padding: "13px 18px", borderRadius: 12 }}
        >
          {busy ? t("submitting") : t("confirmCta")}
        </button>
        <div style={{ marginTop: 10, fontSize: 11.5, color: MUTED, lineHeight: 1.5 }}>{t("confirmNote")}</div>
      </div>
    </CircleShell>
  );
}
