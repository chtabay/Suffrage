import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

// next-intl gère le routing de locale ; on greffe ensuite le rafraîchissement de
// session Supabase (cookies posés sur la réponse de next-intl).
export async function middleware(request: NextRequest) {
  // Domaine canonique : l'alias Vercel public est renvoyé vers placet.app (308).
  // On ne touche ni aux URLs de preview (*-projects.vercel.app) ni au dev local.
  if (request.headers.get("host") === "suffrage.vercel.app") {
    return NextResponse.redirect(
      new URL(request.nextUrl.pathname + request.nextUrl.search, "https://placet.app"),
      308,
    );
  }
  // Sous-domaine partenaire : sa racine sert la page co-brandée (code chez nous),
  // tout autre chemin renvoie vers placet.app — l'app ne vit que sur son domaine.
  if (request.headers.get("host") === "placet.globenostra.com") {
    if (request.nextUrl.pathname === "/") {
      return NextResponse.rewrite(new URL("/partenaires/globenostra", request.url));
    }
    return NextResponse.redirect(
      new URL(request.nextUrl.pathname + request.nextUrl.search, "https://placet.app"),
      308,
    );
  }
  const response = intlMiddleware(request);
  return await updateSession(request, response);
}

export const config = {
  // La racine "/" doit être listée explicitement (le catch-all ne la matche pas) →
  // sinon le middleware ne réécrit pas "/" vers la locale par défaut et "/" tombe en 404.
  // Le reste exclut l'API, l'auth callback, les routes d'icônes/manifest et les fichiers statiques.
  matcher: ["/", "/((?!api|auth|icon-|apple-icon|promo|partenaires|_next|_vercel|.*\\..*).*)"],
};
