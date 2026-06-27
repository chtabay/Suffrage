// Slash command /scrutin : vérifie la signature Slack, crée un brouillon collaboratif
// et poste le message « builder » Block Kit dans le canal. Réponse HTTP vide (le
// message est posté via l'API Web pour pouvoir être édité ensuite).
import { NextResponse } from "next/server";
import { verifySlackSignature, parseCommand } from "@/lib/slack/verify";
import { createBuilder, getBuilder, setBuilderMessage } from "@/lib/slack/store";
import { builderMessage } from "@/lib/slack/blocks";
import { postMessage } from "@/lib/slack/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ephemeral = (text: string) => NextResponse.json({ response_type: "ephemeral", text });

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySlackSignature(raw, req.headers, process.env.SLACK_SIGNING_SECRET)) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  const cmd = parseCommand(raw);
  const question = cmd.text.trim().slice(0, 150);

  const id = await createBuilder({
    team: cmd.team_id,
    channel: cmd.channel_id,
    creator: cmd.user_id,
    question,
    method: "simple_vote",
  });
  if (!id) return ephemeral("⚠️ Erreur interne à la création du vote. Réessaie dans un instant.");

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
