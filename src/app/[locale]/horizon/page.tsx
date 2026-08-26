import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import HorizonClient from "@/components/horizon/HorizonClient";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Horizon" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      googleBot: { index: false, follow: false, noarchive: true, noimageindex: true },
    },
  };
}

export default function HorizonPage() {
  return <HorizonClient />;
}
