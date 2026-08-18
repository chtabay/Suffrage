// ⚠️ FICHIER GÉNÉRÉ — ne pas modifier à la main.
// Produit par `node scripts/pays-referentiel.mjs` (voir l'en-tête du script).
// Les 193 États membres de l'ONU et leurs propriétés stables.
// Version des données : 2026.08-un193

/** Une propriété non renseignée vaut `null` — jamais 0, qui serait une valeur. */
export interface Pays {
  /** ISO 3166-1 alpha-3. C'est LUI l'identifiant, jamais la géométrie. */
  id: string;
  iso2: string;
  num: number;
  nom: { fr: string; en: string; es: string; pcm: string };
  /** `afrique` | `amerique-nord` | `amerique-sud` | `asie` | `europe` | `oceanie` (ONU M49). */
  continent: string;
  /** Sous-région ONU M49 (« Western Africa », « Southern Asia »…). */
  sousRegion: string;
  /** km², superficie totale. */
  superficie: number;
  /** Banque mondiale (SP.POP.TOTL), année de référence 2018. */
  population: number;
  /** Sans accès à la mer. */
  enclave: boolean;
  /** Voisins terrestres, restreints au référentiel. */
  frontieres: string[];
  /** Langues officielles, ISO 639-3. */
  langues: string[];
  monnaies: string[];
  lat: number;
  lng: number;
}

export const DATA_VERSION = "2026.08-un193";

export const PAYS: Pays[] = [
 {
  "id": "AFG",
  "iso2": "AF",
  "num": 4,
  "nom": {
   "fr": "Afghanistan",
   "en": "Afghanistan",
   "es": "Afganistán",
   "pcm": "Afghanistan"
  },
  "continent": "asie",
  "sousRegion": "Southern Asia",
  "superficie": 652230,
  "population": 37172386,
  "enclave": true,
  "frontieres": [
   "IRN",
   "PAK",
   "TKM",
   "UZB",
   "TJK",
   "CHN"
  ],
  "langues": [
   "prs",
   "pus",
   "tuk"
  ],
  "monnaies": [
   "AFN"
  ],
  "lat": 33,
  "lng": 65
 },
 {
  "id": "AGO",
  "iso2": "AO",
  "num": 24,
  "nom": {
   "fr": "Angola",
   "en": "Angola",
   "es": "Angola",
   "pcm": "Angola"
  },
  "continent": "afrique",
  "sousRegion": "Middle Africa",
  "superficie": 1246700,
  "population": 30809762,
  "enclave": false,
  "frontieres": [
   "COG",
   "COD",
   "ZMB",
   "NAM"
  ],
  "langues": [
   "por"
  ],
  "monnaies": [
   "AOA"
  ],
  "lat": -12.5,
  "lng": 18.5
 },
 {
  "id": "ALB",
  "iso2": "AL",
  "num": 8,
  "nom": {
   "fr": "Albanie",
   "en": "Albania",
   "es": "Albania",
   "pcm": "Albania"
  },
  "continent": "europe",
  "sousRegion": "Southeast Europe",
  "superficie": 28748,
  "population": 2866376,
  "enclave": false,
  "frontieres": [
   "MNE",
   "GRC",
   "MKD"
  ],
  "langues": [
   "sqi"
  ],
  "monnaies": [
   "ALL"
  ],
  "lat": 41,
  "lng": 20
 },
 {
  "id": "AND",
  "iso2": "AD",
  "num": 20,
  "nom": {
   "fr": "Andorre",
   "en": "Andorra",
   "es": "Andorra",
   "pcm": "Andorra"
  },
  "continent": "europe",
  "sousRegion": "Southern Europe",
  "superficie": 468,
  "population": 77006,
  "enclave": true,
  "frontieres": [
   "FRA",
   "ESP"
  ],
  "langues": [
   "cat"
  ],
  "monnaies": [
   "EUR"
  ],
  "lat": 42.5,
  "lng": 1.5
 },
 {
  "id": "ARE",
  "iso2": "AE",
  "num": 784,
  "nom": {
   "fr": "Émirats arabes unis",
   "en": "United Arab Emirates",
   "es": "Emiratos Árabes Unidos",
   "pcm": "United Arab Emirates"
  },
  "continent": "asie",
  "sousRegion": "Western Asia",
  "superficie": 83600,
  "population": 9630959,
  "enclave": false,
  "frontieres": [
   "OMN",
   "SAU"
  ],
  "langues": [
   "ara"
  ],
  "monnaies": [
   "AED"
  ],
  "lat": 24,
  "lng": 54
 },
 {
  "id": "ARG",
  "iso2": "AR",
  "num": 32,
  "nom": {
   "fr": "Argentine",
   "en": "Argentina",
   "es": "Argentina",
   "pcm": "Argentina"
  },
  "continent": "amerique-sud",
  "sousRegion": "South America",
  "superficie": 2780400,
  "population": 44494502,
  "enclave": false,
  "frontieres": [
   "BOL",
   "BRA",
   "CHL",
   "PRY",
   "URY"
  ],
  "langues": [
   "grn",
   "spa"
  ],
  "monnaies": [
   "ARS"
  ],
  "lat": -34,
  "lng": -64
 },
 {
  "id": "ARM",
  "iso2": "AM",
  "num": 51,
  "nom": {
   "fr": "Arménie",
   "en": "Armenia",
   "es": "Armenia",
   "pcm": "Armenia"
  },
  "continent": "asie",
  "sousRegion": "Western Asia",
  "superficie": 29743,
  "population": 2951776,
  "enclave": true,
  "frontieres": [
   "AZE",
   "GEO",
   "IRN",
   "TUR"
  ],
  "langues": [
   "hye"
  ],
  "monnaies": [
   "AMD"
  ],
  "lat": 40,
  "lng": 45
 },
 {
  "id": "ATG",
  "iso2": "AG",
  "num": 28,
  "nom": {
   "fr": "Antigua-et-Barbuda",
   "en": "Antigua and Barbuda",
   "es": "Antigua y Barbuda",
   "pcm": "Antigua and Barbuda"
  },
  "continent": "amerique-nord",
  "sousRegion": "Caribbean",
  "superficie": 442,
  "population": 96286,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng"
  ],
  "monnaies": [
   "XCD"
  ],
  "lat": 17.05,
  "lng": -61.8
 },
 {
  "id": "AUS",
  "iso2": "AU",
  "num": 36,
  "nom": {
   "fr": "Australie",
   "en": "Australia",
   "es": "Australia",
   "pcm": "Australia"
  },
  "continent": "oceanie",
  "sousRegion": "Australia and New Zealand",
  "superficie": 7692024,
  "population": 24982688,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng"
  ],
  "monnaies": [
   "AUD"
  ],
  "lat": -27,
  "lng": 133
 },
 {
  "id": "AUT",
  "iso2": "AT",
  "num": 40,
  "nom": {
   "fr": "Autriche",
   "en": "Austria",
   "es": "Austria",
   "pcm": "Austria"
  },
  "continent": "europe",
  "sousRegion": "Central Europe",
  "superficie": 83871,
  "population": 8840521,
  "enclave": true,
  "frontieres": [
   "CZE",
   "DEU",
   "HUN",
   "ITA",
   "LIE",
   "SVK",
   "SVN",
   "CHE"
  ],
  "langues": [
   "bar"
  ],
  "monnaies": [
   "EUR"
  ],
  "lat": 47.33333333,
  "lng": 13.33333333
 },
 {
  "id": "AZE",
  "iso2": "AZ",
  "num": 31,
  "nom": {
   "fr": "Azerbaïdjan",
   "en": "Azerbaijan",
   "es": "Azerbaiyán",
   "pcm": "Azerbaijan"
  },
  "continent": "asie",
  "sousRegion": "Western Asia",
  "superficie": 86600,
  "population": 9939800,
  "enclave": true,
  "frontieres": [
   "ARM",
   "GEO",
   "IRN",
   "RUS",
   "TUR"
  ],
  "langues": [
   "aze",
   "rus"
  ],
  "monnaies": [
   "AZN"
  ],
  "lat": 40.5,
  "lng": 47.5
 },
 {
  "id": "BDI",
  "iso2": "BI",
  "num": 108,
  "nom": {
   "fr": "Burundi",
   "en": "Burundi",
   "es": "Burundi",
   "pcm": "Burundi"
  },
  "continent": "afrique",
  "sousRegion": "Eastern Africa",
  "superficie": 27834,
  "population": 11175378,
  "enclave": true,
  "frontieres": [
   "COD",
   "RWA",
   "TZA"
  ],
  "langues": [
   "fra",
   "run"
  ],
  "monnaies": [
   "BIF"
  ],
  "lat": -3.5,
  "lng": 30
 },
 {
  "id": "BEL",
  "iso2": "BE",
  "num": 56,
  "nom": {
   "fr": "Belgique",
   "en": "Belgium",
   "es": "Bélgica",
   "pcm": "Belgium"
  },
  "continent": "europe",
  "sousRegion": "Western Europe",
  "superficie": 30528,
  "population": 11433256,
  "enclave": false,
  "frontieres": [
   "FRA",
   "DEU",
   "LUX",
   "NLD"
  ],
  "langues": [
   "deu",
   "fra",
   "nld"
  ],
  "monnaies": [
   "EUR"
  ],
  "lat": 50.83333333,
  "lng": 4
 },
 {
  "id": "BEN",
  "iso2": "BJ",
  "num": 204,
  "nom": {
   "fr": "Bénin",
   "en": "Benin",
   "es": "Benín",
   "pcm": "Benin"
  },
  "continent": "afrique",
  "sousRegion": "Western Africa",
  "superficie": 112622,
  "population": 11485048,
  "enclave": false,
  "frontieres": [
   "BFA",
   "NER",
   "NGA",
   "TGO"
  ],
  "langues": [
   "fra"
  ],
  "monnaies": [
   "XOF"
  ],
  "lat": 9.5,
  "lng": 2.25
 },
 {
  "id": "BFA",
  "iso2": "BF",
  "num": 854,
  "nom": {
   "fr": "Burkina Faso",
   "en": "Burkina Faso",
   "es": "Burkina Faso",
   "pcm": "Burkina Faso"
  },
  "continent": "afrique",
  "sousRegion": "Western Africa",
  "superficie": 272967,
  "population": 19751535,
  "enclave": true,
  "frontieres": [
   "BEN",
   "CIV",
   "GHA",
   "MLI",
   "NER",
   "TGO"
  ],
  "langues": [
   "fra"
  ],
  "monnaies": [
   "XOF"
  ],
  "lat": 13,
  "lng": -2
 },
 {
  "id": "BGD",
  "iso2": "BD",
  "num": 50,
  "nom": {
   "fr": "Bangladesh",
   "en": "Bangladesh",
   "es": "Bangladesh",
   "pcm": "Bangladesh"
  },
  "continent": "asie",
  "sousRegion": "Southern Asia",
  "superficie": 147570,
  "population": 161356039,
  "enclave": false,
  "frontieres": [
   "MMR",
   "IND"
  ],
  "langues": [
   "ben"
  ],
  "monnaies": [
   "BDT"
  ],
  "lat": 24,
  "lng": 90
 },
 {
  "id": "BGR",
  "iso2": "BG",
  "num": 100,
  "nom": {
   "fr": "Bulgarie",
   "en": "Bulgaria",
   "es": "Bulgaria",
   "pcm": "Bulgaria"
  },
  "continent": "europe",
  "sousRegion": "Southeast Europe",
  "superficie": 110879,
  "population": 7025037,
  "enclave": false,
  "frontieres": [
   "GRC",
   "MKD",
   "ROU",
   "SRB",
   "TUR"
  ],
  "langues": [
   "bul"
  ],
  "monnaies": [
   "BGN"
  ],
  "lat": 43,
  "lng": 25
 },
 {
  "id": "BHR",
  "iso2": "BH",
  "num": 48,
  "nom": {
   "fr": "Bahreïn",
   "en": "Bahrain",
   "es": "Bahrein",
   "pcm": "Bahrain"
  },
  "continent": "asie",
  "sousRegion": "Western Asia",
  "superficie": 765,
  "population": 1569439,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "ara"
  ],
  "monnaies": [
   "BHD"
  ],
  "lat": 26,
  "lng": 50.55
 },
 {
  "id": "BHS",
  "iso2": "BS",
  "num": 44,
  "nom": {
   "fr": "Bahamas",
   "en": "Bahamas",
   "es": "Bahamas",
   "pcm": "Bahamas"
  },
  "continent": "amerique-nord",
  "sousRegion": "Caribbean",
  "superficie": 13943,
  "population": 385640,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng"
  ],
  "monnaies": [
   "BSD",
   "USD"
  ],
  "lat": 24.25,
  "lng": -76
 },
 {
  "id": "BIH",
  "iso2": "BA",
  "num": 70,
  "nom": {
   "fr": "Bosnie-Herzégovine",
   "en": "Bosnia and Herzegovina",
   "es": "Bosnia y Herzegovina",
   "pcm": "Bosnia and Herzegovina"
  },
  "continent": "europe",
  "sousRegion": "Southeast Europe",
  "superficie": 51209,
  "population": 3323929,
  "enclave": false,
  "frontieres": [
   "HRV",
   "MNE",
   "SRB"
  ],
  "langues": [
   "bos",
   "hrv",
   "srp"
  ],
  "monnaies": [
   "BAM"
  ],
  "lat": 44,
  "lng": 18
 },
 {
  "id": "BLR",
  "iso2": "BY",
  "num": 112,
  "nom": {
   "fr": "Biélorussie",
   "en": "Belarus",
   "es": "Bielorrusia",
   "pcm": "Belarus"
  },
  "continent": "europe",
  "sousRegion": "Eastern Europe",
  "superficie": 207600,
  "population": 9483499,
  "enclave": true,
  "frontieres": [
   "LVA",
   "LTU",
   "POL",
   "RUS",
   "UKR"
  ],
  "langues": [
   "bel",
   "rus"
  ],
  "monnaies": [
   "BYN"
  ],
  "lat": 53,
  "lng": 28
 },
 {
  "id": "BLZ",
  "iso2": "BZ",
  "num": 84,
  "nom": {
   "fr": "Belize",
   "en": "Belize",
   "es": "Belice",
   "pcm": "Belize"
  },
  "continent": "amerique-nord",
  "sousRegion": "Central America",
  "superficie": 22966,
  "population": 383071,
  "enclave": false,
  "frontieres": [
   "GTM",
   "MEX"
  ],
  "langues": [
   "bjz",
   "eng",
   "spa"
  ],
  "monnaies": [
   "BZD"
  ],
  "lat": 17.25,
  "lng": -88.75
 },
 {
  "id": "BOL",
  "iso2": "BO",
  "num": 68,
  "nom": {
   "fr": "Bolivie",
   "en": "Bolivia",
   "es": "Bolivia",
   "pcm": "Bolivia"
  },
  "continent": "amerique-sud",
  "sousRegion": "South America",
  "superficie": 1098581,
  "population": 11353142,
  "enclave": true,
  "frontieres": [
   "ARG",
   "BRA",
   "CHL",
   "PRY",
   "PER"
  ],
  "langues": [
   "aym",
   "grn",
   "que",
   "spa"
  ],
  "monnaies": [
   "BOB"
  ],
  "lat": -17,
  "lng": -65
 },
 {
  "id": "BRA",
  "iso2": "BR",
  "num": 76,
  "nom": {
   "fr": "Brésil",
   "en": "Brazil",
   "es": "Brasil",
   "pcm": "Brazil"
  },
  "continent": "amerique-sud",
  "sousRegion": "South America",
  "superficie": 8515767,
  "population": 209469333,
  "enclave": false,
  "frontieres": [
   "ARG",
   "BOL",
   "COL",
   "GUY",
   "PRY",
   "PER",
   "SUR",
   "URY",
   "VEN"
  ],
  "langues": [
   "por"
  ],
  "monnaies": [
   "BRL"
  ],
  "lat": -10,
  "lng": -55
 },
 {
  "id": "BRB",
  "iso2": "BB",
  "num": 52,
  "nom": {
   "fr": "Barbade",
   "en": "Barbados",
   "es": "Barbados",
   "pcm": "Barbados"
  },
  "continent": "amerique-nord",
  "sousRegion": "Caribbean",
  "superficie": 430,
  "population": 286641,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng"
  ],
  "monnaies": [
   "BBD"
  ],
  "lat": 13.16666666,
  "lng": -59.53333333
 },
 {
  "id": "BRN",
  "iso2": "BN",
  "num": 96,
  "nom": {
   "fr": "Brunei",
   "en": "Brunei",
   "es": "Brunei",
   "pcm": "Brunei"
  },
  "continent": "asie",
  "sousRegion": "South-Eastern Asia",
  "superficie": 5765,
  "population": 428962,
  "enclave": false,
  "frontieres": [
   "MYS"
  ],
  "langues": [
   "msa"
  ],
  "monnaies": [
   "BND",
   "SGD"
  ],
  "lat": 4.5,
  "lng": 114.66666666
 },
 {
  "id": "BTN",
  "iso2": "BT",
  "num": 64,
  "nom": {
   "fr": "Bhoutan",
   "en": "Bhutan",
   "es": "Bután",
   "pcm": "Bhutan"
  },
  "continent": "asie",
  "sousRegion": "Southern Asia",
  "superficie": 38394,
  "population": 754394,
  "enclave": true,
  "frontieres": [
   "CHN",
   "IND"
  ],
  "langues": [
   "dzo"
  ],
  "monnaies": [
   "BTN",
   "INR"
  ],
  "lat": 27.5,
  "lng": 90.5
 },
 {
  "id": "BWA",
  "iso2": "BW",
  "num": 72,
  "nom": {
   "fr": "Botswana",
   "en": "Botswana",
   "es": "Botswana",
   "pcm": "Botswana"
  },
  "continent": "afrique",
  "sousRegion": "Southern Africa",
  "superficie": 582000,
  "population": 2254126,
  "enclave": true,
  "frontieres": [
   "NAM",
   "ZAF",
   "ZMB",
   "ZWE"
  ],
  "langues": [
   "eng",
   "tsn"
  ],
  "monnaies": [
   "BWP"
  ],
  "lat": -22,
  "lng": 24
 },
 {
  "id": "CAF",
  "iso2": "CF",
  "num": 140,
  "nom": {
   "fr": "République centrafricaine",
   "en": "Central African Republic",
   "es": "República Centroafricana",
   "pcm": "Central African Republic"
  },
  "continent": "afrique",
  "sousRegion": "Middle Africa",
  "superficie": 622984,
  "population": 4666377,
  "enclave": true,
  "frontieres": [
   "CMR",
   "TCD",
   "COD",
   "COG",
   "SSD",
   "SDN"
  ],
  "langues": [
   "fra",
   "sag"
  ],
  "monnaies": [
   "XAF"
  ],
  "lat": 7,
  "lng": 21
 },
 {
  "id": "CAN",
  "iso2": "CA",
  "num": 124,
  "nom": {
   "fr": "Canada",
   "en": "Canada",
   "es": "Canadá",
   "pcm": "Canada"
  },
  "continent": "amerique-nord",
  "sousRegion": "North America",
  "superficie": 9984670,
  "population": 37057765,
  "enclave": false,
  "frontieres": [
   "USA"
  ],
  "langues": [
   "eng",
   "fra"
  ],
  "monnaies": [
   "CAD"
  ],
  "lat": 60,
  "lng": -95
 },
 {
  "id": "CHE",
  "iso2": "CH",
  "num": 756,
  "nom": {
   "fr": "Suisse",
   "en": "Switzerland",
   "es": "Suiza",
   "pcm": "Switzerland"
  },
  "continent": "europe",
  "sousRegion": "Western Europe",
  "superficie": 41284,
  "population": 8513227,
  "enclave": true,
  "frontieres": [
   "AUT",
   "FRA",
   "ITA",
   "LIE",
   "DEU"
  ],
  "langues": [
   "fra",
   "gsw",
   "ita",
   "roh"
  ],
  "monnaies": [
   "CHF"
  ],
  "lat": 47,
  "lng": 8
 },
 {
  "id": "CHL",
  "iso2": "CL",
  "num": 152,
  "nom": {
   "fr": "Chili",
   "en": "Chile",
   "es": "Chile",
   "pcm": "Chile"
  },
  "continent": "amerique-sud",
  "sousRegion": "South America",
  "superficie": 756102,
  "population": 18729160,
  "enclave": false,
  "frontieres": [
   "ARG",
   "BOL",
   "PER"
  ],
  "langues": [
   "spa"
  ],
  "monnaies": [
   "CLP"
  ],
  "lat": -30,
  "lng": -71
 },
 {
  "id": "CHN",
  "iso2": "CN",
  "num": 156,
  "nom": {
   "fr": "Chine",
   "en": "China",
   "es": "China",
   "pcm": "China"
  },
  "continent": "asie",
  "sousRegion": "Eastern Asia",
  "superficie": 9706961,
  "population": 1392730000,
  "enclave": false,
  "frontieres": [
   "AFG",
   "BTN",
   "MMR",
   "IND",
   "KAZ",
   "NPL",
   "PRK",
   "KGZ",
   "LAO",
   "MNG",
   "PAK",
   "RUS",
   "TJK",
   "VNM"
  ],
  "langues": [
   "zho"
  ],
  "monnaies": [
   "CNY"
  ],
  "lat": 35,
  "lng": 105
 },
 {
  "id": "CIV",
  "iso2": "CI",
  "num": 384,
  "nom": {
   "fr": "Côte d'Ivoire",
   "en": "Ivory Coast",
   "es": "Costa de Marfil",
   "pcm": "Ivory Coast"
  },
  "continent": "afrique",
  "sousRegion": "Western Africa",
  "superficie": 322463,
  "population": 25069229,
  "enclave": false,
  "frontieres": [
   "BFA",
   "GHA",
   "GIN",
   "LBR",
   "MLI"
  ],
  "langues": [
   "fra"
  ],
  "monnaies": [
   "XOF"
  ],
  "lat": 8,
  "lng": -5
 },
 {
  "id": "CMR",
  "iso2": "CM",
  "num": 120,
  "nom": {
   "fr": "Cameroun",
   "en": "Cameroon",
   "es": "Camerún",
   "pcm": "Cameroon"
  },
  "continent": "afrique",
  "sousRegion": "Middle Africa",
  "superficie": 475442,
  "population": 25216237,
  "enclave": false,
  "frontieres": [
   "CAF",
   "TCD",
   "COG",
   "GNQ",
   "GAB",
   "NGA"
  ],
  "langues": [
   "eng",
   "fra"
  ],
  "monnaies": [
   "XAF"
  ],
  "lat": 6,
  "lng": 12
 },
 {
  "id": "COD",
  "iso2": "CD",
  "num": 180,
  "nom": {
   "fr": "Congo (Rép. dém.)",
   "en": "DR Congo",
   "es": "Congo (Rep. Dem.)",
   "pcm": "DR Congo"
  },
  "continent": "afrique",
  "sousRegion": "Middle Africa",
  "superficie": 2344858,
  "population": 84068091,
  "enclave": false,
  "frontieres": [
   "AGO",
   "BDI",
   "CAF",
   "COG",
   "RWA",
   "SSD",
   "TZA",
   "UGA",
   "ZMB"
  ],
  "langues": [
   "fra",
   "kon",
   "lin",
   "lua",
   "swa"
  ],
  "monnaies": [
   "CDF"
  ],
  "lat": 0,
  "lng": 25
 },
 {
  "id": "COG",
  "iso2": "CG",
  "num": 178,
  "nom": {
   "fr": "Congo",
   "en": "Republic of the Congo",
   "es": "Congo",
   "pcm": "Republic of the Congo"
  },
  "continent": "afrique",
  "sousRegion": "Middle Africa",
  "superficie": 342000,
  "population": 5244363,
  "enclave": false,
  "frontieres": [
   "AGO",
   "CMR",
   "CAF",
   "COD",
   "GAB"
  ],
  "langues": [
   "fra",
   "kon",
   "lin"
  ],
  "monnaies": [
   "XAF"
  ],
  "lat": -1,
  "lng": 15
 },
 {
  "id": "COL",
  "iso2": "CO",
  "num": 170,
  "nom": {
   "fr": "Colombie",
   "en": "Colombia",
   "es": "Colombia",
   "pcm": "Colombia"
  },
  "continent": "amerique-sud",
  "sousRegion": "South America",
  "superficie": 1141748,
  "population": 49648685,
  "enclave": false,
  "frontieres": [
   "BRA",
   "ECU",
   "PAN",
   "PER",
   "VEN"
  ],
  "langues": [
   "spa"
  ],
  "monnaies": [
   "COP"
  ],
  "lat": 4,
  "lng": -72
 },
 {
  "id": "COM",
  "iso2": "KM",
  "num": 174,
  "nom": {
   "fr": "Comores",
   "en": "Comoros",
   "es": "Comoras",
   "pcm": "Comoros"
  },
  "continent": "afrique",
  "sousRegion": "Eastern Africa",
  "superficie": 1862,
  "population": 832322,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "ara",
   "fra",
   "zdj"
  ],
  "monnaies": [
   "KMF"
  ],
  "lat": -12.16666666,
  "lng": 44.25
 },
 {
  "id": "CPV",
  "iso2": "CV",
  "num": 132,
  "nom": {
   "fr": "Îles du Cap-Vert",
   "en": "Cape Verde",
   "es": "Cabo Verde",
   "pcm": "Cape Verde"
  },
  "continent": "afrique",
  "sousRegion": "Western Africa",
  "superficie": 4033,
  "population": 543767,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "por"
  ],
  "monnaies": [
   "CVE"
  ],
  "lat": 16,
  "lng": -24
 },
 {
  "id": "CRI",
  "iso2": "CR",
  "num": 188,
  "nom": {
   "fr": "Costa Rica",
   "en": "Costa Rica",
   "es": "Costa Rica",
   "pcm": "Costa Rica"
  },
  "continent": "amerique-nord",
  "sousRegion": "Central America",
  "superficie": 51100,
  "population": 4999441,
  "enclave": false,
  "frontieres": [
   "NIC",
   "PAN"
  ],
  "langues": [
   "spa"
  ],
  "monnaies": [
   "CRC"
  ],
  "lat": 10,
  "lng": -84
 },
 {
  "id": "CUB",
  "iso2": "CU",
  "num": 192,
  "nom": {
   "fr": "Cuba",
   "en": "Cuba",
   "es": "Cuba",
   "pcm": "Cuba"
  },
  "continent": "amerique-nord",
  "sousRegion": "Caribbean",
  "superficie": 109884,
  "population": 11338138,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "spa"
  ],
  "monnaies": [
   "CUC",
   "CUP"
  ],
  "lat": 21.5,
  "lng": -80
 },
 {
  "id": "CYP",
  "iso2": "CY",
  "num": 196,
  "nom": {
   "fr": "Chypre",
   "en": "Cyprus",
   "es": "Chipre",
   "pcm": "Cyprus"
  },
  "continent": "europe",
  "sousRegion": "Southern Europe",
  "superficie": 9251,
  "population": 1189265,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "ell",
   "tur"
  ],
  "monnaies": [
   "EUR"
  ],
  "lat": 35,
  "lng": 33
 },
 {
  "id": "CZE",
  "iso2": "CZ",
  "num": 203,
  "nom": {
   "fr": "Tchéquie",
   "en": "Czechia",
   "es": "Chequia",
   "pcm": "Czechia"
  },
  "continent": "europe",
  "sousRegion": "Central Europe",
  "superficie": 78865,
  "population": 10629928,
  "enclave": true,
  "frontieres": [
   "AUT",
   "DEU",
   "POL",
   "SVK"
  ],
  "langues": [
   "ces",
   "slk"
  ],
  "monnaies": [
   "CZK"
  ],
  "lat": 49.75,
  "lng": 15.5
 },
 {
  "id": "DEU",
  "iso2": "DE",
  "num": 276,
  "nom": {
   "fr": "Allemagne",
   "en": "Germany",
   "es": "Alemania",
   "pcm": "Germany"
  },
  "continent": "europe",
  "sousRegion": "Western Europe",
  "superficie": 357114,
  "population": 82905782,
  "enclave": false,
  "frontieres": [
   "AUT",
   "BEL",
   "CZE",
   "DNK",
   "FRA",
   "LUX",
   "NLD",
   "POL",
   "CHE"
  ],
  "langues": [
   "deu"
  ],
  "monnaies": [
   "EUR"
  ],
  "lat": 51,
  "lng": 9
 },
 {
  "id": "DJI",
  "iso2": "DJ",
  "num": 262,
  "nom": {
   "fr": "Djibouti",
   "en": "Djibouti",
   "es": "Djibouti",
   "pcm": "Djibouti"
  },
  "continent": "afrique",
  "sousRegion": "Eastern Africa",
  "superficie": 23200,
  "population": 958920,
  "enclave": false,
  "frontieres": [
   "ERI",
   "ETH",
   "SOM"
  ],
  "langues": [
   "ara",
   "fra"
  ],
  "monnaies": [
   "DJF"
  ],
  "lat": 11.5,
  "lng": 43
 },
 {
  "id": "DMA",
  "iso2": "DM",
  "num": 212,
  "nom": {
   "fr": "Dominique",
   "en": "Dominica",
   "es": "Dominica",
   "pcm": "Dominica"
  },
  "continent": "amerique-nord",
  "sousRegion": "Caribbean",
  "superficie": 751,
  "population": 71625,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng"
  ],
  "monnaies": [
   "XCD"
  ],
  "lat": 15.41666666,
  "lng": -61.33333333
 },
 {
  "id": "DNK",
  "iso2": "DK",
  "num": 208,
  "nom": {
   "fr": "Danemark",
   "en": "Denmark",
   "es": "Dinamarca",
   "pcm": "Denmark"
  },
  "continent": "europe",
  "sousRegion": "Northern Europe",
  "superficie": 43094,
  "population": 5793636,
  "enclave": false,
  "frontieres": [
   "DEU"
  ],
  "langues": [
   "dan"
  ],
  "monnaies": [
   "DKK"
  ],
  "lat": 56,
  "lng": 10
 },
 {
  "id": "DOM",
  "iso2": "DO",
  "num": 214,
  "nom": {
   "fr": "République dominicaine",
   "en": "Dominican Republic",
   "es": "República Dominicana",
   "pcm": "Dominican Republic"
  },
  "continent": "amerique-nord",
  "sousRegion": "Caribbean",
  "superficie": 48671,
  "population": 10627165,
  "enclave": false,
  "frontieres": [
   "HTI"
  ],
  "langues": [
   "spa"
  ],
  "monnaies": [
   "DOP"
  ],
  "lat": 19,
  "lng": -70.66666666
 },
 {
  "id": "DZA",
  "iso2": "DZ",
  "num": 12,
  "nom": {
   "fr": "Algérie",
   "en": "Algeria",
   "es": "Argelia",
   "pcm": "Algeria"
  },
  "continent": "afrique",
  "sousRegion": "Northern Africa",
  "superficie": 2381741,
  "population": 42228429,
  "enclave": false,
  "frontieres": [
   "TUN",
   "LBY",
   "NER",
   "MRT",
   "MLI",
   "MAR"
  ],
  "langues": [
   "ara"
  ],
  "monnaies": [
   "DZD"
  ],
  "lat": 28,
  "lng": 3
 },
 {
  "id": "ECU",
  "iso2": "EC",
  "num": 218,
  "nom": {
   "fr": "Équateur",
   "en": "Ecuador",
   "es": "Ecuador",
   "pcm": "Ecuador"
  },
  "continent": "amerique-sud",
  "sousRegion": "South America",
  "superficie": 276841,
  "population": 17084357,
  "enclave": false,
  "frontieres": [
   "COL",
   "PER"
  ],
  "langues": [
   "spa"
  ],
  "monnaies": [
   "USD"
  ],
  "lat": -2,
  "lng": -77.5
 },
 {
  "id": "EGY",
  "iso2": "EG",
  "num": 818,
  "nom": {
   "fr": "Égypte",
   "en": "Egypt",
   "es": "Egipto",
   "pcm": "Egypt"
  },
  "continent": "afrique",
  "sousRegion": "Northern Africa",
  "superficie": 1002450,
  "population": 98423595,
  "enclave": false,
  "frontieres": [
   "ISR",
   "LBY",
   "SDN"
  ],
  "langues": [
   "ara"
  ],
  "monnaies": [
   "EGP"
  ],
  "lat": 27,
  "lng": 30
 },
 {
  "id": "ERI",
  "iso2": "ER",
  "num": 232,
  "nom": {
   "fr": "Érythrée",
   "en": "Eritrea",
   "es": "Eritrea",
   "pcm": "Eritrea"
  },
  "continent": "afrique",
  "sousRegion": "Eastern Africa",
  "superficie": 117600,
  "population": 6213972,
  "enclave": false,
  "frontieres": [
   "DJI",
   "ETH",
   "SDN"
  ],
  "langues": [
   "ara",
   "eng",
   "tir"
  ],
  "monnaies": [
   "ERN"
  ],
  "lat": 15,
  "lng": 39
 },
 {
  "id": "ESP",
  "iso2": "ES",
  "num": 724,
  "nom": {
   "fr": "Espagne",
   "en": "Spain",
   "es": "España",
   "pcm": "Spain"
  },
  "continent": "europe",
  "sousRegion": "Southern Europe",
  "superficie": 505992,
  "population": 46796540,
  "enclave": false,
  "frontieres": [
   "AND",
   "FRA",
   "PRT",
   "MAR"
  ],
  "langues": [
   "spa"
  ],
  "monnaies": [
   "EUR"
  ],
  "lat": 40,
  "lng": -4
 },
 {
  "id": "EST",
  "iso2": "EE",
  "num": 233,
  "nom": {
   "fr": "Estonie",
   "en": "Estonia",
   "es": "Estonia",
   "pcm": "Estonia"
  },
  "continent": "europe",
  "sousRegion": "Northern Europe",
  "superficie": 45227,
  "population": 1321977,
  "enclave": false,
  "frontieres": [
   "LVA",
   "RUS"
  ],
  "langues": [
   "est"
  ],
  "monnaies": [
   "EUR"
  ],
  "lat": 59,
  "lng": 26
 },
 {
  "id": "ETH",
  "iso2": "ET",
  "num": 231,
  "nom": {
   "fr": "Éthiopie",
   "en": "Ethiopia",
   "es": "Etiopía",
   "pcm": "Ethiopia"
  },
  "continent": "afrique",
  "sousRegion": "Eastern Africa",
  "superficie": 1104300,
  "population": 109224559,
  "enclave": true,
  "frontieres": [
   "DJI",
   "ERI",
   "KEN",
   "SOM",
   "SSD",
   "SDN"
  ],
  "langues": [
   "amh"
  ],
  "monnaies": [
   "ETB"
  ],
  "lat": 8,
  "lng": 38
 },
 {
  "id": "FIN",
  "iso2": "FI",
  "num": 246,
  "nom": {
   "fr": "Finlande",
   "en": "Finland",
   "es": "Finlandia",
   "pcm": "Finland"
  },
  "continent": "europe",
  "sousRegion": "Northern Europe",
  "superficie": 338424,
  "population": 5515525,
  "enclave": false,
  "frontieres": [
   "NOR",
   "SWE",
   "RUS"
  ],
  "langues": [
   "fin",
   "swe"
  ],
  "monnaies": [
   "EUR"
  ],
  "lat": 64,
  "lng": 26
 },
 {
  "id": "FJI",
  "iso2": "FJ",
  "num": 242,
  "nom": {
   "fr": "Fidji",
   "en": "Fiji",
   "es": "Fiyi",
   "pcm": "Fiji"
  },
  "continent": "oceanie",
  "sousRegion": "Melanesia",
  "superficie": 18272,
  "population": 883483,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng",
   "fij",
   "hif"
  ],
  "monnaies": [
   "FJD"
  ],
  "lat": -18,
  "lng": 175
 },
 {
  "id": "FRA",
  "iso2": "FR",
  "num": 250,
  "nom": {
   "fr": "France",
   "en": "France",
   "es": "Francia",
   "pcm": "France"
  },
  "continent": "europe",
  "sousRegion": "Western Europe",
  "superficie": 551695,
  "population": 66977107,
  "enclave": false,
  "frontieres": [
   "AND",
   "BEL",
   "DEU",
   "ITA",
   "LUX",
   "MCO",
   "ESP",
   "CHE"
  ],
  "langues": [
   "fra"
  ],
  "monnaies": [
   "EUR"
  ],
  "lat": 46,
  "lng": 2
 },
 {
  "id": "FSM",
  "iso2": "FM",
  "num": 583,
  "nom": {
   "fr": "Micronésie",
   "en": "Micronesia",
   "es": "Micronesia",
   "pcm": "Micronesia"
  },
  "continent": "oceanie",
  "sousRegion": "Micronesia",
  "superficie": 702,
  "population": 112640,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng"
  ],
  "monnaies": [],
  "lat": 6.91666666,
  "lng": 158.25
 },
 {
  "id": "GAB",
  "iso2": "GA",
  "num": 266,
  "nom": {
   "fr": "Gabon",
   "en": "Gabon",
   "es": "Gabón",
   "pcm": "Gabon"
  },
  "continent": "afrique",
  "sousRegion": "Middle Africa",
  "superficie": 267668,
  "population": 2119275,
  "enclave": false,
  "frontieres": [
   "CMR",
   "COG",
   "GNQ"
  ],
  "langues": [
   "fra"
  ],
  "monnaies": [
   "XAF"
  ],
  "lat": -1,
  "lng": 11.75
 },
 {
  "id": "GBR",
  "iso2": "GB",
  "num": 826,
  "nom": {
   "fr": "Royaume-Uni",
   "en": "United Kingdom",
   "es": "Reino Unido",
   "pcm": "United Kingdom"
  },
  "continent": "europe",
  "sousRegion": "Northern Europe",
  "superficie": 242900,
  "population": 66460344,
  "enclave": false,
  "frontieres": [
   "IRL"
  ],
  "langues": [
   "eng"
  ],
  "monnaies": [
   "GBP"
  ],
  "lat": 54,
  "lng": -2
 },
 {
  "id": "GEO",
  "iso2": "GE",
  "num": 268,
  "nom": {
   "fr": "Géorgie",
   "en": "Georgia",
   "es": "Georgia",
   "pcm": "Georgia"
  },
  "continent": "asie",
  "sousRegion": "Western Asia",
  "superficie": 69700,
  "population": 3726549,
  "enclave": false,
  "frontieres": [
   "ARM",
   "AZE",
   "RUS",
   "TUR"
  ],
  "langues": [
   "kat"
  ],
  "monnaies": [
   "GEL"
  ],
  "lat": 42,
  "lng": 43.5
 },
 {
  "id": "GHA",
  "iso2": "GH",
  "num": 288,
  "nom": {
   "fr": "Ghana",
   "en": "Ghana",
   "es": "Ghana",
   "pcm": "Ghana"
  },
  "continent": "afrique",
  "sousRegion": "Western Africa",
  "superficie": 238533,
  "population": 29767108,
  "enclave": false,
  "frontieres": [
   "BFA",
   "CIV",
   "TGO"
  ],
  "langues": [
   "eng"
  ],
  "monnaies": [
   "GHS"
  ],
  "lat": 8,
  "lng": -2
 },
 {
  "id": "GIN",
  "iso2": "GN",
  "num": 324,
  "nom": {
   "fr": "Guinée",
   "en": "Guinea",
   "es": "Guinea",
   "pcm": "Guinea"
  },
  "continent": "afrique",
  "sousRegion": "Western Africa",
  "superficie": 245857,
  "population": 12414318,
  "enclave": false,
  "frontieres": [
   "CIV",
   "GNB",
   "LBR",
   "MLI",
   "SEN",
   "SLE"
  ],
  "langues": [
   "fra"
  ],
  "monnaies": [
   "GNF"
  ],
  "lat": 11,
  "lng": -10
 },
 {
  "id": "GMB",
  "iso2": "GM",
  "num": 270,
  "nom": {
   "fr": "Gambie",
   "en": "Gambia",
   "es": "Gambia",
   "pcm": "Gambia"
  },
  "continent": "afrique",
  "sousRegion": "Western Africa",
  "superficie": 10689,
  "population": 2280102,
  "enclave": false,
  "frontieres": [
   "SEN"
  ],
  "langues": [
   "eng"
  ],
  "monnaies": [
   "GMD"
  ],
  "lat": 13.46666666,
  "lng": -16.56666666
 },
 {
  "id": "GNB",
  "iso2": "GW",
  "num": 624,
  "nom": {
   "fr": "Guinée-Bissau",
   "en": "Guinea-Bissau",
   "es": "Guinea-Bisáu",
   "pcm": "Guinea-Bissau"
  },
  "continent": "afrique",
  "sousRegion": "Western Africa",
  "superficie": 36125,
  "population": 1874309,
  "enclave": false,
  "frontieres": [
   "GIN",
   "SEN"
  ],
  "langues": [
   "por",
   "pov"
  ],
  "monnaies": [
   "XOF"
  ],
  "lat": 12,
  "lng": -15
 },
 {
  "id": "GNQ",
  "iso2": "GQ",
  "num": 226,
  "nom": {
   "fr": "Guinée équatoriale",
   "en": "Equatorial Guinea",
   "es": "Guinea Ecuatorial",
   "pcm": "Equatorial Guinea"
  },
  "continent": "afrique",
  "sousRegion": "Middle Africa",
  "superficie": 28051,
  "population": 1308974,
  "enclave": false,
  "frontieres": [
   "CMR",
   "GAB"
  ],
  "langues": [
   "fra",
   "por",
   "spa"
  ],
  "monnaies": [
   "XAF"
  ],
  "lat": 2,
  "lng": 10
 },
 {
  "id": "GRC",
  "iso2": "GR",
  "num": 300,
  "nom": {
   "fr": "Grèce",
   "en": "Greece",
   "es": "Grecia",
   "pcm": "Greece"
  },
  "continent": "europe",
  "sousRegion": "Southern Europe",
  "superficie": 131990,
  "population": 10731726,
  "enclave": false,
  "frontieres": [
   "ALB",
   "BGR",
   "TUR",
   "MKD"
  ],
  "langues": [
   "ell"
  ],
  "monnaies": [
   "EUR"
  ],
  "lat": 39,
  "lng": 22
 },
 {
  "id": "GRD",
  "iso2": "GD",
  "num": 308,
  "nom": {
   "fr": "Grenade",
   "en": "Grenada",
   "es": "Grenada",
   "pcm": "Grenada"
  },
  "continent": "amerique-nord",
  "sousRegion": "Caribbean",
  "superficie": 344,
  "population": 111454,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng"
  ],
  "monnaies": [
   "XCD"
  ],
  "lat": 12.11666666,
  "lng": -61.66666666
 },
 {
  "id": "GTM",
  "iso2": "GT",
  "num": 320,
  "nom": {
   "fr": "Guatemala",
   "en": "Guatemala",
   "es": "Guatemala",
   "pcm": "Guatemala"
  },
  "continent": "amerique-nord",
  "sousRegion": "Central America",
  "superficie": 108889,
  "population": 17247807,
  "enclave": false,
  "frontieres": [
   "BLZ",
   "SLV",
   "HND",
   "MEX"
  ],
  "langues": [
   "spa"
  ],
  "monnaies": [
   "GTQ"
  ],
  "lat": 15.5,
  "lng": -90.25
 },
 {
  "id": "GUY",
  "iso2": "GY",
  "num": 328,
  "nom": {
   "fr": "Guyana",
   "en": "Guyana",
   "es": "Guyana",
   "pcm": "Guyana"
  },
  "continent": "amerique-sud",
  "sousRegion": "South America",
  "superficie": 214969,
  "population": 779004,
  "enclave": false,
  "frontieres": [
   "BRA",
   "SUR",
   "VEN"
  ],
  "langues": [
   "eng"
  ],
  "monnaies": [
   "GYD"
  ],
  "lat": 5,
  "lng": -59
 },
 {
  "id": "HND",
  "iso2": "HN",
  "num": 340,
  "nom": {
   "fr": "Honduras",
   "en": "Honduras",
   "es": "Honduras",
   "pcm": "Honduras"
  },
  "continent": "amerique-nord",
  "sousRegion": "Central America",
  "superficie": 112492,
  "population": 9587522,
  "enclave": false,
  "frontieres": [
   "GTM",
   "SLV",
   "NIC"
  ],
  "langues": [
   "spa"
  ],
  "monnaies": [
   "HNL"
  ],
  "lat": 15,
  "lng": -86.5
 },
 {
  "id": "HRV",
  "iso2": "HR",
  "num": 191,
  "nom": {
   "fr": "Croatie",
   "en": "Croatia",
   "es": "Croacia",
   "pcm": "Croatia"
  },
  "continent": "europe",
  "sousRegion": "Southeast Europe",
  "superficie": 56594,
  "population": 4087843,
  "enclave": false,
  "frontieres": [
   "BIH",
   "HUN",
   "MNE",
   "SRB",
   "SVN"
  ],
  "langues": [
   "hrv"
  ],
  "monnaies": [
   "EUR"
  ],
  "lat": 45.16666666,
  "lng": 15.5
 },
 {
  "id": "HTI",
  "iso2": "HT",
  "num": 332,
  "nom": {
   "fr": "Haïti",
   "en": "Haiti",
   "es": "Haití",
   "pcm": "Haiti"
  },
  "continent": "amerique-nord",
  "sousRegion": "Caribbean",
  "superficie": 27750,
  "population": 11123176,
  "enclave": false,
  "frontieres": [
   "DOM"
  ],
  "langues": [
   "fra",
   "hat"
  ],
  "monnaies": [
   "HTG"
  ],
  "lat": 19,
  "lng": -72.41666666
 },
 {
  "id": "HUN",
  "iso2": "HU",
  "num": 348,
  "nom": {
   "fr": "Hongrie",
   "en": "Hungary",
   "es": "Hungría",
   "pcm": "Hungary"
  },
  "continent": "europe",
  "sousRegion": "Central Europe",
  "superficie": 93028,
  "population": 9775564,
  "enclave": true,
  "frontieres": [
   "AUT",
   "HRV",
   "ROU",
   "SRB",
   "SVK",
   "SVN",
   "UKR"
  ],
  "langues": [
   "hun"
  ],
  "monnaies": [
   "HUF"
  ],
  "lat": 47,
  "lng": 20
 },
 {
  "id": "IDN",
  "iso2": "ID",
  "num": 360,
  "nom": {
   "fr": "Indonésie",
   "en": "Indonesia",
   "es": "Indonesia",
   "pcm": "Indonesia"
  },
  "continent": "asie",
  "sousRegion": "South-Eastern Asia",
  "superficie": 1904569,
  "population": 267663435,
  "enclave": false,
  "frontieres": [
   "TLS",
   "MYS",
   "PNG"
  ],
  "langues": [
   "ind"
  ],
  "monnaies": [
   "IDR"
  ],
  "lat": -5,
  "lng": 120
 },
 {
  "id": "IND",
  "iso2": "IN",
  "num": 356,
  "nom": {
   "fr": "Inde",
   "en": "India",
   "es": "India",
   "pcm": "India"
  },
  "continent": "asie",
  "sousRegion": "Southern Asia",
  "superficie": 3287590,
  "population": 1352617328,
  "enclave": false,
  "frontieres": [
   "BGD",
   "BTN",
   "MMR",
   "CHN",
   "NPL",
   "PAK"
  ],
  "langues": [
   "eng",
   "hin",
   "tam"
  ],
  "monnaies": [
   "INR"
  ],
  "lat": 20,
  "lng": 77
 },
 {
  "id": "IRL",
  "iso2": "IE",
  "num": 372,
  "nom": {
   "fr": "Irlande",
   "en": "Ireland",
   "es": "Irlanda",
   "pcm": "Ireland"
  },
  "continent": "europe",
  "sousRegion": "Northern Europe",
  "superficie": 70273,
  "population": 4867309,
  "enclave": false,
  "frontieres": [
   "GBR"
  ],
  "langues": [
   "eng",
   "gle"
  ],
  "monnaies": [
   "EUR"
  ],
  "lat": 53,
  "lng": -8
 },
 {
  "id": "IRN",
  "iso2": "IR",
  "num": 364,
  "nom": {
   "fr": "Iran",
   "en": "Iran",
   "es": "Iran",
   "pcm": "Iran"
  },
  "continent": "asie",
  "sousRegion": "Southern Asia",
  "superficie": 1648195,
  "population": 81800269,
  "enclave": false,
  "frontieres": [
   "AFG",
   "ARM",
   "AZE",
   "IRQ",
   "PAK",
   "TUR",
   "TKM"
  ],
  "langues": [
   "fas"
  ],
  "monnaies": [
   "IRR"
  ],
  "lat": 32,
  "lng": 53
 },
 {
  "id": "IRQ",
  "iso2": "IQ",
  "num": 368,
  "nom": {
   "fr": "Irak",
   "en": "Iraq",
   "es": "Irak",
   "pcm": "Iraq"
  },
  "continent": "asie",
  "sousRegion": "Western Asia",
  "superficie": 438317,
  "population": 38433600,
  "enclave": false,
  "frontieres": [
   "IRN",
   "JOR",
   "KWT",
   "SAU",
   "SYR",
   "TUR"
  ],
  "langues": [
   "ara",
   "arc",
   "ckb"
  ],
  "monnaies": [
   "IQD"
  ],
  "lat": 33,
  "lng": 44
 },
 {
  "id": "ISL",
  "iso2": "IS",
  "num": 352,
  "nom": {
   "fr": "Islande",
   "en": "Iceland",
   "es": "Islandia",
   "pcm": "Iceland"
  },
  "continent": "europe",
  "sousRegion": "Northern Europe",
  "superficie": 103000,
  "population": 352721,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "isl"
  ],
  "monnaies": [
   "ISK"
  ],
  "lat": 65,
  "lng": -18
 },
 {
  "id": "ISR",
  "iso2": "IL",
  "num": 376,
  "nom": {
   "fr": "Israël",
   "en": "Israel",
   "es": "Israel",
   "pcm": "Israel"
  },
  "continent": "asie",
  "sousRegion": "Western Asia",
  "superficie": 20770,
  "population": 8882800,
  "enclave": false,
  "frontieres": [
   "EGY",
   "JOR",
   "LBN",
   "SYR"
  ],
  "langues": [
   "ara",
   "heb"
  ],
  "monnaies": [
   "ILS"
  ],
  "lat": 31.47,
  "lng": 35.13
 },
 {
  "id": "ITA",
  "iso2": "IT",
  "num": 380,
  "nom": {
   "fr": "Italie",
   "en": "Italy",
   "es": "Italia",
   "pcm": "Italy"
  },
  "continent": "europe",
  "sousRegion": "Southern Europe",
  "superficie": 301336,
  "population": 60421760,
  "enclave": false,
  "frontieres": [
   "AUT",
   "FRA",
   "SMR",
   "SVN",
   "CHE"
  ],
  "langues": [
   "ita"
  ],
  "monnaies": [
   "EUR"
  ],
  "lat": 42.83333333,
  "lng": 12.83333333
 },
 {
  "id": "JAM",
  "iso2": "JM",
  "num": 388,
  "nom": {
   "fr": "Jamaïque",
   "en": "Jamaica",
   "es": "Jamaica",
   "pcm": "Jamaica"
  },
  "continent": "amerique-nord",
  "sousRegion": "Caribbean",
  "superficie": 10991,
  "population": 2934855,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng",
   "jam"
  ],
  "monnaies": [
   "JMD"
  ],
  "lat": 18.25,
  "lng": -77.5
 },
 {
  "id": "JOR",
  "iso2": "JO",
  "num": 400,
  "nom": {
   "fr": "Jordanie",
   "en": "Jordan",
   "es": "Jordania",
   "pcm": "Jordan"
  },
  "continent": "asie",
  "sousRegion": "Western Asia",
  "superficie": 89342,
  "population": 9956011,
  "enclave": false,
  "frontieres": [
   "IRQ",
   "ISR",
   "SAU",
   "SYR"
  ],
  "langues": [
   "ara"
  ],
  "monnaies": [
   "JOD"
  ],
  "lat": 31,
  "lng": 36
 },
 {
  "id": "JPN",
  "iso2": "JP",
  "num": 392,
  "nom": {
   "fr": "Japon",
   "en": "Japan",
   "es": "Japón",
   "pcm": "Japan"
  },
  "continent": "asie",
  "sousRegion": "Eastern Asia",
  "superficie": 377930,
  "population": 126529100,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "jpn"
  ],
  "monnaies": [
   "JPY"
  ],
  "lat": 36,
  "lng": 138
 },
 {
  "id": "KAZ",
  "iso2": "KZ",
  "num": 398,
  "nom": {
   "fr": "Kazakhstan",
   "en": "Kazakhstan",
   "es": "Kazajistán",
   "pcm": "Kazakhstan"
  },
  "continent": "asie",
  "sousRegion": "Central Asia",
  "superficie": 2724900,
  "population": 18272430,
  "enclave": true,
  "frontieres": [
   "CHN",
   "KGZ",
   "RUS",
   "TKM",
   "UZB"
  ],
  "langues": [
   "kaz",
   "rus"
  ],
  "monnaies": [
   "KZT"
  ],
  "lat": 48,
  "lng": 68
 },
 {
  "id": "KEN",
  "iso2": "KE",
  "num": 404,
  "nom": {
   "fr": "Kenya",
   "en": "Kenya",
   "es": "Kenia",
   "pcm": "Kenya"
  },
  "continent": "afrique",
  "sousRegion": "Eastern Africa",
  "superficie": 580367,
  "population": 51393010,
  "enclave": false,
  "frontieres": [
   "ETH",
   "SOM",
   "SSD",
   "TZA",
   "UGA"
  ],
  "langues": [
   "eng",
   "swa"
  ],
  "monnaies": [
   "KES"
  ],
  "lat": 1,
  "lng": 38
 },
 {
  "id": "KGZ",
  "iso2": "KG",
  "num": 417,
  "nom": {
   "fr": "Kirghizistan",
   "en": "Kyrgyzstan",
   "es": "Kirguizistán",
   "pcm": "Kyrgyzstan"
  },
  "continent": "asie",
  "sousRegion": "Central Asia",
  "superficie": 199951,
  "population": 6322800,
  "enclave": true,
  "frontieres": [
   "CHN",
   "KAZ",
   "TJK",
   "UZB"
  ],
  "langues": [
   "kir",
   "rus"
  ],
  "monnaies": [
   "KGS"
  ],
  "lat": 41,
  "lng": 75
 },
 {
  "id": "KHM",
  "iso2": "KH",
  "num": 116,
  "nom": {
   "fr": "Cambodge",
   "en": "Cambodia",
   "es": "Camboya",
   "pcm": "Cambodia"
  },
  "continent": "asie",
  "sousRegion": "South-Eastern Asia",
  "superficie": 181035,
  "population": 16249798,
  "enclave": false,
  "frontieres": [
   "LAO",
   "THA",
   "VNM"
  ],
  "langues": [
   "khm"
  ],
  "monnaies": [
   "KHR",
   "USD"
  ],
  "lat": 13,
  "lng": 105
 },
 {
  "id": "KIR",
  "iso2": "KI",
  "num": 296,
  "nom": {
   "fr": "Kiribati",
   "en": "Kiribati",
   "es": "Kiribati",
   "pcm": "Kiribati"
  },
  "continent": "oceanie",
  "sousRegion": "Micronesia",
  "superficie": 811,
  "population": 115847,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng",
   "gil"
  ],
  "monnaies": [
   "AUD",
   "KID"
  ],
  "lat": 1.41666666,
  "lng": 173
 },
 {
  "id": "KNA",
  "iso2": "KN",
  "num": 659,
  "nom": {
   "fr": "Saint-Christophe-et-Niévès",
   "en": "Saint Kitts and Nevis",
   "es": "San Cristóbal y Nieves",
   "pcm": "Saint Kitts and Nevis"
  },
  "continent": "amerique-nord",
  "sousRegion": "Caribbean",
  "superficie": 261,
  "population": 52441,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng"
  ],
  "monnaies": [
   "XCD"
  ],
  "lat": 17.33333333,
  "lng": -62.75
 },
 {
  "id": "KOR",
  "iso2": "KR",
  "num": 410,
  "nom": {
   "fr": "Corée du Sud",
   "en": "South Korea",
   "es": "Corea del Sur",
   "pcm": "South Korea"
  },
  "continent": "asie",
  "sousRegion": "Eastern Asia",
  "superficie": 100210,
  "population": 51606633,
  "enclave": false,
  "frontieres": [
   "PRK"
  ],
  "langues": [
   "kor"
  ],
  "monnaies": [
   "KRW"
  ],
  "lat": 37,
  "lng": 127.5
 },
 {
  "id": "KWT",
  "iso2": "KW",
  "num": 414,
  "nom": {
   "fr": "Koweït",
   "en": "Kuwait",
   "es": "Kuwait",
   "pcm": "Kuwait"
  },
  "continent": "asie",
  "sousRegion": "Western Asia",
  "superficie": 17818,
  "population": 4137309,
  "enclave": false,
  "frontieres": [
   "IRQ",
   "SAU"
  ],
  "langues": [
   "ara"
  ],
  "monnaies": [
   "KWD"
  ],
  "lat": 29.5,
  "lng": 45.75
 },
 {
  "id": "LAO",
  "iso2": "LA",
  "num": 418,
  "nom": {
   "fr": "Laos",
   "en": "Laos",
   "es": "Laos",
   "pcm": "Laos"
  },
  "continent": "asie",
  "sousRegion": "South-Eastern Asia",
  "superficie": 236800,
  "population": 7061507,
  "enclave": true,
  "frontieres": [
   "MMR",
   "KHM",
   "CHN",
   "THA",
   "VNM"
  ],
  "langues": [
   "lao"
  ],
  "monnaies": [
   "LAK"
  ],
  "lat": 18,
  "lng": 105
 },
 {
  "id": "LBN",
  "iso2": "LB",
  "num": 422,
  "nom": {
   "fr": "Liban",
   "en": "Lebanon",
   "es": "Líbano",
   "pcm": "Lebanon"
  },
  "continent": "asie",
  "sousRegion": "Western Asia",
  "superficie": 10452,
  "population": 6848925,
  "enclave": false,
  "frontieres": [
   "ISR",
   "SYR"
  ],
  "langues": [
   "ara",
   "fra"
  ],
  "monnaies": [
   "LBP"
  ],
  "lat": 33.83333333,
  "lng": 35.83333333
 },
 {
  "id": "LBR",
  "iso2": "LR",
  "num": 430,
  "nom": {
   "fr": "Liberia",
   "en": "Liberia",
   "es": "Liberia",
   "pcm": "Liberia"
  },
  "continent": "afrique",
  "sousRegion": "Western Africa",
  "superficie": 111369,
  "population": 4818977,
  "enclave": false,
  "frontieres": [
   "GIN",
   "CIV",
   "SLE"
  ],
  "langues": [
   "eng"
  ],
  "monnaies": [
   "LRD"
  ],
  "lat": 6.5,
  "lng": -9.5
 },
 {
  "id": "LBY",
  "iso2": "LY",
  "num": 434,
  "nom": {
   "fr": "Libye",
   "en": "Libya",
   "es": "Libia",
   "pcm": "Libya"
  },
  "continent": "afrique",
  "sousRegion": "Northern Africa",
  "superficie": 1759540,
  "population": 6678567,
  "enclave": false,
  "frontieres": [
   "DZA",
   "TCD",
   "EGY",
   "NER",
   "SDN",
   "TUN"
  ],
  "langues": [
   "ara"
  ],
  "monnaies": [
   "LYD"
  ],
  "lat": 25,
  "lng": 17
 },
 {
  "id": "LCA",
  "iso2": "LC",
  "num": 662,
  "nom": {
   "fr": "Sainte-Lucie",
   "en": "Saint Lucia",
   "es": "Santa Lucía",
   "pcm": "Saint Lucia"
  },
  "continent": "amerique-nord",
  "sousRegion": "Caribbean",
  "superficie": 616,
  "population": 181889,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng"
  ],
  "monnaies": [
   "XCD"
  ],
  "lat": 13.88333333,
  "lng": -60.96666666
 },
 {
  "id": "LIE",
  "iso2": "LI",
  "num": 438,
  "nom": {
   "fr": "Liechtenstein",
   "en": "Liechtenstein",
   "es": "Liechtenstein",
   "pcm": "Liechtenstein"
  },
  "continent": "europe",
  "sousRegion": "Western Europe",
  "superficie": 160,
  "population": 37910,
  "enclave": true,
  "frontieres": [
   "AUT",
   "CHE"
  ],
  "langues": [
   "deu"
  ],
  "monnaies": [
   "CHF"
  ],
  "lat": 47.26666666,
  "lng": 9.53333333
 },
 {
  "id": "LKA",
  "iso2": "LK",
  "num": 144,
  "nom": {
   "fr": "Sri Lanka",
   "en": "Sri Lanka",
   "es": "Sri Lanka",
   "pcm": "Sri Lanka"
  },
  "continent": "asie",
  "sousRegion": "Southern Asia",
  "superficie": 65610,
  "population": 21670000,
  "enclave": false,
  "frontieres": [
   "IND"
  ],
  "langues": [
   "sin",
   "tam"
  ],
  "monnaies": [
   "LKR"
  ],
  "lat": 7,
  "lng": 81
 },
 {
  "id": "LSO",
  "iso2": "LS",
  "num": 426,
  "nom": {
   "fr": "Lesotho",
   "en": "Lesotho",
   "es": "Lesotho",
   "pcm": "Lesotho"
  },
  "continent": "afrique",
  "sousRegion": "Southern Africa",
  "superficie": 30355,
  "population": 2108132,
  "enclave": true,
  "frontieres": [
   "ZAF"
  ],
  "langues": [
   "eng",
   "sot"
  ],
  "monnaies": [
   "LSL",
   "ZAR"
  ],
  "lat": -29.5,
  "lng": 28.5
 },
 {
  "id": "LTU",
  "iso2": "LT",
  "num": 440,
  "nom": {
   "fr": "Lituanie",
   "en": "Lithuania",
   "es": "Lituania",
   "pcm": "Lithuania"
  },
  "continent": "europe",
  "sousRegion": "Northern Europe",
  "superficie": 65300,
  "population": 2801543,
  "enclave": false,
  "frontieres": [
   "BLR",
   "LVA",
   "POL",
   "RUS"
  ],
  "langues": [
   "lit"
  ],
  "monnaies": [
   "EUR"
  ],
  "lat": 56,
  "lng": 24
 },
 {
  "id": "LUX",
  "iso2": "LU",
  "num": 442,
  "nom": {
   "fr": "Luxembourg",
   "en": "Luxembourg",
   "es": "Luxemburgo",
   "pcm": "Luxembourg"
  },
  "continent": "europe",
  "sousRegion": "Western Europe",
  "superficie": 2586,
  "population": 607950,
  "enclave": true,
  "frontieres": [
   "BEL",
   "FRA",
   "DEU"
  ],
  "langues": [
   "deu",
   "fra",
   "ltz"
  ],
  "monnaies": [
   "EUR"
  ],
  "lat": 49.75,
  "lng": 6.16666666
 },
 {
  "id": "LVA",
  "iso2": "LV",
  "num": 428,
  "nom": {
   "fr": "Lettonie",
   "en": "Latvia",
   "es": "Letonia",
   "pcm": "Latvia"
  },
  "continent": "europe",
  "sousRegion": "Northern Europe",
  "superficie": 64559,
  "population": 1927174,
  "enclave": false,
  "frontieres": [
   "BLR",
   "EST",
   "LTU",
   "RUS"
  ],
  "langues": [
   "lav"
  ],
  "monnaies": [
   "EUR"
  ],
  "lat": 57,
  "lng": 25
 },
 {
  "id": "MAR",
  "iso2": "MA",
  "num": 504,
  "nom": {
   "fr": "Maroc",
   "en": "Morocco",
   "es": "Marruecos",
   "pcm": "Morocco"
  },
  "continent": "afrique",
  "sousRegion": "Northern Africa",
  "superficie": 446550,
  "population": 36029138,
  "enclave": false,
  "frontieres": [
   "DZA",
   "ESP"
  ],
  "langues": [
   "ara",
   "ber"
  ],
  "monnaies": [
   "MAD"
  ],
  "lat": 32,
  "lng": -5
 },
 {
  "id": "MCO",
  "iso2": "MC",
  "num": 492,
  "nom": {
   "fr": "Monaco",
   "en": "Monaco",
   "es": "Mónaco",
   "pcm": "Monaco"
  },
  "continent": "europe",
  "sousRegion": "Western Europe",
  "superficie": 2.02,
  "population": 38682,
  "enclave": false,
  "frontieres": [
   "FRA"
  ],
  "langues": [
   "fra"
  ],
  "monnaies": [
   "EUR"
  ],
  "lat": 43.73333333,
  "lng": 7.4
 },
 {
  "id": "MDA",
  "iso2": "MD",
  "num": 498,
  "nom": {
   "fr": "Moldavie",
   "en": "Moldova",
   "es": "Moldavia",
   "pcm": "Moldova"
  },
  "continent": "europe",
  "sousRegion": "Eastern Europe",
  "superficie": 33846,
  "population": 2706049,
  "enclave": true,
  "frontieres": [
   "ROU",
   "UKR"
  ],
  "langues": [
   "ron"
  ],
  "monnaies": [
   "MDL"
  ],
  "lat": 47,
  "lng": 29
 },
 {
  "id": "MDG",
  "iso2": "MG",
  "num": 450,
  "nom": {
   "fr": "Madagascar",
   "en": "Madagascar",
   "es": "Madagascar",
   "pcm": "Madagascar"
  },
  "continent": "afrique",
  "sousRegion": "Eastern Africa",
  "superficie": 587041,
  "population": 26262368,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "fra",
   "mlg"
  ],
  "monnaies": [
   "MGA"
  ],
  "lat": -20,
  "lng": 47
 },
 {
  "id": "MDV",
  "iso2": "MV",
  "num": 462,
  "nom": {
   "fr": "Maldives",
   "en": "Maldives",
   "es": "Maldivas",
   "pcm": "Maldives"
  },
  "continent": "asie",
  "sousRegion": "Southern Asia",
  "superficie": 300,
  "population": 515696,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "div"
  ],
  "monnaies": [
   "MVR"
  ],
  "lat": 3.25,
  "lng": 73
 },
 {
  "id": "MEX",
  "iso2": "MX",
  "num": 484,
  "nom": {
   "fr": "Mexique",
   "en": "Mexico",
   "es": "México",
   "pcm": "Mexico"
  },
  "continent": "amerique-nord",
  "sousRegion": "North America",
  "superficie": 1964375,
  "population": 126190788,
  "enclave": false,
  "frontieres": [
   "BLZ",
   "GTM",
   "USA"
  ],
  "langues": [
   "spa"
  ],
  "monnaies": [
   "MXN"
  ],
  "lat": 23,
  "lng": -102
 },
 {
  "id": "MHL",
  "iso2": "MH",
  "num": 584,
  "nom": {
   "fr": "Îles Marshall",
   "en": "Marshall Islands",
   "es": "Islas Marshall",
   "pcm": "Marshall Islands"
  },
  "continent": "oceanie",
  "sousRegion": "Micronesia",
  "superficie": 181,
  "population": 58413,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng",
   "mah"
  ],
  "monnaies": [
   "USD"
  ],
  "lat": 9,
  "lng": 168
 },
 {
  "id": "MKD",
  "iso2": "MK",
  "num": 807,
  "nom": {
   "fr": "Macédoine du Nord",
   "en": "North Macedonia",
   "es": "Macedonia del Norte",
   "pcm": "North Macedonia"
  },
  "continent": "europe",
  "sousRegion": "Southeast Europe",
  "superficie": 25713,
  "population": 2084367,
  "enclave": true,
  "frontieres": [
   "ALB",
   "BGR",
   "GRC",
   "SRB"
  ],
  "langues": [
   "mkd"
  ],
  "monnaies": [
   "MKD"
  ],
  "lat": 41.83333333,
  "lng": 22
 },
 {
  "id": "MLI",
  "iso2": "ML",
  "num": 466,
  "nom": {
   "fr": "Mali",
   "en": "Mali",
   "es": "Mali",
   "pcm": "Mali"
  },
  "continent": "afrique",
  "sousRegion": "Western Africa",
  "superficie": 1240192,
  "population": 19077690,
  "enclave": true,
  "frontieres": [
   "DZA",
   "BFA",
   "GIN",
   "CIV",
   "MRT",
   "NER",
   "SEN"
  ],
  "langues": [
   "fra"
  ],
  "monnaies": [
   "XOF"
  ],
  "lat": 17,
  "lng": -4
 },
 {
  "id": "MLT",
  "iso2": "MT",
  "num": 470,
  "nom": {
   "fr": "Malte",
   "en": "Malta",
   "es": "Malta",
   "pcm": "Malta"
  },
  "continent": "europe",
  "sousRegion": "Southern Europe",
  "superficie": 316,
  "population": 484630,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng",
   "mlt"
  ],
  "monnaies": [
   "EUR"
  ],
  "lat": 35.83333333,
  "lng": 14.58333333
 },
 {
  "id": "MMR",
  "iso2": "MM",
  "num": 104,
  "nom": {
   "fr": "Birmanie",
   "en": "Myanmar",
   "es": "Myanmar",
   "pcm": "Myanmar"
  },
  "continent": "asie",
  "sousRegion": "South-Eastern Asia",
  "superficie": 676578,
  "population": 53708395,
  "enclave": false,
  "frontieres": [
   "BGD",
   "CHN",
   "IND",
   "LAO",
   "THA"
  ],
  "langues": [
   "mya"
  ],
  "monnaies": [
   "MMK"
  ],
  "lat": 22,
  "lng": 98
 },
 {
  "id": "MNE",
  "iso2": "ME",
  "num": 499,
  "nom": {
   "fr": "Monténégro",
   "en": "Montenegro",
   "es": "Montenegro",
   "pcm": "Montenegro"
  },
  "continent": "europe",
  "sousRegion": "Southeast Europe",
  "superficie": 13812,
  "population": 631219,
  "enclave": false,
  "frontieres": [
   "ALB",
   "BIH",
   "HRV",
   "SRB"
  ],
  "langues": [
   "cnr"
  ],
  "monnaies": [
   "EUR"
  ],
  "lat": 42.5,
  "lng": 19.3
 },
 {
  "id": "MNG",
  "iso2": "MN",
  "num": 496,
  "nom": {
   "fr": "Mongolie",
   "en": "Mongolia",
   "es": "Mongolia",
   "pcm": "Mongolia"
  },
  "continent": "asie",
  "sousRegion": "Eastern Asia",
  "superficie": 1564110,
  "population": 3170208,
  "enclave": true,
  "frontieres": [
   "CHN",
   "RUS"
  ],
  "langues": [
   "mon"
  ],
  "monnaies": [
   "MNT"
  ],
  "lat": 46,
  "lng": 105
 },
 {
  "id": "MOZ",
  "iso2": "MZ",
  "num": 508,
  "nom": {
   "fr": "Mozambique",
   "en": "Mozambique",
   "es": "Mozambique",
   "pcm": "Mozambique"
  },
  "continent": "afrique",
  "sousRegion": "Eastern Africa",
  "superficie": 801590,
  "population": 29495962,
  "enclave": false,
  "frontieres": [
   "MWI",
   "ZAF",
   "SWZ",
   "TZA",
   "ZMB",
   "ZWE"
  ],
  "langues": [
   "por"
  ],
  "monnaies": [
   "MZN"
  ],
  "lat": -18.25,
  "lng": 35
 },
 {
  "id": "MRT",
  "iso2": "MR",
  "num": 478,
  "nom": {
   "fr": "Mauritanie",
   "en": "Mauritania",
   "es": "Mauritania",
   "pcm": "Mauritania"
  },
  "continent": "afrique",
  "sousRegion": "Western Africa",
  "superficie": 1030700,
  "population": 4403319,
  "enclave": false,
  "frontieres": [
   "DZA",
   "MLI",
   "SEN"
  ],
  "langues": [
   "ara"
  ],
  "monnaies": [
   "MRU"
  ],
  "lat": 20,
  "lng": -12
 },
 {
  "id": "MUS",
  "iso2": "MU",
  "num": 480,
  "nom": {
   "fr": "Île Maurice",
   "en": "Mauritius",
   "es": "Mauricio",
   "pcm": "Mauritius"
  },
  "continent": "afrique",
  "sousRegion": "Eastern Africa",
  "superficie": 2040,
  "population": 1265303,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng",
   "fra",
   "mfe"
  ],
  "monnaies": [
   "MUR"
  ],
  "lat": -20.28333333,
  "lng": 57.55
 },
 {
  "id": "MWI",
  "iso2": "MW",
  "num": 454,
  "nom": {
   "fr": "Malawi",
   "en": "Malawi",
   "es": "Malawi",
   "pcm": "Malawi"
  },
  "continent": "afrique",
  "sousRegion": "Eastern Africa",
  "superficie": 118484,
  "population": 18143315,
  "enclave": true,
  "frontieres": [
   "MOZ",
   "TZA",
   "ZMB"
  ],
  "langues": [
   "eng",
   "nya"
  ],
  "monnaies": [
   "MWK"
  ],
  "lat": -13.5,
  "lng": 34
 },
 {
  "id": "MYS",
  "iso2": "MY",
  "num": 458,
  "nom": {
   "fr": "Malaisie",
   "en": "Malaysia",
   "es": "Malasia",
   "pcm": "Malaysia"
  },
  "continent": "asie",
  "sousRegion": "South-Eastern Asia",
  "superficie": 330803,
  "population": 31528585,
  "enclave": false,
  "frontieres": [
   "BRN",
   "IDN",
   "THA"
  ],
  "langues": [
   "eng",
   "msa"
  ],
  "monnaies": [
   "MYR"
  ],
  "lat": 2.5,
  "lng": 112.5
 },
 {
  "id": "NAM",
  "iso2": "NA",
  "num": 516,
  "nom": {
   "fr": "Namibie",
   "en": "Namibia",
   "es": "Namibia",
   "pcm": "Namibia"
  },
  "continent": "afrique",
  "sousRegion": "Southern Africa",
  "superficie": 825615,
  "population": 2448255,
  "enclave": false,
  "frontieres": [
   "AGO",
   "BWA",
   "ZAF",
   "ZMB"
  ],
  "langues": [
   "afr",
   "deu",
   "eng",
   "her",
   "hgm",
   "kwn",
   "loz",
   "ndo",
   "tsn"
  ],
  "monnaies": [
   "NAD",
   "ZAR"
  ],
  "lat": -22,
  "lng": 17
 },
 {
  "id": "NER",
  "iso2": "NE",
  "num": 562,
  "nom": {
   "fr": "Niger",
   "en": "Niger",
   "es": "Níger",
   "pcm": "Niger"
  },
  "continent": "afrique",
  "sousRegion": "Western Africa",
  "superficie": 1267000,
  "population": 22442948,
  "enclave": true,
  "frontieres": [
   "DZA",
   "BEN",
   "BFA",
   "TCD",
   "LBY",
   "MLI",
   "NGA"
  ],
  "langues": [
   "fra"
  ],
  "monnaies": [
   "XOF"
  ],
  "lat": 16,
  "lng": 8
 },
 {
  "id": "NGA",
  "iso2": "NG",
  "num": 566,
  "nom": {
   "fr": "Nigéria",
   "en": "Nigeria",
   "es": "Nigeria",
   "pcm": "Nigeria"
  },
  "continent": "afrique",
  "sousRegion": "Western Africa",
  "superficie": 923768,
  "population": 195874740,
  "enclave": false,
  "frontieres": [
   "BEN",
   "CMR",
   "TCD",
   "NER"
  ],
  "langues": [
   "eng"
  ],
  "monnaies": [
   "NGN"
  ],
  "lat": 10,
  "lng": 8
 },
 {
  "id": "NIC",
  "iso2": "NI",
  "num": 558,
  "nom": {
   "fr": "Nicaragua",
   "en": "Nicaragua",
   "es": "Nicaragua",
   "pcm": "Nicaragua"
  },
  "continent": "amerique-nord",
  "sousRegion": "Central America",
  "superficie": 130373,
  "population": 6465513,
  "enclave": false,
  "frontieres": [
   "CRI",
   "HND"
  ],
  "langues": [
   "spa"
  ],
  "monnaies": [
   "NIO"
  ],
  "lat": 13,
  "lng": -85
 },
 {
  "id": "NLD",
  "iso2": "NL",
  "num": 528,
  "nom": {
   "fr": "Pays-Bas",
   "en": "Netherlands",
   "es": "Países Bajos",
   "pcm": "Netherlands"
  },
  "continent": "europe",
  "sousRegion": "Western Europe",
  "superficie": 41850,
  "population": 17231624,
  "enclave": false,
  "frontieres": [
   "BEL",
   "DEU"
  ],
  "langues": [
   "nld"
  ],
  "monnaies": [
   "EUR"
  ],
  "lat": 52.5,
  "lng": 5.75
 },
 {
  "id": "NOR",
  "iso2": "NO",
  "num": 578,
  "nom": {
   "fr": "Norvège",
   "en": "Norway",
   "es": "Noruega",
   "pcm": "Norway"
  },
  "continent": "europe",
  "sousRegion": "Northern Europe",
  "superficie": 323802,
  "population": 5311916,
  "enclave": false,
  "frontieres": [
   "FIN",
   "SWE",
   "RUS"
  ],
  "langues": [
   "nno",
   "nob",
   "smi"
  ],
  "monnaies": [
   "NOK"
  ],
  "lat": 62,
  "lng": 10
 },
 {
  "id": "NPL",
  "iso2": "NP",
  "num": 524,
  "nom": {
   "fr": "Népal",
   "en": "Nepal",
   "es": "Nepal",
   "pcm": "Nepal"
  },
  "continent": "asie",
  "sousRegion": "Southern Asia",
  "superficie": 147181,
  "population": 28087871,
  "enclave": true,
  "frontieres": [
   "CHN",
   "IND"
  ],
  "langues": [
   "nep"
  ],
  "monnaies": [
   "NPR"
  ],
  "lat": 28,
  "lng": 84
 },
 {
  "id": "NRU",
  "iso2": "NR",
  "num": 520,
  "nom": {
   "fr": "Nauru",
   "en": "Nauru",
   "es": "Nauru",
   "pcm": "Nauru"
  },
  "continent": "oceanie",
  "sousRegion": "Micronesia",
  "superficie": 21,
  "population": 12704,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng",
   "nau"
  ],
  "monnaies": [
   "AUD"
  ],
  "lat": -0.53333333,
  "lng": 166.91666666
 },
 {
  "id": "NZL",
  "iso2": "NZ",
  "num": 554,
  "nom": {
   "fr": "Nouvelle-Zélande",
   "en": "New Zealand",
   "es": "Nueva Zelanda",
   "pcm": "New Zealand"
  },
  "continent": "oceanie",
  "sousRegion": "Australia and New Zealand",
  "superficie": 270467,
  "population": 4841000,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng",
   "mri",
   "nzs"
  ],
  "monnaies": [
   "NZD"
  ],
  "lat": -41,
  "lng": 174
 },
 {
  "id": "OMN",
  "iso2": "OM",
  "num": 512,
  "nom": {
   "fr": "Oman",
   "en": "Oman",
   "es": "Omán",
   "pcm": "Oman"
  },
  "continent": "asie",
  "sousRegion": "Western Asia",
  "superficie": 309500,
  "population": 4829483,
  "enclave": false,
  "frontieres": [
   "SAU",
   "ARE",
   "YEM"
  ],
  "langues": [
   "ara"
  ],
  "monnaies": [
   "OMR"
  ],
  "lat": 21,
  "lng": 57
 },
 {
  "id": "PAK",
  "iso2": "PK",
  "num": 586,
  "nom": {
   "fr": "Pakistan",
   "en": "Pakistan",
   "es": "Pakistán",
   "pcm": "Pakistan"
  },
  "continent": "asie",
  "sousRegion": "Southern Asia",
  "superficie": 881912,
  "population": 212215030,
  "enclave": false,
  "frontieres": [
   "AFG",
   "CHN",
   "IND",
   "IRN"
  ],
  "langues": [
   "eng",
   "urd"
  ],
  "monnaies": [
   "PKR"
  ],
  "lat": 30,
  "lng": 70
 },
 {
  "id": "PAN",
  "iso2": "PA",
  "num": 591,
  "nom": {
   "fr": "Panama",
   "en": "Panama",
   "es": "Panamá",
   "pcm": "Panama"
  },
  "continent": "amerique-nord",
  "sousRegion": "Central America",
  "superficie": 75417,
  "population": 4176873,
  "enclave": false,
  "frontieres": [
   "COL",
   "CRI"
  ],
  "langues": [
   "spa"
  ],
  "monnaies": [
   "PAB",
   "USD"
  ],
  "lat": 9,
  "lng": -80
 },
 {
  "id": "PER",
  "iso2": "PE",
  "num": 604,
  "nom": {
   "fr": "Pérou",
   "en": "Peru",
   "es": "Perú",
   "pcm": "Peru"
  },
  "continent": "amerique-sud",
  "sousRegion": "South America",
  "superficie": 1285216,
  "population": 31989256,
  "enclave": false,
  "frontieres": [
   "BOL",
   "BRA",
   "CHL",
   "COL",
   "ECU"
  ],
  "langues": [
   "aym",
   "que",
   "spa"
  ],
  "monnaies": [
   "PEN"
  ],
  "lat": -10,
  "lng": -76
 },
 {
  "id": "PHL",
  "iso2": "PH",
  "num": 608,
  "nom": {
   "fr": "Philippines",
   "en": "Philippines",
   "es": "Filipinas",
   "pcm": "Philippines"
  },
  "continent": "asie",
  "sousRegion": "South-Eastern Asia",
  "superficie": 342353,
  "population": 106651922,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng",
   "fil"
  ],
  "monnaies": [
   "PHP"
  ],
  "lat": 13,
  "lng": 122
 },
 {
  "id": "PLW",
  "iso2": "PW",
  "num": 585,
  "nom": {
   "fr": "Palaos (Palau)",
   "en": "Palau",
   "es": "Palau",
   "pcm": "Palau"
  },
  "continent": "oceanie",
  "sousRegion": "Micronesia",
  "superficie": 459,
  "population": 17907,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng",
   "pau"
  ],
  "monnaies": [
   "USD"
  ],
  "lat": 7.5,
  "lng": 134.5
 },
 {
  "id": "PNG",
  "iso2": "PG",
  "num": 598,
  "nom": {
   "fr": "Papouasie-Nouvelle-Guinée",
   "en": "Papua New Guinea",
   "es": "Papúa Nueva Guinea",
   "pcm": "Papua New Guinea"
  },
  "continent": "oceanie",
  "sousRegion": "Melanesia",
  "superficie": 462840,
  "population": 8606316,
  "enclave": false,
  "frontieres": [
   "IDN"
  ],
  "langues": [
   "eng",
   "hmo",
   "tpi"
  ],
  "monnaies": [
   "PGK"
  ],
  "lat": -6,
  "lng": 147
 },
 {
  "id": "POL",
  "iso2": "PL",
  "num": 616,
  "nom": {
   "fr": "Pologne",
   "en": "Poland",
   "es": "Polonia",
   "pcm": "Poland"
  },
  "continent": "europe",
  "sousRegion": "Central Europe",
  "superficie": 312679,
  "population": 37974750,
  "enclave": false,
  "frontieres": [
   "BLR",
   "CZE",
   "DEU",
   "LTU",
   "RUS",
   "SVK",
   "UKR"
  ],
  "langues": [
   "pol"
  ],
  "monnaies": [
   "PLN"
  ],
  "lat": 52,
  "lng": 20
 },
 {
  "id": "PRK",
  "iso2": "KP",
  "num": 408,
  "nom": {
   "fr": "Corée du Nord",
   "en": "North Korea",
   "es": "Corea del Norte",
   "pcm": "North Korea"
  },
  "continent": "asie",
  "sousRegion": "Eastern Asia",
  "superficie": 120538,
  "population": 25549819,
  "enclave": false,
  "frontieres": [
   "CHN",
   "KOR",
   "RUS"
  ],
  "langues": [
   "kor"
  ],
  "monnaies": [
   "KPW"
  ],
  "lat": 40,
  "lng": 127
 },
 {
  "id": "PRT",
  "iso2": "PT",
  "num": 620,
  "nom": {
   "fr": "Portugal",
   "en": "Portugal",
   "es": "Portugal",
   "pcm": "Portugal"
  },
  "continent": "europe",
  "sousRegion": "Southern Europe",
  "superficie": 92090,
  "population": 10283822,
  "enclave": false,
  "frontieres": [
   "ESP"
  ],
  "langues": [
   "por"
  ],
  "monnaies": [
   "EUR"
  ],
  "lat": 39.5,
  "lng": -8
 },
 {
  "id": "PRY",
  "iso2": "PY",
  "num": 600,
  "nom": {
   "fr": "Paraguay",
   "en": "Paraguay",
   "es": "Paraguay",
   "pcm": "Paraguay"
  },
  "continent": "amerique-sud",
  "sousRegion": "South America",
  "superficie": 406752,
  "population": 6956071,
  "enclave": true,
  "frontieres": [
   "ARG",
   "BOL",
   "BRA"
  ],
  "langues": [
   "grn",
   "spa"
  ],
  "monnaies": [
   "PYG"
  ],
  "lat": -23,
  "lng": -58
 },
 {
  "id": "QAT",
  "iso2": "QA",
  "num": 634,
  "nom": {
   "fr": "Qatar",
   "en": "Qatar",
   "es": "Catar",
   "pcm": "Qatar"
  },
  "continent": "asie",
  "sousRegion": "Western Asia",
  "superficie": 11586,
  "population": 2781677,
  "enclave": false,
  "frontieres": [
   "SAU"
  ],
  "langues": [
   "ara"
  ],
  "monnaies": [
   "QAR"
  ],
  "lat": 25.5,
  "lng": 51.25
 },
 {
  "id": "ROU",
  "iso2": "RO",
  "num": 642,
  "nom": {
   "fr": "Roumanie",
   "en": "Romania",
   "es": "Rumania",
   "pcm": "Romania"
  },
  "continent": "europe",
  "sousRegion": "Southeast Europe",
  "superficie": 238391,
  "population": 19466145,
  "enclave": false,
  "frontieres": [
   "BGR",
   "HUN",
   "MDA",
   "SRB",
   "UKR"
  ],
  "langues": [
   "ron"
  ],
  "monnaies": [
   "RON"
  ],
  "lat": 46,
  "lng": 25
 },
 {
  "id": "RUS",
  "iso2": "RU",
  "num": 643,
  "nom": {
   "fr": "Russie",
   "en": "Russia",
   "es": "Rusia",
   "pcm": "Russia"
  },
  "continent": "europe",
  "sousRegion": "Eastern Europe",
  "superficie": 17098242,
  "population": 144478050,
  "enclave": false,
  "frontieres": [
   "AZE",
   "BLR",
   "CHN",
   "EST",
   "FIN",
   "GEO",
   "KAZ",
   "PRK",
   "LVA",
   "LTU",
   "MNG",
   "NOR",
   "POL",
   "UKR"
  ],
  "langues": [
   "rus"
  ],
  "monnaies": [
   "RUB"
  ],
  "lat": 60,
  "lng": 100
 },
 {
  "id": "RWA",
  "iso2": "RW",
  "num": 646,
  "nom": {
   "fr": "Rwanda",
   "en": "Rwanda",
   "es": "Ruanda",
   "pcm": "Rwanda"
  },
  "continent": "afrique",
  "sousRegion": "Eastern Africa",
  "superficie": 26338,
  "population": 12301939,
  "enclave": true,
  "frontieres": [
   "BDI",
   "COD",
   "TZA",
   "UGA"
  ],
  "langues": [
   "eng",
   "fra",
   "kin"
  ],
  "monnaies": [
   "RWF"
  ],
  "lat": -2,
  "lng": 30
 },
 {
  "id": "SAU",
  "iso2": "SA",
  "num": 682,
  "nom": {
   "fr": "Arabie Saoudite",
   "en": "Saudi Arabia",
   "es": "Arabia Saudí",
   "pcm": "Saudi Arabia"
  },
  "continent": "asie",
  "sousRegion": "Western Asia",
  "superficie": 2149690,
  "population": 33699947,
  "enclave": false,
  "frontieres": [
   "IRQ",
   "JOR",
   "KWT",
   "OMN",
   "QAT",
   "ARE",
   "YEM"
  ],
  "langues": [
   "ara"
  ],
  "monnaies": [
   "SAR"
  ],
  "lat": 25,
  "lng": 45
 },
 {
  "id": "SDN",
  "iso2": "SD",
  "num": 729,
  "nom": {
   "fr": "Soudan",
   "en": "Sudan",
   "es": "Sudán",
   "pcm": "Sudan"
  },
  "continent": "afrique",
  "sousRegion": "Northern Africa",
  "superficie": 1886068,
  "population": 41801533,
  "enclave": false,
  "frontieres": [
   "CAF",
   "TCD",
   "EGY",
   "ERI",
   "ETH",
   "LBY",
   "SSD"
  ],
  "langues": [
   "ara",
   "eng"
  ],
  "monnaies": [
   "SDG"
  ],
  "lat": 15,
  "lng": 30
 },
 {
  "id": "SEN",
  "iso2": "SN",
  "num": 686,
  "nom": {
   "fr": "Sénégal",
   "en": "Senegal",
   "es": "Senegal",
   "pcm": "Senegal"
  },
  "continent": "afrique",
  "sousRegion": "Western Africa",
  "superficie": 196722,
  "population": 15854360,
  "enclave": false,
  "frontieres": [
   "GMB",
   "GIN",
   "GNB",
   "MLI",
   "MRT"
  ],
  "langues": [
   "fra"
  ],
  "monnaies": [
   "XOF"
  ],
  "lat": 14,
  "lng": -14
 },
 {
  "id": "SGP",
  "iso2": "SG",
  "num": 702,
  "nom": {
   "fr": "Singapour",
   "en": "Singapore",
   "es": "Singapur",
   "pcm": "Singapore"
  },
  "continent": "asie",
  "sousRegion": "South-Eastern Asia",
  "superficie": 710,
  "population": 5638676,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng",
   "msa",
   "tam",
   "zho"
  ],
  "monnaies": [
   "SGD"
  ],
  "lat": 1.36666666,
  "lng": 103.8
 },
 {
  "id": "SLB",
  "iso2": "SB",
  "num": 90,
  "nom": {
   "fr": "Îles Salomon",
   "en": "Solomon Islands",
   "es": "Islas Salomón",
   "pcm": "Solomon Islands"
  },
  "continent": "oceanie",
  "sousRegion": "Melanesia",
  "superficie": 28896,
  "population": 652858,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng"
  ],
  "monnaies": [
   "SBD"
  ],
  "lat": -8,
  "lng": 159
 },
 {
  "id": "SLE",
  "iso2": "SL",
  "num": 694,
  "nom": {
   "fr": "Sierra Leone",
   "en": "Sierra Leone",
   "es": "Sierra Leone",
   "pcm": "Sierra Leone"
  },
  "continent": "afrique",
  "sousRegion": "Western Africa",
  "superficie": 71740,
  "population": 7650154,
  "enclave": false,
  "frontieres": [
   "GIN",
   "LBR"
  ],
  "langues": [
   "eng"
  ],
  "monnaies": [
   "SLL"
  ],
  "lat": 8.5,
  "lng": -11.5
 },
 {
  "id": "SLV",
  "iso2": "SV",
  "num": 222,
  "nom": {
   "fr": "Salvador",
   "en": "El Salvador",
   "es": "El Salvador",
   "pcm": "El Salvador"
  },
  "continent": "amerique-nord",
  "sousRegion": "Central America",
  "superficie": 21041,
  "population": 6420744,
  "enclave": false,
  "frontieres": [
   "GTM",
   "HND"
  ],
  "langues": [
   "spa"
  ],
  "monnaies": [
   "USD"
  ],
  "lat": 13.83333333,
  "lng": -88.91666666
 },
 {
  "id": "SMR",
  "iso2": "SM",
  "num": 674,
  "nom": {
   "fr": "Saint-Marin",
   "en": "San Marino",
   "es": "San Marino",
   "pcm": "San Marino"
  },
  "continent": "europe",
  "sousRegion": "Southern Europe",
  "superficie": 61,
  "population": 33785,
  "enclave": true,
  "frontieres": [
   "ITA"
  ],
  "langues": [
   "ita"
  ],
  "monnaies": [
   "EUR"
  ],
  "lat": 43.76666666,
  "lng": 12.41666666
 },
 {
  "id": "SOM",
  "iso2": "SO",
  "num": 706,
  "nom": {
   "fr": "Somalie",
   "en": "Somalia",
   "es": "Somalia",
   "pcm": "Somalia"
  },
  "continent": "afrique",
  "sousRegion": "Eastern Africa",
  "superficie": 637657,
  "population": 15008154,
  "enclave": false,
  "frontieres": [
   "DJI",
   "ETH",
   "KEN"
  ],
  "langues": [
   "ara",
   "som"
  ],
  "monnaies": [
   "SOS"
  ],
  "lat": 10,
  "lng": 49
 },
 {
  "id": "SRB",
  "iso2": "RS",
  "num": 688,
  "nom": {
   "fr": "Serbie",
   "en": "Serbia",
   "es": "Serbia",
   "pcm": "Serbia"
  },
  "continent": "europe",
  "sousRegion": "Southeast Europe",
  "superficie": 88361,
  "population": 6963764,
  "enclave": true,
  "frontieres": [
   "BIH",
   "BGR",
   "HRV",
   "HUN",
   "MKD",
   "MNE",
   "ROU"
  ],
  "langues": [
   "srp"
  ],
  "monnaies": [
   "RSD"
  ],
  "lat": 44,
  "lng": 21
 },
 {
  "id": "SSD",
  "iso2": "SS",
  "num": 728,
  "nom": {
   "fr": "Soudan du Sud",
   "en": "South Sudan",
   "es": "Sudán del Sur",
   "pcm": "South Sudan"
  },
  "continent": "afrique",
  "sousRegion": "Middle Africa",
  "superficie": 619745,
  "population": 10975920,
  "enclave": true,
  "frontieres": [
   "CAF",
   "COD",
   "ETH",
   "KEN",
   "SDN",
   "UGA"
  ],
  "langues": [
   "eng"
  ],
  "monnaies": [
   "SSP"
  ],
  "lat": 7,
  "lng": 30
 },
 {
  "id": "STP",
  "iso2": "ST",
  "num": 678,
  "nom": {
   "fr": "São Tomé et Príncipe",
   "en": "São Tomé and Príncipe",
   "es": "Santo Tomé y Príncipe",
   "pcm": "São Tomé and Príncipe"
  },
  "continent": "afrique",
  "sousRegion": "Middle Africa",
  "superficie": 964,
  "population": 211028,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "por"
  ],
  "monnaies": [
   "STN"
  ],
  "lat": 1,
  "lng": 7
 },
 {
  "id": "SUR",
  "iso2": "SR",
  "num": 740,
  "nom": {
   "fr": "Surinam",
   "en": "Suriname",
   "es": "Surinam",
   "pcm": "Suriname"
  },
  "continent": "amerique-sud",
  "sousRegion": "South America",
  "superficie": 163820,
  "population": 575991,
  "enclave": false,
  "frontieres": [
   "BRA",
   "GUY"
  ],
  "langues": [
   "nld"
  ],
  "monnaies": [
   "SRD"
  ],
  "lat": 4,
  "lng": -56
 },
 {
  "id": "SVK",
  "iso2": "SK",
  "num": 703,
  "nom": {
   "fr": "Slovaquie",
   "en": "Slovakia",
   "es": "Eslovaquia",
   "pcm": "Slovakia"
  },
  "continent": "europe",
  "sousRegion": "Central Europe",
  "superficie": 49037,
  "population": 5446771,
  "enclave": true,
  "frontieres": [
   "AUT",
   "CZE",
   "HUN",
   "POL",
   "UKR"
  ],
  "langues": [
   "slk"
  ],
  "monnaies": [
   "EUR"
  ],
  "lat": 48.66666666,
  "lng": 19.5
 },
 {
  "id": "SVN",
  "iso2": "SI",
  "num": 705,
  "nom": {
   "fr": "Slovénie",
   "en": "Slovenia",
   "es": "Eslovenia",
   "pcm": "Slovenia"
  },
  "continent": "europe",
  "sousRegion": "Central Europe",
  "superficie": 20273,
  "population": 2073894,
  "enclave": false,
  "frontieres": [
   "AUT",
   "HRV",
   "ITA",
   "HUN"
  ],
  "langues": [
   "slv"
  ],
  "monnaies": [
   "EUR"
  ],
  "lat": 46.11666666,
  "lng": 14.81666666
 },
 {
  "id": "SWE",
  "iso2": "SE",
  "num": 752,
  "nom": {
   "fr": "Suède",
   "en": "Sweden",
   "es": "Suecia",
   "pcm": "Sweden"
  },
  "continent": "europe",
  "sousRegion": "Northern Europe",
  "superficie": 450295,
  "population": 10175214,
  "enclave": false,
  "frontieres": [
   "FIN",
   "NOR"
  ],
  "langues": [
   "swe"
  ],
  "monnaies": [
   "SEK"
  ],
  "lat": 62,
  "lng": 15
 },
 {
  "id": "SWZ",
  "iso2": "SZ",
  "num": 748,
  "nom": {
   "fr": "Swaziland",
   "en": "Eswatini",
   "es": "Suazilandia",
   "pcm": "Eswatini"
  },
  "continent": "afrique",
  "sousRegion": "Southern Africa",
  "superficie": 17364,
  "population": 1136191,
  "enclave": true,
  "frontieres": [
   "MOZ",
   "ZAF"
  ],
  "langues": [
   "eng",
   "ssw"
  ],
  "monnaies": [
   "SZL",
   "ZAR"
  ],
  "lat": -26.5,
  "lng": 31.5
 },
 {
  "id": "SYC",
  "iso2": "SC",
  "num": 690,
  "nom": {
   "fr": "Seychelles",
   "en": "Seychelles",
   "es": "Seychelles",
   "pcm": "Seychelles"
  },
  "continent": "afrique",
  "sousRegion": "Eastern Africa",
  "superficie": 452,
  "population": 96762,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "crs",
   "eng",
   "fra"
  ],
  "monnaies": [
   "SCR"
  ],
  "lat": -4.58333333,
  "lng": 55.66666666
 },
 {
  "id": "SYR",
  "iso2": "SY",
  "num": 760,
  "nom": {
   "fr": "Syrie",
   "en": "Syria",
   "es": "Siria",
   "pcm": "Syria"
  },
  "continent": "asie",
  "sousRegion": "Western Asia",
  "superficie": 185180,
  "population": 16906283,
  "enclave": false,
  "frontieres": [
   "IRQ",
   "ISR",
   "JOR",
   "LBN",
   "TUR"
  ],
  "langues": [
   "ara"
  ],
  "monnaies": [
   "SYP"
  ],
  "lat": 35,
  "lng": 38
 },
 {
  "id": "TCD",
  "iso2": "TD",
  "num": 148,
  "nom": {
   "fr": "Tchad",
   "en": "Chad",
   "es": "Chad",
   "pcm": "Chad"
  },
  "continent": "afrique",
  "sousRegion": "Middle Africa",
  "superficie": 1284000,
  "population": 15477751,
  "enclave": true,
  "frontieres": [
   "CMR",
   "CAF",
   "LBY",
   "NER",
   "NGA",
   "SDN"
  ],
  "langues": [
   "ara",
   "fra"
  ],
  "monnaies": [
   "XAF"
  ],
  "lat": 15,
  "lng": 19
 },
 {
  "id": "TGO",
  "iso2": "TG",
  "num": 768,
  "nom": {
   "fr": "Togo",
   "en": "Togo",
   "es": "Togo",
   "pcm": "Togo"
  },
  "continent": "afrique",
  "sousRegion": "Western Africa",
  "superficie": 56785,
  "population": 7889094,
  "enclave": false,
  "frontieres": [
   "BEN",
   "BFA",
   "GHA"
  ],
  "langues": [
   "fra"
  ],
  "monnaies": [
   "XOF"
  ],
  "lat": 8,
  "lng": 1.16666666
 },
 {
  "id": "THA",
  "iso2": "TH",
  "num": 764,
  "nom": {
   "fr": "Thaïlande",
   "en": "Thailand",
   "es": "Tailandia",
   "pcm": "Thailand"
  },
  "continent": "asie",
  "sousRegion": "South-Eastern Asia",
  "superficie": 513120,
  "population": 69428524,
  "enclave": false,
  "frontieres": [
   "MMR",
   "KHM",
   "LAO",
   "MYS"
  ],
  "langues": [
   "tha"
  ],
  "monnaies": [
   "THB"
  ],
  "lat": 15,
  "lng": 100
 },
 {
  "id": "TJK",
  "iso2": "TJ",
  "num": 762,
  "nom": {
   "fr": "Tadjikistan",
   "en": "Tajikistan",
   "es": "Tayikistán",
   "pcm": "Tajikistan"
  },
  "continent": "asie",
  "sousRegion": "Central Asia",
  "superficie": 143100,
  "population": 9100837,
  "enclave": true,
  "frontieres": [
   "AFG",
   "CHN",
   "KGZ",
   "UZB"
  ],
  "langues": [
   "rus",
   "tgk"
  ],
  "monnaies": [
   "TJS"
  ],
  "lat": 39,
  "lng": 71
 },
 {
  "id": "TKM",
  "iso2": "TM",
  "num": 795,
  "nom": {
   "fr": "Turkménistan",
   "en": "Turkmenistan",
   "es": "Turkmenistán",
   "pcm": "Turkmenistan"
  },
  "continent": "asie",
  "sousRegion": "Central Asia",
  "superficie": 488100,
  "population": 5850908,
  "enclave": true,
  "frontieres": [
   "AFG",
   "IRN",
   "KAZ",
   "UZB"
  ],
  "langues": [
   "rus",
   "tuk"
  ],
  "monnaies": [
   "TMT"
  ],
  "lat": 40,
  "lng": 60
 },
 {
  "id": "TLS",
  "iso2": "TL",
  "num": 626,
  "nom": {
   "fr": "Timor oriental",
   "en": "Timor-Leste",
   "es": "Timor Oriental",
   "pcm": "Timor-Leste"
  },
  "continent": "asie",
  "sousRegion": "South-Eastern Asia",
  "superficie": 14874,
  "population": 1267972,
  "enclave": false,
  "frontieres": [
   "IDN"
  ],
  "langues": [
   "por",
   "tet"
  ],
  "monnaies": [
   "USD"
  ],
  "lat": -8.83333333,
  "lng": 125.91666666
 },
 {
  "id": "TON",
  "iso2": "TO",
  "num": 776,
  "nom": {
   "fr": "Tonga",
   "en": "Tonga",
   "es": "Tonga",
   "pcm": "Tonga"
  },
  "continent": "oceanie",
  "sousRegion": "Polynesia",
  "superficie": 747,
  "population": 103197,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng",
   "ton"
  ],
  "monnaies": [
   "TOP"
  ],
  "lat": -20,
  "lng": -175
 },
 {
  "id": "TTO",
  "iso2": "TT",
  "num": 780,
  "nom": {
   "fr": "Trinité-et-Tobago",
   "en": "Trinidad and Tobago",
   "es": "Trinidad y Tobago",
   "pcm": "Trinidad and Tobago"
  },
  "continent": "amerique-nord",
  "sousRegion": "Caribbean",
  "superficie": 5130,
  "population": 1389858,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng"
  ],
  "monnaies": [
   "TTD"
  ],
  "lat": 11,
  "lng": -61
 },
 {
  "id": "TUN",
  "iso2": "TN",
  "num": 788,
  "nom": {
   "fr": "Tunisie",
   "en": "Tunisia",
   "es": "Túnez",
   "pcm": "Tunisia"
  },
  "continent": "afrique",
  "sousRegion": "Northern Africa",
  "superficie": 163610,
  "population": 11565204,
  "enclave": false,
  "frontieres": [
   "DZA",
   "LBY"
  ],
  "langues": [
   "ara"
  ],
  "monnaies": [
   "TND"
  ],
  "lat": 34,
  "lng": 9
 },
 {
  "id": "TUR",
  "iso2": "TR",
  "num": 792,
  "nom": {
   "fr": "Turquie",
   "en": "Türkiye",
   "es": "Turquía",
   "pcm": "Türkiye"
  },
  "continent": "asie",
  "sousRegion": "Western Asia",
  "superficie": 783562,
  "population": 82319724,
  "enclave": false,
  "frontieres": [
   "ARM",
   "AZE",
   "BGR",
   "GEO",
   "GRC",
   "IRN",
   "IRQ",
   "SYR"
  ],
  "langues": [
   "tur"
  ],
  "monnaies": [
   "TRY"
  ],
  "lat": 39,
  "lng": 35
 },
 {
  "id": "TUV",
  "iso2": "TV",
  "num": 798,
  "nom": {
   "fr": "Tuvalu",
   "en": "Tuvalu",
   "es": "Tuvalu",
   "pcm": "Tuvalu"
  },
  "continent": "oceanie",
  "sousRegion": "Polynesia",
  "superficie": 26,
  "population": 11508,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng",
   "tvl"
  ],
  "monnaies": [
   "AUD",
   "TVD"
  ],
  "lat": -8,
  "lng": 178
 },
 {
  "id": "TZA",
  "iso2": "TZ",
  "num": 834,
  "nom": {
   "fr": "Tanzanie",
   "en": "Tanzania",
   "es": "Tanzania",
   "pcm": "Tanzania"
  },
  "continent": "afrique",
  "sousRegion": "Eastern Africa",
  "superficie": 945087,
  "population": 56318348,
  "enclave": false,
  "frontieres": [
   "BDI",
   "COD",
   "KEN",
   "MWI",
   "MOZ",
   "RWA",
   "UGA",
   "ZMB"
  ],
  "langues": [
   "eng",
   "swa"
  ],
  "monnaies": [
   "TZS"
  ],
  "lat": -6,
  "lng": 35
 },
 {
  "id": "UGA",
  "iso2": "UG",
  "num": 800,
  "nom": {
   "fr": "Ouganda",
   "en": "Uganda",
   "es": "Uganda",
   "pcm": "Uganda"
  },
  "continent": "afrique",
  "sousRegion": "Eastern Africa",
  "superficie": 241550,
  "population": 42723139,
  "enclave": true,
  "frontieres": [
   "COD",
   "KEN",
   "RWA",
   "SSD",
   "TZA"
  ],
  "langues": [
   "eng",
   "swa"
  ],
  "monnaies": [
   "UGX"
  ],
  "lat": 1,
  "lng": 32
 },
 {
  "id": "UKR",
  "iso2": "UA",
  "num": 804,
  "nom": {
   "fr": "Ukraine",
   "en": "Ukraine",
   "es": "Ucrania",
   "pcm": "Ukraine"
  },
  "continent": "europe",
  "sousRegion": "Eastern Europe",
  "superficie": 603500,
  "population": 44622516,
  "enclave": false,
  "frontieres": [
   "BLR",
   "HUN",
   "MDA",
   "POL",
   "ROU",
   "RUS",
   "SVK"
  ],
  "langues": [
   "ukr"
  ],
  "monnaies": [
   "UAH"
  ],
  "lat": 49,
  "lng": 32
 },
 {
  "id": "URY",
  "iso2": "UY",
  "num": 858,
  "nom": {
   "fr": "Uruguay",
   "en": "Uruguay",
   "es": "Uruguay",
   "pcm": "Uruguay"
  },
  "continent": "amerique-sud",
  "sousRegion": "South America",
  "superficie": 181034,
  "population": 3449299,
  "enclave": false,
  "frontieres": [
   "ARG",
   "BRA"
  ],
  "langues": [
   "spa"
  ],
  "monnaies": [
   "UYU"
  ],
  "lat": -33,
  "lng": -56
 },
 {
  "id": "USA",
  "iso2": "US",
  "num": 840,
  "nom": {
   "fr": "États-Unis",
   "en": "United States",
   "es": "Estados Unidos",
   "pcm": "United States"
  },
  "continent": "amerique-nord",
  "sousRegion": "North America",
  "superficie": 9372610,
  "population": 326687501,
  "enclave": false,
  "frontieres": [
   "CAN",
   "MEX"
  ],
  "langues": [
   "eng"
  ],
  "monnaies": [
   "USD"
  ],
  "lat": 38,
  "lng": -97
 },
 {
  "id": "UZB",
  "iso2": "UZ",
  "num": 860,
  "nom": {
   "fr": "Ouzbékistan",
   "en": "Uzbekistan",
   "es": "Uzbekistán",
   "pcm": "Uzbekistan"
  },
  "continent": "asie",
  "sousRegion": "Central Asia",
  "superficie": 447400,
  "population": 32955400,
  "enclave": true,
  "frontieres": [
   "AFG",
   "KAZ",
   "KGZ",
   "TJK",
   "TKM"
  ],
  "langues": [
   "rus",
   "uzb"
  ],
  "monnaies": [
   "UZS"
  ],
  "lat": 41,
  "lng": 64
 },
 {
  "id": "VCT",
  "iso2": "VC",
  "num": 670,
  "nom": {
   "fr": "Saint-Vincent-et-les-Grenadines",
   "en": "Saint Vincent and the Grenadines",
   "es": "San Vicente y Granadinas",
   "pcm": "Saint Vincent and the Grenadines"
  },
  "continent": "amerique-nord",
  "sousRegion": "Caribbean",
  "superficie": 389,
  "population": 110210,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng"
  ],
  "monnaies": [
   "XCD"
  ],
  "lat": 13.25,
  "lng": -61.2
 },
 {
  "id": "VEN",
  "iso2": "VE",
  "num": 862,
  "nom": {
   "fr": "Venezuela",
   "en": "Venezuela",
   "es": "Venezuela",
   "pcm": "Venezuela"
  },
  "continent": "amerique-sud",
  "sousRegion": "South America",
  "superficie": 916445,
  "population": 28870195,
  "enclave": false,
  "frontieres": [
   "BRA",
   "COL",
   "GUY"
  ],
  "langues": [
   "spa"
  ],
  "monnaies": [
   "VES"
  ],
  "lat": 8,
  "lng": -66
 },
 {
  "id": "VNM",
  "iso2": "VN",
  "num": 704,
  "nom": {
   "fr": "Viêt Nam",
   "en": "Vietnam",
   "es": "Vietnam",
   "pcm": "Vietnam"
  },
  "continent": "asie",
  "sousRegion": "South-Eastern Asia",
  "superficie": 331212,
  "population": 95540395,
  "enclave": false,
  "frontieres": [
   "KHM",
   "CHN",
   "LAO"
  ],
  "langues": [
   "vie"
  ],
  "monnaies": [
   "VND"
  ],
  "lat": 16.16666666,
  "lng": 107.83333333
 },
 {
  "id": "VUT",
  "iso2": "VU",
  "num": 548,
  "nom": {
   "fr": "Vanuatu",
   "en": "Vanuatu",
   "es": "Vanuatu",
   "pcm": "Vanuatu"
  },
  "continent": "oceanie",
  "sousRegion": "Melanesia",
  "superficie": 12189,
  "population": 292680,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "bis",
   "eng",
   "fra"
  ],
  "monnaies": [
   "VUV"
  ],
  "lat": -16,
  "lng": 167
 },
 {
  "id": "WSM",
  "iso2": "WS",
  "num": 882,
  "nom": {
   "fr": "Samoa",
   "en": "Samoa",
   "es": "Samoa",
   "pcm": "Samoa"
  },
  "continent": "oceanie",
  "sousRegion": "Polynesia",
  "superficie": 2842,
  "population": 196130,
  "enclave": false,
  "frontieres": [],
  "langues": [
   "eng",
   "smo"
  ],
  "monnaies": [
   "WST"
  ],
  "lat": -13.58333333,
  "lng": -172.33333333
 },
 {
  "id": "YEM",
  "iso2": "YE",
  "num": 887,
  "nom": {
   "fr": "Yémen",
   "en": "Yemen",
   "es": "Yemen",
   "pcm": "Yemen"
  },
  "continent": "asie",
  "sousRegion": "Western Asia",
  "superficie": 527968,
  "population": 28498687,
  "enclave": false,
  "frontieres": [
   "OMN",
   "SAU"
  ],
  "langues": [
   "ara"
  ],
  "monnaies": [
   "YER"
  ],
  "lat": 15,
  "lng": 48
 },
 {
  "id": "ZAF",
  "iso2": "ZA",
  "num": 710,
  "nom": {
   "fr": "Afrique du Sud",
   "en": "South Africa",
   "es": "Sudáfrica",
   "pcm": "South Africa"
  },
  "continent": "afrique",
  "sousRegion": "Southern Africa",
  "superficie": 1221037,
  "population": 57779622,
  "enclave": false,
  "frontieres": [
   "BWA",
   "LSO",
   "MOZ",
   "NAM",
   "SWZ",
   "ZWE"
  ],
  "langues": [
   "afr",
   "eng",
   "nbl",
   "nso",
   "sot",
   "ssw",
   "tsn",
   "tso",
   "ven",
   "xho",
   "zul"
  ],
  "monnaies": [
   "ZAR"
  ],
  "lat": -29,
  "lng": 24
 },
 {
  "id": "ZMB",
  "iso2": "ZM",
  "num": 894,
  "nom": {
   "fr": "Zambie",
   "en": "Zambia",
   "es": "Zambia",
   "pcm": "Zambia"
  },
  "continent": "afrique",
  "sousRegion": "Eastern Africa",
  "superficie": 752612,
  "population": 17351822,
  "enclave": true,
  "frontieres": [
   "AGO",
   "BWA",
   "COD",
   "MWI",
   "MOZ",
   "NAM",
   "TZA",
   "ZWE"
  ],
  "langues": [
   "eng"
  ],
  "monnaies": [
   "ZMW"
  ],
  "lat": -15,
  "lng": 30
 },
 {
  "id": "ZWE",
  "iso2": "ZW",
  "num": 716,
  "nom": {
   "fr": "Zimbabwe",
   "en": "Zimbabwe",
   "es": "Zimbabue",
   "pcm": "Zimbabwe"
  },
  "continent": "afrique",
  "sousRegion": "Eastern Africa",
  "superficie": 390757,
  "population": 14439018,
  "enclave": true,
  "frontieres": [
   "BWA",
   "MOZ",
   "ZAF",
   "ZMB"
  ],
  "langues": [
   "bwg",
   "eng",
   "kck",
   "khi",
   "ndc",
   "nde",
   "nya",
   "sna",
   "sot",
   "toi",
   "tsn",
   "tso",
   "ven",
   "xho",
   "zib"
  ],
  "monnaies": [
   "BWP",
   "CNY",
   "EUR",
   "GBP",
   "INR",
   "JPY",
   "USD",
   "ZAR",
   "ZWB"
  ],
  "lat": -20,
  "lng": 30
 }
];

export const PAYS_PAR_ID: Record<string, Pays> = Object.fromEntries(PAYS.map((p) => [p.id, p]));

/** Le nom du pays dans la langue de l'écran ; repli anglais puis français. */
export function nomPays(id: string, locale: string): string {
  const p = PAYS_PAR_ID[id];
  if (!p) return id;
  return (p.nom as Record<string, string>)[locale] ?? p.nom.en;
}
