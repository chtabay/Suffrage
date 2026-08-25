// LE NOM D'UNE SAISON, DANS LA LANGUE DU LECTEUR.
//
// ⚠️ SORTI EN UN SEUL EXEMPLAIRE le jour où la porte `/games` a montré, elle
// aussi, le haut du classement du mois. Recopié, il aurait dérivé — c'est le
// chemin qu'avaient pris la règle du mot orphelin, le calcul des scores et les
// trois offres de compte, à chaque fois pour la même raison : deux copies
// répondent à la même question et finissent par ne plus dire la même chose.

const bcp = (locale: string) => (locale === "pcm" ? "en" : locale);

/**
 * « 2026-08 » → « août 2026 ».
 *
 * ⚠️ PAS DE CLÉ i18n POUR LES DOUZE MOIS. `Intl` les connaît déjà dans les
 * quatre langues, et douze clés × quatre serait quarante-huit traductions à
 * tenir pour un mot que la plateforme donne.
 *
 * ⚠️ ON CONSTRUIT LA DATE AU MILIEU DU MOIS : le 1er à minuit UTC bascule d'un
 * mois en arrière dans tous les fuseaux à l'ouest de Paris, et la carte
 * annoncerait « juillet 2026 » à un lecteur de New York le 1er août.
 */
export function moisLisible(saison: string, locale: string): string {
  const [a, m] = saison.split("-").map(Number);
  if (!a || !m) return saison;
  return new Intl.DateTimeFormat(bcp(locale), { month: "long", year: "numeric" })
    .format(new Date(Date.UTC(a, m - 1, 15)));
}
