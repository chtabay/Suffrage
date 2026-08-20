// LES ANALYTICS DU « PAYS DU JOUR » — une ligne de journal par événement.
//
// ⚠️ CE N'EST PAS UNE TABLE, ET C'EST ASSUMÉ. La spec (§13) demande d'instrumenter
// dès le MVP ; la base de Placet est PARTAGÉE avec une autre application et ses
// migrations s'appliquent à la main, sans qu'on puisse les éprouver depuis ici
// (voir CLAUDE.md, « Ce qu'on ne peut pas vérifier »). Créer une table de
// télémétrie à l'aveugle sur une base de production pour un jeu qui n'a pas
// encore prouvé sa boucle, c'est prendre le risque du mauvais côté.
//
// Une ligne JSON sur la sortie standard est ramassée par Vercel, requêtable, et
// ne coûte aucun schéma. Le jour où l'on saura QUELLES questions on pose
// vraiment à ces données, on saura aussi quelle table écrire.
//
// CE QU'ON N'ÉCRIT JAMAIS : pas d'adresse IP, pas d'en-tête, pas d'identifiant
// stable côté serveur. La `partie` est un jeton tiré par le navigateur pour la
// durée d'une partie — de quoi recoudre les essais d'une même partie, rien de
// plus.

export type Evenement =
  | "partie" // la carte est à l'écran
  | "premier" // le premier essai est parti : le délai avant de se lancer
  | "essai" // un pays a été proposé
  | "victoire" // vu du serveur : quel pays, quel jour
  | "fini" // vu du navigateur : en combien d'essais et de secondes
  | "carte-complete" // la vue « comprendre la carte » a été ouverte
  | "source" // un clic sur la source d'un critère
  | "partage";

// LE SCHÉMA DES LIGNES, pour qui interrogera les journaux dans six mois. Chaque
// ligne porte `{"jeu":"pays","evt":…}` plus :
//
//   partie         jour, essais            arrivée sur la carte (essais = reprise)
//   premier        jour, secondes          délai avant de se lancer
//   essai          jour, pays, score, rang un pays proposé, et à quel tour
//   victoire       jour, pays              vu du serveur
//   fini           jour, essais, secondes  vu du navigateur
//   carte-complete jour, essais            la carte complète a été ouverte
//   source         jour                    un clic vers la source d'un critère
//   partage        jour, essais            le résultat a été partagé
//
// Ce qui s'en déduit sans rien ajouter : le taux de victoire (`partie` sans
// `fini`), la difficulté d'une journée (distribution des `essais` de `fini`), la
// courbe d'apprentissage (`score` moyen par `rang`), les sondes d'ouverture
// (`pays` des essais de rang 1), l'appétit pour la révélation
// (`carte-complete` / `victoire`).
//
// Ce qui NE s'en déduit PAS, et c'est délibéré : le retour à J+1. Il faudrait un
// identifiant stable d'un jour sur l'autre, c'est-à-dire un traceur — or la page
// de confidentialité de Placet promet le contraire. Cette mesure-là n'arrive
// qu'avec les comptes, où elle est consentie (`scrutin_game_pays_results`).
export function journalise(evt: Evenement, champs: Record<string, string | number | boolean>) {
  // Une seule ligne, un seul objet : les journaux d'hébergeur découpent les
  // lignes, pas les objets.
  console.log(JSON.stringify({ jeu: "pays", evt, ...champs }));
}
