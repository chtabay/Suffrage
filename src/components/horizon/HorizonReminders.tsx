"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import AideModale from "@/components/games/Modale";
import ConnexionJeux from "@/components/games/ConnexionJeux";
import { Btn, Card } from "@/components/ui/kit";
import { CORAL, FONT_DISPLAY, INK, MUTED, YELLOW } from "@/components/scrutin/theme";
import { PLACET_GAMES_SKIN as skin } from "@/lib/games/skin";
import { useAuth } from "@/lib/auth/useAuth";
import { deleteHorizonReminder, readHorizonReminder, saveHorizonReminder } from "@/lib/db/horizon";
import { nextHorizonReminderDate, type HorizonPayload, type HorizonResult } from "@/lib/horizon/horizon";
import { useInstall } from "@/lib/pwa/install";
import { abonnementDIci, notifyDeployed, notifySupported, subscribeNotifications } from "@/lib/pwa/notify";
import { clearPreservedHorizon, preserveHorizonForAuth } from "@/lib/horizon/auth-restore";

interface Preferences {
  birthday: boolean;
  thresholds: boolean;
  retirement: boolean;
}

const DEFAULTS: Preferences = { birthday: true, thresholds: true, retirement: true };

function Choice({ checked, onChange, children }: { checked: boolean; onChange: (value: boolean) => void; children: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 0", borderBottom: `1px solid ${INK}22`, fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} style={{ width: 20, height: 20, accentColor: CORAL }} />
      {children}
    </label>
  );
}

export default function HorizonReminders({ payload, result }: { payload: HorizonPayload; result: HorizonResult }) {
  const t = useTranslations("Horizon");
  const locale = useLocale();
  const { user, loading } = useAuth();
  const install = useInstall();
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULTS);
  const [reminderId, setReminderId] = useState<string | null>(null);
  const [subscribedHere, setSubscribedHere] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"denied" | "unsupported" | "save" | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || loadedFor === user.id) return;
    setLoadedFor(user.id);
    const [saved, here] = await Promise.all([
      readHorizonReminder(payload).catch(() => null),
      abonnementDIci(),
    ]);
    setSubscribedHere(here);
    if (saved) {
      setReminderId(saved.id);
      setPreferences({ birthday: saved.birthday, thresholds: saved.thresholds, retirement: saved.retirement });
    }
  }, [loadedFor, payload, user]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!user) return;
    clearPreservedHorizon();
  }, [user]);
  useEffect(() => {
    if (open && user) void load();
  }, [open, user, load]);

  const next = useMemo(
    () => nextHorizonReminderDate(payload, preferences),
    [payload, preferences],
  );
  const nextLabel = next
    ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(next)
    : null;

  if (!notifyDeployed()) return null;

  const activate = async () => {
    if (!user || busy || !Object.values(preferences).some(Boolean)) return;
    setBusy(true);
    setError(null);
    let here = subscribedHere;
    if (!here) {
      const subscription = await subscribeNotifications();
      if (subscription !== "ok") {
        setError(subscription === "denied" ? "denied" : subscription === "unsupported" ? "unsupported" : "save");
        setBusy(false);
        return;
      }
      here = true;
      setSubscribedHere(true);
    }
    try {
      const saved = await saveHorizonReminder(payload, result.remainingYears, preferences, locale);
      setReminderId(saved.id);
      setOpen(false);
    } catch {
      setError("save");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!reminderId || busy) return;
    setBusy(true);
    try {
      await deleteHorizonReminder(reminderId);
      setReminderId(null);
      setPreferences(DEFAULTS);
      setOpen(false);
    } catch {
      setError("save");
    } finally {
      setBusy(false);
    }
  };

  const title = !user ? t("reminderAccountTitle") : t("reminderSettingsTitle");
  const text = !user ? t("reminderAccountText") : t("reminderSettingsText");

  return (
    <section aria-labelledby="reminders-title" style={{ marginTop: 34 }}>
      <Card accent={YELLOW} padding="clamp(20px, 5vw, 28px)">
        <h2 id="reminders-title" style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 24 }}>{t("reminderTitle")}</h2>
        {nextLabel ? <p style={{ margin: "9px 0 5px", color: MUTED, fontSize: 14.5, lineHeight: 1.55 }}>{t("reminderNext", { date: nextLabel })}</p> : null}
        {!loading && !user ? <p style={{ margin: "0 0 17px", color: MUTED, fontSize: 12.5, fontWeight: 700 }}>{t("reminderAccountRequired")}</p> : <div style={{ height: 12 }} />}
        {reminderId && subscribedHere ? (
          <div>
            <p role="status" style={{ margin: 0, color: "#1c7f45", fontWeight: 800 }}>{t("reminderActive")}</p>
            <Btn onClick={() => setOpen(true)} variant="cream" style={{ marginTop: 13 }}>{t("reminderEdit")}</Btn>
          </div>
        ) : (
          <Btn onClick={() => setOpen(true)} variant="primary" disabled={loading}>{t("reminderReceive")}</Btn>
        )}
      </Card>

      {open ? (
        <AideModale skin={skin} titre={title} texte={text} fermer={() => setOpen(false)} fermerLabel={t("close")} fermerDiscret>
          {!user ? (
            <ConnexionJeux
              skin={skin}
              next={`${window.location.pathname}?restore=1`}
              beforeAuth={preserveHorizonForAuth}
            />
          ) : install.ios ? (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, fontWeight: 700 }}>{t("reminderIos")}</p>
          ) : !notifySupported() ? (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, fontWeight: 700 }}>{t("reminderUnsupported")}</p>
          ) : (
            <div>
              <Choice checked={preferences.birthday} onChange={(birthday) => setPreferences((p) => ({ ...p, birthday }))}>{t("reminderBirthday")}</Choice>
              <Choice checked={preferences.thresholds} onChange={(thresholds) => setPreferences((p) => ({ ...p, thresholds }))}>{t("reminderThresholds")}</Choice>
              <Choice checked={preferences.retirement} onChange={(retirement) => setPreferences((p) => ({ ...p, retirement }))}>{t("reminderRetirement")}</Choice>
              <p style={{ margin: "12px 0", color: MUTED, fontSize: 12.5, lineHeight: 1.5 }}>{t("reminderStored")}</p>
              <Btn onClick={() => void activate()} variant="primary" style={{ width: "100%" }} disabled={busy || !Object.values(preferences).some(Boolean)}>
                {busy ? "…" : reminderId ? t("reminderSave") : t("reminderActivate")}
              </Btn>
              {reminderId ? <button type="button" onClick={() => void disable()} disabled={busy} style={{ display: "block", margin: "14px auto 0", border: 0, background: "none", color: MUTED, textDecoration: "underline", cursor: "pointer" }}>{t("reminderDisable")}</button> : null}
              {error ? <p role="alert" style={{ margin: "12px 0 0", color: CORAL, fontSize: 13.5, fontWeight: 700 }}>{error === "denied" ? t("reminderDenied") : error === "unsupported" ? t("reminderUnsupported") : t("reminderError")}</p> : null}
            </div>
          )}
        </AideModale>
      ) : null}
    </section>
  );
}
