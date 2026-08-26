export type HorizonNotificationLanguage = "fr" | "en" | "es" | "pcm";
export type HorizonNotificationKind = "anniversaire" | "seuil" | "retraite";

export interface HorizonNotificationText {
  title: string;
  body: string;
}

export function horizonNotificationText(
  kind: HorizonNotificationKind,
  language: HorizonNotificationLanguage,
  args: { firstName: string; age: number; years: number; months: number; threshold?: number },
): HorizonNotificationText {
  if (language === "en") {
    if (kind === "anniversaire") return { title: `${args.firstName}: ${args.age}`, body: `Horizon remaining: ${args.years} years and ${args.months} months.` };
    if (kind === "seuil") return { title: `${args.threshold} years`, body: `${args.firstName}'s horizon has just fallen below ${args.threshold} years.` };
    return { title: "Retirement", body: `${args.firstName}'s retirement marker has been reached.` };
  }
  if (language === "es") {
    if (kind === "anniversaire") return { title: `${args.firstName}: ${args.age}`, body: `Horizonte restante: ${args.years} años y ${args.months} meses.` };
    if (kind === "seuil") return { title: `${args.threshold} años`, body: `El horizonte de ${args.firstName} acaba de bajar de ${args.threshold} años.` };
    return { title: "Jubilación", body: `Se ha alcanzado la referencia de jubilación de ${args.firstName}.` };
  }
  if (language === "pcm") {
    if (kind === "anniversaire") return { title: `${args.firstName}: ${args.age}`, body: `Horizon wey remain: ${args.years} years and ${args.months} months.` };
    if (kind === "seuil") return { title: `${args.threshold} years`, body: `${args.firstName} horizon don pass below ${args.threshold} years.` };
    return { title: "Retirement", body: `${args.firstName} retirement marker don reach.` };
  }
  if (kind === "anniversaire") return { title: `${args.firstName} : ${args.age} ans`, body: `Horizon restant : ${args.years} ans et ${args.months} mois.` };
  if (kind === "seuil") return { title: `${args.threshold} ans`, body: `L’horizon de ${args.firstName} vient de passer sous ${args.threshold} ans.` };
  return { title: "Retraite", body: `Le repère de la retraite de ${args.firstName} est atteint.` };
}
