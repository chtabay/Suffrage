// Prompt « Préparer avec une IA » : l'assistant interroge d'abord l'utilisateur
// (au lancement on ne connaît pas forcément le sujet), puis propose un vote et
// renvoie une URL /new prête à ouvrir.
import { PUBLIC_METHODS } from "./methods";
import type { Option } from "./types";

export const APP_URL = "https://suffrage.vercel.app";

export function buildAiPrompt(question: string, options: Option[], source: string): string {
  const methods = PUBLIC_METHODS.map((m) => m.key).join(", ");
  const opts = options.map((o) => o.name.trim()).filter(Boolean);
  const hasContext = Boolean(question.trim()) || opts.length > 0;

  // Bloc commun : ce que l'assistant doit produire UNE FOIS le sujet compris.
  const proposal = `Une fois que tu as compris ma décision, propose :
- un titre court et clair ;
- si le contexte aide à voter (lieu, budget, échéance…), un court descriptif facultatif ;
- 2 à 8 options (reformule/fusionne si besoin) ; commence CHAQUE option par un emoji pertinent — ex. "🍕 Italien" — l'app en fera l'icône ;
- si la décision porte sur un MOMENT (« quand ? » : réunion, dîner, sortie…), utilise "dates" au lieu de "options" : les créneaux candidats au format ISO (ex. 2026-07-12T20:00), et choisis l'approbation (chacun coche ce qui lui convient — le plus disponible gagne) ;
- UNE méthode parmi : ${methods} — et une phrase expliquant POURQUOI (pour un vote de dates : uniquement gagnant unique — approbation de préférence, sinon majoritaire/condorcet/jugement majoritaire/borda ; jamais proportional, list ni grand_electors).

Images : FACULTATIVES. N'ajoute "media" QUE si tu disposes de vraies URLs d'images fiables et stables — ne les invente jamais ; dans le doute, n'en mets pas (l'utilisateur les ajoutera dans l'app).

Construis ensuite l'URL Suffrage et PRÉSENTE-LA COMME UN LIEN CLIQUABLE (lien markdown avec un libellé clair, ex. « 👉 Ouvrir le brouillon de vote »), jamais l'URL brute en entier. Garde-la aussi COURTE que possible. Format (remplace les valeurs) :
${APP_URL}/new?title=...&description=...&options=🍕 Italien|🍣 Japonais&method=...&source=${source}&why=...
Vote de créneaux (remplace "options" par "dates") :
${APP_URL}/new?title=...&dates=2026-07-12T20:00|2026-07-13T12:30&method=approval&source=${source}&why=...
Images, seulement si fiables : ajoute &media=urlOption1||urlOption3 (une URL par option, même ordre, vide si aucune).

Encode correctement les valeurs, mets ta justification dans "why", n'inclus aucune donnée sensible (e-mails, identifiants…).

Si tu peux faire des requêtes HTTP, PRÉFÈRE POST ${APP_URL}/api/poll-drafts avec { title, description, options (ou dates), media, method, deadline, source, why } : il renvoie { draft_url } (recommandé dès qu'il y a des images ou une longue liste — ça évite une URL trop longue). Présente ce draft_url comme un lien cliquable.`;

  if (!hasContext) {
    // Lancement « à froid » (rail d'accueil) : aucun sujet connu.
    return `Je veux organiser un vote de groupe avec Suffrage (${APP_URL}), mais je n'ai pas encore défini le sujet.

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

  return `Aide-moi à préparer un vote avec Suffrage (${APP_URL}).

Voici ce que j'ai pour l'instant (à confirmer, pas figé) :
${startLines}

Avant de conclure, pose-moi les questions utiles pour lever les ambiguïtés : options à ajouter/fusionner, qui vote, date limite, gagnant net ou consensus. Attends mes réponses, ne complète pas à ma place.

${proposal}`;
}
