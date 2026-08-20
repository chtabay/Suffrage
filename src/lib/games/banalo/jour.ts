// LA JOURNÉE DE BANALO DU JOUR — et elle ne commence pas à minuit.
//
// ⚠️ LA CHARNIÈRE EST À 11 H 30, HEURE DE PARIS. Le résultat de la veille est
// alors déjà là quand on part déjeuner, et la nouvelle question s'ouvre juste
// avant la pause — le créneau où se joue Pédantix. La boucle tombe juste : la
// question ouvre à 11 h 30 et se ferme à 11 h 30 le lendemain, donc le résultat
// clos de la veille est prêt exactement quand la nouvelle s'ouvre.
//
// ⚠️ LA JOURNÉE N'EST DONC PAS UNE JOURNÉE CIVILE, et c'est ce qui interdit de
// réutiliser `dateCivile` de Cinq sur cinq. Trois conséquences qui se paient
// ailleurs si on les oublie :
//
//  · **Ne jamais afficher une date à côté du numéro de journée.** À 11 h 00 et à
//    12 h 00 le même mardi, on est sur deux journées de jeu différentes. « Vous
//    avez joué aujourd'hui et hier » un même mardi est exact et illisible. On
//    dit la fenêtre — « jusqu'à 11 h 30 demain » — pas la date.
//
//  · **La clé de stockage et la ligne de résultat portent le numéro**, pas la
//    date. Elles suivent donc la charnière sans rien savoir d'elle.
//
//  · **« 11 h 30 à Paris » ne s'écrit pas dans un cron.** `pg_cron` planifie en
//    UTC et Paris passe de UTC+1 à UTC+2 : une planification fixe traverserait
//    le déjeuner deux fois par an. Le motif du dépôt est le bon — planifier
//    toutes les heures et laisser le SQL trancher, comme `scrutin-game-purge`.
//
// ⚠️ ET LE FUSEAU EST UN CHOIX, PAS UNE ÉVIDENCE. 11 h 30 à Paris, c'est 5 h 30
// à New York et 19 h 30 à Tokyo : ça marche pour l'Europe et pour Lagos, pas
// pour les Amériques. Minuit, chez Cinq sur cinq, est neutre — personne n'attend
// que minuit-Paris soit sa pause déjeuner. Ici on optimise explicitement un
// fuseau, ce qui est défendable pour un produit d'abord français mais doit
// rester une décision, pas un héritage.
import { QUESTIONS } from "@/content/banalo/questions";

export const FUSEAU = "Europe/Paris";

/** Minutes après minuit où la journée bascule : 11 h 30. */
export const CHARNIERE_MINUTES = 11 * 60 + 30;

/**
 * Origine du calendrier : la journée n° 1. C'est le jour de mise en ligne.
 *
 * ⚠️ ELLE NE SE DÉPLACE PLUS APRÈS LA PUBLICATION. Le numéro choisit la
 * question, s'affiche à l'écran et voyage dans le partage : les trois
 * deviendraient faux ensemble.
 */
export const ORIGINE = "2026-08-20";

// On demande l'heure ET la date à `Intl` plutôt que de soustraire des heures :
// le décalage de Paris vaut +1 ou +2 selon la saison, et une soustraction fixe
// ferait basculer la journée une heure trop tôt six mois par an.
const PARIS = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSEAU,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** La veille d'une date ISO, calculée à midi UTC — aucun changement d'heure en vue. */
function veille(dateIso: string): string {
  const d = new Date(Date.parse(`${dateIso}T00:00:00Z`) - 86_400_000);
  return d.toISOString().slice(0, 10);
}

/**
 * La date de la journée de JEU, `AAAA-MM-JJ`.
 *
 * Avant 11 h 30 à Paris, on joue encore la journée de la veille : c'est elle qui
 * est ouverte, et c'est son résultat qu'on n'a pas encore.
 */
export function journeeCivile(quand: Date = new Date()): string {
  const p: Record<string, string> = {};
  for (const { type, value } of PARIS.formatToParts(quand)) p[type] = value;
  // `hour` peut valoir « 24 » à minuit selon l'implémentation de `hour12: false`.
  const heures = Number(p.hour) % 24;
  const minutes = heures * 60 + Number(p.minute);
  const date = `${p.year}-${p.month}-${p.day}`;
  return minutes < CHARNIERE_MINUTES ? veille(date) : date;
}

/** Numéro de journée depuis l'origine : 1 le premier jour. */
export function numeroDeJournee(dateIso: string): number {
  // Minuit UTC des deux dates : la soustraction ne traverse aucun changement
  // d'heure, puisqu'il n'y en a pas en UTC.
  const ms = Date.parse(`${dateIso}T00:00:00Z`) - Date.parse(`${ORIGINE}T00:00:00Z`);
  return Math.floor(ms / 86_400_000) + 1;
}

/** Le numéro de la journée ouverte en ce moment. */
export function numeroDuJour(quand: Date = new Date()): number {
  return numeroDeJournee(journeeCivile(quand));
}

/**
 * Quand la journée en cours se ferme, en millisecondes depuis l'époque.
 *
 * Sert à l'écran pour dire « jusqu'à 11 h 30 demain » sans jamais afficher une
 * date, et pour savoir quand redemander la question au serveur.
 */
export function finDeJournee(quand: Date = new Date()): number {
  const ouverte = journeeCivile(quand);
  // On cherche le premier instant à partir duquel la journée suivante commence.
  // Une recherche à la minute serait exacte mais lente ; on part de midi UTC le
  // lendemain de la date ouverte, puis on ajuste au quart d'heure.
  let t = Date.parse(`${ouverte}T00:00:00Z`) + 86_400_000;
  // La charnière tombe entre 09 h 30 et 10 h 30 UTC selon la saison ; on balaie
  // large et on s'arrête au premier instant qui a changé de journée.
  for (let m = 0; m <= 24 * 60; m += 5) {
    const essai = t + m * 60_000;
    if (journeeCivile(new Date(essai)) !== ouverte) return essai;
  }
  return t;
}

/** Combien de journées avant que le stock ne recommence. */
export const NB_JOURNEES = QUESTIONS.length;
