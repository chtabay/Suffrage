import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/voting/aiPrompt";
import { PUBLIC_METHODS } from "@/lib/voting/methods";
import { ASSIGN_METHOD_KEYS } from "@/lib/assign/methods";
import { routing } from "@/i18n/routing";

// Sitemap statique : pages publiques crawlables (accueil, méthodes, docs).
// FR est servi sans préfixe (localePrefix "as-needed").
export default function sitemap(): MetadataRoute.Sitemap {
  const prefix = (locale: string) => (locale === routing.defaultLocale ? "" : `/${locale}`);
  const paths = [
    "",
    "/methodes",
    ...PUBLIC_METHODS.map((m) => `/methodes/${m.key}`),
    ...ASSIGN_METHOD_KEYS.map((k) => `/methodes/${k}`),
    "/ai",
    "/slack",
    "/privacy",
  ];
  const out: MetadataRoute.Sitemap = [];
  for (const locale of routing.locales) {
    for (const p of paths) {
      out.push({ url: `${APP_URL}${prefix(locale)}${p}`, changeFrequency: "monthly", priority: p === "" ? 1 : 0.7 });
    }
  }
  return out;
}
