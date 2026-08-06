import type { Metadata } from "next";
import EventEditor from "@/components/scrutin/EventEditor";

export const metadata: Metadata = { title: "Placet — Consultation" };

export default async function EventPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = await params;
  return <EventEditor eventId={id} />;
}
