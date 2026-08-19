# LA NUIT DU FANTÔME — ambiance et textures de ronde

État au **2026-08-19**. Ce document n'est **pas** une spec : `docs/fantome-spec.md`
reste la référence des règles. Celui-ci consigne ce qui a été posé pour donner du
goût au jeu, ce qui a été **refusé et pourquoi**, et ce qui reste ouvert — pour
qu'on ne refasse pas trois fois les mêmes arbitrages.

---

## 1. Le problème traité

Une ronde dure **90 secondes** dont la consigne est : « tape son code, et
reste-là. Il faudra le retaper de temps en temps. »

Mécaniquement c'est juste — la cadence ≤ 30 s rend une escapade physiquement
impossible. Mais **vécu, c'est un contrôle de présence**. Le joueur est debout
devant un tableau, dans une pièce, pendant une minute et demie, et il n'a rien.
C'est là que le jeu perdait son goût.

Trois joueurs × 3 rondes × 4 manches : ce vide est l'expérience majoritaire du
jeu, pas un interstice.

---

## 2. Ce qui est en production

| quoi | commit | où |
|---|---|---|
| Dix portraits SVG, un par pièce, qui clignent des yeux à intervalles décalés | `874b885` | `components/games/fantome/Portraits.tsx` |
| Murmure de pièce + douze murmures de manoir, rotation 25 s, quatre langues | `31a7dce` | `lib/games/fantome/murmures.ts` |

**Le portrait est en SVG en ligne, pas en image.** Zéro requête réseau — même
choix que le glas, qui est synthétisé et non chargé. Dans une maison au wifi
capricieux, c'est une propriété, pas une coquetterie. Un emoji rendu par la
police système donnait à l'objet le plus atmosphérique du jeu une tête
différente sur chaque appareil.

**La rotation est à 25 s, pas 20.** Le code tourne toutes les 20 secondes ; au
même rythme les deux battraient ensemble et l'écran ressemblerait à un panneau
d'affichage qui se rafraîchit. Décalés, ce sont deux choses qui vivent
séparément.

**Le cadre doré ne serre que la peinture.** Il enveloppait aussi le nom de la
pièce et le code : sur une tablette en paysage, ça donnait un grand panneau doré
aux trois quarts vide, qui ne ressemblait surtout pas à un tableau accroché au
mur. Le reste vit sur le mur noir en dessous.

---

## 3. Les deux règles qui ne se négocient pas

### La borne parle, elle n'écoute jamais

La spec (§3) a chiffré le renversement : **11 joueurs × 3 tâches × 90 s = 49 min
de borne-temps par manche contre 24 min de capacité** si les bornes étaient
exclusives. Le moindre murmure qui attendrait une réponse recréerait la file
d'attente que ce calcul interdit. La borne est une **BALISE**, jamais un
guichet — et ça vaut pour toute idée future d'interaction sur l'écran posé.

### Aucun décor ne désigne personne

« Quelqu'un a menti dans cette pièce » marche parce que c'est vrai de toutes les
pièces et de tous les soirs : ça met de l'humeur sans fabriquer une accusation
que le jeu n'a pas calculée. Un murmure qui nommerait un joueur, ou même un
rôle, deviendrait une **preuve inventée par le décor**, et fausserait l'enquête.

C'est la même règle qui a fait supprimer de la réunion le projecteur « dernier
utilisateur de la borne » (§3) : le Fantôme évite précisément d'être ce dernier,
donc il désigne presque toujours un innocent.

---

## 4. Les visuels générés — état et blocage

Neuf portraits sur dix ont été générés (**il manque le fumoir**, le capitaine à
la pipe). Le résultat est au-dessus des SVG sur le caractère, et surtout il a
l'air peint par la même main — c'était le vrai risque.

### Le défaut structurel, à corriger avant d'aller plus loin

**Les yeux sont dorés dès l'état normal.** La direction artistique disait
« l'or sert aux yeux et à un seul objet », le modèle a obéi — et l'effet du glas
est donc déjà dépensé :

```
Portraits.tsx:233
<circle … fill={glas ? OR : TRAIT} />
```

Dans le SVG la pupille est **sombre** en temps normal et devient **or** au glas.
C'est ça qui fait « le portrait m'a regardé ». Avec des yeux or en permanence, le
glas ne peut plus retirer que la saturation, et un joueur qui ne compare pas les
deux images côte à côte ne verra rien.

Correctif, à ajouter aux dix prompts et regénérer :

> The eyes are pale and glassy, with DARK pupils — no gold in the eyes.
> Gold #C9A227 is used ONLY for the single object.

Et la variante glas, à demander **en suivi** du même personnage pour que le
visage ne bouge pas :

> Same figure, same palette, same composition, same face. The pupils now glow
> gold #C9A227, the eyes open wider, the mouth turns down, and the whole
> painting is desaturated and darker, as if the candle had just gone out.
> Do not redesign the character.

### Deux réserves plus petites

- **Le cuisinier est l'intrus en valeur** : toque + tablier blancs font deux
  grandes masses claires. Sur une tablette dans une pièce sombre il brillera
  pendant que les huit autres restent dans l'ombre. Une toque grise sale le
  remettrait dans la maison.
- **La véranda dépense l'or deux fois** : le chapeau de paille entier *plus* la
  feuille. C'est la plus grosse masse dorée des neuf, ça bascule vers
  « moisson ». Chapeau violet foncé, feuille dorée seule.

### Ce que coûterait l'adoption

- **20 à 30 fichiers** (10 pièces × 2 états, × 3 si on veut garder le
  clignement). Cible WebP ~800 × 960, < 60 Ko pièce, ≈ 1 Mo au total.
- **Une requête par image** là où il y en a zéro aujourd'hui. Il faudra
  **précharger les deux états à l'appairage**, jamais au moment du glas : la
  borne ne doit pas découvrir qu'elle a besoin d'une image pendant que le manoir
  sonne.
- **Le clignement disparaît** avec une image fixe.
- **La provenance.** Le dépôt est public : il faudra pouvoir dire d'où viennent
  ces images et à quelles conditions elles sont utilisables.

**Option intermédiaire** si les images plaisent : les **vectoriser** avec la
palette imposée. On garde le dessin trouvé par la génération et on récupère le
poids nul, le clignement et la netteté à toute taille.

Les prompts complets sont hors dépôt (scratchpad de session). Ils tiennent en
une direction artistique commune + une ligne de sujet.

---

## 5. Les mini-jeux façon Among Us

### Le créneau existe déjà, et il est déjà occupé

La spec (§3) décrit la ronde comme un « mini-jeu de ~90 s sur le téléphone
exigeant le code de la balise au début, au milieu, à la fin ». Le créneau est là
depuis le début. Ce qui le remplit n'est pas de l'adresse mais **trois actions
sociales** : la saisie du code tournant, le **sceau d'un autre joueur** une
ronde sur trois, et la carte photo — trophée, jamais alibi.

Le jeu a donc déjà choisi de remplir les 90 secondes avec *de la présence*.

### Pourquoi la tâche Among Us ne se transplante pas

**La pénurie qu'elle résout n'existe pas ici.** Les tâches d'Among Us occupent
dix joueurs seuls devant un écran qui n'ont rien à faire pendant qu'on les
observe. Ici onze personnes sont dans un gîte : elles dînent, elles se parlent,
elles se regardent. Le jeu promet de « permettre à la vie de continuer dans la
maison » — un jeu d'adresse ramènerait tout le monde sur son écran précisément
pendant les 90 secondes passées debout dans une pièce avec les autres.

**Et il introduit un gradient de compétence.** La ronde a une limite dure à 90 s.
Un enfant de huit ans et un adulte ne finissent pas un jeu de câbles à la même
vitesse : on ferait rater des rondes pour des raisons étrangères à l'enquête.

### La recommandation : la corvée collective de la manche

L'étirement dans le temps est le bon instinct, mais il porte sur **la manche,
pas sur la ronde**. Une corvée qui couvre les trois rondes d'une manche :

> *Manche 2 — Rallumer les bougies.* Escalier, puis couloir, puis grenier.

Coût d'attention : **zéro**. Ce sont les mêmes trois rondes, aux mêmes bornes,
avec les mêmes codes. Ce que ça ajoute est ailleurs : une raison narrative
d'être dans cette pièce, et surtout **quelque chose à raconter à la réunion**,
qui est la vraie monnaie du jeu. Le serveur assigne déjà la pièce de chaque
ronde ; c'est du contenu et un peu d'état, pas une mécanique nouvelle.

⚠️ **La corvée est COLLECTIVE — la même pour tout le monde à chaque manche.**
Si chacun a la sienne, être vu au mauvais endroit devient une information, et le
geste de borne cesse d'être **routinier, donc non incriminant**. C'est la
propriété sur laquelle repose toute l'enquête. Un rituel partagé la préserve ; un
rituel individuel la casse. Même arbitrage que pour les murmures.

### Si on veut une vraie « tâche » : à deux pièces, pas à deux doigts

Un joueur lit quelque chose sur la borne A, un autre en a besoin sur la borne B.
C'est la transposition honnête des câbles d'Among Us : la difficulté devient
**logistique et sociale**, pas manuelle — et la ronde à deux a déjà posé le
motif. Réserve à dire d'avance : à 11 joueurs et 3 bornes ça demande une
coordination qui peut créer du temps mort, et il faut un repli pour le joueur
resté seul.

---

## 6. Le panel d'actions — jugé sur le seul axe qui compte

La spec (§4) nomme la faiblesse à battre : **une balise affiche un secret que
n'importe qui peut relayer** — un téléphone posé en appel vidéo, ou un enfant qui
lit les codes à voix haute pour aider.

| action | résiste au relais | yeux sur l'écran | marche partout |
|---|---|---|---|
| code tapé (actuel) | ✗ relayable à la voix | ~5 s de frappe | ✓ |
| QR sur la borne | ✗ **pire** — une photo de QR se relaie mieux qu'un code dicté | caméra ouverte | ✓ (`getUserMedia` déjà en place) |
| étiquette NFC | ✓ au premier contact, ✗ ensuite | **zéro** | ~ (voir §7) |
| sceau d'un autre joueur (duo, existant) | ✓✓ exige un humain | frappe | ✓ |

**Le QR est un faux ami** : plus moderne à l'œil, strictement plus faible sur
l'axe qui compte, et il coûte une caméra ouverte.

---

## 7. NFC — quatre faits, dans l'ordre où ils font mal

1. **Pas d'échange entre deux téléphones depuis une page web.** Web NFC
   (`NDEFReader`) ne fait que lire et écrire des **étiquettes** ; il n'y a pas de
   mode pair-à-pair dans la spec, même sur Chrome/Android où l'API existe. En
   dessous, côté natif, Android Beam a été déprécié puis retiré, et iOS ne l'a
   jamais permis à une app tierce. C'est une technique **morte**, pas une
   technique inaccessible depuis le web.
2. **La charge d'une étiquette se copie.** Elle porte une URL statique : on ne
   peut pas la déclencher à distance, mais on peut la lire une fois et la retaper
   indéfiniment. Face à un code qui tourne toutes les 20 s, le NFC est donc une
   **régression de sécurité**. Il ne peut jamais être la preuve ; au mieux il
   remplace la frappe.
3. **Le vrai gain existe et il est ailleurs : zéro attention.** On approche le
   téléphone, on le remet dans sa poche. C'est la seule action de la liste qui
   serve vraiment « la vie continue dans la maison ». Une étiquette encodant une
   URL s'ouvre nativement sur iPhone comme sur Android, sans Web NFC.
4. **Mais ça casse la promesse de matériel.** Aujourd'hui : « 2 à 5 bornes =
   n'importe quel navigateur posé, branché, plein écran ». Zéro achat. Des
   étiquettes à commander, coller et encoder transforment un jeu qu'on lance en
   dix minutes en un jeu qui demande une préparation. **Option d'accélération
   pour qui en a ; jamais le chemin nominal.**

### Et l'argument qui ne dépend d'aucune API

Automatiser l'échange **retire le témoin humain que la ronde à deux vient
justement remettre dans la mécanique** (§4). Deux appareils qui se serrent la
main tout seuls, ça se fait dans une poche, sous la table, sans qu'aucun des deux
propriétaires ne se soit croisé. La friction de la saisie n'est pas un défaut à
supprimer : c'est **le geste public qui fait la preuve**.

---

## 8. Ce qui n'a pas été vérifié

- **Les faits NFC du §7 sont donnés de mémoire.** La sortie réseau de la session
  de travail est filtrée : rien n'a pu être re-vérifié en ligne. Si une décision
  s'appuie dessus, c'est le point à confirmer d'abord.
- **Les visuels générés n'ont pas été jugés à deux mètres dans le noir**, qui est
  la seule distance qui compte : la borne est posée dans une pièce, pas tenue en
  main. Un portrait qui ne se lit qu'à cinquante centimètres a échoué.
- Les murmures ont été vérifiés au navigateur (rotation, quatre langues), les
  portraits aussi. Le reste du jeu, connecté, reste couvert par tsc, eslint, le
  build et la parité — jamais par un passage à l'écran.

---

## 9. Ordre de travail proposé

1. **La corvée collective de la manche.** La moins chère, la plus rentable, et
   elle ne touche à aucune des deux règles du §3.
2. **Les visuels**, si et seulement si les yeux sont regénérés en pupilles
   sombres, le fumoir compris, avec les deux états par personnage et le
   préchargement à l'appairage.
3. **La tâche à deux pièces**, si la corvée collective ne suffit pas à remplir
   les 90 secondes une fois jouée pour de vrai.
4. **Le NFC en dernier**, en option, et pas pour la preuve.
