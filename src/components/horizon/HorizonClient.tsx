"use client";

import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { Link } from "@/i18n/navigation";
import PlacetMark from "@/components/scrutin/PlacetMark";
import { CORAL, CREAM, FONT_DISPLAY, INK, MUTED, YELLOW } from "@/components/scrutin/theme";
import { Btn, Card } from "@/components/ui/kit";
import { restoreHorizonAfterAuth } from "@/lib/horizon/auth-restore";
import {
  calculateHorizon,
  calculateMilestones,
  COMMENT_MAX_LENGTH,
  encodeHorizonFragment,
  FIRST_NAME_MAX_LENGTH,
  MAX_FRAGMENT_LENGTH,
  parseHorizonFragment,
  preciseCalendarDuration,
  TITLE_MAX_LENGTH,
  type HorizonError,
  type HorizonPayload,
  type HorizonResult,
  type StatisticalSex,
} from "@/lib/horizon/horizon";

const HorizonReminders = dynamic(() => import("@/components/horizon/HorizonReminders"), { ssr: false });
const HorizonPlacet = dynamic(() => import("@/components/horizon/HorizonPlacet"), { ssr: false });

interface FormState {
  birthDate: string;
  sex: StatisticalSex;
  firstName: string;
  title: string;
  comment: string;
}

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const EMPTY_FORM: FormState = { birthDate: "", sex: "f", firstName: "", title: "", comment: "" };

const fieldStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: `2px solid ${INK}`,
  borderRadius: 11,
  background: "#fff",
  color: INK,
  fontSize: 16,
  padding: "12px 13px",
};

function payloadToForm(payload: HorizonPayload): FormState {
  return {
    birthDate: payload.birthDate,
    sex: payload.sex,
    firstName: payload.firstName,
    title: payload.title ?? "",
    comment: payload.comment ?? "",
  };
}

function formToPayload(form: FormState): HorizonPayload {
  return {
    birthDate: form.birthDate,
    sex: form.sex,
    firstName: form.firstName.trim(),
    ...(form.title.trim() ? { title: form.title.trim() } : {}),
    ...(form.comment.trim() ? { comment: form.comment.trim() } : {}),
  };
}

function remainingParts(years: number): { years: number; months: number } {
  const totalMonths = Math.max(0, Math.round(years * 12));
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12 };
}

function countdownTo(target: Date, now: Date): Countdown {
  let seconds = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  const days = Math.floor(seconds / 86_400);
  seconds -= days * 86_400;
  const hours = Math.floor(seconds / 3_600);
  seconds -= hours * 3_600;
  const minutes = Math.floor(seconds / 60);
  seconds -= minutes * 60;
  return { days, hours, minutes, seconds };
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 7, fontSize: 14, fontWeight: 700 }}>
      <span>{label}</span>
      {children}
      {hint ? <span style={{ color: MUTED, fontSize: 12.5, fontWeight: 500, lineHeight: 1.45 }}>{hint}</span> : null}
    </label>
  );
}

function CountdownCell({ value, label, tick = false }: { value: string; label: string; tick?: boolean }) {
  return (
    <div style={{ textAlign: "center", minWidth: 0 }}>
      <strong
        key={tick ? value : undefined}
        className={tick ? "horizon-seconds-tick" : undefined}
        style={{ display: "block", fontFamily: FONT_DISPLAY, fontSize: "clamp(24px, 6vw, 38px)", lineHeight: 1 }}
      >
        {value}
      </strong>
      <span style={{ display: "block", marginTop: 6, color: MUTED, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );
}

function MilestoneRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "baseline", gap: 8, padding: "13px 0", borderBottom: last ? "none" : `1px solid ${INK}22` }}>
      <span style={{ color: MUTED, fontSize: "clamp(11px, 3.1vw, 14px)", fontWeight: 700, whiteSpace: "nowrap" }}>{label}</span>
      <strong style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(11px, 3.1vw, 17px)", letterSpacing: "-.02em", whiteSpace: "nowrap" }}>{value}</strong>
    </div>
  );
}

function calculationError(t: ReturnType<typeof useTranslations<"Horizon">>, error: HorizonError): string {
  if (error === "invalidBirthDate") return t("errorInvalidDate");
  if (error === "birthInFuture") return t("errorFutureDate");
  if (error === "unsupportedGeneration") return t("errorGeneration");
  return t("errorAge");
}

export default function HorizonClient() {
  const t = useTranslations("Horizon");
  const locale = useLocale();
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"form" | "result">("form");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [payload, setPayload] = useState<HorizonPayload | null>(null);
  const [calculatedAt, setCalculatedAt] = useState<Date | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState("");
  const [shareStatus, setShareStatus] = useState("");

  useEffect(() => {
    const readHash = () => {
      let raw = window.location.hash.slice(1);
      if (!raw && new URLSearchParams(window.location.search).get("restore") === "1") {
        raw = restoreHorizonAfterAuth() ?? "";
        window.history.replaceState(null, "", raw ? `${window.location.pathname}#${raw}` : window.location.pathname);
      }
      if (!raw) {
        setMode("form");
        setError("");
        setReady(true);
        return;
      }
      const parsed = parseHorizonFragment(raw);
      if (!parsed) {
        setMode("form");
        setError(t("errorInvalidLink"));
        setReady(true);
        return;
      }
      const at = new Date();
      const calculation = calculateHorizon(parsed, at);
      if (!calculation.ok) {
        setForm(payloadToForm(parsed));
        setMode("form");
        setError(calculationError(t, calculation.error));
        setReady(true);
        return;
      }
      setPayload(parsed);
      setForm(payloadToForm(parsed));
      setCalculatedAt(at);
      setNow(at);
      setShareUrl(`${window.location.origin}${window.location.pathname}#${encodeHorizonFragment(parsed)}`);
      setMode("result");
      setError("");
      setReady(true);
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, [t]);

  const calculation = useMemo(() => {
    if (!payload || !calculatedAt) return null;
    return calculateHorizon(payload, calculatedAt);
  }, [calculatedAt, payload]);

  useEffect(() => {
    if (mode !== "result" || !calculation?.ok) return;
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, [calculation, mode]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const openResult = (nextPayload: HorizonPayload) => {
    const fragment = encodeHorizonFragment(nextPayload);
    const url = `${window.location.origin}${window.location.pathname}#${fragment}`;
    const at = new Date();
    window.history.pushState(null, "", `#${fragment}`);
    setPayload(nextPayload);
    setCalculatedAt(at);
    setNow(at);
    setShareUrl(url);
    setMode("result");
    setError("");
    setShareStatus("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextPayload = formToPayload(form);
    const fragment = encodeHorizonFragment(nextPayload);
    if (fragment.length > MAX_FRAGMENT_LENGTH) {
      setError(t("errorLinkTooLong"));
      return;
    }
    const verified = parseHorizonFragment(fragment);
    if (!verified) {
      setError(t("errorForm"));
      return;
    }
    const result = calculateHorizon(verified, new Date());
    if (!result.ok) {
      setError(calculationError(t, result.error));
      return;
    }
    openResult(verified);
  };

  const copyLink = async () => {
    try {
      await copyText(shareUrl);
      setShareStatus(t("copied"));
    } catch {
      setShareStatus(t("copyFailed"));
    }
  };

  const share = async () => {
    if (!payload) return;
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: t("shareTitle", { name: payload.firstName }),
        text: t("shareText", { name: payload.firstName }),
        url: shareUrl,
      });
      setShareStatus(t("shared"));
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      setShareStatus(t("copyFailed"));
    }
  };

  const edit = () => {
    setMode("form");
    setError("");
    setShareStatus("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const createAnother = () => {
    setForm(EMPTY_FORM);
    setPayload(null);
    setCalculatedAt(null);
    setNow(null);
    setShareUrl("");
    setMode("form");
    setError("");
    setShareStatus("");
    window.history.pushState(null, "", window.location.pathname);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(251,246,236,.94)", borderBottom: `2px solid ${INK}`, backdropFilter: "blur(8px)" }}>
        <div className="pad" style={{ maxWidth: 920, margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18 }}>
          <Link href="/" aria-label={t("backHome")} style={{ display: "inline-flex", alignItems: "center", gap: 11, color: INK, textDecoration: "none" }}>
            <PlacetMark size={36} />
            <strong style={{ fontFamily: FONT_DISPLAY, fontSize: 22, letterSpacing: "-.04em" }}>Placet</strong>
          </Link>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".09em", textTransform: "uppercase" }}>{t("eyebrow")}</span>
        </div>
      </header>

      <main className="pad" style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px 80px" }}>
        {!ready ? (
          <Card><p style={{ margin: 0 }}>{t("loading")}</p></Card>
        ) : mode === "form" ? (
          <>
            <div style={{ marginBottom: 30 }}>
              <span style={{ display: "inline-block", padding: "6px 10px", border: `2px solid ${INK}`, borderRadius: 999, background: YELLOW, fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>
                {t("badge")}
              </span>
              <h1 className="hero" style={{ margin: "18px 0 12px", maxWidth: 680, fontFamily: FONT_DISPLAY, fontSize: "clamp(42px, 8vw, 70px)", lineHeight: .96, letterSpacing: "-.055em" }}>
                {t("formTitle")}
              </h1>
              <p style={{ maxWidth: 650, margin: 0, color: MUTED, fontSize: 17, lineHeight: 1.65 }}>{t("formIntro")}</p>
            </div>

            <Card accent={CORAL} padding="clamp(20px, 5vw, 32px)">
              <form onSubmit={submit} style={{ display: "grid", gap: 22 }}>
                <div className="horizon-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <Field label={t("birthDateLabel")} hint={t("birthDateHint")}>
                    <input required type="date" min="1908-01-01" max="2022-12-31" value={form.birthDate} onChange={(event) => setField("birthDate", event.target.value)} style={fieldStyle} />
                  </Field>
                  <Field label={t("sexLabel")} hint={t("sexHint")}>
                    <select value={form.sex} onChange={(event) => setField("sex", event.target.value as StatisticalSex)} style={fieldStyle}>
                      <option value="f">{t("sexFemale")}</option>
                      <option value="m">{t("sexMale")}</option>
                    </select>
                  </Field>
                </div>
                <Field label={t("firstNameLabel")}>
                  <input required type="text" autoComplete="given-name" maxLength={FIRST_NAME_MAX_LENGTH} value={form.firstName} onChange={(event) => setField("firstName", event.target.value)} style={fieldStyle} />
                </Field>
                <Field label={t("titleLabel")} hint={t("optionalHint")}>
                  <input type="text" maxLength={TITLE_MAX_LENGTH} value={form.title} onChange={(event) => setField("title", event.target.value)} style={fieldStyle} />
                </Field>
                <Field label={t("commentLabel")} hint={t("commentHint", { count: COMMENT_MAX_LENGTH })}>
                  <textarea rows={4} maxLength={COMMENT_MAX_LENGTH} value={form.comment} onChange={(event) => setField("comment", event.target.value)} style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.5 }} />
                </Field>
                {error ? <p role="alert" style={{ margin: 0, padding: "11px 13px", border: `2px solid ${CORAL}`, borderRadius: 10, background: "#fff3f1", color: INK, fontSize: 14, fontWeight: 700 }}>{error}</p> : null}
                <Btn type="submit" variant="cta" size="lg" style={{ width: "100%" }}>{t("generate")}</Btn>
              </form>
            </Card>

            <p style={{ margin: "26px 4px 0", color: MUTED, fontSize: 13, lineHeight: 1.6 }}>{t("privacyForm")}</p>
          </>
        ) : payload && calculation?.ok && now ? (
          <ResultView
            payload={payload}
            result={calculation.value}
            now={now}
            locale={locale}
            shareUrl={shareUrl}
            shareStatus={shareStatus}
            onCopy={copyLink}
            onShare={share}
            onEdit={edit}
            onCreateAnother={createAnother}
            t={t}
          />
        ) : null}
      </main>
    </div>
  );
}

function ResultView({
  payload,
  result,
  now,
  locale,
  shareUrl,
  shareStatus,
  onCopy,
  onShare,
  onEdit,
  onCreateAnother,
  t,
}: {
  payload: HorizonPayload;
  result: HorizonResult;
  now: Date;
  locale: string;
  shareUrl: string;
  shareStatus: string;
  onCopy: () => void;
  onShare: () => void;
  onEdit: () => void;
  onCreateAnother: () => void;
  t: ReturnType<typeof useTranslations<"Horizon">>;
}) {
  const remaining = remainingParts(result.remainingYears);
  const countdown = countdownTo(result.horizonDate, now);
  const milestones = calculateMilestones(payload, now, result.horizonDate);
  const retirement = milestones ? preciseCalendarDuration(now, milestones.retirementDate) : null;
  const ehpad = milestones ? preciseCalendarDuration(now, milestones.ehpadDate) : null;
  const integer = new Intl.NumberFormat(locale);
  const decimal = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const longDate = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" });
  const precise = (duration: NonNullable<typeof retirement>) => t("milestoneDuration", {
    years: duration.years,
    days: duration.days,
    hours: duration.hours,
    minutes: duration.minutes,
    seconds: duration.seconds,
  });
  const objectsHref = `/horizon/objets#${encodeHorizonFragment(payload)}`;
  const objectPreviews = [
    { title: t("objectsShirtTitle"), src: "/horizon/objects/shirt-cream-v2.webp", variant: t("objectsVariantCream") },
    { title: t("objectsMugTitle"), src: "/horizon/objects/mug-navy.webp", variant: t("objectsVariantNavy") },
    { title: t("objectsPosterTitle"), src: "/horizon/objects/poster-coral.webp", variant: t("objectsVariantCoral") },
    { title: t("objectsPlaqueTitle"), src: "/horizon/objects/plaque-brass.webp", variant: t("objectsVariantBrass") },
    { title: t("objectsMagnetTitle"), src: "/horizon/objects/magnet-yellow.webp", variant: t("objectsVariantYellow") },
    { title: t("objectsMetalCardTitle"), src: "/horizon/objects/metal-card-navy.webp", variant: t("objectsVariantNavy") },
  ];

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <span style={{ display: "inline-block", padding: "6px 10px", border: `2px solid ${INK}`, borderRadius: 999, background: YELLOW, fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>
          {t("badge")}
        </span>
        <h1 className="hero" style={{ margin: "18px 0 12px", fontFamily: FONT_DISPLAY, fontSize: "clamp(42px, 8vw, 68px)", lineHeight: 1, letterSpacing: "-.055em", overflowWrap: "anywhere" }}>
          {payload.title ?? t("defaultTitle", { name: payload.firstName })}
        </h1>
        {payload.comment ? <p style={{ margin: 0, maxWidth: 660, color: MUTED, fontSize: 18, lineHeight: 1.65, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{payload.comment}</p> : null}
      </div>

      <Card accent={CORAL} padding="clamp(22px, 6vw, 38px)" style={{ textAlign: "center", background: CREAM }}>
        <p style={{ margin: 0, color: MUTED, fontSize: 13, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>{t("remainingLabel")}</p>
        <p style={{ margin: "12px 0 8px", fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: "clamp(40px, 10vw, 76px)", lineHeight: .95, letterSpacing: "-.06em" }}>
          {t("remainingValue", { years: remaining.years, months: remaining.months })}
        </p>
        <p style={{ margin: "18px 0 0", color: MUTED, fontSize: 15, lineHeight: 1.6 }}>
          {t("horizonDate", { date: longDate.format(result.horizonDate), age: decimal.format(result.horizonAge) })}
        </p>
      </Card>

      <section aria-labelledby="countdown-title" style={{ marginTop: 34 }}>
        <h2 id="countdown-title" style={{ margin: "0 0 14px", fontFamily: FONT_DISPLAY, fontSize: 25 }}>{t("countdownTitle")}</h2>
        <Card padding="22px 16px">
          <div className="horizon-countdown" style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(3, 1fr)", gap: 10 }}>
            <CountdownCell value={integer.format(countdown.days)} label={t("days")} />
            <CountdownCell value={String(countdown.hours).padStart(2, "0")} label={t("hours")} />
            <CountdownCell value={String(countdown.minutes).padStart(2, "0")} label={t("minutes")} />
            <CountdownCell value={String(countdown.seconds).padStart(2, "0")} label={t("seconds")} tick />
          </div>
        </Card>
      </section>

      {milestones && retirement && ehpad ? (
        <section aria-labelledby="milestones-title" style={{ marginTop: 34 }}>
          <h2 id="milestones-title" style={{ margin: "0 0 14px", fontFamily: FONT_DISPLAY, fontSize: 25 }}>{t("milestonesTitle")}</h2>
          <Card padding="2px 18px">
            <MilestoneRow label={retirement.future ? t("beforeRetirement") : t("sinceRetirement")} value={precise(retirement)} />
            <MilestoneRow label={t("summersRemaining")} value={integer.format(milestones.summersRemaining)} />
            <MilestoneRow label={t("weekendsRemaining")} value={integer.format(milestones.weekendsRemaining)} />
            <MilestoneRow label={ehpad.future ? t("beforeEhpad") : t("sinceEhpad")} value={precise(ehpad)} last />
          </Card>
        </section>
      ) : null}

      <HorizonReminders payload={payload} result={result} />

      <section aria-labelledby="share-title" style={{ marginTop: 34 }}>
        <h2 id="share-title" style={{ margin: "0 0 14px", fontFamily: FONT_DISPLAY, fontSize: 25 }}>{t("qrTitle")}</h2>
        <Card accent={YELLOW} padding="clamp(20px, 5vw, 30px)">
          <div className="horizon-share-grid" style={{ display: "grid", gridTemplateColumns: "272px minmax(0, 1fr)", alignItems: "center", gap: 28 }}>
            <div style={{ display: "grid", placeItems: "center", padding: 12, border: `2px solid ${INK}`, borderRadius: 13, background: "#fff" }}>
              <QRCodeSVG value={shareUrl} size={248} level="M" bgColor="#ffffff" fgColor={INK} title={t("qrAlt", { name: payload.firstName })} style={{ width: "100%", height: "auto" }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: "0 0 12px", color: MUTED, fontSize: 14, lineHeight: 1.55 }}>{t("qrHint")}</p>
              <p style={{ margin: "0 0 18px", padding: "9px 10px", borderRadius: 8, background: CREAM, fontSize: 11, lineHeight: 1.5, overflowWrap: "anywhere" }}>{shareUrl}</p>
              <div className="horizon-actions" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <Btn onClick={onShare} variant="primary">{t("share")}</Btn>
                <Btn onClick={onCopy}>{t("copy")}</Btn>
              </div>
              <p aria-live="polite" style={{ minHeight: 20, margin: "9px 0 0", color: MUTED, fontSize: 13, fontWeight: 700 }}>{shareStatus}</p>
            </div>
          </div>
        </Card>
      </section>

      <p style={{ margin: "8px 4px 0", color: MUTED, fontSize: 13, lineHeight: 1.65 }}>{t("privacyResult")}</p>
      <div className="horizon-actions" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 26 }}>
        <Btn onClick={onEdit} variant="cream">{t("edit")}</Btn>
        <Btn onClick={onCreateAnother} variant="primary">{t("createAnother")}</Btn>
      </div>

      <HorizonPlacet />

      <section aria-labelledby="objects-strip-title" style={{ marginTop: 34 }}>
        <Card accent={YELLOW} padding="clamp(16px, 4vw, 22px)">
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
            <h2 id="objects-strip-title" style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 23 }}>{t("objectsStripTitle")}</h2>
            <Link href={objectsHref} style={{ flexShrink: 0, color: INK, fontSize: 13, fontWeight: 800, textUnderlineOffset: 3 }}>
              {t("objectsStripCta")}
            </Link>
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "2px 2px 8px", scrollbarWidth: "thin", scrollSnapType: "x proximity" }}>
            {objectPreviews.map((object) => (
              <Link
                key={object.src}
                href={objectsHref}
                className="dc-lift"
                style={{ flex: "1 0 104px", minWidth: 104, overflow: "hidden", border: `2px solid ${INK}`, borderRadius: 10, background: "#fff", color: INK, textDecoration: "none", scrollSnapAlign: "start" }}
              >
                <div style={{ position: "relative", aspectRatio: "1 / 1", borderBottom: `2px solid ${INK}`, background: CREAM }}>
                  <Image
                    src={object.src}
                    alt={t("objectsImageAlt", { product: object.title, variant: object.variant })}
                    fill
                    sizes="(max-width: 600px) 110px, 120px"
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <span style={{ display: "block", padding: "8px 8px 9px", fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700, lineHeight: 1.1 }}>
                  {object.title}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </>
  );
}
