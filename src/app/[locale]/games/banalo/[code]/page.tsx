import type { Metadata } from "next";
import BanaloRoom from "@/components/games/banalo/BanaloRoom";

// Une partie en cours. NOINDEX : une salle est éphémère (purgeable au bout de
// quelques jours) et n'a de sens que pour les six personnes qui l'ont dans les
// mains. C'est le même raisonnement que pour une page de vote privée.
export const metadata: Metadata = {
  title: "Banalo",
  robots: { index: false, follow: false },
};

export default async function BanaloRoomPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { code } = await params;
  return <BanaloRoom code={code.toUpperCase()} />;
}
