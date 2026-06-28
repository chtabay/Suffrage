import type { Metadata } from "next";
import LivretVote from "@/components/scrutin/LivretVote";

export const metadata: Metadata = { title: "Placet" };

// Page de vote « livret » d'un événement (AG…) : le membre ouvre son lien nominatif
// et enchaîne les résolutions. Le jeton identifie (événement, membre).
export default async function EventVotePage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { token } = await params;
  return <LivretVote token={token} />;
}
