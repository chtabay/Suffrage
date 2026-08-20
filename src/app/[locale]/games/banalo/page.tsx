import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import BanaloCreate from "@/components/games/banalo/BanaloCreate";
import { hreflangAlternates } from "@/lib/seo/hreflang";

// La page du jeu : c'est ici qu'on crée une partie, ou qu'on entre par un code.
// Indexable — un jeu doit pouvoir être trouvé pour lui-même, sans passer par
// Placet.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Banalo" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: hreflangAlternates("/games/banalo", locale),
  };
}

export default function BanaloPage() {
  return <BanaloCreate />;
}
