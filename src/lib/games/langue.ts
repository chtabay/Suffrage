// COMMENT LES JEUX NOMMENT LEURS LANGUES.
//
// ⚠️ PAS `Intl.DisplayNames`, ET C'EST MESURÉ. Il ne connaît pas `pcm` : dans un
// menu français il rendait « français, anglais, **pcm** » — deux noms lisibles
// et un code brut, dans la même liste. Vu à l'écran.
//
// On reprend donc la convention que le produit applique déjà dans sa bascule de
// langue (`LocaleSwitch`) : le code ISO en majuscules, et un nom lisible quand
// le code ne dit rien à personne. C'est aussi ce que le joueur a sous les yeux
// dans la barre, donc il reconnaît le même vocabulaire des deux côtés.
//
// ⚠️ CETTE LISTE ET CELLE DE `LocaleSwitch` SONT DEUX. Elles disent la même
// chose et doivent bouger ensemble — mais la bascule appartient à la nav de
// Placet, pas aux jeux, et les fondre ferait dépendre un écran de jeu d'un
// composant de la plateforme pour trois mots.
const NOMS: Record<string, string> = { pcm: "Pidgin" };

/** « fr » → « FR », « pcm » → « Pidgin ». */
export function nomDeLangue(code: string): string {
  return NOMS[code] ?? code.toUpperCase();
}
