// Prompt « Préparer avec une IA » : demande à un assistant de formuler le vote
// et de renvoyer une URL /new prête à ouvrir.
import { PUBLIC_METHODS } from "./methods";
import type { Option } from "./types";

export const APP_URL = "https://suffrage.vercel.app";

export function buildAiPrompt(question: string, options: Option[], source: string): string {
  const methods = PUBLIC_METHODS.map((m) => m.key).join(", ");
  const opts = options.map((o) => o.name.trim()).filter(Boolean);
  const context = question.trim() || "[décris ici la décision à trancher]";
  const optsLine = opts.length ? `\nOptions envisagées : ${opts.join(", ")}` : "";
  return `Aide-moi à préparer un vote avec Suffrage (${APP_URL}).

Décision à trancher :
${context}${optsLine}

Ta mission :
- propose un titre court et clair ;
- liste 2 à 8 options (reformule/fusionne si besoin), avec un emoji par option ;
- recommande UNE méthode de vote parmi : ${methods} ;
- explique en une phrase POURQUOI cette méthode ;
- génère une URL Suffrage prête à ouvrir, au format :
${APP_URL}/new?title=...&options=Option1|Option2|Option3&method=...&source=${source}&why=...

Encode correctement les valeurs pour l'URL, mets ta justification dans le paramètre "why", et n'inclus aucune donnée sensible (e-mails, identifiants…).

Si tu peux faire des requêtes HTTP, tu peux aussi appeler POST ${APP_URL}/api/poll-drafts avec { title, options, method, deadline, source, why } : il renverra { draft_url }.`;
}
