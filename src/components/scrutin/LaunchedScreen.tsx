"use client";

import { useState } from "react";
import type { ScrutinController } from "@/lib/voting/useScrutin";
import { CREAM, FONT_BODY, FONT_DISPLAY, GREEN, INK, MUTED, YELLOW, lift } from "./theme";

function CopyRow({ url, label, hint }: { url: string; label: string; hint?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(url);
      setCopied(true);
    } catch {
      /* presse-papiers indisponible : le lien reste sélectionnable */
    }
  };
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontWeight: 700, fontSize: 12, color: MUTED, marginBottom: 7 }}>{label}</div>
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          style={{
            flex: 1,
            minWidth: 220,
            fontFamily: FONT_BODY,
            fontSize: 14,
            fontWeight: 600,
            padding: "11px 13px",
            border: `2px solid ${INK}`,
            borderRadius: 11,
            background: CREAM,
            outline: "none",
          }}
        />
        <button
          onClick={copy}
          className="dc-lift"
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            border: `2.5px solid ${INK}`,
            background: YELLOW,
            color: INK,
            padding: "11px 16px",
            borderRadius: 11,
            ...lift(`3px 3px 0 ${INK}`, `4px 4px 0 ${INK}`),
          }}
        >
          {copied ? "✓ Copié" : "Copier"}
        </button>
      </div>
      {hint && <div style={{ fontSize: 12, color: MUTED, marginTop: 6, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

export default function LaunchedScreen({ ctrl }: { ctrl: ScrutinController }) {
  const { state, newScrutin, go } = ctrl;
  const voteUrl = state.shareUrl ?? "";
  const adminUrl = state.adminUrl ?? "";

  return (
    <div className="pad" style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 100px" }}>
      <div
        style={{
          background: "#fff",
          border: `2.5px solid ${INK}`,
          borderRadius: 22,
          boxShadow: `6px 6px 0 ${GREEN}`,
          overflow: "hidden",
        }}
      >
        <div style={{ background: GREEN, padding: "26px 24px", borderBottom: `2.5px solid ${INK}` }}>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: "rgba(255,255,255,0.92)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Scrutin lancé
          </div>
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 800,
              fontSize: 28,
              color: "#fff",
              lineHeight: 1.05,
              marginTop: 4,
              textShadow: "2px 2px 0 rgba(0,0,0,0.18)",
            }}
          >
            🎉 Votre vote est prêt
          </div>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{state.question}</div>
          <p style={{ color: MUTED, fontSize: 14, margin: "6px 0 18px", lineHeight: 1.5 }}>
            Partagez le lien de vote : chacun vote sans créer de compte, et les résultats se calculent
            en direct sur la même page.
          </p>

          <CopyRow url={voteUrl} label="LIEN DE VOTE (à partager)" />

          <div style={{ marginTop: 18 }}>
            <CopyRow
              url={adminUrl}
              label="🔑 LIEN DE GESTION (privé)"
              hint="Gardez-le pour administrer ce scrutin depuis n'importe quel appareil. Ne le partagez pas."
            />
          </div>

          <div
            style={{
              marginTop: 18,
              background: CREAM,
              border: `2px solid ${INK}`,
              borderRadius: 11,
              padding: "10px 12px",
              fontSize: 13,
              fontWeight: 600,
              color: INK,
            }}
          >
            ✓ Enregistré dans « Mes scrutins » sur cet appareil.
          </div>

          <div style={{ display: "flex", gap: 11, marginTop: 20, flexWrap: "wrap" }}>
            <a
              href={voteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="dc-lift"
              style={{
                flex: 1,
                minWidth: 160,
                textAlign: "center",
                textDecoration: "none",
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 15,
                border: `2.5px solid ${INK}`,
                background: INK,
                color: "#fff",
                padding: 13,
                borderRadius: 12,
                ...lift(`4px 4px 0 ${GREEN}`, `6px 6px 0 ${GREEN}`),
              }}
            >
              Ouvrir la page de vote →
            </a>
            <button
              onClick={() => go("mine")}
              style={{
                flex: 1,
                minWidth: 160,
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                border: `2px solid ${INK}`,
                background: "#fff",
                color: INK,
                padding: 13,
                borderRadius: 12,
              }}
            >
              Mes scrutins
            </button>
            <button
              onClick={newScrutin}
              style={{
                flex: 1,
                minWidth: 160,
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                border: `2px solid ${INK}`,
                background: CREAM,
                color: INK,
                padding: 13,
                borderRadius: 12,
              }}
            >
              ← Créer un autre
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
