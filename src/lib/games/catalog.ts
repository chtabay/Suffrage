// CATALOGUE DES JEUX — trois lignes de données, pas un système.
//
// Assez pour que la porte « Jouer » se remplisse toute seule et que le code de
// salle sache où envoyer le joueur, et rien de plus : pas de plugins, pas de
// registre dynamique, pas de manifeste. Ajouter un jeu = une entrée ici + un
// dossier de composants. Le jour où il y en aura cinq, on saura ce qu'il faut
// vraiment généraliser ; l'inventer maintenant serait deviner.
import { ALIBI_SKIN, FANTOME_SKIN, PAYS_SKIN, RODEURS_SKIN, UNANIMO_SKIN, type GameSkin } from "./skin";

export interface GameEntry {
  /** Slug technique, aussi la valeur de `scrutin_game_rooms.game`. */
  slug: string;
  /**
   * La FAMILLE sous laquelle la porte « Jouer » range le jeu.
   *
   * Elle ne classe pas par genre mais par OCCASION — ce qui décide si un jeu est
   * seulement possible ce soir. « Nous sommes huit après le dîner » et « j'ai
   * trois minutes » ne mènent pas au même rayon, et c'est la question que se
   * pose un visiteur avant celle du thème.
   */
  famille: "quotidien" | "accord" | "enquete";
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
    // LE SEUL JEU SOLO, ET LE SEUL QUOTIDIEN. Il n'a pas de salle : son « code »
    // est la date, la même pour tout le monde. D'où `route` sans `/<code>` —
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
];

export const LIVE_GAMES = GAMES.filter((g) => g.status === "live");

/**
 * L'ORDRE DES FAMILLES SUR LA PORTE « JOUER », et il n'est pas décoratif : le
 * quotidien vient en tête parce que c'est le SEUL rayon jouable tout de suite,
 * seul, sans réunir personne. Un visiteur qui arrive à trois heures du matin
 * doit pouvoir jouer avant d'avoir à organiser quoi que ce soit.
 */
export const FAMILLES = ["quotidien", "accord", "enquete"] as const;

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
