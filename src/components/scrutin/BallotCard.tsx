"use client";

import { GRADES, GRADE_COLORS, candColor } from "@/lib/voting/systems";
import type { BallotMode, Option } from "@/lib/voting/types";
import { CREAM, FONT_BODY, FONT_DISPLAY, GREEN, INK, MUTED } from "./theme";

const PICKED = "#FFF4DF";

export interface BallotDraft {
  choice: number | null;
  approved: number[];
  rank: number[];
  grades: Record<number, number>;
}

export const EMPTY_DRAFT: BallotDraft = { choice: null, approved: [], rank: [], grades: {} };

interface Props {
  mode: BallotMode;
  options: Option[];
  color: string;
  draft: BallotDraft;
  onChoice: (i: number) => void;
  onToggle: (i: number) => void;
  onRank: (i: number) => void;
  onResetRank: () => void;
  onGrade: (i: number, gi: number) => void;
}

/** Contenu d'un bulletin (4 modes), sans la carte ni le bouton de validation. */
export default function BallotCard({
  mode,
  options: opts,
  color,
  draft,
  onChoice,
  onToggle,
  onRank,
  onResetRank,
  onGrade,
}: Props) {
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

  const isImage = (u: string) => /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(u);

  // Illustration facultative d'un choix. stopPropagation : ouvrir le média ne vote pas.
  const media = (url?: string) => {
    if (!url || !/^https?:\/\//i.test(url)) return null;
    const open = (e: React.MouseEvent) => {
      e.stopPropagation();
      window.open(url, "_blank", "noopener,noreferrer");
    };
    if (isImage(url)) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          onClick={open}
          style={{
            width: 40,
            height: 40,
            flex: "none",
            objectFit: "cover",
            borderRadius: 8,
            border: `2px solid ${INK}`,
            cursor: "zoom-in",
          }}
        />
      );
    }
    return (
      <span
        onClick={open}
        title="Voir l'illustration"
        style={{ flex: "none", fontSize: 13, fontWeight: 700, color: INK, textDecoration: "underline", cursor: "pointer" }}
      >
        🔗 voir
      </span>
    );
  };

  if (mode === "single") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {opts.map((o, i) =>
          optionRow(
            i,
            <>
              {iconBox(i)}
              <span style={{ fontWeight: 700, fontSize: 16, flex: 1, color: INK }}>{o.name}</span>
              {media(o.url)}
              <span
                style={{
                  width: 24,
                  height: 24,
                  flex: "none",
                  borderRadius: "50%",
                  border: `2.5px solid ${INK}`,
                  background: draft.choice === i ? INK : "transparent",
                }}
              />
            </>,
            () => onChoice(i),
            draft.choice === i ? PICKED : CREAM,
          ),
        )}
      </div>
    );
  }

  if (mode === "approve") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {opts.map((o, i) => {
          const on = draft.approved.includes(i);
          return optionRow(
            i,
            <>
              {iconBox(i)}
              <span style={{ fontWeight: 700, fontSize: 16, flex: 1, color: INK }}>{o.name}</span>
              {media(o.url)}
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
            () => onToggle(i),
            on ? PICKED : CREAM,
          );
        })}
      </div>
    );
  }

  if (mode === "rank") {
    return (
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: MUTED, marginBottom: 9 }}>
          Cliquez dans l'ordre de vos préférences
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {opts.map((o, i) => {
            const pos = draft.rank.indexOf(i);
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
                    background: pos >= 0 ? color : "#fff",
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
                {media(o.url)}
              </>,
              () => onRank(i),
              pos >= 0 ? PICKED : CREAM,
            );
          })}
        </div>
        <button
          onClick={onResetRank}
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
    );
  }

  // mode === "grade"
  return (
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
            <span style={{ fontWeight: 700, fontSize: 16, flex: 1, color: INK }}>{o.name}</span>
            {media(o.url)}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {GRADES.map((gl, gi) => {
              const sel = (draft.grades[i] ?? null) === gi;
              return (
                <button
                  key={gi}
                  onClick={() => onGrade(i, gi)}
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
  );
}
