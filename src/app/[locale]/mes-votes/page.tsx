import type { Metadata } from "next";
import MyFeedScreen from "@/components/scrutin/MyFeedScreen";

// Vue du connecté : ce qui l'attend, ce qu'il a ouvert, son historique.
// Non indexable — c'est une page strictement personnelle.
export const metadata: Metadata = { title: "Placet — Mes votes", robots: { index: false, follow: false } };

export default function MyVotesPage() {
  return <MyFeedScreen />;
}
