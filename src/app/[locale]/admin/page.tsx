import type { Metadata } from "next";
import AdminScreen from "@/components/admin/AdminScreen";

// Régie interne : jamais indexée, l'accès réel est contrôlé côté données
// (RPC gardées par l'allowlist scrutin_admins — la page ne montre rien sans).
export const metadata: Metadata = {
  title: "Placet — Régie",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminScreen />;
}
