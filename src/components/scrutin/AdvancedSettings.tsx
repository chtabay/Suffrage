"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ScrutinController } from "@/lib/voting/useScrutin";
import AccessCard from "./AccessCard";
import ClosureLine from "./ClosureLine";
import TimingCard from "./TimingCard";
import { FONT_DISPLAY, INK, MUTED } from "./theme";

/**
 * Replie la « logistique » (clôture, accès & votants, durée & validité) sous un toggle.
 * La vue par défaut reste « vote rapide » ; déplier = passer en « vote vérifié / fermé ».
 * Auto-déplié dès qu'un réglage avancé est actif (ex. Grands électeurs force l'accès).
 * IMPORTANT : closesAt ne participe PAS au prédicat d'auto-ouverture — elle est
 * toujours renseignée (+7 j par défaut), l'y mettre forcerait l'ouverture permanente.
 */
export default function AdvancedSettings({ ctrl }: { ctrl: ScrutinController }) {
  const t = useTranslations("Advanced");
  const locale = useLocale();
  const s = ctrl.state;
  const active =
    s.access !== "open" ||
    s.hideResults ||
    s.closeOnComplete ||
    Boolean(s.opensAt) ||
    s.quorum != null;
  const [open, setOpen] = useState(false);
  const expanded = open || active;
  // Mini-résumé de la clôture dans l'entête repliée : la date vit désormais dans
  // ce repli, on la garde lisible d'un coup d'œil sans avoir à déplier.
  const closesDate = s.closesAt ? new Date(s.closesAt) : null;
  const closesResume =
    closesDate && !Number.isNaN(closesDate.getTime())
      ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(closesDate)
      : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          cursor: "pointer",
          background: "#fff",
          border: `2.5px solid ${INK}`,
          borderRadius: 14,
          padding: "14px 18px",
          boxShadow: `4px 4px 0 ${INK}`,
        }}
      >
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16 }}>⚙️ {t("title")}</span>
        <span style={{ fontSize: 12.5, color: MUTED, fontWeight: 600 }}>{t("subtitle")}</span>
        {!expanded && closesResume && (
          <span style={{ fontSize: 12.5, color: INK, fontWeight: 700, whiteSpace: "nowrap" }}>
            🗓 {t("closureResume", { date: closesResume })}
          </span>
        )}
        <span style={{ marginLeft: "auto", fontWeight: 800, fontSize: 18, color: expanded ? INK : "#9aa3bd" }}>
          {expanded ? "▾" : "▸"}
        </span>
      </button>
      {expanded && (
        <>
          <ClosureLine ctrl={ctrl} />
          <AccessCard ctrl={ctrl} />
          <TimingCard ctrl={ctrl} />
        </>
      )}
    </div>
  );
}
