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
| compte, pas installé ou pas abonné | **être prévenu** — ou installer, quand c'en est le prix |
| compte, installé, ne connaît pas Placet | **un vrai scrutin public, votable sur place** |
| au-delà | rien — puis, plus tard, l'activité de ses amis |

⚠️ **LE TROISIÈME BARREAU A CHANGÉ DE MÉTIER, ET C'EST MESURÉ.** Il ne demandait
que l'installation — un engagement sans contrepartie visible, sur une icône qui
ouvrait l'accueil de Placet. La NOTIFICATION est le seul mécanisme du produit qui
FABRIQUE un retour au lieu de l'espérer, et elle ne vivait que sur
`/games/quotidien`, la page que les joueurs ne visitent pas : elle n'atteignait
donc personne. Les deux sont FUSIONNÉES dans `InstallJeu`, jamais empilées — ce
créneau n'admet qu'une demande. ⚠️ Sur iOS elles n'en font qu'une : le push web
n'y existe que pour une application posée sur l'écran d'accueil, donc
« installer » EST « être prévenu », ce qui donne enfin une raison à une demande
qui n'en avait pas. Ailleurs, le push marche sans installer, et c'est lui qu'on
propose. ⚠️ Les réglages, eux, RESTENT sur `/games/quotidien` : une offre se
présente là où le joueur est, un réglage se retrouve là où on le cherche.

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

## 5. La comparaison AVANT les amis — et pourquoi on s'arrête là pour l'instant

⚠️ **CONSTRUIT : la comparaison sans graphe** (`lib/games/comparaison.ts`). Le
lien de partage porte la journée et le résultat de celui qui partage ; l'ami qui
l'ouvre, **une fois qu'il a joué**, voit les deux côte à côte. Pas de pseudo, pas
d'invitation, pas de fil d'activité, pas de modération.

C'est déclaratif, donc falsifiable — et ce n'est pas un défaut : personne ne
vérifie non plus une grille Wordle collée dans un groupe. C'est une conversation
entre gens qui se connaissent, pas un classement officiel.

Trois règles d'affichage, toutes payées :

* **Rien avant d'avoir joué.** Le score d'un ami ne divulgue rien (il est
  relatif à la foule), mais il ancre et met une pression que le jeu ne demande
  pas.
* **Jamais une autre journée que celle en cours** — un lien ouvert le lendemain
  le dit et invite à jouer aujourd'hui.
* **Pas de nom.** « Votre ami » plutôt qu'un pseudo : le fil de conversation où
  le lien a circulé dit déjà de qui il s'agit, mieux qu'un pseudo qu'on aurait
  stocké.

⚠️ **Deux défauts trouvés en construisant, et aucun ne se voyait à la relecture :**

* `Number(null)` vaut **zéro**, pas `NaN`. Un lien portant la journée sans le
  score passait donc tous les contrôles de borne et affichait « votre ami :
  0,0 ». Trouvé par le test.
* Cinq sur cinq partageait `window.location.href`. Une page ouverte depuis le
  lien d'un ami porte SON résultat : repartager `href` renvoyait **le score de
  l'ami sous notre nom**, en silence. On repart du chemin nu.

### Le système d'amis proprement dit : pas maintenant

`20260818-jeu-pays-resultats.sql` a refusé cette décision par écrit — « un
tableau nominatif demanderait un pseudo public et un consentement […] elle n'est
pas prise ici ». Ce qu'elle coûte, et qu'il faudra assumer le jour où on la
prend :

⚠️ **Deux de ces coûts avaient d'abord été énoncés à tort comme nouveaux.**
L'identité publique et le classement nominatif **existent déjà** : les jeux de
salle demandent un prénom montré à tous, `PlayerBoard` classe les joueurs par
nom, et Alibi produit des accusations qui désignent nommément quelqu'un. La
visibilité des données de jeu par d'autres n'a rien d'inédit non plus.

**Ce qui change avec des amis n'est donc pas l'identité, c'est son échappée hors
de la salle.** Les jeux de salle se jouent EN PRÉSENCE, entre gens qui se gèrent
— la modération, c'est le groupe, de vive voix. Trois propriétés la rendent
possible : on entre par code, la salle est jetable, tout s'efface en sept jours.
Un système d'amis retire les trois d'un coup : un nom **permanent**, **découvrable
au-delà des gens qui vous ont invité**, et qui **survit à la purge** — et les amis
sont par nature distants et asynchrones, donc hors de portée du seul mécanisme de
régulation qui existe aujourd'hui.

* **La persistance et la découvrabilité du nom**, sur des jeux dont la politique
  déclare une tranche d'âge « enfant ». C'est le vrai coût, et il n'a pas de
  contrepartie dans le modèle actuel.
* **Une visibilité SANS acte à chaque fois.** Aujourd'hui montrer son résultat à
  quelqu'un demande de le lui envoyer — un destinataire, un geste. Un fil
  d'activité est une visibilité permanente et ambiante ; c'est ça, le changement
  de catégorie.
* **Le format « mots » fuit** : voir la grille d'un ami, c'est recevoir six
  réponses. Le détail d'un ami ne peut être visible que pour les journées qu'on
  a soi-même jouées.
* **Un classement nominatif PERMANENT** — le produit en a déjà un dans les
  salles, mais une salle est un contexte choisi, borné, d'un soir. Un palmarès
  d'amis est ambiant et sans fin, et Banalo récompense d'être BANAL, pas d'être
  bon. La sortie proposée : une **tablée** — qui a joué aujourd'hui — et non un
  palmarès.
* **Un second graphe social.** Placet sert à décider en groupe, et ce groupe est
  déjà modélisé par `/espaces`, en production. Construire des « amis » à côté,
  c'est maintenir deux réseaux aux sémantiques différentes. Si social il y a, il
  faudrait réutiliser les espaces — mais ils appartiennent à la session tableau
  de bord : ça se coordonne, ça ne se prend pas.

**Trois décisions à prendre avant la première ligne** : tablée ou classement,
pseudo public ou réutilisation des espaces, et qui modère.

## 6. Le push — au service des amis, pas du rappel

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

## 7. Le rappel quotidien — en réserve, peut-être jamais

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
