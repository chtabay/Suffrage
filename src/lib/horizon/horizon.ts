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
