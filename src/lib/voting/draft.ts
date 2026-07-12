// Brouillon de scrutin : pré-remplissage de l'écran de création depuis /new?…
// Toutes les entrées (URL, IA, Slack, API) convergent ici → un brouillon à relire.
import { recipeForSystem } from "./engine";
import { publicMethodToSystem } from "./methods";
import { isAssignMethod, type AssignMethodKey } from "@/lib/assign/methods";
import type { Option, Recipe } from "./types";
import { intlLocale, pickLocale } from "@/i18n/locales";

const DRAFT_ICONS = ["📌", "⭐", "🔥", "🌟", "🎯", "🎪", "🎨", "🍀", "🌈", "🚀", "🎲", "🧭"];

// Emoji de tête d'un libellé d'option (« 🍕 Italien » → icône 🍕 + nom « Italien »).
const LEADING_EMOJI = /^(\p{Extended_Pictographic}(?:‍\p{Extended_Pictographic})*️?)\s+(.+)$/u;
export function splitLeadingEmoji(label: string, fallbackIcon: string): { icon: string; name: string } {
  const m = label.match(LEADING_EMOJI);
  return m ? { icon: m[1], name: m[2].trim() } : { icon: fallbackIcon, name: label };
}

export interface ScrutinDraft {
  question?: string;
  description?: string;
  optionKind?: "text" | "slot" | "assign";
  options?: Option[];
  recipe?: Recipe;
  closesAt?: string;
  /** Affectation : méthode + participants (un nom par ligne) + côté 2 (deux groupes). */
  assignMethod?: AssignMethodKey;
  participants?: string;
  assignSideB?: string;
  /** Affectation de créneaux : les options sont des créneaux datés. */
  assignSlots?: boolean;
  /** Affectation multi-objets : nombre d'objets reçus par personne. */
  assignPer?: number;
  /** Origine du brouillon (claude, chatgpt, gemini, slack, teams…). */
  source?: string;
  /** Justification (notamment du choix de méthode) à afficher pour la confiance. */
  why?: string;
}

type RawParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

/** N'accepte qu'une URL http(s) (les illustrations deviennent cliquables côté votant). */
export const safeUrl = (u: string | undefined): string | undefined => {
  if (!u) return undefined;
  const t = u.trim();
  return /^https?:\/\//i.test(t) ? t.slice(0, 500) : undefined;
};

export const SLOT_ICON = "📅";
/** Libellé lisible d'un créneau : "YYYY-MM-DDThh:mm" (avec heure) ou "YYYY-MM-DD" (journée entière). */
export function slotLabel(local: string, locale = "fr"): string {
  const fallback = pickLocale(locale, { fr: "Créneau à définir", en: "Slot to set", es: "Espacio por definir" });
  if (!local) return fallback;
  const dateOnly = !local.includes("T");
  const d = new Date(dateOnly ? `${local}T00:00` : local);
  if (Number.isNaN(d.getTime())) return fallback;
  const opts: Intl.DateTimeFormatOptions = dateOnly
    ? { weekday: "short", day: "numeric", month: "short" }
    : { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" };
  return d.toLocaleString(intlLocale(locale), opts);
}

/** Convertit les paramètres d'URL /new en brouillon (toujours un objet, possiblement vide). */
export function parseDraft(params: RawParams, locale = "fr"): ScrutinDraft {
  const draft: ScrutinDraft = {};

  const title = first(params.title);
  if (title && title.trim()) draft.question = title.trim().slice(0, 200);

  const description = first(params.description);
  if (description && description.trim()) draft.description = description.trim().slice(0, 500);

  // Vote « dates » : paramètre `dates` (créneaux datetime-local séparés par |).
  // Un créneau = option dont le nom est la date formatée + icône 📅 + champ `at`.
  const datesParam = first(params.dates);
  if (datesParam) {
    const slots = datesParam
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 12);
    if (slots.length >= 2) {
      draft.optionKind = "slot";
      draft.options = slots.map((at) => ({ icon: SLOT_ICON, name: slotLabel(at, locale), at }));
    }
  } else {
    const opts = first(params.options);
    if (opts) {
      const names = opts
        .split(/[|,]/)
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 12);
      if (names.length >= 2) {
        draft.options = names.map((raw, i) => {
          const { icon, name } = splitLeadingEmoji(raw, DRAFT_ICONS[i % DRAFT_ICONS.length]);
          return { icon, name: name.slice(0, 80) };
        });
      }
    }

    // Illustrations par option : paramètre séparé `media`, aligné par index (séparateur |).
    const media = first(params.media);
    if (media && draft.options) {
      const urls = media.split("|");
      draft.options = draft.options.map((o, i) => {
        const u = safeUrl(urls[i]);
        return u ? { ...o, url: u } : o;
      });
    }
  }

  const method = first(params.method);
  if (method) {
    const system = publicMethodToSystem(method);
    if (system) draft.recipe = recipeForSystem(system);
  }

  // Affectation : `assign=<méthode>` + `participants=Alice|Bob` (+ `sideb=X ; 2|Y`
  // pour deux groupes). Les options restent les choses à attribuer (sens unique).
  const assign = first(params.assign);
  if (assign && isAssignMethod(assign.trim())) {
    draft.optionKind = "assign";
    draft.assignMethod = assign.trim() as AssignMethodKey;
    // `dates` + `assign` : affectation de créneaux (les options datées sont déjà posées).
    if (datesParam && draft.options?.length) draft.assignSlots = true;
    const per = Number(first(params.per));
    if (Number.isInteger(per) && per >= 2 && per <= 6) draft.assignPer = per;
    const parts = first(params.participants);
    if (parts) {
      draft.participants = parts
        .split("|")
        .map((x) => x.trim().slice(0, 60))
        .filter(Boolean)
        .slice(0, 60)
        .join("\n");
    }
    const sideb = first(params.sideb);
    if (sideb) {
      draft.assignSideB = sideb
        .split("|")
        .map((x) => x.trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, 60)
        .join("\n");
    }
  }

  // Vote de dates : seules les méthodes à gagnant unique ont du sens → défaut approbation.
  if (draft.optionKind === "slot") {
    const r = draft.recipe;
    const singleWinner = !!r && r.suffrage === "direct" && r.counting !== "proportional" && r.counting !== "list";
    if (!singleWinner) draft.recipe = recipeForSystem("approval");
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
  /** URLs d'illustration alignées par index sur `options` (chaîne vide = aucune). */
  media?: string[];
  /** Vote « dates » : créneaux ISO/datetime-local. S'ils sont fournis, remplacent `options`. */
  dates?: string[];
  method?: string;
  /** Affectation : méthode + participants (+ côté 2 « Nom ; capacité » pour deux groupes). */
  assign?: string;
  participants?: string[];
  sideb?: string[];
  /** Affectation multi-objets : nombre d'objets (ou créneaux) reçus par personne. */
  per?: number;
  deadline?: string;
  source?: string;
  why?: string;
}

/** Construit une URL /new à partir d'un brouillon structuré (API, partages…). */
export function buildNewUrl(base: string, d: DraftInput): string {
  const p = new URLSearchParams();
  if (d.title) p.set("title", d.title);
  if (d.description) p.set("description", d.description);
  if (d.dates && d.dates.length) {
    p.set("dates", d.dates.map((s) => s.trim()).filter(Boolean).join("|"));
  } else {
    if (d.options && d.options.length) p.set("options", d.options.join("|"));
    if (d.media && d.media.some((u) => safeUrl(u))) {
      p.set("media", d.media.map((u) => safeUrl(u) ?? "").join("|"));
    }
  }
  if (d.method) p.set("method", d.method);
  if (d.assign) p.set("assign", d.assign);
  if (d.participants && d.participants.length) p.set("participants", d.participants.map((s) => s.trim()).filter(Boolean).join("|"));
  if (d.sideb && d.sideb.length) p.set("sideb", d.sideb.map((s) => s.trim()).filter(Boolean).join("|"));
  if (d.per && d.per >= 2) p.set("per", String(Math.min(6, Math.floor(d.per))));
  if (d.deadline) p.set("deadline", d.deadline);
  if (d.source) p.set("source", d.source);
  if (d.why) p.set("why", d.why);
  const qs = p.toString();
  return qs ? `${base}/new?${qs}` : `${base}/new`;
}
