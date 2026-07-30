import type { DeepFiches } from "./types";

// Fiches de fond — français (langue de référence : les autres locales en sont
// la traduction, et retombent ici si une clé manque).
const fr: DeepFiches = {
  // ---------------------------------------------------------------- VOTE ----
  simple_vote: {
    summary:
      "Un tour, une voix, le plus grand nombre l'emporte. C'est le scrutin le plus répandu au monde, et le plus critiqué : le vainqueur peut n'avoir convaincu qu'une minorité.",
    history: [
      "Le scrutin uninominal majoritaire à un tour n'a pas d'inventeur : il naît de l'usage, dans les assemblées médiévales anglaises, où chaque comté envoyait deux représentants au Parlement. Son surnom anglais, « first past the post », est une métaphore hippique — le premier au poteau, sans qu'on demande de quelle longueur.",
      "L'Empire britannique l'exporte à peu près partout : Royaume-Uni, Inde, Canada, États-Unis, Nigeria. Il reste aujourd'hui le mode de scrutin d'une part considérable de la population mondiale, largement par héritage colonial plutôt que par choix théorique.",
      "En 1951, le juriste Maurice Duverger énonce la régularité qui porte son nom : le scrutin majoritaire à un tour tend à produire un système à deux partis, parce que voter pour un troisième revient à gaspiller sa voix. Ce n'est pas une loi au sens physique, mais la corrélation est solide et documentée depuis.",
    ],
    mechanics: [
      "Chaque votant désigne une option et une seule. On compte les voix, on classe, la plus haute gagne. C'est tout : aucune information n'est demandée sur ce que le votant pense des autres options.",
      "Attention au vocabulaire : ce scrutin donne une PLURALITÉ (le plus de voix), pas une MAJORITÉ (plus de la moitié). Les deux coïncident à deux options seulement. Dès trois, un vainqueur à 34 % est possible face à 66 % d'opposants dispersés.",
      "En cas d'égalité parfaite, aucune règle interne ne tranche : il faut un départage externe (tirage au sort, voix prépondérante, ancienneté). Placet affiche l'égalité plutôt que d'inventer un vainqueur.",
    ],
    example: {
      intro: "Cent personnes choisissent le lieu du séminaire. Trois options, un tour.",
      head: ["Option", "Voix", "Part"],
      rows: [
        ["Lyon", "40", "40 %"],
        ["Bordeaux", "35", "35 %"],
        ["Lille", "25", "25 %"],
      ],
      steps: [
        "Lyon arrive en tête avec 40 voix : c'est le vainqueur.",
        "Mais 60 personnes sur 100 ont voté contre Lyon.",
        "Si les partisans de Lille préféraient Bordeaux à Lyon, Bordeaux l'emporterait dans un duel à 60 contre 40.",
      ],
      result:
        "Le vainqueur est celui qui rassemble le plus de premiers choix, pas celui que le groupe préfère. C'est exactement la situation que Condorcet, en 1785, reprochait déjà à ce mode de scrutin.",
    },
    useCases: [
      "Élections législatives au Royaume-Uni, en Inde, au Canada.",
      "Élection présidentielle américaine au sein de chaque État (le vainqueur rafle les grands électeurs).",
      "Décisions de groupe rapides, quand la vitesse prime sur la finesse.",
      "Sondages express et choix binaires, où la pluralité et la majorité se confondent.",
    ],
    limits: [
      {
        t: "Vainqueur minoritaire",
        d: "Avec trois options ou plus, on peut gagner sans jamais avoir convaincu la moitié du groupe.",
      },
      {
        t: "Effet spoiler",
        d: "Une option proche d'une autre divise son camp et fait gagner un troisième. D'où le « vote utile », qui pousse à renoncer à son vrai premier choix.",
      },
      {
        t: "Loi de Duverger",
        d: "À force de vote utile, l'offre se réduit à deux camps. Les nuances disparaissent avant même le scrutin.",
      },
      {
        t: "Sensibilité au découpage",
        d: "Quand on vote par circonscriptions, le tracé des frontières pèse autant que les voix — c'est la porte ouverte au charcutage électoral.",
      },
    ],
    faq: [
      {
        q: "Pluralité et majorité, quelle différence ?",
        a: "La pluralité, c'est le plus de voix ; la majorité, c'est plus de la moitié. Un vainqueur à 40 % a la pluralité sans la majorité. Si votre décision doit être légitime face à un groupe qui devra la vivre, cette différence est tout sauf un détail.",
      },
      {
        q: "Pourquoi ce scrutin reste-t-il si répandu ?",
        a: "Parce qu'il est instantanément compréhensible, se dépouille à la main, et produit toujours un résultat clair. Ses défauts sont théoriquement documentés depuis 1785, mais sa simplicité est un avantage politique réel.",
      },
      {
        q: "Quand vaut-il mieux l'éviter ?",
        a: "Dès qu'il y a plus de deux options et que le groupe devra vivre avec la décision. Le vote par approbation coûte le même effort au votant et résout l'essentiel du problème.",
      },
    ],
  },

  two_round: {
    summary:
      "Si personne n'atteint 50 % au premier tour, les deux meilleurs s'affrontent au second. Le vainqueur a nécessairement la majorité absolue — mais seulement face au finaliste qui lui a été opposé.",
    history: [
      "Le scrutin à deux tours s'impose en France au XIXᵉ siècle et se généralise sous la IIIᵉ République. La Vᵉ République le reprend en 1958 pour les élections législatives, puis en 1962 pour l'élection présidentielle au suffrage universel direct — première application en 1965.",
      "L'idée est un compromis politique : garder la clarté du scrutin majoritaire tout en corrigeant son défaut le plus visible, le vainqueur minoritaire. Le second tour force un arbitrage explicite entre deux options seulement.",
      "Il s'est diffusé bien au-delà de la France : Autriche, Portugal, Brésil, Pologne, la plupart des présidentielles d'Amérique latine, et une bonne partie des scrutins associatifs francophones.",
    ],
    mechanics: [
      "Premier tour : chacun vote pour une option. Si l'une dépasse le seuil (50 % par défaut dans Placet, réglable), c'est fini.",
      "Sinon, second tour entre les deux premières — c'est la règle usuelle. Les législatives françaises retiennent un autre critère : tous les candidats ayant atteint 12,5 % des inscrits, d'où les triangulaires.",
      "Au second tour, la majorité absolue est mécaniquement garantie : avec deux options, la pluralité EST la majorité. C'est une garantie arithmétique, pas une garantie de consensus.",
    ],
    example: {
      intro: "Les mêmes cent personnes, cette fois à deux tours.",
      head: ["Option", "1ᵉʳ tour", "2ᵈ tour"],
      rows: [
        ["Lyon", "40", "45"],
        ["Bordeaux", "35", "55"],
        ["Lille", "25", "éliminée"],
      ],
      steps: [
        "Personne n'atteint 50 % : Lyon et Bordeaux vont au second tour.",
        "Les 25 voix de Lille se reportent : 20 vers Bordeaux, 5 vers Lyon.",
        "Bordeaux l'emporte avec 55 voix contre 45.",
      ],
      result:
        "Le second tour a bien corrigé le résultat du premier. Mais notez ce qu'il n'a pas fait : si Lille avait été le compromis préféré de tous en deuxième position, elle serait éliminée dès le premier tour, sans jamais être testée en duel.",
    },
    useCases: [
      "Élection présidentielle française et de nombreuses républiques.",
      "Élections législatives et cantonales en France.",
      "Élections associatives et syndicales, où la majorité absolue est souvent statutaire.",
      "Décisions de groupe engageantes, quand un mandat clair compte plus que la rapidité.",
    ],
    limits: [
      {
        t: "Le compromis élimé au premier tour",
        d: "Une option modérée, deuxième choix de tout le monde mais premier choix de personne, ne franchit pas le premier tour. Un vainqueur de Condorcet peut être éliminé avant d'avoir joué.",
      },
      {
        t: "Non-monotonie",
        d: "Gagner des voix peut faire perdre. En modifiant le duo qualifié, un surcroît de soutien au premier tour peut vous opposer à un adversaire plus dangereux. Le résultat n'évolue donc pas toujours dans le même sens que les voix.",
      },
      {
        t: "Coût et démobilisation",
        d: "Deux scrutins, deux organisations, et une participation qui baisse presque toujours au second tour.",
      },
      {
        t: "Vote utile déplacé, pas supprimé",
        d: "Il ne s'agit plus de gagner, mais de se qualifier : le calcul tactique se reporte simplement sur le premier tour.",
      },
    ],
    faq: [
      {
        q: "Le second tour garantit-il un vrai consensus ?",
        a: "Non : il garantit une majorité absolue face à UN adversaire donné. Si le duel proposé n'est pas le bon — parce que le compromis a été éliminé au premier tour — la majorité obtenue est arithmétique, pas politique.",
      },
      {
        q: "Comment un candidat peut-il perdre en gagnant des voix ?",
        a: "En changeant son adversaire de second tour. Supposons que vous battiez A de justesse mais perdiez face à B : quelques voix supplémentaires au premier tour peuvent éliminer A au profit de B, et vous coûter l'élection. C'est le défaut de monotonie, connu et démontrable.",
      },
      {
        q: "Deux tours ou Condorcet ?",
        a: "Condorcet teste TOUS les duels en un seul vote, là où le second tour n'en teste qu'un, choisi par le premier tour. Si votre groupe peut classer les options, Condorcet répond à la même question de manière plus complète.",
      },
    ],
  },

  approval: {
    summary:
      "Chacun coche toutes les options qui lui conviennent, sans les classer. Celle qui rassemble le plus d'approbations gagne. Un effort de bulletin quasi nul pour un gain de qualité considérable.",
    history: [
      "L'approbation a des ancêtres : la République de Venise l'utilisait dès le XIIIᵉ siècle dans certaines phases de l'élection du doge, et plusieurs ordres religieux l'employaient pour désigner leurs supérieurs.",
      "Sa formalisation moderne date de 1978 : Steven Brams et Peter Fishburn publient « Approval Voting » dans l'American Political Science Review, et en font la méthode la plus étudiée du renouveau de la théorie du choix social américaine.",
      "Plusieurs sociétés savantes l'adoptent à partir de 1987 ; l'IEEE l'a pratiquée jusqu'en 2002 avant d'y renoncer, faute d'usage par ses membres. Le Conseil de sécurité de l'ONU y recourt pour ses votes indicatifs de désignation du secrétaire général. Fargo (Dakota du Nord) l'a adoptée par référendum en 2018 et appliquée de 2020 à 2024, jusqu'à son interdiction par le Dakota du Nord en 2025 ; Saint-Louis (Missouri) l'emploie depuis 2021, en primaire, les deux premiers s'affrontant ensuite au second tour.",
    ],
    mechanics: [
      "Chaque votant coche autant d'options qu'il le souhaite — aucune, une seule, toutes. Chaque coche vaut un point ; on additionne.",
      "Le bulletin ne demande aucun classement : c'est une simple frontière entre ce que le votant accepte et ce qu'il refuse. Cette économie cognitive est l'argument principal de la méthode.",
      "Conséquence remarquable : le vote utile disparaît, car soutenir son favori n'empêche jamais de soutenir aussi le compromis. On ne peut plus se nuire en étant sincère sur ses préférences.",
    ],
    example: {
      intro: "Cent personnes cochent tout ce qui leur convient pour le séminaire.",
      head: ["Option", "Approbations", "Taux"],
      rows: [
        ["Bordeaux", "72", "72 %"],
        ["Lyon", "58", "58 %"],
        ["Lille", "41", "41 %"],
      ],
      steps: [
        "Les 40 partisans de Lyon ont, pour beaucoup, aussi coché Bordeaux.",
        "Bordeaux réunit 72 approbations : c'est le lieu que le plus de monde accepte.",
        "Le total dépasse 100 % — c'est normal : on compte des approbations, pas des voix exclusives.",
      ],
      result:
        "L'approbation mesure l'acceptabilité, pas l'enthousiasme. Pour une décision que tout le groupe devra vivre, c'est souvent la bonne question.",
    },
    useCases: [
      "Choisir une date, un lieu, un restaurant : plusieurs réponses sont acceptables.",
      "Présélectionner des candidatures avant un entretien.",
      "Primaire municipale de Saint-Louis (Missouri), votes indicatifs du Conseil de sécurité de l'ONU.",
      "Sondages de prévalence, où l'on cherche ce qui est répandu plus que ce qui arrive en tête.",
    ],
    limits: [
      {
        t: "Aucune intensité",
        d: "« J'adore » et « je peux vivre avec » comptent pareil. Le jugement majoritaire existe pour combler exactement ce manque.",
      },
      {
        t: "Le dilemme du seuil",
        d: "Où placer sa frontière d'approbation ? Cocher large aide le consensus mais dilue son favori ; cocher étroit fait l'inverse. C'est le vrai levier tactique de la méthode.",
      },
      {
        t: "Résultat sensible au niveau d'exigence",
        d: "Un groupe généreux et un groupe sévère ne produisent pas le même classement à partir des mêmes préférences.",
      },
    ],
    faq: [
      {
        q: "Combien d'options faut-il cocher ?",
        a: "Toutes celles avec lesquelles vous seriez d'accord, sincèrement. La stratégie la plus solide consiste à cocher tout ce que vous préférez à ce que vous estimez être le résultat probable.",
      },
      {
        q: "Un total supérieur à 100 %, est-ce normal ?",
        a: "Oui. On ne répartit pas cent voix : on compte, pour chaque option, combien de personnes l'acceptent. Les pourcentages se lisent option par option.",
      },
      {
        q: "Approbation ou jugement majoritaire ?",
        a: "L'approbation demande un clic et répond à « est-ce acceptable ? ». Le jugement majoritaire demande une mention par option et répond à « à quel point ? ». Commencez par l'approbation ; passez aux mentions quand les nuances comptent vraiment.",
      },
    ],
  },

  borda: {
    summary:
      "Chacun classe les options ; les rangs se convertissent en points, et l'on additionne. La méthode récompense le consensus large plutôt que la ferveur d'un camp.",
    history: [
      "Jean-Charles de Borda, marin, mathématicien et physicien, présente son « Mémoire sur les élections au scrutin » à l'Académie royale des sciences en 1770 ; il est publié en 1781. Son constat est simple : le scrutin ordinaire peut élire un candidat que la majorité rejette.",
      "L'idée est plus ancienne. Le philosophe majorquin Raymond Lulle décrit dès la fin du XIIIᵉ siècle des procédures de comparaison par paires et de classement — manuscrits redécouverts seulement en 2001. Nicolas de Cues propose en 1433 une méthode par points pour l'élection de l'empereur du Saint-Empire.",
      "L'Académie des sciences adopte la méthode de Borda pour élire ses membres ; selon une tradition rapportée par Duncan Black, Napoléon, entré à l'Académie en 1797, l'aurait fait abandonner — le récit est discuté. On prête à Borda cette réponse aux critiques sur la manipulabilité : « mon scrutin n'est fait que pour d'honnêtes gens ».",
    ],
    mechanics: [
      "Avec n options, un premier rang rapporte n−1 points, le deuxième n−2, et ainsi de suite jusqu'à 0 pour le dernier. On somme les points de chaque option.",
      "La variante dite Dowdall (utilisée à Nauru) attribue 1, 1/2, 1/3… : elle pèse beaucoup plus lourdement les premières places. Le choix du barème change le résultat — ce n'est pas un détail d'implémentation.",
      "Placet applique le barème classique n−1, n−2, … 0, ce qui rend les écarts lisibles : un point d'écart correspond exactement à un rang gagné sur un bulletin.",
    ],
    example: {
      intro: "Trois options, cinq bulletins classés. Un premier rang vaut 2 points, un deuxième 1, un troisième 0.",
      head: ["Bulletins", "1ᵉʳ", "2ᵉ", "3ᵉ"],
      rows: [
        ["2 votants", "Lyon", "Bordeaux", "Lille"],
        ["2 votants", "Lille", "Bordeaux", "Lyon"],
        ["1 votant", "Bordeaux", "Lyon", "Lille"],
      ],
      steps: [
        "Lyon : 2×2 + 1×1 = 5 points.",
        "Lille : 2×2 = 4 points.",
        "Bordeaux : 2×1 + 2×1 + 1×2 = 6 points.",
      ],
      result:
        "Bordeaux gagne sans être le premier choix de presque personne — elle est le deuxième choix de tout le monde. C'est précisément ce que Borda cherchait à capturer, et ce que ses détracteurs lui reprochent.",
    },
    useCases: [
      "Élections parlementaires à Nauru et sièges réservés aux minorités en Slovénie.",
      "Récompenses sportives et culturelles : Ballon d'Or, trophées MVP, prix littéraires.",
      "Choix d'un ordre du jour ou d'une priorité collective, quand toutes les options doivent être comparées.",
      "Décisions d'équipe où l'on cherche l'option la moins clivante.",
    ],
    limits: [
      {
        t: "Manipulable par les clones",
        d: "Ajouter des options faibles proches d'un concurrent fait chuter son total moyen. Faire la liste des options devient un acte politique.",
      },
      {
        t: "Vote tactique par enfouissement",
        d: "Classer artificiellement dernier le rival le plus sérieux est payant, et pratiquement indétectable.",
      },
      {
        t: "Viole le critère de Condorcet",
        d: "Une option qui gagne tous ses duels peut perdre au décompte Borda. Les deux méthodes répondent à deux questions différentes, et Borda l'assume.",
      },
    ],
    faq: [
      {
        q: "Borda ou Condorcet ?",
        a: "Borda mesure une satisfaction moyenne et donne toujours un résultat ; Condorcet cherche le champion de tous les duels, mais peut n'en trouver aucun. Borda est plus robuste en pratique, Condorcet plus exigeant en théorie.",
      },
      {
        q: "Faut-il classer toutes les options ?",
        a: "Oui, idéalement : un bulletin incomplet fausse les points relatifs. C'est le vrai coût de la méthode, et la raison pour laquelle elle fatigue au-delà de sept ou huit options.",
      },
      {
        q: "Pourquoi le dernier rang vaut-il zéro ?",
        a: "Pour que seuls les ÉCARTS de rang comptent. Ajouter une constante à tous les rangs ne changerait rien au classement final ; partir de zéro rend simplement la lecture plus directe.",
      },
    ],
  },

  condorcet: {
    summary:
      "On simule tous les duels possibles entre options. Celle qui les gagne tous est le vainqueur de Condorcet : le vrai champion du groupe, insensible au vote utile et très difficile à manipuler.",
    history: [
      "Marie Jean Antoine Nicolas de Caritat, marquis de Condorcet, publie en 1785 son « Essai sur l'application de l'analyse à la probabilité des décisions rendues à la pluralité des voix ». Mathématicien, philosophe des Lumières et futur député à l'Assemblée législative, il y démontre que le scrutin ordinaire peut élire une option que la majorité rejetterait en duel.",
      "Sa proposition : comparer chaque option à chaque autre, deux à deux, et couronner celle qui l'emporte à chaque fois. Il découvre du même coup l'obstacle qui portera son nom — le paradoxe de Condorcet — quand les duels tournent en rond.",
      "L'idée sommeille jusqu'au XXᵉ siècle. Duncan Black la redécouvre dans « The Theory of Committees and Elections » (1958). Entre-temps, Kenneth Arrow a publié en 1951 son théorème d'impossibilité (prix Nobel d'économie 1972) : aucune méthode de classement collectif ne peut satisfaire simultanément quelques exigences pourtant très raisonnables.",
      "Raymond Lulle avait décrit une procédure par duels dès la fin du XIIIᵉ siècle, dans des manuscrits retrouvés seulement en 2001 — soit cinq siècles d'avance sur Condorcet.",
    ],
    mechanics: [
      "À partir des classements, on construit la matrice des duels : pour chaque paire d'options, on compte combien de bulletins placent l'une devant l'autre. Rien n'est demandé de plus au votant qu'un classement.",
      "Le vainqueur de Condorcet est l'option qui gagne TOUS ses duels. Quand il existe, il est unique — et aucune autre méthode ne peut prétendre mieux représenter la préférence majoritaire.",
      "Quand les duels forment un cycle (A bat B, B bat C, C bat A), il n'y a pas de vainqueur : c'est le paradoxe de Condorcet, une propriété des préférences du groupe, pas un bug du dépouillement. Placet l'affiche honnêtement plutôt que de désigner un gagnant arbitraire.",
      "Dans ce cas, la question se déplace vers l'ensemble de Smith : le plus petit groupe d'options qui battent toutes celles qui en sont exclues. La variante randomisée de Placet y tire au sort.",
    ],
    example: {
      intro: "Trois options, cinq bulletins classés. On compare deux à deux.",
      head: ["Duel", "Résultat", "Vainqueur"],
      rows: [
        ["Bordeaux vs Lyon", "3 – 2", "Bordeaux"],
        ["Bordeaux vs Lille", "3 – 2", "Bordeaux"],
        ["Lyon vs Lille", "3 – 2", "Lyon"],
      ],
      steps: [
        "Bordeaux gagne ses deux duels : c'est le vainqueur de Condorcet.",
        "Lyon en gagne un sur deux, Lille aucun.",
        "Le classement final se lit dans le nombre de duels gagnés : Bordeaux, Lyon, Lille.",
      ],
      result:
        "Avec un scrutin à un tour, Lyon aurait pu gagner sur ses premiers choix. Le duel révèle qu'une majorité lui préfère Bordeaux — l'information que le scrutin ordinaire jette à la poubelle.",
    },
    useCases: [
      "Le projet Debian élit ses responsables par une méthode de Condorcet (variante Schulze), tout comme de nombreux projets libres.",
      "Wikimedia, KDE, Gentoo et plusieurs fondations logicielles l'utilisent pour leurs votes internes.",
      "Décisions d'équipe engageantes, où la légitimité du résultat compte autant que le résultat.",
      "Tout choix où l'on soupçonne qu'un compromis ferait mieux que les favoris qui s'annulent.",
    ],
    limits: [
      {
        t: "Paradoxe de Condorcet",
        d: "Les duels peuvent tourner en rond, sans aucun vainqueur. C'est rare avec des préférences homogènes, plus fréquent sur des sujets clivants à trois camps.",
      },
      {
        t: "Bulletin plus exigeant",
        d: "Il faut classer, pas seulement cocher. Au-delà de sept ou huit options, la fatigue est réelle et les bulletins se dégradent.",
      },
      {
        t: "Dépouillement opaque",
        d: "La matrice des duels ne se lit pas d'un coup d'œil. Il faut donner à voir le résultat, sinon la légitimité gagnée en théorie se perd en pratique.",
      },
      {
        t: "Théorème d'Arrow",
        d: "Aucune méthode ne coche toutes les cases à la fois. Condorcet choisit la fidélité à la préférence majoritaire et paie ce choix par l'existence de cycles.",
      },
    ],
    faq: [
      {
        q: "Qu'est-ce que le paradoxe de Condorcet ?",
        a: "Une situation où les préférences du groupe tournent en rond : une majorité préfère A à B, une autre majorité B à C, et une troisième C à A. Aucune option ne gagne tous ses duels. Ce n'est pas une erreur — c'est une propriété possible des préférences collectives, alors même que chaque bulletin, pris isolément, est parfaitement cohérent.",
      },
      {
        q: "Que fait Placet en cas de cycle ?",
        a: "Il l'annonce, plutôt que de fabriquer un vainqueur. Le classement reste affiché par nombre de duels gagnés, mais aucune décision n'est présentée comme acquise. Si vous voulez trancher malgré tout, la variante Condorcet randomisé tire au sort dans l'ensemble de Smith.",
      },
      {
        q: "Peut-on manipuler un vote de Condorcet ?",
        a: "C'est parmi les plus difficiles à manipuler. Le théorème de Gibbard-Satterthwaite (1973-1975) établit qu'aucune méthode non triviale n'est totalement à l'abri, mais manipuler Condorcet demande de connaître très précisément les intentions des autres, et se retourne facilement contre son auteur.",
      },
      {
        q: "Condorcet ou jugement majoritaire ?",
        a: "Condorcet compare les options entre elles ; le jugement majoritaire les évalue chacune sur une échelle absolue. Condorcet trouve le champion des duels quand il existe ; le jugement majoritaire donne toujours un résultat et mesure le niveau d'adhésion.",
      },
    ],
  },

  condorcet_random: {
    summary:
      "Condorcet, avec une porte de sortie : quand les duels tournent en rond, le vainqueur est tiré au sort parmi les options du blocage. Une décision garantie, sans arbitraire déguisé.",
    history: [
      "Le tirage au sort n'est pas un pis-aller : c'était le mode de désignation ordinaire de la démocratie athénienne, qui attribuait par le klérotérion la plupart des magistratures, réservant l'élection aux fonctions techniques.",
      "Il survit dans le droit électoral contemporain comme départage : de nombreux codes électoraux, dont le français, tranchent l'égalité parfaite par le sort ou par l'âge. Plusieurs États américains le font au sens littéral, en tirant une carte ou une pièce.",
      "En théorie du choix social, la loterie a un statut sérieux : elle reste l'un des rares moyens de trancher sans privilégier ni une option ni un votant quand les préférences bloquent. La randomisation restaure une forme d'équité que le déterminisme ne peut pas offrir.",
    ],
    mechanics: [
      "Tant qu'un vainqueur de Condorcet existe, cette variante est strictement identique à Condorcet : le hasard n'intervient jamais.",
      "Le sort n'entre en jeu qu'en cas de cycle, et pas n'importe où : Placet tire dans l'ENSEMBLE DE SMITH, le plus petit groupe d'options qui battent toutes celles qui en sont exclues. Une option dominée n'a donc aucune chance d'être désignée.",
      "Le résultat n'est pas reproductible : c'est le prix d'une décision garantie. À enjeu élevé, mieux vaut annoncer le tirage au groupe avant de l'exécuter.",
    ],
    example: {
      intro: "Trois options, un cycle parfait — le cas d'école du paradoxe.",
      head: ["Duel", "Résultat", "Vainqueur"],
      rows: [
        ["Lyon vs Bordeaux", "6 – 3", "Lyon"],
        ["Bordeaux vs Lille", "6 – 3", "Bordeaux"],
        ["Lille vs Lyon", "6 – 3", "Lille"],
      ],
      steps: [
        "Lyon bat Bordeaux, Bordeaux bat Lille, Lille bat Lyon : le cycle est complet.",
        "Aucune option ne gagne tous ses duels : Condorcet simple s'arrête ici.",
        "Les trois options forment l'ensemble de Smith ; le sort en désigne une, chacune avec une chance sur trois.",
      ],
      result:
        "Le hasard ne remplace pas le vote : il ne tranche qu'entre des options que le groupe a rendues strictement équivalentes. Toute autre règle de départage introduirait un biais que personne n'a voté.",
    },
    useCases: [
      "Décisions qui doivent absolument aboutir dans la journée, sur un sujet clivant.",
      "Groupes à trois camps nets, où le cycle est probable.",
      "Départage d'ex æquo parfaits, à la place d'une voix prépondérante contestable.",
      "Toute situation où le blocage coûte plus cher qu'un choix imparfait.",
    ],
    limits: [
      {
        t: "Non reproductible",
        d: "Deux dépouillements des mêmes bulletins peuvent donner deux vainqueurs. À annoncer AVANT le vote, sous peine de contestation légitime.",
      },
      {
        t: "Mal accepté culturellement",
        d: "« On a tiré au sort » passe mal, même quand c'est la solution la plus équitable. Expliquer le blocage est indispensable.",
      },
      {
        t: "Masque l'information",
        d: "Un cycle dit quelque chose du groupe : trois camps irréconciliables. Le tirage tranche sans que ce diagnostic soit discuté.",
      },
    ],
    faq: [
      {
        q: "Le hasard intervient-il toujours ?",
        a: "Non, presque jamais. Tant qu'une option gagne tous ses duels, elle est déclarée vainqueur exactement comme en Condorcet simple. Le tirage n'existe que pour les cycles.",
      },
      {
        q: "Qu'est-ce que l'ensemble de Smith ?",
        a: "Le plus petit groupe d'options tel que chacune de ses membres bat toutes les options extérieures. En cas de cycle, c'est le peloton de tête : le sort n'y sélectionne que des options réellement en course.",
      },
      {
        q: "Est-ce vraiment démocratique ?",
        a: "Autant que les alternatives, et plus honnête. En cas de cycle, TOUTE règle de départage — l'ordre alphabétique, l'ancienneté, la voix du président — privilégie quelqu'un. Le sort est le seul départage qui ne favorise personne, et il ne s'applique qu'entre options que le groupe a placées à égalité.",
      },
    ],
  },

  majority_judgment: {
    summary:
      "Chaque option reçoit une mention (de « à rejeter » à « très bien »), et c'est la mention MÉDIANE qui décide. Une méthode conçue pour résister au vote tactique.",
    history: [
      "Le jugement majoritaire est proposé en 2007 par Michel Balinski et Rida Laraki, chercheurs à l'École polytechnique et au CNRS, dans les Proceedings of the National Academy of Sciences. Leur livre de référence, « Majority Judgment: Measuring, Ranking, and Electing », paraît chez MIT Press en 2011.",
      "L'inspiration vient d'ailleurs que de la politique : les concours de vin, la gymnastique et le patinage artistique notent depuis longtemps sur des échelles verbales et écartent les extrêmes, parce que la moyenne y est trop facile à manipuler par un juge isolé.",
      "Les auteurs l'expérimentent en avril 2007 auprès des électeurs d'Orsay lors de l'élection présidentielle française, en parallèle du scrutin officiel. Depuis, plusieurs primaires citoyennes françaises l'ont employé, dont la Primaire populaire en 2022.",
    ],
    mechanics: [
      "Le votant attribue une mention à CHAQUE option, indépendamment des autres : il évalue, il ne classe pas. Deux options peuvent recevoir la même mention.",
      "Pour chaque option, on range les mentions reçues et l'on retient la médiane — la mention telle qu'une majorité juge « au moins aussi bien » et une majorité « au plus aussi bien ». La médiane, contrairement à la moyenne, est insensible aux notes extrêmes déposées par tactique.",
      "En cas d'égalité de médiane, on départage en retirant une à une les mentions médianes des options concernées, jusqu'à ce qu'elles divergent. Cela revient à comparer les proportions de partisans et d'opposants autour de la mention médiane.",
    ],
    example: {
      intro: "Trois options jugées par onze personnes sur une échelle à cinq mentions.",
      head: ["Option", "Mentions reçues", "Médiane"],
      rows: [
        ["Bordeaux", "3 Très bien, 5 Bien, 3 Passable", "Bien"],
        ["Lyon", "5 Très bien, 1 Bien, 5 À rejeter", "Bien"],
        ["Lille", "2 Très bien, 4 Passable, 5 Insuffisant", "Passable"],
      ],
      steps: [
        "Bordeaux et Lyon ont la même mention médiane : Bien.",
        "On retire une mention médiane à chacune et l'on recommence : Bordeaux conserve un socle plus large au-dessus de Bien.",
        "Lyon, très clivante (5 « Très bien » mais 5 « À rejeter »), passe derrière.",
      ],
      result:
        "Le jugement majoritaire préfère l'option largement estimée à celle qui polarise. Un scrutin à un tour aurait couronné Lyon sur ses cinq enthousiastes.",
    },
    useCases: [
      "Élections internes et primaires citoyennes, où l'on veut mesurer l'adhésion réelle.",
      "Évaluation de candidatures, de projets ou de fournisseurs sur des critères qualitatifs.",
      "Décisions où l'on veut détecter l'option clivante avant de l'adopter.",
      "Tout vote où l'intensité du soutien, et pas seulement son existence, doit peser.",
    ],
    limits: [
      {
        t: "Viole le critère de Condorcet",
        d: "Une option qui gagne tous ses duels peut ne pas avoir la meilleure médiane. Les deux méthodes mesurent des choses différentes, et l'on ne peut pas avoir les deux (théorème d'Arrow).",
      },
      {
        t: "Calibrage des mentions",
        d: "Le sens de « Passable » varie d'une personne à l'autre. L'échelle doit être explicitée avant le vote, sinon on additionne des jugements incomparables.",
      },
      {
        t: "Bulletin plus long",
        d: "Une mention par option : c'est plus qu'une coche, et cela se ressent au-delà d'une dizaine d'options.",
      },
      {
        t: "Départage technique",
        d: "La règle d'égalité par retrait des médianes est rigoureuse mais difficile à expliquer en séance.",
      },
    ],
    faq: [
      {
        q: "Pourquoi la médiane plutôt que la moyenne ?",
        a: "Parce que la moyenne s'achète. Un votant tactique qui met la note minimale au concurrent sérieux déplace fortement sa moyenne ; il ne déplace la médiane que d'un cran, et seulement s'ils sont nombreux à le faire. La médiane est le cœur de la méthode, pas un détail de calcul.",
      },
      {
        q: "Est-ce vraiment inmanipulable ?",
        a: "Non — le théorème de Gibbard-Satterthwaite l'interdit à toute méthode. Mais le jugement majoritaire limite très nettement le gain espéré d'un vote insincère, ce qui est le mieux que l'on puisse démontrer.",
      },
      {
        q: "Combien de mentions faut-il ?",
        a: "Cinq ou six, avec des libellés verbaux clairs. Moins, et l'on perd la nuance ; plus, et les votants ne distinguent plus les échelons voisins.",
      },
    ],
  },

  proportional: {
    summary:
      "Au lieu d'un vainqueur unique, on répartit des sièges au prorata des voix par la méthode d'Hondt. C'est le scrutin des assemblées, pas des décisions.",
    history: [
      "Le juriste belge Victor d'Hondt expose sa méthode dès 1878, dans une brochure publiée anonymement, et la systématise en ouvrage en 1882 ; la Belgique l'adopte par la loi de 1899 et l'applique dès les élections de 1900, en première mondiale. La formule était en réalité déjà connue : Thomas Jefferson l'avait proposée en 1792 pour répartir les sièges de la Chambre des représentants entre les États américains.",
      "Des variantes concurrentes existent depuis aussi longtemps : Sainte-Laguë (1910), équivalente à la méthode Webster de 1832, répartit plus favorablement les petites formations, et reste la référence en Scandinavie et en Nouvelle-Zélande.",
      "La méthode des restes les plus forts, dite de Hamilton, a été abandonnée aux États-Unis après le paradoxe de l'Alabama : en 1880, on constata qu'augmenter le nombre total de sièges de 299 à 300 FAISAIT PERDRE un siège à l'Alabama. Les États-Unis utilisent depuis 1941 la méthode Huntington-Hill.",
    ],
    mechanics: [
      "Pour chaque liste, on calcule la série des quotients voix/1, voix/2, voix/3… Les sièges vont aux plus grands quotients, tous partis confondus, jusqu'à épuisement.",
      "Cette règle des plus fortes moyennes favorise légèrement les grandes listes, de manière systématique et connue : c'est un choix politique en faveur de la gouvernabilité, pas un artefact de calcul.",
      "Un seuil d'éligibilité (5 % en Allemagne, 3 % pour les européennes françaises) écarte les très petites listes avant la répartition, pour éviter l'émiettement.",
    ],
    example: {
      intro: "Cent voix, cinq sièges à répartir entre trois listes par la méthode d'Hondt.",
      head: ["Liste", "Voix", "÷1", "÷2", "÷3"],
      rows: [
        ["A", "45", "45", "22,5", "15"],
        ["B", "35", "35", "17,5", "11,7"],
        ["C", "20", "20", "10", "6,7"],
      ],
      steps: [
        "Les cinq plus grands quotients toutes listes confondues : 45 (A), 35 (B), 22,5 (A), 20 (C), 17,5 (B).",
        "Répartition finale : A 2 sièges, B 2 sièges, C 1 siège.",
        "A obtient 40 % des sièges avec 45 % des voix ; C, 20 % des sièges avec 20 % des voix.",
      ],
      result:
        "Avec si peu de sièges, la proportionnalité reste grossière — c'est le nombre de sièges, bien plus que la formule, qui détermine la finesse de la représentation.",
    },
    useCases: [
      "Élections législatives dans la majorité des démocraties européennes.",
      "Élections européennes, et régionales françaises pour la part proportionnelle.",
      "Composition d'un conseil d'administration ou d'un bureau associatif.",
      "Répartition de budgets ou de créneaux entre groupes, au prorata des soutiens.",
    ],
    limits: [
      {
        t: "Ce n'est pas une décision",
        d: "La proportionnelle compose une assemblée. Pour trancher une question, il faut ensuite un vote — l'outil ne remplace pas la décision.",
      },
      {
        t: "Prime aux grandes listes",
        d: "D'Hondt arrondit systématiquement en faveur des plus gros. Sainte-Laguë est plus neutre, si c'est ce que vous cherchez.",
      },
      {
        t: "Seuils et émiettement",
        d: "Sans seuil, l'assemblée devient ingouvernable ; avec seuil, des voix ne sont plus représentées du tout.",
      },
      {
        t: "Paradoxes de répartition",
        d: "Le paradoxe de l'Alabama a montré qu'aucune méthode de répartition n'est exempte de comportements contre-intuitifs.",
      },
    ],
    faq: [
      {
        q: "D'Hondt ou Sainte-Laguë ?",
        a: "D'Hondt (quotients par 1, 2, 3…) favorise légèrement les grandes listes et facilite les majorités. Sainte-Laguë (par 1, 3, 5…) est plus fidèle aux petites. Le choix est politique et doit être fait avant le vote, jamais après.",
      },
      {
        q: "Pourquoi mes pourcentages de sièges ne collent-ils pas aux voix ?",
        a: "Parce qu'un siège est indivisible. Avec cinq sièges, la granularité minimale est de 20 % : aucune formule ne peut faire mieux. L'écart se resserre à mesure que le nombre de sièges augmente.",
      },
      {
        q: "Peut-on l'utiliser à quelques personnes ?",
        a: "Oui, pour répartir des ressources — des créneaux, un budget, des places. Pour choisir entre des options, prenez plutôt l'approbation ou Condorcet.",
      },
    ],
  },

  list: {
    summary:
      "On vote pour une liste entière ; celle qui arrive en tête reçoit d'office la moitié des sièges, le reste étant réparti à la proportionnelle. C'est le scrutin des municipales françaises.",
    history: [
      "Le scrutin de liste avec prime majoritaire est fixé pour les communes françaises de 3 500 habitants et plus par la loi du 19 novembre 1982, qui met fin au scrutin majoritaire de liste intégral et introduit une dose de proportionnelle.",
      "Une seconde loi, du 31 décembre 1982, crée le régime particulier de Paris, Lyon et Marseille (dit PLM), avec des élections par secteurs — mécanisme qui produira plusieurs fois un maire élu sans être en tête des voix de la ville.",
      "Le principe a été étendu aux élections régionales, avec une prime réduite à 25 % des sièges, par les réformes de 1999 et 2003. La logique est constante : arbitrer explicitement entre représentativité et capacité à gouverner. Enfin, la loi du 21 mai 2025 supprime le seuil — depuis les municipales de mars 2026, toutes les communes votent au scrutin de liste, et le panachage disparaît.",
    ],
    mechanics: [
      "Chaque votant choisit une liste, sans panachage. La liste arrivée en tête reçoit immédiatement 50 % des sièges — c'est la prime majoritaire.",
      "Les 50 % restants sont répartis à la proportionnelle entre TOUTES les listes ayant franchi le seuil, y compris la liste en tête, qui obtient donc largement plus que sa part de voix.",
      "Aux municipales, un second tour a lieu si aucune liste n'atteint la majorité absolue, avec possibilité de fusion entre listes qualifiées — d'où l'importance des négociations d'entre-deux-tours.",
    ],
    example: {
      intro: "Vingt sièges à pourvoir, trois listes, prime majoritaire de 50 %.",
      head: ["Liste", "Voix", "Prime", "Proportionnelle", "Total"],
      rows: [
        ["A", "45 %", "10", "4", "14"],
        ["B", "35 %", "0", "4", "4"],
        ["C", "20 %", "0", "2", "2"],
      ],
      steps: [
        "La liste A, en tête, reçoit d'emblée 10 sièges sur 20.",
        "Les 10 sièges restants sont répartis à la proportionnelle entre les trois listes.",
        "A totalise 14 sièges sur 20, soit 70 % de l'assemblée avec 45 % des voix.",
      ],
      result:
        "La distorsion n'est pas un défaut : elle est l'objet même du mécanisme. Une majorité de gestion se dégage dès le soir du vote, au prix assumé d'une sous-représentation des autres listes.",
    },
    useCases: [
      "Élections municipales françaises — dans toutes les communes depuis la réforme de 2025.",
      "Élections régionales, avec une prime de 25 %.",
      "Élections d'un bureau ou d'un conseil sur listes concurrentes.",
      "Toute assemblée qui doit être à la fois représentative et capable de décider.",
    ],
    limits: [
      {
        t: "Distorsion voulue",
        d: "Une liste minoritaire en voix devient majoritaire en sièges. C'est le contrat du mécanisme, à condition qu'il soit annoncé.",
      },
      {
        t: "Pas de panachage",
        d: "On prend une liste en bloc. Le votant ne peut pas approuver une personne sans approuver toute l'équipe.",
      },
      {
        t: "Le poids des fusions",
        d: "Entre les deux tours, l'essentiel se joue en négociation, hors du regard des votants.",
      },
    ],
    faq: [
      {
        q: "Pourquoi une prime majoritaire ?",
        a: "Pour éviter les conseils ingouvernables. Sans elle, une commune peut se retrouver sans majorité stable pendant six ans. C'est un choix de gouvernabilité, payé en représentativité.",
      },
      {
        q: "La liste en tête touche-t-elle aussi la proportionnelle ?",
        a: "Oui. Elle reçoit la prime PUIS sa part proportionnelle des sièges restants, ce qui explique qu'elle atteigne souvent 70 % de l'assemblée.",
      },
      {
        q: "Utile hors du contexte municipal ?",
        a: "Chaque fois que vous élisez une équipe qui devra fonctionner ensemble, plutôt que des individus indépendants. Pour de simples options, c'est disproportionné.",
      },
    ],
  },

  grand_electors: {
    summary:
      "Les votants sont répartis en circonscriptions ; chacune désigne un champion local qui rafle tous ses grands électeurs. Le vainqueur du vote populaire peut perdre.",
    history: [
      "Le collège électoral américain naît du compromis constitutionnel de 1787 : les constituants ne veulent ni d'une élection par le Congrès, ni d'un vote populaire direct qu'ils jugent risqué. Chaque État reçoit un nombre de grands électeurs égal à sa représentation au Congrès.",
      "La règle du « winner-take-all » à l'échelle de l'État n'est pas dans la Constitution : elle a été adoptée progressivement par les États eux-mêmes, pour maximiser leur poids. Le Maine et le Nebraska y dérogent encore aujourd'hui.",
      "En France, le Sénat est élu au suffrage indirect par environ 162 000 grands électeurs, très majoritairement des délégués des conseils municipaux — ce qui explique structurellement sa surreprésentation des communes rurales.",
    ],
    mechanics: [
      "On répartit les votants en circonscriptions, chacune dotée d'un nombre de grands électeurs. Dans Placet, ce découpage et cette pondération se règlent librement.",
      "Chaque circonscription organise son propre décompte — la méthode locale est au choix — et attribue ses grands électeurs au vainqueur local, soit en bloc, soit proportionnellement.",
      "Le total des grands électeurs désigne le vainqueur. Ce total ne dépend pas du nombre de voix, mais de leur RÉPARTITION géographique : c'est toute la différence.",
    ],
    example: {
      intro: "Trois circonscriptions, 100 votants, 10 grands électeurs chacune.",
      head: ["Circonscription", "A", "B", "Grands électeurs"],
      rows: [
        ["Nord", "18", "15", "10 pour A"],
        ["Centre", "17", "16", "10 pour A"],
        ["Sud", "4", "30", "10 pour B"],
      ],
      steps: [
        "A gagne le Nord et le Centre de justesse : 20 grands électeurs.",
        "B écrase le Sud : 10 grands électeurs.",
        "Au total des voix : A 39, B 61. B a 22 voix d'avance et perd l'élection.",
      ],
      result:
        "Les voix excédentaires de B dans le Sud sont perdues. Ce phénomène — concentrer ses soutiens est inefficace — est au cœur de toutes les critiques du scrutin indirect, et du charcutage électoral.",
    },
    useCases: [
      "Élection présidentielle américaine.",
      "Élection du Sénat français par les grands électeurs.",
      "Fédérations, confédérations et groupes d'entreprises votant par entités.",
      "Toute organisation où les composantes doivent peser en tant que telles, pas seulement par leur effectif.",
    ],
    limits: [
      {
        t: "Vainqueur du vote populaire battu",
        d: "C'est arrivé quatre fois aux États-Unis : 1876, 1888, 2000 et 2016. Ce n'est pas un accident du système, mais une conséquence directe de sa logique.",
      },
      {
        t: "Voix de poids inégal",
        d: "Un électeur d'un petit État pèse plusieurs fois celui d'un grand, par construction.",
      },
      {
        t: "Charcutage électoral",
        d: "Qui trace les frontières influence le résultat autant que les votants. Le gerrymandering est nommé d'après Elbridge Gerry, en 1812.",
      },
      {
        t: "Campagne concentrée",
        d: "Seules les circonscriptions indécises comptent ; les autres sont ignorées des deux camps.",
      },
    ],
    faq: [
      {
        q: "Comment perdre avec plus de voix ?",
        a: "En gagnant les mauvaises circonscriptions. Les voix au-delà du seuil de victoire locale ne servent à rien : mieux vaut gagner trois circonscriptions d'une voix que d'en écraser une par mille.",
      },
      {
        q: "À quoi cela sert-il hors politique ?",
        a: "À faire peser des entités plutôt que des individus : filiales d'un groupe, sections d'une fédération, antennes d'une association. Chacune parle d'une voix, quel que soit son effectif.",
      },
      {
        q: "Peut-on répartir autrement qu'en bloc ?",
        a: "Oui. Placet permet une répartition proportionnelle des grands électeurs de chaque circonscription, ce qui atténue fortement les distorsions — c'est le choix du Maine et du Nebraska.",
      },
    ],
  },

  // ---------------------------------------------------------- AFFECTATION ----
  serial_dictatorship: {
    summary:
      "Un ordre de passage est fixé, souvent par tirage au sort, puis chacun prend à son tour ce qu'il préfère parmi ce qui reste. Simple, incontestable, et honnête : mentir n'y sert jamais.",
    history: [
      "Le procédé est aussi vieux que le partage, mais la théorie du choix social l'a formalisé sous le nom de « serial dictatorship » : à chaque étape, une personne décide seule — d'où le terme, qui décrit l'algorithme et non un régime.",
      "Il structure les drafts sportifs nord-américains, où l'ordre inversé du classement sert à rééquilibrer les équipes ; la loterie du draft, introduite par la NBA en 1985, y ajoute du hasard pour décourager les défaites volontaires.",
      "Les économistes l'étudient dans le cadre du problème d'attribution de logements (« house allocation »), posé par Hylland et Zeckhauser en 1979. La démonstration qu'il s'agit d'un des rares mécanismes à la fois efficace et non manipulable viendra plus tard, avec Abdulkadiroğlu et Sönmez (1998) puis Svensson (1999).",
    ],
    mechanics: [
      "On fixe un ordre de passage. Le tirage au sort est le choix par défaut, car tout autre ordre doit être justifié — l'ancienneté, le besoin, le mérite sont légitimes, mais ce sont des décisions politiques.",
      "Chacun, à son tour, prend son option préférée parmi celles encore disponibles. Une seule passe suffit ; le résultat est immédiat et vérifiable ligne à ligne.",
      "Deux propriétés démontrées : le résultat est Pareto-efficace (aucun réarrangement ne peut améliorer quelqu'un sans léser un autre) et le mécanisme est non manipulable (déclarer ses vraies préférences est toujours optimal).",
    ],
    example: {
      intro: "Quatre personnes, quatre missions, ordre tiré au sort : Chloé, Ali, Bruno, Dana.",
      head: ["Personne", "1ᵉʳ vœu", "2ᵉ vœu", "Obtient"],
      rows: [
        ["Chloé", "Audit", "Refonte", "Audit"],
        ["Ali", "Audit", "Support", "Support"],
        ["Bruno", "Refonte", "Audit", "Refonte"],
        ["Dana", "Support", "Formation", "Formation"],
      ],
      steps: [
        "Chloé passe la première et prend Audit, son premier vœu.",
        "Ali voulait Audit : plus disponible, il prend Support, son deuxième vœu.",
        "Bruno obtient Refonte, son premier vœu ; il reste Formation pour Dana.",
      ],
      result:
        "Trois personnes sur quatre obtiennent leur premier vœu. La qualité du résultat dépend entièrement du tirage : c'est pourquoi l'ordre doit être annoncé et vérifiable avant l'affectation.",
    },
    useCases: [
      "Répartition de missions, de créneaux, de bureaux ou de matériel dans une équipe.",
      "Drafts sportifs et sélections de joueurs.",
      "Attribution de chambres en internat ou en colocation.",
      "Choix de sujets de stage ou de mémoire entre étudiants.",
    ],
    limits: [
      {
        t: "Inégalité de rang",
        d: "Le premier obtient presque toujours son vœu, le dernier presque jamais. Sur des tours répétés, il faut faire tourner l'ordre.",
      },
      {
        t: "Pas d'équité d'envie",
        d: "Le dernier servi peut légitimement envier le premier. L'efficacité ne garantit pas l'absence de jalousie.",
      },
      {
        t: "Ignore l'intensité",
        d: "Un vœu vital et un vœu tiède pèsent pareil. Si l'urgence compte, la satisfaction maximale est plus adaptée.",
      },
    ],
    faq: [
      {
        q: "Faut-il tirer l'ordre au sort ?",
        a: "C'est le défaut le plus défendable, parce qu'il n'exige aucune justification. Tout autre ordre — ancienneté, besoin, mérite — est un arbitrage à assumer publiquement avant l'affectation, jamais après.",
      },
      {
        q: "Ai-je intérêt à mentir sur mes vœux ?",
        a: "Non, jamais, et c'est démontré. Quand votre tour vient, vous prenez le meilleur choix restant : déclarer autre chose ne peut que vous desservir. C'est ce qu'on appelle un mécanisme non manipulable.",
      },
      {
        q: "Tour de choix ou satisfaction maximale ?",
        a: "Le tour de choix est transparent et incontestable, mais dépend du tirage. La satisfaction maximale optimise le total du groupe, au prix d'un calcul que personne ne peut refaire de tête. Choisissez selon ce que le groupe devra accepter : la clarté ou l'optimum.",
      },
    ],
  },

  optimal_sum: {
    summary:
      "Plutôt que de servir les gens l'un après l'autre, on cherche l'affectation qui minimise la somme des rangs obtenus. Le meilleur résultat collectif possible, calculé d'un coup.",
    history: [
      "C'est le « problème d'affectation », l'un des classiques de la recherche opérationnelle. Harold Kuhn en publie en 1955 une solution efficace qu'il baptise « algorithme hongrois », en hommage aux travaux des mathématiciens hongrois Dénes Kőnig et Jenő Egerváry dont il s'inspire.",
      "On découvrira plus tard que Carl Gustav Jacobi avait résolu le problème au XIXᵉ siècle, dans des travaux publiés à titre posthume en 1890 — soit soixante-cinq ans avant sa redécouverte.",
      "L'algorithme est aujourd'hui un outil industriel banal : affectation d'équipages à des vols, de tâches à des machines, de véhicules à des courses. Toute application qui apparie deux ensembles en optimisant un coût total en est l'héritière.",
    ],
    mechanics: [
      "Chaque personne classe les options. Un vœu de rang 1 coûte 1, de rang 2 coûte 2, et ainsi de suite : la matrice des coûts est construite.",
      "On cherche l'affectation qui minimise le coût TOTAL, en explorant toutes les combinaisons possibles de manière intelligente — jamais une à une, ce qui serait hors de portée.",
      "Conséquence importante : le calcul peut sacrifier une personne pour en soulager plusieurs. L'optimum est collectif, et c'est exactement ce qu'on lui demande.",
    ],
    example: {
      intro: "Trois personnes, trois missions. Les cases donnent le rang du vœu.",
      head: ["", "Audit", "Refonte", "Support"],
      rows: [
        ["Chloé", "1", "2", "3"],
        ["Ali", "1", "3", "2"],
        ["Bruno", "2", "1", "3"],
      ],
      steps: [
        "Servir tout le monde en premier vœu est impossible : Chloé et Ali visent Audit.",
        "Chloé→Audit, Bruno→Refonte, Ali→Support : coût total 1 + 1 + 2 = 4.",
        "Ali→Audit, Bruno→Refonte, Chloé→Support : coût total 1 + 1 + 3 = 5.",
      ],
      result:
        "La première combinaison est retenue : à qualité de vœux comparable, elle coûte moins cher au groupe. Aucun autre arrangement ne fait mieux que 4.",
    },
    useCases: [
      "Répartir des missions ou des dossiers dans une équipe en maximisant la satisfaction globale.",
      "Affecter des élèves à des ateliers, des options ou des projets.",
      "Attribuer des créneaux de garde ou des astreintes.",
      "Planifier des équipages, des tournées ou des machines — l'usage industriel historique.",
    ],
    limits: [
      {
        t: "Manipulable",
        d: "Contrairement au tour de choix, mentir peut être payant : classer bas une option très demandée peut vous en faire attribuer une meilleure. La méthode n'est pas à l'épreuve de la stratégie.",
      },
      {
        t: "Optimum collectif, pas individuel",
        d: "Quelqu'un peut recevoir son dernier vœu pour que la somme baisse. C'est mathématiquement optimal et humainement difficile à annoncer.",
      },
      {
        t: "Difficile à vérifier",
        d: "Personne ne peut refaire le calcul de tête. La confiance repose sur l'outil, ce qui affaiblit la légitimité perçue.",
      },
      {
        t: "Rangs traités comme des distances",
        d: "L'écart entre le 1ᵉʳ et le 2ᵉ vœu est compté comme celui entre le 4ᵉ et le 5ᵉ, alors qu'il ne se vit pas du tout pareil.",
      },
    ],
    faq: [
      {
        q: "En quoi est-ce mieux que le tour de choix ?",
        a: "En moyenne, le groupe est plus satisfait : l'algorithme voit toutes les combinaisons d'un coup, là où le tour de choix subit l'ordre de passage. Le prix à payer est la lisibilité — et la possibilité de mentir.",
      },
      {
        q: "Que se passe-t-il en cas d'égalité entre deux affectations ?",
        a: "Plusieurs solutions peuvent atteindre le même coût minimal ; l'une est retenue. Si l'enjeu est fort, annoncez à l'avance la règle de départage, ou passez au tour de choix, dont la mécanique est reproductible.",
      },
      {
        q: "Faut-il autant de places que de personnes ?",
        a: "Non, mais l'écart se paie : s'il manque des places, quelqu'un ne sera pas affecté ; s'il y en a trop, certaines resteront vides. Le calcul reste valide dans les deux cas.",
      },
    ],
  },

  top_trading_cycles: {
    summary:
      "Chacun possède déjà quelque chose et voudrait mieux. On cherche les boucles d'échange où tout le monde progresse, et on les exécute. Personne ne peut y perdre.",
    history: [
      "Lloyd Shapley et Herbert Scarf publient en 1974, dans le Journal of Mathematical Economics, l'article fondateur sur le « housing market ». Ils y attribuent l'algorithme des cycles d'échange les plus élevés à David Gale, et démontrent qu'il produit toujours une allocation dans le cœur du marché.",
      "Atila Abdulkadiroğlu et Tayfun Sönmez l'étendent en 1999 aux situations mixtes, où certains occupants sont en place et d'autres arrivent — le cas concret des résidences universitaires américaines.",
      "Son application la plus spectaculaire est médicale : les programmes d'échange de reins entre paires donneur-receveur incompatibles, formalisés par Roth, Sönmez et Ünver au début des années 2000, reposent sur cette mécanique de cycles. Alvin Roth et Lloyd Shapley reçoivent le prix Nobel d'économie 2012 pour l'ensemble de ces travaux.",
    ],
    mechanics: [
      "Chacun part avec une dotation : sa mission actuelle, son bureau, son créneau. Le nombre de personnes et de biens doit donc être égal.",
      "Chacun pointe le bien qu'il préfère. On suit les flèches : elles finissent toujours par former au moins un cycle — éventuellement une boucle sur soi, quand quelqu'un a déjà ce qu'il préfère.",
      "Les cycles sont exécutés : chacun reçoit ce qu'il pointait. Les personnes servies sortent avec leur bien, puis l'on recommence avec les autres, jusqu'à épuisement.",
      "Trois propriétés démontrées : le résultat est Pareto-efficace, individuellement rationnel (personne ne repart avec moins bien que sa dotation), et le mécanisme est non manipulable.",
    ],
    example: {
      intro: "Trois personnes, chacune avec un créneau, chacune en voulant un autre.",
      head: ["Personne", "Créneau actuel", "Créneau visé", "Obtient"],
      rows: [
        ["Chloé", "Lundi", "Mardi", "Mardi"],
        ["Ali", "Mardi", "Lundi", "Lundi"],
        ["Bruno", "Mercredi", "Mercredi", "Mercredi"],
      ],
      steps: [
        "Chloé pointe le créneau d'Ali, Ali pointe celui de Chloé : c'est un cycle de longueur 2.",
        "Le cycle est exécuté : les deux échangent et sortent satisfaits.",
        "Bruno pointe son propre créneau : boucle sur soi, il le conserve.",
      ],
      result:
        "Deux échanges, aucun perdant. C'est la garantie centrale de la méthode : on ne peut jamais y sortir moins bien loti qu'on y est entré.",
    },
    useCases: [
      "Échanger des créneaux de garde, des astreintes ou des jours de congé.",
      "Réattribuer des bureaux, du matériel ou des places de parking déjà occupés.",
      "Permuter des missions ou des portefeuilles clients au sein d'une équipe.",
      "Échanges de reins entre paires incompatibles — l'application qui a valu un Nobel.",
    ],
    limits: [
      {
        t: "Exige une dotation initiale",
        d: "Sans point de départ, la méthode n'a pas de sens. Pour une première attribution, prenez le tour de choix.",
      },
      {
        t: "Échanges seulement",
        d: "Aucun bien n'est créé ni supprimé : on redistribue l'existant, ni plus ni moins.",
      },
      {
        t: "Effectifs strictement égaux",
        d: "Autant de biens que de personnes, sinon la mécanique des cycles se casse.",
      },
    ],
    faq: [
      {
        q: "Puis-je y perdre par rapport à ma situation actuelle ?",
        a: "Non, jamais, et c'est démontré : la rationalité individuelle est une propriété prouvée de l'algorithme. Si aucun échange ne vous convient, vous conservez votre dotation — c'est la boucle sur soi.",
      },
      {
        q: "Ai-je intérêt à déclarer un faux ordre de préférence ?",
        a: "Non. Le mécanisme est non manipulable : mentir ne peut pas améliorer votre résultat, et peut vous faire manquer un cycle qui vous convenait.",
      },
      {
        q: "Et si personne ne veut échanger ?",
        a: "Tout le monde pointe son propre bien, tous les cycles sont des boucles, et rien ne bouge. Le résultat est valide : il dit que la répartition actuelle est déjà optimale.",
      },
    ],
  },

  stable_roommates: {
    summary:
      "Les participants se classent entre eux et sont appariés deux à deux, sans côté proposant ni côté disposant. Aucune paire ne doit préférer se quitter mutuellement.",
    history: [
      "Le problème est posé en 1962 par David Gale et Lloyd Shapley, à la toute fin de leur article fondateur sur le mariage stable : et si, au lieu de deux groupes distincts, tout le monde appartenait au même ensemble ? Ils signalent que leur algorithme ne s'y applique pas, et laissent la question ouverte.",
      "Ils démontrent au passage qu'un appariement stable peut tout bonnement NE PAS EXISTER — différence essentielle avec le mariage stable, où il en existe toujours un.",
      "Robert Irving publie en 1985 le premier algorithme en temps polynomial : il détermine si une solution stable existe et la construit le cas échéant, en deux phases dont la seconde élimine méthodiquement des « rotations ».",
    ],
    mechanics: [
      "Chacun classe TOUS les autres participants. Il n'y a qu'un seul groupe, donc aucune asymétrie entre proposants et receveurs.",
      "Première phase : chacun propose au mieux classé qui ne l'a pas encore éconduit ; les propositions améliorantes sont provisoirement acceptées, les moins bonnes rejetées. On obtient une table réduite.",
      "Seconde phase : on repère et supprime les rotations — des chaînes de préférences cycliques qui empêchent la stabilité — jusqu'à ce que chacun n'ait plus qu'un partenaire, ou que la table se vide, ce qui prouve l'absence de solution.",
      "L'appariement obtenu est stable : aucune paire de personnes non appariées ensemble ne se préfère mutuellement à son partenaire actuel.",
    ],
    example: {
      intro: "Quatre personnes à apparier en binômes, chacune ayant classé les trois autres.",
      head: ["Personne", "1ᵉʳ", "2ᵉ", "3ᵉ"],
      rows: [
        ["Chloé", "Ali", "Bruno", "Dana"],
        ["Ali", "Chloé", "Dana", "Bruno"],
        ["Bruno", "Dana", "Chloé", "Ali"],
        ["Dana", "Bruno", "Ali", "Chloé"],
      ],
      steps: [
        "Chloé et Ali se placent mutuellement en premier : la paire s'impose.",
        "Bruno et Dana font de même : seconde paire.",
        "Aucune paire extérieure ne se préfère mutuellement : l'appariement est stable.",
      ],
      result:
        "Ici, les préférences s'emboîtent parfaitement. Modifiez un seul classement et l'appariement stable peut disparaître complètement — c'est la fragilité propre à ce problème.",
    },
    useCases: [
      "Constituer des binômes de travail, de relecture ou de pair programming.",
      "Attribuer des colocataires ou des compagnons de chambre.",
      "Apparier des partenaires d'entraînement ou de tournoi.",
      "Organiser du mentorat entre pairs, sans hiérarchie entre les deux rôles.",
    ],
    limits: [
      {
        t: "Peut n'avoir aucune solution",
        d: "Contrairement au mariage stable, la stabilité n'est pas garantie. C'est un résultat démontré, pas une faiblesse de l'implémentation.",
      },
      {
        t: "Effectif pair obligatoire",
        d: "Avec un nombre impair, quelqu'un reste seul par construction.",
      },
      {
        t: "Classement complet exigeant",
        d: "Chacun doit classer tous les autres : le coût grimpe vite avec l'effectif, et classer ses collègues n'est pas anodin socialement.",
      },
    ],
    faq: [
      {
        q: "Que se passe-t-il si aucune solution stable n'existe ?",
        a: "L'outil le dit franchement. C'est une information réelle sur le groupe : les préférences forment un cycle irréductible. À vous d'ajuster — apparier par affinité déclarée, ou accepter une instabilité assumée.",
      },
      {
        q: "Quelle différence avec Gale-Shapley deux groupes ?",
        a: "Gale-Shapley suppose deux ensembles distincts qui se classent mutuellement (candidats et formations) et garantit toujours une solution. Ici, tout le monde est dans le même ensemble, il n'y a pas de côté avantagé — mais la garantie d'existence disparaît.",
      },
      {
        q: "Que signifie « stable » exactement ?",
        a: "Qu'il n'existe aucune paire de personnes qui, sans être appariées ensemble, se préféreraient mutuellement à leur partenaire actuel. Une telle paire quitterait le dispositif : c'est précisément ce que la stabilité empêche.",
      },
    ],
  },

  gale_shapley: {
    summary:
      "Deux groupes se classent mutuellement — candidats et formations, mentorés et mentors. L'acceptation différée produit toujours un appariement stable. C'est le principe de Parcoursup.",
    history: [
      "David Gale et Lloyd Shapley publient en 1962 « College Admissions and the Stability of Marriage » dans l'American Mathematical Monthly. Ils y démontrent qu'un appariement stable existe TOUJOURS entre deux groupes, et donnent un algorithme simple pour le construire : l'acceptation différée.",
      "Coup de théâtre historique : le National Resident Matching Program, qui affecte depuis 1952 les internes américains aux hôpitaux, utilisait déjà un algorithme équivalent — découvert empiriquement, dix ans avant sa théorisation. Alvin Roth le démontre en 1984, et pilote sa refonte de 1998 pour traiter le cas des couples.",
      "Roth et Shapley reçoivent le prix Nobel d'économie 2012 pour la théorie des allocations stables et la conception de marchés. En France, Parcoursup applique ce principe depuis 2018, en remplacement d'APB, avec un répondeur automatique qui joue le rôle de l'acceptation différée.",
    ],
    mechanics: [
      "Deux groupes distincts se classent mutuellement. Le côté 1 propose, le côté 2 dispose — et chaque entrée du côté 2 peut avoir une capacité de plusieurs places.",
      "Chaque proposant sollicite son premier choix. Chaque receveur retient provisoirement les meilleurs candidats dans la limite de sa capacité et écarte les autres. Rien n'est définitif : c'est tout le sens de l'acceptation DIFFÉRÉE.",
      "Les candidats écartés proposent à leur choix suivant, ce qui peut déloger un candidat provisoirement retenu, qui repropose à son tour. On s'arrête quand plus personne n'a de proposition à faire.",
      "Le résultat est stable : aucun couple candidat-formation ne se préférerait mutuellement à son affectation. Il est de plus OPTIMAL pour le côté proposant — parmi tous les appariements stables, chaque proposant obtient le meilleur possible.",
    ],
    example: {
      intro: "Trois candidats, trois formations d'une place chacune, classements croisés.",
      head: ["Candidat", "Vœux", "Formation", "Classement"],
      rows: [
        ["Chloé", "A, B, C", "A", "Ali, Chloé, Bruno"],
        ["Ali", "A, C, B", "B", "Chloé, Bruno, Ali"],
        ["Bruno", "B, A, C", "C", "Bruno, Chloé, Ali"],
      ],
      steps: [
        "Tour 1 : Chloé et Ali proposent à A, Bruno à B. A préfère Ali et écarte Chloé ; B retient Bruno.",
        "Tour 2 : Chloé propose à B. B préfère Chloé à Bruno et permute — Bruno est délogé.",
        "Tour 3 : Bruno propose à A, qui garde Ali ; puis à C, qui l'accepte. Fin : Ali→A, Chloé→B, Bruno→C.",
      ],
      result:
        "Bruno a été retenu puis délogé : c'est la mécanique du différé, et la raison pour laquelle les résultats de Parcoursup bougent pendant plusieurs semaines. Le résultat final est stable.",
    },
    useCases: [
      "Parcoursup et les affectations post-bac françaises.",
      "Internat médical américain (NRMP) depuis 1952.",
      "Affectation d'élèves aux écoles à New York et Boston, refondue par Roth et ses collègues.",
      "Programmes de mentorat, stages, attributions de projets entre deux populations distinctes.",
    ],
    limits: [
      {
        t: "Asymétrie structurelle",
        d: "Le côté qui propose obtient le meilleur appariement stable possible ; l'autre, le moins bon. Décider qui propose est donc une décision politique, pas technique.",
      },
      {
        t: "Non manipulable d'un seul côté",
        d: "Classer sincèrement est optimal pour les proposants — c'est démontré. Le côté receveur, lui, peut parfois gagner à classer tactiquement.",
      },
      {
        t: "Des non-affectés",
        d: "S'il manque des places, certains restent sans affectation. L'algorithme n'en crée pas.",
      },
      {
        t: "Angoisse de l'attente",
        d: "Les affectations provisoires bougent jusqu'à la fin. Mathématiquement sain, socialement éprouvant — Parcoursup en fait l'expérience chaque été.",
      },
    ],
    faq: [
      {
        q: "Pourquoi mon affectation change-t-elle en cours de route ?",
        a: "Parce que l'acceptation est différée : une place vous est réservée provisoirement, et un candidat mieux classé peut vous en déloger — comme vous pouvez en déloger un autre ailleurs. Le processus ne se fige qu'à la fin, et c'est ce qui garantit la stabilité du résultat.",
      },
      {
        q: "Ai-je intérêt à classer tactiquement mes vœux ?",
        a: "Si vous êtes du côté proposant — les candidats, dans Parcoursup — non : classer sincèrement est prouvé optimal. Mettre en tête un vœu que vous jugez « réaliste » plutôt que celui que vous voulez vraiment ne peut que vous nuire.",
      },
      {
        q: "Que veut dire « stable » ?",
        a: "Qu'aucun couple candidat-formation ne se préférerait mutuellement à ce qu'il a obtenu. Sans cette propriété, des accords parallèles se noueraient hors du dispositif — c'est exactement ce qui arrivait aux États-Unis avant 1952.",
      },
      {
        q: "Quelle différence avec le tour de choix ?",
        a: "Le tour de choix ne fait classer qu'un seul côté : les options n'ont pas d'avis. Ici, les deux côtés se classent, et l'affectation doit satisfaire les deux — d'où la notion de stabilité, qui n'a pas de sens dans un tour de choix.",
      },
    ],
  },
};

export default fr;
