import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import MarketExplorer from "@/components/scrutin/MarketExplorer";
import Nav from "@/components/scrutin/Nav";
import { fetchPublicPollsServer } from "@/lib/db/publicFeed";
import { intlLocale } from "@/i18n/locales";

// Feed public : page ISR (60 s) listant les scrutins PUBLIÉS par leurs créateurs.
// La RPC ne renvoie que les scrutins publics + approuvés — aucun risque de fuite.
export const revalidate = 60;

const INK = "#16213A";
const CREAM = "#FBF6EC";
// GREEN reste l'aplat vif (ombre portée), GREENTXT le vert LISIBLE : blanc sur
// #5DBB2E ne fait que 2,44:1, sous la barre AA de 4,5. Valeurs dupliquées ici
// parce que cette page serveur n'importe pas le thème — à réunifier un jour.
const GREEN = "#5DBB2E";
const GREENTXT = "#1c7f45";
const MUTED = "#5b6379";
const SUBINK = "#3a4258";
const CORAL = "#E23E3B";
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
  const th = await getTranslations({ locale, namespace: "Home" });
  const polls = await fetchPublicPollsServer(24);
  // Le gabarit de carte vivait ici ; il est passé dans MarketExplorer avec la
  // refonte marché. Ce qui restait — fmt, INTENTS, intentBadge, badge — n'était
  // plus rendu nulle part : deux définitions d'une même carte, dont une morte.

  return (
    <div style={{ minHeight: "100vh", background: CREAM, color: INK, fontFamily: "var(--font-body), sans-serif" }}>
      {/* Navigation complète, y compris ici : /explorer n'offrait qu'un logo, ce
          qui en faisait une impasse pour un connecté. Nav lit la session
          elle-même, donc s'insère dans une page serveur sans rien lui passer. */}
      <Nav />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 22px 90px" }}>
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
          <>
          {/* La grille interactive — recherche, épingles, pagination. Rendue en
              HTML par le serveur aussi (composant client SSR) : le SEO ne perd
              rien, voir docs/participant-spec.md §5 bis. */}
          <MarketExplorer initialCards={polls} />
          {/* Conversion découvreur → créateur : point de sortie vers /new même
              quand le feed est peuplé. */}
          <div style={{ marginTop: 30, textAlign: "center" }}>
            <Link
              href="/new"
              style={{
                display: "inline-block",
                fontFamily: display,
                fontWeight: 700,
                fontSize: 15,
                textDecoration: "none",
                border: `2.5px solid ${INK}`,
                background: CORAL,
                color: "#fff",
                padding: "12px 22px",
                borderRadius: 12,
                boxShadow: `4px 4px 0 ${INK}`,
              }}
            >
              {t("emptyCta")}
            </Link>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
