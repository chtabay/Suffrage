import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import UnanimoCreate from "@/components/games/unanimo/UnanimoCreate";
import { hreflangAlternates } from "@/lib/seo/hreflang";

// La page du jeu : c'est ici qu'on crée une partie, ou qu'on entre par un code.
// Indexable — un jeu doit pouvoir être trouvé pour lui-même, sans passer par
// Placet.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Unanimo" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: hreflangAlternates("/games/unanimo", locale),
  };
}

export default function UnanimoPage() {
  return <UnanimoCreate />;
}
