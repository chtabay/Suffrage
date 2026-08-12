import type { Metadata } from "next";
import AlibiRoom from "@/components/games/alibi/AlibiRoom";

// Une partie en cours. NOINDEX : une salle est éphémère (purgée au bout de sept
// jours) et n'a de sens que pour les personnes qui l'ont dans les mains.
export const metadata: Metadata = {
  title: "Alibi",
  robots: { index: false, follow: false },
};

export default async function AlibiRoomPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { code } = await params;
  return <AlibiRoom code={code.toUpperCase()} />;
}
