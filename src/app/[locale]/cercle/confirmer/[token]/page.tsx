import type { Metadata } from "next";
import CircleConfirm from "@/components/scrutin/CircleConfirm";

// 2e temps du double opt-in. La page ne confirme rien à l'affichage : elle porte
// un bouton qui fait un POST. Un GET serait déclenché par les anti-phishing
// d'entreprise, qui valideraient l'adhésion à la place du destinataire.
export const metadata: Metadata = { title: "Placet", robots: { index: false, follow: false } };

export default async function ConfirmPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { token } = await params;
  return <CircleConfirm token={token} />;
}
