"use client";

import { useState } from "react";
import { useInstall } from "@/lib/pwa/install";
import { FONT_DISPLAY, INK, YELLOW } from "@/components/scrutin/theme";

export default function InstallFab() {
  const { canPrompt, standalone, ios, promptInstall } = useInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIos, setShowIos] = useState(false);

  if (standalone || dismissed) return null;
  if (!canPrompt && !ios) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
      }}
    >
      {ios && showIos && (
        <div
          style={{
            background: "#fff",
            border: `2.5px solid ${INK}`,
            borderRadius: 12,
            padding: "10px 13px",
            fontSize: 13,
            fontWeight: 600,
            color: INK,
            maxWidth: 240,
            boxShadow: `4px 4px 0 ${INK}`,
            lineHeight: 1.45,
          }}
        >
          Sur iPhone : appuie sur <b>Partager</b> puis <b>« Sur l&apos;écran d&apos;accueil »</b>.
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          onClick={() => (ios ? setShowIos((s) => !s) : promptInstall())}
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            border: `2.5px solid ${INK}`,
            background: INK,
            color: "#fff",
            padding: "11px 16px",
            borderRadius: 13,
            boxShadow: `4px 4px 0 ${YELLOW}`,
          }}
        >
          📲 Installer l&apos;appli
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Fermer"
          style={{
            width: 32,
            height: 32,
            border: `2px solid ${INK}`,
            background: "#fff",
            borderRadius: 9,
            cursor: "pointer",
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
