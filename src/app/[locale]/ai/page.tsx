import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { publicMethodCatalog, publicMethodToSystem } from "@/lib/voting/methods";
import SlackMark from "@/components/SlackMark";
import PlacetMark from "@/components/scrutin/PlacetMark";
import { Link } from "@/i18n/navigation";

export async function generateMetadata() {
  const t = await getTranslations("AiDoc");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

const INK = "#16213A";
const CREAM = "#FBF6EC";
const MUTED = "#5b6379";
const CORAL = "#FF5E5B";
const display = "var(--font-display), 'Bricolage Grotesque', sans-serif";
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

const card = {
  background: "#fff",
  border: `2.5px solid ${INK}`,
  borderRadius: 16,
  padding: "18px 20px",
  boxShadow: `5px 5px 0 ${INK}`,
} as const;

const code = {
  fontFamily: mono,
  fontSize: 13,
  background: CREAM,
  border: `2px solid ${INK}`,
  borderRadius: 9,
  padding: "10px 12px",
  display: "block",
  overflowX: "auto" as const,
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-all" as const,
};

export default async function AiDocPage() {
  const t = await getTranslations("AiDoc");
  const tm = await getTranslations("Methods");
  const methods = publicMethodCatalog();
  return (
    <div style={{ minHeight: "100vh" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(6px)",
          background: "rgba(251,246,236,0.82)",
          borderBottom: `2.5px solid ${INK}`,
        }}
      >
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "14px 24px" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 11, textDecoration: "none", color: INK }}>
            <PlacetMark size={38} />
            <span style={{ fontFamily: display, fontWeight: 800, fontSize: 21, letterSpacing: "-0.02em" }}>Placet</span>
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "40px 24px 90px" }}>
        <h1 style={{ fontFamily: display, fontWeight: 800, fontSize: "clamp(30px,5vw,46px)", letterSpacing: "-0.03em", margin: 0 }}>
          {t("title")}
        </h1>
        <p style={{ fontSize: 17, color: "#3a4258", lineHeight: 1.55, marginTop: 14, maxWidth: "62ch" }}>
          {t.rich("intro", { strong: (c) => <strong>{c}</strong> })}
        </p>

        <div
          style={{
            ...card,
            marginTop: 18,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
          }}
        >
          <div style={{ fontSize: 14.5, color: "#2c3447", lineHeight: 1.55, maxWidth: "52ch" }}>
            <strong>{t("slackTeaserTitle")}</strong>{" "}
            {t.rich("slackTeaserBody", { code: (c) => <code style={{ fontFamily: mono }}>{c}</code> })}
          </div>
          <Link
            href="/slack"
            style={{
              flex: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              fontWeight: 800,
              fontSize: 14.5,
              textDecoration: "none",
              border: `2.5px solid ${INK}`,
              background: "#fff",
              color: INK,
              padding: "10px 16px",
              borderRadius: 11,
              boxShadow: `3px 3px 0 ${INK}`,
            }}
          >
            <SlackMark /> {t("slackTeaserCta")}
          </Link>
        </div>

        <h2 style={{ fontFamily: display, fontWeight: 800, fontSize: 24, marginTop: 34 }}>{t("formatTitle")}</h2>
        <div style={{ ...card, marginTop: 12 }}>
          <code style={code}>
            https://placet.app/new?title=...&amp;description=...&amp;options=A|B|C&amp;media=urlA||urlC&amp;method=...&amp;deadline=...&amp;source=...&amp;why=...
          </code>
          {(() => {
            const b = (c: ReactNode) => <b>{c}</b>;
            const codeTag = (c: ReactNode) => <code style={{ fontFamily: mono }}>{c}</code>;
            return (
              <ul style={{ margin: "14px 0 0", paddingLeft: 18, fontSize: 14.5, lineHeight: 1.6, color: "#2c3447" }}>
                <li><b>title</b>{t.rich("paramTitle", { b, code: codeTag })}</li>
                <li><b>description</b>{t.rich("paramDescription", { b, code: codeTag })}</li>
                <li><b>options</b>{t.rich("paramOptions", { b, code: codeTag })}</li>
                <li><b>media</b>{t.rich("paramMedia", { b, code: codeTag })}</li>
                <li><b>dates</b>{t.rich("paramDates", { b, code: codeTag })}</li>
                <li><b>method</b>{t.rich("paramMethod", { b, code: codeTag })}</li>
                <li><b>survey</b>{t.rich("paramSurvey", { b, code: codeTag })}</li>
                <li><b>assign</b>{t.rich("paramAssign", { b, code: codeTag })}</li>
                <li><b>participants</b>{t.rich("paramParticipants", { b, code: codeTag })}</li>
                <li><b>deadline</b>{t.rich("paramDeadline", { b, code: codeTag })}</li>
                <li><b>source</b>{t.rich("paramSource", { b, code: codeTag })}</li>
                <li><b>why</b>{t.rich("paramWhy", { b, code: codeTag })}</li>
              </ul>
            );
          })()}
          <p style={{ fontSize: 13.5, color: CORAL, fontWeight: 700, marginTop: 12, marginBottom: 0 }}>
            {t("formatWarning")}
          </p>
        </div>

        <h2 style={{ fontFamily: display, fontWeight: 800, fontSize: 24, marginTop: 34 }}>{t("methodsTitle")}</h2>
        <div style={{ ...card, marginTop: 12, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: CREAM, borderBottom: `2.5px solid ${INK}` }}>
                <th style={{ textAlign: "left", padding: "11px 14px", fontFamily: mono }}>method</th>
                <th style={{ textAlign: "left", padding: "11px 14px" }}>{t("methodsColMethod")}</th>
                <th style={{ textAlign: "left", padding: "11px 14px" }}>{t("methodsColWhen")}</th>
              </tr>
            </thead>
            <tbody>
              {methods.map((m) => (
                <tr key={m.key} style={{ borderBottom: `1.5px solid #E4DBC6` }}>
                  <td style={{ padding: "11px 14px", fontFamily: mono, fontWeight: 700, whiteSpace: "nowrap" }}>{m.key}</td>
                  <td style={{ padding: "11px 14px", fontWeight: 700, whiteSpace: "nowrap" }}>
                    {m.icon} {tm(`${publicMethodToSystem(m.key) ?? m.key}.name`)}
                  </td>
                  <td style={{ padding: "11px 14px", color: "#2c3447" }}>{tm(`whenToUse.${publicMethodToSystem(m.key) ?? m.key}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={{ fontFamily: display, fontWeight: 800, fontSize: 24, marginTop: 34 }}>{t("examplesTitle")}</h2>
        <div style={{ ...card, marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          <code style={code}>
            https://placet.app/new?title=Resto%20ce%20soir&amp;options=Italien|Japonais|Indien&amp;method=majority_judgment&amp;source=claude&amp;why=Plusieurs%20options%2C%20on%20cherche%20un%20consensus
          </code>
          <code style={code}>
            https://placet.app/new?title=Date%20du%20s%C3%A9minaire&amp;options=Juin|Septembre|Octobre&amp;method=two_round
          </code>
          <code style={code}>
            https://placet.app/new?title=D%C3%AEner%20d%27%C3%A9quipe&amp;dates=2026-07-12T20:00|2026-07-13T12:30|2026-07-13T19:00&amp;method=approval&amp;source=claude
          </code>
        </div>

        <h2 style={{ fontFamily: display, fontWeight: 800, fontSize: 24, marginTop: 34 }}>{t("apiTitle")}</h2>
        <div style={{ ...card, marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 14.5, color: "#2c3447", lineHeight: 1.55 }}>
            {t("apiIntro")}
          </p>
          <code style={code}>{`POST https://placet.app/api/poll-drafts
Content-Type: application/json

{
  "title": "On part où ce week-end ?",
  "description": "Budget 80 €/pers, départ vendredi soir.",
  "options": ["La montagne", "Le bord de mer", "La campagne"],
  "media": ["https://exemple.com/montagne.jpg", "", "https://exemple.com/campagne.jpg"],
  "method": "majority_judgment",
  "source": "mon-agent",
  "why": "Plusieurs options, un consensus est recherché"
}`}</code>
          <code style={code}>{`{ "draft_url": "https://placet.app/new?title=..." }`}</code>
        </div>

        <p style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.55, marginTop: 28 }}>
          {t("closedNote")}
        </p>
      </div>
    </div>
  );
}
