"use client";

import { useTranslations } from "next-intl";
import type { ScrutinController } from "@/lib/voting/useScrutin";
import { CREAM, FONT_BODY, FONT_DISPLAY, INK, MUTED, REDTXT } from "./theme";

/**
 * Choix d'accès (Vote rapide / Vote vérifié) : décision structurante qui porte le
 * positionnement « résultat vérifiable » de Placet. Sortie du repli « Réglages
 * avancés » pour être TOUJOURS visible — choisir « vérifié » ouvre ensuite le repli
 * (prédicat d'auto-ouverture) et révèle la liste des votants.
 */
export default function AccessModeChips({ ctrl }: { ctrl: ScrutinController }) {
  const t = useTranslations("Access");
  const { state, setAccess } = ctrl;
  const isGE = state.recipe.suffrage === "indirect";
  const invite = state.access === "invite";

  const chip = (active: boolean, label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        flex: 1,
        minWidth: 140,
        fontFamily: FONT_BODY,
        fontWeight: 700,
        fontSize: 14,
        cursor: "pointer",
        border: `2.5px solid ${INK}`,
        padding: "11px 14px",
        borderRadius: 11,
        background: active ? INK : CREAM,
        color: active ? "#fff" : INK,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ background: "#fff", border: `2.5px solid ${INK}`, borderRadius: 16, padding: 18, boxShadow: `5px 5px 0 ${INK}` }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16, marginBottom: 11 }}>{t("whoCanVote")}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {chip(!invite, `⚡ ${t("quickVote")}`, () => setAccess("open"))}
        {chip(invite, `🔒 ${t("verifiedVote")}`, () => setAccess("invite"))}
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: 12.5,
          color: MUTED,
          lineHeight: 1.45,
          background: CREAM,
          border: `2px solid ${INK}`,
          borderRadius: 10,
          padding: "9px 12px",
        }}
      >
        {invite ? `🔒 ${t("verifiedHint")}` : `⚡ ${t("quickHint")}`}
      </div>
      {isGE && !invite && (
        <div style={{ marginTop: 8, fontSize: 12.5, color: REDTXT, fontWeight: 600, lineHeight: 1.4 }}>{t("geWarning")}</div>
      )}
    </div>
  );
}
