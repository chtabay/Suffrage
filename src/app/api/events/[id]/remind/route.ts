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
    .select("title, reminded_at, status, closes_at, scrutin_spaces(name, join_open)")
    .eq("id", id)
    .maybeSingle();
  if (!ev) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // ÉCHÉANCE PASSÉE = RELANCE REFUSÉE, et la garde est ICI parce que c'est ici
  // que partent les emails.
  //
  // Rien ne clôt une consultation à son échéance : ni cron, ni déclencheur. Le
  // `status` reste 'open' pour toujours, et `cast_event_ballot` est le seul à
  // consulter `closes_at` — pour REFUSER le bulletin. L'écran affichait donc
  // « Ouvert » et offrait « Relancer les non-votants » sur une urne morte : les
  // 35 courriels partaient, personne ne pouvait voter, et `reminded_at` était
  // posé — donc l'UNIQUE relance autorisée dans un groupe était brûlée pour
  // rien, sans rattrapage possible. Même motif que le refus de bulletin, au même
  // endroit dans le temps.
  const clos =
    ev.status === "closed" || (!!ev.closes_at && Date.now() >= Date.parse(ev.closes_at as string));
  if (clos) {
    return NextResponse.json({ error: "closed", sent: 0, pending: 0 }, { status: 409 });
  }
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
    .select("id, name, email, token, invited_at, member_id")
    .eq("event_id", id);
  const pending = (members ?? []).filter((m) => m.email && m.invited_at && !voted.has(m.id as string));
  const base = loc === "fr" ? APP_URL : `${APP_URL}/${loc}`;
  const leaveUrls = await leaveUrlsByEventMember(
    supabase,
    pending as { id: string; member_id: string | null }[],
    Boolean(space?.join_open),
    base,
  );

  let sent = 0;
  for (const m of pending) {
    const { subject, html } = reminderEmail(loc, {
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
    if (ok) sent++;
  }

  if (sent > 0) {
    await supabase.from("scrutin_events").update({ reminded_at: new Date().toISOString() }).eq("id", id);
  }

  return NextResponse.json({ sent, pending: pending.length });
}
