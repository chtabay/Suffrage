// Accès à la file de l'avatar éditorial.
//
// Tout passe par des RPC `security definer` gardées par une clé : les tables ne
// sont lisibles ni par le navigateur ni par la clé anon (RLS active, aucune
// policy). C'est indispensable ici — `scrutin_agent_campaigns` contient les
// secrets d'administration des scrutins créés, seul moyen de les clôturer plus
// tard.
//
// Convention du projet : REST + clé anon, pas de service-role. La garde réelle
// est le secret passé en argument, exactement comme `close_poll`.

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Clé du worker. Absente = avatar désarmé : rien ne se publie. */
export function workerKey(): string | null {
  return process.env.AGENT_WORKER_KEY || null;
}

export type Campaign = {
  id: string;
  state: "draft" | "published" | "closed" | "analysed" | "blocked" | "cancelled";
  question: string;
  options: { name: string }[] | string[];
  method: string;
  source_url: string | null;
  source_publisher: string | null;
  poll_token: string | null;
  poll_secret: string | null;
  close_at: string | null;
};

async function rpc<T>(fn: string, body: Record<string, unknown>): Promise<T | null> {
  if (!BASE || !KEY) return null;
  try {
    const res = await fetch(`${BASE}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const txt = await res.text();
    return txt ? (JSON.parse(txt) as T) : null;
  } catch {
    return null;
  }
}

/** Ce qui est à traiter maintenant. Vide si l'interrupteur est coupé. */
export async function dueCampaigns(key: string): Promise<Campaign[]> {
  return (await rpc<Campaign[]>("agent_due", { p_key: key })) ?? [];
}

/** Dépose une question dans la file. Rend l'identifiant, ou null si refusé. */
export async function enqueueCampaign(
  key: string,
  c: {
    question: string;
    options: string[];
    method?: string;
    sourceUrl?: string | null;
    sourcePublisher?: string | null;
    publishAt?: string | null;
    closeAt?: string | null;
  },
): Promise<string | null> {
  return rpc<string>("agent_enqueue", {
    p_key: key,
    p_question: c.question,
    p_options: c.options.map((name) => ({ name })),
    p_method: c.method ?? "simple_vote",
    p_source_url: c.sourceUrl ?? null,
    p_source_publisher: c.sourcePublisher ?? null,
    p_publish_at: c.publishAt ?? null,
    p_close_at: c.closeAt ?? null,
  });
}

// Les transitions rendent `false` quand la campagne n'était PAS dans l'état
// attendu — c'est le signal qu'un autre passage l'a déjà traitée, pas une
// erreur. Le worker s'en sert pour ne rien faire deux fois.
export const markPublished = (key: string, id: string, token: string, secret: string) =>
  rpc<boolean>("agent_mark_published", { p_key: key, p_id: id, p_token: token, p_secret: secret });

export const markClosed = (key: string, id: string) =>
  rpc<boolean>("agent_mark_closed", { p_key: key, p_id: id });

export const markAnalysed = (key: string, id: string, analysis: string) =>
  rpc<boolean>("agent_mark_analysed", { p_key: key, p_id: id, p_analysis: analysis });

export const blockCampaign = (key: string, id: string, reason: string) =>
  rpc<boolean>("agent_block", { p_key: key, p_id: id, p_reason: reason });
