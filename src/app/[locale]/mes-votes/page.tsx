import type { Metadata } from "next";
import MyFeedScreen from "@/components/scrutin/MyFeedScreen";

// Ce qu'on DEMANDE au connecté : les consultations qui lui sont adressées, et
// celles auxquelles il a déjà répondu. Ce qu'il ORGANISE vit dans /mes-scrutins.
// Non indexable — c'est une page strictement personnelle.
export const metadata: Metadata = { title: "Placet — Mes votes", robots: { index: false, follow: false } };

export default function MyVotesPage() {
  return <MyFeedScreen />;
}
