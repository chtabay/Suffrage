// Interactivité Slack : clics de boutons, sélecteur de méthode, soumissions de modale.
// Le bot token dépend du workspace (multi-workspace) : on le résout via le team_id du
// payload (botTokenForTeam) et on le passe aux appels chat.update / views.open.
import { NextResponse } from "next/server";
import { verifySlackSignature, parseInteraction } from "@/lib/slack/verify";
import * as store from "@/lib/slack/store";
import {
  builderMessage,
  addOptionView,
  addSlotView,
  editQuestionView,
  launchedMessage,
  launchedClosedMessage,
  cancelledMessage,
} from "@/lib/slack/blocks";
import { openView, updateMessage } from "@/lib/slack/api";
import { createPollServer, closePollServer } from "@/lib/db/pollsServer";
import { postSlackResult } from "@/lib/slack/result";
import { splitLeadingEmoji, slotLabel } from "@/lib/voting/draft";
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
  team?: { id: string };
  actions: SlackAction[];
}
type StateValues = Record<string, Record<string, { value?: string; selected_date?: string; selected_time?: string }>>;
interface ViewSubmission {
  type: "view_submission";
  team?: { id: string };
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
async function refresh(id: string, token: string | null): Promise<void> {
  const b = await store.getBuilder(id);
  if (!b || !b.message_ts || b.status !== "building") return;
  const m = builderMessage(b);
  await updateMessage(token, b.channel_id, b.message_ts, m.blocks, m.text);
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

async function doLaunch(id: string, token: string | null, responseUrl: string): Promise<void> {
  const b = await store.getBuilder(id);
  if (!b || b.status !== "building") return;
  const slot = b.kind === "slot";
  if (!b.question.trim() || b.options.length < 2) {
    await respondEphemeral(
      responseUrl,
      slot
        ? "Il faut une *question* et *au moins 2 créneaux* avant de lancer."
        : "Il faut une *question* et *au moins 2 options* avant de lancer le vote.",
    );
    return;
  }
  const recipe = recipeForSystem(slot ? "approval" : (publicMethodToSystem(b.method) ?? "fptp"));
  const options = b.options.map((o) => (slot ? { icon: o.icon, name: o.name, at: o.at } : { icon: o.icon, name: o.name }));
  // Échéance 30 min = filet de sécurité ; le bouton « Clôturer » permet de fermer plus tôt.
  const closesAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const created = await createPollServer(b.question, options, recipe, { closesAt });
  if (!created) {
    await respondEphemeral(responseUrl, "⚠️ Échec de la création du vote. Réessaie dans un instant.");
    return;
  }
  await store.launchBuilder(id, created.token, created.secret);
  const m = launchedMessage(id, b.question, slot ? "approval" : b.method, `${APP_URL}/v/${created.token}`, options);
  if (b.message_ts) await updateMessage(token, b.channel_id, b.message_ts, m.blocks, m.text);
}

async function doClose(id: string, token: string | null, responseUrl: string): Promise<void> {
  const b = await store.getBuilder(id);
  if (!b || b.status !== "launched" || !b.poll_token || !b.poll_secret) {
    await respondEphemeral(responseUrl, "Ce vote n'est pas (ou plus) ouvert.");
    return;
  }
  await closePollServer(b.poll_token, b.poll_secret);
  if (b.message_ts) {
    const m = launchedClosedMessage(b.question);
    await updateMessage(token, b.channel_id, b.message_ts, m.blocks, m.text);
  }
  await postSlackResult(b.poll_token); // poste le dépouillement + marque posté (dédup cron)
}

async function handleBlockActions(p: BlockActions): Promise<void> {
  const a = p.actions[0];
  if (!a) return;
  const id = builderId(a);
  const token = await store.botTokenForTeam(p.team?.id);
  switch (a.action_id) {
    case "add_option":
      await openView(token, p.trigger_id, addOptionView(id));
      break;
    case "add_slot_open":
      await openView(token, p.trigger_id, addSlotView(id));
      break;
    case "edit_question": {
      const b = await store.getBuilder(id);
      await openView(token, p.trigger_id, editQuestionView(id, b?.question ?? ""));
      break;
    }
    case "set_method":
      if (a.selected_option?.value) await store.setMethod(id, a.selected_option.value);
      await refresh(id, token);
      break;
    case "remove_option": {
      const idx = Number((a.value ?? "").split(":")[1]);
      if (Number.isInteger(idx)) await store.removeOption(id, idx);
      await refresh(id, token);
      break;
    }
    case "launch":
      await doLaunch(id, token, p.response_url);
      break;
    case "close":
      await doClose(id, token, p.response_url);
      break;
    case "cancel": {
      await store.cancelBuilder(id);
      const b = await store.getBuilder(id);
      if (b?.message_ts) {
        const m = cancelledMessage();
        await updateMessage(token, b.channel_id, b.message_ts, m.blocks, m.text);
      }
      break;
    }
    // open_vote / open_result : boutons-liens, rien à faire (simple ack).
  }
}

async function handleViewSubmission(p: ViewSubmission): Promise<void> {
  const { callback_id, private_metadata: id, state } = p.view;
  const token = await store.botTokenForTeam(p.team?.id);
  if (callback_id === "add_option_submit") {
    const label = (state.values.opt?.value?.value ?? "").trim();
    if (label) {
      const { icon, name } = splitLeadingEmoji(label, "•");
      await store.addOption(id, icon, name.slice(0, 80));
    }
    await refresh(id, token);
  } else if (callback_id === "edit_question_submit") {
    const q = (state.values.q?.value?.value ?? "").trim().slice(0, 150);
    await store.setQuestion(id, q);
    await refresh(id, token);
  } else if (callback_id === "add_slot_submit") {
    const date = state.values.date?.value?.selected_date;
    const time = state.values.time?.value?.selected_time;
    if (date) {
      const at = time ? `${date}T${time}` : date;
      await store.addSlot(id, slotLabel(at), at);
    }
    await refresh(id, token);
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
