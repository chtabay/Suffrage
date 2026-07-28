// hreflang : chaque locale pointe vers son URL (fr = défaut, sans préfixe).
// Sans ça, les 4 langues risquent d'être vues comme du contenu dupliqué.
//
// Vit ici et non dans une page : Next 15 n'autorise dans un `page.tsx` que les
// exports qu'il connaît (default, metadata, generateStaticParams…), et tout
// export « en plus » y est une erreur de type.
const HREFLANG_LOCALES = ["fr", "en", "es", "pcm"] as const;

export function hreflangAlternates(path: string, locale: string) {
  const url = (loc: string) => (loc === "fr" ? path : `/${loc}${path}`);
  return {
    canonical: url(locale),
    languages: { ...Object.fromEntries(HREFLANG_LOCALES.map((l) => [l, url(l)])), "x-default": url("fr") },
  };
}
