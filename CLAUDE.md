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
| **Banalo du jour** (`games/banalo-jour`) | posé le 2026-08-20 : 15 questions chiffrées, charnière 11 h 30, barème en facteurs. L'étude est dans `docs/banalo-quotidien.md` | ouvert |
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
