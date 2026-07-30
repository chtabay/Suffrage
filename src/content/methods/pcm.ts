import type { DeepFiches } from "./types";

// Deep method pages — Nigerian Pidgin.
const pcm: DeepFiches = {
  // ---------------------------------------------------------------- VOTE ----
  simple_vote: {
    summary:
      "One round, one vote, di one wey get pass votes na im win. Na di method wey plenty for world, and na im dem dey criticise pass: di winner fit convince only small part of di people.",
    history: [
      "First-past-the-post no get person wey invent am: e come from wetin people dey do for old English assemblies, where each county dey send two representatives go Parliament. Di name na horse-race talk — first person wey pass di post, nobody dey ask by how much.",
      "British Empire carry am go almost everywhere: United Kingdom, India, Canada, United States, Nigeria. Today e still dey rule big part of di world, na colonial inheritance cause am pass any theory.",
      "For 1951, di jurist Maurice Duverger talk di pattern wey carry im name: one-round plurality voting dey push country go two-party system, because if you vote third option, your vote just waste. E no be law like physics law, but di pattern hold well since then.",
    ],
    mechanics: [
      "Each voter pick one option, na so. Dem count di votes, arrange dem, di highest win. Na all: nobody ask wetin di voter think about di other options.",
      "Watch di words well: dis method dey give PLURALITY (di most votes), no be MAJORITY (pass half). Di two dey same only when na two options. With three, person fit win with 34 % while 66 % wey scatter no want am.",
      "If e tie exactly, no rule inside dey settle am: you need outside tie-break (draw, chairman vote, seniority). Placet go show di tie instead make e invent winner.",
    ],
    example: {
      intro: "Hundred people dey pick where dem go do di retreat. Three options, one round.",
      head: ["Option", "Votes", "Share"],
      rows: [
        ["Lyon", "40", "40 %"],
        ["Bordeaux", "35", "35 %"],
        ["Lille", "25", "25 %"],
      ],
      steps: [
        "Lyon lead with 40 votes: na im win.",
        "But 60 people out of 100 vote against Lyon.",
        "If Lille people prefer Bordeaux pass Lyon, Bordeaux for win head-to-head 60 to 40.",
      ],
      result:
        "Di winner na di one wey gather di most first choices, no be di one wey di group really prefer. Na exactly dis Condorcet complain about since 1785.",
    },
    useCases: [
      "General elections for United Kingdom, India and Canada.",
      "US presidential election inside each state, where di winner carry all di electors.",
      "Quick group decisions, when speed matter pass fine detail.",
      "Express polls and two-way choices, where plurality and majority na di same thing.",
    ],
    limits: [
      { t: "Minority winner", d: "With three options or more, you fit win without ever convincing half of di group." },
      {
        t: "Spoiler effect",
        d: "One option wey resemble anoda one go split im camp make third one win. Na so tactical voting take start, wey dey make people drop dia true first choice.",
      },
      {
        t: "Duverger law",
        d: "As tactical voting dey go, di options go reduce to two camps. Di fine differences go die before dem even vote.",
      },
      {
        t: "Boundary wahala",
        d: "When people dey vote by district, where dem draw di line dey count like di votes — na di open door to gerrymandering.",
      },
    ],
    faq: [
      {
        q: "Wetin be di difference between plurality and majority?",
        a: "Plurality na di most votes; majority na pass half. Person wey win with 40 % get plurality but no get majority. If your decision must get legitimacy for group wey go live with am, dat difference no be small thing at all.",
      },
      {
        q: "Why e still common reach so?",
        a: "Because people understand am one time, dem fit count am by hand, and e dey always give clear answer. Dem don document im problems since 1785, but di simplicity na real political advantage.",
      },
      {
        q: "When make I avoid am?",
        a: "Once options pass two and di group must live with di decision. Approval voting cost di voter di same effort and solve most of di problem.",
      },
    ],
  },

  two_round: {
    summary:
      "If nobody reach 50 % for first round, di top two go clash for second one. Di winner must get absolute majority — but only against di finalist wey dem put am with.",
    history: [
      "Two-round voting take root for France for di 19th century and spread under di Third Republic. Di Fifth Republic take am for 1958 for parliament elections, then for 1962 for presidential election by direct vote — dem first use am for 1965.",
      "Di idea na political compromise: keep di clearness of majority voting while dem fix im worst problem, di minority winner. Di runoff force clear choice between two options only.",
      "E spread far pass France: Austria, Portugal, Brazil, Poland, most Latin American presidential elections, and plenty French-speaking association votes.",
    ],
    mechanics: [
      "First round: everybody vote one option. If one pass di threshold (50 % by default for Placet, you fit change am), e don finish.",
      "If not, second round between di top two — na di normal rule. French parliament elections use anoda one: any candidate wey reach 12.5 % of registered voters go qualify, na so three-way runoff dey happen.",
      "For second round, absolute majority sure by arithmetic: with two options, plurality NA majority. Na arithmetic guarantee, no be consensus guarantee.",
    ],
    example: {
      intro: "Di same hundred people, dis time for two rounds.",
      head: ["Option", "Round 1", "Round 2"],
      rows: [
        ["Lyon", "40", "45"],
        ["Bordeaux", "35", "55"],
        ["Lille", "25", "dem comot am"],
      ],
      steps: [
        "Nobody reach 50 %: Lyon and Bordeaux enter second round.",
        "Lille 25 votes move: 20 go Bordeaux, 5 go Lyon.",
        "Bordeaux win 55 against 45.",
      ],
      result:
        "Di runoff correct di first round true true. But see wetin e no do: if Lille be everybody compromise second choice, dem for don comot am for first round, without ever testing am for duel.",
    },
    useCases: [
      "French presidential election and plenty other republics.",
      "French parliament and departmental elections.",
      "Association and union votes, where absolute majority dey often for di rules.",
      "Heavy group decisions, when clear mandate matter pass speed.",
    ],
    limits: [
      {
        t: "Di compromise die for first round",
        d: "Moderate option, wey be everybody second choice but nobody first, no dey pass first round. Condorcet winner fit comot before e even play.",
      },
      {
        t: "Non-monotonicity",
        d: "To gain votes fit make you lose. As e dey change who qualify, extra support for first round fit put you against more dangerous opponent. Di result no dey always move di same way as di votes.",
      },
      { t: "Cost and tiredness", d: "Two votes, two organisations, and turnout wey almost always drop for second round." },
      {
        t: "Tactical voting shift, e no comot",
        d: "E no be about winning again but about qualifying: di calculation just move go first round.",
      },
    ],
    faq: [
      {
        q: "Di runoff dey guarantee real consensus?",
        a: "No: e dey guarantee absolute majority against ONE particular opponent. If di duel wey dem give no be di correct one — because dem comot di compromise for first round — di majority na arithmetic, no be political.",
      },
      {
        q: "How candidate fit lose as e dey gain votes?",
        a: "By changing im runoff opponent. Say you beat A small small but you dey lose to B: small extra votes for first round fit comot A and put B, and cost you di election. Na di monotonicity failure, and dem fit show am plain.",
      },
      {
        q: "Two rounds or Condorcet?",
        a: "Condorcet dey test EVERY duel for one single vote, while di runoff dey test only one, wey di first round pick. If your group fit rank di options, Condorcet dey answer di same question more complete.",
      },
    ],
  },

  approval: {
    summary:
      "Everybody tick every option wey okay for dem, no ranking. Di one wey gather di most approvals win. Almost no extra work for di ballot, but big gain for quality.",
    history: [
      "Approval voting get old papa: Venice Republic dey use am from di 13th century for some stages of picking di Doge, and several religious orders dey use am to pick dia leaders.",
      "Di modern formal work na 1978: Steven Brams and Peter Fishburn publish « Approval Voting » for di American Political Science Review, and e become di method wey dem study pass for di American revival of social choice theory.",
      "Plenty learned societies adopt am from 1987; IEEE use am reach 2002 before dem drop am, because im members no dey use am. Di UN Security Council still dey use am for straw polls to pick Secretary-General. Fargo (North Dakota) adopt am by referendum for 2018 and use am from 2020 to 2024, until North Dakota ban am for 2025; St. Louis (Missouri) don dey use am since 2021 for im primary, and di top two go enter second round.",
    ],
    mechanics: [
      "Each voter tick as many option as dem want — none, one, or all. Each tick na one point; dem add am up.",
      "Di ballot no ask for ranking: na just line between wetin di voter accept and wetin dem reject. Dat easy thinking na di main argument of di method.",
      "One big thing: tactical voting disappear, because to support your favourite no dey stop you from supporting di compromise too. To talk true about your preference no fit hurt you again.",
    ],
    example: {
      intro: "Hundred people tick everything wey okay for dem.",
      head: ["Option", "Approvals", "Rate"],
      rows: [
        ["Bordeaux", "72", "72 %"],
        ["Lyon", "58", "58 %"],
        ["Lille", "41", "41 %"],
      ],
      steps: [
        "Plenty of di 40 Lyon supporters tick Bordeaux too.",
        "Bordeaux gather 72 approvals: na di place wey most people accept.",
        "Di total pass 100 % — e normal: na approvals dem dey count, no be exclusive votes.",
      ],
      result:
        "Approval dey measure how acceptable something be, no be excitement. For decision wey di whole group go live with, na often di correct question.",
    },
    useCases: [
      "To pick date, place or restaurant: plenty answers fit work.",
      "To shortlist applications before interview.",
      "Di St. Louis municipal primary, and UN Security Council straw polls.",
      "Prevalence surveys, where you dey look for wetin common pass wetin come first.",
    ],
    limits: [
      {
        t: "No intensity",
        d: "« I love am » and « I fit manage am » dey count di same. Majority judgment dey exist to fill dat gap.",
      },
      {
        t: "Di threshold wahala",
        d: "Where you go draw your approval line? To tick plenty dey help consensus but e dey weaken your favourite; to tick small dey do di opposite. Na di real tactical lever of di method.",
      },
      {
        t: "E dey follow how hard people be",
        d: "Generous group and strict group no go give di same ranking even with di same preferences.",
      },
    ],
    faq: [
      {
        q: "How many options make I tick?",
        a: "Every one wey you go truly gree with. Di strongest strategy na to tick everything wey you prefer pass di result wey you think go happen.",
      },
      {
        q: "Total wey pass 100 %, e normal?",
        a: "Yes. Dem no dey share hundred votes: dem dey count, for each option, how many people accept am. Read di percentages option by option.",
      },
      {
        q: "Approval or majority judgment?",
        a: "Approval na one click and e dey answer « e acceptable? ». Majority judgment ask for one grade per option and e dey answer « how good e be? ». Start with approval; move go grades when di fine differences really matter.",
      },
    ],
  },

  borda: {
    summary:
      "Everybody rank di options; di ranks turn to points, and dem add am. Di method dey reward broad agreement pass di strong feeling of one camp.",
    history: [
      "Jean-Charles de Borda — sailor, mathematician and physicist — carry im paper on election by ballot go di Royal Academy of Sciences for 1770; dem publish am for 1781. Im point simple: normal voting fit elect candidate wey di majority no want.",
      "Di idea old pass dat. Di Majorcan philosopher Ramon Llull describe pairwise comparison and ranking since end of di 13th century — na for 2001 dem come find di manuscripts. Nicholas of Cusa propose points method for 1433 to elect di Holy Roman Emperor.",
      "Di Academy of Sciences use Borda method to elect members; according to one tradition wey Duncan Black report, Napoleon, wey join for 1797, na im make dem drop am — but people dey argue dat story. Dem credit Borda with dis answer to di manipulation talk: im scheme, e talk, na for honest people only.",
    ],
    mechanics: [
      "With n options, first place carry n−1 points, second n−2, and so on down to 0 for last. Dem add each option points.",
      "Di Dowdall variant (Nauru dey use am) give 1, 1/2, 1/3…: e dey weight top places heavy pass. Di scale dey change di result — no be small implementation detail.",
      "Placet dey use di classic n−1, n−2, … 0 scale, wey make di gaps easy to read: one point na exactly one rank wey you gain for one ballot.",
    ],
    example: {
      intro: "Three options, five ranked ballots. First place na 2 points, second 1, third 0.",
      head: ["Ballots", "1st", "2nd", "3rd"],
      rows: [
        ["2 voters", "Lyon", "Bordeaux", "Lille"],
        ["2 voters", "Lille", "Bordeaux", "Lyon"],
        ["1 voter", "Bordeaux", "Lyon", "Lille"],
      ],
      steps: ["Lyon: 2×2 + 1×1 = 5 points.", "Lille: 2×2 = 4 points.", "Bordeaux: 2×1 + 2×1 + 1×2 = 6 points."],
      result:
        "Bordeaux win even though almost nobody put am first — na everybody second choice. Na exactly wetin Borda wan capture, and na exactly wetin im critics dey use against am.",
    },
    useCases: [
      "Parliament elections for Nauru and minority seats for Slovenia.",
      "Sports and culture awards: Ballon d'Or, MVP trophies, book prizes.",
      "To set agenda or collective priority, when you must compare all di options.",
      "Team decisions where you want di option wey dey divide people less.",
    ],
    limits: [
      {
        t: "Clones fit spoil am",
        d: "If you add weak options wey resemble one rival, im average go fall. To write di list of options come turn political work.",
      },
      {
        t: "Tactical burying",
        d: "To rank di most serious rival last by mouth dey pay, and nobody fit catch am well.",
      },
      {
        t: "E fail di Condorcet criterion",
        d: "Option wey win every duel fit still lose di Borda count. Di two methods dey answer different questions, and Borda accept dat.",
      },
    ],
    faq: [
      {
        q: "Borda or Condorcet?",
        a: "Borda dey measure average satisfaction and e dey always give result; Condorcet dey look for di champion of all duels, but e fit find none. Borda strong pass for practice, Condorcet strict pass for theory.",
      },
      {
        q: "I must rank all di options?",
        a: "Ideally yes: incomplete ballot dey spoil di relative points. Na di real cost of di method, and na why e dey tire people once options pass seven or eight.",
      },
      {
        q: "Why last place na zero?",
        a: "So dat na only di GAPS between ranks go count. If you add same number to every rank, di final order no go change; to start from zero just make am easy to read.",
      },
    ],
  },

  condorcet: {
    summary:
      "Dem dey simulate every possible duel between options. Di one wey win all na di Condorcet winner: di true champion of di group, e no dey fear tactical voting and e hard well well to manipulate.",
    history: [
      "Marie Jean Antoine Nicolas de Caritat, Marquis de Condorcet, publish im essay for 1785 on how to apply analysis to di probability of majority decisions. Mathematician, Enlightenment philosopher and later member of di Legislative Assembly, e show say normal voting fit elect option wey di majority go reject for head-to-head.",
      "Im proposal: compare every option with every other one, two by two, and crown di one wey win every time. Na so e come see di problem wey now carry im name — di Condorcet paradox — when di duels dey go round in circle.",
      "Di idea come sleep till di 20th century. Duncan Black wake am for « The Theory of Committees and Elections » (1958). Meanwhile Kenneth Arrow don publish im impossibility theorem for 1951 (Nobel for Economics, 1972): no collective ranking method fit satisfy small reasonable conditions all together.",
      "Ramon Llull don describe pairwise procedure since end of di 13th century, for manuscripts wey dem only find for 2001 — five centuries before Condorcet.",
    ],
    mechanics: [
      "From di rankings, dem build di duel matrix: for each pair of options, how many ballots put one before di other. Dem no ask di voter anything pass ranking.",
      "Di Condorcet winner na di option wey win ALL im duels. When e exist, na only one — and no other method fit claim say e represent majority preference better.",
      "When di duels form circle (A beat B, B beat C, C beat A), no winner dey: na di Condorcet paradox, na property of di group preferences, no be counting bug. Placet go show am plain instead make e crown anyhow winner.",
      "Di question come shift go di Smith set: di smallest group of options wey beat every option outside am. Placet randomised variant dey draw from dat set.",
    ],
    example: {
      intro: "Three options, five ranked ballots. Compare dem two by two.",
      head: ["Duel", "Result", "Winner"],
      rows: [
        ["Bordeaux vs Lyon", "3 – 2", "Bordeaux"],
        ["Bordeaux vs Lille", "3 – 2", "Bordeaux"],
        ["Lyon vs Lille", "3 – 2", "Lyon"],
      ],
      steps: [
        "Bordeaux win im two duels: na im be di Condorcet winner.",
        "Lyon win one out of two, Lille no win any.",
        "Di final ranking dey follow how many duels each win: Bordeaux, Lyon, Lille.",
      ],
      result:
        "With one-round voting, Lyon for don win on first choices. Di duels show say majority prefer Bordeaux — na di information wey normal voting dey throw away.",
    },
    useCases: [
      "Di Debian project dey elect im leaders with Condorcet method (Schulze variant), like plenty free software projects.",
      "Wikimedia, KDE, Gentoo and several software foundations dey use am for internal votes.",
      "Heavy team decisions, where di legitimacy of di result matter like di result itself.",
      "Any choice where you suspect say compromise go beat favourites wey dey cancel each other.",
    ],
    limits: [
      {
        t: "Condorcet paradox",
        d: "Di duels fit go round in circle, with no winner at all. E rare when preferences dey similar, e common pass for hot topics with three camps.",
      },
      {
        t: "Ballot wey demand more",
        d: "You must rank, no be just tick. Once options pass seven or eight, tiredness dey real and ballots dey spoil.",
      },
      {
        t: "Counting no clear",
        d: "You no fit read duel matrix one time. You must show di result well, if not, di legitimacy wey you gain for theory go waste for practice.",
      },
      {
        t: "Arrow theorem",
        d: "No method fit tick all di boxes together. Condorcet choose to follow majority preference, and e dey pay with di cycles.",
      },
    ],
    faq: [
      {
        q: "Wetin be di Condorcet paradox?",
        a: "Na when di group preferences dey go round in circle: one majority prefer A pass B, anoda majority prefer B pass C, and third one prefer C pass A. No option win all im duels. E no be error — na possible property of collective preferences, even though each single ballot make perfect sense.",
      },
      {
        q: "Wetin Placet dey do if cycle happen?",
        a: "E go announce am, instead make e cook winner. Di ranking by duels won still dey show, but no decision dey presented as settled. If you still wan decide, di randomised Condorcet variant dey draw from di Smith set.",
      },
      {
        q: "Person fit manipulate Condorcet vote?",
        a: "Na among di hardest to manipulate. Di Gibbard-Satterthwaite theorem (1973-1975) show say no serious method dey completely safe, but to manipulate Condorcet need make you know other people intentions well well, and e dey easily turn against di person wey try am.",
      },
      {
        q: "Condorcet or majority judgment?",
        a: "Condorcet dey compare options against each other; majority judgment dey grade each one on im own scale. Condorcet dey find di champion of di duels when e exist; majority judgment dey always give result and e dey measure di level of support.",
      },
    ],
  },

  condorcet_random: {
    summary:
      "Condorcet with escape door: when di duels dey go round in circle, dem go draw di winner by chance among di blocked options. Decision sure, and no hidden arbitrariness.",
    history: [
      "To draw lots no be last resort: na di normal way of Athenian democracy, wey dey use di kleroterion to share most public offices, and dem keep election for technical roles.",
      "E still dey inside modern electoral law as tie-break: plenty electoral codes, French own included, dey settle exact tie by lot or by age. Some US states dey do am literally, dem go draw card or flip coin.",
      "For social choice theory, lottery get serious standing: e still be one of di few ways to settle matter without favouring any option or any voter when preferences block. Randomisation dey bring back fairness wey determinism no fit give.",
    ],
    mechanics: [
      "As long as Condorcet winner dey, dis variant na exactly Condorcet: chance no dey enter at all.",
      "Dem go draw lots only when cycle happen, and no be from anywhere: Placet dey draw from di SMITH SET, di smallest group of options wey beat every option outside am. Option wey dem don beat no get any chance.",
      "Di result no dey reproducible: na di price of decision wey sure. When di matter heavy, announce di draw to di group before you run am.",
    ],
    example: {
      intro: "Three options, perfect cycle — di textbook case of di paradox.",
      head: ["Duel", "Result", "Winner"],
      rows: [
        ["Lyon vs Bordeaux", "6 – 3", "Lyon"],
        ["Bordeaux vs Lille", "6 – 3", "Bordeaux"],
        ["Lille vs Lyon", "6 – 3", "Lille"],
      ],
      steps: [
        "Lyon beat Bordeaux, Bordeaux beat Lille, Lille beat Lyon: di circle don complete.",
        "No option win all im duels: plain Condorcet stop here.",
        "Di three of dem form di Smith set; di draw pick one, each with one chance out of three.",
      ],
      result:
        "Chance no dey replace di vote: e dey only settle between options wey di group don make exactly equal. Any other tie-break go bring bias wey nobody vote for.",
    },
    useCases: [
      "Decisions wey must land today, on hot topic.",
      "Groups wey split into three clear camps, where cycle likely.",
      "To break exact ties, instead of chairman vote wey people fit challenge.",
      "Any situation where deadlock cost pass imperfect choice.",
    ],
    limits: [
      {
        t: "No dey reproducible",
        d: "If dem count di same ballots twice, e fit give two winners. Announce am BEFORE di vote, if not, people get right to complain.",
      },
      {
        t: "Culture no dey accept am well",
        d: "« We draw lots » no dey enter people ear, even when na di fairest answer. You must explain di deadlock.",
      },
      {
        t: "E dey hide information",
        d: "Cycle dey talk something about di group: three camps wey no fit gree. Di draw settle am without di group discussing dat diagnosis.",
      },
    ],
    faq: [
      {
        q: "Chance dey always involved?",
        a: "No, e rare well well. As long as one option win all im duels, dem go declare am winner exactly like plain Condorcet. Di draw dey only for cycles.",
      },
      {
        q: "Wetin be di Smith set?",
        a: "Di smallest group of options where each member beat every option outside am. When cycle happen, na di leading pack: di draw dey only pick options wey really dey race.",
      },
      {
        q: "Dis one na true democracy?",
        a: "Like di alternatives, and e honest pass dem. When cycle happen, EVERY tie-break rule — alphabet order, seniority, chairman vote — dey favour somebody. Lot na di only tie-break wey no favour anybody, and e dey only apply between options wey di group put for equal level.",
      },
    ],
  },

  majority_judgment: {
    summary:
      "Each option go collect grade (from « reject » to « very good »), and na di MEDIAN grade dey decide. Dem design di method to resist tactical voting.",
    history: [
      "Majority judgment na Michel Balinski and Rida Laraki propose am for 2007, researchers for École polytechnique and CNRS, for di Proceedings of the National Academy of Sciences. Dia main book, « Majority Judgment: Measuring, Ranking, and Electing », come out for MIT Press for 2011.",
      "Di inspiration no come from politics: wine competitions, gymnastics and figure skating don dey grade with word scales for long and dey throw away di extremes, because average too easy for one judge to manipulate.",
      "Di authors test am for April 2007 with voters for Orsay during di French presidential election, side by side with di official vote. Since then several French citizen primaries don use am, including di Primaire populaire for 2022.",
    ],
    mechanics: [
      "Di voter give grade to EACH option, separate from di others: dem dey evaluate, no be rank. Two options fit collect di same grade.",
      "For each option, dem arrange di grades and take di median — di grade wey majority judge « at least dis good » and majority judge « at most dis good ». Unlike di average, di median no dey shake when person drop extreme grade for tactics.",
      "If medians tie, dem go break am by removing median grades one by one from di tied options until dem separate. Na di same as comparing how many supporters and opponents dey around di median grade.",
    ],
    example: {
      intro: "Three options wey eleven people grade on five-grade scale.",
      head: ["Option", "Grades wey e collect", "Median"],
      rows: [
        ["Bordeaux", "3 Very good, 5 Good, 3 Fair", "Good"],
        ["Lyon", "5 Very good, 1 Good, 5 Reject", "Good"],
        ["Lille", "2 Very good, 4 Fair, 5 Poor", "Fair"],
      ],
      steps: [
        "Bordeaux and Lyon get di same median grade: Good.",
        "Remove one median grade from each and start again: Bordeaux still get wider base above Good.",
        "Lyon, wey dey divide people (5 « Very good » but 5 « Reject »), fall behind.",
      ],
      result:
        "Majority judgment prefer di option wey plenty people respect pass di one wey dey polarise. One-round vote for don crown Lyon on im five strong fans.",
    },
    useCases: [
      "Internal elections and citizen primaries, where you wan measure real support.",
      "To assess applications, projects or suppliers on quality criteria.",
      "Decisions where you wan catch di divisive option before you adopt am.",
      "Any vote where di strength of support, no be just im existence, suppose count.",
    ],
    limits: [
      {
        t: "E fail di Condorcet criterion",
        d: "Option wey win every duel fit no get di best median. Di two methods dey measure different things, and you no fit get di two (Arrow theorem).",
      },
      {
        t: "To calibrate di grades",
        d: "« Fair » no mean di same thing for everybody. You must explain di scale before di vote, if not, na incomparable judgments you dey add.",
      },
      { t: "Longer ballot", d: "One grade per option pass one tick, and e dey show once options pass ten." },
      { t: "Technical tie-break", d: "Di rule of removing medians correct but e hard to explain for meeting." },
    ],
    faq: [
      {
        q: "Why median instead of average?",
        a: "Because people fit buy average. Tactical voter wey give di lowest grade to serious rival go move dia average well; e go move di median only one step, and only if plenty people do di same. Di median na di heart of di method, no be calculation detail.",
      },
      {
        q: "E dey truly impossible to manipulate?",
        a: "No — di Gibbard-Satterthwaite theorem no allow dat for any method. But majority judgment dey cut down wetin person fit gain from insincere vote, and na di best wey person fit prove.",
      },
      {
        q: "How many grades I need?",
        a: "Five or six, with clear word labels. If e less, you lose di detail; if e plenty, voters no fit separate di steps wey dey near each other.",
      },
    ],
  },

  proportional: {
    summary:
      "Instead of one winner, dem dey share seats according to votes with di D'Hondt method. Na di voting of assemblies, no be of decisions.",
    history: [
      "Di Belgian jurist Victor d'Hondt bring out im method since 1878, for one pamphlet wey e publish without im name, and systematise am as book for 1882; Belgium adopt am through di 1899 law and use am from di 1900 elections — first for di whole world. Dem don already sabi di formula: Thomas Jefferson propose am for 1792 to share House seats among di American states.",
      "Rival variants dey since dat time: Sainte-Laguë (1910), same as di Webster method of 1832, dey treat small parties better and e still be di reference for Scandinavia and New Zealand.",
      "Di largest-remainder method, wey dem call Hamilton own, dem drop am for United States after di Alabama paradox: for 1880 dem see say to raise di total seats from 299 to 300 MAKE Alabama lose one seat. United States dey use di Huntington-Hill method since 1941.",
    ],
    mechanics: [
      "For each list, calculate di series votes/1, votes/2, votes/3… Di seats go to di biggest quotients across all lists, until dem finish.",
      "Dis highest-average rule dey favour big lists small, systematically and everybody sabi: na political choice for governability, no be calculation accident.",
      "Threshold (5 % for Germany, 3 % for French European elections) dey remove very small lists before sharing, to avoid scatter-scatter.",
    ],
    example: {
      intro: "Hundred votes, five seats to share between three lists with D'Hondt.",
      head: ["List", "Votes", "÷1", "÷2", "÷3"],
      rows: [
        ["A", "45", "45", "22.5", "15"],
        ["B", "35", "35", "17.5", "11.7"],
        ["C", "20", "20", "10", "6.7"],
      ],
      steps: [
        "Di five biggest quotients across all lists: 45 (A), 35 (B), 22.5 (A), 20 (C), 17.5 (B).",
        "Final sharing: A 2 seats, B 2 seats, C 1 seat.",
        "A get 40 % of di seats with 45 % of di votes; C get 20 % of di seats with 20 % of di votes.",
      ],
      result:
        "With small number of seats, proportionality must be rough — na di number of seats, pass di formula, dey decide how fine di representation fit be.",
    },
    useCases: [
      "Parliament elections for most European democracies.",
      "European elections, and French regional elections for di proportional part.",
      "To compose board of directors or association committee.",
      "To share budget or slots between groups, according to support.",
    ],
    limits: [
      {
        t: "Dis one no be decision",
        d: "Proportional dey compose assembly. To settle question, you still need vote after — di tool no dey replace di decision.",
      },
      {
        t: "Bonus for big lists",
        d: "D'Hondt dey round in favour of di biggest, always. Sainte-Laguë dey more neutral, if na dat you want.",
      },
      {
        t: "Thresholds and scatter",
        d: "Without threshold, di assembly no go fit govern; with threshold, some votes no dey represented at all.",
      },
      {
        t: "Sharing paradoxes",
        d: "Di Alabama paradox show say no sharing method dey free from strange behaviour.",
      },
    ],
    faq: [
      {
        q: "D'Hondt or Sainte-Laguë?",
        a: "D'Hondt (divide by 1, 2, 3…) dey favour big lists small and dey make majority easy. Sainte-Laguë (by 1, 3, 5…) dey more faithful to small ones. Di choice na political and you must make am before di vote, never after.",
      },
      {
        q: "Why my seat percentages no match di votes?",
        a: "Because you no fit cut seat into two. With five seats, di smallest step na 20 %: no formula fit do better. Di gap dey close as di number of seats dey grow.",
      },
      {
        q: "I fit use am for small group?",
        a: "Yes, to share resources — slots, budget, places. To choose between options, use approval or Condorcet instead.",
      },
    ],
  },

  list: {
    summary:
      "You dey vote for full list; di one wey come first collect half of di seats automatically, and dem share di rest proportionally. Na di French municipal election method.",
    history: [
      "List voting with majority bonus na di law of 19 November 1982 fix am for French communes of 3,500 people and above; e end pure majority list voting and bring small proportionality.",
      "Anoda law, of 31 December 1982, create di special regime of Paris, Lyon and Marseille (dem call am PLM), with elections by sector — mechanism wey don several times produce mayor wey no lead di city-wide vote.",
      "Dem extend di principle go regional elections, with bonus reduced to 25 % of seats, through di reforms of 1999 and 2003. Di logic no change: to arbitrate openly between representation and power to govern. Last last, di law of 21 May 2025 comot di threshold — since di March 2026 municipal elections, every commune dey vote by list, and panachage don finish.",
    ],
    mechanics: [
      "Each voter pick one list, no mixing. Di list wey lead collect 50 % of di seats one time — na di majority bonus.",
      "Dem share di remaining 50 % proportionally among ALL lists wey pass di threshold, including di leading list, wey therefore collect far pass im share of votes.",
      "For municipal elections, second round dey happen if no list reach absolute majority, and qualified lists fit merge — na why negotiation between rounds important well well.",
    ],
    example: {
      intro: "Twenty seats, three lists, majority bonus of 50 %.",
      head: ["List", "Votes", "Bonus", "Proportional", "Total"],
      rows: [
        ["A", "45 %", "10", "4", "14"],
        ["B", "35 %", "0", "4", "4"],
        ["C", "20 %", "0", "2", "2"],
      ],
      steps: [
        "List A, wey lead, collect 10 out of 20 seats one time.",
        "Dem share di remaining 10 seats proportionally among di three lists.",
        "A get 14 seats out of 20, na 70 % of di assembly with 45 % of di votes.",
      ],
      result:
        "Di distortion no be mistake: na di whole point of di mechanism. Governing majority dey come out di same night, and di price wey dem accept na say di other lists no get full representation.",
    },
    useCases: [
      "French municipal elections — for every commune since di 2025 reform.",
      "Regional elections, with 25 % bonus.",
      "To elect committee or board from competing slates.",
      "Any assembly wey must represent people and still fit decide.",
    ],
    limits: [
      {
        t: "Distortion wey dem want",
        d: "List wey be minority for votes go turn majority for seats. Na di deal of di mechanism, as long as dem announce am.",
      },
      { t: "No mixing", d: "You dey take di list as one block. Voter no fit approve one person without approving di whole team." },
      { t: "Weight of mergers", d: "Between di two rounds, di main thing dey happen for negotiation, far from voters eye." },
    ],
    faq: [
      {
        q: "Why majority bonus?",
        a: "To avoid councils wey no fit govern. Without am, commune fit spend six years without stable majority. Na governability choice, wey dem pay with representation.",
      },
      {
        q: "Di leading list dey collect proportional seats too?",
        a: "Yes. E collect di bonus AND im proportional share of di remaining seats, na why e dey often reach 70 % of di assembly.",
      },
      {
        q: "E dey useful outside municipal matter?",
        a: "Anytime you dey elect team wey must work together, no be independent individuals. For plain options, e too much.",
      },
    ],
  },

  grand_electors: {
    summary:
      "Dem share di voters into districts; each district pick local champion wey carry all im electors. Di winner of di popular vote fit lose.",
    history: [
      "Di American electoral college come from di constitutional compromise of 1787: di framers no want election by Congress, and dem no want direct popular vote wey dem see as risky. Each state collect electors equal to im representation for Congress.",
      "Di « winner-take-all » rule for state level no dey inside di Constitution: na di states demselves adopt am small small, to maximise dia weight. Maine and Nebraska still dey do am differently.",
      "For France, dem dey elect di Senate indirectly with about 162,000 grands électeurs, mostly delegates of municipal councils — na why rural communes dey over-represented for structure.",
    ],
    mechanics: [
      "Dem share di voters into districts, each one with number of electors. For Placet, you fit set dat sharing and weighting as you like.",
      "Each district run im own count — di local method na your choice — and give im electors to di local winner, either as block or proportionally.",
      "Di total electors pick di winner. Dat total no dey depend on how many votes, but on how dem SPREAD for map: na di whole difference.",
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
        "A win North and Centre by small margin: 20 electors.",
        "B scatter di South: 10 electors.",
        "For total votes: A 39, B 61. B lead by 22 votes and still lose di election.",
      ],
      result:
        "B extra votes for di South just waste. Dis thing — say to gather your support for one place no dey efficient — na di centre of every criticism of indirect voting, and of gerrymandering.",
    },
    useCases: [
      "US presidential election.",
      "Election of di French Senate by grands électeurs.",
      "Federations, confederations and company groups wey dey vote by entity.",
      "Any organisation where di parts must count as parts, no be by headcount alone.",
    ],
    limits: [
      {
        t: "Popular vote winner lose",
        d: "E don happen four times for United States: 1876, 1888, 2000 and 2016. No be accident of di system, na direct result of im logic.",
      },
      { t: "Votes wey no weigh di same", d: "Voter for small state dey weigh several times voter for big state, by design." },
      {
        t: "Gerrymandering",
        d: "Di person wey draw di boundaries dey influence di result like di voters. Di word come from Elbridge Gerry, for 1812.",
      },
      { t: "Campaign wey concentrate", d: "Na only di undecided districts dey count; di two camps dey ignore di rest." },
    ],
    faq: [
      {
        q: "How person go lose with plenty votes?",
        a: "By winning di wrong districts. Votes wey pass di local winning margin no dey do anything: e better make you win three districts by one vote pass to scatter one by thousand.",
      },
      {
        q: "Wetin e dey use for outside politics?",
        a: "To make entities count instead of individuals: subsidiaries of one group, sections of federation, branches of association. Each one dey talk with one voice, no matter im size.",
      },
      {
        q: "Dem fit share electors another way apart from block?",
        a: "Yes. Placet fit share each district electors proportionally, wey dey cut di distortion well — na di choice of Maine and Nebraska.",
      },
    ],
  },

  // ----------------------------------------------------------- ASSIGNMENT ----
  serial_dictatorship: {
    summary:
      "Dem fix order, often by draw, then each person take dia favourite from wetin remain, one after di other. Simple, nobody fit challenge am, and e honest: to lie no dey ever help.",
    history: [
      "Di procedure old like sharing itself, but social choice theory formalise am as « serial dictatorship »: for each step, one person dey decide alone — na why dem use dat word, wey describe di algorithm, no be any government.",
      "E dey structure North American sports drafts, where dem reverse di order from di standings to balance di teams; di draft lottery, wey NBA start for 1985, add chance to discourage teams from losing on purpose.",
      "Economists study am under di house allocation problem, wey Hylland and Zeckhauser raise for 1979. Di proof say na one of di few mechanisms wey dey efficient and nobody fit manipulate come later, with Abdulkadiroğlu and Sönmez (1998) and then Svensson (1999).",
    ],
    mechanics: [
      "Dem fix di order. Draw na di sensible default, because any other order need explanation — seniority, need and merit all dey legitimate, but na political decisions.",
      "Each person, for dia turn, take dia preferred option from wetin still dey. One pass dey enough; di result sharp and you fit check am line by line.",
      "Two proven properties: di outcome dey Pareto-efficient (no rearrangement fit help somebody without hurting anoda person) and di mechanism dey strategy-proof (to declare your true preferences na always di best).",
    ],
    example: {
      intro: "Four people, four assignments, order wey dem draw: Chloé, Ali, Bruno, Dana.",
      head: ["Person", "1st choice", "2nd choice", "E collect"],
      rows: [
        ["Chloé", "Audit", "Redesign", "Audit"],
        ["Ali", "Audit", "Support", "Support"],
        ["Bruno", "Redesign", "Audit", "Redesign"],
        ["Dana", "Support", "Training", "Training"],
      ],
      steps: [
        "Chloé go first and take Audit, im first choice.",
        "Ali want Audit: e no dey again, so e take Support, im second choice.",
        "Bruno collect Redesign, im first choice; Training remain for Dana.",
      ],
      result:
        "Three out of four people collect dia first choice. Di quality of di result depend completely on di draw: na why dem must announce di order and make e verifiable before di assignment.",
    },
    useCases: [
      "To share assignments, slots, desks or equipment inside team.",
      "Sports drafts and player selection.",
      "To share rooms for hostel or shared flat.",
      "To pick internship or project topics among students.",
    ],
    limits: [
      {
        t: "Rank no dey equal",
        d: "Di first person almost always collect dia wish, di last one almost never. If di thing dey repeat, di order must rotate.",
      },
      {
        t: "Envy fit dey",
        d: "Di last person wey dem serve fit envy di first one with reason. Efficiency no dey guarantee say nobody go vex.",
      },
      {
        t: "E no dey see intensity",
        d: "Wish wey be life-and-death and wish wey be lukewarm dey weigh di same. If urgency matter, maximum satisfaction fit better.",
      },
    ],
    faq: [
      {
        q: "Make we draw di order?",
        a: "Na di default wey easy pass to defend, because e no need any explanation. Any other order — seniority, need, merit — na judgement call wey you must own publicly before di assignment, never after.",
      },
      {
        q: "I get anything to gain if I lie about my wishes?",
        a: "No, never, and dem don prove am. When your turn reach, you go take di best option wey remain: to declare anything else fit only harm you. Na wetin dem dey call strategy-proof mechanism.",
      },
      {
        q: "Serial dictatorship or maximum satisfaction?",
        a: "Serial dictatorship dey transparent and nobody fit challenge am, but e dey depend on di draw. Maximum satisfaction dey optimise di group total, but nobody fit redo di calculation for head. Choose based on wetin di group must accept: clarity or di optimum.",
      },
    ],
  },

  optimal_sum: {
    summary:
      "Instead of serving people one after di other, dis one dey find di assignment wey make di sum of di ranks small pass. Di best collective result, calculated one time.",
    history: [
      "Na di « assignment problem », classic work for operations research. Harold Kuhn publish efficient solution for 1955 and call am « Hungarian algorithm », to honour di Hungarian mathematicians Dénes Kőnig and Jenő Egerváry wey im work follow.",
      "Later dem come find say Carl Gustav Jacobi don solve di problem for di 19th century, for work wey dem publish after im death for 1890 — sixty-five years before dem rediscover am.",
      "Today di algorithm na normal industrial tool: to assign crews to flights, tasks to machines, vehicles to trips. Every application wey dey pair two sets while optimising total cost na im pikin.",
    ],
    mechanics: [
      "Each person rank di options. Wish of rank 1 cost 1, rank 2 cost 2, and so on: na so dem build di cost matrix.",
      "Dem dey find di assignment wey make di TOTAL cost small pass, exploring all di possible combinations with sense — never one by one, wey no go possible.",
      "Important thing: di calculation fit sacrifice one person to help several. Di optimum na collective, and na exactly wetin dem ask am to do.",
    ],
    example: {
      intro: "Three people, three assignments. Di boxes show di rank of di wish.",
      head: ["", "Audit", "Redesign", "Support"],
      rows: [
        ["Chloé", "1", "2", "3"],
        ["Ali", "1", "3", "2"],
        ["Bruno", "2", "1", "3"],
      ],
      steps: [
        "To give everybody dia first wish no possible: Chloé and Ali both want Audit.",
        "Chloé→Audit, Bruno→Redesign, Ali→Support: total cost 1 + 1 + 2 = 4.",
        "Ali→Audit, Bruno→Redesign, Chloé→Support: total cost 1 + 1 + 3 = 5.",
      ],
      result:
        "Dem take di first combination: for similar wishes, e cost di group less. No other arrangement fit beat 4.",
    },
    useCases: [
      "To share assignments or files across team while maximising overall satisfaction.",
      "To assign pupils to workshops, options or projects.",
      "To assign on-call or duty slots.",
      "To plan crews, routes or machines — di historic industrial use.",
    ],
    limits: [
      {
        t: "People fit manipulate am",
        d: "Unlike serial dictatorship, to lie fit pay: if you rank one popular option low, dem fit give you better one. Di method no dey strategy-proof.",
      },
      {
        t: "Collective optimum, no be individual",
        d: "Person fit collect dia last wish so dat di total go drop. Mathematically correct, but hard to announce to human being.",
      },
      {
        t: "Hard to verify",
        d: "Nobody fit redo di calculation for head. Trust dey rest on di tool, wey dey weaken how people see di legitimacy.",
      },
      {
        t: "Ranks treated like distance",
        d: "Di gap between 1st and 2nd wish dey count like di gap between 4th and 5th, even though people no dey feel dem di same way at all.",
      },
    ],
    faq: [
      {
        q: "How e take better pass serial dictatorship?",
        a: "On average, di group dey more satisfied: di algorithm dey see all di combinations one time, while serial dictatorship dey suffer di running order. Di price na readability — and di chance for people to lie.",
      },
      {
        q: "Wetin happen if two assignments tie?",
        a: "Several solutions fit reach di same minimum cost; dem go pick one. If di matter heavy, announce di tie-break rule before, or switch to serial dictatorship, wey mechanics dey reproducible.",
      },
      {
        q: "I need as many places as people?",
        a: "No, but di gap get price: if places no reach, somebody no go get assignment; if dem plenty pass, some go remain empty. Di calculation still valid both ways.",
      },
    ],
  },

  top_trading_cycles: {
    summary:
      "Everybody already get something and dem want better. Di algorithm dey find di trading loops where everybody improve, and e dey run dem. Nobody fit end up worse.",
    history: [
      "Lloyd Shapley and Herbert Scarf publish di founding paper on di « housing market » for di Journal of Mathematical Economics for 1974. Dem credit di top trading cycles algorithm to David Gale and prove say e dey always produce allocation inside di core of di market.",
      "Atila Abdulkadiroğlu and Tayfun Sönmez extend am for 1999 to mixed situations, where some occupants already dey inside and others dey come — di real case of American student housing.",
      "Im biggest application na medical: kidney exchange programmes between donor-recipient pairs wey no match, wey Roth, Sönmez and Ünver formalise for early 2000s, dey stand on dis cycle mechanism. Alvin Roth and Lloyd Shapley collect di 2012 Nobel for Economics for all dis work.",
    ],
    mechanics: [
      "Everybody start with endowment: dia current assignment, desk or slot. So di number of people and goods must be equal.",
      "Everybody point di good wey dem prefer. If you follow di arrows, dem must form at least one cycle — sometimes self-loop, when person already get wetin dem prefer.",
      "Dem run di cycles: everybody collect wetin dem point. Di people wey dem serve comot with dia good, then dem start again with di rest, until nobody remain.",
      "Three proven properties: di outcome dey Pareto-efficient, individually rational (nobody comot with something worse than dia endowment), and di mechanism dey strategy-proof.",
    ],
    example: {
      intro: "Three people, each holding one slot, each wanting anoda one.",
      head: ["Person", "Current slot", "Slot wey dem want", "E collect"],
      rows: [
        ["Chloé", "Monday", "Tuesday", "Tuesday"],
        ["Ali", "Tuesday", "Monday", "Monday"],
        ["Bruno", "Wednesday", "Wednesday", "Wednesday"],
      ],
      steps: [
        "Chloé point Ali slot, Ali point Chloé own: na cycle of length 2.",
        "Di cycle run: di two swap and comot satisfied.",
        "Bruno point im own slot: self-loop, so e keep am.",
      ],
      result:
        "Two swaps, nobody lose. Na di central guarantee of di method: you no fit ever comot worse than how you enter.",
    },
    useCases: [
      "To swap on-call slots, duty shifts or leave days.",
      "To reassign desks, equipment or parking space wey people already dey use.",
      "To rotate assignments or client portfolios inside team.",
      "Kidney exchange between pairs wey no match — di application wey win Nobel.",
    ],
    limits: [
      {
        t: "E need starting endowment",
        d: "Without starting point, di method no make sense. For first allocation, use serial dictatorship.",
      },
      { t: "Na swap only", d: "No good dey created or removed: dem dey redistribute wetin dey, nothing more." },
      { t: "Numbers must match exactly", d: "As many goods as people, if not, di cycle mechanism go break." },
    ],
    faq: [
      {
        q: "I fit end up worse than my current position?",
        a: "No, never, and dem don prove am: individual rationality na proven property of di algorithm. If no swap suit you, you keep your endowment — na di self-loop.",
      },
      {
        q: "Make I report wrong preference order?",
        a: "No. Di mechanism dey strategy-proof: to lie no fit improve your result, and e fit make you miss cycle wey suit you.",
      },
      {
        q: "Wetin happen if nobody want swap?",
        a: "Everybody point dia own good, every cycle na self-loop, and nothing move. Dat result valid: e dey talk say di current arrangement already optimal.",
      },
    ],
  },

  stable_roommates: {
    summary:
      "Participants dey rank each other and dem pair dem two by two, no side dey propose, no side dey dispose. No pair suppose prefer to leave dia partners for each other.",
    history: [
      "David Gale and Lloyd Shapley raise di problem for 1962, for di end of dia founding paper on stable marriage: wetin go happen if, instead of two separate groups, everybody dey inside di same set? Dem note say dia algorithm no work for am, and dem leave di question open.",
      "Dem also prove say stable matching fit simply NOT EXIST — na di main difference from stable marriage, where one dey always exist.",
      "Robert Irving publish di first polynomial-time algorithm for 1985: e dey determine whether stable solution dey and e dey build am if e dey, for two phases, and di second one dey remove « rotations » one by one.",
    ],
    mechanics: [
      "Everybody rank ALL di other participants. Na one group only, so no asymmetry between proposers and receivers.",
      "First phase: everybody propose to di highest-ranked person wey never reject dem; proposals wey improve things dey provisionally accepted, di worse ones dey rejected. Na so reduced table dey come out.",
      "Second phase: dem dey find and remove rotations — chains of cyclic preferences wey dey block stability — until everybody get exactly one partner, or di table empty, wey prove say no solution dey.",
      "Di matching wey come out dey stable: no two people wey dem no pair together dey prefer each other pass dia current partner.",
    ],
    example: {
      intro: "Four people to pair, each one don rank di other three.",
      head: ["Person", "1st", "2nd", "3rd"],
      rows: [
        ["Chloé", "Ali", "Bruno", "Dana"],
        ["Ali", "Chloé", "Dana", "Bruno"],
        ["Bruno", "Dana", "Chloé", "Ali"],
        ["Dana", "Bruno", "Ali", "Chloé"],
      ],
      steps: [
        "Chloé and Ali put each other first: dat pair settle.",
        "Bruno and Dana do di same: second pair.",
        "No outside pair prefer each other: di matching dey stable.",
      ],
      result:
        "Here di preferences fit each other perfectly. Change only one ranking and di stable matching fit disappear completely — na di fragility wey dey special to dis problem.",
    },
    useCases: [
      "To form pairs for work, review or pair programming.",
      "To assign flatmates or roommates.",
      "To pair training or tournament partners.",
      "To organise peer mentoring, with no hierarchy between di two roles.",
    ],
    limits: [
      {
        t: "E fit no get solution",
        d: "Unlike stable marriage, stability no dey guaranteed. Na proven result, no be weakness of di implementation.",
      },
      { t: "Number must be even", d: "With odd number, somebody go remain alone by design." },
      {
        t: "Full ranking dey demand plenty",
        d: "Everybody must rank everybody else: di cost dey climb fast with group size, and to rank your colleagues no be small social matter.",
      },
    ],
    faq: [
      {
        q: "Wetin happen if no stable solution dey?",
        a: "Di tool go talk am plain. Na real information about di group: di preferences form cycle wey no fit break. Na you go adjust — pair by declared affinity, or accept instability wey you sabi.",
      },
      {
        q: "Wetin be di difference from two-sided Gale-Shapley?",
        a: "Gale-Shapley assume two separate sets wey dey rank each other (candidates and programmes) and e dey always guarantee solution. Here everybody dey inside di same set, so no side get advantage — but di guarantee say solution dey don comot.",
      },
      {
        q: "Wetin « stable » really mean?",
        a: "Say no two people wey dem no pair together go both prefer each other pass dia current partner. Such pair go comot from di arrangement: na exactly wetin stability dey prevent.",
      },
    ],
  },

  gale_shapley: {
    summary:
      "Two groups dey rank each other — candidates and programmes, mentees and mentors. Deferred acceptance dey always produce stable matching. Na di principle behind Parcoursup.",
    history: [
      "David Gale and Lloyd Shapley publish « College Admissions and the Stability of Marriage » for di American Mathematical Monthly for 1962. Dem prove say stable matching between two groups dey ALWAYS exist, and dem give simple algorithm to build am: deferred acceptance.",
      "Historical surprise: di National Resident Matching Program, wey don dey assign American medical residents to hospitals since 1952, don already dey use equivalent algorithm — dem find am by practice, ten years before anybody theorise am. Alvin Roth prove dis for 1984 and lead di 1998 redesign to handle couples.",
      "Roth and Shapley collect di 2012 Nobel for Economics for di theory of stable allocations and market design. For France, Parcoursup don apply dis principle since 2018, in place of APB, with automatic responder wey dey play di role of deferred acceptance.",
    ],
    mechanics: [
      "Two separate groups dey rank each other. Side 1 dey propose, side 2 dey dispose — and each entry for side 2 fit get capacity of several places.",
      "Each proposer apply to dia first choice. Each receiver dey provisionally hold di best candidates up to im capacity and dey turn di rest away. Nothing dey final: na di whole meaning of DEFERRED acceptance.",
      "Candidates wey dem turn away go apply to dia next choice, wey fit push out candidate wey dem dey hold provisionally, and dat person go apply again. E dey stop when nobody get proposal to make again.",
      "Di result dey stable: no candidate-programme pair go prefer each other pass dia assignment. E dey also OPTIMAL for di proposing side — among all stable matchings, each proposer collect di best one possible.",
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
        "Round 1: Chloé and Ali apply to A, Bruno to B. A prefer Ali and drop Chloé; B hold Bruno.",
        "Round 2: Chloé apply to B. B prefer Chloé pass Bruno and swap — dem push Bruno comot.",
        "Round 3: Bruno apply to A, wey keep Ali; then to C, wey accept am. End: Ali→A, Chloé→B, Bruno→C.",
      ],
      result:
        "Dem hold Bruno then push am comot: na di deferred mechanism, and na why Parcoursup results dey move for weeks. Di final outcome dey stable.",
    },
    useCases: [
      "Parcoursup and French post-secondary admissions.",
      "American medical residency match (NRMP) since 1952.",
      "School assignment for New York and Boston, wey Roth and colleagues redesign.",
      "Mentoring programmes, internships and project allocation between two separate populations.",
    ],
    limits: [
      {
        t: "Structural asymmetry",
        d: "Di proposing side collect di best stable matching wey dey; di other one collect di worst. So to decide who go propose na political decision, no be technical one.",
      },
      {
        t: "Strategy-proof for one side only",
        d: "To rank sincerely na di best for proposers — dem don prove am. Di receiving side fit sometimes gain if dem rank tactically.",
      },
      { t: "People wey no get assignment", d: "If places no reach, some people no go get anything. Di algorithm no dey create place." },
      {
        t: "Di waiting dey pain",
        d: "Provisional assignments dey move till di very end. Mathematically correct, socially hard — na wetin Parcoursup dey see every summer.",
      },
    ],
    faq: [
      {
        q: "Why my assignment dey change as we dey go?",
        a: "Because di acceptance dey deferred: dem hold place for you provisionally, and candidate wey rank better fit push you comot — same way you fit push anoda person comot for anoda place. Di process dey settle only for di end, and na dat dey guarantee stable result.",
      },
      {
        q: "Make I rank my wishes tactically?",
        a: "If you dey di proposing side — di candidates, for Parcoursup — no: to rank sincerely na provably di best. To put « realistic » wish before di one wey you really want fit only harm you.",
      },
      {
        q: "Wetin « stable » mean?",
        a: "Say no candidate-programme pair go both prefer each other pass wetin dem collect. Without dat property, side deals go start outside di system — exactly wetin dey happen for United States before 1952.",
      },
      {
        q: "Wetin be di difference from serial dictatorship?",
        a: "Serial dictatorship get only one side wey dey rank: di options no get opinion. Here di two sides dey rank, and di assignment must satisfy both — na why stability dey, wey no get meaning inside serial dictatorship.",
      },
    ],
  },
};

export default pcm;
