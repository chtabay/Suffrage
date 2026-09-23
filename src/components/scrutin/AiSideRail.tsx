"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { RAIL_ASSISTANTS, openAssistant } from "@/lib/ai/assistants";
import BrandIcon, { hasBrandIcon } from "@/components/ai/BrandIcon";
import { CREAM, FONT_BODY, FONT_DISPLAY, INK, MUTED, PAPER, lift } from "./theme";

/**
 * Une seule porte IA sur l'accueil. La question saisie dans le hero est passée
 * au prompt : l'aide ne repart donc plus d'un contexte vide.
 *
 * Les marques n'occupent l'écran qu'après une demande explicite. Placet reste
 * la destination principale ; l'assistant sert seulement à préparer la décision.
 */
export default function AiQuestionHelper({ question }: { question: string }) {
  const t = useTranslations("AiRail");
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginTop: 12, maxWidth: 640 }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontFamily: FONT_BODY,
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
          border: `2px solid ${INK}`,
          borderRadius: 10,
          padding: "8px 12px",
          background: CREAM,
          color: INK,
          ...lift(`2px 2px 0 ${INK}`, `4px 4px 0 ${INK}`),
        }}
        className="dc-lift"
      >
        <span aria-hidden>✨</span>
        {t("helpCta")}
        <span aria-hidden style={{ fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          style={{
            marginTop: 10,
            background: PAPER,
            border: `2px solid ${INK}`,
            borderRadius: 12,
            padding: "12px 14px",
            boxShadow: `3px 3px 0 ${INK}`,
          }}
        >
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 13.5, color: INK }}>
            {t("title")}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.45, color: MUTED }}>
            {t("helpText")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {RAIL_ASSISTANTS.map((assistant) => (
              <button
                key={assistant.key}
                type="button"
                onClick={() => openAssistant(assistant, question.trim(), [], locale)}
                title={t("prepareWith", { name: assistant.label })}
                aria-label={t("prepareWith", { name: assistant.label })}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  fontFamily: FONT_BODY,
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: "pointer",
                  border: `2px solid ${INK}`,
                  borderRadius: 9,
                  padding: "7px 10px",
                  background: "#fff",
                  color: INK,
                }}
              >
                {hasBrandIcon(assistant.key) ? (
                  <BrandIcon brandKey={assistant.key} size={18} />
                ) : (
                  <span
                    aria-hidden
                    style={{ width: 10, height: 10, borderRadius: "50%", background: assistant.color }}
                  />
                )}
                {assistant.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
