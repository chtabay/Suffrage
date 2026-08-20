"use client";

// LES PICTOS DES JEUX — dessinés à la main, une seule couleur, aucun texte.
//
// ⚠️ POURQUOI PAS DES EMOJI. Ils varient d'une plateforme à l'autre, donc
// l'identité n'est pas tenue ; et certains rendent une VIGNETTE illisible sous
// 20 px — 🔢 affichait un cadre gris contenant « 1234 » minuscules sur les
// cartes de l'accueil. Un picto inline pèse quelques centaines d'octets, ne
// demande aucune requête, et hérite de la couleur de son contexte.
//
// ⚠️ POURQUOI PAS UNE IMAGE GÉNÉRÉE. Le dépôt l'a déjà tranché pour les aperçus
// d'écran : « reproduits, jamais capturés — une capture ne parle qu'une langue
// sur quatre ». S'y ajoute le poids, sur la page la plus visitée du site.
//
// ═════════════════════════════════════════ la leçon des trois passes de dessin
//
// ⚠️ POUR LA MOITIÉ DES JEUX, DESSINER L'OBJET ÉCHOUE — IL FAUT DESSINER L'IDÉE.
// Mesuré en regardant, pas en relisant : une torche s'est lue successivement
// « haut-parleur » (trapèze + arcs = icône de volume), « pile » et « sablier ».
// À 24 px, la silhouette d'un objet entre en collision avec tous les objets de
// même silhouette. Les erreurs étaient SÉMANTIQUES — le SVG dessinait
// exactement ce qu'on lui demandait — donc invisibles à la relecture.
//
// Deux pictos ont changé de métaphore, et les deux y ont gagné en justesse :
//
//   · Banalo en groupe : deux cercles qui se chevauchent, pas un cerveau. Le
//     cerveau dit « quiz » ; le chevauchement dit CONVERGER, qui est le jeu.
//   · Rôdeurs : des empreintes de pas, pas une lampe. La lampe dit « objet » ;
//     les pas disent « on se croise dans la maison », qui est le jeu.
//
// ⚠️ ET LES MASSES OPTIQUES SONT ACCORDÉES, pas seulement la grille. Chaque
// glyphe occupe environ 18×18 des 24×24 : à taille égale, une bougie étroite
// paraissait deux fois plus légère qu'un globe plein, et la rangée penchait.
import type { CSSProperties } from "react";

/** Les jeux, plus le format « mots » de Banalo du jour. */
export type NomPicto = "banalo-jour" | "mots" | "banalo" | "pays" | "alibi" | "rodeurs" | "fantome";

// Grille 24×24, trait 2, bouts et jointures ronds, `fill="none"` sauf mention.
const PICTOS: Record<NomPicto, string> = {
  // Viser la réponse commune.
  "banalo-jour":
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
  // Ce qu'on dit, en six cases.
  mots: '<path d="M21 4.5H3v12h4.5V21L13 16.5h8z"/>',
  // Converger : deux esprits qui se recouvrent.
  banalo: '<circle cx="8.5" cy="12" r="7"/><circle cx="15.5" cy="12" r="7"/>',
  // Le monde, et ses cinq caractéristiques secrètes.
  pays: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a13.5 13.5 0 0 1 0 18a13.5 13.5 0 0 1 0-18"/>',
  // Une soirée d'enquête, à la bougie.
  alibi:
    '<rect x="7" y="11" width="10" height="10" rx="1.5"/><path d="M12 11V9"/><path d="M12 3c3 2.8 2.5 6-0 6s-3-3.2 0-6z"/>',
  // On se croise dans la maison : c'est ça, l'alibi.
  // ⚠️ CHAQUE EMPREINTE A SON TALON, ET C'EST CE QUI LA REND LISIBLE. Une
  // version « allégée » avait remplacé le talon par un trait : la paire se
  // lisait « 0/0 » avec un tiret, comme une fraction. Deux formes par pied, en
  // diagonale — c'est l'arrangement qui dit « des pas », pas le détail.
  rodeurs:
    '<ellipse cx="8" cy="6.6" rx="3.1" ry="4.1"/><ellipse cx="8" cy="12.9" rx="2.3" ry="2.1"/>' +
    '<ellipse cx="16" cy="11.9" rx="3.1" ry="4.1"/><ellipse cx="16" cy="18.2" rx="2.3" ry="2.1"/>',
  // Quelqu'un hante ce manoir.
  fantome:
    '<path d="M4.5 20.5V11a7.5 7.5 0 0 1 15 0v9.5l-3-2l-2.5 2l-2-2l-2.5 2z"/><circle cx="9.5" cy="11" r="1.2" fill="currentColor" stroke="none"/><circle cx="14.5" cy="11" r="1.2" fill="currentColor" stroke="none"/>',
};

export default function Picto({
  nom,
  taille = 20,
  style,
  titre,
}: {
  nom: NomPicto;
  taille?: number;
  style?: CSSProperties;
  /**
   * ⚠️ À NE DONNER QUE SI LE PICTO EST SEUL. Partout où il est posé aujourd'hui,
   * le nom du jeu est écrit juste à côté : le nommer une seconde fois ferait
   * répéter « Cinq sur cinq, image : Cinq sur cinq » à un lecteur d'écran.
   */
  titre?: string;
}) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      // La couleur vient du contexte : le picto prend l'accent d'une carte de
      // jeu ou l'encre d'une page de Placet, sans qu'on ait à le lui dire.
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={titre ? "img" : undefined}
      aria-label={titre}
      aria-hidden={titre ? undefined : true}
      style={{ display: "block", flex: "none", ...style }}
      dangerouslySetInnerHTML={{ __html: PICTOS[nom] }}
    />
  );
}
