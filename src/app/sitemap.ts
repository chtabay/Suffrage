import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/voting/aiPrompt";
import { PUBLIC_METHODS } from "@/lib/voting/methods";
import { ASSIGN_METHOD_KEYS } from "@/lib/assign/methods";
import { fetchPublicPollsServer } from "@/lib/db/publicFeed";
import { routing } from "@/i18n/routing";

// Sitemap : pages publiques crawlables (accueil, méthodes, docs, /explorer) +
// les scrutins PUBLIÉS par leurs créateurs. La RPC get_public_polls ne renvoie
// que les publics approuvés — un scrutin privé ne peut PAS finir listé ici.
// FR est servi sans préfixe (localePrefix "as-needed").
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const prefix = (locale: string) => (locale === routing.defaultLocale ? "" : `/${locale}`);
  const paths = [
    "",
    "/methodes",
    ...PUBLIC_METHODS.map((m) => `/methodes/${m.key}`),
    ...ASSIGN_METHOD_KEYS.map((k) => `/methodes/${k}`),
    "/explorer",
    // Les jeux : deux pages d'entrée publiques. Les SALLES, elles, n'y sont
    // jamais — elles sont éphémères et portent `noindex`.
    "/games",
    "/games/banalo",
    "/games/alibi",
    "/games/rodeurs",
    "/games/fantome",
    "/games/pays",
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
  // Scrutins publics (plafond 50 en P1) : URL canonique FR (sans préfixe) uniquement,
  // pour ne pas tripler des pages au contenu identique.
  const polls = await fetchPublicPollsServer(50);
  for (const p of polls) {
    out.push({ url: `${APP_URL}/v/${p.token}`, changeFrequency: "daily", priority: 0.5 });
  }
  return out;
}
