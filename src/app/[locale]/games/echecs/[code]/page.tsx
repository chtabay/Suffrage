import type { Metadata } from "next";
import EchecsRoom from "@/components/games/echecs/EchecsRoom";

// Une partie en cours. NOINDEX : une salle est éphémère (purgée au bout de sept
// jours) et n'a de sens que pour les deux équipes qui l'ont dans les mains.
export const metadata: Metadata = {
  title: "Échecs collaboratifs",
  robots: { index: false, follow: false },
};

export default async function EchecsRoomPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { code } = await params;
  return <EchecsRoom code={code.toUpperCase()} />;
}
