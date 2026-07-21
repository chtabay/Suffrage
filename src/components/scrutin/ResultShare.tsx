"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { buildResultText, waUrl } from "@/lib/share";
import type { ComputeResult } from "@/lib/voting/types";
import { CREAM, FONT_DISPLAY, INK } from "./theme";

export default function ResultShare({
  question,
  result,
  ballotCount,
  optionsCount,
  url,
  survey,
}: {
  question: string;
  result: ComputeResult;
  ballotCount: number;
  optionsCount: number;
  url: string;
  survey?: boolean;
}) {
  const t = useTranslations("Vote");
  const tm = useTranslations("Methods");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  const text = buildResultText(question, result, ballotCount, optionsCount, url, locale, tm(`${result.methodKey}.name`), survey);
  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(text);
      setCopied(true);
    } catch {
      /* presse-papiers indisponible */
    }
  };
  return (
    <div style={{ display: "flex", gap: 9, marginTop: 14, flexWrap: "wrap" }}>
      <a
        href={waUrl(text)}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          flex: 1,
          minWidth: 170,
          textAlign: "center",
          textDecoration: "none",
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 14.5,
          border: `2.5px solid ${INK}`,
          background: "#25D366",
          color: "#fff",
          padding: 12,
          borderRadius: 12,
        }}
      >
        {t("shareResult")}
      </a>
      <button
        onClick={copy}
        style={{
          flex: 1,
          minWidth: 170,
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 14.5,
          cursor: "pointer",
          border: `2.5px solid ${INK}`,
          background: CREAM,
          color: INK,
          padding: 12,
          borderRadius: 12,
        }}
      >
        {copied ? t("copiedResult") : t("copyResult")}
      </button>
    </div>
  );
}
