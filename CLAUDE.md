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
partie, puisque 28 % des pays à 4/5 ne ratent qu'elle. Les quatre autres parlent
au bout de 25 essais, au grain de 5 catégories larges (les 30 `famille`
nommeraient le critère une fois sur trois : trop fin, mesuré).

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
