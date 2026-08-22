# Les amis et les notifications — étude préalable

**État : étude ARBITRÉE le 2026-08-22.** L'option A (la tablée) est retenue,
**sans push pour commencer**, et la première notification, le jour où il y en
aura une, sera **la clôture de sa propre journée** — pas l'activité d'un ami. La
tablée est en production depuis le même jour ; §8 ci-dessous garde la trace des
sept décisions et de celles qui restent ouvertes. Écrite avant la première ligne
de code. Elle prolonge `regularite-des-joueurs.md` §5 (la comparaison
avant les amis) et §6 (le push au service des amis), qu'elle ne remplace pas.

Tous les chiffres de production ci-dessous ont été **relevés dans la base**
(projet OpenSM `xwlywozdxlgjwksypzmi`), pas estimés. Les mécanismes attribués à
d'autres produits sont décrits au niveau du MÉCANISME, jamais du chiffre : je
n'ai aucune mesure de leur performance et je n'en invente pas.

---

## 0. Une erreur à ne pas hériter

⚠️ **J'ai écrit trois fois, dans `CLAUDE.md`, dans un en-tête de migration et
dans un message de commit, que « le §6 a écarté les notifications ». C'est
faux.** C'est le **§7** qui a écarté le **rappel quotidien**. Le §6 dit
l'inverse : il *pose* le push, au service des amis, et énonce même la première
notification à envoyer (« Chloé vient de jouer », pas un rappel robotique).

La confusion n'est pas anodine : elle transformait une décision de *séquencement*
(« le rappel, plus tard, peut-être jamais ») en une décision de *principe*
(« pas de notifications »). Les corrections sont faites partout sauf dans le
message de commit, qui ne se réécrit pas.

---

## 1. Ce qu'est réellement un « système d'amis »

Ce n'est pas un objet, c'est **cinq mécanismes séparables**. Les confondre est ce
qui fait qu'on discute d'un chantier de trois mois là où il y en a peut-être un
de trois jours.

| # | Mécanisme | Question qu'il répond | Coût propre |
|---|---|---|---|
| a | **L'identité** | comment on me désigne auprès des autres | ⚠️ le plus cher |
| b | **Le lien** | qui est relié à qui (symétrique, abonnement, groupe) | faible |
| c | **La découverte** | comment on trouve quelqu'un | ⚠️ très cher si annuaire |
| d | **La visibilité** | ce que l'autre voit, et QUAND | moyen |
| e | **La réciprocité temporelle** | même journée, ou historique | faible |

⚠️ **Le coût que le §5 a refusé de payer vient presque entièrement de (a) et
(c)**, pas de (b) ni de (d). Ce que le §5 décrit — « un nom permanent,
découvrable au-delà des gens qui vous ont invité, qui survit à la purge » — est
exactement la conjonction *identité permanente* + *annuaire*. Un lien
d'invitation ne fabrique aucun annuaire, et un nom qui vit dans le groupe ne
fabrique aucune identité permanente.

⚠️ **ET LE TABLEAU DU JOUR VIENT DE RÉSOUDRE (a) ET (c) POUR LE CAS PUBLIC.** Le
nom s'y dépose **par journée** (liste fermée de 600 noms, ou texte libre derrière
un compte), il est purgé à trente jours avec les réponses, et rien n'est recopié
dans le résumé de compte. Il n'existe donc ni profil, ni pseudo permanent, ni
annuaire. **C'est un précédent directement réutilisable** : le nom vit dans le
CONTEXTE (la journée), pas sur la personne. Un système d'amis peut appliquer la
même règle en remplaçant « la journée » par « la tablée ».

---

## 2. Ce que font les autres — au niveau du mécanisme

**NYT Games** (le comparable le plus proche : jeux quotidiens, public familial) a
lancé en 2025 un classement multi-jeux entre amis, couvrant Wordle, Connections,
Spelling Bee et le Mini. Deux traits comptent pour nous :

* ⚠️ **on s'ajoute par LIEN D'INVITATION porteur d'un code, pas par pseudo
  cherchable.** Il n'y a pas d'annuaire à parcourir : c'est (c) résolu au prix
  le plus bas, et c'est exactement ce que le §5 redoutait d'avoir à payer.
* Un compte est exigé, et le parcours passe par l'application.

**Wordle avant le rachat** n'avait **rien** : ni compte, ni amis, ni
notification. Sa régularité tenait à la série, au partage et au créneau
quotidien — les trois choses qu'on a déjà. C'est le rappel, écrit en fin de
`regularite-des-joueurs.md`, qu'un levier social n'est pas une condition de
survie d'un jeu quotidien.

**Duolingo** est l'exemple opposé : amis, ligues, série, et notifications
nombreuses. C'est aussi le produit dont l'usage des rappels est le plus
ouvertement critiqué. ⚠️ Ce que ça enseigne ici n'est pas « ne pas faire », c'est
**le mode de défaillance** : quand la notification devient un canal de relance,
le joueur ne peut plus distinguer l'information de la pression, et il coupe tout
— définitivement, puisque la permission ne se redemande pas (§7).

**Strava** utilise l'abonnement asymétrique (on suit sans réciprocité). C'est le
modèle le moins cher en interaction, mais il suppose un profil public
découvrable — donc (a) et (c) au prix fort. Inadapté ici.

**BeReal** est le seul à faire du push le cœur du produit : **une** notification
par jour, la même pour tout le monde, qui ouvre une fenêtre. C'est le contre-pied
exact de Duolingo, et c'est le modèle le plus proche de ce qu'un jeu à charnière
peut se permettre.

**Ce qu'on retient des quatre** : le lien d'invitation (NYT) ; une notification
par jour au maximum (BeReal) ; jamais un canal de relance (Duolingo) ; et le
rappel que zéro social reste une option viable (Wordle).

---

## 3. Est-ce du même ordre que les espaces de Placet ?

**Même forme, sémantiques opposées.** Un espace et une tablée sont tous deux « un
ensemble de personnes », mais trois propriétés divergent, et chacune interdit la
fusion :

| | Espace / cercle | Tablée de jeu |
|---|---|---|
| **Finalité** | *convoquer* — on demande quelque chose aux membres, avec un engagement de fréquence maximale | *regarder* — personne ne demande rien à personne |
| **Symétrie** | un animateur, `owner_id`, avec un pouvoir sur le roster | plate : personne n'anime |
| **Identité** | l'email, parce qu'il faut pouvoir convoquer (`scrutin_members`) | aucune donnée personnelle — le jeu n'en a aucune aujourd'hui |

⚠️ **Réutiliser les espaces ferait entrer un email là où le jeu n'en demande
pas**, sur une surface dont la politique déclare une tranche d'âge « enfant ».
C'est un recul, pas une économie.

⚠️ **Et le socle des espaces n'est pas exercé** : 3 espaces, 6 membres, et
`cercles-spec.md` relevait déjà « 1 convoqué, 0 auto-inscription, 0 message ».
Le brancher sur le jeu — la seule surface qui a de vrais joueurs — ferait porter
au jeu le risque d'un socle jamais éprouvé, et lui imposerait en retour des
contraintes (anonymat, purge, tranche d'âge) bâties pour des professionnels de
l'immobilier.

**Conclusion : ni fusion, ni second graphe de personnes.** La sortie est un
objet plus petit que les deux — une **tablée** — qui n'est pas un graphe : on
n'est pas ami *avec quelqu'un*, on est *dans une tablée*. Il n'y a alors ni
demande, ni acceptation, ni blocage, ni annuaire : on rejoint par lien, on quitte,
et la tablée meurt avec sa purge.

---

## 4. Les notifications : ce qu'on a déjà, et le mur

### Ce qui est DÉJÀ en production

⚠️ **Le push n'est pas à construire, il existe** — pour les scrutins :
`web-push` et les clés VAPID, `/api/notify/subscribe`, `/api/notify/poll`,
`src/lib/pwa/notify.ts`, le service worker `/sw.js`, et la table
`scrutin_push_subscriptions`, écrite par des RPC gardées par `NOTIFY_SECRET`.
**Deux abonnements réels y vivent, du 12 et du 31 juillet 2026** : le tuyau a
donc déjà servi.

⚠️ **Et la table porte déjà `user_id`**, ce que le §6 exige (« l'abonnement
s'accroche au COMPTE, pas au jeton », sinon effacer ses données tue le jeton sans
tuer l'abonnement, et le joueur reçoit « votre série » alors que le site lui
montre zéro). Ce qui manque n'est pas la plomberie : c'est **le déclencheur, le
contenu, et la décision**.

### Le mur iOS

⚠️ **Sur iPhone, le push web n'existe QUE pour une application ajoutée à l'écran
d'accueil** (iOS 16.4 et plus). Un onglet Safari ouvert ne compte pas, et comme
tous les navigateurs d'iOS utilisent WebKit, aucun n'y échappe.

Conséquence directe, et elle est structurante : **sur iOS, notifier suppose
d'avoir fait installer la PWA**. `InstallJeu` existe et l'offre est déjà dans
l'échelle de priorité du §0 — mais elle passe alors du statut de confort à celui
de **prérequis**, ce qui change son rang dans cette échelle.

### Quand une notification doit arriver

Cinq règles, dont trois viennent du §7 et deux de l'analyse ci-dessus :

1. **Une par jour et par joueur, au maximum.** Le modèle BeReal, pas le modèle
   Duolingo.
2. **À la CLÔTURE, pas à l'ouverture.** On annonce une fin, jamais une tâche :
   « votre journée n° 12 est close, 14 % ont fait mieux » est une information
   qu'on ne peut obtenir autrement ; « la question du jour est ouverte » est une
   relance, et c'est ce que le §7 a écarté.
3. **Au plus tard des deux** : la charnière de 11 h 30 à Paris, ou une heure
   raisonnable chez le joueur. ⚠️ Le §7 le posait pour le rappel ; c'est
   **beaucoup plus sûr pour une clôture** — un résultat arrêté reste vrai à
   n'importe quelle heure, alors qu'un rappel envoyé avant la bascule locale est
   littéralement faux à Tokyo. Cette asymétrie rend la notification de clôture
   moins risquée que celle que le §7 a refusée.
4. **Seulement à qui a joué la journée close.** Notifier un résultat à quelqu'un
   qui n'en a pas est un rappel déguisé.
5. ⚠️ **Jamais « X vient de jouer » en temps réel.** C'est pourtant la
   proposition du §6, et c'est le point où je diverge de l'étude : avec sept amis,
   c'est sept notifications par jour à des heures imprévisibles — exactement le
   mode de défaillance de Duolingo. La bonne forme est **agrégée et quotidienne** :
   « 5 de vos 7 amis ont joué ». L'intention du §6 (une raison d'accepter, pas une
   raison de refuser) est juste ; sa forme ne l'est pas.

---

## 5. Faut-il une vraie application mobile ?

**Non, et pas pour la raison qu'on croit.** Techniquement, la PWA suffit : push
direct sur Android, push sur iOS dès que l'app est installée à l'écran d'accueil.
Le manque n'est pas une capacité, c'est un **taux d'installation**.

Ce qu'une application des magasins achèterait : un push fiable sans étape
d'installation, une pastille de badge, et une découverte par le magasin. Ce
qu'elle coûterait :

* une chaîne de publication et une revue par plateforme, à tenir en **quatre
  langues** comme le reste ;
* deux surfaces de plus à garder en parité avec le web ;
* ⚠️ **et surtout, elle contredit le modèle de distribution du produit.** Tout
  circule ici par LIEN — le partage, le QR, l'invitation, le tableau. Une
  application est un mur devant un lien : l'ami à qui on envoie une tablée doit
  installer avant de voir. C'est la propriété « pas un cul-de-sac » du §0, prise
  à l'envers.

**Verdict : pas d'application maintenant.** La question se rouvre sur une mesure,
pas sur une intuition : le taux d'installation de la PWA chez les joueurs
quotidiens, et la part d'iOS. Aucun des deux n'est mesuré aujourd'hui — et
`trackVisit` saurait le faire.

---

## 6. Ce que la mesure dit du séquencement

Relevé en base le 2026-08-22 :

| Quoi | Combien |
|---|---|
| Jetons ayant joué le format « mots » | **11** |
| Jetons ayant joué le format chiffré | **7** |
| Journées parues (mots / chiffré) | **2 / 1** |
| Comptes rattachés à Banalo | **2** |
| Comptes du produit entier | **3** |
| Noms déposés au tableau du jour | **1** |
| Joueurs de Cinq sur cinq avec compte | **2** |
| Abonnements push (scrutins, juillet) | **2** |

⚠️ **Il n'y a pas encore de foule à qui présenter des amis.** Un système d'amis
n'a de valeur qu'à partir de deux ou trois amis par joueur ; à onze joueurs, le
produit entier tient dans une seule tablée. Construire le graphe maintenant,
c'est optimiser un mécanisme que personne ne peut peupler.

⚠️ **Mais ce n'est PAS un argument pour ne rien faire — c'est un argument sur
quelle moitié construire.** Une tablée a deux faces : **l'invitation**, qui
FABRIQUE la foule, et **le classement**, qui en a BESOIN. À onze joueurs, la
première fonctionne et la seconde est vide. Autrement dit, **à ce stade la
fonctionnalité « amis » EST la fonctionnalité d'acquisition** — et `InviterBanalo`
existe déjà : la tablée en est la suite naturelle, « voici notre tablée » au lieu
de « voici le jeu ».

---

## 7. Trois options, et une recommandation

**A. La tablée** *(recommandée)*. Une salle qu'on rejoint par lien ; un nom **par
tablée**, selon la règle du tableau du jour (liste fermée, ou texte libre derrière
un compte) ; on y voit qui a joué aujourd'hui et son résultat, **pour les seules
journées qu'on a soi-même jouées** ; aucun graphe, aucune demande d'ami, aucun
email ; purge à trente jours comme le reste. Push facultatif, une fois par jour.

**B. Le graphe d'amis** *(façon NYT)*. Plus complet, et c'est le seul qui franchit
la ligne du §5 : identité durable, découverte, modération à inventer.

**C. Rien de plus que la comparaison actuelle**. Déjà construit, coût nul, ne
grandit pas.

⚠️ **A est la seule option qui n'ajoute AUCUN des coûts du §5**, et pour une
raison précise : le nom vit dans la tablée et meurt avec elle, exactement comme le
nom du tableau vit dans la journée. Les trois propriétés qui rendent l'absence de
modération tenable — on entre par code, l'objet est jetable, tout s'efface — sont
conservées les trois. C'est ce qui la distingue de B, qui les retire toutes.

---

## 8. Les sept décisions — cinq prises, deux ouvertes

1. ✅ **Tablée**, pas graphe.
2. ✅ **Le nom vit dans la tablée**, règle du tableau du jour (liste fermée sans
   compte, texte libre derrière un compte).
3. ✅ **On voit un nom, une présence, un score — jamais le détail.** Le format
   « mots » fuirait : voir la grille d'un ami, c'est recevoir six réponses. Et
   rien du tout tant qu'on n'a pas joué soi-même, garde tenue EN BASE.
4. ✅ **Tablée plate**, ordonnée par résultat mais sans numéro de rang — Banalo
   récompense d'être BANAL, pas d'être bon.
5. ⏳ **Push : pas maintenant.** Décidé. Reste à décider QUAND l'allumer, et le
   §4 dit déjà quoi envoyer : la clôture de sa propre journée, une fois par jour,
   au plus tard des deux horloges, seulement à qui a joué.
6. ✅ **Le texte libre n'existe que derrière un compte** — un jeton anonyme ne se
   bannit pas. Tenu par une contrainte de table, pas par du code d'écran.
7. ✅ **La politique de confidentialité** a été réécrite dans le même commit.

**Et une décision qui n'était pas dans la liste** : les ABONNEMENTS PAR TYPE de
notification (« la clôture oui, les amis non »). Rien de ce qui est construit ne
les empêche — `scrutin_push_subscriptions` porte déjà `user_id`, et une table de
préférences se pose à côté le jour venu. ⚠️ Mais si le push s'allume un jour SANS
cette table, il faudra la poser AVANT le deuxième type de notification, jamais
après : un abonnement global qu'on découpe ensuite oblige à deviner ce que les
gens avaient accepté.

---

## 9. Ce qui ne sera pas vérifiable ici

* **Rien du push** : ni la permission, ni l'envoi, ni le rendu. Les clés VAPID
  ne sont pas dans `.env.local`, et le §7 l'avait déjà écrit — ce serait la
  première chose livrée sans qu'aucun passage à l'écran ne l'ait éprouvée.
* **Le mur iOS** ne se constate qu'avec un vrai iPhone.
* **La tablée elle-même**, en revanche, se vérifie comme le reste des jeux : sans
  compte, au navigateur, en interceptant les RPC — à condition de bloquer le
  service worker.
