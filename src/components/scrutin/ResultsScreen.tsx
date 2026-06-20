"use client";

import type { ScrutinController } from "@/lib/voting/useScrutin";
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

      <div
        style={{
          background: "#fff",
          border: `2.5px solid ${INK}`,
          borderRadius: 22,
          boxShadow: `6px 6px 0 ${result.color}`,
          overflow: "hidden",
          marginTop: 18,
        }}
      >
        <div
          style={{
            background: result.color,
            padding: "26px 24px",
            borderBottom: `2.5px solid ${INK}`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: "rgba(255,255,255,0.9)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {result.methodName} · {ballotCount} bulletins
          </div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.95)", fontWeight: 600, marginTop: 4 }}>
            {state.question}
          </div>
          {result.hasWinner && (
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
              <div
                style={{
                  width: 70,
                  height: 70,
                  flex: "none",
                  borderRadius: 18,
                  border: `3px solid ${INK}`,
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 38,
                  animation: "stamp 0.5s ease both",
                }}
              >
                {result.winnerIcon}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.92)" }}>🏆 VAINQUEUR</div>
                <div
                  className="winner"
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 800,
                    fontSize: 34,
                    color: "#fff",
                    lineHeight: 1.02,
                    textShadow: "2px 2px 0 rgba(0,0,0,0.22)",
                  }}
                >
                  {result.winnerName}
                </div>
              </div>
            </div>
          )}
          {result.noWinner && (
            <div
              style={{
                marginTop: 14,
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                fontSize: 26,
                color: "#fff",
                textShadow: "2px 2px 0 rgba(0,0,0,0.22)",
              }}
            >
              {result.noWinnerLabel}
            </div>
          )}
        </div>

        <div style={{ padding: 24 }}>
          {/* barres */}
          <div style={{ fontWeight: 800, fontFamily: FONT_DISPLAY, fontSize: 16, marginBottom: 14 }}>
            {result.tallyLabel}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {result.bars.map((b) => (
              <div key={b.idx}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5 }}>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      flex: "none",
                      borderRadius: 7,
                      border: `2px solid ${INK}`,
                      background: b.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                    }}
                  >
                    {b.icon}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 14.5, flex: 1 }}>{b.name}</span>
                  <span style={{ fontWeight: 800, fontSize: 14.5, fontFamily: FONT_DISPLAY, color: b.valColor }}>
                    {b.valueLabel}
                  </span>
                </div>
                <div
                  style={{
                    height: 18,
                    background: "#F0EAD9",
                    border: `2px solid ${INK}`,
                    borderRadius: 30,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${b.pct}%`,
                      background: b.color,
                      borderRadius: 30,
                      transformOrigin: "left",
                      animation: "growBar 0.6s ease both",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* explication */}
          <div
            style={{
              marginTop: 22,
              background: CREAM,
              border: `2px solid ${INK}`,
              borderRadius: 14,
              padding: 18,
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontFamily: FONT_DISPLAY,
                fontSize: 15,
                marginBottom: 11,
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              🔍 Comment ce résultat a été obtenu
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {result.steps.map((s) => (
                <div key={s.n} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      flex: "none",
                      borderRadius: "50%",
                      background: result.color,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 12,
                      marginTop: 1,
                    }}
                  >
                    {s.n}
                  </span>
                  <span style={{ fontSize: 13.8, lineHeight: 1.5, color: "#2c3447" }}>{s.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* contrefactuel */}
          <div
            style={{
              marginTop: 16,
              background: "#fff4e0",
              border: `2px solid ${INK}`,
              borderRadius: 14,
              padding: "16px 18px",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.5, color: "#2c3447" }}>
              💡 {result.counterfactual}
            </div>
          </div>

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
              className="dc-lift"
              style={{
                flex: 1,
                minWidth: 140,
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                border: `2.5px solid ${INK}`,
                background: YELLOW,
                color: INK,
                padding: 13,
                borderRadius: 12,
                ...lift(`4px 4px 0 ${INK}`, `6px 6px 0 ${INK}`),
              }}
            >
              {state.shared ? "✓ Lien copié !" : "↗ Partager le vote"}
            </button>
          </div>
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
        </div>
      </div>
    </div>
  );
}
