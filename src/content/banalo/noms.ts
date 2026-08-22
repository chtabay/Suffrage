// LES NOMS DU TABLEAU — un vocabulaire FERMÉ, et c'est tout le sujet.
//
// La règle est arbitrée : pour figurer au tableau d'une journée, il faut soit un
// compte Placet — et alors on choisit son nom librement —, soit déposer un nom
// PRIS DANS CETTE LISTE. Qui ne fait ni l'un ni l'autre joue normalement, voit
// son rang et son centile, et n'apparaît simplement pas au tableau.
//
// ⚠️ CE N'EST PAS UNE PRÉCAUTION DE FAÇADE, C'EST CE QUI REND LE TABLEAU
// POSSIBLE. Un champ de pseudo sur un classement public n'est pas un champ
// d'identité : c'est un canal de publication d'une ligne, adressé à tous les
// joueurs du jour. Ce qu'on y trouve, dans l'ordre de gravité RÉELLE : du
// harcèlement visant quelqu'un de précis (« Marie du CM2 pue ») ; des données
// personnelles déposées sans malice par un enfant, sur un jeu dont la politique
// déclare une tranche d'âge « enfant » ; puis seulement les insultes.
//
// ⚠️ ET UN FILTRE NE RÈGLE QUE LE TROISIÈME. Une liste de mots interdits attrape
// les insultes, jamais le harcèlement — « Marie du CM2 pue » ne contient aucun
// mot à bannir. C'est pourquoi la sortie n'est pas de filtrer le texte libre
// mais de ne pas en ouvrir : ici il n'y a rien à modérer, parce qu'il n'y a rien
// d'écrit par un joueur.
//
// ⚠️ ET SANS COMPTE, LA MODÉRATION EST IMPOSSIBLE PAR CONSTRUCTION, ce qui rend
// la règle nécessaire et pas seulement prudente : un jeton anonyme ne se bannit
// pas — on efface son `localStorage` et on revient avec un autre nom, tout de
// suite, indéfiniment. Le texte libre n'existe donc que là où quelqu'un en
// répond, c'est-à-dire derrière un compte.
//
// ─────────────────────────────────────────────── pourquoi AUCUN adjectif
//
// ⚠️ LA COMPOSITION EST « ANIMAL + COMPLÉMENT », JAMAIS « ANIMAL + ADJECTIF »,
// et c'est une contrainte de LANGUE, pas de goût. Un adjectif s'accorde : en
// français « Renard malin » mais « Loutre maligne », en espagnol « Zorro
// astuto » mais « Nutria astuta ». Composer à la volée demanderait de porter le
// genre de chaque animal dans chaque langue et d'accorder à l'exécution — pour
// un gain nul. Un complément ne s'accorde jamais : « Renard de minuit »,
// « Loutre de minuit ». La même mécanique marche dans les quatre langues.
//
// 30 animaux × 20 compléments = 600 noms par langue. C'est calibré sur la foule
// qu'une journée peut avoir, pas sur l'infini : au-delà, c'est le dépôt qui
// refuse un nom déjà pris ce jour-là et en propose un autre.
import { pickLocale } from "@/i18n/locales";

/**
 * ⚠️ UN INDEX DE CHAÎNES, PAS UNE INTERFACE FERMÉE : `pickLocale` prend un
 * `Record<string, T>`, et une interface sans signature d'index ne s'y assigne
 * pas. Les quatre langues restent obligatoires — le contrôle de parité ne voit
 * pas ce fichier, c'est donc le type qui les tient.
 */
export type Localise = Record<"fr" | "en" | "es" | "pcm", string> & Record<string, string>;

/**
 * Les animaux. Choisis pour être reconnaissables par un enfant, neutres, et
 * sans connotation dans aucune des quatre langues.
 */
export const ANIMAUX: Localise[] = [
  { fr: "Renard", en: "Fox", es: "Zorro", pcm: "Fox" },
  { fr: "Loutre", en: "Otter", es: "Nutria", pcm: "Otter" },
  { fr: "Merle", en: "Blackbird", es: "Mirlo", pcm: "Blackbird" },
  { fr: "Hérisson", en: "Hedgehog", es: "Erizo", pcm: "Hedgehog" },
  { fr: "Cerf", en: "Stag", es: "Ciervo", pcm: "Deer" },
  { fr: "Chouette", en: "Owl", es: "Lechuza", pcm: "Owl" },
  { fr: "Blaireau", en: "Badger", es: "Tejón", pcm: "Badger" },
  { fr: "Écureuil", en: "Squirrel", es: "Ardilla", pcm: "Squirrel" },
  { fr: "Héron", en: "Heron", es: "Garza", pcm: "Heron" },
  { fr: "Lynx", en: "Lynx", es: "Lince", pcm: "Lynx" },
  { fr: "Marmotte", en: "Marmot", es: "Marmota", pcm: "Marmot" },
  { fr: "Pinson", en: "Finch", es: "Pinzón", pcm: "Finch" },
  { fr: "Belette", en: "Weasel", es: "Comadreja", pcm: "Weasel" },
  { fr: "Sanglier", en: "Boar", es: "Jabalí", pcm: "Boar" },
  { fr: "Mouette", en: "Gull", es: "Gaviota", pcm: "Seagull" },
  { fr: "Castor", en: "Beaver", es: "Castor", pcm: "Beaver" },
  { fr: "Faucon", en: "Falcon", es: "Halcón", pcm: "Falcon" },
  { fr: "Taupe", en: "Mole", es: "Topo", pcm: "Mole" },
  { fr: "Grue", en: "Crane", es: "Grulla", pcm: "Crane" },
  { fr: "Bouquetin", en: "Ibex", es: "Íbice", pcm: "Ibex" },
  { fr: "Martre", en: "Marten", es: "Marta", pcm: "Marten" },
  { fr: "Corbeau", en: "Raven", es: "Cuervo", pcm: "Raven" },
  { fr: "Phoque", en: "Seal", es: "Foca", pcm: "Seal" },
  { fr: "Lièvre", en: "Hare", es: "Liebre", pcm: "Hare" },
  { fr: "Pélican", en: "Pelican", es: "Pelícano", pcm: "Pelican" },
  { fr: "Chamois", en: "Chamois", es: "Rebeco", pcm: "Chamois" },
  { fr: "Tortue", en: "Turtle", es: "Tortuga", pcm: "Turtle" },
  { fr: "Dauphin", en: "Dolphin", es: "Delfín", pcm: "Dolphin" },
  { fr: "Hibou", en: "Owlet", es: "Búho", pcm: "Owlet" },
  { fr: "Panda", en: "Panda", es: "Panda", pcm: "Panda" },
];

/**
 * Les compléments. ⚠️ AUCUN NE S'ACCORDE — voir l'en-tête : c'est ce qui permet
 * de composer sans porter le genre de chaque animal dans chaque langue.
 */
export const COMPLEMENTS: Localise[] = [
  { fr: "de minuit", en: "of midnight", es: "de medianoche", pcm: "of midnight" },
  { fr: "du matin", en: "of the morning", es: "de la mañana", pcm: "of di morning" },
  { fr: "des sables", en: "of the sands", es: "de las arenas", pcm: "of di sand" },
  { fr: "du nord", en: "of the north", es: "del norte", pcm: "of di north" },
  { fr: "des neiges", en: "of the snows", es: "de las nieves", pcm: "of di snow" },
  { fr: "du large", en: "of the open sea", es: "de alta mar", pcm: "of di open sea" },
  { fr: "des toits", en: "of the rooftops", es: "de los tejados", pcm: "of di rooftop" },
  { fr: "de la brume", en: "of the mist", es: "de la niebla", pcm: "of di mist" },
  { fr: "des orages", en: "of the storms", es: "de las tormentas", pcm: "of di storm" },
  { fr: "du dimanche", en: "of Sunday", es: "del domingo", pcm: "of Sunday" },
  { fr: "des étoiles", en: "of the stars", es: "de las estrellas", pcm: "of di stars" },
  { fr: "du printemps", en: "of spring", es: "de la primavera", pcm: "of spring" },
  { fr: "des vallées", en: "of the valleys", es: "de los valles", pcm: "of di valley" },
  { fr: "du crépuscule", en: "of dusk", es: "del crepúsculo", pcm: "of evening time" },
  { fr: "des marées", en: "of the tides", es: "de las mareas", pcm: "of di tide" },
  { fr: "du verger", en: "of the orchard", es: "del huerto", pcm: "of di orchard" },
  { fr: "des collines", en: "of the hills", es: "de las colinas", pcm: "of di hills" },
  { fr: "de l'aube", en: "of dawn", es: "del alba", pcm: "of early morning" },
  { fr: "des lanternes", en: "of the lanterns", es: "de los faroles", pcm: "of di lantern" },
  { fr: "du grand vent", en: "of the high wind", es: "del viento fuerte", pcm: "of di big wind" },
];

/** Combien de noms le vocabulaire porte, par langue. */
export const COMBINAISONS = ANIMAUX.length * COMPLEMENTS.length;

/**
 * Le nom n° `i` du vocabulaire, dans la langue de l'écran.
 *
 * ⚠️ L'INDEX EST LA SEULE CHOSE QU'ON STOCKE, jamais le libellé. Un nom stocké
 * en français apparaîtrait en français à un joueur anglophone du même tableau ;
 * un index se rend dans la langue de celui qui REGARDE. C'est la même règle que
 * les thèmes, dont la clé de foule est le libellé français mais dont l'écran
 * affiche la traduction.
 */
export function nomDe(i: number, locale: string): string {
  const n = ((i % COMBINAISONS) + COMBINAISONS) % COMBINAISONS;
  const animal = ANIMAUX[Math.floor(n / COMPLEMENTS.length)]!;
  const complement = COMPLEMENTS[n % COMPLEMENTS.length]!;
  return `${pickLocale(locale, animal)} ${pickLocale(locale, complement)}`;
}

/**
 * Propose `combien` noms distincts, tirés de façon reproductible depuis `graine`.
 *
 * ⚠️ REPRODUCTIBLE, ET PAS `Math.random()` : sans graine, chaque rendu de React
 * proposerait une autre liste, et le nom que le joueur s'apprêtait à choisir
 * disparaîtrait sous ses yeux. La graine vient du jeton et du rang de tirage —
 * « en proposer d'autres » incrémente le rang, ce qui redonne une liste stable.
 */
export function nomsProposes(graine: number, combien: number, tour = 0): number[] {
  const out: number[] = [];
  // Suite congruentielle : la même que celle des vérifications de ce dépôt, et
  // elle suffit — on tire quatre noms, on ne chiffre rien.
  let x = (Math.abs(Math.trunc(graine)) + tour * 7919) % 2147483647 || 1;
  while (out.length < Math.min(combien, COMBINAISONS)) {
    x = (x * 48271) % 2147483647;
    const i = x % COMBINAISONS;
    if (!out.includes(i)) out.push(i);
  }
  return out;
}

/**
 * Une graine stable tirée du jeton anonyme.
 *
 * Le jeton ne quitte pas le navigateur ; on n'en garde qu'une somme, qui ne
 * permet pas de le reconstituer et n'a pas à le permettre.
 */
export function graineDe(jeton: string): number {
  let h = 0;
  for (let i = 0; i < jeton.length; i++) h = (h * 31 + jeton.charCodeAt(i)) % 2147483647;
  return h;
}
