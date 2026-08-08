import type { Metadata } from "next";
import SpaceDashboard from "@/components/scrutin/SpaceDashboard";

// noindex : un cercle est privé. Ni cette page ni ses sous-vues ne le
// déclaraient, et robots.ts ne les couvre pas.
export const metadata: Metadata = {
  title: "Placet — Groupe",
  robots: { index: false, follow: false },
};

export default async function SpacePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = await params;
  return <SpaceDashboard spaceId={id} />;
}
