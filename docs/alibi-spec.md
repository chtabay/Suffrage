# ALIBI — « la pièce en trop »

Deuxième jeu de la salle Placet. Slug `alibi`, route `/games/alibi`, emoji 🕯️.

> **La règle, en une phrase.** Chaque manche, la maison range tout le monde dans
> trois pièces — sauf une personne, qui rôdait. Chacun dit où il était et
> combien ils étaient. La pièce qui reçoit un bulletin de trop cache le coupable.

## 1. Pourquoi ce jeu, et pas un Loup-Garou

Le cas d'usage donné : onze personnes dans un gîte, sept adultes et quatre
enfants de 8 à 12 ans qui aiment le Loup-Garou. Trois défauts du Loup-Garou
dans ce cadre précis dictent toute la conception.

| défaut | ce qu'on fait |
|---|---|
| un enfant éliminé au tour 2 a fini sa soirée | **personne n'est jamais éliminé** |
| il faut un meneur, donc un adulte ne joue pas | **l'application est le seul meneur** |
| les phases « fermez les yeux » sont ingérables à onze | **il n'y en a aucune** — chaque secret vit sur son écran |

Et une quatrième chose, qui est le sel : **le dépouillement est l'instrument de
mesure**. Le serveur ne révèle rien ; ce sont les bulletins qui se contredisent
tout seuls. C'est précisément ce que Placet sait faire et qu'un jeu de carton
ne peut pas.

## 2. Le déroulé

**Mise en place.** L'hôte ouvre une maison, chacun entre par le lien ou le code.
Le roster **se ferme au lancement** (§5). L'hôte distribue les cartes : le
serveur tire un coupable, et personne — pas même l'hôte — ne sait qui.

**Quatre manches d'enquête.** À chaque manche, le serveur répartit les `n−1`
innocents dans trois pièces de tailles **tirées au sort**. Le coupable n'est dans
aucune : il rôdait, et reçoit un *faux souvenir* (une pièce, et le nombre vrai
de ses occupants).

Chacun dépose deux informations, sans jamais taper au clavier :
- **où j'étais** et **combien nous étions** — l'innocent a sa carte pré-remplie,
  il confirme d'un bouton et **ne peut pas se tromper** ;
- **un soupçon** (le carnet), secret jusqu'à la fin, qui rapporte des points.

Seul le coupable a un choix : l'application lui montre **cinq noms tirés au
sort** avec leur pièce et son compte, et il déclare l'une de ces pièces — ou
s'en tient à son propre souvenir.

**Le dépouillement** ne connaît que l'arithmétique des bulletins :

| ce que la pièce reçoit | verdict | conséquence |
|---|---|---|
| autant de bulletins que le nombre annoncé | **les comptes sont justes** | tous ses occupants sont publiquement blanchis |
| un bulletin de plus | **il y en a un de trop** | le coupable est dans le lot |
| un bulletin qui annonce un autre nombre que ses colocataires | **c'est lui** | la personne est désignée |

Le vivier de suspects est l'**intersection** des pièces en trop d'une manche à
l'autre — c'est là que la déduction se fait.

**L'accusation.** Cinquième manche : un seul nom, secret, à la pluralité simple.

**Le score** (plancher à zéro, un seul classement, ce n'est pas un jeu à camps) :
+2 par manche où ton soupçon nommait le coupable, +10 si ton accusation le
nomme ; pour le coupable, +2 par manche où la pièce en trop comptait au moins
deux personnes, et +10 s'il n'est pas le nom le plus accusé. Les deux rôles
plafonnent à 18.

## 3. Les chiffres, et comment ils ont été obtenus

**La mécanique a été simulée avant d'être écrite** — 20 000 parties par cas.
C'est ce qui a permis d'écarter une première conception qui, mesurée, résolvait
7,3 % des enquêtes là où le hasard en résout 9,1 %.

| joueurs | 7 | 9 | **11** | 13 | 16 |
|---|---|---|---|---|---|
| hasard | 14,3 % | 11,1 % | **9,1 %** | 7,7 % | 6,2 % |
| l'enquête aboutit | 54,8 % | 56,7 % | **54,3 %** | 53,4 % | 50,2 % |

Six points d'écart sur toute la plage. **Moins de 10 % des réussites viennent
d'une preuve directe** : le reste est de la déduction. Une table qui n'utiliserait
que le dernier dépouillement tomberait à 22 % — le croisement des manches vaut
32 points.

**Une partie sur deux se termine sur un duel** entre deux noms, que la table
doit trancher en parlant. C'est la fin d'une murder party, et c'est voulu.

⚠️ **54 % est un PLANCHER, pas une prédiction.** Le simulateur tranche le duel à
pile ou face ; une vraie table y apporte tout ce que la machine ne voit pas. Le
vrai taux se lira sur les vraies parties : `hit` et `size` sont écrits dans le
résultat de la dernière manche, exprès.

## 4. Les quatre failles trouvées par l'attaque, et fermées

Aucune n'était visible sans simuler. Deux ramenaient l'enquête au niveau du
hasard.

1. **Le bulletin manquant** (fatale). « Les comptes sont justes » est le cas par
   défaut : un seul bulletin manquant dans la pièce du coupable la fait lire
   comme nette et **le blanchit**. Le coup ne demande aucune habileté — « attends,
   vote pas tout de suite », ou un enfant distrait. Mesuré : **9,0 %**, le hasard
   exact, et le vivier final revient à 11 sur 11.
   → **Le serveur dépose d'office le bulletin d'un innocent absent.** Ce n'est pas
   une béquille : ce bulletin est *déterministe*, l'innocent n'a aucun choix à
   faire. Coût : entre 0,0 et +0,5 point.
2. **La marionnette** (fatale). `game_join` acceptait une arrivée en cours de
   partie — une règle voulue pour Unanimo. Le coupable ouvrait un onglet privé,
   rejoignait sous un autre pseudo, et sa fausse identité recevait une carte
   pré-remplie : un renseignement gratuit, illimité, invisible.
   → **Roster fermé au lancement**, pour ce jeu seulement.
3. **Les tailles déterministes** (sérieuse). Elles étaient calculées par une
   fonction pure : toujours `[5, 3, 2]` à onze. Dès la manche 1, le coupable
   connaissait tous les comptes — or son seul risque est d'annoncer un compte
   faux. Il visait la pièce la plus peuplée, où le vivier fond deux fois moins
   vite : 73 % → 50 %.
   → **Composition tirée au sort à chaque manche.** Coût : nul.
4. **Le choix de la victime** (sérieuse). Si le coupable choisissait son leurre
   dans toute la table, il collerait l'enfant de huit ans à son alibi et
   gagnerait le duel final contre quelqu'un qui ne sait pas se défendre. Mesuré :
   33,6 % si le leurre paraît seulement deux fois plus suspect que lui.
   → **Il choisit parmi cinq noms tirés au sort.**

## 5. Le modèle

Le socle générique (salle, joueurs, manches, contributions) est celui d'Unanimo.
Ce que ce jeu y ajoute :

- `scrutin_game_players.secret jsonb` — la carte du joueur. **Elle ne sort que
  par l'objet `me` de `get_game_room`**, déjà protégé par le jeton : jamais par
  `players`, jamais par `round`, jamais par `result`. Vérifié : la réponse
  réseau d'un innocent ne contient pas le mot `culprit`.
- `scrutin_game_alibi_sizes / _deal / _reveal / _verdict`, toutes fermées à
  `anon`.
- Trois branches par `game` dans les verbes génériques (`game_join`,
  `game_submit`, `game_reveal`, `game_next_round`), et la généralisation de
  `mine` dans `get_game_room` — il lisait `payload->'words'` **en dur**, hérité
  d'Unanimo, si bien que tout autre jeu recevait `null` sans que rien ne le
  signale.

⚠️ **La mise en place est SERVEUR, et c'est le point.** Dans Unanimo, le client
de l'hôte tire le thème et l'envoie ; le même chemin donnerait ici la réponse à
l'hôte. Rien de la distribution ne transite par un navigateur.

Les noms de pièces sont du **contenu** : douze clés × 4 langues dans
`src/lib/games/alibi/lieux.ts`, hors i18n, comme les thèmes d'Unanimo. La base ne
connaît que les clés. ⚠️ Cette liste doit rester synchrone avec le tableau de
`scrutin_game_alibi_deal`.

## 6. Ce qu'on ne fait pas en v1

- **Pas de minuterie.** L'hôte décide quand dépouiller. Une horloge ajoute une
  pression et un chemin d'échec ; c'est la demande la plus probable après un
  premier soir, pas avant.
- **Pas de rôles supplémentaires** (complice, témoin, enquêteur). Un rôle qui
  sait tout et n'a rien à découvrir échoit le plus souvent à un enfant.
- **Pas de rappel du vivier sur l'écran d'accusation.** La table vient de le
  voir, mais un enfant de huit ans, lui, l'a peut-être oublié. À mesurer sur une
  vraie partie avant d'ajouter de la surface.
- **Le score reste caché jusqu'à la résolution** — un score qui bouge en cours de
  partie pourrait trahir un rôle.

## 7. Ce qui reste incertain

Le taux réel. Tout ce qui précède est mesuré contre un simulateur dont les
joueurs sont des automates : il ne modélise ni la parole, ni les visages, ni le
fait qu'un enfant vote pour son frère. **La première vraie partie en apprendra
plus que 20 000 simulées** — et `hit` est déjà écrit en base pour qu'on puisse la
lire.
