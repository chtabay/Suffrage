"use client";

import { useTranslations } from "next-intl";
import { describeRecipe } from "@/lib/voting/engine";
import type { ScrutinController } from "@/lib/voting/useScrutin";
import { FONT_DISPLAY, INK, MUTED, SUBINK } from "./theme";

/** Clés de libellé par source — résolues via les traductions "Prefill". */
const SOURCE_LABEL_KEY: Record<string, string> = {
  claude: "sourceClaude",
  chatgpt: "sourceChatGPT",
  openai: "sourceChatGPT",
  gpt: "sourceChatGPT",
  gemini: "sourceGemini",
  copilot: "sourceCopilot",
  perplexity: "sourcePerplexity",
  grok: "sourceGrok",
  lechat: "sourceLeChat",
  mistral: "sourceLeChat",
  ai: "sourceAI",
  ia: "sourceAI",
  slack: "sourceSlack",
  teams: "sourceTeams",
};

/**
 * Panneau de confiance : quand un brouillon est pré-rempli (URL/IA/Slack…),
 * il rend visible CE QUI A ÉTÉ DÉCIDÉ — en priorité la méthode et le pourquoi.
 */
export default function PrefillPanel({ ctrl }: { ctrl: ScrutinController }) {
  const t = useTranslations("Prefill");
  const { state } = ctrl;
  if (!state.prefilled) return null;
  const src = state.prefillSource?.toLowerCase() ?? null;
  const labelKey = src ? SOURCE_LABEL_KEY[src] : null;
  const sourceLabel = src
    ? (labelKey ? t(labelKey) : t("sourceGeneric", { source: state.prefillSource ?? "" }))
    : t("sourceLink");
  const desc = describeRecipe(state.recipe);

  return (
    <div
      style={{
        marginTop: 14,
        background: "#FFF4DF",
        border: `2.5px solid ${INK}`,
        borderRadius: 16,
        padding: "16px 18px",
        boxShadow: `4px 4px 0 ${INK}`,
      }}
    >
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16 }}>✨ {sourceLabel}</div>

      <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: MUTED, letterSpacing: "0.03em" }}>{t("proposedMethod")}</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            background: desc.color,
            color: "#fff",
            border: `2px solid ${INK}`,
            borderRadius: 20,
            padding: "5px 12px",
            fontWeight: 700,
            fontSize: 13.5,
          }}
        >
          <span>{desc.icon}</span>
          {desc.name}
        </span>
        <span style={{ fontSize: 12.5, color: MUTED }}>{t("editableBelow")}</span>
      </div>

      {state.prefillWhy && (
        <div style={{ marginTop: 11, fontSize: 13.5, lineHeight: 1.5, color: SUBINK }}>
          <span style={{ fontWeight: 700 }}>{t("whyLabel")}</span> {state.prefillWhy}
        </div>
      )}

      <div style={{ marginTop: 11, fontSize: 12.5, color: MUTED, fontWeight: 600 }}>
        {t("editableNote")}
      </div>
    </div>
  );
}
