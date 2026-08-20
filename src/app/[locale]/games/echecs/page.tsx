import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import EchecsCreate from "@/components/games/echecs/EchecsCreate";
import { hreflangAlternates } from "@/lib/seo/hreflang";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Echecs" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: hreflangAlternates("/games/echecs", locale),
  };
}

export default function EchecsPage() {
  return <EchecsCreate />;
}
