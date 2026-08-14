import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import FantomeCreate from "@/components/games/fantome/FantomeCreate";
import { hreflangAlternates } from "@/lib/seo/hreflang";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Fantome" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: hreflangAlternates("/games/fantome", locale),
  };
}

export default function FantomePage() {
  return <FantomeCreate />;
}
