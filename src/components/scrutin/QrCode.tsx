"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslations } from "next-intl";
import { CREAM, INK } from "./theme";

// QR code du lien de vote — pour un scrutin PUBLIC (lien ouvert), permet à une
// pièce entière de scanner et d'ouvrir le vote sur son propre téléphone.
// Cliquable : ouvre un affichage plein écran (projection / grand écran).
export default function QrCode({ url, size = 116 }: { url: string; size?: number }) {
  const t = useTranslations("Share");
  const [zoom, setZoom] = useState(false);
  const [bigSize, setBigSize] = useState(320);
  if (!url) return null;

  const openZoom = () => {
    if (typeof window !== "undefined") {
      const s = Math.max(220, Math.min(480, Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.8)));
      setBigSize(s);
    }
    setZoom(true);
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: CREAM,
          border: `2px solid ${INK}`,
          borderRadius: 12,
          padding: 12,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={openZoom}
          aria-label={t("qrEnlarge")}
          title={t("qrEnlarge")}
          style={{ background: "#fff", border: `2px solid ${INK}`, borderRadius: 10, padding: 8, lineHeight: 0, flex: "none", cursor: "zoom-in" }}
        >
          <QRCodeSVG value={url} size={size} level="M" bgColor="#ffffff" fgColor={INK} />
        </button>
        <div style={{ flex: 1, minWidth: 150, fontSize: 13.5, fontWeight: 600, color: INK, lineHeight: 1.45 }}>
          {t("qrScan")}
          <br />
          <span style={{ fontSize: 12, opacity: 0.6 }}>{t("qrEnlarge")}</span>
        </div>
      </div>

      {zoom && (
        <div
          onClick={() => setZoom(false)}
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(22,33,58,0.94)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 22,
            padding: 24,
            cursor: "zoom-out",
          }}
        >
          <div style={{ background: "#fff", border: `3px solid ${INK}`, borderRadius: 18, padding: 20, lineHeight: 0 }}>
            <QRCodeSVG value={url} size={bigSize} level="M" bgColor="#ffffff" fgColor={INK} />
          </div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, textAlign: "center", maxWidth: 440, lineHeight: 1.4 }}>{t("qrScan")}</div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600, fontSize: 13 }}>{t("qrClose")}</div>
        </div>
      )}
    </>
  );
}
