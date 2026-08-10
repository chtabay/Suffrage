// Tests des règles d'Unanimo.
//
// STRATÉGIE. Le barème et la normalisation sont les deux endroits où une
// approximation se voit immédiatement à la table (« pourquoi Léa a 4 et moi 0 ? »),
// et le seul endroit où le code existe en DEUX exemplaires : ici, et dans
// `scrutin_game_unanimo_reveal` / `scrutin_game_norm` en base. Les cas ci-dessous
// sont donc écrits pour pouvoir être REJOUÉS TELS QUELS en SQL : ce sont les
// mêmes mots, les mêmes joueurs, les mêmes attentes. Les valeurs qui suivent ont
// été confrontées à la base avant d'être figées ici.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SCORING_RULES, normalizeWord, scoreRound, wordPoints } from "./scoring";
import { THEMES, pickTheme, themeLabel } from "./themes";

/* ------------------------------------------------------------- le barème */

test("barème officiel : N joueurs → N points chacun, seul → 0", () => {
  assert.equal(wordPoints(0), 0);
  assert.equal(wordPoints(1), 0, "un mot que personne d'autre n'a écrit ne rapporte rien");
  assert.equal(wordPoints(2), 2);
  assert.equal(wordPoints(3), 3);
  assert.equal(wordPoints(12), 12);
});

test("le barème est monotone : plus un mot est partagé, plus il rapporte", () => {
  for (const rule of Object.keys(SCORING_RULES) as (keyof typeof SCORING_RULES)[]) {
    for (let n = 1; n < 30; n++) {
      assert.ok(
        wordPoints(n + 1, rule) >= wordPoints(n, rule),
        `${rule} : ${n + 1} joueurs devraient rapporter au moins autant que ${n}`,
      );
    }
    assert.equal(wordPoints(1, rule), 0, `${rule} : être seul ne rapporte jamais`);
  }
});

test("variante douce : un point par autre joueur", () => {
  assert.equal(wordPoints(1, "gentle"), 0);
  assert.equal(wordPoints(2, "gentle"), 1);
  assert.equal(wordPoints(5, "gentle"), 4);
});

/* ------------------------------------------------------ la normalisation */

test("casse, espaces et accents ne créent pas deux mots", () => {
  for (const w of ["Plage", "plage", "PLAGE", "  plage  ", "Plâge"]) {
    assert.equal(normalizeWord(w), "plage", w);
  }
  assert.equal(normalizeWord("Étoile de mer"), "etoile de mer");
  assert.equal(normalizeWord("porte-avions"), "porte avion");
  assert.equal(normalizeWord("porte   avions"), "porte avion");
  assert.equal(normalizeWord("cœur"), "coeur");
  assert.equal(normalizeWord("piñata"), "pinata");
  assert.equal(normalizeWord("l'été !"), "l ete");
});

test("le pluriel se replie quand le radical garde 4 caractères", () => {
  assert.equal(normalizeWord("plages"), "plage");
  assert.equal(normalizeWord("vagues"), "vague");
  assert.equal(normalizeWord("poissons"), "poisson");
  assert.equal(normalizeWord("requins"), "requin");
  assert.equal(normalizeWord("abysses"), "abysse");
});

test("le pluriel NE se replie PAS quand ça abîmerait le mot", () => {
  // Faux positifs qu'un seuil plus bas produirait — le pire défaut possible ici.
  assert.equal(normalizeWord("bus"), "bus");
  assert.equal(normalizeWord("mois"), "mois", "« mois » ne doit jamais devenir « moi »");
  assert.notEqual(normalizeWord("mois"), normalizeWord("moi"));
  assert.equal(normalizeWord("stress"), "stress", "double s : ce n'est pas un pluriel");
  // Limite ASSUMÉE et documentée : trop court pour être replié.
  assert.notEqual(normalizeWord("mers"), normalizeWord("mer"));
});

test("une saisie vide ou purement décorative ne produit pas de mot", () => {
  for (const w of ["", "   ", "!!!", "—", "??"]) assert.equal(normalizeWord(w), "");
});

/* --------------------------------------------------- le dépouillement */

test("le cas de référence, rejoué à l'identique en base", () => {
  // 4 joueurs sur 5 ont répondu ; Alice a écrit « plage » trois fois de trois
  // façons et a cité le thème.
  const r = scoreRound(
    [
      { player: "Alice", words: ["Plage", "Vague", "Poisson", "Sel", "plage", "  PLAGES  ", "La mer"] },
      { player: "Tom", words: ["plage", "vagues", "Poissons", "Surf"] },
      { player: "Léa", words: ["PLAGE", "Vague", "surf", "Bateau"] },
      { player: "Zoé", words: ["Plage", "vague", "Étoile de mer"] },
    ],
    "La mer",
  );

  // On fixe le POINTAGE sur la forme normalisée : c'est elle qui décide des
  // points, et son ordre est le même dans toutes les collations. Le libellé
  // affiché est de la présentation — vérifié juste après, mais séparément.
  assert.deepEqual(
    r.words.map((w) => [w.norm, w.count, w.points]),
    [
      ["plage", 4, 4],
      ["vague", 4, 4],
      ["poisson", 2, 2],
      ["surf", 2, 2],
      ["bateau", 1, 0],
      ["etoile de mer", 1, 0],
      ["sel", 1, 0],
    ],
  );
  // Le libellé est TOUJOURS une des formes réellement écrites par un joueur.
  for (const w of r.words) assert.equal(normalizeWord(w.label), w.norm, w.label);
  assert.deepEqual(r.words[0].players, ["Alice", "Tom", "Léa", "Zoé"]);
  assert.deepEqual(r.points, { Alice: 10, Tom: 12, Léa: 10, Zoé: 8 });
  assert.ok(!r.words.some((w) => w.norm === "mer"), "le thème lui-même ne marque pas");
});

test("chaque MOT du thème est exclu, pas seulement le thème entier", () => {
  // ⚠️ L'assertion « le thème lui-même ne marque pas » du cas de référence
  // ci-dessus passait AVANT le correctif — parce qu'aucun joueur du jeu de
  // données n'écrivait « mer » tout court. La règle était fausse et le test la
  // déclarait juste : il faut la fixture qui la met en défaut.
  //
  // Les thèmes portent un article. « La mer » se normalise en « la mer », donc
  // une comparaison de chaîne entière laissait passer « mer » — le mot le plus
  // évident du thème, donc celui que tout le monde écrit, donc celui qui
  // rapportait le MAXIMUM à chaque manche.
  const r = scoreRound(
    [
      { player: "A", words: ["mer", "plage"] },
      { player: "B", words: ["Mer", "Plage"] },
      { player: "C", words: ["MER", "vague"] },
    ],
    "La mer",
  );
  assert.ok(!r.words.some((w) => w.norm === "mer"), "« mer » est un mot du thème");
  assert.deepEqual(r.points, { A: 2, B: 2, C: 0 });

  // Ce qu'on n'exclut PAS : les jetons de moins de trois lettres. « la » n'est
  // jamais une réponse plausible, et l'exclure risquerait d'écarter un mot
  // légitime dans une autre langue.
  const r2 = scoreRound([{ player: "A", words: ["la"] }], "La mer");
  assert.equal(r2.words.length, 1, "« la » reste un mot comme un autre");

  // Et un mot qui CONTIENT le thème n'est pas le thème.
  const r3 = scoreRound([{ player: "A", words: ["Étoile de mer"] }], "La mer");
  assert.deepEqual(r3.words.map((w) => w.norm), ["etoile de mer"]);
});

test("écrire deux fois le même mot ne le compte qu'une fois", () => {
  const r = scoreRound([
    { player: "A", words: ["chien", "Chien", "CHIENS"] },
    { player: "B", words: ["chien"] },
  ]);
  assert.equal(r.words.length, 1);
  assert.equal(r.words[0].count, 2, "A ne compte qu'une fois dans le groupe");
  assert.deepEqual(r.points, { A: 2, B: 2 });
});

test("un joueur qui n'envoie rien reste au tableau avec 0", () => {
  const r = scoreRound([
    { player: "A", words: ["soleil"] },
    { player: "B", words: [] },
  ]);
  assert.deepEqual(r.points, { A: 0, B: 0 });
});

test("le libellé affiché est la forme la plus écrite par le groupe", () => {
  const r = scoreRound([
    { player: "A", words: ["Chien"] },
    { player: "B", words: ["chien"] },
    { player: "C", words: ["chien"] },
  ]);
  assert.equal(r.words[0].label, "chien", "2 minuscules contre 1 majuscule");
  assert.deepEqual(r.words[0].players, ["A", "B", "C"]);
});

test("à normalisation égale, on garde la forme écrite EN PREMIER", () => {
  // Aucune égalité de fréquence n'est tranchée par l'alphabet : ce chemin
  // dépendrait de la collation, et la base ne pourrait pas s'y accorder.
  assert.equal(scoreRound([{ player: "A", words: ["PLAGES", "Plage", "plage"] }]).words[0].label, "PLAGES");
  assert.equal(scoreRound([{ player: "A", words: ["plage", "Plage", "PLAGES"] }]).words[0].label, "plage");
});

test("le total d'une manche est la somme des points de ses mots", () => {
  const entries = [
    { player: "A", words: ["un", "deux", "trois"] },
    { player: "B", words: ["un", "deux", "quatre"] },
    { player: "C", words: ["un", "cinq"] },
  ];
  const r = scoreRound(entries);
  const parMots = r.words.reduce((s, w) => s + w.points * w.count, 0);
  const parJoueurs = Object.values(r.points).reduce((s, p) => s + p, 0);
  assert.equal(parMots, parJoueurs);
});

/* ------------------------------------------------------------ les thèmes */

test("chaque thème existe dans les quatre langues", () => {
  for (const t of THEMES) {
    for (const [loc, label] of [["fr", t.fr], ["en", t.en], ["es", t.es], ["pcm", t.pcm]] as const) {
      assert.ok(label && label.trim().length > 1, `${loc} manquant sur ${t.en}`);
    }
    assert.ok(t.emoji.length > 0, `emoji manquant sur ${t.en}`);
  }
});

test("aucun doublon de thème dans une même langue", () => {
  for (const loc of ["fr", "en", "es", "pcm"]) {
    const seen = new Set<string>();
    for (const t of THEMES) {
      const k = themeLabel(t, loc).toLowerCase();
      assert.ok(!seen.has(k), `doublon ${loc} : ${k}`);
      seen.add(k);
    }
  }
});

test("un thème déjà joué ne ressort pas, et la liste ne s'épuise jamais", () => {
  const used: string[] = [];
  // On vide la liste entière : chaque tirage doit être neuf.
  for (let i = 0; i < THEMES.length; i++) {
    const p = pickTheme("fr", used);
    assert.ok(p.text, "un thème doit toujours avoir un libellé");
    assert.ok(!used.includes(p.text!), `« ${p.text} » a déjà été joué`);
    used.push(p.text!);
  }
  // Liste épuisée : on recommence plutôt que de bloquer la partie.
  const extra = pickTheme("fr", used);
  assert.ok(extra.text && used.includes(extra.text));
});

test("le thème suit la langue de la salle, avec repli sur l'anglais", () => {
  const t = THEMES[0];
  assert.equal(themeLabel(t, "fr"), t.fr);
  assert.equal(themeLabel(t, "es"), t.es);
  assert.equal(themeLabel(t, "pcm"), t.pcm);
  assert.equal(themeLabel(t, "de"), t.en, "langue inconnue → anglais");
});
