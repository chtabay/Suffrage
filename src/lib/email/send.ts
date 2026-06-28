// Envoi d'emails transactionnels (Brevo). Serveur uniquement (clé API secrète).
// Interface unique → on peut changer de fournisseur sans toucher aux appelants.
const BREVO_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "notifications@placet.app";

export interface SendEmailArgs {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  senderName?: string;
  replyTo?: string;
}

/** Envoie un email. Renvoie false (sans throw) si la clé manque ou en cas d'échec. */
export async function sendEmail(a: SendEmailArgs): Promise<boolean> {
  if (!BREVO_KEY) {
    console.error("[email] BREVO_API_KEY manquante — envoi ignoré");
    return false;
  }
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": BREVO_KEY, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: SENDER_EMAIL, name: a.senderName || "Placet" },
        to: [{ email: a.to, name: a.toName }],
        replyTo: a.replyTo ? { email: a.replyTo } : undefined,
        subject: a.subject,
        htmlContent: a.html,
      }),
    });
    if (!res.ok) {
      console.error(`[email] Brevo ${res.status}`, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] échec", e);
    return false;
  }
}

/** L'envoi est-il configuré (clé présente) ? */
export const emailConfigured = (): boolean => Boolean(BREVO_KEY);
