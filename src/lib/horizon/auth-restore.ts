const RESTORE_KEY = "placet.horizon.auth.v1";
const RESTORE_TTL = 30 * 60_000;

export function preserveHorizonForAuth(): void {
  if (typeof window === "undefined" || !window.location.hash) return;
  try {
    localStorage.setItem(RESTORE_KEY, JSON.stringify({ fragment: window.location.hash.slice(1), expires: Date.now() + RESTORE_TTL }));
  } catch {}
}

export function restoreHorizonAfterAuth(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(RESTORE_KEY);
    if (!raw) return null;
    localStorage.removeItem(RESTORE_KEY);
    const value = JSON.parse(raw) as { fragment?: unknown; expires?: unknown };
    return typeof value.fragment === "string" && typeof value.expires === "number" && value.expires > Date.now()
      ? value.fragment
      : null;
  } catch {
    return null;
  }
}

export function clearPreservedHorizon(): void {
  try { localStorage.removeItem(RESTORE_KEY); } catch {}
}
