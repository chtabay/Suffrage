import type { DeepFiches } from "./types";

// In-depth method pages — English.
const en: DeepFiches = {
  // ---------------------------------------------------------------- VOTE ----
  simple_vote: {
    summary:
      "One round, one vote, most votes wins. It is the most widespread voting method in the world, and the most criticised: the winner may have convinced only a minority.",
    history: [
      "First-past-the-post has no inventor: it grew out of practice in medieval English assemblies, where each county sent two representatives to Parliament. The name is a horse-racing metaphor — first past the post, with nobody asking by how many lengths.",
      "The British Empire exported it almost everywhere: the United Kingdom, India, Canada, the United States, Nigeria. It still governs a considerable share of the world's population, largely through colonial inheritance rather than theoretical choice.",
      "In 1951 the jurist Maurice Duverger stated the regularity that bears his name: single-round plurality voting tends to produce a two-party system, because voting for a third option wastes your vote. It is not a law in the physical sense, but the correlation has held up well since.",
    ],
    mechanics: [
      "Each voter picks exactly one option. Votes are counted and ranked; the highest total wins. That is all: nothing is asked about what the voter thinks of the other options.",
      "Mind the vocabulary: this method delivers a PLURALITY (the most votes), not a MAJORITY (more than half). The two coincide only with two options. With three, a winner on 34 % against 66 % of scattered opponents is entirely possible.",
      "On an exact tie, no internal rule settles it: you need an external tie-break (a draw, a casting vote, seniority). Placet shows the tie rather than inventing a winner.",
    ],
    example: {
      intro: "A hundred people pick the venue for an offsite. Three options, one round.",
      head: ["Option", "Votes", "Share"],
      rows: [
        ["Lyon", "40", "40 %"],
        ["Bordeaux", "35", "35 %"],
        ["Lille", "25", "25 %"],
      ],
      steps: [
        "Lyon leads with 40 votes and wins.",
        "But 60 people out of 100 voted against Lyon.",
        "If Lille's supporters preferred Bordeaux to Lyon, Bordeaux would win a head-to-head 60 to 40.",
      ],
      result:
        "The winner is whoever collects the most first choices, not the option the group actually prefers. This is exactly what Condorcet held against the method back in 1785.",
    },
    useCases: [
      "General elections in the United Kingdom, India and Canada.",
      "The US presidential election within each state, where the winner takes the electors.",
      "Fast group decisions, when speed matters more than nuance.",
      "Quick polls and binary choices, where plurality and majority coincide.",
    ],
    limits: [
      { t: "Minority winner", d: "With three or more options you can win without ever convincing half the group." },
      {
        t: "Spoiler effect",
        d: "An option close to another splits its camp and hands victory to a third. Hence tactical voting, which pushes people to abandon their true first choice.",
      },
      {
        t: "Duverger's law",
        d: "Enough tactical voting and the field narrows to two camps. The nuances disappear before the vote even happens.",
      },
      {
        t: "Sensitive to boundaries",
        d: "When voting by district, where you draw the lines matters as much as the votes — the open door to gerrymandering.",
      },
    ],
    faq: [
      {
        q: "What is the difference between plurality and majority?",
        a: "A plurality is the most votes; a majority is more than half. A winner on 40 % has a plurality but no majority. If your decision must be legitimate to a group that has to live with it, that difference is anything but a detail.",
      },
      {
        q: "Why is it still so widespread?",
        a: "Because it is instantly understandable, can be counted by hand, and always produces a clear result. Its flaws have been documented since 1785, but its simplicity is a real political asset.",
      },
      {
        q: "When should it be avoided?",
        a: "As soon as there are more than two options and the group must live with the outcome. Approval voting costs the voter the same effort and solves most of the problem.",
      },
    ],
  },

  two_round: {
    summary:
      "If nobody reaches 50 % in the first round, the top two face off in a second. The winner necessarily holds an absolute majority — but only against the finalist they were paired with.",
    history: [
      "The two-round system took hold in France during the nineteenth century and became general under the Third Republic. The Fifth Republic adopted it in 1958 for parliamentary elections, then in 1962 for the direct presidential election — first used in 1965.",
      "The idea is a political compromise: keep the clarity of majority voting while fixing its most visible flaw, the minority winner. The runoff forces an explicit choice between two options only.",
      "It spread far beyond France: Austria, Portugal, Brazil, Poland, most Latin American presidential elections, and a large share of French-speaking association ballots.",
    ],
    mechanics: [
      "First round: everyone votes for one option. If one clears the threshold (50 % by default in Placet, adjustable), it is over.",
      "Otherwise a second round pits the top two against each other — the usual rule. French parliamentary elections use a different criterion: every candidate reaching 12.5 % of registered voters qualifies, which is how three-way runoffs happen.",
      "In the second round an absolute majority is mechanically guaranteed: with two options, the plurality IS the majority. That is an arithmetic guarantee, not a guarantee of consensus.",
    ],
    example: {
      intro: "The same hundred people, this time over two rounds.",
      head: ["Option", "Round 1", "Round 2"],
      rows: [
        ["Lyon", "40", "45"],
        ["Bordeaux", "35", "55"],
        ["Lille", "25", "eliminated"],
      ],
      steps: [
        "Nobody reaches 50 %: Lyon and Bordeaux go through.",
        "Lille's 25 votes transfer: 20 to Bordeaux, 5 to Lyon.",
        "Bordeaux wins 55 to 45.",
      ],
      result:
        "The runoff did correct the first round. But note what it did not do: had Lille been everyone's compromise second choice, it would have been eliminated in round one, never tested in a duel.",
    },
    useCases: [
      "The French presidential election and many other republics.",
      "French parliamentary and departmental elections.",
      "Association and union ballots, where an absolute majority is often required by statute.",
      "Weighty group decisions, when a clear mandate matters more than speed.",
    ],
    limits: [
      {
        t: "The compromise dies in round one",
        d: "A moderate option, everyone's second choice but nobody's first, never makes the runoff. A Condorcet winner can be eliminated before ever playing.",
      },
      {
        t: "Non-monotonicity",
        d: "Gaining votes can make you lose. By changing which pair qualifies, extra first-round support can pair you against a more dangerous opponent. The result does not always move in the same direction as the votes.",
      },
      {
        t: "Cost and drop-off",
        d: "Two ballots, two organisations, and turnout that almost always falls in the second round.",
      },
      {
        t: "Tactical voting moved, not removed",
        d: "It is no longer about winning but about qualifying: the calculation simply shifts to the first round.",
      },
    ],
    faq: [
      {
        q: "Does the runoff guarantee real consensus?",
        a: "No: it guarantees an absolute majority against ONE given opponent. If the duel on offer is the wrong one — because the compromise was eliminated in round one — the majority obtained is arithmetic, not political.",
      },
      {
        q: "How can a candidate lose by gaining votes?",
        a: "By changing their runoff opponent. Suppose you narrowly beat A but lose to B: a few extra first-round votes can eliminate A in favour of B and cost you the election. That is the monotonicity failure, and it is entirely demonstrable.",
      },
      {
        q: "Two rounds or Condorcet?",
        a: "Condorcet tests EVERY duel in a single vote, where the runoff tests just one, chosen by the first round. If your group can rank the options, Condorcet answers the same question more completely.",
      },
    ],
  },

  approval: {
    summary:
      "Everyone ticks every option they find acceptable, with no ranking. Whichever collects the most approvals wins. Almost no extra effort on the ballot, for a considerable gain in quality.",
    history: [
      "Approval voting has ancestors: the Republic of Venice used it from the thirteenth century in some stages of electing the Doge, and several religious orders used it to choose their superiors.",
      "Its modern formalisation dates from 1978, when Steven Brams and Peter Fishburn published « Approval Voting » in the American Political Science Review, making it the most studied method of the American revival in social choice theory.",
      "Several learned societies adopted it from 1987 onwards; the IEEE used it until 2002 before dropping it, for lack of use by its members. The UN Security Council still relies on it for its straw polls on selecting the Secretary-General. Fargo, North Dakota adopted it by referendum in 2018 and used it from 2020 to 2024, until North Dakota banned it in 2025; St. Louis, Missouri has used it since 2021 in its primary, with the top two going through to a run-off.",
    ],
    mechanics: [
      "Each voter ticks as many options as they like — none, one, all of them. Every tick is worth one point; the points are added up.",
      "The ballot asks for no ranking: it is simply a line between what the voter accepts and what they reject. That cognitive economy is the method's main argument.",
      "One remarkable consequence: tactical voting vanishes, because backing your favourite never stops you backing the compromise too. Being sincere about your preferences can no longer hurt you.",
    ],
    example: {
      intro: "A hundred people tick everything that works for them.",
      head: ["Option", "Approvals", "Rate"],
      rows: [
        ["Bordeaux", "72", "72 %"],
        ["Lyon", "58", "58 %"],
        ["Lille", "41", "41 %"],
      ],
      steps: [
        "Many of Lyon's 40 supporters also ticked Bordeaux.",
        "Bordeaux gathers 72 approvals: it is the venue most people accept.",
        "The total exceeds 100 % — that is normal: these are approvals, not exclusive votes.",
      ],
      result:
        "Approval measures acceptability, not enthusiasm. For a decision the whole group has to live with, that is often the right question.",
    },
    useCases: [
      "Picking a date, a venue or a restaurant, where several answers are acceptable.",
      "Shortlisting applications before interviews.",
      "The St. Louis municipal primary, and UN Security Council straw polls.",
      "Prevalence surveys, where you want what is widespread rather than what comes first.",
    ],
    limits: [
      {
        t: "No intensity",
        d: "« I love it » and « I can live with it » count the same. Majority judgment exists precisely to fill that gap.",
      },
      {
        t: "The threshold dilemma",
        d: "Where do you draw your approval line? Ticking broadly helps the consensus but dilutes your favourite; ticking narrowly does the opposite. That is the method's real tactical lever.",
      },
      {
        t: "Sensitive to how demanding voters are",
        d: "A generous group and a severe group will not produce the same ranking from the same underlying preferences.",
      },
    ],
    faq: [
      {
        q: "How many options should I tick?",
        a: "Every one you would sincerely be happy with. The most robust strategy is to tick everything you prefer to the outcome you think is likely.",
      },
      {
        q: "Is a total above 100 % normal?",
        a: "Yes. You are not splitting a hundred votes: you are counting, for each option, how many people accept it. Read the percentages option by option.",
      },
      {
        q: "Approval or majority judgment?",
        a: "Approval takes one click and answers « is this acceptable? ». Majority judgment asks for a grade per option and answers « how good is it? ». Start with approval; move to grades when the nuances really matter.",
      },
    ],
  },

  borda: {
    summary:
      "Everyone ranks the options; ranks turn into points, and the points are added up. The method rewards broad consensus rather than the fervour of one camp.",
    history: [
      "Jean-Charles de Borda — sailor, mathematician and physicist — presented his memoir on election by ballot to the Royal Academy of Sciences in 1770; it was published in 1781. His observation was simple: ordinary voting can elect a candidate the majority rejects.",
      "The idea is older. The Majorcan philosopher Ramon Llull described pairwise comparison and ranking procedures at the end of the thirteenth century — manuscripts rediscovered only in 2001. Nicholas of Cusa proposed a points-based method for electing the Holy Roman Emperor in 1433.",
      "The Academy of Sciences used Borda's method to elect its members; by a tradition reported by Duncan Black, Napoleon, who joined in 1797, is said to have had it dropped — the account is disputed. Borda is credited with this answer to the charge of manipulability: his scheme, he said, was only intended for honest men.",
    ],
    mechanics: [
      "With n options, a first place is worth n−1 points, a second n−2, and so on down to 0 for last. Each option's points are summed.",
      "The Dowdall variant (used in Nauru) awards 1, 1/2, 1/3… and weights top places far more heavily. The scale changes the result — this is not an implementation detail.",
      "Placet uses the classic n−1, n−2, … 0 scale, which keeps the gaps readable: one point of difference is exactly one rank gained on one ballot.",
    ],
    example: {
      intro: "Three options, five ranked ballots. First place is worth 2 points, second 1, third 0.",
      head: ["Ballots", "1st", "2nd", "3rd"],
      rows: [
        ["2 voters", "Lyon", "Bordeaux", "Lille"],
        ["2 voters", "Lille", "Bordeaux", "Lyon"],
        ["1 voter", "Bordeaux", "Lyon", "Lille"],
      ],
      steps: ["Lyon: 2×2 + 1×1 = 5 points.", "Lille: 2×2 = 4 points.", "Bordeaux: 2×1 + 2×1 + 1×2 = 6 points."],
      result:
        "Bordeaux wins while being almost nobody's first choice — it is everybody's second. That is exactly what Borda set out to capture, and exactly what his critics hold against him.",
    },
    useCases: [
      "Parliamentary elections in Nauru and minority seats in Slovenia.",
      "Sporting and cultural awards: the Ballon d'Or, MVP trophies, literary prizes.",
      "Setting an agenda or a collective priority, when every option must be compared.",
      "Team decisions where you want the least divisive option.",
    ],
    limits: [
      {
        t: "Vulnerable to clones",
        d: "Adding weak options close to a rival drags down their average. Drawing up the list of options becomes a political act.",
      },
      {
        t: "Tactical burying",
        d: "Artificially ranking the most serious rival last pays off, and is practically undetectable.",
      },
      {
        t: "Fails the Condorcet criterion",
        d: "An option that wins every duel can lose the Borda count. The two methods answer different questions, and Borda owns that.",
      },
    ],
    faq: [
      {
        q: "Borda or Condorcet?",
        a: "Borda measures average satisfaction and always returns a result; Condorcet looks for the champion of every duel but may find none. Borda is more robust in practice, Condorcet more demanding in theory.",
      },
      {
        q: "Do I have to rank every option?",
        a: "Ideally yes: an incomplete ballot distorts the relative points. That is the method's real cost, and why it becomes tiring beyond seven or eight options.",
      },
      {
        q: "Why is last place worth zero?",
        a: "So that only the GAPS between ranks matter. Adding a constant to every rank would leave the final order unchanged; starting from zero simply makes it easier to read.",
      },
    ],
  },

  condorcet: {
    summary:
      "Every possible duel between options is simulated. Whichever wins them all is the Condorcet winner: the group's true champion, immune to tactical voting and very hard to manipulate.",
    history: [
      "Marie Jean Antoine Nicolas de Caritat, Marquis de Condorcet, published his essay on the application of analysis to the probability of majority decisions in 1785. A mathematician, Enlightenment philosopher and later member of the Legislative Assembly, he showed that ordinary voting can elect an option the majority would reject in a head-to-head.",
      "His proposal: compare every option with every other, two at a time, and crown the one that wins each time. In doing so he discovered the obstacle that now bears his name — the Condorcet paradox — where duels run in a circle.",
      "The idea then slept until the twentieth century. Duncan Black revived it in « The Theory of Committees and Elections » (1958). Meanwhile Kenneth Arrow had published his impossibility theorem in 1951 (Nobel Prize in Economics, 1972): no collective ranking method can satisfy a handful of entirely reasonable requirements at once.",
      "Ramon Llull had described a pairwise procedure as early as the late thirteenth century, in manuscripts recovered only in 2001 — five centuries ahead of Condorcet.",
    ],
    mechanics: [
      "From the rankings, a matrix of duels is built: for each pair of options, how many ballots put one ahead of the other. Nothing more is asked of the voter than a ranking.",
      "The Condorcet winner is the option that wins ALL its duels. When one exists it is unique — and no other method can claim to represent majority preference better.",
      "When the duels form a cycle (A beats B, B beats C, C beats A), there is no winner: that is the Condorcet paradox, a property of the group's preferences rather than a counting bug. Placet reports it honestly instead of crowning an arbitrary winner.",
      "The question then shifts to the Smith set: the smallest group of options that beat every option outside it. Placet's randomised variant draws from that set.",
    ],
    example: {
      intro: "Three options, five ranked ballots. Compare them two at a time.",
      head: ["Duel", "Result", "Winner"],
      rows: [
        ["Bordeaux vs Lyon", "3 – 2", "Bordeaux"],
        ["Bordeaux vs Lille", "3 – 2", "Bordeaux"],
        ["Lyon vs Lille", "3 – 2", "Lyon"],
      ],
      steps: [
        "Bordeaux wins both its duels: it is the Condorcet winner.",
        "Lyon wins one of two, Lille none.",
        "The final ranking follows the number of duels won: Bordeaux, Lyon, Lille.",
      ],
      result:
        "Under a single-round vote, Lyon might have won on first choices. The duels reveal that a majority prefers Bordeaux — the information ordinary voting throws away.",
    },
    useCases: [
      "The Debian project elects its leaders by a Condorcet method (the Schulze variant), as do many free software projects.",
      "Wikimedia, KDE, Gentoo and several software foundations use it for internal votes.",
      "Weighty team decisions, where the legitimacy of the result matters as much as the result.",
      "Any choice where you suspect a compromise would beat favourites who cancel each other out.",
    ],
    limits: [
      {
        t: "The Condorcet paradox",
        d: "Duels can run in a circle with no winner at all. Rare with homogeneous preferences, more common on divisive questions with three camps.",
      },
      {
        t: "A more demanding ballot",
        d: "You must rank, not just tick. Beyond seven or eight options the fatigue is real and ballot quality drops.",
      },
      {
        t: "Opaque counting",
        d: "A matrix of duels cannot be read at a glance. You have to show the result well, or the legitimacy won in theory is lost in practice.",
      },
      {
        t: "Arrow's theorem",
        d: "No method ticks every box at once. Condorcet chooses fidelity to majority preference and pays for it with the existence of cycles.",
      },
    ],
    faq: [
      {
        q: "What is the Condorcet paradox?",
        a: "A situation where group preferences run in a circle: one majority prefers A to B, another prefers B to C, and a third prefers C to A. No option wins every duel. It is not an error — it is a possible property of collective preferences, even though each individual ballot is perfectly coherent.",
      },
      {
        q: "What does Placet do when there is a cycle?",
        a: "It says so, rather than manufacturing a winner. The ranking by duels won is still shown, but no decision is presented as settled. If you need to decide anyway, the randomised Condorcet variant draws from the Smith set.",
      },
      {
        q: "Can a Condorcet vote be manipulated?",
        a: "It is among the hardest to manipulate. The Gibbard-Satterthwaite theorem (1973-1975) establishes that no non-trivial method is completely immune, but manipulating Condorcet requires very precise knowledge of everyone else's intentions, and easily backfires.",
      },
      {
        q: "Condorcet or majority judgment?",
        a: "Condorcet compares options against each other; majority judgment grades each on an absolute scale. Condorcet finds the champion of the duels when one exists; majority judgment always returns a result and measures the level of support.",
      },
    ],
  },

  condorcet_random: {
    summary:
      "Condorcet with an escape hatch: when the duels run in a circle, the winner is drawn at random from the deadlocked options. A guaranteed decision, with no disguised arbitrariness.",
    history: [
      "Drawing lots is no last resort: it was the ordinary method of Athenian democracy, which allotted most public offices by kleroterion and reserved election for technical roles.",
      "It survives in modern electoral law as a tie-break: many electoral codes, the French one included, settle exact ties by lot or by age. Several US states do it literally, drawing a card or flipping a coin.",
      "In social choice theory, lotteries have serious standing: they remain one of the few ways to settle matters without favouring either an option or a voter when preferences deadlock. Randomisation restores a form of fairness that determinism cannot offer.",
    ],
    mechanics: [
      "As long as a Condorcet winner exists, this variant is strictly identical to Condorcet: chance never intervenes.",
      "Lots are drawn only when there is a cycle, and not from anywhere: Placet draws from the SMITH SET, the smallest group of options that beat every option outside it. A dominated option therefore has no chance of being selected.",
      "The result is not reproducible: that is the price of a guaranteed decision. When the stakes are high, announce the draw to the group before running it.",
    ],
    example: {
      intro: "Three options, a perfect cycle — the textbook case of the paradox.",
      head: ["Duel", "Result", "Winner"],
      rows: [
        ["Lyon vs Bordeaux", "6 – 3", "Lyon"],
        ["Bordeaux vs Lille", "6 – 3", "Bordeaux"],
        ["Lille vs Lyon", "6 – 3", "Lille"],
      ],
      steps: [
        "Lyon beats Bordeaux, Bordeaux beats Lille, Lille beats Lyon: the cycle is complete.",
        "No option wins all its duels: plain Condorcet stops here.",
        "All three form the Smith set; the draw picks one, each with a one-in-three chance.",
      ],
      result:
        "Chance does not replace the vote: it only settles between options the group has made strictly equivalent. Any other tie-break would introduce a bias nobody voted for.",
    },
    useCases: [
      "Decisions that absolutely must land today, on a divisive subject.",
      "Groups split into three clear camps, where a cycle is likely.",
      "Breaking exact ties, instead of a contestable casting vote.",
      "Any situation where deadlock costs more than an imperfect choice.",
    ],
    limits: [
      {
        t: "Not reproducible",
        d: "Counting the same ballots twice can give two winners. Announce it BEFORE the vote, or the contestation is legitimate.",
      },
      {
        t: "Culturally hard to accept",
        d: "« We drew lots » lands badly, even when it is the fairest answer. Explaining the deadlock is essential.",
      },
      {
        t: "It hides information",
        d: "A cycle tells you something about the group: three irreconcilable camps. The draw settles it without that diagnosis being discussed.",
      },
    ],
    faq: [
      {
        q: "Is chance always involved?",
        a: "No, almost never. As long as one option wins all its duels, it is declared the winner exactly as in plain Condorcet. The draw exists only for cycles.",
      },
      {
        q: "What is the Smith set?",
        a: "The smallest group of options such that each member beats every option outside it. In a cycle, it is the leading pack: the draw only ever picks options genuinely in contention.",
      },
      {
        q: "Is this really democratic?",
        a: "As much as the alternatives, and more honest. In a cycle, EVERY tie-break rule — alphabetical order, seniority, the chair's vote — privileges someone. Lots are the only tie-break that favours nobody, and they only apply between options the group itself has placed level.",
      },
    ],
  },

  majority_judgment: {
    summary:
      "Each option receives a grade (from « to reject » to « very good »), and the MEDIAN grade decides. A method designed to resist tactical voting.",
    history: [
      "Majority judgment was proposed in 2007 by Michel Balinski and Rida Laraki, researchers at École polytechnique and the CNRS, in the Proceedings of the National Academy of Sciences. Their reference book, « Majority Judgment: Measuring, Ranking, and Electing », was published by MIT Press in 2011.",
      "The inspiration comes from outside politics: wine competitions, gymnastics and figure skating have long graded on verbal scales and discarded extremes, because averages are far too easy for a single judge to manipulate.",
      "The authors tested it in April 2007 with voters in Orsay during the French presidential election, alongside the official ballot. Several French citizen primaries have used it since, including the Primaire populaire in 2022.",
    ],
    mechanics: [
      "The voter grades EACH option independently of the others: they evaluate, they do not rank. Two options can receive the same grade.",
      "For each option the grades are sorted and the median is taken — the grade such that a majority judges it « at least this good » and a majority « at most this good ». Unlike the mean, the median is insensitive to extreme grades cast for tactical reasons.",
      "When medians tie, the tie is broken by removing median grades one by one from the tied options until they diverge. That amounts to comparing the proportions of supporters and opponents around the median grade.",
    ],
    example: {
      intro: "Three options graded by eleven people on a five-grade scale.",
      head: ["Option", "Grades received", "Median"],
      rows: [
        ["Bordeaux", "3 Very good, 5 Good, 3 Fair", "Good"],
        ["Lyon", "5 Very good, 1 Good, 5 Reject", "Good"],
        ["Lille", "2 Very good, 4 Fair, 5 Poor", "Fair"],
      ],
      steps: [
        "Bordeaux and Lyon share the same median grade: Good.",
        "Remove one median grade from each and repeat: Bordeaux keeps a broader base above Good.",
        "Lyon, deeply divisive (5 « Very good » but 5 « Reject »), drops behind.",
      ],
      result:
        "Majority judgment prefers the widely respected option to the polarising one. A single-round vote would have crowned Lyon on its five enthusiasts.",
    },
    useCases: [
      "Internal elections and citizen primaries, where you want to measure real support.",
      "Assessing applications, projects or suppliers on qualitative criteria.",
      "Decisions where you want to spot the divisive option before adopting it.",
      "Any vote where the intensity of support, not just its existence, should weigh.",
    ],
    limits: [
      {
        t: "Fails the Condorcet criterion",
        d: "An option that wins every duel may not have the best median. The two methods measure different things, and you cannot have both (Arrow's theorem).",
      },
      {
        t: "Calibrating the grades",
        d: "« Fair » means different things to different people. The scale must be spelled out before the vote, or you are adding up incomparable judgments.",
      },
      { t: "A longer ballot", d: "One grade per option is more than one tick, and it shows beyond a dozen options." },
      {
        t: "Technical tie-break",
        d: "Breaking ties by removing medians is rigorous but hard to explain in a meeting.",
      },
    ],
    faq: [
      {
        q: "Why the median rather than the mean?",
        a: "Because the mean can be bought. A tactical voter giving the minimum grade to a serious rival shifts their mean considerably; it shifts the median by one notch at most, and only if many do the same. The median is the heart of the method, not a computational detail.",
      },
      {
        q: "Is it genuinely unmanipulable?",
        a: "No — the Gibbard-Satterthwaite theorem forbids that for any method. But majority judgment sharply limits the expected gain from an insincere vote, which is the best that can be proved.",
      },
      {
        q: "How many grades should there be?",
        a: "Five or six, with clear verbal labels. Fewer and you lose the nuance; more and voters stop distinguishing neighbouring steps.",
      },
    ],
  },

  proportional: {
    summary:
      "Instead of a single winner, seats are shared in proportion to votes using the D'Hondt method. This is the method of assemblies, not of decisions.",
    history: [
      "The Belgian jurist Victor d'Hondt worked out his method in the late 1870s and published it in book form in 1882; Belgium adopted it by the law of 1899 and applied it from the 1900 elections — a world first. The formula was in fact already known: Thomas Jefferson had proposed it in 1792 to apportion House seats among the American states.",
      "Rival variants have existed just as long: Sainte-Laguë (1910), equivalent to the Webster method of 1832, treats smaller parties more favourably and remains the reference in Scandinavia and New Zealand.",
      "The largest-remainder method, known as Hamilton's, was abandoned in the United States after the Alabama paradox: in 1880 it was found that raising the total number of seats from 299 to 300 COST Alabama a seat. The United States has used the Huntington-Hill method since 1941.",
    ],
    mechanics: [
      "For each list, compute the series votes/1, votes/2, votes/3… Seats go to the largest quotients across all lists, until they run out.",
      "This highest-average rule slightly favours large lists, systematically and knowingly: it is a political choice in favour of governability, not a computational artefact.",
      "An eligibility threshold (5 % in Germany, 3 % for French European elections) removes very small lists before allocation, to avoid fragmentation.",
    ],
    example: {
      intro: "One hundred votes, five seats, three lists, D'Hondt method.",
      head: ["List", "Votes", "÷1", "÷2", "÷3"],
      rows: [
        ["A", "45", "45", "22.5", "15"],
        ["B", "35", "35", "17.5", "11.7"],
        ["C", "20", "20", "10", "6.7"],
      ],
      steps: [
        "The five largest quotients across all lists: 45 (A), 35 (B), 22.5 (A), 20 (C), 17.5 (B).",
        "Final allocation: A 2 seats, B 2 seats, C 1 seat.",
        "A gets 40 % of the seats with 45 % of the votes; C gets 20 % of the seats with 20 % of the votes.",
      ],
      result:
        "With so few seats, proportionality is necessarily coarse — the number of seats, far more than the formula, determines how fine the representation can be.",
    },
    useCases: [
      "Parliamentary elections in most European democracies.",
      "European elections, and French regional elections for the proportional share.",
      "Composing a board or an association committee.",
      "Sharing budgets or slots between groups in proportion to support.",
    ],
    limits: [
      {
        t: "This is not a decision",
        d: "Proportional representation composes an assembly. To settle a question you still need a vote — the tool does not replace the decision.",
      },
      {
        t: "Bonus for large lists",
        d: "D'Hondt systematically rounds in favour of the biggest. Sainte-Laguë is more neutral, if that is what you want.",
      },
      {
        t: "Thresholds and fragmentation",
        d: "Without a threshold the assembly becomes ungovernable; with one, some votes are no longer represented at all.",
      },
      {
        t: "Apportionment paradoxes",
        d: "The Alabama paradox showed that no apportionment method is free of counter-intuitive behaviour.",
      },
    ],
    faq: [
      {
        q: "D'Hondt or Sainte-Laguë?",
        a: "D'Hondt (dividing by 1, 2, 3…) slightly favours large lists and makes majorities easier. Sainte-Laguë (by 1, 3, 5…) is fairer to small ones. The choice is political and must be made before the vote, never after.",
      },
      {
        q: "Why don't my seat percentages match the votes?",
        a: "Because a seat is indivisible. With five seats the finest possible granularity is 20 %: no formula can do better. The gap narrows as the number of seats grows.",
      },
      {
        q: "Can it be used with a handful of people?",
        a: "Yes, to share resources — slots, a budget, places. To choose between options, use approval or Condorcet instead.",
      },
    ],
  },

  list: {
    summary:
      "You vote for a whole list; the one that comes first automatically receives half the seats, and the rest is shared proportionally. This is the French municipal election method.",
    history: [
      "List voting with a majority bonus was set for French communes of 3,500 inhabitants and more by the law of 19 November 1982, which ended pure majority list voting and introduced a dose of proportionality.",
      "A second law, of 31 December 1982, created the special regime for Paris, Lyon and Marseille (known as PLM), with elections by sector — a mechanism that has repeatedly produced a mayor elected without leading the city-wide vote.",
      "The principle was extended to regional elections, with a reduced 25 % bonus, by the reforms of 1999 and 2003. The logic is constant: to arbitrate explicitly between representativeness and the ability to govern. Finally, the law of 21 May 2025 removed the threshold — since the March 2026 municipal elections, every commune votes by list, and vote-splitting between lists is gone.",
    ],
    mechanics: [
      "Each voter picks one list, with no splitting between lists. The leading list immediately receives 50 % of the seats — the majority bonus.",
      "The remaining 50 % are shared proportionally among ALL lists above the threshold, including the leading one, which therefore ends up with far more than its share of the vote.",
      "In municipal elections a second round is held if no list reaches an absolute majority, with mergers allowed between qualified lists — hence the importance of negotiations between rounds.",
    ],
    example: {
      intro: "Twenty seats, three lists, a 50 % majority bonus.",
      head: ["List", "Votes", "Bonus", "Proportional", "Total"],
      rows: [
        ["A", "45 %", "10", "4", "14"],
        ["B", "35 %", "0", "4", "4"],
        ["C", "20 %", "0", "2", "2"],
      ],
      steps: [
        "List A, in the lead, immediately receives 10 of the 20 seats.",
        "The remaining 10 seats are shared proportionally among the three lists.",
        "A totals 14 seats out of 20 — 70 % of the assembly with 45 % of the vote.",
      ],
      result:
        "The distortion is not a flaw: it is the very point of the mechanism. A governing majority emerges on election night, at the accepted cost of under-representing the other lists.",
    },
    useCases: [
      "French municipal elections — in every commune since the 2025 reform.",
      "Regional elections, with a 25 % bonus.",
      "Electing a committee or board from competing slates.",
      "Any assembly that must be both representative and able to decide.",
    ],
    limits: [
      {
        t: "Deliberate distortion",
        d: "A list in the minority on votes becomes the majority in seats. That is the deal, provided it is announced.",
      },
      { t: "No splitting", d: "You take a list as a block. A voter cannot approve one person without approving the whole team." },
      { t: "The weight of mergers", d: "Between rounds, the essential happens in negotiation, out of the voters' sight." },
    ],
    faq: [
      {
        q: "Why a majority bonus?",
        a: "To avoid ungovernable councils. Without it, a commune can spend six years with no stable majority. It is a choice of governability, paid for in representativeness.",
      },
      {
        q: "Does the leading list also get proportional seats?",
        a: "Yes. It receives the bonus AND its proportional share of the remaining seats, which is why it often reaches 70 % of the assembly.",
      },
      {
        q: "Useful outside a municipal context?",
        a: "Whenever you elect a team that must function together, rather than independent individuals. For plain options it is overkill.",
      },
    ],
  },

  grand_electors: {
    summary:
      "Voters are split into districts; each designates a local champion who takes all its electors. The winner of the popular vote can lose.",
    history: [
      "The American electoral college was born of the constitutional compromise of 1787: the framers wanted neither election by Congress nor a direct popular vote they considered risky. Each state receives electors equal to its congressional representation.",
      "Statewide winner-take-all is not in the Constitution: the states adopted it gradually themselves, to maximise their own weight. Maine and Nebraska still depart from it.",
      "In France, the Senate is elected indirectly by roughly 162,000 grands électeurs, overwhelmingly delegates of municipal councils — which structurally explains its over-representation of rural communes.",
    ],
    mechanics: [
      "Voters are split into districts, each holding a number of electors. In Placet, that division and weighting are freely configurable.",
      "Each district runs its own count — the local method is your choice — and awards its electors to the local winner, either as a block or proportionally.",
      "The elector total designates the winner. That total does not depend on the number of votes but on their geographic DISTRIBUTION: that is the whole difference.",
    ],
    example: {
      intro: "Three districts, 100 voters, 10 electors each.",
      head: ["District", "A", "B", "Electors"],
      rows: [
        ["North", "18", "15", "10 for A"],
        ["Centre", "17", "16", "10 for A"],
        ["South", "4", "30", "10 for B"],
      ],
      steps: [
        "A narrowly wins North and Centre: 20 electors.",
        "B crushes the South: 10 electors.",
        "On total votes: A 39, B 61. B leads by 22 votes and loses the election.",
      ],
      result:
        "B's surplus votes in the South are wasted. This phenomenon — concentrating your support is inefficient — is at the heart of every critique of indirect voting, and of gerrymandering.",
    },
    useCases: [
      "The US presidential election.",
      "Election of the French Senate by grands électeurs.",
      "Federations, confederations and corporate groups voting by entity.",
      "Any organisation where the components must count as such, not merely by headcount.",
    ],
    limits: [
      {
        t: "Popular vote winner defeated",
        d: "It has happened four times in the United States: 1876, 1888, 2000 and 2016. Not an accident of the system, but a direct consequence of its logic.",
      },
      {
        t: "Votes of unequal weight",
        d: "A voter in a small state counts several times one in a large state, by construction.",
      },
      {
        t: "Gerrymandering",
        d: "Whoever draws the boundaries influences the result as much as the voters. The word dates from Elbridge Gerry, in 1812.",
      },
      { t: "Concentrated campaigning", d: "Only the undecided districts matter; both camps ignore the rest." },
    ],
    faq: [
      {
        q: "How do you lose with more votes?",
        a: "By winning the wrong districts. Votes beyond the local winning margin are worth nothing: better to win three districts by one vote than to crush a single one by a thousand.",
      },
      {
        q: "What is it good for outside politics?",
        a: "Making entities count rather than individuals: subsidiaries of a group, branches of a federation, local chapters of an association. Each speaks with one voice, whatever its size.",
      },
      {
        q: "Can electors be allocated other than as a block?",
        a: "Yes. Placet can share each district's electors proportionally, which greatly reduces the distortion — the choice Maine and Nebraska made.",
      },
    ],
  },

  // ----------------------------------------------------------- ASSIGNMENT ----
  serial_dictatorship: {
    summary:
      "An order is fixed, usually at random, then each person in turn takes their favourite among whatever is left. Simple, incontestable and honest: lying never helps.",
    history: [
      "The procedure is as old as sharing, but social choice theory formalised it as « serial dictatorship »: at each step one person decides alone — hence the term, which describes the algorithm and not a regime.",
      "It structures North American sports drafts, where the order is reversed from the standings to rebalance the teams; the draft lottery, introduced by the NBA in 1985, added chance to discourage deliberate losing.",
      "Economists studied it as the house allocation problem, posed by Hylland and Zeckhauser in 1979. The proof that it is one of the rare mechanisms both efficient and immune to manipulation came later, with Abdulkadiroğlu and Sönmez (1998) and then Svensson (1999).",
    ],
    mechanics: [
      "An order is fixed. Drawing lots is the sensible default, because any other order needs justifying — seniority, need and merit are all legitimate, but they are political decisions.",
      "Each person in turn takes their preferred option among those still available. A single pass is enough; the result is immediate and can be checked line by line.",
      "Two proven properties: the outcome is Pareto-efficient (no rearrangement can help someone without hurting someone else) and the mechanism is strategy-proof (declaring your true preferences is always optimal).",
    ],
    example: {
      intro: "Four people, four assignments, order drawn at random: Chloé, Ali, Bruno, Dana.",
      head: ["Person", "1st choice", "2nd choice", "Gets"],
      rows: [
        ["Chloé", "Audit", "Redesign", "Audit"],
        ["Ali", "Audit", "Support", "Support"],
        ["Bruno", "Redesign", "Audit", "Redesign"],
        ["Dana", "Support", "Training", "Training"],
      ],
      steps: [
        "Chloé goes first and takes Audit, her first choice.",
        "Ali wanted Audit: no longer available, he takes Support, his second choice.",
        "Bruno gets Redesign, his first choice; Training is left for Dana.",
      ],
      result:
        "Three of four people get their first choice. The quality of the result depends entirely on the draw — which is why the order must be announced and verifiable before the assignment.",
    },
    useCases: [
      "Sharing out assignments, slots, desks or equipment within a team.",
      "Sports drafts and player selection.",
      "Allocating rooms in halls of residence or shared housing.",
      "Choosing internship or dissertation topics among students.",
    ],
    limits: [
      {
        t: "Rank inequality",
        d: "The first almost always gets their wish, the last almost never. Over repeated rounds, the order has to rotate.",
      },
      {
        t: "No envy-freeness",
        d: "Whoever is served last may legitimately envy the first. Efficiency does not guarantee the absence of resentment.",
      },
      {
        t: "Ignores intensity",
        d: "A vital wish and a lukewarm one weigh the same. If urgency matters, maximum satisfaction fits better.",
      },
    ],
    faq: [
      {
        q: "Should the order be drawn at random?",
        a: "It is the most defensible default, because it requires no justification. Any other order — seniority, need, merit — is a judgement call to own publicly before the assignment, never after.",
      },
      {
        q: "Is there any point in lying about my preferences?",
        a: "No, never, and that is proved. When your turn comes you take the best remaining option: declaring anything else can only hurt you. This is what makes the mechanism strategy-proof.",
      },
      {
        q: "Serial dictatorship or maximum satisfaction?",
        a: "Serial dictatorship is transparent and incontestable but depends on the draw. Maximum satisfaction optimises the group total, at the cost of a computation nobody can redo in their head. Choose according to what the group must accept: clarity or the optimum.",
      },
    ],
  },

  optimal_sum: {
    summary:
      "Rather than serving people one after another, this finds the assignment that minimises the sum of the ranks obtained. The best collective outcome, computed in one go.",
    history: [
      "This is the « assignment problem », a classic of operations research. Harold Kuhn published an efficient solution in 1955 and named it the « Hungarian algorithm », in tribute to the Hungarian mathematicians Dénes Kőnig and Jenő Egerváry whose work it drew on.",
      "It later emerged that Carl Gustav Jacobi had solved the problem in the nineteenth century, in work published posthumously in 1890 — sixty-five years before its rediscovery.",
      "The algorithm is now an ordinary industrial tool: assigning crews to flights, tasks to machines, vehicles to journeys. Every application that pairs two sets while optimising a total cost descends from it.",
    ],
    mechanics: [
      "Each person ranks the options. A first choice costs 1, a second costs 2, and so on: that builds the cost matrix.",
      "The algorithm finds the assignment minimising the TOTAL cost, exploring every possible combination intelligently — never one by one, which would be out of reach.",
      "An important consequence: the computation may sacrifice one person to relieve several. The optimum is collective, and that is exactly what it is asked to be.",
    ],
    example: {
      intro: "Three people, three assignments. Each cell gives the rank of the wish.",
      head: ["", "Audit", "Redesign", "Support"],
      rows: [
        ["Chloé", "1", "2", "3"],
        ["Ali", "1", "3", "2"],
        ["Bruno", "2", "1", "3"],
      ],
      steps: [
        "Serving everyone their first wish is impossible: Chloé and Ali both want Audit.",
        "Chloé→Audit, Bruno→Redesign, Ali→Support: total cost 1 + 1 + 2 = 4.",
        "Ali→Audit, Bruno→Redesign, Chloé→Support: total cost 1 + 1 + 3 = 5.",
      ],
      result:
        "The first combination wins: for comparable wishes, it costs the group less. No other arrangement beats 4.",
    },
    useCases: [
      "Sharing assignments or case files across a team while maximising overall satisfaction.",
      "Allocating pupils to workshops, options or projects.",
      "Assigning on-call or duty slots.",
      "Scheduling crews, rounds or machines — the historic industrial use.",
    ],
    limits: [
      {
        t: "Manipulable",
        d: "Unlike serial dictatorship, lying can pay: ranking a heavily contested option low may get you a better one. The method is not strategy-proof.",
      },
      {
        t: "Collective, not individual, optimum",
        d: "Someone may receive their last wish so the total falls. Mathematically optimal, and hard to announce to a human.",
      },
      {
        t: "Hard to verify",
        d: "Nobody can redo the computation in their head. Trust rests on the tool, which weakens perceived legitimacy.",
      },
      {
        t: "Ranks treated as distances",
        d: "The gap between 1st and 2nd choice counts the same as between 4th and 5th, although they are not experienced remotely alike.",
      },
    ],
    faq: [
      {
        q: "How is this better than serial dictatorship?",
        a: "On average the group is more satisfied: the algorithm sees every combination at once, where serial dictatorship is at the mercy of the running order. The price is readability — and the possibility of lying.",
      },
      {
        q: "What happens if two assignments tie?",
        a: "Several solutions can reach the same minimal cost; one is picked. If the stakes are high, announce the tie-break rule in advance, or switch to serial dictatorship, whose mechanics are reproducible.",
      },
      {
        q: "Do I need as many places as people?",
        a: "No, but the gap has a price: too few places and someone goes unassigned; too many and some stay empty. The computation remains valid either way.",
      },
    ],
  },

  top_trading_cycles: {
    summary:
      "Everyone already holds something and would like better. The algorithm finds the trading loops where everyone improves, and executes them. Nobody can end up worse off.",
    history: [
      "Lloyd Shapley and Herbert Scarf published the founding paper on the « housing market » in the Journal of Mathematical Economics in 1974. They credit the top trading cycles algorithm to David Gale and prove that it always produces an allocation in the core of the market.",
      "Atila Abdulkadiroğlu and Tayfun Sönmez extended it in 1999 to mixed situations, where some occupants are already in place and others are arriving — the concrete case of American student housing.",
      "Its most spectacular application is medical: kidney exchange programmes between incompatible donor-recipient pairs, formalised by Roth, Sönmez and Ünver in the early 2000s, rest on this cycle mechanism. Alvin Roth and Lloyd Shapley received the 2012 Nobel Prize in Economics for this body of work.",
    ],
    mechanics: [
      "Everyone starts with an endowment: their current assignment, desk or slot. The number of people and goods must therefore be equal.",
      "Everyone points at the good they prefer. Following the arrows always produces at least one cycle — possibly a self-loop, when someone already holds their favourite.",
      "The cycles are executed: everyone receives what they pointed at. Those served leave with their good, and the process repeats with the rest until nobody is left.",
      "Three proven properties: the outcome is Pareto-efficient, individually rational (nobody leaves with worse than their endowment), and the mechanism is strategy-proof.",
    ],
    example: {
      intro: "Three people, each holding a slot, each wanting another.",
      head: ["Person", "Current slot", "Wanted slot", "Gets"],
      rows: [
        ["Chloé", "Monday", "Tuesday", "Tuesday"],
        ["Ali", "Tuesday", "Monday", "Monday"],
        ["Bruno", "Wednesday", "Wednesday", "Wednesday"],
      ],
      steps: [
        "Chloé points at Ali's slot, Ali points at Chloé's: a cycle of length 2.",
        "The cycle executes: the two swap and leave satisfied.",
        "Bruno points at his own slot: a self-loop, so he keeps it.",
      ],
      result:
        "Two trades, no losers. That is the method's central guarantee: you can never come out worse off than you went in.",
    },
    useCases: [
      "Swapping on-call slots, duty shifts or days off.",
      "Reallocating desks, equipment or parking spaces already occupied.",
      "Rotating assignments or client portfolios within a team.",
      "Kidney exchange between incompatible pairs — the application that won a Nobel.",
    ],
    limits: [
      {
        t: "Requires an initial endowment",
        d: "With no starting point the method makes no sense. For a first allocation, use serial dictatorship.",
      },
      { t: "Trades only", d: "No good is created or removed: the existing set is redistributed, nothing more." },
      { t: "Strictly equal numbers", d: "As many goods as people, otherwise the cycle mechanism breaks." },
    ],
    faq: [
      {
        q: "Can I end up worse off than I am now?",
        a: "No, never, and it is proved: individual rationality is a proven property of the algorithm. If no trade suits you, you keep your endowment — that is the self-loop.",
      },
      {
        q: "Should I misreport my preference order?",
        a: "No. The mechanism is strategy-proof: lying cannot improve your outcome, and may cost you a cycle that suited you.",
      },
      {
        q: "What if nobody wants to trade?",
        a: "Everyone points at their own good, every cycle is a self-loop, and nothing moves. That result is valid: it says the current arrangement is already optimal.",
      },
    ],
  },

  stable_roommates: {
    summary:
      "Participants rank each other and are paired two by two, with no proposing side and no disposing side. No pair should prefer to leave their partners for each other.",
    history: [
      "The problem was posed in 1962 by David Gale and Lloyd Shapley, at the very end of their founding paper on stable marriage: what if, instead of two distinct groups, everyone belonged to the same set? They noted their algorithm does not apply, and left the question open.",
      "They also proved that a stable matching may simply NOT EXIST — the essential difference from stable marriage, where one always does.",
      "Robert Irving published the first polynomial-time algorithm in 1985: it determines whether a stable solution exists and constructs it if so, in two phases, the second of which methodically eliminates « rotations ».",
    ],
    mechanics: [
      "Everyone ranks ALL the other participants. There is only one group, so no asymmetry between proposers and receivers.",
      "First phase: everyone proposes to the highest-ranked person who has not yet rejected them; improving proposals are provisionally accepted, worse ones rejected. This yields a reduced table.",
      "Second phase: rotations — chains of cyclic preferences that block stability — are found and removed, until everyone has exactly one partner, or the table empties, which proves no solution exists.",
      "The resulting matching is stable: no two people not paired together prefer each other to their current partner.",
    ],
    example: {
      intro: "Four people to pair up, each having ranked the other three.",
      head: ["Person", "1st", "2nd", "3rd"],
      rows: [
        ["Chloé", "Ali", "Bruno", "Dana"],
        ["Ali", "Chloé", "Dana", "Bruno"],
        ["Bruno", "Dana", "Chloé", "Ali"],
        ["Dana", "Bruno", "Ali", "Chloé"],
      ],
      steps: [
        "Chloé and Ali put each other first: that pair is settled.",
        "Bruno and Dana do the same: second pair.",
        "No outside pair prefers each other: the matching is stable.",
      ],
      result:
        "Here the preferences dovetail perfectly. Change a single ranking and the stable matching can disappear entirely — the fragility specific to this problem.",
    },
    useCases: [
      "Forming pairs for work, review or pair programming.",
      "Allocating flatmates or roommates.",
      "Pairing training or tournament partners.",
      "Organising peer mentoring, with no hierarchy between the two roles.",
    ],
    limits: [
      {
        t: "May have no solution",
        d: "Unlike stable marriage, stability is not guaranteed. That is a proven result, not a weakness of the implementation.",
      },
      { t: "Even numbers required", d: "With an odd number, someone is left alone by construction." },
      {
        t: "Demanding full rankings",
        d: "Everyone must rank everyone else: the cost climbs fast with group size, and ranking your colleagues is socially loaded.",
      },
    ],
    faq: [
      {
        q: "What happens if no stable solution exists?",
        a: "The tool says so plainly. That is real information about the group: preferences form an irreducible cycle. It is then up to you — pair by declared affinity, or accept a known instability.",
      },
      {
        q: "How does this differ from two-sided Gale-Shapley?",
        a: "Gale-Shapley assumes two distinct sets ranking each other (candidates and programmes) and always guarantees a solution. Here everyone is in the same set, so no side is favoured — but the existence guarantee is gone.",
      },
      {
        q: "What exactly does « stable » mean?",
        a: "That no two people who are not paired together would both prefer each other to their current partner. Such a pair would leave the arrangement: stability is precisely what prevents that.",
      },
    ],
  },

  gale_shapley: {
    summary:
      "Two groups rank each other — candidates and programmes, mentees and mentors. Deferred acceptance always produces a stable matching. This is the principle behind Parcoursup.",
    history: [
      "David Gale and Lloyd Shapley published « College Admissions and the Stability of Marriage » in the American Mathematical Monthly in 1962. They proved that a stable matching between two groups ALWAYS exists, and gave a simple algorithm to build it: deferred acceptance.",
      "A historical twist: the National Resident Matching Program, which has assigned American medical residents to hospitals since 1952, was already using an equivalent algorithm — found empirically, ten years before it was theorised. Alvin Roth demonstrated this in 1984 and led its 1998 redesign to handle couples.",
      "Roth and Shapley received the 2012 Nobel Prize in Economics for the theory of stable allocations and market design. In France, Parcoursup has applied the principle since 2018, replacing APB, with an automatic responder playing the role of deferred acceptance.",
    ],
    mechanics: [
      "Two distinct groups rank each other. Side 1 proposes, side 2 disposes — and each entry on side 2 may have a capacity of several places.",
      "Each proposer applies to their first choice. Each receiver provisionally holds the best candidates up to its capacity and turns the rest away. Nothing is final: that is the whole point of DEFERRED acceptance.",
      "Rejected candidates apply to their next choice, which may displace a provisionally held candidate, who applies again in turn. It ends when nobody has a proposal left to make.",
      "The result is stable: no candidate-programme pair would prefer each other to their assignment. It is also OPTIMAL for the proposing side — among all stable matchings, every proposer gets the best one possible.",
    ],
    example: {
      intro: "Three candidates, three programmes with one place each, cross rankings.",
      head: ["Candidate", "Wishes", "Programme", "Ranking"],
      rows: [
        ["Chloé", "A, B, C", "A", "Ali, Chloé, Bruno"],
        ["Ali", "A, C, B", "B", "Chloé, Bruno, Ali"],
        ["Bruno", "B, A, C", "C", "Bruno, Chloé, Ali"],
      ],
      steps: [
        "Round 1: Chloé and Ali apply to A, Bruno to B. A prefers Ali and drops Chloé; B holds Bruno.",
        "Round 2: Chloé applies to B. B prefers Chloé to Bruno and swaps — Bruno is displaced.",
        "Round 3: Bruno applies to A, which keeps Ali; then to C, which accepts. Final: Ali→A, Chloé→B, Bruno→C.",
      ],
      result:
        "Bruno was held and then displaced: that is the deferred mechanism, and why Parcoursup results keep moving for weeks. The final outcome is stable.",
    },
    useCases: [
      "Parcoursup and French post-secondary admissions.",
      "The American medical residency match (NRMP) since 1952.",
      "School assignment in New York and Boston, redesigned by Roth and colleagues.",
      "Mentoring programmes, internships and project allocation between two distinct populations.",
    ],
    limits: [
      {
        t: "Structural asymmetry",
        d: "The proposing side gets the best stable matching available; the other gets the worst. Deciding who proposes is therefore a political decision, not a technical one.",
      },
      {
        t: "Strategy-proof on one side only",
        d: "Ranking sincerely is optimal for proposers — that is proved. The receiving side can sometimes gain by ranking tactically.",
      },
      { t: "Unassigned participants", d: "If places are short, some end up with nothing. The algorithm does not create any." },
      {
        t: "The anxiety of waiting",
        d: "Provisional assignments move until the very end. Mathematically sound, socially gruelling — as Parcoursup finds out every summer.",
      },
    ],
    faq: [
      {
        q: "Why does my assignment keep changing?",
        a: "Because acceptance is deferred: a place is held for you provisionally, and a better-ranked candidate can displace you — just as you may displace someone elsewhere. The process only settles at the end, and that is what guarantees a stable result.",
      },
      {
        q: "Should I rank my wishes tactically?",
        a: "If you are on the proposing side — the candidates, in Parcoursup — no: ranking sincerely is provably optimal. Putting a « realistic » wish above the one you actually want can only hurt you.",
      },
      {
        q: "What does « stable » mean?",
        a: "That no candidate-programme pair would both prefer each other to what they got. Without that property, side deals form outside the system — exactly what happened in the United States before 1952.",
      },
      {
        q: "How does this differ from serial dictatorship?",
        a: "Serial dictatorship has only one side ranking: the options have no opinion. Here both sides rank, and the assignment must satisfy both — hence stability, a notion that has no meaning in serial dictatorship.",
      },
    ],
  },
};

export default en;
