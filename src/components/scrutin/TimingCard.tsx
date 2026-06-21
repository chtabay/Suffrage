"use client";

import type { ScrutinController } from "@/lib/voting/useScrutin";
import { CREAM, FONT_BODY, FONT_DISPLAY, INK, MUTED } from "./theme";

const cardStyle = {
  background: "#fff",
  border: `2.5px solid ${INK}`,
  borderRadius: 18,
  padding: 20,
  boxShadow: `5px 5px 0 ${INK}`,
} as const;

const inputStyle = {
  fontFamily: FONT_BODY,
  fontWeight: 600,
  border: `2px solid ${INK}`,
  borderRadius: 9,
  background: CREAM,
  outline: "none",
  fontSize: 14,
  padding: "9px 11px",
} as const;

export default function TimingCard({ ctrl }: { ctrl: ScrutinController }) {
  const { state, setClosesAt, setOpensAt, setQuorum } = ctrl;
  return (
    <div style={cardStyle}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>Durée &amp; validité</div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>Clôture automatique</div>
        <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 8, lineHeight: 1.35 }}>
          Le scrutin se ferme tout seul à cette date. Vide = clôture manuelle par l'organisateur.
        </div>
        <input
          type="datetime-local"
          value={state.closesAt}
          onChange={(e) => setClosesAt(e.target.value)}
          style={{ ...inputStyle }}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>
          Ouverture différée <span style={{ color: MUTED, fontWeight: 600 }}>(option)</span>
        </div>
        <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 8, lineHeight: 1.35 }}>
          Aucun bulletin n'est accepté avant cette date. Vide = ouvert tout de suite.
        </div>
        <input
          type="datetime-local"
          value={state.opensAt}
          onChange={(e) => setOpensAt(e.target.value)}
          style={{ ...inputStyle }}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>
          Quorum <span style={{ color: MUTED, fontWeight: 600 }}>(option)</span>
        </div>
        <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 8, lineHeight: 1.35 }}>
          Nombre minimum de bulletins pour que le résultat soit considéré valable.
        </div>
        <input
          type="number"
          min={0}
          value={state.quorum ?? ""}
          onChange={(e) => setQuorum(e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value))))}
          placeholder="ex : 5"
          style={{ ...inputStyle, width: 120 }}
        />
      </div>
    </div>
  );
}
