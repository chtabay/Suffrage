// Interactivité Slack : clics de boutons, sélecteur de méthode, soumissions de modale.
// Chaque action porte l'id du builder (value des boutons / block_id du select /
// private_metadata des modales). On met à jour l'état (RPC guardées) puis on réédite
// le message via chat.update.
import { NextResponse } from "next/server";
import { verifySlackSignature, parseInteraction } from "@/lib/slack/verify";
import * as store from "@/lib/slack/store";
import { builderMessage, addOptionView, editQuestionView, launchedMessage, cancelledMessage } from "@/lib/slack/blocks";
import { openView, updateMessage } from "@/lib/slack/api";
import { createPollServer } from "@/lib/db/pollsServer";
import { splitLeadingEmoji } from "@/lib/voting/draft";
import { publicMethodToSystem } from "@/lib/voting/methods";
import { recipeForSystem } from "@/lib/voting/engine";
import { APP_URL } from "@/lib/voting/aiPrompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SlackAction {
  action_id: string;
  value?: string;
  block_id?: string;
  selected_option?: { value: string };
}
interface BlockActions {
  type: "block_actions";
  trigger_id: string;
  response_url: string;
  actions: SlackAction[];
}
type StateValues = Record<string, Record<string, { value?: string }>>;
interface ViewSubmission {
  type: "view_submission";
  view: { callback_id: string; private_metadata: string; state: { values: StateValues } };
}
type Payload = BlockActions | ViewSubmission | { type: string };

const ok = () => new NextResponse(null, { status: 200 });

/** Retrouve l'id du builder selon le type d'élément déclencheur. */
function builderId(a: SlackAction): string {
  if (a.action_id === "set_method") return (a.block_id ?? "").split(":")[1] ?? "";
  const v = a.value ?? "";
  return v.includes(":") ? v.split(":")[0] : v;
}

/** Réédite le message builder à partir de l'état courant. */
async function refresh(id: string): Promise<void> {
  const b = await store.getBuilder(id);
  if (!b || !b.message_ts || b.status !== "building") return;
  const m = builderMessage(b);
  await updateMessage(b.channel_id, b.message_ts, m.blocks, m.text);
}

async function respondEphemeral(responseUrl: string, text: string): Promise<void> {
  try {
    await fetch(responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response_type: "ephemeral", replace_original: false, text }),
    });
  } catch {
    /* best effort */
  }
}

async function doLaunch(id: string, responseUrl: string): Promise<void> {
  const b = await store.getBuilder(id);
  if (!b || b.status !== "building") return;
  if (!b.question.trim() || b.options.length < 2) {
    await respondEphemeral(responseUrl, "Il faut une *question* et *au moins 2 options* avant de lancer le vote.");
    return;
  }
  const recipe = recipeForSystem(publicMethodToSystem(b.method) ?? "fptp");
  const options = b.options.map((o) => ({ icon: o.icon, name: o.name }));
  const closesAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const token = await createPollServer(b.question, options, recipe, { closesAt });
  if (!token) {
    await respondEphemeral(responseUrl, "⚠️ Échec de la création du vote. Réessaie dans un instant.");
    return;
  }
  await store.launchBuilder(id, token);
  const m = launchedMessage(b.question, b.method, `${APP_URL}/v/${token}`, options);
  if (b.message_ts) await updateMessage(b.channel_id, b.message_ts, m.blocks, m.text);
}

async function handleBlockActions(p: BlockActions): Promise<void> {
  const a = p.actions[0];
  if (!a) return;
  const id = builderId(a);
  switch (a.action_id) {
    case "add_option":
      await openView(p.trigger_id, addOptionView(id));
      break;
    case "edit_question": {
      const b = await store.getBuilder(id);
      await openView(p.trigger_id, editQuestionView(id, b?.question ?? ""));
      break;
    }
    case "set_method":
      if (a.selected_option?.value) await store.setMethod(id, a.selected_option.value);
      await refresh(id);
      break;
    case "remove_option": {
      const idx = Number((a.value ?? "").split(":")[1]);
      if (Number.isInteger(idx)) await store.removeOption(id, idx);
      await refresh(id);
      break;
    }
    case "launch":
      await doLaunch(id, p.response_url);
      break;
    case "cancel": {
      await store.cancelBuilder(id);
      const b = await store.getBuilder(id);
      if (b?.message_ts) {
        const m = cancelledMessage();
        await updateMessage(b.channel_id, b.message_ts, m.blocks, m.text);
      }
      break;
    }
    // open_vote / open_result : boutons-liens, rien à faire (simple ack).
  }
}

async function handleViewSubmission(p: ViewSubmission): Promise<void> {
  const { callback_id, private_metadata: id, state } = p.view;
  if (callback_id === "add_option_submit") {
    const label = (state.values.opt?.value?.value ?? "").trim();
    if (label) {
      const { icon, name } = splitLeadingEmoji(label, "•");
      await store.addOption(id, icon, name.slice(0, 80));
    }
    await refresh(id);
  } else if (callback_id === "edit_question_submit") {
    const q = (state.values.q?.value?.value ?? "").trim().slice(0, 150);
    await store.setQuestion(id, q);
    await refresh(id);
  }
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySlackSignature(raw, req.headers, process.env.SLACK_SIGNING_SECRET)) {
    return new NextResponse("invalid signature", { status: 401 });
  }
  const payload = parseInteraction<Payload>(raw);
  if (!payload) return new NextResponse(null, { status: 400 });

  if (payload.type === "view_submission") {
    await handleViewSubmission(payload as ViewSubmission);
    return ok(); // 200 vide → ferme la modale
  }
  if (payload.type === "block_actions") {
    await handleBlockActions(payload as BlockActions);
    return ok();
  }
  return ok();
}
