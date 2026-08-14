# LA NUIT DU FANTÔME — spécification

Quatrième jeu de la salle Placet, et **v2 du jeu de soirée**. Slug `fantome`,
route `/games/fantome`, emoji 👻. Il **remplace** Rôdeurs (`docs/rodeurs-spec.md`)
à la même entrée de catalogue au lancement — pas de coexistence.

> **L'affiche.** Ce soir, le gîte devient le manoir de l'oncle Barnabé, disparu
> en ballon, et son testament vous réunit tous. Mais un Fantôme rôde dans les
> couloirs pour faire fuir les héritiers — et c'est l'un d'entre vous. Éteignez
> les grandes lumières, tendez l'oreille au glas, et arrachez-lui son masque
> avant minuit.

## 1. Pourquoi ce jeu existe

Rôdeurs v1 a été mesuré, attaqué, corrigé — et le fondateur a tranché : « la v1
ne suscite pas d'envie ». Le diagnostic est écrit noir sur blanc dans la mémoire
du projet : **optimisé sur le mesurable, sous-investi sur le désirable.** La v1
reste en production, elle ne sera pas testée, elle ne recevra plus un jour de
travail.

La v2 renverse une hypothèse : **c'est un JEU-ÉVÉNEMENT.** Quinze à vingt minutes
de préparation de la maison (draps sur les meubles, bougies LED, appareils posés
dans les pièces) ne sont pas une friction — c'est la bande-annonce de la soirée,
comme pour une murder party. Tout le reste du catalogue Placet se lance en dix
secondes ; celui-ci se prépare, et l'assume.

**Le fantasme a été choisi par un test d'affiche, avant la mécanique** — la règle
que la v1 n'avait pas suivie. Un gîte la nuit *est* un manoir ; il ne sera jamais
une station polaire ni un musée. Et quand le masque tombe, l'app affiche au
Fantôme sa tirade à déclamer : c'est le seul moment du catalogue où **perdre est
un cadeau**.

## 2. Ce qui ne change pas

| contrainte | tenue par |
|---|---|
| personne n'est éliminé | la mise en lumière ne retire personne du jeu |
| aucun meneur *pendant* la partie | aucun verbe d'hôte ; un **préparateur** avant la partie est accepté — préparer n'est pas animer |
| pas de phase les yeux fermés | chaque secret vit sur son écran |
| jouable à 8 ans, l'enfant peut gagner | les bandes d'âge changent la **forme** de la consigne, jamais sa **valeur** |
| supporte les interruptions | pas d'horloge ; « je vais me coucher » sort proprement |
| score sans aucune soustraction | plancher structurel à 0 |

## 3. La boucle

**Matériel.** 2 à 5 bornes = n'importe quel navigateur posé, branché, plein
écran. Bon à 3, dégradé proprement à 2.

**La borne est un ÉCRAN-BALISE, jamais un guichet.** Elle affiche le cadre doré,
l'œil, et un code tournant (20 s, dérivé serveur — aucun état stocké). Tout se
joue sur le téléphone. ⚠️ Ce renversement n'est pas une préférence, c'est une
contrainte chiffrée : 11 joueurs × 3 tâches × 90 s = **49 min de borne-temps par
manche** contre **24 min de capacité** si les bornes étaient exclusives.

**Les rôles à 11** : **UN seul Fantôme** (deux saboteurs mesurés à 19,6-36,6 % —
écartés), un **complice muet** (partage la victoire, ne sabote jamais), et **2
héritiers à clause secrète**. Soit 4/11 ≈ le tiers de menteurs mesuré
(73/59/40 % de victoires du village selon aucun / un tiers / deux tiers).

**Les rondes.** 3 par joueur et par manche, mini-jeu de ~90 s sur le téléphone
exigeant le code de la balise au début, au milieu, à la fin (cadence ≤ 30 s : une
escapade est physiquement impossible). Rethémées « saluer le portrait »,
« relever le courrier de l'aile ouest » — c'est ce qui rend le geste de borne
**routinier**, donc non incriminant.

**Une ronde sur trois est une RONDE À DEUX** (§4).

**La hantise.** La charge **s'amorce toute seule**, à un instant tiré par le
serveur — mesure décisive : instant libre = 19,5 % de victoires du village,
charge instable à 45 s = 54,8 %. Le Fantôme a 45 s pour entrer le code d'une
borne sur SON téléphone. **Le glas est différé de 1 à 3 min** (« le manoir met du
temps à sentir l'outrage ») : tous les portraits vacillent, écran noir-bougie,
glas. ⚠️ Ce différé n'est pas décoratif — sans lui, le vacillement immédiat
horodate publiquement le sabotage et grille le Fantôme dès la manche 1.

**L'exorcisme.** ~45 s devant le portrait hanté à taper les codes qu'il égrène.

**La jauge du testament.** Pleine à la manche 4 = victoire directe des héritiers.
C'est elle qui force le quota de hantises, donc le débit d'information.

**La réunion.** Le Grand Portrait sonne le glas, tous les portraits affichent —
la clôture n'est plus lue en silence sur onze écrans. Pour chaque hantise : la
fenêtre, les blanchis, les sans-alibi. ⚠️ **Supprimés délibérément** : le
projecteur « dernier utilisateur de la borne » (le Fantôme évite précisément
d'être ce dernier, donc il désigne presque toujours un innocent) et tout cumul de
suspicion par joueur. Le recoupement reste humain. Vote à la pluralité, mise en
lumière, personne n'est éliminé. 4 manches.

**Le dénouement.** Compte à rebours sur le Grand Portrait, le masque tombe, la
tirade est déclamée — par le Fantôme vaincu (« Et j'aurais réussi, sans vous,
maudits héritiers ! ») ou victorieux (« Ce manoir est à MOI »). Puis l'album (§5).

## 4. Les rondes à deux — et ce qu'elles coûtent

**Le défaut qu'elles réparent.** Une borne-balise affiche un secret que
n'importe qui peut relayer : un téléphone posé en appel vidéo, ou un enfant qui
lit les codes à voix haute pour aider. C'est une **régression sur la v1**, où un
`meet` exigeait la coopération témoignée d'un autre joueur. Une ronde à deux
remet le témoin humain *dans* la mécanique.

**La forme.** Une ronde sur trois (**p = 1/3**), à la borne, **partenaire libre —
le serveur n'apparie personne.** L'appariement serveur a été prouvé
*combinatoirement infaisable* à 7 joueurs sur 4 manches (énumération exhaustive
des 105 partitions {3,2,2}), et il offrait au Fantôme des certificats d'innocence
gratuits. Les deux joueurs échangent leurs sceaux ; **l'arête ne s'écrit que si
les deux ont signé dans le même tic**. Sceau **éphémère (90 s)** — celui de la v1
est permanent, donc moissonnable une fois pour la soirée. Plafond de **2 fois le
même partenaire par nuit**.

**L'anti-clique est recopié tel quel de `rodeurs_meet`** : entre traîtres, rien
ne s'écrit, **et l'écran affiche le même succès**. Mesuré 0,5 % en v1, en prod,
ça ne fuit rien.

**POURQUOI p = 1/3, et pas la raison qu'on croyait.** Le simulateur d'origine
était **truqué par deux bugs de sens opposé** (le Fantôme ajouté d'office à la
liste des suspects, et sa position jamais réécrite après déplacement, donc
ubiquitaire) — quatre autres défauts ont été trouvés à la réparation, dont un
appariement par le serveur qui mesurait un jeu qu'on avait déjà écarté. La vraie
amplitude du couple de bugs est un **renversement de 40 points**.

Sur les chiffres honnêtes, p = 1/3 fait **baisser** le village (2,4 ± 0,8 pt à
11 joueurs) — mais il **tient mieux la barre** : sur les quatre coins du domaine
d'incertitude (vision du Fantôme × qualité du dépouillement), p = 1/3 est dans la
bande 40-60 % dans **10 cellules sur 12**, p = 0 dans **6 sur 12** — parce que
p = 0 sort par le **haut**. Une barre est une bande : « plus bas » n'est pas
« plus loin ». Au-delà, p ≥ 1/2 est disqualifiant (38 % / 30 % / 17 %).

Le mécanisme de la perte est mesuré, et ce n'est pas celui qu'on craignait : pas
la capacité (les rondes à deux l'**améliorent** — deux joueurs n'occupent qu'un
poste), mais la **synchronisation**. Se donner rendez-vous met les corps au même
endroit au même moment, et l'attente n'écrit rien : les suspects par hantise
passent de 7,4 à 10,0 sur 11. *Un jeu où tout le monde est toujours possible
partout n'a plus rien à déduire.*

Elles restent défendables sur l'argument social — *relayer un pacte, c'est
signer, donc s'inscrire* — et sur la tenue de bande. Ce qu'elles n'achètent
**pas**, contrairement à ce que le cadrage annonçait : une protection contre le
relais à p = 1/3.

**⚠️ L'« ALIBI DE PAPIER » NE DOIT PAS ÊTRE CODÉ.** Le croisement automatique
« présence de borne sans aucun témoin humain » était la pièce maîtresse du
cadrage. Mesuré : il **nuit** au village (42,7 % avec, 45,8 % sans) parce qu'il
marque un innocent **32,7 % des nuits** contre 3,4 % pour le Fantôme. Aucune
fenêtre d'agrégation ne le sauve. C'est le troisième avatar de la même faute —
un indice automatique qui désigne celui qui n'a pas de traces, c'est-à-dire
l'enfant qu'on vient de coucher.

**⚠️ « QUI T'A LAISSÉ TOMBER EN PLEINE RONDE ? » NON PLUS.** Le levier semblait
rapporter +11 pt au village. Il était alimenté par un oracle : dans le modèle,
seul le Fantôme abandonnait jamais une ronde. Contre-test construit et mesuré —
il suffit qu'un innocent lâche **un cinquième** de ce que lâche le Fantôme pour
que le levier change de signe (−7,6 pt), et **−38,8 pt à parité**. Avec des
enfants de 8-12 ans, ce n'est pas une hypothèse. Ce qui reste vrai est un
constat, pas une règle : *si* le Fantôme renonce à lâcher ses rondes, le village
gagne ~10 pt.

**✅ CE QU'IL FAUT CODER À LA PLACE : départager les ex æquo par le nombre de
rondes MENÉES À TERME.** L'information est déjà au registre, elle ne coûte rien,
elle n'ajoute aucune règle à expliquer — et elle rapporte **+7 pt à p = 1/3**
(jusqu'à +15,6 à p = 0). Le Fantôme en a mécaniquement moins : il interrompt des
rondes pour hanter.

**Le vrai risque n'est pas le Fantôme étouffé** (5 hantises sur 5 à tout réglage)
**mais le Fantôme introuvable** : un partenaire complaisant sur quatre fait
tomber le réglage de 55 % à 24,3 %. D'où : investir dans l'économie de la
complaisance, pas dans la surveillance. Et le dire aux joueurs, en clair :
**une signature ne blanchit personne, elle place un témoin.**

**⚠️ LE PROBLÈME DE CONCEPTION OUVERT, ET IL FAUT LE DIRE : LE RELAIS.** C'est
le seul point dont l'adversaire n'a entamé ni le sens, ni l'ordre de grandeur,
ni la forme. Un Fantôme qui relaie gagne +40,9 pt à p = 1/3 (village à 1,8 %), et
**il n'existe aucune valeur de p où le village tienne la barre ET résiste au
relais** : la courbe ne s'effondre qu'entre 2/3 et 1, c'est-à-dire là où la
déduction est déjà morte (30 % puis 17 %). La posture assumée est celle de la v1
— on ne ferme pas techniquement ce qui se filme ; on le rend social, visible et
coûteux. Le modèle est par ailleurs un **plancher catastrophiste** : il ne price
pas « quelqu'un remarque que Zoé lit les codes à voix haute », et près d'une
tentative de relais sur deux est déjà physiquement impossible (chevauchement, ou
deux bornes trop éloignées dans le temps).

**Le matériel pèse plus que p — c'est le réglage à défendre avant la première
soirée** : **3 bornes minimum**, 5 si possible (+12 pt), 2 bornes −18 pt, et
surtout **deux postes de lecture par borne obligatoires** — à un seul poste le
jeu est disqualifié (26 %, la moitié des rondes jamais jouées). Le plafond de
partenaires, lui, se vend comme règle sociale : son effet mesuré (1,7 pt) est
dans le bruit.

## 5. Les photos et l'album

**Décision du fondateur : les photos avec visages sont dans le jeu, parce
qu'elles ne sont pas persistées en dehors de la session.** Tout ce qui suit
existe pour rendre cette phrase *vraie*.

**La photo est un TROPHÉE, jamais un alibi.** Elle rapporte des points, exige un
corps, et ne produit **aucune ligne d'enquête, aucun lieu, aucun témoin**. Le
protocole de contreseing photo initialement proposé a été écarté : il n'ancre
aucun lieu, il est donc strictement plus faible que la borne — et il promeut
l'enfant de 8 ans d'aide involontaire à **faux témoin nommé**.

**Capture : `getUserMedia` + `canvas`. Jamais `<input capture>`.** Vérifié sur
sources, puis contre-vérifié URL par URL :
- iOS : `<input capture>` ne verse rien dans la pellicule — d'accord.
- **Android : indémontrable.** Chromium conserve un JPEG en clair **jusqu'à une
  heure** dans son stockage privé, et surtout l'app photo du constructeur peut
  écrire sa propre copie dans DCIM (cas documenté, jamais résolu). Au gîte, onze
  téléphones = plusieurs marques.
- `getUserMedia` : l'app photo n'est jamais lancée, **aucun fichier n'est créé
  nulle part**, et il n'y a jamais eu d'EXIF (la source est une frame vidéo). La
  promesse devient une propriété de l'architecture, pas une observation.
- Contraintes : HTTPS obligatoire, plancher **iOS 14.5**, flux ouvert **au moment
  de la prise** puis `track.stop()` immédiat (batterie, arrière-plan). Prompt
  caméra à scénariser au salon, pas en plein tour de manche.

**Effacement : à l'EXPOSITION, pas à la sortie.** Chaque photo est supprimée
d'IndexedDB **dès que sa vignette d'album s'est éteinte** — le `delete` part
pendant que la pièce rit. ⚠️ Une purge au démarrage ne s'exécuterait jamais dans
le cas nominal (on joue une fois, en vacances, sur le téléphone d'un enfant, et
l'app n'est plus rouverte), et **le nettoyage automatique du navigateur exempte
les applications installées**. Le TTL court reste un filet pour un seul cas : la
partie abandonnée avant l'album.

**AUCUN VOTE À L'ALBUM — la simplification qui règle le problème à la racine.**
Le cadrage prévoyait un vote sur des *rangs* plutôt que sur des noms, pour éviter
qu'un bulletin « la meilleure ? [Malo] [Inès] » ne publie celui qui a passé son
tour. À l'écriture, la meilleure réponse s'est révélée plus simple : **enlever le
bulletin**. La pièce dit tout haut laquelle elle préfère — ce qu'aucun logiciel
ne fait mieux — et le problème disparaît au lieu d'être maquillé. Moins de code,
moins de surface, et rien à expliquer.

**Le respect, sans meneur ni compte.** Un choix personnel au salon — « je préfère
être derrière l'objectif » — qui ne coûte **aucun point**, réversible en silence
et sans confirmation depuis n'importe quel écran (pour qu'un enfant puisse défaire
en trois secondes ce qu'un adulte a coché pour lui).

⚠️ **Il n'existe AUCUN droit au retrait rétroactif, et il faut l'écrire.** Une
photo déjà prise dort sur trois autres téléphones ; rien ne relie une image aux
personnes qu'elle contient, et rien ne circule entre appareils. Le seul recours
est social : un verbe de salle qui affiche, avant chaque révélation, « Léa est
passée derrière l'objectif — si elle est sur ta photo, ne la lève pas. » Le salon
doit dire, dès la première seconde : *« Tu peux changer d'avis quand tu veux. Les
photos déjà prises, elles, existent déjà. »*

⚠️ **Le rôle protège la PIOCHE, pas la PERSONNE** : l'exposition vient des cartes
des autres. Règle à coder : **une mission à N tiers ne sort que si (joueurs
« devant » − 1) ≥ N + 2** — sinon chaque carte devient une convocation nominative
de ceux qui ont dit non. Et le vivier doit compter **une vingtaine de cartes
strictement sans personne** (objets, traces, ombres), pas huit.

**Règles de contenu**, à tenir carte par carte : jamais une personne nommée ;
rien qui touche au corps, au vêtement ou au contact ; **jamais une mécanique
d'exclusion** (« pas une personne de plus » oblige à dire non à l'enfant qui
arrive) ; jamais de responsable désigné de l'échec (« le premier qui bouge fait
rater la photo ») ; pas de prise unique (elle garantit la version où quelqu'un a
la bouche ouverte — le mécanisme même de la moquerie) ; pas de terreur jouée en
fin de soirée chez les petits (le dépôt a déjà consigné que l'ambiance macabre
leur pose problème).

**Ce que le serveur sait vraiment**, et qu'il faut écrire sans le nier : **qui a
rempli quelle mission, et quand** — à côté de `band`, la tranche d'âge déclarée
et publique par conception. Donc « un enfant de 8-12 ans a rempli la mission
photo n° 9 à 21 h 47 », conservé 7 jours comme le reste de la salle. Ce n'est pas
une image, mais ce n'est pas rien.

**L'album.** Le verdict tombe ; sans que personne ne déclenche rien, les onze
téléphones basculent ensemble : « L'ALBUM — tenez vos téléphones ». L'app annonce
une **mission**, jamais un joueur : « LE PORTRAIT D'ANCÊTRE — quatre binômes s'y
sont essayés. » Les porteurs allument en même temps, plein écran, luminosité au
maximum ; les autres écrans affichent la consigne, que la pièce lit à voix haute.
Le rire vient de la comparaison. 20 s par cliché, 6 à 10 min à onze. Aucun bouton
de partage, nulle part. Trois replis à coder : **zéro photo pour une mission** →
on saute en silence, jamais d'appel déserté ; **porteur parti avec son
téléphone** → « Cette photo est repartie avec Malo », on enchaîne ; **zéro photo
du tout** → l'album se replie sur l'appel des binômes de la nuit.

## 5 bis. Le moteur de paquets

**Un paquet ne touche à aucune règle et ne sait jamais qui est le Fantôme.** Il
déclare le vivier de cartes photo et des **haltes** — de courtes annonces qui
tombent en plein écran au début d'une manche ou à la réunion. Le moteur reste
génératif (rôles, instants, tirages) ; le paquet ne scripte que le décor. C'est
ce qui rend le jeu rejouable, et ce qui doit faire coûter le paquet 2 (« Le Casse
du Musée ») une semaine plutôt qu'un mois.

**Vocabulaire d'effets FERMÉ**, et c'est la règle qui empêche un paquet de
devenir un langage : `ANNOUNCE`, `SNAPSHOT`, `PHOTO_CALL`, `LAST_CALL` — tous à
zéro mécanique. `RUSH` et `CONVERGE` attendent d'être simulés ; `BLACKOUT` et
`DIAL` sont **écartés** (le premier peut recréer le trou d'alibi qui a coûté 44 %
d'accusations à tort, le second touche au curseur du tiers de menteurs).
**Un verbe d'effet nouveau est du travail moteur, pas du travail de paquet.**

Déclaration : une ligne dans `scrutin_game_fantome_packs` (jsonb) + quatre
fichiers dans `src/content/packs/<pack>/`, **hors i18n** — leurs clés sont lues
par une variable, donc invisibles au contrôle de parité, et `packs.test.ts`
tient ce rôle à leur place.

⚠️ **Fenêtre de charge resserrée à T+2,5 → T+7 min**, trouvé en éprouvant le
paquet : `game_reveal` refuse de clore tant que la charge n'a pas parlé, donc une
maison qui avait fini ses rondes en cinq minutes attendait cinq minutes de plus
devant un bouton qui répond « pas encore ».

## 6. Le socle

**Porte tel quel** : salle à code sans compte, joueurs, bandes d'âge, `left_at`,
rôles dans `secret` (le client de l'hôte est aveugle), verbes sans hôte, `meets`
et son index `least/greatest`, `missions`, sceaux, RLS zéro policy + revoke,
purge 7 jours, i18n 4 langues à parité, contenu hors i18n (précédent en prod).

**Manque** : table des bornes (pièce, secret d'appairage, heartbeat) ; présences
par **intervalles** (`meets` est par paire, inutilisable ici) ; amorçage des
charges par **tirage paresseux à la lecture** (jamais de cron) ; quota recalculé
serveur sur perte de heartbeat — **une borne débranchée est traitée COMME une
hantise**, sinon le trou physique redevient une non-action ; croisement « alibi
de papier » cumulé sur la nuit ; page `/borne` ; moteur de paquets.

**Le préparateur ne doit obtenir aucun oracle** : le secret d'appairage n'est
jamais dans l'URL (localStorage, posé une fois), les codes sont calculés serveur
et servis à la seule session appairée, ré-appairage forcé au rechargement.

## 7. Ce qu'on ne sait pas

- **Le taux réel du village avec rondes à deux** : le simulateur est en cours de
  réparation. Aucun chiffre de cette section n'est acquis tant qu'il n'a pas
  reproduit les repères de la v1 (40,8 % contre le piégeur, 54,8 % contre le
  noyeur).
- **Le banc matériel** : veille des vieux navigateurs, audio du glas armé après
  rechargement, simultanéité du vacillement sur wifi de gîte. Non vérifiable en
  CI — il faut les vrais appareils.
- **Le test d'affiche à une vraie tablée**, et deux parties d'essai à la main.
  Aucun simulateur ne mesure l'envie. C'est la leçon de la v1, et elle reste
  entre les mains du fondateur.
