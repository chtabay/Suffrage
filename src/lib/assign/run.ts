// Exécution d'une affectation : transforme les lignes (votant + classement)
// en résultat, selon la méthode. Glue pure — les algorithmes vivent dans engine.ts.
import { galeShapley, optimalSum, seededOrder, serialDictatorship, serialPairing, stableRoommates, topTradingCycles } from "./engine";
import type { AssignMethodKey } from "./methods";

/** Une ligne renvoyée par la RPC get_assign_data : votant + son classement (option indices). */
export interface AssignRowData {
  label: string;
  ranking: number[] | null;
  voted: boolean;
}

export interface AssignOutcome {
  method: AssignMethodKey;
  /** Ordre de passage tiré du jeton (dictature sérielle et repli binômes), sinon null. */
  order: number[] | null;
  /** Binômes : true si aucun appariement stable n'existe → repli « tour de choix ». */
  fallback: boolean;
  /** Sens unique : assignment[personne] = index d'option, ou null (rien reçu). */
  assignment: (number | null)[] | null;
  /** Binômes : partner[personne] = index de personne (-1 impossible ici, effectif pair). */
  partner: number[] | null;
  /** Bourse d'échanges : dotation de départ, endowment[personne] = index d'option. */
  endowment: number[] | null;
  /** Deux groupes (Gale-Shapley) : appariements en indices de lignes { a, b }. */
  matches: { a: number; b: number }[] | null;
}

/**
 * Binômes : les options ont été générées depuis la liste des participants (mêmes
 * libellés). On convertit un classement d'options en classement de personnes.
 */
function optionToPerson(rows: AssignRowData[], optionNames: string[]): (number | null)[] {
  const byLabel = new Map<string, number>();
  rows.forEach((r, i) => {
    if (!byLabel.has(r.label)) byLabel.set(r.label, i);
  });
  return optionNames.map((name) => byLabel.get(name) ?? null);
}

export function runAssignment(
  method: AssignMethodKey,
  pollToken: string,
  rows: AssignRowData[],
  optionNames: string[],
  endow?: Record<string, number>,
  assignA?: number,
  caps?: number[],
): AssignOutcome {
  const n = rows.length;
  const none = { assignment: null, partner: null, endowment: null, matches: null };
  if (method === "gale_shapley") {
    // Options = [côté 1 (propose)…, côté 2 (dispose)…] ; correspondance par label.
    const nA = Math.max(0, Math.min(assignA ?? 0, optionNames.length));
    const optIdxByLabel = new Map<string, number>();
    optionNames.forEach((name, i) => {
      if (!optIdxByLabel.has(name)) optIdxByLabel.set(name, i);
    });
    const aRows: number[] = [];
    const bRows: number[] = [];
    rows.forEach((r, i) => {
      const oi = optIdxByLabel.get(r.label);
      if (oi === undefined) return;
      (oi < nA ? aRows : bRows).push(i);
    });
    const propByOpt = new Map<number, number>();
    aRows.forEach((ri, k) => propByOpt.set(optIdxByLabel.get(rows[ri].label)!, k));
    const respByOpt = new Map<number, number>();
    bRows.forEach((ri, k) => respByOpt.set(optIdxByLabel.get(rows[ri].label)!, k));
    const propPrefs = aRows.map((ri) =>
      (rows[ri].ranking ?? []).map((oi) => respByOpt.get(oi)).filter((x): x is number => x !== undefined),
    );
    const respPrefs = bRows.map((ri) =>
      (rows[ri].ranking ?? []).map((oi) => propByOpt.get(oi)).filter((x): x is number => x !== undefined),
    );
    const capsAligned = caps?.length
      ? bRows.map((ri) => caps[(optIdxByLabel.get(rows[ri].label) ?? nA) - nA] ?? 1)
      : undefined;
    const match = galeShapley(propPrefs, respPrefs, capsAligned);
    const matches = match
      .map((j, k) => (j === null ? null : { a: aRows[k], b: bRows[j] }))
      .filter((m): m is { a: number; b: number } => m !== null);
    return { method, order: null, fallback: false, ...none, matches };
  }
  if (method === "stable_roommates") {
    const personOf = optionToPerson(rows, optionNames);
    // classement d'options → classement de personnes (soi-même et inconnus ignorés)
    const prefs = rows.map((r, i) =>
      (r.ranking ?? [])
        .map((oi) => personOf[oi] ?? null)
        .filter((p): p is number => p !== null && p !== i),
    );
    const stable = stableRoommates(prefs);
    if (stable) return { method, order: null, fallback: false, ...none, partner: stable };
    const order = seededOrder(n, pollToken);
    return { method, order, fallback: true, ...none, partner: serialPairing(prefs, order) };
  }
  const prefs = rows.map((r) => r.ranking ?? []);
  if (method === "serial_dictatorship") {
    const order = seededOrder(n, pollToken);
    return {
      method,
      order,
      fallback: false,
      ...none,
      assignment: serialDictatorship(prefs, optionNames.length, order),
    };
  }
  if (method === "top_trading_cycles") {
    // Dotation posée au lancement (label → option) ; repli défensif : la N-ième
    // personne possède la N-ième chose.
    const endowment = rows.map((r, i) => endow?.[r.label] ?? i);
    return {
      method,
      order: null,
      fallback: false,
      ...none,
      assignment: topTradingCycles(prefs, endowment),
      endowment,
    };
  }
  return {
    method,
    order: null,
    fallback: false,
    ...none,
    assignment: optimalSum(prefs, optionNames.length),
  };
}
