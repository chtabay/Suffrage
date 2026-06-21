// Brouillon de scrutin : pré-remplissage de l'écran de création depuis /new?…
// Voir la doc /ai (à venir) pour le vocabulaire public.
import { recipeForSystem } from "./engine";
import type { Option, Recipe } from "./types";

/** Vocabulaire public des méthodes → clé interne de système. */
const PUBLIC_METHOD: Record<string, string> = {
  simple_vote: "fptp",
  majority: "fptp",
  fptp: "fptp",
  two_round: "runoff",
  runoff: "runoff",
  approval: "approval",
  borda: "borda",
  condorcet: "condorcet",
  condorcet_random: "condorcet_random",
  majority_judgment: "mj",
  mj: "mj",
  proportional: "proportional",
  list: "list",
  grand_electors: "indirect",
  indirect: "indirect",
};

const DRAFT_ICONS = ["📌", "⭐", "🔥", "🌟", "🎯", "🎪", "🎨", "🍀", "🌈", "🚀", "🎲", "🧭"];

export interface ScrutinDraft {
  question?: string;
  options?: Option[];
  recipe?: Recipe;
  closesAt?: string;
}

type RawParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

/** Convertit les paramètres d'URL /new en brouillon (toujours un objet, possiblement vide). */
export function parseDraft(params: RawParams): ScrutinDraft {
  const draft: ScrutinDraft = {};

  const title = first(params.title);
  if (title && title.trim()) draft.question = title.trim().slice(0, 200);

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
    const key = PUBLIC_METHOD[method.toLowerCase()];
    if (key) draft.recipe = recipeForSystem(key);
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

  return draft;
}
