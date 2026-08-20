// GÉNÉRATEUR DE JOURNÉES — à lancer à la main, puis à commiter.
//
//   npx tsx scripts/pays-journees.ts
//
// Il produit `src/content/pays/journees.ts` : un stock de journées déjà
// validées, prêtes à sortir une par jour. Rien n'est généré à l'exécution du
// jeu — la spec (§9.1) demande une génération assistée et une publication
// contrôlée, pas un générateur autonome qui publie ce qu'il veut.
//
// LE PIPELINE, dans l'ordre de la spec (§6.2) :
//   1. on parcourt les combinaisons de cinq critères ;
//   2. on note les 193 pays ;
//   3. on ne garde que celles qui ont EXACTEMENT un 5/5 ;
//   4. on applique les filtres de qualité (`evalueJournee`) ;
//   5. on choisit la suite publiée en s'interdisant de se répéter.
//
// Le pays cible n'est JAMAIS choisi en premier : il tombe de l'intersection.
// C'est ce qui empêche de fabriquer un critère sur mesure pour l'isoler.
import { writeFileSync } from "fs";
import { CRITERES } from "../src/content/pays/criteres";
import { PAYS } from "../src/content/pays/referentiel";
import { DATA_VERSION } from "../src/content/pays/referentiel";
import { evalueJournee, NB_CRITERES } from "../src/lib/games/pays/moteur";

// --------------------------------------------------------------- bitsets
//
// 193 pays tiennent dans sept mots de 32 bits. L'intersection de cinq critères
// est alors sept `&` au lieu de 965 appels de fonction — ce qui fait la
// différence entre une exploration de quelques secondes et une de vingt
// minutes. Le gain n'est pas cosmétique : sans lui on n'explore pas assez pour
// que le stock soit varié.
const MOTS = Math.ceil(PAYS.length / 32);
const masque = (test: (i: number) => boolean) => {
  const m = new Uint32Array(MOTS);
  for (let i = 0; i < PAYS.length; i++) if (test(i)) m[i >> 5] |= 1 << (i & 31);
  return m;
};
const popcount = (m: Uint32Array) => {
  let n = 0;
  for (let w = 0; w < MOTS; w++) {
    let x = m[w];
    x = x - ((x >> 1) & 0x55555555);
    x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
    n += (((x + (x >> 4)) & 0x0f0f0f0f) * 0x01010101) >> 24;
  }
  return n;
};
const et = (a: Uint32Array, b: Uint32Array) => {
  const r = new Uint32Array(MOTS);
  for (let w = 0; w < MOTS; w++) r[w] = a[w] & b[w];
  return r;
};

const MASQUES = CRITERES.map((c) => masque((i) => c.verifie(PAYS[i])));

// ------------------------------------------------------- 1 à 4 : l'exploration
//
// Descente en profondeur sur les indices croissants, avec UNE coupe : dès que
// l'intersection courante est vide, aucun critère supplémentaire ne la
// remplira. Cette seule coupe fait tomber les 4,5 millions de combinaisons à
// quelques dizaines de milliers d'évaluations complètes.
const candidats: { ids: string[]; cible: string; note: number; distribution: number[]; diversite: number }[] = [];
let explorees = 0;

const descend = (debut: number, choisis: number[], inter: Uint32Array) => {
  if (choisis.length === NB_CRITERES) {
    explorees++;
    if (popcount(inter) !== 1) return;
    const ids = choisis.map((i) => CRITERES[i].id);
    const bilan = evalueJournee(ids);
    if (bilan.defauts.length || !bilan.cible) return;
    candidats.push({
      ids,
      cible: bilan.cible,
      note: bilan.note,
      distribution: bilan.distribution,
      diversite: bilan.diversiteQuasi,
    });
    return;
  }
  for (let i = debut; i < CRITERES.length; i++) {
    const suivant = et(inter, MASQUES[i]);
    // La coupe. Une intersection vide le reste quoi qu'on ajoute.
    if (popcount(suivant) === 0) continue;
    choisis.push(i);
    descend(i + 1, choisis, suivant);
    choisis.pop();
  }
};

const plein = new Uint32Array(MOTS);
for (let i = 0; i < PAYS.length; i++) plein[i >> 5] |= 1 << (i & 31);
descend(0, [], plein);

console.log(`combinaisons évaluées : ${explorees} → ${candidats.length} journées valides`);

// ------------------------------------------------------------ 5 : la sélection
//
// L'ANTI-RÉPÉTITION (§9.3). Une suite de journées toutes bonnes prises une à une
// peut être détestable : trente jours d'affilée « continent + population +
// langue » se ressent comme un seul puzzle joué trente fois. On choisit donc en
// pénalisant ce qui ressemble à ce qu'on vient de publier.
// ⚠️ LE REPOS SE COMPTE EN CRITÈRES DISPONIBLES, PAS EN JOURS SOUHAITÉS. Une
// journée consomme cinq critères sur cinquante-huit : un repos de six jours en
// gèle trente, et il ne reste pas de quoi former une combinaison valide — le
// stock s'arrêtait à six journées. Trois jours de repos laissent la marge.
// Dix emplois par critère : réglé À LA MESURE, pas au principe. À six, le stock
// tombe à 33 journées ; à dix, il en fait 53 pour la même note médiane et la
// même part de réemploi (un critère sert dans moins d'un jour sur cinq). C'est
// la longueur du stock qui gagne, sans que la variété perde rien.
const MAX_PAR_CRITERE = 10; // un critère ne porte pas le stock à lui seul // un critère ne porte pas le stock à lui seul
const REPOS_CRITERE = 3; // …et ne revient pas avant trois journées
const REPOS_CONTINENT = 3; // …ni deux fois le même continent coup sur coup
// Deux journées qui partagent trois critères sur cinq sont la même journée avec
// un autre vernis, même à six mois d'écart.
const COMMUNS_MAX = 2;

const parId = Object.fromEntries(PAYS.map((p) => [p.id, p]));

const journees: typeof candidats = [];
const ciblesPrises = new Set<string>();
const usagesCritere = new Map<string, number>();

/**
 * ⚠️ ON RE-BALAIE LA LISTE ENTIÈRE À CHAQUE JOURNÉE, au lieu de la parcourir une
 * fois. La première version faisait l'inverse et n'a produit que CINQ journées
 * sur huit mille candidates : une combinaison écartée parce qu'un de ses
 * critères venait de servir ne redevenait jamais éligible six jours plus tard,
 * alors que c'est précisément ce que la règle de repos autorise. Un critère
 * « pas maintenant » lu comme « jamais » vide le stock en silence.
 */
const admissible = (c: (typeof candidats)[number]) => {
  // Un même pays cible ne revient jamais : c'est la répétition qui se voit le
  // plus, et la seule qu'aucune variété de critères ne rattrape.
  if (ciblesPrises.has(c.cible)) return false;
  if (c.ids.some((id) => (usagesCritere.get(id) ?? 0) >= MAX_PAR_CRITERE)) return false;
  const recentes = journees.slice(-REPOS_CRITERE);
  if (c.ids.some((id) => recentes.some((j) => j.ids.includes(id)))) return false;
  const continent = parId[c.cible].continent;
  if (journees.slice(-REPOS_CONTINENT).some((j) => parId[j.cible].continent === continent)) return false;
  if (journees.some((j) => j.ids.filter((id) => c.ids.includes(id)).length > COMMUNS_MAX)) return false;
  return true;
};

for (;;) {
  let meilleure: (typeof candidats)[number] | null = null;
  for (const c of candidats) {
    if (!admissible(c)) continue;
    if (!meilleure || c.note > meilleure.note || (c.note === meilleure.note && c.cible < meilleure.cible)) meilleure = c;
  }
  if (!meilleure) break;
  journees.push(meilleure);
  ciblesPrises.add(meilleure.cible);
  for (const id of meilleure.ids) usagesCritere.set(id, (usagesCritere.get(id) ?? 0) + 1);
}

// ------------------------------------------------------- 6 : l'éditorialisation
//
// LE GÉNÉRATEUR CLASSE PAR NOTE, PAS PAR TROUVABILITÉ. Les deux ne coïncident
// pas : un pays rare est isolé par des critères rares, donc il produit un
// gradient superbe — et Tuvalu s'est retrouvé en deuxième journée. Excellent
// puzzle, porte fermée pour quelqu'un qui découvre le jeu la veille.
//
// Plutôt qu'un facteur de notoriété dans la note (qui déplacerait tout le stock
// pour un problème qui ne concerne que les premières journées), on déclare ici
// les déplacements décidés à la main, un par un. C'est court, c'est relu, et
// surtout c'est REJOUÉ : le fichier reste généré, et la décision vit dans le
// dépôt au lieu d'être une retouche invisible dans un fichier qui dit « ne pas
// modifier à la main ».
const REPORTS: Record<string, number> = {
  // Tuvalu : 193e pays du monde par population, en deuxième journée. Reporté au
  // quinzième jour, où un joueur régulier a pris l'habitude des sondes larges.
  TUV: 15,
};

for (const [cible, place] of Object.entries(REPORTS)) {
  const k = journees.findIndex((j) => j.cible === cible);
  if (k < 0) throw new Error(`report impossible : ${cible} n'est pas dans le stock`);
  const [dehors] = journees.splice(k, 1);
  journees.splice(Math.min(place - 1, journees.length), 0, dehors);
}

// ⚠️ UN DÉPLACEMENT PEUT CASSER L'ALTERNANCE DES CONTINENTS, qui était tenue par
// la sélection. On la revérifie donc APRÈS coup, et on refuse de produire un
// stock où deux journées de suite servent la même région : c'est la répétition
// qui se voit le plus vite.
for (let i = 1; i < journees.length; i++) {
  const avant = parId[journees[i - 1].cible].continent;
  const apres = parId[journees[i].cible].continent;
  if (avant === apres) {
    throw new Error(`journées ${i} et ${i + 1} : deux fois ${apres} — revoir REPORTS`);
  }
}

// ----------------------------------------------------------------- écriture
const parContinent = new Map<string, number>();
for (const j of journees) {
  const k = parId[j.cible].continent;
  parContinent.set(k, (parContinent.get(k) ?? 0) + 1);
}

const lignes = journees
  .map(
    (j) =>
      `  { criteres: [${j.ids.map((i) => `"${i}"`).join(", ")}], cible: "${j.cible}",` +
      ` distribution: [${j.distribution.join(", ")}], note: ${j.note} },`,
  )
  .join("\n");

writeFileSync(
  "src/content/pays/journees.ts",
  `// ⚠️ FICHIER GÉNÉRÉ — ne pas modifier à la main.
// Produit par \`npx tsx scripts/pays-journees.ts\` (voir l'en-tête du script).
//
// ⚠️ IL CONTIENT LA RÉPONSE DE CHAQUE JOURNÉE. Comme \`criteres.ts\`, il ne doit
// être importé que depuis le serveur — un \`import\` dans un composant client
// livrerait le stock entier dans le bundle, et le jeu n'aurait plus de secret.
//
// Chaque journée a déjà passé \`evalueJournee\` sans un seul défaut ; le test
// \`journees.test.ts\` le rejoue à chaque \`npm test\`, parce qu'une donnée qui
// change sous un puzzle publié est exactement le genre de panne qu'on ne voit
// pas venir.
//
// Version des données : ${DATA_VERSION}

export interface Journee {
  /** Les cinq critères, dans l'ordre où ils seront révélés. */
  criteres: string[];
  /** LA réponse. Unique par construction. */
  cible: string;
  /** \`[0/5, 1/5, … 5/5]\` au moment de la génération. */
  distribution: number[];
  /** Note éditoriale interne, 0-100. Jamais montrée au joueur. */
  note: number;
}

export const JOURNEES: Journee[] = [
${lignes}
];
`,
);

console.log(`✓ ${journees.length} journées publiables`);
console.log(`  cibles par continent : ${[...parContinent].map(([k, n]) => `${k} ${n}`).join(", ")}`);
console.log(`  note médiane : ${journees[Math.floor(journees.length / 2)]?.note}`);
console.log(`  critères employés : ${usagesCritere.size} / ${CRITERES.length}`);
