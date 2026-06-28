import Link from "next/link";
import { getTranslations } from "next-intl/server";
import SlackMark from "@/components/SlackMark";

export async function generateMetadata() {
  const t = await getTranslations("SlackPage");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

const INK = "#16213A";
const CREAM = "#FBF6EC";
const MUTED = "#5b6379";
const display = "var(--font-display), 'Bricolage Grotesque', sans-serif";

const card = {
  background: "#fff",
  border: `2.5px solid ${INK}`,
  borderRadius: 16,
  padding: "22px 24px",
  boxShadow: `6px 6px 0 ${INK}`,
} as const;

export default async function SlackInstallPage() {
  const t = await getTranslations("SlackPage");
  const clientId = process.env.SLACK_CLIENT_ID ?? "";
  const scope = "commands,chat:write,chat:write.public";
  const redirect = "https://placet.app/api/slack/oauth/callback";
  const installUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${encodeURIComponent(redirect)}`;

  const STEPS: [string, string][] = [
    [t("step1Title"), t("step1Body")],
    [t("step2Title"), t("step2Body")],
    [t("step3Title"), t("step3Body")],
    [t("step4Title"), t("step4Body")],
  ];

  return (
    <div style={{ minHeight: "100vh", background: CREAM }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "56px 24px 90px" }}>
        <Link href="/" style={{ textDecoration: "none", color: INK, fontFamily: display, fontWeight: 800, fontSize: 22 }}>
          🗳️ Placet
        </Link>

        <h1 style={{ fontFamily: display, fontWeight: 800, fontSize: "clamp(28px,5vw,42px)", letterSpacing: "-0.03em", marginTop: 22 }}>
          {t("title")}
        </h1>
        <p style={{ fontSize: 17, color: "#3a4258", lineHeight: 1.55, marginTop: 12, maxWidth: "54ch" }}>
          {t.rich("intro", {
            strong: (c) => <strong>{c}</strong>,
            code: (c) => <code>{c}</code>,
          })}
        </p>

        <div style={{ marginTop: 26 }}>
          {clientId ? (
            <a
              href={installUrl}
              aria-label={t("installAria")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 11,
                fontFamily: display,
                fontWeight: 800,
                fontSize: 16,
                textDecoration: "none",
                border: `2.5px solid ${INK}`,
                background: "#fff",
                color: INK,
                padding: "13px 22px",
                borderRadius: 13,
                boxShadow: `5px 5px 0 ${INK}`,
              }}
            >
              <SlackMark size={22} /> {t("installCta")}
            </a>
          ) : (
            <p style={{ color: "#FF5E5B", fontWeight: 700 }}>{t("installUnavailable")}</p>
          )}
        </div>

        <div style={{ ...card, marginTop: 30 }}>
          {STEPS.map(([stepTitle, stepBody], i) => (
            <div key={stepTitle} style={{ display: "flex", gap: 14, padding: i ? "14px 0 0" : 0 }}>
              <div style={{ fontFamily: display, fontWeight: 800, fontSize: 15, color: INK, minWidth: 92 }}>{stepTitle}</div>
              <div style={{ fontSize: 14.5, color: "#2c3447", lineHeight: 1.5 }}>{stepBody}</div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.55, marginTop: 22 }}>
          {t.rich("permissionsNote", { code: (c) => <code>{c}</code> })}
        </p>
      </div>
    </div>
  );
}
