"use client";

import { useState } from "react";
import { subscribeNotifications, useNotify } from "@/lib/pwa/notify";
import { CREAM, FONT_BODY, GREEN, INK, MUTED } from "@/components/scrutin/theme";

type State = "idle" | "busy" | "done" | "denied" | "error";

/**
 * Bouton « M'avertir ». Avec `pollToken` : abonnement à ce scrutin (votant).
 * Sans : abonnement au compte (organisateur, scope lu côté serveur via la session).
 */
export default function NotifyButton({
  pollToken,
  label = "🔔 M'avertir des résultats",
}: {
  pollToken?: string;
  label?: string;
}) {
  const { supported } = useNotify();
  const [state, setState] = useState<State>("idle");
  if (!supported) return null;

  const click = async () => {
    setState("busy");
    const r = await subscribeNotifications(pollToken);
    setState(r === "ok" ? "done" : r === "denied" ? "denied" : "error");
  };

  const text =
    state === "done"
      ? "✓ Vous serez prévenu"
      : state === "busy"
        ? "…"
        : state === "denied"
          ? "Notifications refusées"
          : state === "error"
            ? "Réessayer"
            : label;

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
      title={state === "denied" ? "Autorisez les notifications dans votre navigateur" : undefined}
    >
      {text}
    </button>
  );
}

/** Petite aide affichée sous le bouton si besoin. */
export function NotifyHint() {
  return (
    <div style={{ fontSize: 11.5, color: MUTED, marginTop: 6, lineHeight: 1.4 }}>
      Notification quand le vote se clôt. Sur iPhone, installez d&apos;abord l&apos;appli sur l&apos;écran d&apos;accueil.
    </div>
  );
}
