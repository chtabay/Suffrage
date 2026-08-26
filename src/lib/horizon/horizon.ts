import {
  FEMALE_REMAINING_YEARS,
  MALE_REMAINING_YEARS,
  MAX_COHORT_YEAR,
  MAX_TABLE_AGE,
  MIN_COHORT_YEAR,
} from "@/content/horizon/insee-cohort";

export type StatisticalSex = "f" | "m";

export interface HorizonPayload {
  birthDate: string;
  sex: StatisticalSex;
  firstName: string;
  title?: string;
  comment?: string;
}

export type HorizonError =
  | "invalidBirthDate"
  | "birthInFuture"
  | "unsupportedGeneration"
  | "unsupportedAge";

export interface HorizonResult {
  exactAge: number;
  remainingYears: number;
  horizonAge: number;
  horizonDate: Date;
}

export interface HorizonMilestones {
  retirementDate: Date;
  ehpadDate: Date;
  summersRemaining: number;
  birthdaysRemaining: number;
  weekendsRemaining: number;
}

export interface PreciseCalendarDuration {
  future: boolean;
  years: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export type HorizonCalculation =
  | { ok: true; value: HorizonResult }
  | { ok: false; error: HorizonError };

export const FIRST_NAME_MAX_LENGTH = 40;
export const TITLE_MAX_LENGTH = 80;
export const COMMENT_MAX_LENGTH = 250;
// Marge sous la capacité maximale d'un QR niveau M : un texte très accentué ou
// composé d'emoji prend plusieurs caractères une fois encodé dans l'URL.
export const MAX_FRAGMENT_LENGTH = 1_800;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIsoDate(value: string): Date | null {
  const match = ISO_DATE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

function cleanRequired(value: string | null, maxLength: number): string | null {
  const clean = value?.trim() ?? "";
  return clean.length > 0 && clean.length <= maxLength ? clean : null;
}

function cleanOptional(value: string | null, maxLength: number): string | undefined | null {
  const clean = value?.trim() ?? "";
  if (!clean) return undefined;
  return clean.length <= maxLength ? clean : null;
}

/** Décode uniquement le fragment v1 validé ; les paramètres inconnus sont ignorés. */
export function parseHorizonFragment(fragment: string): HorizonPayload | null {
  const raw = fragment.replace(/^#/, "");
  if (raw.length > MAX_FRAGMENT_LENGTH) return null;
  const params = new URLSearchParams(raw);
  if (params.get("v") !== "1") return null;

  const birthDate = params.get("d") ?? "";
  const sex = params.get("s");
  const firstName = cleanRequired(params.get("p"), FIRST_NAME_MAX_LENGTH);
  const title = cleanOptional(params.get("t"), TITLE_MAX_LENGTH);
  const comment = cleanOptional(params.get("c"), COMMENT_MAX_LENGTH);

  if (!parseIsoDate(birthDate) || (sex !== "f" && sex !== "m") || !firstName || title === null || comment === null) {
    return null;
  }
  return { birthDate, sex, firstName, ...(title ? { title } : {}), ...(comment ? { comment } : {}) };
}

/** Produit le fragment lisible et partageable documenté par la page. */
export function encodeHorizonFragment(payload: HorizonPayload): string {
  const params = new URLSearchParams({ v: "1", d: payload.birthDate, s: payload.sex, p: payload.firstName.trim() });
  if (payload.title?.trim()) params.set("t", payload.title.trim());
  if (payload.comment?.trim()) params.set("c", payload.comment.trim());
  return params.toString();
}

function daysInUtcMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

// Un 29 février devient un 28 février les années non bissextiles : cette convention
// explicite évite que Date le décale silencieusement au mois de mars.
function anniversary(birthDate: Date, year: number): Date {
  const month = birthDate.getUTCMonth();
  const day = Math.min(birthDate.getUTCDate(), daysInUtcMonth(year, month));
  return new Date(Date.UTC(year, month, day));
}

export function exactAgeAt(birthDate: Date, at: Date): number {
  const thisYear = anniversary(birthDate, at.getUTCFullYear());
  const completedYears = at < thisYear
    ? at.getUTCFullYear() - birthDate.getUTCFullYear() - 1
    : at.getUTCFullYear() - birthDate.getUTCFullYear();
  const lastBirthday = anniversary(birthDate, birthDate.getUTCFullYear() + completedYears);
  const nextBirthday = anniversary(birthDate, birthDate.getUTCFullYear() + completedYears + 1);
  const fraction = (at.getTime() - lastBirthday.getTime()) / (nextBirthday.getTime() - lastBirthday.getTime());
  return completedYears + fraction;
}

function dateAtDecimalAge(birthDate: Date, age: number): Date {
  const completedYears = Math.floor(age);
  const fraction = age - completedYears;
  const before = anniversary(birthDate, birthDate.getUTCFullYear() + completedYears);
  const after = anniversary(birthDate, birthDate.getUTCFullYear() + completedYears + 1);
  return new Date(before.getTime() + fraction * (after.getTime() - before.getTime()));
}

function dateAtCalendarAge(birthDate: Date, years: number, months: number): Date {
  const absoluteMonth = birthDate.getUTCMonth() + months;
  const year = birthDate.getUTCFullYear() + years + Math.floor(absoluteMonth / 12);
  const month = ((absoluteMonth % 12) + 12) % 12;
  const day = Math.min(birthDate.getUTCDate(), daysInUtcMonth(year, month));
  return new Date(Date.UTC(year, month, day));
}

function addUtcYears(date: Date, years: number): Date {
  const year = date.getUTCFullYear() + years;
  const month = date.getUTCMonth();
  const day = Math.min(date.getUTCDate(), daysInUtcMonth(year, month));
  return new Date(Date.UTC(
    year,
    month,
    day,
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  ));
}

/** Décompose un écart en années calendaires puis en jours et unités d'horloge. */
export function preciseCalendarDuration(from: Date, to: Date): PreciseCalendarDuration {
  const future = to.getTime() >= from.getTime();
  const start = future ? from : to;
  const end = future ? to : from;
  let years = end.getUTCFullYear() - start.getUTCFullYear();
  let anchor = addUtcYears(start, years);
  if (anchor.getTime() > end.getTime()) {
    years -= 1;
    anchor = addUtcYears(start, years);
  }

  let seconds = Math.floor((end.getTime() - anchor.getTime()) / 1_000);
  const days = Math.floor(seconds / 86_400);
  seconds -= days * 86_400;
  const hours = Math.floor(seconds / 3_600);
  seconds -= hours * 3_600;
  const minutes = Math.floor(seconds / 60);
  seconds -= minutes * 60;
  return { future, years, days, hours, minutes, seconds };
}

/**
 * Repères volontairement figés avec la page : retraite moyenne observée en 2023
 * (femmes 63 ans 1 mois, hommes 62 ans 5 mois) et entrée moyenne en Ehpad en
 * 2023 (85 ans 11 mois). Sources DREES, publications 2025.
 */
export function calculateMilestones(payload: HorizonPayload, at: Date, horizonDate: Date): HorizonMilestones | null {
  const birthDate = parseIsoDate(payload.birthDate);
  if (!birthDate) return null;
  const retirementAge = payload.sex === "f"
    ? { years: 63, months: 1 }
    : { years: 62, months: 5 };

  let summerYear = at.getUTCFullYear();
  if (Date.UTC(summerYear, 5, 21) <= at.getTime()) summerYear += 1;
  let summersRemaining = 0;
  while (Date.UTC(summerYear, 5, 21) < horizonDate.getTime()) {
    summersRemaining += 1;
    summerYear += 1;
  }

  let birthdaysRemaining = 0;
  for (let year = at.getUTCFullYear(); year <= horizonDate.getUTCFullYear(); year += 1) {
    const age = year - birthDate.getUTCFullYear();
    const birthday = addUtcYears(birthDate, age);
    if (birthday.getTime() > at.getTime() && birthday.getTime() < horizonDate.getTime()) {
      birthdaysRemaining += 1;
    }
  }

  const firstWeekend = new Date(at);
  firstWeekend.setUTCHours(0, 0, 0, 0);
  const daysUntilSaturday = (6 - firstWeekend.getUTCDay() + 7) % 7;
  firstWeekend.setUTCDate(firstWeekend.getUTCDate() + daysUntilSaturday);
  if (firstWeekend.getTime() <= at.getTime()) firstWeekend.setUTCDate(firstWeekend.getUTCDate() + 7);
  const weekendsRemaining = firstWeekend.getTime() < horizonDate.getTime()
    ? Math.ceil((horizonDate.getTime() - firstWeekend.getTime()) / (7 * 86_400_000))
    : 0;

  return {
    retirementDate: dateAtCalendarAge(birthDate, retirementAge.years, retirementAge.months),
    ehpadDate: dateAtCalendarAge(birthDate, 85, 11),
    summersRemaining,
    birthdaysRemaining,
    weekendsRemaining,
  };
}

/**
 * Calcule un horizon statistique conditionnel à l'âge atteint aujourd'hui.
 * La table Insee donne les âges entiers ; une interpolation linéaire évite les
 * sauts artificiels le jour de l'anniversaire.
 */
export function calculateHorizon(payload: HorizonPayload, at = new Date()): HorizonCalculation {
  const birthDate = parseIsoDate(payload.birthDate);
  if (!birthDate) return { ok: false, error: "invalidBirthDate" };
  if (birthDate.getTime() > at.getTime()) return { ok: false, error: "birthInFuture" };

  const cohort = birthDate.getUTCFullYear();
  if (cohort < MIN_COHORT_YEAR || cohort > MAX_COHORT_YEAR) {
    return { ok: false, error: "unsupportedGeneration" };
  }

  const exactAge = exactAgeAt(birthDate, at);
  const age = Math.floor(exactAge);
  if (age < 0 || age >= MAX_TABLE_AGE) return { ok: false, error: "unsupportedAge" };

  const table = payload.sex === "f" ? FEMALE_REMAINING_YEARS : MALE_REMAINING_YEARS;
  const row = table[cohort - MIN_COHORT_YEAR];
  const fraction = exactAge - age;
  const remainingYears = row[age] + (row[age + 1] - row[age]) * fraction;
  const horizonAge = exactAge + remainingYears;

  return {
    ok: true,
    value: { exactAge, remainingYears, horizonAge, horizonDate: dateAtDecimalAge(birthDate, horizonAge) },
  };
}
