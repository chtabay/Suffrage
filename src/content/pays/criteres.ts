// LA BIBLIOTHÈQUE DE CRITÈRES — le vrai contenu du jeu.
//
// Un critère, c'est UNE question fermée posée à un pays, avec sa source. Le jeu
// n'est pas un quiz de géographie : il est l'INTERSECTION de cinq de ces
// questions. La qualité d'une journée vient d'ici, pas du moteur.
//
// ⚠️ CE FICHIER NE DOIT JAMAIS ATTEINDRE LE NAVIGATEUR AVANT LA VICTOIRE.
// Il n'est importé que par le calcul de score, qui vit côté serveur (voir
// `src/app/api/games/pays/`). Un `import` depuis un composant client suffirait à
// livrer la solution du jour dans le bundle — c'est le seul spoiler que
// l'architecture peut vraiment empêcher, alors elle l'empêche.
//
// TROIS RÈGLES qu'on a payées :
//
//  1. **Aucun jugement.** « Réputé pour sa gastronomie » n'est pas un critère,
//     c'est une opinion. Tout ce qui est ici se vérifie dans une liste publiée.
//
//  2. **Aucune donnée qui bouge sans date.** « Population actuelle » est un
//     piège : la journée du 3 mars doit rester explicable en octobre. Les seuils
//     portent donc leur année de référence dans le libellé lu par le joueur.
//
//  3. **Aucun critère qui désigne presque la solution.** Un critère satisfait par
//     trois pays n'est pas un critère, c'est une devinette déguisée : le puzzle
//     doit naître du croisement. Le garde-fou est mécanique — `CARDINAL_MIN`
//     et `CARDINAL_MAX` ci-dessous, vérifiés par le test.
import { PAYS, type Pays } from "./referentiel";

export type Palier = "large" | "intermediaire" | "discriminant" | "specifique" | "signature";

/** Un libellé dans les quatre langues de Placet. */
export interface Texte {
  fr: string;
  en: string;
  es: string;
  pcm: string;
}

export interface Source {
  nom: string;
  url: string;
  /** Année ou date de référence de la donnée, jamais « aujourd'hui ». */
  date: string;
}

export interface Critere {
  id: string;
  palier: Palier;
  /**
   * La FAMILLE existe pour une seule raison : interdire que deux critères du
   * même jour disent deux fois la même chose. « En Afrique » et « au sud du
   * Sahara » compteraient double sans elle, et le joueur sonderait un gradient
   * qui ment.
   */
  famille: string;
  libelle: Texte;
  /** Ce qu'on apprend — montré après la victoire, jamais avant. */
  eclairage?: Texte;
  source: Source;
  /** La règle machine. Déterministe, sans date du jour, sans aléa. */
  verifie: (p: Pays) => boolean;
  /**
   * Pour un critère À SEUIL : la valeur du seuil et la grandeur lue sur le pays.
   *
   * Sert à une seule chose, et elle vaut la peine : le validateur REFUSE une
   * journée dont la réponse — ou un pays à 4/5 qui ne rate que ce critère — se
   * tient à moins de 5 % du seuil. La population de 2018 n'est pas celle
   * d'aujourd'hui : un joueur qui vérifie sur son téléphone lirait 52 millions
   * là où le barème en compte 49,6, et aurait raison contre le jeu. On préfère
   * jeter la journée que gagner ce débat-là.
   */
  seuil?: { valeur: number; lecture: (p: Pays) => number };
}

/**
 * Bornes de cardinal d'un critère utilisable.
 *
 * Le plancher applique le §6.5 de la spec : sous six pays, un critère seul
 * désigne quasiment la réponse. Le plafond écarte l'inverse — un critère vrai
 * pour 130 pays n'apprend presque rien et aplatit le gradient.
 */
export const CARDINAL_MIN = 6;
export const CARDINAL_MAX = 120;

// ---------------------------------------------------------------------------
// Le lexique des critères paramétrés. Ces libellés-là sont fabriqués à partir
// d'un gabarit ; les autres sont écrits un par un plus bas.
// ---------------------------------------------------------------------------

const CONTINENTS: Record<string, Texte> = {
  afrique: { fr: "Afrique", en: "Africa", es: "África", pcm: "Africa" },
  "amerique-nord": {
    fr: "Amérique du Nord et centrale",
    en: "North and Central America",
    es: "América del Norte y Central",
    pcm: "North and Central America",
  },
  "amerique-sud": { fr: "Amérique du Sud", en: "South America", es: "América del Sur", pcm: "South America" },
  asie: { fr: "Asie", en: "Asia", es: "Asia", pcm: "Asia" },
  europe: { fr: "Europe", en: "Europe", es: "Europa", pcm: "Europe" },
  oceanie: { fr: "Océanie", en: "Oceania", es: "Oceanía", pcm: "Oceania" },
};

const LANGUES: Record<string, Texte> = {
  fra: { fr: "le français", en: "French", es: "el francés", pcm: "French" },
  spa: { fr: "l'espagnol", en: "Spanish", es: "el español", pcm: "Spanish" },
  eng: { fr: "l'anglais", en: "English", es: "el inglés", pcm: "English" },
  ara: { fr: "l'arabe", en: "Arabic", es: "el árabe", pcm: "Arabic" },
  por: { fr: "le portugais", en: "Portuguese", es: "el portugués", pcm: "Portuguese" },
};

/** Sources ONU / world-countries : le référentiel lui-même. */
const SRC_M49: Source = {
  nom: "ONU — découpage géographique standard (M49)",
  url: "https://unstats.un.org/unsd/methodology/m49/",
  date: "2023",
};
const SRC_ISO: Source = {
  nom: "ISO 3166-1 / base pays « mledoze/countries »",
  url: "https://github.com/mledoze/countries",
  date: "2024",
};
const SRC_BM_POP: Source = {
  nom: "Banque mondiale — population totale (SP.POP.TOTL)",
  url: "https://donnees.banquemondiale.org/indicator/SP.POP.TOTL",
  date: "2018",
};

// ---------------------------------------------------------------------------
// 1. CRITÈRES DÉRIVÉS DU RÉFÉRENTIEL
//
// Ceux-là ne peuvent pas être faux : ils lisent la même table que le moteur. On
// les écrit avec des gabarits parce qu'ils sont nombreux et réguliers — et
// parce qu'un gabarit garantit que les quatre langues disent la même chose.
// ---------------------------------------------------------------------------

const criteres: Critere[] = [];

const ajoute = (c: Critere) => {
  criteres.push(c);
  return c;
};

// --- continent -------------------------------------------------------------
for (const [cle, nom] of Object.entries(CONTINENTS)) {
  ajoute({
    id: `continent-${cle}`,
    palier: "large",
    famille: "continent",
    libelle: {
      fr: `Le pays est en ${nom.fr}`,
      en: `The country is in ${nom.en}`,
      es: `El país está en ${nom.es}`,
      pcm: `Di country dey for ${nom.pcm}`,
    },
    source: SRC_M49,
    verifie: (p) => p.continent === cle,
  });
}

// --- hémisphère et latitude ------------------------------------------------
ajoute({
  id: "hemisphere-sud",
  palier: "large",
  famille: "latitude",
  libelle: {
    fr: "Le pays est entièrement ou majoritairement dans l'hémisphère sud",
    en: "The country lies wholly or mostly in the southern hemisphere",
    es: "El país está entera o mayoritariamente en el hemisferio sur",
    pcm: "Di country dey for southern half of di world",
  },
  source: SRC_ISO,
  verifie: (p) => p.lat < 0,
});

ajoute({
  id: "tropiques",
  palier: "large",
  famille: "latitude",
  libelle: {
    fr: "Le pays est situé entre les deux tropiques",
    en: "The country lies between the two tropics",
    es: "El país se sitúa entre los dos trópicos",
    pcm: "Di country dey between di two tropics",
  },
  eclairage: {
    fr: "Les tropiques du Cancer et du Capricorne sont à 23,44° de part et d'autre de l'équateur : entre les deux, le Soleil passe au zénith au moins une fois par an.",
    en: "The tropics of Cancer and Capricorn sit 23.44° either side of the equator: between them, the Sun passes directly overhead at least once a year.",
    es: "Los trópicos de Cáncer y de Capricornio están a 23,44° a cada lado del ecuador: entre ambos, el Sol pasa por el cenit al menos una vez al año.",
    pcm: "Di tropics of Cancer and Capricorn dey 23.44° for each side of di equator: between dem, sun dey pass for your head straight at least once every year.",
  },
  source: SRC_ISO,
  verifie: (p) => Math.abs(p.lat) < 23.44,
});

ajoute({
  id: "latitude-haute-nord",
  palier: "intermediaire",
  famille: "latitude",
  libelle: {
    fr: "Le pays est au nord du 45e parallèle nord",
    en: "The country lies north of the 45th parallel north",
    es: "El país está al norte del paralelo 45 norte",
    pcm: "Di country dey north pass di 45th parallel north",
  },
  source: SRC_ISO,
  verifie: (p) => p.lat >= 45,
  seuil: { valeur: 45, lecture: (p) => p.lat },
});

// --- accès à la mer --------------------------------------------------------
ajoute({
  id: "enclave",
  palier: "large",
  famille: "mer",
  libelle: {
    fr: "Le pays n'a aucun accès à la mer",
    en: "The country has no access to the sea",
    es: "El país no tiene salida al mar",
    pcm: "Di country no get any road go sea",
  },
  source: SRC_ISO,
  verifie: (p) => p.enclave,
});

ajoute({
  id: "insulaire",
  palier: "intermediaire",
  famille: "frontieres",
  libelle: {
    fr: "Le pays n'a aucune frontière terrestre",
    en: "The country has no land border",
    es: "El país no tiene ninguna frontera terrestre",
    pcm: "Di country no get any land border",
  },
  source: SRC_ISO,
  verifie: (p) => p.frontieres.length === 0,
});

// --- population ------------------------------------------------------------
//
// ⚠️ LES SEUILS SONT CHOISIS LOIN DES PAYS, jamais sur eux. Un seuil posé à
// 10,1 millions pour isoler un pays précis serait exactement le « seuil
// artificiel » que la spec interdit (§5.4) — et il basculerait au premier
// recensement. `seuilsSurs()`, dans le test, vérifie qu'aucun pays ne se tient à
// moins de 4 % d'un seuil : la marge est la garantie que la journée survit à une
// correction de donnée.
const SEUILS_POP: [number, string, Texte][] = [
  [50_000_000, "pop-50m", { fr: "50 millions", en: "50 million", es: "50 millones", pcm: "50 million" }],
  [20_000_000, "pop-20m", { fr: "20 millions", en: "20 million", es: "20 millones", pcm: "20 million" }],
  [8_000_000, "pop-8m", { fr: "8 millions", en: "8 million", es: "8 millones", pcm: "8 million" }],
];
for (const [seuil, id, nb] of SEUILS_POP) {
  ajoute({
    id,
    palier: "intermediaire",
    famille: "population",
    libelle: {
      fr: `Le pays compte plus de ${nb.fr} d'habitants (2018)`,
      en: `The country has more than ${nb.en} people (2018)`,
      es: `El país tiene más de ${nb.es} de habitantes (2018)`,
      pcm: `Di country get pass ${nb.pcm} people (2018)`,
    },
    source: SRC_BM_POP,
    verifie: (p) => p.population > seuil,
    seuil: { valeur: seuil, lecture: (p) => p.population },
  });
}

ajoute({
  id: "pop-moins-2m",
  palier: "intermediaire",
  famille: "population",
  libelle: {
    fr: "Le pays compte moins de 2 millions d'habitants (2018)",
    en: "The country has fewer than 2 million people (2018)",
    es: "El país tiene menos de 2 millones de habitantes (2018)",
    pcm: "Di country get less than 2 million people (2018)",
  },
  source: SRC_BM_POP,
  verifie: (p) => p.population < 2_000_000,
  seuil: { valeur: 2_000_000, lecture: (p) => p.population },
});

ajoute({
  id: "densite-100",
  palier: "intermediaire",
  famille: "densite",
  libelle: {
    fr: "Le pays compte plus de 100 habitants au km² (2018)",
    en: "The country has more than 100 people per km² (2018)",
    es: "El país tiene más de 100 habitantes por km² (2018)",
    pcm: "Di country get pass 100 people for every km² (2018)",
  },
  source: SRC_BM_POP,
  verifie: (p) => p.population / p.superficie > 100,
  seuil: { valeur: 100, lecture: (p) => p.population / p.superficie },
});

// --- superficie ------------------------------------------------------------
const SEUILS_SUP: [number, string, string][] = [
  [1_000_000, "sup-1m", "1 000 000"],
  [400_000, "sup-400k", "400 000"],
];
for (const [seuil, id, nb] of SEUILS_SUP) {
  const nbEn = nb.replace(/ |\s/g, ",");
  ajoute({
    id,
    palier: "intermediaire",
    famille: "superficie",
    libelle: {
      fr: `Le pays fait plus de ${nb} km²`,
      en: `The country is larger than ${nbEn} km²`,
      es: `El país tiene más de ${nb} km²`,
      pcm: `Di country big pass ${nbEn} km²`,
    },
    source: SRC_ISO,
    verifie: (p) => p.superficie > seuil,
    seuil: { valeur: seuil, lecture: (p) => p.superficie },
  });
}

ajoute({
  id: "sup-moins-30k",
  palier: "intermediaire",
  famille: "superficie",
  libelle: {
    fr: "Le pays fait moins de 30 000 km²",
    en: "The country is smaller than 30,000 km²",
    es: "El país tiene menos de 30 000 km²",
    pcm: "Di country small pass 30,000 km²",
  },
  source: SRC_ISO,
  verifie: (p) => p.superficie < 30_000,
  seuil: { valeur: 30_000, lecture: (p) => p.superficie },
});

// --- frontières ------------------------------------------------------------
ajoute({
  id: "voisins-5",
  palier: "discriminant",
  famille: "frontieres",
  libelle: {
    fr: "Le pays a au moins cinq voisins terrestres",
    en: "The country has at least five land neighbours",
    es: "El país tiene al menos cinco vecinos terrestres",
    pcm: "Di country get at least five neighbour for land",
  },
  source: SRC_ISO,
  verifie: (p) => p.frontieres.length >= 5,
});

ajoute({
  id: "voisin-unique",
  palier: "discriminant",
  famille: "frontieres",
  libelle: {
    fr: "Le pays n'a qu'un seul voisin terrestre",
    en: "The country has exactly one land neighbour",
    es: "El país tiene un único vecino terrestre",
    pcm: "Di country get only one neighbour for land",
  },
  source: SRC_ISO,
  verifie: (p) => p.frontieres.length === 1,
});

/** « Voisin de X » : dérivé, donc juste par construction. */
const voisinDe = (id: string, nom: Texte, palier: Palier = "discriminant") =>
  ajoute({
    id: `voisin-${id.toLowerCase()}`,
    palier,
    famille: `voisinage-${id}`,
    libelle: {
      fr: `Le pays a une frontière terrestre avec ${nom.fr}`,
      en: `The country shares a land border with ${nom.en}`,
      es: `El país comparte frontera terrestre con ${nom.es}`,
      pcm: `Di country get land border with ${nom.pcm}`,
    },
    source: SRC_ISO,
    verifie: (p) => p.frontieres.includes(id),
  });

voisinDe("RUS", { fr: "la Russie", en: "Russia", es: "Rusia", pcm: "Russia" });
voisinDe("CHN", { fr: "la Chine", en: "China", es: "China", pcm: "China" });
voisinDe("BRA", { fr: "le Brésil", en: "Brazil", es: "Brasil", pcm: "Brazil" });
voisinDe("DEU", { fr: "l'Allemagne", en: "Germany", es: "Alemania", pcm: "Germany" });
voisinDe("IND", { fr: "l'Inde", en: "India", es: "la India", pcm: "India" });

// --- langue officielle -----------------------------------------------------
for (const [code, nom] of Object.entries(LANGUES)) {
  ajoute({
    id: `langue-${code}`,
    palier: "discriminant",
    famille: "langue",
    libelle: {
      fr: `${nom.fr.charAt(0).toUpperCase()}${nom.fr.slice(1)} est langue officielle`,
      en: `${nom.en} is an official language`,
      es: `${nom.es.charAt(0).toUpperCase()}${nom.es.slice(1)} es lengua oficial`,
      pcm: `${nom.pcm} na official language`,
    },
    source: SRC_ISO,
    verifie: (p) => p.langues.includes(code),
  });
}

ajoute({
  id: "langue-plusieurs",
  palier: "discriminant",
  famille: "langue",
  libelle: {
    fr: "Le pays a plusieurs langues officielles",
    en: "The country has several official languages",
    es: "El país tiene varias lenguas oficiales",
    pcm: "Di country get plenty official language",
  },
  source: SRC_ISO,
  verifie: (p) => p.langues.length > 1,
});

// --- monnaie ---------------------------------------------------------------
ajoute({
  id: "monnaie-euro",
  palier: "discriminant",
  famille: "monnaie",
  libelle: {
    fr: "L'euro est la monnaie officielle",
    en: "The euro is the official currency",
    es: "El euro es la moneda oficial",
    pcm: "Euro na di official money",
  },
  source: SRC_ISO,
  verifie: (p) => p.monnaies.includes("EUR"),
});

ajoute({
  id: "monnaie-usd",
  palier: "discriminant",
  famille: "monnaie",
  libelle: {
    fr: "Le dollar américain a cours officiel",
    en: "The US dollar is official legal tender",
    es: "El dólar estadounidense es de curso legal",
    pcm: "US dollar na official money wey dem dey use",
  },
  source: SRC_ISO,
  verifie: (p) => p.monnaies.includes("USD"),
});

ajoute({
  id: "monnaie-cfa",
  palier: "discriminant",
  famille: "monnaie",
  libelle: {
    fr: "Le franc CFA est la monnaie officielle",
    en: "The CFA franc is the official currency",
    es: "El franco CFA es la moneda oficial",
    pcm: "CFA franc na di official money",
  },
  eclairage: {
    fr: "Deux francs CFA coexistent — ouest-africain (XOF) et d'Afrique centrale (XAF) —, de même valeur mais non interchangeables.",
    en: "Two CFA francs coexist — West African (XOF) and Central African (XAF) — equal in value but not interchangeable.",
    es: "Coexisten dos francos CFA — el de África Occidental (XOF) y el de África Central (XAF) —, de igual valor pero no intercambiables.",
    pcm: "Two CFA franc dey — West Africa own (XOF) and Central Africa own (XAF) — dem worth di same but you no fit use one for di other side.",
  },
  source: SRC_ISO,
  verifie: (p) => p.monnaies.includes("XOF") || p.monnaies.includes("XAF"),
});

// ---------------------------------------------------------------------------
// 2. CRITÈRES DE LISTE
//
// Ceux-là ne se dérivent d'aucune donnée : ils sont RECOPIÉS d'une liste
// publiée, et c'est pour eux que le champ `source` existe vraiment. La liste est
// écrite en toutes lettres plutôt que calculée — on doit pouvoir la relire
// ligne à ligne contre la source le jour où quelqu'un conteste un score.
// ---------------------------------------------------------------------------

/** Fabrique un critère « appartient à cette liste ». */
const liste = (c: {
  id: string;
  palier: Palier;
  famille: string;
  libelle: Texte;
  eclairage?: Texte;
  source: Source;
  pays: string[];
}) => {
  const membres = new Set(c.pays);
  return ajoute({
    id: c.id,
    palier: c.palier,
    famille: c.famille,
    libelle: c.libelle,
    eclairage: c.eclairage,
    source: c.source,
    verifie: (p) => membres.has(p.id),
  });
};

liste({
  id: "union-europeenne",
  palier: "discriminant",
  famille: "organisation-ue",
  libelle: {
    fr: "Le pays est membre de l'Union européenne",
    en: "The country is a member of the European Union",
    es: "El país es miembro de la Unión Europea",
    pcm: "Di country na member of European Union",
  },
  source: { nom: "Union européenne — pays membres", url: "https://european-union.europa.eu/principles-countries-history/eu-countries_fr", date: "2024" },
  pays: "AUT BEL BGR HRV CYP CZE DNK EST FIN FRA DEU GRC HUN IRL ITA LVA LTU LUX MLT NLD POL PRT ROU SVK SVN ESP SWE".split(" "),
});

liste({
  id: "otan",
  palier: "discriminant",
  famille: "organisation-otan",
  libelle: {
    fr: "Le pays est membre de l'OTAN",
    en: "The country is a member of NATO",
    es: "El país es miembro de la OTAN",
    pcm: "Di country na member of NATO",
  },
  source: { nom: "OTAN — pays membres", url: "https://www.nato.int/cps/fr/natohq/nato_countries.htm", date: "2024" },
  pays: "ALB BEL BGR CAN HRV CZE DNK EST FIN FRA DEU GRC HUN ISL ITA LVA LTU LUX MNE NLD MKD NOR POL PRT ROU SVK SVN ESP SWE TUR GBR USA".split(" "),
});

liste({
  id: "commonwealth",
  palier: "discriminant",
  famille: "organisation-commonwealth",
  libelle: {
    fr: "Le pays est membre du Commonwealth",
    en: "The country is a member of the Commonwealth",
    es: "El país es miembro de la Commonwealth",
    pcm: "Di country na member of di Commonwealth",
  },
  source: { nom: "The Commonwealth — member countries", url: "https://thecommonwealth.org/our-member-countries", date: "2024" },
  pays: "ATG AUS BHS BGD BRB BLZ BWA BRN CMR CAN CYP DMA SWZ FJI GAB GMB GHA GRD GUY IND JAM KEN KIR LSO MWI MYS MDV MLT MUS MOZ NAM NRU NZL NGA PAK PNG RWA KNA LCA VCT WSM SYC SLE SGP SLB ZAF LKA TZA TGO TON TTO TUV UGA GBR VUT ZMB".split(" "),
});

liste({
  id: "royaume-commonwealth",
  palier: "signature",
  famille: "institution",
  libelle: {
    fr: "Le chef de l'État du pays est le roi du Royaume-Uni",
    en: "The country's head of state is the king of the United Kingdom",
    es: "El jefe de Estado del país es el rey del Reino Unido",
    pcm: "Na di king of United Kingdom be di head of state for di country",
  },
  eclairage: {
    fr: "Quinze États souverains partagent le même chef d'État sans dépendre les uns des autres : ce sont les royaumes du Commonwealth.",
    en: "Fifteen sovereign states share the same head of state without depending on one another: these are the Commonwealth realms.",
    es: "Quince Estados soberanos comparten el mismo jefe de Estado sin depender unos de otros: son los reinos de la Commonwealth.",
    pcm: "Fifteen sovereign country dey share di same head of state but nobody dey under anoda one: na dem be di Commonwealth realms.",
  },
  source: { nom: "The Royal Family — Commonwealth realms", url: "https://www.royal.uk/commonwealth", date: "2024" },
  pays: "ATG AUS BHS BLZ CAN GRD JAM NZL PNG KNA LCA VCT SLB TUV GBR".split(" "),
});

liste({
  id: "opep",
  palier: "specifique",
  famille: "energie",
  libelle: {
    fr: "Le pays est membre de l'OPEP",
    en: "The country is a member of OPEC",
    es: "El país es miembro de la OPEP",
    pcm: "Di country na member of OPEC",
  },
  source: { nom: "OPEP — member countries", url: "https://www.opec.org/opec_web/en/about_us/25.htm", date: "2024" },
  pays: "DZA COG GNQ GAB IRN IRQ KWT LBY NGA SAU ARE VEN".split(" "),
});

liste({
  id: "equateur",
  palier: "signature",
  famille: "geodesie",
  libelle: {
    fr: "L'équateur traverse le pays",
    en: "The equator crosses the country",
    es: "El ecuador atraviesa el país",
    pcm: "Di equator dey pass through di country",
  },
  eclairage: {
    fr: "Treize États sont traversés par la ligne d'équateur — dont un seul, l'Équateur, en a tiré son nom.",
    en: "Thirteen states are crossed by the equator — only one of them, Ecuador, took its name from it.",
    es: "Trece Estados son atravesados por el ecuador — solo uno, Ecuador, tomó de él su nombre.",
    pcm: "Thirteen country dey wey di equator dey cross — but na only one, Ecuador, take im name from am.",
  },
  source: { nom: "CIA — The World Factbook, geographic coordinates", url: "https://www.cia.gov/the-world-factbook/", date: "2024" },
  pays: "GAB COG COD UGA KEN SOM STP ECU COL BRA IDN MDV KIR".split(" "),
});

liste({
  id: "meridien-greenwich",
  palier: "signature",
  famille: "geodesie",
  libelle: {
    fr: "Le méridien de Greenwich traverse le pays",
    en: "The prime meridian crosses the country",
    es: "El meridiano de Greenwich atraviesa el país",
    pcm: "Di prime meridian dey pass through di country",
  },
  eclairage: {
    fr: "Le méridien d'origine coupe l'Europe puis l'Afrique de l'Ouest, du Royaume-Uni au golfe de Guinée : huit pays en tout.",
    en: "The prime meridian slices through Europe and then West Africa, from the United Kingdom to the Gulf of Guinea: eight countries in all.",
    es: "El meridiano de origen corta Europa y luego África occidental, del Reino Unido al golfo de Guinea: ocho países en total.",
    pcm: "Di prime meridian dey cut through Europe come reach West Africa, from United Kingdom go Gulf of Guinea: eight country altogether.",
  },
  source: { nom: "Royal Museums Greenwich — the prime meridian", url: "https://www.rmg.co.uk/stories/topics/prime-meridian-greenwich", date: "2024" },
  pays: "GBR FRA ESP DZA MLI BFA TGO GHA".split(" "),
});

liste({
  id: "tropique-cancer",
  palier: "specifique",
  famille: "geodesie",
  libelle: {
    fr: "Le tropique du Cancer traverse le pays",
    en: "The tropic of Cancer crosses the country",
    es: "El trópico de Cáncer atraviesa el país",
    pcm: "Di tropic of Cancer dey pass through di country",
  },
  source: { nom: "CIA — The World Factbook, geographic coordinates", url: "https://www.cia.gov/the-world-factbook/", date: "2024" },
  pays: "MEX BHS MRT MLI DZA NER LBY EGY SAU ARE OMN IND BGD MMR CHN".split(" "),
});

liste({
  id: "mediterranee",
  palier: "discriminant",
  famille: "mer-bordee",
  libelle: {
    fr: "Le pays a une côte sur la Méditerranée",
    en: "The country has a Mediterranean coastline",
    es: "El país tiene costa en el Mediterráneo",
    pcm: "Di country get coast for Mediterranean sea",
  },
  source: { nom: "PNUE/PAM — Convention de Barcelone, parties contractantes", url: "https://www.unep.org/unepmap/", date: "2024" },
  pays: "ESP FRA MCO ITA MLT SVN HRV BIH MNE ALB GRC TUR CYP SYR LBN ISR EGY LBY TUN DZA MAR".split(" "),
});

liste({
  id: "baltique-mer-noire",
  palier: "specifique",
  famille: "mer-bordee",
  libelle: {
    fr: "Le pays a une côte sur la mer Baltique ou la mer Noire",
    en: "The country has a coastline on the Baltic or the Black Sea",
    es: "El país tiene costa en el mar Báltico o en el mar Negro",
    pcm: "Di country get coast for Baltic Sea or Black Sea",
  },
  source: { nom: "HELCOM (Baltique) et Commission de la mer Noire", url: "https://helcom.fi/about-us/contracting-parties/", date: "2024" },
  pays: "DNK EST FIN DEU LVA LTU POL RUS SWE BGR GEO ROU TUR UKR".split(" "),
});

liste({
  id: "mer-rouge",
  palier: "specifique",
  famille: "mer-bordee",
  libelle: {
    fr: "Le pays a une côte sur la mer Rouge",
    en: "The country has a Red Sea coastline",
    es: "El país tiene costa en el mar Rojo",
    pcm: "Di country get coast for Red Sea",
  },
  source: { nom: "PERSGA — Regional Organization for the Conservation of the Red Sea", url: "https://persga.org/", date: "2024" },
  pays: "EGY SDN ERI DJI SAU YEM JOR ISR SOM".split(" "),
});

liste({
  id: "danube-nil-mekong",
  palier: "specifique",
  famille: "hydrographie",
  libelle: {
    fr: "Le Danube, le Nil ou le Mékong coule dans le pays",
    en: "The Danube, the Nile or the Mekong flows through the country",
    es: "El Danubio, el Nilo o el Mekong corre por el país",
    pcm: "Danube, Nile or Mekong river dey flow inside di country",
  },
  eclairage: {
    fr: "Trois fleuves, trois continents, et la même conséquence : un fleuve partagé oblige des États à se parler — commissions du Danube, initiative du bassin du Nil, commission du Mékong.",
    en: "Three rivers, three continents, one consequence: a shared river forces states to talk — the Danube commissions, the Nile Basin Initiative, the Mekong River Commission.",
    es: "Tres ríos, tres continentes y la misma consecuencia: un río compartido obliga a los Estados a hablarse — comisiones del Danubio, Iniciativa de la Cuenca del Nilo, Comisión del Mekong.",
    pcm: "Three river, three continent, but na di same result: river wey people dey share dey force country dem to talk — Danube commission, Nile Basin Initiative, Mekong River Commission.",
  },
  source: { nom: "Commission internationale du Danube (ICPDR), Nile Basin Initiative, Mekong River Commission", url: "https://www.icpdr.org/", date: "2024" },
  pays: "DEU AUT SVK HUN HRV SRB ROU BGR MDA UKR BDI RWA TZA UGA COD KEN ETH SSD SDN EGY ERI CHN MMR LAO THA KHM VNM".split(" "),
});

liste({
  id: "conduite-gauche",
  palier: "signature",
  famille: "transport",
  libelle: {
    fr: "On y roule à gauche",
    en: "Traffic drives on the left",
    es: "Se circula por la izquierda",
    pcm: "Motor dey drive for left side",
  },
  eclairage: {
    fr: "Environ un tiers de l'humanité roule à gauche, et la carte de cet usage est presque celle de l'Empire britannique — avec le Japon, la Thaïlande et l'Indonésie comme exceptions notables.",
    en: "About a third of humanity drives on the left, and the map of that habit is nearly the map of the British Empire — with Japan, Thailand and Indonesia as notable exceptions.",
    es: "Cerca de un tercio de la humanidad circula por la izquierda, y el mapa de esa costumbre es casi el del Imperio británico — con Japón, Tailandia e Indonesia como excepciones notables.",
    pcm: "Like one-third of people for world dey drive for left, and di map of dis habit resemble di map of British Empire — but Japan, Thailand and Indonesia na correct exception.",
  },
  source: { nom: "CIA — The World Factbook, « driving side »", url: "https://www.cia.gov/the-world-factbook/", date: "2024" },
  pays: (
    "GBR IRL MLT CYP IND PAK BGD LKA NPL BTN JPN THA IDN MYS SGP BRN TLS " +
    "AUS NZL PNG FJI WSM TON SLB NRU KIR TUV " +
    "ZAF NAM BWA ZWE ZMB MWI MOZ TZA KEN UGA LSO SWZ MUS SYC " +
    "JAM BHS BRB TTO GUY SUR ATG DMA GRD KNA LCA VCT MDV"
  ).split(" "),
});

liste({
  id: "jo-ete",
  palier: "specifique",
  famille: "sport",
  libelle: {
    fr: "Le pays a accueilli des Jeux olympiques d'été",
    en: "The country has hosted a summer Olympic Games",
    es: "El país ha acogido unos Juegos Olímpicos de verano",
    pcm: "Di country don host summer Olympic Games",
  },
  source: { nom: "Comité international olympique — Jeux olympiques d'été", url: "https://olympics.com/fr/olympic-games", date: "2024" },
  pays: "GRC FRA USA GBR SWE BEL NLD DEU FIN AUS ITA JPN MEX CAN RUS KOR ESP CHN BRA".split(" "),
});

liste({
  id: "mondial-organise",
  palier: "specifique",
  famille: "sport",
  libelle: {
    fr: "Le pays a organisé une Coupe du monde de football masculine",
    en: "The country has hosted a men's football World Cup",
    es: "El país ha organizado una Copa del Mundo masculina de fútbol",
    pcm: "Di country don host men football World Cup",
  },
  source: { nom: "FIFA — Coupe du monde, éditions", url: "https://www.fifa.com/fifaplus/fr/tournaments/mens/worldcup", date: "2024" },
  pays: "URY ITA FRA BRA CHE SWE CHL GBR MEX DEU ARG ESP USA JPN KOR ZAF RUS QAT".split(" "),
});

liste({
  id: "cafe",
  palier: "specifique",
  famille: "agriculture",
  libelle: {
    fr: "Le pays figure parmi les vingt premiers producteurs mondiaux de café",
    en: "The country is among the world's twenty largest coffee producers",
    es: "El país figura entre los veinte mayores productores mundiales de café",
    pcm: "Di country dey among di first twenty coffee producer for world",
  },
  eclairage: {
    fr: "Le caféier ne pousse en plein champ qu'entre les tropiques : la liste des producteurs est d'abord une bande de latitude.",
    en: "Coffee only grows in the open between the tropics: the producers' list is first of all a band of latitude.",
    es: "El cafeto solo crece al aire libre entre los trópicos: la lista de productores es ante todo una franja de latitud.",
    pcm: "Coffee tree only dey grow for open field between di tropics: so di producer list na latitude band before anything else.",
  },
  source: { nom: "FAO — FAOSTAT, production de café vert", url: "https://www.fao.org/faostat/fr/#data/QCL", date: "2022" },
  pays: "BRA VNM COL IDN ETH HND IND UGA PER MEX GTM NIC CHN CIV TZA KEN PNG CRI SLV LAO".split(" "),
});

liste({
  id: "independance-1990",
  palier: "specifique",
  famille: "histoire",
  libelle: {
    fr: "Le pays est devenu indépendant en 1990 ou après",
    en: "The country became independent in 1990 or later",
    es: "El país se independizó en 1990 o después",
    pcm: "Di country get independence for 1990 or after",
  },
  eclairage: {
    fr: "Presque tous ces États sont nés de trois éclatements : l'URSS, la Yougoslavie et la Tchécoslovaquie — plus quelques indépendances isolées, dont la dernière en date, le Soudan du Sud en 2011.",
    en: "Nearly all of these states came out of three break-ups: the USSR, Yugoslavia and Czechoslovakia — plus a few separate independences, the most recent being South Sudan in 2011.",
    es: "Casi todos estos Estados nacieron de tres desmembramientos: la URSS, Yugoslavia y Checoslovaquia — más algunas independencias aisladas, la última Sudán del Sur en 2011.",
    pcm: "Almost all dis country dem comot from three break-up: USSR, Yugoslavia and Czechoslovakia — plus small independence here and there, di last one na South Sudan for 2011.",
  },
  source: { nom: "ONU — États membres, dates d'admission", url: "https://www.un.org/fr/about-us/member-states", date: "2024" },
  pays: (
    "NAM EST LVA LTU RUS UKR BLR MDA GEO ARM AZE KAZ UZB TKM KGZ TJK " +
    "SVN HRV BIH MKD SRB MNE CZE SVK ERI PLW TLS SSD MHL FSM"
  ).split(" "),
});

liste({
  id: "gorilles",
  palier: "signature",
  famille: "biodiversite",
  libelle: {
    fr: "Des gorilles vivent à l'état sauvage dans le pays",
    en: "Wild gorillas live in the country",
    es: "Viven gorilas en libertad en el país",
    pcm: "Gorilla dey live for bush inside di country",
  },
  eclairage: {
    fr: "Toutes les populations sauvages de gorilles tiennent dans une dizaine de pays d'Afrique équatoriale, et l'UICN classe les quatre sous-espèces en danger ou en danger critique.",
    en: "Every wild gorilla population fits into about ten equatorial African countries, and the IUCN lists all four subspecies as endangered or critically endangered.",
    es: "Todas las poblaciones salvajes de gorilas caben en una decena de países del África ecuatorial, y la UICN clasifica las cuatro subespecies en peligro o en peligro crítico.",
    pcm: "All di wild gorilla wey remain dey inside like ten country for equatorial Africa, and IUCN talk say all four subspecies dey endangered or critically endangered.",
  },
  source: { nom: "UICN — Liste rouge, aires de répartition du genre Gorilla", url: "https://www.iucnredlist.org/species/9404/136250858", date: "2023" },
  pays: "CMR CAF COG COD GNQ GAB NGA AGO RWA UGA".split(" "),
});

liste({
  id: "sans-armee",
  palier: "signature",
  famille: "institution",
  libelle: {
    fr: "Le pays n'a pas d'armée permanente",
    en: "The country has no standing army",
    es: "El país no tiene ejército permanente",
    pcm: "Di country no get army wey dey stand permanent",
  },
  eclairage: {
    fr: "Le Costa Rica a aboli son armée en 1948 et inscrit l'interdiction dans sa Constitution ; les autres sont surtout de très petits États, dont la défense repose sur un traité ou sur un voisin.",
    en: "Costa Rica abolished its army in 1948 and wrote the ban into its constitution; the others are mostly very small states whose defence rests on a treaty or a neighbour.",
    es: "Costa Rica abolió su ejército en 1948 e inscribió la prohibición en su Constitución; los demás son sobre todo Estados muy pequeños cuya defensa descansa en un tratado o en un vecino.",
    pcm: "Costa Rica scatter im army for 1948 come put di ban inside im constitution; di others na mostly very small country wey dey rely on treaty or on neighbour for defence.",
  },
  source: { nom: "CIA — The World Factbook, « military and security forces »", url: "https://www.cia.gov/the-world-factbook/", date: "2024" },
  pays: "CRI PAN ISL AND LIE MCO SMR GRD DMA VCT KNA MHL FSM PLW NRU TUV WSM SLB HTI".split(" "),
});

liste({
  id: "g20",
  palier: "specifique",
  famille: "economie",
  libelle: {
    fr: "Le pays est membre du G20",
    en: "The country is a member of the G20",
    es: "El país es miembro del G20",
    pcm: "Di country na member of G20",
  },
  source: { nom: "G20 — membres", url: "https://www.g20.org/", date: "2024" },
  pays: "ARG AUS BRA CAN CHN FRA DEU IND IDN ITA JPN MEX RUS SAU ZAF KOR TUR GBR USA".split(" "),
});

liste({
  id: "unesco-25",
  palier: "specifique",
  famille: "patrimoine",
  libelle: {
    fr: "Le pays compte plus de vingt-cinq biens inscrits au patrimoine mondial",
    en: "The country has more than twenty-five World Heritage sites",
    es: "El país tiene más de veinticinco bienes inscritos en el Patrimonio Mundial",
    pcm: "Di country get pass twenty-five World Heritage site",
  },
  source: { nom: "UNESCO — Liste du patrimoine mondial, biens par État partie", url: "https://whc.unesco.org/fr/list/stat", date: "2023" },
  pays: "ITA CHN DEU FRA ESP IND MEX GBR RUS IRN JPN USA".split(" "),
});

liste({
  id: "archipel-etat",
  palier: "specifique",
  famille: "geographie",
  libelle: {
    fr: "Le pays est un archipel : son territoire est fait de plusieurs îles",
    en: "The country is an archipelago: its territory is made of several islands",
    es: "El país es un archipiélago: su territorio está formado por varias islas",
    pcm: "Di country na archipelago: im land na plenty island join together",
  },
  source: { nom: "CIA — The World Factbook, « geography »", url: "https://www.cia.gov/the-world-factbook/", date: "2024" },
  pays: (
    "IDN PHL JPN MDV FJI SLB VUT WSM TON KIR TUV NRU MHL FSM PLW " +
    "BHS ATG DMA GRD KNA LCA VCT TTO JAM CPV STP COM SYC MUS GBR NZL"
  ).split(" "),
});

liste({
  id: "opec-hors",
  palier: "signature",
  famille: "energie",
  libelle: {
    fr: "Le pays produit plus d'un million de barils de pétrole par jour",
    en: "The country produces more than a million barrels of oil a day",
    es: "El país produce más de un millón de barriles de petróleo al día",
    pcm: "Di country dey produce pass one million barrel of oil every day",
  },
  eclairage: {
    fr: "Une vingtaine d'États dépassent ce seuil, et la moitié n'est pas à l'OPEP : les États-Unis en produisent à eux seuls davantage que l'Arabie saoudite.",
    en: "About twenty states clear that mark, and half of them are not in OPEC: the United States alone produces more than Saudi Arabia.",
    es: "Una veintena de Estados supera ese umbral, y la mitad no está en la OPEP: Estados Unidos produce por sí solo más que Arabia Saudí.",
    pcm: "Like twenty country dey pass dat mark, and half of dem no dey OPEC: US alone dey produce pass Saudi Arabia.",
  },
  source: { nom: "US Energy Information Administration — production de pétrole brut", url: "https://www.eia.gov/international/data/world", date: "2023" },
  pays: "USA SAU RUS CAN IRQ CHN ARE IRN BRA KWT NGA MEX NOR KAZ QAT DZA COL OMN LBY".split(" "),
});

// ---------------------------------------------------------------------------

/** La bibliothèque, triée par identifiant pour que l'ordre ne dépende de rien. */
export const CRITERES: Critere[] = [...criteres].sort((a, b) => a.id.localeCompare(b.id));

export const CRITERE_PAR_ID: Record<string, Critere> = Object.fromEntries(CRITERES.map((c) => [c.id, c]));

/**
 * Le texte dans la langue de l'écran, repli français.
 *
 * Écrit ici plutôt qu'avec un `as Record<string, string>` à l'appel : la
 * conversion est refusée par TypeScript (`Texte` n'a pas d'index), et la forcer
 * par `unknown` reviendrait à éteindre exactement le contrôle qui garantit que
 * les quatre langues existent.
 */
export function enLangue(t: Texte, locale: string): string {
  return t[locale as keyof Texte] ?? t.fr;
}

/** Combien de pays satisfont un critère. Utilisé par les garde-fous. */
export function cardinal(c: Critere): number {
  return PAYS.filter((p) => c.verifie(p)).length;
}
