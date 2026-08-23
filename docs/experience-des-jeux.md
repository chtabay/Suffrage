# L'EXPÉRIENCE DES JEUX — prise de recul, 2026-09-09

Demandé : « prends du recul sur l'expérience des jeux : est-ce qu'on a une page
de jeux pertinente en l'état, est-ce que la gamification est bonne (engagement
des joueurs, créer un compte sans que ça apparaisse forcé), est-ce que des
comparaisons avec d'autres interfaces sont pertinentes ? »

Ce document n'est pas une liste de bonnes pratiques. Il part des **chiffres réels
de la base**, et c'est eux qui retournent le diagnostic.

---

## 0. Le chiffre qui commande tout le reste

Relevé le 2026-09-09, en base de production :

| | |
|---|---|
| Jetons ayant joué Banalo, format « mots » | **12** |
| Jetons ayant joué Banalo, format chiffré | **7** |
| Jetons ayant joué **Cinq sur cinq** | **2** |
| Joueurs revenus au moins **2 journées** (Banalo) | **3** sur 12 |
| Comptes portant un pseudo | **1** |
| Noms déposés au tableau du jour | **1** |
| Tablées créées | **0** |
| Abonnements push (les deux datent de juillet, côté scrutins) | **2** |
| Salles de jeu de groupe (fenêtre de 7 jours) | **6** |

⚠️ **CINQ SUR CINQ A DEUX JOUEURS.** Il est en production depuis le 18 août, il a
51 journées de contenu, un moteur de score serveur, une carte, des pictos de
catégorie, un coup de pouce au 50ᵉ essai, une ligne d'enquête, un filtre de
légende, deux modales calibrées, un classement du jour, un classement de saison,
des médailles — et **deux joueurs**.

⚠️ **LE PRODUIT A PLUS DE MÉCANIQUE DE CLASSEMENT QUE DE JOUEURS À CLASSER.**
Saisons, barème F1, médailles, salle des trophées, centiles, rangs olympiques,
tableau du jour, tablées, courbe de distribution, concentration : tout cela est
construit, relu, mesuré — pour une foule de douze personnes dont trois
reviennent. **Le goulot n'est pas la profondeur du jeu ; c'est le premier
écran.**

C'est la conclusion principale, et elle réoriente les trois questions posées.

---

## 1. La page `/games` — non, elle n'est pas pertinente en l'état

Elle est **belle et bien rangée**, et c'est justement ce qui masque le problème.
Voici ce que rencontre, dans l'ordre, quelqu'un qui arrive sans rien savoir :

1. Un titre : **« Jouer ensemble »**
2. Un champ : **« On t'a donné un code ? »** avec un bouton « Entrer »
3. `Reprendre` (vide pour lui)
4. Enfin les familles, dont « Un par jour »

### ⚠️ Défaut 1 — le titre promet le contraire de ce qui est jouable

« Jouer ensemble » annonce du collectif. Or les deux jeux **jouables tout de
suite, seul, sans rien organiser** sont Banalo du jour et Cinq sur cinq ; les
autres demandent 3 à 16 personnes dans la même pièce. Le pitch de la famille
« Un par jour » le dit d'ailleurs lui-même — « le seul rayon jouable tout de
suite » —, ce qui est l'aveu que le reste ne l'est pas.

### ⚠️ Défaut 2 — le premier geste offert est celui qu'on ne peut pas faire

Le champ de code est le **premier élément interactif de la page**, avant tout
contenu. Il ne sert qu'aux jeux de salle, c'est-à-dire à quelqu'un **qu'on a
déjà invité**. Un visiteur qui découvre le produit voit donc, en premier, un
formulaire pour un code qu'il n'a pas — et six vignettes qui demandent du monde.

C'est le symétrique exact du défaut déjà corrigé sur le tableau du jour : une
demande adressée à quelqu'un qui n'est pas en mesure d'y répondre.

### ⚠️ Défaut 3 — rien n'est jouable en un clic depuis la page

Toutes les vignettes mènent à un écran intermédiaire. Le jeu du jour ne commence
jamais **sur** la porte. Wordle, la comparaison la plus proche, n'a pas de porte
du tout : l'URL EST la grille.

### Ce qu'il faut faire, dans cet ordre

1. **Retourner la page** : la famille « Un par jour » monte en tête, avec les
   deux jeux du jour montrés par leur SUJET (Banalo peut afficher son thème,
   Cinq sur cinq ne peut afficher que son numéro — `games/pays/page.tsx`
   l'interdit formellement). Le rang du jour, posé aujourd'hui, y contribue déjà.
2. **Descendre le champ de code** sous les jeux de salle, où il a un sens : c'est
   l'entrée d'une salle, pas l'entrée du produit.
3. **Changer le titre.** « Jouer ensemble » décrit la moitié du catalogue ;
   quelque chose comme « Un jeu par jour, et des jeux à plusieurs » décrit les
   deux, dans l'ordre de ce qui est faisable.
4. ⚠️ **Ne pas fusionner les deux moitiés.** Le rangement par OCCASION (§ familles)
   est juste et mesuré ; le problème est l'ORDRE, pas la structure.

⚠️ **CETTE PAGE EST LA SURFACE DE « l'agent des jeux »** (`CLAUDE.md`) : les
points 1 à 3 se coordonnent avec lui plutôt que de se faire dans son dos.

---

## 2. La gamification — trop de profondeur, pas assez de première marche

### Ce qui est bon, et qu'il ne faut pas défaire

- **Le compte n'est jamais forcé.** On joue, on marque, on voit son rang et son
  centile sans compte. C'est rare et c'est juste.
- **La première demande se mérite** (`regularite-des-joueurs.md` §0) : rien n'est
  demandé avant deux journées jouées. C'est la bonne règle.
- **Une seule demande à la fois**, arbitrée par une échelle écrite. Idem.
- **Les récompenses sont honnêtes** : pas de « 1er sur 1 », pas de rang inventé,
  pas de centile sans effectif. Le produit refuse systématiquement de flatter,
  et c'est ce qui rendra ses chiffres crédibles le jour où il y aura du monde.

### ⚠️ Défaut 4 — la récompense arrive après le seul geste que personne ne fait

L'échelle du §0 est : **rien** (moins de 2 journées) → compte → installation →
Placet. Or **3 joueurs sur 12 reviennent une seconde journée**. L'échelle est
donc, en pratique, « rien » pour 75 % des gens. Tout ce qui a été construit
au-dessus — compte, série, classements, trophées — n'est jamais atteint.

Le seuil de deux journées était juste **contre le risque d'être insistant**. Il
est aujourd'hui le mur qui empêche 9 joueurs sur 12 de voir quoi que ce soit.

⚠️ **Ce n'est PAS un appel à demander un compte au premier jour.** C'est un appel
à **donner** quelque chose au premier jour : aujourd'hui, la première partie ne
rend qu'un score et un partage. Elle pourrait rendre une **raison de revenir
demain** — le sujet de demain, ou ce qu'on a manqué —, ce qui ne demande rien.

### ⚠️ Défaut 5 — le retour du lendemain n'est pas fabriqué, il est espéré

Il n'existe **aucun rappel** : pas de notification (le socle existe et vient
d'être branché, mais l'offre ne vit que sur `/games/quotidien`, donc un habitué
qui n'y va jamais ne la voit pas — c'est écrit et assumé), pas d'email, rien. Le
seul mécanisme de retour est **la mémoire du joueur**.

Wordle a le même — mais Wordle a eu le partage viral d'abord. Ici le partage
existe et **zéro tablée n'a été créée**, ce qui suggère qu'il n'est pas atteint
ou pas désiré.

### ⚠️ Défaut 6 — la série est le seul crochet, et elle est invisible avant d'exister

La série (« 🔥 3 ») est le meilleur crochet du produit et le moins cher. Elle
n'apparaît qu'APRÈS la partie, en bas. Un joueur du jour 1 ne sait pas qu'il y a
une série à construire, donc il n'en construit pas.

### Ce qu'il faut faire, dans cet ordre

1. **Donner quelque chose au jour 1** : à la fin de la première partie, dire ce
   qui revient demain (« demain : un thème » / « demain : un nouveau pays ») et
   montrer la série à 1, pas à 0. C'est gratuit et ça ne demande rien.
2. **Sortir l'offre de notification de `/games/quotidien`.** Elle est aujourd'hui
   au seul endroit que les joueurs ne visitent pas. La poser dans l'échelle du §0
   suppose d'en DÉPLACER une autre — c'est le prix, et il est écrit.
3. **Ne pas ajouter un niveau de gamification de plus.** Il y en a déjà quatre
   (score, rang du jour, série, saison + trophées) pour douze joueurs.

---

## 3. Les comparaisons — oui, mais pas celles qu'on croit

### NYT Games / Wordle — pertinent sur UN point, trompeur sur le reste

**Pertinent** : l'ajout d'amis par **lien d'invitation à code**, jamais par
pseudo cherchable. C'est déjà la décision prise ici
(`amis-et-notifications.md`), et elle est bonne.

⚠️ **Trompeur sur tout le reste** : Wordle est arrivé avec une audience et un
partage viral (la grille d'emojis) AVANT d'avoir des comptes, des séries et des
classements. Copier son économie de rétention **sans son moteur d'acquisition**,
c'est copier la deuxième moitié d'un mécanisme. Le partage de Banalo et de Cinq
sur cinq existe déjà et ne produit rien : le problème n'est pas qu'il manque une
fonctionnalité de NYT, c'est que personne n'arrive.

### Duolingo — à ne PAS copier, et c'est un choix, pas une paresse

Séries agressives, rappels culpabilisants, ligues à relégation. Ça marche et
c'est explicitement contraire à ce que ce produit a décidé : `regularite-des-
joueurs.md` §7 a écarté le rappel quotidien pour des raisons qui tiennent
toujours. Une **relégation** en particulier punirait la journée manquée, alors
que le barème de saison a été conçu pour que « des points n'enlèvent jamais
rien ».

### La bonne comparaison est ailleurs : le **Wordle-like francophone à faible audience**

Le vrai comparable n'est pas NYT (des millions de joueurs) mais les jeux
quotidiens indépendants qui vivent à quelques centaines de joueurs. Chez eux, ce
qui fait la différence n'est jamais la profondeur du classement — c'est :
- une **URL qui joue directement**, sans porte ;
- un **partage qui tient dans un message** et qui donne envie sans spoiler ;
- une **présence là où sont les gens** (un compte social, une newsletter), qui
  n'existe pas ici.

⚠️ **Placet a un atout qu'aucun d'eux n'a, et il n'est pas exploité** : les jeux
de SALLE. Six salles ont été créées en sept jours — c'est-à-dire **plus de monde
réuni autour d'une partie de groupe que de joueurs quotidiens**. Une soirée
Alibi met 6 à 16 personnes devant le produit, en présence, au même moment. C'est
le meilleur canal d'acquisition du produit, et rien, aujourd'hui, ne propose le
jeu du jour à ces gens-là quand la partie de groupe se termine.

**C'est la recommandation la plus rentable de ce document :** à la fin d'une
partie de salle, proposer le jeu du jour aux joueurs présents. Le trafic existe
déjà, il ne coûte rien à acquérir, et il est captif au bon moment.

---

## 4. Ce qui a été fait le jour même, et ce qui ne l'a pas été

**Fait** (commit « La porte des jeux parlait des jeux… ») :
- le chemin vers les résultats et classements devient une carte, pas une ligne ;
- chaque carte quotidienne porte la place du jour du joueur, sans compte.

**Pas fait, et volontairement** : tout ce qui précède touche l'ordre de la porte
`/games`, l'échelle du §0 et les écrans de fin de partie de salle — trois
surfaces qui appartiennent à d'autres chantiers. Ce document est là pour que la
décision se prenne, pas pour la prendre seul.

⚠️ **Et une limite de méthode, à dire** : douze joueurs ne sont pas un
échantillon. Tout ce qui est écrit ici sur le COMPORTEMENT (3 retours sur 12,
zéro tablée) décrit une poignée de gens, dont plusieurs sont probablement des
tests internes. Les défauts d'ÉCRAN, eux, ne dépendent pas de l'audience : le
champ de code en tête de page est faux à douze joueurs comme à douze mille.
