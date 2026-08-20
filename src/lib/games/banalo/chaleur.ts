// LA CHALEUR DU SCORE — « tu brûles », en couleur et en un mot.
//
// Le score est un nombre précis (0 à 100, au dixième), et un nombre précis se
// lit lentement : il faut le comparer à 100, puis se souvenir de ce que vaut 87.
// La chaleur donne le sens AVANT la lecture — c'est la métaphore du jeu de
// cache-cache, qui n'a besoin d'aucune explication en français comme dans les
// trois autres langues.
//
// ⚠️ LA COULEUR NE PORTE JAMAIS SEULE. Elle est doublée d'un MOT (« vous
// brûlez », « tiède », « glacé »), et le nombre reste affiché en grand.
// Quelqu'un qui ne distingue pas le bleu de l'orange perd un renfort, pas
// l'information — la règle vaut pour les 8 % d'hommes qui ne voient pas le
// rouge-vert comme les autres, et pour tout écran mal réglé.
//
// ⚠️ LA RAMPE NE PASSE PAS PAR LE VERT, ET C'EST DÉLIBÉRÉ. Interpoler du bleu
// vers l'orange en RGB traverse naturellement un vert franc vers 40 sur 100 — or
// le vert se lit « c'est bon » dans toute interface, alors qu'à 40 la réponse
// est médiocre. Le milieu est donc un GRIS CHAUD (saturation 0,06) : « ni chaud
// ni froid » se dit mieux par l'absence de couleur que par une couleur de plus.
//
// ⚠️ ET TOUTE LA RAMPE TIENT 4,5:1. Mesuré à chaque pas de 5 sur les deux fonds
// possibles (la carte blanche et le vert d'eau de la page) : le pire point est à
// 4,53. C'est ce qui force une rampe qui varie en TEINTE et presque pas en
// clarté — un orange vif ou un jaune « chaud » seraient illisibles sur blanc.

/** Les cinq ancres de température, du glacé au brûlant. */
const ANCRES: ReadonlyArray<readonly [number, string]> = [
  [0, "#2B5F9E"], // bleu profond
  [30, "#4A6B87"], // bleu ardoise
  [55, "#6E6257"], // gris chaud — le point neutre
  [80, "#B05A12"], // orange sombre
  [100, "#C0272D"], // rouge braise
];

/**
 * Les paliers de MOT. Grossiers exprès : le mot dit une ambiance, le nombre dit
 * la performance. Un mot par dixième ne voudrait rien dire de plus.
 *
 * Les seuils suivent des écarts énonçables : 90 c'est moins de ×1,26 ; 70 c'est
 * moins de ×2 ; 40 c'est moins de ×4 ; 15 c'est moins de ×7.
 */
const MOTS: ReadonlyArray<readonly [number, string]> = [
  [90, "brule"],
  [70, "chaud"],
  [40, "tiede"],
  [15, "froid"],
  [0, "glace"],
];

const canaux = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

const enHex = (c: number[]): string =>
  "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

/** La couleur d'un score, interpolée entre les ancres. */
export function teinteDe(score: number): string {
  const s = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
  for (let i = 1; i < ANCRES.length; i++) {
    const [borne, haut] = ANCRES[i]!;
    if (s <= borne) {
      const [depart, bas] = ANCRES[i - 1]!;
      const t = (s - depart) / (borne - depart);
      const a = canaux(bas);
      const b = canaux(haut);
      return enHex(a.map((v, k) => v + (b[k]! - v) * t));
    }
  }
  return ANCRES[ANCRES.length - 1]![1];
}

/**
 * Le mot de température d'un score. Rend une CLÉ, jamais un texte : les quatre
 * langues vivent dans `messages/*.json`, sous `BanaloJour.chaleur.*`.
 */
export function motDe(score: number): string {
  const s = Number.isFinite(score) ? score : 0;
  for (const [seuil, cle] of MOTS) if (s >= seuil) return cle;
  return "glace";
}

/**
 * Les cinq blocs du PARTAGE, un par palier de chaleur.
 *
 * ⚠️ DES EMOJI, PARCE QU'UN PARTAGE N'A PAS DE CSS. Le texte part dans une
 * messagerie qui ne connaît ni la rampe ni les tokens du skin : la seule couleur
 * qui voyage est celle d'un caractère. On perd la finesse du dégradé — cinq
 * paliers au lieu d'un continuum — et c'est acceptable ici, parce que le partage
 * raconte une forme, pas un score : le score exact est déjà dans le titre.
 *
 * ⚠️ LE BLANC EST LA GLACE, PAS LE VIDE. Le palier le plus froid pouvait se dire
 * en noir (⬛), qui se lit « raté » dans une grille de jeu, ou en blanc (⬜), qui
 * se lit « gelé » à côté d'un bleu. On garde donc la métaphore de température de
 * bout en bout plutôt que de mélanger deux langages.
 */
const BLOCS: Record<string, string> = {
  brule: "🟥",
  chaud: "🟧",
  tiede: "🟨",
  froid: "🟦",
  glace: "⬜",
};

/** Le bloc d'un score, pour le partage. */
export function blocDe(score: number): string {
  return BLOCS[motDe(score)] ?? BLOCS.glace!;
}
