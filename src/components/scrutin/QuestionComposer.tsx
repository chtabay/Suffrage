"use client";

// Composeur de question — libellé, options, méthode, seuil de majorité.
//
// POURQUOI CE COMPOSANT. Composer une question est identique partout : dans une
// AG, dans un cercle, demain ailleurs. Choisir QUI la reçoit ne l'est pas. Ces
// deux choses étaient mariées dans le bloc « Interroger le cercle », qui figeait
// Pour/Contre/Abstention en scrutin uninominal — le cercle n'avait donc accès
// qu'à UNE des douze méthodes, alors que la RPC accepte n'importe quelle recette
// depuis le début. La restriction était entièrement dans l'interface.
//
// Extrait tel quel d'EventEditor pour que son comportement ne change pas d'un
// iota ; le cercle s'y branche et hérite des mêmes possibilités, sans duplication
// à maintenir en double.
import { useState } from "react";
import { useTranslations } from "next-intl";
import { recipeForSystem } from "@/lib/voting/engine";
import { ASSIGN_METHODS } from "@/lib/assign/methods";
import { splitLeadingEmoji } from "@/lib/voting/draft";
import { SYSTEM_ORDER } from "@/lib/voting/systems";
import SlotPicker from "./SlotPicker";
import type { Option, Recipe } from "@/lib/voting/types";
import { FONT_BODY, INK, MUTED, REDTXT, SUBINK } from "./theme";

export interface ComposedQuestion {
  question: string;
  options: Option[];
  recipe: Recipe;
}

/**
 * Méthodes incompatibles avec un vote sur des dates : elles supposent des sièges
 * ou des listes, pas des créneaux. Même exclusion que la création autonome.
 */
const SLOT_EXCLUDED = ["proportional", "list", "indirect"];

/** Construit la sortie à partir de l'état brut. Exporté pour être testable seul. */
export function compose(
  question: string,
  opts: string[],
  method: string,
  majority: number,
  slots?: Option[],
): ComposedQuestion {
  // Un créneau est déjà une Option complète : SlotPicker y cuit le libellé lisible
  // (« lun. 12 mai ») dans `name`, en plus de `at`/`end`. C'est ce qui permet à
  // TOUS les écrans de vote de l'afficher sans rien savoir des dates.
  const options = slots
    ? slots.slice(0, 12)
    : opts
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 8)
        .map((l) => {
          const { icon, name } = splitLeadingEmoji(l, "•");
          return { icon, name: name.slice(0, 80) };
        });
  // Résolution d'affectation : bulletin = classement (borda → mode « rank »), le
  // dépouillement passe par le moteur d'affectation.
  const recipe = method.startsWith("assign:")
    ? { ...recipeForSystem("borda"), assign: method.slice(7) }
    : { ...recipeForSystem(method), threshold: majority };
  return { question: question.trim(), options: options as Option[], recipe: recipe as Recipe };
}

export default function QuestionComposer({
  presetOptions,
  submitLabel,
  busy = false,
  onSubmit,
  extras,
}: {
  /** Préréglage du cas courant (Pour / Contre / Abstention), fourni par l'appelant. */
  presetOptions: () => string[];
  submitLabel: string;
  busy?: boolean;
  onSubmit: (q: ComposedQuestion) => void | Promise<void>;
  /** Contrôles propres à l'appelant (public visé, régime…), rendus avant le bouton. */
  extras?: React.ReactNode;
}) {
  const t = useTranslations("Org");
  const tm = useTranslations("Methods");
  const ta = useTranslations("Assign");

  const [q, setQ] = useState("");
  const [opts, setOpts] = useState<string[]>(presetOptions);
  const [slots, setSlots] = useState<Option[]>([]);
  // Sur quoi porte la question : des propositions, ou des dates (façon Doodle).
  const [kind, setKind] = useState<"text" | "slot">("text");
  const [method, setMethod] = useState("fptp");
  const [majority, setMajority] = useState(50);

  const methods = kind === "slot" ? SYSTEM_ORDER.filter((k) => !SLOT_EXCLUDED.includes(k)) : SYSTEM_ORDER;

  const switchKind = (next: "text" | "slot") => {
    setKind(next);
    // Un vote sur des dates se coche : on veut « toutes celles qui me vont »,
    // pas « une seule ». On bascule donc sur l'approbation — sauf si l'animateur
    // a déjà choisi autre chose de compatible, auquel cas on respecte son choix.
    if (next === "slot" && (method === "fptp" || SLOT_EXCLUDED.includes(method))) setMethod("approval");
  };

  const setOpt = (i: number, v: string) => setOpts((a) => a.map((o, j) => (j === i ? v : o)));
  const addOpt = () => setOpts((a) => (a.length < 8 ? [...a, ""] : a));
  const removeOpt = (i: number) => setOpts((a) => (a.length > 2 ? a.filter((_, j) => j !== i) : a));
  const canSubmit =
    q.trim().length > 0 &&
    (kind === "slot" ? slots.length >= 2 : opts.filter((o) => o.trim()).length >= 2);

  const submit = async () => {
    if (!canSubmit || busy) return;
    await onSubmit(compose(q, opts, method, majority, kind === "slot" ? slots : undefined));
    setQ("");
    setOpts(presetOptions());
    setSlots([]);
  };

  return (
    <>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("resQuestionPlaceholder")}
        style={{ width: "100%", fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, padding: "10px 12px", border: `2px solid ${INK}`, borderRadius: 11, marginBottom: 8 }}
      />
      {/* Sur quoi porte la question. Les dates ne sont pas une MÉTHODE mais une
          FORME D'OPTIONS : un créneau est une Option dont `at`/`end` portent la
          date et dont `name` porte déjà le libellé lisible. D'où ce simple
          basculement d'éditeur, plutôt qu'un mode de vote à part. */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        {(["text", "slot"] as const).map((k) => (
          <button
            key={k}
            onClick={() => switchKind(k)}
            aria-pressed={kind === k}
            style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 13, cursor: "pointer", border: `2px solid ${INK}`, background: kind === k ? INK : "#fff", color: kind === k ? "#fff" : INK, padding: "8px 13px", borderRadius: 9 }}
          >
            {k === "text" ? t("kindProposals") : t("kindDates")}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: SUBINK, marginBottom: 6 }}>
          {kind === "slot" ? t("kindDatesTitle") : t("resOptionsTitle")}
        </div>
        {kind === "slot" ? (
          <>
            <SlotPicker slots={slots} onChange={setSlots} />
            {slots.length > 0 && slots.length < 2 && (
              <div style={{ fontSize: 12.5, color: MUTED, marginTop: 7 }}>{t("kindDatesNeedTwo")}</div>
            )}
          </>
        ) : (
          <>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {opts.map((o, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={o}
                onChange={(e) => setOpt(i, e.target.value)}
                placeholder={t("resOptionPlaceholder", { n: i + 1 })}
                style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 14, padding: "9px 11px", border: `2px solid ${INK}`, borderRadius: 10 }}
              />
              {opts.length > 2 && (
                <button
                  onClick={() => removeOpt(i)}
                  aria-label={t("removeOptionAria", { n: i + 1 })}
                  title={t("remove")}
                  // 28×28 : cible tactile conforme (WCAG 2.5.8 exige 24×24).
                  style={{ width: 28, height: 28, display: "grid", placeItems: "center", border: "none", background: "none", color: REDTXT, cursor: "pointer", fontSize: 18, lineHeight: 1, borderRadius: 8, flex: "none" }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 7 }}>
          {opts.length < 8 && (
            <button onClick={addOpt} style={{ border: `2px dashed ${INK}`, background: "none", color: SUBINK, cursor: "pointer", fontSize: 13, fontWeight: 700, padding: "7px 12px", borderRadius: 10 }}>
              {t("addOption")}
            </button>
          )}
          <button onClick={() => setOpts(presetOptions())} style={{ border: `2px dashed ${INK}`, background: "none", color: SUBINK, cursor: "pointer", fontSize: 13, fontWeight: 700, padding: "7px 12px", borderRadius: 10 }}>
            {t("presetButton")}
          </button>
          <button onClick={() => setOpts(["", ""])} style={{ border: `2px dashed ${INK}`, background: "none", color: MUTED, cursor: "pointer", fontSize: 13, fontWeight: 700, padding: "7px 12px", borderRadius: 10 }}>
            {t("clearOptions")}
          </button>
        </div>
        </>
        )}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: SUBINK }}>{t("resMethod")}</span>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          aria-label={t("resMethod")}
          style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, padding: "9px 11px", border: `2px solid ${INK}`, borderRadius: 10, background: "#fff" }}
        >
          <optgroup label={t("resKindVote")}>
            {methods.map((k) => (
              <option key={k} value={k}>{tm(`${k}.name`)}</option>
            ))}
          </optgroup>
          <optgroup label={t("resKindAssign")}>
            {(["serial_dictatorship", "optimal_sum"] as const).map((k) => (
              <option key={k} value={`assign:${k}`}>{ASSIGN_METHODS[k].icon} {ta(`methods.${k}.name`)}</option>
            ))}
          </optgroup>
        </select>
        {(method === "fptp" || method === "runoff") && (
          <>
            <span style={{ fontWeight: 700, fontSize: 13, color: SUBINK }}>{t("resMajority")}</span>
            <select
              value={majority}
              onChange={(e) => setMajority(Number(e.target.value))}
              aria-label={t("resMajority")}
              style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, padding: "9px 11px", border: `2px solid ${INK}`, borderRadius: 10, background: "#fff" }}
            >
              <option value={50}>{t("thrAbsolute")}</option>
              <option value={67}>{t("thrTwoThirds")}</option>
              <option value={75}>{t("thrThreeQuarters")}</option>
            </select>
          </>
        )}
      </div>

      {extras}

      <div style={{ display: "flex", marginTop: 12 }}>
        <button
          onClick={submit}
          disabled={busy || !canSubmit}
          className="dc-bright"
          style={{ marginLeft: "auto", fontFamily: "var(--font-display), sans-serif", fontWeight: 800, fontSize: 14.5, cursor: canSubmit && !busy ? "pointer" : "not-allowed", border: `2.5px solid ${INK}`, background: "#FFB627", color: INK, padding: "10px 18px", borderRadius: 11, opacity: canSubmit && !busy ? 1 : 0.5 }}
        >
          {submitLabel}
        </button>
      </div>
    </>
  );
}
