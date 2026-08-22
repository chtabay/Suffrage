// LE JETON ANONYME DE CINQ SUR CINQ — et il n'a pas toujours existé.
//
// ⚠️ CE FICHIER RENVERSE UN POINT DE CONCEPTION ÉCRIT. `banalo/jeton.ts` disait
// « Cinq sur cinq s'en passe fièrement », et `pays/local.ts` promettait « il n'y
// a pas de jeton stable, rien qui permette de reconnaître ce navigateur d'un
// jour à l'autre côté serveur ». C'était vrai tant que la base ne servait qu'au
// classement facultatif d'un compte.
//
// CE QUI A CHANGÉ : le jeu prétend classer. `scrutin_game_pays_results` ne
// contenait que des COMPTES, donc « votre rang du jour » se calculait sur deux
// ou trois comptes pendant que trente personnes jouaient — et un barème de
// saison par PLACE n'a aucun sens si être premier veut dire « premier de trois
// comptes ». Compter la foule exige de distinguer les joueurs entre eux : c'est
// exactement ce qu'un jeton fait, et rien de plus.
//
// CE QU'IL EST, EXACTEMENT : trente caractères tirés au hasard, écrits dans le
// navigateur, envoyés avec la partie. Aucun compte, aucune adresse, aucune
// empreinte — deux navigateurs du même humain sont deux joueurs. Il ne voyage
// qu'avec (jour, essais, secondes), la ligne s'efface au bout de trente jours,
// et ⚠️ IL NE SURVIT PAS AU RATTACHEMENT : dès qu'un compte adopte la partie,
// le jeton est effacé côté base, pour qu'aucun identifiant anonyme ne reste
// collé à une identité.
//
// ⚠️ ET IL EST DISTINCT DE CELUI DE BANALO, délibérément. Voir `games/jeton.ts`.
//
// CE QU'IL N'EMPÊCHE PAS, et qu'on assume comme avant : vider son stockage rend
// un jeton neuf, donc une seconde partie. Défendre coûterait un compte
// obligatoire, c'est-à-dire le péage que le produit promet de ne pas mettre.
import { jetonSous } from "@/lib/games/jeton";

const CLE = "placet.pays.jeton";

/** Le jeton de ce navigateur. `null` côté serveur. */
export function monJetonPays(): string | null {
  return jetonSous(CLE);
}
