"use client";

import type { CSSProperties } from "react";
import WhatsAppShare from "./WhatsAppShare";
import ShareButton from "./ShareButton";

// Rangée de partage du lien de vote : WhatsApp (lien direct) + partage natif de
// l'OS (si l'API Web Share existe). Réutilisée partout où l'on partage le lien :
// écran « Votre vote est prêt », vue organisateur, page de vote votant.
export default function ShareRow({ question, url, style }: { question: string; url: string; style?: CSSProperties }) {
  if (!url) return null;
  return (
    <div style={{ display: "flex", gap: 9, flexWrap: "wrap", ...style }}>
      <WhatsAppShare question={question} url={url} />
      <ShareButton question={question} url={url} />
    </div>
  );
}
