"use client";

import { useLocale, useTranslations } from "next-intl";
import { candColor } from "@/lib/voting/systems";
import { optionIllustration, optionPlace } from "@/lib/voting/geo";
import { resolveScale, textOn } from "@/lib/voting/scales";
import type { BallotMode, Option } from "@/lib/voting/types";
import { CREAM, FONT_BODY, FONT_DISPLAY, GREENTXT, INK, MUTED } from "./theme";

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
  /** Indices d'options à ne pas présenter (ex. soi-même dans une affectation en binômes). */
  hidden?: number[];
  /** Jugement majoritaire : clé de l'échelle de mentions (défaut : électorale). */
  scale?: string;
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
  hidden,
  scale,
}: Props) {
  const t = useTranslations("Vote");
  const locale = useLocale();
  const { labels: gradeLabels, colors: gradeColors } = resolveScale({ scale }, locale);
  const optionRow = (i: number, children: React.ReactNode, onClick: () => void, bg: string) => {
    const row = (
      <button
        onClick={onClick}
        className="dc-dim"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 13,
          width: "100%",
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
    const link = placeLink(opts[i]);
    // Le lien du lieu vit HORS du bouton : un lien imbriqué dans un bouton est
    // inatteignable au clavier et parasiterait le nom accessible du vote.
    return link ? (
      <div key={i} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {row}
        {link}
      </div>
    ) : (
      <div key={i}>{row}</div>
    );
  };

  /** Lien « Situer » d'une option localisée (rendu sous sa ligne de bulletin). */
  const placeLink = (o: Option) => {
    const place = optionPlace(o);
    return place && /^https?:\/\//i.test(place) ? (
      <a
        href={place}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          alignSelf: "flex-start",
          marginLeft: 15,
          fontSize: 12,
          fontWeight: 700,
          color: INK,
          textDecoration: "underline",
        }}
      >
        📍 {t("placeChip")} — {o.name}
      </a>
    ) : null;
  };

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

  /** Bloc de libellé : le nom et sa justification éventuelle. */
  const label = (o: Option, size = 16) => (
    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontWeight: 700, fontSize: size, color: INK }}>{o.name}</span>
      {o.note && (
        <span style={{ fontSize: 12.5, fontWeight: 500, color: MUTED, lineHeight: 1.35 }}>{o.note}</span>
      )}
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
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
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
        title={t("viewIllustration")}
        style={{ flex: "none", fontSize: 13, fontWeight: 700, color: INK, textDecoration: "underline", cursor: "pointer" }}
      >
        🔗 {t("view")}
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
              {label(o)}
              {media(optionIllustration(o))}
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
              {label(o)}
              {media(optionIllustration(o))}
              <span
                style={{
                  width: 26,
                  height: 26,
                  flex: "none",
                  borderRadius: 7,
                  border: `2.5px solid ${INK}`,
                  background: on ? GREENTXT : "transparent",
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
          {t("rankHint")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {opts.map((o, i) => {
            if (hidden?.includes(i)) return null;
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
                {label(o, 15.5)}
                {media(optionIllustration(o))}
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
          {t("resetRanking")}
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
            {label(o)}
            {media(optionIllustration(o))}
          </div>
          {placeLink(o) && <div style={{ marginBottom: 8 }}>{placeLink(o)}</div>}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {gradeLabels.map((gl, gi) => {
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
                    background: sel ? gradeColors[gi] : "#fff",
                    color: sel ? textOn(gradeColors[gi]) : INK,
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
