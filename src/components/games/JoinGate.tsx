"use client";

// ENTRER DANS UNE PARTIE — générique, et volontairement PAUVRE.
//
// Le parcours entier tient en trois gestes : ouvrir le lien, taper un pseudo,
// appuyer. Pas de compte, pas d'email, pas d'onboarding, pas d'écran
// intermédiaire, pas d'explication des règles avant d'être entré (les règles se
// lisent en jouant, et de toute façon l'hôte les explique de vive voix).
//
// Deux détails qui font la différence sur un téléphone :
//   • le pseudo précédent est prérempli — à la deuxième partie, c'est un seul
//     appui, et c'est ce qui rend « rejouer » instantané pour toute la table ;
//   • le clavier affiche « OK » (`enterKeyHint`) et Entrée valide.
import { useEffect, useRef, useState } from "react";
import type { GameSkin } from "@/lib/games/skin";
import { GBtn, GCard } from "./ui";

export default function JoinGate({
  skin,
  title,
  hint,
  placeholder,
  cta,
  busyLabel,
  error,
  initialName = "",
  onJoin,
}: {
  skin: GameSkin;
  title: string;
  hint?: string;
  placeholder: string;
  cta: string;
  busyLabel: string;
  /** Message d'échec déjà traduit (pseudo pris, salle pleine…). */
  error?: string | null;
  initialName?: string;
  onJoin: (name: string) => Promise<void> | void;
}) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // Le curseur est déjà dans le champ : on peut taper sans viser.
  useEffect(() => {
    input.current?.focus();
  }, []);

  const go = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await onJoin(name.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <GCard skin={skin} accent={skin.accent} padding={18}>
      <h1 style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 25, margin: 0, letterSpacing: "-0.02em" }}>
        {title}
      </h1>
      {hint && <p style={{ color: skin.muted, fontSize: 14, lineHeight: 1.45, margin: "8px 0 0" }}>{hint}</p>}
      <input
        ref={input}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void go();
        }}
        placeholder={placeholder}
        maxLength={24}
        enterKeyHint="go"
        autoComplete="nickname"
        aria-label={placeholder}
        style={{
          width: "100%",
          marginTop: 14,
          fontFamily: skin.fontDisplay,
          fontWeight: 700,
          fontSize: 20,
          padding: "15px 16px",
          border: `3px solid ${skin.ink}`,
          borderRadius: 13,
          background: "#fff",
          color: skin.ink,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      {error && (
        <div role="alert" style={{ marginTop: 10, fontSize: 13.5, fontWeight: 700, color: "#C62828" }}>
          {error}
        </div>
      )}
      <GBtn skin={skin} size="lg" full onClick={go} disabled={!name.trim() || busy} style={{ marginTop: 12 }}>
        {busy ? busyLabel : cta}
      </GBtn>
    </GCard>
  );
}
