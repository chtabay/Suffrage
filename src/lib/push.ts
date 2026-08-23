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

/**
 * Appel d'une RPC gardée par `NOTIFY_SECRET`, avec la clé anonyme.
 *
 * ⚠️ EXPORTÉE POUR LES JEUX QUOTIDIENS, qui décident leurs destinataires en base
 * (`scrutin_jeux_notifs_a_envoyer`). La recopier là-bas ferait deux passe-plats
 * à maintenir, et surtout deux endroits où oublier de traiter un échec.
 */
export async function rpcNotify<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
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

const rpc = rpcNotify;

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

/**
 * Pousse UNE notification vers UN abonnement. Rend `false` si la plomberie n'est
 * pas configurée (clés VAPID absentes), et jamais une exception.
 *
 * ⚠️ ELLE PASSE PAR `sendOne`, DONC PAR SON MÉNAGE : un point d'abonnement mort
 * répond 404 ou 410 et se fait retirer de la table. Écrire un second envoi qui
 * l'ignorerait laisserait les abonnements périmés s'accumuler pour toujours —
 * et ce sont eux qui font grossir une tournée sans que personne ne la reçoive.
 */
export async function pousser(sub: Sub, payload: PushPayload): Promise<boolean> {
  if (!ready()) return false;
  await sendOne(sub, payload);
  return true;
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

/**
 * Enregistre un abonnement push (organisateur via userId, ou votant via
 * pollToken).
 *
 * ⚠️ `fuseau` ET `langue` SONT FACULTATIFS ET LE RESTENT : la table est partagée
 * avec les scrutins, dont les abonnements n'ont jamais déclaré ni l'un ni
 * l'autre. Les envoyer à `null` depuis ce chemin-là n'efface rien — la RPC
 * garde ce qui est déjà posé sur le même point d'abonnement, sinon un rappel de
 * scrutin ferait perdre à un joueur son heure et sa langue, sur le même
 * navigateur.
 */
export async function addSubscription(args: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userId?: string | null;
  pollToken?: string | null;
  fuseau?: string | null;
  langue?: string | null;
}): Promise<boolean> {
  if (!ready()) return false;
  await rpc("add_push_subscription", {
    p_secret: SECRET,
    p_endpoint: args.endpoint,
    p_p256dh: args.p256dh,
    p_auth: args.auth,
    p_user_id: args.userId ?? null,
    p_poll_token: args.pollToken ?? null,
    p_fuseau: args.fuseau ?? null,
    p_langue: args.langue ?? null,
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
