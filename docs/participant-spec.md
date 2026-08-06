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
| **P1 — L'audience comme concept unique** | colonne `audience` générée, `circle_audience_guard`, `set_poll_audience` | ✅ livré |
| **P2 — La vue du connecté** | `get_my_feed`, page `/mes-votes` | ✅ livré |
| **P3 — Fusion des parcours + vocabulaire** | audience dans le parcours de création, formulaire du cercle disparu, « événement » → « suite de questions » (organisateur) / « consultation » (votant) | ✅ livré |

### Ce que P1 a effectivement changé

`scrutin_polls.audience` est une colonne **générée** (`public` \| `link` \| `roster`)
dérivée de `visibility` et `access_mode` : pas de troisième source de vérité, donc
pas de dérive possible.

Les quatre garanties vivent désormais dans **`circle_audience_guard`**, une seule
implémentation attachée au TYPE d'audience. `open_circle_consultation` n'est plus
qu'un raccourci qui l'appelle, et `set_poll_audience` permet d'affecter une
audience « roster » à n'importe quel scrutin — y compris créé par le parcours
normal. **Vérifié : par ce nouveau chemin, un segment de 3 en scellé est refusé et
le scrutin reste intact.** C'est exactement ce qui rend P3 possible sans rouvrir
l'attaque par cardinalité.

Un scrutin isolé qui reçoit une audience « roster » se voit doter d'un événement
enveloppant, créé de façon transparente : la convocation vit sur l'événement, et
aucun refactor du chemin de vote n'a été nécessaire.

### Ce que P2 a effectivement livré

`get_my_feed()` et la page `/mes-votes` : *ce qui m'attend* (accentué, en tête),
*j'ai répondu*, *ce que j'ai ouvert*, *historique*. Le feed public reste une page
séparée — on y va pour découvrir, pas pour répondre à ce qui nous est adressé.

**Ordre imposé** : P0 avant tout le reste (P2 ne peut afficher que deux colonnes
sur cinq sans lui). P1 avant P3.

### Ce que P3 a effectivement livré (`1c970ae`)

La page de groupe ne porte plus AUCUN formulaire de création : « Créer une
interrogation » ouvre `/new?espace=` (audience pré-réglée, bloc segment/régime
dans la carte de lancement), « Créer une suite de questions » crée un brouillon
et ouvre l'éditeur existant — dont le titre devient renommable en brouillon.
`openCircleConsultation` (client) est purgé ; la RPC subsiste en base comme
raccourci. Vocabulaire : « événement » a disparu de l'écran — « suite de
questions » côté organisateur, « consultation » côté votant ; la route
`/evenement/` ne change pas (une URL n'est pas un libellé, et elle est dans des
emails déjà envoyés).

## 5 bis. La vue marché — spécification (validée avant réalisation)

**Intention.** Découvrir : voir tous les sondages intéressants, en chercher, en
suivre. Distincte de « Mes participations », qui est la file de ce qui m'est
adressé — deux intentions, deux pages.

**Invariant d'accès (posé par Guillaume).** On accède à un cercle en y étant
invité par son responsable ; le public est ouvert à tous. **On n'épingle que ce à
quoi on a accès** : consultations des cercles dont on est participant rattaché,
éléments publics, plus ce qu'on a créé ou qu'on anime. Appliqué en base dans
`toggle_pin` — quatre titres d'accès, et le refus rend le même `false` qu'un
jeton inexistant (pas d'oracle de validité).

**Structure.**
1. **Une seule page : `/explorer`**, refondue — pas de route nouvelle. Elle est
   déjà indexée et la landing pointe dessus.
2. **Rendu hybride.** Le serveur rend la grille initiale (ISR 60 s — le SEO ne
   bouge pas, les cartes restent dans le HTML) ; un composant client la reprend
   avec la même donnée initiale, sans double-fetch au premier rendu.
3. **Barre d'outils** : recherche (déclenchée 300 ms après la dernière frappe,
   exécutée EN BASE sur question + description, jokers `%`/`_` échappés) ; pour
   le connecté, les facettes *Tout / Mes cercles / Épinglés* (§5 ter — la
   recherche du bloc personnel se fait en mémoire, la liste y étant déjà
   complète, mais reste aussi naïve que le `ilike` du catalogue : deux blocs de
   la même page ne doivent pas répondre autrement au même mot).
4. **La carte** — ce qui la rend vivante, conformément à la mise en garde
   Polymarket (§4) : question, méthode, phase, **temps restant**,
   **participation** (n bulletins), et l'épingle pour le connecté. Pas de prix,
   pas de volume, pas de « tendance » inventée : le signal honnête d'un scrutin
   est le temps qui reste et la participation.
5. **Onglet « Épinglés »** (connecté) : les DEUX sortes — cartes publiques
   (route `/v`) et consultations de cercle qui me sont adressées (route `/e`,
   par MON jeton de convoqué, avec le nom du cercle). C'est l'invariant qui rend
   cet onglet possible : tout ce qui est épinglable m'est visible.
   *Révisé au §5 ter : ce n'est plus un onglet à part mais une facette de la
   même grille, filtrée sur l'épingle.*
6. **Pagination** : « Voir plus » par curseur (`p_before` = `published_at` de la
   dernière carte). Pas de défilement infini.
7. **Anonyme** : ni épingle ni bascule — un contrôle inopérant est pire
   qu'absent. La page publique reste une vitrine propre, identique à avant.
8. **États vides** distincts : recherche sans résultat, aucun épinglé (avec
   l'explication du geste), feed vide (existant, conservé).
9. **A11y** : épingle = vrai bouton `aria-pressed` nommant le scrutin, cible
   ≥ 24 px, contrastes conformes (`GREENTXT` pour le texte).

**Historique (dette réglée au passage).** `scrutin_vote_marks` — registre
`(compte, scrutin, date au jour)` sur le modèle de l'émargement : jamais le
bulletin. Alimenté silencieusement aux deux chemins de vote (public et par
lien) ; sans effet pour l'anonyme, dont le `localStorage` reste la seule trace.
Affiché dans « Mes votes » (l'écran s'appelait « Mes participations » jusqu'au
renommage du 2026-08-06), section « Mes votes publics ».

## 5 ter. La grille cesse d'être uniquement publique (livré le 2026-08-06)

**Ce qui manquait, et pourquoi c'était la sous-livraison.** La demande d'origine
était de voir au même endroit « les sondages publics, ceux auxquels on
participe, ceux accessibles par les cercles auxquels on appartient ». La
première version de la vue marché n'a rendu que la première colonne. Les
consultations de cercle — précisément ce que le connecté peut voir et que
personne d'autre ne voit — n'apparaissaient nulle part dans la grille.

**La ligne qu'on ne franchit pas.** `get_public_polls` n'est PAS élargie. Sa
clause « public et approuvé » est sa propriété de sûreté : c'est une fonction
`SECURITY DEFINER` exécutable par `anon`. Une seconde fonction,
`get_my_circle_cards`, sert l'autre source — réservée à `authenticated`, et ne
rendant jamais que les convocations de l'appelant. Deux publics, deux
fonctions, deux blocs sur une même page.

**L'unité de la carte est la SUITE, pas la question.** Une AG à huit résolutions
est une chose à faire, pas huit cartes. La carte porte le titre de la suite, le
nom du cercle, le public convoqué s'il est nommé, et l'avancement `n / total` —
le signal que la §4 désigne comme le seul qui vaille ici. Je ne peux pas savoir
combien d'autres ont répondu à un scrutin scellé ; je sais toujours où j'en
suis.

**Trois facettes**, pour le connecté seulement (sans compte il n'y a ni cercle
ni épingle, et trois boutons dont deux vides seraient un mensonge d'interface) :
*Tout* (mes consultations en tête, puis le catalogue), *Mes cercles*,
*Épinglés*. « Épinglés » n'est plus une liste à part : c'est la même grille
filtrée sur `pinned`. `get_my_pins` est donc supprimée — sa branche « cercle »
n'avait d'ailleurs jamais pu s'allumer, faute d'écran offrant d'épingler un
scrutin de cercle.

**Épingler une suite** passe par `scrutin_event_pins`, table distincte de
`scrutin_pins`. Celle-ci est clée sur un SCRUTIN ; faire porter l'épingle d'une
suite par l'une de ses questions serait une convention invisible, vraie nulle
part dans le schéma. `toggle_circle_pin` exige le **rattachement** du jeton au
compte appelant — détenir le jeton d'un tiers ne suffit pas — et un refus rend
le même `false` qu'un jeton inexistant.

**Deux écrêtages, tous deux dits.** Le bloc personnel est limité à six cartes
sur la facette *Tout*, avec le compte exact des cartes masquées en lien vers
leur facette ; et `get_my_circle_cards` plafonne à 200, garde-fou et non page —
le volume est déjà borné par `solicit_per_day`.

**Ce que cela ne duplique pas.** `/mes-votes` reste la file de ce qui attend une
réponse ; `/explorer` est le catalogue de tout ce que je peux voir, avec la
recherche et les épingles. Une consultation ouverte et sans réponse figure dans
les deux, comme un courrier figure à la fois dans la boîte de réception et dans
l'archive — c'est le même objet vu sous deux intentions, pas deux listes
concurrentes.

**Le livret n'est plus un cul-de-sac.** `/e/<token>` n'offrait aucune sortie. Il
ne reçoit pas la nav complète — on y arrive par un lien reçu par email, souvent
sans compte, et « Créer / Explorer / Mes scrutins » y concurrenceraient le seul
geste attendu. Il reçoit ce qu'il faut : le logo devient un lien, et le connecté
retrouve « Mes votes » en tête ainsi qu'au moment exact où la page n'a plus rien
à offrir — quand tout est répondu.

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
