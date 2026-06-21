"use client";

import { useState } from "react";
import { ASSISTANTS, copyAiPrompt, openAssistant } from "@/lib/ai/assistants";
import type { ScrutinController } from "@/lib/voting/useScrutin";
import { CREAM, FONT_BODY, FONT_DISPLAY, INK, MUTED } from "./theme";

export default function AiHelper({ ctrl }: { ctrl: ScrutinController }) {
  const { state } = ctrl;
  const [copied, setCopied] = useState(false);

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
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16 }}>✨ Préparer avec une IA</div>
      <div style={{ fontSize: 12.5, color: MUTED, margin: "5px 0 12px", lineHeight: 1.45 }}>
        Choisis un assistant : il reçoit le prompt et te renvoie un lien Suffrage prêt à valider ici.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {ASSISTANTS.map((a) => (
          <button
            key={a.key}
            onClick={() => openAssistant(a, state.question, state.options)}
            style={{ ...btn, display: "flex", alignItems: "center", gap: 8, background: INK, color: "#fff" }}
          >
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: a.color, flex: "none" }} />
            {a.label}
          </button>
        ))}
        <button
          onClick={() => {
            copyAiPrompt(state.question, state.options);
            setCopied(true);
          }}
          style={{ ...btn, background: CREAM, color: INK }}
        >
          {copied ? "✓ Prompt copié" : "Copier le prompt"}
        </button>
      </div>
      <div style={{ fontSize: 11.5, color: MUTED, marginTop: 10, lineHeight: 1.4 }}>
        Le prompt est copié automatiquement — sur Gemini, Copilot, Grok ou Le Chat, il suffit de le coller (Ctrl/⌘+V).
      </div>
    </div>
  );
}
