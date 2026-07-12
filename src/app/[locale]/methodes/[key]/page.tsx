import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PlacetMark from "@/components/scrutin/PlacetMark";
import { PUBLIC_METHODS, publicMethodToSystem } from "@/lib/voting/methods";
import { SYSTEMS } from "@/lib/voting/systems";
import { ASSIGN_METHODS, ASSIGN_METHOD_KEYS, isAssignMethod } from "@/lib/assign/methods";

// Fiche SEO d'une méthode (vote ou affectation) : contenu des fiches i18n
// existantes, page statique crawlable, CTA vers /new pré-configuré.
const INK = "#16213A";
const CREAM = "#FBF6EC";
const GREENTXT = "#1f8a4c";
const REDTXT = "#c0392b";
const display = "var(--font-display), 'Bricolage Grotesque', sans-serif";

interface Fiche {
  icon: string;
  color: string;
  name: string;
  tagline: string;
  how: string;
  pros: string[];
  cons: string[];
  whenToUse?: string;
  cta: string;
  ctaHref: string;
}

async function loadFiche(locale: string, key: string): Promise<Fiche | null> {
  const tg = await getTranslations({ locale, namespace: "Gallery" });
  const system = publicMethodToSystem(key);
  if (system) {
    const tm = await getTranslations({ locale, namespace: "Methods" });
    const s = SYSTEMS[system];
    return {
      icon: s.icon,
      color: s.color,
      name: tm(`${system}.name`),
      tagline: tm(`${system}.tagline`),
      how: tm(`${system}.how`),
      pros: tm.raw(`${system}.pros`) as string[],
      cons: tm.raw(`${system}.cons`) as string[],
      whenToUse: tm(`whenToUse.${system}`),
      cta: tg("launchWithMethod"),
      ctaHref: `/new?method=${key}`,
    };
  }
  if (isAssignMethod(key)) {
    const ta = await getTranslations({ locale, namespace: "Assign" });
    const def = ASSIGN_METHODS[key];
    return {
      icon: def.icon,
      color: def.color,
      name: ta(`methods.${key}.name`),
      tagline: ta(`methods.${key}.tagline`),
      how: ta(`methods.${key}.how`),
      pros: ta.raw(`methods.${key}.pros`) as string[],
      cons: ta.raw(`methods.${key}.cons`) as string[],
      cta: tg("launchAssign"),
      ctaHref: `/new?assign=${key}`,
    };
  }
  return null;
}

export function generateStaticParams() {
  return [...PUBLIC_METHODS.map((m) => ({ key: m.key })), ...ASSIGN_METHOD_KEYS.map((k) => ({ key: k }))];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; key: string }>;
}): Promise<Metadata> {
  const { locale, key } = await params;
  const fiche = await loadFiche(locale, key);
  if (!fiche) return {};
  return {
    title: `${fiche.name} — Placet`,
    description: `${fiche.tagline} ${fiche.how}`.slice(0, 160),
    robots: { index: true, follow: true },
  };
}

export default async function MethodPage({ params }: { params: Promise<{ locale: string; key: string }> }) {
  const { locale, key } = await params;
  const fiche = await loadFiche(locale, key);
  if (!fiche) notFound();
  const tg = await getTranslations({ locale, namespace: "Gallery" });

  return (
    <div style={{ minHeight: "100vh", background: CREAM, color: INK, fontFamily: "var(--font-body), sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 22px 90px" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: INK }}>
          <PlacetMark size={34} />
          <span style={{ fontFamily: display, fontWeight: 800, fontSize: 20 }}>Placet</span>
        </Link>

        <div
          style={{
            marginTop: 26,
            background: "#fff",
            border: `2.5px solid ${INK}`,
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: `6px 6px 0 ${fiche.color}`,
          }}
        >
          <div style={{ background: fiche.color, padding: "22px 24px", borderBottom: `2.5px solid ${INK}`, display: "flex", alignItems: "center", gap: 15 }}>
            <div style={{ width: 54, height: 54, borderRadius: 14, border: `2.5px solid ${INK}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flex: "none" }}>
              {fiche.icon}
            </div>
            <div>
              <h1 style={{ fontFamily: display, fontWeight: 800, fontSize: "clamp(22px,4vw,32px)", color: "#fff", margin: 0, lineHeight: 1.05, textShadow: "1.5px 1.5px 0 rgba(0,0,0,0.25)" }}>
                {fiche.name}
              </h1>
              <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.92)", margin: "4px 0 0" }}>{fiche.tagline}</p>
            </div>
          </div>
          <div style={{ padding: "22px 24px" }}>
            <p style={{ fontSize: 16, lineHeight: 1.6, margin: 0, color: "#2c3447" }}>{fiche.how}</p>
            {fiche.whenToUse && (
              <p style={{ fontSize: 14.5, lineHeight: 1.5, margin: "14px 0 0", color: "#3d4356", fontWeight: 600 }}>→ {fiche.whenToUse}</p>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 18, marginTop: 20 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: GREENTXT, marginBottom: 8 }}>{tg("pros")}</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.55, color: "#2c3447" }}>
                  {fiche.pros.map((p, i) => (
                    <li key={i} style={{ marginBottom: 5 }}>{p}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: REDTXT, marginBottom: 8 }}>{tg("cons")}</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.55, color: "#2c3447" }}>
                  {fiche.cons.map((c, i) => (
                    <li key={i} style={{ marginBottom: 5 }}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
            <Link
              href={fiche.ctaHref}
              style={{
                display: "block",
                marginTop: 24,
                textAlign: "center",
                textDecoration: "none",
                fontFamily: display,
                fontWeight: 700,
                fontSize: 15.5,
                border: `2.5px solid ${INK}`,
                background: fiche.color,
                color: "#fff",
                padding: "13px 20px",
                borderRadius: 12,
              }}
            >
              {fiche.cta}
            </Link>
          </div>
        </div>

        <p style={{ marginTop: 22 }}>
          <Link href="/methodes" style={{ color: INK, fontWeight: 700, fontSize: 14.5 }}>
            ← {tg("title")}
          </Link>
        </p>
      </div>
    </div>
  );
}
