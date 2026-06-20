// Moteur de scrutin — porté 1:1 depuis la maquette Scrutin.dc.html.
// Fonctions pures : aucune dépendance au DOM, utilisables côté client.

import { DISTRICTS, GRADES, SYSTEMS, candColor } from "./systems";
import type {
  Ballot,
  BallotMode,
  ComputeResult,
  CountingMethod,
  Option,
  Recipe,
  RecipeDescription,
  ResultBar,
  ResultStep,
} from "./types";

const col = candColor;

// ---------- résolution de la recette ----------

/** Recette → clé du système « résolu ». */
export function resolveKey(r: Recipe): string {
  if (r.suffrage === "indirect") return "indirect";
  switch (r.counting) {
    case "majority":
      return r.rounds >= 2 ? "runoff" : "fptp";
    case "condorcet":
      return r.random ? "condorcet_random" : "condorcet";
    case "mj":
      return "mj";
    case "approval":
      return "approval";
    case "borda":
      return "borda";
    case "proportional":
      return "proportional";
    case "list":
      return "list";
    default:
      return "fptp";
  }
}

/** Méthode effectivement remplie par le votant (interne si suffrage indirect). */
export function operativeMethod(r: Recipe): CountingMethod {
  return r.suffrage === "indirect" ? r.localCounting : r.counting;
}

/** Type de bulletin associé à une méthode de décompte. */
export function methodMode(m: CountingMethod): BallotMode {
  if (m === "condorcet" || m === "borda") return "rank";
  if (m === "mj") return "grade";
  if (m === "approval") return "approve";
  return "single";
}

const LL: Record<CountingMethod, string> = {
  majority: "majoritaire",
  condorcet: "Condorcet",
  mj: "jugement majoritaire",
  borda: "Borda",
  approval: "approbation",
  proportional: "proportionnelle",
  list: "liste",
};

export function describeRecipe(r: Recipe): RecipeDescription {
  const baseKey = resolveKey(r);
  const base = SYSTEMS[baseKey];
  if (r.suffrage === "indirect") {
    const s = SYSTEMS.indirect;
    return {
      color: s.color,
      icon: s.icon,
      family: s.family,
      decisiveLabel: LL[r.localCounting],
      shortName: `Grands électeurs · ${LL[r.localCounting]}`,
      name: `Grands électeurs · ${LL[r.localCounting]}${r.electorSplit === "prop" ? " (prop.)" : ""}`,
      how: `${s.how} Décompte local choisi : « ${LL[r.localCounting]} » ; ${r.electorSplit === "wta" ? "le champion rafle tous ses grands électeurs (winner-take-all)" : "les grands électeurs sont répartis à la proportionnelle"}.`,
      pros: s.pros,
      cons: s.cons,
    };
  }
  let name = base.name;
  if (r.counting === "majority" && r.rounds === 2) name = "Majoritaire à deux tours";
  else if (r.rounds === 2 && r.counting !== "majority") name = `${base.name} à deux tours`;
  return {
    color: base.color,
    icon: base.icon,
    family: base.family,
    decisiveLabel: LL[r.counting] || base.name,
    shortName: name,
    name,
    how:
      base.how +
      (r.rounds === 2 && r.counting !== "majority"
        ? ` Variante à deux tours : on qualifie d'abord les meilleurs, puis ce décompte départage entre eux.`
        : ""),
    pros: base.pros,
    cons: base.cons,
  };
}

// ---------- primitives de décompte ----------

function firstPrefs(ballots: Ballot[], n: number): number[] {
  const c = Array(n).fill(0);
  for (const b of ballots) c[b.ranking[0]]++;
  return c;
}

interface TallyResult {
  vals: Record<number, number>;
  order: number[];
  winner: number;
  condorcetNull?: boolean;
  smith?: number[];
}

/** Décompte mono-vainqueur restreint à un sous-ensemble de candidats. */
function tally(
  method: CountingMethod,
  ballots: Ballot[],
  cands: number[],
  useRandom: boolean,
): TallyResult {
  const vals: Record<number, number> = {};
  cands.forEach((c) => (vals[c] = 0));

  if (method === "majority") {
    for (const b of ballots) {
      const top = b.ranking.find((c) => cands.includes(c));
      if (top !== undefined) vals[top]++;
    }
  } else if (method === "approval") {
    for (const b of ballots) for (const c of cands) if ((b.grades[c] ?? 0) >= 3) vals[c]++;
  } else if (method === "borda") {
    const m = cands.length;
    for (const b of ballots) {
      const r = b.ranking.filter((c) => cands.includes(c));
      r.forEach((c, i) => (vals[c] += m - 1 - i));
    }
  } else if (method === "mj") {
    const lower = (arr: number[]) => {
      const s = arr.slice().sort((a, b) => a - b);
      return s[Math.ceil(s.length / 2) - 1];
    };
    const ga: Record<number, number[]> = {};
    cands.forEach((c) => (ga[c] = ballots.map((b) => b.grades[c] ?? 0)));
    cands.forEach((c) => (vals[c] = lower(ga[c])));
    const cmp = (i: number, j: number) => {
      const a = ga[i].slice().sort((x, y) => x - y);
      const b = ga[j].slice().sort((x, y) => x - y);
      while (a.length && b.length) {
        const ma = a[Math.ceil(a.length / 2) - 1];
        const mb = b[Math.ceil(b.length / 2) - 1];
        if (ma !== mb) return mb - ma;
        a.splice(Math.ceil(a.length / 2) - 1, 1);
        b.splice(Math.ceil(b.length / 2) - 1, 1);
      }
      return 0;
    };
    const order = cands.slice().sort(cmp);
    return { vals, order, winner: order[0] };
  } else if (method === "condorcet") {
    const m = cands.length;
    const mat = Array.from({ length: m }, () => Array(m).fill(0));
    for (const b of ballots) {
      const pos: Record<number, number> = {};
      b.ranking.filter((c) => cands.includes(c)).forEach((c, i) => (pos[c] = i));
      for (let i = 0; i < m; i++)
        for (let j = 0; j < m; j++) if (i !== j && pos[cands[i]] < pos[cands[j]]) mat[i][j]++;
    }
    const cope = cands.map((c, i) => {
      let s = 0;
      for (let j = 0; j < m; j++)
        if (i !== j) {
          if (mat[i][j] > mat[j][i]) s++;
          else if (mat[i][j] === mat[j][i]) s += 0.5;
        }
      return s;
    });
    cands.forEach((c, i) => (vals[c] = cope[i]));
    let cw = -1;
    for (let i = 0; i < m; i++) {
      let ok = true;
      for (let j = 0; j < m; j++) {
        if (i !== j && mat[i][j] <= mat[j][i]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        cw = i;
        break;
      }
    }
    const order = cands.slice().sort((a, b) => vals[b] - vals[a]);
    if (cw >= 0) return { vals, order, winner: cands[cw] };
    const reach = Array.from({ length: m }, () => Array(m).fill(false));
    for (let i = 0; i < m; i++)
      for (let j = 0; j < m; j++) if (i !== j && mat[i][j] >= mat[j][i]) reach[i][j] = true;
    for (let k = 0; k < m; k++)
      for (let i = 0; i < m; i++)
        for (let j = 0; j < m; j++) if (reach[i][k] && reach[k][j]) reach[i][j] = true;
    const sm: number[] = [];
    for (let i = 0; i < m; i++) {
      let all = true;
      for (let j = 0; j < m; j++) {
        if (i !== j && !reach[i][j]) {
          all = false;
          break;
        }
      }
      if (all) sm.push(cands[i]);
    }
    const smith = sm.length ? sm : cands.slice();
    const winner = useRandom ? smith[Math.floor(Math.random() * smith.length)] : order[0];
    return { vals, order, winner, condorcetNull: true, smith };
  }

  const order = cands.slice().sort((a, b) => vals[b] - vals[a]);
  return { vals, order, winner: order[0] };
}

// ---------- contexte & barres ----------

export interface ComputeCtx {
  recipe: Recipe;
  options: Option[];
  ballots: Ballot[];
}

type Fmt = (v: number, idx: number) => string;

function makeBars(
  opts: Option[],
  valsObj: Record<number, number>,
  candList: number[],
  fmt: Fmt,
): ResultBar[] {
  const arr = candList.map((c) => ({
    idx: c,
    name: opts[c].name,
    icon: opts[c].icon,
    color: col(c),
    value: valsObj[c],
  }));
  const max = Math.max(...arr.map((a) => a.value), 1);
  return arr
    .map((a) => ({
      ...a,
      valColor: "#16213A",
      valueLabel: fmt(a.value, a.idx),
      pct: Math.round((100 * a.value) / max),
    }))
    .sort((x, y) => y.value - x.value);
}

const toVals = (arr: number[]): Record<number, number> => {
  const o: Record<number, number> = {};
  arr.forEach((v, i) => (o[i] = v));
  return o;
};

/** Dépouille l'urne selon la recette. `null` si aucun bulletin. */
export function compute(ctx: ComputeCtx): ComputeResult | null {
  const { recipe: r, options: opts, ballots } = ctx;
  const n = opts.length;
  const total = ballots.length;
  if (!total) return null;
  const desc = describeRecipe(r);
  const pct = (v: number, d: number) => Math.round((100 * v) / (d || 1));
  const bars = (valsObj: Record<number, number>, candList: number[], fmt: Fmt) =>
    makeBars(opts, valsObj, candList, fmt);
  const res = { color: desc.color, methodName: desc.shortName };
  const all = [...Array(n).keys()];

  // ===== SCRUTIN DE LISTE (municipal) =====
  if (r.suffrage === "direct" && r.counting === "list") {
    const SEATS = 10;
    const votes = firstPrefs(ballots, n);
    const win = all.slice().sort((a, b) => votes[b] - votes[a])[0];
    const bonus = Math.floor(SEATS / 2);
    const rest = SEATS - bonus;
    const elig = votes.map((v) => ((100 * v) / total >= 5 ? v : 0));
    const alloc = Array(n).fill(0);
    for (let s = 0; s < rest; s++) {
      let best = -1,
        bv = -1;
      for (let i = 0; i < n; i++) {
        if (elig[i] === 0) continue;
        const q = elig[i] / (alloc[i] + 1);
        if (q > bv) {
          bv = q;
          best = i;
        }
      }
      if (best >= 0) alloc[best]++;
    }
    const seats = alloc.slice();
    seats[win] += bonus;
    const w = opts[win];
    return {
      ...res,
      hasWinner: true,
      winnerName: `${w.name} — ${seats[win]} sièges`,
      winnerIcon: w.icon,
      bars: bars(toVals(seats), all, (v) => `${v} siège${v > 1 ? "s" : ""}`),
      tallyLabel: `Répartition des ${SEATS} sièges`,
      steps: [
        { n: 1, text: `On vote pour une liste entière. ${w.name} arrive en tête (${pct(votes[win], total)}% des voix).` },
        { n: 2, text: `Prime majoritaire : la liste gagnante reçoit d'office la moitié des sièges (${bonus}).` },
        { n: 3, text: `Les ${rest} sièges restants vont à la proportionnelle entre les listes au-dessus de 5 % (prime comprise).` },
        { n: 4, text: `Au total ${w.name} obtient une majorité nette de ${seats[win]} sièges sur ${SEATS}.` },
      ],
      counterfactual: `La prime majoritaire transforme une courte avance en majorité confortable — c'est tout l'objectif : pouvoir gouverner.`,
    };
  }

  // ===== PROPORTIONNELLE (d'Hondt) =====
  if (r.suffrage === "direct" && r.counting === "proportional") {
    const SEATS = 10;
    const votes = firstPrefs(ballots, n);
    const elig = votes.map((v) => ((100 * v) / total >= 5 ? v : 0));
    const seats = Array(n).fill(0);
    for (let s = 0; s < SEATS; s++) {
      let best = -1,
        bv = -1;
      for (let i = 0; i < n; i++) {
        if (elig[i] === 0) continue;
        const q = elig[i] / (seats[i] + 1);
        if (q > bv) {
          bv = q;
          best = i;
        }
      }
      if (best >= 0) seats[best]++;
    }
    const allBars = bars(toVals(seats), all, (v) => `${v} siège${v > 1 ? "s" : ""}`);
    const w = allBars[0];
    return {
      ...res,
      hasWinner: true,
      winnerName: `${w.name} — ${w.value} sièges`,
      winnerIcon: w.icon,
      bars: allBars,
      tallyLabel: `Répartition des ${SEATS} sièges`,
      steps: [
        { n: 1, text: `On répartit ${SEATS} sièges proportionnellement aux voix (méthode d'Hondt).` },
        { n: 2, text: `Les listes sous 5 % n'obtiennent aucun siège.` },
        { n: 3, text: `${w.name} a le plus de sièges (${w.value}), mais devra composer avec les autres.` },
      ],
      counterfactual: `Pas de « tout au gagnant » : chaque sensibilité est représentée à hauteur de son poids réel.`,
    };
  }

  // ===== SUFFRAGE INDIRECT (grands électeurs) =====
  if (r.suffrage === "indirect") {
    const D = DISTRICTS;
    const dB = Array.from({ length: D }, () => [] as Ballot[]);
    ballots.forEach((b) => dB[b.district ?? 0].push(b));
    const electors = Array(n).fill(0);
    dB.forEach((db) => {
      if (!db.length) return;
      const seats = Math.max(1, Math.round((10 * db.length) / total));
      const t = tally(r.localCounting, db, all, r.random);
      if (r.electorSplit === "prop") {
        const fp = firstPrefs(db, n);
        const a2 = Array(n).fill(0);
        for (let s = 0; s < seats; s++) {
          let best = -1,
            bv = -1;
          for (let i = 0; i < n; i++) {
            const q = fp[i] / (a2[i] + 1);
            if (q > bv) {
              bv = q;
              best = i;
            }
          }
          if (best >= 0) a2[best]++;
        }
        for (let i = 0; i < n; i++) electors[i] += a2[i];
      } else {
        electors[t.winner] += seats;
      }
    });
    const allBars = bars(toVals(electors), all, (v) => `${v} électeurs`);
    const w = allBars[0];
    const pop = firstPrefs(ballots, n);
    let popW = 0;
    for (let i = 1; i < n; i++) if (pop[i] > pop[popW]) popW = i;
    const upset = w.idx !== popW;
    return {
      ...res,
      hasWinner: true,
      winnerName: w.name,
      winnerIcon: w.icon,
      bars: allBars,
      tallyLabel: "Grands électeurs obtenus",
      steps: [
        { n: 1, text: `Les bulletins sont répartis en ${D} circonscriptions.` },
        { n: 2, text: `Chaque circonscription désigne son champion au décompte « ${desc.decisiveLabel} ».` },
        {
          n: 3,
          text:
            r.electorSplit === "wta"
              ? `Le champion local rafle TOUS les grands électeurs de sa circonscription (winner-take-all).`
              : `Les grands électeurs de chaque circonscription sont partagés à la proportionnelle.`,
        },
        { n: 4, text: `Au total, ${w.name} cumule le plus de grands électeurs (${w.value}) et l'emporte.` },
      ],
      counterfactual: upset
        ? `⚠️ ${opts[popW].name} a le plus de voix au total mais perd : c'est l'effet « vote populaire vs grands électeurs ».`
        : `Ici le vainqueur du collège est aussi celui du vote populaire.`,
    };
  }

  // ===== DIRECT À GAGNANT UNIQUE (majoritaire / Condorcet / jugement / approbation / Borda), 1 ou 2 tours =====
  const method = r.counting;
  let cands = all;
  const steps: ResultStep[] = [];
  let sN = 1;
  let round1 = false;
  if (r.rounds === 2) {
    const fp = firstPrefs(ballots, n);
    const fpBars = bars(toVals(fp), all, (v) => `${v} (${pct(v, total)}%)`);
    const lead = fpBars[0];
    if (lead.value / total > 0.5) {
      return {
        ...res,
        hasWinner: true,
        winnerName: lead.name,
        winnerIcon: lead.icon,
        bars: fpBars,
        tallyLabel: "Premier tour — voix",
        steps: [
          { n: 1, text: "On compte les premiers choix." },
          { n: 2, text: `${lead.name} dépasse 50 % (${pct(lead.value, total)}%) dès le 1er tour.` },
          { n: 3, text: "Pas besoin de second tour." },
        ],
        counterfactual: `${lead.name} est élu dès le 1er tour à la majorité absolue.`,
      };
    }
    let finalists: number[];
    if (r.qualif === "top2") finalists = [fpBars[0].idx, fpBars[1].idx];
    else {
      finalists = fpBars.filter((b) => pct(b.value, total) >= 10).map((b) => b.idx);
      if (finalists.length < 2) finalists = [fpBars[0].idx, fpBars[1].idx];
    }
    cands = finalists;
    round1 = true;
    steps.push({ n: sN++, text: `1er tour : personne n'a la majorité absolue (${fpBars[0].name} mène avec ${pct(fpBars[0].value, total)}%).` });
    steps.push({ n: sN++, text: `Se qualifient ${r.qualif === "top2" ? "les 2 premiers" : "les candidats au-dessus de 10 %"} : ${finalists.map((i) => opts[i].name).join(", ")}.` });
  }

  const t = tally(method, ballots, cands, r.random);
  const fmt: Fmt =
    method === "borda"
      ? (v) => `${v} pts`
      : method === "condorcet"
        ? (v) => `${v} duel${v > 1 ? "s" : ""}`
        : method === "mj"
          ? (v) => GRADES[v] || "—"
          : (v) => `${v} (${pct(v, total)}%)`;
  const resBars = bars(t.vals, t.order, fmt);
  const tallyLabelMap: Record<string, string> = {
    majority: "Voix",
    condorcet: "Duels remportés (Copeland)",
    mj: "Mention médiane",
    approval: "Approbations",
    borda: "Points de Borda",
  };
  const tallyLabel = (tallyLabelMap[method] || "Décompte") + (round1 ? " — 2nd tour" : "");

  if (method === "condorcet" && t.condorcetNull && !r.random) {
    const smith = t.smith ?? [];
    return {
      ...res,
      noWinner: true,
      noWinnerLabel: "Paradoxe de Condorcet",
      bars: resBars,
      tallyLabel,
      steps: [
        ...steps,
        { n: sN++, text: `Les duels tournent en rond : aucune option ne bat toutes les autres. Cercle bloqué : ${smith.map((i) => opts[i].name).join(", ")}.` },
        { n: sN++, text: "Activez « Tirage si blocage » pour départager au sort." },
      ],
      counterfactual: "Ce blocage rare illustre pourquoi des variantes existent (randomisée, Schulze…).",
    };
  }

  const w = opts[t.winner];
  if (!round1) {
    const intro: Record<string, string> = {
      majority: "Chaque bulletin compte pour sa seule option préférée.",
      condorcet: "On simule chaque duel en tête-à-tête à partir des classements.",
      mj: "Chaque votant attribue une mention ; on prend la mention médiane de chaque option.",
      borda: `Sur chaque bulletin : 1er = ${n - 1} pts, 2e = ${n - 2} pts… dernier = 0.`,
      approval: "Chacun coche toutes les options qui lui conviennent.",
    };
    steps.push({ n: sN++, text: intro[method] });
  } else {
    steps.push({ n: sN++, text: `2nd tour : on applique le décompte « ${desc.decisiveLabel} » entre les seuls qualifiés.` });
  }

  const fin: Record<string, string> = {
    majority: round1 ? `${w.name} l'emporte au second tour.` : `${w.name} réunit le plus de voix.`,
    condorcet: t.condorcetNull
      ? `🎲 Cercle bloqué → tirage au sort : ${w.name} est désigné.`
      : `${w.name} bat tous les autres en face-à-face : vainqueur de Condorcet.`,
    mj: `${w.name} a la meilleure mention médiane : « ${GRADES[t.vals[t.winner]]} ».`,
    borda: `${w.name} totalise le plus de points (${t.vals[t.winner]}).`,
    approval: `${w.name} est approuvé par le plus de monde (${t.vals[t.winner]} sur ${total}).`,
  };
  steps.push({ n: sN++, text: fin[method] });

  const cf: Record<string, string> = {
    majority: round1
      ? `Le 2nd tour garantit une majorité absolue — mais le 3e, parfois meilleur consensus, est éliminé d'office.`
      : t.vals[t.winner] / total < 0.5
        ? `${w.name} gagne sans majorité absolue : un seul tour suffit, mais peut diviser.`
        : `${w.name} a la majorité absolue.`,
    condorcet: `Le vainqueur de Condorcet battrait chaque adversaire en duel — pas forcément celui qui a le plus de 1res places.`,
    mj: `On récompense l'adhésion large plutôt que l'intensité d'une petite minorité.`,
    borda: `Borda favorise les options « 2es partout » au détriment des favoris clivants.`,
    approval: `On gagne en plaisant au plus grand nombre, pas en étant le préféré d'un seul camp.`,
  };

  return {
    ...res,
    hasWinner: true,
    winnerName: w.name,
    winnerIcon: w.icon,
    bars: resBars,
    tallyLabel,
    steps,
    counterfactual: cf[method],
  };
}

// ---------- normalisation des bulletins ----------

const rand = () => Math.random() - 0.5;

export function normalizeFromSingle(choice: number, n: number, ballotsLen: number): Ballot {
  const rest = [...Array(n).keys()].filter((i) => i !== choice).sort(rand);
  const ranking = [choice, ...rest];
  const grades: Record<number, number> = {};
  ranking.forEach((c, i) => (grades[c] = Math.max(0, 5 - i * 2)));
  grades[choice] = 5;
  return { ranking, grades, district: ballotsLen % DISTRICTS };
}

export function normalizeFromApproved(approved: number[], n: number, ballotsLen: number): Ballot {
  const yes = approved.slice().sort(rand);
  const no = [...Array(n).keys()].filter((i) => !approved.includes(i)).sort(rand);
  const ranking = [...yes, ...no];
  const grades: Record<number, number> = {};
  ranking.forEach((c) => (grades[c] = approved.includes(c) ? 4 : 1));
  return { ranking, grades, district: ballotsLen % DISTRICTS };
}

export function normalizeFromRank(rankArr: number[], n: number, ballotsLen: number): Ballot {
  const rest = [...Array(n).keys()].filter((i) => !rankArr.includes(i));
  const ranking = [...rankArr, ...rest];
  const grades: Record<number, number> = {};
  ranking.forEach((c, i) => (grades[c] = Math.max(0, 5 - Math.floor((i * 5) / (n - 1 || 1)))));
  return { ranking, grades, district: ballotsLen % DISTRICTS };
}

export function normalizeFromGrades(g: Record<number, number>, n: number, ballotsLen: number): Ballot {
  const grades: Record<number, number> = {};
  for (let i = 0; i < n; i++) grades[i] = g[i] === undefined ? 2 : g[i];
  const ranking = [...Array(n).keys()].sort((a, b) => grades[b] - grades[a] || rand());
  return { ranking, grades, district: ballotsLen % DISTRICTS };
}

/** Simule 100 électeurs répartis dans un espace d'opinions 2D. */
export function simulateCrowd(n: number, ballotsLen: number): Ballot[] {
  const cpos = Array.from({ length: n }, (_, i) => ({
    x: Math.cos((2 * Math.PI * i) / n),
    y: Math.sin((2 * Math.PI * i) / n),
  }));
  const add: Ballot[] = [];
  for (let v = 0; v < 100; v++) {
    const x = (Math.random() * 2 - 1) * 1.5;
    const y = (Math.random() * 2 - 1) * 1.5;
    const d = cpos.map((p, i) => ({ i, dist: Math.hypot(p.x - x, p.y - y) + Math.random() * 0.35 }));
    d.sort((a, b) => a.dist - b.dist);
    const ranking = d.map((o) => o.i);
    const maxd = Math.max(...d.map((o) => o.dist));
    const grades: Record<number, number> = {};
    d.forEach((o) => (grades[o.i] = Math.round(5 * (1 - o.dist / (maxd + 0.001)))));
    add.push({ ranking, grades, district: (ballotsLen + v) % DISTRICTS });
  }
  return add;
}
