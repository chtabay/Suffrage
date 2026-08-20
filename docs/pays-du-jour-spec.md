# Pays du jour — ce qui a été construit

Le cinquième jeu de Placet, et le premier qui **se joue seul, en trois minutes,
une fois par jour**. Pas de salle, pas de code, pas de compte : le « code » est
la date, et elle est la même pour tout le monde.

> Trouvez le pays du jour. Chaque essai vous indique combien de caractéristiques
> il partage avec lui.

Un score de `0/5` à `5/5` par pays essayé, un seul pays à `5/5`, et à la victoire
la révélation des cinq critères avec leurs sources.

---

## 1. Architecture

```
/games/pays                       l'écran du jeu (page serveur → composant client)
/api/games/pays/essai             un pays entre, un entier sort
/api/games/pays/journal           les mesures que le serveur ne voit pas autrement

src/content/pays/referentiel.ts   193 États, GÉNÉRÉ            ─┐
src/content/pays/carte.ts         tracés SVG, GÉNÉRÉ            │ versionnés,
src/content/pays/criteres.ts      la bibliothèque de critères   │ jamais recalculés
src/content/pays/journees.ts      51 journées validées, GÉNÉRÉ ─┘  à l'exécution

src/lib/games/pays/moteur.ts      noter · valider · dater
src/lib/games/pays/journee.ts     quelle journée, quels critères
src/lib/games/pays/palette.ts     le gradient 0→5      ← utilisable côté client
src/lib/games/pays/types.ts       le contrat d'API     ← utilisable côté client
```

### Pourquoi pas une salle

Les quatre jeux précédents partagent le moteur de salle (`scrutin_game_*`) parce
qu'ils réunissent des gens autour d'une table. Celui-ci ne réunit personne : il
n'a ni joueurs, ni manches, ni hôte, ni contribution privée à cacher. Lui donner
une salle aurait signifié inventer une salle à un occupant, une manche par jour et
un hôte imaginaire — c'est-à-dire payer toutes les gardes du moteur de salle pour
n'en utiliser aucune.

**Il n'écrit donc rien en base.** L'historique d'une partie vit dans le
`localStorage`, et les mesures partent dans les journaux de l'hébergeur (voir §5).

### Le secret vit sur le serveur

`criteres.ts` et `journees.ts` ne sont importés que par les routes d'API et par la
page (composant serveur). Le navigateur envoie un code pays, reçoit un entier, et
ne reçoit les cinq critères qu'avec le `5/5`.

Vérifié sur le rendu de production : ni les identifiants des critères du jour, ni
le code du pays cible, ni son nom n'apparaissent dans le HTML ni dans les paquets
JavaScript servis. Les métadonnées OpenGraph ne dérivent rien du puzzle — pas
même une image de carte, qui situerait la réponse dans un aperçu de lien.

Ce que ça N'empêche PAS, et la spec le dit (§15) : poster les 193 pays à l'API
pour trouver le `5/5` sans jouer. L'objectif est d'éviter le spoiler accidentel,
pas de construire un anti-triche.

---

## 2. Le référentiel : 193 États, figés

**La convention : les 193 États membres de l'ONU.** Sont donc exclus le Vatican et
la Palestine (observateurs), Taïwan, le Kosovo, le Sahara occidental, le
Somaliland, Chypre du Nord, et tous les territoires dépendants.

C'est le seul découpage qui ne demande à personne d'arbitrer un différend
territorial dans le barème d'un jeu de géographie — et un jeu qui tranche une
frontière contestée perd le droit de dire que ses critères sont objectivement
vérifiables.

Ces terres-là ne sont pas effacées de la carte pour autant : l'Antarctique, le
Groenland et les territoires sont dessinés en décor inerte. Une carte trouée se
lit comme une information.

### D'où viennent les données

| Donnée | Source | Année |
|---|---|---|
| noms (fr/en/es), superficie, langues, monnaies, frontières, enclavement, coordonnées | ISO 3166-1 / base `mledoze/countries` | 2024 |
| continent et sous-région | découpage géographique standard de l'ONU (M49) | 2023 |
| population | Banque mondiale, `SP.POP.TOTL` | 2018 |
| fond de carte | Natural Earth 110m (domaine public) | — |
| listes éditoriales (OPEP, Commonwealth, UNESCO, conduite à gauche…) | citées critère par critère, avec URL et année | 2022-2024 |

**Ces paquets ne sont PAS des dépendances de l'application.** Ils ne s'installent
que pour régénérer :

```bash
npm install --no-save world-atlas@2 topojson-client@3 d3-geo@3 \
                      world-countries@5 country-json@1
node scripts/pays-referentiel.mjs     # référentiel + carte
npx tsx scripts/pays-journees.ts      # les journées
npm run build && npm test
```

Une donnée qui bouge sous un puzzle déjà publié n'en fait pas un puzzle à jour :
elle en fait un puzzle faux. D'où la version `DATA_VERSION`, et la règle : après
régénération, on relit les journées publiées (le test le rappelle bruyamment).

**Ce qu'on n'a pas pris** : la longueur des côtes de `country-json` est
inutilisable — la France y vaut `null` et le Brésil `7.491`, c'est-à-dire 7 491 km
dont le séparateur de milliers s'est perdu. Un critère « plus de 3 000 km de
côtes » bâti là-dessus serait faux un pays sur trois, en silence.

---

## 3. La carte

Projection **Natural Earth I**, projetée UNE FOIS par script vers une boîte de
1000 × 500 unités, arrondie au dixième. Le navigateur ne reçoit que des chaînes
`d` : aucune bibliothèque de cartographie, aucune projection à l'exécution.

**Quarante États n'ont pas de tracé cliquable** à cette résolution (Malte,
Singapour, Maurice, les Caraïbes, le Pacifique). Ils reçoivent un **point**,
dessiné par-dessus, avec un disque de saisie invisible de 22 px de rayon. Sans lui,
un cinquième du référentiel serait injouable au doigt — et le jeu promet 193 pays.

Un test le garantit : aucun pays du référentiel n'est sans tracé **ni** point.

### Deux choses vues à l'écran, pas déduites

**Les traits se mesurent en pixels, pas en unités de carte.** La carte fait 1000
unités de large et 350 pixels sur un téléphone : un contour de 0,9 unité y devient
un trait de 0,3 pixel, et le disque de saisie de 9 unités un point de 3 pixels de
rayon — quatre fois moins que la cible tactile recommandée. Sur l'écran de bureau
où tout avait été réglé, les mêmes valeurs tombaient juste. La conversion passe
par la largeur réelle du SVG, mesurée par un `ResizeObserver`.

**La pastille des petits États reste petite** (2,6 px de rayon) même si sa cible
est large : à 4,5 px, les micro-États d'Europe se chevauchaient et les Caraïbes
devenaient une grappe de bulles.

### Le gradient

Luminances relatives **calculées** : 0,730 · 0,620 · 0,439 · 0,294 · 0,176 ·
0,127. Strictement décroissantes — la progression se lit sans la couleur, donc
sans distinguer les teintes. Le `5/5` rompt la rampe (vert franc) : ce n'est plus
une nuance, c'est la fin de la partie. Le premier jet n'était pas monotone : un
`0/5` assombri pour se distinguer du papier était passé devant le `1/5`.

Le contraste du texte sur pastille bascule entre le `3/5` et le `4/5`, là où les
rapports se croisent (5,41:1 et 4,64:1). Et chaque pastille porte « 3/5 » en
toutes lettres : une couleur seule ne se lit pas.

---

## 4. Les critères et la validation d'une journée

**58 critères**, dont 33 dérivés du référentiel (justes par construction) et 25
recopiés de listes publiées, chacun avec `source_name`, `source_url` et année.
27 familles.

Une combinaison de cinq critères n'est publiable que si elle passe **tous** ces
filtres (`evalueJournee`) :

1. **exactement un pays à 5/5** — l'invariant absolu ;
2. cinq familles différentes ;
3. **aucun critère contenu dans un autre** ;
4. chaque critère vrai pour 6 à 120 pays ;
5. au moins un critère large, et au moins un spécifique ou signature ;
6. 2 à 15 pays à `4/5`, 8 à 40 à `3/5`, au moins 60 pays froids (`0-2/5`) ;
7. les `4/5` ne ratent pas tous le même critère ;
8. ni la réponse ni un poursuivant ne se tient à moins de 5 % d'un seuil chiffré.

Le filtre 3 a été **trouvé en jouant, pas en relisant**. La journée des Maldives
servait « l'équateur traverse le pays » ET « le pays est situé entre les deux
tropiques » : deux familles, deux libellés — et un critère pour rien, puisque tout
pays traversé par l'équateur est entre les tropiques. La famille range par SUJET,
et ces deux-là parlent bien de deux choses ; c'est l'ensemble des pays qu'il faut
comparer.

Le filtre 8 protège d'une panne particulière : la population de 2018 n'est pas
celle du téléphone du joueur. Un joueur qui vérifie « plus de 50 millions » sur la
Colombie y lit 52 millions là où le barème en compte 49,6 — et il a raison contre
le jeu. On jette la journée plutôt que de gagner ce débat.

### Le stock

**51 journées** publiées, ni une de plus : le générateur explore les 4,5 millions
de combinaisons (avec une coupe sur l'intersection vide, 6 secondes), en garde
5 512 valides, puis choisit une suite en s'interdisant de se répéter — jamais deux
fois le même pays cible, jamais le même critère à moins de trois jours, jamais
plus de deux critères communs entre deux journées, jamais le même continent deux
jours de suite.

Répartition des cibles : Asie 12, Afrique 12, Europe 10, Océanie 6, Amérique du
Nord 6, Amérique du Sud 5. Distribution moyenne d'une journée :
`71,8 / 62,5 / 34,4 / 17,9 / 5,4 / 1`.

⚠️ **Le stock tourne en rond quand il est épuisé** : la 52e journée rejoue la
première. Ce n'est pas l'idéal, mais un écran d'erreur un matin serait pire. Le
remède est de relancer le générateur avec une bibliothèque de critères enrichie.

---

## 5. Analytics

**Pas de table, et c'est assumé.** La base de Placet est partagée avec une autre
application, ses migrations s'appliquent à la main, et on ne peut pas les éprouver
depuis l'environnement de développement. Créer une table de télémétrie à l'aveugle
sur une base de production, pour un jeu qui n'a pas encore prouvé sa boucle, c'est
prendre le risque du mauvais côté.

Chaque événement est une ligne JSON sur la sortie standard, ramassée par Vercel :
`partie`, `premier` (délai avant de se lancer), `essai` (pays et score),
`victoire`, `fini` (essais et secondes), `carte-complete`, `source`, `partage`.
Aucune adresse IP, aucun en-tête, aucun identifiant stable : la `partie` est un
jeton tiré par le navigateur pour la durée d'une partie.

La route de journal **n'accepte que des noms d'événements connus** et des champs
numériques — un point d'entrée qui recopie ce qu'on lui envoie est une injection
de journal offerte à qui passe.

---

## 6. Le calendrier

Fuseau produit **Europe/Paris**, déclaré. La date civile passe par `Intl` et non
par un décalage en heures : Paris vaut +1 ou +2 selon la saison, et une
soustraction fixe fait basculer la journée une heure trop tôt six mois par an.

Le numéro de journée est calculé **côté serveur**. Le laisser au navigateur ferait
dépendre le puzzle de l'horloge de chaque joueur, et « le même puzzle pour tout le
monde » ne survit pas à un client qui se croit demain.

L'API **accepte une journée passée, jamais une future** : la partie commencée à
23 h 58 et finie à 0 h 03 continue sur le puzzle d'hier (et c'est ce même contrat
qui rendra les archives possibles) ; le puzzle de demain, lui, ne s'obtient pas en
tapant un nombre.

---

## 7. Ce qui a été vérifié

**Au navigateur** (Chromium, 1280 × 900 et 390 × 844, en français), parties
complètes jusqu'à la victoire :

- un essai par **clic sur la carte** donne bien le pays visé — vérifié pays par
  pays sur le Brésil, l'Australie, l'Algérie, l'Inde et les Maldives ;
- **glisser la carte ne joue aucun pays** (le garde « le doigt a voyagé ») ;
- zoom molette, zoom boutons, panoramique, pincement ;
- le **même pays rejoué** rappelle son score sans consommer d'essai ;
- la victoire révèle les cinq critères et leurs sources, la carte complète colore
  les 193 pays, la légende donne le compte par score ;
- **rechargement après victoire** : la partie se retrouve telle quelle ;
- aucune erreur de console, dans aucun des deux formats.

**Par les outils** : `npm run build` (parité i18n des quatre langues incluse),
`npm test` (62 tests, dont 15 pour ce jeu), `eslint`, `tsc`.

**Le test rejoue la validation complète des 51 journées** à chaque `npm test` :
c'est le seul endroit qui garantit l'invariant « un seul pays à 5/5 » si une donnée
change sous un puzzle publié.

## 8. Ce qui n'a pas été vérifié

- **Aucun passage sur un vrai téléphone** ni sur un navigateur non-Chromium : le
  pincement à deux doigts et `navigator.share` sont écrits, jamais éprouvés à la
  main.
- **Les 25 listes éditoriales** (OPEP, conduite à gauche, gorilles, UNESCO…) ont
  été recopiées depuis les listes publiées que citent leurs sources, mais sans
  accès réseau depuis l'environnement de développement, elles n'ont **pas été
  re-vérifiées ligne à ligne contre la source en ligne**. Chaque critère porte son
  URL : c'est la première chose à relire avant une mise en avant publique.
- La **qualité ressentie** d'une journée (les seuils du §6.3 de la spec) n'est
  qu'un pari : les bornes sont instrumentées, pas mesurées. C'est ce que les
  analytics doivent trancher.
