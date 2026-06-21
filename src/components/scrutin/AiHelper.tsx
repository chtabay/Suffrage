"use client";

import { useState } from "react";
import { buildAiPrompt } from "@/lib/voting/aiPrompt";
import type { ScrutinController } from "@/lib/voting/useScrutin";
import { CREAM, FONT_BODY, FONT_DISPLAY, INK, MUTED } from "./theme";

const ASSISTANTS: { key: string; label: string; url: (p: string) => string }[] = [
  { key: "chatgpt", label: "ChatGPT", url: (p) => `https://chatgpt.com/?q=${encodeURIComponent(p)}` },
  { key: "claude", label: "Claude", url: (p) => `https://claude.ai/new?q=${encodeURIComponent(p)}` },
  { key: "gemini", label: "Gemini", url: () => `https://gemini.google.com/app` },
];

export default function AiHelper({ ctrl }: { ctrl: ScrutinController }) {
  const { state } = ctrl;
  const [copied, setCopied] = useState(false);

  const copy = async (prompt: string) => {
    try {
      await navigator.clipboard?.writeText(prompt);
      setCopied(true);
    } catch {
      /* presse-papiers indisponible */
    }
  };

  const prepare = async (a: (typeof ASSISTANTS)[number]) => {
    const prompt = buildAiPrompt(state.question, state.options, a.key);
    await copy(prompt);
    window.open(a.url(prompt), "_blank", "noopener,noreferrer");
  };

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
        Laisse une IA formuler le vote (titre, options, méthode) — elle te renverra un lien Suffrage
        prêt à ouvrir et à valider ici.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {ASSISTANTS.map((a) => (
          <button key={a.key} onClick={() => prepare(a)} style={{ ...btn, background: INK, color: "#fff" }}>
            Préparer avec {a.label}
          </button>
        ))}
        <button onClick={() => copy(buildAiPrompt(state.question, state.options, "ai"))} style={{ ...btn, background: CREAM, color: INK }}>
          {copied ? "✓ Prompt copié" : "Copier le prompt"}
        </button>
      </div>
    </div>
  );
}
