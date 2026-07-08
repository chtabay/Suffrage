// Helpers i18n pour le code « pur » (hors composants React/next-intl) : sélection
// d'une variante selon la locale + tag BCP-47 pour le formatage de dates (Intl).
//
// Pour AJOUTER UNE LANGUE : ajouter sa clé dans INTL ci-dessous, créer
// messages/<loc>.json, ajouter la locale dans src/i18n/routing.ts, et compléter
// les tables `pickLocale({ fr, en, … })` du code pur (engine, aiPrompt, share,
// draft, useScrutin). Les composants, eux, ne lisent que messages/<loc>.json.

import { routing } from "./routing";

const INTL: Record<string, string> = { fr: "fr-FR", en: "en-GB", es: "es-ES", pcm: "en-NG" };

/** Normalise une locale arbitraire (ex. Slack « fr-FR ») vers une locale supportée, sinon repli. */
export function supportedLocale(input: string | null | undefined, fallback = "fr"): string {
  if (!input) return fallback;
  const base = input.toLowerCase().split(/[-_]/)[0];
  return (routing.locales as readonly string[]).includes(base) ? base : fallback;
}

/** Tag BCP-47 pour `toLocaleString`/`Intl` à partir de la locale de l'app. */
export function intlLocale(locale: string): string {
  return INTL[locale] ?? INTL.fr;
}

/**
 * Choisit la variante correspondant à la locale. Repli : la variante exacte,
 * sinon l'anglais (utile pour les créoles anglophones comme le pidgin `pcm`, qui
 * n'ont pas de variante propre dans le code « pur »), sinon le français (défaut).
 */
export function pickLocale<T>(locale: string, map: Record<string, T>): T {
  return map[locale] ?? map.en ?? map.fr;
}
