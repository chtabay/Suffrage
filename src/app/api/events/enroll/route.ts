// Inscription ouverte par lien (double opt-in). PUBLIC : appelé par un visiteur
// anonyme depuis la page /rejoindre. La RPC self_enroll est gardée par NOTIFY_SECRET
// (que seul le serveur connaît) → c'est ici, et seulement ici, qu'on obtient le jeton
// de vote, qu'on délivre PAR EMAIL. Le jeton n'est jamais renvoyé au navigateur.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { APP_URL } from "@/lib/voting/aiPrompt";
import { sendEmail, emailConfigured } from "@/lib/email/send";
import { enrollEmail } from "@/lib/email/convocation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.NOTIFY_SECRET;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    token?: string;
    name?: string;
    email?: string;
    locale?: string;
  };
  const token = (body.token || "").trim();
  const name = (body.name || "").trim().slice(0, 120);
  const email = (body.email || "").trim().slice(0, 160);
  const loc = body.locale === "en" || body.locale === "es" ? body.locale : "fr";
  if (!token || !name || !email) return NextResponse.json({ status: "invalid" }, { status: 400 });
  if (!SECRET) return NextResponse.json({ status: "error" }, { status: 500 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("self_enroll", {
    p_secret: SECRET,
    p_enroll_token: token,
    p_name: name,
    p_email: email,
  });
  if (error) return NextResponse.json({ status: "error" }, { status: 500 });
  const res = (data ?? {}) as { status?: string; token?: string };
  const status = res.status ?? "error";

  // On n'envoie le lien personnel QU'À la création (status 'ok') — anti-bombardement.
  let emailed = false;
  if (status === "ok" && res.token && emailConfigured()) {
    const { data: info } = await supabase.rpc("get_enroll_info", { p_enroll_token: token });
    const title = (info as { title?: string } | null)?.title ?? "Placet";
    const base = loc === "fr" ? APP_URL : `${APP_URL}/${loc}`;
    const { subject, html } = enrollEmail(loc, {
      eventTitle: title,
      memberName: name,
      voteUrl: `${base}/e/${res.token}`,
    });
    emailed = await sendEmail({ to: email, toName: name, subject, html, senderName: "Placet" });
  }

  // Jamais le jeton au navigateur (double opt-in : il ne part que par email).
  return NextResponse.json({ status, emailed });
}
