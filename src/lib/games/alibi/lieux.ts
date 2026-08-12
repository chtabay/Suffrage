// LES PIÈCES DE LA MAISON — du CONTENU, pas de l'interface.
//
// Même règle que les thèmes d'Unanimo et que les fiches de `src/content/methods` :
// un seul tableau porte les quatre langues côte à côte, hors i18n. La parité est
// alors garantie par la STRUCTURE et non par un contrôle, et ajouter une langue
// se fait en une colonne de plus par ligne.
//
// LA BASE NE CONNAÎT QUE LES CLÉS. `scrutin_game_alibi_deal` tire trois clés
// parmi celles ci-dessous et les range dans l'énoncé public de la manche ; c'est
// le client qui les traduit. La base garde ce qui a été joué, elle n'héberge pas
// un catalogue qu'il faudrait traduire en base — et qui le serait mal.
//
// ⚠️ CETTE LISTE DOIT RESTER SYNCHRONE AVEC LE TABLEAU DE `scrutin_game_alibi_deal`
// (migration 20260812-jeu-alibi.sql). Une clé qui n'existerait que d'un côté
// s'afficherait crûment à l'écran. `PLACE_KEYS` ci-dessous est là pour qu'un test
// puisse le vérifier.
import { pickLocale } from "@/i18n/locales";

export interface Place {
  key: string;
  emoji: string;
  fr: string;
  en: string;
  es: string;
  pcm: string;
}

/**
 * Des pièces de MAISON, concrètes et immédiatement imaginables : on joue dans un
 * gîte, un salon, une location de vacances. Rien de gothique — le manoir hanté
 * fait joli sur une boîte de jeu et sonne faux quand on est onze autour d'une
 * table basse.
 */
export const PLACES: Place[] = [
  { key: "cuisine", emoji: "🍳", fr: "la cuisine", en: "the kitchen", es: "la cocina", pcm: "di kitchen" },
  { key: "salon", emoji: "🛋️", fr: "le salon", en: "the living room", es: "el salón", pcm: "di parlour" },
  { key: "cave", emoji: "🕯️", fr: "la cave", en: "the cellar", es: "el sótano", pcm: "di cellar" },
  { key: "grenier", emoji: "🪜", fr: "le grenier", en: "the attic", es: "el desván", pcm: "di attic" },
  { key: "buanderie", emoji: "🧺", fr: "la buanderie", en: "the laundry room", es: "el lavadero", pcm: "di laundry room" },
  { key: "veranda", emoji: "🪟", fr: "la véranda", en: "the conservatory", es: "la galería", pcm: "di veranda" },
  { key: "jardin", emoji: "🌿", fr: "le jardin", en: "the garden", es: "el jardín", pcm: "di garden" },
  { key: "garage", emoji: "🚗", fr: "le garage", en: "the garage", es: "el garaje", pcm: "di garage" },
  { key: "bibliotheque", emoji: "📚", fr: "la bibliothèque", en: "the library", es: "la biblioteca", pcm: "di library" },
  { key: "couloir", emoji: "🚪", fr: "le couloir", en: "the hallway", es: "el pasillo", pcm: "di corridor" },
  { key: "terrasse", emoji: "🪴", fr: "la terrasse", en: "the terrace", es: "la terraza", pcm: "di terrace" },
  { key: "cellier", emoji: "🫙", fr: "le cellier", en: "the pantry", es: "la despensa", pcm: "di store room" },
];

/** Les clés, dans l'ordre du tableau SQL. Un test compare les deux listes. */
export const PLACE_KEYS = PLACES.map((p) => p.key);

const BY_KEY = new Map(PLACES.map((p) => [p.key, p]));

/**
 * Le libellé d'une pièce dans la langue de la salle.
 *
 * Une clé inconnue n'est PAS une erreur bloquante : elle peut venir d'une partie
 * ouverte avant l'ajout d'une pièce, ou d'une base plus récente que le client
 * déployé. On rend alors la clé telle quelle plutôt que du vide — un mot brut se
 * lit, une case blanche ne se comprend pas.
 */
export function placeLabel(key: string, locale: string): string {
  const p = BY_KEY.get(key);
  if (!p) return key;
  return pickLocale(locale, { fr: p.fr, en: p.en, es: p.es, pcm: p.pcm });
}

export function placeEmoji(key: string): string {
  return BY_KEY.get(key)?.emoji ?? "🚪";
}
