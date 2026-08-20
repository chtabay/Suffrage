// LES QUESTIONS CHIFFRÉES DE BANALO DU JOUR — le vrai contenu du mode.
//
// Une question demande UN NOMBRE. Le joueur n'est pas noté sur la vérité mais
// sur son écart à la médiane des autres joueurs : le jeu cherche la réponse
// COMMUNE, pas la réponse juste. C'est assumé, et l'écran doit le dire.
//
// DU CONTENU, PAS DE L'i18n : un seul tableau porte les quatre langues côte à
// côte, comme `manoir.ts`, `murmures.ts` et les thèmes du mode groupe. La parité
// est garantie par la structure, pas par un contrôle.
//
// ─────────────────────────────────────────────────────────────────────────────
// LES QUATRE RÈGLES D'ÉCRITURE, et celle qui coûte le plus est la troisième.
//
//  1. **INTROUVABLE SUR LE WEB.** Si la réponse se cherche, le jeu devient un
//     test de recherche. Le test pratique : la question doit exiger de COMPOSER
//     plusieurs estimations. « Combien de grains de riz dans un kilo » est
//     écarté — le poids d'un grain est publié.
//
//  2. **ESTIMABLE PAR N'IMPORTE QUI.** Aucune connaissance spécialisée : on doit
//     pouvoir bâtir un chemin en trente secondes.
//
//  3. ⚠️ **L'OBJET DOIT EXISTER DANS LES QUATRE PAYS.** La localisation fait
//     apparaître un filtre qu'on ne voit pas en écrivant en français : beaucoup
//     d'objets de Fermi sont culturellement européens. Les pigeons de place, le
//     liège du 31 décembre, les vélos qui rouillent à la cave, les parapluies du
//     métro — au Nigeria ces questions sont absurdes ou valent zéro. **Une
//     question localisée n'est pas une question traduite** : il faut que la
//     CHOSE ait un sens à Lagos comme à Madrid. C'est ce critère qui a le plus
//     élagué la première liste ; les écartées sont dans
//     `docs/questions-chiffrees.md`, avec leur motif, pour qu'on ne les
//     repropose pas.
//
//  4. **UN ORDRE DE GRANDEUR ANNONCÉ**, en puissance de dix. Il ne sort jamais
//     à l'écran : il sert au test à refuser une question dont la réponse serait
//     absurde, et il donnera le premier point de comparaison quand les vraies
//     médianes arriveront. Si la foule s'en écarte d'un facteur dix, c'est
//     l'ordre annoncé qui est faux, pas la foule.
//
// ⚠️ **LA VARIÉTÉ D'ÉCHELLE EST VOULUE.** Toutes les questions ne sont pas à
// l'échelle du pays : certaines portent sur une personne, une tournée, une vie.
// Sinon le joueur applique le même chemin tous les jours — population × un
// facteur — et le jeu devient une routine qu'on exécute au lieu d'un problème
// qu'on pose.

/** Un texte dans les quatre langues de Placet. */
export interface Localise {
  fr: string;
  en: string;
  es: string;
  pcm: string;
}

/**
 * Les unités attendues. `nombre` est la seule qui demande un mot ; les trois
 * autres sont des symboles qui se lisent partout.
 */
export type Unite = "nombre" | "kg" | "m2" | "km";

export const UNITES: Record<Unite, Localise> = {
  nombre: { fr: "en nombre", en: "a count", es: "una cantidad", pcm: "how many" },
  kg: { fr: "en kilos", en: "in kilos", es: "en kilos", pcm: "for kilo" },
  m2: { fr: "en m²", en: "in m²", es: "en m²", pcm: "for m²" },
  km: { fr: "en km", en: "in km", es: "en km", pcm: "for km" },
};

export interface Question {
  id: string;
  unite: Unite;
  /** Puissance de dix attendue. Jamais montrée au joueur — voir la règle 4. */
  ordre: number;
  texte: Localise;
}

/**
 * ⚠️ CHAQUE LANGUE PARLE DE SON PROPRE PAYS. France, Royaume-Uni, Espagne,
 * Nigeria. Demander à un joueur nigérian le poids des ballons EN FRANCE n'a
 * aucun sens — et comme les distributions sont de toute façon séparées par
 * langue, rien n'oblige à poser la même question partout.
 */
export const QUESTIONS: Question[] = [
  {
    id: "ballons-foot",
    unite: "kg",
    ordre: 6,
    texte: {
      fr: "Quel est le poids de tous les ballons de football qui se trouvent en France aujourd'hui ?",
      en: "What do all the footballs currently in the United Kingdom weigh, together?",
      es: "¿Cuánto pesan todos los balones de fútbol que hay hoy en España?",
      pcm: "All di football wey dey Nigeria today, dem weigh how much together?",
    },
  },
  {
    id: "cheveux-salons",
    unite: "kg",
    ordre: 4,
    texte: {
      fr: "Quel poids de cheveux les salons de coiffure français coupent-ils en une seule journée ?",
      en: "How many kilos of hair do British hairdressers cut in a single day?",
      es: "¿Cuántos kilos de pelo cortan las peluquerías españolas en un solo día?",
      pcm: "How many kilo of hair Nigeria barbing salon dey cut for one day?",
    },
  },
  {
    id: "mots-par-jour",
    unite: "nombre",
    ordre: 4,
    texte: {
      fr: "Combien de mots une personne prononce-t-elle en une journée ordinaire ?",
      en: "How many words does one person say in an ordinary day?",
      es: "¿Cuántas palabras dice una persona en un día normal?",
      pcm: "How many words one person dey talk for one normal day?",
    },
  },
  {
    id: "salutation-journee",
    unite: "nombre",
    ordre: 8,
    texte: {
      fr: "Combien de fois le mot « bonjour » est-il prononcé en France en une journée ?",
      en: "How many times is the word “hello” said in the United Kingdom in one day?",
      es: "¿Cuántas veces se dice « hola » en España en un día?",
      pcm: "How many times dem dey talk “how far” for Nigeria for one day?",
    },
  },
  {
    id: "brosses-a-dents",
    unite: "nombre",
    ordre: 8,
    texte: {
      fr: "Combien de brosses à dents sont jetées en France en un an ?",
      en: "How many toothbrushes are thrown away in the United Kingdom in a year?",
      es: "¿Cuántos cepillos de dientes se tiran en España en un año?",
      pcm: "How many toothbrush dem dey throway for Nigeria for one year?",
    },
  },
  {
    id: "ecrans-surface",
    unite: "m2",
    ordre: 6,
    texte: {
      fr: "Quelle surface totale font tous les écrans de téléphone de France, mis côte à côte ?",
      en: "Put every phone screen in the United Kingdom side by side — what area do they cover?",
      es: "Si juntas todas las pantallas de móvil de España, ¿qué superficie ocupan?",
      pcm: "If you join all di phone screen for Nigeria, dem go cover how many square meter?",
    },
  },
  {
    id: "ampoules-3h",
    unite: "nombre",
    ordre: 7,
    texte: {
      fr: "Combien d'ampoules sont allumées en France à trois heures du matin ?",
      en: "How many light bulbs are switched on in the United Kingdom at three in the morning?",
      es: "¿Cuántas bombillas están encendidas en España a las tres de la madrugada?",
      pcm: "How many bulb dey on for Nigeria by three for morning?",
    },
  },
  {
    id: "chaussettes-seules",
    unite: "nombre",
    ordre: 7,
    texte: {
      fr: "Combien de chaussettes dépareillées y a-t-il en France en ce moment ?",
      en: "How many odd socks are there in the United Kingdom right now?",
      es: "¿Cuántos calcetines desparejados hay ahora mismo en España?",
      pcm: "How many socks wey no get partner dey Nigeria right now?",
    },
  },
  {
    id: "pas-facteur",
    unite: "nombre",
    ordre: 4,
    texte: {
      fr: "Combien de pas un facteur fait-il pendant sa tournée d'une journée ?",
      en: "How many steps does a postal worker take on one day's round?",
      es: "¿Cuántos pasos da un cartero en un día de reparto?",
      pcm: "How many step one postman dey waka for im one day round?",
    },
  },
  {
    id: "fenetres-capitale",
    unite: "nombre",
    ordre: 7,
    texte: {
      fr: "Combien de fenêtres y a-t-il à Paris ?",
      en: "How many windows are there in London?",
      es: "¿Cuántas ventanas hay en Madrid?",
      pcm: "How many window dey for Lagos?",
    },
  },
  {
    id: "crayons-tailles",
    unite: "nombre",
    ordre: 6,
    texte: {
      fr: "Combien de crayons sont taillés dans les écoles françaises en une journée ?",
      en: "How many pencils are sharpened in British schools in one day?",
      es: "¿Cuántos lápices se afilan en los colegios españoles en un día?",
      pcm: "How many pencil dem dey sharpen for Nigeria school for one day?",
    },
  },
  {
    id: "sable-serviettes",
    unite: "kg",
    ordre: 5,
    texte: {
      fr: "Quel poids de sable rentre à la maison dans les serviettes de plage, un jour d'été en France ?",
      en: "On a summer's day, how much sand goes home inside British beach towels?",
      es: "Un día de verano, ¿cuánta arena vuelve a casa dentro de las toallas de playa españolas?",
      pcm: "For one hot day, how much sand dey enter house inside Nigeria beach towel?",
    },
  },
  {
    id: "ballons-baudruche",
    unite: "nombre",
    ordre: 6,
    texte: {
      fr: "Combien de ballons de baudruche sont gonflés en France un samedi ?",
      en: "How many balloons are blown up in the United Kingdom on a Saturday?",
      es: "¿Cuántos globos se hinchan en España un sábado?",
      pcm: "How many balloon dem dey blow for Nigeria on Saturday?",
    },
  },
  {
    id: "files-attente",
    unite: "km",
    ordre: 3,
    texte: {
      fr: "Mises bout à bout, quelle longueur font toutes les files d'attente de France un samedi après-midi ?",
      en: "End to end, how long are all the queues in the United Kingdom on a Saturday afternoon?",
      es: "Puestas en fila, ¿qué longitud tienen todas las colas de España un sábado por la tarde?",
      pcm: "If you join all di queue for Nigeria on Saturday afternoon, e go long reach how many kilometre?",
    },
  },
  {
    id: "battements-vie",
    unite: "nombre",
    ordre: 9,
    texte: {
      fr: "Combien de fois le cœur d'une personne bat-il au cours de sa vie ?",
      en: "How many times does a person's heart beat in a lifetime?",
      es: "¿Cuántas veces late el corazón de una persona a lo largo de su vida?",
      pcm: "How many times person heart dey beat for im whole life?",
    },
  },
];

export const QUESTION_PAR_ID: Record<string, Question> = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, q]),
);

/**
 * La question d'une journée donnée.
 *
 * ⚠️ LE STOCK TOURNE EN ROND quand il est épuisé, comme celui de Cinq sur cinq :
 * quinze questions, puis la seizième journée rejoue la première. Ce n'est pas
 * l'idéal, mais un écran d'erreur un matin serait pire. Le remède est d'allonger
 * la liste, et le nombre de journées restantes se lit dans `QUESTIONS.length`.
 *
 * Modulo positif : une horloge client farfelue doit retomber sur une question
 * valide, jamais sur `undefined`.
 */
export function questionDe(numero: number): Question {
  const i = (((numero - 1) % QUESTIONS.length) + QUESTIONS.length) % QUESTIONS.length;
  return QUESTIONS[i]!;
}

/** Le texte dans la langue de l'écran, repli français. */
export function enLangue(t: Localise, locale: string): string {
  return t[locale as keyof Localise] ?? t.fr;
}
