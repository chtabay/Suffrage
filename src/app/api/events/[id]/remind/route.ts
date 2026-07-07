// Relance des non-votants : renvoie le lien personnel (= convocation) uniquement
// aux membres déjà convoqués, avec email, qui n'ont pas encore voté. Authentifié :
// agit avec la session de l'organisateur (RLS owner).
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { APP_URL } from "@/lib/voting/aiPrompt";
import { sendEmail, emailConfigured } from "@/lib/email/send";
import { reminderEmail } from "@/lib/email/convocation";

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

  // Résolutions de l'événement.
  const { data: polls } = await supabase.from("scrutin_polls").select("id").eq("event_id", id);
  const pollIds = (polls ?? []).map((p) => p.id as string);

  // Membres ayant déjà voté (au moins un bulletin sur une résolution).
  const voted = new Set<string>();
  if (pollIds.length) {
    const { data: ballots } = await supabase
      .from("scrutin_ballots")
      .select("event_member_id")
      .in("poll_id", pollIds)
      .not("event_member_id", "is", null);
    for (const b of ballots ?? []) if (b.event_member_id) voted.add(b.event_member_id as string);
  }

  // Cible : membres convoqués, avec email, n'ayant pas encore voté.
  const { data: members } = await supabase
    .from("scrutin_event_members")
    .select("id, name, email, token, invited_at")
    .eq("event_id", id);
  const pending = (members ?? []).filter((m) => m.email && m.invited_at && !voted.has(m.id as string));
  const base = loc === "fr" ? APP_URL : `${APP_URL}/${loc}`;

  let sent = 0;
  for (const m of pending) {
    const { subject, html } = reminderEmail(loc, {
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
    if (ok) sent++;
  }

  return NextResponse.json({ sent, pending: pending.length });
}
