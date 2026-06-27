// Vérification des requêtes entrantes de Slack.
// Slack signe chaque requête : HMAC-SHA256 de `v0:{timestamp}:{corps brut}` avec le
// Signing Secret de l'app, comparé à l'en-tête X-Slack-Signature. On rejette aussi
// les requêtes de plus de 5 min (anti-rejeu). IMPORTANT : il faut le CORPS BRUT
// (await req.text()) AVANT tout parsing — d'où la séparation verify / parse.
import crypto from "crypto";

const MAX_SKEW_SEC = 60 * 5;

/**
 * Vrai si la requête provient bien de Slack (signature valide + horodatage récent).
 * @param rawBody corps brut de la requête (non parsé)
 * @param headers en-têtes de la requête (Headers fetch)
 * @param signingSecret SLACK_SIGNING_SECRET
 */
export function verifySlackSignature(
  rawBody: string,
  headers: Headers,
  signingSecret: string | undefined,
  nowSec: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!signingSecret) return false;
  const ts = headers.get("x-slack-request-timestamp");
  const sig = headers.get("x-slack-signature");
  if (!ts || !sig) return false;

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Math.abs(nowSec - tsNum) > MAX_SKEW_SEC) return false;

  const expected = "v0=" + crypto.createHmac("sha256", signingSecret).update(`v0:${ts}:${rawBody}`).digest("hex");

  // Comparaison à temps constant (longueurs égales requises par timingSafeEqual).
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(sig, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Champs utiles d'un slash command (corps application/x-www-form-urlencoded). */
export interface SlackCommand {
  command: string;
  text: string;
  user_id: string;
  user_name: string;
  channel_id: string;
  team_id: string;
  response_url: string;
  trigger_id: string;
}

/** Parse le corps urlencodé d'un slash command. */
export function parseCommand(rawBody: string): SlackCommand {
  const p = new URLSearchParams(rawBody);
  return {
    command: p.get("command") ?? "",
    text: p.get("text") ?? "",
    user_id: p.get("user_id") ?? "",
    user_name: p.get("user_name") ?? "",
    channel_id: p.get("channel_id") ?? "",
    team_id: p.get("team_id") ?? "",
    response_url: p.get("response_url") ?? "",
    trigger_id: p.get("trigger_id") ?? "",
  };
}

/** Parse le payload d'interactivité (corps urlencodé contenant un champ `payload` JSON). */
export function parseInteraction<T = Record<string, unknown>>(rawBody: string): T | null {
  const p = new URLSearchParams(rawBody);
  const payload = p.get("payload");
  if (!payload) return null;
  try {
    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
}
