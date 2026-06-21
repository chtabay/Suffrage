// Historique local des scrutins créés sur cet appareil (sans compte).
// Stocke le secret d'admin pour permettre, plus tard, la réclamation par un compte.

const KEY = "scrutin.mine";

export interface LocalPoll {
  token: string;
  secret: string;
  question: string;
  createdAt: number;
}

export function getLocalPolls(): LocalPoll[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as LocalPoll[]) : [];
  } catch {
    return [];
  }
}

export function addLocalPoll(p: LocalPoll): void {
  if (typeof window === "undefined") return;
  const list = [p, ...getLocalPolls().filter((x) => x.token !== p.token)];
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota / mode privé : on ignore */
  }
}

export function removeLocalPoll(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(getLocalPolls().filter((x) => x.token !== token)));
  } catch {
    /* ignore */
  }
}
