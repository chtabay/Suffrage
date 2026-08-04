"use client";

import { useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import WhatsAppShare from "./WhatsAppShare";
import ShareButton from "./ShareButton";
import { shareUrl, trackShare } from "@/lib/db/track";
import { CREAM, FONT_DISPLAY, GREENTXT, INK } from "./theme";

// Rangée de partage du lien de vote : (option « copier le lien ») + WhatsApp
// (lien direct) + partage natif de l'OS (si l'API Web Share existe). Réutilisée
// partout où l'on partage le lien : écran « prêt », vue organisateur, page de
// vote votant. `withCopy` ajoute un bouton copier là où il n'y a pas déjà de
// champ-lien à côté (typiquement la page de vote).
export default function ShareRow({
  question,
  url,
  style,
  withCopy = false,
  iconOnly = false,
}: {
  question: string;
  url: string;
  style?: CSSProperties;
  withCopy?: boolean;
  // Variante compacte : boutons carrés à icône seule (mobile / listes denses).
  iconOnly?: boolean;
}) {
  const t = useTranslations("Vote");
  const [copied, setCopied] = useState(false);
  if (!url) return null;

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(shareUrl(url, "copy"));
      // Sans API clipboard, `?.` résout sans copier : on ne compte alors rien.
      if (navigator.clipboard) trackShare(url, "copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* presse-papiers indisponible : le lien reste partageable autrement */
    }
  };

  const iconBtn = {
    width: 44,
    height: 44,
    padding: 0,
    fontSize: 18,
    borderRadius: 11,
  } as const;

  return (
    <div style={{ display: "flex", gap: 9, flexWrap: "wrap", ...style }}>
      {withCopy && (
        <button
          type="button"
          onClick={copy}
          className="dc-lift"
          aria-label={t("copyLink")}
          title={t("copyLink")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: "pointer",
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            border: `2.5px solid ${INK}`,
            background: copied ? GREENTXT : CREAM,
            color: copied ? "#fff" : INK,
            ...(iconOnly ? iconBtn : { fontSize: 15, padding: "12px 16px", borderRadius: 12 }),
          }}
        >
          {iconOnly ? (copied ? "✓" : "🔗") : copied ? t("linkCopied") : t("copyLink")}
        </button>
      )}
      <WhatsAppShare question={question} url={url} iconOnly={iconOnly} />
      <ShareButton question={question} url={url} iconOnly={iconOnly} />
    </div>
  );
}
