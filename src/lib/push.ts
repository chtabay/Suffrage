// Envoi de notifications Web Push (serveur uniquement). N'utilise PAS la clé
// service-role (BDD OpenSM partagée) : tout passe par des RPC SECURITY DEFINER
// ciblées, protégées par NOTIFY_SECRET. À n'importer que côté serveur.
import webpush from "web-push";
import { postSlackResult } from "@/lib/slack/result";

const PUB = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIV = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:it@seventee.com";
const SECRET = process.env.NOTIFY_SECRET;
const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let configured = false;
function ready(): boolean {
  if (!PUB || !PRIV || !SECRET || !BASE || !KEY) return false;
  if (!configured) {
    webpush.setVapidDetails(SUBJECT, PUB, PRIV);
    configured = true;
  }
  return true;
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  if (!BASE || !KEY) return null;
  try {
    const res = await fetch(`${BASE}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface Sub {
  endpoint: string;
  p256dh: string;
  auth: string;
}
export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

async function sendOne(sub: Sub, payload: PushPayload) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
  } catch (e: unknown) {
    const code = (e as { statusCode?: number }).statusCode;
    // 404/410 : abonnement périmé → on le retire.
    if (code === 404 || code === 410) await rpc("delete_push_subscription", { p_secret: SECRET, p_endpoint: sub.endpoint });
  }
}

/** Notifie les abonnés d'un scrutin, une seule fois par (token, kind). Renvoie le nb d'abonnés ciblés. */
export async function notifyPoll(token: string, kind: string, payload: PushPayload): Promise<number> {
  if (!ready()) return 0;
  const claimed = await rpc<boolean>("claim_poll_notification", { p_secret: SECRET, p_token: token, p_kind: kind });
  if (claimed !== true) return 0;
  const subs = (await rpc<Sub[]>("get_poll_subscriptions", { p_secret: SECRET, p_token: token })) ?? [];
  await Promise.all(subs.map((s) => sendOne(s, payload)));
  return subs.length;
}

/** Enregistre un abonnement push (organisateur via userId, ou votant via pollToken). */
export async function addSubscription(args: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userId?: string | null;
  pollToken?: string | null;
}): Promise<boolean> {
  if (!ready()) return false;
  await rpc("add_push_subscription", {
    p_secret: SECRET,
    p_endpoint: args.endpoint,
    p_p256dh: args.p256dh,
    p_auth: args.auth,
    p_user_id: args.userId ?? null,
    p_poll_token: args.pollToken ?? null,
  });
  return true;
}

/** Cron quotidien : ferme les scrutins échus (→ notif résultats) et rappelle ceux qui closent sous 24 h. */
export async function closeExpiredAndNotify(origin: string): Promise<{ closed: number; reminded: number }> {
  if (!ready()) return { closed: 0, reminded: 0 };
  const closed = (await rpc<{ token: string }[]>("close_expired_polls", { p_secret: SECRET })) ?? [];
  for (const { token } of closed) {
    await notifyPoll(token, "results", {
      title: "Résultats disponibles",
      body: "Le vote est clos — découvrez le résultat.",
      url: `${origin}/v/${token}`,
    });
    await postSlackResult(token); // no-op si le scrutin ne vient pas de Slack
  }
  const soon = (await rpc<{ token: string }[]>("polls_closing_soon", { p_secret: SECRET })) ?? [];
  for (const { token } of soon) {
    await notifyPoll(token, "reminder", {
      title: "Dernière chance de voter",
      body: "Ce scrutin se clôture bientôt.",
      url: `${origin}/v/${token}`,
    });
  }
  return { closed: closed.length, reminded: soon.length };
}
