"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ScrutinController } from "@/lib/voting/useScrutin";
import AccessCard from "./AccessCard";
import TimingCard from "./TimingCard";
import { FONT_DISPLAY, INK, MUTED } from "./theme";

/**
 * Replie la « logistique » (accès & votants, durée & validité) sous un toggle.
 * La vue par défaut reste « vote rapide » ; déplier = passer en « vote vérifié / fermé ».
 * Auto-déplié dès qu'un réglage avancé est actif (ex. Grands électeurs force l'accès).
 */
export default function AdvancedSettings({ ctrl }: { ctrl: ScrutinController }) {
  const t = useTranslations("Advanced");
  const s = ctrl.state;
  const active =
    s.access !== "open" ||
    s.hideResults ||
    s.closeOnComplete ||
    Boolean(s.opensAt) ||
    s.quorum != null;
  const [open, setOpen] = useState(false);
  const expanded = open || active;

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
        <span style={{ marginLeft: "auto", fontWeight: 800, fontSize: 18, color: expanded ? INK : "#9aa3bd" }}>
          {expanded ? "▾" : "▸"}
        </span>
      </button>
      {expanded && (
        <>
          <AccessCard ctrl={ctrl} />
          <TimingCard ctrl={ctrl} />
        </>
      )}
    </div>
  );
}
