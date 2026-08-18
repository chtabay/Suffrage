// GÉNÉRATEUR DU RÉFÉRENTIEL « PAYS DU JOUR » — à lancer À LA MAIN, rarement.
//
// Il produit DEUX fichiers versionnés, qui sont ensuite la seule vérité du jeu :
//
//   src/content/pays/referentiel.ts  les 193 États membres de l'ONU et leurs
//                                    propriétés stables (surface, population,
//                                    langues, frontières, monnaie…) ;
//   src/content/pays/carte.ts        les tracés SVG de la carte, projetés une
//                                    fois pour toutes.
//
// ⚠️ POURQUOI GÉNÉRER PLUTÔT QUE DÉPENDRE. Les paquets lus ici (world-atlas,
// world-countries, country-json) ne sont PAS des dépendances de l'application :
// ils ne sont installés que le jour où l'on régénère. Deux raisons.
//   · Reproductibilité : une journée publiée en mars doit rester rejouable et
//     explicable en octobre. Une donnée qui bouge sous les pieds d'un puzzle
//     déjà publié en fait un puzzle faux — pas un puzzle à jour.
//   · Poids : la carte projetée une fois coûte quelques centaines de kilo-octets
//     de chaînes ; la projeter dans le navigateur coûterait d3-geo + topojson à
//     chaque visite, pour un résultat identique à la virgule près.
//
// POUR RÉGÉNÉRER :
//   npm install --no-save world-atlas@2 topojson-client@3 d3-geo@3 \
//                         world-countries@5 country-json@1
//   node scripts/pays-referentiel.mjs
//   npm run build && npm test
//
// Et il faut alors RELIRE les journées déjà publiées : `data_version` change,
// donc les scores peuvent changer. C'est précisément ce que ce fichier rend
// visible au lieu de le laisser arriver en silence.
import { writeFileSync } from "fs";
import { feature } from "topojson-client";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const topo = require("world-atlas/countries-110m.json");
const monde = require("world-countries");
const popRows = require("country-json/src/country-by-population.json");

/** Version des DONNÉES, à incrémenter dès qu'une valeur d'ici change. */
const DATA_VERSION = "2026.08-un193";

// ---------------------------------------------------------------- référentiel
//
// LA CONVENTION, une fois pour toutes : **les 193 États membres de l'ONU**, ni
// plus ni moins.
//
// Ce que cela EXCLUT, volontairement : le Vatican et la Palestine (observateurs,
// pas membres), Taïwan, le Kosovo, le Sahara occidental, le Somaliland, Chypre
// du Nord, et tous les territoires dépendants (Groenland, Porto Rico, Nouvelle-
// Calédonie…). Le critère « pays reconnu » est le seul qui ne demande à personne
// d'arbitrer un différend territorial en écrivant un jeu de géographie — et un
// jeu qui tranche une frontière contestée dans son barème perd le droit de dire
// que ses critères sont objectivement vérifiables (voir la spec, §5.4).
//
// ⚠️ world-countries marque `unMember: true` sur le Vatican, ce qui est faux :
// le Saint-Siège est État observateur permanent depuis 1964, jamais membre.
// D'où le retrait explicite ci-dessous — sans lui le référentiel compterait 194.
const HORS = new Set(["VAT"]);
const REF = monde.filter((c) => c.unMember && !HORS.has(c.cca3)).sort((a, b) => a.cca3.localeCompare(b.cca3));
if (REF.length !== 193) throw new Error(`référentiel : ${REF.length} pays au lieu de 193`);

// country-json est indexé par NOM ANGLAIS, pas par code. Sa propre table ISO
// numérique semblait la bonne charnière : elle ne l'est pas — dix États du
// référentiel n'y figurent tout simplement pas (dont la Russie et le
// Kazakhstan). On rapproche donc par le nom, en acceptant TOUTES les variantes
// que world-countries connaît (nom courant, nom officiel, graphies alternatives,
// noms natifs). Il reste quatre exonymes datés qu'aucune variante ne couvre :
// les voici, nommés, plutôt qu'un silence sur quatre pays.
const ALIAS = {
  "The Democratic Republic of Congo": "COD",
  "Fiji Islands": "FJI",
  "Libyan Arab Jamahiriya": "LBY",
  Turkey: "TUR",
};

const sansAccent = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");

const idParNom = new Map();
for (const c of REF) {
  const variantes = [
    c.name.common,
    c.name.official,
    ...(c.altSpellings ?? []),
    ...Object.values(c.name.nativeName ?? {}).flatMap((v) => [v.common, v.official]),
  ];
  for (const v of variantes) if (v && !idParNom.has(sansAccent(v))) idParNom.set(sansAccent(v), c.cca3);
}
for (const [nom, id] of Object.entries(ALIAS)) idParNom.set(sansAccent(nom), id);

/** Range une table `[{country, valeur}]` de country-json par code alpha-3. */
const parId = (rows, champ) => {
  const out = new Map();
  for (const r of rows) {
    const id = idParNom.get(sansAccent(r.country));
    // Première occurrence gagnante : les doublons de country-json sont des
    // territoires rattachés, jamais l'État lui-même.
    if (id && !out.has(id) && r[champ] !== null && r[champ] !== undefined) out.set(id, r[champ]);
  }
  return out;
};

const popParId = parId(popRows, "population");

// ⚠️ CE QU'ON N'A PAS PRIS. country-json porte aussi une longueur de côtes : elle
// est inutilisable telle quelle — la France y vaut `null` et le Brésil `7.491`,
// c'est-à-dire 7 491 km dont le séparateur de milliers s'est perdu en route. Un
// critère « plus de 3 000 km de côtes » bâti là-dessus serait faux sur un pays
// sur trois sans que rien ne le dise. On s'en tient à `enclave`, qui est un
// booléen et qu'on peut vérifier à l'œil sur une carte.

// CONTINENT — découpage géographique standard de l'ONU (M49), celui que porte
// world-countries dans `region`/`subregion`. On ne l'invente pas : Chypre en
// Asie occidentale et l'Égypte en Afrique du Nord sont les rangements de l'ONU,
// pas une opinion du jeu. Les trois Amériques de l'ONU (Nord, centrale,
// Caraïbes) sont réunies en une seule, parce que « Amérique du Nord » désigne
// pour un joueur le continent, pas la sous-région.
const CONTINENT = {
  Africa: "afrique",
  Europe: "europe",
  Asia: "asie",
  Oceania: "oceanie",
};
const continentDe = (c) =>
  c.region === "Americas"
    ? c.subregion === "South America"
      ? "amerique-sud"
      : "amerique-nord"
    : (CONTINENT[c.region] ?? "");

/** Valeur de country-json pour un pays du référentiel, ou null si absente. */
const joint = (c, table) => table.get(c.cca3) ?? null;

const pays = REF.map((c) => ({
  id: c.cca3,
  iso2: c.cca2,
  num: Number(c.ccn3),
  nom: {
    fr: c.translations.fra?.common ?? c.name.common,
    en: c.name.common,
    es: c.translations.spa?.common ?? c.name.common,
    // Le pidgin nigérian n'a pas de nomenclature de pays qui lui soit propre :
    // les noms anglais sont ceux qu'on lit au Nigeria. On ne recopie l'anglais
    // QUE là où recopier est la bonne réponse — les libellés de critères, eux,
    // sont écrits en pidgin.
    pcm: c.name.common,
  },
  continent: continentDe(c),
  sousRegion: c.subregion ?? "",
  superficie: c.area,
  population: joint(c, popParId),
  enclave: c.landlocked,
  // Les frontières sont données en cca3 ; on écarte celles qui pointent hors
  // référentiel (Kosovo…) pour que « compte ses voisins » reste comptable dans
  // le monde du jeu. La règle est dite ici, pas devinée par le moteur.
  frontieres: c.borders.filter((b) => REF.some((r) => r.cca3 === b)),
  langues: Object.keys(c.languages ?? {}),
  monnaies: Object.keys(c.currencies ?? {}),
  lat: c.latlng[0],
  lng: c.latlng[1],
}));

const sansPop = pays.filter((p) => p.population === null).map((p) => p.id);
if (sansPop.length) throw new Error(`population manquante : ${sansPop.join(", ")}`);
const sansContinent = pays.filter((p) => !p.continent).map((p) => p.id);
if (sansContinent.length) throw new Error(`continent manquant : ${sansContinent.join(", ")}`);

// ---------------------------------------------------------------------- carte
//
// PROJECTION : Natural Earth I. Ni Mercator (qui offre le Groenland à
// l'Afrique et rend illisible tout jeu où la taille compte), ni une équi-
// rectangulaire (qui étire les pôles en bandes). Natural Earth est le compromis
// que les atlas ont retenu pour les cartes du monde entier.
//
// La carte fait 1000 × 500 unités ; le composant la met à l'échelle. Les
// coordonnées sont arrondies au dixième d'unité — soit un vingtième de pixel sur
// un téléphone. En dessous, on paierait des décimales que personne ne voit.
const LARGEUR = 1000;
const HAUTEUR = 500;
const fc = feature(topo, topo.objects.countries);
const projection = geoNaturalEarth1().fitSize([LARGEUR, HAUTEUR], { type: "Sphere" });
const chemin = geoPath(projection);
const arrondi = (d) => d.replace(/-?\d+(\.\d+)?/g, (n) => String(Math.round(Number(n) * 10) / 10));

const parNum = new Map(pays.map((p) => [p.num, p]));
const traces = {};
const decors = [];
/** Aire RENDUE (unités² de la boîte 1000 × 500), par code alpha-3. */
const aires = {};
for (const f of fc.features) {
  const d = chemin(f);
  if (!d) continue;
  const p = parNum.get(Number(f.id));
  if (p) {
    traces[p.id] = arrondi(d);
    aires[p.id] = chemin.area(f);
  }
  // Ce qui n'est pas dans le référentiel n'est pas pour autant effacé de la
  // carte : l'Antarctique, le Groenland ou le Sahara occidental absents
  // feraient une carte trouée, et un trou se lit comme une information. Ces
  // formes sont dessinées en fond neutre et ne réagissent à rien.
  else decors.push(arrondi(d));
}

// LES PAYS QU'ON NE PEUT PAS CLIQUER. Natural Earth 110m ne porte pas les 29
// plus petits États (Singapour, Malte, Maurice, les Caraïbes, le Pacifique…) et
// en dessine d'autres à un ou deux pixels. Sans eux, un tiers du monde serait
// injouable à la carte — or le jeu promet 193 pays, pas 164.
//
// D'où une seconde couche : un POINT à la position du pays, dessiné par-dessus
// les tracés, avec une cible tactile confortable. Le point n'est pas un pis-
// aller graphique, c'est la seule façon de tenir la promesse sur un téléphone.
const AIRE_MIN = 12; // unités² ≈ un carré de 3,5 unités de côté
const points = {};
for (const p of pays) {
  if ((aires[p.id] ?? 0) >= AIRE_MIN) continue;
  const xy = projection([p.lng, p.lat]);
  if (!xy) continue;
  points[p.id] = [Math.round(xy[0] * 10) / 10, Math.round(xy[1] * 10) / 10];
}

// -------------------------------------------------------------------- écriture
const entete = (quoi) => `// ⚠️ FICHIER GÉNÉRÉ — ne pas modifier à la main.
// Produit par \`node scripts/pays-referentiel.mjs\` (voir l'en-tête du script).
// ${quoi}
// Version des données : ${DATA_VERSION}
`;

writeFileSync(
  "src/content/pays/referentiel.ts",
  `${entete("Les 193 États membres de l'ONU et leurs propriétés stables.")}
/** Une propriété non renseignée vaut \`null\` — jamais 0, qui serait une valeur. */
export interface Pays {
  /** ISO 3166-1 alpha-3. C'est LUI l'identifiant, jamais la géométrie. */
  id: string;
  iso2: string;
  num: number;
  nom: { fr: string; en: string; es: string; pcm: string };
  /** \`afrique\` | \`amerique-nord\` | \`amerique-sud\` | \`asie\` | \`europe\` | \`oceanie\` (ONU M49). */
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

export const DATA_VERSION = ${JSON.stringify(DATA_VERSION)};

export const PAYS: Pays[] = ${JSON.stringify(pays, null, 1)};

export const PAYS_PAR_ID: Record<string, Pays> = Object.fromEntries(PAYS.map((p) => [p.id, p]));

/** Le nom du pays dans la langue de l'écran ; repli anglais puis français. */
export function nomPays(id: string, locale: string): string {
  const p = PAYS_PAR_ID[id];
  if (!p) return id;
  return (p.nom as Record<string, string>)[locale] ?? p.nom.en;
}
`,
);

writeFileSync(
  "src/content/pays/carte.ts",
  `${entete("Carte du monde, projection Natural Earth I, boîte 1000 × 500.")}
/** Source : Natural Earth 110m (domaine public) via world-atlas. */
export const CARTE_LARGEUR = ${LARGEUR};
export const CARTE_HAUTEUR = ${HAUTEUR};

/** Tracé SVG par code ISO 3166-1 alpha-3. */
export const TRACES: Record<string, string> = ${JSON.stringify(traces, null, 0)};

/**
 * Les États trop petits pour être visés au doigt (ou absents du fond 110m) :
 * un point cliquable, dessiné par-dessus les tracés.
 */
export const POINTS: Record<string, [number, number]> = ${JSON.stringify(points, null, 0)};

/** Terres hors référentiel (Antarctique, Groenland, territoires…) : décor inerte. */
export const DECORS: string[] = ${JSON.stringify(decors, null, 0)};
`,
);

console.log(
  `✓ référentiel : ${pays.length} pays · ${Object.keys(traces).length} tracés · ` +
    `${Object.keys(points).length} points · ${decors.length} formes de décor`,
);
