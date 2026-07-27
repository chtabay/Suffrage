import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/voting/aiPrompt";

// robots.txt — c'est ici que les moteurs découvrent le sitemap.
// Les scrutins /v/<token> ne sont PAS interdits : un scrutin publié doit
// pouvoir être indexé (les privés portent déjà noindex dans leur métadonnée,
// et un token privé n'est de toute façon lié nulle part).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Surfaces internes ou sans valeur d'index.
        disallow: ["/api/", "/admin", "/auth/", "/new"],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
