// Appels à l'API Web de Slack (serveur uniquement). Le bot token dépend du WORKSPACE
// (multi-workspace) : il est passé en argument (résolu via store.botTokenForTeam).
// Renvoient null en cas d'échec (token absent/null, erreur Slack) sans jamais throw.
type SlackBlock = Record<string, unknown>;
type SlackResponse = { ok: boolean; error?: string } & Record<string, unknown>;

async function call<T extends SlackResponse = SlackResponse>(
  token: string | null,
  method: string,
  body: unknown,
): Promise<T | null> {
  if (!token) return null;
  try {
    const res = await fetch(`https://slack.com/api/${method}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as T;
    if (!data.ok) {
      console.error(`[slack] ${method} -> ${data.error}`);
      return null;
    }
    return data;
  } catch (e) {
    console.error(`[slack] ${method} failed`, e);
    return null;
  }
}

/** Poste un message dans un canal. Renvoie le `ts` du message (pour le mettre à jour ensuite). */
export async function postMessage(
  token: string | null,
  channel: string,
  blocks: SlackBlock[],
  text: string,
): Promise<string | null> {
  const r = await call<SlackResponse & { ts?: string }>(token, "chat.postMessage", { channel, blocks, text });
  return r?.ts ?? null;
}

/** Remplace le contenu d'un message existant (édition en place). */
export async function updateMessage(
  token: string | null,
  channel: string,
  ts: string,
  blocks: SlackBlock[],
  text: string,
): Promise<boolean> {
  return (await call(token, "chat.update", { channel, ts, blocks, text })) !== null;
}

/** Ouvre une modale (à partir d'un trigger_id valable ~3 s). */
export async function openView(token: string | null, triggerId: string, view: unknown): Promise<boolean> {
  return (await call(token, "views.open", { trigger_id: triggerId, view })) !== null;
}

/** Locale Slack de l'utilisateur (ex. "fr-FR", "en-US", "es-ES"). Null si indisponible (scope `users:read`). */
export async function userLocale(token: string | null, userId: string): Promise<string | null> {
  const r = await call<SlackResponse & { user?: { locale?: string } }>(token, "users.info", {
    user: userId,
    include_locale: true,
  });
  return r?.user?.locale ?? null;
}
