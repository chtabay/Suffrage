// LE PARTAGE — ce qu'on montre d'une partie à quelqu'un qui n'y était pas.
//
// ⚠️ CE FICHIER NE CONNAÎT QUE DES NOMBRES. Comme `palette.ts`, il est donc
// utilisable côté navigateur sans rien divulguer : ni critère, ni pays, ni
// catégorie. C'est ce qui permet de calculer le partage sur l'écran plutôt que
// de le redemander au serveur.
//
// CE QU'ON A ARRÊTÉ DE MONTRER, et pourquoi. La première version recopiait la
// suite complète des scores, un emoji par essai :
//
//     5 essais    →  54 caractères
//     156 essais  →  509 caractères, un mur de chiffres
//
// Deux défauts, et le second est le pire. La taille du partage était celle de la
// partie — donc **sans borne**, puisque le jeu n'impose aucune limite d'essais ;
// c'est la différence de fond avec Wordle, dont la grille tient parce qu'elle
// est plafonnée à six lignes. Et surtout la suite ne racontait rien :
// `0️⃣1️⃣0️⃣0️⃣0️⃣1️⃣0️⃣2️⃣` n'est pas une forme, c'est du bruit dont la longueur
// répète, en illisible, le seul chiffre déjà donné dans le titre.
//
// Le bon précédent n'est pas Wordle mais **Semantle**, lui aussi sans limite
// d'essais, qui partage des statistiques et non une transcription.
//
// CE QU'ON MONTRE À LA PLACE : la MONTÉE. L'histoire d'une partie n'est pas la
// séquence, c'est à quelle vitesse on devient chaud et combien de temps dure la
// dernière marche — sur la partie de 156 essais qui a motivé ce changement,
// 4/5 au 77e et 5/5 au 156e, soit 79 essais sur la seule dernière marche. C'est
// ça qu'on raconte à un ami, et c'est ça qu'il compare.

/** Combien de marches : une par critère du jour. */
export const NB_MARCHES = 5;

/**
 * Le rang d'essai où chaque marche est atteinte pour la PREMIÈRE fois.
 *
 * `marchesDe([1,4,4,3,5])` rend `[1, 2, 2, 2, 5]` : la 1re marche au premier
 * essai, les 2e à 4e au deuxième (le 4/5 les emporte toutes), la 5e au
 * cinquième.
 *
 * ⚠️ ON LIT LE MEILLEUR SCORE, PAS LE DERNIER. Un essai à 4/5 prouve que quatre
 * marches sont franchies, même si l'essai suivant retombe à 1/5 : la marche est
 * un record, pas un état. Compter autrement ferait « redescendre » un joueur qui
 * explore, ce qui est exactement ce que le jeu lui demande de faire.
 *
 * Une marche jamais atteinte rend `0`. En pratique le partage n'est proposé
 * qu'après la victoire, donc les cinq sont toujours remplies — mais la fonction
 * ne le suppose pas, sinon elle mentirait le jour où on partagera une partie en
 * cours.
 */
export function marchesDe(scores: number[]): number[] {
  const marches = new Array<number>(NB_MARCHES).fill(0);
  for (const [i, score] of scores.entries()) {
    for (let m = 1; m <= Math.min(score, NB_MARCHES); m++) {
      if (marches[m - 1] === 0) marches[m - 1] = i + 1;
    }
  }
  return marches;
}
