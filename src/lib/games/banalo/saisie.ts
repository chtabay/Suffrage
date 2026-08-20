// CE QU'ON ACCEPTE COMME RÉPONSE — et ce qu'on refuse de deviner.
//
// ⚠️ CHIFFRES SEULEMENT, AUCUN SÉPARATEUR DÉCIMAL. « 1,5 » vaut un et demi en
// français et mille cinq cents en anglais ; « 1.5 » vaut l'inverse. La même
// frappe vaudrait donc mille fois plus ou mille fois moins selon la langue de
// l'écran, en silence, et le joueur ne verrait jamais l'erreur — son score
// serait simplement absurde. Sur une estimation d'ordre de grandeur la décimale
// n'apporte rien : on la refuse plutôt que de deviner ce qu'elle voulait dire.
//
// D'où le choix de tout dépouiller sauf les chiffres : un séparateur de
// milliers tapé par habitude (« 4 500 000 », « 4,500,000 ») donne le bon
// nombre, et une décimale donne un nombre visiblement trop grand — que la
// relecture formatée, juste sous le champ, montre AVANT l'envoi.

/**
 * Le nombre porté par une saisie, ou `null` si elle n'en porte pas.
 *
 * `1e18` est la borne de la base (`check (reponse > 0 and reponse < 1e18)`) ;
 * `Number.isSafeInteger` est plus strict et arrive avant, donc rien de ce qui
 * sort d'ici ne peut être refusé par la table.
 */
export function nombreDe(saisie: string): number | null {
  const chiffres = saisie.replace(/\D/g, "");
  if (!chiffres) return null;
  const n = Number(chiffres);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
