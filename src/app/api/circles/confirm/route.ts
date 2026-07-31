// Confirmation d'adhésion (2e temps du double opt-in).
//
// POST, jamais GET : les passerelles anti-phishing d'entreprise visitent les liens
// contenus dans les emails pour les inspecter. Un GET confirmerait donc l'adhésion
// tout seul, ce qui reviendrait à ne pas avoir de double opt-in du tout. L'email
// mène à une page, la page porte un bouton, le bouton fait ce POST.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { APP_URL } from "@/lib/voting/aiPrompt";
import { sendEmail, emailConfigured } from "@/lib/email/send";
import { circleHomeEmail } from "@/lib/email/circle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.NOTIFY_SECRET;
const LOCALES = ["fr", "en", "es", "pcm"];

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { token?: string; locale?: string };
  const token = (body.token || "").trim();
  const loc = LOCALES.includes(body.locale || "") ? (body.locale as string) : "fr";
  if (!token) return NextResponse.json({ status: "invalid" }, { status: 400 });
  if (!SECRET) return NextResponse.json({ status: "error" }, { status: 500 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("confirm_join_circle", {
    p_secret: SECRET,
    p_request_token: token,
  });
  if (error) return NextResponse.json({ status: "error" }, { status: 500 });
  const res = (data ?? {}) as { status?: string; token?: string; name?: string; circle?: string };
  if (res.status !== "ok" || !res.token) {
    return NextResponse.json({ status: res.status ?? "error" });
  }

  // Le jeton de membre part par email — il ne redescend pas au navigateur, qui
  // reçoit seulement l'URL où aller. Même règle que partout ailleurs.
  const base = loc === "fr" ? APP_URL : `${APP_URL}/${loc}`;
  const home = `${base}/m/${res.token}`;
  if (emailConfigured()) {
    const mail = circleHomeEmail(loc, {
      circleName: res.circle ?? "Placet",
      memberName: res.name ?? "",
      url: home,
      leaveUrl: `${home}?quitter=1`,
    });
    // L'adresse est celle que la RPC vient de confirmer : on la relit côté serveur
    // plutôt que de la faire circuler dans la requête.
    const { data: who } = await supabase.rpc("get_member_home", { p_token: res.token });
    const to = (who as { email?: string | null } | null)?.email;
    if (to) await sendEmail({ to, toName: res.name, ...mail, senderName: "Placet" });
  }

  return NextResponse.json({ status: "ok", home });
}
