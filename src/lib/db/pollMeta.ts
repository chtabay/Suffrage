import type { Recipe } from "@/lib/voting/types";

// Lecture serveur (REST + clé anon) des métadonnées d'un scrutin, pour les
// balises Open Graph et l'image de preview (pas de cookies, RLS select ouverte).
export interface PollMeta {
  question: string;
  description: string | null;
  recipe: Recipe;
  access_mode: string;
}

export async function getPollMeta(token: string): Promise<PollMeta | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return null;
  try {
    const res = await fetch(
      `${base}/rest/v1/scrutin_polls?token=eq.${encodeURIComponent(token)}&select=question,description,recipe,access_mode&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 30 } },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as PollMeta[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}
