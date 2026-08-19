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
| **Unanimo** (`games/unanimo`) | en prod, relu ; sa page de présentation porte des aperçus d'écrans depuis le 2026-08-18 | fermé, sauf la présentation |
| **Alibi** (`games/alibi`) | en prod, **relu et corrigé le 2026-08-13** | fermé — **ne pas y revenir** |
| **Gestion de groupes** (`/espaces`) | en prod, 24 constats moyens/faibles en réserve | la session tableau de bord |
| **Cinq sur cinq** (`games/pays`) | en prod le 2026-08-18 · pictos de catégorie posés le 2026-08-19 · **stock de contenu à rallonger avant le 7 octobre** | ouvert |
| **La Nuit du Fantôme** (`games/fantome`) | en prod ; portraits SVG + murmures de borne posés le 2026-08-18 | l'agent des jeux |
| **La porte `/games`** | rangée par familles le 2026-08-18 ; ajouter un jeu = lui donner une `famille` dans `catalog.ts` | l'agent des jeux |
| **Aperçus d'écrans** (`components/games/Apercus.tsx`) | posés sur Rôdeurs et Unanimo ; **reproduits, jamais capturés** — une capture ne parle qu'une langue sur quatre | l'agent des jeux |

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

**Cinq sur cinq n'est pas clos, et sa date de péremption est connue.** Le jeu
sort une journée par jour d'un stock de 51, généré par
`scripts/pays-journees.ts` : le 7 octobre 2026, il recommence à la première.
Ce qui plafonne le stock n'est pas la bibliothèque entière (58 critères) mais
son **étagère du haut** — 7 critères de palier `signature`, alors que chaque
journée doit en porter un. Doubler cette seule étagère allonge le stock plus que
trente critères larges.

L'étagère `signature` mince coûte maintenant DEUX fois. Elle plafonne le stock,
et elle interdit de montrer la catégorie de la cinquième case : à 7 critères sur
4 catégories, ce picto laisserait deux candidats et nommerait le critère 3 fois
sur 51. La cinquième case se tait donc — c'est aussi ce qui fait la fin de
partie, puisque 28 % des pays à 4/5 ne ratent qu'elle. Les quatre autres parlent
au bout de 25 essais, au grain de 5 catégories larges (les 30 `famille`
nommeraient le critère une fois sur trois : trop fin, mesuré).

Ce jeu a aussi ajouté à la base `scrutin_game_pays_results` et trois fonctions
`scrutin_game_pays_*` (migration `20260818-jeu-pays-resultats.sql`) : RLS active,
aucune policy, tout passe par les fonctions `security definer`.

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
Unanimo, deux défauts sur cinq n'étaient visibles qu'en jouant — un bouton mort
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
