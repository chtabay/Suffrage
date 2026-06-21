// Brouillon de scrutin : pré-remplissage de l'écran de création depuis /new?…
// Toutes les entrées (URL, IA, Slack, API) convergent ici → un brouillon à relire.
import { recipeForSystem } from "./engine";
import { publicMethodToSystem } from "./methods";
import type { Option, Recipe } from "./types";

const DRAFT_ICONS = ["📌", "⭐", "🔥", "🌟", "🎯", "🎪", "🎨", "🍀", "🌈", "🚀", "🎲", "🧭"];

export interface ScrutinDraft {
  question?: string;
  description?: string;
  options?: Option[];
  recipe?: Recipe;
  closesAt?: string;
  /** Origine du brouillon (claude, chatgpt, gemini, slack, teams…). */
  source?: string;
  /** Justification (notamment du choix de méthode) à afficher pour la confiance. */
  why?: string;
}

type RawParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

/** Convertit les paramètres d'URL /new en brouillon (toujours un objet, possiblement vide). */
export function parseDraft(params: RawParams): ScrutinDraft {
  const draft: ScrutinDraft = {};

  const title = first(params.title);
  if (title && title.trim()) draft.question = title.trim().slice(0, 200);

  const description = first(params.description);
  if (description && description.trim()) draft.description = description.trim().slice(0, 500);

  const opts = first(params.options);
  if (opts) {
    const names = opts
      .split(/[|,]/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 12);
    if (names.length >= 2) {
      draft.options = names.map((name, i) => ({ icon: DRAFT_ICONS[i % DRAFT_ICONS.length], name: name.slice(0, 80) }));
    }
  }

  const method = first(params.method);
  if (method) {
    const system = publicMethodToSystem(method);
    if (system) draft.recipe = recipeForSystem(system);
  }

  const deadline = first(params.deadline);
  if (deadline) {
    const ms = Date.parse(deadline);
    if (!Number.isNaN(ms) && ms > Date.now()) {
      const d = new Date(ms);
      const pad = (n: number) => String(n).padStart(2, "0");
      draft.closesAt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
        d.getMinutes(),
      )}`;
    }
  }

  const source = first(params.source);
  if (source && source.trim()) draft.source = source.trim().slice(0, 40);

  const why = first(params.why) ?? first(params.justification);
  if (why && why.trim()) draft.why = why.trim().slice(0, 280);

  return draft;
}

export interface DraftInput {
  title?: string;
  description?: string;
  options?: string[];
  method?: string;
  deadline?: string;
  source?: string;
  why?: string;
}

/** Construit une URL /new à partir d'un brouillon structuré (API, partages…). */
export function buildNewUrl(base: string, d: DraftInput): string {
  const p = new URLSearchParams();
  if (d.title) p.set("title", d.title);
  if (d.description) p.set("description", d.description);
  if (d.options && d.options.length) p.set("options", d.options.join("|"));
  if (d.method) p.set("method", d.method);
  if (d.deadline) p.set("deadline", d.deadline);
  if (d.source) p.set("source", d.source);
  if (d.why) p.set("why", d.why);
  const qs = p.toString();
  return qs ? `${base}/new?${qs}` : `${base}/new`;
}
