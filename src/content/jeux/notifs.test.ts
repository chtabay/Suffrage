// LES TEXTES DE NOTIFICATION — ce que ce test tient, et pourquoi il existe.
//
// ⚠️ LE CONTRÔLE DE PARITÉ i18n NE VOIT PAS CE FICHIER. Il résout
// `useTranslations("NS")` puis ses appels à clé littérale, dans des composants
// React — et il lit aussi les commentaires, donc on n'écrit pas cet appel en
// exemple ici : il serait pris pour une clé manquante. Une
// notification est rendue par une route de cron, sans requête et sans locale de
// contexte. Une langue oubliée passerait donc le build sans un mot, et un joueur
// hispanophone recevrait une notification en français. Même motif que
// `noms.test.ts`, dont ce fichier suit la leçon.
//
// ⚠️ ET IL VA PLUS LOIN QUE LA PARITÉ : il éprouve CHAQUE combinaison que
// `scrutin_jeux_notifs_a_envoyer` peut produire. Le risque propre à ce chantier
// n'est pas la clé manquante — c'est le CAS manquant : une charge utile dont
// personne n'a écrit le texte, découverte sur le téléphone d'un joueur.
import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  LANGUES,
  hebdoBanalo,
  hebdoPays,
  journeeBanalo,
  journeePays,
  saison,
  type Langue,
  type Texte,
} from "./notifs";

/** Toute notification doit avoir un titre et un corps non vides, dans les 4 langues. */
function tenable(t: Texte, quoi: string, l: Langue) {
  assert.ok(t.titre.trim().length > 0, `${quoi} (${l}) : titre vide`);
  assert.ok(t.corps.trim().length > 0, `${quoi} (${l}) : corps vide`);
  // ⚠️ AUCUN `undefined` NE DOIT SE GLISSER DANS UNE PHRASE. C'est le mode de
  // défaillance de ce fichier : une donnée absente, une interpolation muette, et
  // le joueur lit « undefined % ont fait mieux ».
  for (const mot of ["undefined", "null", "NaN", "[object"]) {
    assert.ok(!t.titre.includes(mot), `${quoi} (${l}) : « ${mot} » dans le titre — ${t.titre}`);
    assert.ok(!t.corps.includes(mot), `${quoi} (${l}) : « ${mot} » dans le corps — ${t.corps}`);
  }
}

test("les quatre langues rendent la clôture de Banalo, avec et sans position", () => {
  for (const l of LANGUES) {
    tenable(journeeBanalo({ jour: 12, mieux: 14 }, l), "journeeBanalo", l);
    // Le joueur seul : `mieux` est nul, et la phrase doit CHANGER — pas afficher
    // « 0 % ont fait mieux », qui voudrait dire « vous avez gagné ».
    const seul = journeeBanalo({ jour: 12, mieux: null }, l);
    tenable(seul, "journeeBanalo (seul)", l);
    assert.notEqual(seul.corps, journeeBanalo({ jour: 12, mieux: 0 }, l).corps,
      `(${l}) « seul » et « 0 % » disent la même chose`);
    // Et `undefined` doit se comporter comme `null` : la base peut ne pas mettre
    // la clé du tout, ce que `?? ` ne rattrape pas si l'on teste `=== null`.
    assert.equal(journeeBanalo({ jour: 12 }, l).corps, seul.corps,
      `(${l}) une clé ABSENTE ne se comporte pas comme une clé nulle`);
  }
});

test("les quatre langues rendent la clôture de Cinq sur cinq, effectif compris", () => {
  for (const l of LANGUES) {
    const t = journeePays({ jour: 9, essais: 6, rang: 3, sur: 12 }, l);
    tenable(t, "journeePays", l);
    // ⚠️ LE RANG NE VA JAMAIS SANS SON EFFECTIF — la règle de tout ce produit.
    assert.ok(t.corps.includes("12"), `(${l}) l'effectif manque : ${t.corps}`);
    assert.ok(t.corps.includes("6"), `(${l}) le nombre d'essais manque : ${t.corps}`);
  }
});

test("les quatre langues rendent le bilan de semaine des deux jeux", () => {
  for (const l of LANGUES) {
    tenable(hebdoBanalo({ semaine: "2026-W35", journees: 5, points: 41, meilleur: 0 }, l), "hebdoBanalo", l);
    // Une semaine sans aucune position : la phrase doit se raccourcir, pas mentir.
    tenable(hebdoBanalo({ semaine: "2026-W35", journees: 3, points: 3, meilleur: null }, l), "hebdoBanalo (sans position)", l);
    tenable(hebdoPays({ semaine: "2026-W35", journees: 4, points: 52, meilleur: 4 }, l), "hebdoPays", l);
  }
});

test("les quatre langues rendent la fin de saison, avec et sans médaille", () => {
  for (const jeu of ["banalo", "pays"] as const) {
    for (const l of LANGUES) {
      const avec = saison({ saison: "2026-08", langue: jeu === "banalo" ? "fr" : null,
                            place: 1, points: 402, joueurs: 14, medaille: true }, jeu, l);
      tenable(avec, `saison ${jeu} (médaille)`, l);
      const sans = saison({ saison: "2026-08", langue: null,
                            place: 9, points: 61, joueurs: 14, medaille: false }, jeu, l);
      tenable(sans, `saison ${jeu} (sans médaille)`, l);
      assert.notEqual(avec.titre, sans.titre, `(${l}, ${jeu}) médaille et non-médaille ont le même titre`);
    }
  }
});

test("le mois se traduit, et le pidgin retombe sur les conventions anglaises", () => {
  const d = { saison: "2026-08", langue: null, place: 2, points: 100, joueurs: 9, medaille: true };
  assert.ok(saison(d, "banalo", "fr").titre.toLowerCase().includes("août"));
  assert.ok(saison(d, "banalo", "en").titre.toLowerCase().includes("august"));
  assert.ok(saison(d, "banalo", "es").titre.toLowerCase().includes("agosto"));
  // ⚠️ `Intl` NE CONNAÎT PAS `pcm` : sans le repli, il lèverait ou rendrait le
  // code brut. Le pidgin s'écrit aux conventions anglaises, comme partout ici.
  assert.ok(saison(d, "banalo", "pcm").titre.toLowerCase().includes("august"));
});

test("les deux jeux se distinguent dans le titre, dans les quatre langues", () => {
  // Un joueur des deux reçoit DEUX notifications le même jour : elles doivent se
  // distinguer sur un écran verrouillé, où le corps est tronqué.
  for (const l of LANGUES) {
    assert.notEqual(journeeBanalo({ jour: 5, mieux: 10 }, l).titre,
                    journeePays({ jour: 5, essais: 3, rang: 1, sur: 4 }, l).titre,
                    `(${l}) les deux clôtures ont le même titre`);
    assert.notEqual(hebdoBanalo({ semaine: "2026-W35", journees: 2, points: 4, meilleur: 5 }, l).titre,
                    hebdoPays({ semaine: "2026-W35", journees: 2, points: 4, meilleur: 5 }, l).titre,
                    `(${l}) les deux bilans ont le même titre`);
  }
});
