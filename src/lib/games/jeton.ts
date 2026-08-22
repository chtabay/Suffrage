// LE JETON ANONYME DES JEUX QUOTIDIENS — la mécanique, une seule fois.
//
// Deux jeux en ont un, et ils n'ont PAS la même clé : voir `banalo/jeton.ts` et
// `pays/jeton.ts` pour ce que chacun achète et ce qu'il coûte. Ce fichier ne
// porte que le tirage et le rangement, qui n'ont aucune raison d'exister en deux
// exemplaires — recopiés, ils auraient dérivé, comme le calcul des scores de
// Banalo qui avait fini en trois versions avant d'être sorti en base.
//
// ⚠️ LES DEUX CLÉS RESTENT DISTINCTES, ET C'EST LE POINT. Une clé partagée
// relierait les deux jeux dans la base — « ce navigateur a joué à Banalo ET à
// Cinq sur cinq » — une information que personne n'a demandée et qui ne sert à
// rien. Elles ne se fusionnent pas « pour simplifier ».

/** Le format attendu par la base : le `check` des tables refuse tout le reste. */
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
 * Le jeton de ce navigateur pour cette clé, créé au premier appel.
 *
 * Rend `null` côté serveur : le rendu initial ne doit pas en inventer un, sinon
 * chaque visite en créerait un nouveau et l'hydratation en changerait.
 */
export function jetonSous(cle: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const garde = window.localStorage.getItem(cle);
    if (garde && FORME.test(garde)) return garde;
    const neuf = tire();
    window.localStorage.setItem(cle, neuf);
    return neuf;
  } catch {
    // Navigation privée : on joue quand même, avec un jeton qui ne survit pas à
    // la page. La partie compte pour la foule des autres, et le joueur voit son
    // résultat — il ne le retrouvera simplement pas demain.
    return tire();
  }
}
