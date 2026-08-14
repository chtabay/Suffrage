import type { Metadata } from "next";
import FantomeRoom from "@/components/games/fantome/FantomeRoom";

// Une partie en cours. NOINDEX : une salle est éphémère (purgée au bout de sept
// jours) et n'a de sens que pour la maisonnée qui l'a dans les mains.
export const metadata: Metadata = {
  title: "La Nuit du Fantôme",
  robots: { index: false, follow: false },
};

export default async function FantomeRoomPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { code } = await params;
  return <FantomeRoom code={code.toUpperCase()} />;
}
