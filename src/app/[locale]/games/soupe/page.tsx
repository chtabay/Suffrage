import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import LaSoupe from "@/components/games/soupe/LaSoupe";
import { hreflangAlternates } from "@/lib/seo/hreflang";

// LA PAGE DU JEU. Une URL, pas de code de salle, et pas de date non plus : la
// partie tient entièrement dans le navigateur, et rien n'en sort.
//
// ⚠️ AUCUN APPEL À LA BASE, NULLE PART. C'est le seul jeu du catalogue qui
// n'écrit rien : ni salle, ni journée, ni classement. Ce n'est pas un manque à
// combler — une partie de La Soupe n'a pas de score comparable (le rendement
// dépend du gabarit qu'on s'est choisi), et la ranger dans un tableau du jour
// inventerait une compétition que la règle ne calcule pas.

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Soupe" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: hreflangAlternates("/games/soupe", locale),
  };
}

export default function SoupePage() {
  return <LaSoupe />;
}
