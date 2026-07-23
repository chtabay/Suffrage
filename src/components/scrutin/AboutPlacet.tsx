"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { CREAM, FONT_BODY, FONT_DISPLAY, INK, PAPER, SUBINK, lift } from "./theme";

// Bulle d'info du hero : un topo complet mais sans verbiage — l'idée, le mode
// sans compte, le mode connecté, la philosophie.
const ROWS = [
  ["💡", "aboutIdeaLabel", "aboutIdeaText"],
  ["🧩", "aboutAssignLabel", "aboutAssignText"],
  ["🔗", "aboutFreeLabel", "aboutFreeText"],
  ["🏛️", "aboutAccountLabel", "aboutAccountText"],
  ["🎯", "aboutPhiloLabel", "aboutPhiloText"],
] as const;

export default function AboutPlacet({ compact }: { compact?: boolean }) {
  const t = useTranslations("Home");
  const [open, setOpen] = useState(false);

  return (
    <>
      {compact ? (
        // Version discrète pour le header : n'interrompt plus le flux de création.
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="dc-paper"
          style={{
            fontFamily: FONT_BODY,
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            border: `2px solid ${INK}`,
            background: CREAM,
            color: INK,
            padding: "9px 15px",
            borderRadius: 10,
          }}
        >
          ⓘ {t("aboutCta")}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="dc-lift"
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            border: `2.5px solid ${INK}`,
            background: PAPER,
            color: INK,
            padding: "13px 20px",
            borderRadius: 12,
            ...lift(`4px 4px 0 ${INK}`, `6px 6px 0 ${INK}`),
          }}
        >
          ⓘ {t("aboutCta")}
        </button>
      )}

      {open &&
        createPortal(
          <div
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              background: "rgba(22,33,58,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 560,
              maxHeight: "85vh",
              overflowY: "auto",
              background: "#fff",
              border: `2.5px solid ${INK}`,
              borderRadius: 20,
              boxShadow: `7px 7px 0 ${INK}`,
              fontFamily: FONT_BODY,
            }}
          >
            <div
              style={{
                position: "sticky",
                top: 0,
                background: "#fff",
                borderBottom: `2px solid ${INK}`,
                borderRadius: "18px 18px 0 0",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 20 }}>{t("aboutTitle")}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("aboutClose")}
                style={{
                  flex: "none",
                  width: 34,
                  height: 34,
                  border: `2px solid ${INK}`,
                  background: CREAM,
                  color: INK,
                  borderRadius: 9,
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "18px 20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
              {ROWS.map(([icon, lk, tk]) => (
                <div key={lk} style={{ display: "flex", gap: 12 }}>
                  <span style={{ flex: "none", fontSize: 20, lineHeight: 1.3 }}>{icon}</span>
                  <div>
                    <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, color: INK }}>{t(lk)}</div>
                    <div style={{ fontSize: 14, lineHeight: 1.55, color: SUBINK, marginTop: 3 }}>{t(tk)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
          document.body,
        )}
    </>
  );
}
