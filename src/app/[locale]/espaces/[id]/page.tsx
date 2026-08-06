import type { Metadata } from "next";
import SpaceDashboard from "@/components/scrutin/SpaceDashboard";

export const metadata: Metadata = { title: "Placet — Cercle" };

export default async function SpacePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = await params;
  return <SpaceDashboard spaceId={id} />;
}
