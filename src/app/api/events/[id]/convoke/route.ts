// Envoi des convocations par email (= magic links) aux membres convoqués d'un
// événement. Authentifié : agit avec la session de l'organisateur (RLS owner).
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { APP_URL } from "@/lib/voting/aiPrompt";
import { sendEmail, emailConfigured } from "@/lib/email/send";
import { convocationEmail } from "@/lib/email/convocation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Sans plafond explicite, la valeur par défaut de la plateforme (10 à 15 s)
// coupait la fonction en plein envoi. On monte le plafond ET on découpe : le
// plafond seul n'aurait fait que déplacer le mur.
export const maxDuration = 60;

/**
 * Convoqués traités par appel. Le client rappelle la route tant qu'il reste du
 * monde, et affiche l'avancement.
 *
 * POURQUOI PAR LOTS. L'envoi était une boucle séquentielle sur TOUS les
 * convoqués — environ 250 à 400 ms par email. À 200 personnes, 50 à 80 s : la
 * fonction expirait. Et comme `invited_at` n'était écrit qu'APRÈS la boucle, en
 * un seul UPDATE, une expiration laissait le pire état possible : les emails
 * étaient partis, aucune ligne n'était marquée, l'écran annonçait une erreur —
 * et un second clic reconvoquait tout le monde. Le bouton « Relancer », lui,
 * est conditionné à `invited_at` : il n'apparaissait jamais.
 */
const LOT = 20;
/** Envois menés de front dans un lot. Modeste : on ne veut pas se faire limiter. */
const FRONT = 5;

/** Exécute `job` sur `items`, `n` de front, dans l'ordre d'arrivée. */
async function enParallele<T, R>(items: T[], n: number, job: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      for (;;) {
        const k = i++;
        if (k >= items.length) return;
        out[k] = await job(items[k]);
      }
    }),
  );
  return out;
}

/**
 * Résout le lien de RETRAIT de chaque convoqué, pour un cercle uniquement.
 * La convocation (`scrutin_event_members`) ne porte pas le jeton stable du
 * membre : il vit sur le roster (`scrutin_members.token`), atteint par
 * `member_id`. Sans cette résolution, la promesse « vous partez en un clic
 * depuis n'importe quel email » ne tiendrait que sur les emails d'adhésion.
 * IL N'EST PLUS CONDITIONNÉ À `join_open`. Il l'était, et c'était l'inverse de
 * ce qu'il fallait : un groupe fermé aux adhésions est précisément celui dont
 * les membres ont été IMPORTÉS — ceux qui n'ont rien demandé. La seule
 * population qui n'avait pas choisi d'être là était donc la seule à ne pas
 * pouvoir partir. Le seul vrai prérequis est d'avoir une ligne de roster, donc
 * un `member_id` : c'est ce que le filtre ci-dessous teste déjà.
 */
async function leaveUrlsByEventMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventMembers: { id: string; member_id: string | null }[],
  base: string,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
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
  const body = (await req.json().catch(() => ({}))) as { locale?: string; resend?: boolean };
  const loc = body.locale === "en" || body.locale === "es" ? body.locale : "fr";
  // `resend` renvoie à TOUT LE MONDE, y compris à ceux qui ont déjà reçu leur
  // lien. C'est un geste explicite, jamais le défaut : sans ce filtre, chaque
  // clic sur « envoyer » remailait l'ensemble du groupe.
  const resend = body.resend === true;

  if (!emailConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

  // RLS : l'événement n'est visible que par son propriétaire.
  const { data: ev } = await supabase
    .from("scrutin_events")
    .select("title, status, scrutin_spaces(name)")
    .eq("id", id)
    .maybeSingle();
  if (!ev) return NextResponse.json({ error: "not_found" }, { status: 404 });
  // Une consultation close refuse les bulletins : y convoquer, c'est envoyer
  // quelqu'un se heurter à une porte fermée. La garde est ici et pas seulement
  // à l'écran — un bouton caché n'est pas une règle.
  if (ev.status === "closed") return NextResponse.json({ error: "closed" }, { status: 409 });
  const space = (ev as { scrutin_spaces?: { name?: string } | null }).scrutin_spaces;
  const senderName = space?.name ? `${space.name} · Placet` : "Placet";

  let q = supabase
    .from("scrutin_event_members")
    .select("id, name, email, token, member_id")
    .eq("event_id", id)
    .not("email", "is", null);
  if (!resend) q = q.is("invited_at", null);
  const { data: members } = await q;
  const restants = (members ?? []).filter((m) => m.email);

  // Le lot du jour, et ce qu'il restera après lui.
  const lot = restants.slice(0, LOT);
  const reste = restants.length - lot.length;

  const base = loc === "fr" ? APP_URL : `${APP_URL}/${loc}`;
  const leaveUrls = await leaveUrlsByEventMember(
    supabase,
    lot as { id: string; member_id: string | null }[],
    base,
  );

  const oks = await enParallele(lot, FRONT, async (m) => {
    const { subject, html } = convocationEmail(loc, {
      eventTitle: ev.title as string,
      memberName: m.name as string,
      voteUrl: `${base}/e/${m.token}`,
      leaveUrl: leaveUrls.get(m.id as string),
    });
    return sendEmail({
      to: m.email as string,
      toName: m.name as string,
      subject,
      html,
      senderName,
      replyTo: user.email ?? undefined,
    });
  });
  const sentIds = lot.filter((_, k) => oks[k]).map((m) => m.id as string);

  // MARQUÉ IMMÉDIATEMENT, lot par lot. C'est ce qui rend l'opération
  // reprenable : si l'appel suivant échoue, ceux-ci ne seront pas réécrits, et
  // le bouton « Relancer » — conditionné à `invited_at` — apparaîtra enfin.
  if (sentIds.length)
    await supabase.from("scrutin_event_members").update({ invited_at: new Date().toISOString() }).in("id", sentIds);

  return NextResponse.json({
    sent: sentIds.length,
    failed: lot.length - sentIds.length,
    remaining: reste,
  });
}
