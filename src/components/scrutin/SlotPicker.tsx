"use client";

import { useState } from "react";
import { SLOT_ICON, slotLabel } from "@/lib/voting/draft";
import type { Option } from "@/lib/voting/types";
import { CORAL, CREAM, FONT_BODY, FONT_DISPLAY, INK, MUTED, REDTXT } from "./theme";

const WEEKDAYS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const dayPart = (at: string) => at.split("T")[0];
const timePart = (at: string) => (at.includes("T") ? at.split("T")[1] : "");

/**
 * Sélecteur de créneaux façon Doodle : un calendrier multi-jours, puis par jour
 * « journée entière » ou une/plusieurs heures. Source unique = la liste de
 * créneaux (`slots`) ; chaque édition recompose les options et appelle onChange.
 */
export default function SlotPicker({ slots, onChange }: { slots: Option[]; onChange: (s: Option[]) => void }) {
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });

  // jour "YYYY-MM-DD" -> liste de temps ("" = journée entière)
  const byDay: Record<string, string[]> = {};
  for (const o of slots) {
    if (!o.at) continue;
    const d = dayPart(o.at);
    (byDay[d] ??= []).push(timePart(o.at));
  }
  const days = Object.keys(byDay).sort();

  const emit = (map: Record<string, string[]>) => {
    const out: Option[] = [];
    Object.keys(map)
      .sort()
      .forEach((d) => {
        Array.from(new Set(map[d]))
          .sort()
          .forEach((t) => {
            const at = t === "" ? d : `${d}T${t}`;
            out.push({ icon: SLOT_ICON, name: slotLabel(at), at });
          });
      });
    onChange(out);
  };
  const clone = () => {
    const m: Record<string, string[]> = {};
    for (const k of Object.keys(byDay)) m[k] = [...byDay[k]];
    return m;
  };

  const toggleDay = (d: string) => {
    const m = clone();
    if (m[d]) delete m[d];
    else m[d] = ["19:00"];
    emit(m);
  };
  const removeDay = (d: string) => {
    const m = clone();
    delete m[d];
    emit(m);
  };
  const setAllDay = (d: string, allDay: boolean) => {
    const m = clone();
    m[d] = allDay ? [""] : ["19:00"];
    emit(m);
  };
  const addTime = (d: string) => {
    const m = clone();
    m[d] = [...(m[d] || []).filter((t) => t !== ""), "12:00"];
    emit(m);
  };
  const setTime = (d: string, i: number, t: string) => {
    const m = clone();
    m[d][i] = t;
    emit(m);
  };
  const removeTime = (d: string, i: number) => {
    const m = clone();
    m[d].splice(i, 1);
    if (!m[d].length) delete m[d];
    emit(m);
  };

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

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button type="button" aria-label="Mois précédent" onClick={() => shift(-1)} style={navBtn}>‹</button>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16 }}>
          {MONTHS[view.m]} {view.y}
        </div>
        <button type="button" aria-label="Mois suivant" onClick={() => shift(1)} style={navBtn}>›</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
        {WEEKDAYS.map((w, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: MUTED }}>
            {w}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const str = ymd(view.y, view.m, d);
          const selected = Boolean(byDay[str]);
          const past = str < todayStr;
          return (
            <button
              key={i}
              type="button"
              disabled={past}
              onClick={() => toggleDay(str)}
              style={{
                height: 38,
                border: `2px solid ${selected ? INK : "#E4DBC6"}`,
                background: selected ? CORAL : "#fff",
                color: selected ? "#fff" : past ? "#c2c2c2" : INK,
                borderRadius: 9,
                cursor: past ? "default" : "pointer",
                fontWeight: 700,
                fontSize: 14,
                opacity: past ? 0.5 : 1,
              }}
            >
              {d}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 9 }}>
        {days.length === 0 ? (
          <div style={{ fontSize: 13, color: MUTED }}>Touchez au moins 2 jours dans le calendrier.</div>
        ) : (
          days.map((d) => {
            const times = byDay[d];
            const allDay = times.length === 1 && times[0] === "";
            return (
              <div key={d} style={{ border: `2px solid ${INK}`, borderRadius: 11, padding: "10px 12px", background: "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{slotLabel(d)}</div>
                  <button
                    type="button"
                    aria-label="Retirer le jour"
                    onClick={() => removeDay(d)}
                    style={{ border: "none", background: "none", color: REDTXT, cursor: "pointer", fontSize: 17, lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: MUTED, marginTop: 6, cursor: "pointer" }}>
                  <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(d, e.target.checked)} />
                  Journée entière
                </label>
                {!allDay && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, alignItems: "center" }}>
                    {times.map((t, i) => (
                      <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <input
                          type="time"
                          value={t || "12:00"}
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
                            aria-label="Retirer l'heure"
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
                      + heure
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
