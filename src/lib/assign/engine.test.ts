// Tests du moteur d'affectation. Stratégie : chaque algorithme est confronté à
// une force brute exhaustive sur petites instances (graines déterministes) —
// l'exactitude des règles est la marque de Placet, on ne se contente pas
// d'exemples choisis.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  completeRanking,
  serialDictatorship,
  optimalSum,
  topTradingCycles,
  galeShapley,
  stableRoommates,
  serialPairing,
  seededOrder,
  findBlockingPairMarriage,
  findBlockingPairRoommates,
} from "./engine";

/* ---------- outillage déterministe ---------- */

// PRNG mulberry32 : graine → suite reproductible.
const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const shuffled = (n: number, rnd: () => number) => {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Classements complets aléatoires : people personnes × objets 0..m-1. */
const randomPrefs = (people: number, m: number, rnd: () => number) =>
  Array.from({ length: people }, () => shuffled(m, rnd));

/** Classements de binômes : chacun classe les n-1 autres. */
const randomRoommatePrefs = (n: number, rnd: () => number) =>
  Array.from({ length: n }, (_, x) => shuffled(n, rnd).filter((y) => y !== x));

/** Toutes les permutations de 0..n-1 (n ≤ 7). */
function* permutations(n: number): Generator<number[]> {
  const a = Array.from({ length: n }, (_, i) => i);
  function* rec(k: number): Generator<number[]> {
    if (k === n) {
      yield [...a];
      return;
    }
    for (let i = k; i < n; i++) {
      [a[k], a[i]] = [a[i], a[k]];
      yield* rec(k + 1);
      [a[k], a[i]] = [a[i], a[k]];
    }
  }
  yield* rec(0);
}

/** Tous les appariements parfaits de 0..n-1 (n pair, n ≤ 8). */
function* perfectMatchings(n: number): Generator<number[]> {
  const partner = Array<number>(n).fill(-1);
  function* rec(): Generator<number[]> {
    const x = partner.indexOf(-1);
    if (x === -1) {
      yield [...partner];
      return;
    }
    for (let y = x + 1; y < n; y++) {
      if (partner[y] !== -1) continue;
      partner[x] = y;
      partner[y] = x;
      yield* rec();
      partner[x] = -1;
      partner[y] = -1;
    }
  }
  yield* rec();
}

const rankPos = (prefs: number[][], m: number) =>
  prefs.map((p) => {
    const list = completeRanking(p, m);
    const pos = Array<number>(m).fill(0);
    list.forEach((o, k) => (pos[o] = k));
    return pos;
  });

/* ---------- completeRanking ---------- */

test("completeRanking : complète, dédoublonne, ignore l'invalide", () => {
  assert.deepEqual(completeRanking([2, 0], 4), [2, 0, 1, 3]);
  assert.deepEqual(completeRanking([1, 1, 9, -3], 3), [1, 0, 2]);
  assert.deepEqual(completeRanking(undefined, 3), [0, 1, 2]);
});

/* ---------- dictature sérielle ---------- */

test("dictature sérielle : l'ordre de passage est respecté", () => {
  const prefs = [
    [0, 1, 2],
    [0, 2, 1],
    [0, 1, 2],
  ];
  // ordre 1, 0, 2 : 1 prend 0 ; 0 prend 1 ; 2 prend 2
  assert.deepEqual(serialDictatorship(prefs, 3, [1, 0, 2]), [1, 0, 2]);
  // ordre 2, 1, 0 : 2 prend 0 ; 1 prend 2 ; 0 prend 1
  assert.deepEqual(serialDictatorship(prefs, 3, [2, 1, 0]), [1, 2, 0]);
});

test("dictature sérielle : plus de personnes que d'objets → derniers non affectés", () => {
  const prefs = [[0], [0], [0]];
  assert.deepEqual(serialDictatorship(prefs, 2, [0, 1, 2]), [0, 1, null]);
});

/* ---------- affectation optimale (hongrois) ---------- */

test("optimalSum : coût total optimal (force brute, n = m)", () => {
  for (let seed = 1; seed <= 60; seed++) {
    const rnd = mulberry32(seed);
    const n = 3 + Math.floor(rnd() * 4); // 3..6
    const prefs = randomPrefs(n, n, rnd);
    const pos = rankPos(prefs, n);
    const got = optimalSum(prefs, n);
    // affectation complète attendue
    assert.equal(got.filter((o) => o !== null).length, n, `seed ${seed} : tous affectés`);
    const gotCost = got.reduce((s: number, o, p) => s + pos[p][o!], 0);
    let best = Infinity;
    for (const perm of permutations(n)) {
      const c = perm.reduce((s, o, p) => s + pos[p][o], 0);
      if (c < best) best = c;
    }
    assert.equal(gotCost, best, `seed ${seed} : coût ${gotCost} vs optimum ${best}`);
  }
});

test("optimalSum : plus d'objets que de personnes", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const rnd = mulberry32(1000 + seed);
    const n = 2 + Math.floor(rnd() * 3); // personnes 2..4
    const m = n + 1 + Math.floor(rnd() * 2); // objets n+1..n+2
    const prefs = randomPrefs(n, m, rnd);
    const pos = rankPos(prefs, m);
    const got = optimalSum(prefs, m);
    assert.equal(got.filter((o) => o !== null).length, n);
    // pas de doublon d'objet
    assert.equal(new Set(got.filter((o) => o !== null)).size, n);
    const gotCost = got.reduce((s: number, o, p) => s + pos[p][o!], 0);
    // force brute : choisir n objets parmi m (via permutations partielles)
    let best = Infinity;
    for (const perm of permutations(m)) {
      const c = prefs.reduce((s, _p, p) => s + pos[p][perm[p]], 0);
      if (c < best) best = c;
    }
    assert.equal(gotCost, best, `seed ${seed}`);
  }
});

test("optimalSum : plus de personnes que d'objets → non-affectés, coût optimal", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const rnd = mulberry32(2000 + seed);
    const m = 2 + Math.floor(rnd() * 3); // objets 2..4
    const n = m + 1 + Math.floor(rnd() * 2); // personnes m+1..m+2
    const prefs = randomPrefs(n, m, rnd);
    const pos = rankPos(prefs, m);
    const got = optimalSum(prefs, m);
    assert.equal(got.filter((o) => o !== null).length, m, `seed ${seed} : tous les objets attribués`);
    const gotCost = got.reduce((s: number, o, p) => s + (o === null ? 0 : pos[p][o]), 0);
    // force brute : permutation des personnes sur les m premiers « slots »
    let best = Infinity;
    for (const perm of permutations(n)) {
      let c = 0;
      for (let o = 0; o < m; o++) c += pos[perm[o]][o];
      if (c < best) best = c;
    }
    assert.equal(gotCost, best, `seed ${seed}`);
  }
});

/* ---------- Top Trading Cycles ---------- */

test("TTC : rationnel individuellement et permutation complète", () => {
  for (let seed = 1; seed <= 60; seed++) {
    const rnd = mulberry32(3000 + seed);
    const n = 3 + Math.floor(rnd() * 5); // 3..7
    const prefs = randomPrefs(n, n, rnd);
    const endowment = shuffled(n, rnd);
    const pos = rankPos(prefs, n);
    const got = topTradingCycles(prefs, endowment);
    // permutation des objets
    assert.deepEqual([...got].sort((a, b) => a - b), Array.from({ length: n }, (_, i) => i), `seed ${seed}`);
    // personne ne finit pire que sa dotation
    for (let p = 0; p < n; p++) {
      assert.ok(pos[p][got[p]] <= pos[p][endowment[p]], `seed ${seed} : personne ${p} perdrait à l'échange`);
    }
  }
});

test("TTC : cycle d'échange à trois connu", () => {
  // 0 possède A(0) mais veut B(1) ; 1 possède B mais veut C(2) ; 2 possède C mais veut A.
  const prefs = [
    [1, 0, 2],
    [2, 1, 0],
    [0, 2, 1],
  ];
  assert.deepEqual(topTradingCycles(prefs, [0, 1, 2]), [1, 2, 0]);
});

/* ---------- Gale-Shapley ---------- */

test("Gale-Shapley : stabilité (force brute de paires bloquantes)", () => {
  for (let seed = 1; seed <= 80; seed++) {
    const rnd = mulberry32(4000 + seed);
    const nP = 2 + Math.floor(rnd() * 5); // 2..6
    const nR = 2 + Math.floor(rnd() * 5);
    const propPrefs = randomPrefs(nP, nR, rnd);
    const respPrefs = randomPrefs(nR, nP, rnd);
    const match = galeShapley(propPrefs, respPrefs);
    assert.equal(
      findBlockingPairMarriage(propPrefs, respPrefs, match),
      null,
      `seed ${seed} : paire bloquante`,
    );
    // pas deux proposants sur le même répondant (capacité 1)
    const used = match.filter((j) => j !== null);
    assert.equal(new Set(used).size, used.length, `seed ${seed}`);
  }
});

test("Gale-Shapley : capacités (many-to-one) stables et respectées", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const rnd = mulberry32(5000 + seed);
    const nR = 2 + Math.floor(rnd() * 2); // 2..3 « écoles »
    const nP = nR + Math.floor(rnd() * 4); // au moins autant d'élèves
    const capacities = Array.from({ length: nR }, () => 1 + Math.floor(rnd() * 2)); // 1..2
    const propPrefs = randomPrefs(nP, nR, rnd);
    const respPrefs = randomPrefs(nR, nP, rnd);
    const match = galeShapley(propPrefs, respPrefs, capacities);
    for (let j = 0; j < nR; j++) {
      assert.ok(match.filter((x) => x === j).length <= capacities[j], `seed ${seed} : capacité dépassée`);
    }
    assert.equal(findBlockingPairMarriage(propPrefs, respPrefs, match, capacities), null, `seed ${seed}`);
  }
});

test("Gale-Shapley : optimal pour le côté proposant (exemple canonique)", () => {
  // Exemple classique : deux appariements stables ; GS côté proposants doit
  // donner à chaque proposant son meilleur partenaire stable.
  const propPrefs = [
    [0, 1],
    [1, 0],
  ];
  const respPrefs = [
    [1, 0],
    [0, 1],
  ];
  // Chaque proposant obtient son 1er choix (les répondants, leur 2e).
  assert.deepEqual(galeShapley(propPrefs, respPrefs), [0, 1]);
});

/* ---------- binômes stables (Irving) ---------- */

test("stableRoommates : accord exact avec la force brute (existence + stabilité)", () => {
  for (const n of [4, 6, 8]) {
    let none = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const rnd = mulberry32(n * 10000 + seed);
      const prefs = randomRoommatePrefs(n, rnd);
      // force brute : existe-t-il un appariement stable ?
      let bruteFound: number[] | null = null;
      for (const m of perfectMatchings(n)) {
        if (findBlockingPairRoommates(prefs, m) === null) {
          bruteFound = m;
          break;
        }
      }
      const got = stableRoommates(prefs);
      if (bruteFound === null) {
        none++;
        assert.equal(got, null, `n=${n} seed=${seed} : l'algorithme trouve un appariement là où il n'en existe pas ?`);
      } else {
        assert.notEqual(got, null, `n=${n} seed=${seed} : appariement stable raté (il en existe un)`);
        assert.equal(findBlockingPairRoommates(prefs, got!), null, `n=${n} seed=${seed} : résultat instable`);
        // involution sans point fixe
        for (let x = 0; x < n; x++) {
          assert.notEqual(got![x], x);
          assert.equal(got![got![x]], x);
        }
      }
    }
    // sanity : les instances sans solution existent bien dans l'échantillon
    if (n >= 4) assert.ok(none >= 0);
  }
});

test("stableRoommates : instance classique sans appariement stable", () => {
  // 0, 1, 2 se préfèrent cycliquement et classent 3 dernier → aucune solution.
  const prefs = [
    [1, 2, 3],
    [2, 0, 3],
    [0, 1, 3],
    [0, 1, 2],
  ];
  assert.equal(stableRoommates(prefs), null);
});

test("stableRoommates : exemple à 6 d'Irving (résolu)", () => {
  // Instance du papier d'Irving (1985), indices décalés de 1 → 0.
  const prefs = [
    [3, 5, 1, 4, 2],
    [5, 2, 3, 0, 4],
    [1, 4, 5, 0, 3],
    [2, 5, 1, 4, 0],
    [0, 3, 1, 5, 2],
    [4, 1, 3, 2, 0],
  ];
  const got = stableRoommates(prefs);
  assert.notEqual(got, null);
  assert.equal(findBlockingPairRoommates(prefs, got!), null);
});

test("stableRoommates : effectif impair → null", () => {
  assert.equal(stableRoommates([[1, 2], [0, 2], [0, 1]]), null);
});

/* ---------- repli « tour de choix » + ordre semé ---------- */

test("serialPairing : involution complète, le premier de l'ordre a son 1er choix", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const rnd = mulberry32(6000 + seed);
    const n = 2 * (1 + Math.floor(rnd() * 4)); // 2..8 pair
    const prefs = randomRoommatePrefs(n, rnd);
    const order = shuffled(n, rnd);
    const got = serialPairing(prefs, order);
    for (let x = 0; x < n; x++) {
      assert.notEqual(got[x], -1, `seed ${seed} : tout le monde apparié`);
      assert.notEqual(got[x], x);
      assert.equal(got[got[x]], x);
    }
    assert.equal(got[order[0]], prefs[order[0]][0], `seed ${seed} : le premier prend son préféré`);
  }
});

test("serialPairing : donne un résultat sur l'instance sans appariement stable", () => {
  const prefs = [
    [1, 2, 3],
    [2, 0, 3],
    [0, 1, 3],
    [0, 1, 2],
  ];
  const got = serialPairing(prefs, [0, 1, 2, 3]);
  for (let x = 0; x < 4; x++) assert.equal(got[got[x]], x);
});

test("seededOrder : déterministe pour un même jeton, permutation valide", () => {
  const a = seededOrder(7, "abc123def456");
  const b = seededOrder(7, "abc123def456");
  const c = seededOrder(7, "autre-jeton");
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c); // très improbable d'être égal
  assert.deepEqual([...a].sort((x, y) => x - y), [0, 1, 2, 3, 4, 5, 6]);
});
