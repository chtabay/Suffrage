import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import BanaloDuJour from "@/components/games/banalo/BanaloDuJour";
import { numeroDuJour } from "@/lib/games/banalo/jour";
import { hreflangAlternates } from "@/lib/seo/hreflang";

// LA PAGE DU MODE QUOTIDIEN. Une URL, pas de code de salle : le « code » est la
// journée, la même pour tout le monde — comme Cinq sur cinq.
//
// ⚠️ RENDUE À CHAQUE VISITE. Une page de jeu quotidien mise en cache au build
// servirait la journée du build jusqu'à la fin des temps. Et ici la charnière
// n'est pas minuit mais 11 h 30 : un cache d'une heure ferait basculer la
// question en plein créneau de déjeuner pour une partie des joueurs.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "BanaloJour" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: hreflangAlternates("/games/banalo-jour", locale),
    // Aucune métadonnée dérivée de la journée : la question est localisée, donc
    // une description engendrée poserait la question française à un lien
    // espagnol. Et il n'y a rien à cacher — mais rien à gagner non plus.
  };
}

export default async function BanaloJourPage() {
  // Le numéro est calculé ICI, côté serveur, en heure de Paris. Le laisser au
  // navigateur ferait dépendre la question de l'horloge de chaque joueur : « la
  // même question pour tout le monde » ne survit pas à un client qui se croit
  // demain — et la médiane du jour se bâtirait sur deux questions à la fois.
  return <BanaloDuJour jour={numeroDuJour()} />;
}
