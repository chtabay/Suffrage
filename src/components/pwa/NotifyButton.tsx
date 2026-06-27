"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { subscribeNotifications, useNotify } from "@/lib/pwa/notify";
import { CREAM, FONT_BODY, GREEN, INK, MUTED } from "@/components/scrutin/theme";

type State = "idle" | "busy" | "done" | "denied" | "error";

/**
 * Bouton « M'avertir ». Avec `pollToken` : abonnement à ce scrutin (votant).
 * Sans : abonnement au compte (organisateur, scope lu côté serveur via la session).
 */
export default function NotifyButton({
  pollToken,
  label,
}: {
  pollToken?: string;
  label?: string;
}) {
  const t = useTranslations("Notify");
  const { supported } = useNotify();
  const [state, setState] = useState<State>("idle");
  if (!supported) return null;

  const defaultLabel = label ?? t("default");

  const click = async () => {
    setState("busy");
    const r = await subscribeNotifications(pollToken);
    setState(r === "ok" ? "done" : r === "denied" ? "denied" : "error");
  };

  const text =
    state === "done"
      ? t("done")
      : state === "busy"
        ? "…"
        : state === "denied"
          ? t("denied")
          : state === "error"
            ? t("retry")
            : defaultLabel;

  const done = state === "done";
  return (
    <button
      onClick={click}
      disabled={state === "busy" || done}
      style={{
        fontFamily: FONT_BODY,
        fontWeight: 700,
        fontSize: 14,
        cursor: state === "busy" || done ? "default" : "pointer",
        border: `2px solid ${INK}`,
        borderRadius: 11,
        padding: "10px 16px",
        background: done ? GREEN : CREAM,
        color: done ? "#fff" : INK,
        opacity: state === "denied" ? 0.6 : 1,
      }}
      title={state === "denied" ? t("deniedTitle") : undefined}
    >
      {text}
    </button>
  );
}

/** Petite aide affichée sous le bouton si besoin. */
export function NotifyHint() {
  const t = useTranslations("Notify");
  return (
    <div style={{ fontSize: 11.5, color: MUTED, marginTop: 6, lineHeight: 1.4 }}>
      {t("hint")}
    </div>
  );
}
