"use client";

import type { ScrutinController } from "@/lib/voting/useScrutin";
import { CREAM, FONT_BODY, FONT_DISPLAY, INK, MUTED } from "./theme";

/** Date de clôture, visible par défaut (mécanisme de validité du scrutin « autoportant »). */
export default function ClosureLine({ ctrl }: { ctrl: ScrutinController }) {
  const { state, setClosesAt } = ctrl;
  return (
    <div
      style={{
        background: "#fff",
        border: `2.5px solid ${INK}`,
        borderRadius: 14,
        padding: "14px 18px",
        boxShadow: `4px 4px 0 ${INK}`,
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16 }}>🗓 Clôture</span>
      <input
        type="datetime-local"
        value={state.closesAt}
        onChange={(e) => setClosesAt(e.target.value)}
        style={{
          flex: 1,
          minWidth: 190,
          fontFamily: FONT_BODY,
          fontWeight: 600,
          border: `2px solid ${INK}`,
          borderRadius: 9,
          background: CREAM,
          outline: "none",
          fontSize: 14,
          padding: "8px 10px",
        }}
      />
      {state.closesAt ? (
        <button
          onClick={() => setClosesAt("")}
          title="Pas de clôture automatique"
          style={{ fontSize: 12.5, fontWeight: 700, color: MUTED, background: "none", border: "none", cursor: "pointer" }}
        >
          retirer
        </button>
      ) : (
        <span style={{ fontSize: 12.5, color: MUTED, fontWeight: 600 }}>clôture manuelle</span>
      )}
    </div>
  );
}
