"use client";

// Kit UI Placet — primitives néo-brutalistes partagées (boutons, cartes).
// But : réduire la duplication de styles inline écran par écran. ADOPTION
// INCRÉMENTALE : les nouveaux écrans l'utilisent, les anciens migrent au fil
// des retouches (ne pas migrer en masse : risque de régression visuelle).
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { CORAL, CREAM, FONT_DISPLAY, INK, lift } from "@/components/scrutin/theme";

type BtnVariant = "primary" | "cta" | "secondary" | "cream";
type BtnSize = "sm" | "md" | "lg";

const SIZES: Record<BtnSize, CSSProperties> = {
  sm: { fontSize: 13, padding: "8px 14px", borderRadius: 10 },
  md: { fontSize: 14.5, padding: "11px 18px", borderRadius: 11 },
  lg: { fontSize: 16.5, padding: "14px 24px", borderRadius: 13 },
};

const VARIANTS: Record<BtnVariant, CSSProperties> = {
  primary: { background: INK, color: "#fff" },
  cta: { background: CORAL, color: "#fff" },
  secondary: { background: "#fff", color: INK },
  cream: { background: CREAM, color: INK },
};

export interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  /** Couleur d'accent de l'ombre portée au survol (défaut : INK). */
  accent?: string;
  /** Désactive l'effet de relief (ombre + survol). */
  flat?: boolean;
}

/** Bouton standard : bordure INK, relief au survol, focus clavier hérité du CSS global. */
export function Btn({ variant = "secondary", size = "md", accent, flat, style, children, ...rest }: BtnProps) {
  const shadow = accent ?? INK;
  return (
    <button
      type="button"
      className={flat ? undefined : "dc-lift"}
      style={{
        fontFamily: FONT_DISPLAY,
        fontWeight: 700,
        cursor: rest.disabled ? "default" : "pointer",
        border: `2.5px solid ${INK}`,
        opacity: rest.disabled ? 0.6 : 1,
        ...SIZES[size],
        ...VARIANTS[variant],
        ...(flat ? {} : lift(`4px 4px 0 ${shadow}`, `6px 6px 0 ${shadow}`)),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export interface CardProps {
  children: ReactNode;
  /** Couleur de l'ombre portée (défaut : INK). */
  accent?: string;
  padding?: number | string;
  style?: CSSProperties;
}

/** Carte standard : fond blanc, bordure INK 2.5px, ombre décalée. */
export function Card({ children, accent, padding = 20, style }: CardProps) {
  return (
    <div
      style={{
        background: "#fff",
        border: `2.5px solid ${INK}`,
        borderRadius: 18,
        padding,
        boxShadow: `5px 5px 0 ${accent ?? INK}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
