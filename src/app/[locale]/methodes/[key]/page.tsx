import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PlacetMark from "@/components/scrutin/PlacetMark";
import { PUBLIC_METHODS, publicMethodToSystem } from "@/lib/voting/methods";
import { SYSTEMS } from "@/lib/voting/systems";
import { ASSIGN_METHODS, ASSIGN_METHOD_KEYS, isAssignMethod } from "@/lib/assign/methods";
import { deepFiche, RELATED, type DeepFiche } from "@/content/methods";
import { SOURCES } from "@/content/methods/sources";
import { hreflangAlternates } from "@/lib/seo/hreflang";

// Fiche d'une méthode (vote ou affectation) : la fiche courte i18n sert d'en-tête,
// puis le contenu de fond (histoire, mécanique, exemple chiffré, usages, limites,
// FAQ) déroule la page. Statique, crawlable, avec JSON-LD FAQ + fil d'Ariane.
const INK = "#16213A";
const CREAM = "#FBF6EC";
const GREENTXT = "#1f8a4c";
const REDTXT = "#c0392b";
const BODY = "#2c3447";
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

/** Nom affichable d'une méthode voisine, pour le maillage « à voir aussi ». */
async function relatedName(locale: string, key: string): Promise<string | null> {
  const system = publicMethodToSystem(key);
  if (system) {
    const tm = await getTranslations({ locale, namespace: "Methods" });
    return tm(`${system}.name`);
  }
  if (isAssignMethod(key)) {
    const ta = await getTranslations({ locale, namespace: "Assign" });
    return ta(`methods.${key}.name`);
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
  const deep = deepFiche(locale, key);
  return {
    title: `${fiche.name} — Placet`,
    // Le chapô de fond est écrit pour être lu en résultat de recherche ; la
    // fiche courte ne sert que de repli.
    description: (deep?.summary ?? `${fiche.tagline} ${fiche.how}`).slice(0, 300),
    robots: { index: true, follow: true },
    alternates: hreflangAlternates(`/methodes/${key}`, locale),
  };
}

const h2 = {
  fontFamily: display,
  fontWeight: 800 as const,
  fontSize: "clamp(20px,3.4vw,27px)",
  letterSpacing: "-0.02em",
  margin: "38px 0 0",
  scrollMarginTop: 16,
};
const para = { fontSize: 16, lineHeight: 1.65, color: BODY, margin: "13px 0 0" };

export default async function MethodPage({ params }: { params: Promise<{ locale: string; key: string }> }) {
  const { locale, key } = await params;
  const fiche = await loadFiche(locale, key);
  if (!fiche) notFound();
  const tg = await getTranslations({ locale, namespace: "Gallery" });
  const td = await getTranslations({ locale, namespace: "Deep" });
  const deep: DeepFiche | undefined = deepFiche(locale, key);
  const sources = SOURCES[key] ?? [];
  const related = await Promise.all(
    (RELATED[key] ?? []).map(async (k) => ({ key: k, name: await relatedName(locale, k) })),
  );

  const sections = deep
    ? ([
        ["mechanics", td("mechanics")],
        ["example", td("example")],
        ["history", td("history")],
        ["usecases", td("useCases")],
        ["limits", td("limits")],
        ["faq", td("faq")],
        ...(sources.length ? [["sources", td("sources")]] : []),
      ] as [string, string][])
    : [];

  // JSON-LD : la FAQ est le format le plus lisible par les moteurs et les LLM,
  // et le fil d'Ariane replace la fiche dans l'arborescence du site.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Placet", item: "https://placet.app/" },
          { "@type": "ListItem", position: 2, name: tg("title"), item: "https://placet.app/methodes" },
          { "@type": "ListItem", position: 3, name: fiche.name },
        ],
      },
      // `citation` rend la bibliographie exploitable par les moteurs et les LLM :
      // la page ne dit plus seulement « d'après Gale et Shapley », elle le prouve.
      ...(sources.length
        ? [
            {
              "@type": "Article",
              headline: fiche.name,
              inLanguage: locale,
              citation: sources.map((s) => ({
                "@type": "CreativeWork",
                name: s.t,
                // `author` en TEXTE et non en Person : une entrée porte souvent
                // plusieurs auteurs, et en faire une seule Person inventerait
                // une personne qui n'existe pas.
                ...(s.a ? { author: s.a } : {}),
                datePublished: s.y,
                publisher: s.w,
                ...(s.url ? { url: s.url } : {}),
              })),
            },
          ]
        : []),
      ...(deep
        ? [
            {
              "@type": "FAQPage",
              mainEntity: deep.faq.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ]
        : []),
    ],
  };

  return (
    <div style={{ minHeight: "100vh", background: CREAM, color: INK, fontFamily: "var(--font-body), sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 22px 90px" }}>
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
            {deep && <p style={{ fontSize: 17.5, lineHeight: 1.55, margin: 0, color: INK, fontWeight: 600 }}>{deep.summary}</p>}
            <p style={{ ...para, marginTop: deep ? 14 : 0 }}>{fiche.how}</p>
            {fiche.whenToUse && (
              <p style={{ fontSize: 14.5, lineHeight: 1.5, margin: "14px 0 0", color: "#3d4356", fontWeight: 600 }}>→ {fiche.whenToUse}</p>
            )}
            <Link
              href={fiche.ctaHref}
              style={{
                display: "block",
                marginTop: 20,
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

        {/* Sommaire : repère de lecture sur une page longue, et autant de liens
            internes vers les ancres pour les moteurs. */}
        {sections.length > 0 && (
          <nav aria-label={td("toc")} style={{ marginTop: 26 }}>
            <div style={{ fontFamily: display, fontWeight: 800, fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", color: "#5a6178" }}>
              {td("toc")}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 9 }}>
              {sections.map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: "none",
                    color: INK,
                    background: "#fff",
                    border: `2px solid ${INK}`,
                    borderRadius: 999,
                    padding: "5px 12px",
                  }}
                >
                  {label}
                </a>
              ))}
            </div>
          </nav>
        )}

        {deep && (
          <article>
            <h2 id="mechanics" style={h2}>
              {td("mechanics")}
            </h2>
            {deep.mechanics.map((p, i) => (
              <p key={i} style={para}>
                {p}
              </p>
            ))}

            <h2 id="example" style={h2}>
              {td("example")}
            </h2>
            <p style={para}>{deep.example.intro}</p>
            <div style={{ overflowX: "auto", marginTop: 14, border: `2.5px solid ${INK}`, borderRadius: 14, background: "#fff" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14.5 }}>
                <thead>
                  <tr>
                    {deep.example.head.map((h, i) => (
                      <th
                        key={i}
                        style={{
                          textAlign: "left",
                          fontFamily: display,
                          fontWeight: 800,
                          padding: "11px 14px",
                          borderBottom: `2.5px solid ${INK}`,
                          background: fiche.color,
                          color: "#fff",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deep.example.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          style={{
                            padding: "10px 14px",
                            borderTop: i ? "1px solid #e6e2d8" : "none",
                            color: BODY,
                            fontWeight: j === 0 ? 700 : 400,
                          }}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ol style={{ margin: "14px 0 0", paddingLeft: 20, fontSize: 15.5, lineHeight: 1.6, color: BODY }}>
              {deep.example.steps.map((s, i) => (
                <li key={i} style={{ marginBottom: 6 }}>
                  {s}
                </li>
              ))}
            </ol>
            <p
              style={{
                margin: "16px 0 0",
                padding: "14px 16px",
                background: "#fff",
                border: `2.5px solid ${INK}`,
                borderRadius: 14,
                boxShadow: `4px 4px 0 ${fiche.color}`,
                fontSize: 15.5,
                lineHeight: 1.6,
                color: BODY,
              }}
            >
              {deep.example.result}
            </p>

            <h2 id="history" style={h2}>
              {td("history")}
            </h2>
            {deep.history.map((p, i) => (
              <p key={i} style={para}>
                {p}
              </p>
            ))}

            <h2 id="usecases" style={h2}>
              {td("useCases")}
            </h2>
            <ul style={{ margin: "13px 0 0", paddingLeft: 20, fontSize: 15.5, lineHeight: 1.6, color: BODY }}>
              {deep.useCases.map((u, i) => (
                <li key={i} style={{ marginBottom: 6 }}>
                  {u}
                </li>
              ))}
            </ul>

            <h2 id="limits" style={h2}>
              {td("limits")}
            </h2>
            {/* Les points forts/faibles de la fiche courte restent la lecture
                rapide ; les limites détaillées les développent juste après. */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 18, marginTop: 14 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: GREENTXT, marginBottom: 8 }}>{tg("pros")}</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.55, color: BODY }}>
                  {fiche.pros.map((p, i) => (
                    <li key={i} style={{ marginBottom: 5 }}>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: REDTXT, marginBottom: 8 }}>{tg("cons")}</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.55, color: BODY }}>
                  {fiche.cons.map((c, i) => (
                    <li key={i} style={{ marginBottom: 5 }}>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
              {deep.limits.map((l, i) => (
                <div key={i} style={{ background: "#fff", border: `2px solid ${INK}`, borderRadius: 13, padding: "13px 15px" }}>
                  <div style={{ fontFamily: display, fontWeight: 800, fontSize: 15.5 }}>{l.t}</div>
                  <div style={{ fontSize: 15, lineHeight: 1.55, color: BODY, marginTop: 4 }}>{l.d}</div>
                </div>
              ))}
            </div>

            <h2 id="faq" style={h2}>
              {td("faq")}
            </h2>
            <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
              {deep.faq.map((f, i) => (
                <div key={i}>
                  <h3 style={{ fontFamily: display, fontWeight: 800, fontSize: 16.5, margin: 0 }}>{f.q}</h3>
                  <p style={{ ...para, marginTop: 6 }}>{f.a}</p>
                </div>
              ))}
            </div>

            {/* Sources : ce qui sépare une fiche vérifiable d'un texte d'opinion.
                Sans langue (une référence ne se traduit pas) — d'où le rendu
                typographique neutre plutôt qu'une phrase à trous localisée. */}
            {sources.length > 0 && (
              <>
                <h2 id="sources" style={h2}>
                  {td("sources")}
                </h2>
                <p style={{ ...para, fontSize: 14.5, color: "#5a6178" }}>{td("sourcesNote")}</p>
                <ol style={{ margin: "14px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 11 }}>
                  {sources.map((s, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: 14.5,
                        lineHeight: 1.5,
                        color: BODY,
                        paddingLeft: 14,
                        borderLeft: `3px solid ${fiche.color}`,
                      }}
                    >
                      {s.a && <span style={{ fontWeight: 700, color: INK }}>{s.a}</span>}
                      {s.a && ", "}
                      <cite style={{ fontStyle: "italic" }}>{s.t}</cite>, {s.w}, {s.y}.
                      {s.url && (
                        <>
                          {" "}
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener nofollow"
                            style={{ color: INK, fontWeight: 700, whiteSpace: "nowrap" }}
                          >
                            {s.url.includes("doi.org") ? "DOI ↗" : "↗"}
                          </a>
                        </>
                      )}
                    </li>
                  ))}
                </ol>
              </>
            )}
          </article>
        )}

        {/* Maillage : trois méthodes voisines, pour continuer la lecture. */}
        {related.length > 0 && (
          <>
            <h2 style={h2}>{td("related")}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginTop: 14 }}>
              {related.map(
                (r) =>
                  r.name && (
                    <Link
                      key={r.key}
                      href={`/methodes/${r.key}`}
                      style={{
                        display: "block",
                        textDecoration: "none",
                        color: INK,
                        background: "#fff",
                        border: `2.5px solid ${INK}`,
                        borderRadius: 13,
                        padding: "12px 15px",
                        fontFamily: display,
                        fontWeight: 700,
                        fontSize: 15.5,
                      }}
                    >
                      {r.name} →
                    </Link>
                  ),
              )}
            </div>
          </>
        )}

        <p style={{ marginTop: 30 }}>
          <Link href="/methodes" style={{ color: INK, fontWeight: 700, fontSize: 14.5 }}>
            ← {tg("title")}
          </Link>
        </p>
      </div>
    </div>
  );
}
