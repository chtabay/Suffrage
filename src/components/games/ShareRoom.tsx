"use client";

// PARTAGER UNE SALLE — le geste de la personne debout au milieu du salon.
//
// TROIS CANAUX, DANS L'ORDRE DE CE QUI MARCHE VRAIMENT DANS UNE PIÈCE :
//   1. le CODE en gros — on le lit à voix haute, c'est le plus rapide à six ;
//   2. le QR — tout le monde sort son téléphone et scanne (agrandi plein écran
//      par le composant existant, qui sait déjà le faire) ;
//   3. le lien — copie, partage natif de l'OS, WhatsApp pour les absents.
//
// POURQUOI PAS `components/scrutin/ShareRow`. Il fait le même travail, mais ses
// couleurs sont câblées sur l'encre navy et le crème de Placet, ses libellés
// vivent dans le namespace « Vote », et son suivi d'audience ne concerne que les
// liens `/v/<token>`. L'adapter aurait voulu dire toucher quatre écrans de vote
// pour habiller un jeu. Le QR, lui, est réutilisé TEL QUEL : un QR est
// monochrome par nature, et son plein écran est exactement ce qu'il faut ici.
import { useState } from "react";
import QrCode from "@/components/scrutin/QrCode";
import type { GameSkin } from "@/lib/games/skin";
import { GBtn } from "./ui";

export default function ShareRoom({
  skin,
  code,
  url,
  text,
  labels,
  compact = false,
}: {
  skin: GameSkin;
  code: string;
  url: string;
  /** Message prérédigé pour WhatsApp / partage natif. */
  text: string;
  labels: { code: string; copy: string; copied: string; share: string; whatsapp: string };
  /** Variante resserrée (pendant une partie, où la place appartient au jeu). */
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* presse-papiers refusé : le code et le QR restent là, on ne bloque rien */
    }
  };

  const nativeShare = async () => {
    try {
      if (navigator.share) await navigator.share({ text, url });
      else await copy();
    } catch {
      /* partage annulé par l'utilisateur : rien à signaler */
    }
  };

  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 190px", minWidth: 0 }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.06em", color: skin.muted, textTransform: "uppercase" }}>
          {labels.code}
        </div>
        <div
          style={{
            fontFamily: skin.fontDisplay,
            fontWeight: 800,
            // Le code doit se lire de l'autre bout d'un canapé.
            fontSize: compact ? 26 : "clamp(30px,9vw,44px)",
            letterSpacing: "0.14em",
            lineHeight: 1.05,
            marginTop: 2,
          }}
        >
          {code}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <GBtn skin={skin} variant="ghost" size="sm" onClick={copy}>
            {copied ? `✓ ${labels.copied}` : `🔗 ${labels.copy}`}
          </GBtn>
          <GBtn skin={skin} variant="ghost" size="sm" onClick={nativeShare}>
            ↗ {labels.share}
          </GBtn>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`}
            target="_blank"
            rel="noopener"
            className="dc-lift"
            style={{
              display: "inline-flex",
              alignItems: "center",
              fontFamily: skin.fontDisplay,
              fontWeight: 800,
              fontSize: 13,
              padding: "8px 13px",
              borderRadius: 10,
              textDecoration: "none",
              border: `${skin.border}px solid ${skin.ink}`,
              background: "#25D366",
              color: skin.ink,
              boxShadow: `4px 4px 0 ${skin.ink}`,
              ["--sh-hover" as string]: `6px 6px 0 ${skin.ink}`,
            }}
          >
            {labels.whatsapp}
          </a>
        </div>
      </div>
      <QrCode url={url} size={compact ? 78 : 104} mini={compact} compact={!compact} />
    </div>
  );
}
