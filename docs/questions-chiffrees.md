# LES QUESTIONS CHIFFRÉES — banque à valider

Première tranche pour le mode quotidien. **À relire et à couper** : c'est le
contenu, donc le fond du jeu.

Chaque question demande **un nombre**, noté par son écart en facteurs à la
médiane des joueurs du jour (×1,25 → 10 pts · ×2 → 6 · ×5 → 3 · ×10 → 1).

---

## Les quatre règles que je me suis données

**1. INTROUVABLE SUR LE WEB.** Si la réponse se cherche, le jeu devient un test
de recherche. Le test : la question doit exiger de *composer* plusieurs
estimations. « Combien de grains de riz dans un kilo » est écarté — le poids d'un
grain est publié.

**2. ESTIMABLE PAR N'IMPORTE QUI.** Aucune connaissance spécialisée. On doit
pouvoir bâtir un chemin en trente secondes : tant d'habitants, tant par personne,
tant de fois par an.

**3. ⚠️ L'OBJET DOIT EXISTER DANS LES QUATRE PAYS — et c'est la règle qui coûte.**
La localisation par langue fait apparaître un filtre que je n'avais pas vu :
beaucoup d'objets de Fermi sont **culturellement européens**. Les pigeons de
place, les bouchons de liège du 31 décembre, les vélos qui rouillent à la cave,
les parapluies oubliés dans le métro : au Nigeria, ces questions sont absurdes ou
valent zéro. Une question localisée n'est pas une question traduite — il faut que
la *chose* ait un sens à Lagos comme à Madrid.

Trois questions ont déjà été écartées à ce titre, et c'est le critère qui a le
plus élagué la liste.

**4. UN ORDRE DE GRANDEUR ANNONCÉ.** Chaque entrée porte la valeur que j'attends,
pour deux raisons : refuser une question dont la réponse est absurde ou trop
serrée, et donner au test de contenu une borne à vérifier.

**La variété d'échelle est voulue.** Toutes les questions ne sont pas à l'échelle
du pays : certaines portent sur une personne, une journée, un objet. Sinon le
joueur applique le même chemin tous les jours — population × un facteur — et le
jeu devient une routine.

---

## Localisation

Un pays de référence par langue. C'est le pays du joueur qui compte, jamais un
pays étranger : demander à un joueur nigérian le poids des ballons **en France**
n'a aucun sens.

```
fr → France        en → Royaume-Uni
es → Espagne       pcm → Nigeria
```

⚠️ **Conséquence sur la base** : quatre distributions parallèles. Médiane,
effectif, rang et centile se calculent par `(journée, langue)`, jamais par
journée seule. Et le seuil d'audience s'applique par langue — `pcm` restera
longtemps sous le plancher, donc l'écran doit dégrader proprement dès le premier
jour.

---

## La tranche 1 — 15 questions

### 1 · `ballons-foot` — kg — attendu : ~10⁶

> **fr** Quel est le poids de tous les ballons de football qui se trouvent en France aujourd'hui ?
> **en** What do all the footballs currently in the United Kingdom weigh, together?
> **es** ¿Cuánto pesan todos los balones de fútbol que hay hoy en España?
> **pcm** All di football wey dey Nigeria today, dem weigh how much together?

### 2 · `cheveux-salons` — kg — attendu : ~10⁴

> **fr** Quel poids de cheveux les salons de coiffure français coupent-ils en une seule journée ?
> **en** How many kilos of hair do British hairdressers cut in a single day?
> **es** ¿Cuántos kilos de pelo cortan las peluquerías españolas en un solo día?
> **pcm** How many kilo of hair Nigeria barbing salon dey cut for one day?

### 3 · `mots-par-jour` — nombre — attendu : ~10⁴ · *échelle : une personne*

> **fr** Combien de mots une personne prononce-t-elle en une journée ordinaire ?
> **en** How many words does one person say in an ordinary day?
> **es** ¿Cuántas palabras dice una persona en un día normal?
> **pcm** How many words one person dey talk for one normal day?

### 4 · `bonjour-journee` — nombre — attendu : ~10⁸

> **fr** Combien de fois le mot « bonjour » est-il prononcé en France en une journée ?
> **en** How many times is the word "hello" said in the United Kingdom in one day?
> **es** ¿Cuántas veces se dice « hola » en España en un día?
> **pcm** How many times dem dey talk "how far" for Nigeria for one day?

### 5 · `brosses-a-dents` — nombre — attendu : ~10⁸

> **fr** Combien de brosses à dents sont jetées en France en un an ?
> **en** How many toothbrushes are thrown away in the United Kingdom in a year?
> **es** ¿Cuántos cepillos de dientes se tiran en España en un año?
> **pcm** How many toothbrush dem dey throway for Nigeria for one year?

### 6 · `ecrans-surface` — m² — attendu : ~10⁶

> **fr** Quelle surface totale font tous les écrans de téléphone de France, mis côte à côte ?
> **en** Put every phone screen in the United Kingdom side by side — what area do they cover?
> **es** Si juntas todas las pantallas de móvil de España, ¿qué superficie ocupan?
> **pcm** If you join all di phone screen for Nigeria, dem go cover how many square meter?

### 7 · `ampoules-3h` — nombre — attendu : ~10⁷

> **fr** Combien d'ampoules sont allumées en France à trois heures du matin ?
> **en** How many light bulbs are switched on in the United Kingdom at three in the morning?
> **es** ¿Cuántas bombillas están encendidas en España a las tres de la madrugada?
> **pcm** How many bulb dey on for Nigeria by three for morning?

### 8 · `chaussettes-seules` — nombre — attendu : ~10⁷

> **fr** Combien de chaussettes dépareillées y a-t-il en France en ce moment ?
> **en** How many odd socks are there in the United Kingdom right now?
> **es** ¿Cuántos calcetines desparejados hay ahora mismo en España?
> **pcm** How many socks wey no get partner dey Nigeria right now?

### 9 · `pas-facteur` — nombre — attendu : ~10⁴ · *échelle : une personne, une journée*

> **fr** Combien de pas un facteur fait-il pendant sa tournée d'une journée ?
> **en** How many steps does a postal worker take on one day's round?
> **es** ¿Cuántos pasos da un cartero en un día de reparto?
> **pcm** How many step one postman dey waka for im one day round?

### 10 · `fenetres-capitale` — nombre — attendu : ~10⁷

> **fr** Combien de fenêtres y a-t-il à Paris ?
> **en** How many windows are there in London?
> **es** ¿Cuántas ventanas hay en Madrid?
> **pcm** How many window dey for Lagos?

### 11 · `crayons-tailles` — nombre — attendu : ~10⁶

> **fr** Combien de crayons sont taillés dans les écoles françaises en une journée ?
> **en** How many pencils are sharpened in British schools in one day?
> **es** ¿Cuántos lápices se afilan en los colegios españoles en un día?
> **pcm** How many pencil dem dey sharpen for Nigeria school for one day?

### 12 · `sable-serviettes` — kg — attendu : ~10⁵

> **fr** Quel poids de sable rentre à la maison dans les serviettes de plage, un jour d'été en France ?
> **en** On a summer's day, how much sand goes home inside British beach towels?
> **es** Un día de verano, ¿cuánta arena vuelve a casa dentro de las toallas de playa españolas?
> **pcm** For one hot day, how much sand dey enter house inside Nigeria beach towel?

### 13 · `ballons-baudruche` — nombre — attendu : ~10⁶

> **fr** Combien de ballons de baudruche sont gonflés en France un samedi ?
> **en** How many balloons are blown up in the United Kingdom on a Saturday?
> **es** ¿Cuántos globos se hinchan en España un sábado?
> **pcm** How many balloon dem dey blow for Nigeria on Saturday?

### 14 · `files-attente` — km — attendu : ~10² à 10³

> **fr** Mises bout à bout, quelle longueur font toutes les files d'attente de France un samedi après-midi ?
> **en** End to end, how long are all the queues in the United Kingdom on a Saturday afternoon?
> **es** Puestas en fila, ¿qué longitud tienen todas las colas de España un sábado por la tarde?
> **pcm** If you join all di queue for Nigeria on Saturday afternoon, e go long reach how many kilometre?

### 15 · `battements-vie` — nombre — attendu : ~10⁹ · *échelle : une vie*

> **fr** Combien de fois le cœur d'une personne bat-il au cours de sa vie ?
> **en** How many times does a person's heart beat in a lifetime?
> **es** ¿Cuántas veces late el corazón de una persona a lo largo de su vida?
> **pcm** How many times person heart dey beat for im whole life?

---

## Écartées, et pourquoi

Je les note pour qu'on ne les repropose pas.

| question | motif |
|---|---|
| Grains de riz dans un kilo | **Trouvable** : le poids d'un grain est publié. |
| Gouttes dans un litre | **Trouvable**, et sans variété — c'est de l'arithmétique. |
| Pigeons de la capitale | **Ne traverse pas** : trope de place européenne, sans équivalent à Lagos. |
| Bouchons de liège ouverts le 31 décembre | **Ne traverse pas** : rituel européen, et le liège est minoritaire ailleurs. |
| Vélos qui rouillent à la cave | **Ne traverse pas** : les caves d'immeuble sont une réalité européenne. |
| Parapluies oubliés dans le métro | **Ne traverse pas** : suppose un réseau de métro dans les quatre pays. |
| Pièces oubliées sous les canapés | **Fragile** : la pièce de monnaie a un poids d'usage très différent selon les pays. |

---

## Ce qu'il reste à faire sur cette banque

- **La valider et la couper** — c'est ton tour.
- **La compléter** : 15 questions font 15 jours. Il en faut trois fois plus pour
  tenir un trimestre sans se répéter, et le filtre culturel élague beaucoup.
- **Vérifier les ordres de grandeur** une fois les premières journées jouées :
  si la médiane des joueurs s'écarte d'un facteur 10 de l'attendu, c'est
  l'attendu qui est faux, pas la foule.
- **Écrire le contrôle** : un test qui refuse une question sans unité, sans les
  quatre langues, ou sans ordre de grandeur annoncé.
