// Envoi des convocations par email (= magic links) aux membres convoqués d'un
// événement. Authentifié : agit avec la session de l'organisateur (RLS owner).
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { APP_URL } from "@/lib/voting/aiPrompt";
import { sendEmail, emailConfigured } from "@/lib/email/send";
import { convocationEmail } from "@/lib/email/convocation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { locale?: string };
  const loc = body.locale === "en" || body.locale === "es" ? body.locale : "fr";

  if (!emailConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

  // RLS : l'événement n'est visible que par son propriétaire.
  const { data: ev } = await supabase
    .from("scrutin_events")
    .select("title, scrutin_spaces(name)")
    .eq("id", id)
    .maybeSingle();
  if (!ev) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const spaceName = (ev as { scrutin_spaces?: { name?: string } | null }).scrutin_spaces?.name;
  const senderName = spaceName ? `${spaceName} · Placet` : "Placet";

  const { data: members } = await supabase
    .from("scrutin_event_members")
    .select("id, name, email, token")
    .eq("event_id", id);
  const withEmail = (members ?? []).filter((m) => m.email);
  const base = loc === "fr" ? APP_URL : `${APP_URL}/${loc}`;

  const sentIds: string[] = [];
  for (const m of withEmail) {
    const { subject, html } = convocationEmail(loc, {
      eventTitle: ev.title as string,
      memberName: m.name as string,
      voteUrl: `${base}/e/${m.token}`,
    });
    const ok = await sendEmail({
      to: m.email as string,
      toName: m.name as string,
      subject,
      html,
      senderName,
      replyTo: user.email ?? undefined,
    });
    if (ok) sentIds.push(m.id as string);
  }
  if (sentIds.length)
    await supabase.from("scrutin_event_members").update({ invited_at: new Date().toISOString() }).in("id", sentIds);

  return NextResponse.json({ sent: sentIds.length, total: withEmail.length });
}
