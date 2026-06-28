import createMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

// next-intl gère le routing de locale ; on greffe ensuite le rafraîchissement de
// session Supabase (cookies posés sur la réponse de next-intl).
export async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  return await updateSession(request, response);
}

export const config = {
  // La racine "/" doit être listée explicitement (le catch-all ne la matche pas) →
  // sinon le middleware ne réécrit pas "/" vers la locale par défaut et "/" tombe en 404.
  // Le reste exclut l'API, l'auth callback, les routes d'icônes/manifest et les fichiers statiques.
  matcher: ["/", "/((?!api|auth|icon-|apple-icon|_next|_vercel|.*\\..*).*)"],
};
