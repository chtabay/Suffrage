// LA COMPARAISON AVEC UN AMI — sans graphe, sans identité, sans modération.
//
// ⚠️ CE FICHIER EXISTE POUR ÉVITER D'EN CONSTRUIRE UN AUTRE. La demande était
// « voir ce que les autres ont fait ». La réponse évidente est un système
// d'amis ; elle coûte un pseudo PUBLIC, une invitation à deux états, un fil
// d'activité, et une surface de modération — sur des jeux où la politique de
// confidentialité déclare une tranche d'âge « enfant ». Et elle prendrait une
// décision que `20260818-jeu-pays-resultats.sql` a explicitement refusée :
// « un tableau nominatif demanderait un pseudo public et un consentement — […]
// elle n'est pas prise ici ».
//
// Wordle n'a jamais eu d'amis. Toute sa couche sociale est un copier-coller dans
// une conversation, et c'est le jeu quotidien le plus viral jamais fait. On a
// déjà ce partage. Il suffit que le lien porte le résultat de celui qui
// partage : l'ami qui l'ouvre voit les deux côte à côte.
//
// ⚠️ C'EST DÉCLARATIF, DONC FALSIFIABLE, ET CE N'EST PAS UN DÉFAUT. Personne ne
// vérifie le chiffre — mais personne ne le vérifie non plus quand on colle une
// grille Wordle dans un groupe. C'est une conversation entre gens qui se
// connaissent, pas un classement officiel. Le jour où ça devrait être
// infalsifiable, il faudrait des comptes des deux côtés : c'est exactement le
// coût qu'on refuse ici.
//
// ⚠️ `s` EST DÉJÀ PRIS. `shareUrl` décore les liens avec `?s=<canal>` pour
// l'entonnoir ; réutiliser cette lettre casserait l'attribution en silence. D'où
// `j` (journée) et `r` (résultat).

export interface Defi {
  jour: number;
  /** Le résultat de celui qui partage — des points chez Banalo, des essais chez Cinq sur cinq. */
  resultat: number;
}

/**
 * Décore un lien avec le résultat de celui qui partage.
 *
 * `max` borne le résultat selon le jeu : 100 points chez Banalo, 500 essais chez
 * Cinq sur cinq. Un lien hors bornes ne sera pas relu.
 */
export function lienDefi(url: string, jour: number, resultat: number, max: number): string {
  if (!Number.isFinite(jour) || jour < 1 || !Number.isFinite(resultat)) return url;
  if (resultat < 0 || resultat > max) return url;
  const sep = url.includes("?") ? "&" : "?";
  // Une décimale suffit partout : les points de Banalo sont au dixième, les
  // essais de Cinq sur cinq sont entiers.
  return `${url}${sep}j=${Math.round(jour)}&r=${Math.round(resultat * 10) / 10}`;
}

/**
 * Relit un défi depuis une chaîne de recherche.
 *
 * Rend `null` sur tout ce qui n'est pas exactement ce qu'on a écrit : un
 * paramètre fabriqué à la main ne doit pas pouvoir afficher « votre ami : 9 999 ».
 */
export function litDefi(recherche: string, max: number): Defi | null {
  let p: URLSearchParams;
  try {
    p = new URLSearchParams(recherche);
  } catch {
    return null;
  }
  // ⚠️ ON VÉRIFIE LA PRÉSENCE AVANT DE CONVERTIR. `Number(null)` vaut ZÉRO, pas
  // `NaN` : un lien qui porte la journée sans le score passait donc tous les
  // contrôles de borne et affichait « votre ami : 0,0 ». Trouvé par le test, pas
  // à la relecture — et c'est le genre de défaut qui n'aurait jamais été signalé
  // par un joueur, seulement trouvé bizarre.
  const brutJour = p.get("j");
  const brutResultat = p.get("r");
  if (brutJour === null || brutJour === "" || brutResultat === null || brutResultat === "") return null;
  const jour = Number(brutJour);
  const resultat = Number(brutResultat);
  if (!Number.isInteger(jour) || jour < 1 || jour > 100000) return null;
  if (!Number.isFinite(resultat) || resultat < 0 || resultat > max) return null;
  return { jour, resultat };
}
