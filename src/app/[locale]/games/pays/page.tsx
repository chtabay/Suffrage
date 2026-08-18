import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PaysDuJour from "@/components/games/pays/PaysDuJour";
import { numeroDuJour } from "@/lib/games/pays/journee";
import { hreflangAlternates } from "@/lib/seo/hreflang";

// LA PAGE DU JEU. Une URL, pas de code de salle : le « code » est la date, et
// elle est la même pour tout le monde (spec §2.4).
//
// ⚠️ ELLE EST RENDUE À CHAQUE VISITE. Une page de jeu quotidien mise en cache au
// build servirait la journée du build jusqu'à la fin des temps ; et une page
// mise en cache une heure ferait basculer la journée avec une heure de retard
// pour une partie des joueurs. C'est le seul endroit du jeu où la date est lue.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Pays" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: hreflangAlternates("/games/pays", locale),
    // ⚠️ AUCUNE MÉTADONNÉE DÉRIVÉE DU PUZZLE (§15). Ni le pays, ni un critère, ni
    // même une image sociale engendrée à partir de la carte du jour : une carte
    // partiellement colorée en aperçu de lien suffirait à situer la réponse.
  };
}

export default async function PaysPage() {
  // Le numéro de journée est calculé ICI, côté serveur, en heure de Paris.
  // Le laisser au navigateur ferait dépendre le puzzle du fuseau — et de
  // l'horloge — de chaque joueur : « le même puzzle pour tout le monde » ne
  // survit pas à un client qui se croit demain.
  return <PaysDuJour jour={numeroDuJour()} />;
}
