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
import { blocDe, motDe, teinteDe } from "./chaleur";
import { serieVivante, traduis, traduisMots } from "@/lib/db/banalo";
import { CYCLE, JOURNEES_CHIFFREES, JOURNEES_PARUES, programmeDe } from "./programme";
import { CASES_MAX, CASES_MIN, CASES_PAR_DEFAUT, NB_THEMES, casesDe, themeDe } from "@/content/banalo/mots";
import { lienDefi, litDefi } from "@/lib/games/comparaison";

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

test("le score suit la courbe annoncée au joueur, au dixième près", () => {
  // « Cent points, moins cent par facteur dix d'écart. » Ces repères sont ceux
  // écrits dans la migration ET affichés sous le score : ils doivent s'accorder
  // au caractère près avec `scrutin_banalo_points`, vérifié en base.
  assert.equal(pointsDe(1), POINTS_MAX);
  assert.equal(pointsDe(1.25), 90.3);
  assert.equal(pointsDe(2), 69.9);
  assert.equal(pointsDe(5), 30.1);
  assert.equal(pointsDe(10), 0);
  assert.equal(pointsDe(1e9), 0, "au-delà de ×10, tout le monde a la même note");
  assert.equal(pointsDe(Infinity), 0, "une réponse impossible ne rapporte rien");
});

test("le score ne prend JAMAIS plus d'une décimale, et ne sort pas de [0 ; 100]", () => {
  // ⚠️ LE RANG SE CALCULE SUR LA VALEUR ARRONDIE. Une seconde décimale ferait
  // apparaître deux joueurs au même score affiché avec deux rangs différents :
  // l'écran se contredirait tout seul.
  for (let f = 1; f < 10; f += 0.0137) {
    const p = pointsDe(f);
    assert.equal(p, Math.round(p * 10) / 10, `facteur ${f} rend ${p}`);
    assert.ok(p >= 0 && p <= POINTS_MAX, `facteur ${f} rend ${p}`);
  }
});

test("le score DISCRIMINE, là où les cinq paliers ne classaient rien", () => {
  // ⚠️ LA RAISON DU CHANGEMENT, EN UN TEST. Le barème en paliers ne pouvait
  // rendre que cinq valeurs : sur deux cents joueurs, cent pour cent d'entre eux
  // étaient ex aequo et le plus gros paquet faisait 40 % du terrain. Le rang et
  // la part n'avaient donc rien à mesurer.
  const paliers = (f: number) => (f < 1.25 ? 10 : f < 2 ? 6 : f < 5 ? 3 : f < 10 ? 1 : 0);
  // Deux cents écarts étalés entre ×1 et ×8, sans motif régulier — un semis à
  // pas constant apparierait mécaniquement les facteurs symétriques.
  const ecarts = Array.from({ length: 200 }, (_, i) => 1 + 7 * Math.abs(Math.sin(i * 12.9898)));
  const distincts = (b: (f: number) => number) => new Set(ecarts.map(b)).size;
  // Mesuré sur ce semis : 5 valeurs contre 135. Le seuil est posé sous la
  // mesure, pas dessus — il garde la propriété sans se casser au premier
  // ajustement de la courbe.
  assert.ok(distincts(paliers) <= 5, "le barème d'avant ne pouvait pas faire mieux");
  assert.ok(distincts(pointsDe) > 120, `seulement ${distincts(pointsDe)} scores distincts`);
});

test("le zéro reste un paquet, et c'est la seule égalité voulue", () => {
  // « Raté d'un facteur dix ou plus » est UNE information. Départager ×50 de
  // ×500 ferait dépendre le bas du classement des fautes de frappe.
  assert.equal(pointsDe(10), pointsDe(50));
  assert.equal(pointsDe(50), pointsDe(500));
  assert.notEqual(pointsDe(9.9), pointsDe(9.8), "juste au-dessus, on départage encore");
});

test("une réponse nulle ou négative ne rapporte rien, sans planter", () => {
  for (const mauvaise of [0, -1, NaN]) {
    assert.equal(pointsDe(facteurDe(mauvaise, 1000)), 0, `réponse ${mauvaise}`);
  }
  assert.equal(pointsDe(facteurDe(1000, 0)), 0, "référence absente");
});

test("le rang est olympique, et il se compte sur l'ÉCART", () => {
  // Les facteurs, pas les points : petit facteur = meilleur.
  const ecarts = [1, 1, 1.5, 1.5, 1.5, 3, 40];
  assert.equal(positionDe(1, ecarts).rang, 1);
  assert.equal(positionDe(1.5, ecarts).rang, 3, "les deux exacts occupent les rangs 1 et 2");
  assert.equal(positionDe(3, ecarts).rang, 6);
  assert.equal(positionDe(1.5, ecarts).exAequo, 3);
});

test("le rang ne fabrique PLUS d'ex aequo par arrondi", () => {
  // ⚠️ LA CORRECTION, EN UN TEST. Classer sur le score arrondi au dixième
  // déclarait identiques des joueurs dont l'écart diffère vraiment. Deux cents
  // écarts tous distincts doivent donner deux cents rangs distincts — vérifié
  // aussi en base, où le même semis rendait zéro ex aequo.
  // Deux cents écarts serrés : ils tiennent dans quatre points de score, donc
  // l'arrondi au dixième les écrase forcément les uns sur les autres.
  const ecarts = Array.from({ length: 200 }, (_, i) => 1 + i * 0.0005);
  const rangs = new Set(ecarts.map((f) => positionDe(f, ecarts).rang));
  assert.equal(rangs.size, 200, `seulement ${rangs.size} rangs distincts`);
  for (const f of ecarts) assert.equal(positionDe(f, ecarts).exAequo, 1);
  // Alors que les points, eux, se répètent : c'est bien l'arrondi qui groupait.
  assert.ok(new Set(ecarts.map(pointsDe)).size < 200, "les points arrondis, eux, collisionnent");
});

test("au-delà du plafond, tout le monde est à égalité — et c'est voulu", () => {
  // « Raté d'un facteur dix ou plus » est UNE information. Sans le plafond, un
  // joueur à ×50 passerait devant un joueur à ×500 alors que l'écran affiche
  // 0,0 aux deux : on classerait des fautes de frappe.
  const ecarts = [1.2, 50, 500, 5000];
  assert.equal(positionDe(50, ecarts).exAequo, 3);
  assert.equal(positionDe(500, ecarts).rang, positionDe(5000, ecarts).rang);
  assert.equal(pointsDe(50), pointsDe(5000), "leurs scores affichés sont bien les mêmes");
});

test("personne au-dessus donne bien zéro, pas un plancher inventé", () => {
  const foule = [...Array(50).fill(4), 1.05];
  assert.equal(positionDe(1.05, foule).partMieux, 0);
  assert.equal(positionDe(1.05, foule).rang, 1);
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

test("sous le plancher de votants, aucune part n'est calculée", () => {
  // ⚠️ TEST REMIS APRÈS L'AVOIR PERDU. Il existait, puis la réécriture du rang
  // sur le facteur l'a emporté sans que rien ne le signale — sauf un
  // avertissement d'import inutilisé, qui est le seul indice qu'une règle
  // n'était plus vérifiée.
  //
  // ⚠️ LE PLANCHER VAUT 2 DEPUIS LE 22/08, plus 20 : le cas qu'il écarte n'est
  // plus « 3e sur 7 » mais « 1er sur 1 », c'est-à-dire le joueur qui ouvre la
  // journée et n'a encore personne devant ni derrière. Le test s'écrit sur la
  // constante, donc il suit sans être réécrit.
  const peu = Array.from({ length: VOTANTS_MIN - 1 }, () => 1.5);
  assert.equal(positionDe(1.5, peu).partMieux, null);
  const assez = Array.from({ length: VOTANTS_MIN }, () => 1.5);
  assert.ok(positionDe(1.5, assez).partMieux !== null, "au plancher exact, la part sort");
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


// ------------------------------------------------------------------ chaleur

test("la rampe de chaleur tient 4,5:1 sur les deux fonds possibles", () => {
  // ⚠️ MESURÉ À CHAQUE PAS, PAS SEULEMENT AUX ANCRES. Une rampe peut passer par
  // un point plus clair que ses deux bornes ; c'est ce qui rend un « orange
  // chaud » illisible sur blanc alors que ses voisins passent. Les deux fonds
  // sont la carte (blanc) et la page (le vert d'eau du skin).
  const canal = (c: number) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : Math.pow((c / 255 + 0.055) / 1.055, 2.4));
  const lum = (h: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
    return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
  };
  const contraste = (a: string, b: string) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number];
    return (x + 0.05) / (y + 0.05);
  };
  for (let s = 0; s <= 100; s += 1) {
    for (const fond of ["#FFFFFF", "#E9FBF2"]) {
      const c = contraste(teinteDe(s), fond);
      assert.ok(c >= 4.5, `score ${s} sur ${fond} : ${c.toFixed(2)}:1`);
    }
  }
});

test("la rampe ne passe PAS par un vert franc", () => {
  // ⚠️ TROUVÉ EN MESURANT, pas en regardant. Interpoler du bleu vers l'orange en
  // RGB traverse un vert vif vers 40 sur 100 — et le vert se lit « c'est bon »
  // dans toute interface, alors qu'à 40 la réponse est médiocre. Le milieu doit
  // donc être DÉSATURÉ : « ni chaud ni froid » se dit par l'absence de couleur.
  const sat = (h: string) => {
    const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const mx = Math.max(...c);
    return mx ? (mx - Math.min(...c)) / mx : 0;
  };
  const vert = (h: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
    return g > r * 1.25 && g > b * 1.25;
  };
  for (let s = 0; s <= 100; s += 1) assert.ok(!vert(teinteDe(s)), `score ${s} rend un vert : ${teinteDe(s)}`);
  assert.ok(sat(teinteDe(50)) < 0.2, `le milieu doit être neutre, il vaut ${sat(teinteDe(50)).toFixed(2)}`);
  assert.ok(sat(teinteDe(0)) > 0.5 && sat(teinteDe(100)) > 0.5, "les deux bouts, eux, doivent trancher");
});

test("le mot de chaleur suit le score, et couvre toute l'échelle", () => {
  assert.equal(motDe(100), "brule");
  assert.equal(motDe(90), "brule");
  assert.equal(motDe(89.9), "chaud");
  assert.equal(motDe(70), "chaud");
  assert.equal(motDe(40), "tiede");
  assert.equal(motDe(15), "froid");
  assert.equal(motDe(0), "glace");
  // Aucune valeur possible ne doit tomber dans un trou : le mot est affiché à
  // côté de la couleur, et son absence laisserait une ligne vide.
  for (let s = 0; s <= 100; s += 0.1) assert.ok(motDe(Math.round(s * 10) / 10), `score ${s}`);
  assert.equal(motDe(NaN), "glace", "une valeur impossible ne casse pas l'écran");
});

// ---------------------------------------------------------------- programme

test("les journées déjà parues restent chiffrées, quoi qu'on change au rythme", () => {
  // ⚠️ ELLES SONT SORTIES. Des joueurs y ont répondu, leurs réponses sont en
  // base sous ce format, et leur résultat voyage dans des liens de partage.
  // Changer leur format après coup ferait chercher une grille de mots là où il
  // y a des nombres, et rendrait la journée précédente illisible.
  for (let j = 1; j <= JOURNEES_PARUES; j++) {
    assert.equal(programmeDe(j).type, "nombre", `journée ${j}`);
  }
});

test("le format chiffré ne revient qu'une fois par semaine", () => {
  // La demande est un MAXIMUM : jamais deux journées chiffrées dans une même
  // fenêtre de sept jours, où qu'on place la fenêtre.
  for (let debut = JOURNEES_PARUES + 1; debut <= JOURNEES_PARUES + 60; debut++) {
    let chiffrees = 0;
    for (let j = debut; j < debut + CYCLE; j++) if (programmeDe(j).type === "nombre") chiffrees++;
    assert.ok(chiffrees <= 1, `${chiffrees} journées chiffrées à partir de ${debut}`);
  }
  // Et c'est bien UNE, pas zéro : le format ne disparaît pas.
  const semaine = [];
  for (let j = JOURNEES_PARUES + 1; j <= JOURNEES_PARUES + CYCLE; j++) semaine.push(programmeDe(j).type);
  // ⚠️ LA CHIFFRÉE EST AU BOUT. Les journées 1 et 2 sont parues en chiffré :
  // ouvrir le cycle par une chiffrée en aurait fait trois d'affilée.
  assert.deepEqual(semaine, ["mots", "mots", "mots", "mots", "mots", "mots", "nombre"]);
  assert.equal(programmeDe(JOURNEES_PARUES + 1).type, "mots", "la première non parue casse la série");
});

test("aucune question ni aucun thème n'est sauté par le nouveau rythme", () => {
  // ⚠️ LE PIÈGE : indexer les deux stocks sur le NUMÉRO DE JOURNÉE ferait
  // avancer les thèmes de sept en sept et n'en montrerait qu'un sur sept. Le
  // rang doit être compté DANS LE FORMAT.
  const questions = [], themes = [];
  for (let j = JOURNEES_PARUES + 1; j <= JOURNEES_PARUES + 6 * CYCLE; j++) {
    const p = programmeDe(j);
    if (p.type === "nombre") questions.push(p.question.id);
    else themes.push(p.theme.fr);
  }
  assert.equal(questions.length, 6, "six semaines, six questions");
  assert.equal(new Set(questions).size, 6, "sans répétition");
  assert.equal(themes.length, 6 * (CYCLE - 1));
  assert.equal(new Set(themes).size, themes.length, "les thèmes défilent un par un");
  // La suite des questions reprend là où les journées parues se sont arrêtées.
  assert.equal(questions[0], questionDe(JOURNEES_PARUES + 1).id);
});

test("le programme rend toujours quelque chose, même sur une horloge farfelue", () => {
  // Un client qui se croit en 2019 ou en 2400 doit voir un jeu, pas un écran
  // blanc : c'est la même exigence que le modulo positif de `questionDe`.
  for (const j of [-500, 0, 1, 999, 100000]) {
    const p = programmeDe(j);
    assert.ok(p.type === "nombre" || p.type === "mots", `journée ${j}`);
    if (p.type === "mots") {
      assert.ok(p.theme?.fr, `journée ${j} sans thème`);
      assert.ok(p.cases >= CASES_MIN && p.cases <= CASES_MAX, `journée ${j} : ${p.cases} cases`);
    } else {
      assert.ok(p.question?.id, `journée ${j} sans question`);
    }
  }
});

test("le stock de thèmes tourne en rond sans jamais rendre `undefined`", () => {
  assert.equal(themeDe(1).fr, themeDe(NB_THEMES + 1).fr, "la roue ne boucle pas");
  for (const n of [-3, 0, 1, NB_THEMES, NB_THEMES + 1]) assert.ok(themeDe(n).fr, `thème ${n}`);
});

test("le nombre de cases reste dans ses bornes, même mal réglé", () => {
  // ⚠️ C'EST LE RÉGLAGE LE PLUS SENSIBLE DU FORMAT. Mesuré sur 3 000 joueurs qui
  // optimisent tous, avec cinq réponses évidentes : six cases rendent 23 totaux
  // distincts et un paquet d'ex aequo de 13,9 % EN HAUT du classement ; sept en
  // rendent 131, et le paquet tombe à 2,1 %. Une case de plus divise le paquet
  // par six. D'où des bornes dures : un `CASES` mal saisi ne doit pas pouvoir
  // sortir un thème du domaine jouable.
  for (const t of [themeDe(1), themeDe(7), themeDe(NB_THEMES)]) {
    const n = casesDe(t);
    assert.ok(Number.isInteger(n) && n >= CASES_MIN && n <= CASES_MAX, `${t.fr} : ${n}`);
  }
  assert.equal(casesDe(themeDe(1)), CASES_PAR_DEFAUT, "par défaut, tant qu'on n'a rien mesuré");
});

// --------------------------------------------------- passe-plat des mots

test("la grille rendue par la base est reprise telle quelle", () => {
  const e = traduisMots({
    status: "ok", repondu: true, assez: true, votants: 32, cases: 6, total: 105, points: 54.7,
    rang: 7, exaequo: 18, partmieux: 19,
    grille: [{ mot: "sable", joueurs: 32, part: 100.0 }, { mot: "alpha5", joueurs: 4, part: 12.5 }],
  });
  assert.equal(e?.grille.length, 2);
  assert.equal(e?.grille[0]!.mot, "sable");
  assert.equal(e?.grille[1]!.part, 12.5);
  assert.equal(e?.total, 105, "le total est l'entier qui classe");
});

test("un mot que personne d'autre n'a écrit se lit sur l'effectif, jamais sur la part", () => {
  // ⚠️ LE PIÈGE, MESURÉ EN BASE. `part` COMPTE LE JOUEUR LUI-MÊME : sur une
  // journée à deux votants, un mot partagé par personne sort à 50 % — lue
  // seule, la part annonce donc « la moitié des joueurs » d'un mot qui n'a
  // marché pour personne. Et à dix mille votants, un joueur comme deux joueurs
  // s'arrondissent tous deux à 0,0 % : la marche disparaît. C'est `joueurs`,
  // et lui seul, qui distingue l'orphelin — l'écran s'en sert pour taire la
  // part et estomper la ligne, comme le fait le dépouillement en salle.
  const e = traduisMots({
    status: "ok", repondu: true, assez: false, votants: 2, cases: 6, total: 8, points: 66.7,
    rang: 1, exaequo: 1, partmieux: null,
    grille: [{ mot: "Plage", joueurs: 2, part: 100.0 }, { mot: "soleil", joueurs: 1, part: 50.0 }],
  });
  assert.equal(e?.grille[1]!.joueurs, 1, "un seul joueur : personne d'autre");
  assert.equal(e?.grille[1]!.part, 50, "et pourtant la part dit 50 % — d'où le fait de la taire");
  assert.equal(e?.grille[0]!.joueurs, 2, "deux joueurs : le mot a été partagé");
});

test("le rang des mots s'éteint avec la part, comme celui des nombres", () => {
  const mince = traduisMots({ status: "ok", repondu: true, assez: true, votants: 8, cases: 6,
    total: 30, points: 62.5, rang: 3, exaequo: 1, partmieux: null, grille: [] });
  assert.equal(mince?.rang, null);
  assert.equal(mince?.exAequo, null);
  assert.equal(mince?.points, 62.5, "le score, lui, reste");
});

test("un refus de la base n'est jamais replié sur une grille vide", () => {
  // « Pas répondu » sur une panne proposerait de retaper six mots à quelqu'un
  // dont la grille est déjà déposée — et le second envoi serait ignoré.
  assert.equal(traduisMots(null), null);
  assert.equal(traduisMots({ status: "invalid" }), null);
  assert.equal(traduisMots({ repondu: true, votants: 40 }), null, "sans `status: ok`, c'est un non");
});

test("les cinq blocs de partage sont distincts, et couvrent toute l'échelle", () => {
  // Un partage ne porte pas de CSS : la seule couleur qui voyage dans une
  // messagerie est celle d'un caractère. Cinq blocs pour cinq paliers — s'ils
  // ne sont pas distincts, la forme partagée ne raconte plus rien.
  const vus = new Set([100, 95, 80, 50, 20, 5, 0].map(blocDe));
  assert.equal(vus.size, 5, `seulement ${vus.size} blocs distincts`);
  for (let s = 0; s <= 100; s += 0.5) assert.ok(blocDe(s), `score ${s}`);
  assert.ok(blocDe(NaN), "une valeur impossible ne casse pas le partage");
});

// ------------------------------------------------------------------- compte

test("une série ancienne ne se rallume pas toute seule", () => {
  // ⚠️ LA BASE NE PEUT PAS TRANCHER ÇA, et c'est délibéré : elle ne connaît ni
  // le fuseau du joueur ni la charnière de 11 h 30. Elle rend la dernière
  // journée de la suite ; l'écran décide si la suite est encore vivante.
  // Sans cette règle, quelqu'un qui a joué cinq jours d'affilée il y a trois
  // mois verrait « 🔥 5 jours d'affilée » en arrivant, et le chiffre cesserait
  // de vouloir dire quoi que ce soit.
  assert.equal(serieVivante({ jours: 5, fin: 40 }, 40), 5, "jouée aujourd'hui");
  assert.equal(serieVivante({ jours: 5, fin: 39 }, 40), 5, "jouée hier : encore vivante");
  assert.equal(serieVivante({ jours: 5, fin: 38 }, 40), 0, "avant-hier : rompue");
  assert.equal(serieVivante({ jours: 99, fin: 1 }, 200), 0, "une vieille série reste éteinte");
});

test("une série absente ou refusée vaut zéro, jamais NaN", () => {
  // Un NULL rendu par une RPC est un REFUS, pas une donnée : on n'affiche rien
  // plutôt qu'un chiffre inventé.
  assert.equal(serieVivante(null, 12), 0);
  assert.equal(serieVivante({ jours: 0, fin: null }, 12), 0);
});

// ------------------------------------------------------- comparaison entre amis

test("le lien de partage porte la journée et le score, et jamais sous « s »", () => {
  // ⚠️ `s` EST DÉJÀ PRIS par l'entonnoir (`shareUrl` décore avec `?s=<canal>`).
  // Réutiliser cette lettre casserait l'attribution en silence : la visite
  // serait comptée sur un canal inventé, donc jamais comptée.
  const l = lienDefi("https://placet.app/games/banalo-jour", 12, 87.5, 100);
  assert.match(l, /[?&]j=12(&|$)/);
  assert.match(l, /[?&]r=87\.5(&|$)/);
  assert.ok(!/[?&]s=/.test(l), "le lien ne doit pas écrire de paramètre « s »");
  // Et il se greffe proprement sur une URL qui a déjà des paramètres.
  assert.match(lienDefi("https://x.fr/a?s=jeu", 3, 40, 100), /\?s=jeu&j=3&r=40/);
});

test("un lien hors bornes n'est pas décoré, et pas relu", () => {
  const nu = "https://placet.app/games/banalo-jour";
  assert.equal(lienDefi(nu, 0, 50, 100), nu, "journée impossible");
  assert.equal(lienDefi(nu, 5, 101, 100), nu, "score au-dessus du maximum");
  assert.equal(lienDefi(nu, 5, -1, 100), nu, "score négatif");
});

test("un défi fabriqué à la main est refusé", () => {
  // Sans ça, un paramètre bricolé afficherait « votre ami : 9 999 » — et la
  // comparaison, qui n'a de sens qu'entre gens qui se connaissent, deviendrait
  // une farce à la portée de n'importe qui.
  assert.equal(litDefi("?j=12&r=87.5", 100)?.resultat, 87.5);
  assert.equal(litDefi("?j=12&r=9999", 100), null, "score hors bornes");
  assert.equal(litDefi("?j=0&r=50", 100), null, "journée nulle");
  assert.equal(litDefi("?j=1.5&r=50", 100), null, "journée non entière");
  assert.equal(litDefi("?j=abc&r=50", 100), null, "journée illisible");
  assert.equal(litDefi("?r=50", 100), null, "journée absente");
  assert.equal(litDefi("?j=12", 100), null, "score absent");
  assert.equal(litDefi("", 100), null, "rien du tout");
  // Cinq sur cinq compte des essais, pas des points : la borne est celle du jeu.
  assert.equal(litDefi("?j=12&r=300", 500)?.resultat, 300);
  assert.equal(litDefi("?j=12&r=300", 100), null);
});

test("la répartition arrive entière, ou pas du tout", () => {
  // ⚠️ LA RÈGLE QUI NE SE VOIT PAS À LA RELECTURE : une bande à qui il manque un
  // repère n'est pas une bande à moitié. Sans ce refus en bloc, un `mien`
  // absent retomberait sur 0 et dessinerait « vous » sur la première barre —
  // un mensonge tranquille, sur la seule page où le joueur vient chercher la
  // vérité de la veille.
  const bonne = { gauche: 5, pas: 1 / 6, seaux: [3, 8, 20, 4], mien: 2, foule: 1 };
  const base = {
    status: "ok", repondu: true, assez: true, votants: 35, mienne: 1e6,
    mediane: 1.2e6, facteur: 1.2, points: 92.1, rang: 4, exaequo: 1, partmieux: 9,
  };
  assert.deepEqual(traduis({ ...base, repartition: bonne })?.repartition, bonne);

  // La journée ouverte n'en rend aucune : c'est le scellement, pas une panne.
  assert.equal(traduis({ ...base, repartition: null })?.repartition, null);
  assert.equal(traduis(base)?.repartition, null, "clé absente");

  for (const [quoi, rep] of [
    ["repère manquant", { ...bonne, mien: undefined }],
    ["repère hors des barres", { ...bonne, mien: 4 }],
    ["repère négatif", { ...bonne, foule: -1 }],
    ["repère non entier", { ...bonne, foule: 1.5 }],
    ["bord illisible", { ...bonne, gauche: "cinq" }],
    ["pas nul", { ...bonne, pas: 0 }],
    ["effectif négatif", { ...bonne, seaux: [3, -8, 20, 4] }],
    ["effectif illisible", { ...bonne, seaux: [3, "huit", 20, 4] }],
    ["aucune barre", { ...bonne, seaux: [] }],
  ] as [string, unknown][]) {
    assert.equal(traduis({ ...base, repartition: rep })?.repartition, null, quoi);
  }

  // Et le reste de l'état survit à une bande refusée : on perd le dessin, pas
  // le score.
  const abime = traduis({ ...base, repartition: { ...bonne, mien: 99 } });
  assert.equal(abime?.points, 92.1);
  assert.equal(abime?.repartition, null);
});

test("la forme de la journée ne nomme jamais le mot d'un autre", () => {
  // ⚠️ LA GARDE EST EN BASE — `20260822-banalo-mots-concentration.sql` ne rend
  // même pas le libellé d'une barre qui n'est pas la nôtre. Celle-ci est la
  // ceinture : si une régression le faisait sortir, l'écran refuserait quand
  // même de l'afficher. Nommer les mots les plus donnés diffuserait du texte
  // libre écrit par des joueurs à tous les autres, sur un jeu public et anonyme.
  const base = {
    status: "ok", repondu: true, assez: true, votants: 40, cases: 6,
    grille: [], total: 108, points: 41.7, rang: 12, exaequo: 1, partmieux: 28,
  };
  const conc = (barres: unknown[]) =>
    traduisMots({ ...base, concentration: { barres, distincts: 20, couverture: 45, cases: 6 } })?.concentration;

  const bon = conc([
    { part: 90, mien: true, mot: "sable" },
    { part: 40, mien: false, mot: null },
  ]);
  assert.equal(bon?.barres[0].mot, "sable", "mon mot est nommé");
  assert.equal(bon?.barres[1].mot, null);

  // Un libellé sur une barre qui n'est pas la mienne est JETÉ, pas affiché.
  const vole = conc([{ part: 40, mien: false, mot: "poisson" }]);
  assert.equal(vole?.barres[0].mot, null, "un mot d'autrui a survécu");
  assert.equal(vole?.barres[0].part, 40, "la hauteur, elle, reste");

  // Et la bande entière est refusée si une hauteur manque : un trou au milieu
  // d'un diagramme se lit comme une panne.
  assert.equal(conc([{ part: 90, mien: true, mot: "sable" }, { mien: false }]), null);
  assert.equal(conc([]), null, "aucune barre");
  assert.equal(traduisMots(base)?.concentration, null, "aucune bande rendue : rien");
});
