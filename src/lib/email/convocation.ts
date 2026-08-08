// Emails liés aux événements (rendu serveur, indépendant de next-intl). Le lien
// est toujours PERSONNEL : il identifie (événement, membre) et vaut bulletin.
interface Args {
  eventTitle: string;
  memberName: string;
  voteUrl: string;
  /**
   * Lien de retrait, pour les membres d'un CERCLE uniquement. On a promis sur la
   * page d'adhésion « vous partez en un clic, depuis n'importe quel email » : la
   * promesse ne vaut que si elle est tenue sur CHAQUE email, y compris les
   * convocations et les relances — pas seulement sur ceux du parcours d'adhésion.
   * Absent pour une assemblée classique, où l'on ne quitte pas un corps électoral.
   */
  leaveUrl?: string;
}

type Parts = { subject: string; intro: string; cta: string; outro: string };

// Le pied de retrait est localisé ici et non dans chaque gabarit : il doit être
// impossible d'ajouter un email en oubliant de le mettre.
const LEAVE_LINE: Record<string, string> = {
  fr: "Vous ne souhaitez plus faire partie de ce groupe ? Partez en un clic :",
  en: "No longer want to be part of this group? Leave in one click:",
  es: "¿Ya no quieres formar parte de este grupo? Sal con un clic:",
  pcm: "You no wan dey dis group again? Comot with one click:",
};

// Gabarit HTML commun. Logotype texte (pas d'emoji), cohérent avec la marque.
function build(parts: Parts, url: string, locale?: string, leaveUrl?: string): { subject: string; html: string } {
  const foot = leaveUrl
    ? `<p style="font-size:12px;color:#5b6379;line-height:1.5;margin:22px 0 0;border-top:1px solid #e6e6e6;padding-top:14px">${LEAVE_LINE[locale ?? "fr"] ?? LEAVE_LINE.fr} <a href="${leaveUrl}" style="color:#16213A">${leaveUrl}</a></p>`
    : "";
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#16213A;padding:8px">
  <div style="font-size:22px;font-weight:800;color:#16213A;margin-bottom:18px;letter-spacing:-0.02em">Placet</div>
  <p style="font-size:15px;line-height:1.6;margin:0 0 8px">${parts.intro}</p>
  <p style="text-align:center;margin:28px 0">
    <a href="${url}" style="display:inline-block;background:#16213A;color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;padding:14px 28px;border-radius:10px">${parts.cta}</a>
  </p>
  <p style="font-size:12px;color:#5b6379;line-height:1.5;margin:0">${parts.outro}<br><a href="${url}" style="color:#16213A">${url}</a></p>
  ${foot}
</div>`;
  return { subject: parts.subject, html };
}

// ----------------------------------------------------------------- convocation
const CONVOKE: Record<string, (a: Args) => Parts> = {
  fr: (a) => ({
    subject: `Convocation au vote - ${a.eventTitle}`,
    intro: `Bonjour ${a.memberName},<br><br>Vous êtes invité·e à voter pour « <b>${a.eventTitle}</b> » sur Placet. Votre lien est <b>personnel</b> - ne le partagez pas.`,
    cta: "Voter maintenant",
    outro: "Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :",
  }),
  en: (a) => ({
    subject: `Voting invitation - ${a.eventTitle}`,
    intro: `Hello ${a.memberName},<br><br>You're invited to vote on "<b>${a.eventTitle}</b>" on Placet. Your link is <b>personal</b> - please don't share it.`,
    cta: "Vote now",
    outro: "If the button doesn't work, copy this link into your browser:",
  }),
  es: (a) => ({
    subject: `Convocatoria de voto - ${a.eventTitle}`,
    intro: `Hola ${a.memberName}:<br><br>Estás invitado/a a votar en «<b>${a.eventTitle}</b>» en Placet. Tu enlace es <b>personal</b>: no lo compartas.`,
    cta: "Votar ahora",
    outro: "Si el botón no funciona, copia este enlace en tu navegador:",
  }),
};

export function convocationEmail(locale: string, a: Args): { subject: string; html: string } {
  return build((CONVOKE[locale] ?? CONVOKE.fr)(a), a.voteUrl, locale, a.leaveUrl);
}

// ------------------------------------------------------- confirmation d'inscription
// Double opt-in : l'email confirme l'inscription ET porte le lien de vote personnel.
const ENROLL: Record<string, (a: Args) => Parts> = {
  fr: (a) => ({
    subject: `Inscription confirmée - ${a.eventTitle}`,
    intro: `Bonjour ${a.memberName},<br><br>Votre inscription à « <b>${a.eventTitle}</b> » est confirmée. Voici votre lien <b>personnel</b> de vote - ne le partagez pas.`,
    cta: "Accéder au vote",
    outro: "Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :",
  }),
  en: (a) => ({
    subject: `Registration confirmed - ${a.eventTitle}`,
    intro: `Hello ${a.memberName},<br><br>Your registration for "<b>${a.eventTitle}</b>" is confirmed. Here is your <b>personal</b> voting link - please don't share it.`,
    cta: "Go to the vote",
    outro: "If the button doesn't work, copy this link into your browser:",
  }),
  es: (a) => ({
    subject: `Inscripción confirmada - ${a.eventTitle}`,
    intro: `Hola ${a.memberName}:<br><br>Tu inscripción a «<b>${a.eventTitle}</b>» está confirmada. Aquí tienes tu enlace <b>personal</b> de voto: no lo compartas.`,
    cta: "Acceder al voto",
    outro: "Si el botón no funciona, copia este enlace en tu navegador:",
  }),
};

export function enrollEmail(locale: string, a: Args): { subject: string; html: string } {
  return build((ENROLL[locale] ?? ENROLL.fr)(a), a.voteUrl, locale, a.leaveUrl);
}

// ----------------------------------------------------------------- relance
// Rappel aux membres convoqués qui n'ont pas encore voté. Même lien personnel.
const REMIND: Record<string, (a: Args) => Parts> = {
  fr: (a) => ({
    subject: `Rappel : votre vote vous attend - ${a.eventTitle}`,
    intro: `Bonjour ${a.memberName},<br><br>Vous n'avez pas encore voté pour « <b>${a.eventTitle}</b> ». Votre lien <b>personnel</b> est toujours actif - cela ne prend qu'une minute.`,
    cta: "Voter maintenant",
    outro: "Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :",
  }),
  en: (a) => ({
    subject: `Reminder: your vote is waiting - ${a.eventTitle}`,
    intro: `Hello ${a.memberName},<br><br>You haven't voted yet on "<b>${a.eventTitle}</b>". Your <b>personal</b> link is still active - it only takes a minute.`,
    cta: "Vote now",
    outro: "If the button doesn't work, copy this link into your browser:",
  }),
  es: (a) => ({
    subject: `Recordatorio: tu voto te espera - ${a.eventTitle}`,
    intro: `Hola ${a.memberName}:<br><br>Aún no has votado en «<b>${a.eventTitle}</b>». Tu enlace <b>personal</b> sigue activo: solo toma un minuto.`,
    cta: "Votar ahora",
    outro: "Si el botón no funciona, copia este enlace en tu navegador:",
  }),
};

export function reminderEmail(locale: string, a: Args): { subject: string; html: string } {
  return build((REMIND[locale] ?? REMIND.fr)(a), a.voteUrl, locale, a.leaveUrl);
}
