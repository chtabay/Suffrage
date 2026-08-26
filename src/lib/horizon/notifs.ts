import { horizonNotificationText, type HorizonNotificationKind, type HorizonNotificationLanguage } from "@/content/horizon/notifs";
import { calculateHorizon, calculateMilestones, encodeHorizonFragment, exactAgeAt, type HorizonPayload } from "@/lib/horizon/horizon";
import { pousser, rpcNotify } from "@/lib/push";

const SECRET = process.env.NOTIFY_SECRET;
const APP = "https://placet.app";

interface Row {
  rappel: string;
  naissance: string;
  sexe: "f" | "m";
  prenom: string;
  anniversaire: boolean;
  seuils: boolean;
  retraite: boolean;
  prochain_seuil: number | null;
  fuseau: string;
  langue: string;
  cree_le: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function civil(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function birthdayForYear(birth: string, year: number): string {
  const [, month, rawDay] = birth.split("-").map(Number);
  const day = month === 2 && rawDay === 29 && new Date(Date.UTC(year, 1, 29)).getUTCMonth() !== 1 ? 28 : rawDay;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function languageOf(value: string): HorizonNotificationLanguage {
  return value === "en" || value === "es" || value === "pcm" ? value : "fr";
}

export async function sendHorizonReminders(at = new Date()): Promise<{ targeted: number; sent: number; reminders: number }> {
  if (!SECRET) return { targeted: 0, sent: 0, reminders: 0 };
  const rows = await rpcNotify<Row[]>("scrutin_horizon_rappels_a_evaluer", { p_secret: SECRET });
  if (!rows?.length) return { targeted: 0, sent: 0, reminders: 0 };
  const groups = new Map<string, Row[]>();
  for (const row of rows) groups.set(row.rappel, [...(groups.get(row.rappel) ?? []), row]);

  let sent = 0;
  let reminders = 0;
  for (const group of groups.values()) {
    const row = group[0]!;
    const payload: HorizonPayload = { birthDate: row.naissance, sex: row.sexe, firstName: row.prenom };
    const result = calculateHorizon(payload, at);
    if (!result.ok) continue;
    const today = civil(at, row.fuseau);
    const year = Number(today.slice(0, 4));
    const createdToday = civil(new Date(row.cree_le), row.fuseau) === today;
    const milestones = calculateMilestones(payload, at, result.value.horizonDate);
    let kind: HorizonNotificationKind | null = null;
    let marker = "";

    if (row.seuils && row.prochain_seuil !== null && result.value.remainingYears <= row.prochain_seuil) {
      kind = "seuil";
      marker = String(row.prochain_seuil);
    } else if (row.retraite && milestones && milestones.retirementDate.toISOString().slice(0, 10) === today && !createdToday) {
      kind = "retraite";
      marker = today;
    } else if (row.anniversaire && birthdayForYear(row.naissance, year) === today && !createdToday) {
      kind = "anniversaire";
      marker = String(year);
    }
    if (!kind) continue;

    const reserved = await rpcNotify<boolean>("scrutin_horizon_rappel_reserver", {
      p_secret: SECRET, p_id: row.rappel, p_genre: kind, p_repere: marker,
    });
    if (reserved !== true) continue;
    reminders += 1;
    const birth = new Date(`${row.naissance}T00:00:00Z`);
    const age = Math.floor(exactAgeAt(birth, at));
    const months = Math.max(0, Math.round(result.value.remainingYears * 12));
    const text = horizonNotificationText(kind, languageOf(row.langue), {
      firstName: row.prenom,
      age,
      years: Math.floor(months / 12),
      months: months % 12,
      threshold: row.prochain_seuil ?? undefined,
    });
    const url = `${APP}/horizon#${encodeHorizonFragment(payload)}`;
    for (const device of group) {
      if (await pousser(device, { title: text.title, body: text.body, url })) sent += 1;
    }
  }
  return { targeted: rows.length, sent, reminders };
}
