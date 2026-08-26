"use client";

import { createClient } from "@/lib/supabase/client";
import type { HorizonPayload } from "@/lib/horizon/horizon";

export interface HorizonReminderSettings {
  id: string;
  birthday: boolean;
  thresholds: boolean;
  retirement: boolean;
  devices: number;
}

export interface HorizonReminderPreferences {
  birthday: boolean;
  thresholds: boolean;
  retirement: boolean;
}

export async function readHorizonReminder(payload: HorizonPayload): Promise<HorizonReminderSettings | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_horizon_rappel_lire", {
    p_naissance: payload.birthDate,
    p_sexe: payload.sex,
    p_prenom: payload.firstName,
  });
  if (error) throw error;
  const value = data as Record<string, unknown> | null;
  if (!value || value.status !== "ok" || typeof value.id !== "string") return null;
  return {
    id: value.id,
    birthday: value.anniversaire === true,
    thresholds: value.seuils === true,
    retirement: value.retraite === true,
    devices: typeof value.appareils === "number" ? value.appareils : 0,
  };
}

export async function saveHorizonReminder(
  payload: HorizonPayload,
  remainingYears: number,
  preferences: HorizonReminderPreferences,
  locale: string,
): Promise<HorizonReminderSettings> {
  const supabase = createClient();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris";
  const { data, error } = await supabase.rpc("scrutin_horizon_rappel_enregistrer", {
    p_naissance: payload.birthDate,
    p_sexe: payload.sex,
    p_prenom: payload.firstName,
    p_anniversaire: preferences.birthday,
    p_seuils: preferences.thresholds,
    p_retraite: preferences.retirement,
    p_restant: remainingYears,
    p_fuseau: timezone,
    p_langue: locale,
  });
  if (error) throw error;
  const value = data as Record<string, unknown> | null;
  if (!value || value.status !== "ok" || typeof value.id !== "string") throw new Error("horizon-reminder-save-failed");
  return {
    id: value.id,
    birthday: value.anniversaire === true,
    thresholds: value.seuils === true,
    retirement: value.retraite === true,
    devices: typeof value.appareils === "number" ? value.appareils : 0,
  };
}

export async function deleteHorizonReminder(id: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_horizon_rappel_supprimer", { p_id: id });
  if (error) throw error;
  return data === true;
}
