// LE JETON ANONYME DE BANALO DU JOUR — et pourquoi il existe.
//
// ⚠️ CETTE EXCLUSIVITÉ A PRIS FIN : Cinq sur cinq a maintenant le sien
// (`pays/jeton.ts`), parce qu'il s'est mis à classer et qu'un classement qui ne
// compte que les comptes n'est pas un classement. Les deux clés restent
// DISTINCTES — voir `games/jeton.ts` — et la raison d'être du jeton de Banalo,
// elle, n'a pas bougé :
//
// Le score EST une comparaison à la foule : il faut donc que la
// réponse parte au serveur, et une réponse déposée sans clé serait soit
// impossible à retrouver (le joueur perdrait son résultat en rafraîchissant),
// soit ré-inscriptible à volonté — et le jeu s'effondre, puisqu'il suffirait de
// lire la médiane rendue puis de la redéposer pour marquer 10 tous les jours.
// La clé primaire `(jeton, jour, langue)` et le `on conflict do nothing` sont ce
// qui rend la médiane sûre à rendre. Le jeton est le prix de cette sûreté.
//
// CE QU'IL EST, EXACTEMENT : trente caractères tirés au hasard, écrits dans le
// navigateur, envoyés avec chaque réponse. Aucun compte, aucune adresse, aucune
// empreinte — deux navigateurs du même humain sont deux joueurs, et c'est très
// bien. Il ne voyage avec RIEN d'autre que le couple (jour, langue, nombre), et
// la ligne s'efface au bout de trente jours avec le reste.
//
// CE QU'IL N'EMPÊCHE PAS, et qu'on assume comme la route d'essai de Cinq sur
// cinq : vider son stockage rend un jeton neuf, donc un second essai. Défendre
// coûterait un compte obligatoire, c'est-à-dire le péage que le produit promet
// de ne pas mettre. Se gâcher le jeu reste possible.

import { jetonSous } from "@/lib/games/jeton";

const CLE = "placet.banalo.jeton";

/** Le jeton de ce navigateur, créé au premier appel. `null` côté serveur. */
export function monJeton(): string | null {
  return jetonSous(CLE);
}
