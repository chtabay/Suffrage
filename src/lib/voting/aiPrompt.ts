// Prompt « Préparer avec une IA » : l'assistant interroge d'abord l'utilisateur
// (au lancement on ne connaît pas forcément le sujet), puis propose un vote et
// renvoie une URL /new prête à ouvrir. Bilingue selon la locale de l'utilisateur.
import { PUBLIC_METHODS } from "./methods";
import type { Option } from "./types";

export const APP_URL = "https://placet.app";

export function buildAiPrompt(question: string, options: Option[], source: string, locale = "fr"): string {
  const methods = PUBLIC_METHODS.map((m) => m.key).join(", ");
  const opts = options.map((o) => o.name.trim()).filter(Boolean);
  const hasContext = Boolean(question.trim()) || opts.length > 0;

  if (locale === "en") {
    const proposal = `Once you understand my decision, propose:
- a short, clear title;
- if context helps people vote (place, budget, deadline…), a short optional description;
- 2 to 8 options (rephrase/merge as needed); start EACH option with a relevant emoji — e.g. "🍕 Italian" — the app turns it into the icon;
- if the decision is about a TIME ("when?": a meeting, dinner, outing…), use "dates" instead of "options": the candidate slots in ISO format (e.g. 2026-07-12T20:00), and choose approval (everyone ticks what works for them — the most available wins);
- ONE method among: ${methods} — and one sentence explaining WHY (for a date vote: single winner only — approval preferably, otherwise majority/condorcet/majority judgment/borda; never proportional, list or grand_electors).

Then build the Placet URL below and PRESENT IT AS A CLICKABLE LINK (a markdown link with a clear label, e.g. "👉 Open the voting draft"), never the full raw URL. Keep it SHORT.
${APP_URL}/new?title=...&description=...&options=🍕 Italian|🍣 Japanese&method=...&source=${source}&why=...
Date vote (replace "options" with "dates"):
${APP_URL}/new?title=...&dates=2026-07-12T20:00|2026-07-13T12:30&method=approval&source=${source}&why=...
Encode the values properly, put your rationale in "why", and include no sensitive data (emails, IDs…).

Images: DO NOT put them in the link (it makes it long and often breaks). Just tell the user they can add an image per option in the app (🔗 button).

This /new link works EVERYWHERE, including inside ChatGPT, Claude or Gemini: it's your default output. ONLY if you can actually make HTTP requests (an agent, a GPT with "Actions", MCP — a plain chat cannot) may you instead POST ${APP_URL}/api/poll-drafts with { title, description, options (or dates), media, method, deadline, source, why } and present the returned { draft_url } as a clickable link. When in doubt, give the /new link.`;

    if (!hasContext) {
      // Cold start (home rail): no topic known yet.
      return `I want to run a group vote with Placet (${APP_URL}), but I haven't defined the topic yet.

Start by asking me, one step at a time: what decision are we settling? what options are possible? who votes and how many people? is there a deadline? are we after a clear winner or a broad consensus? Ask me these questions and wait for my answers — don't guess the topic and don't invent any options, everything must come from me.

${proposal}`;
    }

    const startLines = [
      question.trim() ? `Likely decision: ${question.trim()}` : null,
      opts.length ? `Options considered: ${opts.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    return `Help me prepare a vote with Placet (${APP_URL}).

Here's what I have so far (to confirm, not final):
${startLines}

Before wrapping up, ask me the useful questions to clear up any ambiguity: options to add/merge, who votes, deadline, clear winner or consensus. Wait for my answers, don't fill in for me.

${proposal}`;
  }

  // ---- FR (défaut) ----
  const proposal = `Une fois que tu as compris ma décision, propose :
- un titre court et clair ;
- si le contexte aide à voter (lieu, budget, échéance…), un court descriptif facultatif ;
- 2 à 8 options (reformule/fusionne si besoin) ; commence CHAQUE option par un emoji pertinent — ex. "🍕 Italien" — l'app en fera l'icône ;
- si la décision porte sur un MOMENT (« quand ? » : réunion, dîner, sortie…), utilise "dates" au lieu de "options" : les créneaux candidats au format ISO (ex. 2026-07-12T20:00), et choisis l'approbation (chacun coche ce qui lui convient — le plus disponible gagne) ;
- UNE méthode parmi : ${methods} — et une phrase expliquant POURQUOI (pour un vote de dates : uniquement gagnant unique — approbation de préférence, sinon majoritaire/condorcet/jugement majoritaire/borda ; jamais proportional, list ni grand_electors).

Construis ensuite l'URL Placet ci-dessous et PRÉSENTE-LA COMME UN LIEN CLIQUABLE (lien markdown avec un libellé clair, ex. « 👉 Ouvrir le brouillon de vote »), jamais l'URL brute en entier. Garde-la COURTE.
${APP_URL}/new?title=...&description=...&options=🍕 Italien|🍣 Japonais&method=...&source=${source}&why=...
Vote de créneaux (remplace "options" par "dates") :
${APP_URL}/new?title=...&dates=2026-07-12T20:00|2026-07-13T12:30&method=approval&source=${source}&why=...
Encode correctement les valeurs, mets ta justification dans "why", n'inclus aucune donnée sensible (e-mails, identifiants…).

Images : NE LES METS PAS dans le lien (ça l'allonge et casse souvent). Dis simplement à l'utilisateur qu'il pourra ajouter une image par option dans l'app (bouton 🔗).

Ce lien /new fonctionne PARTOUT, y compris dans ChatGPT, Claude ou Gemini : c'est ta sortie par défaut. UNIQUEMENT si tu peux réellement faire des requêtes HTTP (agent, GPT à « Actions », MCP — un simple chat ne le peut pas), tu peux à la place POST ${APP_URL}/api/poll-drafts avec { title, description, options (ou dates), media, method, deadline, source, why } et présenter le { draft_url } reçu comme lien cliquable. Dans le doute, donne le lien /new.`;

  if (!hasContext) {
    // Lancement « à froid » (rail d'accueil) : aucun sujet connu.
    return `Je veux organiser un vote de groupe avec Placet (${APP_URL}), mais je n'ai pas encore défini le sujet.

Commence par m'interroger, une étape à la fois : quelle décision veut-on trancher ? quelles options possibles ? qui vote et combien de personnes ? y a-t-il une date limite ? cherche-t-on un gagnant net ou plutôt un consensus large ? Pose-moi ces questions et attends mes réponses — ne devine pas le sujet et n'invente aucune option, tout doit venir de moi.

${proposal}`;
  }

  // Un début de saisie existe (écran de création) : on le donne comme point de départ.
  const startLines = [
    question.trim() ? `Décision pressentie : ${question.trim()}` : null,
    opts.length ? `Options envisagées : ${opts.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `Aide-moi à préparer un vote avec Placet (${APP_URL}).

Voici ce que j'ai pour l'instant (à confirmer, pas figé) :
${startLines}

Avant de conclure, pose-moi les questions utiles pour lever les ambiguïtés : options à ajouter/fusionner, qui vote, date limite, gagnant net ou consensus. Attends mes réponses, ne complète pas à ma place.

${proposal}`;
}
