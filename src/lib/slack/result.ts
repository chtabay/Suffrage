// Poste le résultat d'un scrutin dans le canal Slack d'origine, à la clôture.
// Idempotent : slack_mark_posted ne « réussit » qu'une fois (dédup entre le cron et
// la clôture au dernier votant). Best-effort : n'échoue jamais bruyamment.
import { getTranslations } from "next-intl/server";
import { getPollShareInfo } from "@/lib/db/pollMeta";
import { APP_URL } from "@/lib/voting/aiPrompt";
import { supportedLocale } from "@/i18n/locales";
import { postMessage } from "./api";
import { resultMessage, type SlackT } from "./blocks";
import { botTokenForTeam, linkForToken, markPosted } from "./store";

export async function postSlackResult(token: string): Promise<void> {
  try {
    const link = await linkForToken(token);
    if (!link || link.status !== "launched") return; // pas un vote Slack, ou déjà traité
    if ((await markPosted(token)) !== true) return; // déjà posté ailleurs → on s'arrête
    const info = await getPollShareInfo(token, { fresh: true });
    if (!info) return;
    const loc = supportedLocale(link.locale, "en");
    const t = (await getTranslations({ locale: loc, namespace: "Slack" })) as unknown as SlackT;
    const tm = (await getTranslations({ locale: loc, namespace: "Methods" })) as unknown as SlackT;
    const m = resultMessage(info.question, info.methodKey, info.winner, info.ballotCount, `${APP_URL}/v/${token}`, t, tm);
    const bot = await botTokenForTeam(link.team_id);
    await postMessage(bot, link.channel_id, m.blocks, m.text);
  } catch {
    /* best effort */
  }
}
