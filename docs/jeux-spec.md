# Les jeux Placet — socle de salle, et Unanimo par-dessus

Premier lot : une porte `/games`, un moteur de **salle de jeu** générique, et un
jeu complet dessus. Livré et exercé de bout en bout (voir « Ce qui a été
vérifié »).

Le principe qui gouverne tout le reste : **on vient jouer, pas découvrir Placet.**
Aucun écran de jeu n'explique Condorcet, ne demande de compte, ne force un vote
dans le gameplay. Placet n'apparaît qu'en pied de page — « Propulsé par Placet ».

---

## 1. Architecture retenue

```
/games                        porte des jeux (page Placet, nav Placet)
  └─ /games/unanimo           le jeu : créer une partie, ou entrer par un code
       └─ /games/unanimo/<CODE>   LA SALLE — un seul écran pour toute la partie
```

Une partie est un **fil**, pas une suite de pages : `SALON → MANCHE 1 →
RÉVÉLATION → MANCHE 2 → … → FIN`. L'URL ne change jamais. Qui rouvre son lien
retombe exactement là où le groupe en est, quoi qu'il ait manqué.

### Modèle de données

Quatre tables, toutes préfixées `scrutin_game_` (la base OpenSM est **partagée**
avec une autre application, qui possède déjà une table `game_state`).

| Table | Rôle | Connaît Unanimo ? |
|---|---|---|
| `scrutin_game_rooms` | la salle : jeu, code, statut, manches prévues, réglages `jsonb`, langue, salle suivante | non |
| `scrutin_game_players` | qui joue : pseudo, jeton, hôte, score cumulé, **manche d'entrée** | non |
| `scrutin_game_rounds` | une manche : énoncé `jsonb`, phase, résultat **figé** | non |
| `scrutin_game_entries` | une contribution privée : `payload` `jsonb` | non |

Le contenu d'un énoncé (`prompt`) et d'une contribution (`payload`) est opaque
pour la salle : c'est là que vit le jeu.

### Pourquoi pas `scrutin_polls`

La tentation était forte : une manche a un lien à partager, des participants, des
réponses secrètes, une clôture. Mais un scrutin Placet **fige ses options à
l'ouverture** (les bulletins les référencent par index) et porte une **méthode de
dépouillement** ; une manche de jeu accepte des réponses libres écrites par les
joueurs et **cumule un score de manche en manche**. Détourner `options` en
« mots proposés » aurait fait payer au jeu toutes les gardes du vote (verrou de
publication, seuil de dépouillement, émargement) et au vote la souplesse du jeu.

### Le secret des réponses est structurel

Les quatre tables ont **la RLS active et aucune policy** : il n'existe aucun
chemin de lecture directe, pour personne — ni `anon`, ni un compte connecté.
Tout passe par des fonctions `security definer`, et `get_game_room` ne rend les
réponses des autres **qu'une fois la manche en phase `reveal`**. On ne peut pas
oublier de fermer une porte qui n'existe pas.

Vérifié depuis le rôle `anon` : `permission denied` sur les quatre tables, sur la
fonction de dépouillement, sur la purge et sur le tirage de code ; un jeton
inventé n'obtient rien (`forbidden` / `invalid`).

### Verbes

Génériques (`anon` peut les exécuter — on joue sans compte ; la garde n'est pas
le rôle, c'est **le jeton**) :

`get_game_room(code, token?)` · `game_create` · `game_join` · `game_submit` ·
`game_next_round` · `game_reveal` · `game_set_rounds` · `game_end` · `game_replay`

Propres au jeu : `scrutin_game_unanimo_points(n)` (le barème, une ligne) et
`scrutin_game_unanimo_reveal(round)` (le dépouillement). `game_reveal` aiguille
sur le jeu de la salle — le verbe reste générique, les règles restent au jeu.

### Synchronisation

**Sondage, pas temps réel.** Vérifié avant d'écrire : `pg_publication_tables` est
vide, la réplication logique de Supabase n'est activée sur aucune table du
projet ; les deux écrans qui suivent déjà une consultation en direct
(`LivretVote`, `EventEditor`) se rafraîchissent par `setInterval`. On suit le
chemin existant plutôt que d'allumer une infrastructure pour six téléphones.

`useGameRoom` : 2 s en partie, 5 s une fois finie, **15 s quand le navigateur
nous déclare cachés** — et pas l'arrêt complet, voir les limites. Rafraîchissement
immédiat après son propre geste, et compteur de génération pour qu'une réponse en
retard n'écrase jamais une plus récente (sans quoi le « 4/5 » sautille).

---

## 2. Primitives Placet réutilisées

| Mécanique | Verdict | Détail |
|---|---|---|
| QR de partage | **réutilisé tel quel** | `components/scrutin/QrCode` — y compris son plein écran « toute la pièce scanne ». Son suivi d'audience ne compte que les liens `/v/`, il est donc inerte ici, sans effet de bord |
| Identité sans compte | **généralisé** | jeton opaque en base + secret côté navigateur : même modèle que `scrutin_voters.token` et `localPolls` |
| Contributions secrètes | **généralisé** | le bulletin scellé des cercles a montré la voie (RLS restrictive + RPC de dépouillement) ; ici on va plus loin : **aucune policy du tout** |
| Contrôle organisateur | **généralisé** | l'hôte est le joueur `is_host` ; son jeton de joueur fait office de titre — pas de second secret à perdre, contrairement au `admin_hash` d'un scrutin |
| Sondage d'état | **réutilisé** | le motif `setInterval` de `LivretVote` |
| Grammaire visuelle | **réutilisée** | trait épais, aplats francs, cartes, ombre portée, `dc-lift`, `popIn` de `globals.css` |
| i18n | **réutilisé** | next-intl, 4 langues, contrôle de parité au build |
| Roster, poids, districts, méthodes de vote, `scrutin_polls` | **non réutilisés** | un jeu n'est pas un scrutin |

---

## 3. Éléments génériques ajoutés

Ce qu'un futur jeu (Loup-Garou) n'aura pas à réécrire :

- `src/lib/games/room.ts` — types + verbes de la salle, identité locale
  (`getSeat`/`saveSeat`/`lastNick`). Ne connaît ni mot ni thème.
- `src/lib/games/useGameRoom.ts` — synchronisation, arrière-plan, hors-ligne.
- `src/lib/games/skin.ts` — **`GameSkin`** : le moteur commun, la présentation au
  jeu. Les composants ci-dessous ne connaissent aucune couleur de Placet.
- `src/lib/games/catalog.ts` — trois lignes de données, pas un système.
- `src/components/games/` — `GameShell` (cadre + pied « Propulsé par Placet »),
  `JoinGate` (lien → pseudo → rejoindre), `PlayerBoard` (classement, arrivées
  tardives, qui a répondu), `ShareRoom` (code + QR + copie + natif + WhatsApp),
  `ui.tsx` (`GBtn`/`GCard`/`GLabel`, jumeaux de `ui/kit.tsx` mais **sans couleur
  câblée**).
- Le garde-fou i18n a gagné deux contrôles (voir §6).

Ce qui n'a **pas** été généralisé, exprès : pas de registre de plugins, pas de
manifeste de jeu, pas de machine à états abstraite. Quand il y aura trois jeux on
saura ce qu'il faut vraiment extraire ; l'inventer maintenant serait deviner.

---

## 4. Éléments propres à Unanimo

- `src/lib/games/unanimo/themes.ts` — **68 thèmes × 4 langues**, en dur. Pas de
  LLM : une manche ne doit pas attendre un appel réseau au milieu d'un salon, un
  thème doit être évident pour toute la table, et la partie doit tourner sans clé
  d'API. Un seul tableau porte les quatre langues côte à côte : la parité est
  garantie par la structure. Le thème est tiré **par le client de l'hôte** (la
  base garde ce qui a été joué, elle n'héberge pas le catalogue) et jamais deux
  fois dans la même partie.
- `src/lib/games/unanimo/scoring.ts` — barème et normalisation, + le
  dépouillement de référence qui sert de **spécification exécutable**.
- `src/components/games/unanimo/` — `UnanimoCreate`, `UnanimoRoom` (le seul
  composant qui connaît les règles), `WordsInput`, `RevealBoard`.

### Le barème, vérifié avant d'être écrit

Règle **officielle** d'Unanimo (Cocktail Games) : *un mot rapporte autant de
points qu'il y a de joueurs l'ayant écrit ; si on est seul à l'avoir eu, on ne
marque rien.* Donc **N joueurs → N points chacun, 0 quand N = 1** — et non
« N-1 » comme on pourrait le supposer. La marche franche entre être seul (0) et
être deux (2 chacun) est ce qui pousse à chercher l'évidence partagée plutôt que
le mot rare : c'est le sel du jeu.

Isolé dans `scrutin_game_unanimo_points(n)`, une ligne. La variante douce
`greatest(n - 1, 0)` est disponible dans le même fichier (`SCORING_RULES.gentle`).

Non repris en V1, délibérément : le bonus de 5 points au-delà d'un seuil variable
selon l'effectif (une table par nombre de joueurs, sans gain de plaisir), et
l'interdiction des mots de **même racine** que le thème — seule la forme exacte
du thème est écartée.

### La normalisation

Autorité unique : `scrutin_game_norm` **en base**. Trois gestes :

1. minuscules, ligatures dépliées, accents pliés (`Plâge` = `plage`) ;
2. tout ce qui n'est ni lettre ni chiffre devient une espace, puis on réduit
   (`porte-avions` = `porte avions`) ;
3. pluriel : on retire un `s` final **si le radical garde 4 caractères**.

Le seuil est un choix assumé : plus bas, `mois` et `moi` fusionneraient — un
**faux positif**, bien plus grave dans un jeu qu'un faux négatif. Conséquence
connue et acceptée : `mer` et `mers` restent deux mots. Pas de stemmer, pas de
dictionnaire, pas de synonymes : la règle doit s'expliquer en trois phrases à un
joueur qui conteste un point.

`scoring.ts` en porte une copie **pour l'affichage seulement** (prévenir d'un
doublon dans sa propre liste, expliquer un score). Le serveur dédoublonne et
plafonne de toute façon : si les deux divergent, c'est la base qui a raison.

---

## 5. Ce qui a été vérifié

**En base** (39 tests unitaires + trois scénarios SQL) : le parcours complet du
cahier des charges, la sécurité depuis `anon`, l'idempotence de la révélation
(les scores ne se comptent pas deux fois), le refus des verbes d'hôte à un autre
jeton, l'entrée en cours de partie, la prolongation et le raccourcissement, le
chaînage « rejouer ».

**Dans le navigateur** (une vraie partie à 7, l'hôte piloté par l'interface et
les autres téléphones simulés côté serveur — `localStorage` étant partagé entre
onglets) : création → partage (code + QR) → 5 joueurs → manche 1 → saisie de mots
(Entrée, liste collée « couche, Pleurs, LAIT », doublon refusé avec son motif,
thème refusé) → **4/5 ont répondu, l'hôte révèle quand même** → révélation et
points conformes au calcul à la main → **Paul rejoint entre deux manches, à 0
point, « arrivé manche 2 »** → Nina arrive **pendant** une manche et attend la
suivante sans jamais voir le thème → vue d'un joueur non-hôte (aucun contrôle) →
5/5 puis **« Encore 3 manches »** → classement final avec podium → **Rejouer** →
les autres téléphones voient « Rejoindre la nouvelle partie » et entrent d'un
geste → entrée à froid par lien (pseudo prérempli, pseudo déjà pris refusé) →
entrée par code depuis `/games` (minuscules acceptées, code faux expliqué).

Trois défauts trouvés et corrigés en route, listés au §6.

---

## 6. Trois défauts trouvés pendant la vérification

1. **Le libellé affiché dépendait de la collation.** Trancher entre `Plage`,
   `plage` et `PLAGES` par l'ordre alphabétique donnait `Plage` en base et
   `plage` en TypeScript. On garde désormais **la forme écrite en premier** par le
   joueur, et on ordonne les égalités sur la forme normalisée (ASCII minuscule,
   même ordre partout). Attrapé par le test de référence.
2. **Le sondage s'arrêtait quand le navigateur nous déclarait cachés.** L'idée
   tenait (un téléphone en poche n'a pas à interroger le serveur), mais
   `visibilityState` vaut aussi `hidden` là où l'utilisateur voit la page (vue
   encapsulée, onglet qui ne compose pas, application réveillée en arrière-plan)
   — et le symptôme est le pire possible pour un jeu : **la partie a l'air
   gelée**. On ralentit maintenant à 15 s au lieu de s'arrêter.
3. **`Unanimo.host.more` s'est affiché en clair à l'écran.** Le message disait
   `{count, plural, …}` et l'appel passait `{ n }` : la clé existait, les quatre
   langues étaient d'accord, et le formatage ICU échouait en silence. Le garde-fou
   `scripts/i18n-parity.mjs` gagne donc deux contrôles — la **résolution des clés
   imbriquées** (`t("wait.progress")` : il ne regardait que le premier niveau, ce
   qui condamnait tout namespace à être plat) et la **couverture des arguments**
   d'appel. Les deux passent sur les 3 473 usages existants, sans faux positif.

---

## 7. Limites connues, et suites possibles

- **Pas de transfert d'hôte.** Si l'hôte perd son téléphone, la partie ne peut
  plus avancer (les autres voient l'état, personne ne peut lancer la manche
  suivante). C'est la limite la plus gênante. Piste : autoriser n'importe quel
  joueur à reprendre la main après trois minutes de silence de l'hôte.
- **Pas de minuterie de manche.** Le jeu de plateau joue au sablier ; ici c'est
  l'hôte qui décide. Volontaire en V1 (une horloge ajoute une pression et un
  chemin d'échec), mais c'est la demande la plus probable après un premier soir.
- **Pas de plafond de création de salle** pour un anonyme.
  `scrutin_game_purge(jours)` existe et supprime les salles inactives, mais n'est
  branchée sur aucun ordonnanceur : la planification est une décision
  d'exploitation, elle se prend à part.
- **60 joueurs par salle**, plafond purement technique (lisibilité d'une
  révélation, poids d'une réponse réseau) et non une règle du jeu.
- **Le QR garde les couleurs de Placet** (encre navy sur crème) dans une salle
  Unanimo : un QR est monochrome par nature, et dupliquer un composant qui marche
  pour une nuance de cadre n'en valait pas le prix.
- `mer`/`mers` restent deux mots — voir la normalisation.
- Le score de la manche n'est pas animé (pas de compteur qui grimpe) : la
  révélation apparaît ligne à ligne en CSS, ce qui suffit et ne dépend d'aucun
  état — un rafraîchissement du sondage ne peut ni la rejouer ni la couper.
- **Loup-Garou n'est pas commencé.** Sa case sur `/games` est annoncée
  « Bientôt » parce qu'elle l'est vraiment : il réutilisera cette salle, ces
  joueurs, ces phases, ces contributions secrètes et ce contrôle d'hôte. Il
  ajoutera ses rôles et ses nuits.
