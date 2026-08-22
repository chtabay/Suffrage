// LE VOCABULAIRE FERMÉ DES NOMS — ce que les tests tiennent ici, et pourquoi.
//
// ⚠️ LE CONTRÔLE DE PARITÉ i18n NE VOIT PAS CE FICHIER : il ne lit que
// `messages/*.json`. Une langue oubliée dans une entrée passerait donc le build
// sans un mot, et un joueur hispanophone verrait un nom en français au milieu
// d'un tableau. C'est ce test qui tient les quatre langues, à la place.
import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  ANIMAUX,
  COMBINAISONS,
  COMPLEMENTS,
  graineDe,
  nomDe,
  nomsProposes,
} from "./noms";

const LANGUES = ["fr", "en", "es", "pcm"] as const;

test("les quatre langues sont remplies, partout", () => {
  for (const [nom, liste] of [["animaux", ANIMAUX], ["compléments", COMPLEMENTS]] as const) {
    for (const e of liste) {
      for (const l of LANGUES) {
        assert.equal(typeof e[l], "string", `${nom} : ${l} manque sur ${JSON.stringify(e)}`);
        assert.ok(e[l]!.trim().length > 0, `${nom} : ${l} vide sur ${JSON.stringify(e)}`);
      }
    }
  }
});

test("aucun doublon dans une langue", () => {
  // Deux entrées identiques feraient deux noms identiques pour deux joueurs
  // différents, et le tableau afficherait deux fois la même ligne.
  for (const liste of [ANIMAUX, COMPLEMENTS]) {
    for (const l of LANGUES) {
      const vus = liste.map((e) => e[l]!.toLowerCase());
      assert.equal(new Set(vus).size, vus.length, `doublon en ${l} : ${vus.join(", ")}`);
    }
  }
});

test("le vocabulaire fait bien le compte annoncé", () => {
  assert.equal(COMBINAISONS, ANIMAUX.length * COMPLEMENTS.length);
  // ⚠️ CALIBRÉ SUR UNE FOULE, PAS SUR L'INFINI. Six cents noms suffisent à une
  // journée de quelques centaines de joueurs ; au-delà, c'est le dépôt qui
  // refuse un nom déjà pris ce jour-là. Si ce chiffre baisse un jour, c'est ce
  // test qui le dira.
  assert.ok(COMBINAISONS >= 600, `vocabulaire trop maigre : ${COMBINAISONS}`);
});

test("chaque index rend un nom distinct, et l'index seul suffit", () => {
  // ⚠️ C'EST L'INDEX QU'ON STOCKE, PAS LE LIBELLÉ : un nom stocké en français
  // s'afficherait en français à un anglophone du même tableau. La bijection
  // index → nom doit donc tenir dans CHAQUE langue.
  for (const l of LANGUES) {
    const tous = Array.from({ length: COMBINAISONS }, (_, i) => nomDe(i, l));
    assert.equal(new Set(tous).size, COMBINAISONS, `collision en ${l}`);
  }
});

test("un index hors bornes ne casse rien", () => {
  // Une ligne abîmée en base ne doit pas faire tomber l'écran d'un tableau.
  assert.equal(nomDe(COMBINAISONS, "fr"), nomDe(0, "fr"));
  assert.equal(nomDe(-1, "fr"), nomDe(COMBINAISONS - 1, "fr"));
  assert.ok(nomDe(999999, "fr").length > 0);
});

test("les propositions sont distinctes et reproductibles", () => {
  // ⚠️ REPRODUCTIBLES, ET C'EST LE POINT. Sans graine, chaque rendu de React
  // proposerait une autre liste et le nom que le joueur s'apprêtait à choisir
  // disparaîtrait sous ses yeux.
  const g = graineDe("zzjeton00001");
  const a = nomsProposes(g, 4);
  assert.equal(a.length, 4);
  assert.equal(new Set(a).size, 4, "deux fois le même nom proposé");
  assert.deepEqual(nomsProposes(g, 4), a, "deux appels, deux listes");
  // « En proposer d'autres » change le tour, donc la liste.
  assert.notDeepEqual(nomsProposes(g, 4, 1), a);
  // Et deux joueurs ne se voient pas proposer la même chose.
  assert.notDeepEqual(nomsProposes(graineDe("zzjeton00002"), 4), a);
});

test("la graine ne redonne pas le jeton", () => {
  // Elle n'a pas à être secrète, mais elle ne doit pas être le jeton lui-même :
  // celui-ci ne quitte pas le navigateur.
  const jeton = "zzjeton00001";
  const g = graineDe(jeton);
  assert.equal(typeof g, "number");
  assert.ok(Number.isInteger(g) && g >= 0);
  assert.ok(!String(g).includes(jeton));
});
