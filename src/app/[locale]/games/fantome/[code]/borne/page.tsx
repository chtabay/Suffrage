import type { Metadata } from "next";
import FantomeBorne from "@/components/games/fantome/FantomeBorne";

// L'écran posé dans une pièce. NOINDEX, évidemment : c'est un meuble, pas une
// page. Il s'appaire une fois et reste allumé toute la soirée.
export const metadata: Metadata = {
  title: "Un portrait du manoir",
  robots: { index: false, follow: false },
};

export default async function FantomeBornePage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { code } = await params;
  return <FantomeBorne code={code.toUpperCase()} />;
}
