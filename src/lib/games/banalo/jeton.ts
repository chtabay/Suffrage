// LE JETON ANONYME DE BANALO DU JOUR — et pourquoi il existe ici alors que Cinq
// sur cinq s'en passe fièrement.
//
// ⚠️ C'EST UNE EXCEPTION ASSUMÉE, PAS UN OUBLI DE PRINCIPE. `pays/local.ts` dit
// noir sur blanc « il n'y a pas de jeton stable, rien qui permette de
// reconnaître ce navigateur d'un jour à l'autre côté serveur », et c'est vrai
// là-bas : le score de Cinq sur cinq se calcule tout seul, la base ne sert qu'au
// classement facultatif d'un compte.
//
// Ici, non. Le score EST une comparaison à la foule : il faut donc que la
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

const CLE = "placet.banalo.jeton";

/** Le format attendu par la base : le `check` de la table refuse tout le reste. */
const FORME = /^[a-z0-9]{10,40}$/;

function tire(): string {
  // `crypto` est présent partout où le jeu tourne ; le repli n'existe que pour
  // ne jamais rendre de chaîne vide, qui serait refusée par la base.
  const octets = new Uint8Array(15);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(octets);
  else for (let i = 0; i < octets.length; i++) octets[i] = Math.floor(Math.random() * 256);
  return Array.from(octets, (o) => o.toString(16).padStart(2, "0")).join("");
}

/**
 * Le jeton de ce navigateur, créé au premier appel.
 *
 * Rend `null` côté serveur : le rendu initial ne doit pas en inventer un, sinon
 * chaque visite en créerait un nouveau et l'hydratation en changerait.
 */
export function monJeton(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const garde = window.localStorage.getItem(CLE);
    if (garde && FORME.test(garde)) return garde;
    const neuf = tire();
    window.localStorage.setItem(CLE, neuf);
    return neuf;
  } catch {
    // Navigation privée : on joue quand même, avec un jeton qui ne survit pas à
    // la page. La réponse compte pour la médiane des autres, et le joueur voit
    // son score — il ne le retrouvera simplement pas demain.
    return tire();
  }
}
