# RÉGULARITÉ DES JOUEURS ET PONT VERS PLACET — plan de travail

Ce document fixe l'ordre et, surtout, les **décisions déjà prises** : ce qu'on
construit, ce qu'on refuse, et pourquoi. Il concerne les deux jeux quotidiens —
**Cinq sur cinq** (`games/pays`) et **Banalo du jour** (`games/banalo-jour`).

---

## 0. La règle qui commande tout le reste : l'après-partie n'a qu'UNE place

Un écran de jeu quotidien a deux états, et ils n'ont rien à voir.

**Avant de jouer**, le joueur a une tâche. Tout le reste est du bruit. C'est déjà
écrit dans `GameShell` : « PAS LA NAV DE PLACET. On vient jouer. Greffer *Créer
un scrutin*, *Explorer*, *Mes votes* au-dessus d'une manche mettrait quatre
sorties en concurrence avec le seul geste attendu. » Rien n'a le droit d'entrer
là.

**Après avoir joué**, il n'y a plus rien à faire pendant vingt-quatre heures.
C'est le seul créneau honnête pour proposer autre chose — et le même `GameShell`
ajoute « MAIS PAS UN CUL-DE-SAC ».

⚠️ **Ce créneau n'a qu'une place, et plusieurs chantiers la veulent** :
l'installation, le compte, l'invitation vers Placet, l'activité des amis. Les
empiler les ferait se cannibaliser. On pose donc **une seule échelle de
priorité**, dans un seul composant :

| état du joueur | ce qu'il voit après avoir joué |
|---|---|
| moins de 2 journées jouées | **rien** — son résultat et le partage, c'est tout |
| pas de compte | l'offre de compte (« gardez votre série ») |
| compte, pas installé | l'offre d'installation |
| compte, installé, ne connaît pas Placet | **un vrai scrutin public, votable sur place** |
| au-delà | rien — puis, plus tard, l'activité de ses amis |

⚠️ **LA PREMIÈRE DEMANDE SE MÉRITE.** Un joueur qui découvre le jeu ne doit rien
se voir demander : il n'a pas encore de série à garder, donc l'offre de compte
n'a aucun sens pour lui, et une demande ignorée coûte la crédibilité des
suivantes. D'où le seuil de deux journées.

---

## 1. Aligner le partage de Banalo sur celui de Cinq sur cinq

Cinq sur cinq partage : un titre, **une ligne de substance** (la montée, pas la
transcription — voir `pays/partage.ts`), l'URL, et propose un **QR agrandissable**
pour le partage en présence physique. Banalo du jour n'a que le texte.

À faire : le QR, la même grammaire de texte, le même repli
`navigator.share` → presse-papier, et le même événement de journal.

⚠️ **Ce qu'on ne recopie PAS** : la « montée » de Cinq sur cinq raconte une
progression sur 156 essais. Banalo n'a pas de progression — un dépôt, un score.
Sa ligne de substance est le score et la part, pas une forme inventée pour
ressembler.

---

## 2. Le compte facultatif de Banalo du jour

Migration écrite (`20260820-banalo-compte.sql`), à appliquer et vérifier.

**L'intention est un entonnoir assumé** : quelqu'un venu pour deux minutes de jeu
repart avec un compte Placet, qui sert aussi à organiser de vrais votes. Le jeu
ne demande rien pour jouer, et n'en demandera jamais.

Deux différences de fond avec Cinq sur cinq, déjà tranchées :

* **Le client n'envoie aucun score.** Les réponses sont déjà en base sous le
  jeton ; `scrutin_banalo_rattacher(jeton)` recalcule tout avec les mêmes
  fonctions que l'écran. Personne ne peut s'inventer un palmarès.
* **L'`update` est inconditionnel.** Chez Cinq sur cinq « meilleur » est un
  MINIMUM d'essais et on garde le meilleur ; ici c'est un MAXIMUM de points, et
  ce qui bouge n'est pas la réponse mais la foule. Garder le maximum figerait le
  score à l'instant de la connexion.

⚠️ **La série marche SANS compte** (`scrutin_banalo_serie(jeton)`), sur les deux
formats réunis. La leçon est écrite dans `pays/local.ts` : « quelqu'un qui n'a
rien à garder n'a aucune raison de créer un compte ».

⚠️ **La politique de confidentialité change avec ce chantier.** Elle dit
aujourd'hui « un identifiant tiré au hasard par son navigateur — **jamais un
compte** ». Le résumé par compte ne se purge pas, contrairement aux réponses
brutes : la phrase doit dire les deux, dans le même commit que le code.

---

## 3. L'installation, au bon moment et aux bonnes couleurs

Trois constats, validés :

* `InstallFab` **flotte déjà sur les pages de jeu**, aux couleurs de Placet, et
  **tutoie** (« ton écran d'accueil ») alors que les jeux vouvoient. Il sera
  masqué sur `/games/*`.
* Son conseil iOS est **écrit en dur en français**, sur toutes les pages — un
  trou d'i18n que le contrôle de parité ne voit pas, puisqu'il n'y a pas de clé.
* La bonne place n'est pas un bouton permanent mais l'après-partie, dans
  l'échelle du §0 : le joueur vient de finir, et l'icône sur l'écran d'accueil
  est précisément ce qui le ramènera demain.

⚠️ **Sur iPhone, il n'y a pas de notification sans installation préalable**
(iOS 16.4+ : le push n'existe que pour les sites ajoutés à l'écran d'accueil).
L'installation est donc AUSSI le préalable technique du §5.

---

## 4. L'invitation vers Placet : montrer, pas expliquer

Trois portes existent déjà — le pied de page des jeux, le paragraphe de `/games`,
le bloc compte de Cinq sur cinq. Toutes **expliquent**. La quatrième doit
**montrer** : un vrai scrutin public, votable sur place, tiré de
`getPublicPolls`.

Pourquoi celui-là plutôt qu'une présentation :

* Une présentation est identique tous les jours ; au troisième passage c'est du
  mobilier, et un joueur régulier la verra trente fois. Un scrutin change tout
  seul.
* Le joueur vient de donner un avis et d'être noté contre une foule. Lui
  proposer une question où son avis **décide** est une continuation, pas une
  interruption. La phrase du pont ne marche qu'ici : *« Ce jeu vous note contre
  la foule. Placet sert à décider avec elle. »*

**Et pour ceux qui n'ont pas de compte, le meilleur pont n'est pas Placet, c'est
le jeu en groupe.** Organiser une partie pour huit personnes — créer, partager un
code, tout le monde répond, on dépouille — *est* le geste de Placet en
miniature. Ça enseigne le mécanisme au lieu de le vendre.

⚠️ **Instrumenté dès le départ** (vue, clic), via le journal existant. Une
invitation qui ne convertit pas doit pouvoir être retirée sur preuve, sinon elle
reste par inertie et taxe tous les écrans.

⚠️ **Le bandeau permanent en bas de page est écarté pour l'instant**, et gardé en
réserve : il est beaucoup plus facile à ajouter qu'à retirer.

---

## 5. Les amis — et c'est là qu'on pose le push

Voir ce que les autres ont fait, être prévenu quand ils ont joué, consulter les
historiques.

⚠️ **C'est ce chantier qui justifie la permission de notification, et pas
l'inverse.** La première notification qu'un joueur reçoit doit être *« Chloé
vient de jouer »*, pas un rappel robotique : la première est une raison
d'accepter, la seconde une raison de refuser. On pose donc l'ancre push ICI.

⚠️ **L'abonnement s'accroche au COMPTE, pas au jeton.** L'abonnement push vit
dans le service worker, le jeton dans le `localStorage` : effacer ses données tue
le jeton sans tuer l'abonnement, et le joueur recevrait « votre série » alors que
le site lui montre zéro. Le compte évite ça — et rejoint l'entonnoir du §2.

Décisions à prendre au moment de construire : le modèle d'amitié (invitation /
acceptation), ce qu'un ami voit exactement (le score ? le rang ? seulement
« a joué » ?), et la conséquence sur la politique de confidentialité.

---

## 6. Le rappel quotidien — en réserve, peut-être jamais

**Décidé : pas de départage au temps, et pas de rappel quotidien pour l'instant.**

Ce que l'analyse a donné, et qu'il ne faudra pas refaire :

* La permission ne se demande **qu'une fois** : un refus est quasi définitif, et
  le web push est assez abusé pour être refusé par réflexe.
* Une notification quotidienne est **du bruit pour qui a déjà joué**. Il faudrait
  n'envoyer qu'aux joueurs qui n'ont pas joué la journée en cours.
* ⚠️ **La charnière de 11 h 30 à Paris et l'heure du joueur ne sont pas la même
  horloge.** Envoyée à l'heure de Paris, la notification réveille New York à
  5 h 30 ; envoyée à midi local, elle est **fausse** à Tokyo, où la journée n'a
  pas encore basculé. La règle qui tient : au **plus tard des deux** — la
  charnière, ou une heure raisonnable chez le joueur.
* « Votre série s'arrête dans 3 heures » convertit mieux que « la question est
  ouverte », et c'est précisément pourquoi il faut y regarder à deux fois :
  fabriquer de l'anxiété pour tenir une habitude est de la même famille que le
  péage que le produit s'interdit ailleurs.

**Et rien de tout ça ne sera vérifiable ici** : ni la permission, ni l'envoi, ni
le rendu. Ce serait la première chose livrée sans qu'aucun passage à l'écran ne
l'ait éprouvée.

---

## Ce que Wordle rappelle

Wordle n'a jamais envoyé une seule notification. Sa régularité tient à trois
choses qu'on a déjà : **la série**, **le partage**, et **un créneau dans la
journée**. Les amis (§5) sont un quatrième levier social, plus fort qu'un rappel
système. Le §6 est le plus faible des leviers et le plus cher en confiance —
d'où sa place, dernière.
