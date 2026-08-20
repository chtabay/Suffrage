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
import {
  CARDINAL_MAX,
  CARDINAL_MIN,
  CRITERES,
  SEUIL_ETIQUETTE,
  cardinal,
  cleEtiquette,
  etiquetteDe,
  etiquettesManquantes,
  famillesSansCategorie,
  famillesSansSujet,
  type Texte,
} from "./criteres";
import { JOURNEES } from "./journees";
import { PAYS, PAYS_PAR_ID } from "./referentiel";
import { POINTS, TRACES } from "./carte";
import { serieEnCours } from "@/lib/games/pays/local";
import { NB_MARCHES, marchesDe } from "@/lib/games/pays/partage";
import {
  ESSAIS_AVANT_PICTOS,
  ORIGINE,
  casesDe,
  casesDeTous,
  dateCivile,
  evalueJournee,
  numeroDeJournee,
  ordreCanonique,
  pictosDe,
  scoreDe,
} from "@/lib/games/pays/moteur";

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

test("chaque critère porte une source consultable, datée, et nommée en quatre langues", () => {
  for (const c of CRITERES) {
    // ⚠️ LE NOM DE LA SOURCE EST LU PAR LE JOUEUR, dans le panneau de victoire.
    // Il est resté français dans les quatre langues jusqu'à ce qu'on joue le jeu
    // en anglais ; ce test-là ne le laissera plus passer.
    for (const l of LOCALES) assert.ok(c.source.nom[l]?.trim().length, `${c.id} : source sans nom en ${l}`);
    assert.match(c.source.url, /^https:\/\//, `${c.id} : source non consultable`);
    assert.match(c.source.date, /^\d{4}/, `${c.id} : source sans année de référence`);
    // Et le lien ne doit pas être une page localisée : elle serait servie telle
    // quelle aux trois autres langues.
    assert.ok(
      !/[/_.]fr[/_.]|donnees\.banquemondiale/.test(c.source.url),
      `${c.id} : lien vers une page francophone (${c.source.url})`,
    );
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

// ------------------------------------------------------------------ les cases

test("l'ordre des cases va du critère le plus courant au plus rare", () => {
  const RANG = { large: 0, intermediaire: 1, discriminant: 2, specifique: 3, signature: 4 } as const;
  for (const j of JOURNEES) {
    const criteres = j.criteres.map((id) => CRITERES.find((c) => c.id === id)!);
    const ordonnes = ordreCanonique(criteres);
    assert.equal(ordonnes.length, 5);
    // Croissant, donc la dernière case est bien la plus rare de la journée.
    for (let k = 1; k < ordonnes.length; k++) {
      assert.ok(
        RANG[ordonnes[k].palier] >= RANG[ordonnes[k - 1].palier],
        `${j.cible} : ${ordonnes.map((c) => c.palier).join(" → ")}`,
      );
    }
  }
});

test("l'ordre des cases ne dépend que de la journée, jamais de l'ordre d'entrée", () => {
  // ⚠️ C'EST L'INVARIANT DONT TOUT DÉPEND. Les cases sont positionnelles : si le
  // rang changeait d'un essai à l'autre, deux essais remplissant « la même
  // case » ne partageraient rien du tout, et le joueur déduirait faux en
  // croyant lire juste.
  for (const j of JOURNEES.slice(0, 12)) {
    const criteres = j.criteres.map((id) => CRITERES.find((c) => c.id === id)!);
    const attendu = ordreCanonique(criteres).map((c) => c.id);
    assert.deepEqual(ordreCanonique([...criteres].reverse()).map((c) => c.id), attendu);
    assert.deepEqual(ordreCanonique([...criteres].sort()).map((c) => c.id), attendu);
  }
});

test("les cases pleines d'un pays somment à son score", () => {
  // Cinq cases, jamais six, et autant de pleines que le score annonce.
  for (const j of JOURNEES.slice(0, 10)) {
    const ordonnes = ordreCanonique(j.criteres.map((id) => CRITERES.find((c) => c.id === id)!));
    for (const p of PAYS) {
      const c = casesDe(p, ordonnes);
      assert.equal(c.length, 5);
      assert.equal(
        c.reduce((a, b) => a + b, 0),
        scoreDe(p, ordonnes),
        `${p.id} : ${c.join("")}`,
      );
    }
    // La réponse du jour remplit tout, et elle seule.
    assert.deepEqual(casesDe(PAYS_PAR_ID[j.cible], ordonnes), [1, 1, 1, 1, 1]);
  }
});

test("deux pays partagent une case si et seulement s'ils partagent ce critère", () => {
  // La promesse faite au joueur, tenue à la lettre.
  const j = JOURNEES[0];
  const ordonnes = ordreCanonique(j.criteres.map((id) => CRITERES.find((c) => c.id === id)!));
  const t = casesDeTous([PAYS_PAR_ID.FRA, PAYS_PAR_ID.USA, PAYS_PAR_ID[j.cible]], ordonnes);
  for (let k = 0; k < 5; k++) {
    const partagee = t[0][k] === 1 && t[1][k] === 1;
    const vraiment = ordonnes[k].verifie(PAYS_PAR_ID.FRA) && ordonnes[k].verifie(PAYS_PAR_ID.USA);
    assert.equal(partagee, vraiment, `case ${k + 1}`);
  }
});

test("les cases ne disent jamais de QUOI parle le critère", () => {
  // Des 0 et des 1, aucun identifiant, aucun nom de famille : ajouter le sujet
  // demanderait de casser cette ligne, donc de le voir.
  const j = JOURNEES[0];
  const ordonnes = ordreCanonique(j.criteres.map((id) => CRITERES.find((c) => c.id === id)!));
  const texte = JSON.stringify(casesDeTous([PAYS_PAR_ID.FRA, PAYS_PAR_ID.USA], ordonnes));
  assert.match(texte, /^[[\],01]+$/);
  for (const c of ordonnes) assert.ok(!texte.includes(c.id) && !texte.includes(c.famille));
});

// ------------------------------------------------------------------- pictos

test("toute famille de critère a une catégorie ET un sujet", () => {
  // Les deux replis (`categorieDe`, `sujetDe`) rendraient une étiquette FAUSSE
  // pour un critère neuf, et un joueur chercherait au mauvais endroit en toute
  // confiance. Une famille ajoutée sans classement doit casser ici.
  assert.deepEqual(famillesSansCategorie(), []);
  assert.deepEqual(famillesSansSujet(), []);
});

test("toute étiquette atteignable a un libellé dans les quatre langues", () => {
  // Sans ce test, ajouter des critères peut rendre atteignable un grain plus
  // fin qu'aucun libellé ne couvre : la case se tairait en silence, exactement
  // là où le joueur attend l'aide.
  assert.deepEqual(etiquettesManquantes(), []);
  for (const c of CRITERES) {
    if (c.palier === "signature") continue;
    if (!cleEtiquette(c)) continue;
    for (const loc of LOCALES) {
      const e = etiquetteDe(c, loc);
      assert.ok(e && e.texte.length > 0 && e.picto.length > 0, `${c.id} en ${loc}`);
    }
  }
});

test("une étiquette laisse toujours au moins SEUIL_ETIQUETTE critères possibles", () => {
  // LE CŒUR DE LA RÈGLE, et ce qui remplace l'ancien garde-fou ponctuel : le
  // grain descend tant que c'est sûr, jamais au-delà. Ce qu'on mesure est
  // l'incertitude d'un joueur qui CONNAÎT la bibliothèque.
  for (const c of CRITERES) {
    if (c.palier === "signature") continue;
    const cle = cleEtiquette(c);
    if (!cle) continue;
    const [grain, valeur] = [cle.slice(0, cle.indexOf(":")), cle.slice(cle.indexOf(":") + 1)];
    // ⚠️ ON COMPTE LA CLASSE DE RÉSOLUTION, pas le grain. Un joueur qui connaît
    // la bibliothèque sait qu'un critère replié sur un grain large l'a fait
    // FAUTE DE MIEUX : compter tous les critères du grain surestimait donc la
    // protection. Attrapé ici sur `archipel-etat`, qui paraissait couvert par
    // cinq critères et n'en avait que deux.
    void grain;
    void valeur;
    const memeEtiquette = CRITERES.filter((x) => x.palier === c.palier && cleEtiquette(x) === cle);
    assert.ok(
      memeEtiquette.length >= SEUIL_ETIQUETTE,
      `${c.id} : « ${cle} » ne laisse que ${memeEtiquette.length} critère(s)`,
    );
  }
});

test("avant 25 essais, aucune case ne parle", () => {
  const j = JOURNEES[0];
  const ordonnes = ordreCanonique(j.criteres.map((id) => CRITERES.find((c) => c.id === id)!));
  for (const n of [0, 1, 10, ESSAIS_AVANT_PICTOS - 1]) {
    assert.deepEqual(pictosDe(ordonnes, n, "fr"), [null, null, null, null, null], `à ${n} essais`);
  }
});

test("la case signature ne parle JAMAIS, quelle que soit la journée", () => {
  // C'est elle qui fait la recherche : 28 % des pays à 4/5 ne ratent qu'elle.
  // Une régression ici viderait la fin de partie sans qu'aucun autre test ne
  // bronche — les quatre premières cases continueraient de marcher.
  for (const j of JOURNEES) {
    const ordonnes = ordreCanonique(j.criteres.map((id) => CRITERES.find((c) => c.id === id)!));
    for (const n of [ESSAIS_AVANT_PICTOS, 100, 500]) {
      assert.equal(pictosDe(ordonnes, n, "fr")[4], null, `journée ${j.cible} à ${n} essais`);
    }
  }
});

test("les étiquettes ne livrent jamais un identifiant ni une famille de critère", () => {
  // Même promesse que pour les cases : ce qui sort est un mot de domaine, rien
  // qui nomme le critère. On vérifie sur le JSON réellement envoyé.
  for (const j of JOURNEES) {
    const ordonnes = ordreCanonique(j.criteres.map((id) => CRITERES.find((c) => c.id === id)!));
    const envoye = JSON.stringify(pictosDe(ordonnes, 500, "fr"));
    for (const c of ordonnes) assert.ok(!envoye.includes(c.id), `${c.id} fuite dans les étiquettes`);
  }
});

test("le grain descend sous la catégorie là où c'est sûr", () => {
  // CE QUE LE GRAIN VARIABLE APPORTE VRAIMENT : sur les 51 journées, la majorité
  // des étiquettes sont plus fines qu'une catégorie. Au grain fixe, les 204
  // révélations portaient les mêmes cinq mots.
  const grains: Record<string, number> = {};
  for (const j of JOURNEES) {
    const ordonnes = ordreCanonique(j.criteres.map((id) => CRITERES.find((c) => c.id === id)!));
    for (const c of ordonnes.slice(0, 4)) {
      const cle = cleEtiquette(c);
      const g = cle ? cle.slice(0, cle.indexOf(":")) : "muet";
      grains[g] = (grains[g] ?? 0) + 1;
    }
  }
  const fins = (grains.famille ?? 0) + (grains.sujet ?? 0);
  assert.ok(fins > (grains.categorie ?? 0), `grains retenus : ${JSON.stringify(grains)}`);
  assert.ok((grains.famille ?? 0) > 0, "aucune étiquette au grain famille");
});

test("deux cases du même jour ne portent pas la même étiquette", () => {
  // Au grain fixe, la journée 2 affichait « société » DEUX FOIS : le joueur
  // lisait un lien entre deux critères qui n'en ont aucun. Le grain fin les
  // sépare — et là où il ne le peut pas, on veut le savoir.
  const doublons: string[] = [];
  for (const j of JOURNEES) {
    const ordonnes = ordreCanonique(j.criteres.map((id) => CRITERES.find((c) => c.id === id)!));
    const cles = ordonnes.slice(0, 4).map((c) => cleEtiquette(c)).filter(Boolean);
    if (new Set(cles).size !== cles.length) doublons.push(j.cible);
  }
  assert.deepEqual(doublons, [], `journées où deux cases disent la même chose : ${doublons.join(", ")}`);
});

// ------------------------------------------------------------------ partage

test("l'escalier note le PREMIER essai qui atteint chaque marche", () => {
  assert.deepEqual(marchesDe([1, 4, 4, 3, 5]), [1, 2, 2, 2, 5]);
  assert.deepEqual(marchesDe([0, 0, 5]), [3, 3, 3, 3, 3]);
  assert.deepEqual(marchesDe([5]), [1, 1, 1, 1, 1]);
});

test("une marche franchie ne redescend jamais", () => {
  // Un essai à 4/5 suivi d'un essai à 1/5 garde la 4e marche : c'est un record,
  // pas un état. Compter autrement ferait « redescendre » un joueur qui explore,
  // ce que le jeu lui demande précisément de faire.
  assert.deepEqual(marchesDe([4, 1, 1, 5]), [1, 1, 1, 1, 4]);
});

test("une marche jamais atteinte rend 0, sans décaler les autres", () => {
  assert.deepEqual(marchesDe([2, 3, 3]), [1, 1, 2, 0, 0]);
  assert.deepEqual(marchesDe([]), [0, 0, 0, 0, 0]);
});

test("l'escalier tient en cinq lignes quelle que soit la partie", () => {
  // LE DÉFAUT CORRIGÉ : le partage recopiait un emoji par essai, donc sa taille
  // était celle de la partie — 509 caractères pour 156 essais, sans borne
  // puisque le jeu n'impose aucune limite.
  const courte = marchesDe([1, 4, 4, 3, 5]);
  const longue = marchesDe([...Array.from({ length: 155 }, (_, i) => i % 5), 5]);
  assert.equal(courte.length, NB_MARCHES);
  assert.equal(longue.length, NB_MARCHES);
});

test("l'escalier est croissant : on ne franchit pas la 4e marche avant la 2e", () => {
  // La propriété qui fait qu'il se lit comme une montée. Vraie par construction,
  // mais c'est exactement le genre d'invariant qu'une optimisation casse.
  for (const scores of [[1, 4, 4, 3, 5], [0, 2, 5], [5], [3, 1, 4, 5]]) {
    const m = marchesDe(scores).filter((r) => r > 0);
    for (let i = 1; i < m.length; i++) {
      assert.ok(m[i] >= m[i - 1], `${JSON.stringify(scores)} → ${JSON.stringify(m)}`);
    }
  }
});
