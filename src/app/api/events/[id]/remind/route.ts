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
    .select("title, reminded_at, scrutin_spaces(name, join_open)")
    .eq("id", id)
    .maybeSingle();
  if (!ev) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const space = (ev as { scrutin_spaces?: { name?: string; join_open?: boolean } | null }).scrutin_spaces;
  const spaceName = space?.name;
  const senderName = spaceName ? `${spaceName} · Placet` : "Placet";

  // UNE SEULE RELANCE dans un cercle. Au-delà, ce n'est plus un rappel, c'est du
  // harcèlement — et c'est précisément ce qu'on promet au membre de ne pas faire.
  // La garde vit ici parce que la contrainte porte sur l'ENVOI d'emails, et que
  // cette route en est l'unique source : ce n'est pas une décoration d'interface.
  // Les assemblées classiques gardent l'ancien comportement, elles n'ont rien promis.
  if (space?.join_open && ev.reminded_at) {
    return NextResponse.json({ error: "already_reminded", sent: 0, pending: 0 }, { status: 409 });
  }

  // Membres ayant déjà voté. Passe par une RPC et NON par une lecture directe des
  // bulletins : sur une consultation scellée le bulletin ne porte plus l'identité,
  // l'ensemble « a voté » serait vide, et on relancerait TOUT LE MONDE — l'inverse
  // exact de ce que la relance doit faire. La RPC lit l'émargement dans ce cas.
  const { data: votedIds } = await supabase.rpc("get_event_voted_members", { p_event_id: id });
  const voted = new Set<string>((votedIds as string[] | null) ?? []);

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

  if (sent > 0) {
    await supabase.from("scrutin_events").update({ reminded_at: new Date().toISOString() }).eq("id", id);
  }

  return NextResponse.json({ sent, pending: pending.length });
}
