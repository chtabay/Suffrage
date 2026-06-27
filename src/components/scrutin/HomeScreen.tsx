"use client";

import { useEffect, useState } from "react";
import { SYSTEMS } from "@/lib/voting/systems";
import type { ScrutinController } from "@/lib/voting/useScrutin";
import AiSideRail from "./AiSideRail";
import AiHelper from "./AiHelper";
import SlackMark from "@/components/SlackMark";
import { Link } from "@/i18n/navigation";
import { CORAL, FONT_BODY, FONT_DISPLAY, GREEN, INK, MUTED, PAPER, SUBINK, lift } from "./theme";

// 4 méthodes mises en avant (spectre représentatif) ; les 10 restent dans la galerie.
const HOME_METHODS = ["fptp", "approval", "mj", "condorcet"];

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

/**
 * Accueil décroissant : mode « pédagogie » pour un nouveau visiteur, ses 3
 * premières visites, ou un retour après >1 mois ; sinon « lean » (droit au but).
 * Défaut = lean (pas de flash pour un habitué) ; on développe vers pédagogie au montage.
 */
function useHomeMode(): "learn" | "lean" {
  const [mode, setMode] = useState<"learn" | "lean">("lean");
  useEffect(() => {
    try {
      const count = parseInt(localStorage.getItem("scrutin_seen") || "0", 10) || 0;
      const last = parseInt(localStorage.getItem("scrutin_last") || "0", 10) || 0;
      const now = Date.now();
      const lapsed = last > 0 && now - last > 30 * 86400000;
      if (last === 0 || lapsed || count < 3) setMode("learn");
      localStorage.setItem("scrutin_seen", String(last === 0 || lapsed ? 1 : count + 1));
      localStorage.setItem("scrutin_last", String(now));
    } catch {
      setMode("learn");
    }
  }, []);
  return mode;
}

export default function HomeScreen({ ctrl }: { ctrl: ScrutinController }) {
  const { go, selectSystemRecipe } = ctrl;
  const learn = useHomeMode() === "learn";

  return (
    <div className="pad" style={{ maxWidth: 1120, margin: "0 auto", padding: `${learn ? 56 : 26}px 24px 90px` }}>
      <AiSideRail />

      {/* hero : pitch en pédagogie, compact en lean — une seule action primaire */}
      <div style={{ animation: "popIn 0.5s ease both" }}>
        {learn && (
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
            Décider à plusieurs, simplement
          </div>
        )}
        <h1
          className="hero"
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: learn ? "clamp(40px,7vw,76px)" : "clamp(26px,6vw,40px)",
            lineHeight: learn ? 0.98 : 1.05,
            letterSpacing: "-0.035em",
            margin: learn ? "22px 0 0" : 0,
            maxWidth: "14ch",
          }}
        >
          Votez vraiment <span style={{ color: CORAL }}>comme il faut.</span>
        </h1>
        {learn && (
          <p
            style={{
              fontSize: "clamp(17px,2.2vw,21px)",
              lineHeight: 1.5,
              maxWidth: "52ch",
              margin: "22px 0 0",
              color: SUBINK,
            }}
          >
            Choisissez la méthode de vote adaptée à votre décision, lancez le scrutin et partagez-le
            en deux clics. Le gagnant est calculé selon ses règles exactes — pas un sondage de plus.
          </p>
        )}
        <div style={{ marginTop: learn ? 32 : 18 }}>
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
        </div>
      </div>

      {/* 4 méthodes phares — remontées pour être visibles dès la première page */}
      <div style={{ marginTop: learn ? 40 : 26 }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: learn ? 30 : 23, letterSpacing: "-0.02em", margin: 0 }}>
          {learn ? "Il n'y a pas qu'une façon de désigner un gagnant" : "Choisir une méthode"}
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
            gap: 14,
            marginTop: 16,
          }}
        >
          {HOME_METHODS.map((key) => {
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
                <div
                  style={{
                    marginTop: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: sys.tint,
                    borderRadius: 999,
                    padding: "3px 9px 3px 7px",
                    fontSize: 10.5,
                    fontWeight: 800,
                    color: INK,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: sys.color, flex: "none" }} />
                  {sys.strength}
                </div>
              </div>
            );
          })}
        </div>

        {/* après les cartes : comparer toutes les méthodes */}
        <button
          onClick={() => go("gallery")}
          className="dc-lift"
          style={{
            marginTop: 16,
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            border: `2.5px solid ${INK}`,
            background: PAPER,
            color: INK,
            padding: "12px 20px",
            borderRadius: 12,
            ...lift(`4px 4px 0 ${INK}`, `6px 6px 0 ${INK}`),
          }}
        >
          Comparer les 10 méthodes →
        </button>
      </div>

      {/* étapes — pédagogie uniquement, après les cartes */}
      {learn && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 18,
            marginTop: 56,
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
      )}

      {/* IA — après le choix de méthode (mobile ; desktop = rail latéral) */}
      <div className="ai-home-inline" style={{ marginTop: 28 }}>
        <AiHelper ctrl={ctrl} />
      </div>

      {/* Intégration Slack — point d'entrée discret vers l'install */}
      <div
        style={{
          marginTop: 40,
          paddingTop: 22,
          borderTop: `2px dashed ${INK}`,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
        }}
      >
        <div style={{ fontSize: 14, color: SUBINK, lineHeight: 1.5, maxWidth: "46ch" }}>
          <strong style={{ color: INK }}>Aussi dans Slack.</strong> Lancez un vote sans quitter vos canaux —{" "}
          <code style={{ fontFamily: FONT_BODY }}>/scrutin</code>, on vote sur le web, le résultat revient dans le canal.
        </div>
        <Link
          href="/slack"
          className="dc-lift"
          style={{
            flex: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 14.5,
            textDecoration: "none",
            border: `2.5px solid ${INK}`,
            background: "#fff",
            color: INK,
            padding: "11px 18px",
            borderRadius: 12,
            ...lift(`4px 4px 0 ${INK}`, `6px 6px 0 ${INK}`),
          }}
        >
          <SlackMark /> Ajouter à Slack
        </Link>
      </div>
    </div>
  );
}
