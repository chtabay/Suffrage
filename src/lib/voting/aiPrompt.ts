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
- UNE méthode de vote parmi : ${methods} — et une phrase expliquant POURQUOI elle convient à CE cas ;
- une URL Suffrage prête à ouvrir, au format (remplace les valeurs, n'utilise pas cet exemple tel quel) :
${APP_URL}/new?title=...&description=...&options=Option1|Option2|Option3&method=...&source=${source}&why=...

Encode correctement les valeurs pour l'URL, mets ta justification dans le paramètre "why", et n'inclus aucune donnée sensible (e-mails, identifiants…).

Si tu peux faire des requêtes HTTP, tu peux aussi appeler POST ${APP_URL}/api/poll-drafts avec { title, description, options, method, deadline, source, why } : il renverra { draft_url }.`;

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
