import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en", "es", "pcm"],
  defaultLocale: "fr",
  // FR (défaut) sans préfixe → compat des liens /v/… existants ; EN sur /en/…, ES sur /es/….
  localePrefix: "as-needed",
});
