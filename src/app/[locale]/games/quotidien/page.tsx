import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Quotidien from "@/components/games/quotidien/Quotidien";

// LA PAGE COMMUNE DES JEUX QUOTIDIENS.
//
// ⚠️ HORS DES MOTEURS : elle ne montre que le passé d'un joueur, et elle est
// vide pour qui n'est pas connecté. L'indexer donnerait un résultat de recherche
// qui ne dit rien à personne.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "JeuxQuotidiens" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default function QuotidienPage() {
  return <Quotidien />;
}
