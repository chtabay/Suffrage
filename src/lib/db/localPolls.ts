// Historique local des scrutins créés sur cet appareil (sans compte).
// Stocke le secret d'admin pour permettre, plus tard, la réclamation par un compte.

const KEY = "scrutin.mine";
// Corbeille : scrutins retirés de la liste mais RECOUVRABLES (soft-delete).
const TRASH_KEY = "scrutin.trash";
// Masqués définitivement (vidés de la corbeille) : ne réapparaissent jamais, même
// s'ils reviennent du compte cloud. Non destructif — la base n'est pas touchée.
const HIDDEN_KEY = "scrutin.hidden";

export interface LocalPoll {
  token: string;
  secret: string;
  question: string;
  createdAt: number;
}

export interface TrashedPoll extends LocalPoll {
  trashedAt: number;
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

// ---------- corbeille (soft-delete recouvrable) ----------

function readList<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? (arr as T[]) : [];
  } catch {
    return [];
  }
}
function writeList(key: string, list: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* quota / mode privé : on ignore */
  }
}

export function getTrash(): TrashedPoll[] {
  return readList<TrashedPoll>(TRASH_KEY).sort((a, b) => b.trashedAt - a.trashedAt);
}

/** Jetons à exclure de la liste principale (corbeille + masqués définitivement). */
export function getHiddenTokens(): Set<string> {
  const trashed = getTrash().map((p) => p.token);
  const hidden = readList<string>(HIDDEN_KEY);
  return new Set([...trashed, ...hidden]);
}

/** Met un scrutin à la corbeille (recouvrable). Sort de la liste active. */
export function trashPoll(p: LocalPoll, now: number = Date.now()): void {
  removeLocalPoll(p.token);
  const trash = readList<TrashedPoll>(TRASH_KEY).filter((x) => x.token !== p.token);
  writeList(TRASH_KEY, [{ ...p, trashedAt: now }, ...trash]);
}

/** Restaure un scrutin depuis la corbeille vers la liste active. */
export function restoreFromTrash(token: string): void {
  const trash = readList<TrashedPoll>(TRASH_KEY);
  const found = trash.find((x) => x.token === token);
  writeList(TRASH_KEY, trash.filter((x) => x.token !== token));
  if (found) addLocalPoll({ token: found.token, secret: found.secret, question: found.question, createdAt: found.createdAt });
}

/** Vide un élément de la corbeille : oubli du secret local + masquage définitif. */
export function purgeFromTrash(token: string): void {
  writeList(TRASH_KEY, readList<TrashedPoll>(TRASH_KEY).filter((x) => x.token !== token));
  removeLocalPoll(token);
  const hidden = readList<string>(HIDDEN_KEY);
  if (!hidden.includes(token)) writeList(HIDDEN_KEY, [...hidden, token]);
}
