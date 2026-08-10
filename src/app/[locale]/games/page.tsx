import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import GamesHome from "@/components/games/GamesHome";
import { hreflangAlternates } from "@/lib/seo/hreflang";

// La porte des jeux. Indexable : c'est une page d'entrée publique, et c'est par
// elle qu'on découvre Unanimo sans connaître Placet.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Games" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: hreflangAlternates("/games", locale),
  };
}

export default function GamesPage() {
  return <GamesHome />;
}
