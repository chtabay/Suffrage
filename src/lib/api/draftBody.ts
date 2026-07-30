import { isAssignMethod } from "@/lib/assign/methods";
import { publicMethodToSystem } from "@/lib/voting/methods";
import { SCALE_KEYS } from "@/lib/voting/scales";
import type { DraftInput } from "@/lib/voting/draft";

// Vocabulaire d'entrée COMMUN aux routes agent : /api/poll-drafts (qui rend une
// URL à ouvrir) et /api/polls (qui crée réellement). Un seul analyseur, donc un
// seul contrat — c'est celui documenté dans llms.txt et sur /ai. Deux copies
// auraient divergé au premier champ ajouté.
const str = (v: unknown, max: number): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;

const list = (v: unknown, max: number, cut = 200): string[] | undefined =>
  Array.isArray(v)
    ? v
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim().slice(0, cut))
        .filter(Boolean)
        .slice(0, max)
    : undefined;

/** Colonnes alignées par index sur `options` : les trous comptent, on ne filtre pas. */
const aligned = (v: unknown, max: number, cut = 500): string[] | undefined =>
  Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x.slice(0, cut) : "")).slice(0, max) : undefined;

export interface ParsedBody {
  fields: DraftInput;
  /** Ce qu'on a écarté et pourquoi — renvoyé à l'appelant pour qu'il corrige. */
  ignored?: Record<string, string>;
}

export function parseDraftBody(body: unknown, origin: string): ParsedBody {
  const b = (body ?? {}) as Record<string, unknown>;
  const ignored: Record<string, string> = {};

  const methodInput = typeof b.method === "string" ? b.method : undefined;
  const method = methodInput && publicMethodToSystem(methodInput) ? methodInput : undefined;
  if (methodInput && !method) ignored.method = `méthode inconnue « ${methodInput} » (voir ${origin}/ai)`;

  const assignInput = typeof b.assign === "string" ? b.assign.trim() : undefined;
  const assign = assignInput && isAssignMethod(assignInput) ? assignInput : undefined;
  if (assignInput && !assign) ignored.assign = `méthode d'affectation inconnue « ${assignInput} » (voir ${origin}/ai)`;

  const scaleInput = typeof b.scale === "string" ? b.scale.trim() : undefined;
  const scale = scaleInput && (SCALE_KEYS as string[]).includes(scaleInput) ? scaleInput : undefined;
  if (scaleInput && !scale) ignored.scale = `échelle inconnue « ${scaleInput} »`;

  const per = typeof b.per === "number" && Number.isInteger(b.per) && b.per >= 2 && b.per <= 6 ? b.per : undefined;

  return {
    fields: {
      title: str(b.title, 200),
      description: str(b.description, 500),
      options: list(b.options, 12),
      media: aligned(b.media, 12),
      places: aligned(b.places, 12),
      notes: aligned(b.notes, 12, 200),
      dates: list(b.dates, 12),
      method,
      assign,
      participants: list(b.participants, 60),
      sideb: list(b.sideb, 60),
      per,
      survey: b.survey === true || b.survey === 1 || b.survey === "1" || b.survey === "true" ? true : undefined,
      scale,
      deadline: str(b.deadline, 40),
      source: str(b.source, 40),
      why: str(b.why, 280),
    },
    ignored: Object.keys(ignored).length ? ignored : undefined,
  };
}
