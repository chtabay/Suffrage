"use client";

import { useState } from "react";
import { useInstall } from "@/lib/pwa/install";
import { FONT_DISPLAY, INK, MUTED, YELLOW } from "@/components/scrutin/theme";

export default function InstallInline() {
  const { canPrompt, standalone, ios, promptInstall } = useInstall();
  const [showIos, setShowIos] = useState(false);

  if (standalone || (!canPrompt && !ios)) return null;

  return (
    <div style={{ marginTop: 14 }}>
      <button
        onClick={() => (ios ? setShowIos((s) => !s) : promptInstall())}
        style={{
          width: "100%",
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 15,
          cursor: "pointer",
          border: `2.5px solid ${INK}`,
          background: "#fff",
          color: INK,
          padding: 13,
          borderRadius: 12,
          boxShadow: `4px 4px 0 ${YELLOW}`,
        }}
      >
        📲 Installer Scrutin sur ton écran d&apos;accueil
      </button>
      {ios && showIos && (
        <div style={{ marginTop: 8, fontSize: 12.5, color: MUTED, lineHeight: 1.45 }}>
          Sur iPhone : appuie sur <b>Partager</b> puis <b>« Sur l&apos;écran d&apos;accueil »</b>.
        </div>
      )}
    </div>
  );
}
