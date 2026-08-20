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
 * ALIBI — une soirée d'enquête : bleu de nuit, laiton, sur un papier ivoire.
 *
 * On cherche la lampe de bureau et le carnet, pas le manoir hanté : le jeu se
 * joue dans un gîte avec des enfants de huit ans, et une ambiance macabre les
 * mettrait dehors. Le rouge est réservé à UNE chose — la pièce qui compte un
 * occupant de trop — pour qu'elle saute aux yeux d'un bout de la table.
 *
 * Contrastes vérifiés sur `paper` (#FFFDF7) : blanc sur `accent` 8,3:1 ;
 * `ink` sur `accent2` 9,8:1 ; `muted` 5,4:1 sur `paper` et 5,2:1 sur `bg`.
 */
export const ALIBI_SKIN: GameSkin = {
  ink: "#161B2E",
  bg: "#F2EEE3",
  paper: "#FFFDF7",
  accent: "#2A3D66",
  accent2: "#D9A441",
  good: "#1C6E4A",
  muted: "#5A5B66",
  border: 2.5,
  radius: 14,
  fontDisplay: FONT_DISPLAY,
  fontBody: FONT_BODY,
};

/** La pièce qui en compte un de trop. La SEULE chose rouge du jeu. */
export const ALIBI_ALERT = "#B3261E";

/**
 * RÔDEURS — la veillée : brun de braise et ambre sur un papier chaud.
 *
 * Un jeu qui dure la soirée et se joue pendant qu'elle a lieu : l'écran doit
 * ressembler à une lampe posée dans un coin, pas à un néon. Le rouge n'existe
 * pas ici — rien dans ce jeu n'est une alerte, même la mise en lumière est une
 * fête.
 *
 * Contrastes CALCULÉS (pas affirmés) : blanc sur `accent` 7,62:1 ; `ink` sur
 * `accent2` 8,14:1 ; `muted` 6,22:1 sur `paper` et 5,38:1 sur `bg` ; `good`
 * 6,91:1 sur `paper`.
 */
export const RODEURS_SKIN: GameSkin = {
  ink: "#26190E",
  bg: "#F4E9D4",
  paper: "#FFFAEE",
  accent: "#8C3B1B",
  accent2: "#E5A83C",
  good: "#22633B",
  muted: "#6E5B44",
  border: 2.5,
  radius: 15,
  fontDisplay: FONT_DISPLAY,
  fontBody: FONT_BODY,
};

/**
 * LA NUIT DU FANTÔME — le manoir : prune de crépuscule et or de chandelier sur
 * un papier gris-lilas.
 *
 * Un jeu-événement qui se joue LUMIÈRES ÉTEINTES, sur des téléphones tenus dans
 * des pièces sombres : l'écran doit être une bougie, pas un projecteur. L'or est
 * réservé aux deux moments de théâtre — le glas et la mise en lumière — pour
 * qu'ils se voient d'un bout à l'autre du salon.
 *
 * Contrastes CALCULÉS : blanc sur `accent` 9,05:1 ; `ink` sur `accent2`
 * 7,26:1 ; `muted` 7,03:1 sur `paper` et 6,10:1 sur `bg` ; `good` 5,97:1.
 */
export const FANTOME_SKIN: GameSkin = {
  ink: "#1B1725",
  bg: "#EDE7F0",
  paper: "#FBF8FC",
  accent: "#5B3A78",
  accent2: "#C9A227",
  good: "#2F6B4F",
  muted: "#5C5169",
  border: 2.5,
  radius: 14,
  fontDisplay: FONT_DISPLAY,
  fontBody: FONT_BODY,
};

/**
 * ÉCHECS COLLABORATIFS — ardoise et vert de tournoi, sur un papier froid.
 *
 * Les quatre autres jeux sont chauds et sombres : ce sont des jeux de soirée
 * qu'on joue lumières éteintes. Celui-ci est un jeu de RÉFLEXION, et sa famille
 * (« stratégie collaborative ») doit se distinguer d'un coup d'œil — d'où le
 * froid, le clair, et le calme.
 *
 * Contrastes CALCULÉS : blanc sur `accent` 7,33:1 ; `muted` 6,22:1 sur `paper`
 * et 5,49:1 sur `bg` ; `ink` sur `paper` 15,21:1 ; `good` 6,20:1.
 * ⚠️ `accent2` (l'ambre du « à nous de jouer ») ne porte JAMAIS de texte blanc :
 * mesuré à 3,34:1, sous la barre. Sur l'ambre, on écrit à l'encre (4,68:1).
 */
/**
 * ÉCHECS — le registre CHAUD de Placet : encre marine sur crème, comme la
 * marque, parce que ce jeu-ci ne cherche pas à dépayser. Les autres jeux du
 * catalogue vont volontairement ailleurs (« on doit sentir qu'on a changé de
 * lieu ») ; un échiquier, lui, doit avoir l'air d'un objet posé sur la table de
 * Placet — la première version, gris froid sur damier vert, ressemblait à
 * lichess et à rien d'autre.
 *
 * Contrastes mesurés : blanc sur `accent` 7,33:1 ; `ink` sur `accent2` 4,79:1 ;
 * blanc sur `good` 6,37:1 ; `muted` 5,4:1 sur le fond et 6,39:1 sur la carte.
 */
export const ECHECS_SKIN: GameSkin = {
  ink: "#16213A",
  bg: "#F5EFE3",
  paper: "#FFFFFF",
  accent: "#2E5E5A",
  accent2: "#C77B29",
  good: "#2C6B45",
  muted: "#55606E",
  border: 2.5,
  // ⚠️ 14, PAS 12 : mesuré, toutes les autres surfaces du catalogue tiennent
  // entre 14 et 18 (porte 18, Unanimo 16, Rôdeurs 15, Alibi et Fantôme 14).
  // À 12, ce jeu était le seul hors de la bande — un écart qu'on ne nomme pas
  // mais qu'on voit sur les coins de carte.
  radius: 14,
  fontDisplay: FONT_DISPLAY,
  fontBody: FONT_BODY,
};

/**
 * L'ÉCHIQUIER — et ces valeurs-là sont TOUTES mesurées, pas choisies.
 *
 * ⚠️ UNE PIÈCE, C'EST UN CORPS ET UN LINTEAU QUI S'INVERSE. On a d'abord peint
 * les deux camps avec le même contour sombre : mesuré, la dame blanche sur case
 * sombre tombait à 0,07 de corps clair — MOINS qu'une pièce noire (0,15). Trois
 * pièces blanches sur six se lisaient noires. Un vrai jeu d'échecs (et lichess,
 * vérifié dans leur feuille de style) ne fait pas ça : le camp clair porte un
 * linteau sombre, le camp sombre un linteau CLAIR. C'est l'inversion qui
 * distingue, pas l'épaisseur du trait.
 *
 * ⚠️ LES MARQUES SONT DES APLATS TRANSLUCIDES, PAS DES FORMES. Vérifié sur
 * lichess : `square.selected {background:rgba(20,85,30,.5)}`,
 * `square.move-dest {background:radial-gradient(rgba(20,85,30,.5) 19%, transparent 20%)}`.
 * Aucun contour nulle part. La translucidité est ce qui permet à UNE couleur de
 * se voir sur les deux nuances de cases — un aplat opaque n'y arrive jamais
 * (sept couleurs essayées, une seule passait, et de justesse).
 *
 * Opacités mesurées sur les deux nuances (seuil 3:1 pour un élément non textuel) :
 *   • destination, encre à 0,70 → 5,41 / 3,85 ✔ (à 0,42 : 2,48 / 2,13 ✘)
 *   • sélection, encre à 0,45 → 2,67 / 2,26 — le meilleur des huit essais
 *   • dernier coup, corail à 0,55 → distinct par la TEINTE, pas par la clarté ;
 *     d'où le liseré corail qui l'accompagne, pour qui ne distingue pas les teintes
 */
export const ECHIQUIER = {
  claire: "#F0E6D2",
  sombre: "#B9A98F",
  /** Le corps de la pièce. Le clair sur case claire ne mesure que 1,15:1 — et
   *  c'est normal : ce qui dessine la pièce, c'est son linteau à 14,85:1. */
  corpsClair: "#FBF6EC",
  corpsSombre: "#16213A",
  /** ⚠️ 1,2 px, et pas plus : à 2,2 px un liseré inversé pèse tellement, à la
   *  taille d'une case de téléphone, que la pièce SOMBRE mesure ~0,55 de clair —
   *  soit autant qu'une pièce claire. Le remède recréait la maladie. */
  lisere: 1.2,
  selection: "rgba(22,33,58,0.45)",
  destination: "rgba(22,33,58,0.70)",
  dernier: "rgba(226,62,59,0.55)",
  /** ⚠️ Corail ASSOMBRI. Le corail de la marque (#E23E3B) ne porte pas un
   *  chiffre de 11 px : 3,91:1 en crème, 3,80:1 en encre — il échoue des deux
   *  côtés. Celui-ci passe à 5,12:1. */
  corailSombre: "#C4302E",
  /** Le contour d'une case candidate, et la bulle qui porte son numéro. */
  pastille: "#16213A",
  encrePastille: "#FBF6EC",
  trait: "#16213A",
} as const;

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
