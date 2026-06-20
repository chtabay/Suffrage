"use client";

import { describeRecipe, methodMode, operativeMethod } from "@/lib/voting/engine";
import { GRADES, GRADE_COLORS, candColor } from "@/lib/voting/systems";
import type { ScrutinController } from "@/lib/voting/useScrutin";
import { CORAL, CREAM, FONT_BODY, FONT_DISPLAY, GREEN, INK, MUTED, lift } from "./theme";

const PICKED = "#FFF4DF";

const INSTRUCTIONS: Record<string, string> = {
  single: "Choisissez une seule option.",
  approve: "Cochez toutes les options qui vous conviennent.",
  rank: "Classez les options de la préférée à la moins aimée.",
  grade: "Donnez une mention à chaque option.",
};

export default function VoteScreen({ ctrl }: { ctrl: ScrutinController }) {
  const { state, go, setChoice, toggleApprove, rank, resetRank, setGrade, addMyVote, simulate, reset, goResults } =
    ctrl;
  const resolved = describeRecipe(state.recipe);
  const mode = methodMode(operativeMethod(state.recipe));
  const opts = state.options;
  const ballotCount = state.ballots.length;
  const noBallots = ballotCount === 0;

  const optionRow = (i: number, children: React.ReactNode, onClick: () => void, bg: string) => (
    <button
      key={i}
      onClick={onClick}
      className="dc-dim"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        textAlign: "left",
        cursor: "pointer",
        border: `2.5px solid ${INK}`,
        background: bg,
        padding: "13px 15px",
        borderRadius: 13,
        fontFamily: FONT_BODY,
      }}
    >
      {children}
    </button>
  );

  const iconBox = (i: number, size = 38, radius = 10) => (
    <span
      style={{
        width: size,
        height: size,
        flex: "none",
        borderRadius: radius,
        border: `2px solid ${INK}`,
        background: candColor(i),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 19,
      }}
    >
      {opts[i].icon}
    </span>
  );

  return (
    <div className="pad" style={{ maxWidth: 880, margin: "0 auto", padding: "40px 24px 100px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: 14, color: MUTED }}>
        <span onClick={() => go("create")} style={{ cursor: "pointer" }}>
          1. Réglages
        </span>
        <span>→</span>
        <span style={{ color: CORAL, fontWeight: 800 }}>2. Vote</span>
        <span>→</span>
        <span>3. Résultat</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: resolved.color,
            color: "#fff",
            border: `2.5px solid ${INK}`,
            borderRadius: 30,
            padding: "6px 14px",
            fontWeight: 700,
            fontSize: 13,
            boxShadow: `3px 3px 0 ${INK}`,
          }}
        >
          <span>{resolved.icon}</span>
          {resolved.name}
        </div>
      </div>

      <h1
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 800,
          fontSize: "clamp(26px,4vw,40px)",
          letterSpacing: "-0.025em",
          margin: "14px 0 0",
          lineHeight: 1.05,
        }}
      >
        {state.question}
      </h1>
      <p style={{ fontSize: 15, color: MUTED, margin: "8px 0 0" }}>{INSTRUCTIONS[mode]}</p>

      {/* carte bulletin */}
      <div
        style={{
          background: "#fff",
          border: `2.5px solid ${INK}`,
          borderRadius: 20,
          padding: 22,
          boxShadow: `5px 5px 0 ${INK}`,
          marginTop: 22,
        }}
      >
        {mode === "single" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {opts.map((o, i) =>
              optionRow(
                i,
                <>
                  {iconBox(i)}
                  <span style={{ fontWeight: 700, fontSize: 16, flex: 1, color: INK }}>{o.name}</span>
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      flex: "none",
                      borderRadius: "50%",
                      border: `2.5px solid ${INK}`,
                      background: state.myChoice === i ? INK : "transparent",
                    }}
                  />
                </>,
                () => setChoice(i),
                state.myChoice === i ? PICKED : CREAM,
              ),
            )}
          </div>
        )}

        {mode === "approve" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {opts.map((o, i) => {
              const on = state.myApproved.includes(i);
              return optionRow(
                i,
                <>
                  {iconBox(i)}
                  <span style={{ fontWeight: 700, fontSize: 16, flex: 1, color: INK }}>{o.name}</span>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      flex: "none",
                      borderRadius: 7,
                      border: `2.5px solid ${INK}`,
                      background: on ? GREEN : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: 15,
                    }}
                  >
                    {on ? "✓" : ""}
                  </span>
                </>,
                () => toggleApprove(i),
                on ? PICKED : CREAM,
              );
            })}
          </div>
        )}

        {mode === "rank" && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: MUTED, marginBottom: 9 }}>
              Cliquez dans l'ordre de vos préférences
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {opts.map((o, i) => {
                const pos = state.myRank.indexOf(i);
                return optionRow(
                  i,
                  <>
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        flex: "none",
                        borderRadius: "50%",
                        border: `2.5px solid ${INK}`,
                        background: pos >= 0 ? resolved.color : "#fff",
                        color: pos >= 0 ? "#fff" : "#9aa3bd",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: 15,
                        fontFamily: FONT_DISPLAY,
                      }}
                    >
                      {pos >= 0 ? pos + 1 : "·"}
                    </span>
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        flex: "none",
                        borderRadius: 9,
                        border: `2px solid ${INK}`,
                        background: candColor(i),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 17,
                      }}
                    >
                      {o.icon}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 15.5, flex: 1, color: INK }}>{o.name}</span>
                  </>,
                  () => rank(i),
                  pos >= 0 ? PICKED : CREAM,
                );
              })}
            </div>
            <button
              onClick={resetRank}
              style={{
                marginTop: 11,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                border: `2px solid ${INK}`,
                background: CREAM,
                color: INK,
                padding: "8px 14px",
                borderRadius: 9,
              }}
            >
              Recommencer le classement
            </button>
          </div>
        )}

        {mode === "grade" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {opts.map((o, i) => (
              <div key={i}>
                <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 8 }}>
                  <span
                    style={{
                      width: 34,
                      height: 34,
                      flex: "none",
                      borderRadius: 9,
                      border: `2px solid ${INK}`,
                      background: candColor(i),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 17,
                    }}
                  >
                    {o.icon}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 16, color: INK }}>{o.name}</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {GRADES.map((gl, gi) => {
                    const sel = (state.myGrades[i] ?? null) === gi;
                    return (
                      <button
                        key={gi}
                        onClick={() => setGrade(i, gi)}
                        style={{
                          flex: 1,
                          minWidth: 78,
                          cursor: "pointer",
                          border: `2px solid ${INK}`,
                          background: sel ? GRADE_COLORS[gi] : "#fff",
                          color: sel ? "#fff" : INK,
                          padding: "8px 6px",
                          borderRadius: 9,
                          fontWeight: 700,
                          fontSize: 12.5,
                          lineHeight: 1.1,
                        }}
                      >
                        {gl}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={addMyVote}
          className="dc-lift"
          style={{
            marginTop: 20,
            width: "100%",
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
            border: `2.5px solid ${INK}`,
            background: GREEN,
            color: "#fff",
            padding: 14,
            borderRadius: 13,
            ...lift(`4px 4px 0 ${INK}`, `6px 6px 0 ${INK}`),
          }}
        >
          ✓ Ajouter mon bulletin
        </button>
      </div>

      {/* état de l'urne */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginTop: 20,
          flexWrap: "wrap",
          background: INK,
          color: "#fff",
          borderRadius: 16,
          padding: "16px 20px",
        }}
      >
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 30, lineHeight: 1 }}>{ballotCount}</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.3, flex: 1, minWidth: 120 }}>
          bulletins dans l'urne
          <br />
          <span style={{ color: "#9aa3bd" }}>simulez une foule pour tester votre système</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={simulate}
            style={{
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              border: "2px solid #fff",
              background: "transparent",
              color: "#fff",
              padding: "9px 14px",
              borderRadius: 9,
            }}
          >
            + 100 électeurs
          </button>
          <button
            onClick={reset}
            style={{
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              border: "2px solid #6b7390",
              background: "transparent",
              color: "#9aa3bd",
              padding: "9px 14px",
              borderRadius: 9,
            }}
          >
            Vider l'urne
          </button>
        </div>
      </div>

      <button
        onClick={goResults}
        disabled={noBallots}
        className="dc-lift"
        style={{
          marginTop: 18,
          width: "100%",
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 18,
          cursor: noBallots ? "default" : "pointer",
          border: `2.5px solid ${INK}`,
          background: CORAL,
          color: "#fff",
          padding: 16,
          borderRadius: 14,
          opacity: noBallots ? 0.45 : 1,
          ...lift(`5px 5px 0 ${INK}`, `7px 7px 0 ${INK}`),
        }}
      >
        Dépouiller &amp; voir le résultat →
      </button>
    </div>
  );
}
