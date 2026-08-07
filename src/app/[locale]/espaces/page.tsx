import type { Metadata } from "next";
import SpacesHome from "@/components/scrutin/SpacesHome";

export const metadata: Metadata = {
  title: "Placet — Mes cercles",
  robots: { index: false, follow: false },
};

export default function SpacesPage() {
  return <SpacesHome />;
}
