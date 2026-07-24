import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PlacetMark from "@/components/scrutin/PlacetMark";
import { cardIsOpen, fetchPublicPollsServer } from "@/lib/db/publicFeed";
import { intlLocale } from "@/i18n/locales";

// Feed public : page ISR (60 s) listant les scrutins PUBLIÉS par leurs créateurs.
// La RPC ne renvoie que les scrutins publics + approuvés — aucun risque de fuite.
export const revalidate = 60;

const INK = "#16213A";
const CREAM = "#FBF6EC";
const GREEN = "#5DBB2E";
const MUTED = "#5b6379";
const SUBINK = "#3a4258";
const CORAL = "#FF5E5B";
const display = "var(--font-display), 'Bricolage Grotesque', sans-serif";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Explore" });
  return {
    title: `${t("title")} — Placet`,
    description: t("subtitle"),
    robots: { index: true, follow: true },
  };
}

export default async function ExplorerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Explore" });
  const polls = await fetchPublicPollsServer(24);
  const fmt = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", year: "numeric" });

  const badge = (open: boolean) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: open ? GREEN : INK,
        color: "#fff",
        border: `2px solid ${INK}`,
        borderRadius: 20,
        padding: "3px 10px",
        fontWeight: 700,
        fontSize: 11.5,
      }}
    >
      {open ? `● ${t("openBadge")}` : `■ ${t("closedBadge")}`}
    </span>
  );

  return (
    <div style={{ minHeight: "100vh", background: CREAM, color: INK, fontFamily: "var(--font-body), sans-serif" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 22px 90px" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: INK }}>
          <PlacetMark size={34} />
          <span style={{ fontFamily: display, fontWeight: 800, fontSize: 20 }}>Placet</span>
        </Link>
        <h1 style={{ fontFamily: display, fontWeight: 800, fontSize: "clamp(30px,5vw,46px)", letterSpacing: "-0.03em", margin: "26px 0 0" }}>
          {t("title")}
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.55, color: SUBINK, maxWidth: "62ch", margin: "12px 0 0" }}>{t("subtitle")}</p>

        {polls.length === 0 ? (
          // Feed vide : invitation à publier plutôt qu'une page morte.
          <div
            style={{
              marginTop: 32,
              background: "#fff",
              border: `2.5px solid ${INK}`,
              borderRadius: 18,
              padding: "26px 24px",
              boxShadow: `5px 5px 0 ${INK}`,
              textAlign: "center",
            }}
          >
            <div style={{ fontFamily: display, fontWeight: 800, fontSize: 20 }}>🗳️ {t("empty")}</div>
            <Link
              href="/new"
              style={{
                display: "inline-block",
                marginTop: 16,
                fontFamily: display,
                fontWeight: 700,
                fontSize: 15,
                textDecoration: "none",
                border: `2.5px solid ${INK}`,
                background: CORAL,
                color: "#fff",
                padding: "12px 20px",
                borderRadius: 12,
                boxShadow: `4px 4px 0 ${INK}`,
              }}
            >
              {t("emptyCta")}
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,300px),1fr))", gap: 14, marginTop: 28 }}>
            {polls.map((p) => {
              const open = cardIsOpen(p);
              return (
                <Link
                  key={p.token}
                  href={`/v/${p.token}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    textDecoration: "none",
                    color: INK,
                    background: "#fff",
                    border: `2.5px solid ${INK}`,
                    borderRadius: 15,
                    padding: "15px 16px",
                    boxShadow: `4px 4px 0 ${open ? GREEN : INK}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {badge(open)}
                    <span style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>{fmt.format(new Date(p.published_at))}</span>
                  </div>
                  <div style={{ fontFamily: display, fontWeight: 800, fontSize: 17, lineHeight: 1.2 }}>{p.question}</div>
                  <div style={{ marginTop: "auto", fontSize: 12.5, color: MUTED, fontWeight: 600 }}>
                    🗳 {t("ballots", { count: p.ballot_count })} · {t("options", { count: p.options.length })}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
