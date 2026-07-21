"use client";

import { useTranslations } from "next-intl";
import type { ComputeResult } from "@/lib/voting/types";
import { buildIcs, downloadIcs } from "@/lib/voting/ics";
import { CREAM, FONT_DISPLAY, INK } from "./theme";

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
}

/** Carte de résultat : vainqueur, barres, explication et contrefactuel. */
export default function ResultCard({ result, question, ballotCount, footer, calendarSlot, calendarUrl, calendarDuration, survey }: Props) {
  const t = useTranslations("Vote");
  const tm = useTranslations("Methods");
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
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.92)" }}>{t("resultWinner")}</div>
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
        {calendarSlot && (
          <button
            onClick={addToCalendar}
            className="dc-paper"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14.5, cursor: "pointer", border: `2.5px solid ${INK}`, background: "#fff", color: INK, padding: "10px 16px", borderRadius: 11, marginBottom: 18 }}
          >
            {t("addToCalendar")}
          </button>
        )}
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
