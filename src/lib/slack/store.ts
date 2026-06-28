// Accès serveur à l'état des votes Slack (table scrutin_slack_polls) via les RPC
// SECURITY DEFINER guardées par NOTIFY_SECRET. Même modèle que push.ts : aucune
// clé service-role sur la base OpenSM partagée. À n'importer que côté serveur.
import { decryptToken } from "./crypto";

const SECRET = process.env.NOTIFY_SECRET;
const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export interface SlackOption {
  icon: string;
  name: string;
  /** Créneau daté (vote de dates) : "YYYY-MM-DD" ou "YYYY-MM-DDTHH:MM". */
  at?: string;
}

export interface SlackBuilder {
  id: string;
  team_id: string;
  channel_id: string;
  message_ts: string | null;
  creator_id: string;
  question: string;
  options: SlackOption[];
  method: string;
  kind: string;
  poll_token: string | null;
  poll_secret: string | null;
  status: string;
  /** Locale du scrutin (langue du créateur, détectée à /scrutin). */
  locale: string | null;
}

export interface SlackLink {
  channel_id: string;
  team_id: string;
  message_ts: string | null;
  status: string;
  locale: string | null;
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  if (!BASE || !KEY || !SECRET) return null;
  try {
    const res = await fetch(`${BASE}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_secret: SECRET, ...args }),
    });
    if (!res.ok) return null;
    const txt = await res.text();
    return txt ? (JSON.parse(txt) as T) : null;
  } catch {
    return null;
  }
}

export function createBuilder(a: {
  team: string;
  channel: string;
  creator: string;
  question: string;
  method: string;
  kind?: string;
  locale?: string | null;
}): Promise<string | null> {
  return rpc<string>("slack_builder_create", {
    p_team: a.team,
    p_channel: a.channel,
    p_creator: a.creator,
    p_question: a.question,
    p_method: a.method,
    p_kind: a.kind ?? "text",
    p_locale: a.locale ?? null,
  });
}

export async function setBuilderMessage(id: string, messageTs: string): Promise<void> {
  await rpc("slack_builder_set_message", { p_id: id, p_message_ts: messageTs });
}

export async function getBuilder(id: string): Promise<SlackBuilder | null> {
  const rows = await rpc<SlackBuilder[]>("slack_builder_get", { p_id: id });
  return rows && rows.length ? rows[0] : null;
}

export async function addOption(id: string, icon: string, name: string): Promise<void> {
  await rpc("slack_builder_add_option", { p_id: id, p_icon: icon, p_name: name });
}

/** Ajoute un créneau daté (vote de dates). */
export async function addSlot(id: string, name: string, at: string): Promise<void> {
  await rpc("slack_builder_add_slot", { p_id: id, p_name: name, p_at: at });
}

export async function removeOption(id: string, index: number): Promise<void> {
  await rpc("slack_builder_remove_option", { p_id: id, p_index: index });
}

export async function setQuestion(id: string, question: string): Promise<void> {
  await rpc("slack_builder_set_question", { p_id: id, p_question: question });
}

export async function setMethod(id: string, method: string): Promise<void> {
  await rpc("slack_builder_set_method", { p_id: id, p_method: method });
}

export async function launchBuilder(id: string, token: string, secret: string): Promise<void> {
  await rpc("slack_builder_launch", { p_id: id, p_poll_token: token, p_poll_secret: secret });
}

export async function cancelBuilder(id: string): Promise<void> {
  await rpc("slack_builder_cancel", { p_id: id });
}

export async function linkForToken(token: string): Promise<SlackLink | null> {
  const rows = await rpc<SlackLink[]>("slack_link_for_token", { p_token: token });
  return rows && rows.length ? rows[0] : null;
}

/** Marque le résultat comme posté dans Slack (dédup) ; vrai si c'était la 1re fois. */
export function markPosted(token: string): Promise<boolean | null> {
  return rpc<boolean>("slack_mark_posted", { p_token: token });
}

// ---------- installs multi-workspace (OAuth) ----------

/** Enregistre/MAJ l'install d'un workspace (bot token déjà chiffré). */
export async function setInstall(
  team: string,
  encToken: string,
  teamName: string | null,
  installer: string | null,
): Promise<void> {
  await rpc("slack_install_set", {
    p_team: team,
    p_token: encToken,
    p_team_name: teamName,
    p_installer: installer,
  });
}

/** Locale par défaut d'un workspace (option A : réglée via `/scrutin lang`). Null si non réglée. */
export async function installLocale(team: string | null | undefined): Promise<string | null> {
  if (!team) return null;
  return rpc<string>("slack_install_locale", { p_team: team });
}

/** Règle la locale par défaut d'un workspace (sur une install existante). */
export async function setInstallLocale(team: string, locale: string): Promise<void> {
  await rpc("slack_install_set_locale", { p_team: team, p_locale: locale });
}

/**
 * Bot token à utiliser pour un workspace : l'install chiffrée en base (déchiffrée),
 * sinon `SLACK_BOT_TOKEN` (espace « maison » installé manuellement). Null si rien.
 */
export async function botTokenForTeam(team: string | null | undefined): Promise<string | null> {
  if (team) {
    const enc = await rpc<string>("slack_install_get", { p_team: team });
    if (enc) {
      const tok = decryptToken(enc);
      if (tok) return tok;
    }
  }
  return process.env.SLACK_BOT_TOKEN ?? null;
}
