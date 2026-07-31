// Demande d'adhésion à un cercle. PUBLIC : appelé par un visiteur anonyme depuis
// /cercle/<join_token>. La RPC est gardée par NOTIFY_SECRET (que seul le serveur
// connaît) → c'est ici, et seulement ici, qu'on obtient un jeton, et on le délivre
// PAR EMAIL. Aucun jeton ne revient au navigateur.
//
// INVARIANT ANTI-ÉNUMÉRATION : dès lors que le cercle est ouvert, la réponse au
// navigateur est la même pour une adresse déjà membre, une adresse inconnue et une
// demande déjà en cours. Sans quoi ce formulaire deviendrait un oracle
// d'appartenance (« untel est-il dans ce cercle ? ») et un outil d'envoi d'emails.
// Le `kind` renvoyé par la RPC ne sert qu'à choisir quel email écrire.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { APP_URL } from "@/lib/voting/aiPrompt";
import { sendEmail, emailConfigured } from "@/lib/email/send";
import { circleConfirmEmail, circleHomeEmail } from "@/lib/email/circle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.NOTIFY_SECRET;
const LOCALES = ["fr", "en", "es", "pcm"];

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
  const loc = LOCALES.includes(body.locale || "") ? (body.locale as string) : "fr";
  if (!token || !name || !email) return NextResponse.json({ status: "invalid" }, { status: 400 });
  if (!SECRET) return NextResponse.json({ status: "error" }, { status: 500 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_join_circle", {
    p_secret: SECRET,
    p_join_token: token,
    p_name: name,
    p_email: email,
  });
  if (error) return NextResponse.json({ status: "error" }, { status: 500 });
  const res = (data ?? {}) as { status?: string; kind?: string; token?: string; name?: string; circle?: string };
  const status = res.status ?? "error";

  if (status === "ok" && res.token && emailConfigured()) {
    const base = loc === "fr" ? APP_URL : `${APP_URL}/${loc}`;
    const circleName = res.circle ?? "Placet";
    const memberName = res.name ?? name;
    // On relit l'engagement du cercle pour le rappeler dans l'email : c'est le
    // cercle qui s'engage, pas Placet, et seulement s'il l'a fait.
    const { data: info } = await supabase.rpc("get_circle_info", { p_join_token: token });
    const perDay = (info as { solicit_per_day?: number | null } | null)?.solicit_per_day ?? null;

    const mail =
      res.kind === "already"
        ? // Déjà membre : on lui renvoie SON lien. Le navigateur, lui, n'en saura rien.
          circleHomeEmail(loc, {
            circleName,
            memberName,
            url: `${base}/m/${res.token}`,
            leaveUrl: `${base}/m/${res.token}?quitter=1`,
            perDay,
          })
        : circleConfirmEmail(loc, {
            circleName,
            memberName,
            url: `${base}/cercle/confirmer/${res.token}`,
            perDay,
          });
    await sendEmail({ to: email, toName: memberName, ...mail, senderName: "Placet" });
  }

  // Jamais le jeton, jamais le `kind` : la réponse est identique dans tous les cas.
  return NextResponse.json({ status });
}
