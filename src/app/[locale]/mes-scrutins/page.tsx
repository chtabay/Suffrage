import type { Metadata } from "next";
import MesScrutinsPageClient from "@/components/scrutin/MesScrutinsPageClient";

export const metadata: Metadata = { title: "Placet — Mes scrutins", robots: { index: false, follow: false } };

// Ce que J'ORGANISE : mes créations, locales et rattachées au compte.
// C'était un simple état React de la page d'accueil — donc sans URL, impartageable,
// perdu au rafraîchissement, et impossible à lier depuis les autres pages (« Mes
// votes » y renvoyait par écrit sans pouvoir y conduire). C'est maintenant une route.
export default function MesScrutinsPage() {
  return <MesScrutinsPageClient />;
}
