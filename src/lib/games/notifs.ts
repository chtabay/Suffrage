// LE PASSE-PLAT DES NOTIFICATIONS DES JEUX QUOTIDIENS.
//
// ⚠️ IL EST VOLONTAIREMENT MINCE, ET C'EST TOUT LE DESSIN. L'étude prévient que
// rien de ce chantier n'est vérifiable dans le conteneur de développement — ni
// la permission, ni l'envoi, ni le rendu. La parade a été de mettre tout ce qui
// DÉCIDE en base, où un bloc annulable l'éprouve ; il ne reste ici qu'une boucle
// qui rend un texte et appelle `webpush`. Chaque ligne ajoutée à ce fichier est
// une ligne qu'aucun test ne couvre : elle doit se mériter.
//
// ⚠️ ET LES NUMÉROS DE JOURNÉE VIENNENT D'ICI, PAS DE LA BASE. C'est ce qui
// évite une troisième copie de l'origine du calendrier : `jour.ts` et
// `calendrier.ts` sont la source unique, et une route Next peut les importer.
// La base ne porte le calendrier QUE là où un client menteur y gagnerait
// quelque chose — la médiane scellée de Banalo — et ce n'est pas le cas ici.
import { numeroDuJour } from "@/lib/games/banalo/jour";
import { numeroDeJournee } from "@/lib/games/pays/calendrier";
import { pousser, rpcNotify } from "@/lib/push";
import {
  hebdoBanalo,
  hebdoPays,
  journeeBanalo,
  journeePays,
  saison,
  type DonneesHebdo,
  type DonneesJournee,
  type DonneesSaison,
  type Langue,
  type Texte,
} from "@/content/jeux/notifs";

const SECRET = process.env.NOTIFY_SECRET;
/** Le domaine canonique, jamais l'URL de déploiement Vercel — voir `/api/cron/notify`. */
const APP = "https://placet.app";

interface Ligne {
  endpoint: string;
  p256dh: string;
  auth: string;
  compte: string;
  jeu: "banalo" | "pays";
  genre: "journee" | "hebdo" | "saison";
  repere: string;
  langue: string;
  donnees: Record<string, unknown> & { principal: "journee" | "hebdo" | "saison" };
}

const LANGUES = new Set(["fr", "en", "es", "pcm"]);
/** Une langue inconnue retombe sur le français plutôt que de casser le rendu. */
const langueDe = (l: string): Langue => (LANGUES.has(l) ? (l as Langue) : "fr");

/**
 * Le texte d'une ligne.
 *
 * ⚠️ SIX BRANCHES ÉCRITES EN CLAIR, PAS UNE TABLE INDEXÉE PAR `genre + jeu`. Une
 * combinaison oubliée dans une table rendrait `undefined` sur le téléphone d'un
 * joueur, en silence ; ici elle ne compile pas. C'est aussi ce que
 * `notifs.test.ts` éprouve, combinaison par combinaison.
 *
 * ⚠️ ET LE SECONDAIRE SE REPLIE DANS LE CORPS. La base n'accepte qu'une
 * notification par jour et par jeu : quand une médaille et une clôture tombent
 * ensemble, la seconde ne part pas — elle s'ajoute à la première. Deux
 * notifications d'affilée sont exactement le mode de défaillance que l'étude a
 * écarté.
 */
function texteDe(l: Ligne): Texte | null {
  const lg = langueDe(l.langue);
  const d = l.donnees;
  const principal: Texte | null =
    l.donnees.principal === "saison" && d.saison
      ? saison(d.saison as DonneesSaison, l.jeu, lg)
      : l.donnees.principal === "hebdo" && d.hebdo
        ? l.jeu === "banalo"
          ? hebdoBanalo(d.hebdo as DonneesHebdo, lg)
          : hebdoPays(d.hebdo as DonneesHebdo, lg)
        : l.donnees.principal === "journee" && d.journee
          ? l.jeu === "banalo"
            ? journeeBanalo(d.journee as DonneesJournee, lg)
            : journeePays(d.journee as DonneesJournee, lg)
          : null;
  if (!principal) return null;

  // Ce qui accompagne, quand la fusion a eu lieu. On ne replie QUE le cran
  // au-dessous : trois phrases dans une notification ne se lisent pas.
  let suite = "";
  if (l.donnees.principal === "saison" && d.hebdo) {
    suite = (l.jeu === "banalo" ? hebdoBanalo(d.hebdo as DonneesHebdo, lg) : hebdoPays(d.hebdo as DonneesHebdo, lg)).corps;
  } else if (l.donnees.principal === "saison" && d.journee) {
    suite = (l.jeu === "banalo" ? journeeBanalo(d.journee as DonneesJournee, lg) : journeePays(d.journee as DonneesJournee, lg)).corps;
  } else if (l.donnees.principal === "hebdo" && d.journee) {
    suite = (l.jeu === "banalo" ? journeeBanalo(d.journee as DonneesJournee, lg) : journeePays(d.journee as DonneesJournee, lg)).corps;
  }
  return { titre: principal.titre, corps: suite ? `${principal.corps} ${suite}` : principal.corps };
}

/**
 * Une tournée. Rend ce qu'elle a visé et ce qu'elle a envoyé.
 *
 * ⚠️ ON RÉSERVE UNE FOIS PAR (COMPTE, JEU), PUIS ON POUSSE VERS TOUS SES
 * APPAREILS. La base rend une ligne par abonnement : deux téléphones font deux
 * lignes, et il FAUT les deux — les deux doivent sonner. Mais le registre ne
 * doit s'écrire qu'une fois, sinon le second appareil se fait refuser et la
 * moitié de la tournée semble avoir échoué.
 *
 * ⚠️ ET LA RÉSERVATION VIENT AVANT L'ENVOI, jamais après. Le cron passe toutes
 * les heures : réserver après laisserait une seconde tournée partir pendant que
 * la première envoie encore, et le joueur recevrait deux fois la même chose. On
 * préfère perdre une notification (réservée, non partie) qu'en envoyer deux.
 */
export async function envoyerNotifsJeux(): Promise<{ vises: number; envoyes: number; groupes: number }> {
  if (!SECRET) return { vises: 0, envoyes: 0, groupes: 0 };
  const lignes = await rpcNotify<Ligne[]>("scrutin_jeux_notifs_a_envoyer", {
    p_secret: SECRET,
    p_jour_banalo: numeroDuJour(),
    p_jour_pays: numeroDeJournee(new Date().toISOString()),
  });
  if (!lignes || !lignes.length) return { vises: 0, envoyes: 0, groupes: 0 };

  const groupes = new Map<string, Ligne[]>();
  for (const l of lignes) {
    const cle = `${l.compte}|${l.jeu}`;
    const g = groupes.get(cle);
    if (g) g.push(l);
    else groupes.set(cle, [l]);
  }

  let envoyes = 0;
  for (const g of groupes.values()) {
    const tete = g[0]!;
    const texte = texteDe(tete);
    // Une charge utile dont personne n'a écrit le texte : on ne réserve même
    // pas, pour que la prochaine tournée la reprenne une fois le cas couvert.
    if (!texte) continue;
    const reserve = await rpcNotify<boolean>("scrutin_jeux_notifs_reserver", {
      p_secret: SECRET,
      p_user: tete.compte,
      p_jeu: tete.jeu,
      p_genre: tete.genre,
      p_repere: tete.repere,
    });
    if (reserve !== true) continue;
    for (const l of g) {
      const ok = await pousser(
        { endpoint: l.endpoint, p256dh: l.p256dh, auth: l.auth },
        { title: texte.titre, body: texte.corps, url: `${APP}/games/quotidien` },
      );
      if (ok) envoyes += 1;
    }
  }
  return { vises: lignes.length, envoyes, groupes: groupes.size };
}
