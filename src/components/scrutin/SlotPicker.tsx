"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SLOT_ICON, slotLabel, slotRangeLabel } from "@/lib/voting/draft";
import { intlLocale, pickLocale } from "@/i18n/locales";
import type { Option } from "@/lib/voting/types";
import { CORAL, CREAM, FONT_BODY, FONT_DISPLAY, INK, MUTED, REDTXT } from "./theme";

const WEEKDAYS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
/** Une plage plus longue relève de l'agenda, plus du choix de créneau. */
const MAX_RANGE_DAYS = 14;

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const dayPart = (at: string) => at.split("T")[0];
const timePart = (at: string) => (at.includes("T") ? at.split("T")[1] : "");
/** Nombre de jours entre deux "YYYY-MM-DD" (inclus). */
const spanDays = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00`) - Date.parse(`${a}T00:00`)) / 86400000) + 1;

interface Range {
  at: string;
  end: string;
}

/**
 * Sélecteur de créneaux façon Doodle : un calendrier multi-jours, puis par jour
 * « journée entière » ou une/plusieurs heures. Un créneau peut aussi couvrir
 * PLUSIEURS JOURS (un week-end, un séminaire) : dans ce mode, deux clics posent
 * le début et la fin. Le mode reste sur le dernier utilisé — poser une plage en
 * premier rend les suivantes naturelles, sans empêcher de revenir au jour seul.
 * Source unique = la liste de créneaux (`slots`) ; chaque édition recompose les
 * options et appelle onChange.
 */
export default function SlotPicker({ slots, onChange }: { slots: Option[]; onChange: (s: Option[]) => void }) {
  const locale = useLocale();
  const t = useTranslations("SlotPicker");
  const weekdays = pickLocale(locale, {
    fr: WEEKDAYS,
    en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    es: ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"],
  });
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  // Le mode suit ce qui existe déjà : un scrutin qui porte des plages s'édite en plages.
  const [range, setRange] = useState(() => slots.some((o) => o.end));
  const [pending, setPending] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // jour "YYYY-MM-DD" -> liste de temps ("" = journée entière), hors plages
  const byDay: Record<string, string[]> = {};
  const ranges: Range[] = [];
  for (const o of slots) {
    if (!o.at) continue;
    if (o.end) {
      ranges.push({ at: dayPart(o.at), end: o.end });
      continue;
    }
    const d = dayPart(o.at);
    (byDay[d] ??= []).push(timePart(o.at));
  }
  const days = Object.keys(byDay).sort();

  const emit = (map: Record<string, string[]>, rgs: Range[]) => {
    const out: Option[] = [];
    Object.keys(map)
      .sort()
      .forEach((d) => {
        Array.from(new Set(map[d]))
          .sort()
          .forEach((tt) => {
            const at = tt === "" ? d : `${d}T${tt}`;
            out.push({ icon: SLOT_ICON, name: slotLabel(at, locale), at });
          });
      });
    rgs.forEach((r) => {
      out.push({ icon: SLOT_ICON, name: slotRangeLabel(r.at, r.end, locale), at: r.at, end: r.end });
    });
    out.sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""));
    onChange(out);
  };
  const clone = () => {
    const m: Record<string, string[]> = {};
    for (const k of Object.keys(byDay)) m[k] = [...byDay[k]];
    return m;
  };

  // ---- jour simple ----
  const toggleDay = (d: string) => {
    const m = clone();
    if (m[d]) delete m[d];
    else m[d] = ["19:00"];
    emit(m, ranges);
  };
  const removeDay = (d: string) => {
    const m = clone();
    delete m[d];
    emit(m, ranges);
  };
  const setAllDay = (d: string, allDay: boolean) => {
    const m = clone();
    m[d] = allDay ? [""] : ["19:00"];
    emit(m, ranges);
  };
  const addTime = (d: string) => {
    const m = clone();
    m[d] = [...(m[d] || []).filter((x) => x !== ""), "12:00"];
    emit(m, ranges);
  };
  const setTime = (d: string, i: number, val: string) => {
    const m = clone();
    m[d][i] = val;
    emit(m, ranges);
  };
  const removeTime = (d: string, i: number) => {
    const m = clone();
    m[d].splice(i, 1);
    if (!m[d].length) delete m[d];
    emit(m, ranges);
  };

  // ---- plage de jours ----
  const inRange = (d: string, r: { at: string; end: string }) => d >= r.at && d <= r.end;
  const rangeOf = (d: string) => ranges.find((r) => inRange(d, r));
  const preview: Range | null =
    pending && hover ? (hover >= pending ? { at: pending, end: hover } : { at: hover, end: pending }) : null;

  const clickRange = (d: string) => {
    setNotice(null);
    // Jour déjà couvert : un clic le libère.
    const hit = rangeOf(d);
    if (hit && !pending) {
      emit(clone(), ranges.filter((r) => r !== hit));
      return;
    }
    if (!pending) {
      setPending(d);
      return;
    }
    const at = d < pending ? d : pending;
    const end = d < pending ? pending : d;
    setPending(null);
    setHover(null);
    if (at === end) {
      // Deux fois le même jour : ce n'est plus une plage, c'est une journée entière.
      const m = clone();
      m[at] = [""];
      emit(m, ranges);
      return;
    }
    if (spanDays(at, end) > MAX_RANGE_DAYS) {
      setNotice(t("rangeTooLong", { n: MAX_RANGE_DAYS }));
      return;
    }
    // Les jours simples avalés par la plage disparaissent (doublon sinon).
    const m = clone();
    Object.keys(m).forEach((k) => {
      if (k >= at && k <= end) delete m[k];
    });
    emit(m, [...ranges.filter((r) => !(r.at === at && r.end === end)), { at, end }]);
  };
  const removeRange = (r: Range) => emit(clone(), ranges.filter((x) => x !== r));

  const startDow = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // lundi = 0
  const nDays = new Date(view.y, view.m + 1, 0).getDate();
  const todayStr = ymd(now.getFullYear(), now.getMonth(), now.getDate());
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= nDays; d++) cells.push(d);

  const shift = (delta: number) =>
    setView((v) => {
      const m = v.m + delta;
      return { y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
    });

  const navBtn = {
    width: 34,
    height: 34,
    border: `2px solid ${INK}`,
    background: CREAM,
    color: INK,
    borderRadius: 9,
    cursor: "pointer",
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1,
  } as const;

  const modeChip = (active: boolean) =>
    ({
      fontFamily: FONT_BODY,
      fontWeight: 700,
      fontSize: 12.5,
      cursor: "pointer",
      border: `2px solid ${INK}`,
      background: active ? INK : "#fff",
      color: active ? "#fff" : INK,
      padding: "6px 12px",
      borderRadius: 9,
    }) as const;

  return (
    <div>
      {/* Un jour / plusieurs jours : le choix se garde d'un créneau à l'autre. */}
      <div style={{ display: "flex", gap: 7, marginBottom: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => {
            setRange(false);
            setPending(null);
            setNotice(null);
          }}
          aria-pressed={!range}
          style={modeChip(!range)}
        >
          {t("modeDay")}
        </button>
        <button
          type="button"
          onClick={() => {
            setRange(true);
            setNotice(null);
          }}
          aria-pressed={range}
          style={modeChip(range)}
        >
          {t("modeRange")}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button type="button" aria-label={t("prevMonth")} onClick={() => shift(-1)} style={navBtn}>‹</button>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16 }}>
          {new Date(view.y, view.m, 1).toLocaleDateString(intlLocale(locale), { month: "long", year: "numeric" })}
        </div>
        <button type="button" aria-label={t("nextMonth")} onClick={() => shift(1)} style={navBtn}>›</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
        {weekdays.map((w, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: MUTED }}>
            {w}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }} onMouseLeave={() => setHover(null)}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const str = ymd(view.y, view.m, d);
          const past = str < todayStr;
          const r = rangeOf(str) ?? (preview && inRange(str, preview) ? preview : null);
          const selected = Boolean(byDay[str]) || Boolean(r) || pending === str;
          // Extrémités arrondies, milieu droit : la plage se lit d'un bloc.
          const radius = r
            ? `${str === r.at ? 9 : 0}px ${str === r.end ? 9 : 0}px ${str === r.end ? 9 : 0}px ${str === r.at ? 9 : 0}px`
            : "9px";
          const isPreview = Boolean(preview && !rangeOf(str) && inRange(str, preview));
          return (
            <button
              key={i}
              type="button"
              disabled={past}
              onClick={() => (range ? clickRange(str) : toggleDay(str))}
              onMouseEnter={() => range && pending && setHover(str)}
              style={{
                height: 38,
                border: `2px solid ${selected ? INK : "#E4DBC6"}`,
                background: selected ? CORAL : "#fff",
                color: selected ? "#fff" : past ? "#c2c2c2" : INK,
                borderRadius: radius,
                cursor: past ? "default" : "pointer",
                fontWeight: 700,
                fontSize: 14,
                opacity: past ? 0.5 : isPreview ? 0.72 : 1,
              }}
            >
              {d}
            </button>
          );
        })}
      </div>

      {/* Consigne pendant la pose d'une plage : on sait toujours où on en est. */}
      {range && pending && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 9, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>
            {t("pickEnd", { day: slotLabel(pending, locale) })}
          </span>
          <button
            type="button"
            onClick={() => {
              setPending(null);
              setHover(null);
            }}
            style={{ border: "none", background: "none", color: MUTED, cursor: "pointer", fontSize: 12.5, fontWeight: 700, textDecoration: "underline", padding: 0 }}
          >
            {t("cancelRange")}
          </button>
        </div>
      )}
      {notice && <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 700, color: REDTXT }}>{notice}</div>}

      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 9 }}>
        {days.length === 0 && ranges.length === 0 ? (
          <div style={{ fontSize: 13, color: MUTED }}>{range ? t("touchRange") : t("touchAtLeast2")}</div>
        ) : (
          <>
            {/* Plages : par nature journée entière, donc pas d'horaires à régler. */}
            {ranges
              .slice()
              .sort((a, b) => a.at.localeCompare(b.at))
              .map((r) => (
                <div
                  key={`${r.at}..${r.end}`}
                  style={{ border: `2px solid ${INK}`, borderRadius: 11, padding: "10px 12px", background: "#fff" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{slotRangeLabel(r.at, r.end, locale)}</div>
                    <button
                      type="button"
                      aria-label={t("removeDay")}
                      onClick={() => removeRange(r)}
                      style={{ border: "none", background: "none", color: REDTXT, cursor: "pointer", fontSize: 17, lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ fontSize: 12.5, color: MUTED, marginTop: 5 }}>
                    {t("rangeDays", { n: spanDays(r.at, r.end) })}
                  </div>
                </div>
              ))}

            {days.map((d) => {
              const times = byDay[d];
              const allDay = times.length === 1 && times[0] === "";
              return (
                <div key={d} style={{ border: `2px solid ${INK}`, borderRadius: 11, padding: "10px 12px", background: "#fff" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{slotLabel(d, locale)}</div>
                    <button
                      type="button"
                      aria-label={t("removeDay")}
                      onClick={() => removeDay(d)}
                      style={{ border: "none", background: "none", color: REDTXT, cursor: "pointer", fontSize: 17, lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </div>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: MUTED, marginTop: 6, cursor: "pointer" }}>
                    <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(d, e.target.checked)} />
                    {t("allDay")}
                  </label>
                  {!allDay && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, alignItems: "center" }}>
                      {times.map((time, i) => (
                        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <input
                            type="time"
                            value={time || "12:00"}
                            onChange={(e) => setTime(d, i, e.target.value)}
                            style={{
                              border: `2px solid ${INK}`,
                              borderRadius: 8,
                              padding: "5px 7px",
                              background: CREAM,
                              fontFamily: FONT_BODY,
                              fontSize: 13,
                              fontWeight: 600,
                              colorScheme: "light",
                            }}
                          />
                          {times.length > 1 && (
                            <button
                              type="button"
                              aria-label={t("removeTime")}
                              onClick={() => removeTime(d, i)}
                              style={{ border: "none", background: "none", color: REDTXT, cursor: "pointer", fontSize: 15 }}
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={() => addTime(d)}
                        style={{ border: `2px dashed ${INK}`, background: "none", color: INK, borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12.5, fontWeight: 700 }}
                      >
                        {t("addTime")}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
