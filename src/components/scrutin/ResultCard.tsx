"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ComputeResult } from "@/lib/voting/types";
import { buildIcs, downloadIcs } from "@/lib/voting/ics";
import { buildDecisionText, waUrl } from "@/lib/share";
import { CREAM, FONT_DISPLAY, INK, SUBINK } from "./theme";

interface Props {
  result: ComputeResult;
  question: string;
  ballotCount: number;
  /** Boutons d'action rendus en bas de la carte (recalculer, partager, voter…). */
  footer?: React.ReactNode;
  /** Créneau gagnant (datetime-local) d'un vote de dates clos → bouton .ics. */
  calendarSlot?: string;
  calendarUrl?: string;
  calendarDuration?: number;
  /** Mode sondage : panorama des avis — pas de vainqueur, pas de contrefactuel. */
  survey?: boolean;
  /** Scrutin CLOS : l'issue est acquise → bande d'action « Et maintenant ? ». */
  decided?: boolean;
}

/** Carte de résultat : vainqueur, barres, explication et contrefactuel. */
export default function ResultCard({ result, question, ballotCount, footer, calendarSlot, calendarUrl, calendarDuration, survey, decided }: Props) {
  const t = useTranslations("Vote");
  const tm = useTranslations("Methods");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  // Bande d'action : uniquement quand une décision est RÉELLEMENT prise —
  // scrutin clos, vainqueur établi (hasWinner, pas juste bars[0]) et hors sondage.
  const showActions = Boolean(decided && !survey && result.hasWinner);
  const decisionText = buildDecisionText(question, result.winnerName ?? "", calendarUrl ?? "", locale);
  const copyDecision = async () => {
    try {
      await navigator.clipboard?.writeText(decisionText);
      setCopied(true);
    } catch {
      /* presse-papiers indisponible */
    }
  };
  // Jugement majoritaire en mode sondage : on montre le PROFIL DE MÉRITE (la
  // distribution des mentions par option), pas la simple barre de médiane. La
  // médiane reste affichée à droite comme résumé.
  const gs = result.gradeScale;
  const isProfile = Boolean(survey && gs);
  const addToCalendar = () =>
    downloadIcs(
      "placet.ics",
      buildIcs({ summary: question, startLocal: calendarSlot ?? "", durationMin: calendarDuration, description: t("icsNote"), url: calendarUrl }),
    );
  return (
    <div
      style={{
        background: "#fff",
        border: `2.5px solid ${INK}`,
        borderRadius: 22,
        boxShadow: `6px 6px 0 ${result.color}`,
        overflow: "hidden",
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
          {tm(`${result.methodKey}.name`)} · {t("resultBallots", { count: ballotCount })}
        </div>
        <div style={{ fontSize: 15, color: "rgba(255,255,255,0.95)", fontWeight: 600, marginTop: 4 }}>{question}</div>
        {survey && (
          <div
            style={{
              marginTop: 14,
              fontFamily: FONT_DISPLAY,
              fontWeight: 800,
              fontSize: 22,
              color: "#fff",
              textShadow: "2px 2px 0 rgba(0,0,0,0.22)",
            }}
          >
            {t("surveyBanner")}
          </div>
        )}
        {!survey && result.hasWinner && (
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
              {/* Tant que le vote n'est pas clos, on ne PROCLAME pas un vainqueur :
                  on affiche la tête PROVISOIRE (le scrutin est encore ouvert). */}
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.92)" }}>
                {decided ? t("resultWinner") : t("resultLeading")}
              </div>
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
              {!decided && (
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.88)", marginTop: 5 }}>
                  {t("resultProvisional")}
                </div>
              )}
            </div>
          </div>
        )}
        {!survey && result.noWinner && (
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
        {/* « Et maintenant ? » — la décision devient une ACTION. Regroupe le
            calendrier (jusque-là isolé) et l'annonce au groupe. Rendu seulement
            si l'issue est acquise ; sinon on garde le bouton calendrier seul. */}
        {showActions ? (
          <div style={{ marginBottom: 18, background: CREAM, border: `2.5px solid ${INK}`, borderRadius: 14, padding: 16 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, marginBottom: 11 }}>
              {t("decisionActionsTitle")}
            </div>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              {calendarSlot && (
                <button
                  onClick={addToCalendar}
                  className="dc-paper"
                  style={{ flex: "1 1 150px", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14, cursor: "pointer", border: `2.5px solid ${INK}`, background: "#fff", color: INK, padding: "11px 14px", borderRadius: 11 }}
                >
                  {t("addToCalendar")}
                </button>
              )}
              <a
                href={waUrl(decisionText)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ flex: "1 1 150px", textAlign: "center", textDecoration: "none", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14, border: `2.5px solid ${INK}`, background: "#25D366", color: "#fff", padding: "11px 14px", borderRadius: 11 }}
              >
                {t("announceDecision")}
              </a>
              <button
                onClick={copyDecision}
                style={{ flex: "1 1 120px", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14, cursor: "pointer", border: `2.5px solid ${INK}`, background: "#fff", color: INK, padding: "11px 14px", borderRadius: 11 }}
              >
                {copied ? t("copiedDecision") : t("copyDecision")}
              </button>
            </div>
          </div>
        ) : calendarSlot ? (
          <button
            onClick={addToCalendar}
            className="dc-paper"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14.5, cursor: "pointer", border: `2.5px solid ${INK}`, background: "#fff", color: INK, padding: "10px 16px", borderRadius: 11, marginBottom: 18 }}
          >
            {t("addToCalendar")}
          </button>
        ) : null}
        <div style={{ fontWeight: 800, fontFamily: FONT_DISPLAY, fontSize: 16, marginBottom: isProfile ? 10 : 14 }}>
          {isProfile ? t("meritProfileLabel") : result.tallyLabel}
        </div>
        {isProfile && gs && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 15 }}>
            {gs.labels.map((l, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: SUBINK }}>
                <span style={{ width: 12, height: 12, flex: "none", borderRadius: 3, background: gs.colors[i], border: `1.5px solid ${INK}` }} />
                {l}
              </span>
            ))}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          {result.bars.map((b) => {
            const profile = isProfile && gs && b.dist;
            const total = b.dist ? b.dist.reduce((a, c) => a + c, 0) : 0;
            return (
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
              {profile ? (
                <div
                  style={{
                    height: 18,
                    display: "flex",
                    background: "#F0EAD9",
                    border: `2px solid ${INK}`,
                    borderRadius: 30,
                    overflow: "hidden",
                    animation: "growBar 0.6s ease both",
                    transformOrigin: "left",
                  }}
                >
                  {b.dist!.map((count, gi) => {
                    const w = total > 0 ? (100 * count) / total : 0;
                    if (w <= 0) return null;
                    return (
                      <div
                        key={gi}
                        title={`${gs!.labels[gi]} · ${count}`}
                        style={{ width: `${w}%`, height: "100%", background: gs!.colors[gi] }}
                      />
                    );
                  })}
                </div>
              ) : (
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
              )}
            </div>
            );
          })}
        </div>

        <div style={{ marginTop: 22, background: CREAM, border: `2px solid ${INK}`, borderRadius: 14, padding: 18 }}>
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
            {t("resultHowTitle")}
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

        {!survey && (
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
        )}

        {footer}
      </div>
    </div>
  );
}
