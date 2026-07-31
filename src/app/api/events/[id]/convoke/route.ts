// Envoi des convocations par email (= magic links) aux membres convoqués d'un
// événement. Authentifié : agit avec la session de l'organisateur (RLS owner).
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { APP_URL } from "@/lib/voting/aiPrompt";
import { sendEmail, emailConfigured } from "@/lib/email/send";
import { convocationEmail } from "@/lib/email/convocation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Résout le lien de RETRAIT de chaque convoqué, pour un cercle uniquement.
 * La convocation (`scrutin_event_members`) ne porte pas le jeton stable du
 * membre : il vit sur le roster (`scrutin_members.token`), atteint par
 * `member_id`. Sans cette résolution, la promesse « vous partez en un clic
 * depuis n'importe quel email » ne tiendrait que sur les emails d'adhésion.
 * Renvoie une table vide si l'espace n'est pas un cercle.
 */
async function leaveUrlsByEventMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventMembers: { id: string; member_id: string | null }[],
  isCircle: boolean,
  base: string,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!isCircle) return out;
  const rosterIds = eventMembers.map((m) => m.member_id).filter((x): x is string => Boolean(x));
  if (!rosterIds.length) return out;
  const { data: roster } = await supabase.from("scrutin_members").select("id, token").in("id", rosterIds);
  const tokenByRoster = new Map((roster ?? []).map((r) => [r.id as string, r.token as string]));
  for (const m of eventMembers) {
    const tok = m.member_id ? tokenByRoster.get(m.member_id) : undefined;
    if (tok) out.set(m.id, `${base}/m/${tok}?quitter=1`);
  }
  return out;
}


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
    .select("title, scrutin_spaces(name, join_open)")
    .eq("id", id)
    .maybeSingle();
  if (!ev) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const space = (ev as { scrutin_spaces?: { name?: string; join_open?: boolean } | null }).scrutin_spaces;
  const senderName = space?.name ? `${space.name} · Placet` : "Placet";

  const { data: members } = await supabase
    .from("scrutin_event_members")
    .select("id, name, email, token, member_id")
    .eq("event_id", id);
  const withEmail = (members ?? []).filter((m) => m.email);
  const base = loc === "fr" ? APP_URL : `${APP_URL}/${loc}`;
  const leaveUrls = await leaveUrlsByEventMember(
    supabase,
    withEmail as { id: string; member_id: string | null }[],
    Boolean(space?.join_open),
    base,
  );

  const sentIds: string[] = [];
  for (const m of withEmail) {
    const { subject, html } = convocationEmail(loc, {
      eventTitle: ev.title as string,
      memberName: m.name as string,
      voteUrl: `${base}/e/${m.token}`,
      leaveUrl: leaveUrls.get(m.id as string),
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
