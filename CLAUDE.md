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
| **La porte `/games`** | rangée par familles le 2026-08-18 ; ajouter un jeu = lui donner une `famille` dans `catalog.ts`. Titre, place du champ de code et vignettes du jour repris le 2026-08-23, sur demande | l'agent des jeux |
| **Fin de partie de salle** (`ApresLaSalle`, revanche des échecs) | posée le 2026-08-23 sur les cinq jeux de salle | ouvert |
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
journée. `JourneePrecedente` est la seule place où ce nombre
s'affiche ; il se tait si la base ne rend pas la médiane (journée pas encore
close de son point de vue), et il se tait quand on n'a encore rien joué — un bloc
« vous n'avez pas joué » est un reproche adressé à quelqu'un qui vient
précisément de revenir.

⚠️ **IL REGARDE LA DERNIÈRE JOURNÉE CLOSE QUE CE JOUEUR A JOUÉE, PLUS `jour − 1`
EN DUR** (`scrutin_banalo_derniere`, `20260824-banalo-derniere-journee.sql`).
C'est la réponse à « est-ce qu'on est prévenu une fois la journée terminée ? » :
non, il n'y a AUCUNE notification aujourd'hui — donc le jeu GARDE le résultat
arrêté et le rend quand le joueur revient, le
lendemain ou trois semaines plus tard. Sur `jour − 1` en dur, celui qui jouait
lundi et revenait jeudi ne voyait jamais comment lundi s'était terminé, alors que
c'est **exactement lui** que la question vise : celui qui revient tous les jours
a déjà tout vu.

⚠️ **« CLOSE » N'EST PAS « DERNIÈRE JOUÉE », ET `scrutin_banalo_serie` NE SUFFIT
PAS.** Elle rend déjà `fin`, le plus grand jour joué — mais s'en servir ferait
DISPARAÎTRE le bloc pour quelqu'un qui vient de jouer aujourd'hui alors qu'il
avait joué la veille : `fin` vaudrait aujourd'hui, et il n'y a rien à montrer
d'une journée encore ouverte. D'où le paramètre `p_avant`, et d'où une fonction à
part. Elle ne peut pas désigner une journée purgée : elle lit les tables qui
s'effacent, donc le jour qu'elle rend a forcément encore ses réponses — aucune
borne d'âge à écrire, ce serait une quatrième copie du 30.

⚠️ **ET LE BLOC DIT QUE C'EST ARRÊTÉ** (« cette journée est close : ces chiffres
ne bougeront plus »). C'est cette phrase qui remplace la notification : un joueur
qui répond à 11 h 35 voit des chiffres calculés sur trente personnes, et rien ne
lui disait que ceux-là, eux, ne bougeront plus. Sans elle il ne peut pas
distinguer « votre résultat » de « votre résultat provisoire ».

⚠️ Son titre dit « votre dernière journée », plus « la journée précédente » —
puisque ce n'est plus forcément elle — et surtout **jamais « hier »** : à
11 h 00, la journée précédente a commencé **avant-hier**. Le numéro à droite lève
l'ambiguïté, comme toujours ici : on nomme une journée par son numéro, jamais par
une date.

⚠️ **Sa grille de mots, elle, n'est plus une RÉVÉLATION mais un ARRÊTÉ.** Depuis
que les parts sortent dès le dépôt, ce n'est plus là qu'on apprend ce que la
foule partageait : c'est là qu'on le lit **stabilisé**. Un joueur qui répond à
11 h 35 voit des parts calculées sur trente personnes ; le lendemain, les mêmes
mots portent le chiffre de la journée entière. C'est exactement ce que le format
chiffré fait avec sa médiane, et c'est aussi pourquoi le « 100 » du premier
votant n'est le score de personne.

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

**Le format « mots » a d'abord scellé ses parts lui aussi**
(`20260821-banalo-mots-parts-scellees.sql`), au motif qu'une grille se recopie
**mot à mot**, sans rien avoir à comprendre, là où la médiane demande encore
d'être lue.

⚠️ **CE SCELLEMENT EST TOMBÉ, ET SON MOTIF ÉTAIT FAUX**
(`20260822-banalo-mots-eval-immediate.sql`). La grille affichait DÉJÀ les mots en
clair sur une journée ouverte — c'est même sa seconde raison d'être : montrer ce
qui a été enregistré, mot du thème écarté et doublons pliés. Une grille
transmise remplissait donc déjà les six cases du receveur, avec ou sans les
parts. Ce que les parts ajoutaient n'était pas la recopie, c'était le TRI entre
plusieurs grilles. Le texte servi au joueur (« affichée maintenant, il suffirait
de recopier vos mots pour marquer autant que vous ») décrivait une attaque que
le verrou n'a jamais fermée ; il est parti avec lui.

**La demande était une demande de COHÉRENCE avec le jeu de groupe** : on score si
les autres ont répondu pareil, et pour chacun de ses mots on voit ce qui a
marché — sans jamais voir les propositions des autres, pour ne pas les livrer à
qui regarde par-dessus l'épaule. Deux des trois exigences étaient déjà tenues
(le barème note l'accord avec la foule ; la grille est bâtie sur
`where jeton = moi`, donc structurellement incapable de porter le mot d'un
autre). Seule la troisième demandait du code.

⚠️ **UN MOT QUE PERSONNE D'AUTRE N'A ÉCRIT NE RAPPORTE RIEN**
(`20260822-banalo-mots-orphelin-zero.sql`) — la règle de la salle, écrite là-bas
depuis le premier jour (`case when p_shared >= 2 then p_shared else 0 end`). Il
rapportait une voix, la sienne, parce que `joueurs` compte le joueur lui-même ;
l'écran l'annonçait même en toutes lettres, « 1 joueur », c'est-à-dire « vous
marquez parce que vous avez répondu ». Le rang et le centile suivent la même
somme, donc celui qui trouve six mots partagés passe devant celui qui en trouve
cinq plus un mot à lui seul.

⚠️ **ET LA LIGNE DE L'ORPHELIN LE DIT AU LIEU D'AFFICHER UN CHIFFRE.** Elle
s'estompe (`opacity: 0.55`, exactement le geste de `RevealBoard.tsx`, qui ne
barre rien et ne colle aucune icône) et porte « personne d'autre » à la place de
l'effectif ET de la part — la part compte le joueur lui-même, donc « 2,5 % » à
côté de « personne d'autre » se contredirait, et sur une journée à deux votants
elle affiche carrément **50 %** pour un mot que personne n'a partagé. Sans ça, la
colonne ne s'additionnerait plus au score : les effectifs affichés font
exactement la somme montrée en haut (34 + 22 + 9 + 3 + 15 = 83).

⚠️ **La bande de concentration, elle, GARDE le mot orphelin.** Elle décrit la
JOURNÉE — quelle part des joueurs a donné le mot n° 1, le n° 2 — pas ce que le
joueur marque. L'en écarter fausserait la couverture, qui sert à lire si la
foule s'est serrée.

**Et le score MONTRÉ par le format « mots » est la SOMME, pas un sur-100** — le
score d'Unanimo : le nombre de voix que vos mots ont recueillies. Il donne un
RANG parmi les participants et un CENTILE qui situe le joueur, et c'est le
centile qui se compare d'un format à l'autre. ⚠️ Centile et rang ont leur propre
plancher (`VOTANTS_MIN`), à **2** : seul votant, on serait « 1er sur 1 ».

⚠️ **LE SUR-100 A ÉTÉ RETIRÉ DE L'ÉCRAN PARCE QU'IL N'ÉTAIT PAS LISIBLE, ET
C'EST MESURÉ.** Le score sur 100 est la moyenne des parts des mots du joueur :
son plafond réel n'est donc pas 100 mais la couverture des six mots les plus
donnés du jour. Simulé à 3 000 joueurs sur deux journées de nature opposée :
**maximum atteignable 67,8 sur un thème serré (médiane 56,8), 13,7 sur un thème
ouvert (médiane 4,9)**. Le même « 35 sur 100 » était donc hors d'atteinte par le
bas un jour et par le haut le lendemain, et 100 n'était atteignable aucun jour.
La somme, elle, ne prétend rien : c'est un décompte, et la colonne des effectifs
juste en dessous l'additionne sous les yeux du joueur (34 + 1 + 22 + 9 + 3 + 15
= 84).

⚠️ **LA POSITION SORT DÈS LA DEUXIÈME RÉPONSE : `VOTANTS_MIN` EST PASSÉ DE 20
À 2** (`20260822-banalo-position-des-deux.sql`). Le motif écrit était « 3e sur 7
n'est pas un rang, c'est du bruit » ; il tombe pour la même raison que le
plancher de score avant lui. Vu sur la vraie journée 2, à six votants : la carte
se réduisait à « 9 voix » et rien d'autre — aucune échelle — là où « 2e sur 6 »
en donne une, grossière mais vraie. Et le format « mots » en a d'autant plus
besoin que sa somme dépend du nombre de votants et de la nature du thème.

⚠️ **DEUX, ET PAS UN** : seul votant, on est « 1er sur 1 » avec 0 % de joueurs
devant — une tautologie, la même que le 100 du premier arrivé. La phrase qui dit
l'absence (« votre position apparaît à partir de 2 réponses ») ne s'affiche donc
plus que pour celui qui ouvre la journée. ⚠️ Elle reste néanmoins nécessaire :
une information absente sans un mot se lit comme une panne et envoie le joueur
la chercher ailleurs, c'est-à-dire chez quelqu'un qui l'a. Même règle que la
médiane scellée du format chiffré.

⚠️ **CE QUE ÇA REND EST GROSSIER, ET C'EST ASSUMÉ** : à six votants le centile
avance par pas de 17 points. C'est aussi pourquoi l'écran met la PART devant le
rang — le rang brut, lui, empire mécaniquement quand la foule grandit. Le nombre
vit à DEUX endroits, `bareme.ts` et `v_min_position` en base : ils bougent
ensemble.

⚠️ **ET LA SOMME NE PORTE PAS SEULE : LE CENTILE EST À CÔTÉ D'ELLE, PAS EN NOTE
DE BAS DE PAGE.** Voir la somme monter au fil de la journée est le plaisir du
format — mais elle ne se lit pas seule, puisqu'elle dépend du nombre de votants
et de la nature du thème. Le centile, lui, est comparable d'un jour et d'un
format à l'autre. L'écart de taille entre les deux est donc **1,9×** (38 px
contre 20), pas 2,7×. ⚠️ Essayé à 26 px en police de titre : la phrase passe sur
DEUX LIGNES et devient le bloc le plus lourd de la carte — le centile se met à
crier plus fort que le score. Ça ne se voit qu'à l'écran. Le format chiffré, lui,
garde son échelle : son score sur 100 se lit seul, il n'a pas le même besoin
d'ancre.

⚠️ **DEUX CHOSES SONT PARTIES AVEC LE CHIFFRE, ET IL FALLAIT QU'ELLES PARTENT** :
le MOT DE CHALEUR et la COULEUR du grand nombre. Tous deux se calculaient sur le
sur-100 — à 84 voix, l'écran annonçait « FROID », parce que 84 voix valent 35 sur
100. Un qualificatif tiré d'une échelle qu'on n'affiche plus est un jugement
qu'on ne peut pas vérifier. La chaleur reste sur les parts de chaque mot, qui
sont affichées, elles.

⚠️ **LE PLAFOND DU LIEN DE PARTAGE N'EST DONC PLUS UNE CONSTANTE.** `lienDefi` et
`litDefi` bornent le résultat pour qu'un lien fabriqué à la main n'affiche pas
« votre ami : 9 999 » ; ce plafond vaut `POINTS_MAX` pour le format chiffré et
**`votants × cases`** pour le format « mots ». Figé à 100, il rejetterait au
contraire tous les liens honnêtes des journées de mots. Conséquence : le défi ne
se lit plus au montage mais quand l'état est là, puisque le plafond en dépend.

⚠️ **LE SUR-100 CONTINUE D'EXISTER EN BASE, ET IL DOIT.** `scrutin_banalo_results`
le stocke pour les DEUX formats sous une colonne `numeric(4,1) check between 0
and 100`, et le résumé de compte en tire une moyenne et un meilleur. C'est la
seule grandeur comparable entre une journée chiffrée et une journée de mots :
une somme de voix et une distance à la médiane ne s'additionnent pas. Il n'est
plus MONTRÉ, il n'est pas supprimé — et le jour où le résumé de compte devra
dire quelque chose de juste, c'est le CENTILE qu'il faudra y mettre, pas l'un
des deux scores.

⚠️ **PLUS RIEN DU FORMAT « MOTS » N'EST GARDÉ PAR L'HEURE**, donc
`scrutin_banalo_mots_etat` a perdu `v_origine`, `v_close` et la clé `close` de sa
charge utile. Ce n'est pas du rangement : une copie de l'origine du calendrier
qui ne garde plus rien est un piège, le prochain agent la lit et croit qu'un
scellement existe. Il en reste **deux** (`jour.ts` et
`20260820-banalo-mediane-scellee.sql`), et le format chiffré garde la sienne à
bon droit — sa médiane, elle, reste scellée jusqu'à la clôture.

**La COURBE DES SCORES existe, et elle DORT jusqu'à cinquante votants**
(`CourbeDesScores`, `20260823-banalo-courbe-des-scores.sql`). Un joueur a demandé
« comment on sait si on est bien placés ? » ; l'écran répondait déjà par un
centile et un rang. ⚠️ **Ce n'est pourtant pas un doublon, et c'est mesuré** : un
centile est un RANG, donc uniforme par construction — il ne peut pas dire si la
foule s'est serrée. Simulé à 3 000 joueurs, la distribution des scores prend deux
formes INVERSES selon le thème : bosse en haut sur un thème serré
(0/0/1/3/5/13/18/25/22/13 %), bosse en bas sur un thème ouvert
(11/19/18/13/14/11/8/3/1/0 %). Deux joueurs au 50ᵉ centile de ces deux journées
ne sont pas dans la même situation.

⚠️ **`COURBE_MIN` (50) N'EST PAS `VOTANTS_MIN` (2), ET LES CONFONDRE EST LE
DÉFAUT QU'UNE ÉVALUATION UX A TROUVÉ.** La première version se gardait sur
`assez` (5) tout en écrivant dans son propre en-tête qu'à six votants « un dessin
grossier ment ». Un centile grossier reste VRAI — « 3e sur 6 » dit quelque chose ;
un histogramme grossier dessine une forme là où il n'y a que du bruit. Sur la
vraie journée 2 (11 joueurs) la courbe vaut [2,1,1,3,4] : un joueur de plus
déplace une barre d'un quart. **À onze joueurs elle ne s'affiche donc pas, et
c'est le sujet, pas un défaut.**

⚠️ **Elle ne sort QUE sur la journée arrêtée, et QUE sur le format « mots ».**
Côté chiffré, `score = 100 − 100·log₁₀(facteur)` et le facteur est le rapport à
la médiane : l'histogramme des scores y serait celui des RÉPONSES replié autour
de la médiane — `RepartitionDuJour` montre déjà la version dépliée, avec un axe
de vrais nombres et deux repères dont l'un dégénérerait (la médiane vaut 100 par
construction). Et ce format ne paraît qu'un jour sur sept.

⚠️ **« VOUS » EST EN ACCENT, PAS EN ENCRE**, contrairement à `RepartitionDuJour`.
Ce n'est pas une incohérence, c'est une cohabitation : dans la MÊME carte, la
bande de concentration peint déjà les mots du joueur en accent, et un repère à
l'encre juste au-dessus apprenait au lecteur une clé que la bande suivante
contredisait aussitôt. `RepartitionDuJour` garde la sienne — elle sert l'autre
format et les deux ne partagent jamais un écran.

⚠️ **Et deux gardes de dessin, toutes deux vues à l'écran** : `seaux.length > 1`
écarte le cas dégénéré (tout le monde au même score → une barre pleine largeur
sous un axe imprimant deux fois le même nombre, ce qui se lit comme une panne) ;
et la bande porte une PHRASE avec son effectif, parce que cinq barres donnent la
même image à onze joueurs et à trois mille — une densité sans son effectif n'est
pas une densité.

⚠️ **L'ORDRE DE REJEU DES MIGRATIONS DU 22/08 EST INVERSÉ, et c'est réparé par
la migration du 23.** Six fichiers portent la même date ; `-sans-plancher` a été
appliqué en 3ᵉ mais se trie en DERNIER. Un rejeu à blanc dans l'ordre des noms
remettait donc `v_min_position` à 20, refaisait payer le mot orphelin et
réintroduisait la copie de l'origine du calendrier. `20260823-banalo-courbe-des-scores.sql`
porte l'état final des DEUX fonctions et sort dernier dans les deux ordres.
**Toute migration qui touchera encore ces fonctions devra être datée du 24/08 ou
plus tard** — le piège se rouvre au premier fichier du 23 dont le nom commence
avant « c ».

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

**Elle sort DÈS LE DÉPÔT, en même temps que le score** — la demande était
d'avoir quelque chose de satisfaisant à montrer juste après la réponse, et posée
sur la seule journée close elle arrivait un jour trop tard. (Elle a d'abord
partagé le plancher de cinq votants du score ; il est tombé avec lui.)
⚠️ Ce qui la rend sûre : **seules les barres du joueur portent un nom**. Les
siennes le portent dès le dépôt — la grille juste au-dessus les lui montre déjà
avec leur part, les nommer ici ne fait que relier deux choses qu'il a sous les
yeux. Celles des autres ne le portent jamais.

⚠️ **ET LES BARRES DES AUTRES SONT MUETTES POUR TOUJOURS : on rend leur hauteur,
jamais leur libellé.** Nommer les mots les plus donnés diffuserait du **texte libre écrit par
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

⚠️ **ET LA DESCRIPTION DU JEU NE PARLE PLUS DE NOMBRES.** `metaTitle`,
`metaDescription` et la `tagline` du catalogue annonçaient « une question chiffrée
par jour » — faux six jours sur sept depuis le changement de rythme, et c'est ce
titre qu'un lien partagé affiche en aperçu. Ils disent maintenant la seule chose
vraie tous les jours, celle qui autorise justement à mélanger les formats :
**répondez comme la foule**.

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

**Le score sort DÈS LA PREMIÈRE RÉPONSE : le plancher de cinq votants est
tombé** (`20260822-banalo-sans-plancher.sql`). Il gardait le score, la position
et la forme de la journée derrière un effectif minimum ; l'arbitrage a été
retourné parce qu'à trois joueurs le score n'est pas *significatif* mais n'est
pas *gênant* — et que le taire coûtait plus cher : celui qui ouvrait une journée
jeune déposait sa réponse et n'obtenait rien en retour, l'exact inverse de ce
qu'un jeu quotidien doit rendre au moment du dépôt.

⚠️ **`assez` N'A PAS DISPARU, IL A CHANGÉ DE MÉTIER.** Même définition
(`votants >= 5`), mais il ne commande plus ce qui est CALCULÉ, seulement ce qui
est DIT : la réserve sous le score (« la médiane repose sur très peu de monde »)
et le choix de l'offre de bas de page — sous le plancher c'est l'INVITATION qui
occupe la place, au-dessus le partage du résultat, jamais les deux. Le garder
règle aussi le décalage de déploiement, la migration s'appliquant à la main
AVANT que le code ne parte. Le second plancher, celui de la POSITION
(`VOTANTS_MIN`), est depuis descendu à 2 — voir plus haut.

⚠️ **Ce que ça ouvre est assumé : sur une journée à DEUX réponses, on peut
remonter à celle de l'autre.** `percentile_disc` rend une valeur réelle de
l'échantillon, donc à deux votants la médiane EST l'une des deux réponses.
Trois raisons de l'accepter : c'est un nombre, pas du texte libre ; le jeu est
anonyme, donc il n'y a personne à qui l'attribuer ; et la garde vraiment
structurante du format « mots » — ne jamais rendre le mot d'un autre joueur —
n'est pas touchée, les libellés des barres restent scellés. Le scellement par
`v_close` est entier lui aussi : médiane, écart, répartition et libellés
n'arrivent toujours qu'à la clôture.

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
le thème pour garder le mot gratuit se retrouve seul dans son groupe.

⚠️ **ET LE « 100 DU PREMIER VOTANT » A ÉTÉ SOULEVÉ PUIS ÉCARTÉ — NE PAS LE
ROUVRIR.** Depuis la chute du plancher, être seul dans son groupe ne veut plus
dire « sans score » mais « sa propre foule, donc 100 » ; la même porte existe sur
le format chiffré en mentant sur la LANGUE. Un plancher à deux votants a été
proposé pour la refermer : **refusé, et la raison est juste.** Ce 100 n'est le
score de personne à la fin de la journée. `scrutin_banalo_etat` recalcule TOUT à
chaque lecture depuis la médiane du moment, et le résumé de compte s'écrase de
même (`update` inconditionnel, plus haut) : le 100 du premier arrivé fond dès le
deuxième joueur. Ajouter un plancher pour tuer un chiffre transitoire rendrait
muet, lui, un joueur bien réel — celui qui ouvre la journée. Il n'y a d'ailleurs
aucun classement public à truquer, et un joueur seul dans son groupe n'a même
pas de position, `VOTANTS_MIN` valant 2.

**Le temps est mesuré et ne classe rien**, comme `secondes` dans
`scrutin_game_pays_results`. Départager les ex aequo au temps est envisagé, pas
décidé : ça récompenserait la frappe plutôt que la représentation, et se
contourne avec deux appareils. On décidera sur des journées réelles.

⚠️ **Un dépôt de mots se garde par `(jeton, jour, langue)`, pas par la clé
primaire.** `20260820-banalo-mots-depot-unique.sql` corrige le défaut : un
doublon écarté faisait avancer le rang et laissait des trous, dans lesquels un
second envoi venait se glisser — après avoir lu les parts. Trouvé par le bloc de
vérification, pas à la relecture.

**CINQ SUR CINQ COMPTE SA FOULE DEPUIS LE 27/08**
(`20260827-jeu-pays-parties-anonymes.sql`), et ce fichier **renverse un point de
conception écrit**. `scrutin_game_pays_results` ne contenait que des COMPTES :
« votre rang du jour », le centile de la page commune et le classement sur la
durée se calculaient sur deux ou trois comptes en se présentant comme des
classements parmi les joueurs. Chaque partie part maintenant en base à la fin,
sous un **jeton anonyme** quand il n'y a pas de compte — là où `banalo/jeton.ts`
disait « Cinq sur cinq s'en passe fièrement » et `pays/local.ts` promettait « il
n'y a pas de jeton stable ». Les deux commentaires ont été corrigés et **la
politique de confidentialité réécrite dans le même commit**, en trois langues.

⚠️ **LE JETON DE CINQ SUR CINQ EST DISTINCT DE CELUI DE BANALO**, et la mécanique
partagée vit dans `games/jeton.ts`. Une clé commune relierait les deux jeux en
base — « ce navigateur a joué aux deux » — information que personne n'a demandée.
⚠️ Il **ne survit pas au rattachement** : le compte adopte la ligne, le jeton est
effacé. Et la fusion **garde le meilleur essai** puis supprime la ligne anonyme,
sinon le joueur se ferait concurrence à lui-même dans sa propre foule.
⚠️ Les lignes anonymes se purgent à trente jours (`scrutin_game_pays_purge` + son
cron), celles d'un compte non — même règle que Banalo. **Le 30 vit donc dans une
cinquième commande de cron**, en plus des quatre autres, de chaque défaut de
fonction et de la politique de confidentialité.

⚠️ **EFFET DE BORD VOULU : LES RANGS DES COMPTES EXISTANTS EMPIRENT.** Le rang,
la médiane et l'effectif du jour portent enfin sur toute la foule. C'est la
correction d'un mensonge, pas une régression.

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

**UNE JOURNÉE DE BANALO SUIT LE COMPTE DEPUIS LE 23/08**
(`20260910-banalo-journee-suit-le-compte.sql`) — signalé par un joueur : « je me
suis connecté sur un autre appareil avec le même compte, je n'ai pas retrouvé ce
que j'avais joué ». Vérifié : son compte portait bien tout, mais
`scrutin_banalo_etat` et `_mots_etat` ne regardent JAMAIS `auth.uid()` — elles ne
connaissent que le JETON, qui est propre au navigateur.

⚠️ **ET CE N'ÉTAIT PAS QU'UN DÉFAUT D'AFFICHAGE : LE JEU LAISSAIT RÉPONDRE UNE
SECONDE FOIS.** Les deux réponses comptaient dans la foule — la médiane du format
chiffré et les parts des mots se calculent sur les LIGNES, pas sur les comptes.
Un joueur à deux appareils pesait double. La journée 4 portait trois jetons pour
des dépôts à 11 h 55, 14 h 19 et 14 h 33.

**La réparation tient en une idée : le jeton se RÉSOUT avant tout le reste.** Les
deux tables de réponses gagnent un `user_id`, et `scrutin_banalo_mon_jeton` rend
« le jeton sous lequel CE joueur a joué cette journée » — celui du navigateur
s'il a déjà répondu, sinon celui que son compte a utilisé ailleurs.

⚠️ **LES DEUX GROSSES FONCTIONS D'ÉTAT NE SONT PAS TOUCHÉES** (133 et 195 lignes
de médiane, de rangs, de bandes et de scellement) : elles reçoivent le jeton
résolu depuis l'extérieur et ne savent même pas que quelque chose a changé. Les
réécrire pour y insérer une ligne aurait été prendre un risque de dérive
silencieuse sur du code qu'aucun test ne couvre.

⚠️ **LE NAVIGATEUR L'EMPORTE QUAND IL A DÉJÀ RÉPONDU.** Sans cette priorité, un
joueur qui a joué anonymement ici puis s'est connecté verrait sa réponse locale
remplacée par celle d'un autre appareil — on lui prendrait la partie qu'il vient
de faire.

⚠️ **LA GARDE EST UN INDEX, PAS UNE CONDITION D'ÉCRAN.** Résoudre le jeton côté
client répare l'affichage, pas la foule : un client modifié garderait son jeton
et répondrait deux fois. D'où `banalo_reponse_par_compte` et
`banalo_mots_par_compte` — ce dernier porte le RANG, sans quoi il n'autoriserait
qu'un seul mot par journée.

⚠️ **ON NE DEVINE AUCUNE LIGNE ANCIENNE.** `rattacher` lisait le jeton pour écrire
un résumé sans jamais marquer les réponses ; `scrutin_banalo_adopter` les marque
quand le joueur revient avec SON jeton — exact, pas déduit — et **saute les
journées déjà jouées par ce compte ailleurs**, sinon l'index unique emporterait
toute l'adoption.

⚠️ **CINQ SUR CINQ N'AVAIT PAS LE MÊME PROBLÈME, ET C'EST VÉRIFIÉ.**
`scrutin_game_pays_jouer` garde `least(r.essais, p_essais)` : rejouer ne peut
rien abîmer. Il restait un mensonge d'écran — une grille vierge pour une journée
déjà gagnée — comblé par une phrase, pas par une restitution : la révélation
n'est stockée nulle part. ⚠️ Elle ne sort **que si rien n'a été joué ici** :
interrompre quelqu'un qui cherche pour lui dire qu'il a déjà trouvé serait la
pire des annonces.

⚠️ **ET `revoke ... from public` NE RETIRE PAS LE DROIT DE `anon`** : Supabase
pose des privilèges PAR DÉFAUT sur les fonctions du schéma public. Il faut le
NOMMER. Vu à l'application : `anon=X` restait sur `scrutin_banalo_adopter` après
le `revoke from public`.

**L'HISTORIQUE PERSONNEL est en prod** (`/games/banalo-jour/historique`,
`MonHistorique.tsx`, `scrutin_banalo_historique`) — c'est la réponse à la
question d'un joueur : « est-ce qu'on peut créer un compte pour ça ? si oui,
est-ce qu'on retrouve son propre historique ? » Il liste les journées gardées,
la plus récente d'abord, avec le SUJET calculé dans le navigateur par
`programmeDe(jour)` : stocké en base, un libellé reviendrait dans la langue où la
journée a été jouée.

⚠️ **IL MONTRE LE CENTILE, PAS LE SCORE — et le résumé de compte aussi
maintenant** (`20260824-banalo-historique.sql`). C'était écrit ici depuis le
retrait du sur-100 : « le jour où le résumé de compte devra dire quelque chose de
juste, c'est le CENTILE qu'il faudra y mettre ». Le sur-100 n'est pas comparable
d'un format à l'autre — son maximum ATTEIGNABLE vaut 67,8 sur un thème serré et
13,7 sur un thème ouvert — donc « score moyen : 35 » mélangeait des journées où
35 était hors d'atteinte par le haut et d'autres où c'était médiocre. La colonne
`mieux` (le pourcentage de joueurs qui ont fait mieux) est **nullable** : une
journée jouée seul n'a pas de position, et `0` voudrait dire « premier », le
repli le plus flatteur possible sur une donnée absente.

⚠️ **LES CLÉS DE `scrutin_banalo_moi` ONT ÉTÉ RENOMMÉES EXPRÈS**
(`moyenne`/`meilleur` → `centileMoyen`/`centileMeilleur`). Garder les noms en y
mettant un centile aurait changé le SENS d'un chiffre sans changer sa forme :
l'écran aurait affiché « meilleur : 3 » en croyant montrer un score, alors que 3
veut dire « 3 % ont fait mieux », c'est-à-dire excellent. ⚠️ Et le MEILLEUR est
le PLUS PETIT — l'inverse du sur-100, comme « meilleur » est un MINIMUM d'essais
chez Cinq sur cinq et un MAXIMUM de points ici.

⚠️ **`scrutin_banalo_rattacher` SAUTAIT LES JOURNÉES OÙ `assez` EST FAUX**, et
c'était un bug pur depuis le 22 août. La garde était juste quand `assez` voulait
dire « il existe une note » ; depuis la chute du plancher elle veut dire « cette
note s'appuie-t-elle sur assez de monde ? ». Un joueur qui répondait à une
journée jeune voyait son score à l'écran mais cette journée n'entrait jamais dans
son compte — donc un TROU dans sa série de compte. La garde est maintenant
`points is null`.

⚠️ **ET LA SÉRIE DU COMPTE NE PASSAIT PAS PAR `serieVivante`**, contrairement à
celle du navigateur. La base rend la dernière journée de la suite, jamais un
verdict : elle ne connaît ni le fuseau ni la charnière de 11 h 30. Un joueur
revenu après dix jours lisait donc « série : 6 » là où le même écran, sans
compte, affichait 0. L'écran garde la PLUS LONGUE des deux — le compte couvre
tous les appareils, le jeton n'attend pas le rattachement.

⚠️ **UN EFFET QUI DÉPEND DE `user` SE RELANCE EN BOUCLE** — dépendre de
`user?.id`. `useAuth` rend un OBJET, dont la référence change chaque fois que la
session est relue (une actualisation de jeton suffit). L'effet refait alors ses
appels, et son ménage (`vivant = false`) coupe la réponse précédente avant
qu'elle n'arrive : **la page reste blanche pour toujours tout en martelant la
base**. Trouvé au navigateur, invisible à tsc comme à la relecture. Une CHAÎNE
est stable, et le montage double du mode strict retombe alors sur le cas normal.
⚠️ **ET LE `ref` PAR IDENTIFIANT DE COMPTE NE SUFFIT PAS — CETTE PAGE L'A
AFFIRMÉ À TORT.** Il arrête la boucle, il n'empêche pas l'ANNULATION : le ménage
du premier passage pose `vivant = false`, et le second repart aussitôt sur le
`ref`, si bien que le résultat n'est JAMAIS posé. Mesuré le 23/08 sur
`CompteBanalo` et sur `pays/Compte` : `scrutin_banalo_moi` ne partait jamais, le
bilan restait `null`, et la carte n'affichait que la série — ni journées, ni
centiles, ni lien vers l'historique. Les deux dépendent maintenant de `uid`.

⚠️ **UNE LIGNE EN `nowrap` DANS UNE GRILLE ÉLARGIT LA PAGE ENTIÈRE.** Les sujets
de journée ne se coupent pas tout seuls : sans `minWidth: 0` sur le `ul` ET sur
la ligne, « Quel est le poids de tous les ballons de football… » poussait la
carte à 760 px et faisait DÉFILER LA PAGE DE CÔTÉ sur un téléphone de 390, les
pourcentages passant hors du cadre. Ni tsc ni la relecture ne voient une largeur.

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

⚠️ **LA PREMIÈRE LIGNE DU PARTAGE EST ÉCRITE PAR L'ÉCRAN, PLUS PAR
`PartageBanalo`.** La clé unique disait « n° {n} — {points}/100 », devenu faux le
jour où le format « mots » a cessé de noter sur 100 : il aurait annoncé
« 83/100 » pour 83 voix. Chaque écran passe donc sa ligne toute faite, avec sa
clé EN CLAIR (`partageTitre` pour le chiffré, `partageTitreMots` pour les mots) —
une clé choisie en variable échapperait au contrôle de parité. ⚠️ Et
`partageTitre` existe AUSSI dans le namespace `Pays` : une insertion par ancre
textuelle nue en vise une sur deux.

**La ligne d'invitation ne promet plus rien** : « 6 mots, deux minutes », sans la
suite (« le but est d'écrire les mêmes que les autres »). Retour de terrain sur
un vrai partage WhatsApp : cette promesse « n'aide ni à comprendre réellement ni
à donner envie » — autant ne rien mettre et être plus compact. Le format chiffré
a perdu la sienne pour la même raison.

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
un titre en police de titre. ⚠️ **L'OFFRE DE NOTIFICATION EST FUSIONNÉE DANS `InstallJeu`, PAS AJOUTÉE À
L'ÉCHELLE.** Elle ne vivait que sur `/games/quotidien`, la page que les joueurs
ne visitent pas — donc le seul mécanisme du produit qui FABRIQUE un retour au
lieu de l'espérer n'atteignait personne. La poser en quatrième barreau aurait
déplacé quelqu'un ; elle occupe donc le TROISIÈME, avec l'installation, parce
que **sur iOS les deux ne sont même pas deux gestes** : le push web n'y existe
que pour une application posée sur l'écran d'accueil. Ça donne enfin une raison
à une demande qui n'en avait pas.

⚠️ **UNE SEULE DEMANDE À LA FOIS, ET DANS CET ORDRE** : la notification quand
elle est possible (elle rapporte au joueur), l'installation sinon. Hors iOS le
push marche SANS installer — offrir les deux ferait deux boutons dans un créneau
qui n'en admet qu'un. ⚠️ Et **les notifications exigent un compte** (réglages et
tournée sont indexés sur `user_id`), donc sans compte le bloc retombe sur
l'installation seule — ce qui tombe bien, l'échelle plaçant déjà l'offre de
compte avant.

⚠️ **PAS D'ACCROCHE SANS BOUTON.** Après un refus de permission, quand il n'y a
rien à installer, la carte ne garde QUE la phrase qui explique le refus. Vu à
l'écran : la première version servait « Placet sur votre écran d'accueil » sous
un refus de notification, sans le moindre geste à faire.

⚠️ **ET LA PROMESSE D'INSTALLATION ÉTAIT FAUSSE.** Elle disait « installer LE
JEU » et « l'avoir sur l'écran d'accueil » — or il n'y a qu'UNE application :
`manifest.ts` porte `start_url: "/"` et le nom « Placet ». Le joueur obtenait une
icône Placet ouvrant l'accueil de Placet. Le texte dit maintenant ce que
l'installation fait vraiment, et le manifeste a gagné des **raccourcis** vers les
deux jeux et les classements (appui long sur l'icône). ⚠️ Un SECOND manifeste
servi sur `/games` (`start_url: "/games"`) donnerait une icône qui ouvre vraiment
les jeux — écarté : deux applications installables pour un même site, avec un
service worker et un push à revérifier sur un vrai téléphone. À douze joueurs ça
coûte plus de confusion que ça n'en résout ; à rouvrir si l'icône déçoit. ⚠️ **NE PAS RÉPÉTER MON ERREUR : c'est le §7 de
`docs/regularite-des-joueurs.md` qui a écarté le RAPPEL QUOTIDIEN** (la
permission ne se demande qu'une fois, un rappel est du bruit pour qui a déjà
joué, et la charnière de 11 h 30 n'est pas l'horloge du joueur). Le §6, lui, dit
l'INVERSE de ce que j'ai écrit ici pendant trois commits : il POSE le push, au
service des amis — « la première notification qu'un joueur reçoit doit être
*Chloé vient de jouer*, pas un rappel robotique ». L'étude est dans
`docs/amis-et-notifications.md`.

**LES NOTIFICATIONS PEUVENT ENFIN S'ACTIVER** (`Notifications.tsx`,
`20260906-push-fuseau-et-langue.sql`) — les trois genres, par compte, depuis
l'onglet « mes résultats ».

⚠️ **LE SOCLE AVAIT DEUX COLONNES QUE PERSONNE NE REMPLISSAIT.**
`scrutin_push_subscriptions.fuseau` et `.langue` existaient depuis le 31/08 et
`scrutin_jeux_notifs_a_envoyer` les LIT pour décider l'heure d'envoi et la langue
du texte — mais `add_push_subscription` ne les connaissait pas. Tout abonnement
de jeu serait donc arrivé avec deux `null`, c'est-à-dire replié sur Paris et sur
le français, pour tout le monde. ⚠️ Et **ajouter deux paramètres CRÉE une
fonction, ça n'en remplace pas une** : sans le `drop` de la version à six
arguments, PostgREST se retrouvait devant deux candidates et rendait une erreur
d'ambiguïté — plus personne ne s'abonne, scrutins compris.

⚠️ **UN FUSEAU INVENTÉ EST REFUSÉ À L'ENTRÉE, PLUS SEULEMENT À LA LECTURE.** La
contrainte de colonne ne valide que des caractères : « Europe/Atlantide » la
passe, et c'est `at time zone` qui lève, plus tard, au milieu de la tournée —
donc un seul abonnement bancal privait tous les autres de leur notification. La
parade au moment de la lecture existait déjà ; la porte d'entrée compare
maintenant à `pg_timezone_names`. Même geste pour la langue, et pour la même
raison : une valeur douteuse ne doit pas coûter l'ABONNEMENT, que le joueur a
payé d'une permission qui ne se redemande pas.

⚠️ **`coalesce` DANS LES DEUX SENS SUR LE `on conflict`.** Un rappel de scrutin
qui se ré-enregistre n'envoie ni fuseau ni langue et écraserait ceux qu'un
abonnement de jeu vient de poser — c'est le même navigateur, donc la même ligne.
À l'inverse une valeur fournie gagne toujours : c'est ainsi qu'un joueur qui
change de langue, ou qui voyage, met sa ligne à jour sans rien demander.

⚠️ **L'ÉCRAN REGARDE DEUX CHOSES QUI NE SE CONFONDENT PAS** : `appareils`, que la
base compte pour le COMPTE, et l'abonnement de CE navigateur, lu sur
`pushManager.getSubscription()`. Quelqu'un d'abonné sur son ordinateur a bien
« un appareil abonné » sans que le téléphone qu'il tient reçoive quoi que ce
soit : lui cacher l'offre au motif que le compte est couvert lui promettrait des
notifications qui n'arriveraient jamais ici. D'où deux phrases distinctes, dont
une qui dit « mais pas celui-ci ».

⚠️ **`navigator.serviceWorker.ready` PEUT NE JAMAIS SE RÉSOUDRE — LE BOUTON
RESTAIT MORT.** Ce n'est pas une promesse qui échoue : quand aucun service worker
ne s'active (fichier introuvable, navigation privée, navigateur qui les bloque),
elle reste EN ATTENTE pour toujours. Le `await` ne rend jamais la main, aucun
`catch` ne part, et le bouton garde ses trois points sans un mot. **Trouvé en
cliquant**, invisible à tsc comme à la relecture. La course est bornée à dix
secondes, et l'échec DIT quelque chose : un refus de permission (qui ne se
redemande pas depuis la page) et un échec (qui se réessaie) n'appellent pas le
même geste.

⚠️ **SANS CLÉ VAPID, LE BLOC NE S'AFFICHE PAS DU TOUT.** `notifySupported()`
repliait l'absence de clé sur les capacités du navigateur : sur un déploiement où
la clé manque, TOUS les joueurs s'entendaient dire que leur navigateur ne sait
pas recevoir de notifications — faux, et ça les envoie chercher le défaut chez
eux. `notifyDeployed()` sépare les deux. C'est aussi ce qui rend ce bloc
invisible dans le conteneur de développement, dont le `.env.local` n'a pas la
clé publique.

⚠️ **LES TROIS GENRES SONT VRAIS PAR DÉFAUT ET LES INTERRUPTEURS NE SORTENT QU'À
PARTIR D'UN APPAREIL.** S'abonner EST le consentement ; les réglages servent à en
RETIRER. Et zéro appareil, ce sont trois interrupteurs qui ne commandent rien —
allumés, ils promettraient des notifications que personne ne recevra.

⚠️ **UN INTERRUPTEUR SE PEINT AVANT LA RÉPONSE, ET SE REMET SI ELLE ÉCHOUE.**
Une seconde d'attente se lit comme un bouton mort, et on presse deux fois : c'est
mot pour mot le défaut qu'un vrai joueur a signalé sur le dépôt du pseudo.

⚠️ **CE QUI RESTE INVÉRIFIABLE ICI, ET IL FAUT LE DIRE** : ni la permission du
navigateur, ni l'envoi, ni le rendu par le système d'exploitation. Le chemin qui
RÉUSSIT a pu être éprouvé en remplaçant le service de push (`charge.cjs`) : la
charge utile postée porte bien le fuseau IANA et la langue de l'interface,
vérifié sur trois couples langue/fuseau, et l'offre cède la place aux trois
interrupteurs. Le reste tient sur le bloc SQL à huit assertions.

**LES QUATRE CHEMINS DE CONNEXION DE PLACET SONT ENFIN OFFERTS DANS LES JEUX**
(`ConnexionJeux.tsx`), et c'est encore un joueur qui a vu ce qui manquait :
« il n'est proposé que la méthode Google et le magic link, la version avec mot de
passe — qui existe sur Placet — n'est pas proposée ». Exact. `useAuth` expose
`signInPassword`, `signUpPassword` et `resetPassword` depuis toujours, et seul
`SpacesHome` s'en servait.

⚠️ **LA CAUSE EST LA COPIE, PAS L'OUBLI.** Les trois offres de compte des jeux —
Banalo, Cinq sur cinq, la page commune — avaient chacune recopié les deux mêmes
boutons, avec chacune ses propres clés i18n. Aucune n'a suivi quand Placet a
gagné le mot de passe, et rien ne pouvait le signaler. Même chemin que la règle
du mot orphelin et que le calcul des scores : on l'a sorti en UN exemplaire, et
les **quinze clés devenues orphelines sont parties avec** — une clé qui reste
est l'invitation à recopier le bouton qu'elle servait.

⚠️ **LE COMPOSANT NE PORTE QUE LES MÉTHODES, PAS L'ARGUMENTAIRE.** Chaque écran
garde son titre et sa promesse : « gardez votre série » ne se dit pas pareil
après une partie de Banalo, après une partie de Cinq sur cinq et sur la page des
classements. Ce qui se partage est la plomberie, pas la voix.

⚠️ **LE LIEN MAGIQUE RESTE DEVANT, LE MOT DE PASSE EST À UN GESTE.** Après une
partie, le joueur n'a pas demandé à s'inscrire : lui présenter d'emblée un mot de
passe à inventer serait une demande de plus là où §0 dit qu'il n'y en a qu'une.
Deux pastilles, et un seul champ email partagé — les montrer ensemble ferait deux
champs email l'un sous l'autre.

⚠️ **ON REVIENT SUR L'ÉCRAN DE JEU**, et c'est une correction : les appels
d'origine passaient `signIn()` sans destination, donc le joueur qui se connectait
depuis sa partie atterrissait sur l'accueil de Placet. On repart du CHEMIN NU,
jamais de `href` — l'URL peut porter le résultat d'un ami.

⚠️ **DEUX ÉTATS NE SONT PAS DES ERREURS, ET LES REPLIER SUR « ça n'a pas marché »
FERAIT RECOMMENCER QUELQU'UN POUR RIEN** : `confirm` veut dire que le compte
existe et attend un clic dans un email ; le lien de réinitialisation, lui, mène
sur `/espaces?recovery=1` — la seule page qui porte le formulaire de nouveau mot
de passe — et l'écran le DIT, sans quoi le joueur croit s'être trompé de site.

**LE TROU DU JOUR 1 EST COMBLÉ, ET C'ÉTAIT UNE CONTRADICTION** (`SerieDuJour.tsx`,
2026-08-23). Les deux jeux écrivaient `serie > 1` : un joueur qui venait de finir
sa PREMIÈRE partie ne voyait aucune série — pendant que la carte juste en dessous
lui disait « **gardez votre série** ». On lui demandait de conserver une chose
qu'on ne lui avait jamais montrée.

⚠️ **CE BLOC NE CONTREDIT PAS L'ÉCHELLE DU §0, IL OCCUPE SON ANGLE MORT.**
L'échelle commence à DEUX journées jouées ; en dessous elle prescrit « rien ». Or
mesuré le 2026-08-23, **3 joueurs sur 12 reviennent une seconde journée** — donc
elle vaut « rien » pour les trois quarts des gens, exactement ceux qu'il faudrait
convaincre. Le bloc ne DEMANDE rien (ni compte, ni installation, ni ami) : il
RACONTE l'état du joueur, donc il ne consomme aucune des places que l'échelle
arbitre.

⚠️ **LA RELANCE NE SORT QU'À 1.** Servie tous les jours à un habitué, « revenez
demain » deviendrait la boîte qu'on ferme sans lire — le défaut que
`rappelleLaMethode` évite chez Cinq sur cinq. À partir de 2, le chiffre est à
lui seul la raison de revenir.

⚠️ **ET ELLE S'ARRÊTE APRÈS « elle passera à 2 ».** La première rédaction ajoutait
« c'est la seule chose que ce jeu vous demande » : vrai sur le papier, contredit
à l'écran par l'offre de compte qui suit dans la MÊME carte, trois lignes plus
bas. Ça ne se voit qu'en regardant le rendu.

⚠️ **LE BLOC EST SORTI EN UN SEUL EXEMPLAIRE** plutôt que corrigé deux fois, et
les deux clés `compte.serie` devenues orphelines sont parties avec — même règle
que les quinze clés d'authentification la veille.

**Cinq sur cinq dit enfin ce qui revient demain**, comme Banalo le fait depuis
toujours. ⚠️ **Sans heure**, contrairement à lui : sa charnière est minuit, ce que
personne n'a besoin qu'on lui explique, là où 11 h 30 demandait un chiffre. Et
seulement une fois la partie GAGNÉE — annoncer le pays de demain à quelqu'un qui
cherche encore celui d'aujourd'hui lui dirait de laisser tomber.

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

**LE TABLEAU DU JOUR est en prod (`TableauDuJour.tsx`), PUBLIC, sur les deux
formats.**
Pour figurer au tableau d'une journée, il faut **déposer un nom** : le pseudo de
son compte Placet si on en a un, sinon **un nom qu'on écrit** — ou qu'on prend
dans la liste que le jeu propose (`src/content/banalo/noms.ts`, 30 animaux ×
20 compléments = 600 noms par langue). Qui ne dépose rien joue normalement, voit
son rang et son centile, et **n'apparaît pas au tableau** : on n'y entre que par
un geste, donc personne n'y est inscrit sans l'avoir voulu.

⚠️ **LE TEXTE LIBRE SANS COMPTE A ÉTÉ FERMÉ, PUIS ROUVERT LE 24/08** — tout ce
qui suit jusqu'à « LE COMPTE CONDITIONNE LE NOM » décrit la règle FERMÉE, et
elle ne s'applique plus. Le raisonnement, lui, n'a pas été réfuté : il est gardé
mot pour mot parce que c'est lui qu'il faudra relire le jour où la modération se
décidera. Ce qui l'a emporté est un retour de terrain, et il est plus bas.

⚠️ **CE N'EST PAS UNE PRÉCAUTION DE FAÇADE, C'EST CE QUI REND LE TABLEAU
POSSIBLE.** Un champ de pseudo sur un classement public n'est pas un champ
d'identité : c'est un canal de publication d'une ligne, adressé à tous les
joueurs du jour. Par gravité réelle : du harcèlement visant quelqu'un de précis
(« Marie du CM2 pue ») ; des données personnelles déposées sans malice par un
enfant, sur un jeu dont la politique déclare une tranche d'âge « enfant » ; puis
seulement les insultes. ⚠️ **Un filtre ne règle que le troisième** — une liste de
mots interdits n'attrape pas « Marie du CM2 pue ». La sortie n'est donc pas de
filtrer le texte libre, c'est de ne pas en ouvrir.

⚠️ **ET SANS COMPTE, LA MODÉRATION EST IMPOSSIBLE PAR CONSTRUCTION**, ce qui rend
la règle nécessaire et pas seulement prudente : un jeton anonyme ne se bannit pas
— on efface son `localStorage` et on revient. Le texte libre n'existe donc que là
où quelqu'un en répond.

⚠️ **LE COMPTE CONDITIONNE LE NOM, JAMAIS LA PRÉSENCE, et c'est mesuré** : la
base compte **2 comptes rattachés** contre **11 joueurs** sur la journée 2 et 7
jetons sur le format chiffré. Exiger un compte pour figurer au tableau le
réduirait à deux lignes sur onze.

**ON ÉCRIT SON NOM SANS COMPTE DEPUIS LE 24/08, ET C'EST UN RENVERSEMENT**
(`20260913-jeux-nom-libre-sans-compte.sql`). Signalé en urgence : « la
proposition de pseudo prégénéré en cas d'absence de compte ne fonctionne pas et
les joueurs refusent ». La liste fermée n'était pas une friction qu'on absorbe,
c'était un **REFUS** — on offrait « Renard de minuit » à quelqu'un qui voulait
figurer sous son nom, et il ne figurait pas du tout. Mesuré au moment du
changement : **3 noms déposés sur Banalo, 1 sur Cinq sur cinq, pour 12 joueurs**.
Un tableau dont personne ne veut est un tableau vide.

⚠️ **L'ARGUMENT D'EN FACE N'EST PAS RÉFUTÉ, IL EST SURCLASSÉ — et il faut le
savoir avant d'y revenir.** Tout ce qui est écrit plus haut reste vrai : un champ
de pseudo public est un canal de publication, un filtre de gros mots n'attrape
pas « Marie du CM2 pue », et un jeton anonyme ne se bannit pas. Ce qui a changé
est l'autre plateau de la balance, pas celui-là. Le propriétaire du dépôt a
tranché explicitement : « pouvoir laisser un pseudo libre doit être possible,
nous verrons comment cela doit être éventuellement modéré ». **La politique de
modération est REPORTÉE, pas décidée** — ne pas la réinventer de son propre chef.

⚠️ **MAIS « REPORTÉE » N'EST PAS « ABSENTE », ET LA PRISE EXISTE** :
`scrutin_admin_noms_libres` liste les noms écrits des deux tableaux publics,
`scrutin_admin_nom_libre_effacer` en retire un — **par son TEXTE**, sur les deux
jeux à la fois, parce que ce qu'un modérateur juge est une chaîne publiée et
qu'elle a pu être redéposée chaque jour. Ce ne sont **pas** un système de
modération : ni signalement, ni file, ni notification. C'est le minimum sans
lequel on ne pourrait rien retirer du tout, et **aucun écran ne les appelle
encore** — l'onglet « Jeux » de la Régie est l'endroit prévu.

⚠️ **ON RETIRE UN NOM, PAS UN JOUEUR**, et l'écart est réel : le résultat, le
rang et la série restent (c'est vérifié par assertion), et l'intéressé peut en
redéposer un cinq minutes plus tard en vidant son `localStorage`. Promettre
autre chose au prochain agent serait un mensonge.

⚠️ **ET LA TABLÉE N'A PAS DE PRISE, DÉLIBÉRÉMENT.** Elle ouvre le texte libre
comme le tableau — l'écran est partagé, et un joueur ne comprendrait pas qu'on
lui demande son nom ici et un animal là — mais l'effacement ne la vise pas. Un
groupe s'entre **par code**, il est **jetable**, il **s'efface** avec ses
membres : les trois propriétés du modèle de salle y sont intactes, et son nom
n'est lu que par les gens qui vous ont invité. C'est le même raisonnement qui
autorise Alibi à faire taper des accusations nommées sans bouton de signalement.
Ce qu'on ouvre au PUBLIC est ce qu'on outille.

⚠️ **LA LISTE FERMÉE N'EST PAS PARTIE, ET ELLE NE DOIT PAS PARTIR.** Elle sert
deux choses qu'un champ vide ne sert pas : elle donne un nom à qui n'en cherche
pas, et surtout **elle est traduite** — c'est un INDEX qu'on stocke, donc
« Renard de minuit » s'affiche « Midnight Fox » à l'anglophone du même tableau,
là où un nom écrit est figé dans la langue où on l'a tapé. D'où la mécanique de
l'écran : une suggestion CHOISIE **reste un index tant qu'on n'y touche pas**,
le champ affiche son libellé, et la première frappe éteint la pastille et bascule
en texte. Un champ vide sous une pastille allumée poserait la question que
l'écran doit fermer — « je figure sous quoi ? » — juste avant un bouton qui dit
« Déposer ce nom ».

⚠️ **ET LE CHAMP PASSE DEVANT LES SUGGESTIONS, L'ORDRE EST LA CORRECTION.**
Quatre pastilles en tête de carte se lisent « choisissez parmi ceci », et le
champ posé dessous passait pour l'exception réservée aux comptes — ce qu'il
était. On demande son nom, on aide ensuite qui n'en a pas.

⚠️ **LA RÈGLE DU NOM VIT DÉSORMAIS DANS `scrutin_jeux_nom_resoudre`, ET ELLE
SEULE.** Les trois dépôts (les deux tableaux, la tablée) appelaient
`scrutin_jeux_pseudo_resoudre` et refusaient sur son statut `compte` ; écrire le
`if auth.uid() is null then … else …` dans les trois aurait produit trois règles
qui dérivent — le défaut que `20260907` venait de corriger. Les BORNES, elles,
étaient déjà recopiées deux fois (`_resoudre`, `_poser`) : elles sont sorties
dans `scrutin_jeux_nom_valide`, 2 à 20 caractères, espaces normalisés,
caractères de contrôle refusés. ⚠️ **Un retour à la ligne n'est PAS un refus** —
`pseudo_net` plie tout blanc en une espace AVANT de tester, donc « ab⏎cd »
devient « ab cd » ; le test des caractères de contrôle vise ce qui RESTE.
⚠️ Et **les bornes de colonne disaient 1 à 24 quand la règle dit 2 à 20** :
alignées, parce qu'un filet ne doit pas être plus large que le sol.

⚠️ **LE PIÈGE DU FICHIER ÉTAIT DANS LA LECTURE, PAS DANS LE DÉPÔT.**
`scrutin_game_pays_tableau` résolvait `else p.pseudo` — juste tant que sa table
n'avait pas de colonne `nom`. Sans le passage à `coalesce(p.pseudo, n.nom)`, un
joueur sans compte déposait son nom, **la base répondait `ok`**, et il
n'apparaissait NULLE PART : `libelle` valant `null`, il était compté hors des
inscrits et absent de la liste. Banalo, lui, faisait déjà le `coalesce` depuis le
07. Trouvé par assertion, pas à la relecture.

⚠️ **ET LE NOM SE DÉPOSE PAR JOURNÉE, PAS UNE FOIS POUR LE COMPTE — c'est ce qui
ÉVITE la ligne du §5.** L'étude posait comme vrai coût d'un système d'amis un nom
**permanent et découvrable**, survivant à la purge. Ici il n'y a ni profil ni
pseudo permanent : `scrutin_banalo_noms` est purgée à trente jours par
`scrutin_banalo_noms_purge` et son cron, comme les réponses, et rien n'est
recopié dans le résumé de compte. Un joueur qui veut le même nom tous les jours
le redépose ; son navigateur peut le lui pré-remplir, la base ne le garde pas.
⚠️ Conséquence quand même : la politique de confidentialité se réécrit **dans le
même commit** — deux paragraphes, en trois langues (`pcm` retombe sur `en`) —
comme pour le 30 et pour le 7. ⚠️ Et la durée n'est PAS répétée dans le texte du
jeu : l'écran dit « ce nom ne vaut que pour aujourd'hui », sans chiffre, pour ne
pas ouvrir une quatrième copie du 30.

⚠️ **« JE SUIS INSCRIT » NE SE DÉDUIT PAS DES LIGNES**, et la base rend donc un
drapeau à part. Sous le plancher de deux inscrits la liste est vide : le SEUL
inscrit de la journée était indiscernable de quelqu'un qui n'a rien déposé,
l'écran lui reproposait le formulaire et la base répondait « deja » à un joueur
qui n'avait rien demandé. Trouvé en jouant, pas à la relecture.

**L'EFFECTIF DU TABLEAU PROMETTAIT DES LIGNES QUI N'EXISTAIENT PAS**
(`20260914-jeux-nom-suit-le-jeton-resolu.sql`) — signalé : « je ne vois pas la
liste des classés de la veille alors qu'il est précisé que 2 personnes avaient
laissé un pseudo ». Vérifié : la base rendait `inscrits: 2` et **une seule
ligne**.

⚠️ **LA CAUSE N'EST PAS DANS LE TABLEAU, C'EST LA MOITIÉ OUBLIÉE DE `20260910`.**
Cette migration-là avait posé « le jeton se RÉSOUT avant tout le reste » et ne
l'avait appliquée qu'aux deux fonctions d'ÉTAT. Le NOM est resté sur le jeton
BRUT du navigateur, au dépôt comme à la lecture. Sur un second appareil, l'état
suit le compte — donc l'écran d'après-partie s'affiche — et **l'inscription
d'office dépose un nom sous le jeton de cet appareil-là**, qui n'a aucune
réponse. La journée 4 portait deux lignes « Le duc » pour un seul compte.

⚠️ **ET LE COMPTE NE COMPTAIT PAS CE QUE LA LISTE MONTRE.** La liste joint
`scrutin_banalo_scores` sur le jeton ; `v_inscrits` comptait SANS cette jointure.
D'où « 2 inscrits, 1 ligne », et jusqu'à « 2 inscrits, 0 ligne » pour un compte
dont la réponse vit sous un autre jeton. **C'est un invariant, pas un réglage :
le nombre annoncé sous une liste doit être le nombre de lignes que cette liste
aurait sans sa coupe** — écrits séparément, les deux dérivent, et c'est
l'effectif qu'on croit puisqu'il est en toutes lettres. ⚠️ Cinq sur cinq n'avait
pas le défaut, et c'est vérifié : `scrutin_game_pays_tableau` comptait déjà avec
le filtre de sa liste.

⚠️ **TROIS CORRECTIONS, ET IL FAUT LES TROIS** : le client résout le jeton sur
les deux chemins du nom (`litTableauDuJour`, `deposeNom`) ; l'effectif joint les
scores ; et **un INDEX** (`banalo_noms_par_compte`, `pays_noms_par_compte`)
interdit à un compte de tenir deux lignes — la garde est un index, pas une
condition d'écran, un vieux client déployé garderait son jeton brut.

⚠️ **ET « déjà déposé » SE DIT AVANT L'INDEX.** Le gestionnaire
d'`unique_violation` cherche une ligne pour CE jeton ; l'index porte sur le
COMPTE, donc rien ne correspond et le dépôt retombait sur « ce nom est déjà
porté » — un message qui envoie choisir un autre nom alors qu'aucun ne marchera.

**ON PROPOSE DE SE NOMMER DANS UNE MODALE** (`TableauDuJour`), demandé tel quel :
« pour un joueur sans pseudo il faudrait une modale qui propose de renseigner un
pseudo ou se connecter/créer un compte ». ⚠️ **ELLE SURGIT, ET C'EST UNE
EXCEPTION ASSUMÉE** à la règle « une modale que le joueur ouvre n'est pas une
modale qui surgit » : le formulaire posé en bas d'un écran de 2 400 px ne se
voyait pas — troisième reproche de terrain de la même semaine sur un bloc trop
discret. Deux gardes la rendent tenable : **une fois par jeu et par journée**
(`memoire`, une clé de `localStorage`) et jamais avant la fin de la partie.

⚠️ **LA MARQUE S'ÉCRIT À L'OUVERTURE, PAS À LA FERMETURE** : écrite en fermant,
elle manquerait à tous ceux qui rechargent ou quittent sans répondre, et la
boîte reviendrait au chargement suivant — la boîte qu'on ferme sans lire.

⚠️ **UN CHAMP DE SAISIE DANS `Modale` A EXIGÉ DE SÉPARER SON EFFET DE FOCUS.**
Signalé par un joueur : « je peux ajouter un pseudo mais le clavier s'en va après
avoir écrit un caractère ». `Modale` prenait le focus dans un effet qui portait
AUSSI l'écouteur d'Échap, donc en `[fermer]` — et les appelants passent `fermer`
en fonction fléchée, de référence neuve à chaque rendu. Taper une lettre re-rend
le parent, l'effet rejoue, et `boite.focus()` ARRACHE le focus au champ : sur
téléphone le clavier se referme, et la lettre suivante se perd. Tant que cette
boîte ne portait que des annonces sans champ, le vol était invisible — c'est
l'ajout du formulaire de nom qui l'a révélé. Le focus va donc dans un effet à
dépendances VIDES, Échap garde le sien. ⚠️ Et le symptôme trompe : le nœud n'est
PAS remonté (un témoin posé dessus survit), donc chercher un remontage de React
mène à côté. C'est un vol de focus, pas un cycle de vie.

⚠️ **LE FORMULAIRE EXISTE EN UN SEUL EXEMPLAIRE**, et la carte s'en passe tant
que la modale est ouverte. Rendus tous les deux, ils montreraient les MÊMES
suggestions (même jeton, même graine, même tour) dans deux boîtes voulant dire
deux choses — le défaut déjà payé entre le tableau et la tablée. ⚠️ Et la phrase
d'invite reste dans la CARTE : la boîte a déjà un titre et une phrase qui disent
la même chose, empilées on lisait deux fois « laissez un nom ». Ça ne se voit
qu'à l'écran.

⚠️ **ELLE PORTE AUSSI L'OFFRE DE NOTIFICATION, ET ÇA RENVERSE UNE DÉCISION
ÉCRITE.** L'en-tête de `Notifications.tsx` disait « elle est ICI et pas après
une partie, et c'est un choix » — l'après-partie n'a qu'une place et son échelle
est pleine. Demandé quand même : « proposer les notifs pour être prévenu des
résultats de la journée ». Ce qui le rend tenable, c'est que la notification
prend **exactement la place que l'offre de compte laisse vide** : un connecté ne
voit pas l'une, un anonyme ne voit pas l'autre. La boîte garde ses DEUX portes,
elle n'en ouvre pas trois. Et le genre `journee` existe en base depuis le 01/09,
offert seulement sur `/games/quotidien` — la page que les joueurs ne visitent
pas.

⚠️ **ET LA MODALE A DEUX RAISONS DE S'OUVRIR, PARCE QU'UN JOUEUR A VU LE TROU** :
« est-ce que la notif est demandée dès qu'on crée un compte ? ». Non — un
connecté qui a un pseudo est **inscrit d'office**, donc `demande` est faux, donc
la modale du nom ne s'ouvrait jamais pour lui. Celui qui vient précisément de
créer un compte ne se voyait donc proposer les notifications **nulle part**. La
seconde raison (`modale === "notifs"`) couvre exactement ce cas.

⚠️ **UNE FOIS PAR NAVIGATEUR, PAS PAR JOURNÉE** (`MEMOIRE_NOTIFS`, sans numéro
ni nom de jeu). Un nom se dépose chaque jour ; un abonnement se pose UNE fois et
vaut pour les deux jeux et pour toujours. Le proposer par jeu et par jour ferait
quatorze boîtes par semaine pour une décision qui se prend une fois.

⚠️ **ET JAMAIS EN MÊME TEMPS QUE LA DEMANDE DE NOM** : §0 n'admet qu'une
demande, et le nom passe d'abord — il ne vaut que pour aujourd'hui, l'autre
attendra.

⚠️ **`OffreNotifs` DIT À SON APPELANT S'IL Y A UN BOUTON (`onUtile`), ET SANS ÇA
LA BOÎTE S'OUVRIRAIT VIDE.** Elle se tait dans cinq cas (pas de compte, pas de
clé VAPID, déjà abonné ici, lecture en cours) et ne rend qu'une PHRASE dans
trois autres (iPhone sans installation, permission refusée, navigateur
incapable). Une modale qui surgit pour annoncer « votre navigateur a refusé »
est du bruit : `PAS D'ACCROCHE SANS BOUTON`, la règle d'`InstallJeu`. Vérifié au
navigateur dans les DEUX sens — avec une clé VAPID posée le temps d'un build,
elle s'ouvre avec son bouton ; sans, elle ne s'ouvre pas du tout.

⚠️ **L'OFFRE EST SORTIE DANS `OffreNotifs`, PAS RECOPIÉE.** Elle vit désormais à
deux endroits ; `Notifications` garde ses interrupteurs et lui passe `appareils`
pour lui éviter de relire ce qu'elle a déjà lu. La PHRASE voyage en paramètre :
l'onglet des réglages explique le dispositif, la modale répond à la question que
le joueur vient de se poser.

⚠️ **ET SANS COMPTE, C'EST IMPOSSIBLE — pas par choix d'écran.** Tout le
dispositif est indexé sur `user_id` : la ligne d'abonnement, la clé anti-doublon
`(user_id, jeu, genre, repere)`, le plafond d'une par jour
`(user_id, jeu, jour_civil)` et les trois réglages. Le porter sur le jeton
anonyme demanderait de re-clefer quatre choses **plus la tournée d'envoi**, puis
de trancher la purge (le jeton s'efface à 30 jours, un compte non) et de
réécrire la politique. L'anonyme se voit donc offrir le COMPTE, dont la phrase
nomme la notification qu'il ouvre — la seule façon honnête de répondre à « je
veux être prévenu » sans poser un bouton que la base ne saurait pas servir.

⚠️ **LA TOURNÉE N'A JAMAIS RIEN ENVOYÉ, ET LA CAUSE EST UN `NaN` SILENCIEUX.**
Signalé : « j'ai validé les notifs sur plusieurs appareils, je n'en ai pas
reçu ». Vérifié bout en bout : le cron part toutes les heures, atteint la prod,
reçoit 200 — et rend `{"vises":0}`. `numeroDeJournee` CONCATÈNE `T00:00:00Z` à
ce qu'on lui donne ; la tournée lui passait `new Date().toISOString()`, ce qui
produit « …183ZT00:00:00Z », donc `Date.parse` → `NaN`, donc `null` en JSON,
donc le garde `if p_jour_banalo is null or p_jour_pays is null then return` de
`scrutin_jeux_notifs_a_envoyer` sortait sans un mot — **pour les DEUX jeux**,
puisqu'il les teste ensemble. Un seul appelant sur onze était fautif ; tous les
autres passent `dateCivile()`.

⚠️ **TRANCHER L'ISO À DIX CARACTÈRES NE MARCHERAIT PAS NON PLUS** : il est en
UTC, donc faux à Paris entre 22 h et minuit l'été. C'est `dateCivile()` qu'il
faut, et elle existe pour ça.

⚠️ **ET `numeroDeJournee` REFUSE MAINTENANT CE QUI N'EST PAS `AAAA-MM-JJ`.** Une
entrée invalide doit CASSER — une exception remonte en 500 dans
`net._http_response`, donc elle se voit — au lieu de rendre un nombre qui n'en
est pas un. Mesuré après correction : la tournée vise **8 envois** là où elle en
visait 0. Deux tests le tiennent.

⚠️ **ET LE BOUTON D'ABONNEMENT CONFIRME, AU LIEU DE DISPARAÎTRE.** Signalé dans
le même souffle : « le bouton se grise quand je clique dessus et ne semble pas
avoir de conséquences ». Il marchait — les abonnements étaient bien en base —
mais réussir rendait `montre` faux, donc le bloc s'effaçait : une réussite
silencieuse est indiscernable d'une panne, et on represse. C'est mot pour mot le
défaut déjà payé sur le dépôt du pseudo.

⚠️ **RIEN DE TOUT ÇA N'EST VÉRIFIABLE ICI** : sans clé VAPID dans le conteneur,
`notifyDeployed()` est faux et le bloc est INVISIBLE en développement. Ce qui a
été éprouvé au navigateur, c'est qu'il ne s'affiche pas — pas qu'il marche.

⚠️ **METTRE LE CHAMP EN PREMIER NE SUFFIT PAS : IL FAUT AUSSI QU'IL PÈSE.**
Signalé après coup — « je ne vois pas dans la modale l'option de déposer un
pseudo libre ». Il y était, en tête. Mais un champ VIDE ne pèse rien à côté de
trois pastilles pleines de mots cerclées d'encre à 2 px, puis de deux boutons de
connexion : la boîte se lisait « créez un compte ». C'est le défaut d'ORDRE
corrigé la veille, revenu par le POIDS. Le champ prend donc l'encre et l'ombre
du produit, les pastilles perdent leur trait (1,5 px en `muted`) — elles gardent
leur forme et leur état plein quand on en choisit une. Ça ne se voit qu'à
l'écran.

⚠️ **ET L'ARGUMENT DU COMPTE ÉTAIT EN DOUBLE.** La modale disait « garde votre
série et vos résultats d'un appareil à l'autre » ; `CompteBanalo`, deux cartes
plus bas sur le même écran, dit « sans compte, votre série vit dans ce
navigateur ». Deux fois le même argument pour la même demande. La modale ne
parle plus que de NOMMER (« un compte vous nomme partout, et vous n'aurez plus à
redéposer un nom chaque jour ») ; garder la série reste le métier de
`CompteBanalo`. Les deux portes subsistent, l'argument ne se répète plus.

⚠️ **LE COMPTE N'EST OFFERT QU'À QUI N'EN A PAS**, et « Plus tard » est en
`ghost` : le geste de la boîte est de se nommer, un bouton de sortie plein
deviendrait l'élément le plus fort de la carte. Mesuré : 914 px de contenu dans
732 px visibles — elle défile, Échap et le fond ferment.

**LA JOURNÉE ARRÊTÉE MONTRE SON TABLEAU** (`ListeDuTableau.tsx`, 2026-08-24) —
demandé tel quel : « quand on affiche l'aperçu de la journée précédente, il
faudrait y voir le classement des premiers dans la veille, avec sa position
aussi si on n'est pas dans les 5 premiers ». ⚠️ **AUCUNE MIGRATION** :
`scrutin_banalo_tableau` prend son jour en paramètre et n'a jamais su qu'il
était « aujourd'hui ».

⚠️ **CINQ LIGNES ICI, DIX SUR L'ÉCRAN DU JOUR — ET C'EST LA COUPE QUI ÉTAIT LE
PIÈGE.** La base ne met dans `moi` que le joueur hors de SA tête de dix : à
cinq, le 7ᵉ est dans `lignes` et disparaîtrait en silence de son propre tableau.
`ListeDuTableau` le repêche (`lignes.slice(max).find(l => l.moi)`), et c'est
pour cette règle-là que la liste est sortie en UN exemplaire plutôt que
recopiée — le chemin qu'avaient pris les trois offres de compte et la règle du
mot orphelin.

⚠️ **ET IL SORT DÈS UN SEUL NOM** (`20260915-banalo-tableau-arrete-des-un-nom.sql`) —
signalé : « je ne vois pas le classement des joueurs de la veille (même s'il n'y
en a qu'un) ». La journée 4 ne portait plus qu'un inscrit après le ménage du 14,
et le plancher de deux retenait sa ligne : ni résumé, ni tiroir, ni un mot pour
le dire. ⚠️ **C'EST LE « 1er SUR 1 » QUE LE PRODUIT REFUSE PARTOUT, ET ON NE LE
RETIRE QUE DE LA JOURNÉE CLOSE.** Sur la journée en cours, une liste d'une ligne
est une RÉCOMPENSE servie à quelqu'un qui n'a battu personne — une tautologie.
Sur une journée arrêtée, c'est un RELEVÉ : « voilà qui figurait ce jour-là ».
Court, mais pas faux, et infiniment mieux qu'un silence.

⚠️ **LE PLANCHER EST DONC UN PARAMÈTRE (`p_min`), PAS UNE CONSTANTE RETIRÉE** :
l'écran du jour appelle sans rien et garde 2, seule la relecture demande 1. Une
fonction sans plancher du tout laisserait le prochain écran le refabriquer à sa
façon. ⚠️ Et **ajouter un paramètre CRÉE une fonction** : sans le `drop` de la
version à quatre arguments, PostgREST se retrouve devant deux candidates et rend
une ambiguïté — plus personne ne lit de tableau. Le client déployé, lui, ne casse
pas : il poste quatre clés et PostgREST les fait correspondre à la nouvelle, dont
le cinquième argument a un défaut.

**CINQ SUR CINQ A SA JOURNÉE PRÉCÉDENTE DEPUIS LE 26/08**
(`pays/JourneePrecedente.tsx`, `20260916-jeu-pays-journee-precedente.sql`) —
demandé : « même chose dans 5 sur 5, un bouton pour avoir les données de la
journée précédente ». Il n'avait AUCUNE relecture : ses trois modales sont la
méthode, l'intro du jour et les pictos, et une partie finie disparaissait avec sa
journée.

⚠️ **IL NE DEMANDE PAS À LA BASE QUELLE JOURNÉE MONTRER**, contrairement à
Banalo. Là-bas les réponses vivent en base, donc seule elle sait ce que ce joueur
a joué (`scrutin_banalo_derniere`) ; ici le résumé des victoires vit dans le
navigateur (`placet.pays.resultats`, la seule mémoire longue du jeu), et l'écran
y lit la dernière journée gagnée avant aujourd'hui — sans un aller-retour de
plus. ⚠️ Conséquence assumée : **sur un appareil neuf le bloc ne sort pas**, même
pour un compte dont les parties sont rattachées. Le rendre exact partout
demanderait une fonction « dernière journée jouée » côté base ; pour un bloc de
relecture, le prix n'en vaut pas la peine tant que personne ne l'a signalé.

⚠️ **ELLE EST SOUS LE TITRE DE LA PAGE, ET C'EST LA SECONDE CORRECTION DE
PLACE.** Demandé deux fois — « proche du titre », puis « est-ce bien en petit à
côté du titre de la page ? ». Non : mesuré, elle était à **y = 1 521** quand le
titre est à **14**, soit quatre écrans de téléphone plus bas. J'avais compris
« le titre de la CARTE ». Elle est maintenant à **y = 227**, en 13 px gris, sous
la consigne et au-dessus de la carte.

⚠️ **ET ELLE N'ATTEND PLUS LA VICTOIRE.** §16 range les OFFRES après la
révélation — compte, installation, pont vers Placet — parce qu'elles DEMANDENT
quelque chose. Cette ligne ne demande rien, elle RACONTE : même raisonnement que
`SerieDuJour`, qui n'occupe aucune place de l'échelle du §0 pour cette raison
exacte. Et elle ne divulgue rien du jour — un rang de la veille ne réduit aucune
recherche d'aujourd'hui.

⚠️ **LA PLACE PASSE DEVANT, ET LE TIROIR GARDE LE RESTE** — demandé : « le
classement de la journée précédente devrait être proche du titre, très simple ».
Elle annonçait le nombre d'essais et cachait le classement derrière un bouton,
alors que ce que le joueur vient chercher est SA PLACE : « 5e sur 12 · 2 essais »,
puis « Détails ». ⚠️ Le rang vient de `scrutin_game_pays_position`, qui compte
**toute la foule** et marche sans compte — jamais du tableau, qui ne classe que
les inscrits et n'imprime pour cette raison aucun numéro. ⚠️ Et il ne va jamais
sans son effectif : « 3e » ne veut pas dire la même chose sur six joueurs et sur
trois mille. ⚠️ « Cette journée est close » descend dans le tiroir chez Cinq sur
cinq — le titre dit déjà « votre DERNIÈRE journée » — mais **reste dans le résumé
chez Banalo**, où c'est elle qui tient lieu de notification et doit se lire sans
rien ouvrir.

⚠️ **ET LE BOUTON NE SORT QUE S'IL Y A QUELQUE CHOSE DERRIÈRE.** Un tiroir qui
s'ouvre sur une carte vide est pire que pas de tiroir : `PAS D'ACCROCHE SANS
BOUTON`, la règle d'`InstallJeu`. Il se gagne aussi sur `gagne` — §16 interdit la
moindre distraction pendant la manche, et relire hier pendant qu'on cherche
aujourd'hui en est une.

⚠️ **DANS LE TIROIR, ET J'AVAIS COMPRIS L'INVERSE.** Je l'avais posé dans le
RÉSUMÉ en argumentant que le contenu qui change doit monter, et en invoquant deux
retours « trop discrets » de la même semaine. Ce n'était pas la demande :
« c'est dans la modale de la journée précédente que nous ajoutons le classement
de la journée précédente ». Le tiroir est d'ailleurs son bon endroit — il porte
la journée arrêtée EN ENTIER, la grille, la forme du jour, et maintenant qui y
figurait. ⚠️ Et il n'est **plus en double** : posé aux deux endroits, il faisait
deux listes de noms visibles en même temps, l'une DERRIÈRE la modale qui montrait
l'autre. Vu sur une vraie capture.

⚠️ **ET C'EST LA TROISIÈME LISTE DE NOMS DE L'ÉCRAN** (tablée, tableau du jour,
celle-ci) — le doublon visuel déjà payé entre le tableau et la tablée. Mesuré :
**1 017 px** séparent les deux tableaux, soit plus d'un écran de téléphone, donc
ils ne cohabitent jamais dans un même coup d'œil. Ce qui les sépare pour de bon
est le CADRE : numéro de journée, « cette journée est close », et un effectif au
PASSÉ (« 23 joueurs avaient laissé leur nom ») — « aujourd'hui » y serait faux.

⚠️ **LE TABLEAU NE PORTE AUCUN NUMÉRO DE RANG, et il ne montre que DIX lignes.**
Le rang affiché serait soit celui parmi les INSCRITS — « 1er » alors que trente
joueurs ont fait mieux sans s'inscrire, c'est-à-dire un mensonge —, soit le rang
réel, et deux lignes voisines afficheraient « 3e » puis « 17e », ce qui se lit
comme un trou. L'ordre parle ; le vrai rang du joueur est déjà sur sa carte de
score, juste au-dessus. Dix et non vingt est une **mesure d'écran** : à vingt, la
carte fait 700 px sur un téléphone de 390 et il faut la franchir entière pour
atteindre le partage et l'offre de compte. ⚠️ Corollaire de balisage : la tête de
liste est un `ol` — « 3ᵉ élément » y est vrai — mais **ma ligne lointaine est
dehors**, sinon un lecteur d'écran annoncerait « 11ᵉ élément » pour la 34ᵉ place,
c'est-à-dire le chiffre faux que le tableau refuse d'imprimer.

⚠️ **ET LA LIGNE SORT MÊME HORS DE LA TÊTE DE LISTE** : un tableau où l'on ne se
trouve pas est un tableau qui parle des autres. Trois points la précèdent, sinon
elle se lit comme la onzième.

⚠️ **AUCUN ADJECTIF DANS LA LISTE, ET C'EST UNE CONTRAINTE DE LANGUE.** Un
adjectif s'accorde (« Renard malin » mais « Loutre maligne », « Zorro astuto »
mais « Nutria astuta ») : composer à la volée demanderait de porter le genre de
chaque animal dans chaque langue. Un complément ne s'accorde jamais — « Renard de
minuit », « Loutre de minuit » — et la même mécanique marche dans les quatre
langues. ⚠️ **C'est l'INDEX qu'on stocke, pas le libellé** : un nom stocké en
français s'afficherait en français à un anglophone du même tableau. Et le
contrôle de parité ne voyant que `messages/*.json`, ce sont les **tests** de
`noms.test.ts` qui tiennent les quatre langues de ce fichier.

**Il est PUBLIC, pas borné à un groupe** — arbitré. Ce que ça laisse ouvert est
le signalement, indispensable seulement dans cette forme-là : il n'existe pas
encore, et la prise pour agir est le compte exigé derrière le texte libre.

**IL N'Y A PLUS QU'UN SEUL NOM PAR COMPTE**
(`20260907-jeux-un-seul-pseudo.sql`), et c'est un joueur qui a vu le défaut :
« j'ai associé un pseudo sur mon compte (« Le duc »), or après avoir renseigné le
Banalo du jour il m'a été proposé de préciser un pseudo, au lieu de le
reprendre ». Vérifié en base : son compte portait `Le duc` depuis le 22/08, et il
avait RETAPÉ `Le duc` à la main pour la journée 3. Trois dépôts de nom
coexistaient — `scrutin_jeux_pseudos` (le compte, permanent, prise Régie),
`scrutin_banalo_noms` (une journée) et `scrutin_banalo_tablee_membres` (une
tablée) — et rien ne les reliait.

⚠️ **ET LE VRAI DÉFAUT N'ÉTAIT PAS LA FRICTION : LA PRISE DE LA RÉGIE NE COUVRAIT
QU'UN DÉPÔT SUR TROIS.** `20260825` a franchi la ligne du nom permanent en
écrivant noir sur blanc la contrepartie qu'elle réclamait — « un compte derrière
chaque nom, ET UNE PRISE DANS LA RÉGIE pour le retirer ». Or
`scrutin_banalo_nom_deposer` ne regardait jamais `bloque_le` : un pseudo retiré
par un modérateur pouvait continuer à publier le même texte libre au tableau
PUBLIC, tous les jours. La prise était un mur avec une porte à côté. C'est ça qui
rendait la reprise nécessaire, pas le confort.

**La règle est maintenant : avec un compte, le pseudo de compte EST le nom,
partout.** Le tableau du jour et la tablée ne stockent plus aucun libellé pour un
compte — ni `nom`, ni `nom_index` — et le nom se RÉSOUT à la lecture depuis
`scrutin_jeux_pseudos`. Trois propriétés viennent avec, sans qu'on ait à les
écrire : un seul endroit où en changer ; la prise de la Régie atteint tous les
tableaux d'un coup ; et un nom retiré ne reste pas affiché sur les journées
passées — exactement le raisonnement déjà écrit pour le podium des saisons (« le
pseudo n'est pas gelé avec la médaille »).

⚠️ **SANS COMPTE, LE NOM VIT UNE JOURNÉE** — et depuis le 24/08 on l'ÉCRIT, la
liste de 600 n'étant plus qu'une suggestion (voir le renversement plus haut). Ce
qui n'a pas bougé : par journée, purgé à trente jours, jamais recopié dans le
résumé de compte.

⚠️ **UN PSEUDO EXISTANT N'EST JAMAIS ÉCRASÉ PAR CE QU'ON TAPE AUJOURD'HUI**, et
c'est ce qui rend la bascule sûre : le client déployé envoie encore du texte
libre, et `scrutin_jeux_pseudo_resoudre` le remplace par le pseudo du compte. Le
vieux client obtient donc tout seul le comportement demandé. Ce n'est que pour un
compte SANS pseudo que le texte est adopté — et il devient alors le pseudo
permanent, ce que l'écran annonce avant le dépôt.

⚠️ **LES BORNES DU PSEUDO S'APPLIQUENT PARTOUT MAINTENANT.** Il y avait deux
règlements pour la même chose : `pseudo` faisait 2 à 20 caractères, espaces
normalisés, caractères de contrôle refusés ; `nom` faisait 1 à 24, sans rien de
tout ça. `scrutin_jeux_pseudo_net` est le seul endroit où la normalisation vit —
elle était sur le point d'exister en quatre exemplaires, le chemin qu'avaient pris
la règle du mot orphelin et le calcul des scores.

⚠️ **LE `left join` SUR LES PSEUDOS NE FILTRE PAS SUR `bloque_le`, ET C'EST
DÉLIBÉRÉ.** Écrit `join … and p.bloque_le is null`, un compte bloqué rend la
jointure vide, donc `coalesce(p.pseudo, n.nom)` RETOMBE sur l'ancien texte libre
d'une ligne historique — et la porte qu'on vient de fermer se rouvre en silence
sur les seules lignes qui la connaissaient. On joint sans condition et on tranche
ensuite, en trois cas nommés. L'index de la liste fermée l'emporte toujours.

⚠️ **CINQ SUR CINQ N'AVAIT RIEN À CORRIGER, ET C'EST VÉRIFIÉ, PAS SUPPOSÉ.** Il ne
demande de nom NULLE PART — pas de tableau du jour, pas de tablée — donc il
n'existait pas de second champ pour diverger. Son seul nom est le pseudo de
compte, lu en direct par `scrutin_jeux_saison_table` et `scrutin_jeux_trophees`,
qui joignent tous deux `and p.bloque_le is null`. Les quatre surfaces lisent
désormais la même ligne.

⚠️ **LA POLITIQUE DE CONFIDENTIALITÉ DISAIT « il n'existe ni profil ni pseudo
permanent »** — faux depuis le classement de saison du 25/08, et doublement faux
maintenant. Réécrite dans le même commit, en trois langues : la liste fermée vaut
pour une journée, le pseudo de compte nomme partout et se garde.

**LE PONT VERS PLACET ÉTAIT DU CODE MORT, ET LA MENTION QUI RESTAIT ÉTAIT UNE
PHRASE GRISE** (2026-08-23) — signalé ainsi : « la mention de Placet juste
au-dessous de *Vos résultats* sur les pages de jeu est trop discrète ».

⚠️ **ELLE ÉTAIT DISCRÈTE PARCE QU'ELLE N'AVAIT RIEN À DIRE, et grossir une
phrase générique la rapproche de la publicité au lieu de l'en éloigner.** Ce qui
fait qu'un lien se lit comme une réclame n'est pas sa taille : c'est de parler de
l'annonceur, d'être identique tous les jours — donc du mobilier au troisième
passage — et de demander sans rien donner. `PontPlacet` répondait déjà à ça
(« montrer, pas expliquer » : un vrai scrutin public, votable en un tap).

⚠️ **IL NE POUVAIT SIMPLEMENT PAS S'AFFICHER.** Il exige `connecte`, et les deux
jeux le montaient APRÈS un `if (user) return …`, c'est-à-dire dans la seule
branche où `user` est forcément absent. Sur Banalo du jour comme sur Cinq sur
cinq, depuis le premier jour. Sa seconde garde, `!installPossible`, l'aurait de
toute façon réservé à qui a déjà installé l'application, ou à Firefox :
l'installation est possible sur Chrome Android, sur iOS et sur Chrome bureau.

⚠️ **CE N'EST PAS UNE DEMANDE DE PLUS DANS L'ÉCHELLE DU §0**, et c'est ce qui
autorise à le montrer à côté de l'installation. L'échelle arbitre des
ENGAGEMENTS — compte, installation, notification. Un scrutin public est du
CONTENU : il change tous les jours et se lit sans rien accepter. Il vit donc DANS
la carte des résultats, **sans cadre pointillé** — cette matière est celle des
offres (`InstallJeu`, `ApresLaSalle`) et l'emprunter le ferait lire comme une
demande. La seule demande de l'écran reste le cadre en dessous.

**LE PARTENARIAT GLOBÉNOSTRA A UN BLOC, PLUS UNE NOTE DE BAS DE PAGE.** Même
diagnostic : on avait construit une VRAIE page (`/partenaires/globenostra`, ses
démonstrations neutres du jugement majoritaire, de Condorcet et de
l'approbation) et **rien sur placet.app n'y menait** — elle n'était servie que
par la réécriture de `placet.globenostra.com`. Côté Placet il ne restait qu'une
ligne de 12,5 px pointant vers l'extérieur.

⚠️ **IL A LA FORME DU BLOC SLACK PENDANT UNE HEURE, ET C'ÉTAIT ENCORE TROP
PEU** — « ridiculement discret pour être appelé un lien croisé ou une mise en
avant ». Deux fois j'ai défendu la retenue, deux fois on m'a demandé de la lever :
c'est la retenue qui avait tort. Du texte gris sur le crème, notre porte en bouton
et la leur en mot de 12,5 px — **un lien croisé où une seule des deux portes se
voit n'est pas croisé.** C'est une CARTE : leur marque à 34 px, leur nom en police
de titre, ce qu'ils font, un filet, puis notre moitié, puis DEUX sorties.

⚠️ **CE QUI L'EMPÊCHE DE SE LIRE COMME UNE PUB N'EST PAS SA TAILLE, C'EST
L'ORDRE.** Leur marque et ce qu'ILS font viennent en premier, ce que NOUS
proposons ensuite. Une réclame parle de l'annonceur puis demande ; ici chaque
moitié est attribuée, et la moitié du partenaire ne demande rien — elle donne son
adresse. ⚠️ **Le filet n'est pas un ornement, c'est la frontière** : la thèse des
méthodes posée juste sous leur nom la leur attribuerait.

⚠️ **L'OMBRE PORTE LEUR BLEU ÉCHANTILLONNÉ SUR LEUR LOGO** (`#0133A5`, le bout
gauche du dégradé), pas une couleur choisie pour eux — la leçon du sarcelle
inventé en juillet. Même dispositif que les vignettes de jeu : l'accent annonce
la destination.

⚠️ **Franc ne veut toujours pas dire proéminent** : la carte reste en bas, après
le pitch, les CTA, les jeux du jour et Slack. Ce qui a changé est la MATIÈRE et la
RÉCIPROCITÉ, pas la place — une carte partenaire qui monterait au-dessus de
« Créer » serait, elle, une vraie publicité.

⚠️ **ET LA PHRASE DU BLOC A DÛ ÊTRE CORRIGÉE : elle promettait une comparaison
que la page ne fait pas.** Elle annonçait « comparez les trois méthodes SUR LES
MÊMES EXEMPLES ». La page porte **trois questions différentes**, une par méthode ;
elle AFFIRME que les méthodes divergent « avec les mêmes votants et les mêmes
options », elle ne le DÉMONTRE pas. On dit donc « essayez ». ⚠️ Et on n'attribue
pas les démonstrations au partenaire : la page trace la ligne elle-même — Placet
est l'outil, l'analyse des positionnements est à GlobéNostra.

**LE VOTINATOR EST SUR LA PAGE PARTENAIRE, ET SA PLACE Y EST CONTRAINTE.** C'est
le jeu de GlobéNostra : dix lois réellement votées à l'Assemblée pendant la
législature en cours, un résumé et les arguments pour et contre pour chacune,
puis la série du joueur mise en regard des votes de chaque parti.

⚠️ **IL EST APRÈS L'ENCADRÉ DE NEUTRALITÉ, ET CE N'EST PAS UNE QUESTION DE MISE
EN PAGE.** L'encadré dit « les exemples **CI-DESSUS** portent sur des thèmes et
des méthodes, jamais sur des candidats ou des partis » : le mot borne la promesse
à NOS trois démonstrations. Poser le Votinator au-dessus la ferait couvrir un jeu
qui montre le vote de chaque parti — donc la rendrait fausse. En dessous, elle
reste vraie, et sa dernière ligne (« les contenus d'analyse des positionnements
relèvent du projet GlobéNostra ») devient l'introduction du bloc. La page avait
prévu ce cas dès son écriture.

⚠️ **ON NE LE PRÉSENTE JAMAIS COMME LE NÔTRE** : c'est leur jeu, sur leur
domaine, et ce partage est ce qui rend le lien tenable.

⚠️ **ET CE N'EST PAS « L'AUTRE MOITIÉ D'UNE MÊME QUESTION » — J'AI ÉCRIT ÇA ET
C'ÉTAIT FAUX.** La formule installait un programme commun en deux moitiés, donc
elle faisait des modes de scrutin un sujet PARTAGÉ. Or **les modes de scrutin ne
sont pas le centre de gravité de GlobéNostra** : leur sujet est le positionnement
politique. La thèse des méthodes est celle de PLACET SEUL — l'accueil la porte
déjà en propre (« chaque décision a sa méthode »). La page dit maintenant
« Placet ne fait pas ce travail-là : il compte des voix, il n'analyse pas de
positions », et la formule est partie de l'écran ET du code : la laisser en
commentaire après l'avoir retirée de l'écran, c'est le mécanisme par lequel une
prémisse fausse se transmet d'agent en agent comme un fait.

⚠️ **ET IL N'ENTRE PAS DANS LE CATALOGUE `/games`** — trois raisons, dont une
seule suffirait : `GameEntry.slug` est la valeur d'aiguillage de
`scrutin_game_rooms.game` et toutes les vignettes pointent une `route` de notre
domaine ; nos jeux déclarent une tranche d'âge « enfant » dans la politique de
confidentialité ; et un jeu qui fait trancher sur des lois votées à l'Assemblée
n'a rien à faire entre « Un par jour » et « Les enquêtes ». La porte des jeux est apolitique par
construction.

⚠️ **`globenostra.com` ET SES SOUS-DOMAINES SONT HORS DE PORTÉE DEPUIS LE
CONTENEUR** : le proxy de sortie répond 403 au CONNECT, comme pour Supabase, et
rien n'est indexé côté recherche. Tout ce qui est écrit ici sur le Votinator
vient de la description du propriétaire du dépôt, pas d'une lecture de la page.

⚠️ **LA MARQUE DU PARTENAIRE EST UN FICHIER, PAS UN DESSIN DE NOUS**
(`GlobeNostraMark.tsx`, `public/partenaires/globenostra.png`). Les deux autres
marques du dépôt sont des SVG écrits à la main — `PlacetMark` dessine la nôtre,
`SlackMark` reproduit le trèfle officiel chemin par chemin — mais **on ne
redessine pas la marque d'un partenaire** : une approximation tracée à la main
est une contrefaçon approximative de son bien. On sert le fichier qu'il a donné,
comme `BrandIcon` sert les logos d'assistants de `public/brands/`.
⚠️ Le fichier est **recadré sur la marque, pas retouché** : l'original portait
25 px de vide transparent de chaque côté, donc à hauteur égale la marque
paraissait plus petite que la nôtre et décalée dans le lockup (153×102 → 103×94).
⚠️ Et **sa hauteur est 30 quand la nôtre est 38** : la leur est pleine et presque
carrée, la nôtre est un bloc à coins arrondis avec du blanc autour. Réglé à
l'œil.

⚠️ **LE NOM DU PARTENAIRE EST PASSÉ EN ENCRE, ET C'EST SA MARQUE QUI L'A
TRANCHÉ.** Le sarcelle avait été choisi en juillet comme « son accent », sur une
description de son site que personne ici n'a jamais pu vérifier — le conteneur
n'a **aucune sortie web**, `example.com` lui-même est refusé. Son logo va du bleu
au violet : peindre son nom d'une couleur qu'on lui a inventée, juste à côté de
ses vraies couleurs, se voit. Le lockup est maintenant symétrique — une marque et
un nom de chaque côté du « × » — et le sarcelle redevient ce qu'il a toujours
été, l'accent de CETTE page.

⚠️ **ET `public/partenaires/globenostra.jpg` A ÉTÉ SUPPRIMÉE** : 400×194,
ajoutée le 31/07 dans le même commit fourre-tout que la page, référencée nulle
part, et **ce n'était pas leur marque** — une illustration décorative abstraite,
de provenance et de licence inconnues. Elle voisinait le `.png` qui, lui, sert :
deux fichiers `globenostra.*` dans un même dossier finissent par être confondus.

⚠️ **LA DÉMONSTRATION N'EST PROPOSÉE QU'EN FRANÇAIS** : la page est écrite en
français et porte sur la présidentielle française. Les trois autres langues
gardent la mention réciproque, qui est traduite. ⚠️ Et son lien est le `Link` de
**next**, pas celui de `@/i18n/navigation` : `partenaires` est exclu du matcher
du middleware, donc la page vit hors du segment de langue — un lien localisé
viserait `/fr/partenaires/globenostra`, qui n'existe pas. Une ancre nue ne marche
pas non plus : eslint refuse `<a>` vers une page interne, et ça casse le
déploiement.

**ON NE REDEMANDE PLUS SON PSEUDO À UN JOUEUR CONNECTÉ, ET IL PEUT LE RETIRER**
(`20260912-jeux-retirer-son-pseudo.sql`, 2026-08-23) — signalé par un joueur :
« en tant que joueur connecté, il m'est demandé après avoir joué de déposer son
pseudo qu'on a enregistré ». Il a raison, et `choixDeNom` le prouve : il rend
`{ compte: true }`, une charge utile SANS libellé, parce que la base résout le
nom elle-même. Le bouton n'apprenait rien à personne.

⚠️ **CE N'ÉTAIT POURTANT PAS UN DÉPÔT DE NOM, MAIS UN CONSENTEMENT À
PUBLICATION** — « on n'y entre que par un geste », en tête de `TableauDuJour`,
et c'est ce qui rend acceptable d'y afficher le dernier autant que le premier.
⚠️ **L'argument tombe pour un COMPTE, et c'est vérifiable** :
`scrutin_jeux_saison_table` joint UNIQUEMENT `scrutin_jeux_pseudos`, donc tout
compte qui a posé un pseudo figure déjà au classement de saison, publiquement,
sous ce même nom, **sans aucun geste quotidien** — et ce tableau-là est
permanent, quand celui du jour se purge à trente jours. On demandait tous les
jours l'autorisation d'une exposition PLUS FAIBLE que celle qu'on avait accordée
une fois. Le jeu allait jusqu'à écrire, le jour où le pseudo se crée, « on ne
vous le redemandera plus ».

⚠️ **SANS COMPTE, IL FAUT TOUJOURS LE GESTE** : un nom, par journée. Depuis le
24/08 ce nom s'écrit — la liste fermée n'est plus qu'une suggestion — mais le
geste, lui, reste ce qui fait qu'on n'y entre pas sans l'avoir voulu.

⚠️ **ET C'EST `demande` QUI DÉCIDE DE LA CARTE, PAS `tableau.inscrit`.**
Signalé avec une capture : « je vois "déposer ce nom" alors que je suis connecté
et que le pseudo est déjà enregistré ; il n'y a plus rien à faire à ce stade ».
Un connecté qui a un pseudo est inscrit d'office — `demande` est faux, la modale
ne s'ouvre pas — mais la CARTE testait `tableau.inscrit`, donc tant que
l'écriture de fond n'avait pas atterri elle retombait sur le formulaire et
offrait un bouton qui n'apprend rien. Les trois branches lisent la même vérité.

⚠️ **LE PSEUDO SE LIT DANS `TableauDuJour`, PLUS DANS `ChoisirSonNom` — SINON
C'EST UN VERROU.** `demande` a besoin de `nom.lu` pour décider s'il faut monter
le formulaire ; or c'est le formulaire qui lisait le pseudo. Tant que la carte
l'affichait dans tous les cas, l'amorçage passait par hasard ; le jour où elle a
cessé, `lu` n'est jamais devenu vrai et **la carte s'est effacée entièrement**.
Vu à l'écran (70 px, un titre et rien), invisible à tsc. `ChoisirSonNom` garde sa
lecture pour la tablée, et saute si l'appelant a déjà lu.

⚠️ **ET PAS DE CARTE VIDE** : pendant la lecture du pseudo il n'y a ni liste, ni
formulaire, ni phrase — le bloc ne sort donc pas du tout. `PAS D'ACCROCHE SANS
BOUTON`, la règle d'`InstallJeu`, appliquée à un cadre entier.

⚠️ **L'INSCRIPTION D'OFFICE EST UNE ÉCRITURE DÉCLENCHÉE PAR UN RENDU, DONC ELLE
A UN `ref`.** `depose` et `lis` arrivent en fonctions fléchées : leur référence
change à chaque rendu, et sans garde l'effet réécrirait à chaque battement.
Vérifié au navigateur en laissant tourner six secondes — **un seul appel**.

**ET LA SORTIE EXISTE ENFIN** (`scrutin_jeux_pseudo_retirer`). Le pseudo de
compte est le seul nom du produit qui survit à une journée, et on ne pouvait que
le POSER : `pseudo_poser` refuse moins de deux caractères, seule la Régie savait
le retirer en posant `bloque_le`. C'était la contrepartie manquante de la ligne
franchie le 25/08.

⚠️ **ON SUPPRIME LA LIGNE, ON NE POSE PAS `bloque_le`** : ce champ dit « un
modérateur a retiré ce nom », l'écran le raconte dans cette voix-là, et reposer
un pseudo lève le blocage. Confondre « je me retire » et « on m'a retiré » ferait
lire une sanction à quelqu'un qui vient de cliquer.

⚠️ **ET LES LIGNES DE TABLEAU DU JOUR PARTENT AVEC, CE N'EST PAS DU ZÈLE.** La
résolution du nom est `coalesce(p.pseudo, n.nom)` avec une **jointure sans
condition** — c'est écrit, et c'est ce qui empêche un compte bloqué de retomber
sur son ancien texte libre. Supprimer la ligne de pseudo rend cette jointure
vide : sans le ménage, une ligne héritée republierait le texte qu'on vient de
retirer. Mesuré avant d'écrire : `scrutin_banalo_noms` porte **0 ligne de texte
libre** et plus rien ne peut en créer (le dépôt insère `nom = null` depuis le
07/09) — la garde est théorique, mais la colonne existe et le prochain agent ne
doit pas avoir à refaire ce calcul.

⚠️ **ON NE TOUCHE PAS AUX TABLÉES** : un groupe est une appartenance, pas une
publication. Le membre y reste **sans libellé** — et l'écran a maintenant un mot
pour ça (`sansNom`), faute de quoi il imprimait une ligne vide, exactement comme
il le faisait déjà pour un pseudo bloqué.

⚠️ **EN DEUX APPUIS, ET LE BOUTON QUI SUPPRIME N'A PAS LE ROUGE DE CELUI QUI
ENREGISTRE.** Vu à l'écran : en `primary`, « Retirer mon pseudo » prenait le MÊME
rouge que « Valider » à quarante pixels de lui et devenait l'élément le plus fort
d'une carte dont le métier est de POSER un nom. Le geste destructeur se confirme
en `ghost`, « Annuler » est un lien. ⚠️ Et la phrase dit **ce qui part et ce qui
reste** : « Retirer mon pseudo » tout seul se lit comme une suppression de
compte, alors que les résultats, la série et l'historique ne bougent pas.

⚠️ **LA POLITIQUE DE CONFIDENTIALITÉ EST REPRISE DANS LE MÊME COMMIT**, en trois
langues : elle promettait que le pseudo est gardé « tant que vous ne le changez
pas et que vous ne supprimez pas le compte », ce qui est devenu faux.

**CINQ SUR CINQ A SON TABLEAU DU JOUR** (`20260908-jeu-pays-tableau-du-jour.sql`,
`components/games/TableauDuJour.tsx`) — demandé tel quel : « il faut que Cinq sur
cinq demande le nom, même fonctionnement sur tous les jeux quotidiens ». Il ne
demandait de nom NULLE PART, donc son joueur n'avait aucune raison d'en poser un
et ne figurait nulle part avant les classements de saison.

⚠️ **LE COMPOSANT EST SORTI DE `banalo/` VERS `games/`, PAS RECOPIÉ.**
`TableauDuJour` et `ChoisirSonNom` reçoivent maintenant la matière, le jeton, la
lecture, le dépôt et le FORMAT DU CHIFFRE en paramètre. Les recopier aurait
produit deux tableaux qui dérivent — c'est ce qui venait d'arriver aux trois
offres de compte, et avant elles à la règle du mot orphelin.

⚠️ **SA TABLE EST NÉE SANS COLONNE DE TEXTE LIBRE** — vrai jusqu'au 24/08, où
`20260913` la lui a ajoutée avec son index d'unicité. C'était la leçon du 07
appliquée d'emblée : chez Banalo il a fallu retirer `nom` après coup. Ici il n'y
a que deux façons de se nommer — un INDEX dans la liste fermée, ou RIEN, ce qui
veut dire « mon pseudo de compte », résolu à la lecture. La règle est la même
fonction pour les deux jeux (`scrutin_jeux_pseudo_resoudre`).

⚠️ **PAS DE COLONNE `langue`, CONTRAIREMENT À BANALO, et ce n'est pas un oubli.**
Banalo classe par langue parce que sa foule EST par langue — on y marque en
répondant comme les autres, et les autres ne répondent pas la même chose en
espagnol. Cinq sur cinq cherche un PAYS : la réponse est la même partout, son
classement du jour est déjà global, et le découper par langue le réduirait sans
rien dire de vrai. La politique de confidentialité a dû être reprise pour ça :
elle promettait « de la même journée ET DE LA MÊME LANGUE », désormais faux d'un
tableau sur deux.

⚠️ **LE MEILLEUR EST LE PLUS PETIT, ET LE COPIER-COLLER LE RETOURNE EN SILENCE.**
Un nombre d'essais se classe croissant, une somme de voix décroissant. C'est la
base qui trie ; l'écran ne fait que mettre le nombre en mots — et c'est pour ça
que le format du chiffre est un paramètre du composant, pas une condition dedans.

⚠️ **LA JOINTURE VERS LE RÉSULTAT PASSE PAR LE JETON *OU* PAR LE COMPTE**, et
c'est le piège du fichier. `scrutin_game_pays_rattacher` EFFACE le jeton de la
ligne de résultat quand un compte l'adopte : un joueur connecté a donc un
résultat sans jeton et un nom avec. Joindre sur le seul jeton ferait disparaître
du tableau exactement les joueurs qui ont un compte — ceux qui s'y inscrivent
sous leur pseudo. Vérifié par assertion, pas déduit.

⚠️ **LA PURGE SE GREFFE SUR `scrutin_game_pays_purge` PLUTÔT QUE D'EN CRÉER UNE.**
Le 30 vit déjà dans cette fonction, son cron et la politique ; une fonction de
plus avec son propre défaut et son propre cron en ferait deux copies de plus. Et
les noms se purgent MÊME derrière un compte, contrairement aux résultats : un
résultat de compte est un palmarès qu'on garde, un nom au tableau est une
publication datée dont la promesse est qu'elle ne vaut que pour sa journée.

**LA PAGE COMMUNE DES JEUX QUOTIDIENS est en prod** (`/games/quotidien`,
`components/games/quotidien/`) — une carte par jeu, le chiffre du moment, la
courbe dans le temps, les records, les cinq dernières journées.

⚠️ **ELLE EST MUTUALISÉE PARCE QUE LA QUESTION L'EST.** « Où j'en suis » n'est
une question ni de Banalo ni de Cinq sur cinq, c'est une question du JOUEUR.
Avant elle : Banalo cachait son historique derrière une ligne de texte dans sa
carte de compte, Cinq sur cinq n'avait rien du tout, et passé la charnière le
classement du jour devenait inatteignable. `/games/banalo-jour/historique` est
donc devenue une REDIRECTION — deux pages qui répondent pareil, c'est toujours la
copie qui finit par mentir.

⚠️ **ET ELLE A DEUX ONGLETS : « mes résultats » et « classements ».** Le second
porte trois portées — Banalo, Cinq sur cinq, **tous jeux confondus** — sur une
fenêtre glissante de **trente journées**.

⚠️ **LE PSEUDO DE COMPTE EST LE SEUL NOM DU PRODUIT QUI SURVIT À UNE JOURNÉE**
(`scrutin_jeux_pseudos`, `20260825-jeux-pseudo-et-cumul.sql`). Partout ailleurs —
tableau du jour, groupe d'amis — le nom vit dans son contexte et meurt avec lui,
et c'est ce qui évitait les cinq coûts du §5. Un classement CUMULÉ exige
l'inverse. On franchit donc la ligne, avec la contrepartie qu'elle réclamait :
**un compte derrière chaque nom, et une prise dans la Régie** pour le retirer.
⚠️ On bloque un NOM, pas un joueur : le compte continue de jouer et de voir sa
progression, et **reposer un pseudo lève le blocage**.

⚠️ **TOUT LE MONDE PEUT FIGURER AU CLASSEMENT DU JOUR, IL FAUT UN COMPTE POUR
CEUX SUR LA DURÉE** — mais **pas pour les REGARDER**. Un classement qu'on ne peut
pas voir avant de s'inscrire ne donne aucune raison de s'inscrire.

⚠️ **ICI LE RANG S'AFFICHE, ALORS QUE LE TABLEAU DU JOUR LE REFUSE**, et ce n'est
pas un revirement. Au jour, un vrai rang existe parmi TOUS les joueurs (la carte
de score l'affiche), donc un rang parmi les seuls inscrits serait un mensonge.
Sur la durée, aucun rang « vrai » n'existe : la plupart des joueurs sont des
jetons anonymes sans identité d'un jour à l'autre. Le rang parmi les comptes
classés est **le seul qui existe**, et l'effectif est rendu avec.

⚠️ **ON Y ENTRE DÈS LA PREMIÈRE JOURNÉE, ET LE PLANCHER DE CINQ ÉTAIT UNE FAUTE**
(`20260826-jeux-cumul-des-la-premiere-journee.sql`). Le motif écrit était « sinon
une seule journée chanceuse prend la tête » — vrai, et il le restera. Ce qui ne
l'était pas, c'est le chiffre : au moment où il a été posé, **Banalo du jour en
était à sa journée 3 et Cinq sur cinq à sa journée 5**. Personne au monde ne
pouvait avoir cinq journées CLASSABLES (une journée jouée seul n'a pas de
position). Le classement affichait donc « 0 joueur classé » à tout le monde, tous
les jours, sans exception possible : une porte dont la clé n'existait pas, sur
une fonctionnalité dont le métier est de faire revenir. **Un classement est une
récompense ; une récompense inatteignable n'encourage rien.**

⚠️ **CE QUE LE PLANCHER ACHETAIT SE PAIE MAINTENANT EN MONTRANT.** L'effectif de
journées est affiché à côté de chaque moyenne — « sur 1 » se lit —, la règle sous
la carte le redit, et **à égalité de moyenne celui qui a joué le plus passe
devant**. C'est exactement le chemin qu'a suivi `assez` chez Banalo du jour :
cesser de commander ce qui est CALCULÉ pour ne commander que ce qui est DIT.
⚠️ Le prix est réel et assumé — un joueur d'une seule journée à 12 % passe devant
un habitué de trente journées à 22 %. La parade mesurée, si ça mord sur des
données réelles, est un lissage vers 50 (`(somme + K·50)/(n + K)`), **écarté pour
l'instant** : le nombre montré cesserait d'être « X % ont fait mieux », donc un
second vocabulaire sur une page qui n'en connaît qu'un — la raison même pour
laquelle la courbe retourne son AXE et pas son CHIFFRE ; et sur des journées 3
et 5 il tasserait tout le monde entre 35 et 45.

⚠️ **IL RESTE UN PLANCHER, ET IL PORTE SUR LES JOUEURS, PAS SUR LES JOURNÉES**
(`minimumClasses`, 2). Un classement d'UNE ligne est le « 1er sur 1 » que ce
produit refuse partout (`VOTANTS_MIN` 2, `INSCRITS_MIN` 2, `COURBE_MIN` 50).
`lignes` et `moi` **tombent ensemble** : ma ligne isolée sous un titre « sur
trente journées » est le même tableau cassé qu'une liste d'un élément.

⚠️ **ET TROIS ÉTATS MUETS ONT CHACUN LEUR PHRASE**, parce qu'une absence sans un
mot se lit comme une panne : personne de classé ; **un seul classé et c'est moi**
(« vous y êtes ») ; aucune de mes journées ne compte. ⚠️ Le deuxième se DÉDUIT
côté écran — pseudo non bloqué + au moins une journée qui compte + `joueurs` à 1
⇒ c'est moi — parce que le faire dire à la base l'obligerait à rendre le « 1er
sur 1 » qu'elle refuse. Et ce qui parle de MOI est en encre et en gras, ce qui
parle des autres reste gris : « vous y êtes » servi dans la même grisaille qu'un
constat sur la foule cesse d'être une bonne nouvelle.

⚠️ **LA FENÊTRE DE 30 N'EST PAS LE 30 DE LA CONSERVATION.** Celui-là dit combien
de temps on GARDE une réponse (`scrutin_banalo_purge`, son cron, la politique de
confidentialité) ; celle-ci dit sur combien de journées on CLASSE, et elle porte
sur `scrutin_banalo_results`, qui n'est purgée par rien. Les deux peuvent
diverger sans que rien ne casse — ce n'est pas une quatrième copie.

⚠️ **LA PROGRESSION HEBDO NE SE STOCKE PAS, ELLE SE RECALCULE** : la même requête
avec la fenêtre reculée de sept jours (`p_recul`). Elle se tait si le joueur
n'était pas classé la semaine dernière — « +12 places » depuis une place qui
n'existait pas serait une invention.

⚠️ **UN CLASSEMENT VIDE DOIT RÉPONDRE « ET MOI ? », PAS « ET TOUT LE MONDE ? »**
(`mesJournees` / `minimum`, `20260825-jeux-cumul-mes-journees.sql`). Signalé par
un vrai joueur sur un vrai iPhone : il pose son pseudo, valide, et lit
« Personne n'est encore classé : il faut avoir joué au moins 5 journées ». Rien
n'est faux — il en avait **quatre** — mais la phrase parle de TOUT LE MONDE là
où la question porte sur LUI, et sans un chiffre à lui il ne peut pas
distinguer « ça n'a pas marché » de « il me manque une journée ». La base rend
donc son compte de journées classables **sans le plancher**. ⚠️ Depuis la chute
du plancher de journées (plus bas), elle ne dit plus « il vous en manque N » —
une seule journée suffit, donc le seul cas où l'on n'y est pas est celui où
AUCUNE journée ne compte, c'est-à-dire des journées jouées seul : c'est un fait
sur la FOULE, pas sur l'assiduité. ⚠️ Elle sort AUSSI quand
la liste n'est pas vide — ne pas se trouver dans un classement peuplé pose la
même question — et la phrase impersonnelle **s'efface** quand elle parle :
empilées, les deux répètent le même plancher en trois paragraphes gris.

⚠️ **ET LE DÉPÔT DU PSEUDO NE CONFIRMAIT RIEN.** Le même signalement disait
« quand je clique pour valider le pseudo, rien ne semble se passer » : il
s'enregistrait bien, mais la SEULE trace à l'écran était une étiquette de 11 px
qui passait de « CHOISIR UN PSEUDO » à « VOTRE PSEUDO », au-dessus d'un champ
qui contenait déjà le texte tapé. Rien ne bougeait là où l'œil était — sur le
bouton qu'on vient de presser. La ligne de confirmation est en `role="status"`
(une réussite ne coupe pas la lecture d'un lecteur d'écran) et en `skin.good` :
⚠️ le rouge du produit ne tient que **4,21:1** sur le papier blanc, sous les 4,5
exigés à 13 px, quand le vert en tient 5,03.

⚠️ **DEUX DÉFAUTS DE DESSIN NE SE VOIENT QU'À L'ÉCRAN, ET LES DEUX VENAIENT DE
LA MÊME CAPTURE.** Les bornes de l'axe de `CourbeCentiles` étaient écrites en
`x={0}` alors que le tracé commençait à `MARGE` : « 0 % » se retrouvait SOUS le
premier point — un texte SVG n'a pas de boîte qui pousse ses voisins, il se
superpose en silence (d'où `GOUTTIERE`). Et l'espace qui sépare le grand nombre
de `CarteJeu` de sa phrase est dessiné à 15 px alors qu'il suit un chiffre de
30 px : « 36 % » et « ont » se touchaient. Le blanc d'un chiffre deux fois plus
gros se paie sur le chiffre, pas sur le texte.

**LA SAISON REMPLACE LE CUMUL GLISSANT** (`scrutin_jeux_saison`,
`scrutin_jeux_palmares`, `20260828-jeux-saison-et-trophees.sql`) — un mois de
POINTS, remis à zéro le 1er, avec des médailles au bout et une **salle des
trophées** (`SalleDesTrophees.tsx`, troisième onglet).

⚠️ **ELLE REMPLACE, ELLE NE S'AJOUTE PAS.** Les deux classaient les MÊMES
comptes en disant des choses différentes : un joueur qui voyait les deux ne
savait plus lequel était le vrai — le défaut des deux vocabulaires, déjà écarté
pour la courbe (on retourne l'AXE, pas le CHIFFRE). Et une moyenne **punit la
journée en plus**, alors qu'un jeu quotidien veut qu'on revienne : des points
n'enlèvent jamais rien. `scrutin_jeux_cumul` reste en base, plus aucun écran ne
l'appelle.

⚠️ **LE BARÈME PORTE SUR LA PLACE, ET LE CENTILE A ÉTÉ ESSAYÉ PUIS ÉCARTÉ —
MESURÉ.** Une table indexée sur le centile donne à la même place des valeurs
très différentes selon la foule : la 2ᵉ place vaut **8 points à 3 joueurs et 25 à
3 000**, parce que `round(100 × 1/3000)` vaut 0 — à trois mille joueurs les
**seize premiers** touchent tous le maximum et la forme F1 disparaît là où elle
sert le plus. Un centile normalise le CHAMP, pas la PLACE. C'est ce qui a exigé
de **garder le rang** (`rang`, `sur`, `exaequo` sur `scrutin_banalo_results`,
`20260828-banalo-garder-le-rang.sql`) : il existait déjà dans les fonctions
d'état, il n'était simplement pas écrit.

**Le barème** : `25 · 18 · 15 · 12 · 10 · 8 · 7 · 6 · 5 · 4 · 4 · 3 · 3 · 3 · 2 ·
2 · 2 · 2 · 2 · 2` sur vingt places, **plus un point de présence** pour toute
journée jouée, y compris seul. ⚠️ **CE POINT DE PRÉSENCE EST LE RÉGLAGE QUI
DÉCIDE DE TOUT** : trente journées de présence pure font **30 points contre 26
pour une victoire unique**, donc la régularité bat le coup de chance sans aucun
plancher — c'est la réponse au défaut qu'on assumait la veille. Et un habitué
toujours 3ᵉ marque 480 quand un vainqueur sporadique en marque 260 : le talent
paie encore.

⚠️ **LE CLASSEMENT BANALO SE FAIT PAR LANGUE, ET IL N'EN EXISTE PLUS DE « TOUTES
LANGUES »** (`20260830-jeux-saison-par-langue.sql`). `scrutin_banalo_etat(jeton,
jour, LANGUE)` classe parmi ceux qui ont répondu **dans la même langue** :
mesuré sur la journée 1, **7 votants en français contre 1 en pidgin**. Le barème
donne 26 points au premier quelle que soit la foule — c'est voulu, une place doit
valoir la même chose partout — mais les additionner dans un seul classement
Banalo faisait valoir « premier de deux pidginophones » autant que « premier de
trois mille francophones ». On ne tord pas le barème : on compare les gens à la
foule où ils ont joué. **Toutes les langues restent consultables quelle que soit
celle de l'interface** ; « Tous les jeux » reste un grand total assumé, qui
additionne jeux ET langues parce que son objet est de récompenser qui joue à
tout.

⚠️ **ET ON POUVAIT MAGASINER SA LANGUE APRÈS AVOIR VU SON RÉSULTAT.** La clé de
`scrutin_banalo_results` est `(user_id, jour)`, donc une journée jouée dans deux
langues ne garde qu'une ligne — et le `do update` laissait gagner la DERNIÈRE
traitée. Vu sur un vrai jeton : journée 1 jouée en français à 13 h 05 puis en
pidgin à 19 h 57, la ligne gardée portait `pcm`. On répondait en français, on
lisait « 6ᵉ sur 7 », on rejouait en pidgin, et on écrasait son résultat par un
premier rang. **Désormais la PREMIÈRE langue jouée gagne** : le `do update` ne
s'applique qu'à la même langue, et les journées sont traitées dans l'ordre où
elles ont été jouées. Une journée de Banalo reste UN résultat — jouer la même
question dans quatre langues ne doit pas rapporter quatre fois.

⚠️ **LE PALMARÈS PORTE DONC LA LANGUE** (`(saison, jeu, langue, user_id)`, chaîne
vide pour `tout` et `pays`), et la clôture gèle une saison par langue jouée. Elle
ne gèle PAS de « Banalo toutes langues » : un trophée pour un classement que
l'écran ne montre pas est un trophée sans sens.

⚠️ **ET LES LANGUES SE NOMMENT COMME DANS LA BASCULE DE PLACET** — code ISO en
majuscules, « Pidgin » en toutes lettres (`lib/games/langue.ts`). `Intl.DisplayNames`
a été essayé et écarté : il ne connaît pas `pcm` et rendait, dans un menu
français, « français, anglais, **pcm** ». Vu à l'écran.

⚠️ **LES EX AEQUO SE PARTAGENT LES PLACES QU'ILS OCCUPENT**, et ce n'est pas un
détail : essais et sommes de voix sont de petits entiers, donc l'égalité est LE
CAS NORMAL. Trois joueurs en tête touchent chacun (25+18+15)/3. Le budget d'une
journée ne dépend donc pas des égalités. ⚠️ Le partage **olympique** est mesuré et
écarté — à trois mille joueurs il distribue **490 points au lieu de 191** (×2,6),
le plus gros paquet du top 20 comptant 46 joueurs. Le départage **au temps** est
écarté aussi, pour la raison déjà écrite chez Banalo, en pire ici : on joue une
fois pour trouver le pays, on rejoue en 1 essai et 8 secondes. Le partage, lui,
dilue la manœuvre. ⚠️ Conséquence : **les points ont une décimale**, exactement
comme le score de Banalo — la base est de la présentation, la décimale porte la
résolution.

⚠️ **CE QUE LA SIMULATION A SORTI ET QUI NE VIENT PAS DU BARÈME** : à grande
échelle le sommet de Cinq sur cinq devient de la CHANCE. Trouver en 1 essai,
c'est nommer le bon pays à l'aveugle (1 sur ~195) ; à 3 000 joueurs une dizaine y
arrivent par accident et mangent les dix premières places, laissant 1,5 point à
qui a trouvé en 2 essais par déduction. Le partage amortit (12 points chacun au
lieu de 26) mais ne corrige pas la cause. À deux joueurs par jour c'est
théorique ; **à rouvrir sur données réelles.**

⚠️ **UNE SAISON EST UN MOIS CIVIL LU SUR `cree_le`, HEURE DE PARIS** — et ce
n'est **pas** une troisième copie de l'origine du calendrier : on ne traduit
aucun numéro de journée en date, on lit l'horodatage que les tables portent
déjà. C'est pour ça que `scrutin_banalo_rattacher` porte maintenant l'heure
RÉELLE de la réponse : sans elle, un joueur d'août inscrit le 2 septembre verrait
trente journées tomber dans la saison de septembre.

⚠️ **UN TROPHÉE NE SE RECALCULE PAS, SINON CE N'EST PAS UN TROPHÉE.** Le
palmarès est écrit UNE FOIS par `scrutin_jeux_saison_cloturer` (cron horaire, le
SQL tranche — `pg_cron` planifie en UTC et Paris change deux fois par an). ⚠️ **LES MÉDAILLES N'ONT PLUS DE PLANCHER PROPRE**
(`20260829-jeux-medailles-sans-plancher.sql`), et celui de 5 classés que j'avais
posé était la même faute que le plancher de cinq journées, commise le lendemain
de sa correction : mesuré, **3 comptes existent en tout** sur ce produit, donc la
récompense était inatteignable. Ce qu'il achetait — éviter « tout le monde a une
médaille » — s'obtient exactement sans nombre arbitraire : **on décerne toujours
une médaille de MOINS qu'il n'y a de classés**, plafonné à trois. C'est
IDENTIQUE dès cinq classés et meilleur en dessous (2 classés → 1 médaille,
3 → 2, 4 → 3). Il ne reste donc que le DEUX universel du produit : être premier
de deux n'est pas une tautologie, être premier de un en est une. ⚠️ Le podium
d'une saison gelée se coupe à SON propre effectif, pas au seuil du moment : une
saison à deux classés garde une seule médaille pour toujours. ⚠️ Et l'écran
annonce le NOMBRE du moment, pas une règle — il monte quand la foule grandit,
ce qui donne une raison d'inviter quelqu'un. ⚠️ Le **pseudo n'est pas gelé**
avec la médaille — le geler retirerait à la Régie sa prise, et un nom retiré
resterait affiché indéfiniment. Conséquence assumée : un podium peut montrer 1ᵉ
et 3ᵉ sans 2ᵉ ; renuméroter serait un mensonge.

⚠️ **ET LA PASTILLE DE LA BARRE SUIT LA SAISON**, plus le cumul : c'est le
classement dont la place BOUGE tous les jours. Elle a perdu sa progression
hebdomadaire au passage — une saison part de zéro le 1er, donc « ma place il y a
une semaine » n'existe pas les sept premiers jours et voudrait dire autre chose
ensuite.

⚠️ **LA PORTE `/games` Y MÈNE, ET C'EST LE SEUL CHEMIN QUI VAUT POUR TOUT LE
MONDE** — un lien « Résultats et classements » sous le pitch de la famille
« Un par jour ». Les écrans d'après-partie n'y menaient que pour un joueur
CONNECTÉ ayant deux journées ; un habitué sans compte n'avait aucun chemin, alors
que les classements se lisent sans compte. ⚠️ Il est posé sur la PORTE et pas sur
un écran de jeu : `GameShell` interdit la nav de Placet pendant une partie, la
porte est justement le lieu où l'on ne joue pas encore. ⚠️ Et contrairement à
`Reprendre` juste au-dessus, **il n'est pas silencieux** : celui-là montre ce
qu'on a EN COURS, celui-ci mène à des classements PUBLICS, qui disent à un
nouveau venu qu'il y a du monde derrière. Son libellé ne dit donc pas « mes » —
à qui n'a jamais joué, « mes résultats » promet une page vide.

⚠️ **LA PLACE DU JOUEUR EST DANS LA BARRE DE PLACET** (`RangJeux.tsx`), et c'est
l'image miroir d'une règle déjà écrite : `GameShell` interdit la nav de Placet
sur un écran de jeu (« on vient jouer »). Ce qui rend l'inverse admissible est
qu'elle ne DEMANDE rien — une place et une flèche, pas un appel à l'action.
⚠️ **Silencieuse par défaut** : rien sans compte, rien sans pseudo, rien tant
qu'on n'est pas classé. Une barre vue sur toutes les pages ne peut pas afficher
un vide à ceux qui ne jouent pas. ⚠️ **Une lecture par SESSION, pas par page** —
un cache de module, comme `useIsAdmin` ; sinon deux agrégats tourneraient à
chaque chargement de chaque page du produit. Et le pseudo se lit EN PREMIER : pas
de pseudo, pas de classement à calculer (mesuré : 1 appel au lieu de 2).
⚠️ **Sur mobile elle est dans le tiroir ☰**, comme le choix de langue et le
bouton de compte : seul « Créer » est épinglé hors du tiroir, et l'épingler à
côté mettrait un jeu en concurrence avec le seul geste que le produit demande.

⚠️ **ELLE NE MONTRE QUE DES CENTILES, ET C'EST LA SEULE CHOSE POSSIBLE.** Un
nombre d'essais et une somme de voix ne s'additionnent pas ; le sur-100 de Banalo
ne veut même pas dire la même chose d'un thème à l'autre. « X % ont fait mieux »
veut dire la même chose partout. ⚠️ Cinq sur cinq ne STOCKE pas son centile — il
se calcule à la lecture dans `scrutin_game_pays_historique`, sur la même
définition que `mieux` chez Banalo.

⚠️ **CE QU'ELLE A PERDU EN CHEMIN** : la page de Banalo nommait le SUJET de
chaque journée. La commune ne le peut pas — `games/pays/page.tsx` interdit toute
métadonnée dérivée du puzzle, et une colonne qui ne se remplit que pour un jeu
sur deux se lit comme une donnée manquante.

⚠️ **L'AXE DE LA COURBE EST INVERSÉ, ET C'EST ÉCRIT SUR LE DESSIN** (0 % en haut,
100 % en bas, tous deux imprimés). Le jeu ne connaît qu'une phrase — « X % ont
fait mieux », plus bas = mieux. Retourner le CHIFFRE (« mieux que 86 % ») ferait
un second vocabulaire sur une seule page, et on ne saurait plus lequel on lit. On
retourne donc l'AXE, et on l'imprime : l'inversion se voit, elle ne se devine pas.

⚠️ **ET LES TROUS SONT ENJAMBÉS EN POINTILLÉ, jamais reliés en plein ni laissés
béants.** Vu à l'écran sur vingt journées dont deux manquantes : coupée net, la
courbe faisait trois traits flottants qu'on lit comme un défaut d'affichage ;
reliée en plein, elle affirmerait une progression qui n'a pas eu lieu. Le
pointillé dit « on ne sait pas ».

**LE GROUPE D'AMIS est en prod** (`MaTablee.tsx`, `RejoindrePage.tsx`,
`20260824-banalo-tablee.sql`) — la couche sociale, **sans graphe d'amis**. On
n'est pas ami AVEC quelqu'un, on est DANS un groupe : on rejoint par lien, on
voit qui a joué aujourd'hui, et il n'y a ni demande, ni acceptation, ni blocage,
ni annuaire.

⚠️ **LE MOT VISIBLE EST « GROUPE », LES IDENTIFIANTS DISENT « tablée ».** Le
produit s'est appelé tablée pendant une journée. Les tables, les fonctions
`scrutin_banalo_tablee_*`, les composants et les clés i18n gardent ce nom — même
règle que `scrutin_game_unanimo_*` après le passage à Banalo : ce sont des
identifiants, et les migrations appliquées ne se réécrivent pas. **L'URL, elle, a
bougé** (`/games/banalo-jour/groupe/[code]`) parce qu'elle est visible et qu'il y
avait zéro groupe en base au moment du changement — donc aucun lien partagé à
casser. Le jour où il y en aura, ce ne sera plus gratuit.

⚠️ **C'EST CE QUI ÉVITE LES CINQ COÛTS DU §5** : le nom vit dans la TABLÉE et
meurt avec elle, exactement comme le nom du tableau vit dans la JOURNÉE. Les
trois propriétés qui rendent l'absence de modération tenable — on entre par code,
l'objet est jetable, tout s'efface — sont conservées les trois.

⚠️ **UNE TABLÉE N'A PAS DE NOM**, et c'est délibéré : ce serait du texte libre lu
par tous ses membres, donc une surface de modération de plus, et il faudrait
décider s'il exige un compte — une friction sur la moitié « invitation », la
seule dont le produit manque à onze joueurs. On la reconnaît aux gens qui y sont.

⚠️ **RIEN NE SORT TANT QU'ON N'A PAS JOUÉ, ET LA GARDE EST EN BASE.** `joue`
faux ⇒ aucun score ne part. Le score d'un ami ne divulgue rien (il est relatif à
la foule) mais il ANCRE, et le §5 l'avait écrit.

⚠️ **TROIS ÉTATS PAR MEMBRE, ET IL EN FAUT TROIS** : un score ; « a joué » sans
chiffre pour qui a joué dans une AUTRE langue — sa foule n'est pas la mienne,
donc son résultat ne se compare pas ; et « pas encore ». Replier le deuxième sur
le troisième dirait « n'a pas joué » de quelqu'un qui a joué.

⚠️ **UNE SEULE DEMANDE DE NOM PAR ÉCRAN.** Le tableau du jour et la tablée
posaient le MÊME formulaire l'un sous l'autre, avec les **mêmes quatre noms**
(même jeton, même graine, même tour) : le joueur voyait deux fois « Renard des
sables » dans deux cartes voulant dire deux choses. Le tableau passe d'abord — il
concerne aujourd'hui et disparaît avec la journée — et l'écran arbitre
(`onDemande` → `bloque`). ⚠️ Et la règle du nom elle-même vit maintenant dans
**`ChoisirSonNom`**, un seul endroit : recopiée, elle aurait dérivé comme le
calcul des scores, qui avait fini en TROIS exemplaires avant d'être sorti en base
(`scrutin_banalo_scores`).

⚠️ **L'OFFRE DE CRÉER UNE TABLÉE EST DISCRÈTE, LA TABLÉE EXISTANTE NE L'EST
PAS.** Une tablée qu'on a est du RÉSULTAT et ne demande rien ; l'offre d'en créer
une est une demande, donc elle attend deux journées jouées (« la première demande
se mérite ») et elle porte le `ghost` d'`InviterBanalo`, pas l'accent — vu à
l'écran, en carte à l'accent elle s'empilait avec l'offre de compte, qui l'a reçu
après un retour de vrais joueurs et ne le rend pas.

⚠️ **LA PURGE SUIT LES DONNÉES, ELLE NE COMPTE PAS LES JOURS** : une tablée
s'efface quand plus aucun de ses membres n'a de réponse en base. Comme les
réponses se purgent à trente jours, cela veut dire « personne n'y a joué depuis
trente jours » — sans écrire une cinquième copie du 30.

⚠️ **ET LE CODE D'UNE TABLÉE EST UNE CAPACITÉ** : la page qui le reçoit est en
`noindex`, et elle ne montre RIEN de la tablée avant d'y être entré — ni les
membres, ni leur nombre. Un lien qui circule ne doit pas exposer un groupe à qui
le trouve.

⚠️ **DEUX CHOSES SONT PARTIES DANS DES TIROIRS, ET C'EST DE LA PLACE MESURÉE.**
Le détail de la dernière journée (353 px pour un résultat qu'on ne relit pas tous
les jours) et le formulaire de création d'un groupe (~200 px pour une demande
qu'on accepte une fois dans sa vie) s'ouvrent maintenant à la demande. L'écran
d'après-partie passe de **2 551 à 2 195 px** sans groupe, 2 429 avec.

⚠️ **UNE MODALE QUE LE JOUEUR OUVRE N'EST PAS UNE MODALE QUI SURGIT.** La règle
« une fois par aide et par partie » appartient à Cinq sur cinq, dont les aides
apparaissaient EN SILENCE ; elle ne s'applique pas à un tiroir. `Modale` (sortie
de `games/pays/` vers `games/`) porte le comportement, chaque appelant porte sa
politique.

⚠️ **ET « FERMER » S'EFFACE QUAND LE TIROIR PORTE UNE ACTION** (`fermerDiscret`).
Le composant venait d'un écran où fermer était le SEUL geste : son bouton était
plein, grand, pleine largeur. Dans le tiroir de création, il devenait le bouton
le plus fort de la boîte et l'œil allait vers la sortie plutôt que vers ce qu'on
était venu faire. Vu à l'écran.

⚠️ **LE RÉSUMÉ DE LA VEILLE GARDE « cette journée est close », LE TIROIR NON.**
C'est cette phrase qui tient lieu de notification : elle doit se lire sans rien
ouvrir. Le tiroir, lui, porte le NUMÉRO de la journée — il couvre la page, donc
il ne peut pas compter sur ce qu'il cache.

⚠️ **L'ORDRE DE L'APRÈS-PARTIE EST MESURÉ, PAS CHOISI.** Posées au-dessus du
partage, les deux listes le repoussaient à **1 465 px** — 1,7 écran de
défilement avant d'atteindre le seul geste qui amène du monde, sur un jeu qui en
compte onze. Elles sont descendues sous lui : le partage est revenu à **726 px**,
dans le premier écran. ⚠️ Et **la tablée passe devant le tableau** : les deux
répondent à « où je me situe », mais l'un parle de trente-quatre inconnus et
l'autre des gens qu'on a invités, et l'attention décroît avec le défilement.

⚠️ **L'OFFRE DE COMPTE RESTE SOUS LES DEUX LISTES, ET C'EST DÉLIBÉRÉ** (2,2
écrans). Elle est STATIQUE — le même texte tous les jours — là où la tablée et le
tableau CHANGENT chaque jour. C'est le même raisonnement que `rappelleLaMethode`
chez Cinq sur cinq : servie tous les jours à un habitué, une annonce qui ne change
pas devient une boîte qu'on ferme sans lire. Le contenu qui bouge monte, l'annonce
qui se répète descend.

⚠️ **LE TABLEAU ET LA TABLÉE SE RESSEMBLAIENT TROP** — deux listes de noms
d'animaux avec des voix à droite, à vingt pixels l'une de l'autre, tirées du
**même vocabulaire de 600** : le même nom pouvait figurer dans les deux, et un
joueur ne les distinguait pas au coup d'œil. La tablée mène donc par un TITRE et
une PHRASE D'ÉTAT (« 3 joueurs sur 4 ont joué aujourd'hui »), le tableau par sa
liste et finit par son effectif : deux objets, deux lectures. Ça ne se voit qu'à
l'écran.

⚠️ **ET UNE TABLÉE D'UN SEUL MEMBRE N'AFFICHE PAS DE LISTE.** C'est le « 1er sur
1 » que le jeu refuse partout ailleurs (`VOTANTS_MIN` 2, `INSCRITS_MIN` 2,
`COURBE_MIN` 50) : une ligne unique avec son propre score se lit comme un tableau
cassé. La carte dit « vous êtes seul à cette tablée » et montre le bouton
d'invitation, rien d'autre.

⚠️ **UN APPEL QUI A UN EFFET NE SE MET PAS DANS UN `or` SQL.** Le bloc de
vérification écrivait `if purge(30) < 1 or exists(...)` : SQL ne promet pas
d'évaluer la gauche d'abord, l'`exists` court-circuitait l'appel, et le test
échouait sur une fonction parfaitement correcte. On appelle dans une variable,
puis on teste.

**L'ÉTUDE DES AMIS ET DES NOTIFICATIONS** (`docs/amis-et-notifications.md`,
2026-08-22) a tranché pour la TABLÉE, **sans push pour commencer**. Trois
conclusions à ne pas redécouvrir :

⚠️ **Le coût que le §5 a refusé de payer vient de l'IDENTITÉ PERMANENTE et de
l'ANNUAIRE, pas du lien social lui-même.** Or le tableau du jour vient de résoudre
les deux : le nom vit dans la JOURNÉE, pas sur la personne. Une « tablée » qu'on
rejoint par lien, avec un nom qui vit dans la tablée et meurt avec sa purge,
n'ajoute donc aucun des cinq coûts — là où un vrai graphe d'amis les ajoute tous.
NYT Games, le comparable le plus proche, s'ajoute d'ailleurs par **lien
d'invitation à code**, pas par pseudo cherchable.

⚠️ **Les espaces de Placet ne conviennent pas, et ce n'est pas une question de
forme** : un espace sert à CONVOQUER (donc il porte un email et un animateur), une
tablée sert à REGARDER. Réutiliser les espaces ferait entrer un email là où le jeu
n'en demande aucun, sur une surface qui déclare une tranche d'âge « enfant ».

⚠️ **Le push EXISTE DÉJÀ en production** — `web-push`, VAPID,
`/api/notify/subscribe`, `scrutin_push_subscriptions` (qui porte déjà `user_id`),
`/sw.js` — avec deux abonnements réels depuis juillet 2026, côté scrutins. Ce qui
manque est le déclencheur et la décision, pas la plomberie. ⚠️ Mais **sur iOS le
push web n'existe que pour une PWA installée à l'écran d'accueil** : notifier un
iPhone suppose donc d'avoir fait installer le jeu, ce qui change le rang de
`InstallJeu` dans l'échelle du §0. Une application des magasins n'est PAS
nécessaire, et elle serait un mur devant un lien — or tout circule ici par lien.

⚠️ **Et il n'y a pas encore de foule** : 11 jetons sur les mots, 7 sur le chiffré,
3 comptes en tout. À cette échelle, la moitié « invitation » d'une tablée
fabrique la foule et la moitié « classement » l'attend — c'est la première qu'il
faut construire, pas la seconde.

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


**LA PORTE DES JEUX MONTRE LA PLACE DU JOUEUR, ET LA RÉGIE EST EN ONGLETS**
(2026-08-23).

`/games` ne parlait que des JEUX, jamais de qui la traverse. Le chemin vers les
classements était une ligne de 13,5 px sous un pitch — et c'est pourtant le SEUL
qui vaut pour tout le monde, les écrans d'après-partie n'y menant que pour un
connecté ayant deux journées. Il porte maintenant une carte, une flèche et son
contenu. Et chaque carte quotidienne montre la place du jour.

⚠️ **LA PLACE REMPLACE LES PASTILLES, ELLE NE S'Y AJOUTE PAS.** « 3–12 joueurs ·
2 minutes » dit à un inconnu ce qu'est le jeu ; à qui vient d'y jouer, ça
n'apprend rien. Empilées, la ligne neuve se lirait en second.

⚠️ **ET C'EST UN BADGE, PAS UNE PHRASE — avec un PLANCHER DE DEUX.** La première
version écrivait « 1e sur 1 aujourd'hui » sur un vrai téléphone : le « 1er sur
1 » que ce produit refuse partout (`VOTANTS_MIN` 2, `INSCRITS_MIN` 2,
`minimumClasses` 2), servi comme une récompense — et « 1e », qui n'est pas un
ordinal français. Le badge porte donc `selectordinal` et non `{n}e`, il se tait
sous deux joueurs, et **l'effectif reste en petit** : « 3e » ne veut pas dire la
même chose sur six joueurs et sur trois mille. ⚠️ Le podium vaut une médaille et
le premier dixième une flamme — **absolu pour les trois premiers, relatif
ensuite** —, jamais la couleur seule : un décor qui félicite tout le monde ne
félicite personne.

⚠️ **UNE SEULE RPC POUR LES DEUX JEUX** (`scrutin_jeux_porte`) : la porte ne
faisait AUCUN aller-retour, lui en faire faire deux la ralentirait là où l'on
veut entrer vite. Elle marche **sans compte**, par les jetons — c'est l'habitué
sans compte à qui cette page n'avait rien à dire. Le classement de SAISON, lui,
exige un compte et un pseudo et reste dans la barre (`RangJeux`). Cache de
module, une lecture par session.

⚠️ **LA RÉGIE ÉTAIT UN ROULEAU DE SIX BLOCS, TROIS MÉTIERS À LA SUITE.** On
descendait à travers la modération des scrutins pour atteindre les comptes, et
les pseudos des jeux finissaient au fond d'une page qui parlait de votes. Quatre
onglets : Aperçu, Scrutins, Jeux, Personnes. ⚠️ **La file de modération porte son
compte SUR l'onglet** — un signalement en attente est la seule chose urgente de
cette page, et le ranger derrière un onglet muet le rendrait invisible.

**LA RÉGIE VOIT ENFIN LES COMPTES QUI JOUENT** (`scrutin_admin_notifs`,
`20260917-regie-comptes-et-notifs.sql`) — demandé après le défaut des
notifications : « voir les comptes créés avec application des notifs ».

⚠️ **ET LA QUESTION A RÉVÉLÉ PIRE : CES COMPTES N'APPARAISSAIENT NULLE PART.**
`scrutin_admin_list_users` filtre sur `raw_user_meta_data ? 'lang'` ou
l'existence d'un scrutin, d'un espace, d'un événement ou d'un rôle d'admin. Un
compte créé DEPUIS UN JEU — la seule porte que les joueurs empruntent — n'a rien
de tout ça : l'onglet « Personnes » ne montrait pas un seul joueur. Le nouveau
panneau liste donc par l'USAGE DES JEUX (un abonnement, un pseudo, une journée
jouée), pas par la table des comptes.

⚠️ **LA COLONNE QUI COMPTE EST LA DERNIÈRE NOTIFICATION.** Des appareils abonnés
et « jamais » en face, c'est exactement le défaut du `NaN` — et rien ne le
montrait nulle part. Mesuré à la mise en place : 3 comptes, dont un à
**3 appareils et 14 journées sans un seul envoi**. La ligne est surlignée.

⚠️ **LES TROIS GENRES NE S'AFFICHENT QUE QUAND L'UN EST COUPÉ** : vrais par
défaut, les montrer toujours ferait trois pastilles identiques sur chaque ligne,
c'est-à-dire du mobilier.

⚠️ **ET L'ONGLET « JEUX » DIT CE QU'IL NE SAIT PAS.** La Régie mesure les
scrutins et ne mesure RIEN des jeux : ni journées jouées, ni joueurs, ni salles
ouvertes. Écrire l'absence vaut mieux que de laisser croire qu'un onglet presque
vide est un produit peu utilisé.

⚠️ **CETTE PAGE N'EST PAS VÉRIFIABLE ICI** : elle exige une session ET l'allowlist
`scrutin_admins`. tsc, eslint, le build et la parité l'ont vue ; **aucun œil ne
l'a vue rendue**. À regarder à l'écran avant de s'y fier.

**L'EXPÉRIENCE DES JEUX A ÉTÉ REPRISE DE HAUT** (`docs/experience-des-jeux.md`,
2026-08-23), et le diagnostic s'est retourné sur les chiffres réels : **12 jetons
sur Banalo, 2 sur Cinq sur cinq, 3 joueurs revenus une seconde journée, 1 pseudo,
0 tablée**. Le produit a plus de mécanique de classement que de joueurs à
classer ; le goulot est le PREMIER ÉCRAN, pas la profondeur du jeu. Trois défauts
de porte y sont écrits : le titre promet du collectif alors que les deux jeux
jouables tout de suite sont solo, le champ de code est le premier geste offert à
qui n'a précisément pas de code, et rien n'est jouable en un clic.

⚠️ **ET UNE ERREUR DE LA PREMIÈRE VERSION EST CORRIGÉE DANS LE DOCUMENT, PAS
EFFACÉE** : elle voyait dans « six salles de groupe en sept jours » un canal
d'acquisition inexploité. Vérifié ligne à ligne, les six sont des **Échecs
collaboratifs créés le même soir en cent minutes**, avec des noms de test
(« Blanc / Noir », « Adverse / Hote »). Aucun Alibi, aucun Rôdeurs, aucun
Fantôme. ⚠️ La leçon vaut plus que la recommandation perdue : **un `count(*)` sur
une table de salles ne dit ni quel jeu, ni quand, ni qui** — une stratégie bâtie
sur six lignes qu'on n'a pas regardées.

**LA PORTE `/games` PARLE ENFIN DE CE QU'ON PEUT FAIRE TOUT DE SUITE**
(2026-08-23) — les trois défauts de porte écrits dans `docs/experience-des-jeux.md`
§1, corrigés **sur demande explicite** : cette page est la surface de l'agent des
jeux, et on ne l'a pas prise de notre propre chef.

⚠️ **LE CHAMP DE CODE ÉTAIT LE PREMIER GESTE OFFERT À QUELQU'UN QUI N'A
PRÉCISÉMENT PAS DE CODE.** L'argument d'origine — « l'arrivant d'un salon a déjà
son code, il n'a rien à choisir » — est juste sur lui et faux sur tous les
autres. C'est le symétrique exact du défaut déjà corrigé sur le tableau du jour :
une demande adressée à quelqu'un qui n'est pas en mesure d'y répondre. Il ferme
maintenant le catalogue, sous les jeux de salle, parce qu'un code ouvre une
SALLE, pas le produit. ⚠️ **Et l'arrivant n'a rien perdu** : le lien qu'on lui
envoie mène DIRECTEMENT à la salle, sans passer par la porte. Le champ ne sert
qu'à celui à qui on LIT le code à voix haute — qui est, par construction, dans la
même pièce que l'hôte. C'est ce qui a fait écarter un raccourci « j'ai un code »
en haut de page : il aurait recréé le défaut en miniature.

⚠️ **LE TITRE PROMETTAIT LE CONTRAIRE DE CE QUI EST JOUABLE.** « Jouer ensemble »
annonce du collectif, alors que les deux seuls jeux jouables tout de suite, seul,
sans rien organiser, sont les quotidiens — le pitch de la famille le disait
lui-même (« le seul rayon jouable tout de suite »), ce qui était l'aveu que le
reste ne l'est pas.

⚠️ **LES VIGNETTES QUOTIDIENNES MONTRENT LEUR JOURNÉE, ET BANALO SON SUJET.**
« 🎪 Le cirque » est une raison de taper maintenant ; « Une question ou un thème,
chaque jour » est vrai tous les jours, donc du mobilier au troisième passage. Le
sujet REMPLACE la promesse, il ne s'y ajoute pas — une quatrième ligne ferait
grandir la vignette sous ses voisines. ⚠️ **Cinq sur cinq ne porte que son
numéro** : `games/pays/page.tsx` interdit toute métadonnée dérivée du puzzle, et
les confondre ferait fuiter le jeu depuis la porte. Même règle que `JeuxDuJour`
sur l'accueil, et **deux numéros de journée, jamais un** — les charnières
diffèrent (11 h 30 et minuit).

⚠️ **ET L'APERÇU DU LIEN PARTAGÉ SUIT LE TITRE.** `metaTitle` et
`metaDescription` annonçaient « Jouer ensemble — des jeux de groupe à partager
d'un lien » : le jour où le titre cesse de dire ça, c'est l'aperçu WhatsApp qui
continue de le dire. Même défaut, même correction que pour la description de
Banalo du jour quand le format chiffré est passé à une journée sur sept.

⚠️ **UN QUATRIÈME DÉFAUT NE S'EST VU QU'À L'ÉCRAN** : l'index « Résultats et
classements » était posé AU-DESSUS des deux vignettes, donc le premier geste
offert dans la famille quotidienne menait à des tableaux au lieu d'un jeu. Il est
passé dessous. Mesuré à 390 px : la vignette de Banalo tombe à **366 px** (premier
écran, sans défiler), le champ de code à **1 666 px**, la page fait 2,3 écrans.

**LA FIN D'UNE PARTIE DE SALLE N'EST PLUS UN CUL-DE-SAC**
(`components/games/ApresLaSalle.tsx`, 2026-08-23) — et le défaut était pire que
ce que l'étude décrivait. `hostBar` rend `null` pour un non-hôte : sur Alibi,
Rôdeurs et le Fantôme, **tout le monde sauf l'hôte** finissait la partie devant
un podium et un pied de page en 12,5 px, sans une phrase, sans un bouton, sans
même savoir qu'une revanche était possible. `GameShell` écrit pourtant la règle
depuis le premier jour : « MAIS PAS UN CUL-DE-SAC ».

⚠️ **LE BLOC DIT D'ABORD CE QUI SE PASSE DANS LA SALLE, ENSUITE CE QU'ON PEUT
FAIRE SEUL.** Deux questions, et la première a priorité — une absence sans un mot
se lit comme une panne. ⚠️ Alibi avait sa phrase (`final.waitHost`) **écrite dans
les quatre langues et jamais appelée** ; elle est partie avec le bloc, qui la
sert en un seul exemplaire pour les cinq jeux. Banalo en groupe garde la sienne
et reçoit donc `attenteHote={false}` : elle est déjà à l'endroit où le bouton
serait, et la redire imprimerait deux fois la même phrase sur un écran.

⚠️ **IL NE PREND JAMAIS L'ACCENT, ET C'EST LE POINT.** Les gens sont encore dans
la même pièce : l'action de la soirée est de rejouer ENSEMBLE. Le bloc se pose
SOUS les boutons du groupe, en cadre pointillé — la matière que le produit
réserve à ses offres discrètes (`InstallJeu`, `PontPlacet`). Un jeu solo servi en
gros sous un podium disperserait une table qui vient de jouer.

⚠️ **ET LA PHRASE D'ATTENTE EST DEHORS DU CADRE POINTILLÉ.** Posée dedans, elle
empruntait la matière des offres — donc elle se lisait comme le TITRE de l'offre
qui suit, alors qu'elle parle de la SALLE. Elle occupe la place exacte où
« Rejouer » se trouve pour l'hôte. **Ça ne se voit qu'à l'écran** : ni tsc, ni la
parité, ni la relecture ne lisent une hiérarchie visuelle.

⚠️ **LE JEU PROPOSÉ CONTINUE CELUI QU'ON VIENT DE FINIR**, il n'est pas tiré au
sort : la `famille` du catalogue décide. « accord » → Banalo du jour, c'est-à-dire
le MÊME jeu, seul, tous les jours ; enquêtes et stratégie → Cinq sur cinq, la
déduction. On ne pose pas une deuxième table de vérité à côté de celle qui
existe. ⚠️ Et **on ne cherche pas à savoir si le joueur a déjà joué sa journée** :
Cinq sur cinq le garde dans le navigateur, Banalo du jour ne garde RIEN en local
(tout est en base sous le jeton). Le savoir pour un jeu sur deux produirait une
règle que le joueur ne peut pas comprendre.

⚠️ **CE BLOC N'EST PAS INSTRUMENTÉ, ET C'EST ÉCRIT.** `PontPlacet` compte ses
visites parce qu'il traverse l'entonnoir de Placet, qui existe ; une navigation
d'un jeu vers un autre n'a aucun compteur, et en fabriquer un pour douze joueurs
coûterait plus que le bloc.

**LES ÉCHECS ONT ENFIN LEUR REVANCHE** (`20260911-jeu-echecs-rejouer.sql`) — le
SEUL jeu de salle qui n'avait aucune sortie, **l'hôte compris** : le mat, deux
statistiques, et un mur. ⚠️ **AUCUN VERBE NOUVEAU N'A ÉTÉ NÉCESSAIRE** :
`game_replay` est générique depuis le socle du 10/08 — il rouvre une salle du
même jeu avec les mêmes réglages et chaîne l'ancienne vers la neuve. Ce qui
manquait était dans l'ÉTAT : `echecs_state` est une fonction à part (les échecs
ne passent pas par `get_game_room`, qui rend une ligne par joueur) et ne rendait
ni `next_code` ni `is_host`. Sans le premier, l'hôte ouvrait une salle que
personne ne pouvait trouver.

⚠️ **LE CORPS A ÉTÉ REPRIS TEL QUEL, PAS RÉÉCRIT DE MÉMOIRE** — md5 vérifié avant
(le déployé était à l'octet près celui du fichier du 20/08) et après. C'est la
leçon de `20260820-entonnoir-canal-jeu.sql`. ⚠️ Et le siège neuf **se garde avant
de naviguer** : sans ça l'hôte arrive dans son propre salon en inconnu et doit se
rasseoir, c'est-à-dire exactement le tour de table que `game_replay` existe pour
éviter.

⚠️ **UN NON-HÔTE NE PEUT TOUJOURS PAS RELANCER**, contrairement à chess.com où
chacun propose sa revanche : `game_replay` exige `is_host`. C'est une règle de
propriété de la salle, pas un oubli — celui qui a monté la soirée la remonte.

## Les règles qui coûtent cher

**`npm run build` AVANT de pousser.** `tsc --noEmit` ne lint pas. Un
avertissement eslint que `tsc` laisse passer casse le déploiement Vercel **en
silence** — on ne l'apprend qu'en regardant le tableau de bord Vercel. Le build
lance aussi le contrôle de parité i18n.
⚠️ Vérifie que **le port 3000 est libre** avant : un serveur de développement en
cours fait échouer le build.
⚠️ **ET LE BUILD DÉTRUIT LE SERVEUR DE DÉVELOPPEMENT QUI SURVIT, EN SILENCE** :
les deux écrivent dans le même `.next`. Le serveur continue de répondre 200 mais
sert un HTML qui pointe des morceaux disparus — 404 sur `main-app.js`, page
blanche, **aucun appel RPC**, et ça se lit comme un défaut de l'écran qu'on vient
d'écrire. Arrête le serveur AVANT de construire, et repars d'un `.next` vide
ensuite. ⚠️ `ss -ltnp` ne montre pas toujours le processus : c'est `ps -eo
pid,cmd | grep next` qui le trouve, et il faut tuer les quatre (npm, sh, next,
next-server).
⚠️ **ET ÇA VAUT AUSSI POUR `npm run start`**, pas seulement pour le serveur de
développement — payé le 23/08. Un `pkill` qui échoue en silence laisse l'ancien
serveur en vie ; le `rm -rf .next` suivant lui retire ses morceaux, le nouveau
`npm run start` meurt sur `EADDRINUSE` **dans son fichier de log**, et le
navigateur reçoit un `ChunkLoadError` sur TOUTES les pages. Ça se lit comme un
défaut du code qu'on vient d'écrire — ici, comme si la porte plantait dans les
quatre langues. Le premier réflexe est de lire le log du serveur, pas le code.

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

⚠️ **PLAYWRIGHT ESSAIE LA DERNIÈRE ROUTE POSÉE EN PREMIER.** Un fourre-tout
`**/rest/v1/rpc/**` enregistré APRÈS la route précise l'avale : tous les écrans
répondaient « cette partie n'existe plus », et ça se lit exactement comme un
défaut du code qu'on vient d'écrire. On pose le fourre-tout D'ABORD. (Et le
contexte a besoin de `locale: "fr-FR"` avec l'en-tête `Accept-Language` : sinon
`next-intl` négocie l'anglais et les assertions écrites en français échouent
toutes, pour rien.)

⚠️ **ET IL FAUT BLOQUER LE SERVICE WORKER, sinon `page.route` ne tient qu'une
navigation.** Le jeu en installe un (PWA) : dès la deuxième page, les appels RPC
passent par lui et **échappent à l'interception**, la page tombe sur le vrai
Supabase — injoignable d'ici — et affiche « panne ». Ça se lit comme un défaut de
l'écran qu'on vient d'écrire. `browser.newContext({ serviceWorkers: "block" })`,
et le premier écran vérifié n'est plus le seul.

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
