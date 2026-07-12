// Moteur d'affectation : algorithmes purs, miroir de voting/engine.ts pour le
// vote. Aucun aléa interne — l'ordre de passage ou la dotation initiale sont
// passés en paramètres (l'UI les tire au sort et les affiche : transparence).
//
// Deux familles :
//  - à sens unique  : des personnes classent des objets (bureaux, tâches…)
//      serialDictatorship · optimalSum (hongrois) · topTradingCycles
//  - à double sens  : les deux côtés classent
//      galeShapley (mentors/écoles, capacités) · stableRoommates (binômes, Irving)
//
// Conventions : personnes et objets = indices 0..n-1 ; un classement est un
// tableau d'indices du préféré au moins aimé, éventuellement partiel — il est
// complété par ordre d'indice croissant (règle stable et annonçable).

/** Complète un classement partiel sur n objets : indices valides dédoublonnés, puis le reste par ordre croissant. */
export function completeRanking(pref: readonly number[] | undefined, n: number): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const o of pref ?? []) {
    if (Number.isInteger(o) && o >= 0 && o < n && !seen.has(o)) {
      seen.add(o);
      out.push(o);
    }
  }
  for (let o = 0; o < n; o++) if (!seen.has(o)) out.push(o);
  return out;
}

/* ------------------------------------------------------------------ */
/* Famille 1 — affectation à sens unique                               */
/* ------------------------------------------------------------------ */

/**
 * Dictature sérielle : chaque personne, dans l'ordre donné, prend son objet
 * préféré parmi ceux qui restent. Non manipulable ; tout dépend de l'ordre.
 * Renvoie assignment[p] = objet ou null (plus rien à prendre).
 */
export function serialDictatorship(
  prefs: readonly (readonly number[])[],
  nObjects: number,
  order: readonly number[],
): (number | null)[] {
  const assign: (number | null)[] = Array(prefs.length).fill(null);
  const taken = new Set<number>();
  for (const p of order) {
    if (p < 0 || p >= prefs.length || assign[p] !== null) continue;
    const pick = completeRanking(prefs[p], nObjects).find((o) => !taken.has(o));
    if (pick !== undefined) {
      assign[p] = pick;
      taken.add(pick);
    }
  }
  return assign;
}

/**
 * Draft serpentin : comme la dictature sérielle, mais chacun reçoit jusqu'à
 * `perPerson` objets. L'ordre fait l'aller-retour à chaque tour (1→N puis N→1)
 * pour compenser les derniers. Renvoie bundles[p] = objets reçus (dans l'ordre
 * de choix), listes disjointes.
 */
export function snakeDraft(
  prefs: readonly (readonly number[])[],
  nObjects: number,
  order: readonly number[],
  perPerson: number,
): number[][] {
  const n = prefs.length;
  const out: number[][] = Array.from({ length: n }, () => []);
  const taken = new Set<number>();
  const ranks = prefs.map((p) => completeRanking(p, nObjects));
  const per = Math.max(1, Math.floor(perPerson));
  for (let round = 0; round < per && taken.size < nObjects; round++) {
    const seq = round % 2 === 0 ? order : [...order].reverse();
    for (const p of seq) {
      if (p < 0 || p >= n || out[p].length > round) continue;
      const pick = ranks[p].find((o) => !taken.has(o));
      if (pick !== undefined) {
        out[p].push(pick);
        taken.add(pick);
      }
    }
  }
  return out;
}

/**
 * Affectation optimale multi-objets : chaque personne est dupliquée `perPerson`
 * fois dans la matrice hongroise (transformation exacte, pas une heuristique),
 * puis les objets reçus sont regroupés. bundles[p] = objets reçus.
 */
export function optimalSumMulti(
  prefs: readonly (readonly number[])[],
  nObjects: number,
  perPerson: number,
): number[][] {
  const n = prefs.length;
  const per = Math.max(1, Math.floor(perPerson));
  if (per === 1) return optimalSum(prefs, nObjects).map((o) => (o === null ? [] : [o]));
  const expanded: (readonly number[])[] = [];
  for (let i = 0; i < n; i++) for (let k = 0; k < per; k++) expanded.push(prefs[i] ?? []);
  const flat = optimalSum(expanded, nObjects);
  const out: number[][] = Array.from({ length: n }, () => []);
  flat.forEach((o, row) => {
    if (o !== null) out[Math.floor(row / per)].push(o);
  });
  return out;
}

/**
 * Affectation optimale (algorithme hongrois, variante potentiels O(n²·m)) :
 * minimise la somme des rangs (0 = préféré). S'il y a plus de personnes que
 * d'objets, les colonnes fictives (coût uniforme) laissent des non-affectés.
 */
export function optimalSum(prefs: readonly (readonly number[])[], nObjects: number): (number | null)[] {
  const nP = prefs.length;
  if (!nP || !nObjects) return Array(nP).fill(null);
  const ranks = prefs.map((p) => completeRanking(p, nObjects));
  const cost = ranks.map((r) => {
    const c = Array<number>(nObjects).fill(0);
    r.forEach((o, pos) => (c[o] = pos));
    return c;
  });
  const n = nP;
  const m = Math.max(nObjects, nP); // colonnes fictives si personnes > objets
  const at = (i: number, j: number) => (j <= nObjects ? cost[i - 1][j - 1] : nObjects);
  const INF = Number.MAX_SAFE_INTEGER / 4;
  const u = Array<number>(n + 1).fill(0);
  const v = Array<number>(m + 1).fill(0);
  const match = Array<number>(m + 1).fill(0); // match[j] = ligne affectée à la colonne j
  const way = Array<number>(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    match[0] = i;
    let j0 = 0;
    const minv = Array<number>(m + 1).fill(INF);
    const used = Array<boolean>(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = match[j0];
      let delta = INF;
      let j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue;
        const cur = at(i0, j) - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) {
          u[match[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (match[j0] !== 0);
    do {
      const j1 = way[j0];
      match[j0] = match[j1];
      j0 = j1;
    } while (j0);
  }
  const assign: (number | null)[] = Array(nP).fill(null);
  for (let j = 1; j <= m; j++) {
    if (match[j] > 0 && j <= nObjects) assign[match[j] - 1] = j - 1;
  }
  return assign;
}

/**
 * Top Trading Cycles : chacun possède déjà un objet (dotation = bijection
 * personne → objet) ; on organise les cycles d'échange sur l'objet préféré
 * restant. Individuellement rationnel : personne ne finit pire que sa dotation.
 */
export function topTradingCycles(prefs: readonly (readonly number[])[], endowment: readonly number[]): number[] {
  const n = prefs.length;
  const ranks = prefs.map((p) => completeRanking(p, n));
  const ownerOf = new Map<number, number>();
  endowment.forEach((o, p) => ownerOf.set(o, p));
  const active = new Set<number>(Array.from({ length: n }, (_, i) => i));
  const assign = Array<number>(n).fill(-1);
  while (active.size) {
    // objet convoité = préféré restant dont le propriétaire est encore actif
    const top = new Map<number, number>();
    for (const q of active) top.set(q, ranks[q].find((o) => active.has(ownerOf.get(o)!))!);
    // graphe fonctionnel q → propriétaire(top(q)) : on suit jusqu'à un cycle
    const pos = new Map<number, number>();
    const path: number[] = [];
    let cur = active.values().next().value as number;
    while (!pos.has(cur)) {
      pos.set(cur, path.length);
      path.push(cur);
      cur = ownerOf.get(top.get(cur)!)!;
    }
    for (const q of path.slice(pos.get(cur)!)) {
      assign[q] = top.get(q)!;
      active.delete(q);
    }
  }
  return assign;
}

/* ------------------------------------------------------------------ */
/* Famille 2 — appariement à double sens                               */
/* ------------------------------------------------------------------ */

/**
 * Gale-Shapley (acceptation différée), avec capacités côté « répondants »
 * (many-to-one, façon Parcoursup). Stable et optimal pour le côté proposant.
 * Renvoie match[i] = répondant du proposant i, ou null.
 */
export function galeShapley(
  propPrefs: readonly (readonly number[])[],
  respPrefs: readonly (readonly number[])[],
  capacities?: readonly number[],
): (number | null)[] {
  const nP = propPrefs.length;
  const nR = respPrefs.length;
  const pRank = propPrefs.map((p) => completeRanking(p, nR));
  const rPos = respPrefs.map((p) => {
    const list = completeRanking(p, nP);
    const pos = Array<number>(nP).fill(0);
    list.forEach((x, k) => (pos[x] = k));
    return pos;
  });
  const cap = capacities ? capacities.map((c) => Math.max(0, Math.floor(c))) : Array<number>(nR).fill(1);
  const next = Array<number>(nP).fill(0);
  const held: number[][] = Array.from({ length: nR }, () => []);
  const match: (number | null)[] = Array(nP).fill(null);
  const stack = Array.from({ length: nP }, (_, i) => i);
  while (stack.length) {
    const i = stack.pop()!;
    if (next[i] >= nR) continue; // liste épuisée → reste non apparié
    const j = pRank[i][next[i]++];
    held[j].push(i);
    match[i] = j;
    if (held[j].length > cap[j]) {
      let worst = 0;
      for (let k = 1; k < held[j].length; k++) if (rPos[j][held[j][k]] > rPos[j][held[j][worst]]) worst = k;
      const out = held[j].splice(worst, 1)[0];
      match[out] = null;
      stack.push(out);
    }
  }
  return match;
}

/**
 * Binômes stables dans un seul groupe (algorithme d'Irving, phases 1 et 2).
 * Renvoie partner[x] = partenaire de x, ou null si aucun appariement stable
 * n'existe (cas réel du problème) ou si l'effectif est impair.
 */
export function stableRoommates(prefs: readonly (readonly number[])[]): number[] | null {
  const n = prefs.length;
  if (n === 0) return [];
  if (n % 2) return null; // appariement parfait impossible
  // classements sur les AUTRES personnes, complétés par indice croissant
  const lists = prefs.map((p, x) => {
    const seen = new Set<number>([x]);
    const out: number[] = [];
    for (const y of p ?? []) {
      if (Number.isInteger(y) && y >= 0 && y < n && !seen.has(y)) {
        seen.add(y);
        out.push(y);
      }
    }
    for (let y = 0; y < n; y++) if (!seen.has(y)) out.push(y);
    return out;
  });
  const rank = lists.map((l) => {
    const r = Array<number>(n).fill(0);
    l.forEach((y, k) => (r[y] = k));
    return r;
  });
  const act: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
  for (let x = 0; x < n; x++) for (const y of lists[x]) act[x][y] = true;
  const del = (x: number, y: number) => {
    act[x][y] = false;
    act[y][x] = false;
  };
  const first = (x: number) => lists[x].find((y) => act[x][y]);
  const second = (x: number) => {
    let c = 0;
    for (const y of lists[x]) if (act[x][y] && ++c === 2) return y;
    return undefined;
  };
  const last = (x: number) => {
    for (let k = lists[x].length - 1; k >= 0; k--) if (act[x][lists[x][k]]) return lists[x][k];
    return undefined;
  };
  const count = (x: number) => lists[x].reduce((s, y) => s + (act[x][y] ? 1 : 0), 0);

  // ---- phase 1 : chacun propose, on retient la meilleure proposition
  const holds = Array<number>(n).fill(-1);
  const stack = Array.from({ length: n }, (_, i) => i);
  while (stack.length) {
    const x = stack.pop()!;
    for (;;) {
      const y = first(x);
      if (y === undefined) return null; // liste vidée → aucun appariement stable
      const h = holds[y];
      if (h === -1) {
        holds[y] = x;
        break;
      }
      if (rank[y][x] < rank[y][h]) {
        holds[y] = x;
        del(y, h);
        stack.push(h);
        break;
      }
      del(x, y); // y garde son tenu, rejette x
    }
  }
  // réduction : y supprime tous les moins bien classés que son proposant retenu
  for (let y = 0; y < n; y++) {
    const h = holds[y];
    for (const z of lists[y]) if (act[y][z] && rank[y][z] > rank[y][h]) del(y, z);
  }
  for (let x = 0; x < n; x++) if (count(x) === 0) return null;

  // ---- phase 2 : élimination des rotations
  for (let guard = 0; guard <= n * n; guard++) {
    let start = -1;
    for (let x = 0; x < n; x++) {
      if (count(x) > 1) {
        start = x;
        break;
      }
    }
    if (start === -1) break; // toutes les listes sont réduites à 1 → appariement
    // exposer une rotation : a_{i+1} = last(second(a_i)), jusqu'au cycle
    const pos = new Map<number, number>();
    const seq: number[] = [];
    let a = start;
    while (!pos.has(a)) {
      pos.set(a, seq.length);
      seq.push(a);
      const b = second(a);
      if (b === undefined) return null; // table incohérente → prudence
      const nx = last(b);
      if (nx === undefined) return null;
      a = nx;
    }
    const cycle = seq.slice(pos.get(a)!);
    // éliminer la rotation : chaque b_i tronque sa liste après a_i
    const pairs = cycle.map((xi) => [xi, second(xi)!] as const);
    for (const [xi, yi] of pairs) {
      for (const z of lists[yi]) if (act[yi][z] && rank[yi][z] > rank[yi][xi]) del(yi, z);
    }
    for (let x = 0; x < n; x++) if (count(x) === 0) return null;
  }
  const partner = Array<number>(n).fill(-1);
  for (let x = 0; x < n; x++) {
    const y = first(x);
    if (y === undefined || first(y) !== x) return null; // incohérence → pas de résultat
    partner[x] = y;
  }
  return partner;
}

/**
 * Appariement de repli « tour de choix » : dans l'ordre donné, la première
 * personne non appariée forme un binôme avec sa préférence restante. Toujours
 * un résultat (effectif pair) ; exact et annonçable, mais le choisi n'a pas
 * son mot à dire — c'est le repli quand aucun appariement stable n'existe.
 */
export function serialPairing(prefs: readonly (readonly number[])[], order: readonly number[]): number[] {
  const n = prefs.length;
  const partner = Array<number>(n).fill(-1);
  const lists = prefs.map((p, x) => {
    const seen = new Set<number>([x]);
    const out: number[] = [];
    for (const y of p ?? []) {
      if (Number.isInteger(y) && y >= 0 && y < n && !seen.has(y)) {
        seen.add(y);
        out.push(y);
      }
    }
    for (let y = 0; y < n; y++) if (!seen.has(y)) out.push(y);
    return out;
  });
  for (const x of order) {
    if (x < 0 || x >= n || partner[x] !== -1) continue;
    const pick = lists[x].find((y) => partner[y] === -1);
    if (pick !== undefined) {
      partner[x] = pick;
      partner[pick] = x;
    }
  }
  return partner;
}

/* ------------------------------------------------------------------ */
/* Aléa transparent : ordre semé par une chaîne (jeton du scrutin)     */
/* ------------------------------------------------------------------ */

/** Hachage FNV-1a 32 bits d'une chaîne → graine entière. */
export function seedFromString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Ordre de passage 0..n-1 mélangé (Fisher-Yates + mulberry32) à partir d'une
 * graine textuelle — le jeton du scrutin. Même jeton → même ordre : chacun
 * peut vérifier le tirage, personne ne peut le choisir.
 */
export function seededOrder(n: number, seed: string): number[] {
  let s = seedFromString(seed) | 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ------------------------------------------------------------------ */
/* Vérificateurs (utilisés par les tests et la narration de résultat)  */
/* ------------------------------------------------------------------ */

/** Paire bloquante d'un mariage/GS avec capacités ? Renvoie [i, j] ou null. */
export function findBlockingPairMarriage(
  propPrefs: readonly (readonly number[])[],
  respPrefs: readonly (readonly number[])[],
  match: readonly (number | null)[],
  capacities?: readonly number[],
): [number, number] | null {
  const nP = propPrefs.length;
  const nR = respPrefs.length;
  const pPos = propPrefs.map((p) => {
    const list = completeRanking(p, nR);
    const pos = Array<number>(nR).fill(0);
    list.forEach((x, k) => (pos[x] = k));
    return pos;
  });
  const rPos = respPrefs.map((p) => {
    const list = completeRanking(p, nP);
    const pos = Array<number>(nP).fill(0);
    list.forEach((x, k) => (pos[x] = k));
    return pos;
  });
  const cap = capacities ? capacities.map((c) => Math.max(0, Math.floor(c))) : Array<number>(nR).fill(1);
  const held: number[][] = Array.from({ length: nR }, () => []);
  match.forEach((j, i) => {
    if (j !== null) held[j].push(i);
  });
  for (let i = 0; i < nP; i++) {
    for (let j = 0; j < nR; j++) {
      if (match[i] === j) continue;
      const iWants = match[i] === null || pPos[i][j] < pPos[i][match[i]!];
      if (!iWants) continue;
      const jWants =
        held[j].length < cap[j] || held[j].some((k) => rPos[j][i] < rPos[j][k]);
      if (jWants && cap[j] > 0) return [i, j];
    }
  }
  return null;
}

/** Paire bloquante d'un appariement de binômes ? Renvoie [x, y] ou null. */
export function findBlockingPairRoommates(
  prefs: readonly (readonly number[])[],
  partner: readonly number[],
): [number, number] | null {
  const n = prefs.length;
  const pos = prefs.map((p, x) => {
    const seen = new Set<number>([x]);
    const list: number[] = [];
    for (const y of p ?? []) {
      if (Number.isInteger(y) && y >= 0 && y < n && !seen.has(y)) {
        seen.add(y);
        list.push(y);
      }
    }
    for (let y = 0; y < n; y++) if (!seen.has(y)) list.push(y);
    const r = Array<number>(n).fill(0);
    list.forEach((y, k) => (r[y] = k));
    return r;
  });
  for (let x = 0; x < n; x++) {
    for (let y = x + 1; y < n; y++) {
      if (partner[x] === y) continue;
      if (pos[x][y] < pos[x][partner[x]] && pos[y][x] < pos[y][partner[y]]) return [x, y];
    }
  }
  return null;
}
