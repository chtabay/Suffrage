// Brouillon de scrutin : pré-remplissage de l'écran de création depuis /new?…
// Toutes les entrées (URL, IA, Slack, API) convergent ici → un brouillon à relire.
import { recipeForSystem } from "./engine";
import { publicMethodToSystem } from "./methods";
import { SCALE_KEYS } from "./scales";
import { isAssignMethod, type AssignMethodKey } from "@/lib/assign/methods";
import { isPlaceUrl, parseLatLng, sanitizePlace } from "./geo";
import type { Option, Recipe } from "./types";
import { intlLocale, pickLocale } from "@/i18n/locales";

export const DRAFT_ICONS = ["📌", "⭐", "🔥", "🌟", "🎯", "🎪", "🎨", "🍀", "🌈", "🚀", "🎲", "🧭"];

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

/**
 * Libellé d'un créneau qui peut s'étendre sur plusieurs jours :
 * « sam. 11 – dim. 12 juil. » (week-end) ou le libellé simple sans `end`.
 */
export function slotRangeLabel(at: string, end: string | undefined, locale = "fr"): string {
  if (!end || end <= at.split("T")[0]) return slotLabel(at, locale);
  return `${slotLabel(at, locale)} – ${slotLabel(end, locale)}`;
}

/** Encodage d'un créneau dans le paramètre `dates` : "JOUR" ou "DÉBUT..FIN". */
export function encodeSlot(o: { at?: string; end?: string }): string {
  if (!o.at) return "";
  return o.end ? `${o.at}..${o.end}` : o.at;
}

/** Lecture inverse : "2026-07-11..2026-07-12" → { at, end }. */
export function decodeSlot(raw: string): { at: string; end?: string } | null {
  const s = raw.trim();
  if (!s) return null;
  const [a, b] = s.split("..");
  const at = a.trim();
  if (!at) return null;
  const end = b?.trim();
  // Une plage est une suite de JOURS entiers : ni heure, ni fin antérieure au début.
  if (end && /^\d{4}-\d{2}-\d{2}$/.test(end) && !at.includes("T") && end > at) return { at, end };
  return { at };
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
      // « DÉBUT..FIN » = créneau de plusieurs jours (un week-end, un séminaire).
      draft.options = slots
        .map(decodeSlot)
        .filter((s): s is { at: string; end?: string } => s !== null)
        .map((s) => ({ icon: SLOT_ICON, name: slotRangeLabel(s.at, s.end, locale), at: s.at, ...(s.end ? { end: s.end } : {}) }));
    }
  } else {
    const opts = first(params.options);
    if (opts) {
      // La virgule n'est un séparateur QUE s'il n'y a pas de barre verticale :
      // sinon « Chez Mario, Bastille » créerait deux options et décalerait d'un
      // cran les listes alignées par index (places, notes, media).
      const names = opts
        .split(opts.includes("|") ? "|" : /[|,]/)
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
    // Un lien de CARTE passé dans `media` est en réalité une localisation : on le
    // reclasse (les IA ont longtemps mis les liens Maps ici — rétro-compatibilité).
    const media = first(params.media);
    if (media && draft.options) {
      const urls = media.split("|");
      draft.options = draft.options.map((o, i) => {
        const u = safeUrl(urls[i]);
        if (!u) return o;
        return isPlaceUrl(u) ? { ...o, place: u } : { ...o, url: u };
      });
    }

    // Localisations par option : `places`, aligné par index. Les coordonnées sont
    // extraites quand le lien les porte (un lien court sera résolu dans l'écran).
    const places = first(params.places);
    if (places && draft.options) {
      const list = places.split("|");
      draft.options = draft.options.map((o, i) => {
        // Lien de carte reconnu ou coordonnées brutes, rien d'autre : un lien
        // quelconque ne doit pas emprunter la crédibilité d'une carte.
        const p = sanitizePlace(list[i]);
        if (!p) return o;
        const geo = parseLatLng(p);
        return { ...o, place: p, ...(geo ? { lat: geo.lat, lng: geo.lng } : {}) };
      });
    }
  }

  // Commentaires par option : `notes`, aligné par index (vaut aussi pour les créneaux).
  const notes = first(params.notes);
  if (notes && draft.options) {
    const list = notes.split("|");
    draft.options = draft.options.map((o, i) => {
      const n = list[i]?.trim().slice(0, 200);
      return n ? { ...o, note: n } : o;
    });
  }

  const method = first(params.method);
  if (method) {
    const system = publicMethodToSystem(method);
    if (system) draft.recipe = recipeForSystem(system);
  }

  // Mode sondage : panorama des avis, pas de vainqueur. Sans méthode explicite,
  // défaut approbation (la prévalence, l'outil du panorama par excellence).
  const survey = first(params.survey);
  if (survey && /^(1|true|yes|oui)$/i.test(survey.trim())) {
    draft.recipe = { ...(draft.recipe ?? recipeForSystem("approval")), survey: true };
  }

  // Échelle de mentions (jugement majoritaire). N'a de sens que sur une recette mj :
  // on force la méthode pour que le paramètre soit auto-porteur (ex. sondage gradué).
  const scale = first(params.scale);
  if (scale && (SCALE_KEYS as string[]).includes(scale.trim())) {
    const base =
      draft.recipe?.counting === "mj"
        ? draft.recipe
        : { ...recipeForSystem("mj"), ...(draft.recipe?.survey ? { survey: true } : {}) };
    draft.recipe = { ...base, scale: scale.trim() };
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
  /** Liens de LOCALISATION (carte) alignés par index — situent les options sur la carte du vote. */
  places?: string[];
  /** Commentaires courts alignés par index (pourquoi cette option). */
  notes?: string[];
  /** Vote « dates » : créneaux ISO/datetime-local. S'ils sont fournis, remplacent `options`. */
  dates?: string[];
  method?: string;
  /** Affectation : méthode + participants (+ côté 2 « Nom ; capacité » pour deux groupes). */
  assign?: string;
  participants?: string[];
  sideb?: string[];
  /** Affectation multi-objets : nombre d'objets (ou créneaux) reçus par personne. */
  per?: number;
  /** Mode sondage : panorama des avis, personne n'est déclaré vainqueur. */
  survey?: boolean;
  /** Jugement majoritaire : clé de l'échelle de mentions (mentions, agreement, severity…). */
  scale?: string;
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
    // Les créneaux acceptent la forme « DÉBUT..FIN » (plusieurs jours).
    p.set("dates", d.dates.map((s) => s.trim()).filter(Boolean).join("|"));
  } else {
    if (d.options && d.options.length) p.set("options", d.options.join("|"));
    // Une barre verticale À L'INTÉRIEUR d'une URL (waypoints Google Maps…) est
    // échappée : sans cela elle créerait une entrée et décalerait tout le reste.
    const pipeSafe = (u: string | undefined) => (safeUrl(u) ?? "").replace(/\|/g, "%7C");
    if (d.media && d.media.some((u) => safeUrl(u))) {
      p.set("media", d.media.map(pipeSafe).join("|"));
    }
    if (d.places && d.places.some((u) => sanitizePlace(u))) {
      p.set("places", d.places.map((u) => (sanitizePlace(u) ?? "").replace(/\|/g, "%7C")).join("|"));
    }
  }
  if (d.notes && d.notes.some((n) => n && n.trim())) {
    p.set("notes", d.notes.map((n) => (n ?? "").trim().replace(/\|/g, " ").slice(0, 200)).join("|"));
  }
  if (d.method) p.set("method", d.method);
  if (d.assign) p.set("assign", d.assign);
  if (d.participants && d.participants.length) p.set("participants", d.participants.map((s) => s.trim()).filter(Boolean).join("|"));
  if (d.sideb && d.sideb.length) p.set("sideb", d.sideb.map((s) => s.trim()).filter(Boolean).join("|"));
  if (d.per && d.per >= 2) p.set("per", String(Math.min(6, Math.floor(d.per))));
  if (d.survey) p.set("survey", "1");
  if (d.scale && (SCALE_KEYS as string[]).includes(d.scale)) p.set("scale", d.scale);
  if (d.deadline) p.set("deadline", d.deadline);
  if (d.source) p.set("source", d.source);
  if (d.why) p.set("why", d.why);
  const qs = p.toString();
  return qs ? `${base}/new?${qs}` : `${base}/new`;
}
