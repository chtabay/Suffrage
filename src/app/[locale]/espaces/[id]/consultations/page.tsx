import type { Metadata } from "next";
import ConsultationsManager from "@/components/scrutin/ConsultationsManager";

// Vue de GESTION des consultations : toutes, triées PAR ÉTAT et non par date.
// `listEvents` trie `created_at desc`, si bien qu'une consultation ouverte se
// cache sous trois brouillons plus récents — c'est l'inverse de ce qu'on cherche.
export const metadata: Metadata = {
  title: "Placet — Consultations",
  robots: { index: false, follow: false },
};

export default async function ConsultationsPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = await params;
  return <ConsultationsManager spaceId={id} />;
}
