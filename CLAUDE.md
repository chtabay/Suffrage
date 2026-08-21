# Placet — règles du dépôt

Ce fichier est lu au démarrage par **tout** agent qui travaille ici. Il ne décrit
pas le produit (les specs sont dans `docs/`) : il porte les règles qui coûtent
cher quand on les ignore, et le partage du terrain entre agents.

## Qui tient quoi, en ce moment

Plusieurs agents travaillent sur ce dépôt **en même temps et dans le même
répertoire de travail** — pas dans des clones séparés. Deux d'entre nous ont déjà
commité l'un par-dessus l'autre. Avant de toucher un fichier, regarde cette
liste ; si le sujet appartient à quelqu'un d'autre, signale-le plutôt que de le
corriger.

| Chantier | État | Qui |
|---|---|---|
| **Jeu 3** | en cours | l'agent des jeux |
| **Banalo en groupe** (`games/banalo`) | en prod, relu ; **renommé depuis « Unanimo » le 2026-08-20** (marque) | fermé, sauf la présentation |
| **Banalo du jour** (`games/banalo-jour`) | posé le 2026-08-20 : deux formats (nombre, mots), charnière 11 h 30, score sur 100 avec chaleur. L'étude est dans `docs/banalo-quotidien.md` | ouvert |
| **Alibi** (`games/alibi`) | en prod, **relu et corrigé le 2026-08-13** | fermé — **ne pas y revenir** |
| **Gestion de groupes** (`/espaces`) | en prod, 24 constats moyens/faibles en réserve | la session tableau de bord |
| **Cinq sur cinq** (`games/pays`) | en prod le 2026-08-18 · pictos de catégorie et mise en avant des essais le 2026-08-19 | ouvert |
| **La Nuit du Fantôme** (`games/fantome`) | en prod ; portraits SVG + murmures de borne posés le 2026-08-18 | l'agent des jeux |
| **La porte `/games`** | rangée par familles le 2026-08-18 ; ajouter un jeu = lui donner une `famille` dans `catalog.ts` | l'agent des jeux |
| **Aperçus d'écrans** (`components/games/Apercus.tsx`) | posés sur Rôdeurs et Banalo ; **reproduits, jamais capturés** — une capture ne parle qu'une langue sur quatre | l'agent des jeux |

**Alibi est clos.** Sa relecture indépendante a produit 53 constats ; les deux
bloquants, les trois forts et le reliquat d'écran sont corrigés et poussés. Ce
qui reste est consigné dans la mémoire du projet (`jeu-alibi.md`), pas dans le
code. Si tu tombes dessus en cherchant autre chose : laisse.

**La borne du Fantôme est une BALISE, jamais un guichet.** Le portrait parle —
son murmure de pièce, puis douze murmures de manoir qui tournent — mais il
n'attend jamais de réponse, et c'est un calcul, pas une omission : 11 joueurs ×
3 tâches × 90 s font 49 min de borne-temps par manche contre 24 min de capacité.
La moindre interaction qui demande une réponse recrée une file d'attente devant
un tableau. Et aucun murmure ne désigne quelqu'un : un décor qui accuse
fabriquerait une preuve que le jeu n'a pas calculée.

**Le slug d'un jeu est ÉCRIT EN BASE et sert d'aiguillage.** `game_reveal` et
`get_game_room` branchent sur `scrutin_game_rooms.game`. Renommer un jeu côté
application sans toucher à la base fait donc échouer le dépouillement **en
silence** : la manche passe en `reveal` et aucun score n'est calculé. Le
renommage d'Unanimo en Banalo a dû passer par `20260820-banalo-renommage.sql`,
qui fait accepter les DEUX valeurs le temps que la purge emporte les anciennes
salles. Les fonctions `scrutin_game_unanimo_*` gardent leur nom : ce sont des
identifiants Postgres, et les migrations déjà appliquées ne se réécrivent pas.

**Les parties de jeu s'effacent au bout de SEPT JOURS.** Un cron horaire
`scrutin-game-purge` supprime les salles inactives, et les joueurs, manches et
saisies cascadent avec. Deux conséquences qui surprennent : un comptage rend zéro
alors que des parties ont eu lieu (la trace est dans la taille des tables, pas
dans les lignes), et **aucun corpus de mots ne peut se constituer**. Le chiffre 7
vit aussi dans la politique de confidentialité : le changer d'un seul côté
transforme un engagement écrit en mensonge. La sortie propre, si on veut un
corpus, est d'écrire un agrégat anonyme à côté — voir `docs/banalo-quotidien.md`.

**Cinq sur cinq n'est pas clos, et le stock de 51 journées est ASSUMÉ.** Le jeu
sort une journée par jour, générée par `scripts/pays-journees.ts` ; le 7 octobre
2026 il recommence à la première, et **ce n'est pas un problème** : la période
sert à tester. Ne pas rouvrir ce sujet comme s'il s'agissait d'une échéance.

Ce qui plafonne le stock n'est pas la bibliothèque entière (58 critères) mais son
**étagère du haut** — 7 critères de palier `signature`, alors que chaque journée
doit en porter un. C'est bon à savoir le jour où on voudra allonger : doubler
cette seule étagère rapporte plus que trente critères larges.

L'étagère `signature` mince a une seconde conséquence, elle sur le jeu lui-même :
elle interdit de montrer la catégorie de la cinquième case. À 7 critères sur
4 catégories, ce picto laisserait deux candidats et nommerait le critère 3 fois
sur 51. La cinquième case se tait donc — c'est aussi ce qui fait la fin de
partie, puisque 28 % des pays à 4/5 ne ratent qu'elle. Les autres parlent au grain
de 5 catégories larges (les 30 `famille` nommeraient le critère une fois sur
trois : trop fin, mesuré).

**Mais LA CASE 1 PARLE DÈS LE PREMIER COUP** (`ESSAIS_AVANT_PREMIER_PICTO`),
alors que les trois du milieu attendent 15 essais (`ESSAIS_AVANT_PICTOS`). C'est
un retour de terrain sur de vrais nouveaux joueurs : sans repère après leur
première proposition, **ils cliquent partout sur la carte** — le jeu leur rendait
un chiffre et cinq cases muettes, de quoi savoir qu'on a marqué, pas où
chercher. ⚠️ Et l'ouverture est presque gratuite en secret : mesuré sur les 51
journées, l'étiquette de la case 1 dit « continent » **37 fois**, « latitude »
11 fois, et se tait 3 fois. C'est le défaut connu de l'étagère `large`
(6 continents sur 9) qui joue ici en notre faveur — on ouvre ce que l'habitué
connaît par cœur et qui manque au débutant.

Trois conséquences à ne pas défaire : la légende du premier coup est **une
récompense encadrée**, pas une ligne grise de 12,5 px (c'est ce qui la rend
visible sur un écran presque vide) ; la modale du seuil se déclenche sur
`> 1` étiquette et **jamais sur `some`**, sinon elle surgirait à la première
proposition de chaque partie — une interruption quotidienne ; et une case
encore verrouillée affiche « à venir », **pas le « · » des cases muettes** —
le même glyphe pour « pas encore » et « jamais » se lit comme une panne.

⚠️ **UNE PASTILLE QUI PARLE N'A PAS L'AIR D'UNE PASTILLE QUI SE TAIT**, et la
NOUVEAUTÉ SE VOIT DANS LA RANGÉE. Deuxième retour de terrain : « la ligne des
catégories passe parfois inaperçue, d'autant qu'il y a 5 catégories affichées
directement et l'indice ajouté n'est pas mis en lumière ». Cinq pastilles
habillées pareil dont une seule porte quelque chose : l'œil ne trouve pas
laquelle. Celle qui parle est donc pleine et cernée, les autres s'effacent ; et
celle qui vient d'arriver passe au jaune, jusqu'au coup suivant. C'est
`pictosAvant` dans la sauvegarde qui porte la différence — pas un booléen
« déjà vu », sinon un rechargement éteindrait la nouveauté avant qu'elle ne
soit vue. La modale du seuil montre la même rangée, donc le joueur voit que
DEUX pastilles sont neuves et que « continent » ne l'est pas.

**L'ENQUÊTE NE SE DEVINE PAS, ON LA MONTRE SUR LES PROPRES PAYS DU JOUEUR.**
Troisième retour : « les joueurs ont du mal à voir qu'il y a une enquête à faire
entre les indices communs entre pays ». La règle était pourtant écrite au-dessus
de la liste — mais une phrase générale se saute. Au DEUXIÈME essai, quand la
déduction devient possible, une ligne nomme deux de leurs pays et la case qu'ils
partagent. ⚠️ Elle choisit la case la plus RARE partagée (celle qui vaut le plus
cher), elle se tait s'il n'y a rien à recouper, et elle disparaît après
`ESSAIS_AVEC_EXEMPLE` coups — un exemple qui reste devient du bruit à l'endroit
exact où le joueur vient lire ses essais. Elle est aussi **plus discrète que la
récompense** : deux cadres à l'accent empilés font un mur, et c'est l'indice
qu'il faut voir en premier.

**LA LÉGENDE EST UNE BARRE DE FILTRE, pas seulement un décodeur.** Toucher une
case allume les pays qui la remplissent, dans l'historique ET sur la carte : le
recoupement cesse d'être une chose à imaginer, il devient un geste. ⚠️ TOUTES les
pastilles sont cliquables, **y compris celles qui se taisent** — ce qui filtre
est la POSITION, pas l'étiquette, et « quels de mes essais remplissent la
cinquième case ? » est la question la plus utile du jeu. Ça donne du même coup un
rôle aux pastilles « à venir ». Trois règles : on **éteint** les lignes, on ne
les masque pas (masquer ferait sauter les numéros d'essai et détruirait la
chronologie) ; le filtre **tombe à chaque coup**, sinon le pays qu'on vient de
jouer arrive éteint dans une liste grisée et se lit comme une panne ; et il n'est
**pas dans la sauvegarde**, parce que c'est un geste de lecture, pas un état de
partie.

**DEUX MODALES, DEUX PUBLICS, DEUX MOMENTS.** Au PREMIER coup, la MÉTHODE
(« comment chercher ») — et seulement pour qui en a besoin :
`rappelleLaMethode` la réserve aux trois premières parties **finies** et au
retour après `JOURS_ABSENCE`. ⚠️ Ce sont des VICTOIRES qu'on compte, pas des
visites : quelqu'un qui a ouvert le jeu trois fois sans jamais trouver reste un
débutant, et c'est voulu. Servie tous les jours à un habitué, elle dirait
toujours la même chose — c'est son objet — et deviendrait une boîte qu'on ferme
sans lire, usant la seule forme d'annonce dont le jeu dispose. Elle ne descend
pas du serveur : elle se construit sur `pictos[0]`, que le client a déjà.

Au CINQUIÈME coup, l'INTRO DE LA JOURNÉE (`sujetDuJourDe`), pour tout le monde :
c'est la seule annonce dont le contenu CHANGE d'un jour à l'autre.

⚠️ **ELLE VIENT DU CONTENU, PAS DE LA FORME — et c'est mesuré.** Tous les
signaux de forme retombent sur un ventre mou, parce que le générateur valide les
journées dans une bande jouable : une catégorie domine 33 journées sur 51 mais
c'est « géo » 32 fois ; les pays à 3/5 tiennent entre 11 et 39 avec 43 journées
au milieu ; ceux à 0/5 vont de 24 à 137 avec 31 journées au centre. L'uniformité
est une propriété **voulue** du générateur. Le grain `sujet` (10 valeurs, entre
les 30 familles et les 5 catégories), lui, donne 28 combinaisons distinctes sur
51 journées ; en annonçant le sujet le plus RARE du jour on obtient **7 valeurs,
la plus fréquente à 37 %**.

⚠️ **TROIS GARDES, ET IL FAUT LES TROIS** : jamais le cinquième critère (sa case
ne parle pas, c'est elle qui fait la fin de partie) ; jamais un sujet que la
bibliothèque ne porte qu'une fois (« usages » n'en a qu'un — le nommer, c'est le
désigner : même `SEUIL_ETIQUETTE` que les étiquettes) ; jamais le sujet que la
case 1 dit déjà. Ce qu'on donne reste **strictement plus faible que la légende
du seuil** : un sujet, sans position, contre quatre étiquettes placées. Le
serveur rend une CLÉ, l'écran a les dix phrases — et un `switch` de clés
littérales, jamais `t(\`sujetJour.${cle}\`)`, sinon le contrôle de parité ne
les voit plus.

**Les deux aides de Cinq sur cinq S'ANNONCENT, elles n'apparaissent plus en
silence.** La légende des cases se posait au-dessus d'une liste de quarante
lignes, en gris 12,5 px : un joueur qui vient de taper son quinzième pays
regarde sa pastille de score, pas le haut de l'historique. `AideModale` est la
seule modale des jeux, et elle est acceptable pour une raison précise — **une
fois par aide et par partie**. ⚠️ Ce qui est mémorisé est le PALIER FRANCHI
(`vues` dans la sauvegarde), pas la présence de l'aide : les pictos reviennent
dans toutes les réponses passé le seuil, donc tester leur présence rouvrirait la
modale à chaque essai. Et les annonces font une FILE — la première version en
gardait une seule et marquait les deux comme vues, donc la seconde disparaissait
sans bruit dès qu'un joueur reprenait une partie de 49 essais.

**Passé 50 essais, le jeu OFFRE UN PAYS** (`coupDePouceDe`) — c'est la suite du
défaut qui a produit les pictos (« à partir de la 50e, mes conclusions n'ont pas
évolué »). ⚠️ Ce qu'on offre est **un pays et ses cinq cases**, pas une
information d'un autre ordre : aucun vocabulaire nouveau, aucune fuite sur la
bibliothèque de critères. Trois garanties mesurées sur les 51 journées : c'est
toujours un **4/5**, donc jamais la réponse (il en existe 2 à 10 par jour,
médiane 6) ; on préfère celui qui **remplit la cinquième case** — celle qui ne
parle jamais et qui fait la fin de partie — et les 51 journées en ont un ; et il
**ne compte pas comme un essai**, parce que facturer une aide non demandée serait
injuste et qu'à cinquante coups le classement est de toute façon joué.

⚠️ Mesuré et ÉCARTÉ : révéler la sous-région laisserait 2 à 17 pays (médiane 9),
c'est-à-dire la partie résolue ; le continent en laisse 44 mais ne dit rien de
neuf à qui a déjà essayé cinquante pays.

**Le partage de Cinq sur cinq ne raconte plus la partie, il la RÉSUME.** Deux
retraits successifs : d'abord un emoji par essai (509 caractères pour 156 coups,
donc une taille sans borne), puis la « montée » en cinq lignes fixes — écartée à
son tour sur retour de terrain, parce qu'un ami ne compare pas des trajectoires,
il compare un score. Restent le nombre d'essais et, **quand il existe**, le rang
du jour. ⚠️ `scrutin_game_pays_rank` exige `auth.uid()` et `anon` n'a pas le
droit d'exécution : sans compte le passe-plat rend `null` et la ligne se tait —
ce n'est pas une panne.

**Le rang n'est plus ce qu'on met devant.** Le classement est bien calculé sur
les essais (rang olympique, `scrutin_game_pays_rank`), mais l'écran mettait la
position en avant et ne montrait le nombre d'essais nulle part. C'est le chiffre
du joueur qui passe devant, avec la **médiane du jour** pour l'échelle — elle
était déjà renvoyée par la RPC et n'était affichée nulle part. Le rang reste,
en dessous et en petit.

Ce jeu a aussi ajouté à la base `scrutin_game_pays_results` et trois fonctions
`scrutin_game_pays_*` (migration `20260818-jeu-pays-resultats.sql`) : RLS active,
aucune policy, tout passe par les fonctions `security definer`.

**Banalo a DEUX entrées au catalogue pour un seul nom**, et c'est voulu : la
porte « Jouer » range par OCCASION, pas par genre. `banalo` (salle, 3–12 joueurs)
vit sous « Tomber d'accord », `banalo-jour` (seul, deux minutes) sous « Un par
jour ». Conséquence à ne pas rater : **`banalo-jour` n'est PAS une valeur de
`scrutin_game_rooms.game`** — c'est le seul slug du catalogue qui n'aiguille rien
en base. Le mode quotidien n'a pas de salle ; sa clé est `(jeton, jour, langue)`
dans `scrutin_banalo_reponses`.

⚠️ **Un raccourci destructeur muet finit toujours par mordre.** Dans la saisie
de Banalo en groupe, Retour arrière sur champ vide retirait le dernier mot —
idiome courant des champs à jetons — mais **sans filtrer la répétition de
touche**. Or l'ajout d'un mot vide le champ, donc la condition est armée juste
après ; maintenir la touche en croyant vider un champ effaçait une dizaine de
mots, en silence. Signalé par des joueurs qui ne pouvaient pas l'expliquer. Deux
gardes, et il faut les deux : `e.repeat` écarté, et **deux appuis distincts** —
le premier arme le mot (barré, rouge), le second le retire, toute autre frappe
désarme.

**Une réponse de Banalo du jour est DÉFINITIVE, et c'est structurel.** La RPC
rend la médiane du moment ; si un second dépôt écrasait le premier, il suffirait
de répondre n'importe quoi, de lire la médiane rendue et de la redéposer pour
marquer 10 tous les jours. Le `on conflict do nothing` n'est donc pas une
commodité — c'est ce qui rend la médiane sûre à rendre. Et c'est aussi pourquoi
ce mode a un jeton anonyme stable, là où Cinq sur cinq s'en passe fièrement.

**La MÉDIANE DU JOUR NE SORT PAS tant que la journée est ouverte**, et la
parade était à moitié faite avant ça. `on conflict do nothing` fermait le
re-dépôt sous le MÊME jeton — mais la médiane restait affichée, donc un joueur la
publiait dans une conversation et tout le monde marquait 100, pour le prix d'une
réponse jetable. `scrutin_banalo_etat` scelle donc `mediane` ET `facteur`
(médiane = ma réponse × facteur) jusqu'à la charnière suivante.

**Sceller sans jamais montrer, c'est ne rien révéler du tout** — et c'est ce qui
manquait. À la clôture, la page bascule sur la journée suivante : l'écran qui
aurait rendu la médiane n'existe plus, donc elle n'apparaissait sur AUCUNE
journée. `JourneePrecedente` est la seule place où ce nombre — et la grille des mots —
s'affiche ; il n'interroge que `jour − 1`, il se tait si la base ne rend pas la médiane (journée
pas encore close de son point de vue), et il se tait aussi quand on n'a pas joué
la veille — un bloc « vous n'avez pas joué » est un reproche adressé à quelqu'un
qui vient précisément de revenir. ⚠️ Son titre dit « la journée précédente », pas
« hier » : à 11 h 00, la journée précédente a commencé **avant-hier**.

⚠️ **Ce qui reste déductible est assumé** : le score est une fonction du rapport,
donc `10^((100 − score)/100)` rend le facteur et deux candidats pour la médiane
(mesuré : 92,1 sur une réponse de 1 000 000 donne 1 199 499 ou 833 681, la vraie
étant 1 200 000). Le fermer exigerait de cacher le score, c'est-à-dire la
récompense immédiate. La différence de nature justifie le choix : la médiane est
un secret **diffusable** — un joueur la publie, mille en profitent — là où
l'inversion du score est un effort **par tricheur**, avec une réponse à brûler et
un jeton neuf à chaque fois.

⚠️ **L'origine du calendrier est donc DUPLIQUÉE en SQL, à DEUX endroits**
(`jour.ts`, `20260820-banalo-mediane-scellee.sql` et
`20260821-banalo-mots-parts-scellees.sql`) : la base doit savoir si une journée
est close, et laisser le client le déclarer offrirait la solution à qui ment. Les
trois valeurs bougent ensemble.

**Le format « mots » avait le MÊME trou, et il était PIRE** : `grille` rendait la
part de chaque mot, donc les mots les plus donnés. Là où la médiane demande
encore d'être comprise, une grille se recopie **mot à mot**, sans rien
comprendre. Les parts sont donc scellées elles aussi
(`20260821-banalo-mots-parts-scellees.sql`) ; **le mot, lui, reste rendu** — le
joueur doit voir ce qui a été enregistré (mot du thème écarté, doublons pliés),
et c'est le chiffre à côté qui se recopie, pas le mot.

Ce qui rendait la fermeture « trop chère » — cette grille EST la récompense du
format — **est tombé avec `JourneePrecedente`** : la récompense n'est pas
supprimée, elle est décalée d'un jour, comme la médiane.

**La journée close montre AUSSI sa répartition** (`RepartitionDuJour`), et c'est
une décision prise sur mesure, pas au goût. La demande de départ était une
**courbe de position au fil de la journée** ; simulé, le percentile d'un joueur
arrivé après la 500ᵉ réponse bouge de **1,1 à 2,0 points** sur tout le reste de
la journée — une ligne plate. La seule courbe qui aurait bougé est celle du
**rang brut**, et elle glisse identiquement pour tout le monde (5ᵉ → 2 170ᵉ pour
le 31ᵉ joueur, 46ᵉ → 16 781ᵉ sur une foule aux nombres ronds) : elle aurait
dessiné une dégradation que personne n'a subie. On a donc gardé l'image fixe.

Trois réglages de cette bande sont mesurés, pas choisis : **échelle log** (les
réponses s'étalent sur 1,9 à 3,8 décades, un axe linéaire écraserait 99 % des
joueurs dans la première barre) ; **pas d'une fraction de décade** — 1/6, puis
1/3, 1/2, 1 si la journée est très étalée — parce qu'une foule répond en nombres
ronds et fait un **peigne**, qu'un pas calculé sur l'étendue couperait en deux ;
et **queues repliées dans les barres des bords**, jamais jetées, sinon la somme
des barres ne fait plus le nombre de votants annoncé juste à côté.

**Le format « mots » a SA propre forme, et ce n'est pas un histogramme**
(`ConcentrationDuJour`). Il n'existe pas d'axe pour des mots : ce qui se
distribue, c'est la CONCENTRATION — la part des joueurs qui ont donné le mot
n° 1, puis le n° 2. ⚠️ Et c'est bien la signature de la journée, mesuré à
3 000 joueurs : sur un thème à évidence brutale le premier mot est écrit par
**99 %** des joueurs et les six premiers couvrent **58 %** des réponses ; sur un
thème ouvert, **23 %** et **13 %**. Un écart de quatre entre journées, qui
explique directement les scores du jour. L'échelle des barres part de la plus
haute et non de 100 %, sinon un thème ouvert dessine dix traits collés au sol —
c'est le chiffre en dessous qui porte l'échelle.

⚠️ **ET LES BARRES DES AUTRES SONT MUETTES : on rend leur hauteur, jamais leur
libellé.** Nommer les mots les plus donnés diffuserait du **texte libre écrit par
des joueurs à tous les autres**, sur un jeu public, anonyme, dont la politique
déclare une tranche d'âge « enfant ». La justification de l'absence de tout
signalement (plus bas) repose sur le modèle de la SALLE — entrée par code, salle
jetable, effacement à sept jours — et **aucune des trois propriétés ne tient
ici**. La garde est en base : le libellé n'est pas rendu, et `litConcentration`
le jette une seconde fois côté écran. Les mots du JOUEUR portent leur nom : la
grille juste au-dessus les lui montre déjà. Le jour où on voudra nommer les
autres, ce qu'il faudra ajouter est un plancher qui suit la foule
(`max(5, 5 % des votants)`), calibré sur des journées réelles.

⚠️ **La bande vit dans `scrutin_banalo_etat`, pas dans une fonction à elle** :
une fonction séparée devrait savoir si la journée est close, donc porter une
**troisième** copie de `ORIGINE`. Et un histogramme est plus dangereux que la
médiane — il montre la bosse sans demander le moindre raisonnement — donc il ne
sort **que** sur une journée close.

⚠️ **Et la mesure a trouvé autre chose, qui ne concerne pas le dessin** : si la
moitié d'une foule répond en nombres ronds, **727 joueurs sur 3 000 partagent
exactement le même facteur** (24 % du terrain, plus un second paquet de 491). Le
score continu a corrigé l'**échelle**, pas l'**entrée** : quand c'est la foule
qui arrondit, les ex aequo reviennent par les données. C'est ce chiffre — et le
taux réel de réponses rondes, qui se mesure en une requête — qui déciderait un
jour du départage au temps, écarté pour l'instant. ⚠️ Deux replis à ne
jamais remettre : `part ?? 0` dans la ligne de partage peignait six blocs de la
couleur la plus froide sous un score de 44,6, et `joueurs ?? 0` fait dire
« 0 joueur a écrit ce mot » d'un mot que le joueur vient d'écrire.

**Le format CHIFFRÉ ne passe plus qu'UNE FOIS PAR SEMAINE** (`programme.ts`),
sur retour de terrain : estimer un grand nombre marche de temps en temps, mais
**en série** ça ne convainc pas — le geste s'use bien plus vite que celui
d'écrire six mots. Six journées de mots, puis une chiffrée. ⚠️ Elle est en FIN de
cycle, pas au début : les journées 1 et 2 sont parues en chiffré, ouvrir le
premier cycle par une chiffrée en aurait fait **trois d'affilée**, exactement la
série qu'on casse. Ça ne se voit qu'en imprimant le calendrier.

⚠️ `JOURNEES_PARUES` **n'est pas un réglage, c'est une laisse d'eau** — et ce
qu'elle marque est une journée **qui a des réponses en base**, pas une journée
passée. Une journée répondue en chiffré a ses réponses dans
`scrutin_banalo_reponses`, son résultat dans des liens de partage et sa relecture
dans `JourneePrecedente` : la basculer en mots échouerait les trois. Tant que
`select jour, count(*) from scrutin_banalo_reponses group by 1` rend zéro pour
une journée, son format est encore libre — c'est ce qui a permis de rendre la
journée 2 aux mots le 21 août, en cours de journée. Dès que le compte n'est plus
nul, il est figé pour de bon. Et le rang d'une journée dans son
PROPRE format sert d'index : indexer les deux stocks sur le numéro de journée ne
montrerait qu'un thème sur sept. Conséquence de rythme : les 15 questions tiennent
désormais 15 semaines, mais **les 68 thèmes n'en font que 11** — c'est le stock
qui se vide le premier, et donc là qu'il faudra ajouter.

**Le score de Banalo du jour est CONTINU, et il l'est pour une raison mesurée.**
`100 − 100·log₁₀(facteur)`, borné à [0 ; 100], **arrondi au dixième**. La première
version notait par cinq paliers : sur n'importe quelle taille de foule, **100 %
des joueurs étaient ex aequo** et le plus gros paquet faisait 38 à 42 % du
terrain — le rang et la part n'avaient plus rien à mesurer. La courbe passe par
les mêmes repères que les paliers (×2 → 69,9, ×5 → 30,1, ×10 → 0) : ce n'est pas
un nouveau barème, c'est l'ancien sans les marches.

**La BASE est de la présentation, la DÉCIMALE porte la résolution** — et c'est la
confusion à ne pas faire. « 87,5 sur 100 » et « 875 sur 1000 » sont la même
valeur aux mêmes paliers (mesuré : 188 scores distincts sur 214 joueurs dans les
deux cas). En revanche **cent paliers ENTIERS** feraient remonter les ex aequo
médians de 28 à 259 sur 20 000 joueurs : retirer la décimale « pour faire
propre » refabriquerait en petit le problème des cinq paliers. Trois migrations
racontent cette décision qui se précise (`-score-continu`, `-sur-mille`,
`-sur-cent`) ; on n'en réécrit aucune.

**Le rang, lui, se calcule SANS ARRONDI — sur le facteur, pas sur les points.**
C'est une correction : les trois premières migrations classaient sur le score
arrondi, pour que « même score affiché » veuille dire « même rang ». C'était
payer trop cher — arrondir avant de compter déclare identiques deux joueurs dont
les réponses diffèrent vraiment, pour éviter une surprise cosmétique. Mesuré :
sur 200 réponses toutes distinctes, l'arrondi fabriquait des paquets, le facteur
en rend **zéro**. Le rang est la chose précise, le score affiché n'en est qu'un
résumé. Seule exception, et elle est voulue : le `least(facteur, 10)` remet tous
les ratés d'un facteur dix ou plus dans un seul paquet — sinon on classerait ×50
devant ×500 alors que l'écran affiche 0,0 aux deux.

**La chaleur du score (`chaleur.ts`) a deux règles non négociables.** La couleur
ne porte JAMAIS seule : elle est doublée d'un mot (« vous brûlez », « tiède »,
« glacé ») écrit en clair, un `t()` par mot — une clé en variable échapperait au
contrôle de parité. Et **la rampe ne passe pas par le vert** : interpoler du bleu
vers l'orange en RGB traverse un vert franc vers 40 sur 100, or le vert se lit
« c'est bon » alors qu'à 40 la réponse est médiocre. Le milieu est un gris chaud.
Toute la rampe tient 4,5:1 sur les deux fonds, vérifié à chaque pas par un test —
pas seulement aux ancres, parce qu'une rampe peut passer par un point plus clair
que ses deux bornes.

**Le format « mots » de Banalo du jour note AU CENTRE, et l'étude disait
l'inverse.** Le §5 proposait de récompenser la rareté corroborée (plancher à 1 %
des joueurs). Mesuré : sur 300 joueurs, **cinq complices gagnent la journée
d'emblée**, personne ne fait mieux — « rare mais confirmé par plusieurs » est
exactement ce qu'une petite entente fabrique, et aucune forme de courbe ne l'en
distingue. Au centre, 90 complices sur 3 000 finissent au 85ᵉ centile : pour
gagner il faut *être* la foule. Effet secondaire heureux, l'avertissement du §6
(« deux barèmes inverses cohabitent ») tombe : nombres et mots disent la même
chose — répondez comme la foule.

**Et le réglage qui décide de tout est le NOMBRE DE CASES**, pas la courbe. Avec
trois cases quand trois réponses sont évidentes, 100 % des joueurs sont ex aequo.
Mesuré à 3 000 joueurs qui optimisent tous : 6 cases / 3 évidentes → 367 totaux
distincts ; 6 / 4 → 147 ; **6 / 5 → 23**, avec un paquet de 13,9 % *en haut* du
classement ; 7 / 5 → 131. **Une case de plus divise le paquet par six.** Comme on
ne peut pas deviner la largeur de l'évidence d'un thème avant de jouer,
`CASES` (`src/content/banalo/mots.ts`) est vide au départ : on ne la remplit que
sur données réelles.

**Le thème déclaré est la CLÉ DE FOULE, et c'est ce qui règle l'exclusion du mot
du thème** sans que la base connaisse le calendrier. Un client qui mentirait sur
le thème pour garder le mot gratuit se retrouve seul dans son groupe, sous le
plancher de cinq votants, donc sans score. Le mensonge s'auto-punit.

**Le temps est mesuré et ne classe rien**, comme `secondes` dans
`scrutin_game_pays_results`. Départager les ex aequo au temps est envisagé, pas
décidé : ça récompenserait la frappe plutôt que la représentation, et se
contourne avec deux appareils. On décidera sur des journées réelles.

⚠️ **Un dépôt de mots se garde par `(jeton, jour, langue)`, pas par la clé
primaire.** `20260820-banalo-mots-depot-unique.sql` corrige le défaut : un
doublon écarté faisait avancer le rang et laissait des trous, dans lesquels un
second envoi venait se glisser — après avoir lu les parts. Trouvé par le bloc de
vérification, pas à la relecture.

**Le compte de Banalo du jour NE REÇOIT AUCUN SCORE DU CLIENT.** Cinq sur cinq
envoie un lot calculé dans le navigateur (`scrutin_game_pays_save`), parce que
là-bas la partie ne quitte jamais le navigateur. Ici les réponses sont déjà en
base sous le jeton : `scrutin_banalo_rattacher(jeton)` recalcule tout avec les
mêmes fonctions que l'écran. Deux conséquences à ne pas défaire : personne ne
peut s'inventer un palmarès, et l'`update` du score est INCONDITIONNEL — ce qui
bouge n'est pas la réponse mais la foule, donc garder le maximum figerait la
journée à l'instant de la connexion. (Chez Cinq sur cinq, « meilleur » est un
MINIMUM d'essais ; ici un MAXIMUM de points. Le copier-coller inverse ça en
silence.)

**Et la série marche SANS compte**, calculée par `scrutin_banalo_serie(jeton)`
sur les deux formats réunis. La base rend la dernière journée de la suite ; c'est
l'ÉCRAN qui décide si elle est encore vivante (`serieVivante`), parce que la base
ne connaît ni le fuseau ni la charnière de 11 h 30.

**Le résumé par compte ne se purge pas**, contrairement aux réponses : c'est ce
qui permet une série de plus de trente jours, et la politique de confidentialité
le dit désormais explicitement (« si vous choisissez de rattacher vos résultats à
un compte… »). La phrase « jamais un compte » qui s'y trouvait est tombée avec ce
changement, dans le même commit.

**Le 30 de Banalo du jour vit à TROIS endroits** : `scrutin_banalo_purge`, le
cron `scrutin-banalo-purge` (`20260820-banalo-du-jour-purge.sql`) et la politique
de confidentialité (`src/app/[locale]/privacy/page.tsx` — le fichier s'appelle
`privacy`, pas `confidentialite` comme l'annonce à tort un commentaire de
`20260810-jeux-retention.sql`). Le changer d'un seul côté transforme un
engagement écrit en mensonge.

**Le navigateur d'ici ne peut PAS joindre Supabase.** La politique de sortie du
conteneur répond 403 au CONNECT vers `xwlywozdxlgjwksypzmi.supabase.co` : tout
écran qui appelle la base *depuis le navigateur* (Banalo du jour) ne se vérifie
qu'en interceptant la RPC avec `page.route`, ce qui éprouve l'écran et pas le
calcul. Les jeux qui passent par une route `/api` (Cinq sur cinq) ne sont pas
concernés — c'est le serveur Next qui appelle, et lui a le proxy.
**Banalo du jour a DEUX partages, et ils ne se remplacent pas.**
`PartageBanalo` partage un RÉSULTAT — il n'existe qu'au-delà du plancher de cinq
votants et porte le score dans le lien. `InviterBanalo` partage la QUESTION : le
thème ou l'énoncé (déjà publics, l'accueil les affiche), un lien NU, et rien de
ce qu'on a répondu. ⚠️ Le trou qu'il bouche était le pire possible : sous cinq
votants, aucun partage n'existait — donc la journée qui manquait de monde était
exactement celle où le jeu n'offrait aucun moyen d'en amener. Il s'affiche avant
la réponse ET après, tant que la foule est trop mince.

⚠️ **ET IL A LA MÊME FORME QUE LES AUTRES PARTAGES DES JEUX QUOTIDIENS** — un
`GBtn` et le QR côte à côte, comme `PartageBanalo` et comme la révélation de
Cinq sur cinq. Il n'en diffère que par la couleur du bouton : `ghost` et non
`accent`, parce qu'avant le dépôt il cohabite avec « Envoyer ma réponse » et que
§0 interdit de concurrencer le seul geste attendu. La taille les sépare déjà —
le bouton d'envoi est `lg` et pleine largeur. Le QR, lui, pointe l'URL nue, ce
qui est le meilleur usage d'une invitation : montrer le code à quelqu'un qui est
là.

**Et l'après-partie ne montre qu'UNE offre à la fois** : pas de compte → le
compte ; compte → l'installation. `CompteBanalo` arbitre, l'installation lui est
passée en `children`. Empiler les deux les faisait se cannibaliser, et le bloc du
compte — signalé trop discret sur de vrais joueurs — porte maintenant l'accent et
un titre en police de titre. ⚠️ **Les notifications, elles, N'EXISTENT PAS sur
les jeux quotidiens** : `docs/regularite-des-joueurs.md` §6 les a écartées par
écrit (la permission ne se demande qu'une fois, un rappel quotidien est du bruit
pour qui a déjà joué, et la charnière de 11 h 30 n'est pas l'horloge du joueur).
Il n'y a donc rien à rendre plus visible de ce côté-là.

**L'après-partie des jeux quotidiens n'a QU'UNE place**, et plusieurs chantiers
la veulent (installation, compte, pont vers Placet, plus tard les amis). Les
empiler les ferait se cannibaliser : l'échelle de priorité est écrite dans
`docs/regularite-des-joueurs.md` §0, et `PontPlacet` est le dernier servi — il se
tait tant qu'une demande plus utile a quelque chose à dire, et **rien ne
s'affiche avant deux journées jouées** (la première demande se mérite). Rien,
jamais, avant la fin de la partie du jour.

**Le canal d'entonnoir est une LISTE FERMÉE à trois endroits** : la fonction
`scrutin_track_funnel`, le type `FunnelChannel` et la liste de `trackVisit`.
Ajouter `jeu` a demandé les trois. Et ⚠️ **on ne réécrit pas une fonction de
mémoire pour y ajouter un mot** : la première rédaction de
`20260820-entonnoir-canal-jeu.sql` avait remplacé au passage la table, l'empreinte,
la fenêtre d'une heure et le plafond journalier par des approximations, toutes
plausibles et toutes fausses. On repart du corps réel, et on `diff`.

**Il existe un lot de PICTOS pour les jeux** (`components/games/Picto.tsx`) :
sept glyphes, grille 24, trait 2, une seule couleur héritée, aucun texte. Posé
pour l'instant SUR LES SEULES CARTES DE L'ACCUEIL ; la porte `/games` et les
en-têtes de jeu tirent toujours l'emoji de `catalog.ts`, et les basculer touche
la surface de l'agent des jeux — ça se coordonne.

⚠️ **La leçon du dessin, pour qui reprendra la série : POUR LA MOITIÉ DES JEUX,
DESSINER L'OBJET ÉCHOUE, IL FAUT DESSINER L'IDÉE.** Trois tentatives de torche se
sont lues « haut-parleur » (trapèze + arcs = icône de volume), « pile », puis
« sablier » — à 24 px une silhouette entre en collision avec tous les objets de
même silhouette. Les erreurs étaient SÉMANTIQUES : le SVG dessinait exactement ce
qu'on lui demandait, donc rien ne se voyait à la relecture, seulement en
regardant le rendu. Deux pictos ont changé de métaphore et y ont gagné : deux
cercles qui se chevauchent (converger) plutôt qu'un cerveau (quiz) ; des
empreintes de pas (on se croise dans la maison) plutôt qu'une lampe.


**L'accueil de Placet montre CE QUI SE JOUE AUJOURD'HUI** (`JeuxDuJour`), et les
deux cartes n'ont pas le droit de montrer la même chose. **Banalo du jour peut
afficher son sujet** — la question ou le thème EST l'énoncé, faite pour être lue.
**Cinq sur cinq ne peut pas** : `games/pays/page.tsx` interdit « AUCUNE MÉTADONNÉE
DÉRIVÉE DU PUZZLE — ni le pays, ni un critère » ; sa carte ne porte que le numéro
de journée et sa promesse. Les confondre ferait fuiter le jeu depuis la page la
plus vue du site. ⚠️ La journée s'y calcule APRÈS LE MONTAGE : la calculer au
rendu serveur la figerait dans le HTML mis en cache, et ferait diverger
l'hydratation autour de la charnière.

⚠️ **ET IL FAUT DEUX NUMÉROS DE JOURNÉE, PAS UN.** Les deux jeux n'ont ni la même
origine ni la même charnière (11 h 30 pour Banalo, minuit pour Cinq sur cinq) :
la première version n'en calculait qu'un et l'affichait sur les deux cartes, si
bien que l'accueil annonçait « Cinq sur cinq — journée n° 2 » quand le jeu en
était à sa quatrième. Le numéro de Cinq sur cinq vient de
`lib/games/pays/calendrier.ts`, **seul module du jeu lisible par le navigateur** :
`moteur.ts` touche les critères et `journee.ts` les réponses, ni l'un ni l'autre
n'entre dans un bundle client.

**LES JEUX DE SALLE SE JOUENT EN PRÉSENCE, ET C'EST CE QUI TIENT LIEU DE
MODÉRATION.** Alibi, Rôdeurs, La Nuit du Fantôme réunissent des gens dans la même
maison — le Fantôme va jusqu'à faire poser des appareils dans les pièces. On y
tape du texte libre montré aux autres, et Alibi produit des accusations qui
DÉSIGNENT nommément un joueur : la surface existe donc bel et bien. Elle est
tenue par le groupe lui-même, qui se gère, immédiatement et de vive voix.

Il n'y a donc **aucun bouton de signalement ni d'exclusion nulle part**, et ce
n'est pas un oubli. Trois propriétés du modèle de salle portent la décision : on
entre **par code**, donc parmi des gens qu'on connaît ; la salle est **jetable** ;
tout s'efface en **sept jours**. ⚠️ Toute fonctionnalité qui casserait l'une des
trois — un nom qui persiste, découvrable au-delà des gens qui vous ont invité,
survivant à la purge — retirerait du même coup ce qui justifie l'absence de
modération. C'est la question de fond d'un système d'amis, et la seule : non pas
« faut-il accepter une surface de modération » (elle existe), mais « faut-il la
laisser sortir de la salle ».

**La couche sociale des jeux quotidiens N'A PAS DE GRAPHE**, et c'est un choix.
Le lien de partage porte la journée et le résultat (`?j=&r=`, jamais `s` — pris
par l'entonnoir) ; l'ami qui l'ouvre après avoir joué voit les deux résultats
côte à côte. Pas de pseudo public, donc pas de modération, sur des jeux où la
politique déclare une tranche d'âge « enfant ». Un vrai système d'amis prendrait
la décision que `20260818-jeu-pays-resultats.sql` a refusée par écrit ; les cinq
coûts et les trois décisions préalables sont dans
`docs/regularite-des-joueurs.md` §5.

⚠️ **Ne JAMAIS repartager `window.location.href` depuis un écran de jeu.** La
page a pu être ouverte depuis le lien d'un ami, qui porte SON résultat : le
repartage renvoyait alors le score de l'ami sous notre nom, en silence. On repart
du chemin nu. Et ⚠️ `Number(null)` vaut **zéro**, pas `NaN` — un paramètre absent
passait tous les contrôles de borne et affichait « votre ami : 0,0 ».


## Les règles qui coûtent cher

**`npm run build` AVANT de pousser.** `tsc --noEmit` ne lint pas. Un
avertissement eslint que `tsc` laisse passer casse le déploiement Vercel **en
silence** — on ne l'apprend qu'en regardant le tableau de bord Vercel. Le build
lance aussi le contrôle de parité i18n.
⚠️ Vérifie que **le port 3000 est libre** avant : un serveur de développement en
cours fait échouer le build.

**Jamais `git add -A`.** Le répertoire de travail contient presque toujours le
chantier de quelqu'un d'autre. On ajoute les fichiers **un par un**, après avoir
attribué chaque modification à son chantier. Un `git status` qui montre des
fichiers que tu n'as pas touchés n'est pas une anomalie : c'est la normale.

**Jamais `--amend` sur un commit qu'on n'a pas écrit soi-même** — et vérifier
`git log` avant : un `--amend` peut effacer le commit d'un autre agent. En cas de
perte, `git reflog` puis `git commit -C <sha>`.

**Avant `git push`, regarde `git log origin/main..HEAD`.** Il peut contenir des
commits locaux d'un autre agent, prêts mais non poussés. Les emporter n'est pas
grave, mais il faut le savoir et le dire.

**Les migrations s'appliquent À LA MAIN sur la base, puis se commitent.** Le
fichier sous `supabase/migrations/` doit décrire *exactement* ce qui a été
appliqué, et rester **rejouable à blanc** sur une base vierge (un `revoke` visant
une fonction supprimée entre-temps casse le rejeu).

**`grant ... to authenticated` NE SUFFIT PAS.** Postgres donne à `PUBLIC` un
droit d'exécution par défaut sur toute fonction. Le `revoke ... from public, anon`
vient donc **avant** le `grant`. Piège payé deux fois.

**Une policy RLS est évaluée avec les droits de l'APPELANT** : une sous-requête
sur une table protégée répond « non » en silence. Et `with check` est aveugle au
changement — il faut les deux, `using` et `with check`.

**Un NULL rendu par une RPC gardée par `auth.uid()` est un REFUS, pas une
donnée.** Ne jamais le replier sur un objet vide : « 0 membre » sur un groupe qui
en compte 200 est indiscernable d'un groupe vide.

## i18n

Quatre langues, **parité obligatoire** : `fr` (défaut, sans préfixe), `en`, `es`,
`pcm` (Nigerian Pidgin — pas de l'anglais recopié). Ajouter une clé = l'ajouter
dans les quatre.

⚠️ **Le contrôle de parité ne voit que les clés écrites EN CLAIR.** Une clé passée
en variable (`t(cle)`, `t(x ? "a" : "b")`) lui échappe : elle peut manquer, ou
vivre dans le mauvais namespace, sans que rien ne le dise avant que l'écran
n'affiche `Org.maCle` en toutes lettres. Écris les appels en clair.

⚠️ **Il lit aussi les COMMENTAIRES.** Écrire un appel `t("…")` en exemple dans un
commentaire le fait signaler comme clé manquante.

⚠️ **N'insère jamais une clé par ancre textuelle sans vérifier le namespace** : le
même nom de clé existe souvent dans plusieurs namespaces, et la première
occurrence n'est pas la bonne. Et **ne re-sérialise jamais `messages/*.json`** :
un `json.dumps(indent=2)` déplie les tableaux en ligne et noie le diff.

## Ce qu'on ne peut pas vérifier ici

**Il n'y a pas de clé de service dans `.env.local`** : impossible d'ouvrir une
session. Tout le rendu **connecté** (`/espaces`, `/evenement`, la Régie) n'est
donc couvert que par tsc, eslint, le build et la parité — **jamais par un passage
à l'écran**. Dis-le explicitement plutôt que de laisser croire le contraire.

**Les jeux sont la seule surface sans compte**, donc la seule réellement
vérifiable au navigateur (`preview_start`, puis on joue). Sers-t'en : sur
Banalo, deux défauts sur cinq n'étaient visibles qu'en jouant — un bouton mort
au deuxième passage et un emoji jeté en silence — et ni `tsc`, ni eslint, ni les
tests, ni la parité ne les voyaient.

Pour la base, la vérification qui marche est un bloc `do $$ … raise exception $$` :
on monte le cas, on l'éprouve, on lève une exception pour tout annuler. Une
session peut être simulée avec
`set_config('request.jwt.claims', json_build_object('sub', <uid>, 'role','authenticated')::text, true)`.

## Style

Le code de ce dépôt **explique ses décisions** en commentaire, surtout celles qui
paraissent bizarres. Un commentaire dit *pourquoi*, et souvent *ce qui est arrivé
quand on faisait autrement*. Avant de « corriger » quelque chose d'étrange, lis
le commentaire au-dessus : c'est peut-être une cicatrice, pas un oubli.

Les messages de commit décrivent l'**effet visible** du changement, en une phrase,
sans préfixe de type (`Le verdict comptait les abstentions comme des « contre »`).
