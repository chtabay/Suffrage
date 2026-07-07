"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { describeRecipe, resolveKey } from "@/lib/voting/engine";
import { SYSTEMS, SYSTEM_ORDER, candColor } from "@/lib/voting/systems";
import type { CountingMethod, Recipe } from "@/lib/voting/types";
import type { ScrutinController } from "@/lib/voting/useScrutin";
import AdvancedSettings from "./AdvancedSettings";
import AiHelper from "./AiHelper";
import ClosureLine from "./ClosureLine";
import PrefillPanel from "./PrefillPanel";
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
  axes.forEach((a, i) => (a.label = `${i + 1} · ${a.label}`));
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
  // Exemples évocateurs montrés en placeholder (pas des valeurs à supprimer).
  const optionPlaceholders = t.raw("optionPlaceholders") as string[];
  const { state, selectSystemRecipe, setRecipe, setQuestion, setDescription, setOptionName, setOptionUrl, setOptionIcon, removeOption, addOption, setOptionKind, setSlots, setSlotMinutes, launch } = ctrl;
  const [urlRows, setUrlRows] = useState<Record<number, boolean>>({});
  const [emojiRow, setEmojiRow] = useState<number | null>(null);
  const [methodOpen, setMethodOpen] = useState(false);
  const resolved = describeRecipe(state.recipe);
  const tm = useTranslations("Methods");
  const axes = buildAxes(state.recipe, setRecipe, state.optionKind === "slot", t);
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
        {t("pageTitle")}
      </h1>
      <PrefillPanel ctrl={ctrl} />

      <div
        className="create-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr",
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
            {/* Sur quoi porte le vote : des propositions, ou des dates (façon Doodle) */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "18px 0 10px" }}>
              <span style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: 14, color: INK }}>{t("voteOnLabel")}</span>
              <div style={{ display: "flex", gap: 8 }}>
                {([
                  ["text", t("voteOnProposals")],
                  ["slot", t("voteOnDates")],
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
            <div style={{ fontWeight: 700, fontSize: 13, color: MUTED, marginBottom: 9 }}>
              {state.optionKind === "slot" ? t("slotsHeading") : t("proposalsHeading")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {state.optionKind === "slot"
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
            {state.optionKind !== "slot" && (
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
            <div style={{ fontSize: 12, color: MUTED, marginTop: 12, lineHeight: 1.45 }}>
              {t("aiHintAttach")}{" "}
              <span style={{ color: INK, fontWeight: 700 }}>{t("aiHintHighlight")}</span>{" "}
              {t("aiHintSee")}
            </div>
          </div>

          {/* méthode : 4 phares visibles, le reste dépliable (après les options) */}
          <div style={cardStyle}>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>{t("methodTitle")}</div>
            <div style={{ fontSize: 12.5, color: MUTED, margin: "4px 0 12px", lineHeight: 1.4 }}>
              {t("methodSubtitle")}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{MAIN_METHODS.map(methodChip)}</div>
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
                  {axes.map((axis) => (
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
          </div>

          <ClosureLine ctrl={ctrl} />
          <AdvancedSettings ctrl={ctrl} />
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
            boxShadow: `6px 6px 0 ${resolved.color}`,
          }}
        >
          <div
            className="create-detail-desktop"
            style={{
              background: resolved.color,
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
              {resolved.icon}
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
                {methodName}
              </div>
            </div>
          </div>
          <div className="create-launch-body" style={{ padding: "18px 20px" }}>
            <div className="create-detail-desktop">
              <MethodDetail />
            </div>
            <button
              onClick={launch}
              disabled={state.launching}
              className="dc-lift"
              style={{
                marginTop: 18,
                width: "100%",
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 16,
                cursor: state.launching ? "default" : "pointer",
                border: `2.5px solid ${INK}`,
                background: INK,
                color: "#fff",
                padding: 13,
                borderRadius: 13,
                opacity: state.launching ? 0.7 : 1,
                ...lift(`4px 4px 0 ${resolved.color}`, `6px 6px 0 ${resolved.color}`),
              }}
            >
              {state.launching ? t("launching") : t("launch")}
            </button>
            {state.error && (
              <div style={{ marginTop: 10, color: "#d23b3b", fontWeight: 700, fontSize: 13 }}>{state.error}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
