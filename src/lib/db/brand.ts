// Profil de marque au niveau du compte (logo + couleur d'accent). Configuré une
// fois par l'organisateur, appliqué à l'en-tête de tous ses scrutins. Le vote
// reste « propulsé par Placet » (co-branding niveau 1).
import { createClient } from "@/lib/supabase/client";

export interface Brand {
  name: string | null;
  logoUrl: string | null;
  accent: string | null;
  /** Lien optionnel posé sur le logo (site de l'organisateur). */
  url: string | null;
}

/** Marque du compte connecté (null si non connecté ou pas encore configurée). */
export async function getMyBrand(): Promise<Brand | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("scrutin_brands")
    .select("name, logo_url, accent, url")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { name: data.name, logoUrl: data.logo_url, accent: data.accent, url: data.url };
}

/** Enregistre / met à jour la marque du compte connecté. */
export async function upsertMyBrand(b: Brand): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");
  const { error } = await supabase.from("scrutin_brands").upsert({
    user_id: user.id,
    name: b.name?.trim() || null,
    logo_url: b.logoUrl?.trim() || null,
    accent: b.accent?.trim() || null,
    url: b.url?.trim() || null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/** Marque liée à un scrutin (par token), pour brander sa page de vote. */
export async function getPollBrand(token: string): Promise<Brand | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_poll_brand", { p_token: token });
  if (error) throw error;
  return (data as Brand | null) ?? null;
}
