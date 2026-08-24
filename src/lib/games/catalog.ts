// CATALOGUE DES JEUX — trois lignes de données, pas un système.
//
// Assez pour que la porte « Jouer » se remplisse toute seule et que le code de
// salle sache où envoyer le joueur, et rien de plus : pas de plugins, pas de
// registre dynamique, pas de manifeste. Ajouter un jeu = une entrée ici + un
// dossier de composants. Le jour où il y en aura cinq, on saura ce qu'il faut
// vraiment généraliser ; l'inventer maintenant serait deviner.
import {
  ALIBI_SKIN,
  ECHECS_SKIN,
  FANTOME_SKIN,
  PAYS_SKIN,
  RODEURS_SKIN,
  SOUPE_SKIN,
  UNANIMO_SKIN,
  type GameSkin,
} from "./skin";

export interface GameEntry {
  /**
   * Slug technique, et pour les jeux À SALLE la valeur de
   * `scrutin_game_rooms.game` — c'est-à-dire l'aiguillage du dépouillement.
   * Les jeux quotidiens n'ont pas de salle : leur slug ne sert qu'à l'URL et
   * aux libellés.
   */
  slug: string;
  /**
   * La FAMILLE sous laquelle la porte « Jouer » range le jeu.
   *
   * Elle ne classe pas par genre mais par OCCASION — ce qui décide si un jeu est
   * seulement possible ce soir. « Nous sommes huit après le dîner » et « j'ai
   * trois minutes » ne mènent pas au même rayon, et c'est la question que se
   * pose un visiteur avant celle du thème.
   */
  famille: "quotidien" | "accord" | "strategie" | "enquete";
  /** `soon` = emplacement annoncé, sans salle possible. */
  status: "live" | "soon";
  emoji: string;
  skin: GameSkin;
  /** Racine des pages du jeu ; la salle vit à `${route}/<code>`. */
  route: string;
  /** Nombre de joueurs conseillé, à titre indicatif — jamais une limite. */
  bestWith: string;
  minutes: string;
  /**
   * Le jeu demande une PRÉPARATION avant de commencer (matériel, mise en place).
   *
   * C'est une pastille et non une ligne de description : l'information change la
   * décision — on ne lance pas un jeu qui réclame vingt minutes de préparation
   * quand on cherche quoi faire tout de suite — et une pastille se lit, alors
   * qu'un paragraphe se saute.
   */
  prepare?: boolean;
}

export const GAMES: GameEntry[] = [
  {
    slug: "banalo",
    famille: "accord",
    status: "live",
    emoji: "🧠",
    skin: UNANIMO_SKIN,
    route: "/games/banalo",
    bestWith: "3–12",
    minutes: "15",
  },
  {
    // La case « loup-garou » qui tenait ici était une promesse : elle est tenue
    // par ALIBI, qui n'est pas un loup-garou et c'est le point. Personne n'est
    // éliminé, personne ne ferme les yeux, et l'application est le seul meneur.
    slug: "alibi",
    famille: "enquete",
    status: "live",
    emoji: "🕯️",
    skin: ALIBI_SKIN,
    route: "/games/alibi",
    bestWith: "6–16",
    minutes: "35",
  },
  {
    // Le jeu de soirée : il PONCTUE le dîner au lieu de le remplacer, et c'est
    // sa raison d'être — « permettre à la vie de continuer dans la maison ».
    slug: "rodeurs",
    famille: "enquete",
    status: "live",
    emoji: "🔦",
    skin: RODEURS_SKIN,
    route: "/games/rodeurs",
    bestWith: "7–16",
    minutes: "90",
  },
  {
    // LE JEU-ÉVÉNEMENT : le seul du catalogue qui se PRÉPARE (quinze à vingt
    // minutes, des appareils posés dans les pièces). C'est assumé — la
    // préparation est la bande-annonce de la soirée, comme pour une murder
    // party — et c'est pour ça qu'il annonce son matériel dès la vignette.
    slug: "fantome",
    famille: "enquete",
    status: "live",
    prepare: true,
    emoji: "👻",
    skin: FANTOME_SKIN,
    route: "/games/fantome",
    bestWith: "7–12",
    minutes: "120",
  },
  {
    // LE MODE QUOTIDIEN DE BANALO — même nom, même jeu de l'accord, mais une
    // AUTRE OCCASION : seul, en trois minutes, sans réunir personne. C'est ce
    // qui justifie deux entrées plutôt qu'une, alors qu'un seul nom les couvre :
    // la porte « Jouer » range par occasion, et « nous sommes huit après le
    // dîner » ne mène pas au même rayon que « j'ai trois minutes ».
    //
    // ⚠️ CE SLUG N'EST PAS UNE VALEUR DE `scrutin_game_rooms.game`, contrairement
    // à tous les autres. Le mode quotidien n'a pas de salle : sa clé est le
    // couple (journée, langue) dans `scrutin_banalo_reponses`. `roomPath` ne le
    // désignera donc jamais, et c'est correct — aucun code de salle n'y mène.
    slug: "banalo-jour",
    famille: "quotidien",
    status: "live",
    // ⚠️ PAS 🔢. L'emoji « input-numbers » rend une VIGNETTE — un cadre gris
    // contenant « 1234 » minuscules — illisible dès qu'on descend sous 20 px,
    // et c'est le seul élément froid d'une page chaude. 🎯 est un aplat rond qui
    // tient à toute taille, et il dit ce que le jeu demande : viser la réponse
    // commune. Vu à l'écran, sur les cartes de l'accueil.
    emoji: "🎯",
    skin: UNANIMO_SKIN,
    route: "/games/banalo-jour",
    bestWith: "1",
    minutes: "2",
  },
  {
    // LE PREMIER JEU SOLO DU CATALOGUE. Il n'a pas de salle : son « code » est
    // la date, la même pour tout le monde. D'où `route` sans `/<code>` —
    // `roomPath` ne le désignera jamais, et c'est correct : aucun code de salle
    // ne peut y mener.
    slug: "pays",
    famille: "quotidien",
    status: "live",
    emoji: "🌍",
    skin: PAYS_SKIN,
    route: "/games/pays",
    bestWith: "1",
    minutes: "3",
  },
  {
    // LE SEUL JEU DU CATALOGUE QUI NE S'ARRÊTE PAS TOUT SEUL, et il est rangé
    // au quotidien malgré son nom de rayon. La `famille` classe par OCCASION,
    // pas par cadence — « seul, tout de suite, sans réunir personne » — et
    // c'est exactement la sienne. Il n'a en revanche PAS de journée : aucun
    // puzzle du jour, aucune foule à comparer, donc pas de place du jour sur sa
    // vignette (`GamesHome` ne l'accorde qu'à `banalo-jour` et `pays`).
    //
    // ⚠️ `minutes` EST UNE MISE, PAS UNE DURÉE. Un incrémental ne finit pas : le
    // chiffre annonce ce qu'il faut y mettre pour voir la deuxième moitié du jeu
    // — mesuré, une quarantaine d'agitations pour que la meilleure molécule
    // paraisse, puis l'atelier. Annoncer « ∞ » serait honnête et inutilisable.
    slug: "soupe",
    famille: "quotidien",
    status: "live",
    // 🧫 la boîte de culture : un rond dans un cercle, lisible à 16 px, et c'est
    // littéralement le récipient du jeu. 🧪 a été écarté — l'éprouvette est un
    // trait fin qui disparaît en vignette, et elle dit « chimie scolaire ».
    emoji: "🧫",
    skin: SOUPE_SKIN,
    route: "/games/soupe",
    bestWith: "1",
    minutes: "10",
  },
  {
    // ⚠️ LE SEUL JEU DU CATALOGUE SANS PLAFOND DE JOUEURS, et `bestWith` doit
    // le dire au lieu d'inventer une fourchette. Les autres tiennent parce
    // qu'ils rendent une ligne d'interface par joueur ; celui-ci ne rend que
    // des compteurs (~519 octets, la même réponse à neuf comme à six cents),
    // précisément pour que « et si on était deux cents ? » soit une bonne
    // question et pas une panne.
    //
    // `minutes` est une estimation honnête et rien de plus : une partie
    // d'échecs dure ce qu'elle dure. À quatre joueurs qui délibèrent vite,
    // comptez trois quarts d'heure.
    slug: "echecs",
    famille: "strategie",
    status: "live",
    emoji: "♟️",
    skin: ECHECS_SKIN,
    route: "/games/echecs",
    bestWith: "4+",
    minutes: "45",
  },
];

export const LIVE_GAMES = GAMES.filter((g) => g.status === "live");

/**
 * L'ORDRE DES FAMILLES SUR LA PORTE « JOUER », et il n'est pas décoratif : le
 * quotidien vient en tête parce que c'est le SEUL rayon jouable tout de suite,
 * seul, sans réunir personne. Un visiteur qui arrive à trois heures du matin
 * doit pouvoir jouer avant d'avoir à organiser quoi que ce soit.
 */
/**
 * ⚠️ « STRATÉGIE » N'EST PAS UN QUATRIÈME RAYON DÉCORATIF. Les échecs
 * collaboratifs n'entrent dans aucun des trois autres, et le vérifier prend une
 * phrase : « Tomber d'accord », c'est marquer EN PENSANT COMME LES AUTRES, SANS
 * SE PARLER — l'inverse exact d'une équipe qui délibère à voix haute avant de
 * voter son coup. Et deux camps qui s'affrontent ne sont pas une enquête.
 *
 * Il vient APRÈS l'accord et AVANT les enquêtes, dans la même logique
 * d'organisation croissante : réunir deux équipes coûte plus que se réunir tout
 * court, et moins que préparer une soirée entière.
 */
export const FAMILLES = ["quotidien", "accord", "strategie", "enquete"] as const;

export function gamesParFamille(famille: string): GameEntry[] {
  return GAMES.filter((g) => g.famille === famille);
}

export function gameBySlug(slug: string): GameEntry | undefined {
  return GAMES.find((g) => g.slug === slug);
}

/** Où mène un code de salle, selon le jeu que la salle déclare. */
export function roomPath(slug: string, code: string): string {
  const g = gameBySlug(slug);
  return `${g?.route ?? "/games"}/${code.toUpperCase()}`;
}
