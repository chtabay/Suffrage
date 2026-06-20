"use client";

import { SYSTEMS, SYSTEM_ORDER } from "@/lib/voting/systems";
import type { ScrutinController } from "@/lib/voting/useScrutin";
import { CORAL, FONT_BODY, FONT_DISPLAY, GREEN, INK, MUTED, PAPER, SUBINK, lift } from "./theme";

const STEP_COLORS = ["#FF5E5B", "#5B5BD6", "#17B8A6"];
const STEPS = [
  {
    label: "ÉTAPE 1",
    title: "Posez la question",
    text: "« On part où en week-end ? » Ajoutez vos options, comme un sondage entre amis.",
  },
  {
    label: "ÉTAPE 2",
    title: "Réglez le scrutin",
    text: "Suffrage, nombre de tours, décompte, part d'aléatoire… avec les avantages et défauts en direct.",
  },
  {
    label: "ÉTAPE 3",
    title: "Votez & dépouillez",
    text: "Chacun vote, le gagnant est calculé selon la vraie méthode — et on vous explique pourquoi.",
  },
];

export default function HomeScreen({ ctrl }: { ctrl: ScrutinController }) {
  const { go, selectSystemRecipe } = ctrl;
  return (
    <div className="pad" style={{ maxWidth: 1120, margin: "0 auto", padding: "64px 24px 90px" }}>
      <div style={{ animation: "popIn 0.5s ease both" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: PAPER,
            border: `2px solid ${INK}`,
            borderRadius: 30,
            padding: "7px 15px",
            fontWeight: 600,
            fontSize: 13,
            boxShadow: `3px 3px 0 ${INK}`,
          }}
        >
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: GREEN, display: "inline-block" }} />
          Le Tricount des décisions de groupe
        </div>
        <h1
          className="hero"
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: "clamp(40px,7vw,76px)",
            lineHeight: 0.98,
            letterSpacing: "-0.035em",
            margin: "22px 0 0",
            maxWidth: "14ch",
          }}
        >
          Votez vraiment <span style={{ color: CORAL }}>comme il faut.</span>
        </h1>
        <p
          style={{
            fontSize: "clamp(17px,2.2vw,21px)",
            lineHeight: 1.5,
            maxWidth: "52ch",
            margin: "22px 0 0",
            color: SUBINK,
          }}
        >
          Choisissez votre mode de scrutin en connaissance de cause — du majoritaire au jugement
          majoritaire — puis lancez et partagez votre vote en deux clics. Le résultat est calculé
          pour de vrai.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 13, marginTop: 34 }}>
          <button
            onClick={() => go("create")}
            className="dc-lift"
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 17,
              cursor: "pointer",
              border: `2.5px solid ${INK}`,
              background: CORAL,
              color: "#fff",
              padding: "15px 26px",
              borderRadius: 14,
              ...lift(`5px 5px 0 ${INK}`, `7px 7px 0 ${INK}`),
            }}
          >
            Créer mon vote →
          </button>
          <button
            onClick={() => go("gallery")}
            className="dc-lift"
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 17,
              cursor: "pointer",
              border: `2.5px solid ${INK}`,
              background: PAPER,
              color: INK,
              padding: "15px 26px",
              borderRadius: 14,
              ...lift(`5px 5px 0 ${INK}`, `7px 7px 0 ${INK}`),
            }}
          >
            Comparer les 10 systèmes
          </button>
        </div>
      </div>

      {/* étapes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: 18,
          marginTop: 70,
        }}
      >
        {STEPS.map((step, i) => (
          <div
            key={i}
            style={{
              background: PAPER,
              border: `2.5px solid ${INK}`,
              borderRadius: 18,
              padding: 22,
              boxShadow: `5px 5px 0 ${INK}`,
              animation: `popIn 0.5s ease both`,
              animationDelay: `${0.05 + i * 0.07}s`,
            }}
          >
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, color: STEP_COLORS[i] }}>
              {step.label}
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 21, marginTop: 6 }}>
              {step.title}
            </div>
            <div style={{ color: SUBINK, marginTop: 6, lineHeight: 1.45, fontSize: 14.5 }}>{step.text}</div>
          </div>
        ))}
      </div>

      {/* aperçu des systèmes */}
      <div style={{ marginTop: 64 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 30, letterSpacing: "-0.02em", margin: 0 }}>
            10 façons de désigner un gagnant
          </h2>
          <button
            onClick={() => go("gallery")}
            style={{
              background: "none",
              border: "none",
              fontFamily: FONT_BODY,
              fontWeight: 700,
              fontSize: 15,
              color: CORAL,
              cursor: "pointer",
            }}
          >
            Tout voir →
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(168px,1fr))",
            gap: 14,
            marginTop: 20,
          }}
        >
          {SYSTEM_ORDER.map((key) => {
            const sys = SYSTEMS[key];
            return (
              <div
                key={key}
                onClick={() => selectSystemRecipe(key)}
                className="dc-lift"
                style={{
                  cursor: "pointer",
                  background: PAPER,
                  border: `2.5px solid ${INK}`,
                  borderRadius: 16,
                  padding: 16,
                  ...lift(`4px 4px 0 ${sys.color}`, `6px 6px 0 ${sys.color}`),
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    border: `2px solid ${INK}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    background: sys.tint,
                  }}
                >
                  {sys.icon}
                </div>
                <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16, marginTop: 11, lineHeight: 1.1 }}>
                  {sys.name}
                </div>
                <div style={{ color: MUTED, fontSize: 12.5, marginTop: 4, lineHeight: 1.35 }}>{sys.tagline}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
