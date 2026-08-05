# Identité de participant et vue du connecté — plan P0→P3

Validé le 2026-08-05. Fait suite à `docs/cercles-spec.md`, dont il corrige une
orientation : les cercles avaient produit un **second parcours de création**
parallèle au parcours normal. Ce document acte qu'il doit disparaître, et pose
d'abord ce dont tout le reste dépend.

## 1. Le constat qui commande tout

**Un compte connecté n'était jamais un participant dans Placet, seulement un
organisateur.** Vérifié en base : les seules colonnes reliées à `auth.users` sont
`owner_id` (espaces, événements), `created_by` (scrutins), plus admin/marque/push.
`scrutin_members` — l'appartenance à un cercle — n'avait **aucun** lien de compte.
La participation était portée par un jeton reçu par email, ou par une entrée
`localStorage` liée à l'appareil.

Sur les cinq colonnes d'une vue « ce qui m'attend », **trois étaient
incalculables** :

| Colonne | État avant P0 |
|---|---|
| Sondages publics | ✅ `/explorer` |
| Ceux que j'ai créés | ✅ écran « mes scrutins » |
| Ceux auxquels je participe | ❌ aucun lien compte ↔ bulletin |
| Ceux ouverts par mes cercles | ❌ aucun lien compte ↔ `scrutin_members` |
| Mon historique | ❌ `localStorage`, perdu au changement d'appareil |

## 2. Le concept manquant : l'audience

« Qui peut voter » est aujourd'hui éparpillé sur **quatre mécanismes** qui ne se
parlent pas — `access_mode`, `visibility`, la convocation d'événement, et
`open_circle_consultation`. Trois combinaisons seulement sont utilisées en
pratique : c'est le signe qu'il n'y a pas quatre concepts mais **un seul**, mal
découpé.

> **Un scrutin a UNE audience** : publique (indexée), par lien (qui l'a, vote),
> ou par roster (un groupe, un segment). Le secret, le seuil et le plafond sont
> des propriétés attachées à ce choix.

**Ce qui doit survivre à la fusion**, et qui n'est pas cosmétique : les quatre
garanties du parcours cercle (convoquer tout le segment ou refuser, seuil de 5 en
scellé, plafond du jour, scellé par construction). Si « audience = mon cercle »
devient un simple menu déroulant, **le bulletin scellé redevient cassable**. Les
garanties s'attachent au *type d'audience*, jamais au *chemin de création*.

## 3. Les séquences existent déjà

Une suite de questions posée à un groupe, c'est `scrutin_events` avec plusieurs
résolutions. Le modèle est bon ; c'est le **vocabulaire** qui bloque — personne ne
cherche « créer un événement » pour poser trois questions à son équipe.

## 4. Sur la vue « façon Polymarket » — une mise en garde

Polymarket fonctionne parce qu'un marché a un **prix et un volume** : des nombres
continus, comparables, qui bougent. Un scrutin n'a ni l'un ni l'autre avant sa
clôture, et la plupart sont volontairement secrets. Copier la grille sans le
signal sous-jacent donne un mur de cartes mortes.

Ce qui rend une carte Placet vivante est différent : **le temps qui reste, le taux
de participation, et surtout « ai-je répondu ? »**. La vue doit être une **file
d'attente d'actions**, plus proche d'une boîte de réception que d'une place de
marché.

## 5. Découpage

| Lot | Contenu | État |
|---|---|---|
| **P0 — Identité de participant** | `scrutin_member_links`, rattachement sur email vérifié, RPC de lecture | ✅ livré |
| **P1 — L'audience comme concept unique** | audience portée par le scrutin, garanties attachées au type | à faire |
| **P2 — La vue du connecté** | à répondre / mes cercles / créés / historique / public | à faire |
| **P3 — Fusion des parcours + vocabulaire** | le sélecteur d'audience entre dans le parcours normal, le formulaire du cercle disparaît | à faire |

**Ordre imposé** : P0 avant tout le reste (P2 ne peut afficher que deux colonnes
sur cinq sans lui). P1 avant P3.

## 6. Hors périmètre, explicitement

Le **fonctionnement sans compte ne bouge pas** : lien partagé, vote anonyme,
aucune inscription. C'est ce qui permet de lancer un vote en trente secondes, et
rien dans ce plan n'y touche.

## 7. Ce que P0 a livré, et ses trois gardes

- `scrutin_member_links` — table **séparée** de `scrutin_members`, parce que cette
  dernière est lisible par l'animateur : il n'a pas à apprendre quels membres ont
  un compte Placet.
- `link_my_memberships()` — rattache sur **email vérifié uniquement**
  (`email_confirmed_at`), sinon s'inscrire avec l'adresse d'un tiers suffirait à
  hériter de ses cercles. Idempotent, appelé à chaque connexion.
- **Aucune policy d'INSERT** sur la table : un identifiant de membre suffirait
  sinon à s'attribuer une appartenance. L'écriture passe par la RPC.
- `get_my_participations()` — ne lit **jamais** un bulletin ; l'état « répondu »
  vient de l'émargement en scellé, du rattachement du bulletin sinon.

Se défaire d'un lien (`unlinkMembership`) et **quitter un cercle**
(`leave_circle`, qui efface les données) sont deux gestes distincts qu'il ne faut
pas confondre.

## 8. Reste à traiter, connu

- **Historique des scrutins publics** : encore en `localStorage`. Il faudra un
  registre de participation `(compte, scrutin)` — jamais le bulletin, sur le
  modèle de l'émargement — pour qu'un historique survive au changement d'appareil.
- **Rattachement rétroactif** : un membre ajouté APRÈS la dernière connexion de
  son compte ne sera lié qu'à la connexion suivante. Acceptable, à surveiller si
  la vue P2 semble « vide » à des utilisateurs qui viennent d'être convoqués.
