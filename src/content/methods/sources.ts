// Bibliographie des fiches de fond. Volontairement SANS LANGUE : une référence
// académique ne se traduit pas (« Econometrica 41(4), 1973 » s'écrit pareil en
// espagnol), donc un seul fichier sert les 4 locales — seul le titre de section
// vit dans i18n. C'est aussi ce qui garantit qu'une correction se fait UNE fois.
//
// Règle de contenu : on cite la SOURCE PRIMAIRE (l'article ou le texte de loi
// qui établit le fait), pas une vulgarisation. Chaque entrée doit être
// vérifiable — d'où le DOI ou l'identifiant stable quand il existe.

export interface Source {
  /** Auteurs, forme académique « Nom, Prénom ». Vide pour un texte de loi. */
  a?: string;
  /** Titre de l'article, de l'ouvrage ou de la norme. */
  t: string;
  /** Revue / éditeur, volume, pages — où la trouver. */
  w: string;
  /** Année de publication. */
  y: string;
  /** Lien stable : DOI de préférence, sinon Legifrance / archive officielle. */
  url?: string;
}

export const SOURCES: Record<string, Source[]> = {
  simple_vote: [
    { a: "Duverger, Maurice", t: "Les partis politiques", w: "Armand Colin, Paris", y: "1951" },
    {
      a: "Riker, William H.",
      t: "The Two-Party System and Duverger's Law: An Essay on the History of Political Science",
      w: "American Political Science Review, 76(4), 753-766",
      y: "1982",
      url: "https://doi.org/10.2307/1962968",
    },
    {
      a: "Farrell, David M.",
      t: "Electoral Systems: A Comparative Introduction",
      w: "Palgrave Macmillan, 2e édition",
      y: "2011",
    },
  ],

  two_round: [
    {
      // La règle des deux tours au suffrage universel direct ne vient PAS du
      // texte de 1958 (qui prévoyait un collège électoral) mais de la révision
      // de 1962 : le lien pointe l'article, pas la Constitution entière.
      t: "Constitution du 4 octobre 1958, article 7 (élection du président de la République, rédaction issue de la loi constitutionnelle n° 62-1292 du 6 novembre 1962)",
      w: "Légifrance",
      y: "1958, révisé en 1962",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006527465",
    },
    {
      t: "Code électoral, article L. 162 (second tour des élections législatives, seuil de 12,5 % des inscrits)",
      w: "Légifrance",
      y: "en vigueur",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006353380",
    },
    {
      a: "Fishburn, Peter C. et Brams, Steven J.",
      t: "Paradoxes of Preferential Voting",
      w: "Mathematics Magazine, 56(4), 207-214",
      y: "1983",
      url: "https://doi.org/10.2307/2689808",
    },
  ],

  approval: [
    {
      a: "Brams, Steven J. et Fishburn, Peter C.",
      t: "Approval Voting",
      w: "American Political Science Review, 72(3), 831-847",
      y: "1978",
      url: "https://doi.org/10.2307/1955105",
    },
    {
      a: "Brams, Steven J. et Fishburn, Peter C.",
      t: "Approval Voting",
      w: "Birkhäuser, Boston (2e édition, Springer, 2007)",
      y: "1983",
    },
    {
      // Indispensable : c'est cette source qui documente aussi les ABANDONS
      // (l'IEEE y renonce en 2002), ce que la seule littérature de 1978 ignore.
      a: "Brams, Steven J. et Fishburn, Peter C.",
      t: "Going from theory to practice: the mixed success of approval voting",
      w: "Social Choice and Welfare, 25(2-3), 457-474",
      y: "2005",
      url: "https://doi.org/10.1007/s00355-005-0013-y",
    },
    {
      a: "Lines, Marji",
      t: "Approval Voting and Strategy Analysis: A Venetian Example",
      w: "Theory and Decision, 20(2), 155-172",
      y: "1986",
      url: "https://doi.org/10.1007/BF00135090",
    },
  ],

  borda: [
    {
      a: "Borda, Jean-Charles de",
      t: "Mémoire sur les élections au scrutin",
      w: "Histoire de l'Académie royale des sciences, année 1781, partie « Mémoires », Imprimerie royale, Paris, p. 657-665 — lu en 1770, volume effectivement imprimé en 1784",
      y: "1781",
    },
    {
      a: "Black, Duncan",
      t: "The Theory of Committees and Elections",
      w: "Cambridge University Press",
      y: "1958",
    },
    {
      a: "Saari, Donald G.",
      t: "The Borda Dictionary",
      w: "Social Choice and Welfare, 7(4), 279-317",
      y: "1990",
      url: "https://doi.org/10.1007/BF01376279",
    },
    {
      a: "McLean, Iain et Urken, Arnold B. (dir.)",
      t: "Classics of Social Choice",
      w: "University of Michigan Press",
      y: "1995",
    },
  ],

  condorcet: [
    {
      a: "Condorcet, Marie Jean Antoine Nicolas de Caritat, marquis de",
      t: "Essai sur l'application de l'analyse à la probabilité des décisions rendues à la pluralité des voix",
      w: "Imprimerie royale, Paris",
      y: "1785",
    },
    {
      a: "Arrow, Kenneth J.",
      t: "Social Choice and Individual Values",
      w: "Wiley, New York (2e édition 1963)",
      y: "1951",
    },
    {
      a: "Hägele, Günter et Pukelsheim, Friedrich",
      t: "Llull's writings on electoral systems",
      w: "Studia Lulliana, 41, 3-38",
      y: "2001",
    },
    {
      a: "Gibbard, Allan",
      t: "Manipulation of Voting Schemes: A General Result",
      w: "Econometrica, 41(4), 587-601",
      y: "1973",
      url: "https://doi.org/10.2307/1914083",
    },
    {
      a: "Satterthwaite, Mark A.",
      t: "Strategy-proofness and Arrow's Conditions",
      w: "Journal of Economic Theory, 10(2), 187-217",
      y: "1975",
      url: "https://doi.org/10.1016/0022-0531(75)90050-2",
    },
    {
      // La fiche fait reposer son cas « pas de vainqueur » sur l'ensemble de
      // Smith : la source doit être ICI, pas seulement sur la variante randomisée.
      a: "Smith, John H.",
      t: "Aggregation of Preferences with Variable Electorate",
      w: "Econometrica, 41(6), 1027-1041",
      y: "1973",
      url: "https://doi.org/10.2307/1914033",
    },
  ],

  condorcet_random: [
    {
      a: "Smith, John H.",
      t: "Aggregation of Preferences with Variable Electorate",
      w: "Econometrica, 41(6), 1027-1041",
      y: "1973",
      url: "https://doi.org/10.2307/1914033",
    },
    {
      a: "Gibbard, Allan",
      t: "Manipulation of Schemes that Mix Voting with Chance",
      w: "Econometrica, 45(3), 665-681",
      y: "1977",
      url: "https://doi.org/10.2307/1911681",
    },
    {
      a: "Headlam, James Wycliffe",
      t: "Election by Lot at Athens",
      w: "Cambridge University Press",
      y: "1891",
    },
    {
      a: "Dowlen, Oliver",
      t: "The Political Potential of Sortition",
      w: "Imprint Academic",
      y: "2008",
    },
  ],

  majority_judgment: [
    {
      a: "Balinski, Michel et Laraki, Rida",
      t: "A theory of measuring, electing, and ranking",
      w: "Proceedings of the National Academy of Sciences, 104(21), 8720-8725",
      y: "2007",
      url: "https://doi.org/10.1073/pnas.0702634104",
    },
    {
      a: "Balinski, Michel et Laraki, Rida",
      t: "Majority Judgment: Measuring, Ranking, and Electing",
      w: "MIT Press, Cambridge",
      y: "2011",
    },
    {
      a: "Balinski, Michel et Laraki, Rida",
      t: "Election by Majority Judgment: Experimental Evidence",
      w: "In Situ and Laboratory Experiments on Electoral Law Reform, Springer, 13-54",
      y: "2011",
      url: "https://doi.org/10.1007/978-1-4419-7539-3_2",
    },
  ],

  proportional: [
    {
      // Première exposition de la méthode, parue ANONYMEMENT — d'où la
      // signature « par un électeur », qui n'est pas un morceau du titre.
      // Bruxelles, et non Gand : la brochure gantoise est celle de 1885.
      a: "D'Hondt, Victor (signé « par un électeur »)",
      t: "Question électorale. La représentation proportionnelle des partis",
      w: "Bruxelles",
      y: "1878",
    },
    {
      a: "D'Hondt, Victor",
      t: "Système pratique et raisonné de représentation proportionnelle",
      w: "Librairie C. Muquardt, Bruxelles",
      y: "1882",
    },
    {
      a: "Balinski, Michel L. et Young, H. Peyton",
      t: "Fair Representation: Meeting the Ideal of One Man, One Vote",
      w: "Yale University Press (2e édition, Brookings, 2001)",
      y: "1982",
    },
    {
      a: "Sainte-Laguë, André",
      t: "La représentation proportionnelle et la méthode des moindres carrés",
      w: "Annales scientifiques de l'École normale supérieure, 3e série, 27, 529-542",
      y: "1910",
    },
    {
      a: "Gallagher, Michael",
      t: "Proportionality, Disproportionality and Electoral Systems",
      w: "Electoral Studies, 10(1), 33-51",
      y: "1991",
      url: "https://doi.org/10.1016/0261-3794(91)90004-C",
    },
  ],

  list: [
    {
      t: "Loi n° 82-974 du 19 novembre 1982 modifiant le code électoral et le code des communes relative à l'élection des conseillers municipaux et aux conditions d'inscription des Français établis hors de France sur les listes électorales",
      w: "Légifrance",
      y: "1982",
      url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000880397",
    },
    {
      t: "Code électoral, article L. 262 (prime majoritaire de la moitié des sièges)",
      w: "Légifrance",
      y: "en vigueur",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006353609",
    },
    {
      // Le régime PLM ne vient PAS de la loi du 19 novembre : c'est une loi
      // distincte, de fin décembre. La fiche l'affirmait à tort.
      t: "Loi n° 82-1169 du 31 décembre 1982 relative à l'organisation administrative de Paris, Marseille, Lyon et des établissements publics de coopération intercommunale (régime dit « PLM »)",
      w: "Légifrance",
      y: "1982",
      url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000000880033",
    },
    {
      t: "Loi n° 2013-403 du 17 mai 2013 (seuil du scrutin de liste abaissé à 1 000 habitants)",
      w: "Légifrance",
      y: "2013",
      url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000027414225",
    },
    {
      // Droit EN VIGUEUR depuis les municipales de mars 2026 : le scrutin de
      // liste vaut désormais pour toutes les communes, seuil supprimé.
      t: "Loi n° 2025-444 du 21 mai 2025 visant à harmoniser le mode de scrutin aux élections municipales (extension du scrutin de liste paritaire à toutes les communes, fin du panachage)",
      w: "Légifrance",
      y: "2025",
      url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000051643176",
    },
  ],

  grand_electors: [
    {
      t: "Constitution of the United States, Article II, Section 1, et XIIe amendement",
      w: "National Archives",
      y: "1787 et 1804",
      url: "https://www.archives.gov/founding-docs/constitution",
    },
    {
      a: "Edwards, George C. III",
      t: "Why the Electoral College Is Bad for America",
      w: "Yale University Press (3e édition 2019)",
      y: "2004",
    },
    {
      t: "Code électoral, article L. 280 (composition du collège électoral sénatorial)",
      w: "Légifrance",
      y: "en vigueur",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000052092775",
    },
    {
      a: "Griffith, Elmer C.",
      t: "The Rise and Development of the Gerrymander",
      w: "Scott, Foresman and Co., Chicago",
      y: "1907",
    },
  ],

  serial_dictatorship: [
    {
      a: "Hylland, Aanund et Zeckhauser, Richard",
      t: "The Efficient Allocation of Individuals to Positions",
      w: "Journal of Political Economy, 87(2), 293-314",
      y: "1979",
      url: "https://doi.org/10.1086/260757",
    },
    {
      a: "Abdulkadiroğlu, Atila et Sönmez, Tayfun",
      t: "Random Serial Dictatorship and the Core from Random Endowments in House Allocation Problems",
      w: "Econometrica, 66(3), 689-701",
      y: "1998",
      url: "https://doi.org/10.2307/2998580",
    },
    {
      a: "Svensson, Lars-Gunnar",
      t: "Strategy-proof allocation of indivisible goods",
      w: "Social Choice and Welfare, 16(4), 557-567",
      y: "1999",
      url: "https://doi.org/10.1007/s003550050160",
    },
  ],

  optimal_sum: [
    {
      a: "Kuhn, Harold W.",
      t: "The Hungarian Method for the Assignment Problem",
      w: "Naval Research Logistics Quarterly, 2(1-2), 83-97",
      y: "1955",
      url: "https://doi.org/10.1002/nav.3800020109",
    },
    {
      a: "Munkres, James",
      t: "Algorithms for the Assignment and Transportation Problems",
      w: "Journal of the Society for Industrial and Applied Mathematics, 5(1), 32-38",
      y: "1957",
      url: "https://doi.org/10.1137/0105003",
    },
    {
      a: "Jacobi, Carl Gustav Jacob",
      t: "De investigando ordine systematis aequationum differentialium vulgarium cujuscunque",
      w: "Journal für die reine und angewandte Mathematik (Crelle), 64, 297-320 — publication posthume ; repris dans les Gesammelte Werke, vol. V, Berlin, 1890",
      y: "1865",
      url: "https://doi.org/10.1515/crll.1865.64.297",
    },
    {
      a: "Burkard, Rainer, Dell'Amico, Mauro et Martello, Silvano",
      t: "Assignment Problems",
      w: "SIAM, Philadelphie",
      y: "2009",
    },
  ],

  top_trading_cycles: [
    {
      a: "Shapley, Lloyd et Scarf, Herbert",
      t: "On Cores and Indivisibility",
      w: "Journal of Mathematical Economics, 1(1), 23-37",
      y: "1974",
      url: "https://doi.org/10.1016/0304-4068(74)90033-0",
    },
    {
      a: "Roth, Alvin E.",
      t: "Incentive compatibility in a market with indivisible goods",
      w: "Economics Letters, 9(2), 127-132",
      y: "1982",
      url: "https://doi.org/10.1016/0165-1765(82)90003-9",
    },
    {
      a: "Abdulkadiroğlu, Atila et Sönmez, Tayfun",
      t: "House Allocation with Existing Tenants",
      w: "Journal of Economic Theory, 88(2), 233-260",
      y: "1999",
      url: "https://doi.org/10.1006/jeth.1999.2553",
    },
    {
      a: "Roth, Alvin E., Sönmez, Tayfun et Ünver, M. Utku",
      t: "Kidney Exchange",
      w: "Quarterly Journal of Economics, 119(2), 457-488",
      y: "2004",
      url: "https://doi.org/10.1162/0033553041382157",
    },
  ],

  stable_roommates: [
    {
      a: "Gale, David et Shapley, Lloyd S.",
      t: "College Admissions and the Stability of Marriage",
      w: "The American Mathematical Monthly, 69(1), 9-15",
      y: "1962",
      url: "https://doi.org/10.2307/2312726",
    },
    {
      a: "Irving, Robert W.",
      t: "An Efficient Algorithm for the « Stable Roommates » Problem",
      w: "Journal of Algorithms, 6(4), 577-595",
      y: "1985",
      url: "https://doi.org/10.1016/0196-6774(85)90033-1",
    },
    {
      a: "Gusfield, Dan et Irving, Robert W.",
      t: "The Stable Marriage Problem: Structure and Algorithms",
      w: "MIT Press, Cambridge",
      y: "1989",
    },
  ],

  gale_shapley: [
    {
      a: "Gale, David et Shapley, Lloyd S.",
      t: "College Admissions and the Stability of Marriage",
      w: "The American Mathematical Monthly, 69(1), 9-15",
      y: "1962",
      url: "https://doi.org/10.2307/2312726",
    },
    {
      a: "Dubins, Lester E. et Freedman, David A.",
      t: "Machiavelli and the Gale-Shapley Algorithm",
      w: "The American Mathematical Monthly, 88(7), 485-494",
      y: "1981",
      url: "https://doi.org/10.2307/2321753",
    },
    {
      a: "Roth, Alvin E.",
      t: "The Evolution of the Labor Market for Medical Interns and Residents: A Case Study in Game Theory",
      w: "Journal of Political Economy, 92(6), 991-1016",
      y: "1984",
      url: "https://doi.org/10.1086/261272",
    },
    {
      a: "Roth, Alvin E. et Peranson, Elliott",
      t: "The Redesign of the Matching Market for American Physicians: Some Engineering Aspects of Economic Design",
      w: "American Economic Review, 89(4), 748-780",
      y: "1999",
      url: "https://doi.org/10.1257/aer.89.4.748",
    },
    {
      a: "Comité du prix de sciences économiques de l'Académie royale des sciences de Suède",
      t: "Stable allocations and the practice of market design (Scientific Background, prix de sciences économiques en mémoire d'Alfred Nobel)",
      w: "Nobelprize.org, document « Advanced information », 15 octobre 2012",
      y: "2012",
      url: "https://www.nobelprize.org/prizes/economic-sciences/2012/advanced-information/",
    },
  ],
};
