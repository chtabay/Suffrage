"use client";

import { describeRecipe } from "@/lib/voting/engine";
import type { ScrutinController } from "@/lib/voting/useScrutin";
import { FONT_DISPLAY, INK, MUTED, SUBINK } from "./theme";

const SOURCE_LABEL: Record<string, string> = {
  claude: "Préparé avec Claude",
  chatgpt: "Préparé avec ChatGPT",
  openai: "Préparé avec ChatGPT",
  gpt: "Préparé avec ChatGPT",
  gemini: "Préparé avec Gemini",
  copilot: "Préparé avec Copilot",
  perplexity: "Préparé avec Perplexity",
  grok: "Préparé avec Grok",
  lechat: "Préparé avec Le Chat",
  mistral: "Préparé avec Le Chat",
  ai: "Préparé par une IA",
  ia: "Préparé par une IA",
  slack: "Importé depuis Slack",
  teams: "Importé depuis Teams",
};

/**
 * Panneau de confiance : quand un brouillon est pré-rempli (URL/IA/Slack…),
 * il rend visible CE QUI A ÉTÉ DÉCIDÉ — en priorité la méthode et le pourquoi.
 */
export default function PrefillPanel({ ctrl }: { ctrl: ScrutinController }) {
  const { state } = ctrl;
  if (!state.prefilled) return null;
  const src = state.prefillSource?.toLowerCase() ?? null;
  const sourceLabel = src
    ? (SOURCE_LABEL[src] ?? `Préparé avec ${state.prefillSource}`)
    : "Pré-rempli depuis un lien";
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
        <span style={{ fontSize: 12, fontWeight: 700, color: MUTED, letterSpacing: "0.03em" }}>MÉTHODE PROPOSÉE</span>
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
        <span style={{ fontSize: 12.5, color: MUTED }}>— modifiable ci-dessous</span>
      </div>

      {state.prefillWhy && (
        <div style={{ marginTop: 11, fontSize: 13.5, lineHeight: 1.5, color: SUBINK }}>
          <span style={{ fontWeight: 700 }}>Pourquoi&nbsp;:</span> {state.prefillWhy}
        </div>
      )}

      <div style={{ marginTop: 11, fontSize: 12.5, color: MUTED, fontWeight: 600 }}>
        Tout est modifiable — vérifiez et ajustez avant de lancer.
      </div>
    </div>
  );
}
