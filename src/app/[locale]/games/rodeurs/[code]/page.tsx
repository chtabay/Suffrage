import type { Metadata } from "next";
import RodeursRoom from "@/components/games/rodeurs/RodeursRoom";

// Une partie en cours. NOINDEX : une salle est éphémère (purgée au bout de sept
// jours) et n'a de sens que pour la maisonnée qui l'a dans les mains.
export const metadata: Metadata = {
  title: "Rôdeurs",
  robots: { index: false, follow: false },
};

export default async function RodeursRoomPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { code } = await params;
  return <RodeursRoom code={code.toUpperCase()} />;
}
