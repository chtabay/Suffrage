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
- 2 à 8 options (reformule/fusionne si besoin), avec un emoji par option ;
- facultatif : pour une option, une URL d'illustration http(s) (image, vidéo, document) qui aide à choisir ;
- si la décision porte sur un MOMENT (« quand ? » : réunion, dîner, sortie…), n'utilise PAS "options" mais "dates" : la liste des créneaux candidats au format ISO/datetime-local (ex. 2026-07-12T20:00), et choisis l'approbation (chacun coche tous les créneaux qui lui conviennent — le plus disponible gagne) ;
- UNE méthode de vote parmi : ${methods} — et une phrase expliquant POURQUOI elle convient à CE cas (pour un vote de dates, uniquement des méthodes à gagnant unique : approbation de préférence, ou majoritaire/condorcet/jugement majoritaire/borda — jamais proportional, list ni grand_electors) ;
- une URL Suffrage prête à ouvrir, au format (remplace les valeurs, n'utilise pas cet exemple tel quel) :
${APP_URL}/new?title=...&description=...&options=Option1|Option2|Option3&media=url1||url3&method=...&source=${source}&why=...
Variante « dates » (un vote de créneaux : remplace options/media par dates) :
${APP_URL}/new?title=...&description=...&dates=2026-07-12T20:00|2026-07-13T12:30&method=approval&source=${source}&why=...

Le paramètre "media" est facultatif : une URL par option, dans le MÊME ordre que "options", séparées par | (laisse vide une option sans illustration). Le paramètre "dates" remplace "options" pour un vote de créneaux. Encode correctement les valeurs pour l'URL, mets ta justification dans le paramètre "why", et n'inclus aucune donnée sensible (e-mails, identifiants…).

Si tu peux faire des requêtes HTTP, tu peux aussi appeler POST ${APP_URL}/api/poll-drafts avec { title, description, options (OU dates pour des créneaux), media, method, deadline, source, why } (media = URLs alignées sur options ; dates = créneaux ISO) : il renverra { draft_url }.`;

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
