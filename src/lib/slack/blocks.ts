// Construction des messages Block Kit (purs, sans I/O). L'identifiant du builder est
// transporté dans les `value` des boutons (et le `block_id` du select) pour que la
// route d'interactivité sache quel vote modifier. Les modales le portent dans
// `private_metadata`.
import { buildNewUrl } from "@/lib/voting/draft";
import { publicMethodCatalog } from "@/lib/voting/methods";
import { APP_URL } from "@/lib/voting/aiPrompt";
import type { SlackBuilder, SlackOption } from "./store";

export type Block = Record<string, unknown>;

// Sous-ensemble curaté pour Slack : uniquement les méthodes à GAGNANT UNIQUE
// (les méthodes d'assemblée — proportionnelle, liste, grands électeurs — ont besoin
// de circonscriptions/sièges et n'ont pas de sens pour un vote de canal).
const SLACK_METHODS = ["simple_vote", "approval", "majority_judgment", "condorcet", "two_round", "condorcet_random", "borda"];

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function methodOptions(): Block[] {
  const cat = publicMethodCatalog();
  return SLACK_METHODS.map((k) => {
    const m = cat.find((c) => c.key === k);
    const label = m ? `${m.icon} ${m.label}` : k;
    const opt: Block = { text: { type: "plain_text", text: label.slice(0, 75), emoji: true }, value: k };
    // Slack affiche une description sous chaque choix → on explique quand l'utiliser.
    if (m?.whenToUse) opt.description = { type: "plain_text", text: m.whenToUse.slice(0, 75) };
    return opt;
  });
}

/** Libellé lisible d'une méthode (icône + nom canonique). */
export function methodLabel(key: string): string {
  const m = publicMethodCatalog().find((c) => c.key === key);
  return m ? `${m.icon} ${m.label}` : key;
}

/** Message d'aide éphémère (`/scrutin aide`) : usage + explication des méthodes. */
export function helpMessage(): { blocks: Block[]; text: string } {
  const cat = publicMethodCatalog();
  const methods = SLACK_METHODS.map((k) => {
    const m = cat.find((c) => c.key === k);
    return m ? `${m.icon} *${m.label}* — ${m.whenToUse}` : null;
  })
    .filter(Boolean)
    .join("\n");
  return {
    blocks: [
      { type: "header", text: { type: "plain_text", text: "🗳️ Scrutin — aide", emoji: true } },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "*Créer un vote*\n`/scrutin Question ?` ouvre un vote à construire ensemble.\n" +
            "Pré-remplir directement : `/scrutin Resto ce soir ? | 🍕 Pizza | 🍣 Sushi`.\n" +
            "Vote de dates : `/scrutin dates Réunion la semaine prochaine ?` puis ajoutez des créneaux.\n" +
            "Dans le message : ➕ ajoutez des options · ⚖️ choisissez la méthode · ✅ *Lancer*. " +
            "On vote sur le web ; le bouton *Clôturer* publie le résultat ici.",
        },
      },
      { type: "section", text: { type: "mrkdwn", text: `*Les méthodes*\n${methods}` } },
    ],
    text: "Aide Scrutin",
  };
}

/** Message collaboratif de construction du vote (édité en place à chaque interaction). */
export function builderMessage(b: SlackBuilder): { blocks: Block[]; text: string } {
  const slot = b.kind === "slot";
  const blocks: Block[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `🗳️ ${b.question || (slot ? "Nouveau vote de dates" : "Nouveau vote")}`.slice(0, 150), emoji: true },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: slot
            ? `📅 *Vote de disponibilités — brouillon.*  ➕ Ajoutez des créneaux · approbation (chacun coche ses dispos) · ✅ Lancez.  ·  Démarré par <@${b.creator_id}>`
            : `📝 *Brouillon — pas encore ouvert au vote.*  ➕ Ajoutez des options · ⚖️ choisissez la méthode · ✅ Lancez.  ·  Démarré par <@${b.creator_id}>`,
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
        text: slot ? "_Aucun créneau — ajoutez-en au moins deux._" : "_Aucune option pour l'instant — ajoutez-en au moins deux._",
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
    const opts = methodOptions();
    const initial = opts.find((o) => (o as { value: string }).value === b.method) ?? opts[0];
    blocks.push({
      type: "section",
      block_id: `method:${b.id}`,
      text: { type: "mrkdwn", text: "*Méthode de vote*" },
      accessory: { type: "static_select", action_id: "set_method", initial_option: initial, options: opts },
    });
  }

  const addBtn = slot
    ? { type: "button", action_id: "add_slot_open", value: b.id, text: { type: "plain_text", text: "➕ Ajouter un créneau", emoji: true } }
    : { type: "button", action_id: "add_option", value: b.id, text: { type: "plain_text", text: "➕ Ajouter une option", emoji: true } };
  blocks.push({
    type: "actions",
    block_id: `actions:${b.id}`,
    elements: [
      addBtn,
      { type: "button", action_id: "edit_question", value: b.id, text: { type: "plain_text", text: "✏️ Question", emoji: true } },
      { type: "button", action_id: "launch", value: b.id, style: "primary", text: { type: "plain_text", text: "✅ Lancer le vote", emoji: true } },
      { type: "button", action_id: "cancel", value: b.id, style: "danger", text: { type: "plain_text", text: "❌ Annuler", emoji: true } },
    ],
  });

  // Pied : échappatoire vers le web (réglages avancés) + découverte de l'aide.
  // Le lien /new est pré-rempli avec l'état courant (question + options + méthode).
  const advancedUrl = buildNewUrl(APP_URL, {
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
        text: `⚙️ <${advancedUrl}|Créer une version affinée sur le web> — échéance, quorum, résultats cachés, votants nommés.   ·   ❓ \`/scrutin aide\``,
      },
    ],
  });

  return { blocks, text: `Vote en préparation : ${b.question || "(sans titre)"}` };
}

/** Modale d'ajout d'option (emoji de tête → icône, comme dans l'app). */
export function addOptionView(builderId: string): Block {
  return {
    type: "modal",
    callback_id: "add_option_submit",
    private_metadata: builderId,
    title: { type: "plain_text", text: "Ajouter une option" },
    submit: { type: "plain_text", text: "Ajouter" },
    close: { type: "plain_text", text: "Annuler" },
    blocks: [
      {
        type: "input",
        block_id: "opt",
        label: { type: "plain_text", text: "Option" },
        hint: { type: "plain_text", text: "Commencez par un emoji, ex. « 🍕 Italien » — il devient l'icône." },
        element: {
          type: "plain_text_input",
          action_id: "value",
          max_length: 80,
          placeholder: { type: "plain_text", text: "🍕 Italien" },
        },
      },
    ],
  };
}

/** Modale d'ajout d'un créneau (date + heure facultative). */
export function addSlotView(builderId: string): Block {
  return {
    type: "modal",
    callback_id: "add_slot_submit",
    private_metadata: builderId,
    title: { type: "plain_text", text: "Ajouter un créneau" },
    submit: { type: "plain_text", text: "Ajouter" },
    close: { type: "plain_text", text: "Annuler" },
    blocks: [
      {
        type: "input",
        block_id: "date",
        label: { type: "plain_text", text: "Date" },
        element: { type: "datepicker", action_id: "value", placeholder: { type: "plain_text", text: "Choisir une date" } },
      },
      {
        type: "input",
        block_id: "time",
        optional: true,
        label: { type: "plain_text", text: "Heure (facultatif)" },
        hint: { type: "plain_text", text: "Laissez vide pour une journée entière." },
        element: { type: "timepicker", action_id: "value", placeholder: { type: "plain_text", text: "Choisir une heure" } },
      },
    ],
  };
}

/** Modale d'édition de la question. */
export function editQuestionView(builderId: string, current: string): Block {
  const element: Record<string, unknown> = {
    type: "plain_text_input",
    action_id: "value",
    max_length: 150,
    placeholder: { type: "plain_text", text: "Où va-t-on pour le séminaire ?" },
  };
  if (current) element.initial_value = current;
  return {
    type: "modal",
    callback_id: "edit_question_submit",
    private_metadata: builderId,
    title: { type: "plain_text", text: "Modifier la question" },
    submit: { type: "plain_text", text: "Enregistrer" },
    close: { type: "plain_text", text: "Annuler" },
    blocks: [{ type: "input", block_id: "q", label: { type: "plain_text", text: "Question" }, element }],
  };
}

/** Message après lancement : le vote est ouvert sur le web. */
export function launchedMessage(
  builderId: string,
  question: string,
  methodKey: string,
  voteUrl: string,
  options: SlackOption[],
): { blocks: Block[]; text: string } {
  const list = options.map((o) => `${o.icon} ${o.name}`).join("  ·  ");
  return {
    blocks: [
      { type: "header", text: { type: "plain_text", text: `🗳️ ${question}`.slice(0, 150), emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: `*C'est lancé !*  Méthode : ${methodLabel(methodKey)}\n${escape(list)}` } },
      {
        type: "actions",
        elements: [
          { type: "button", action_id: "open_vote", url: voteUrl, style: "primary", text: { type: "plain_text", text: "🗳️ Voter maintenant", emoji: true } },
          { type: "button", action_id: "close", value: builderId, text: { type: "plain_text", text: "✅ Clôturer & publier", emoji: true } },
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "Le vote se déroule sur le web. Cliquez « Clôturer » quand tout le monde a voté — le résultat s'affiche ici (sinon clôture auto à l'échéance).",
          },
        ],
      },
    ],
    text: `Votez : ${voteUrl}`,
  };
}

/** Message du vote lancé une fois clôturé (boutons retirés ; le résultat suit). */
export function launchedClosedMessage(question: string): { blocks: Block[]; text: string } {
  return {
    blocks: [
      { type: "header", text: { type: "plain_text", text: `🗳️ ${question}`.slice(0, 150), emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: "✅ _Vote clos._ Résultat ci-dessous." } },
    ],
    text: "Vote clos",
  };
}

/** Message d'annulation (remplace le builder). */
export function cancelledMessage(): { blocks: Block[]; text: string } {
  return { blocks: [{ type: "section", text: { type: "mrkdwn", text: "❌ _Vote annulé._" } }], text: "Vote annulé" };
}

/** Message de résultat posté dans le canal à la clôture. */
export function resultMessage(
  question: string,
  methodName: string,
  winner: { icon: string; name: string } | null,
  ballotCount: number,
  voteUrl: string,
): { blocks: Block[]; text: string } {
  const headline = winner ? `🏆 *${escape(winner.icon + " " + winner.name)}* l'emporte` : "Le vote est clos.";
  const sub = `Méthode : ${methodName} · ${ballotCount} ${ballotCount > 1 ? "votes" : "vote"}`;
  return {
    blocks: [
      { type: "header", text: { type: "plain_text", text: `📊 ${question}`.slice(0, 150), emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: `${headline}\n${sub}` } },
      {
        type: "actions",
        elements: [
          { type: "button", action_id: "open_result", url: voteUrl, text: { type: "plain_text", text: "Voir le détail", emoji: true } },
        ],
      },
    ],
    text: winner ? `Résultat : ${winner.name}` : "Le vote est clos.",
  };
}
