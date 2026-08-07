import type { Metadata } from "next";
import MembersManager from "@/components/scrutin/MembersManager";

// Vue de GESTION des membres. Elle existe parce que le tableau de bord ne doit
// montrer aucune grande liste : ici, et nulle part ailleurs, 200 lignes ont le
// droit d'exister — la page a une recherche, des filtres, une borne et une URL.
//
// noindex : c'est le roster d'un cercle privé. `robots.ts` ne l'interdit pas,
// et la page parente ne le déclarait pas non plus.
export const metadata: Metadata = {
  title: "Placet — Membres",
  robots: { index: false, follow: false },
};

export default async function MembersPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = await params;
  return <MembersManager spaceId={id} />;
}
