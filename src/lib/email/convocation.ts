// Contenu de l'email de convocation (= magic link). Trilingue, indépendant de
// next-intl (rendu serveur). Le lien est personnel : il identifie (événement, membre).
interface Args {
  eventTitle: string;
  memberName: string;
  voteUrl: string;
}

const STR: Record<string, (a: Args) => { subject: string; intro: string; cta: string; outro: string }> = {
  fr: (a) => ({
    subject: `Convocation au vote — ${a.eventTitle}`,
    intro: `Bonjour ${a.memberName},<br><br>Vous êtes invité·e à voter pour « <b>${a.eventTitle}</b> » sur Placet. Votre lien est <b>personnel</b> — ne le partagez pas.`,
    cta: "Voter maintenant",
    outro: "Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :",
  }),
  en: (a) => ({
    subject: `Voting invitation — ${a.eventTitle}`,
    intro: `Hello ${a.memberName},<br><br>You're invited to vote on "<b>${a.eventTitle}</b>" on Placet. Your link is <b>personal</b> — please don't share it.`,
    cta: "Vote now",
    outro: "If the button doesn't work, copy this link into your browser:",
  }),
  es: (a) => ({
    subject: `Convocatoria de voto — ${a.eventTitle}`,
    intro: `Hola ${a.memberName}:<br><br>Estás invitado/a a votar en «<b>${a.eventTitle}</b>» en Placet. Tu enlace es <b>personal</b>: no lo compartas.`,
    cta: "Votar ahora",
    outro: "Si el botón no funciona, copia este enlace en tu navegador:",
  }),
};

export function convocationEmail(locale: string, a: Args): { subject: string; html: string } {
  const s = (STR[locale] ?? STR.fr)(a);
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#16213A;padding:8px">
  <div style="font-size:22px;font-weight:800;color:#16213A;margin-bottom:18px">🗳️ Placet</div>
  <p style="font-size:15px;line-height:1.6;margin:0 0 8px">${s.intro}</p>
  <p style="text-align:center;margin:28px 0">
    <a href="${a.voteUrl}" style="display:inline-block;background:#16213A;color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;padding:14px 28px;border-radius:10px">${s.cta}</a>
  </p>
  <p style="font-size:12px;color:#5b6379;line-height:1.5;margin:0">${s.outro}<br><a href="${a.voteUrl}" style="color:#16213A">${a.voteUrl}</a></p>
</div>`;
  return { subject: s.subject, html };
}
