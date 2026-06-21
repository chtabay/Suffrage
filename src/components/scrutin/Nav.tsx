"use client";

import type { ScrutinController } from "@/lib/voting/useScrutin";
import { CORAL, CREAM, FONT_BODY, FONT_DISPLAY, INK, YELLOW, lift } from "./theme";

export default function Nav({ ctrl }: { ctrl: ScrutinController }) {
  const { go } = ctrl;
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(6px)",
        background: "rgba(251,246,236,0.82)",
        borderBottom: `2.5px solid ${INK}`,
      }}
    >
      <div
        className="pad"
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          rowGap: 10,
        }}
      >
        <div
          onClick={() => go("home")}
          style={{ display: "flex", alignItems: "center", gap: 11, cursor: "pointer" }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              border: `2.5px solid ${INK}`,
              borderRadius: 11,
              background: YELLOW,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              boxShadow: `3px 3px 0 ${INK}`,
            }}
          >
            🗳️
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 21, letterSpacing: "-0.02em" }}>
            Scrutin
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => go("mine")}
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
            Mes scrutins
          </button>
          <button
            onClick={() => go("gallery")}
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
            Les systèmes
          </button>
          <button
            onClick={() => go("create")}
            className="dc-lift"
            style={{
              fontFamily: FONT_BODY,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              border: `2.5px solid ${INK}`,
              background: CORAL,
              color: "#fff",
              padding: "9px 16px",
              borderRadius: 10,
              ...lift(`3px 3px 0 ${INK}`, `4px 4px 0 ${INK}`),
            }}
          >
            Créer un vote
          </button>
        </div>
      </div>
    </div>
  );
}
