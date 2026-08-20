// LES GARDE-FOUS DE BANALO DU JOUR.
//
// Trois surfaces, et chacune a son piège :
//   · le CONTENU pourrit en silence — une langue oubliée, un ordre de grandeur
//     absurde, une question qui ne traverse pas ;
//   · la JOURNÉE bascule à 11 h 30, donc rien de ce qui vaut pour une journée
//     civile ne s'applique, et le changement d'heure est un piège saisonnier ;
//   · le BARÈME décide à la place d'un humain, donc il doit être juste dans les
//     deux sens.
import assert from "node:assert/strict";
import { test } from "node:test";
import { QUESTIONS, QUESTION_PAR_ID, UNITES, questionDe, enLangue } from "@/content/banalo/questions";
import {
  CHARNIERE_MINUTES,
  NB_JOURNEES,
  ORIGINE,
  finDeJournee,
  journeeCivile,
  numeroDeJournee,
  numeroDuJour,
} from "./jour";
import { POINTS_MAX, VOTANTS_MIN, facteurDe, medianeDe, pointsDe, positionDe } from "./bareme";
import { nombreDe } from "./saisie";
import { traduis } from "@/lib/db/banalo";

const LOCALES = ["fr", "en", "es", "pcm"] as const;

// ------------------------------------------------------------------ contenu

test("chaque question porte les quatre langues, sans doublon d'identifiant", () => {
  assert.ok(QUESTIONS.length > 0);
  assert.equal(new Set(QUESTIONS.map((q) => q.id)).size, QUESTIONS.length);
  for (const q of QUESTIONS) {
    assert.match(q.id, /^[a-z0-9-]+$/, `identifiant douteux : ${q.id}`);
    for (const loc of LOCALES) {
      const t = q.texte[loc];
      assert.ok(t && t.length > 15, `${q.id} en ${loc} : texte absent ou trop court`);
    }
  }
});

test("chaque unité porte les quatre langues", () => {
  for (const [nom, libelle] of Object.entries(UNITES)) {
    for (const loc of LOCALES) assert.ok(libelle[loc], `unité ${nom} en ${loc}`);
  }
  for (const q of QUESTIONS) assert.ok(UNITES[q.unite], `${q.id} : unité inconnue`);
});

test("chaque question annonce un ordre de grandeur plausible", () => {
  // Sous 10², la question n'a pas de quoi étaler des réponses ; au-delà de 10¹²,
  // le joueur ne sait plus lire le nombre qu'il tape.
  for (const q of QUESTIONS) {
    assert.ok(Number.isInteger(q.ordre) && q.ordre >= 2 && q.ordre <= 12, `${q.id} : ordre ${q.ordre}`);
  }
});

test("les quatre langues ne posent pas la MÊME question mot pour mot", () => {
  // ⚠️ Le piège du contenu localisé : une question recopiée d'une langue à
  // l'autre trahit un oubli de localisation — chaque langue parle de son pays.
  for (const q of QUESTIONS) {
    const textes = LOCALES.map((l) => q.texte[l]);
    assert.equal(new Set(textes).size, textes.length, `${q.id} : deux langues identiques`);
  }
});

test("la question tourne en rond sans jamais rendre `undefined`", () => {
  assert.equal(questionDe(1).id, QUESTIONS[0]!.id);
  assert.equal(questionDe(NB_JOURNEES + 1).id, QUESTIONS[0]!.id, "la roue ne boucle pas");
  // Horloge farfelue : un numéro négatif doit retomber sur une question valide.
  for (const n of [-5, 0, 1, 999]) assert.ok(QUESTION_PAR_ID[questionDe(n).id], `numéro ${n}`);
});

test("le texte suit la langue, avec repli français", () => {
  const q = QUESTIONS[0]!;
  assert.equal(enLangue(q.texte, "es"), q.texte.es);
  assert.equal(enLangue(q.texte, "kl"), q.texte.fr, "repli attendu sur le français");
});

// ------------------------------------------------------------------ journée

/** Un instant donné en heure de Paris, exprimé en UTC. Été = +2, hiver = +1. */
const paris = (iso: string, decalage: number) => new Date(Date.parse(`${iso}Z`) - decalage * 3_600_000);

test("la journée bascule à 11 h 30 et pas à minuit", () => {
  // 20 août : Paris est à UTC+2.
  assert.equal(journeeCivile(paris("2026-08-20T11:29:00", 2)), "2026-08-19", "avant la charnière");
  assert.equal(journeeCivile(paris("2026-08-20T11:31:00", 2)), "2026-08-20", "après la charnière");
  // Minuit ne change rien : on est toujours dans la journée de la veille.
  assert.equal(journeeCivile(paris("2026-08-20T00:05:00", 2)), "2026-08-19", "minuit ne bascule pas");
  assert.equal(journeeCivile(paris("2026-08-20T23:50:00", 2)), "2026-08-20", "fin de soirée");
});

test("la charnière tient des deux côtés du changement d'heure", () => {
  // ⚠️ LE PIÈGE SAISONNIER. Paris vaut UTC+1 l'hiver et UTC+2 l'été : une
  // soustraction fixe d'heures ferait basculer la journée une heure trop tôt six
  // mois par an. On vérifie donc janvier ET juillet, à la minute près.
  for (const [date, decalage] of [["2027-01-15", 1], ["2027-07-15", 2]] as const) {
    assert.equal(journeeCivile(paris(`${date}T11:29:00`, decalage)), veilleDe(date), `${date} avant`);
    assert.equal(journeeCivile(paris(`${date}T11:31:00`, decalage)), date, `${date} après`);
  }
});

function veilleDe(iso: string): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
}

test("le numéro de journée part à 1 le jour d'origine", () => {
  assert.equal(numeroDeJournee(ORIGINE), 1);
  assert.equal(numeroDeJournee(veilleDe(ORIGINE)), 0);
  assert.equal(numeroDuJour(paris(`${ORIGINE}T12:00:00`, 2)), 1);
  assert.equal(numeroDuJour(paris(`${ORIGINE}T11:00:00`, 2)), 0, "avant l'ouverture");
});

test("la charnière est une constante, pas un nombre magique recopié", () => {
  assert.equal(CHARNIERE_MINUTES, 11 * 60 + 30);
});

test("la fin de journée tombe après le début et avant 25 heures", () => {
  // Elle sert à dire « jusqu'à 11 h 30 demain » sans jamais afficher de date.
  const t = paris("2026-08-20T12:00:00", 2);
  const fin = finDeJournee(t);
  assert.ok(fin > t.getTime(), "la fin est dans le futur");
  assert.ok(fin - t.getTime() < 25 * 3_600_000, "moins de 25 h");
  assert.notEqual(journeeCivile(new Date(fin)), journeeCivile(t), "la journée a bien changé");
});

// ------------------------------------------------------------------- barème

test("la médiane pour un effectif pair rend une valeur OBSERVÉE", () => {
  // Elle doit s'accorder au caractère près avec `percentile_disc(0.5)` en base :
  // deux calculs qui divergent d'un cheveu donneraient deux scores au même
  // joueur. On prend donc la centrale du bas, sans interpoler.
  assert.equal(medianeDe([1, 10, 100, 1000]), 10);
  assert.equal(medianeDe([1, 10, 100]), 10);
});

test("la médiane tient quand la moyenne est détruite", () => {
  // Mille réponses honnêtes autour de 4 000, et une seule absurdité.
  const foule = Array.from({ length: 999 }, (_, i) => 3000 + (i % 2000));
  const avecTroll = [...foule, 1e15];
  const moyenne = avecTroll.reduce((a, b) => a + b, 0) / avecTroll.length;
  assert.ok(moyenne > 1e11, "la moyenne part en vrille, c'est le point");
  assert.ok(medianeDe(avecTroll) < 6000, "la médiane, elle, ne bouge presque pas");
});

test("la médiane ignore les réponses impossibles plutôt que de rendre NaN", () => {
  assert.equal(medianeDe([]), 0);
  assert.equal(medianeDe([0, -3, NaN, Infinity]), 0);
  // Le zéro écarté, il reste [10, 1000] : effectif pair, donc la centrale du bas.
  assert.equal(medianeDe([10, 0, 1000]), 10);
});

test("l'écart se compte en facteurs : ÷3 et ×3 valent pareil", () => {
  // ⚠️ LA PROPRIÉTÉ QUI REND LE JEU JUSTE. Au linéaire, celui qui sous-estime
  // gagnerait toujours : |1000/3 − 1000| vaut 667, |3000 − 1000| vaut 2000.
  assert.equal(facteurDe(3000, 1000), 3);
  assert.equal(facteurDe(1000 / 3, 1000), 3);
  assert.equal(pointsDe(facteurDe(3000, 1000)), pointsDe(facteurDe(1000 / 3, 1000)));
});

test("les paliers de points sont ceux annoncés au joueur", () => {
  assert.equal(pointsDe(1), POINTS_MAX);
  assert.equal(pointsDe(1.24), 10);
  assert.equal(pointsDe(1.9), 6);
  assert.equal(pointsDe(4.9), 3);
  assert.equal(pointsDe(9.9), 1);
  assert.equal(pointsDe(10), 0);
  assert.equal(pointsDe(Infinity), 0, "une réponse impossible ne rapporte rien");
});

test("une réponse nulle ou négative ne rapporte rien, sans planter", () => {
  for (const mauvaise of [0, -1, NaN]) {
    assert.equal(pointsDe(facteurDe(mauvaise, 1000)), 0, `réponse ${mauvaise}`);
  }
  assert.equal(pointsDe(facteurDe(1000, 0)), 0, "référence absente");
});

test("le rang est olympique : à score égal, même rang", () => {
  const scores = [10, 10, 6, 6, 6, 3, 0];
  assert.equal(positionDe(10, scores).rang, 1);
  assert.equal(positionDe(6, scores).rang, 3, "les deux 10 occupent les rangs 1 et 2");
  assert.equal(positionDe(3, scores).rang, 6);
  assert.equal(positionDe(6, scores).exAequo, 3);
});

test("sous le plancher de votants, aucune part n'est affichée", () => {
  // « 3e sur 7 » n'est pas un rang, c'est du bruit — et il n'y a pas encore
  // d'ex aequo à compter.
  const peu = Array.from({ length: VOTANTS_MIN - 1 }, () => 6);
  assert.equal(positionDe(6, peu).partMieux, null);
  const assez = Array.from({ length: VOTANTS_MIN }, () => 6);
  assert.ok(positionDe(6, assez).partMieux !== null);
});

test("la part ne bouge PAS quand la foule grandit à proportions égales", () => {
  // ⚠️ C'EST TOUTE SA RAISON D'ÊTRE, et la première formule la lui retirait :
  // avec le « +1 » du rang, la même performance donnait 21 % à cent votants et
  // 20 % à mille. Le rang brut, lui, empire mécaniquement — on le vérifie aussi,
  // pour que les deux comportements soient écrits noir sur blanc.
  for (const facteur of [1, 10, 100]) {
    const foule = [...Array(20 * facteur).fill(10), ...Array(80 * facteur).fill(3)];
    assert.equal(positionDe(3, foule).partMieux, 20, `foule × ${facteur}`);
  }
  const petite = [...Array(20).fill(10), ...Array(80).fill(3)];
  const grande = [...Array(200).fill(10), ...Array(800).fill(3)];
  assert.ok(positionDe(3, grande).rang > positionDe(3, petite).rang, "le rang brut, lui, empire");
});

test("personne au-dessus donne bien zéro, pas un plancher inventé", () => {
  const foule = [...Array(50).fill(3), 10];
  assert.equal(positionDe(10, foule).partMieux, 0);
  assert.equal(positionDe(10, foule).rang, 1);
});

// -------------------------------------------------------------------- saisie

test("les séparateurs de milliers passent, la décimale ne passe pas en douce", () => {
  // ⚠️ LE PIÈGE DE LA VIRGULE. « 1,5 » vaut 1,5 en français et 1500 en anglais ;
  // interpréter la frappe ferait varier une réponse d'un facteur mille selon la
  // langue de l'écran, sans que personne ne le voie. On dépouille donc TOUT sauf
  // les chiffres : un séparateur de milliers tombe juste, et une décimale rend
  // un nombre visiblement trop grand, que la relecture formatée montre avant
  // l'envoi.
  assert.equal(nombreDe("4500000"), 4500000);
  assert.equal(nombreDe("4 500 000"), 4500000);
  assert.equal(nombreDe("4,500,000"), 4500000);
  assert.equal(nombreDe("1,5"), 15, "la décimale devient un nombre franchement faux, pas un faux discret");
});

test("une saisie qui ne porte pas de nombre ne bloque rien", () => {
  for (const vide of ["", "   ", "abc", "-", "0", "00"]) {
    assert.equal(nombreDe(vide), null, `saisie ${JSON.stringify(vide)}`);
  }
});

test("une saisie démesurée est refusée avant la base, pas par elle", () => {
  // La table borne à 1e18 ; `isSafeInteger` s'arrête bien avant, donc rien de ce
  // qui sort d'ici ne peut être rejeté par le `check`.
  assert.equal(nombreDe("9".repeat(30)), null);
  assert.ok((nombreDe("9007199254740991") ?? 0) > 0, "la borne sûre elle-même passe");
});

// ----------------------------------------------------------- passe-plat base

test("l'infini rendu par Postgres ne s'affiche pas « ×Infinity »", () => {
  // ⚠️ MESURÉ EN BASE : `jsonb_build_object('f', 'Infinity'::float8)` rend la
  // CHAÎNE "Infinity", pas un nombre. Sans le filtre, l'écran l'afficherait tel
  // quel.
  const e = traduis({ status: "ok", repondu: true, assez: true, votants: 30, mienne: 5,
    mediane: 5, facteur: "Infinity", points: 0, rang: 30, exaequo: 1, partmieux: 99 });
  assert.equal(e?.facteur, null);
});

test("le rang s'éteint avec la part, jamais tout seul", () => {
  // ⚠️ TROUVÉ À L'ÉCRAN, pas à la relecture. La base rend toujours `rang` mais
  // ne rend `partmieux` qu'au-delà du plancher de position : une journée à huit
  // votants affichait « 7e sur 8 joueurs », c'est-à-dire exactement le bruit que
  // `VOTANTS_MIN` existe pour taire.
  const mince = traduis({ status: "ok", repondu: true, assez: true, votants: 8, mienne: 5,
    mediane: 41, facteur: 8.2, points: 1, rang: 7, exaequo: 1, partmieux: null });
  assert.equal(mince?.rang, null);
  assert.equal(mince?.exAequo, null);
  assert.equal(mince?.points, 1, "le score, lui, reste");

  const foule = traduis({ status: "ok", repondu: true, assez: true, votants: 214, mienne: 5,
    mediane: 4, facteur: 1.25, points: 6, rang: 63, exaequo: 41, partmieux: 29 });
  assert.equal(foule?.rang, 63);
  assert.equal(foule?.partMieux, 29);
});

test("un refus de la base n'est jamais replié sur un état de jeu", () => {
  // « Pas répondu » sur une panne proposerait de rejouer à quelqu'un dont la
  // réponse est déjà déposée — et son second nombre serait ignoré en silence.
  assert.equal(traduis(null), null);
  assert.equal(traduis({ status: "invalid" }), null);
  assert.equal(traduis({ repondu: true, votants: 40 }), null, "sans `status: ok`, c'est un non");
});
