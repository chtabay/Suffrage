import type { CSSProperties } from "react";

// Tokens de la maquette Scrutin.
export const INK = "#16213A";
export const CREAM = "#FBF6EC";
export const PAPER = "#fff";
// Corail assombri (#E23E3B) : le texte blanc sur corail plein passe désormais le
// contraste WCAG AA-large (~4,2:1 contre ~2,8:1 avec l'ancien #FF5E5B), tout en
// gardant la même famille chromatique. Appliqué partout où CORAL est un aplat de CTA.
export const CORAL = "#E23E3B";
export const YELLOW = "#FFB627";
export const GREEN = "#5DBB2E";
export const SUBINK = "#3a4258";
export const MUTED = "#5b6379";
// Vert de TEXTE. #1f8a4c plafonnait à 4,38:1 sur blanc — sous la barre AA de 4,5
// pour du petit texte, et 4,06 sur crème. #1c7f45 passe les deux (5,03 et 4,67)
// dans la même famille chromatique. Même démarche que l'assombrissement du corail
// ci-dessus. GREEN reste réservé aux APLATS et aux bordures, jamais au texte :
// #5DBB2E sur blanc ne fait que 2,44:1.
export const GREENTXT = "#1c7f45";
export const REDTXT = "#d23b3b";

export const FONT_DISPLAY = "var(--font-display), 'Bricolage Grotesque', sans-serif";
export const FONT_BODY = "var(--font-body), 'Plus Jakarta Sans', system-ui, sans-serif";

/** Style autorisant les propriétés CSS personnalisées (--sh-hover, etc.). */
export type Style = CSSProperties & Record<string, string | number>;

/** Ombre portée néo-brutaliste avec lift au survol (classe `dc-lift`). */
export function lift(base: string, hover: string): Style {
  return { boxShadow: base, "--sh-hover": hover };
}
