// Slash command /placet : vérifie la signature Slack, crée un brouillon collaboratif
// et poste le message « builder » Block Kit dans le canal. Réponse HTTP vide (le
// message est posté via l'API Web pour pouvoir être édité ensuite).
// Locale : langue du créateur (users.info) → défaut du workspace (/placet lang) → env → en.
import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { verifySlackSignature, parseCommand } from "@/lib/slack/verify";
import {
  createBuilder,
  getBuilder,
  setBuilderMessage,
  addOption,
  botTokenForTeam,
  installLocale,
  setInstallLocale,
} from "@/lib/slack/store";
import { builderMessage, helpMessage, type SlackT } from "@/lib/slack/blocks";
import { postMessage, userLocale } from "@/lib/slack/api";
import { splitLeadingEmoji } from "@/lib/voting/draft";
import { supportedLocale } from "@/i18n/locales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function translators(locale: string): Promise<{ t: SlackT; tm: SlackT }> {
  const t = (await getTranslations({ locale, namespace: "Slack" })) as unknown as SlackT;
  const tm = (await getTranslations({ locale, namespace: "Methods" })) as unknown as SlackT;
  return { t, tm };
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySlackSignature(raw, req.headers, process.env.SLACK_SIGNING_SECRET)) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  const cmd = parseCommand(raw);
  const input = cmd.text.trim();

  // Résolution de la locale : créateur (users.info) → défaut workspace → env → en.
  const token = await botTokenForTeam(cmd.team_id);
  const [userLoc, wsDefault] = await Promise.all([
    userLocale(token, cmd.user_id),
    installLocale(cmd.team_id),
  ]);
  const locale = supportedLocale(
    userLoc,
    supportedLocale(wsDefault, supportedLocale(process.env.SLACK_DEFAULT_LOCALE, "en")),
  );
  const { t, tm } = await translators(locale);
  const ephemeral = (text: string) => NextResponse.json({ response_type: "ephemeral", text });

  // Sous-commande d'aide : /placet aide
  if (/^(aide|help|ayuda|\?)$/i.test(input)) {
    const h = helpMessage(t, tm);
    return NextResponse.json({ response_type: "ephemeral", blocks: h.blocks, text: h.text });
  }

  // Sous-commande langue : /placet lang <fr|en|es> → défaut du workspace.
  const langM = /^lang\s+([a-z-]+)/i.exec(input);
  if (langM) {
    const wanted = supportedLocale(langM[1], "");
    if (!wanted) return ephemeral(t("langUnknown"));
    await setInstallLocale(cmd.team_id, wanted);
    const { t: t2 } = await translators(wanted);
    return ephemeral(t2("langSet", { lang: wanted.toUpperCase() }));
  }

  // Sous-commande créneaux : « /placet dates [question] » → builder en mode dates.
  const slotMode = /^dates?\b/i.test(input);
  const body = slotMode ? input.replace(/^dates?\b\s*/i, "") : input;

  // Pré-remplissage inline (mode texte) : « Question ? | Option A | Option B ».
  const parts = body.split("|").map((s) => s.trim());
  const question = (parts[0] ?? "").slice(0, 150);
  const seeds = slotMode ? [] : parts.slice(1).filter(Boolean).slice(0, 12);

  const id = await createBuilder({
    team: cmd.team_id,
    channel: cmd.channel_id,
    creator: cmd.user_id,
    question,
    method: slotMode ? "approval" : "simple_vote",
    kind: slotMode ? "slot" : "text",
    locale,
  });
  if (!id) return ephemeral(t("errCreate"));

  for (const s of seeds) {
    const { icon, name } = splitLeadingEmoji(s, "•");
    await addOption(id, icon, name.slice(0, 80));
  }

  const b = await getBuilder(id);
  if (!b) return ephemeral(t("errInternal"));

  const { blocks, text } = builderMessage(b, t, tm);
  const ts = await postMessage(token, cmd.channel_id, blocks, text);
  if (!ts) return ephemeral(t("errPost"));
  await setBuilderMessage(id, ts);
  return new NextResponse(null, { status: 200 });
}
