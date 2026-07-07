"use client";

import { QRCodeSVG } from "qrcode.react";
import { useTranslations } from "next-intl";
import { CREAM, INK } from "./theme";

// QR code du lien de vote — pour un scrutin PUBLIC (lien ouvert), permet à une
// pièce entière de scanner et d'ouvrir le vote sur son propre téléphone.
export default function QrCode({ url, size = 116 }: { url: string; size?: number }) {
  const t = useTranslations("Share");
  if (!url) return null;
  return (
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
      <div style={{ background: "#fff", border: `2px solid ${INK}`, borderRadius: 10, padding: 8, lineHeight: 0, flex: "none" }}>
        <QRCodeSVG value={url} size={size} level="M" bgColor="#ffffff" fgColor={INK} />
      </div>
      <div style={{ flex: 1, minWidth: 150, fontSize: 13.5, fontWeight: 600, color: INK, lineHeight: 1.45 }}>{t("qrScan")}</div>
    </div>
  );
}
