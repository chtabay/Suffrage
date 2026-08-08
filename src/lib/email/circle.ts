// Emails du groupe (rendu serveur, indépendant de next-intl).
//
// Deux principes non négociables ici :
//  1. le lien de confirmation mène à une page qui demande un CLIC, jamais à un
//     GET qui confirme — les anti-phishing d'entreprise visitent les liens des
//     emails et valideraient le double opt-in tout seuls ;
//  2. chaque email porte le lien de retrait. Le membre ne doit jamais avoir à
//     chercher comment partir.

interface CircleArgs {
  circleName: string;
  memberName: string;
  url: string;
  /** Pied de retrait — absent sur l'email de confirmation (il n'est pas encore membre). */
  leaveUrl?: string;
  /** Engagement de fréquence réellement pris par CE groupe. `null` = aucun, on n'affiche rien. */
  perDay?: number | null;
}

type Parts = { subject: string; intro: string; cta: string; outro: string; leave?: string };

function build(parts: Parts, url: string, leaveUrl?: string): { subject: string; html: string } {
  const foot = leaveUrl && parts.leave
    ? `<p style="font-size:12px;color:#5b6379;line-height:1.5;margin:22px 0 0;border-top:1px solid #e6e6e6;padding-top:14px">${parts.leave} <a href="${leaveUrl}" style="color:#16213A">${leaveUrl}</a></p>`
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

// L'engagement de fréquence n'est affiché QUE si ce groupe en a réellement pris
// un. Sinon on ne promet rien — jamais un chiffre générique à la place du groupe.
function pledge(locale: string, perDay?: number | null): string {
  if (perDay === null || perDay === undefined) return "";
  const s: Record<string, string> = {
    fr: `<br><br>Ce groupe s'engage à ne pas ouvrir plus de <b>${perDay}</b> consultation(s) par jour.`,
    en: `<br><br>This group commits to opening no more than <b>${perDay}</b> consultation(s) per day.`,
    es: `<br><br>Este grupo se compromete a no abrir más de <b>${perDay}</b> consulta(s) por día.`,
    pcm: `<br><br>Dis group promise say e no go open pass <b>${perDay}</b> consultation(s) per day.`,
  };
  return s[locale] ?? s.fr;
}

// ------------------------------------------------------- confirmation d'adhésion
const CONFIRM: Record<string, (a: CircleArgs) => Parts> = {
  fr: (a) => ({
    subject: `Confirmez votre inscription - ${a.circleName}`,
    intro: `Bonjour ${a.memberName},<br><br>Vous avez demandé à rejoindre le groupe « <b>${a.circleName}</b> » sur Placet. Cliquez ci-dessous pour confirmer — <b>tant que vous ne l'avez pas fait, vous n'y êtes pas inscrit·e</b> et votre adresse n'est enregistrée nulle part.${pledge("fr", a.perDay)}<br><br>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.`,
    cta: "Confirmer mon inscription",
    outro: "Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :",
  }),
  en: (a) => ({
    subject: `Confirm your sign-up - ${a.circleName}`,
    intro: `Hello ${a.memberName},<br><br>You asked to join the group "<b>${a.circleName}</b>" on Placet. Click below to confirm — <b>until you do, you are not a member</b> and your address is stored nowhere.${pledge("en", a.perDay)}<br><br>If you didn't make this request, simply ignore this email.`,
    cta: "Confirm my sign-up",
    outro: "If the button doesn't work, copy this link into your browser:",
  }),
  es: (a) => ({
    subject: `Confirma tu inscripción - ${a.circleName}`,
    intro: `Hola ${a.memberName}:<br><br>Has pedido unirte al círculo «<b>${a.circleName}</b>» en Placet. Haz clic abajo para confirmar: <b>hasta que lo hagas, no estás inscrito/a</b> y tu dirección no se guarda en ninguna parte.${pledge("es", a.perDay)}<br><br>Si no has hecho esta solicitud, simplemente ignora este correo.`,
    cta: "Confirmar mi inscripción",
    outro: "Si el botón no funciona, copia este enlace en tu navegador:",
  }),
  pcm: (a) => ({
    subject: `Confirm your sign-up - ${a.circleName}`,
    intro: `Hello ${a.memberName},<br><br>You ask to join di circle "<b>${a.circleName}</b>" for Placet. Click below to confirm — <b>until you do am, you never be member</b> and your address no dey store anywhere.${pledge("pcm", a.perDay)}<br><br>If na no be you ask, just ignore dis email.`,
    cta: "Confirm my sign-up",
    outro: "If di button no work, copy dis link go your browser:",
  }),
};

export function circleConfirmEmail(locale: string, a: CircleArgs) {
  return build((CONFIRM[locale] ?? CONFIRM.fr)(a), a.url);
}

// ------------------------------------------------ bienvenue / rappel de lien
// Envoyé aussi bien après confirmation qu'à une adresse DÉJÀ membre qui redemande
// à s'inscrire : le formulaire ne dit jamais « déjà inscrit » (ce serait un oracle
// d'appartenance), c'est cet email — lu par le seul propriétaire de l'adresse —
// qui le lui apprend.
const HOME: Record<string, (a: CircleArgs) => Parts> = {
  fr: (a) => ({
    subject: `Votre page - ${a.circleName}`,
    intro: `Bonjour ${a.memberName},<br><br>Voici votre page personnelle pour le groupe « <b>${a.circleName}</b> » : vous y retrouvez les consultations en cours, leurs résultats, et vous pouvez en partir à tout moment. Ce lien est <b>personnel</b> — ne le partagez pas.${pledge("fr", a.perDay)}`,
    cta: "Ouvrir ma page",
    outro: "Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :",
    leave: "Vous ne souhaitez plus faire partie de ce groupe ? Partez en un clic :",
  }),
  en: (a) => ({
    subject: `Your page - ${a.circleName}`,
    intro: `Hello ${a.memberName},<br><br>Here is your personal page for the group "<b>${a.circleName}</b>": open consultations, their results, and you can leave whenever you want. This link is <b>personal</b> — please don't share it.${pledge("en", a.perDay)}`,
    cta: "Open my page",
    outro: "If the button doesn't work, copy this link into your browser:",
    leave: "No longer want to be part of this group? Leave in one click:",
  }),
  es: (a) => ({
    subject: `Tu página - ${a.circleName}`,
    intro: `Hola ${a.memberName}:<br><br>Esta es tu página personal del grupo «<b>${a.circleName}</b>»: consultas abiertas, sus resultados, y puedes salir cuando quieras. Este enlace es <b>personal</b>: no lo compartas.${pledge("es", a.perDay)}`,
    cta: "Abrir mi página",
    outro: "Si el botón no funciona, copia este enlace en tu navegador:",
    leave: "¿Ya no quieres formar parte de este grupo? Sal con un clic:",
  }),
  pcm: (a) => ({
    subject: `Your page - ${a.circleName}`,
    intro: `Hello ${a.memberName},<br><br>Na your personal page for di circle "<b>${a.circleName}</b>": consultations wey dey open, dia results, and you fit comot anytime. Dis link na <b>personal</b> — no share am.${pledge("pcm", a.perDay)}`,
    cta: "Open my page",
    outro: "If di button no work, copy dis link go your browser:",
    leave: "You no wan dey dis group again? Comot with one click:",
  }),
};

export function circleHomeEmail(locale: string, a: CircleArgs) {
  return build((HOME[locale] ?? HOME.fr)(a), a.url, a.leaveUrl);
}
