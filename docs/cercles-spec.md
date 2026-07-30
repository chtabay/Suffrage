# Cercles — spécification P1

**État : à valider.** Aucun code écrit. Trois questions à trancher en fin de document.

Produit par un panel de trois conceptions indépendantes, chacune attaquée par un
adversaire distinct, puis synthétisée. Tous les faits techniques ci-dessous ont
été **vérifiés dans la base de production** (projet OpenSM `xwlywozdxlgjwksypzmi`)
et dans le code, pas déduits.

---

## 1. Le besoin, en une phrase

Une communauté professionnelle établie — le cas concret est l'**immobilier
locatif** — veut interroger régulièrement ses membres et faire de la veille,
alors qu'elle subit le harcèlement téléphonique des agences. Placet est le
**tampon** : le membre répond à ses conditions, son contact n'est jamais exposé,
et le nombre de sollicitations est plafonné.

Le beachhead est **first-party** : l'animateur interroge sa propre communauté.
La marketplace (une start-up publie dans un cercle qu'elle ne possède pas) est
l'étage au-dessus, et n'est **pas** dans cette spec.

---

## 2. Ce qui existe déjà (vérifié)

| Brique | État | Où |
|---|---|---|
| Espace + roster réutilisable | ✅ en prod | `scrutin_spaces`, `scrutin_members`, `events.ts` |
| Convocation nominative + email | ✅ en prod | `convene()`, `/api/events/[id]/convoke` |
| Auto-inscription par lien | ⚠️ **au niveau ÉVÉNEMENT seulement** | `scrutin_events.enroll_token`, RPC `self_enroll` |
| Vote sans compte par jeton | ✅ en prod | `cast_event_ballot`, `/e/[token]` |
| Résultats pondérés, quorum, seuil | ✅ en prod | `EventResults` |
| Patron « RPC gardée par secret serveur » | ✅ en prod | `notify_secret_ok` + `scrutin_config` (0 policy) |

**Le manque central** : l'adhésion vit sur l'**événement**, pas sur l'**espace**.
`scrutin_spaces` n'a que quatre colonnes (`id, owner_id, name, created_at`) et
`self_enroll` insère dans `scrutin_event_members` avec `member_id = NULL` —
l'auto-inscrit **n'entre jamais dans le roster**. Un cercle a besoin de
l'inverse : on adhère une fois, on est convoqué ensuite à chaque consultation.

**Usage réel aujourd'hui** : 3 espaces, 7 membres, 3 événements, **1 convoqué,
0 auto-inscription, 0 message**. Le socle est écrit mais **jamais exercé**. Bonne
nouvelle pour la migration (rien à migrer), mauvaise pour la confiance : ce
chantier sera le premier vrai test du socle événements.

---

## 3. Le modèle retenu — « espace ouvert, consultation scellée »

**Un cercle n'est pas un objet nouveau : c'est un espace dont le lien d'adhésion
est ouvert. Le secret n'est pas une propriété du cercle : c'est une propriété de
la consultation.**

Deux mécanismes **indépendants**, livrables séparément — c'est ce qui rend le
chantier sûr :

1. **Le bulletin scellé** (`secret_ballot` sur l'événement) — utilisable par
   n'importe quel espace existant, sans aucun cercle.
2. **L'adhésion d'espace** (`join_token` sur l'espace) — utile même sans
   consultation, ne serait-ce que pour construire le roster.

### Écarté, et pourquoi

- **Un 3e niveau de `visibility`** (`private` / `circle` / `public`). Inutile :
  `access_mode='invite'` + `visibility='private'` fait déjà exactement le
  travail, et c'est la surface la plus verrouillée du produit. Mauvais rapport
  risque/valeur.
- **Le jeton aveugle** (ne stocker que le `sha256` du jeton membre). Élégant,
  mais il interdit de renvoyer son lien à un membre qui l'a perdu — support
  impossible — pour un gain nul face à un opérateur de confiance.
- **La co-animation** (plusieurs animateurs par cercle). Exigerait de réécrire
  les trois policies `*_owner`. Le cas immobilier locatif a un animateur.
- **Les commentaires libres sur une consultation secrète.** Supprimés, pas
  différés : dans un cercle professionnel, un texte libre (style, nom d'agence)
  ré-identifie, et il survivrait au retrait du membre.

---

## 4. La tension identité / secret, et comment elle est résolue

Le vote est réservé aux membres — il faut donc **prouver l'appartenance**. Mais
le bulletin doit rester **secret**. Les deux tirent en sens inverse.

**Aujourd'hui, dans un événement, l'organisateur peut savoir qui a voté quoi** :
`scrutin_ballots.event_member_id` pointe la personne, et `getResolutionBallots`
fait la jointure. C'est acceptable pour une AG à main levée. Ça ne l'est pas pour
la promesse d'un cercle.

La solution sépare **trois choses physiquement distinctes** :

| Rôle | Porté par | Lisible par |
|---|---|---|
| Prouver qu'on est membre | `scrutin_event_members.token` (existant) | l'animateur |
| Empêcher le double vote | **`scrutin_event_signins`** (nouveau, PK `(event_member_id, poll_id)`) | personne (0 policy) |
| Le vote lui-même | `scrutin_ballots` avec `event_member_id = NULL` | tout le monde, mais anonyme |

L'émargement est écrit **en premier**, en `on conflict do nothing returning 1` :
si rien n'est retourné, aucun bulletin n'est écrit. C'est atomique.

### Les six attaques trouvées, et leur parade

Chacune a été vérifiée en base par un attaquant dédié. Elles sont réelles.

1. **Jointure commentaire × bulletin sur l'horodate.** `cast_event_ballot` insère
   le bulletin ET le commentaire dans la **même transaction** ; `now()` est
   constant sur toute la transaction, donc les deux `created_at` sont
   **rigoureusement** égaux. Le commentaire porte un nom d'auteur.
   → **Parade** : commentaires refusés en mode secret + `created_at` du bulletin
   arrondi au jour + bulletins secrets retirés de la lecture anonyme.
2. **Contournement par cardinalité.** L'animateur convoque **une seule** personne
   et lit le bulletin qui apparaît. Aucune jointure nécessaire.
   → **Parade** : en mode cercle, la convocation n'est plus au choix — la RPC
   convoque **tout le roster**. Et les résultats ne sortent qu'après clôture,
   à partir d'un nombre minimal de bulletins, **refusé en base**.
3. **Double vote.** L'index unique qui protège aujourd'hui est **partiel** :
   `WHERE event_member_id IS NOT NULL`. Un bulletin secret (`NULL`) y échappe
   entièrement — la protection actuelle disparaît exactement quand on en a le
   plus besoin.
   → **Parade** : l'émargement devient la contrainte autoritaire (point ci-dessus).
4. **Relance transformée en envoi à tous.** `/api/events/[id]/remind` calcule les
   « pas encore votants » en lisant `event_member_id` sur les bulletins. En mode
   secret il est toujours `NULL` → l'ensemble « a voté » est vide → **on relance
   tout le monde**. L'inverse exact de la promesse.
   → **Parade** : la relance lit `scrutin_event_signins`.
5. **Énumération d'adresses par le lien d'adhésion.** Le formulaire public dirait
   « déjà inscrit » → il devient un oracle d'appartenance, et un outil d'envoi
   d'emails non sollicités.
   → **Parade** : réponse **`ok` dans tous les cas**, rien n'entre dans le roster
   avant un clic de confirmation, débit borné par cercle et par adresse.
6. **Plafond décoratif.** Un plafond affiché mais appliqué dans l'interface n'est
   pas un plafond.
   → **Parade** : compté et **refusé en base** dans la RPC d'ouverture.

### Ce que ce modèle ne garantit PAS — à dire en clair

- **L'opérateur reste une frontière de confiance.** `service_role`, un dump, ou
  un futur écran d'admin contournent la RLS par construction. L'invariant tenu
  est : « ni l'animateur ni un tiers muni de la clé publique ne peut
  ré-identifier un bulletin ». Ce n'est pas une preuve cryptographique.
- **L'arithmétique des petits nombres.** Dans un cercle de six, l'unanimité
  trahit tout le monde. Le seuil de publication borne l'accident, il n'abolit
  pas le calcul.
- **Pas de pondération ni de district dans un cercle** (`weight = 1`) : un poids
  rare est un identifiant.

---

## 5. Schéma

**Inchangé** : `compute()`, `scrutin_polls` (aucune colonne, aucune policy),
`scrutin_config`, `self_enroll` / `get_enroll_info` (l'enrôlement d'événement
reste tel quel), la structure de `scrutin_ballots`.

### Colonnes ajoutées

- **`scrutin_spaces`** : `join_token` (unique, défaut aléatoire), `join_open`
  (bool, défaut `false`), `join_cap`, `join_closes_at`, `pitch`, `monthly_cap`
  (défaut 2). *Un espace est un cercle si et seulement si `join_open`.*
- **`scrutin_members`** : `token` (unique — le jeton stable qui manquait),
  `self_joined`, `consent_at`, `consent_source`.
- **`scrutin_events`** : `secret_ballot` (bool, défaut **`false`** — aucune
  régression sur les AG existantes), `reminded_at`.
- **Index manquant, à poser avant toute ouverture de lien** : le dédoublonnage
  par email est aujourd'hui **100 % côté client** (`SpaceDashboard.tsx`).
  `create unique index … on scrutin_members (space_id, lower(email)) where email is not null;`

### Tables nouvelles (2), RLS activée et **zéro policy** (patron `scrutin_config`)

- **`scrutin_join_requests`** — la file d'attente du double opt-in. Personne
  n'entre dans le roster tant qu'il n'a pas cliqué. Expire en 72 h.
- **`scrutin_event_signins`** — l'émargement. PK `(event_member_id, poll_id)`,
  date au **jour** près (pas d'horodate fine : elle serait un canal de jointure).

### Policy nouvelle (1)

Une policy **RESTRICTIVE** sur `scrutin_ballots` qui masque les bulletins des
consultations secrètes à la clé publique. Sans effet sur l'existant.

⚠️ **Conséquence à traiter dans le même lot** : `getResolutionBallots`
(`events.ts:508`) lit `scrutin_ballots` en direct et renverrait zéro. Le
dépouillement d'une consultation secrète doit passer par `get_event_results`.

### RPC nouvelles (6, toutes `SECURITY DEFINER`)

`get_circle_info` (publique, sans jeton) · `request_join_circle` et
`confirm_join_circle` (gardées par le secret serveur, patron `self_enroll`) ·
`get_member_home` (par jeton, **`STABLE`, sans effet de bord**) · `leave_circle` ·
`open_circle_consultation` (vérifie le plafond mensuel **en base**, convoque tout
le roster, pose `secret_ballot`).

### RPC modifiées (3, chirurgical)

`cast_event_ballot` (émargement d'abord, `event_member_id = NULL`, horodate au
jour, commentaire ignoré — **uniquement si `secret_ballot`**, sinon corps actuel
mot pour mot) · `get_event_context` (`voted` lit l'émargement) ·
`get_event_results` (seuil minimal, sans horodate, ordre aléatoire).

---

## 6. Parcours

**Animateur.** Un bloc « Cercle » dans `SpaceDashboard` (entre roster et
événements) : interrupteur, lien `placet.app/cercle/<join_token>` copiable,
pitch, plafond mensuel. Puis, pour interroger : créer l'événement et sa question
comme aujourd'hui, et **un seul bouton « Ouvrir la consultation »** — désactivé
avec son motif si le plafond du mois est atteint. Suivi par un compteur anonyme.
Une relance maximum.

**Membre.** `/cercle/<token>` (calque de `JoinForm`) affiche le nom du cercle,
le pitch, et **la promesse chiffrée** : « au plus 2 questions par mois, 1 utilisée
ce mois-ci », « votre email n'est jamais communiqué », « vos réponses ne sont pas
rattachées à votre nom ». Puis email de confirmation → **un bouton** (un POST,
jamais un GET : les anti-phishing d'entreprise cliquent les liens des emails et
valideraient le double opt-in tout seuls) → atterrissage sur `/m/<token>`, sa
page personnelle : consultations ouvertes, historique, résultats, et **quitter le
cercle en un clic**, également depuis le pied de chaque email.

À chaque consultation : un email → l'écran de vote `/e/<token>` **inchangé**.

---

## 7. Découpage

| Lot | Contenu | Valeur seule |
|---|---|---|
| **1. Le bulletin scellé** | `secret_ballot`, émargement, les 3 RPC modifiées, la policy, la case dans `EventEditor` | N'importe quel espace peut tenir un vote à bulletin secret **démontrable** — sans aucun cercle |
| **2. L'adhésion** | colonnes espace/membre, index unique, file d'attente, 4 RPC, 3 pages, 3 routes | L'animateur construit son roster seul ; chaque membre a une page de retrait (RGPD) |
| **3. La consultation de cercle** | `open_circle_consultation`, plafond en base, relance | La promesse anti-harcèlement devient **opposable** |
| **4. Finitions de confiance** | pied de retrait sur tous les emails, badge « auto-inscrit », date de consentement | — |

Ordre imposé : **1 avant 3** (on n'ouvre pas un cercle dont les bulletins ne sont
pas scellés), **2 avant 3**. Le lot 4 peut se glisser n'importe où, mais pas
après la première adhésion réelle.

Un test qui vaut le lot 1 : après un vote secret, la jointure
`scrutin_ballots × scrutin_event_members` doit renvoyer **zéro ligne**, et la
même requête avec la clé publique doit renvoyer zéro ligne tout court.

---

## 8. Trois questions à trancher avant le code

**1. Le plafond mensuel est-il un verrou dur, ou une promesse affichée ?**
*Recommandation : verrou dur, refusé en base.* C'est le seul engagement qui
distingue Placet du démarchage qu'il dénonce, et il est affiché sous notre
marque. Un plafond promis puis dépassé est pire que pas de plafond. S'il est jugé
trop contraignant pour l'animateur, alors il faut ne rien promettre du tout —
pas d'entre-deux.

**2. Combien de bulletins minimum avant d'afficher un résultat ?**
*Recommandation : 5, refusé par la base, avec un message explicite à
l'animateur.* Un seuil appliqué dans le composant de résultats n'est pas un
seuil, c'est une décoration. Le vrai réglage à discuter est le chiffre : 3 serait
défendable, 1 ne l'est pas.

**3. Un membre importé par CSV — qui n'a rien demandé — peut-il entrer dans un
cercle ? Et un membre sans email peut-il en faire partie ?**
*Recommandation : import autorisé mais marqué comme tel, avec un premier email
qui dit ce que le cercle sait de lui et comment sortir ; et **email obligatoire
dans un cercle**.* Aujourd'hui `scrutin_members.email` est nullable et la
convocation filtre les membres sans adresse : un membre sans email est
silencieusement injoignable, jamais convoqué, et sans moyen d'exercer son
retrait. Ce n'est pas un membre, c'est une donnée personnelle orpheline.

---

## Annexe — deux trous préexistants, sans rapport avec les cercles

Trouvés en vérifiant la base. Ils existent **en production aujourd'hui**.

1. **La publication d'un scrutin peut contourner sa RPC.** La policy
   `scrutin_polls_insert_private` est RESTRICTIVE mais **sur INSERT seulement**,
   et `scrutin_polls_update_owner` a un `with_check` **nul** — qui, en Postgres,
   fait retomber la vérification sur le `USING`, lequel ne contraint que
   `created_by`. Un propriétaire authentifié peut donc passer `visibility` à
   `'public'` par un simple UPDATE, en contournant `set_poll_visibility` et donc
   son plafond de 5 publications/24 h **et** son refus de publier une liste non
   figée. Correctif : une policy RESTRICTIVE sur UPDATE. Une ligne.
2. **Dans un événement, l'organisateur peut relier un bulletin à une personne.**
   C'est le comportement actuel, assumé pour une AG. À énoncer si des
   utilisateurs pensent que le vote y est secret — et c'est exactement ce que le
   lot 1 vient corriger, en option.
