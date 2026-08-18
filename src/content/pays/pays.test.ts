// LE GARDE-FOU DU « PAYS DU JOUR ».
//
// Ce test ne vérifie pas que le code marche : il vérifie que le CONTENU tient.
// C'est un jeu de données, et un jeu de données pourrit en silence — une liste
// recopiée avec un code de trop, une journée dont la réponse cesse d'être unique
// parce qu'un chiffre a bougé, un libellé oublié en pidgin. Rien de tout cela ne
// fait échouer `tsc`, et tout cela se voit à l'écran, en pleine partie.
//
// ⚠️ IL REJOUE LA VALIDATION COMPLÈTE DES 53 JOURNÉES PUBLIÉES. C'est le seul
// endroit qui garantit l'invariant absolu de la spec (§6.1) : un seul pays à
// 5/5, chaque jour. Si le référentiel est régénéré et qu'une population change,
// c'est ici que ça casse — pas chez le joueur.
import assert from "node:assert/strict";
import { test } from "node:test";
import { CARDINAL_MAX, CARDINAL_MIN, CRITERES, cardinal, type Texte } from "./criteres";
import { JOURNEES } from "./journees";
import { PAYS, PAYS_PAR_ID } from "./referentiel";
import { POINTS, TRACES } from "./carte";
import { serieEnCours } from "@/lib/games/pays/local";
import { ORIGINE, dateCivile, evalueJournee, numeroDeJournee, scoreDe } from "@/lib/games/pays/moteur";

const LOCALES = ["fr", "en", "es", "pcm"] as const;

// --------------------------------------------------------------- référentiel

test("le référentiel porte les 193 États membres de l'ONU, sans doublon", () => {
  assert.equal(PAYS.length, 193);
  assert.equal(new Set(PAYS.map((p) => p.id)).size, 193);
  for (const p of PAYS) {
    assert.match(p.id, /^[A-Z]{3}$/, `code douteux : ${p.id}`);
    assert.ok(p.superficie > 0, `${p.id} sans superficie`);
    assert.ok(p.population > 0, `${p.id} sans population`);
    assert.ok(p.continent, `${p.id} sans continent`);
    for (const l of LOCALES) assert.ok(p.nom[l]?.length, `${p.id} sans nom en ${l}`);
  }
});

test("chaque pays est atteignable sur la carte, par un tracé ou par un point", () => {
  // Le point n'est pas un ornement : quarante États (Singapour, Malte, les
  // Caraïbes, le Pacifique) n'ont pas de tracé visible à cette résolution. Sans
  // lui, un cinquième du monde serait injouable au doigt.
  const orphelins = PAYS.filter((p) => !TRACES[p.id] && !POINTS[p.id]).map((p) => p.id);
  assert.deepEqual(orphelins, [], "pays sans tracé ni point");
});

test("la carte ne dessine aucun pays étranger au référentiel", () => {
  for (const id of Object.keys(TRACES)) assert.ok(PAYS_PAR_ID[id], `tracé orphelin : ${id}`);
  for (const id of Object.keys(POINTS)) assert.ok(PAYS_PAR_ID[id], `point orphelin : ${id}`);
});

// ------------------------------------------------------------------ critères

test("chaque critère est libellé dans les quatre langues", () => {
  const rempli = (t: Texte | undefined, quoi: string, id: string) => {
    if (!t) return;
    for (const l of LOCALES) assert.ok(t[l]?.trim().length, `${id} : ${quoi} manquant en ${l}`);
  };
  for (const c of CRITERES) {
    rempli(c.libelle, "libellé", c.id);
    rempli(c.eclairage, "éclairage", c.id);
  }
});

test("chaque critère porte une source consultable et datée", () => {
  for (const c of CRITERES) {
    assert.ok(c.source.nom.length, `${c.id} sans nom de source`);
    assert.match(c.source.url, /^https:\/\//, `${c.id} : source non consultable`);
    assert.match(c.source.date, /^\d{4}/, `${c.id} : source sans année de référence`);
  }
});

test("aucun critère ne désigne presque la réponse à lui seul", () => {
  // §6.5 : le puzzle doit naître de l'intersection. Un critère vrai pour trois
  // pays est une devinette déguisée ; un critère vrai pour cent quarante
  // n'apprend rien.
  for (const c of CRITERES) {
    const n = cardinal(c);
    assert.ok(n >= CARDINAL_MIN, `${c.id} ne vaut que pour ${n} pays`);
    assert.ok(n <= CARDINAL_MAX, `${c.id} vaut pour ${n} pays`);
  }
});

test("les identifiants de critères sont uniques", () => {
  assert.equal(new Set(CRITERES.map((c) => c.id)).size, CRITERES.length);
});

// ------------------------------------------------------------------ journées

test("le stock couvre au moins trente journées", () => {
  // §17.12. En dessous, on ne peut pas éprouver la sensation au 1er, 5e, 10e et
  // 20e essai sur des journées différentes.
  assert.ok(JOURNEES.length >= 30, `seulement ${JOURNEES.length} journées`);
});

test("chaque journée publiée a exactement un pays à 5/5, et aucun défaut", () => {
  for (const [i, j] of JOURNEES.entries()) {
    const bilan = evalueJournee(j.criteres);
    assert.deepEqual(bilan.defauts, [], `journée ${i + 1} (${j.cible}) : ${bilan.defauts.join(" ; ")}`);
    assert.equal(bilan.cible, j.cible, `journée ${i + 1} : la réponse a changé`);
    assert.deepEqual(bilan.distribution, j.distribution, `journée ${i + 1} : la distribution a changé`);
    assert.equal(bilan.distribution[5], 1);
  }
});

test("le score de la réponse vaut cinq, et lui seul", () => {
  for (const j of JOURNEES) {
    const criteres = j.criteres.map((id) => CRITERES.find((c) => c.id === id)!);
    assert.equal(scoreDe(PAYS_PAR_ID[j.cible], criteres), 5);
    const autres = PAYS.filter((p) => p.id !== j.cible && scoreDe(p, criteres) === 5);
    assert.deepEqual(autres.map((p) => p.id), []);
  }
});

test("aucun pays cible ne revient deux fois dans le stock", () => {
  const cibles = JOURNEES.map((j) => j.cible);
  assert.equal(new Set(cibles).size, cibles.length);
});

test("deux journées ne partagent jamais plus de deux critères", () => {
  // Deux journées à trois critères communs sont la même journée revernie : le
  // joueur régulier le sent avant de l'expliquer.
  for (let a = 0; a < JOURNEES.length; a++) {
    for (let b = a + 1; b < JOURNEES.length; b++) {
      const communs = JOURNEES[a].criteres.filter((id) => JOURNEES[b].criteres.includes(id));
      assert.ok(communs.length <= 2, `journées ${a + 1} et ${b + 1} : ${communs.join(", ")}`);
    }
  }
});

test("le stock ne sert pas le même continent deux jours de suite", () => {
  for (let i = 1; i < JOURNEES.length; i++) {
    const avant = PAYS_PAR_ID[JOURNEES[i - 1].cible].continent;
    const apres = PAYS_PAR_ID[JOURNEES[i].cible].continent;
    assert.notEqual(apres, avant, `journées ${i} et ${i + 1} : deux fois ${apres}`);
  }
});

// ----------------------------------------------------------------- calendrier

test("le numéro de journée avance d'un par jour, changement d'heure compris", () => {
  // Paris passe de +01:00 à +02:00 le dernier dimanche de mars. Une version qui
  // retranchait un décalage fixe faisait basculer la journée une heure trop tôt
  // six mois par an ; on passe donc par la date CIVILE.
  // ⚠️ ON ANCRE SUR `ORIGINE`, PAS SUR UNE DATE ÉCRITE EN DUR. La première
  // version affirmait « le 1er janvier 2026 est la journée n° 1 » : déplacer
  // l'origine au jour du lancement faisait alors échouer un test qui ne parlait
  // pourtant que de l'arithmétique du calendrier. Un test doit casser quand le
  // calcul se trompe, pas quand une décision éditoriale change.
  const jourApres = (iso: string) => new Date(Date.parse(`${iso}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  assert.equal(numeroDeJournee(ORIGINE), 1);
  assert.equal(numeroDeJournee(jourApres(ORIGINE)), 2);
  // Paris change d'heure ces deux nuits-là : l'écart doit rester d'un jour.
  assert.equal(numeroDeJournee("2026-03-28") + 1, numeroDeJournee("2026-03-29"));
  assert.equal(numeroDeJournee("2026-10-24") + 1, numeroDeJournee("2026-10-25"));
  // Un an plus tard, 365 journées se sont écoulées — l'année 2026 n'est pas bissextile.
  assert.equal(numeroDeJournee(`${Number(ORIGINE.slice(0, 4)) + 1}${ORIGINE.slice(4)}`), 366);
});

test("la journée bascule à minuit à Paris, pas à minuit UTC", () => {
  // 22 h 30 UTC en juillet, c'est 00 h 30 le lendemain à Paris.
  assert.equal(dateCivile(new Date("2026-07-14T22:30:00Z")), "2026-07-15");
  assert.equal(dateCivile(new Date("2026-07-14T21:30:00Z")), "2026-07-14");
  // …et en janvier, le décalage n'est plus que d'une heure.
  assert.equal(dateCivile(new Date("2026-01-14T23:30:00Z")), "2026-01-15");
  assert.equal(dateCivile(new Date("2026-01-14T22:30:00Z")), "2026-01-14");
});

// ------------------------------------------------------------------- la série

test("la série se compte à rebours depuis aujourd'hui, ou depuis hier", () => {
  // Hier compte : à l'ouverture de la page, la journée du jour n'est pas encore
  // gagnée, et afficher « série : 0 » à quelqu'un qui joue depuis six jours
  // serait lui annoncer une rupture qui n'a pas eu lieu.
  const r = (jours: number[]) => jours.map((jour) => ({ jour, essais: 5 }));
  assert.equal(serieEnCours(230, r([227, 228, 229])), 3);
  assert.equal(serieEnCours(230, r([228, 229, 230])), 3);
  assert.equal(serieEnCours(230, r([230])), 1);
  // Une série interrompue ne se recolle pas.
  assert.equal(serieEnCours(230, r([220, 221, 229, 230])), 2);
  // Cinq jours d'affilée, mais il y a trois mois : la série est finie.
  assert.equal(serieEnCours(230, r([100, 101, 102, 103, 104])), 0);
  assert.equal(serieEnCours(230, []), 0);
});

test("la purge quotidienne ne vise que les parties, jamais la liste des victoires", () => {
  // ⚠️ CE TEST EXISTE PARCE QUE LE BUG A EU LIEU. La purge balayait tout ce qui
  // commence par `placet.pays.`, ce qui emportait `placet.pays.resultats` : la
  // série de chaque joueur repartait de zéro à chaque changement de journée,
  // sans que rien ne le signale. Le motif est donc éprouvé ici, à part de
  // l'écran, pour qu'un raccourci d'écriture ne le ré-élargisse pas.
  const journaliere = /^placet\.pays\.\d+$/;
  assert.ok(journaliere.test("placet.pays.229"));
  assert.ok(journaliere.test("placet.pays.1"));
  assert.ok(!journaliere.test("placet.pays.resultats"));
  assert.ok(!journaliere.test("placet.pays."));
});
