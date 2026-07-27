"use client";

// Repères d'usage montrés à l'ouverture de l'app installée : aux toutes
// premières ouvertures, puis seulement après une longue absence. Jamais sur une
// page de vote — qui arrive par un lien vient voter, pas lire une visite guidée.

const KEY = "scrutin.welcome";
const FIRST_OPENS = 2;
const LONG_ABSENCE_MS = 45 * 24 * 3600 * 1000; // 45 jours

interface WelcomeState {
  /** Nombre de fois où les repères ont été montrés. */
  n: number;
  /** Dernière ouverture de l'app (pas du panneau) : sert à mesurer l'absence. */
  last: number;
}

function read(): WelcomeState {
  if (typeof window === "undefined") return { n: 0, last: 0 };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { n: 0, last: 0 };
    const v = JSON.parse(raw) as Partial<WelcomeState>;
    return { n: Number(v.n) || 0, last: Number(v.last) || 0 };
  } catch {
    return { n: 0, last: 0 };
  }
}

function write(s: WelcomeState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* stockage indisponible (navigation privée) : on ne montrera rien de plus */
  }
}

/** Faut-il montrer les repères maintenant ? */
export function shouldShowWelcome(): boolean {
  const s = read();
  if (s.n < FIRST_OPENS) return true;
  return s.last > 0 && Date.now() - s.last > LONG_ABSENCE_MS;
}

/** Comptabilise un affichage (appelé au moment où le panneau s'ouvre). */
export function markWelcomeShown(): void {
  const s = read();
  write({ n: s.n + 1, last: Date.now() });
}

/** Horodate une ouverture de l'app, même sans panneau : mesure l'absence. */
export function touchLastOpen(): void {
  const s = read();
  write({ n: s.n, last: Date.now() });
}
