import type { CSSProperties } from "react";

// Tokens de la maquette Scrutin.
export const INK = "#16213A";
export const CREAM = "#FBF6EC";
export const PAPER = "#fff";
export const CORAL = "#FF5E5B";
export const YELLOW = "#FFB627";
export const GREEN = "#5DBB2E";
export const SUBINK = "#3a4258";
export const MUTED = "#5b6379";
export const GREENTXT = "#1f8a4c";
export const REDTXT = "#d23b3b";

export const FONT_DISPLAY = "var(--font-display), 'Bricolage Grotesque', sans-serif";
export const FONT_BODY = "var(--font-body), 'Plus Jakarta Sans', system-ui, sans-serif";

/** Style autorisant les propriétés CSS personnalisées (--sh-hover, etc.). */
export type Style = CSSProperties & Record<string, string | number>;

/** Ombre portée néo-brutaliste avec lift au survol (classe `dc-lift`). */
export function lift(base: string, hover: string): Style {
  return { boxShadow: base, "--sh-hover": hover };
}
