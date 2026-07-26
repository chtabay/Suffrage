"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { trackShare } from "@/lib/db/track";
import { FONT_DISPLAY, INK, YELLOW } from "./theme";

// Partage « classique » : ouvre la feuille de partage native de l'OS (WhatsApp,
// Messages, Mail, AirDrop, copier…). Ne s'affiche que si l'API Web Share existe
// (mobile iOS/Android, Chrome/Edge desktop) ; ailleurs, le bouton « Copier »
// déjà présent prend le relais.
export default function ShareButton({ question, url, iconOnly = false }: { question: string; url: string; iconOnly?: boolean }) {
  const t = useTranslations("Vote");
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  if (!url || !canShare) return null;

  const share = async () => {
    try {
      // Le lien passe par le champ `url` (pas dans `text`) pour éviter de le
      // dupliquer dans les cibles qui gèrent l'aperçu de lien.
      await navigator.share({ title: question || "Placet", text: `🗳️ ${question}`, url });
      // Compté seulement si la feuille de partage a abouti (annulation → throw).
      trackShare(url, "native");
    } catch {
      /* partage annulé par l'utilisateur */
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="dc-lift"
      aria-label={t("shareNative")}
      title={t("shareNative")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        cursor: "pointer",
        fontFamily: FONT_DISPLAY,
        fontWeight: 700,
        border: `2.5px solid ${INK}`,
        background: YELLOW,
        color: INK,
        ...(iconOnly
          ? { width: 44, height: 44, padding: 0, fontSize: 18, borderRadius: 11 }
          : { fontSize: 15, padding: "12px 16px", borderRadius: 12 }),
      }}
    >
      {iconOnly ? "↗" : t("shareNative")}
    </button>
  );
}
