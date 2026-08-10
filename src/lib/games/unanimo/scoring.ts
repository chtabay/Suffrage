// LES RÈGLES D'UNANIMO — spécifiques au jeu, isolées, testées.
//
// ─────────────────────────────────────────────────────────────────────────────
// QUI FAIT FOI. Le dépouillement RÉEL a lieu en base, dans
// `scrutin_game_unanimo_reveal` (migration 20260810) : c'est le seul écrivain,
// il est atomique, et aucun joueur ne peut lui souffler un résultat. Ce fichier
// est la SPÉCIFICATION EXÉCUTABLE de la même règle — il sert à trois choses :
//   1. la fixer par des tests (`scoring.test.ts`) plutôt que par un commentaire ;
//   2. l'EXPLIQUER à l'écran, quand un joueur conteste un point ;
//   3. rendre le barème remplaçable en un endroit lisible.
// Toute correction ici doit être reportée dans la fonction SQL, et l'inverse.
// Ce n'est pas une précaution théorique : les deux ont DÉJÀ divergé une fois sur
// le choix du libellé affiché, et c'est un test qui l'a vu (voir plus bas).
// ─────────────────────────────────────────────────────────────────────────────
//
// LA RÈGLE OFFICIELLE, vérifiée avant d'écrire une ligne (règle Cocktail Games,
// et sa formulation la plus répandue chez les revendeurs) :
//
//     « Les mots rapportent un nombre de points équivalent au nombre de joueurs
//       les ayant cités. Un mot cité par trois joueurs rapporte trois points à
//       chacun de ceux qui l'ont trouvé. Si on est seul à avoir trouvé un mot,
//       on ne marque pas de point. »
//
// Autrement dit : N joueurs → N points chacun, et 0 quand N = 1. Ce n'est PAS
// « N-1 » : la marche entre être seul (0) et être deux (2 chacun) est franche,
// et c'est elle qui pousse à chercher l'évidence partagée plutôt que le mot
// rare. La variante douce reste disponible ci-dessous — un seul mot à changer.
//
// Non repris en V1, et c'est délibéré : le bonus de 5 points au-delà d'un seuil
// variable selon le nombre de joueurs (il demande une table par effectif et
// n'ajoute rien au plaisir du premier soir), et l'interdiction des mots de même
// racine que le thème — dont seule la forme EXACTE du thème est écartée.

/** Barèmes disponibles. `official` est celui du jeu ; changer = changer ce nom. */
export const SCORING_RULES = {
  /** Règle du jeu : N joueurs → N points chacun ; seul → 0. */
  official: (shared: number) => (shared >= 2 ? shared : 0),
  /** Variante douce : un point par AUTRE joueur ayant écrit le mot. */
  gentle: (shared: number) => Math.max(shared - 1, 0),
} as const;

export type ScoringRule = keyof typeof SCORING_RULES;

/** Le barème en vigueur. Doit rester d'accord avec `scrutin_game_unanimo_points`. */
export const ACTIVE_RULE: ScoringRule = "official";

/** Points gagnés par CHACUN des `shared` joueurs ayant écrit le même mot. */
export function wordPoints(shared: number, rule: ScoringRule = ACTIVE_RULE): number {
  return SCORING_RULES[rule](Math.max(0, Math.trunc(shared)));
}

// ───────────────────────────────────────────────────────── normalisation
//
// ⚠️ CE N'EST PAS L'AUTORITÉ. `scrutin_game_norm` en base l'est. Cette copie
// existe pour deux usages où le serveur n'est pas joignable assez vite :
// prévenir le joueur qu'il écrit deux fois le même mot dans SA liste, et lui
// montrer pourquoi « Plages » a compté comme « plage ». Si les deux divergent
// d'un caractère, c'est la base qui a raison — et c'est le test qui doit crier.
//
// Trois gestes, dans cet ordre :
//   1. minuscules, ligatures dépliées, accents pliés ;
//   2. tout ce qui n'est ni lettre ni chiffre devient une espace, puis on réduit
//      (« porte-avions » = « porte avions ») ;
//   3. pluriel : on retire un « s » final si le radical garde 4 caractères.
//      Seuil ASSUMÉ : en dessous, « mois » et « moi » fusionneraient — un faux
//      positif, bien plus grave dans un jeu qu'un faux négatif. Conséquence
//      connue : « mer » et « mers » restent deux mots.
const ACCENTS: Record<string, string> = {
  á: "a", à: "a", â: "a", ä: "a", ã: "a", å: "a", ā: "a",
  é: "e", è: "e", ê: "e", ë: "e", ē: "e",
  í: "i", ì: "i", î: "i", ï: "i", ī: "i",
  ó: "o", ò: "o", ô: "o", ö: "o", õ: "o", ø: "o", ō: "o",
  ú: "u", ù: "u", û: "u", ü: "u", ū: "u",
  ý: "y", ÿ: "y", ñ: "n", ç: "c", š: "s", ž: "z",
};

/** Hors ASCII imprimable : les seuls caractères candidats au pliage. */
const NON_ASCII = /[^ -~]/g;

export function normalizeWord(input: string): string {
  const folded = (input ?? "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    // Table explicite plutôt que NFD + retrait des diacritiques : la base ne
    // plie QUE les caractères listés, et une normalisation plus large ici
    // divergerait en silence (« ø » n'est pas un « o » accentué au sens Unicode).
    .replace(NON_ASCII, (c) => ACCENTS[c] ?? c);
  const cleaned = folded.replace(/[^a-z0-9]+/g, " ").replace(/ +/g, " ").trim();
  return /[^s]s$/.test(cleaned) && cleaned.length >= 5 ? cleaned.slice(0, -1) : cleaned;
}

// ─────────────────────────────────────────────────── dépouillement (référence)

export interface RoundEntry {
  player: string;
  words: string[];
}

export interface ScoredWord {
  label: string;
  norm: string;
  count: number;
  points: number;
  players: string[];
}

export interface ScoredRound {
  words: ScoredWord[];
  /** Points de la manche, par joueur — y compris 0 pour qui n'a rien marqué. */
  points: Record<string, number>;
}

/**
 * Dépouille une manche.
 *
 * DEUX RÈGLES DE PRÉSENTATION CHOISIES POUR NE DÉPENDRE D'AUCUNE COLLATION :
 *   • par joueur, à normalisation égale, on garde la forme écrite EN PREMIER ;
 *   • pour le groupe, la forme la plus fréquente ; à égalité, la première
 *     rencontrée dans l'ordre des joueurs.
 *
 * La première version triait ces égalités par ordre alphabétique et donnait
 * « plage » là où la base donnait « Plage » : comparer « Plage » et « plage »
 * dépend de la collation de la base, donc deux implémentations ne peuvent pas
 * s'accorder par ce chemin. Le pointage, lui, n'en a jamais dépendu — mais le
 * mot affiché en tête de la révélation, oui, et c'est ce qu'on lit d'abord.
 */

/**
 * Les formes qui ne comptent pas : le thème entier, et chacun de ses mots pleins.
 *
 * ⚠️ COMPARER LA CHAÎNE ENTIÈRE NE SUFFIT PAS, et c'est le défaut qui vidait la
 * règle. Les thèmes portent un article — « La mer », « El mar » — donc le thème
 * normalisé vaut « la mer », et « mer » n'était pas exclu. Or « mer » est
 * précisément le mot que tout le monde écrit : il rapportait donc le MAXIMUM à
 * chaque manche, alors que l'écran annonce en quatre langues que le thème ne
 * compte pas.
 *
 * Les jetons de moins de trois lettres sont ignorés (« la », « el », « di ») :
 * ils ne sont jamais une réponse plausible, et les exclure ne protégerait de
 * rien tout en risquant d'écarter un mot légitime.
 *
 * Miroir exact de `v_theme_words` dans `scrutin_game_unanimo_reveal` — les deux
 * doivent bouger ensemble.
 */
function themeTokens(theme: string): Set<string> {
  const norm = normalizeWord(theme);
  const out = new Set<string>(norm ? [norm] : []);
  for (const w of norm.split(" ")) if (w.length >= 3) out.add(w);
  return out;
}
export function scoreRound(entries: RoundEntry[], theme = "", rule: ScoringRule = ACTIVE_RULE): ScoredRound {
  const themeWords = themeTokens(theme);
  const groups = new Map<string, { players: string[]; shown: string[] }>();
  const points: Record<string, number> = {};

  for (const e of entries) {
    points[e.player] = 0;
    const seen = new Set<string>();
    for (const raw of e.words) {
      const norm = normalizeWord(raw);
      if (norm === "" || themeWords.has(norm) || seen.has(norm)) continue;
      seen.add(norm);
      const g = groups.get(norm) ?? { players: [], shown: [] };
      g.players.push(e.player);
      g.shown.push(raw.trim().slice(0, 40));
      groups.set(norm, g);
    }
  }

  const words: ScoredWord[] = [...groups.entries()]
    .map(([norm, g]) => {
      const tally = new Map<string, number>();
      for (const s of g.shown) tally.set(s, (tally.get(s) ?? 0) + 1);
      // Fréquence maximale, puis PREMIÈRE forme qui l'atteint : aucune
      // comparaison de chaînes, donc aucune collation dans l'équation.
      const best = Math.max(...tally.values());
      const label = g.shown.find((s) => tally.get(s) === best) as string;
      return {
        label,
        norm,
        count: g.players.length,
        points: wordPoints(g.players.length, rule),
        players: [...g.players],
      };
    })
    // À nombre égal, on ordonne sur `norm` : ASCII minuscule, même ordre partout.
    .sort((a, b) => b.count - a.count || (a.norm < b.norm ? -1 : a.norm > b.norm ? 1 : 0));

  for (const w of words) for (const p of w.players) points[p] = (points[p] ?? 0) + w.points;
  return { words, points };
}
