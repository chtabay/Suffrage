// Appels à l'API Web de Slack (serveur uniquement), authentifiés par le bot token.
// Renvoient null en cas d'échec (token absent, erreur Slack) sans jamais throw, pour
// ne pas casser le flux d'une route. À n'importer que côté serveur.
const BOT = process.env.SLACK_BOT_TOKEN;

type SlackBlock = Record<string, unknown>;
type SlackResponse = { ok: boolean; error?: string } & Record<string, unknown>;

async function call<T extends SlackResponse = SlackResponse>(method: string, body: unknown): Promise<T | null> {
  if (!BOT) return null;
  try {
    const res = await fetch(`https://slack.com/api/${method}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${BOT}`, "Content-Type": "application/json; charset=utf-8" },
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
export async function postMessage(channel: string, blocks: SlackBlock[], text: string): Promise<string | null> {
  const r = await call<SlackResponse & { ts?: string }>("chat.postMessage", { channel, blocks, text });
  return r?.ts ?? null;
}

/** Remplace le contenu d'un message existant (édition en place). */
export async function updateMessage(channel: string, ts: string, blocks: SlackBlock[], text: string): Promise<boolean> {
  return (await call("chat.update", { channel, ts, blocks, text })) !== null;
}

/** Ouvre une modale (à partir d'un trigger_id valable ~3 s). */
export async function openView(triggerId: string, view: unknown): Promise<boolean> {
  return (await call("views.open", { trigger_id: triggerId, view })) !== null;
}
