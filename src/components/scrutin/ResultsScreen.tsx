"use client";

import type { ScrutinController } from "@/lib/voting/useScrutin";
import ResultCard from "./ResultCard";
import { CORAL, CREAM, FONT_DISPLAY, INK, MUTED, YELLOW, lift } from "./theme";

export default function ResultsScreen({ ctrl }: { ctrl: ScrutinController }) {
  const { state, go, recalc, share } = ctrl;
  const result = state.result;
  const ballotCount = state.ballots.length;

  if (!result) {
    return (
      <div className="pad" style={{ maxWidth: 880, margin: "0 auto", padding: "60px 24px", textAlign: "center" }}>
        <p style={{ color: MUTED }}>Aucun résultat à afficher — déposez d'abord des bulletins dans l'urne.</p>
        <button
          onClick={() => go("vote")}
          style={{
            marginTop: 16,
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            cursor: "pointer",
            border: `2.5px solid ${INK}`,
            background: CORAL,
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 12,
          }}
        >
          Retour au vote
        </button>
      </div>
    );
  }

  const footer = (
    <>
      <div style={{ display: "flex", gap: 11, marginTop: 22, flexWrap: "wrap" }}>
        <button
          onClick={recalc}
          className="dc-lift"
          style={{
            flex: 1,
            minWidth: 140,
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            border: `2.5px solid ${INK}`,
            background: "#fff",
            color: INK,
            padding: 13,
            borderRadius: 12,
            ...lift(`4px 4px 0 ${INK}`, `6px 6px 0 ${INK}`),
          }}
        >
          ↻ Recalculer
        </button>
        <button
          onClick={share}
          disabled={state.sharing}
          className="dc-lift"
          style={{
            flex: 1,
            minWidth: 140,
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 15,
            cursor: state.sharing ? "default" : "pointer",
            border: `2.5px solid ${INK}`,
            background: YELLOW,
            color: INK,
            padding: 13,
            borderRadius: 12,
            opacity: state.sharing ? 0.7 : 1,
            ...lift(`4px 4px 0 ${INK}`, `6px 6px 0 ${INK}`),
          }}
        >
          {state.sharing ? "Partage…" : state.shared ? "✓ Lien copié !" : "↗ Partager le vote"}
        </button>
      </div>
      {state.shareUrl && (
        <div
          style={{
            marginTop: 11,
            background: "#fff",
            border: `2px solid ${INK}`,
            borderRadius: 11,
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: MUTED }}>Lien de vote :</span>
          <a
            href={state.shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 13, fontWeight: 700, color: "#2E8BFF", wordBreak: "break-all" }}
          >
            {state.shareUrl}
          </a>
        </div>
      )}
      <button
        onClick={() => go("create")}
        style={{
          width: "100%",
          marginTop: 11,
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          border: `2px solid ${INK}`,
          background: CREAM,
          color: INK,
          padding: 12,
          borderRadius: 11,
        }}
      >
        ⚙︎ Changer de système et re-dépouiller les mêmes bulletins
      </button>
    </>
  );

  return (
    <div className="pad" style={{ maxWidth: 880, margin: "0 auto", padding: "40px 24px 100px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: 14, color: MUTED }}>
        <span onClick={() => go("create")} style={{ cursor: "pointer" }}>
          1. Réglages
        </span>
        <span>→</span>
        <span onClick={() => go("vote")} style={{ cursor: "pointer" }}>
          2. Vote
        </span>
        <span>→</span>
        <span style={{ color: CORAL, fontWeight: 800 }}>3. Résultat</span>
      </div>
      <div style={{ marginTop: 18 }}>
        <ResultCard result={result} question={state.question} ballotCount={ballotCount} footer={footer} />
      </div>
    </div>
  );
}
