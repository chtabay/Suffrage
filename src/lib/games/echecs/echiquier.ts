// L'ÉCHIQUIER — lecture d'une position, et rien d'autre.
//
// ⚠️ AUCUNE RÈGLE D'ÉCHECS ICI. Les coups légaux sont calculés par l'arbitre
// (chess.js, côté serveur) et servis dans l'état : ce fichier ne sait que lire
// une position et nommer des cases. C'est ce qui garantit qu'un client bricolé
// ne peut rien inventer — il n'y a rien à bricoler.

/** Une case, de a1 à h8. */
export type Case = string;

/** Une pièce : la lettre FEN (majuscule = blanc). */
export type Piece = "K" | "Q" | "R" | "B" | "N" | "P" | "k" | "q" | "r" | "b" | "n" | "p";

export const COLONNES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

/**
 * Les glyphes PLEINS — le CORPS de la pièce, pour les DEUX camps.
 *
 * Ils ne portent aucune couleur en eux : c'est l'écran qui les remplit, en crème
 * pour un camp et en marine pour l'autre. Le linteau vient ensuite de `CREUX`,
 * dans la couleur opposée. Voir l'en-tête de `Echiquier.tsx` : peindre les deux
 * camps avec le même contour sombre faisait tomber la dame blanche sur case
 * sombre à 0,07 de corps clair, moins qu'une pièce noire.
 */
export const GLYPHE: Record<string, string> = {
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
};

/**
 * LES GLYPHES DE TEXTE — hors de l'échiquier, et seulement là.
 *
 * ⚠️ SUR LE DAMIER ON NE S'EN SERT PAS. Une pièce claire dessinée en creux sur
 * une case claire mesure 1,19:1 : invisible. C'est pour ça que l'échiquier
 * peint des silhouettes PLEINES et distingue les camps par le liseré.
 *
 * Mais dans une phrase — « ton bulletin : ♙ e2 → e4 » — il n'y a pas de case
 * derrière, il y a du papier blanc, et une silhouette pleine y serait sombre
 * des deux côtés. Le bulletin d'un joueur blanc affichait un pion NOIR, ce qui
 * contredisait l'échiquier juste au-dessus. En typographie, la convention est
 * l'inverse de celle du damier : le camp clair est creux, le sombre est plein.
 */
export const GLYPHE_TEXTE: Record<string, { clair: string; sombre: string }> = {
  k: { clair: "♔", sombre: "♚" },
  q: { clair: "♕", sombre: "♛" },
  r: { clair: "♖", sombre: "♜" },
  b: { clair: "♗", sombre: "♝" },
  n: { clair: "♘", sombre: "♞" },
  p: { clair: "♙", sombre: "♟" },
};


/** Le plateau, rangée 8 en premier — l'ordre dans lequel un FEN l'écrit. */
export function lirePosition(fen: string): (Piece | null)[][] {
  const plateau: (Piece | null)[][] = [];
  const champ = (fen || "").split(" ")[0] || "8/8/8/8/8/8/8/8";
  for (const rangee of champ.split("/")) {
    const ligne: (Piece | null)[] = [];
    for (const c of rangee) {
      if (c >= "1" && c <= "8") {
        for (let i = 0; i < Number(c); i += 1) ligne.push(null);
      } else {
        ligne.push(c as Piece);
      }
    }
    // Un FEN tronqué ne doit pas casser l'écran : on complète en vide.
    while (ligne.length < 8) ligne.push(null);
    plateau.push(ligne.slice(0, 8));
  }
  while (plateau.length < 8) plateau.push(Array(8).fill(null));
  return plateau.slice(0, 8);
}

/** `[0][0]` est a8 : le coin haut-gauche quand on joue les blancs. */
export function caseDe(ligne: number, colonne: number): Case {
  return `${COLONNES[colonne]}${8 - ligne}`;
}

export function estBlanche(p: Piece): boolean {
  return p === p.toUpperCase();
}

/** Une case claire ou sombre — a1 est sombre, comme sur un vrai échiquier. */
export function caseClaire(ligne: number, colonne: number): boolean {
  return (ligne + colonne) % 2 === 0;
}

/** Les destinations légales depuis une case, lues dans la liste de l'arbitre. */
export function destinations(legal: string[], depuis: Case): Case[] {
  return [...new Set(legal.filter((m) => m.slice(0, 2) === depuis).map((m) => m.slice(2, 4)))];
}

/** Les cases d'où l'on peut partir : celles qui commencent au moins un coup. */
export function departs(legal: string[]): Set<Case> {
  return new Set(legal.map((m) => m.slice(0, 2)));
}

/**
 * Les coups qui mènent de `depuis` à `vers`. Il y en a QUATRE quand un pion
 * atteint la dernière rangée — d'où le choix de promotion, qu'on ne peut pas
 * deviner à la place du joueur.
 */
export function coupsVers(legal: string[], depuis: Case, vers: Case): string[] {
  return legal.filter((m) => m.slice(0, 2) === depuis && m.slice(2, 4) === vers);
}

/**
 * ⚠️ LA NOTATION ALGÉBRIQUE EST LOCALISÉE : « Cf3 » en français, « Nf3 » en
 * anglais, « Rf3 » en espagnol — et « Rf3 » est une TOUR en anglais mais un ROI
 * en français. On stocke donc l'UCI (`g1f3`) et on ne traduit qu'à l'affichage.
 */
const INITIALES: Record<string, string> = {
  fr: "RDTFC", en: "KQRBN", es: "RDTAC", pcm: "KQRBN",
};

/** Traduit un SAN anglais (celui de l'arbitre) vers la langue du joueur. */
export function sanLocal(san: string, locale: string): string {
  const cible = INITIALES[locale] ?? INITIALES.en;
  const source = INITIALES.en;
  return (san || "").replace(/[KQRBN]/g, (l) => cible[source.indexOf(l)] ?? l);
}

/**
 * Un coup, écrit pour être LU, à partir de la seule position.
 *
 * ⚠️ PAS DE NOTATION ALGÉBRIQUE ICI, ET C'EST UN ARBITRAGE DE POIDS. Écrire
 * « Cf3 » demande de savoir quels autres cavaliers atteignent f3 — donc les
 * règles du jeu, donc chess.js dans le navigateur : 762 Ko pour habiller une
 * liste de trois coups. On rend plutôt le glyphe de la pièce et les deux cases
 * (« ♞ g1→f3 »), qui se lit sans rien connaître de la notation et ne dépend
 * d'aucune langue. L'algébrique reste disponible pour le coup DÉJÀ JOUÉ, où
 * l'arbitre l'a calculée une fois côté serveur.
 */
export function libelleCoup(
  fen: string,
  uci: string,
): { glyphe: string; de: Case; vers: Case; promo: string | null; clair: boolean } {
  const plateau = lirePosition(fen);
  const de = uci.slice(0, 2);
  const vers = uci.slice(2, 4);
  const colonne = COLONNES.indexOf(de[0] as (typeof COLONNES)[number]);
  const ligne = 8 - Number(de[1]);
  const piece = ligne >= 0 && ligne < 8 && colonne >= 0 ? plateau[ligne][colonne] : null;
  const clair = piece ? estBlanche(piece) : false;
  const enTexte = (cle: string) => {
    const paire = GLYPHE_TEXTE[cle];
    return paire ? (clair ? paire.clair : paire.sombre) : "";
  };
  return {
    glyphe: piece ? enTexte(piece.toLowerCase()) : "",
    de,
    vers,
    promo: uci.length > 4 ? enTexte(uci[4]) || null : null,
    clair,
  };
}
