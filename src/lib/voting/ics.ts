// Génération d'un fichier iCalendar (.ics) pour le créneau gagnant d'un vote de
// dates. Client uniquement (Blob + download). Heure « flottante » (sans fuseau) :
// le créneau datetime-local choisi est repris tel quel — l'agenda l'affiche à
// l'heure indiquée, ce qui correspond au sens d'un créneau partagé.
const pad = (n: number) => String(n).padStart(2, "0");

const floating = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

const esc = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

export interface IcsArgs {
  summary: string;
  startLocal: string; // "2026-07-12T20:00" (datetime-local)
  durationMin?: number;
  description?: string;
  url?: string;
}

/** Construit le contenu .ics. Renvoie "" si le créneau est invalide. */
export function buildIcs(a: IcsArgs): string {
  const start = new Date(a.startLocal);
  if (isNaN(start.getTime())) return "";
  const end = new Date(start.getTime() + (a.durationMin ?? 60) * 60000);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const uid = `${floating(start)}-${Math.abs([...a.summary].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7))}@placet.app`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Placet//Vote//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${floating(start)}`,
    `DTEND:${floating(end)}`,
    `SUMMARY:${esc(a.summary)}`,
    a.description ? `DESCRIPTION:${esc(a.description)}` : "",
    a.url ? `URL:${a.url}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

/** Déclenche le téléchargement du .ics (navigateur). */
export function downloadIcs(filename: string, content: string) {
  if (!content) return;
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
