// ⚠️ FICHIER GÉNÉRÉ — ne pas modifier à la main.
// Produit par `npx tsx scripts/pays-journees.ts` (voir l'en-tête du script).
//
// ⚠️ IL CONTIENT LA RÉPONSE DE CHAQUE JOURNÉE. Comme `criteres.ts`, il ne doit
// être importé que depuis le serveur — un `import` dans un composant client
// livrerait le stock entier dans le bundle, et le jeu n'aurait plus de secret.
//
// Chaque journée a déjà passé `evalueJournee` sans un seul défaut ; le test
// `journees.test.ts` le rejoue à chaque `npm test`, parce qu'une donnée qui
// change sous un puzzle publié est exactement le genre de panne qu'on ne voit
// pas venir.
//
// Version des données : 2026.08-un193

export interface Journee {
  /** Les cinq critères, dans l'ordre où ils seront révélés. */
  criteres: string[];
  /** LA réponse. Unique par construction. */
  cible: string;
  /** `[0/5, 1/5, … 5/5]` au moment de la génération. */
  distribution: number[];
  /** Note éditoriale interne, 0-100. Jamais montrée au joueur. */
  note: number;
}

export const JOURNEES: Journee[] = [
  { criteres: ["g20", "opec-hors", "sup-1m", "tropiques", "voisins-5"], cible: "BRA", distribution: [49, 95, 25, 17, 6, 1], note: 100 },
  { criteres: ["cafe", "conduite-gauche", "hemisphere-sud", "langue-eng", "pop-50m"], cible: "TZA", distribution: [85, 50, 31, 21, 5, 1], note: 100 },
  { criteres: ["continent-europe", "mediterranee", "pop-moins-2m", "sans-armee", "sup-moins-30k"], cible: "MCO", distribution: [91, 46, 34, 15, 6, 1], note: 89 },
  { criteres: ["continent-asie", "independance-1990", "opec-hors", "pop-8m", "sup-400k"], cible: "KAZ", distribution: [56, 57, 52, 21, 6, 1], note: 99 },
  { criteres: ["continent-amerique-nord", "insulaire", "langue-plusieurs", "royaume-commonwealth", "tropiques"], cible: "JAM", distribution: [54, 65, 42, 24, 7, 1], note: 92 },
  { criteres: ["conduite-gauche", "continent-afrique", "langue-eng", "sup-1m", "voisins-5"], cible: "ZAF", distribution: [57, 55, 55, 19, 6, 1], note: 99 },
  { criteres: ["continent-europe", "densite-100", "jo-ete", "meridien-greenwich", "monnaie-euro"], cible: "FRA", distribution: [82, 73, 19, 12, 6, 1], note: 97 },
  { criteres: ["continent-asie", "langue-ara", "opec-hors", "pop-20m", "tropique-cancer"], cible: "SAU", distribution: [101, 46, 30, 10, 5, 1], note: 91 },
  { criteres: ["langue-plusieurs", "sans-armee", "sup-moins-30k", "tropiques", "voisin-unique"], cible: "HTI", distribution: [43, 71, 46, 26, 6, 1], note: 88 },
  { criteres: ["cafe", "continent-afrique", "equateur", "sup-400k", "voisins-5"], cible: "KEN", distribution: [81, 57, 29, 19, 6, 1], note: 100 },
  { criteres: ["continent-europe", "jo-ete", "latitude-haute-nord", "otan", "royaume-commonwealth"], cible: "GBR", distribution: [126, 27, 14, 18, 7, 1], note: 93 },
  { criteres: ["conduite-gauche", "continent-asie", "enclave", "pop-8m", "voisin-chn"], cible: "NPL", distribution: [39, 85, 44, 18, 6, 1], note: 98 },
  { criteres: ["archipel-etat", "densite-100", "monnaie-usd", "sans-armee", "tropiques"], cible: "MHL", distribution: [48, 84, 33, 20, 7, 1], note: 95 },
  { criteres: ["commonwealth", "continent-afrique", "langue-eng", "meridien-greenwich", "pop-20m"], cible: "GHA", distribution: [69, 51, 45, 20, 7, 1], note: 90 },
  { criteres: ["archipel-etat", "continent-oceanie", "densite-100", "langue-plusieurs", "royaume-commonwealth"], cible: "TUV", distribution: [62, 79, 28, 17, 6, 1], note: 100 },
  { criteres: ["continent-europe", "independance-1990", "latitude-haute-nord", "opec-hors", "voisins-5"], cible: "RUS", distribution: [89, 56, 27, 15, 5, 1], note: 90 },
  { criteres: ["cafe", "conduite-gauche", "continent-asie", "langue-plusieurs", "sup-400k"], cible: "IND", distribution: [46, 69, 56, 16, 5, 1], note: 97 },
  { criteres: ["continent-oceanie", "densite-100", "equateur", "insulaire", "pop-moins-2m"], cible: "KIR", distribution: [80, 69, 17, 19, 7, 1], note: 84 },
  { criteres: ["continent-afrique", "langue-fra", "meridien-greenwich", "pop-8m", "sup-1m"], cible: "MLI", distribution: [67, 61, 42, 17, 5, 1], note: 93 },
  { criteres: ["baltique-mer-noire", "continent-europe", "latitude-haute-nord", "monnaie-euro", "unesco-25"], cible: "DEU", distribution: [137, 16, 17, 16, 6, 1], note: 81 },
  { criteres: ["commonwealth", "conduite-gauche", "continent-asie", "pop-20m", "voisin-unique"], cible: "LKA", distribution: [66, 56, 47, 17, 6, 1], note: 97 },
  { criteres: ["opec-hors", "pop-50m", "sup-400k", "tropique-cancer", "tropiques"], cible: "MEX", distribution: [53, 87, 29, 18, 5, 1], note: 94 },
  { criteres: ["danube-nil-mekong", "enclave", "gorilles", "pop-8m", "voisins-5"], cible: "UGA", distribution: [68, 57, 35, 26, 6, 1], note: 99 },
  { criteres: ["baltique-mer-noire", "continent-europe", "densite-100", "otan", "voisin-rus"], cible: "POL", distribution: [86, 62, 21, 17, 6, 1], note: 76 },
  { criteres: ["archipel-etat", "conduite-gauche", "continent-asie", "equateur", "insulaire"], cible: "MDV", distribution: [90, 54, 24, 21, 3, 1], note: 87 },
  { criteres: ["continent-amerique-sud", "langue-spa", "opec-hors", "pop-20m", "sup-400k"], cible: "COL", distribution: [99, 46, 29, 13, 5, 1], note: 89 },
  { criteres: ["commonwealth", "enclave", "gorilles", "hemisphere-sud", "langue-eng"], cible: "RWA", distribution: [78, 57, 32, 19, 6, 1], note: 88 },
  { criteres: ["continent-europe", "danube-nil-mekong", "latitude-haute-nord", "pop-8m", "voisin-rus"], cible: "UKR", distribution: [65, 73, 30, 18, 6, 1], note: 77 },
  { criteres: ["conduite-gauche", "independance-1990", "langue-plusieurs", "monnaie-usd", "tropiques"], cible: "TLS", distribution: [39, 67, 62, 20, 4, 1], note: 92 },
  { criteres: ["continent-amerique-nord", "g20", "opec-hors", "otan", "pop-50m"], cible: "USA", distribution: [107, 66, 9, 8, 2, 1], note: 71 },
  { criteres: ["archipel-etat", "continent-afrique", "equateur", "pop-moins-2m", "sup-moins-30k"], cible: "STP", distribution: [80, 60, 25, 21, 6, 1], note: 93 },
  { criteres: ["hemisphere-sud", "jo-ete", "pop-8m", "royaume-commonwealth", "sup-400k"], cible: "AUS", distribution: [60, 63, 47, 19, 3, 1], note: 87 },
  { criteres: ["conduite-gauche", "continent-asie", "danube-nil-mekong", "densite-100", "tropiques"], cible: "THA", distribution: [24, 76, 54, 31, 7, 1], note: 85 },
  { criteres: ["enclave", "independance-1990", "langue-plusieurs", "latitude-haute-nord", "otan"], cible: "CZE", distribution: [71, 61, 38, 18, 4, 1], note: 75 },
  { criteres: ["continent-afrique", "mediterranee", "opec-hors", "pop-20m", "sup-1m"], cible: "DZA", distribution: [80, 70, 23, 17, 2, 1], note: 75 },
  { criteres: ["cafe", "hemisphere-sud", "langue-spa", "pop-8m", "voisins-5"], cible: "PER", distribution: [61, 59, 51, 16, 5, 1], note: 77 },
  { criteres: ["conduite-gauche", "continent-asie", "g20", "jo-ete", "pop-50m"], cible: "JPN", distribution: [88, 70, 16, 13, 5, 1], note: 89 },
  { criteres: ["continent-europe", "danube-nil-mekong", "enclave", "monnaie-euro", "otan"], cible: "SVK", distribution: [105, 39, 22, 21, 5, 1], note: 75 },
  { criteres: ["continent-afrique", "langue-fra", "opep", "pop-moins-2m", "tropiques"], cible: "GNQ", distribution: [58, 57, 51, 20, 6, 1], note: 79 },
  { criteres: ["continent-amerique-sud", "langue-plusieurs", "mondial-organise", "pop-8m", "voisins-5"], cible: "ARG", distribution: [46, 68, 53, 20, 5, 1], note: 81 },
  { criteres: ["conduite-gauche", "equateur", "hemisphere-sud", "pop-20m", "sup-400k"], cible: "IDN", distribution: [75, 43, 54, 14, 6, 1], note: 89 },
  { criteres: ["continent-europe", "densite-100", "enclave", "sans-armee", "voisin-unique"], cible: "SMR", distribution: [57, 88, 34, 10, 3, 1], note: 72 },
  { criteres: ["langue-spa", "pop-moins-2m", "royaume-commonwealth", "sup-moins-30k", "tropiques"], cible: "BLZ", distribution: [59, 68, 33, 24, 8, 1], note: 82 },
  { criteres: ["continent-afrique", "danube-nil-mekong", "langue-eng", "mer-rouge", "pop-8m"], cible: "SDN", distribution: [39, 88, 47, 11, 7, 1], note: 72 },
  { criteres: ["cafe", "continent-asie", "opec-hors", "pop-50m", "voisins-5"], cible: "CHN", distribution: [92, 57, 26, 14, 3, 1], note: 87 },
  { criteres: ["archipel-etat", "commonwealth", "continent-oceanie", "insulaire", "langue-fra"], cible: "VUT", distribution: [103, 48, 16, 15, 10, 1], note: 58 },
  { criteres: ["opep", "pop-20m", "sup-400k", "tropiques", "voisin-bra"], cible: "VEN", distribution: [52, 75, 38, 24, 3, 1], note: 63 },
  { criteres: ["continent-afrique", "danube-nil-mekong", "equateur", "langue-plusieurs", "sup-1m"], cible: "COD", distribution: [64, 79, 36, 10, 3, 1], note: 77 },
  { criteres: ["continent-asie", "densite-100", "mondial-organise", "pop-8m", "voisin-unique"], cible: "KOR", distribution: [42, 75, 49, 22, 4, 1], note: 75 },
  { criteres: ["archipel-etat", "continent-amerique-nord", "insulaire", "monnaie-usd", "pop-moins-2m"], cible: "BHS", distribution: [121, 32, 13, 17, 9, 1], note: 64 },
  { criteres: ["cafe", "commonwealth", "continent-oceanie", "hemisphere-sud", "sup-400k"], cible: "PNG", distribution: [74, 75, 23, 18, 2, 1], note: 61 },
];
