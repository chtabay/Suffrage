"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import PlacetMark from "@/components/scrutin/PlacetMark";
import { CORAL, CREAM, FONT_BODY, FONT_DISPLAY, INK, MUTED, PAPER, SUBINK, lift } from "@/components/scrutin/theme";

/**
 * Repères d'usage à l'ouverture de l'app installée. Volontairement court et
 * refermable : ce n'est pas un tutoriel, juste « voilà ce que ça sait faire ».
 */
export default function WelcomeSheet({ onClose, onCreate }: { onClose: () => void; onCreate: () => void }) {
  const t = useTranslations("Welcome");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const items = (t.raw("items") as { icon: string; title: string; text: string }[]) ?? [];

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        background: "rgba(22,33,58,0.55)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 14,
        overflowY: "auto",
      }}
      className="welcome-overlay"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 460,
          background: PAPER,
          border: `2.5px solid ${INK}`,
          borderRadius: 18,
          boxShadow: `6px 6px 0 ${INK}`,
          padding: 20,
          fontFamily: FONT_BODY,
          marginBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 4 }}>
          <PlacetMark size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div id="welcome-title" style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19, lineHeight: 1.2 }}>
              {t("title")}
            </div>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label={t("close")}
            style={{
              flex: "none",
              width: 32,
              height: 32,
              border: `2px solid ${INK}`,
              background: CREAM,
              color: INK,
              borderRadius: 9,
              fontSize: 15,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
        <p style={{ color: SUBINK, fontSize: 14, lineHeight: 1.5, margin: "8px 0 14px" }}>{t("subtitle")}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {items.map((it, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 11,
                border: `2px solid ${INK}`,
                borderRadius: 12,
                background: CREAM,
                padding: "10px 12px",
              }}
            >
              <span style={{ fontSize: 20, flex: "none", lineHeight: 1.2 }}>{it.icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14, fontFamily: FONT_DISPLAY }}>{it.title}</div>
                <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.45, marginTop: 2 }}>{it.text}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 16 }}>
          <button
            onClick={onCreate}
            className="dc-lift"
            style={{
              flex: 1,
              minWidth: 160,
              fontFamily: FONT_DISPLAY,
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
              border: `2.5px solid ${INK}`,
              background: CORAL,
              color: "#fff",
              padding: "12px 18px",
              borderRadius: 12,
              ...lift(`3px 3px 0 ${INK}`, `4px 4px 0 ${INK}`),
            }}
          >
            {t("cta")}
          </button>
          <button
            onClick={onClose}
            style={{
              fontFamily: FONT_BODY,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              border: `2px solid ${INK}`,
              background: PAPER,
              color: INK,
              padding: "12px 16px",
              borderRadius: 12,
            }}
          >
            {t("later")}
          </button>
        </div>
      </div>
    </div>
  );
}
