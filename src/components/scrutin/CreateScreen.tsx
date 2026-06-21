"use client";

import { describeRecipe } from "@/lib/voting/engine";
import { candColor } from "@/lib/voting/systems";
import type { CountingMethod, Recipe } from "@/lib/voting/types";
import type { ScrutinController } from "@/lib/voting/useScrutin";
import AdvancedSettings from "./AdvancedSettings";
import ClosureLine from "./ClosureLine";
import { CREAM, FONT_BODY, FONT_DISPLAY, GREENTXT, INK, MUTED, REDTXT, lift } from "./theme";

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

function buildAxes(r: Recipe, setRecipe: (p: Partial<Recipe>) => void): Axis[] {
  const chip = (active: boolean) =>
    active ? { bg: INK, fg: "#fff", op: 1 } : { bg: CREAM, fg: INK, op: 1 };
  const mkOpt = (active: boolean, disabled: boolean, label: string, onClick: () => void): AxisOption =>
    disabled
      ? { label, bg: "#F0EAD9", fg: "#9aa3bd", op: 0.5, disabled: true, onClick: () => {} }
      : { label, ...chip(active), disabled: false, onClick };

  const isIndirect = r.suffrage === "indirect";
  const axes: Axis[] = [];
  axes.push({
    key: "suffrage",
    label: "Type de suffrage",
    hint: "Tout le monde vote directement, ou on passe par des grands électeurs ?",
    options: [
      mkOpt(r.suffrage === "direct", false, "Direct", () => setRecipe({ suffrage: "direct" })),
      mkOpt(isIndirect, false, "Indirect (grands électeurs)", () => setRecipe({ suffrage: "indirect" })),
    ],
  });

  if (!isIndirect) {
    const countOpt = (v: CountingMethod, l: string) =>
      mkOpt(r.counting === v, false, l, () =>
        setRecipe({ counting: v, rounds: ["proportional", "list"].includes(v) ? 1 : r.rounds }),
      );
    axes.push({
      key: "counting",
      label: "Mode de décompte",
      hint: "Comment transforme-t-on les bulletins en résultat ?",
      options: [
        countOpt("majority", "Majoritaire"),
        countOpt("condorcet", "Condorcet (duels)"),
        countOpt("mj", "Jugement majoritaire"),
        countOpt("approval", "Approbation"),
        countOpt("borda", "Borda (points)"),
        countOpt("proportional", "Proportionnelle"),
        countOpt("list", "Scrutin de liste"),
      ],
    });
    const roundsEligible = ["majority", "condorcet", "mj", "approval", "borda"].includes(r.counting);
    axes.push({
      key: "rounds",
      label: "Nombre de tours",
      hint: "Un seul passage, ou on qualifie d'abord puis on re-départage au 2nd tour (de tout type) ?",
      options: [
        mkOpt(r.rounds === 1, !roundsEligible, "1 tour", () => setRecipe({ rounds: 1 })),
        mkOpt(r.rounds === 2, !roundsEligible, "2 tours", () => setRecipe({ rounds: 2 })),
      ],
    });
    if (r.rounds === 2 && roundsEligible) {
      axes.push({
        key: "qualif",
        label: "Qualification au 2nd tour",
        hint: "Qui a le droit de passer le premier tour ?",
        options: [
          mkOpt(r.qualif === "top2", false, "Les 2 premiers", () => setRecipe({ qualif: "top2" })),
          mkOpt(r.qualif === "thr10", false, "Au-dessus de 10 %", () => setRecipe({ qualif: "thr10" })),
        ],
      });
    }
    if (r.counting === "condorcet") {
      axes.push({
        key: "random",
        label: "Part d'aléatoire",
        hint: "Tirer au sort quand les duels tournent en rond (paradoxe de Condorcet) ?",
        options: [
          mkOpt(!r.random, false, "Aucune", () => setRecipe({ random: false })),
          mkOpt(r.random, false, "🎲 Tirage si blocage", () => setRecipe({ random: true })),
        ],
      });
    }
  } else {
    const localOpt = (v: CountingMethod, l: string) =>
      mkOpt(r.localCounting === v, false, l, () => setRecipe({ localCounting: v }));
    axes.push({
      key: "localCounting",
      label: "Décompte dans chaque circonscription",
      hint: "Comment chaque circonscription désigne son champion — ce vote-là peut être de tout type.",
      options: [
        localOpt("majority", "Majoritaire"),
        localOpt("condorcet", "Condorcet"),
        localOpt("mj", "Jugement maj."),
        localOpt("borda", "Borda"),
        localOpt("approval", "Approbation"),
      ],
    });
    axes.push({
      key: "electorSplit",
      label: "Répartition des grands électeurs",
      hint: "Le champion local rafle tout, ou on partage au prorata des voix ?",
      options: [
        mkOpt(r.electorSplit === "wta", false, "Tout au gagnant", () => setRecipe({ electorSplit: "wta" })),
        mkOpt(r.electorSplit === "prop", false, "Proportionnelle", () => setRecipe({ electorSplit: "prop" })),
      ],
    });
    if (r.localCounting === "condorcet") {
      axes.push({
        key: "random",
        label: "Part d'aléatoire (local)",
        hint: "Tirage au sort si une circonscription a un blocage Condorcet.",
        options: [
          mkOpt(!r.random, false, "Aucune", () => setRecipe({ random: false })),
          mkOpt(r.random, false, "🎲 Tirage si blocage", () => setRecipe({ random: true })),
        ],
      });
    }
  }
  axes.forEach((a, i) => (a.label = `${i + 1} · ${a.label}`));
  return axes;
}

export default function CreateScreen({ ctrl }: { ctrl: ScrutinController }) {
  const { state, setRecipe, setQuestion, setOptionName, removeOption, addOption, launch } = ctrl;
  const resolved = describeRecipe(state.recipe);
  const axes = buildAxes(state.recipe, setRecipe);

  const cardStyle = {
    background: "#fff",
    border: `2.5px solid ${INK}`,
    borderRadius: 18,
    padding: 20,
    boxShadow: `5px 5px 0 ${INK}`,
  } as const;

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
        Réglez votre scrutin
      </h1>

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
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>La question</div>
            <input
              value={state.question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ex : On part où en week-end ?"
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
            <div style={{ fontWeight: 700, fontSize: 13, color: MUTED, margin: "18px 0 9px" }}>LES OPTIONS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {state.options.map((opt, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div
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
                    }}
                  >
                    {opt.icon}
                  </div>
                  <input
                    value={opt.name}
                    onChange={(e) => setOptionName(i, e.target.value)}
                    style={{
                      flex: 1,
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
              ))}
            </div>
            <button
              onClick={addOption}
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
              + Ajouter une option
            </button>
          </div>

          {/* axes */}
          <div style={cardStyle}>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>Assemblez la méthode</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 14 }}>
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

          <ClosureLine ctrl={ctrl} />
          <AdvancedSettings ctrl={ctrl} />
        </div>

        {/* DROITE : système résolu en direct */}
        <div
          className="sticky-side"
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
                Votre système
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
                {resolved.name}
              </div>
            </div>
          </div>
          <div style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: "#2c3447" }}>{resolved.how}</div>
            <div style={{ marginTop: 15 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: GREENTXT, marginBottom: 7 }}>✓ CE QUE VOUS GAGNEZ</div>
              {resolved.pros.map((p, i) => (
                <div
                  key={i}
                  style={{ fontSize: 13, lineHeight: 1.4, color: "#2c3447", marginBottom: 6, paddingLeft: 14, position: "relative" }}
                >
                  <span style={{ position: "absolute", left: 0, color: GREENTXT }}>+</span>
                  {p}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 13 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: REDTXT, marginBottom: 7 }}>✕ CE QUE VOUS PERDEZ</div>
              {resolved.cons.map((c, i) => (
                <div
                  key={i}
                  style={{ fontSize: 13, lineHeight: 1.4, color: "#2c3447", marginBottom: 6, paddingLeft: 14, position: "relative" }}
                >
                  <span style={{ position: "absolute", left: 0, color: REDTXT }}>−</span>
                  {c}
                </div>
              ))}
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
              {state.launching ? "Lancement…" : "Lancer le vote →"}
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
