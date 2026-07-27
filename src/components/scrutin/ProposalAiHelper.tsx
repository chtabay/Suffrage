"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ASSISTANTS, copyPrompt, openAssistantWith } from "@/lib/ai/assistants";
import BrandIcon, { hasBrandIcon } from "@/components/ai/BrandIcon";
import { buildProposalPrompt } from "@/lib/voting/aiPrompt";
import type { Option } from "@/lib/voting/types";
import { CREAM, FONT_BODY, FONT_DISPLAY, INK, MUTED, SUBINK } from "./theme";

/**
 * Aide IA du PARTICIPANT pendant la collecte : son assistant reçoit le sujet du
 * scrutin et ce qui est déjà proposé, rend des propositions au format exact des
 * champs du formulaire, puis demande s'il doit poursuivre la recherche.
 * Replié par défaut — proposer soi-même reste le chemin direct.
 */
export default function ProposalAiHelper({
  question,
  description,
  options,
}: {
  question: string;
  description: string | null;
  options: Option[];
}) {
  const t = useTranslations("ProposalAi");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const prompt = buildProposalPrompt(question, description, options, locale);

  const btn = {
    fontFamily: FONT_BODY,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    border: `2px solid ${INK}`,
    borderRadius: 10,
    padding: "8px 12px",
  } as const;

  return (
    <div style={{ marginTop: 12, border: `2px dashed ${INK}`, borderRadius: 12, padding: "10px 12px" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          width: "100%",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          fontFamily: FONT_DISPLAY,
          fontWeight: 800,
          fontSize: 13.5,
          color: INK,
          textAlign: "left",
        }}
      >
        <span>🤖 {t("toggle")}</span>
        <span style={{ flex: "none", fontSize: 11 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12.5, color: SUBINK, lineHeight: 1.5, marginBottom: 10 }}>{t("intro")}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ASSISTANTS.map((a) => (
              <button
                key={a.key}
                onClick={() => openAssistantWith(a, prompt)}
                style={{ ...btn, display: "flex", alignItems: "center", gap: 7, background: INK, color: "#fff" }}
              >
                {hasBrandIcon(a.key) ? (
                  <BrandIcon brandKey={a.key} size={16} />
                ) : (
                  <span style={{ width: 11, height: 11, borderRadius: "50%", background: a.color, flex: "none" }} />
                )}
                {a.label}
              </button>
            ))}
            <button
              onClick={() => {
                copyPrompt(prompt);
                setCopied(true);
              }}
              style={{ ...btn, background: CREAM, color: INK }}
            >
              {copied ? t("copied") : t("copy")}
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: MUTED, marginTop: 10, lineHeight: 1.45 }}>{t("pasteHint")}</div>
        </div>
      )}
    </div>
  );
}
