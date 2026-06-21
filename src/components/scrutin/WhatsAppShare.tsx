"use client";

import { buildVoteShareText, waUrl } from "@/lib/share";
import { FONT_DISPLAY, INK } from "./theme";

export default function WhatsAppShare({ question, url }: { question: string; url: string }) {
  if (!url) return null;
  return (
    <a
      href={waUrl(buildVoteShareText(question, url))}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        textDecoration: "none",
        fontFamily: FONT_DISPLAY,
        fontWeight: 700,
        fontSize: 15,
        border: `2.5px solid ${INK}`,
        background: "#25D366",
        color: "#fff",
        padding: "12px 16px",
        borderRadius: 12,
      }}
    >
      💬 Partager sur WhatsApp
    </a>
  );
}
