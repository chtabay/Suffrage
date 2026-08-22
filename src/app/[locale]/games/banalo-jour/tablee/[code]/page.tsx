import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import RejoindrePage from "@/components/games/banalo/RejoindrePage";

// REJOINDRE UNE TABLÉE — la page qu'un lien d'invitation ouvre.
//
// ⚠️ HORS DES MOTEURS, et pas seulement par pudeur : le code d'une tablée est
// une CAPACITÉ. Indexé, il donnerait à n'importe qui l'entrée d'un groupe qui ne
// l'a pas invité — exactement ce que « on entre par code » est censé empêcher.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "BanaloJour" });
  return {
    title: t("tablee.metaTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function TableePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <RejoindrePage code={code} />;
}
