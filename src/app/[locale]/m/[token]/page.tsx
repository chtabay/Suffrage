import type { Metadata } from "next";
import { Suspense } from "react";
import MemberHome from "@/components/scrutin/MemberHome";

// Page personnelle du membre d'un cercle : ses consultations et son départ.
export const metadata: Metadata = { title: "Placet", robots: { index: false, follow: false } };

export default async function MemberPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { token } = await params;
  // useSearchParams (le `?quitter=1` du pied des emails) impose une frontière Suspense.
  return (
    <Suspense>
      <MemberHome token={token} />
    </Suspense>
  );
}
