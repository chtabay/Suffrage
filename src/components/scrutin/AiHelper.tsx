"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ASSISTANTS, copyAiPrompt, openAssistant } from "@/lib/ai/assistants";
import BrandIcon, { hasBrandIcon } from "@/components/ai/BrandIcon";
import type { ScrutinController } from "@/lib/voting/useScrutin";
import { CREAM, FONT_BODY, FONT_DISPLAY, INK, MUTED } from "./theme";

export default function AiHelper({ ctrl }: { ctrl: ScrutinController }) {
  const { state } = ctrl;
  const t = useTranslations("AiHelper");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const btn = {
    fontFamily: FONT_BODY,
    fontWeight: 700,
    fontSize: 13.5,
    cursor: "pointer",
    border: `2px solid ${INK}`,
    borderRadius: 10,
    padding: "9px 14px",
  } as const;

  return (
    <div
      style={{
        background: "#fff",
        border: `2.5px solid ${INK}`,
        borderRadius: 16,
        padding: "16px 18px",
        boxShadow: `4px 4px 0 ${INK}`,
      }}
    >
      {/* En-tête déplié sur desktop/tablette : titre + sous-titre */}
      <div className="ai-head-desktop">
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16 }}>{t("title")}</div>
        <div style={{ fontSize: 12.5, color: MUTED, margin: "5px 0 12px", lineHeight: 1.45 }}>
          {t("subtitle")}
        </div>
      </div>

      {/* Sur mobile, la liste des IA se replie sous une question (gain de place). */}
      <button
        type="button"
        className="ai-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          background: CREAM,
          border: `2px solid ${INK}`,
          borderRadius: 10,
          padding: "11px 14px",
          cursor: "pointer",
          fontFamily: FONT_DISPLAY,
          fontWeight: 800,
          fontSize: 13.5,
          color: INK,
          textAlign: "left",
          marginBottom: open ? 12 : 0,
        }}
      >
        <span>{t("mobileToggle")}</span>
        <span style={{ flex: "none", fontSize: 11 }}>{open ? "▲" : "▼"}</span>
      </button>

      <div className={open ? "ai-body" : "ai-body ai-collapsed"}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {ASSISTANTS.map((a) => (
            <button
              key={a.key}
              onClick={() => openAssistant(a, state.question, state.options, locale)}
              style={{ ...btn, display: "flex", alignItems: "center", gap: 8, background: INK, color: "#fff" }}
            >
              {hasBrandIcon(a.key) ? (
                <BrandIcon brandKey={a.key} size={18} />
              ) : (
                <span style={{ width: 12, height: 12, borderRadius: "50%", background: a.color, flex: "none" }} />
              )}
              {a.label}
            </button>
          ))}
          <button
            onClick={() => {
              copyAiPrompt(state.question, state.options, locale);
              setCopied(true);
            }}
            style={{ ...btn, background: CREAM, color: INK }}
          >
            {copied ? t("promptCopied") : t("copyPrompt")}
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: MUTED, marginTop: 10, lineHeight: 1.4 }}>
          {t("pasteHint")}
        </div>
      </div>
    </div>
  );
}
