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

export function journalise(evt: Evenement, champs: Record<string, string | number | boolean>) {
  // Une seule ligne, un seul objet : les journaux d'hébergeur découpent les
  // lignes, pas les objets.
  console.log(JSON.stringify({ jeu: "pays", evt, ...champs }));
}
