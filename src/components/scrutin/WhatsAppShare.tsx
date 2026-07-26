"use client";

import { useLocale, useTranslations } from "next-intl";
import { buildVoteShareText, waUrl } from "@/lib/share";
import { FONT_DISPLAY, INK } from "./theme";

export default function WhatsAppShare({ question, url, iconOnly = false }: { question: string; url: string; iconOnly?: boolean }) {
  const t = useTranslations("Vote");
  const locale = useLocale();
  if (!url) return null;
  return (
    <a
      href={waUrl(buildVoteShareText(question, url, locale))}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("shareWhatsApp")}
      title={t("shareWhatsApp")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        textDecoration: "none",
        fontFamily: FONT_DISPLAY,
        fontWeight: 700,
        border: `2.5px solid ${INK}`,
        background: "#25D366",
        color: "#fff",
        ...(iconOnly
          ? { width: 44, height: 44, padding: 0, fontSize: 18, borderRadius: 11 }
          : { fontSize: 15, padding: "12px 16px", borderRadius: 12 }),
      }}
    >
      {iconOnly ? "💬" : t("shareWhatsApp")}
    </a>
  );
}
