// Construction des messages Block Kit (purs, sans I/O). L'identifiant du builder est
// transporté dans les `value` des boutons (et le `block_id` du select) pour que la
// route d'interactivité sache quel vote modifier. Les modales le portent dans
// `private_metadata`.
//
// i18n : ces fonctions reçoivent DEUX traducteurs déjà construits par l'appelant —
//   `t`  = namespace "Slack"   (libellés propres à Slack)
//   `tm` = namespace "Methods" (noms/descriptions des méthodes, partagés avec le web)
import { buildNewUrl } from "@/lib/voting/draft";
import { publicMethodCatalog, publicMethodToSystem } from "@/lib/voting/methods";
import { APP_URL } from "@/lib/voting/aiPrompt";
import { supportedLocale } from "@/i18n/locales";
import type { SlackBuilder, SlackOption } from "./store";

export type Block = Record<string, unknown>;

/** Traducteur next-intl (signature compatible avec `getTranslations`). */
export type SlackT = (key: string, values?: Record<string, string | number>) => string;

// Sous-ensemble curaté pour Slack : uniquement les méthodes à GAGNANT UNIQUE
// (les méthodes d'assemblée — proportionnelle, liste, grands électeurs — ont besoin
// de circonscriptions/sièges et n'ont pas de sens pour un vote de canal).
const SLACK_METHODS = ["simple_vote", "approval", "majority_judgment", "condorcet", "two_round", "condorcet_random", "borda"];

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Icône d'une méthode publique (depuis SYSTEMS via le catalogue). */
function methodIcon(key: string): string {
  return publicMethodCatalog().find((c) => c.key === key)?.icon ?? "";
}

function methodOptions(tm: SlackT): Block[] {
  return SLACK_METHODS.map((k) => {
    const sys = publicMethodToSystem(k);
    const icon = methodIcon(k);
    const label = sys ? `${icon} ${tm(`${sys}.name`)}` : k;
    const opt: Block = { text: { type: "plain_text", text: label.slice(0, 75), emoji: true }, value: k };
    // Slack affiche une description sous chaque choix → on explique quand l'utiliser.
    if (sys) opt.description = { type: "plain_text", text: tm(`whenToUse.${sys}`).slice(0, 75) };
    return opt;
  });
}

/** Libellé lisible d'une méthode (icône + nom canonique traduit). */
export function methodLabel(key: string, tm: SlackT): string {
  const sys = publicMethodToSystem(key);
  return sys ? `${methodIcon(key)} ${tm(`${sys}.name`)}` : key;
}

/** Message d'aide éphémère (`/placet aide`) : usage + explication des méthodes. */
export function helpMessage(t: SlackT, tm: SlackT): { blocks: Block[]; text: string } {
  const methods = SLACK_METHODS.map((k) => {
    const sys = publicMethodToSystem(k);
    return sys ? `${methodIcon(k)} *${tm(`${sys}.name`)}* — ${tm(`whenToUse.${sys}`)}` : null;
  })
    .filter(Boolean)
    .join("\n");
  return {
    blocks: [
      { type: "header", text: { type: "plain_text", text: t("help.title"), emoji: true } },
      {
        type: "section",
        text: { type: "mrkdwn", text: t("help.body") },
      },
      { type: "section", text: { type: "mrkdwn", text: t("help.methodsHeading", { methods }) } },
    ],
    text: t("help.fallback"),
  };
}

/** Message collaboratif de construction du vote (édité en place à chaque interaction). */
export function builderMessage(b: SlackBuilder, t: SlackT, tm: SlackT): { blocks: Block[]; text: string } {
  const slot = b.kind === "slot";
  const blocks: Block[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🗳️ ${b.question || (slot ? t("builder.titleSlot") : t("builder.title"))}`.slice(0, 150),
        emoji: true,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: slot
            ? t("builder.draftSlot", { creator: `<@${b.creator_id}>` })
            : t("builder.draft", { creator: `<@${b.creator_id}>` }),
        },
      ],
    },
    { type: "divider" },
  ];

  if (!b.options.length) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: slot ? t("builder.emptySlot") : t("builder.empty"),
      },
    });
  } else {
    b.options.forEach((o, i) => {
      blocks.push({
        type: "section",
        block_id: `opt:${b.id}:${i}`,
        text: { type: "mrkdwn", text: `${o.icon} *${escape(o.name)}*` },
        accessory: {
          type: "button",
          action_id: "remove_option",
          value: `${b.id}:${i}`,
          text: { type: "plain_text", text: "✕", emoji: true },
        },
      });
    });
  }

  blocks.push({ type: "divider" });

  // Méthode : mode texte uniquement. En mode créneaux, l'approbation est imposée.
  if (!slot) {
    const opts = methodOptions(tm);
    const initial = opts.find((o) => (o as { value: string }).value === b.method) ?? opts[0];
    blocks.push({
      type: "section",
      block_id: `method:${b.id}`,
      text: { type: "mrkdwn", text: t("builder.method") },
      accessory: { type: "static_select", action_id: "set_method", initial_option: initial, options: opts },
    });
  }

  const addBtn = slot
    ? { type: "button", action_id: "add_slot_open", value: b.id, text: { type: "plain_text", text: t("builder.addSlot"), emoji: true } }
    : { type: "button", action_id: "add_option", value: b.id, text: { type: "plain_text", text: t("builder.addOption"), emoji: true } };
  blocks.push({
    type: "actions",
    block_id: `actions:${b.id}`,
    elements: [
      addBtn,
      { type: "button", action_id: "edit_question", value: b.id, text: { type: "plain_text", text: t("builder.editQuestion"), emoji: true } },
      { type: "button", action_id: "launch", value: b.id, style: "primary", text: { type: "plain_text", text: t("builder.launch"), emoji: true } },
      { type: "button", action_id: "cancel", value: b.id, style: "danger", text: { type: "plain_text", text: t("builder.cancel"), emoji: true } },
    ],
  });

  // Pied : échappatoire vers le web (réglages avancés) + découverte de l'aide.
  // Le lien /new est pré-rempli avec l'état courant (question + options + méthode).
  // Lien web préfixé par la locale du scrutin → l'aperçu (unfurl) est dans la bonne langue.
  const webLoc = supportedLocale(b.locale, "fr");
  const webBase = webLoc === "fr" ? APP_URL : `${APP_URL}/${webLoc}`;
  const advancedUrl = buildNewUrl(webBase, {
    title: b.question || undefined,
    dates: slot ? b.options.map((o) => o.at ?? "").filter(Boolean) : undefined,
    options: !slot && b.options.length ? b.options.map((o) => `${o.icon} ${o.name}`) : undefined,
    method: slot ? undefined : b.method,
  });
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: t("builder.footer", { url: advancedUrl }),
      },
    ],
  });

  return { blocks, text: t("builder.fallback", { question: b.question || t("builder.untitled") }) };
}

/** Modale d'ajout d'option (emoji de tête → icône, comme dans l'app). */
export function addOptionView(builderId: string, t: SlackT): Block {
  return {
    type: "modal",
    callback_id: "add_option_submit",
    private_metadata: builderId,
    title: { type: "plain_text", text: t("optionModal.title") },
    submit: { type: "plain_text", text: t("modal.add") },
    close: { type: "plain_text", text: t("modal.cancel") },
    blocks: [
      {
        type: "input",
        block_id: "opt",
        label: { type: "plain_text", text: t("optionModal.label") },
        hint: { type: "plain_text", text: t("optionModal.hint") },
        element: {
          type: "plain_text_input",
          action_id: "value",
          max_length: 80,
          placeholder: { type: "plain_text", text: t("optionModal.placeholder") },
        },
      },
    ],
  };
}

/** Modale d'ajout d'un créneau (date + heure facultative). */
export function addSlotView(builderId: string, t: SlackT): Block {
  return {
    type: "modal",
    callback_id: "add_slot_submit",
    private_metadata: builderId,
    title: { type: "plain_text", text: t("slotModal.title") },
    submit: { type: "plain_text", text: t("modal.add") },
    close: { type: "plain_text", text: t("modal.cancel") },
    blocks: [
      {
        type: "input",
        block_id: "date",
        label: { type: "plain_text", text: t("slotModal.dateLabel") },
        element: { type: "datepicker", action_id: "value", placeholder: { type: "plain_text", text: t("slotModal.datePlaceholder") } },
      },
      {
        type: "input",
        block_id: "time",
        optional: true,
        label: { type: "plain_text", text: t("slotModal.timeLabel") },
        hint: { type: "plain_text", text: t("slotModal.timeHint") },
        element: { type: "timepicker", action_id: "value", placeholder: { type: "plain_text", text: t("slotModal.timePlaceholder") } },
      },
    ],
  };
}

/** Modale d'édition de la question. */
export function editQuestionView(builderId: string, current: string, t: SlackT): Block {
  const element: Record<string, unknown> = {
    type: "plain_text_input",
    action_id: "value",
    max_length: 150,
    placeholder: { type: "plain_text", text: t("questionModal.placeholder") },
  };
  if (current) element.initial_value = current;
  return {
    type: "modal",
    callback_id: "edit_question_submit",
    private_metadata: builderId,
    title: { type: "plain_text", text: t("questionModal.title") },
    submit: { type: "plain_text", text: t("modal.save") },
    close: { type: "plain_text", text: t("modal.cancel") },
    blocks: [{ type: "input", block_id: "q", label: { type: "plain_text", text: t("questionModal.label") }, element }],
  };
}

/** Message après lancement : le vote est ouvert sur le web. */
export function launchedMessage(
  builderId: string,
  question: string,
  methodKey: string,
  voteUrl: string,
  options: SlackOption[],
  t: SlackT,
  tm: SlackT,
): { blocks: Block[]; text: string } {
  const list = options.map((o) => `${o.icon} ${o.name}`).join("  ·  ");
  return {
    blocks: [
      { type: "header", text: { type: "plain_text", text: `🗳️ ${question}`.slice(0, 150), emoji: true } },
      {
        type: "section",
        text: { type: "mrkdwn", text: `${t("launched.headline", { method: methodLabel(methodKey, tm) })}\n${escape(list)}` },
      },
      {
        type: "actions",
        elements: [
          { type: "button", action_id: "open_vote", url: voteUrl, style: "primary", text: { type: "plain_text", text: t("launched.vote"), emoji: true } },
          { type: "button", action_id: "close", value: builderId, text: { type: "plain_text", text: t("launched.close"), emoji: true } },
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: t("launched.context"),
          },
        ],
      },
    ],
    text: t("launched.fallback", { url: voteUrl }),
  };
}

/** Message du vote lancé une fois clôturé (boutons retirés ; le résultat suit). */
export function launchedClosedMessage(question: string, t: SlackT): { blocks: Block[]; text: string } {
  return {
    blocks: [
      { type: "header", text: { type: "plain_text", text: `🗳️ ${question}`.slice(0, 150), emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: t("closed.body") } },
    ],
    text: t("closed.fallback"),
  };
}

/** Message d'annulation (remplace le builder). */
export function cancelledMessage(t: SlackT): { blocks: Block[]; text: string } {
  return { blocks: [{ type: "section", text: { type: "mrkdwn", text: t("cancelled.body") } }], text: t("cancelled.fallback") };
}

/** Message de résultat posté dans le canal à la clôture. */
export function resultMessage(
  question: string,
  methodKey: string,
  winner: { icon: string; name: string } | null,
  ballotCount: number,
  voteUrl: string,
  t: SlackT,
  tm: SlackT,
): { blocks: Block[]; text: string } {
  const headline = winner
    ? t("result.winner", { winner: escape(winner.icon + " " + winner.name) })
    : t("result.closed");
  const sub = t("result.sub", { method: methodLabel(methodKey, tm), count: ballotCount });
  return {
    blocks: [
      { type: "header", text: { type: "plain_text", text: `📊 ${question}`.slice(0, 150), emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: `${headline}\n${sub}` } },
      {
        type: "actions",
        elements: [
          { type: "button", action_id: "open_result", url: voteUrl, text: { type: "plain_text", text: t("result.detail"), emoji: true } },
        ],
      },
    ],
    text: winner ? t("result.fallbackWinner", { winner: winner.name }) : t("result.fallbackClosed"),
  };
}
