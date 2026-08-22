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
`CompteBanalo` s'en tire par un `ref` par identifiant de compte, ce qui marche
aussi.

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
un titre en police de titre. ⚠️ **Les notifications, elles, N'EXISTENT PAS
ENCORE sur les jeux quotidiens**, et il n'y a donc rien à rendre plus visible de
ce côté-là. ⚠️ **NE PAS RÉPÉTER MON ERREUR : c'est le §7 de
`docs/regularite-des-joueurs.md` qui a écarté le RAPPEL QUOTIDIEN** (la
permission ne se demande qu'une fois, un rappel est du bruit pour qui a déjà
joué, et la charnière de 11 h 30 n'est pas l'horloge du joueur). Le §6, lui, dit
l'INVERSE de ce que j'ai écrit ici pendant trois commits : il POSE le push, au
service des amis — « la première notification qu'un joueur reçoit doit être
*Chloé vient de jouer*, pas un rappel robotique ». L'étude est dans
`docs/amis-et-notifications.md`.

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
Pour figurer au tableau d'une journée, il faut **soit un compte Placet** — et
alors on choisit son nom librement — **soit déposer un nom PRIS DANS UNE LISTE
FERMÉE** (`src/content/banalo/noms.ts`, 30 animaux × 20 compléments = 600 noms
par langue). Qui ne fait ni l'un ni l'autre joue normalement, voit son rang et
son centile, et **n'apparaît pas au tableau** : on n'y entre que par un geste,
donc personne n'y est inscrit sans l'avoir voulu.

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
