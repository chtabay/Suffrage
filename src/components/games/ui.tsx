"use client";

// PRIMITIVES VISUELLES DE JEU — même grammaire que le kit de Placet
// (`src/components/ui/kit.tsx`), mais la COULEUR arrive en paramètre.
//
// Pourquoi ne pas réutiliser `kit.tsx` directement : ses styles importent
// `components/scrutin/theme` (encre navy, crème, corail). Tout composant bâti
// dessus est donc, par construction, aux couleurs de Placet — c'est exactement ce
// que le jeu ne doit pas être. Ici, rien n'est décidé : `skin` décide.
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { liftOf, type GameSkin } from "@/lib/games/skin";

type Variant = "primary" | "accent" | "ghost";
type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, CSSProperties> = {
  sm: { fontSize: 13, padding: "8px 13px", borderRadius: 10 },
  md: { fontSize: 15, padding: "11px 17px", borderRadius: 12 },
  // `lg` est la taille des gestes qu'on fait avec le pouce, debout : 48 px de
  // haut au minimum, la cible tactile recommandée.
  lg: { fontSize: 17.5, padding: "15px 22px", borderRadius: 14, minHeight: 52 },
};

export interface GBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  skin: GameSkin;
  variant?: Variant;
  size?: Size;
  full?: boolean;
}

export function GBtn({ skin, variant = "primary", size = "md", full, style, children, ...rest }: GBtnProps) {
  const paint: Record<Variant, CSSProperties> = {
    primary: { background: skin.accent, color: "#fff" },
    accent: { background: skin.accent2, color: skin.ink },
    ghost: { background: skin.paper, color: skin.ink },
  };
  return (
    <button
      type="button"
      className={rest.disabled ? undefined : "dc-lift"}
      style={{
        fontFamily: skin.fontDisplay,
        fontWeight: 800,
        cursor: rest.disabled ? "default" : "pointer",
        border: `${skin.border}px solid ${skin.ink}`,
        opacity: rest.disabled ? 0.5 : 1,
        width: full ? "100%" : undefined,
        ...SIZES[size],
        ...paint[variant],
        ...(rest.disabled ? {} : liftOf(`4px 4px 0 ${skin.ink}`, `6px 6px 0 ${skin.ink}`)),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function GCard({
  skin,
  children,
  accent,
  padding = 16,
  style,
}: {
  skin: GameSkin;
  children: ReactNode;
  accent?: string;
  padding?: number | string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: skin.paper,
        border: `${skin.border}px solid ${skin.ink}`,
        borderRadius: skin.radius,
        padding,
        boxShadow: `5px 5px 0 ${accent ?? skin.ink}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Petit titre de section : majuscules espacées, comme sur les écrans Placet. */
export function GLabel({ skin, children, style }: { skin: GameSkin; children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontFamily: skin.fontDisplay,
        fontWeight: 800,
        fontSize: 12,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: skin.muted,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
