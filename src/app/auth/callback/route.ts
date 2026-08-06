import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Échange le code OAuth contre une session, puis renvoie vers l'app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // `next` vient de nous (useAuth le construit depuis `location`), mais il
  // transite par une URL : on n'accepte qu'un chemin absolu de CE site.
  // `//ailleurs.example` est un chemin valide pour un navigateur et une
  // redirection ouverte pour nous.
  const brut = searchParams.get("next");
  const next = brut && brut.startsWith("/") && !brut.startsWith("//") ? brut : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  // L'échec revient là où la connexion se propose, et s'y affiche : ce
  // paramètre était produit depuis toujours et lu nulle part.
  return NextResponse.redirect(`${origin}/espaces?auth_error=1`);
}
