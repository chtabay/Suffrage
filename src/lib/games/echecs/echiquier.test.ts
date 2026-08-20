// L'ÉCHIQUIER — la lecture d'une position, et la notation localisée.
//
// ⚠️ LE TEST QUI COMPTE ICI EST CELUI DE LA NOTATION. « Rf3 » désigne une TOUR
// en anglais et un ROI en français : servir la notation anglaise à un joueur
// francophone ne produit pas une gêne, ça produit un contresens sur la pièce.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  libelleCoup,
  caseClaire, caseDe, coupsVers, departs, destinations, estBlanche,
  lirePosition, sanLocal,
} from "./echiquier";

const DEPART = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

test("la position de départ se lit dans le bon sens", () => {
  const p = lirePosition(DEPART);
  assert.equal(p.length, 8);
  assert.equal(p[0][0], "r", "a8 porte la tour noire");
  assert.equal(p[7][4], "K", "e1 porte le roi blanc");
  assert.equal(p[4][4], null, "e4 est vide");
});

test("les cases se nomment comme sur un échiquier", () => {
  assert.equal(caseDe(0, 0), "a8");
  assert.equal(caseDe(7, 0), "a1");
  assert.equal(caseDe(7, 7), "h1");
  assert.equal(caseDe(4, 4), "e4");
});

test("a1 est une case sombre, comme sur un vrai plateau", () => {
  assert.equal(caseClaire(7, 0), false, "a1");
  assert.equal(caseClaire(7, 1), true, "b1");
  assert.equal(caseClaire(0, 0), true, "a8");
});

test("une majuscule est blanche", () => {
  assert.equal(estBlanche("K"), true);
  assert.equal(estBlanche("k"), false);
});

test("un FEN tronqué ne casse pas l'écran", () => {
  const p = lirePosition("rnbq");
  assert.equal(p.length, 8);
  assert.equal(p[0].length, 8);
});

test("les départs et destinations viennent de la liste de l'arbitre", () => {
  const legal = ["e2e4", "e2e3", "g1f3", "g1h3"];
  assert.deepEqual([...departs(legal)].sort(), ["e2", "g1"]);
  assert.deepEqual(destinations(legal, "e2").sort(), ["e3", "e4"]);
  assert.deepEqual(destinations(legal, "a1"), [], "aucune case de départ inconnue");
});

test("une promotion offre les quatre pièces, jamais une seule", () => {
  const legal = ["e7e8q", "e7e8r", "e7e8b", "e7e8n", "d2d4"];
  assert.equal(coupsVers(legal, "e7", "e8").length, 4);
  assert.equal(coupsVers(legal, "d2", "d4").length, 1);
});

test("la notation est traduite, et « R » ne veut pas dire la même chose", () => {
  assert.equal(sanLocal("Nf3", "fr"), "Cf3", "le cavalier anglais devient C");
  assert.equal(sanLocal("Rf3", "fr"), "Tf3", "la TOUR anglaise devient T, pas R");
  assert.equal(sanLocal("Kf3", "fr"), "Rf3", "le ROI anglais devient R");
  assert.equal(sanLocal("Bb5", "es"), "Ab5", "le fou anglais devient A en espagnol");
  assert.equal(sanLocal("Qh4#", "fr"), "Dh4#", "les signes d'échec sont préservés");
  assert.equal(sanLocal("e4", "fr"), "e4", "un coup de pion n'a pas d'initiale");
  assert.equal(sanLocal("O-O", "fr"), "O-O", "le roque n'est pas touché");
});

test("un coup se lit depuis la position, sans connaître les règles", () => {
  const depart = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const c = libelleCoup(depart, "g1f3");
  assert.equal(c.de, "g1");
  assert.equal(c.vers, "f3");
  assert.equal(c.promo, null);

  // Une case vide ne fait pas planter : on rend un glyphe vide, pas une erreur.
  assert.equal(libelleCoup(depart, "e4e5").glyphe, "");
});

// ⚠️ CE TEST GARDE UNE CONVENTION QUI S'INVERSE SELON L'ENDROIT, et c'est la
// seule chose vraiment contre-intuitive de ce module. Sur l'ÉCHIQUIER, les deux
// camps sont des silhouettes PLEINES (une pièce claire dessinée en creux sur
// une case claire mesure 1,19:1 : invisible). Dans une PHRASE, où le fond est
// blanc, c'est l'inverse : le camp clair est creux, le sombre est plein.
//
// Sans cette inversion, le bulletin d'un joueur blanc affichait « ♟ e2 → e4 »
// — un pion NOIR — juste sous un échiquier où son pion était crème. Trouvé en
// jouant, pas en relisant.
test("dans une phrase, la pièce claire est CREUSE et la sombre est pleine", () => {
  const depart = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  const blanc = libelleCoup(depart, "g1f3");
  assert.equal(blanc.glyphe, "♘", "le cavalier BLANC se dessine en creux hors du damier");
  assert.equal(blanc.clair, true);

  const noir = libelleCoup(depart, "b8c6");
  assert.equal(noir.glyphe, "♞", "le cavalier NOIR reste plein");
  assert.equal(noir.clair, false);

  // Une promotion dit en quoi le pion se change — sinon quatre coups vers la
  // même case seraient quatre libellés identiques — et elle suit le même camp.
  const p = libelleCoup("8/4P3/8/8/8/8/8/4K2k w - - 0 1", "e7e8q");
  assert.equal(p.glyphe, "♙");
  assert.equal(p.promo, "♕");

  const pn = libelleCoup("4k3/8/8/8/8/8/4p3/4K3 b - - 0 1", "e2e1q");
  assert.equal(pn.glyphe, "♟");
  assert.equal(pn.promo, "♛");
});
