// CATALOGUE DES JEUX — trois lignes de données, pas un système.
//
// Assez pour que la porte « Jouer » se remplisse toute seule et que le code de
// salle sache où envoyer le joueur, et rien de plus : pas de plugins, pas de
// registre dynamique, pas de manifeste. Ajouter un jeu = une entrée ici + un
// dossier de composants. Le jour où il y en aura cinq, on saura ce qu'il faut
// vraiment généraliser ; l'inventer maintenant serait deviner.
import { PLACET_GAMES_SKIN, UNANIMO_SKIN, type GameSkin } from "./skin";

export interface GameEntry {
  /** Slug technique, aussi la valeur de `scrutin_game_rooms.game`. */
  slug: string;
  /** `soon` = emplacement annoncé, sans salle possible. */
  status: "live" | "soon";
  emoji: string;
  skin: GameSkin;
  /** Racine des pages du jeu ; la salle vit à `${route}/<code>`. */
  route: string;
  /** Nombre de joueurs conseillé, à titre indicatif — jamais une limite. */
  bestWith: string;
  minutes: string;
}

export const GAMES: GameEntry[] = [
  {
    slug: "unanimo",
    status: "live",
    emoji: "🧠",
    skin: UNANIMO_SKIN,
    route: "/games/unanimo",
    bestWith: "3–12",
    minutes: "15",
  },
  {
    // Annoncé parce qu'il l'est vraiment (il réutilisera la même salle), et pour
    // qu'on comprenne que « Jouer » est un lieu et non une page. Aucune autre
    // case fantôme : un catalogue inventé se remarque.
    slug: "loup-garou",
    status: "soon",
    emoji: "🐺",
    skin: PLACET_GAMES_SKIN,
    route: "/games",
    bestWith: "6–18",
    minutes: "30",
  },
];

export const LIVE_GAMES = GAMES.filter((g) => g.status === "live");

export function gameBySlug(slug: string): GameEntry | undefined {
  return GAMES.find((g) => g.slug === slug);
}

/** Où mène un code de salle, selon le jeu que la salle déclare. */
export function roomPath(slug: string, code: string): string {
  const g = gameBySlug(slug);
  return `${g?.route ?? "/games"}/${code.toUpperCase()}`;
}
