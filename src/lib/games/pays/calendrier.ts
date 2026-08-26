// LE CALENDRIER DE CINQ SUR CINQ — quelle journée on est, et rien d'autre.
//
// ⚠️ CE FICHIER EST LE SEUL DU JEU QUE LE NAVIGATEUR PEUT LIRE. `moteur.ts`
// touche les critères, `journee.ts` touche les réponses : ni l'un ni l'autre ne
// doit entrer dans un bundle client. Or l'accueil de Placet a besoin du NUMÉRO
// de la journée pour sa carte — un entier, qui ne dit rien du puzzle.
//
// Il n'importe donc RIEN. Pas de critères, pas de pays, pas de journées : trois
// fonctions de date et deux constantes. C'est ce qui garantit qu'on ne peut pas
// faire fuiter le jeu en s'en servant.
//
// `moteur.ts` le réexporte, pour que le serveur continue de tout trouver au
// même endroit qu'avant.

/**
 * Fuseau produit. Explicite, parce qu'un jeu quotidien SANS fuseau déclaré
 * change de journée au milieu d'une partie pour la moitié de ses joueurs.
 */
export const FUSEAU = "Europe/Paris";

/**
 * Origine du calendrier : la journée n° 1. C'est le JOUR DE MISE EN LIGNE.
 *
 * ⚠️ ELLE NE SE DÉPLACE PLUS APRÈS LA PUBLICATION. Le numéro sert à trois
 * choses — choisir le puzzle, s'afficher à l'écran, et voyager dans le texte de
 * partage — et les trois deviennent fausses ensemble si on la bouge : un joueur
 * qui a partagé « n° 12 » verrait sa capture désigner une autre journée, et le
 * stock rejouerait des puzzles déjà sortis.
 *
 * Avant le lancement, en revanche, elle DEVAIT bouger. Fixée au 1er janvier,
 * elle faisait ouvrir le jeu sur la journée n° 230 — un compteur qui annonce
 * huit mois d'existence le jour de la sortie — et sur le dix-huitième puzzle du
 * stock, donc pas sur la séquence relue et validée.
 */
export const ORIGINE = "2026-08-18";

const CIVIL = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSEAU,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * La date CIVILE à Paris, `AAAA-MM-JJ`.
 *
 * On passe par `Intl` plutôt que par un décalage en heures : le décalage de
 * Paris vaut +1 ou +2 selon la saison, et une soustraction fixe fait basculer la
 * journée une heure trop tôt six mois par an.
 */
export function dateCivile(quand: Date = new Date()): string {
  return CIVIL.format(quand);
}

/** Numéro de journée depuis l'origine : 1 le premier jour. */
export function numeroDeJournee(dateIso: string): number {
  const jour = 86_400_000;
  // ⚠️ ELLE REFUSE CE QUI N'EST PAS UNE DATE CIVILE, ET C'EST UNE CICATRICE.
  // La concaténation ci-dessous transforme un horodatage ISO complet en
  // « 2026-08-25T17:20:32.183ZT00:00:00Z » : `Date.parse` rend `NaN`, le calcul
  // rend `NaN`, JSON le sérialise en `null`, et la fonction SQL de la tournée
  // sort sur son garde SANS RIEN DIRE. Les notifications des deux jeux sont
  // restées mortes des semaines en répondant `{"vises":0}` toutes les heures.
  // Une entrée invalide doit CASSER, pas rendre un nombre qui n'en est pas un.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    throw new Error(`numeroDeJournee attend une date civile AAAA-MM-JJ, reçu : ${dateIso}`);
  }
  // Minuit UTC des deux dates civiles : la soustraction ne traverse alors aucun
  // changement d'heure, puisqu'il n'y en a pas en UTC.
  const ms = Date.parse(`${dateIso}T00:00:00Z`) - Date.parse(`${ORIGINE}T00:00:00Z`);
  return Math.floor(ms / jour) + 1;
}
