# UNANIMO À L'ÉCHELLE D'UNE COMMUNAUTÉ — analyse

État au **2026-08-20**. Ce document n'est **pas** une spec : rien n'est construit,
et Banalo-le-jeu-de-salon reste clos. Il consigne l'étude d'une version
quotidienne « un sujet par jour pour toute la communauté », les mesures qui la
contraignent, et les décisions à ne pas refaire.

**Statut des chiffres**, marqué partout dans le texte :
· **mesuré** = lu dans le code ou la base ;
· **modélisé** = simulation avec vocabulaire artificiel, les ordres de grandeur
valent, pas les chiffres ;
· **à vérifier** = donné de mémoire, jamais confirmé.

---

## 1. Le verbe du jeu

Banalo n'est pas un jeu de vocabulaire, c'est un jeu de **coordination** :
deviner ce que les autres vont dire. La version communautaire n'ajoute donc pas
un second jeu, elle change la **surface d'entrée** du même : un mot, une entité,
un nombre, une prédiction sur autrui.

Tout ce qui suit découle de cette phrase.

---

## 2. Ce que devient la règle actuelle quand la salle grandit

Règle codée dans `scoring.ts` : *N joueurs ont écrit le mot → N points chacun ;
seul → 0*. **Modélisé** en ne changeant que l'effectif :

```
n joueurs │ mots écrits par UN SEUL (donc à 0 point) │ score médian
        3 │  85 %                                    │            5
        6 │  61 %                                    │           17
        8 │  45 %                                    │           23
       12 │  38 %                                    │           32
       50 │  10 %                                    │          119
      200 │   0 %                                    │          476
     5000 │   0 %                                    │       11 786
```

**Deux ruptures, pas une.**

**À partir d'environ deux cents joueurs, plus personne n'est jamais seul.** La
marche entre 0 et 2 points — que `scoring.ts` décrit comme « franche », et qui
est ce qui pousse à chercher l'évidence partagée — ne se déclenche plus. Le
risque disparaît, donc la décision aussi.

**Et le score mesure la fréquentation.** De 17 à 11 786 : deux journées ne sont
plus comparables, ce qui interdit série, rang et partage.

⚠️ **La fenêtre d'effectif du jeu de salon est 6 à 8.** À trois, la falaise
n'aiguise pas, elle écrase : on écrit huit mots et presque rien ne compte. Si
une partie à trois a paru sèche, c'est l'effectif, pas le jeu.

---

## 3. LA CONTRAINTE QU'ON NE PEUT PAS CONTOURNER : la purge

**Mesuré.** Un cron horaire `scrutin-game-purge` exécute :

```sql
delete from scrutin_game_rooms
 where last_active_at < now() - make_interval(days => 7);
```

Les quatre tables cascadent depuis la salle : sept jours après la dernière
activité, **la partie, les joueurs, leurs prénoms et tous leurs mots
disparaissent**. C'est pour ça qu'un comptage naïf rend zéro alors que des
parties ont bien eu lieu — la trace est ailleurs : `scrutin_game_entries` occupe
**622 Ko pour zéro ligne**, l'empreinte de lignes écrites puis supprimées.

⚠️ **Ce n'est pas un réglage, c'est un engagement publié.**
`20260810-jeux-retention.sql` l'explique : le prénom saisi est une donnée
personnelle figée dans le résultat de chaque manche, et « une durée non annoncée
est une durée qui n'existe pas ». Le chiffre 7 vit à **deux endroits** — la base
et la politique de confidentialité — et le changer d'un seul côté « transforme un
engagement écrit en mensonge ».

**Conséquence directe : il n'existe aucun corpus de fréquences, et il ne s'en
constituera jamais tant que la rétention est celle-là.** Tout projet qui suppose
une distribution de référence bute d'abord ici.

### La sortie propre : agréger sans conserver

Rien n'empêche le dépouillement d'écrire, à côté, une ligne **strictement
anonyme** — `sujet, réponse normalisée, compteur` — sans joueur, sans salle, sans
prénom, sans date de partie. La purge continue d'effacer les parties ; le corpus
se constitue quand même.

⚠️ **Avec un seuil, sinon l'agrégat n'anonymise rien.** Trois joueurs, huit mots
chacun, un mot inhabituel : la liste est ré-identifiante. Ne compter une réponse
qu'à partir de *k* salles distinctes, et n'écrire l'agrégat qu'à ce moment.

---

## 4. Trois types de question, trois coûts

### A. Le mot libre (Banalo tel quel)

Ce qu'on a déjà. Coût : la normalisation existe et est éprouvée
(`normalizeWord` / `scrutin_game_norm`), les 68 thèmes portent quatre langues.

Deux limites propres à ce type :
- **68 thèmes = 68 jours par langue**, et un thème ne se rejoue pas pour la même
  personne : on réécrit les huit mêmes mots. Le recyclage est ici une fin, pas
  une gêne — contrairement à Cinq sur cinq, dont une journée revue reste une
  énigme.
- **L'appariement est lié à la langue** : « sable » ne rencontrera jamais
  « sand ». La communauté est divisée par quatre dès le premier jour.

### B. L'entité (« quels pays vont entrer en guerre ? »)

Même mécanique, sur un ensemble d'entités. Le barème du §5 s'applique tel quel.

⚠️ **LE PIÈGE DES ALIAS, et il est spécifique à ce type.** « USA »,
« États-Unis », « Etats Unis », « Amérique » sont UNE réponse. `normalizeWord`
plie les accents et les pluriels, **pas les synonymes**. Que « sable » et
« plage » soient deux mots distincts est normal ; que « USA » et « États-Unis »
le soient est un bug qui fausse la distribution *et* le score.

**Le remède est déjà écrit** : la recherche de Cinq sur cinq (`Recherche.tsx` sur
`referentiel.ts`) résout une saisie libre sur 193 pays en quatre langues. Une
question sur des pays coûte donc **moins cher** qu'une question sur des mots.

Réserve de fond : à dix ans d'horizon, la réponse n'est jamais confrontable au
réel. La révélation doit dire « ce que les joueurs pensent », jamais « ce qui va
arriver » — et elle nomme des États réels, ce qui n'est plus tout à fait un
résultat de jeu.

### C. Le nombre (« combien pèse … ? »)

**Le type le moins cher et le plus solide** : pas d'alias, pas de table
d'entités, pas de langue. Genre connu et inépuisable : les **problèmes de
Fermi** — estimables, introuvables sur le web, ce qui est exactement l'intention.

> Le poids de tous les ballons de football présents en France aujourd'hui.
> Le poids des cheveux coupés en une journée dans les salons français.
> Le poids des pièces de monnaie oubliées sous les canapés du pays.

Deux décisions, **modélisées** (1000 estimations, 1 % de réponses absurdes) :

**La référence est la MÉDIANE, jamais la moyenne.**

```
vérité                 4 200
moyenne              3,6×10⁸   ← détruite par 1 % de trolls
moyenne géométrique    4 646   ← encore tirée
MÉDIANE                3 930   ← tient
```

**L'écart se compte en FACTEURS, pas en unités.** Deux joueurs également bons,
l'un à ÷3 et l'autre à ×3 de la médiane :

```
écart linéaire        2 620  vs  7 860   → le prudent gagne toujours
écart logarithmique    0,48  vs   0,48   → à égalité, comme il se doit
```

D'où le barème : **dix points, moins dix par facteur dix d'écart.**

```
points = 100 − 100·log₁₀(facteur), borné à [0 ; 100], arrondi au DIXIÈME
```

**Il était en cinq paliers, et les cinq paliers ne classaient rien.** Première
version : ×1,25 → 10 pts · ×2 → 6 · ×5 → 3 · ×10 → 1 · au-delà → 0. Mesuré sur
une foule simulée (log-normale d'écart-type ×3, plus 1 % d'absurdités) :

```
                      scores distincts   ex aequo   plus gros paquet
paliers,    214 joueurs        5           100 %         42 %
paliers, 20 000 joueurs        5           100 %         38 %
CONTINU,    214 joueurs      188                          2,3 %
CONTINU, 20 000 joueurs      944                          4,7 %
```

Avec cinq valeurs possibles, le rang et la part **n'avaient plus rien à
mesurer** : un joueur sur trois partageait son score avec sept mille autres, et
« 63e sur 214 » était surtout une coïncidence de comptage. Le classement était
donc décoratif — ce qui est le contraire de ce qu'on lui demandait, puisque la
part est le chiffre qu'on met devant.

**Ce n'est pas un nouveau barème, c'est l'ancien sans les marches.** La courbe
passe presque exactement par les repères déjà annoncés — ×1,25 → 90,3 (contre
100), ×2 → 69,9 (contre 60), ×5 → 30,1 (contre 30), ×10 → 0. Rien n'a
été retuné ; on a seulement cessé d'écraser la valeur sur le bas de sa tranche.
Et l'énoncé est plus court qu'avant, ce qui compte : le barème doit rester
vérifiable de tête, et il est maintenant **écrit à l'écran**, sous l'écart.

Deux détails qui ne sont pas des détails :

* **Le zéro reste un paquet.** Au-delà de ×10, tout le monde a la même note.
  « Raté d'un facteur dix ou plus » est UNE information ; départager ×50 de ×500
  ferait dépendre le bas du classement des fautes de frappe. C'est d'ailleurs le
  plus gros paquet restant (4,7 %), et il doit le rester.
* **La base est de la présentation, la décimale porte la résolution.** Mesuré :
  « 87,5 sur 100 » et « 875 sur 1000 » rendent exactement les mêmes paliers
  (188 / 775 / 944 scores distincts). Mais **cent paliers entiers** feraient
  remonter les ex aequo médians de 28 à 259 sur 20 000 joueurs. Deux décimales,
  à l'inverse, ne gagneraient que 28 → 6 — imperceptible, et un chiffre de plus
  à lire tous les jours.
* **L'arrondi au dixième n'est pas cosmétique : le rang se calcule dessus.**
  Classer sur la valeur exacte et n'afficher que deux décimales montrerait deux
  joueurs au même score avec deux rangs différents. En base, le type est
  `numeric` et non `double precision`, parce que l'égalité y est exacte.
  Répartition obtenue : 16,6 % au-dessus de 9, 29,4 % entre 7 et 9, 22,4 % entre
  5 et 7 — ça discrimine sans écraser.

---

## 5. Le barème des réponses ouvertes : rareté PLANCHÉE

**Le problème posé :** la rareté pure est exploitable. Elle n'est pas bornée par
le bas — toute chaîne inventée est maximalement rare, il y en a une infinité, et
elles sont gratuites. Aucun réglage de la courbe ne corrige ça.

**Le correctif n'est pas de doser la rareté, c'est d'exiger une corroboration :**
une réponse ne vaut que si assez d'autres, *indépendamment*, l'ont trouvée.

**Et le plancher se dit en PART, jamais en nombre.** Deux complices parmi 3000
font 0,07 %. Franchir 1 % demanderait trente complices coordonnés sur la même
réponse, chaque jour, dans chaque langue — ce n'est plus une entente, c'est une
organisation. En prime, la part rend les journées comparables.

**Modélisé**, 3000 joueurs, 3 réponses chacun :

```
                                     actuel      rareté pure    échelle
médiane de la foule                    1525               23         10
les 3 réponses les plus évidentes      2873 ×1.9           1 ×0.0     7 ×0.7
des réponses visées dans la bande 1–3 % 233 ×0.2          12 ×0.5    30 ×3.0
DEUX COMPLICES sur une réponse inventée    6 ×0.0        450 ×19.6    0 ×0.0
```

La rareté pure paie la triche **vingt fois la médiane**. Le barème actuel
récompense l'évidence. L'échelle fait les deux correctement :

> **Une réponse rapporte d'autant plus qu'elle est rare — à condition qu'au moins
> 1 % des joueurs l'aient trouvée.**
> 1–3 % → **10** · 3–10 % → **6** · 10–30 % → **3** · au-delà → **1** ·
> en dessous de 1 % → **0**

Bornée à 30 pour trois réponses, explicable en une ligne — ce que `scoring.ts`
exige (« l'EXPLIQUER à l'écran, quand un joueur conteste un point »).

Propriété agréable : dans ce barème, **la fuite ne rapporte presque rien**.
Copier les réponses évidentes d'un ami vaut 1 point pièce. Le secret devient
beaucoup moins critique qu'avec le barème actuel.

### Trois réponses, pas huit

Huit ne créent aucune décision : on écrit les cinq évidentes puis du remplissage.
**Trois forcent l'arbitrage** — une sûre et deux paris, ou trois paris ? C'est la
rareté des emplacements qui fabrique le choix, exactement comme les cinq cases de
Cinq sur cinq. Et ça met la partie à trente secondes.

---

## 6. ⚠️ DEUX BARÈMES INVERSES COHABITENT

| ce qu'on demande | ce qu'on récompense |
|---|---|
| « Que répondra la majorité ? » | **le centre** — la réponse modale, la médiane |
| « Citez des … » | **la bande utile** — ni l'évidence, ni le solitaire |

Ce sont des règles **opposées**. Un joueur qui applique la mauvaise perd sans
comprendre pourquoi. **Le jeu doit donc dire, question par question, laquelle
s'applique.**

C'est le même point que la consigne : à une table de six, « des mots sur la mer »
suffit parce qu'on lit la pièce. À trois mille, il n'y a pas de pièce à lire —
la consigne doit **nommer la cible** :

> « Trouvez une réponse que **peu** de gens auront — mais que **plusieurs**
> auront quand même. »

---

## 7. La boucle qui règle le problème de timing

Le verdict de Cinq sur cinq est instantané parce qu'il se calcule contre cinq
critères fixes. Ici il se calcule contre les autres joueurs, qui arrivent sur
24 heures. D'où :

> **Aujourd'hui** : vous répondez, et vous prédisez la foule.
> **Immédiatement** : vous découvrez le résultat **clos d'hier**, et votre score
> sur votre prédiction d'hier.

Score instantané, jamais mouvant, calculé sur une population complète — et la
prédiction du jour reste en suspens, ce qui donne une raison de revenir.

⚠️ **Le jeu de mots de salon ne peut PAS faire ça**, et c'est une différence de
nature : son plaisir est la simultanéité (« Chloé aussi l'avait écrit »), qui
meurt si on la diffère. Le plaisir d'une prédiction est *la réponse*, qui voyage
très bien d'une nuit à l'autre. Le délai cesse d'être un défaut.

### Demander deux choses

La réponse **et** l'estimation de la foule. Un geste de plus, trois gains : deux
curiosités au lieu d'une, et surtout **la réponse qui surprend** — celle choisie
plus souvent que les joueurs ne l'avaient prédit. C'est souvent plus intéressant
que la majorité, et c'est une révélation quotidienne gratuite.

### La charnière : 11 h 30, heure de Paris

**Pourquoi cette heure** : le résultat de la veille est déjà là quand on part
déjeuner, et la nouvelle question s'ouvre juste avant la pause — le créneau où se
joue Pédantix. La boucle tombe alors juste : la question ouvre à 11 h 30 et se
ferme à 11 h 30 le lendemain, donc le résultat clos de la veille est prêt
exactement quand la nouvelle question s'ouvre.

**La journée n'est plus une journée civile.** `dateCivile` et `numeroDeJournee`
de Cinq sur cinq découpent à minuit ; ici il faut retrancher 11 h 30 à l'instant
avant d'en prendre la date. La fonction est courte, mais elle ne se réutilise pas
telle quelle — et tout ce qui dépend du numéro en dépend aussi : la clé de
stockage local, la colonne `jour`, la série.

⚠️ **NE JAMAIS AFFICHER UNE DATE CIVILE À CÔTÉ DU NUMÉRO DE JOURNÉE.** À 11 h 00
et à 12 h 00 le même mardi, on est sur deux journées de jeu différentes. « Vous
avez joué aujourd'hui et hier » un même mardi est exact et illisible. On dit la
fenêtre, pas la date : « jusqu'à 11 h 30 demain ».

⚠️ **« 11 h 30 à Paris » NE S'ÉCRIT PAS DANS UN CRON.** `pg_cron` planifie en
UTC, et Paris passe de UTC+1 à UTC+2 : `30 11 * * *` vaut 12 h 30 l'hiver et
13 h 30 l'été. L'heure de bascule traverserait donc le déjeuner deux fois par an,
dans un sens puis dans l'autre. Le motif déjà en place dans le dépôt est le bon —
`scrutin-game-purge` tourne toutes les heures et laisse le SQL trancher.
**Planifier souvent, décider dans la fonction.**

**Le fuseau est un choix, pas une évidence.** 11 h 30 à Paris, c'est 5 h 30 à
New York et 19 h 30 à Tokyo. Ça marche pour l'Europe et pour `pcm` (Lagos est à
une heure près), pas pour les Amériques. Minuit, chez Cinq sur cinq, est neutre :
personne n'attend que minuit-Paris soit sa pause déjeuner. 11 h 30 optimise
explicitement un fuseau — défendable pour un produit d'abord français, mais à
décider plutôt qu'à subir.

---

## 8. Le rang : tout de suite, puis définitif

À la validation, puis en définitif le lendemain — mais **ce n'est pas le rang
qu'on met devant**.

```
        Dans les 18 % du haut          ← le chiffre en gros
   38e sur 210 votants, ex aequo avec 8 personnes    ← en dessous, en petit
```

⚠️ **LE CENTILE DEVANT, LE RANG DERRIÈRE — c'est le même arbitrage que sur Cinq
sur cinq, et pour la même raison : devant, ce qui ne se dément pas.** Là-bas le
nombre d'essais est passé devant le rang parce qu'il appartient au joueur et ne
bouge plus. Ici le score est relatif par construction — il n'existe aucun chiffre
« à soi » — donc c'est la mesure relative STABLE qui prend la première place, et
la volatile qui passe en second.

**Ça ne fuite rien, et c'est vérifiable.** Le rang se déduit du score, le score
de l'écart à la foule — mais il ne nomme aucune réponse, ni celles du joueur ni
celles des autres. Même propriété que le rang de Cinq sur cinq : une position et
un effectif, rien qui désigne quiconque.

**Le compte d'ex aequo n'est pas une décoration.** « Ex aequo avec 8 personnes »
dit qu'on est dans une grappe, donc qu'on a répondu comme un groupe. C'est
exactement l'information émotionnelle du jeu — *suis-je typique ?* — livrée sans
montrer une seule réponse.

**Le rang est olympique**, comme `scrutin_game_pays_rank`, et pour la raison qui
y est écrite : à égalité de score, même rang, sinon deux joueurs identiques sont
départagés par l'ordre d'arrivée et c'est le fuseau horaire qu'on récompense.
Réutilisable tel quel.

### ⚠️ Le piège : le rang provisoire va MÉCANIQUEMENT empirer

À 11 h 45 on est 38e sur 210. Le lendemain on est 412e sur 2 300 — sans avoir
rien fait de mal, simplement parce que d'autres sont passés. Un joueur qui a vu
« 38e » et découvre « 412e » se croira floué, et il aura l'air d'avoir raison.

C'est précisément ce que la hiérarchie ci-dessus désamorce :

```
à la validation    dans les 18 % du haut  ·   38e sur 210 votants
le lendemain       dans les 18 % du haut  ·  412e sur 2 300 votants
```

Le chiffre mis en avant est **le même les deux fois**. Le rang, relégué en
second, se lit alors pour ce qu'il est — une façon de comprendre sa position, pas
une promesse. Mis devant, il serait une promesse qu'on reprend le lendemain.

⚠️ **Et un plancher, comme pour les pourcentages.** « 3e sur 7 » à 11 h 31 n'est
pas un rang, c'est du bruit — et il n'y a pas encore d'ex aequo à compter. En
dessous du seuil, ne pas afficher de rang : dire que le dépouillement commence.
C'est la règle du §9 appliquée ici — **ce qu'on affiche suit le nombre de
votants.**

---

## 9. Les garde-fous

### Le seuil d'audience — et il commande la formulation

**Statistique**, marge à 95 % sur une proportion :

```
joueurs/jour │ marge   │ ce qu'on peut honnêtement afficher
         100 │ ±10 %   │ une tendance, arrondie à 10 points
         300 │  ±6 %   │ une tendance, arrondie à 10 points
         600 │  ±4 %   │ un chiffre à ±5 points
        3000 │  ±2 %   │ un chiffre au point près
```

À 100 joueurs il faut **20 points d'écart** pour affirmer qu'une option devance
l'autre. Et l'audience se divise par quatre langues.

**Règle à coder dès le premier jour : la précision du chiffre affiché suit le
nombre de réponses du jour.** En dessous du seuil on écrit « une nette
majorité » ; au-dessus, on écrit 61 %. Sans ça, on publie un faux chiffre avant
de s'en apercevoir.

### L'auto-sélection touche la crédibilité de Placet

La « population » n'est pas la population : ce sont les gens qui jouent à un jeu
sur Placet. Or Placet vend un outil de vote sérieux — publier un échantillon
auto-sélectionné comme s'il était représentatif abîme exactement son actif.
Formulation scrupuleuse partout : **« les joueurs d'aujourd'hui »**, jamais
« les gens ».

### La formulation décide du régime juridique

- « Pour qui **allez-vous** voter ? » recueille l'opinion politique du répondant :
  **donnée de catégorie particulière**, régime propre. Sur un produit de vote,
  c'est le pire endroit où se le permettre.
- « Selon vous, **pour qui votera la majorité** ? » recueille une prédiction sur
  autrui — et c'est exactement le jeu.

**Ne jamais demander le vote, toujours demander la prédiction.**

⚠️ **À VÉRIFIER, jamais confirmé ici** (pas d'accès web dans la session
d'analyse) : en France, la publication de chiffres de prévision électorale
pendant une campagne relève d'un régime encadré — loi sur les sondages,
Commission des sondages, restrictions à l'approche du scrutin. Un jeu qui
afficherait « les joueurs prédisent 31 % pour X » à trois jours du vote pourrait
ne pas être regardé comme un jeu. **Parade simple : aucune question portant sur
une élection en cours.**

---

## 10. Ce qui est réutilisable tel quel

- `normalizeWord` / `scrutin_game_norm` — normalisation éprouvée, et son test qui
  crie si les deux divergent ;
- `themeTokens` — exclusion du sujet lui-même, et de chacun de ses mots pleins ;
- la recherche de Cinq sur cinq — résolution d'entités sur 193 pays × 4 langues ;
- toute la machinerie de journée : origine, numéro du jour en heure de Paris,
  table de résultats, rang olympique avec médiane, série locale, bloc de compte,
  partage en escalier, QR de partage.

---

## 11. Ordre de travail proposé

1. **La question chiffrée (type C).** Pas d'alias, pas de table d'entités, pas de
   politique, barème déjà mesuré, contenu inépuisable — et elle exerce toute la
   boucle du §7. C'est le test le moins cher de l'idée entière.
2. **Les questions à entités (type B)**, en réutilisant la recherche de pays.
3. **Les questions de prédiction d'opinion**, en dernier, une fois le régime de
   publication tranché.
4. **L'agrégat anonyme (§3)** dès qu'on veut un score absolu et instantané.

Deux choses à poser dès la première ligne plutôt qu'après coup, parce qu'elles
traversent tout : **le découpage à 11 h 30** (§7), qui touche le numéro de
journée, la clé de stockage et la série ; et **le centile mis devant le rang**
(§8), qui n'est pas un habillage mais ce qui empêche le chiffre de se démentir le
lendemain.

---

## 12. Ce qui n'est pas vérifié

- Les tableaux des §2, §4C et §5 sont des **modèles** à vocabulaire artificiel.
  Ils montrent des ruptures, pas des valeurs. Les bornes 1 / 3 / 10 / 30 % sont
  un pari à revoir sur données réelles — objectif : le joueur médian marque
  environ un tiers du maximum.
- Le régime français de publication des sondages n'a **pas** été vérifié.
- **Le plancher arrête l'entente, pas la mode.** Si la communauté décide d'écrire
  « banane » sur tous les sujets, ça franchit 1 % et ça rapporte. Seule une
  contrainte de pertinence par sujet le corrigerait, et elle demande le corpus.
