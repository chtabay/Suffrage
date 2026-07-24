// Feed public Placet : lecture des scrutins PUBLIÉS (et approuvés par la
// modération) via la RPC get_public_polls. Le contrat RPC garantit qu'aucune
// donnée sensible (admin_hash, votants, messages privés) ne sort d'ici.
import { createClient } from "@/lib/supabase/client";
import type { Option, Recipe } from "@/lib/voting/types";
import type { PollStatus } from "@/lib/db/polls";

/** Carte de scrutin public — exactement les champs renvoyés par get_public_polls. */
export interface PublicPollCard {
  token: string;
  question: string;
  description: string | null;
  options: Option[];
  recipe: Recipe;
  status: PollStatus;
  closes_at: string | null;
  published_at: string;
  ballot_count: number;
}

/** Phase effective d'une carte (statut manuel + borne temporelle, sans opens_at). */
export function cardIsOpen(c: PublicPollCard, now: number = Date.now()): boolean {
  if (c.status === "closed") return false;
  if (c.closes_at && now >= Date.parse(c.closes_at)) return false;
  return true;
}

/**
 * Liste paginée des scrutins publics (client). Tri published_at desc ;
 * pagination keyset : passer le published_at de la dernière carte en `before`.
 */
export async function getPublicPolls(limit = 12, before?: string): Promise<PublicPollCard[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_public_polls", {
    p_limit: limit,
    p_before: before ?? null,
  });
  if (error) throw error;
  return ((data ?? []) as PublicPollCard[]) || [];
}

/**
 * Même lecture côté serveur (server components / sitemap) : REST + clé anon,
 * pattern de pollMeta.ts. Repli silencieux sur [] — le feed ne doit jamais
 * casser une page serveur.
 */
export async function fetchPublicPollsServer(limit = 12): Promise<PublicPollCard[]> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return [];
  try {
    const res = await fetch(`${base}/rest/v1/rpc/get_public_polls`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_limit: limit }),
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as PublicPollCard[] | null;
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}
