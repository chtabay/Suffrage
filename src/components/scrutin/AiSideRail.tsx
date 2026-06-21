"use client";

import { RAIL_ASSISTANTS, openAssistant } from "@/lib/ai/assistants";
import { FONT_DISPLAY, INK, MUTED } from "./theme";

// Rail latéral (desktop) : lancer la préparation du vote avec une IA dès l'accueil.
export default function AiSideRail() {
  return (
    <div
      className="ai-side-rail"
      style={{
        position: "fixed",
        right: 12,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 60,
        background: "#fff",
        border: `2.5px solid ${INK}`,
        borderRadius: 16,
        boxShadow: `4px 4px 0 ${INK}`,
        padding: "12px 8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        width: 80,
      }}
    >
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 11, color: MUTED, textAlign: "center", lineHeight: 1.2 }}>
        ✨ Préparer avec une IA
      </div>
      {RAIL_ASSISTANTS.map((a) => (
        <button
          key={a.key}
          onClick={() => openAssistant(a, "", [])}
          title={`Préparer avec ${a.label}`}
          aria-label={`Préparer avec ${a.label}`}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: `2.5px solid ${INK}`,
              background: a.color,
              boxShadow: `2px 2px 0 ${INK}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 17,
            }}
          >
            ✨
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: INK }}>{a.label}</span>
        </button>
      ))}
    </div>
  );
}
