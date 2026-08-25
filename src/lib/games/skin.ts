// SKINS — « moteur commun + présentation propre au jeu ».
//
// Les composants de jeu génériques (liste de joueurs, jauge de réponses, barre
// de l'hôte, écran d'entrée) ne DOIVENT PAS connaître les couleurs de Placet :
// le jour où Banalo vit sur son propre domaine avec sa propre identité, seul ce
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
  /**
   * Le SOL du jeu : un motif répété, posé sous tout l'écran.
   *
   * ⚠️ C'EST LE POINT DE PLACET, SPÉCIALISÉ — et c'est ce qui tient la famille.
   * `globals.css` peint le corps en crème pointillée (`radial-gradient`, un point
   * tous les 22 px) : c'est une signature de la maison. La décliner par jeu donne
   * une identité immédiate en gardant la parenté ÉVIDENTE, parce que le
   * dispositif est le même — seul le motif change. C'est structurel, pas
   * chromatique, et une teinte de plus n'aurait pas suffi : mesuré, sur six
   * skins, `border` valait 2,5 partout et les polices étaient identiques. La
   * couleur était le seul axe qui variait, et c'est le plus faible.
   *
   * ⚠️ ET LE MOTIF DOIT VOULOIR DIRE QUELQUE CHOSE, sinon il a l'air « fait par
   * ordinateur ». Un graticule est une carte, une foule de points est une foule :
   * régulier ou non, on le lit comme voulu par quelqu'un. Un anneau décoratif
   * répété, non — sa perfection se remarque. Et ajouter du hasard n'y change
   * rien : une irrégularité humaine a une intention, du jitter se lit comme du
   * jitter.
   *
   * ⚠️ DEUX CHAMPS, PAS UN. `backgroundImage` n'accepte que l'image ; y glisser
   * la syntaxe de raccourci `url(…) 0 0 / 54px` la rend invalide et le motif
   * disparaît en silence. La taille voyage donc à part.
   *
   * Vide = le fond uni du jeu.
   */
  sol?: { image: string; taille: string };
  /**
   * La PROFONDEUR de l'ombre portée des cartes, en pixels.
   *
   * ⚠️ AVEC `border` ET `radius`, C'EST LA « MATIÈRE » DU JEU — et c'est le
   * levier d'identité le moins cher qui existe. Trois cartes au même contenu,
   * à la même grammaire et à la même famille de couleurs se lisent comme trois
   * produits différents selon leur matière : trait 3 / rayon 5 / ombre 2 est
   * sec et administratif, trait 3 / rayon 22 / ombre 6 est un jouet. Aucune
   * image, aucune police en plus, aucun octet.
   *
   * ⚠️ ET LES TROIS CADRANS NE SONT PAS INDÉPENDANTS. Vu à l'écran : une ombre
   * franchement plus épaisse que le trait qui la projette détache la carte de
   * son propre contour — l'objet flotte à côté de sa silhouette. Garder
   * `ombre` proche de `border`, jamais très au-dessus. Un essai à trait 2 /
   * ombre 7 l'a montré tout de suite ; le même réglage à trait 3 tient.
   *
   * ⚠️ Vide = 5, la valeur historique. Les jeux qui ne la règlent pas ne bougent
   * pas d'un pixel.
   */
  ombre?: number;
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
  // LA FOULE : des points de tailles inégales, placés à la main sur une tuile de
  // 54 px. Neuf positions choisies, pas un semis aléatoire — c'est ce qui fait
  // qu'on la lit comme voulue. Et c'est le jeu : répondre comme la foule.
  // MATIÈRE « JOUET » : rond, épais, posé haut. C'est le jeu le plus léger des
  // deux quotidiens, et sa carte doit se sentir rebondie.
  ombre: 6,
  // ⚠️ RETOUCHÉ APRÈS COUP : les points GÊNAIENT LA LECTURE. Mesuré — la
  // première version couvrait 3,5 % de la surface en encre contre 1,3 % pour le
  // sol de Placet, soit 2,8 fois plus, avec un contraste par point plus élevé.
  // C'était le prix payé pour qu'ils se voient ; il était trop cher dès qu'un
  // paragraphe se pose dessus. Rayons réduits d'environ 40 % et teinte adoucie
  // (#c2e5d3 → #d3ece2) : on retombe à 1,3 %, la discrétion de la maison.
  //
  // ⚠️ LA TUILE RESTE À 54 px, et c'est le point à ne pas « optimiser ». Élargir
  // le pas disperserait les points au lieu de les grouper — or c'est le
  // GROUPEMENT qui fait lire une foule plutôt qu'une trame, et c'est lui qui
  // porte tout le sens du motif.
  sol: { image: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='54' height='54'%3E%3Cg fill='%23d3ece2'%3E%3Ccircle cx='7' cy='11' r='1.3'/%3E%3Ccircle cx='23' cy='5' r='.8'/%3E%3Ccircle cx='40' cy='14' r='1.5'/%3E%3Ccircle cx='13' cy='28' r='.9'/%3E%3Ccircle cx='31' cy='24' r='1.4'/%3E%3Ccircle cx='48' cy='33' r='.9'/%3E%3Ccircle cx='5' cy='43' r='1.4'/%3E%3Ccircle cx='24' cy='45' r='1'/%3E%3Ccircle cx='40' cy='49' r='1.2'/%3E%3C/g%3E%3C/svg%3E")`, taille: "54px 54px" },
  border: 3,
  radius: 20,
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
 * PAYS DU JOUR — l'atlas ouvert sur une table : bleu de mer profonde et sable
 * chaud sur un papier ivoire.
 *
 * Le seul jeu du catalogue qui se joue SEUL et en trois minutes : l'écran doit
 * ressembler à une page de journal qu'on ouvre le matin, pas à une console. Le
 * rouge n'existe pas — se tromper de pays n'est pas une faute, c'est un sondage.
 *
 * Contrastes CALCULÉS : blanc sur `accent` 7,14:1 ; `ink` sur `accent2` 9,84:1 ;
 * `muted` 6,03:1 sur `paper` et 5,34:1 sur `bg` ; `good` 5,78:1 sur `paper`.
 */
export const PAYS_SKIN: GameSkin = {
  ink: "#14202B",
  bg: "#E7F0F2",
  paper: "#FFFCF4",
  accent: "#1F5F73",
  accent2: "#F2C14E",
  good: "#17724B",
  muted: "#55636E",
  // LE GRATICULE : les méridiens d'une carte. La régularité est NATIVE au motif
  // — personne ne trouve du papier millimétré « fait par ordinateur ». Un point
  // aux croisements a été essayé : trop chargé.
  // MATIÈRE « INSTRUMENT » : serrée et posée bas, comme un objet de report sur
  // une table. C'est un jeu de précision, pas un jouet.
  ombre: 3,
  sol: { image: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='26' height='26'%3E%3Cpath d='M0 .5h26M.5 0v26' stroke='%23c3d8dd' stroke-width='1' fill='none'/%3E%3C/svg%3E")`, taille: "26px 26px" },
  border: 2.5,
  radius: 12,
  fontDisplay: FONT_DISPLAY,
  fontBody: FONT_BODY,
};

/**
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
/**
 * LA SOUPE — de l'eau claire, et toute la couleur dans la MATIÈRE.
 *
 * ⚠️ LE JEU AUTONOME EST SOMBRE, ET IL A FALLU Y RENONCER ICI. Sa version
 * d'origine se joue dans une cuve noire où les atomes s'éclairent eux-mêmes ;
 * c'était sa meilleure idée visuelle. Mais les primitives de Placet posent
 * l'ombre portée ET la bordure en `ink` : sur un fond sombre, `ink` devient
 * clair, et chaque carte se met à porter un halo pâle au lieu d'une ombre. La
 * grammaire de la maison — trait épais, aplat franc, ombre portée — est
 * précisément ce qui rend une carte lisible d'un coup d'œil sur un téléphone.
 * On garde donc la grammaire et on déplace l'identité.
 *
 * ELLE SE DÉPLACE VERS LES MOLÉCULES, ce qui est sa vraie place : le sujet du
 * jeu n'est pas le liquide, ce sont les formes qui s'y assemblent. Sur un
 * papier presque blanc, le carbone est un graphite franc, l'azote un cyan
 * profond — c'est LUI que le milieu paie, il doit se voir de loin — et le
 * soufre son ambre. Les trois atomes se distinguent mieux ici que dans la cuve,
 * mesuré au contraste : sur fond sombre, le carbone ivoire et le soufre jaune
 * se rapprochaient à petite taille.
 *
 * Contrastes : blanc sur `accent` 6,3:1 ; `ink` sur `accent2` 8,1:1 ;
 * `muted` sur `paper` 6,6:1 et sur `bg` 5,4:1.
 */
export const SOUPE_SKIN: GameSkin = {
  ink: "#12262B",
  bg: "#DCEAE6",
  paper: "#FBFDFB",
  accent: "#175C4E",
  accent2: "#E8B33C",
  good: "#17724B",
  muted: "#4C6068",
  // LA MATIÈRE EN SUSPENSION : des particules de tailles inégales, pas une
  // trame. Un liquide où flotte quelque chose, c'est une foule de points — et
  // une foule se lit comme voulue par quelqu'un, contrairement à un motif
  // parfait qui se remarque comme « fait par ordinateur ».
  sol: {
    image: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='54' height='54'%3E%3Cg fill='%23b9d3cc'%3E%3Ccircle cx='9' cy='13' r='1.6'/%3E%3Ccircle cx='34' cy='6' r='1'/%3E%3Ccircle cx='45' cy='27' r='1.9'/%3E%3Ccircle cx='21' cy='33' r='1.2'/%3E%3Ccircle cx='7' cy='44' r='1'/%3E%3Ccircle cx='38' cy='47' r='1.5'/%3E%3C/g%3E%3C/svg%3E")`,
    taille: "54px 54px",
  },
  // MATIÈRE « PAILLASSE » : trait franc et ombre courte, comme du matériel posé
  // sur une table. Le jeu montre des mesures, pas un jouet.
  ombre: 3,
  border: 2.5,
  radius: 14,
  fontDisplay: FONT_DISPLAY,
  fontBody: FONT_BODY,
};

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
