# RÔDEURS — « croisez du monde : c'est votre alibi »

Troisième jeu de la salle Placet. Slug `rodeurs`, route `/games/rodeurs`, emoji 🔦.

> **La règle, en une phrase.** Chaque fois que quelqu'un tape ton code, vous avez
> la preuve que vous étiez ensemble. Trois d'entre vous rôdent : chaque manche,
> ils approchent quelqu'un qu'ils ont vraiment croisé — la victime apprend dans
> quelle pièce, et doit deviner qui rôdait parmi les gens qu'elle y a validés.

## 1. Ce que ce jeu est, et n'est pas

Le **jeu de soirée** demandé par le fondateur : « on peut imaginer soit un jeu
qui dure une soirée, soit un jeu qui dure la journée ou la semaine de vacances.
Ici, nous travaillons sur le jeu de soirée. » Une à deux heures, cinq manches
qui **ponctuent** le dîner au lieu de le remplacer — c'est le sens littéral de
« permettre à la vie de continuer dans la maison ».

| contrainte héritée | tenue par |
|---|---|
| personne n'est éliminé | la mise en lumière ne retire personne du jeu |
| aucun meneur | **aucun verbe d'hôte** : lancer, clore, avancer — n'importe quel joueur |
| pas de phase les yeux fermés | chaque secret vit sur son écran |
| jouable à 8 ans, l'enfant peut gagner | missions par bande d'âge, même valeur (3 pts) dans les trois bandes |
| supporte les interruptions | pas d'horloge ; celui qui part « se coucher » sort proprement |

**Pas de QR, et c'est un fait vérifié, pas un goût** : `BarcodeDetector`
n'existe sur aucun navigateur iOS (tout iOS est WebKit), ni Firefox, ni Chrome
sous Windows/Linux. Un joueur qui ne peut pas valider est **sans alibi
structurel** — faux suspect permanent — donc la couverture exigée est 100 %.
Le pilier est un **code à 4 chiffres montré d'un côté, tapé de l'autre** :
aucune caméra, aucune permission, aucun poids.

## 2. La boucle

**Salon.** Chacun entre par lien ou code, choisit sa **bande d'âge** (6-9 /
10-13 / 14+, déclarée librement, publique — nier qu'on voit qui a huit ans dans
une pièce serait absurde). Le roster **se ferme au lancement** : un onglet de
plus serait un sceau de plus, donc des alibis à fabriquer.

**Manche (× 5).** La donne — entièrement **serveur** — distribue à chacun un
sceau (régénéré chaque manche), une mission tirée dans sa bande, et aux rôdeurs
leurs complices. **Un tiers de la table** reçoit une mission *secrète* : la
publier annule la mission. C'est le mobile qui fait tenir les maths — sans lui,
seul le rôdeur a une raison de se taire et se désigne tout seul.

On vit sa soirée. Taper le code de quelqu'un scelle la rencontre (pièce à
choisir parmi six) : **une arête, un alibi pour les deux**. Le rôdeur pose sa
**marque** sur quelqu'un qu'il a *réellement validé* — jamais un complice, le
serveur n'écrit même pas leur rencontre — avec, s'il en reste (3 par soirée),
une **fausse piste** : annoncer la pièce d'une *autre* de ses rencontres. Le
mensonge est borné par le registre.

**Clôture** (n'importe qui). Le rôdeur passif est **marqué d'office** (la
passivité coûte 31 points, mesuré) ; les missions s'évaluent ; les **listes**
se publient : pièce annoncée + les gens que la victime y a validés — **le
rôdeur y est par construction**. Ceux qui n'ont croisé personne apparaissent en
« sans aucune rencontre » : c'est ce qui fait du rendez-vous des complices un
suicide (0,5 % → 99,8 %, reproduit en base). La victime choisit : **publier**
(+1, tout le monde voit) ou se taire — le serveur publie alors la pièce
anonymement. Si le lot se réduit à un nom, pas de pièce : le lot devient tout le
carnet (servir les singletons ferait passer la preuve directe de 34 à 45 %).

**Confrontation.** Un nom, en secret. Elle se résout **toute seule au dernier
vote**. Le plus accusé est *mis en lumière* — sans élimination. La soirée
s'arrête dès que tous les rôdeurs sont tombés.

**« Je vais me coucher. »** Quitter, c'est se rendre : un rôdeur qui part est
révélé et compté démasqué. Sans cette règle, s'absenter est une ligne
strictement dominante (mesuré sur la mécanique concurrente : 58 % → 0,1 %).
⚠️ *Cette règle n'a pas été simulée — c'est la réserve du lot.*

## 3. Le score — plancher à zéro, structurel

Aucune soustraction n'existe nulle part : le pire score est 0 (quelqu'un qui
n'a pas touché son téléphone). **Habitant** : +3/mission (0 si secrète brûlée),
+1/lot publié, +2/confrontation où son vote nommait un rôdeur, +4 si la maison
est nette. **Rôdeur** : +3/marque de sa main, +1/marque d'office, +8 s'il n'est
jamais mis en lumière, +2/innocent mis en lumière — et **rien pour ses
missions** : elles sont sa couverture, pas son objectif.

Fin graduée : *la maison est nette* (tous pris, ≤ r−1 innocents grillés) / *il
en restait un* / *la maison a perdu*. Un budget qui fermerait la soirée d'un
coup a été mesuré à 1,6 manche jouée — disqualifié.

## 4. D'où vient cette conception

Trois mécaniques simulées puis attaquées. **Deux sont mortes de la même
cause** : elles faisaient produire au rôdeur un *trou* (une tranche sans
tampon, trois minutes de silence). Un trou est une non-action — gratuite,
infalsifiable, indistinguable de la vraie vie d'un gîte — et l'enfant qu'on
couche à la manche 3 devenait suspect permanent (44 % des accusations à tort).
Ici le rôdeur produit un **acte positif** et ne peut pas s'extraire de
l'information qu'il crée ; le joueur passif, lui, n'apparaît nulle part.

L'attaque a vidé la survivante trois fois avant correctifs, tous mesurés par
l'attaquant : la clique des complices (0,5 % → **99,8 %**), la pièce en
paramètre libre (9,8 % → bornée par le registre), le vote sans quorum. Et
l'implémentation a rejoué le coup de la clique **en base** : il passait encore
(les complices avaient des rencontres — entre eux — donc n'étaient pas « sans
rencontre ») ; d'où la règle finale : **une rencontre entre rôdeurs ne s'écrit
pas du tout**.

## 5. Le modèle

Sur le socle générique : `band` et `left_at` (publics) sur les joueurs ; le
rôle, le sceau, les complices, la mission et les fausses pistes dans `secret`
(ne sort que par `me`). Trois tables neuves — `scrutin_game_meets` (l'index
`least/greatest` interdit la poignée de main en double, qui vaudrait un alibi
double), `scrutin_game_marks`, `scrutin_game_missions` — plus le catalogue
`scrutin_game_rodeurs_patterns` (13 patrons, tous vérifiables par une requête).
RLS active, zéro policy, comme tout le socle.

`at` est un **timestamptz absolu**, jamais un décalage : c'est ce qui n'interdit
rien aux versions **journée** et **semaine**, explicitement au programme.

Verbes joueurs : `rodeurs_meet` (15 échecs/manche max — sinon un script essaie
les 10 000 codes et fabrique des rencontres sans bouger), `rodeurs_mark`,
`rodeurs_publish` (recalcule les listes du résultat : **publier doit se voir**,
défaut trouvé en jouant), `rodeurs_vote` (auto-résolution au dernier vote),
`rodeurs_band`, `rodeurs_leave`. Fichiers : `20260813-jeu-rodeurs-1-schema.sql`
et `-2-regles.sql` — **contrôle md5 fichier ↔ `pg_proc.prosrc` : 17/17
identiques** au moment du commit (c'est le contrôle dont l'absence avait rendu
une migration de Banalo non rejouable).

## 6. Ce qu'on ne fait pas en v1

- **Pas d'horloge de manche** : on clôt à la main, n'importe qui. La fenêtre
  temporelle automatique viendra si les vraies soirées la réclament.
- **Pas de validation parent-pour-enfant** (le père qui valide au nom du petit
  sans téléphone) : à concevoir avec de vrais retours — un enfant sans écran
  peut déjà jouer en montrant le téléphone d'un parent au moment de taper.
- **Pas de tableau cumulé inter-manches à l'écran** : le résultat de chaque
  manche reste consultable, la synthèse visuelle attend les premiers retours.

## 7. Ce qui ne se saura qu'en jouant

Le jeu **corrigé** n'a jamais été simulé en entier — les correctifs l'ont été
isolément. `hit` et `size` sont écrits dans le résultat final : après les
premières vraies soirées, une requête d'une ligne donnera le vrai taux, et
c'est lui qui décidera des cadrans (part de missions secrètes, stock de fausses
pistes, nombre de manches).
