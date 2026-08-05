// Feed public Placet : lecture des scrutins PUBLIÉS (et approuvés par la
// modération) via la RPC get_public_polls. Le contrat RPC garantit qu'aucune
// donnée sensible (admin_hash, votants, messages privés) ne sort d'ici.
import type { Option, Recipe } from "@/lib/voting/types";
import type { PollStatus } from "@/lib/db/polls";
import { createClient } from "@/lib/supabase/client";

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
  /**
   * Épinglé par le compte connecté. Toujours `false` pour un visiteur anonyme —
   * la même RPC sert la page publique (rendue serveur avec la clé anon) et la vue
   * du connecté, sans seconde fonction ni branche.
   */
  pinned: boolean;
}

/** Phase effective d'une carte (statut manuel + borne temporelle, sans opens_at). */
export function cardIsOpen(c: PublicPollCard, now: number = Date.now()): boolean {
  if (c.status === "closed") return false;
  if (c.closes_at && now >= Date.parse(c.closes_at)) return false;
  return true;
}

/**
 * Intention d'une carte, dans la taxonomie de l'accueil : sonder (panorama sans
 * vainqueur), trouver une date (options-créneaux), ou décider. L'affectation
 * n'est pas publiable — pas de 4e cas.
 */
export type CardIntent = "decide" | "survey" | "date";
export function cardIntent(c: PublicPollCard): CardIntent {
  if (c.recipe.survey) return "survey";
  if (c.options.some((o) => o.at)) return "date";
  return "decide";
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

// ------------------------------------------------------------------ marché
// Épingler et chercher : les deux gestes qui font la différence entre regarder
// une vitrine et suivre quelque chose.


/**
 * Cartes publiques, avec recherche et tri « épinglés d'abord ».
 *
 * La recherche est faite EN BASE, jokers de LIKE échappés : sans cela, un `%`
 * saisi ramènerait tout le catalogue et un `_` n'importe quoi.
 */
export async function fetchMarket(opts: {
  limit?: number;
  before?: string | null;
  search?: string | null;
  pinnedOnly?: boolean;
} = {}): Promise<PublicPollCard[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_public_polls", {
    p_limit: opts.limit ?? 24,
    p_before: opts.before ?? null,
    p_search: opts.search?.trim() || null,
    p_pinned_only: opts.pinnedOnly ?? false,
  });
  if (error) throw error;
  return (data as PublicPollCard[] | null) ?? [];
}

/**
 * Bascule l'épingle et renvoie son NOUVEL état. Épingler ne donne aucun droit
 * sur le scrutin : c'est un marque-page, rien de plus — d'où une écriture
 * directe autorisée à l'intéressé, contrairement au rattachement d'appartenance.
 */
export async function togglePin(token: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("toggle_pin", { p_token: token });
  if (error) throw error;
  return Boolean(data);
}
