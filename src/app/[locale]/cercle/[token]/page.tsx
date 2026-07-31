import type { Metadata } from "next";
import CircleJoinForm from "@/components/scrutin/CircleJoinForm";

// Page publique d'adhésion à un cercle (join_token de l'espace). Non indexable :
// un cercle se rejoint par un lien qu'on vous a donné, pas par une recherche.
export const metadata: Metadata = { title: "Placet", robots: { index: false, follow: false } };

export default async function CirclePage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { token } = await params;
  return <CircleJoinForm token={token} />;
}
