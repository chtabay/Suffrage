import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import RodeursCreate from "@/components/games/rodeurs/RodeursCreate";
import { hreflangAlternates } from "@/lib/seo/hreflang";

// La page du jeu : on ouvre une maison, ou on entre par un code. Indexable —
// un jeu doit pouvoir être trouvé pour lui-même, sans passer par Placet.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Rodeurs" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: hreflangAlternates("/games/rodeurs", locale),
  };
}

export default function RodeursPage() {
  return <RodeursCreate />;
}
