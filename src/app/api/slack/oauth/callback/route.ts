// Callback OAuth Slack (« Add to Slack ») : échange le code contre le bot token du
// workspace, le chiffre, et l'enregistre par team_id. Aucune clé service-role.
import { NextResponse } from "next/server";
import { encryptToken } from "@/lib/slack/crypto";
import { setInstall } from "@/lib/slack/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REDIRECT_URI = "https://placet.app/api/slack/oauth/callback";

interface OAuthResponse {
  ok: boolean;
  error?: string;
  access_token?: string;
  team?: { id: string; name?: string };
  authed_user?: { id?: string };
}

function page(message: string, success: boolean): NextResponse {
  const icon = success ? "🎟️" : "⚠️";
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Placet × Slack</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#FBF6EC;color:#16213A;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px">
<div style="max-width:460px;text-align:center;background:#fff;border:2.5px solid #16213A;border-radius:16px;padding:28px 26px;box-shadow:6px 6px 0 #16213A">
<div style="font-size:44px;line-height:1">${icon}</div>
<p style="font-size:17px;line-height:1.55;margin:14px 0 18px">${message}</p>
<a href="https://placet.app" style="color:#FF5E5B;font-weight:800;text-decoration:none">placet.app</a>
</div></body></html>`;
  return new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (error || !code) return page("Installation annulée.", false);

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) return page("Configuration serveur incomplète (client OAuth).", false);

  try {
    const res = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: REDIRECT_URI }),
    });
    const data = (await res.json()) as OAuthResponse;
    if (!data.ok || !data.access_token || !data.team?.id) {
      return page(`Échec de l'installation${data.error ? ` (${data.error})` : ""}.`, false);
    }
    const enc = encryptToken(data.access_token);
    if (!enc) return page("Configuration serveur incomplète (clé de chiffrement).", false);
    await setInstall(data.team.id, enc, data.team.name ?? null, data.authed_user?.id ?? null);
    return page("Placet est installé dans votre espace Slack ! Tapez <b>/scrutin</b> dans un canal pour créer un vote.", true);
  } catch {
    return page("Erreur réseau pendant l'installation. Réessayez.", false);
  }
}
