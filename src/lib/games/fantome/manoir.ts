// LES PIÈCES DU MANOIR — du CONTENU, pas de l'i18n.
//
// Même choix que les fiches méthodes, déjà en production : ces libellés vivront
// dans un PAQUET de scénario (« Le Casse du Musée » rethèmera les mêmes clés),
// et le contrôle de parité i18n ne voit de toute façon que les clés écrites en
// clair — une clé de pièce passée en variable lui échapperait.
//
// La CLÉ est ce que la base connaît (`scrutin_game_bornes.place`) ; le libellé
// et l'emoji n'appartiennent qu'à l'écran.

export interface Piece {
  key: string;
  emoji: string;
  fr: string;
  en: string;
  es: string;
  pcm: string;
}

/**
 * Les pièces proposées quand on accroche un portrait. Volontairement plus
 * nombreuses que les 3 à 5 bornes d'une vraie soirée : chaque maison a les
 * siennes, et rien n'oblige à toutes les servir.
 */
export const PIECES: Piece[] = [
  { key: "cuisine", emoji: "🍳", fr: "la cuisine", en: "the kitchen", es: "la cocina", pcm: "di kitchen" },
  { key: "salon", emoji: "🛋️", fr: "le salon", en: "the drawing room", es: "el salón", pcm: "di parlour" },
  { key: "bibliotheque", emoji: "📚", fr: "la bibliothèque", en: "the library", es: "la biblioteca", pcm: "di library" },
  { key: "fumoir", emoji: "🕯️", fr: "le fumoir", en: "the smoking room", es: "el fumadero", pcm: "di smoking room" },
  { key: "veranda", emoji: "🪟", fr: "la véranda", en: "the conservatory", es: "la galería", pcm: "di veranda" },
  { key: "couloir", emoji: "🚪", fr: "le couloir", en: "the corridor", es: "el pasillo", pcm: "di corridor" },
  { key: "escalier", emoji: "🪜", fr: "l'escalier", en: "the staircase", es: "la escalera", pcm: "di staircase" },
  { key: "cave", emoji: "🍷", fr: "la cave", en: "the cellar", es: "la bodega", pcm: "di cellar" },
  { key: "grenier", emoji: "🕸️", fr: "le grenier", en: "the attic", es: "el desván", pcm: "di attic" },
  { key: "jardin", emoji: "🌿", fr: "le jardin", en: "the garden", es: "el jardín", pcm: "di garden" },
];

const BY_KEY = new Map(PIECES.map((p) => [p.key, p]));

export function pieceLabel(key: string, locale: string): string {
  const p = BY_KEY.get(key);
  if (!p) return key;
  // `pickLocale` retombe sur EN puis FR ailleurs dans le dépôt ; ici la table
  // est complète, donc un simple aiguillage suffit.
  return locale === "en" ? p.en : locale === "es" ? p.es : locale === "pcm" ? p.pcm : p.fr;
}

export function pieceEmoji(key: string): string {
  return BY_KEY.get(key)?.emoji ?? "🖼️";
}
