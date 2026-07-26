"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { describeRecipe, resolveKey } from "@/lib/voting/engine";
import { resolveScale, textOn } from "@/lib/voting/scales";
import { SYSTEMS, SYSTEM_ORDER, candColor } from "@/lib/voting/systems";
import type { CountingMethod, Recipe } from "@/lib/voting/types";
import type { ScrutinController } from "@/lib/voting/useScrutin";
import AdvancedSettings from "./AdvancedSettings";
import AccessModeChips from "./AccessModeChips";
import AiHelper from "./AiHelper";
import ClosureLine from "./ClosureLine";
import PrefillPanel from "./PrefillPanel";
import { ASSIGN_METHODS, ASSIGN_METHOD_KEYS, type AssignMethodKey } from "@/lib/assign/methods";
import SlotPicker from "./SlotPicker";
import { CORAL, CREAM, FONT_BODY, FONT_DISPLAY, GREENTXT, INK, MUTED, REDTXT, YELLOW, lift } from "./theme";

interface AxisOption {
  label: string;
  bg: string;
  fg: string;
  op: number;
  disabled: boolean;
  onClick: () => void;
}
interface Axis {
  key: string;
  label: string;
  hint: string;
  options: AxisOption[];
}

function buildAxes(r: Recipe, setRecipe: (p: Partial<Recipe>) => void, slotMode = false, t: (k: string) => string): Axis[] {
  const chip = (active: boolean) =>
    active ? { bg: INK, fg: "#fff", op: 1 } : { bg: CREAM, fg: INK, op: 1 };
  const mkOpt = (active: boolean, disabled: boolean, label: string, onClick: () => void): AxisOption =>
    disabled
      ? { label, bg: "#F0EAD9", fg: "#9aa3bd", op: 0.5, disabled: true, onClick: () => {} }
      : { label, ...chip(active), disabled: false, onClick };

  const isIndirect = r.suffrage === "indirect";
  const axes: Axis[] = [];
  // Mode « dates » : les méthodes d'assemblée (grands électeurs, proportionnelle,
  // scrutin de liste) n'ont pas de sens pour choisir un créneau → on n'expose que
  // les méthodes à gagnant unique.
  if (!slotMode) {
    axes.push({
      key: "suffrage",
      label: t("axisSuffrageLabel"),
      hint: t("axisSuffrageHint"),
      options: [
        mkOpt(r.suffrage === "direct", false, t("optDirect"), () => setRecipe({ suffrage: "direct" })),
        mkOpt(isIndirect, false, t("optIndirect"), () => setRecipe({ suffrage: "indirect" })),
      ],
    });
  }

  if (!isIndirect) {
    const countOpt = (v: CountingMethod, l: string) =>
      mkOpt(r.counting === v, false, l, () =>
        setRecipe({ counting: v, rounds: ["proportional", "list"].includes(v) ? 1 : r.rounds }),
      );
    axes.push({
      key: "counting",
      label: t("axisCountingLabel"),
      hint: t("axisCountingHint"),
      options: [
        countOpt("majority", t("optMajority")),
        countOpt("condorcet", t("optCondorcetDuels")),
        countOpt("mj", t("optMajorityJudgment")),
        countOpt("approval", t("optApproval")),
        countOpt("borda", t("optBordaPoints")),
        ...(slotMode
          ? []
          : [countOpt("proportional", t("optProportional")), countOpt("list", t("optListVote"))]),
      ],
    });
    const roundsEligible = ["majority", "condorcet", "mj", "approval", "borda"].includes(r.counting);
    axes.push({
      key: "rounds",
      label: t("axisRoundsLabel"),
      hint: t("axisRoundsHint"),
      options: [
        mkOpt(r.rounds === 1, !roundsEligible, t("optOneRound"), () => setRecipe({ rounds: 1 })),
        mkOpt(r.rounds === 2, !roundsEligible, t("optTwoRounds"), () => setRecipe({ rounds: 2 })),
      ],
    });
    if (r.rounds === 2 && roundsEligible) {
      axes.push({
        key: "qualif",
        label: t("axisQualifLabel"),
        hint: t("axisQualifHint"),
        options: [
          mkOpt(r.qualif === "top2", false, t("optTop2"), () => setRecipe({ qualif: "top2" })),
          mkOpt(r.qualif === "thr10", false, t("optThreshold10"), () => setRecipe({ qualif: "thr10" })),
        ],
      });
    }
    if (r.counting === "condorcet") {
      axes.push({
        key: "random",
        label: t("axisRandomLabel"),
        hint: t("axisRandomHint"),
        options: [
          mkOpt(!r.random, false, t("optRandomNone"), () => setRecipe({ random: false })),
          mkOpt(r.random, false, t("optRandomTiebreak"), () => setRecipe({ random: true })),
        ],
      });
    }
    // Jugement majoritaire : échelle des mentions. L'échelle électorale par défaut
    // juge une aptitude à être choisi ; en sondage, une échelle d'accord / gravité /
    // fréquence colle mieux. Seuls libellés + couleurs changent (la médiane reste).
    if (r.counting === "mj") {
      const cur = r.scale ?? "mentions";
      const scaleOpt = (v: string, l: string) => mkOpt(cur === v, false, l, () => setRecipe({ scale: v }));
      axes.push({
        key: "scale",
        label: t("axisScaleLabel"),
        hint: t("axisScaleHint"),
        options: [
          scaleOpt("mentions", t("scaleMentions")),
          scaleOpt("agreement", t("scaleAgreement")),
          scaleOpt("severity", t("scaleSeverity")),
          scaleOpt("frequency", t("scaleFrequency")),
          scaleOpt("satisfaction", t("scaleSatisfaction")),
          scaleOpt("dissatisfaction", t("scaleDissatisfaction")),
          scaleOpt("priority", t("scalePriority")),
        ],
      });
    }
  } else {
    const localOpt = (v: CountingMethod, l: string) =>
      mkOpt(r.localCounting === v, false, l, () => setRecipe({ localCounting: v }));
    axes.push({
      key: "localCounting",
      label: t("axisLocalCountingLabel"),
      hint: t("axisLocalCountingHint"),
      options: [
        localOpt("majority", t("optMajority")),
        localOpt("condorcet", t("optCondorcet")),
        localOpt("mj", t("optMajorityJudgmentShort")),
        localOpt("borda", t("optBorda")),
        localOpt("approval", t("optApproval")),
      ],
    });
    axes.push({
      key: "electorSplit",
      label: t("axisElectorSplitLabel"),
      hint: t("axisElectorSplitHint"),
      options: [
        mkOpt(r.electorSplit === "wta", false, t("optWinnerTakesAll"), () => setRecipe({ electorSplit: "wta" })),
        mkOpt(r.electorSplit === "prop", false, t("optProportional"), () => setRecipe({ electorSplit: "prop" })),
      ],
    });
    if (r.localCounting === "condorcet") {
      axes.push({
        key: "random",
        label: t("axisRandomLocalLabel"),
        hint: t("axisRandomLocalHint"),
        options: [
          mkOpt(!r.random, false, t("optRandomNone"), () => setRecipe({ random: false })),
          mkOpt(r.random, false, t("optRandomTiebreak"), () => setRecipe({ random: true })),
        ],
      });
    }
  }
  // L'axe « échelle » est extrait du dépliable (rendu en évidence sous les chips
  // de méthode) : on ne le numérote pas pour garder la suite 1..n continue.
  let n = 0;
  axes.forEach((a) => {
    if (a.key !== "scale") {
      n += 1;
      a.label = `${n} · ${a.label}`;
    }
  });
  return axes;
}

// 4 méthodes phares mises en avant ; les autres sont dans le dépliable.
const MAIN_METHODS = ["fptp", "approval", "mj", "condorcet"];


const isImageUrl = (u: string) => /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(u);
const isHttpUrl = (u: string) => /^https?:\/\//i.test(u);

// Aperçu d'une illustration dans le formulaire : vignette si l'image charge,
// avertissement sinon — pour valider le lien AVANT de lancer le vote.
function ImgPreview({ url, notFoundLabel }: { url: string; notFoundLabel: string }) {
  const [err, setErr] = useState(false);
  if (err) {
    return <div style={{ fontSize: 12, fontWeight: 700, color: REDTXT }}>{notFoundLabel}</div>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      onError={() => setErr(true)}
      style={{ width: 56, height: 56, objectFit: "cover", border: `2px solid ${INK}`, borderRadius: 8, alignSelf: "flex-start" }}
    />
  );
}

// Aperçu vivant des mentions du preset d'échelle sélectionné : on ne choisit pas
// un registre à l'aveugle (« Gravité »), on voit les 6 mentions réelles et leurs
// couleurs — exactement ce que le votant aura sous les yeux. Une seule bande.
function ScalePreview({ scale, locale }: { scale?: string; locale: string }) {
  const { labels, colors } = resolveScale({ scale }, locale);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
      {labels.map((l, i) => (
        <span
          key={i}
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: textOn(colors[i]),
            background: colors[i],
            border: `1.5px solid ${INK}`,
            padding: "3px 9px",
            borderRadius: 20,
            whiteSpace: "nowrap",
          }}
        >
          {l}
        </span>
      ))}
    </div>
  );
}

// Palette curée pour changer l'emoji d'une option.
const EMOJI_PALETTE = [
  "🏔️", "🏖️", "🌆", "🌿", "🏝️", "🏕️", "🏰", "🗺️",
  "🍕", "🍣", "🍔", "🌮", "🍜", "🥗", "🍦", "☕",
  "⚽", "🎬", "🎮", "🎵", "🎨", "📚", "🎲", "🏄",
  "⭐", "🔥", "❤️", "👍", "✅", "🎯", "💡", "🚀",
  "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "🅰️", "🅱️", "🔵",
];

export default function CreateScreen({ ctrl }: { ctrl: ScrutinController }) {
  const t = useTranslations("Create");
  const te = useTranslations("CreateErrors");
  const locale = useLocale();
  // Exemples évocateurs montrés en placeholder (pas des valeurs à supprimer).
  const optionPlaceholders = t.raw("optionPlaceholders") as string[];
  const { state, selectSystemRecipe, setRecipe, setQuestion, setDescription, setOptionName, setOptionUrl, setOptionIcon, removeOption, addOption, setOptionKind, setSlots, setSlotMinutes, setAssignMethod, setAssignSideB, setAssignSlots, setAssignPer, setSurvey, setProposalsPhase, setVoterNames, launch } = ctrl;
  const tac = useTranslations("Access");
  const [urlRows, setUrlRows] = useState<Record<number, boolean>>({});
  const [emojiRow, setEmojiRow] = useState<number | null>(null);
  const [methodOpen, setMethodOpen] = useState(false);
  // Carte méthode repliée par défaut : c'est un réglage de PERSONNALISATION, pas
  // la 1re chose à décider. Auto-ouverte si une méthode non-défaut est en jeu.
  const [methodCardOpen, setMethodCardOpen] = useState(false);
  // Type de vote & objectif repliés sous les propositions : le cas courant
  // (propositions + gagnant) n'a rien à régler ici. Auto-ouvert dès qu'un
  // réglage non-défaut est actif (dates, affectation, sondage) ou qu'un
  // brouillon pré-rempli mérite d'être vérifié d'un coup d'œil.
  const [setupOpen, setSetupOpen] = useState(false);
  const setupExpanded = setupOpen || state.optionKind !== "text" || state.survey || state.prefilled;
  const resolved = describeRecipe(state.recipe);
  const tm = useTranslations("Methods");
  const axes = buildAxes(state.recipe, setRecipe, state.optionKind === "slot", t);
  // Échelle de mentions : réglage ESSENTIEL du jugement majoritaire (surtout en
  // sondage) — rendue en évidence sous les chips de méthode, pas dans le dépliable.
  const scaleAxis = axes.find((a) => a.key === "scale");
  const foldAxes = axes.filter((a) => a.key !== "scale");
  const curKey = resolveKey(state.recipe);
  const twoRound = state.recipe.suffrage !== "indirect" && state.recipe.rounds === 2 && state.recipe.counting !== "majority";
  const methodName = twoRound ? `${tm(`${curKey}.name`)} ${tm("twoRounds")}` : tm(`${curKey}.name`);
  const otherMethods = SYSTEM_ORDER.filter((k) => !MAIN_METHODS.includes(k)).filter(
    (k) => state.optionKind !== "slot" || !["proportional", "list", "indirect"].includes(k),
  );
  const methodChip = (key: string) => {
    const sys = SYSTEMS[key];
    const active = curKey === key;
    return (
      <button
        key={key}
        onClick={() => selectSystemRecipe(key)}
        aria-pressed={active}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          textAlign: "left",
          fontFamily: FONT_BODY,
          cursor: "pointer",
          border: `2px solid ${INK}`,
          borderRadius: 10,
          padding: "8px 12px",
          background: active ? INK : "#fff",
          color: active ? "#fff" : INK,
        }}
      >
        <span style={{ fontSize: 17 }}>{sys.icon}</span>
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{tm(`${key}.name`)}</span>
          <span style={{ fontWeight: 600, fontSize: 11, color: active ? "rgba(255,255,255,0.75)" : MUTED }}>{tm(`${key}.strength`)}</span>
        </span>
      </button>
    );
  };

  const cardStyle = {
    background: "#fff",
    border: `2.5px solid ${INK}`,
    borderRadius: 18,
    padding: 20,
    boxShadow: `5px 5px 0 ${INK}`,
  } as const;

  // ---- affectation (3e type) : méthode, participants, garde-fous prévisibles ----
  const ta = useTranslations("Assign");
  const isAssign = state.optionKind === "assign";
  const aDef = ASSIGN_METHODS[state.assignMethod];
  const participants = state.voterNames.split("\n").map((x) => x.trim()).filter(Boolean);
  // Objets = créneaux : comptés comme un vote de dates (créneau daté), sinon par nom.
  const assignSlotObjects = isAssign && aDef.oneSided && state.assignSlots;
  const assignOptionCount = state.options.filter((o) =>
    assignSlotObjects ? Boolean(o.at) : o.name.trim() !== "",
  ).length;
  const assignPerEff = aDef.endowed ? 1 : state.assignPer;
  const assignWarnings: string[] = [];
  const sideBNames = state.assignSideB
    .split("\n")
    .map((x) => x.split(";")[0].trim())
    .filter(Boolean);
  if (isAssign) {
    if (participants.length < (aDef.twoLists ? 1 : 2))
      assignWarnings.push(ta(aDef.twoLists ? "needSideA" : "needParticipants"));
    if (aDef.twoLists) {
      if (sideBNames.length < 1) assignWarnings.push(ta("needSideB"));
      const all = [...participants, ...sideBNames];
      if (all.length && new Set(all).size !== all.length) assignWarnings.push(ta("dupWarning"));
    } else if (!aDef.oneSided) {
      if (participants.length >= 2 && participants.length % 2 !== 0)
        assignWarnings.push(ta("oddWarning", { count: participants.length }));
      if (new Set(participants).size !== participants.length) assignWarnings.push(ta("dupWarning"));
    } else if (assignOptionCount < 2) {
      assignWarnings.push(ta("needObjects"));
    }
    if (aDef.endowed && participants.length >= 2) {
      if (new Set(participants).size !== participants.length) assignWarnings.push(ta("dupWarning"));
      if (assignOptionCount >= 2 && participants.length !== assignOptionCount)
        assignWarnings.push(ta("ttcCountWarning", { count: participants.length, objects: assignOptionCount }));
    }
  }
  const fewObjectsMissing =
    isAssign && aDef.oneSided && !aDef.endowed && assignOptionCount >= 2 && participants.length * assignPerEff > assignOptionCount
      ? participants.length * assignPerEff - assignOptionCount
      : 0;
  const assignBlocked = isAssign && assignWarnings.length > 0;

  const assignChip = (key: AssignMethodKey) => {
    const def = ASSIGN_METHODS[key];
    const active = state.assignMethod === key;
    return (
      <button
        key={key}
        onClick={() => setAssignMethod(key)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          textAlign: "left",
          fontFamily: FONT_BODY,
          cursor: "pointer",
          border: `2px solid ${INK}`,
          borderRadius: 10,
          padding: "8px 12px",
          background: active ? INK : "#fff",
          color: active ? "#fff" : INK,
        }}
      >
        <span style={{ fontSize: 17 }}>{def.icon}</span>
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{ta(`methods.${key}.name`)}</span>
          <span style={{ fontWeight: 600, fontSize: 11, color: active ? "rgba(255,255,255,0.75)" : MUTED }}>{ta(`methods.${key}.strength`)}</span>
        </span>
      </button>
    );
  };

  const AssignDetail = () => (
    <>
      <div style={{ fontSize: 14, lineHeight: 1.5, color: "#2c3447" }}>{ta(`methods.${state.assignMethod}.how`)}</div>
      <div style={{ marginTop: 15 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: GREENTXT, marginBottom: 7 }}>{t("whatYouGain")}</div>
        {(ta.raw(`methods.${state.assignMethod}.pros`) as string[]).map((p, i) => (
          <div key={i} style={{ fontSize: 13, lineHeight: 1.4, color: "#2c3447", marginBottom: 6, paddingLeft: 14, position: "relative" }}>
            <span style={{ position: "absolute", left: 0, color: GREENTXT }}>+</span>
            {p}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 13 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: REDTXT, marginBottom: 7 }}>{t("whatYouLose")}</div>
        {(ta.raw(`methods.${state.assignMethod}.cons`) as string[]).map((c, i) => (
          <div key={i} style={{ fontSize: 13, lineHeight: 1.4, color: "#2c3447", marginBottom: 6, paddingLeft: 14, position: "relative" }}>
            <span style={{ position: "absolute", left: 0, color: REDTXT }}>−</span>
            {c}
          </div>
        ))}
      </div>
    </>
  );

  const headColor = isAssign ? aDef.color : resolved.color;
  const headIcon = isAssign ? aDef.icon : resolved.icon;
  const headName = isAssign ? ta(`methods.${state.assignMethod}.name`) : methodName;

  // Caractéristiques de la méthode courante (comment ça marche · gains · pertes),
  // réutilisées par la carte de droite (desktop) et l'explicatif inline (mobile).
  const MethodDetail = () => (
    <>
      <div style={{ fontSize: 14, lineHeight: 1.5, color: "#2c3447" }}>{tm(`${curKey}.how`)}</div>
      <div style={{ marginTop: 15 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: GREENTXT, marginBottom: 7 }}>{t("whatYouGain")}</div>
        {(tm.raw(`${curKey}.pros`) as string[]).map((p, i) => (
          <div key={i} style={{ fontSize: 13, lineHeight: 1.4, color: "#2c3447", marginBottom: 6, paddingLeft: 14, position: "relative" }}>
            <span style={{ position: "absolute", left: 0, color: GREENTXT }}>+</span>
            {p}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 13 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: REDTXT, marginBottom: 7 }}>{t("whatYouLose")}</div>
        {(tm.raw(`${curKey}.cons`) as string[]).map((c, i) => (
          <div key={i} style={{ fontSize: 13, lineHeight: 1.4, color: "#2c3447", marginBottom: 6, paddingLeft: 14, position: "relative" }}>
            <span style={{ position: "absolute", left: 0, color: REDTXT }}>−</span>
            {c}
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="pad" style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 24px 100px" }}>
      <h1
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 800,
          fontSize: "clamp(30px,4.5vw,46px)",
          letterSpacing: "-0.03em",
          margin: "10px 0 0",
        }}
      >
        {/* Cadrage par porte ET par objectif : en sondage, le titre ne promet pas
            une décision (personne n'est déclaré vainqueur — cf. goalSurveyHint). */}
        {isAssign ? t("pageTitleAssign") : state.survey ? t("pageTitleSurvey") : t("pageTitle")}
      </h1>
      <PrefillPanel ctrl={ctrl} />

      <div
        className="create-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)",
          gap: 24,
          marginTop: 26,
          alignItems: "start",
        }}
      >
        {/* GAUCHE : formulaire */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* question + options */}
          <div style={cardStyle}>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>{t("questionTitle")}</div>
            <input
              value={state.question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t("questionPlaceholder")}
              style={{
                width: "100%",
                marginTop: 10,
                fontFamily: FONT_BODY,
                fontSize: 16,
                fontWeight: 600,
                padding: "11px 13px",
                border: `2px solid ${INK}`,
                borderRadius: 11,
                background: CREAM,
                outline: "none",
              }}
            />
            <textarea
              value={state.description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={2}
              style={{
                width: "100%",
                marginTop: 10,
                fontFamily: FONT_BODY,
                fontSize: 14.5,
                fontWeight: 500,
                padding: "10px 13px",
                border: `2px solid ${INK}`,
                borderRadius: 11,
                background: CREAM,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            {isAssign && aDef.oneSided && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "16px 0 12px" }}>
                <span style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: 14, color: INK }}>{ta("assignOnLabel")}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {(
                    [
                      [false, ta("objectsThings")],
                      [true, ta("objectsSlots")],
                    ] as const
                  ).map(([slots, lbl]) => (
                    <button
                      key={String(slots)}
                      onClick={() => setAssignSlots(slots)}
                      style={{
                        fontFamily: FONT_BODY,
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                        border: `2px solid ${INK}`,
                        borderRadius: 9,
                        padding: "7px 13px",
                        background: state.assignSlots === slots ? INK : "#fff",
                        color: state.assignSlots === slots ? "#fff" : INK,
                      }}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!(isAssign && !aDef.oneSided) && (
              <div style={{ fontWeight: 700, fontSize: 13, color: MUTED, margin: "18px 0 9px" }}>
                {state.optionKind === "slot" ? t("slotsHeading") : isAssign ? ta("objectsHeading") : t("proposalsHeading")}
              </div>
            )}
            {isAssign && aDef.oneSided && !state.assignSlots && (
              <div style={{ fontSize: 12, color: MUTED, marginBottom: 9 }}>{ta("objectsHint")}</div>
            )}
            <div style={{ display: isAssign && !aDef.oneSided ? "none" : "flex", flexDirection: "column", gap: 9 }}>
              {state.optionKind === "slot" || assignSlotObjects
                ? (
                    <>
                      <SlotPicker slots={state.options} onChange={setSlots} />
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: MUTED }}>{t("slotDuration")}</span>
                        <select
                          value={state.slotMinutes}
                          onChange={(e) => setSlotMinutes(Number(e.target.value))}
                          style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, padding: "8px 11px", border: `2px solid ${INK}`, borderRadius: 10, background: "#fff" }}
                        >
                          {[30, 60, 90, 120, 180, 240].map((m) => (
                            <option key={m} value={m}>
                              {m < 60 ? `${m} min` : m % 60 === 0 ? `${m / 60} h` : `${Math.floor(m / 60)} h ${m % 60}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )
                : state.options.map((opt, i) => {
                const urlOpen = urlRows[i] || Boolean(opt.url);
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <button
                        type="button"
                        onClick={() => setEmojiRow(emojiRow === i ? null : i)}
                        title={t("changeEmoji")}
                        aria-label={t("changeEmoji")}
                        style={{
                          width: 34,
                          height: 34,
                          flex: "none",
                          borderRadius: 9,
                          border: `2px solid ${INK}`,
                          background: candColor(i),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 17,
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        {opt.icon}
                      </button>
                      <input
                        value={opt.name}
                        onChange={(e) => setOptionName(i, e.target.value)}
                        placeholder={optionPlaceholders[i] ?? t("optionFallbackPlaceholder")}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontFamily: FONT_BODY,
                          fontSize: 14.5,
                          fontWeight: 600,
                          padding: "9px 11px",
                          border: `2px solid ${INK}`,
                          borderRadius: 9,
                          background: CREAM,
                          outline: "none",
                        }}
                      />
                      <button
                        onClick={() => setUrlRows((m) => ({ ...m, [i]: !urlOpen }))}
                        title={t("attachIllustrationTitle")}
                        aria-label={t("attachIllustrationAria")}
                        style={{
                          width: 34,
                          height: 34,
                          flex: "none",
                          border: `2px solid ${INK}`,
                          background: opt.url ? YELLOW : "#fff",
                          borderRadius: 9,
                          cursor: "pointer",
                          fontSize: 15,
                          lineHeight: 1,
                        }}
                      >
                        🔗
                      </button>
                      <button
                        onClick={() => removeOption(i)}
                        style={{
                          width: 34,
                          height: 34,
                          flex: "none",
                          border: `2px solid ${INK}`,
                          background: "#fff",
                          borderRadius: 9,
                          cursor: "pointer",
                          fontSize: 16,
                          color: REDTXT,
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </div>
                    {emojiRow === i && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 4,
                          padding: 8,
                          border: `2px solid ${INK}`,
                          borderRadius: 10,
                          background: "#fff",
                        }}
                      >
                        {EMOJI_PALETTE.map((e) => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => {
                              setOptionIcon(i, e);
                              setEmojiRow(null);
                            }}
                            style={{
                              width: 32,
                              height: 32,
                              fontSize: 18,
                              border: "none",
                              background: opt.icon === e ? CREAM : "transparent",
                              borderRadius: 8,
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                    {urlOpen && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <input
                          value={opt.url ?? ""}
                          onChange={(e) => setOptionUrl(i, e.target.value)}
                          placeholder={t("urlPlaceholder")}
                          style={{
                            fontFamily: FONT_BODY,
                            fontSize: 13,
                            fontWeight: 500,
                            padding: "8px 11px",
                            border: `2px solid ${INK}`,
                            borderRadius: 9,
                            background: CREAM,
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                        {opt.url && isHttpUrl(opt.url) &&
                          (isImageUrl(opt.url) ? (
                            <ImgPreview key={opt.url} url={opt.url} notFoundLabel={t("imageNotFound")} />
                          ) : (
                            <a
                              href={opt.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                alignSelf: "flex-start",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: 12.5,
                                fontWeight: 700,
                                color: INK,
                                textDecoration: "none",
                                border: `2px solid ${INK}`,
                                borderRadius: 8,
                                padding: "5px 10px",
                              }}
                            >
                              {t("linkAddedTest")}
                            </a>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {state.optionKind !== "slot" && !assignSlotObjects && !(isAssign && !aDef.oneSided) && (
              <button
                onClick={() => addOption(t("newOptionDefault"))}
                className="dc-cream"
                style={{
                  marginTop: 11,
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: "pointer",
                  border: `2px dashed ${INK}`,
                  background: "none",
                  color: INK,
                  padding: "9px 14px",
                  borderRadius: 10,
                }}
              >
                {t("addProposal")}
              </button>
            )}

            {/* Phase de propositions : remontée ICI (visible d'emblée) plutôt que
                cachée dans les réglages avancés. Sur un vote à propositions, hors
                grands électeurs. Le vote reste privé pendant la collecte. */}
            {state.optionKind === "text" && state.recipe.suffrage !== "indirect" && (
              <div style={{ marginTop: 14 }}>
                <button
                  onClick={() => setProposalsPhase(!state.proposalsPhase)}
                  role="switch"
                  aria-checked={state.proposalsPhase}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                    border: `2px solid ${INK}`,
                    borderRadius: 10,
                    background: state.proposalsPhase ? INK : CREAM,
                    color: state.proposalsPhase ? "#fff" : INK,
                    padding: "10px 13px",
                    fontWeight: 700,
                    fontSize: 13.5,
                    fontFamily: FONT_BODY,
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      flex: "none",
                      borderRadius: 6,
                      border: `2px solid ${state.proposalsPhase ? "#fff" : INK}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                    }}
                  >
                    {state.proposalsPhase ? "✓" : ""}
                  </span>
                  💡 {tac("proposalsLabel")}
                </button>
                {state.proposalsPhase && (
                  <div style={{ marginTop: 7, fontSize: 12.5, color: MUTED, lineHeight: 1.45 }}>{tac("proposalsHint")}</div>
                )}
              </div>
            )}
            {/* Type de vote & objectif : divulgation progressive, SOUS les
                propositions. La ligne-résumé garde le réglage lisible et
                réversible en un clic ; launch() lit stateRef.current, déplacer
                ces chips ne change rien au décompte. */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `2px dashed ${INK}` }}>
              <button
                onClick={() => setSetupOpen((o) => !o)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontFamily: FONT_BODY,
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 13, color: MUTED }}>
                  {t("voteOnLabel")}{" "}
                  <span style={{ color: INK, fontWeight: 700 }}>
                    {state.optionKind === "slot" ? t("voteOnDates") : isAssign ? ta("kindChip") : t("voteOnProposals")}
                  </span>
                  {!isAssign && (
                    <>
                      {" · "}
                      {t("goalLabel")}{" "}
                      <span style={{ color: INK, fontWeight: 700 }}>{state.survey ? t("goalSurvey") : t("goalWin")}</span>
                    </>
                  )}
                </span>
                {setupExpanded ? (
                  <span style={{ marginLeft: "auto", fontWeight: 800, fontSize: 16, color: INK }}>▾</span>
                ) : (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontWeight: 700,
                      fontSize: 12.5,
                      border: `2px solid ${INK}`,
                      borderRadius: 9,
                      padding: "6px 11px",
                      background: "#fff",
                      color: INK,
                    }}
                  >
                    {t("setupChange")}
                  </span>
                )}
              </button>
              {setupExpanded && (
                <>
                  {/* Sur quoi porte le vote : des propositions, ou des dates (façon Doodle) */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "12px 0 0" }}>
                    <span style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: 14, color: INK }}>{t("voteOnLabel")}</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      {([
                        ["text", t("voteOnProposals")],
                        ["slot", t("voteOnDates")],
                        ["assign", ta("kindChip")],
                      ] as const).map(([k, lbl]) => (
                        <button
                          key={k}
                          onClick={() => setOptionKind(k)}
                          style={{
                            fontFamily: FONT_BODY,
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: "pointer",
                            border: `2px solid ${INK}`,
                            borderRadius: 9,
                            padding: "7px 13px",
                            background: state.optionKind === k ? INK : "#fff",
                            color: state.optionKind === k ? "#fff" : INK,
                          }}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Objectif : élire un gagnant, ou sonder (panorama des avis, sans vainqueur). */}
                  {!isAssign && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "10px 0 0" }}>
                      <span style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: 14, color: INK }}>{t("goalLabel")}</span>
                      <div style={{ display: "flex", gap: 8 }}>
                        {(
                          [
                            [false, t("goalWin")],
                            [true, t("goalSurvey")],
                          ] as const
                        ).map(([sv, lbl]) => (
                          <button
                            key={String(sv)}
                            onClick={() => setSurvey(sv)}
                            style={{
                              fontFamily: FONT_BODY,
                              fontWeight: 700,
                              fontSize: 13,
                              cursor: "pointer",
                              border: `2px solid ${INK}`,
                              borderRadius: 9,
                              padding: "7px 13px",
                              background: state.survey === sv ? INK : "#fff",
                              color: state.survey === sv ? "#fff" : INK,
                            }}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {!isAssign && state.survey && (
                    <div style={{ fontSize: 12.5, color: MUTED, margin: "8px 0 0", lineHeight: 1.45 }}>{t("goalSurveyHint")}</div>
                  )}
                  {isAssign && (
                    <div style={{ fontSize: 12.5, color: MUTED, margin: "10px 0 0", lineHeight: 1.45 }}>{ta("kindHint")}</div>
                  )}
                </>
              )}
            </div>
            {!isAssign && (
              <div style={{ fontSize: 12, color: MUTED, marginTop: 12, lineHeight: 1.45 }}>
                {t("aiHintAttach")}{" "}
                <span style={{ color: INK, fontWeight: 700 }}>{t("aiHintHighlight")}</span>{" "}
                {t("aiHintSee")}
              </div>
            )}
          </div>

          {/* affectation : les participants (nominative par construction) */}
          {isAssign && (
            <div style={cardStyle}>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>{ta(aDef.twoLists ? "sideATitle" : "participantsTitle")}</div>
              <div style={{ fontSize: 12.5, color: MUTED, margin: "4px 0 12px", lineHeight: 1.45 }}>{ta("participantsHint")}</div>
              {aDef.endowed && (
                <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, margin: "0 0 12px", lineHeight: 1.45 }}>🔄 {ta("ttcHint")}</div>
              )}
              <textarea
                value={state.voterNames}
                onChange={(e) => setVoterNames(e.target.value)}
                rows={5}
                placeholder={"Marie\nJules\nAmina\nNoah"}
                style={{
                  width: "100%",
                  fontFamily: FONT_BODY,
                  fontSize: 14.5,
                  fontWeight: 600,
                  padding: "10px 13px",
                  border: `2px solid ${INK}`,
                  borderRadius: 11,
                  background: CREAM,
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
              {aDef.oneSided && !aDef.endowed && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: MUTED }}>{ta("perLabel")}</span>
                  <select
                    value={state.assignPer}
                    onChange={(e) => setAssignPer(Number(e.target.value))}
                    style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, padding: "8px 11px", border: `2px solid ${INK}`, borderRadius: 10, background: "#fff" }}
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  {state.assignPer > 1 && state.assignMethod === "serial_dictatorship" && (
                    <span style={{ fontSize: 12, color: MUTED, lineHeight: 1.4 }}>{ta("perHint")}</span>
                  )}
                </div>
              )}
              {aDef.twoLists && (
                <>
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, marginTop: 16 }}>{ta("sideBTitle")}</div>
                  <div style={{ fontSize: 12.5, color: MUTED, margin: "4px 0 10px", lineHeight: 1.45 }}>{ta("sideBHint")}</div>
                  <textarea
                    value={state.assignSideB}
                    onChange={(e) => setAssignSideB(e.target.value)}
                    rows={4}
                    placeholder={"Tutorat maths ; 2\nTutorat anglais"}
                    style={{
                      width: "100%",
                      fontFamily: FONT_BODY,
                      fontSize: 14.5,
                      fontWeight: 600,
                      padding: "10px 13px",
                      border: `2px solid ${INK}`,
                      borderRadius: 11,
                      background: CREAM,
                      outline: "none",
                      resize: "vertical",
                      boxSizing: "border-box",
                    }}
                  />
                </>
              )}
              {assignWarnings.map((w) => (
                <div
                  key={w}
                  style={{ marginTop: 9, background: "#fff4e0", border: `2px solid ${INK}`, borderRadius: 10, padding: "9px 12px", fontWeight: 700, fontSize: 13, color: "#8a5a00" }}
                >
                  ⚠️ {w}
                </div>
              ))}
              {fewObjectsMissing > 0 && (
                <div style={{ marginTop: 9, fontSize: 12.5, color: MUTED, lineHeight: 1.4 }}>{ta("fewObjects", { missing: fewObjectsMissing })}</div>
              )}
            </div>
          )}

          {/* méthode : 4 phares visibles, le reste dépliable (après les options) */}
          <div style={cardStyle}>
            {isAssign ? (
              <>
                <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>{ta("methodTitle")}</div>
                <div style={{ fontSize: 12.5, color: MUTED, margin: "4px 0 12px", lineHeight: 1.4 }}>{ta("methodSubtitle")}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{ASSIGN_METHOD_KEYS.map(assignChip)}</div>
                <div className="create-explainer-mobile" style={{ ...cardStyle, marginTop: 14, padding: 16, boxShadow: `4px 4px 0 ${aDef.color}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
                    <span style={{ fontSize: 20 }}>{aDef.icon}</span>
                    <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16 }}>{ta(`methods.${state.assignMethod}.name`)}</span>
                  </div>
                  <AssignDetail />
                </div>
              </>
            ) : methodCardOpen || curKey !== "fptp" ? (
              <>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>{t("methodTitle")}</div>
            <div style={{ fontSize: 12.5, color: MUTED, margin: "4px 0 12px", lineHeight: 1.4 }}>
              {t("methodSubtitle")}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{MAIN_METHODS.map(methodChip)}</div>
            {scaleAxis && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>{scaleAxis.label}</div>
                <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 9, lineHeight: 1.35 }}>{scaleAxis.hint}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {scaleAxis.options.map((o, j) => (
                    <button
                      key={j}
                      onClick={o.onClick}
                      disabled={o.disabled}
                      style={{
                        fontFamily: FONT_BODY,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: o.disabled ? "default" : "pointer",
                        border: `2px solid ${INK}`,
                        padding: "8px 13px",
                        borderRadius: 9,
                        background: o.bg,
                        color: o.fg,
                        opacity: o.op,
                      }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <ScalePreview scale={state.recipe.scale} locale={locale} />
              </div>
            )}
            <button
              onClick={() => setMethodOpen((o) => !o)}
              style={{
                marginTop: 12,
                background: "none",
                border: "none",
                fontFamily: FONT_BODY,
                fontWeight: 700,
                fontSize: 13.5,
                color: CORAL,
                cursor: "pointer",
                padding: 0,
              }}
            >
              {methodOpen ? t("methodToggleHide") : t("methodToggleShow")}
            </button>
            {methodOpen && (
              <div style={{ marginTop: 14 }}>
                {otherMethods.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>{otherMethods.map(methodChip)}</div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {foldAxes.map((axis) => (
                    <div key={axis.key}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>{axis.label}</div>
                      <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 9, lineHeight: 1.35 }}>{axis.hint}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {axis.options.map((o, j) => (
                          <button
                            key={j}
                            onClick={o.onClick}
                            disabled={o.disabled}
                            style={{
                              fontFamily: FONT_BODY,
                              fontWeight: 600,
                              fontSize: 13,
                              cursor: o.disabled ? "default" : "pointer",
                              border: `2px solid ${INK}`,
                              padding: "8px 13px",
                              borderRadius: 9,
                              background: o.bg,
                              color: o.fg,
                              opacity: o.op,
                            }}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="create-explainer-mobile" style={{ ...cardStyle, marginTop: 14, padding: 16, boxShadow: `4px 4px 0 ${resolved.color}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>{resolved.icon}</span>
                <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16 }}>{methodName}</span>
              </div>
              <MethodDetail />
            </div>
              </>
            ) : (
              // Résumé replié = teaser ACTIF : les 4 méthodes phares directement
              // cliquables (le différenciateur de Placet reste visible sans déplier).
              // Choisir une méthode ≠ fptp rouvre le détail automatiquement.
              <div>
                <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>{t("methodTitle")}</div>
                <div style={{ fontSize: 12.5, color: MUTED, margin: "4px 0 12px", lineHeight: 1.4 }}>{t("methodSubtitle")}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{MAIN_METHODS.map(methodChip)}</div>
                <button
                  onClick={() => setMethodCardOpen(true)}
                  style={{ marginTop: 12, background: "none", border: "none", fontFamily: FONT_BODY, fontWeight: 700, fontSize: 13.5, color: CORAL, cursor: "pointer", padding: 0 }}
                >
                  {t("methodChoose")}
                </button>
              </div>
            )}
          </div>

          {/* Choix d'accès TOUJOURS visible (hors affectation, où l'accès est
              nominatif imposé) — décision structurante sortie du repli. */}
          {!isAssign && (
            <div style={{ marginBottom: 20 }}>
              <AccessModeChips ctrl={ctrl} />
            </div>
          )}
          {/* La clôture vit désormais dans le repli des réglages avancés ; en
              affectation ce repli n'existe pas → elle reste visible directement. */}
          {isAssign ? <ClosureLine ctrl={ctrl} /> : <AdvancedSettings ctrl={ctrl} />}
          <AiHelper ctrl={ctrl} />
        </div>

        {/* DROITE : système résolu en direct (desktop). Sur mobile, seul le bouton
            Lancer reste — le détail vit dans l'explicatif inline sous les méthodes. */}
        <div
          className="sticky-side create-launch-card"
          style={{
            position: "sticky",
            top: 84,
            background: "#fff",
            border: `2.5px solid ${INK}`,
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: `6px 6px 0 ${headColor}`,
          }}
        >
          <div
            className="create-detail-desktop"
            style={{
              background: headColor,
              padding: "18px 20px",
              borderBottom: `2.5px solid ${INK}`,
              display: "flex",
              alignItems: "center",
              gap: 13,
            }}
          >
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 13,
                border: `2.5px solid ${INK}`,
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
              }}
            >
              {headIcon}
            </div>
            <div>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.9)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {t("yourSystem")}
              </div>
              <div
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 800,
                  fontSize: 21,
                  color: "#fff",
                  lineHeight: 1.05,
                  textShadow: "1.5px 1.5px 0 rgba(0,0,0,0.22)",
                }}
              >
                {headName}
              </div>
            </div>
          </div>
          <div className="create-launch-body" style={{ padding: "18px 20px" }}>
            <div className="create-detail-desktop">
              {isAssign ? <AssignDetail /> : <MethodDetail />}
            </div>
            <button
              onClick={launch}
              disabled={state.launching || assignBlocked}
              className="dc-lift"
              style={{
                marginTop: 18,
                width: "100%",
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 16,
                cursor: state.launching || assignBlocked ? "default" : "pointer",
                border: `2.5px solid ${INK}`,
                background: INK,
                color: "#fff",
                padding: 13,
                borderRadius: 13,
                opacity: state.launching || assignBlocked ? 0.6 : 1,
                ...lift(`4px 4px 0 ${headColor}`, `6px 6px 0 ${headColor}`),
              }}
            >
              {state.launching ? t("launching") : t("launch")}
            </button>
            {state.error && (
              <div role="alert" aria-live="assertive" style={{ marginTop: 10, color: "#d23b3b", fontWeight: 700, fontSize: 13 }}>
                {te(state.error)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
