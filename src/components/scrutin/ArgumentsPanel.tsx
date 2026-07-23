"use client";

// « Le débat » : arguments pour/contre rattachés aux OPTIONS, jamais aux bulletins.
// Argumenter est indépendant du vote (on peut argumenter sans voter) : c'est ce
// découplage, hérité du schéma (table sans lien avec les bulletins), qui préserve
// le secret. Visuellement, la carte se distingue du dépouillement : fond crème,
// ombre courte, et surtout AUCUNE barre ni pourcentage — de simples compteurs.
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { addArgument, type Argument, type Stance } from "@/lib/db/arguments";
import type { Option } from "@/lib/voting/types";
import {
  CORAL,
  CREAM,
  FONT_BODY,
  FONT_DISPLAY,
  GREEN,
  GREENTXT,
  INK,
  MUTED,
  REDTXT,
  SUBINK,
  YELLOW,
  lift,
} from "./theme";

interface Props {
  token: string;
  options: Option[];
  args: Argument[];
  /** Lecture du débat autorisée ? Faux tant que les résultats sont cachés :
   *  montrer les arguments avant la clôture télégraphierait les tendances. */
  showList: boolean;
  /** Dépôt encore possible (scrutin non clos — la RPC le vérifie aussi). */
  canAdd: boolean;
  /** Recharge la liste après un dépôt réussi. */
  onAdded: () => void | Promise<void>;
}

const field = {
  fontFamily: FONT_BODY,
  fontSize: 14,
  fontWeight: 500,
  padding: "10px 12px",
  border: `2px solid ${INK}`,
  borderRadius: 10,
  background: CREAM,
  outline: "none",
  boxSizing: "border-box",
  width: "100%",
} as const;

// Colonne 👍 ou 👎 d'une option : compteur en toutes lettres dans l'en-tête
// (jamais de barre), items en ordre chronologique, auteur en petit.
function ArgColumn({ head, color, accent, items }: { head: string; color: string; accent: string; items: Argument[] }) {
  const t = useTranslations("Vote");
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {head} ({items.length})
      </div>
      {items.length === 0 ? (
        <div style={{ marginTop: 8, color: MUTED, fontSize: 13 }}>—</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 8 }}>
          {items.map((a, i) => (
            <div key={i} style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 10 }}>
              <div style={{ fontSize: 13.5, color: SUBINK, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{a.body}</div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: MUTED, marginTop: 2 }}>
                — {a.author || t("anonymous")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Mini-formulaire replié par défaut : option (chips icône+nom), posture 👍/👎,
// texte, pseudo facultatif. Après succès on garde le formulaire ouvert (option et
// posture conservées) pour enchaîner un second argument sans re-naviguer.
function AddArgumentForm({ token, options, onAdded }: { token: string; options: Option[]; onAdded: () => void | Promise<void> }) {
  const t = useTranslations("Vote");
  const [open, setOpen] = useState(false);
  const [optionIdx, setOptionIdx] = useState<number | null>(null);
  const [stance, setStance] = useState<Stance>("pro");
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = optionIdx !== null && Boolean(body.trim()) && !sending;
  const send = async () => {
    if (!canSend || optionIdx === null) return;
    setSending(true);
    setError(null);
    setSent(false);
    try {
      const r = await addArgument(token, optionIdx, stance, body, author);
      if (r === "ok") {
        setBody("");
        setSent(true);
        await onAdded();
      } else {
        // 'closed' peut arriver en course avec la clôture : message dédié.
        setError(r === "closed" ? t("argueClosedError") : t("argueError"));
      }
    } catch {
      setError(t("argueError"));
    } finally {
      setSending(false);
    }
  };

  const stanceBtn = (s: Stance, bg: string, label: string) => (
    <button
      type="button"
      onClick={() => setStance(s)}
      aria-pressed={stance === s}
      style={{
        fontFamily: FONT_DISPLAY,
        fontWeight: 700,
        fontSize: 13.5,
        cursor: "pointer",
        border: `2px solid ${INK}`,
        background: stance === s ? bg : "#fff",
        color: stance === s ? "#fff" : INK,
        padding: "8px 14px",
        borderRadius: 20,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ marginTop: 14 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 13.5,
          cursor: "pointer",
          border: `2px solid ${INK}`,
          background: open ? INK : "#fff",
          color: open ? "#fff" : INK,
          padding: "8px 16px",
          borderRadius: 20,
        }}
      >
        ✍️ {t("argueAdd")} {open ? "▴" : "▸"}
      </button>
      {open && (
        <div style={{ marginTop: 12, background: "#fff", border: `2px solid ${INK}`, borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {t("argueOptionLabel")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {options.map((o, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setOptionIdx(i)}
                aria-pressed={optionIdx === i}
                style={{
                  fontFamily: FONT_BODY,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  border: `2px solid ${INK}`,
                  background: optionIdx === i ? YELLOW : CREAM,
                  color: INK,
                  padding: "7px 12px",
                  borderRadius: 20,
                  boxShadow: optionIdx === i ? `2px 2px 0 ${INK}` : "none",
                }}
              >
                {o.icon} {o.name}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {stanceBtn("pro", GREEN, `👍 ${t("arguePro")}`)}
            {stanceBtn("con", CORAL, `👎 ${t("argueCon")}`)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
            <textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setSent(false);
              }}
              placeholder={t("arguePlaceholder")}
              maxLength={280}
              rows={3}
              style={{ ...field, resize: "vertical" }}
            />
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder={t("argueAuthorPlaceholder")}
              maxLength={40}
              style={field}
            />
          </div>
          {error && <div style={{ marginTop: 10, color: REDTXT, fontWeight: 700, fontSize: 13 }}>{error}</div>}
          {sent && <div style={{ marginTop: 10, color: GREENTXT, fontWeight: 700, fontSize: 13 }}>✓ {t("argueSent")}</div>}
          <button
            onClick={send}
            disabled={!canSend}
            className="dc-lift"
            style={{
              marginTop: 12,
              width: "100%",
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 14,
              cursor: canSend ? "pointer" : "default",
              border: `2.5px solid ${INK}`,
              background: INK,
              color: "#fff",
              padding: 11,
              borderRadius: 11,
              opacity: canSend ? 1 : 0.5,
              ...lift(`3px 3px 0 ${YELLOW}`, `4px 4px 0 ${YELLOW}`),
            }}
          >
            {sending ? t("submitting") : `📣 ${t("argueSend")}`}
          </button>
        </div>
      )}
    </div>
  );
}

/** Carte « Le débat » : arguments regroupés par option, saisie repliable. */
export default function ArgumentsPanel({ token, options, args, showList, canAdd, onAdded }: Props) {
  const t = useTranslations("Vote");

  // Tri chronologique global puis regroupement par option, dans l'ordre du
  // bulletin (l'ordre d'affichage ne doit rien suggérer sur les tendances).
  const byOption = useMemo(() => {
    const sorted = [...args].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    return options.map((_, i) => ({
      idx: i,
      pro: sorted.filter((a) => a.optionIdx === i && a.stance === "pro"),
      con: sorted.filter((a) => a.optionIdx === i && a.stance === "con"),
    }));
  }, [args, options]);

  // Clos ET sans le moindre argument : rien à lire ni à déposer — pas de carte
  // (inviter au débat sur un scrutin clos serait un cul-de-sac).
  if (!canAdd && args.length === 0) return null;

  const groups = byOption.filter((g) => g.pro.length + g.con.length > 0);

  return (
    <div
      style={{
        marginTop: 22,
        background: CREAM,
        border: `2.5px solid ${INK}`,
        borderRadius: 16,
        padding: "16px 18px",
        boxShadow: `3px 3px 0 ${INK}`,
      }}
    >
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16 }}>🗣️ {t("debateTitle")}</div>
      <div style={{ fontSize: 12.5, color: MUTED, fontWeight: 600, marginTop: 4, lineHeight: 1.45 }}>
        🔒 {t("debateHint")}
      </div>

      {showList ? (
        groups.length === 0 ? (
          <div
            style={{
              marginTop: 12,
              fontSize: 13.5,
              color: MUTED,
              lineHeight: 1.5,
              border: `2px dashed ${MUTED}`,
              borderRadius: 12,
              padding: "12px 14px",
            }}
          >
            💡 {t("debateEmpty")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
            {groups.map((g) => (
              <div key={g.idx} style={{ background: "#fff", border: `2px solid ${INK}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14.5 }}>
                  {options[g.idx].icon} {options[g.idx].name}
                </div>
                {/* Deux colonnes qui s'empilent sur mobile (auto-fit). */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12, marginTop: 10 }}>
                  <ArgColumn head={`👍 ${t("debateProCol")}`} color={GREENTXT} accent={GREEN} items={g.pro} />
                  <ArgColumn head={`👎 ${t("debateConCol")}`} color={REDTXT} accent={CORAL} items={g.con} />
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // Résultats cachés : on ne montre qu'un compteur global — assez pour
        // signaler que le débat vit, pas assez pour télégraphier les tendances.
        args.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 13, color: MUTED, fontWeight: 700 }}>
            💬 {t("argueCountHidden", { count: args.length })}
          </div>
        )
      )}

      {canAdd && <AddArgumentForm token={token} options={options} onAdded={onAdded} />}
    </div>
  );
}
