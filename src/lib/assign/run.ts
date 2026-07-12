// Exécution d'une affectation : transforme les lignes (votant + classement)
// en résultat, selon la méthode. Glue pure — les algorithmes vivent dans engine.ts.
import { optimalSum, seededOrder, serialDictatorship, serialPairing, stableRoommates } from "./engine";
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
): AssignOutcome {
  const n = rows.length;
  if (method === "stable_roommates") {
    const personOf = optionToPerson(rows, optionNames);
    // classement d'options → classement de personnes (soi-même et inconnus ignorés)
    const prefs = rows.map((r, i) =>
      (r.ranking ?? [])
        .map((oi) => personOf[oi] ?? null)
        .filter((p): p is number => p !== null && p !== i),
    );
    const stable = stableRoommates(prefs);
    if (stable) return { method, order: null, fallback: false, assignment: null, partner: stable };
    const order = seededOrder(n, pollToken);
    return { method, order, fallback: true, assignment: null, partner: serialPairing(prefs, order) };
  }
  const prefs = rows.map((r) => r.ranking ?? []);
  if (method === "serial_dictatorship") {
    const order = seededOrder(n, pollToken);
    return {
      method,
      order,
      fallback: false,
      assignment: serialDictatorship(prefs, optionNames.length, order),
      partner: null,
    };
  }
  return {
    method,
    order: null,
    fallback: false,
    assignment: optimalSum(prefs, optionNames.length),
    partner: null,
  };
}
