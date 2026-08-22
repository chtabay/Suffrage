import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

// L'ANCIENNE PAGE D'HISTORIQUE DE BANALO, DEVENUE UNE REDIRECTION.
//
// ⚠️ ELLE A VÉCU DEUX JOURS ET ELLE EST REMPLACÉE, PAS SUPPRIMÉE. La page
// commune `/games/quotidien` répond à la même question pour les DEUX jeux ; en
// garder deux ferait deux endroits à tenir à jour, et c'est toujours la copie
// qui finit par mentir. Le chemin reste vivant parce qu'il a été mis en lien
// dans la carte de compte : un lien qu'on a pu suivre ne se coupe pas.
//
// ⚠️ CE QU'ON PERD EN CHEMIN, ET C'EST ASSUMÉ : la page de Banalo nommait le
// SUJET de chaque journée. La page commune ne peut pas le faire — Cinq sur cinq
// interdit toute métadonnée dérivée du puzzle, et une colonne qui ne se remplit
// que pour un jeu sur deux se lit comme une donnée manquante.
export default async function HistoriqueRedirige() {
  redirect({ href: "/games/quotidien", locale: await getLocale() });
}
