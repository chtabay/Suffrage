// Poste le résultat d'un scrutin dans le canal Slack d'origine, à la clôture.
// Idempotent : slack_mark_posted ne « réussit » qu'une fois (dédup entre le cron et
// la clôture au dernier votant). Best-effort : n'échoue jamais bruyamment.
import { getPollShareInfo } from "@/lib/db/pollMeta";
import { APP_URL } from "@/lib/voting/aiPrompt";
import { postMessage } from "./api";
import { resultMessage } from "./blocks";
import { linkForToken, markPosted } from "./store";

export async function postSlackResult(token: string): Promise<void> {
  try {
    const link = await linkForToken(token);
    if (!link || link.status !== "launched") return; // pas un vote Slack, ou déjà traité
    if ((await markPosted(token)) !== true) return; // déjà posté ailleurs → on s'arrête
    const info = await getPollShareInfo(token, { fresh: true });
    if (!info) return;
    const m = resultMessage(info.question, info.methodName, info.winner, info.ballotCount, `${APP_URL}/v/${token}`);
    await postMessage(link.channel_id, m.blocks, m.text);
  } catch {
    /* best effort */
  }
}
