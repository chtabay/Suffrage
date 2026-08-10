// SKINS — « moteur commun + présentation propre au jeu ».
//
// Les composants de jeu génériques (liste de joueurs, jauge de réponses, barre
// de l'hôte, écran d'entrée) ne DOIVENT PAS connaître les couleurs de Placet :
// le jour où Unanimo vit sur son propre domaine avec sa propre identité, seul ce
// fichier change. D'où un objet passé en prop plutôt qu'un import de
// `components/scrutin/theme` au fond des composants.
//
// On garde en revanche la même GRAMMAIRE que Placet — trait épais, aplats
// francs, ombre portée, cartes — parce que c'est elle qui rend l'interface
// lisible d'un coup d'œil sur un téléphone, pas la teinte.

export interface GameSkin {
  /** Trait et texte principal. */
  ink: string;
  /** Fond de la page du jeu. */
  bg: string;
  /** Surface des cartes. */
  paper: string;
  /** Aplat de l'action principale (texte blanc dessus). */
  accent: string;
  /** Contrepoint : pastilles, badges, ombres vivantes (texte INK dessus). */
  accent2: string;
  /** Ce qui va bien : points gagnés, joueur prêt. */
  good: string;
  /** Texte adouci (jamais sous 4,5:1 sur `paper` ni sur `bg`). */
  muted: string;
  /** L'identité néo-brutaliste est RÉGLABLE, pas figée. */
  border: number;
  radius: number;
  fontDisplay: string;
  fontBody: string;
}

const FONT_DISPLAY = "var(--font-display), 'Bricolage Grotesque', sans-serif";
const FONT_BODY = "var(--font-body), 'Plus Jakarta Sans', system-ui, sans-serif";

/**
 * UNANIMO — violet et jaune sur une menthe pâle. Volontairement AILLEURS que le
 * corail sur crème de Placet : on doit sentir qu'on a changé de lieu, pas de
 * page. Contrastes vérifiés : blanc sur `accent` 5,9:1 ; `ink` sur `accent2`
 * 11,5:1 ; `muted` 7,1:1 sur blanc et 6,6:1 sur le fond.
 */
export const UNANIMO_SKIN: GameSkin = {
  ink: "#1B1235",
  bg: "#E9FBF2",
  paper: "#FFFFFF",
  accent: "#6C3BF4",
  accent2: "#FFC93C",
  good: "#0E7C5A",
  muted: "#5C5470",
  border: 2.5,
  radius: 16,
  fontDisplay: FONT_DISPLAY,
  fontBody: FONT_BODY,
};

/**
 * Skin de la porte « Jouer » : celle-ci appartient encore à Placet (c'est une
 * page de Placet qui présente les jeux), d'où les tokens maison.
 */
export const PLACET_GAMES_SKIN: GameSkin = {
  ink: "#16213A",
  bg: "#FBF6EC",
  paper: "#FFFFFF",
  accent: "#E23E3B",
  accent2: "#FFB627",
  good: "#1c7f45",
  muted: "#5b6379",
  border: 2.5,
  radius: 18,
  fontDisplay: FONT_DISPLAY,
  fontBody: FONT_BODY,
};

/** Ombre portée + relief au survol (classe `dc-lift` du CSS global). */
export function liftOf(base: string, hover: string): Record<string, string | number> {
  return { boxShadow: base, "--sh-hover": hover };
}
