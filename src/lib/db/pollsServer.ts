// Création d'un scrutin CÔTÉ SERVEUR (routes API : Slack, Teams, agents…).
// Insert direct via REST + clé anon (même modèle que push.ts/pollMeta.ts) : pas de
// client navigateur, pas de service-role. RLS de scrutin_polls inchangée (insert anon
// autorisé, created_by null), donc aucun privilège supplémentaire.
import crypto from "crypto";
import type { Option, Recipe } from "@/lib/voting/types";

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Enregistre un scrutin et renvoie son token public (null si échec). */
export async function createPollServer(
  question: string,
  options: Option[],
  recipe: Recipe,
  opts: {
    description?: string | null;
    closesAt?: string | null;
    /** Résultats masqués pendant le vote (ils redeviennent publics à la clôture). */
    hideResults?: boolean;
    /** Circonscriptions pondérées (grands électeurs). */
    districts?: { name: string; electors: number }[] | null;
    /** Clôture automatique dès que tout le monde a voté. */
    closeOnComplete?: boolean;
    quorum?: number | null;
  } = {},
): Promise<{ token: string; secret: string } | null> {
  if (!BASE || !KEY) return null;
  // Le secret d'admin est rendu à l'appelant — c'est la SEULE fois où il existe
  // en clair : la base n'en garde que le sha256. Perdu, le scrutin n'est plus
  // administrable (ni clôture anticipée, ni publication).
  const secret = crypto.randomUUID();
  const admin_hash = crypto.createHash("sha256").update(secret).digest("hex");
  try {
    // `?select=token` est OBLIGATOIRE, pas une optimisation : sans lui,
    // return=representation renvoie toutes les colonnes — dont admin_hash, que
    // le rôle anon n'a plus le droit de lire. L'insert échouerait entièrement.
    const res = await fetch(`${BASE}/rest/v1/scrutin_polls?select=token`, {
      method: "POST",
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        question,
        description: opts.description ?? null,
        options,
        recipe,
        created_by: null,
        admin_hash,
        hide_results: opts.hideResults ?? false,
        access_mode: "open",
        districts: opts.districts ?? null,
        opens_at: null,
        closes_at: opts.closesAt ?? null,
        close_on_complete: opts.closeOnComplete ?? false,
        quorum: opts.quorum ?? null,
      }),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { token: string }[];
    const token = rows?.[0]?.token;
    return token ? { token, secret } : null;
  } catch {
    return null;
  }
}

/**
 * Publie (ou dépublie) un scrutin sur le feed public, côté serveur.
 * Renvoie le verdict de la RPC : 'ok' | 'invalid' | 'rate_limited' (5 / 24 h) |
 * 'collecting' (refusé tant que la liste d'options n'est pas figée).
 */
export async function setPollVisibilityServer(
  token: string,
  secret: string,
  isPublic: boolean,
): Promise<string> {
  if (!BASE || !KEY) return "invalid";
  try {
    const res = await fetch(`${BASE}/rest/v1/rpc/set_poll_visibility`, {
      method: "POST",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_token: token, p_secret: secret, p_public: isPublic }),
    });
    if (!res.ok) return "invalid";
    const txt = await res.text();
    return txt ? String(JSON.parse(txt)) : "invalid";
  } catch {
    return "invalid";
  }
}

/** Clôture un scrutin via la RPC close_poll (secret d'admin). Vrai si clôturé. */
export async function closePollServer(token: string, secret: string): Promise<boolean> {
  if (!BASE || !KEY) return false;
  try {
    const res = await fetch(`${BASE}/rest/v1/rpc/close_poll`, {
      method: "POST",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_token: token, p_secret: secret }),
    });
    if (!res.ok) return false;
    const txt = await res.text();
    return txt ? JSON.parse(txt) === true : false;
  } catch {
    return false;
  }
}
