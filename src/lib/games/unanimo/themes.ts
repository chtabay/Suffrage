// LES THÈMES D'UNANIMO — une liste en dur, et c'est le bon choix.
//
// POURQUOI PAS UN LLM. On aurait pu faire générer les thèmes. Trois raisons de
// ne pas le faire : une manche ne doit pas attendre un appel réseau qui peut
// échouer au milieu d'un salon ; un thème doit être ÉVIDENT pour tout le monde
// à la table (c'est un jeu de convergence — un thème inventé, obscur ou
// alambiqué casse la mécanique) ; et la partie doit tourner sans clé d'API, à
// coût nul. Le jeu de plateau, lui aussi, tient dans un paquet de cartes.
//
// POURQUOI PAS DANS messages/*.json. La liste n'est pas de l'interface, c'est du
// CONTENU — comme les fiches de `src/content/methods`, hors i18n. Un seul
// tableau porte les quatre langues côte à côte : la parité est garantie par la
// structure, pas par un contrôle. Ajouter une langue = une clé de plus par
// ligne, et le repli est explicite (`pcm` retombe sur l'anglais s'il manque).
import { pickLocale } from "@/i18n/locales";
import type { RoundPrompt } from "@/lib/games/room";

export interface Theme {
  emoji: string;
  fr: string;
  en: string;
  es: string;
  pcm: string;
}

/**
 * Des thèmes LARGES et concrets : chacun doit faire venir dix mots en cinq
 * secondes à n'importe qui. Rien de culturellement pointu, rien d'abstrait —
 * « la mer » marche, « la mélancolie » ne marche pas.
 */
export const THEMES: Theme[] = [
  { emoji: "🌊", fr: "La mer", en: "The sea", es: "El mar", pcm: "Di sea" },
  { emoji: "⛰️", fr: "La montagne", en: "The mountain", es: "La montaña", pcm: "Di mountain" },
  { emoji: "🎪", fr: "Le cirque", en: "The circus", es: "El circo", pcm: "Di circus" },
  { emoji: "🎄", fr: "Noël", en: "Christmas", es: "La Navidad", pcm: "Christmas" },
  { emoji: "🏫", fr: "L'école", en: "School", es: "La escuela", pcm: "School" },
  { emoji: "🍕", fr: "La pizza", en: "Pizza", es: "La pizza", pcm: "Pizza" },
  { emoji: "🚀", fr: "L'espace", en: "Outer space", es: "El espacio", pcm: "Space" },
  { emoji: "🌧️", fr: "La pluie", en: "The rain", es: "La lluvia", pcm: "Rain" },
  { emoji: "💼", fr: "Le bureau", en: "The office", es: "La oficina", pcm: "Di office" },
  { emoji: "🎸", fr: "Le rock", en: "Rock music", es: "El rock", pcm: "Rock music" },
  { emoji: "👶", fr: "Un bébé", en: "A baby", es: "Un bebé", pcm: "Small pikin" },
  { emoji: "🏥", fr: "L'hôpital", en: "The hospital", es: "El hospital", pcm: "Hospital" },
  { emoji: "🚗", fr: "La voiture", en: "The car", es: "El coche", pcm: "Motor" },
  { emoji: "☕", fr: "Le petit-déjeuner", en: "Breakfast", es: "El desayuno", pcm: "Morning food" },
  { emoji: "🏜️", fr: "Le désert", en: "The desert", es: "El desierto", pcm: "Di desert" },
  { emoji: "🎬", fr: "Le cinéma", en: "The movies", es: "El cine", pcm: "Cinema" },
  { emoji: "⚽", fr: "Le football", en: "Football", es: "El fútbol", pcm: "Football" },
  { emoji: "🧙", fr: "La magie", en: "Magic", es: "La magia", pcm: "Magic" },
  { emoji: "🏝️", fr: "Les vacances", en: "Holidays", es: "Las vacaciones", pcm: "Holiday" },
  { emoji: "🌃", fr: "La nuit", en: "The night", es: "La noche", pcm: "Night" },
  { emoji: "🐝", fr: "Le jardin", en: "The garden", es: "El jardín", pcm: "Garden" },
  { emoji: "🎉", fr: "Une fête", en: "A party", es: "Una fiesta", pcm: "Party" },
  { emoji: "🚂", fr: "Le train", en: "The train", es: "El tren", pcm: "Train" },
  { emoji: "👑", fr: "Les rois et les reines", en: "Kings and queens", es: "Reyes y reinas", pcm: "King and queen" },
  { emoji: "🦷", fr: "Le dentiste", en: "The dentist", es: "El dentista", pcm: "Dentist" },
  { emoji: "🎨", fr: "La peinture", en: "Painting", es: "La pintura", pcm: "Painting" },
  { emoji: "🧊", fr: "Le froid", en: "The cold", es: "El frío", pcm: "Cold" },
  { emoji: "🔥", fr: "Le feu", en: "Fire", es: "El fuego", pcm: "Fire" },
  { emoji: "🐕", fr: "Les animaux", en: "Animals", es: "Los animales", pcm: "Animals" },
  { emoji: "📚", fr: "La bibliothèque", en: "The library", es: "La biblioteca", pcm: "Library" },
  { emoji: "💰", fr: "L'argent", en: "Money", es: "El dinero", pcm: "Money" },
  { emoji: "🕵️", fr: "Le mystère", en: "Mystery", es: "El misterio", pcm: "Mystery" },
  { emoji: "🛒", fr: "Le supermarché", en: "The supermarket", es: "El supermercado", pcm: "Market" },
  { emoji: "🌅", fr: "Le matin", en: "The morning", es: "La mañana", pcm: "Morning" },
  { emoji: "🎂", fr: "Un anniversaire", en: "A birthday", es: "Un cumpleaños", pcm: "Birthday" },
  { emoji: "✈️", fr: "L'aéroport", en: "The airport", es: "El aeropuerto", pcm: "Airport" },
  { emoji: "🧦", fr: "Le linge", en: "Laundry", es: "La ropa sucia", pcm: "Washing clothes" },
  { emoji: "🐒", fr: "La jungle", en: "The jungle", es: "La jungla", pcm: "Bush" },
  { emoji: "🍫", fr: "Le chocolat", en: "Chocolate", es: "El chocolate", pcm: "Chocolate" },
  { emoji: "⚡", fr: "L'orage", en: "The storm", es: "La tormenta", pcm: "Storm" },
  { emoji: "🏖️", fr: "Le sable", en: "Sand", es: "La arena", pcm: "Sand" },
  { emoji: "🎭", fr: "Le théâtre", en: "Theatre", es: "El teatro", pcm: "Theatre" },
  { emoji: "🚑", fr: "Une urgence", en: "An emergency", es: "Una emergencia", pcm: "Emergency" },
  { emoji: "🌻", fr: "L'été", en: "Summer", es: "El verano", pcm: "Hot season" },
  { emoji: "❄️", fr: "L'hiver", en: "Winter", es: "El invierno", pcm: "Harmattan" },
  { emoji: "📱", fr: "Le téléphone", en: "The phone", es: "El teléfono", pcm: "Phone" },
  { emoji: "🧵", fr: "La couture", en: "Sewing", es: "La costura", pcm: "Sewing" },
  { emoji: "🎣", fr: "La pêche", en: "Fishing", es: "La pesca", pcm: "Fishing" },
  { emoji: "🏙️", fr: "Une grande ville", en: "A big city", es: "Una gran ciudad", pcm: "Big city" },
  { emoji: "🛏️", fr: "Le sommeil", en: "Sleep", es: "El sueño", pcm: "Sleep" },
  { emoji: "🍳", fr: "La cuisine", en: "Cooking", es: "La cocina", pcm: "Cooking" },
  { emoji: "🎁", fr: "Un cadeau", en: "A gift", es: "Un regalo", pcm: "Gift" },
  { emoji: "🪑", fr: "Une salle d'attente", en: "A waiting room", es: "Una sala de espera", pcm: "Waiting room" },
  { emoji: "🦖", fr: "Les dinosaures", en: "Dinosaurs", es: "Los dinosaurios", pcm: "Dinosaur" },
  { emoji: "🌍", fr: "Le voyage", en: "Travel", es: "El viaje", pcm: "Journey" },
  { emoji: "🎺", fr: "La fanfare", en: "The brass band", es: "La banda", pcm: "Brass band" },
  { emoji: "🧱", fr: "Un chantier", en: "A building site", es: "Una obra", pcm: "Building site" },
  { emoji: "🌙", fr: "Les rêves", en: "Dreams", es: "Los sueños", pcm: "Dream" },
  { emoji: "🦸", fr: "Les héros", en: "Heroes", es: "Los héroes", pcm: "Hero" },
  { emoji: "🍋", fr: "Le citron", en: "The lemon", es: "El limón", pcm: "Lemon" },
  { emoji: "🎓", fr: "Les examens", en: "Exams", es: "Los exámenes", pcm: "Exam" },
  { emoji: "🧳", fr: "Le déménagement", en: "Moving house", es: "La mudanza", pcm: "Packing enter new house" },
  { emoji: "🚦", fr: "Les embouteillages", en: "Traffic jams", es: "Los atascos", pcm: "Go-slow" },
  { emoji: "💌", fr: "L'amour", en: "Love", es: "El amor", pcm: "Love" },
  { emoji: "🐔", fr: "La ferme", en: "The farm", es: "La granja", pcm: "Farm" },
  { emoji: "🎢", fr: "La fête foraine", en: "The funfair", es: "La feria", pcm: "Funfair" },
  { emoji: "🧹", fr: "Le grand ménage", en: "Spring cleaning", es: "La limpieza general", pcm: "Big cleaning" },
  { emoji: "🏆", fr: "La victoire", en: "Victory", es: "La victoria", pcm: "Victory" },
];

export function themeLabel(t: Theme, locale: string): string {
  return pickLocale(locale, { fr: t.fr, en: t.en, es: t.es, pcm: t.pcm });
}

/**
 * Tire le thème de la manche suivante, dans la langue de la SALLE.
 *
 * `used` vient de l'état de la salle (`usedPrompts`) : on ne repasse pas deux
 * fois le même thème dans une partie — et si la liste s'épuise (une partie de
 * cinquante manches), on repart du début plutôt que de refuser de jouer.
 */
export function pickTheme(locale: string, used: string[] = []): RoundPrompt {
  const seen = new Set(used.map((u) => u.trim().toLowerCase()));
  const pool = THEMES.filter((t) => !seen.has(themeLabel(t, locale).trim().toLowerCase()));
  const from = pool.length ? pool : THEMES;
  const t = from[Math.floor(Math.random() * from.length)];
  return { kind: "theme", text: themeLabel(t, locale), emoji: t.emoji };
}
