"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SYSTEMS } from "@/lib/voting/systems";
import { ASSIGN_METHODS, ASSIGN_METHOD_KEYS, type AssignMethodKey } from "@/lib/assign/methods";
import type { ScrutinController } from "@/lib/voting/useScrutin";
import AiSideRail from "./AiSideRail";
import AiHelper from "./AiHelper";
import PublicFeedStrip from "./PublicFeedStrip";
import SlackMark from "@/components/SlackMark";
import { Link } from "@/i18n/navigation";
import { Btn } from "@/components/ui/kit";
import { CORAL, FONT_DISPLAY, GREEN, INK, MUTED, PAPER, SUBINK, YELLOW, lift } from "./theme";

// 4 méthodes mises en avant (spectre représentatif) ; les 10 restent dans la galerie.
const HOME_METHODS = ["fptp", "approval", "mj", "condorcet"];

const STEP_COLORS = ["#FF5E5B", "#5B5BD6", "#17B8A6"];

type IntentKind = "decide" | "survey" | "date" | "assign";

/**
 * Les 4 intentions de Placet. Ce ne sont PAS 4 produits : juste des préréglages
 * de l'état existant (optionKind + drapeau survey) — aucun changement de moteur.
 */
const INTENTS: { kind: IntentKind; color: string; titleKey: string; textKey: string }[] = [
  { kind: "decide", color: CORAL, titleKey: "doorVoteTitle", textKey: "doorVoteText" },
  { kind: "survey", color: "#2A9D8F", titleKey: "doorSurveyTitle", textKey: "doorSurveyText" },
  { kind: "date", color: "#5B5BD6", titleKey: "doorDateTitle", textKey: "doorDateText" },
  { kind: "assign", color: "#17B8A6", titleKey: "doorAssignTitle", textKey: "doorAssignText" },
];

/**
 * Illustration d'intention : elle montre la MÉCANIQUE (qui gagne, qui reçoit,
 * ce qui se répartit), pas une icône décorative. SVG inline — aucun asset.
 */
function IntentArt({ kind }: { kind: IntentKind }) {
  const box = { width: 64, height: 44, display: "block" } as const;
  if (kind === "decide") {
    return (
      <svg viewBox="0 0 64 44" style={box} aria-hidden="true">
        <rect x="6" y="24" width="13" height="18" fill="#fff" stroke={INK} strokeWidth="2" />
        <rect x="25" y="12" width="13" height="30" fill={CORAL} stroke={INK} strokeWidth="2" />
        <rect x="44" y="29" width="13" height="13" fill="#fff" stroke={INK} strokeWidth="2" />
        <path d="M27 8 l4.5 -6 l4.5 6 z" fill={YELLOW} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "survey") {
    return (
      <svg viewBox="0 0 64 44" style={box} aria-hidden="true">
        <path d="M12 15 h11 v13 h-11 z" fill="#d23b3b" />
        <path d="M23 15 h13 v13 h-13 z" fill="#e6a528" />
        <path d="M36 15 h10 v13 h-10 z" fill="#8cb83a" />
        <path d="M46 15 h7 v13 h-7 z" fill="#1f8a4c" />
        <rect x="5" y="14" width="54" height="15" rx="7" fill="none" stroke={INK} strokeWidth="2" />
        <circle cx="32" cy="37" r="2.5" fill={INK} />
      </svg>
    );
  }
  if (kind === "date") {
    return (
      <svg viewBox="0 0 64 44" style={box} aria-hidden="true">
        <rect x="8" y="6" width="48" height="34" rx="4" fill="#fff" stroke={INK} strokeWidth="2" />
        <path d="M8 15 h48" stroke={INK} strokeWidth="2" />
        <rect x="14" y="20" width="9" height="7" fill="#fff" stroke={INK} strokeWidth="1.5" />
        <rect x="27" y="20" width="9" height="7" fill="#5B5BD6" stroke={INK} strokeWidth="1.5" />
        <rect x="40" y="20" width="9" height="7" fill="#fff" stroke={INK} strokeWidth="1.5" />
        <rect x="14" y="30" width="9" height="7" fill="#fff" stroke={INK} strokeWidth="1.5" />
        <rect x="27" y="30" width="9" height="7" fill="#fff" stroke={INK} strokeWidth="1.5" />
        <rect x="40" y="30" width="9" height="7" fill="#fff" stroke={INK} strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 44" style={box} aria-hidden="true">
      <path d="M19 10 h25" stroke="#17B8A6" strokeWidth="2.5" />
      <path d="M19 24 h25" stroke="#17B8A6" strokeWidth="2.5" />
      <path d="M19 38 h25" stroke="#17B8A6" strokeWidth="2.5" />
      <circle cx="13" cy="10" r="5" fill={YELLOW} stroke={INK} strokeWidth="2" />
      <circle cx="13" cy="24" r="5" fill={YELLOW} stroke={INK} strokeWidth="2" />
      <circle cx="13" cy="38" r="5" fill={YELLOW} stroke={INK} strokeWidth="2" />
      <rect x="45" y="5" width="11" height="10" fill="#fff" stroke={INK} strokeWidth="2" />
      <rect x="45" y="19" width="11" height="10" fill="#fff" stroke={INK} strokeWidth="2" />
      <rect x="45" y="33" width="11" height="10" fill="#fff" stroke={INK} strokeWidth="2" />
    </svg>
  );
}

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
  const { go, selectSystemRecipe, setOptionKind, setAssignMethod, setQuestion, setSurvey } = ctrl;
  const t = useTranslations("Home");
  const tm = useTranslations("Methods");
  const ta = useTranslations("Assign");
  const learn = useHomeMode() === "learn";
  // Deux portes : décider (vote) ou affecter — CTA, cartes et étapes s'adaptent.
  const [pillar, setPillar] = useState<"vote" | "assign">("vote");
  // La question se saisit ICI : elle arrive pré-remplie dans l'écran de création.
  const [q, setQ] = useState("");
  const startAssign = (key?: AssignMethodKey) => {
    setOptionKind("assign");
    if (key) setAssignMethod(key);
    go("create");
  };
  // Une intention = un préréglage, puis on entre directement dans la création.
  const start = (kind: IntentKind) => {
    const question = q.trim();
    if (question) setQuestion(question);
    if (kind === "assign") {
      setPillar("assign");
      startAssign();
      return;
    }
    setPillar("vote");
    setSurvey(kind === "survey");
    setOptionKind(kind === "date" ? "slot" : "text");
    go("create");
  };

  return (
    <div className="pad" style={{ maxWidth: 1120, margin: "0 auto", padding: `${learn ? 38 : 16}px 24px 90px` }}>
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
            {t("badge")}
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
            margin: learn ? "16px 0 0" : 0,
            maxWidth: "14ch",
          }}
        >
          {t("heroA")} <span style={{ color: CORAL }}>{t("heroB")}</span>
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
            {t("subtitle")}
          </p>
        )}
        {/* L'intention d'abord : on pose SA question, puis on choisit quoi en
            faire. Le libellé évite « le groupe » — on n'a pas besoin d'un groupe
            constitué pour lancer, on partage un lien. */}
        <div style={{ marginTop: learn ? 24 : 16, maxWidth: 640 }}>
          <label
            htmlFor="home-question"
            style={{ display: "block", fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 13, color: INK, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 8 }}
          >
            {t("askLabel")}
          </label>
          <input
            id="home-question"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") start("decide");
            }}
            placeholder={t("askPlaceholder")}
            style={{
              width: "100%",
              fontFamily: FONT_DISPLAY,
              fontWeight: 600,
              fontSize: 20,
              padding: "18px 20px",
              border: `3px solid ${INK}`,
              borderRadius: 14,
              background: "#fff",
              outline: "none",
              boxSizing: "border-box",
              boxShadow: `6px 6px 0 ${CORAL}`,
            }}
          />
        </div>

        {/* Les 4 intentions — chacune illustre sa mécanique. Étape 2 du parcours. */}
        <div style={{ marginTop: 18, fontWeight: 700, fontSize: 13, color: SUBINK }}>{t("intentLabel")}</div>
        <div
          style={{
            marginTop: 10,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(215px,1fr))",
            gap: 12,
          }}
        >
          {INTENTS.map((it) => (
            <button
              key={it.kind}
              onClick={() => start(it.kind)}
              className="dc-lift intent-card"
              style={{
                textAlign: "left",
                cursor: "pointer",
                width: "100%",
                fontFamily: "inherit",
                background: PAPER,
                border: `2px solid ${INK}`,
                borderRadius: 14,
                padding: 13,
                ...lift(`3px 3px 0 ${it.color}`, `5px 5px 0 ${it.color}`),
              }}
            >
              <IntentArt kind={it.kind} />
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15.5, marginTop: 8 }}>{t(it.titleKey)}</div>
              <div style={{ fontSize: 12.5, color: SUBINK, lineHeight: 1.4, marginTop: 3 }}>{t(it.textKey)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Méthodes : étape de PERSONNALISATION, après avoir identifié le type.
          Volontairement moins de poids visuel que le choix du type ci-dessus. */}
      <div style={{ marginTop: learn ? 40 : 30 }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: learn ? 30 : 19, letterSpacing: "-0.02em", margin: 0, color: learn ? INK : SUBINK }}>
          {learn ? (pillar === "assign" ? t("methodsTitleLearnAssign") : t("methodsTitleLearn")) : t("methodsTitleLean")}
        </h2>
        {!learn && (
          <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4, lineHeight: 1.4, maxWidth: "52ch" }}>{t("methodsHint")}</div>
        )}
        {/* Les cartes d'intention filent droit dans la création : cette section a
            donc besoin de son PROPRE sélecteur pour rester dynamique (elle pilote
            aussi les étapes plus bas). */}
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(
            [
              ["vote", t("methodsForVote")],
              ["assign", t("methodsForAssign")],
            ] as const
          ).map(([key, label]) => {
            const on = pillar === key;
            return (
              <button
                key={key}
                onClick={() => setPillar(key)}
                aria-pressed={on}
                style={{
                  fontFamily: "inherit",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  border: `2px solid ${INK}`,
                  borderRadius: 20,
                  padding: "7px 14px",
                  background: on ? INK : "transparent",
                  color: on ? "#fff" : INK,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
            gap: 14,
            marginTop: 16,
          }}
        >
          {pillar === "assign" &&
            ASSIGN_METHOD_KEYS.map((key) => {
              const def = ASSIGN_METHODS[key];
              return (
                <button
                  key={key}
                  onClick={() => startAssign(key)}
                  className="dc-lift"
                  style={{
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    fontFamily: "inherit",
                    background: PAPER,
                    border: `2.5px solid ${INK}`,
                    borderRadius: 16,
                    padding: 16,
                    ...lift(`4px 4px 0 ${def.color}`, `6px 6px 0 ${def.color}`),
                  }}
                >
                  <div style={{ width: 42, height: 42, borderRadius: 12, border: `2px solid ${INK}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, background: def.tint }}>
                    {def.icon}
                  </div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16, marginTop: 11, lineHeight: 1.1 }}>
                    {ta(`methods.${key}.name`)}
                  </div>
                  <div style={{ color: MUTED, fontSize: 12.5, marginTop: 4, lineHeight: 1.35 }}>{ta(`methods.${key}.tagline`)}</div>
                  <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, background: def.tint, borderRadius: 999, padding: "3px 9px 3px 7px", fontSize: 10.5, fontWeight: 800, color: INK }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: def.color, flex: "none" }} />
                    {ta(`methods.${key}.strength`)}
                  </div>
                </button>
              );
            })}
          {pillar === "vote" && HOME_METHODS.map((key) => {
            const sys = SYSTEMS[key];
            return (
              <button
                key={key}
                onClick={() => selectSystemRecipe(key)}
                className="dc-lift"
                style={{
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  fontFamily: "inherit",
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
                  {tm(`${key}.name`)}
                </div>
                <div style={{ color: MUTED, fontSize: 12.5, marginTop: 4, lineHeight: 1.35 }}>{tm(`${key}.tagline`)}</div>
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
                  {tm(`${key}.strength`)}
                </div>
              </button>
            );
          })}
        </div>

        {/* après les cartes : comparer toutes les méthodes (galerie = vote) */}
        {pillar === "vote" && (
          <Btn onClick={() => go("gallery")} style={{ marginTop: 16, fontSize: 15, background: PAPER }}>
            {t("compareCta")}
          </Btn>
        )}
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
          {[1, 2, 3].map((n, i) => (
            <div
              key={n}
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
                {t(`steps.s${n}Label`)}
              </div>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 21, marginTop: 6 }}>
                {pillar === "assign" ? t(`stepsAssign.s${n}Title`) : t(`steps.s${n}Title`)}
              </div>
              <div style={{ color: SUBINK, marginTop: 6, lineHeight: 1.45, fontSize: 14.5 }}>
                {pillar === "assign" ? t(`stepsAssign.s${n}Text`) : t(`steps.s${n}Text`)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* IA — après le choix de méthode (mobile ; desktop = rail latéral) */}
      <div className="ai-home-inline" style={{ marginTop: 28 }}>
        <AiHelper ctrl={ctrl} />
      </div>

      {/* Feed public — bande des derniers scrutins publiés (rien si <3 entrées) */}
      <PublicFeedStrip />

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
          <strong style={{ color: INK }}>{t("slackTitle")}</strong> {t("slackText")}
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
          <SlackMark /> {t("slackCta")}
        </Link>
      </div>

      {/* Backlink partenaire — réciproque du lien GlobéNostra → Placet. */}
      <p style={{ marginTop: 26, fontSize: 12.5, color: MUTED }}>
        {t("partnerLabel")}{" "}
        <a
          href="https://www.globenostra.com"
          target="_blank"
          rel="noopener"
          style={{ color: SUBINK, fontWeight: 700 }}
        >
          GlobéNostra
        </a>{" "}
        — {t("partnerText")}
      </p>
    </div>
  );
}
