import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PlacetMark from "@/components/scrutin/PlacetMark";
import { PUBLIC_METHODS } from "@/lib/voting/methods";
import { SYSTEMS } from "@/lib/voting/systems";
import { ASSIGN_METHODS, ASSIGN_METHOD_KEYS } from "@/lib/assign/methods";

// Index SEO des méthodes (vote + affectation) : pages statiques crawlables,
// séparées de l'app — la galerie in-app reste l'expérience interactive.
const INK = "#16213A";
const CREAM = "#FBF6EC";
const display = "var(--font-display), 'Bricolage Grotesque', sans-serif";

// hreflang : chaque locale pointe vers son URL (fr = défaut sans préfixe). Sans ça,
// les 4 langues risquent d'être vues comme du contenu dupliqué.
const HREFLANG_LOCALES = ["fr", "en", "es", "pcm"] as const;
export function hreflangAlternates(path: string, locale: string) {
  const url = (loc: string) => (loc === "fr" ? path : `/${loc}${path}`);
  return {
    canonical: url(locale),
    languages: { ...Object.fromEntries(HREFLANG_LOCALES.map((l) => [l, url(l)])), "x-default": url("fr") },
  };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Gallery" });
  return {
    title: `${t("title")} — Placet`,
    description: t("subtitle"),
    robots: { index: true, follow: true },
    alternates: hreflangAlternates("/methodes", locale),
  };
}

export default async function MethodsIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Gallery" });
  const tm = await getTranslations({ locale, namespace: "Methods" });
  const ta = await getTranslations({ locale, namespace: "Assign" });

  const card = (href: string, icon: string, color: string, name: string, tagline: string, when?: string) => (
    <Link
      key={href}
      href={href}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 13,
        textDecoration: "none",
        color: INK,
        background: "#fff",
        border: `2.5px solid ${INK}`,
        borderRadius: 15,
        padding: "13px 16px",
        boxShadow: `4px 4px 0 ${color}`,
      }}
    >
      <span style={{ fontSize: 24, flex: "none" }}>{icon}</span>
      <span>
        <span style={{ display: "block", fontFamily: display, fontWeight: 800, fontSize: 16.5 }}>{name}</span>
        <span style={{ display: "block", fontSize: 13, color: "#5a6178", marginTop: 2, lineHeight: 1.4 }}>{tagline}</span>
        {when && (
          <span style={{ display: "block", fontSize: 12, color: "#7a8196", marginTop: 5, lineHeight: 1.4 }}>👉 {when}</span>
        )}
      </span>
    </Link>
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
        <p style={{ fontSize: 17, lineHeight: 1.55, color: "#3d4356", maxWidth: "62ch", margin: "12px 0 0" }}>{t("subtitle")}</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,340px),1fr))", gap: 14, marginTop: 28 }}>
          {PUBLIC_METHODS.map((m) => {
            const s = SYSTEMS[m.system];
            return card(`/methodes/${m.key}`, s.icon, s.color, tm(`${m.system}.name`), tm(`${m.system}.tagline`), tm(`whenToUse.${m.system}`));
          })}
        </div>

        <h2 style={{ fontFamily: display, fontWeight: 800, fontSize: "clamp(24px,4vw,34px)", letterSpacing: "-0.02em", margin: "44px 0 0" }}>
          🧩 {t("assignTitle")}
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.55, color: "#3d4356", maxWidth: "62ch", margin: "10px 0 0" }}>{ta("methodSubtitle")}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,340px),1fr))", gap: 14, marginTop: 22 }}>
          {ASSIGN_METHOD_KEYS.map((k) => {
            const def = ASSIGN_METHODS[k];
            return card(`/methodes/${k}`, def.icon, def.color, ta(`methods.${k}.name`), ta(`methods.${k}.tagline`));
          })}
        </div>
      </div>
    </div>
  );
}
