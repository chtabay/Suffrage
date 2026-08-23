// LES TEXTES DES NOTIFICATIONS — quatre langues, et PAS dans `messages/*.json`.
//
// ⚠️ CE N'EST PAS UNE ENTORSE À LA RÈGLE DE PARITÉ, C'EST LE MOTIF QUE LE DÉPÔT
// APPLIQUE DÉJÀ. Le contrôle de parité résout `const t = useTranslations("NS")`
// puis un appel de traduction à clé littérale : il ne voit QUE les composants
// React. ⚠️ Et il lit aussi les COMMENTAIRES — écrire cet appel en exemple ici
// le faisait signaler comme clé manquante, ce qui a cassé le build. Une
// notification, elle, ne
// traverse jamais React — elle est rendue par une route de cron, sans requête,
// sans locale de contexte, pour un destinataire dont la langue vient de la base.
// Mettre ces textes dans `messages/*.json` les y placerait hors de tout contrôle,
// avec l'illusion d'être couverts.
//
// La sortie est celle de `src/content/banalo/noms.ts`, dont `CLAUDE.md` dit :
// « le contrôle de parité ne voyant que `messages/*.json`, ce sont les TESTS de
// `noms.test.ts` qui tiennent les quatre langues de ce fichier ». Ici c'est
// `notifs.test.ts`, et il va plus loin que la parité : il vérifie aussi que
// CHAQUE combinaison que la fonction de décision peut produire a bien un texte.
//
// ⚠️ ET ON N'INTERPOLE PAS DE CLÉ. Chaque fonction prend ses données et rend sa
// phrase ; aucune n'est choisie par un `NOMS[genre + jeu]`. Une combinaison
// oubliée serait alors `undefined` sur le téléphone d'un joueur, en silence.
import { nomDeLangue } from "@/lib/games/langue";

export type Langue = "fr" | "en" | "es" | "pcm";
export const LANGUES: Langue[] = ["fr", "en", "es", "pcm"];

/** `pcm` s'écrit aux conventions anglaises — `Intl` ne le connaît pas. */
const bcp = (l: Langue) => (l === "pcm" ? "en" : l);

export interface Texte {
  titre: string;
  corps: string;
}

const nb = (l: Langue, v: number) =>
  new Intl.NumberFormat(bcp(l), { maximumFractionDigits: 1 }).format(v);

/** « 2026-08 » → « août 2026 ». Le 15 du mois : le 1er bascule à l'ouest de Paris. */
function mois(saison: string, l: Langue): string {
  const [a, m] = saison.split("-").map(Number);
  if (!a || !m) return saison;
  return new Intl.DateTimeFormat(bcp(l), { month: "long", year: "numeric" })
    .format(new Date(Date.UTC(a, m - 1, 15)));
}

// ───────────────────────────────────────────── la clôture d'une journée

export interface DonneesJournee {
  jour: number;
  /** Banalo : le centile. `null` quand le joueur était seul — pas de position. */
  mieux?: number | null;
  /** Cinq sur cinq : le nombre d'essais, et le rang parmi l'effectif du jour. */
  essais?: number | null;
  rang?: number | null;
  sur?: number | null;
}

export function journeeBanalo(d: DonneesJournee, l: Langue): Texte {
  const t = {
    fr: { titre: `Banalo du jour — journée n° ${d.jour}`,
          avec: `${nb(l, d.mieux ?? 0)} % ont fait mieux que vous. C'est arrêté.`,
          seul: `Vous étiez seul à jouer : pas de position ce jour-là.` },
    en: { titre: `Banalo of the day — day ${d.jour}`,
          avec: `${nb(l, d.mieux ?? 0)} % did better than you. That's final.`,
          seul: `You were the only player: no standing that day.` },
    es: { titre: `Banalo del día — jornada n.º ${d.jour}`,
          avec: `${nb(l, d.mieux ?? 0)} % lo hicieron mejor que tú. Es definitivo.`,
          seul: `Fuiste el único jugador: sin posición ese día.` },
    pcm: { titre: `Banalo of di day — day ${d.jour}`,
           avec: `${nb(l, d.mieux ?? 0)} % do beta pass you. E don set.`,
           seul: `Na only you play: no position for dat day.` },
  }[l];
  return { titre: t.titre, corps: d.mieux === null || d.mieux === undefined ? t.seul : t.avec };
}

export function journeePays(d: DonneesJournee, l: Langue): Texte {
  const e = d.essais ?? 0;
  const r = d.rang ?? 0;
  const s = d.sur ?? 0;
  // ⚠️ LE RANG NE VA JAMAIS SANS SON EFFECTIF. « 3e » tout seul ne se lit pas —
  // c'est la règle de la carte de score et du tableau du jour, et c'est le
  // défaut qui avait fait perdre `sur` à la charge utile le 3 septembre.
  return {
    fr: { titre: `Cinq sur cinq — journée n° ${d.jour}`,
          corps: `Trouvé en ${e} essais — ${r}e sur ${s} joueurs.` },
    en: { titre: `Five out of five — day ${d.jour}`,
          corps: `Found in ${e} guesses — ${r} of ${s} players.` },
    es: { titre: `Cinco de cinco — jornada n.º ${d.jour}`,
          corps: `Encontrado en ${e} intentos — ${r}.º de ${s} jugadores.` },
    pcm: { titre: `Five out of five — day ${d.jour}`,
           corps: `You find am for ${e} tries — number ${r} out of ${s} players.` },
  }[l];
}

// ───────────────────────────────────────────── le bilan de la semaine

export interface DonneesHebdo {
  semaine: string;
  journees: number;
  points: number;
  /** Banalo : le meilleur centile. Cinq sur cinq : le plus petit nombre d'essais. */
  meilleur?: number | null;
}

export function hebdoBanalo(d: DonneesHebdo, l: Langue): Texte {
  const j = d.journees;
  const p = nb(l, d.points);
  const m = d.meilleur;
  return {
    fr: { titre: `Banalo du jour — votre semaine`,
          corps: m === null || m === undefined
            ? `${j} journées jouées, ${p} points.`
            : `${j} journées jouées, ${p} points. Au mieux, ${nb(l, m)} % ont fait mieux.` },
    en: { titre: `Banalo of the day — your week`,
          corps: m === null || m === undefined
            ? `${j} days played, ${p} points.`
            : `${j} days played, ${p} points. At best, ${nb(l, m)} % did better.` },
    es: { titre: `Banalo del día — tu semana`,
          corps: m === null || m === undefined
            ? `${j} jornadas jugadas, ${p} puntos.`
            : `${j} jornadas jugadas, ${p} puntos. En el mejor caso, ${nb(l, m)} % lo hicieron mejor.` },
    pcm: { titre: `Banalo of di day — your week`,
           corps: m === null || m === undefined
             ? `${j} days wey you play, ${p} points.`
             : `${j} days wey you play, ${p} points. For your best one, ${nb(l, m)} % do beta.` },
  }[l];
}

export function hebdoPays(d: DonneesHebdo, l: Langue): Texte {
  const j = d.journees;
  const p = nb(l, d.points);
  const m = d.meilleur ?? 0;
  return {
    fr: { titre: `Cinq sur cinq — votre semaine`,
          corps: `${j} journées jouées, ${p} points. Meilleure partie : ${m} essais.` },
    en: { titre: `Five out of five — your week`,
          corps: `${j} days played, ${p} points. Best game: ${m} guesses.` },
    es: { titre: `Cinco de cinco — tu semana`,
          corps: `${j} jornadas jugadas, ${p} puntos. Mejor partida: ${m} intentos.` },
    pcm: { titre: `Five out of five — your week`,
           corps: `${j} days wey you play, ${p} points. Your best game: ${m} tries.` },
  }[l];
}

// ───────────────────────────────────────────── la fin de saison

export interface DonneesSaison {
  saison: string;
  /** Banalo : la langue du classement. `null` pour Cinq sur cinq. */
  langue?: string | null;
  place: number;
  points: number;
  joueurs: number;
  medaille: boolean;
}

export function saison(d: DonneesSaison, jeu: "banalo" | "pays", l: Langue): Texte {
  const m = mois(d.saison, l);
  const p = nb(l, d.points);
  // ⚠️ LA MÉDAILLE EST DANS LE TITRE ET LE MOIS AVEC, parce qu'une notification
  // se lit sur un écran verrouillé, tronquée : ce qui compte doit tenir dans les
  // premiers mots. Et le nom du jeu suit, parce qu'un joueur des deux reçoit
  // deux notifications ce jour-là et doit les distinguer d'un coup d'œil.
  const jeuNom = {
    fr:  { banalo: "Banalo du jour", pays: "Cinq sur cinq" },
    en:  { banalo: "Banalo of the day", pays: "Five out of five" },
    es:  { banalo: "Banalo del día", pays: "Cinco de cinco" },
    pcm: { banalo: "Banalo of di day", pays: "Five out of five" },
  }[l][jeu];
  const ou = d.langue ? ` (${nomDeLangue(d.langue)})` : "";
  return {
    fr: { titre: d.medaille ? `🏅 ${m} — ${jeuNom}` : `${m} est terminé — ${jeuNom}`,
          corps: `${d.place}e sur ${d.joueurs} joueurs${ou}, ${p} points. La saison repart à zéro.` },
    en: { titre: d.medaille ? `🏅 ${m} — ${jeuNom}` : `${m} is over — ${jeuNom}`,
          corps: `${d.place} of ${d.joueurs} players${ou}, ${p} points. The season starts over.` },
    es: { titre: d.medaille ? `🏅 ${m} — ${jeuNom}` : `${m} ha terminado — ${jeuNom}`,
          corps: `${d.place}.º de ${d.joueurs} jugadores${ou}, ${p} puntos. La temporada vuelve a cero.` },
    pcm: { titre: d.medaille ? `🏅 ${m} — ${jeuNom}` : `${m} don finish — ${jeuNom}`,
           corps: `Number ${d.place} out of ${d.joueurs} players${ou}, ${p} points. Di season dey start again.` },
  }[l];
}
