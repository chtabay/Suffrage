import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import MarketExplorer from "@/components/scrutin/MarketExplorer";
import Nav from "@/components/scrutin/Nav";
import { fetchPublicPollsServer } from "@/lib/db/publicFeed";

// Feed public : page ISR (60 s) listant les scrutins PUBLIÉS par leurs créateurs.
// La RPC ne renvoie que les scrutins publics + approuvés — aucun risque de fuite.
export const revalidate = 60;

// Valeurs dupliquées ici parce que cette page serveur n'importe pas le thème —
// à réunifier un jour. GREEN, GREENTXT et MUTED en sont partis avec le gabarit
// de carte : plus une seule couleur déclarée sans être posée quelque part.
const INK = "#16213A";
const CREAM = "#FBF6EC";
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
  const polls = await fetchPublicPollsServer(24);
  // Le gabarit de carte vivait ici ; il est passé dans MarketExplorer avec la
  // refonte marché. Ce qui restait — fmt, INTENTS, intentBadge, badge, et le
  // namespace Home qu'ils seuls consommaient — n'était plus rendu nulle part.

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

        {/* La grille interactive — recherche, facettes, épingles, pagination.
            Rendue en HTML par le serveur aussi (composant client SSR) : le SEO
            ne perd rien, voir docs/participant-spec.md §5 bis.

            ELLE EST RENDUE MÊME QUAND LE CATALOGUE PUBLIC EST VIDE. Avant, un
            catalogue vide court-circuitait la grille : un connecté membre d'un
            cercle se serait alors vu répondre « aucun scrutin public » alors
            qu'une consultation l'attendait juste en dessous. L'état vide du
            catalogue est désormais rendu par la grille elle-même, qui sait, elle,
            distinguer « rien de public » de « rien qui corresponde ». */}
        <MarketExplorer initialCards={polls} />

        {/* Conversion découvreur → créateur : point de sortie vers /new. */}
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
      </div>
    </div>
  );
}
