# ÉCHECS COLLABORATIFS — document de cadrage

Cinquième jeu de la salle Placet. **Rien n'est codé** : ce document rassemble ce
qui a été *mesuré*, ce qui a été *vérifié sur sources*, et ce qui reste à
décider. Il s'appuie sur la spec produit du fondateur et la corrige sur trois
points, chaque fois avec un chiffre ou une source.

> **Plusieurs personnes, un seul joueur.**

## 1. Trois modes, pas un

La spec parlait d'un jeu ; les arbitrages du fondateur en ont fait trois, et
c'est ce découpage qui rend le chantier faisable.

| mode | adversaire | rythme | votes visibles | moteur d'échecs |
|---|---|---|---|---|
| **1 — Salon, équipe contre équipe** | l'autre équipe | direct, tours courts | **non** | **aucun** |
| 2 — Collectif contre ordinateur | le moteur | direct | non | oui |
| 3 — Longue durée | l'un ou l'autre | quelques coups par jour | **oui** | selon l'adversaire |

Chacun rejoint l'équipe qu'il veut — pas d'organisateur qui distribue des
invitations. Les couleurs se tirent au lancement.

⚠️ **Le mode 1 ne demande AUCUN moteur** : deux équipes s'affrontent, il ne
reste que la bibliothèque de règles pour calculer les coups légaux. C'est donc
le lot **le moins cher et le plus rapide à mettre entre des mains** — et c'est
la leçon de Rôdeurs appliquée d'elle-même : tester l'affiche avant le
simulateur. L'ordinateur devient un mode, pas un prérequis.

## 2. La référence est Fouloscopie 2022, pas Kasparov 1999

**« Kasparov contre le Monde » n'est pas une expérience d'intelligence
collective : c'est du suivi d'expert.** Établi sur sources :
- du 10ᵉ au 50ᵉ coup — **41 coups d'affilée** — la foule a joué exactement ce
  que recommandait Irina Krush ;
- un participant : « dès le coup 15 il était clair de qui les coups étaient
  repris, dès le 18 je ne regardais plus les autres » ;
- **le seul coup où la foule a arbitré seule entre analyses concurrentes — le
  54ᵉ — est celui qui perd la partie** (Bacrot proposait le coup qui annule).

Un jeu qui interdit d'afficher une évaluation avant le vote ne reproduira pas
cette partie, et **ne doit pas la vendre**.

**Moussaïd / Fouloscopie 2022 est le protocole de ce jeu à la virgule près** —
pluralité, un joueur une voix, adversaire calibré, clôture qui n'attend
personne. Mesuré, **sans aucun coach** :
- 24 405 participants, 500 parties parallèles (~49 joueurs/partie), adversaire
  MAIA de 1100 à 1900 Elo, 3 coups/jour ;
- votants d'Elo moyen **1165**, niveau auto-déclaré **2,0/5** ;
- **le collectif joue au niveau 4,5/5 et gagne 77 % des parties.**

⚠️ **« Elo collectif 1700-1800 » n'est PAS dans le papier** — c'est de la
presse. Ne jamais l'écrire comme un fait sur l'affiche.

## 3. Ce que la mesure impose — et le §7 de la spec qu'elle contredit

La spec cache les votes pendant le tour, pour éviter l'effet de troupeau.
**Moussaïd mesure l'inverse : 77 % de victoires votes affichés contre 64 %
cachés**, soit +13 points sur 500 parties. C'est le seul réglage de ce jeu qui
ait une mesure derrière lui, et le mécanisme est identifié — *les meilleurs
joueurs votent plus tôt*, les suivants s'y agrègent.

Mais la mesure a été faite **en asynchrone, sur des fenêtres de plusieurs
heures** : c'est le mode 3. Rien ne dit qu'elle survit à quarante secondes en
direct, et à sept amis autour d'une table « les bons votent tôt » devient « le
plus fort de la bande dicte ».

→ **Règle retenue : votes affichés en mode longue durée, cachés en mode salon.**
Le premier suit la mesure, le second reconnaît que la conversation autour de la
table fait déjà le travail — mieux qu'un écran.

### Une phrase du critère de réussite ne se produira jamais

« 62 % ont joué ça ?! » suppose un grand pourcentage dans une grande partie.
Avec l'exposant publié (1,18), la part du coup gagnant vaut :

| votants | médiane | p10 – p90 |
|---|---|---|
| 7 | 29 % | 29 – 57 % |
| 50 | 32 % | 24 – 40 % |
| **800** | **32 %** | **30 – 34 %** |

**Le grand nombre n'amplifie pas le pourcentage : il l'écrase.** La petite
partie affiche 57 %, la grande 32 % — l'inverse du récit attendu.

C'est un choix d'écran, pas une fatalité. Trois sorties, toutes dans les limites
posées (aucune évaluation, aucun coach) :
- afficher **« 261 voix sur 800 »**, pas un pourcentage — le grand nombre
  redevient spectaculaire ;
- afficher **le podium des trois premiers coups** (≈ 32 / 14 / 9 %) : *« il y
  avait 35 coups possibles, on s'est retrouvés à trois »* — vrai à toutes les
  tailles, et c'est littéralement le mécanisme de Moussaïd mis à l'écran ;
- garder les pourcentages pour l'**écran de fin de partie**.

La phrase de la révélation est verbatim de Moussaïd, et c'est la bonne :
*« il y a beaucoup de façons d'avoir tort, une seule d'avoir raison ».*

### Les égalités ne sont pas une finition, c'est le mécanisme principal

| votants | meilleur coup seul en tête | **égalité** |
|---|---|---|
| **3** | 24 % | **41 %** |
| 7 | 52 % | 22 % |
| 50 | 96 % | 1,5 % |

À trois contre trois — le premier cas d'usage — **le départage se déclenche une
position sur deux**. Il doit être rapide, lisible, et ne jamais avoir l'air
d'une panne. C'est aussi ce qui rend la phase de propositions commentées
précieuse à petit effectif : à trois, ce n'est pas le vote qui décide, c'est la
conversation.

## 4. Le mur n'est pas le moteur : c'est la lecture

`get_game_room` rend **un tableau à une entrée par joueur**, et le client sonde
toutes les deux secondes. Mesuré, en construisant la réponse réelle :

| joueurs | taille de `players` | requêtes/s | **sortie** |
|---|---|---|---|
| 11 | 1,5 Ko | 6 | 0,01 Mo/s |
| 40 | 5,4 Ko | 20 | 0,11 Mo/s — 0,4 Go/h |
| 400 | 54,8 Ko | 200 | **11,2 Mo/s — 40 Go/h** |
| 4 000 | 552 Ko | 2 000 | **1 131 Mo/s — 4 To/h** |

**Le socle actuel casse quelque part entre 40 et 400 joueurs**, et c'est
entièrement dû au tableau de joueurs. Les écritures, elles, ne posent aucun
problème : 133 votes/s à 4 000 joueurs sur un tour de 30 s.

Un **état agrégé** — aucun tableau, seulement des compteurs — pèse **294 octets,
constant quel que soit l'effectif** : 0,59 Mo/s à 4 000 joueurs au lieu de
1 131. Un facteur 1 900.

```
{"status":"ok","code":"AB12CD","fen":"…","turn":"w","ply":17,"team":"w",
 "deadline":"…","votes":437,"present":612,"phase":"vote",
 "last":{"from":"g1","to":"f3","san":"Nf3"},"legal":[…],"mine":"g1f3"}
```

→ **Ce jeu a besoin d'une seconde voie de lecture, purement agrégée.** Il ne se
greffe pas sur `get_game_room`, et il ne faut pas y toucher : elle est partagée
avec Alibi, un chantier clos.

### La clôture ne peut venir d'aucun ordonnanceur

⚠️ Vérifié : **les crons Vercel en Hobby sont à la journée**, précision à
l'heure (± 59 min). Aucune clôture de tour ne peut en venir. C'est **le premier
client qui constate que le temps est écoulé** qui la déclenche — donc la clôture
doit être **idempotente** : six cents clients qui la déclenchent à la même
seconde ne doivent produire qu'un seul dépouillement. Le dépôt a déjà perdu des
écritures avec des `max(seq)+1` concurrents ; ici la garde doit vivre dans le
`WHERE` d'un `UPDATE`, pas dans du code.

### Trois défauts connus de `game_join`, à corriger dans le même lot

- `for update` sur la ligne salle → **point de sérialisation unique** dès qu'on
  lève le plafond ;
- plafond `v_count >= 60` → à lever pour ce jeu, et pour lui seul ;
- index unique `(room_id, lower(name))` → à 800 joueurs, « Tom » est pris avant
  le dixième arrivant. **Mur d'entrée pour des innocents** : il faut
  désambiguïser (`Tom (2)`) ou assumer le refus.

✅ Bonne nouvelle : `scrutin_game_entries_uk UNIQUE (round_id, player_id)`
existe déjà. **Une voix par siège et par tour est garantie par un index**, pas
par du code.

## 5. Le moteur, et l'arbitre

**Deux problèmes distincts, souvent confondus.**

**L'arbitre** (quels coups sont légaux) est obligatoire dans les trois modes, y
compris le mode 1 sans adversaire. `chess.js` — **BSD-2, 762 Ko, zéro
dépendance** — dans une route Node de Next. Il gère roque, prise en passant,
promotion, pat, nulle par répétition et par matériel insuffisant : tous ces cas
sortent en vraie partie.

⚠️ **La liste des coups légaux, calculée une fois par tour, EST le bulletin.**
Elle est stockée avec la position ; voter revient à vérifier une appartenance à
cette liste. Zéro logique d'échecs dans Postgres, aucun coup illégal possible —
et l'ouverture gratuite vers les autres méthodes de §19, puisque le bulletin est
une liste d'options indexées. Volume mesuré : 24 à 28 coups en moyenne, p95 ≈
45, 218 dans la position record. C'est du bruit.

**L'adversaire** (modes 2 et 3) : `js-chess-engine` — **MIT, 603 Ko, zéro
dépendance**, cinq niveaux. Stockfish est écarté : **GPL-3.0 et 240 Mo**, contre
une limite Vercel mesurée à 250 Mo non compressés.

⚠️ **`js-chess-engine` n'est PAS déterministe au premier coup** — trouvé en
lisant sa source : `OPENING_RANDOMNESS = 5` est injecté au coup 1 sauf si
l'appelant passe explicitement `randomness: 0`. C'est exactement le pli le plus
susceptible d'être rejoué (déploiement, ouverture de salle).

⚠️ **La force réelle de `js-chess-engine` n'est pas établie** : aucune note
publiée. « Difficile » est donc une promesse non vérifiée tant qu'on n'a pas
joué contre lui.

⚠️ **La notation algébrique est LOCALISÉE** : `fr = R D T F C`, `es = R D T A C`,
`en = K Q R B N`. **« Rf3 » est une tour en anglais et un roi en français.** On
stocke en UCI (`g1f3`), on affiche en notation locale.

## 6. Le bulletin, et les méthodes de décision

Une position offre ~25 coups légaux ; un ou deux sont bons, le reste va de
médiocre à perdant. Les votants sont faibles et hétérogènes, et le §21 interdit
de leur faire comprendre une méthode électorale. Placet implémente déjà le
dépouillement (`approval`, `borda`, `condorcet`, `runoff`, `mj`… dans
`src/lib/voting/`) : le travail est **le bulletin sur un échiquier**, pas le tri.

**Pluralité en V1.** Elle exploite exactement le mécanisme mesuré — les mauvais
votes se dispersent sur 27 coups, le bon se concentre — et c'est la méthode sur
laquelle les 77 % ont été obtenus. La changer ferait perdre l'alignement avec la
seule mesure qu'on ait.

Son défaut réel, spécifique aux échecs : **la division du vote entre deux coups
voisins**. Si le groupe veut prendre en e5 mais se partage entre le fou et le
cavalier, un troisième coup gagne avec moins de voix que l'idée majoritaire.
C'est littéralement l'exemple du « grand débat » de la spec (36 / 35 / 29 %).

**L'approbation est la meilleure extension, et pour une raison inattendue.**
« Coche tous les coups qui te vont » : zéro théorie, geste naturel sur un
échiquier, règle la division du vote par construction, et dégrade proprement
(qui n'approuve qu'un coup se comporte comme en pluralité). Surtout : **à trois
contre trois, elle fait s'effondrer les 41 % d'égalités** — c'est le correctif
du mode salon, pas un raffinement lointain. Non mesuré, à éprouver.

**Trois méthodes déconseillées, et ce n'est pas par paresse :**
- **Borda / classement** — supposent qu'un compromis a du sens. Aux échecs, non :
  la moyenne de deux bons plans est souvent un coup perdant.
- **Condorcet** — bonne propriété (immunité à la division du vote) mais 25 coups
  font 300 comparaisons : impraticable en trente secondes sur un téléphone.
- **Jugement majoritaire** — le plus séduisant et le plus contraire au
  mécanisme : il lit une **médiane**, donc le votant moyen d'un collectif
  faible, alors que ce qui fait marcher ce jeu est la **concentration** du bon
  coup.

⚠️ **Ce qui rend les méthodes riches praticables, c'est la phase de
propositions** : elle fait tomber le nombre d'options de 25 à trois ou quatre.
Sur quatre coups proposés et commentés, un classement ou un Condorcet
redeviennent tenables — et « méthode contre méthode » (§20) devient un vrai mode.

**Jamais de pondération par le niveau déclaré** : le §21 l'interdit, et ça tuerait
le sujet — le protagoniste est le collectif.

## 7. La garde par compte — ce qu'elle achète, et ce qu'elle n'achète pas

L'organisateur peut, **s'il le souhaite**, exiger un compte. Forme : une colonne
`gate` sur la salle avec `default 'open'` (les quatre jeux en production ne
bougent pas), un `user_id` nullable sur le joueur avec index unique **partiel**,
et le refus rendu comme statut explicite. Le mécanisme des groupes Placet
(`scrutin_member_links`, interrogé depuis une RPC `definer`) sert de troisième
niveau : membres d'un groupe seulement.

⚠️ **Ce qu'elle n'achète pas** : `signInWithOtp` crée le compte si l'adresse est
inconnue — une adresse jetable suffit. **Un compte n'est pas une preuve
d'unicité de personne.** Elle rend la triche ennuyeuse et attribuable, rien de
plus. Seul le niveau « membres d'un groupe » ferme vraiment la liste.

⚠️ **chess.com n'est pas planifiable** : l'API publique est en lecture seule
(« You cannot send game-moves or other commands »), donc nulle comme garde ; et
l'OAuth s'obtient par un formulaire Google, sans qu'aucun tiers n'ait confirmé
l'avoir obtenu.

**Et de toute façon, à l'échelle, la triche par onglets ne paie pas** : dix
onglets sur 800 votants déplacent le coup gagnant de 32,0 % à 33,2 %. ⚠️ En
revanche, **la déduplication à une voix par IP tuerait le cas nominal** — trente
amis sur le même wifi. Un plafond haut par IP est le seul garde-fou acceptable.

## 8. Ce qui reste ouvert

- **L'équipe qui attend.** Les échecs alternent : la moitié des joueurs est
  inactive à tout instant, et la durée réelle double. En salon on parle — c'est
  même là que la partie devient sociale — mais à distance, regarder tourner un
  compteur une fois sur deux fait décrocher. À concevoir, puis à éprouver.
- **Le chat du mode 3** est du texte libre, et **la modération par LLM de Placet
  n'est pas branchée**. Sur une partie publique de plusieurs jours, c'est une
  exposition réelle. Le commentaire attaché à un coup en est une forme bornée.
- **La force de `js-chess-engine`**, non établie.
- **L'interface de l'échiquier** sur téléphone : ce dépôt dessine ses composants
  à la main, sans dépendance d'affichage. À trancher.
- **Le regroupement en trois familles** de la porte `/games` (§2), sans casser
  les URL ni le référencement.

## 9. Les décisions du fondateur

1. **L'ordre de livraison.** Le mode 1 (salon, équipe contre équipe) est le
   moins cher — aucun moteur — et le plus rapide à éprouver. Le mode 3 est celui
   qui a la mesure derrière lui **et** l'exigence technique la plus faible (à
   trois coups par jour, un moteur qui met trente secondes convient ; en salon
   il en faut deux). Le mode 2 est le plus coûteux. Mon ordre : **1, puis 3,
   puis 2**.
2. **Ce qu'on promet sur l'affiche.** Ne pas écrire « ~1750 Elo » : c'est un
   chiffre de presse qui se retourne dès qu'on ouvre la source. Promettre ce que
   le papier établit — *un groupe de débutants joue collectivement bien mieux
   que chacun de ses membres, et gagne le plus souvent*.
3. **L'ordre sur `game_join`**, fonction partagée par les cinq jeux : ses trois
   défauts se corrigent en une fois, avant la première migration de ce jeu.

## 10. Ce qu'on ne fait pas

La liste du fondateur, tenue telle quelle : pas de limite arbitraire de
participants ; ne jamais attendre que tous aient voté ; ne pas demander de
comprendre les méthodes électorales ; ne pas afficher l'évaluation du moteur
avant le vote ; ne pas transformer le jeu en cours d'échecs ; pas de compte par
défaut ; pas de chat avant d'avoir validé le gameplay ; pas de paramètres en
plus ; **ne jamais afficher les choix des autres pendant le vote** ; ne pas
désigner « le meilleur joueur ».

Et une règle propre à ce dépôt, payée trois fois : **se méfier de tout écran qui
désigne quelqu'un.** Chacun doit pouvoir retrouver son propre choix ; jamais
celui d'un autre.
