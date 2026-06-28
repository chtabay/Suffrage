import type { Metadata } from "next";
import JoinForm from "@/components/scrutin/JoinForm";

export const metadata: Metadata = { title: "Placet" };

// Page publique d'inscription ouverte : un visiteur s'inscrit à un événement via le
// lien partagé (enroll_token). Il reçoit son lien de vote personnel PAR EMAIL (double
// opt-in) — le jeton n'est jamais exposé ici.
export default async function JoinPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { token } = await params;
  return <JoinForm token={token} />;
}
