// Slash command /scrutin : vérifie la signature Slack, crée un brouillon collaboratif
// et poste le message « builder » Block Kit dans le canal. Réponse HTTP vide (le
// message est posté via l'API Web pour pouvoir être édité ensuite).
import { NextResponse } from "next/server";
import { verifySlackSignature, parseCommand } from "@/lib/slack/verify";
import { createBuilder, getBuilder, setBuilderMessage, addOption } from "@/lib/slack/store";
import { builderMessage, helpMessage } from "@/lib/slack/blocks";
import { postMessage } from "@/lib/slack/api";
import { splitLeadingEmoji } from "@/lib/voting/draft";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ephemeral = (text: string) => NextResponse.json({ response_type: "ephemeral", text });

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySlackSignature(raw, req.headers, process.env.SLACK_SIGNING_SECRET)) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  const cmd = parseCommand(raw);
  const input = cmd.text.trim();

  // Sous-commande d'aide : /scrutin aide
  if (/^(aide|help|\?)$/i.test(input)) {
    const h = helpMessage();
    return NextResponse.json({ response_type: "ephemeral", blocks: h.blocks, text: h.text });
  }

  // Sous-commande créneaux : « /scrutin dates [question] » → builder en mode dates.
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
  });
  if (!id) return ephemeral("⚠️ Erreur interne à la création du vote. Réessaie dans un instant.");

  for (const s of seeds) {
    const { icon, name } = splitLeadingEmoji(s, "•");
    await addOption(id, icon, name.slice(0, 80));
  }

  const b = await getBuilder(id);
  if (!b) return ephemeral("⚠️ Erreur interne. Réessaie dans un instant.");

  const { blocks, text } = builderMessage(b);
  const ts = await postMessage(cmd.channel_id, blocks, text);
  if (!ts) {
    return ephemeral("⚠️ Je n'ai pas pu poster dans ce canal. Invite l'app *Scrutin* dans le canal, puis relance `/scrutin`.");
  }
  await setBuilderMessage(id, ts);
  return new NextResponse(null, { status: 200 });
}
