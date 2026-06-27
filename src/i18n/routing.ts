import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  // FR (défaut) sans préfixe → compat des liens /v/… existants ; EN sur /en/….
  localePrefix: "as-needed",
});
