// LE GRADIENT 0→5 — la seule chose que le joueur lit vraiment.
//
// Ce fichier ne connaît que des NOMBRES : aucun critère, aucune réponse. Il est
// donc utilisable côté client sans rien divulguer.
//
// TROIS CONTRAINTES, dans cet ordre (spec §4.1) :
//
//  1. **La progression doit se voir sans la couleur.** De 0 à 4, c'est la
//     CLARTÉ qui décroît, pas seulement la teinte : un daltonien lit la rampe
//     comme tout le monde, et une capture en noir et blanc reste juste.
//
//  2. **Le 5/5 doit rompre.** Il ne prolonge pas la rampe, il en sort — c'est la
//     fin de la partie, pas une nuance de plus. Vert franc, contour épais.
//
//  3. **« Non essayé » n'est pas « 0/5 ».** Un pays qu'on n'a pas tenté doit être
//     visiblement muet ; le confondre avec un pays noté zéro ferait croire au
//     joueur qu'il a déjà sondé une région qu'il n'a pas touchée. D'où le trait :
//     tout pays essayé porte un contour d'encre, les autres non.

export const NON_ESSAYE = "#FFFCF4";

/**
 * Aplat de remplissage pour un score de 0 à 5.
 *
 * LUMINANCES RELATIVES, CALCULÉES (pas affirmées) : 0,730 · 0,620 · 0,439 ·
 * 0,294 · 0,176 · 0,127. Strictement décroissantes — c'est ça, « la progression
 * se voit sans la couleur ». Le premier jet ne l'était pas : un 0/5 assombri
 * pour se distinguer du papier était passé DEVANT le 1/5, et la rampe se lisait
 * à l'envers sur ses deux premiers barreaux.
 */
export const GRADIENT = [
  "#E9DDC4", // 0/5 — un sable pâle ; c'est le CONTOUR qui le sépare du papier
  "#EFC98A", // 1/5
  "#E5A455", // 2/5
  "#D47F33", // 3/5
  "#B85A24", // 4/5 — le presque-là, chaud et dense
  "#17724B", // 5/5 — la rupture : ce n'est plus la même échelle
] as const;

/**
 * Couleur du texte posé SUR l'aplat. Le basculement encre → blanc tombe entre
 * le 3/5 et le 4/5 parce que c'est là que les rapports se croisent : encre sur
 * 3/5 = 5,41:1, blanc sur 4/5 = 4,64:1. Un cran plus tôt ou plus tard, une des
 * six pastilles passe sous 4,5:1.
 */
export const ENCRE_SUR_GRADIENT = ["#14202B", "#14202B", "#14202B", "#14202B", "#FFFFFF", "#FFFFFF"] as const;

/**
 * Épaisseur du contour d'un pays, EN PIXELS D'ÉCRAN — pas en unités de carte.
 * La carte est projetée en 1000 unités de large et rendue sur 350 pixels de
 * téléphone : la même valeur lue en unités y donnerait un trait invisible.
 */
export const TRAIT = { neutre: 0.5, essaye: 1.3, cible: 2.4 };

/**
 * Le carré coloré du partage et de l'historique. Les chiffres-emoji plutôt que
 * des pastilles de couleur : ils se lisent au lecteur d'écran, ils survivent au
 * copier-coller dans n'importe quel client, et ils ne divulguent pas le pays.
 */
export const CHIFFRES = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"] as const;
