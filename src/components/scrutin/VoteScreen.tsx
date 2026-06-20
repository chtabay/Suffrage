"use client";

import { describeRecipe, methodMode, operativeMethod } from "@/lib/voting/engine";
import type { ScrutinController } from "@/lib/voting/useScrutin";
import BallotCard from "./BallotCard";
import { CORAL, FONT_DISPLAY, GREEN, INK, MUTED, lift } from "./theme";

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
  const ballotCount = state.ballots.length;
  const noBallots = ballotCount === 0;

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
        <BallotCard
          mode={mode}
          options={state.options}
          color={resolved.color}
          draft={{
            choice: state.myChoice,
            approved: state.myApproved,
            rank: state.myRank,
            grades: state.myGrades,
          }}
          onChoice={setChoice}
          onToggle={toggleApprove}
          onRank={rank}
          onResetRank={resetRank}
          onGrade={setGrade}
        />

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
