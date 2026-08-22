import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import HistoriquePage from "@/components/games/banalo/HistoriquePage";
import { numeroDuJour } from "@/lib/games/banalo/jour";

// MES JOURNÉES — la page personnelle d'un compte.
//
// ⚠️ HORS DES MOTEURS. Elle ne montre rien de public : c'est le passé d'un
// joueur, et elle est vide pour qui n'est pas connecté. L'indexer donnerait un
// résultat de recherche qui ne dit rien à personne.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "BanaloJour" });
  return {
    title: t("historique.metaTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function BanaloHistoriquePage() {
  // ⚠️ LE NUMÉRO EST CALCULÉ ICI, en heure de Paris, comme sur la page de jeu.
  // Il ne sert pas à jouer mais à savoir si la série est VIVANTE : la base rend
  // la dernière journée de la suite, jamais un verdict.
  return <HistoriquePage jour={numeroDuJour()} />;
}
