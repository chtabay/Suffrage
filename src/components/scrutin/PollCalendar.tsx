"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Option } from "@/lib/voting/types";
import { intlLocale } from "@/i18n/locales";
import { CREAM, FONT_DISPLAY, INK, MUTED, PAPER } from "./theme";

// Calendrier compact des créneaux — pendant de la carte des lieux : là où la
// carte situe les options dans l'espace, celui-ci les situe dans le temps.
// Petits carrés par jour (façon calendrier d'activité), plages en barres
// continues, intensité selon les voix quand les résultats sont visibles.

const DAY_MS = 86400000;
const dayOf = (at: string) => at.split("T")[0];
const parseDay = (d: string) => new Date(`${d}T00:00`);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

interface DaySlot {
  /** Index de l'option — c'est le numéro affiché et la clé des voix. */
  idx: number;
  option: Option;
  first: boolean;
  last: boolean;
}

export default function PollCalendar({
  options,
  counts,
  maxCount,
}: {
  options: Option[];
  /** Voix par index d'option, quand les résultats sont visibles. */
  counts?: Record<number, number>;
  maxCount?: number;
}) {
  const t = useTranslations("Vote");
  const locale = useLocale();

  const model = useMemo(() => {
    // Un créneau daté par option ; les options sans date sont ignorées.
    const slots = options
      .map((option, idx) => ({ option, idx }))
      .filter((o) => Boolean(o.option.at));
    if (!slots.length) return null;

    // Occupation jour par jour : un jour peut porter plusieurs créneaux
    // (deux horaires le même jour, ou une plage qui recouvre un jour simple).
    const byDay = new Map<string, DaySlot[]>();
    for (const { option, idx } of slots) {
      const start = dayOf(option.at!);
      const end = option.end && option.end > start ? option.end : start;
      for (let d = parseDay(start); ymd(d) <= end; d = addDays(d, 1)) {
        const key = ymd(d);
        const list = byDay.get(key) ?? [];
        list.push({ idx, option, first: key === start, last: key === end });
        byDay.set(key, list);
      }
    }

    const allDays = [...byDay.keys()].sort();
    const firstDay = parseDay(allDays[0]);
    const lastDay = parseDay(allDays[allDays.length - 1]);

    // Semaines pleines (lundi → dimanche) du premier au dernier jour couvert :
    // les créneaux gardent leur position réelle dans la semaine.
    const gridStart = addDays(firstDay, -((firstDay.getDay() + 6) % 7));
    const gridEnd = addDays(lastDay, 6 - ((lastDay.getDay() + 6) % 7));
    const weeks: { key: string; days: { key: string; date: Date; slots: DaySlot[] }[] }[] = [];
    for (let d = gridStart; d <= gridEnd; d = addDays(d, 7)) {
      const days = Array.from({ length: 7 }, (_, i) => {
        const day = addDays(d, i);
        const key = ymd(day);
        return { key, date: day, slots: byDay.get(key) ?? [] };
      });
      weeks.push({ key: ymd(d), days });
      if (weeks.length >= 12) break; // garde-fou : 3 mois de grille suffisent
    }
    return { weeks, slots };
  }, [options]);

  if (!model) return null;

  const top = Math.max(1, maxCount ?? Math.max(0, ...Object.values(counts ?? {})));
  /** Teinte d'un jour : plus il a de voix, plus l'encre est dense. */
  const shade = (slots: DaySlot[]) => {
    if (!slots.length) return "#fff";
    if (!counts) return "#FFE2B0";
    const best = Math.max(...slots.map((s) => counts[s.idx] ?? 0));
    if (best <= 0) return "#F3EEE2";
    const ratio = best / top;
    // 4 crans lisibles plutôt qu'un dégradé continu.
    if (ratio > 0.75) return "#16213A";
    if (ratio > 0.5) return "#5C6B8A";
    if (ratio > 0.25) return "#A9B3C6";
    return "#DCE0E8";
  };
  const textOn = (bg: string) => (bg === "#16213A" || bg === "#5C6B8A" ? "#fff" : INK);

  const monthLabel = (d: Date) => d.toLocaleDateString(intlLocale(locale), { month: "short" });

  return (
    <div
      style={{
        marginTop: 18,
        background: PAPER,
        border: `2.5px solid ${INK}`,
        borderRadius: 16,
        boxShadow: `5px 5px 0 ${INK}`,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", flexWrap: "wrap" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, flex: 1 }}>🗓️ {t("calendarTitle")}</div>
        {counts && <div style={{ fontSize: 11.5, fontWeight: 700, color: MUTED }}>{t("calendarHeat")}</div>}
      </div>

      <div style={{ padding: "0 14px 12px", overflowX: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 260 }}>
          {model.weeks.map((w) => (
            <div key={w.key} style={{ display: "grid", gridTemplateColumns: "34px repeat(7, 1fr)", gap: 3, alignItems: "center" }}>
              {/* Repère de mois en tête de semaine : on ne perd pas le fil. */}
              <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textAlign: "right", paddingRight: 3 }}>
                {w.days[0].date.getDate() <= 7 ? monthLabel(w.days[0].date) : ""}
              </div>
              {w.days.map((day) => {
                const bg = shade(day.slots);
                const has = day.slots.length > 0;
                const isRangeMiddle = has && day.slots.every((s) => !s.first && !s.last);
                const isRangeStart = has && day.slots.some((s) => s.first && !s.last);
                const isRangeEnd = has && day.slots.some((s) => s.last && !s.first);
                const radius = isRangeMiddle
                  ? "0"
                  : isRangeStart
                    ? "7px 0 0 7px"
                    : isRangeEnd
                      ? "0 7px 7px 0"
                      : "7px";
                return (
                  <div
                    key={day.key}
                    title={
                      has
                        ? day.slots.map((s) => `${s.option.name}${counts ? ` — ${counts[s.idx] ?? 0}` : ""}`).join(" · ")
                        : undefined
                    }
                    style={{
                      height: 26,
                      borderRadius: radius,
                      background: bg,
                      border: `1.5px solid ${has ? INK : "#E4DBC6"}`,
                      color: has ? textOn(bg) : "#c9c4b8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {day.date.getDate()}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Légende : le créneau, et ses voix quand elles sont connues. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, padding: "12px 14px", background: CREAM }}>
        {model.slots.map(({ option, idx }) => (
          <span
            key={idx}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              border: `2px solid ${INK}`,
              borderRadius: 9,
              padding: "4px 9px",
              background: PAPER,
              fontSize: 12.5,
              fontWeight: 700,
              color: INK,
            }}
          >
            {option.name}
            {counts && (
              <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: MUTED }}>{counts[idx] ?? 0}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
