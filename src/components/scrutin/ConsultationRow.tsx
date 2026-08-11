"use client";

// UNE ligne de consultation, et une seule.
//
// Le tableau de bord et la vue de gestion en rendaient chacun la sienne : fond
// crème contre fond blanc, rayon 13 contre 20, titre en police de texte contre
// police de titrage. On passe de l'un à l'autre par un lien (« + 2 en cours »),
// et rien ne se ressemblait — pour le MÊME objet.
//
// Trois divergences n'étaient pas cosmétiques :
//
//   • LA PASTILLE. La vue de gestion peignait « Ouvert » en blanc sur GREEN
//     (#5DBB2E) : ~2,46:1 en 11,5 px gras, sous la barre AA de 4,5. `theme.ts`
//     interdit déjà GREEN pour du TEXTE ; la règle vaut aussi pour du blanc POSÉ
//     dessus. Le tableau de bord, lui, utilisait GREENTXT en fond (~5,1:1). Même
//     badge, deux implémentations, une qui échouait. GREEN reste ici ce qu'il a
//     toujours été : un aplat sans texte — donc il ne sert plus du tout.
//
//   • LE RÉGIME DU BULLETIN. Le tableau de bord affichait « 🔒 » NU, sans un
//     mot, sur la distinction la plus lourde de conséquences du produit — et un
//     lecteur d'écran annonçait « cadenas ». L'emoji est désormais décoratif
//     (aria-hidden) et c'est le MOT qui porte le sens, comme la vue de gestion
//     le faisait déjà.
//
//   • LE RATIO D'ÉMARGEMENT. La règle des 5 convoqués était recopiée dans les
//     deux fichiers, une fois par une fonction nommée, une fois par un `>= 5`
//     en dur. Deux copies d'une règle de secret, c'est une copie de trop.
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { intlLocale } from "@/i18n/locales";
import type { EventRow, EventStats } from "@/lib/db/events";
import { CREAM, FONT_DISPLAY, GREENTXT, INK, MUTED, PAPER, SUBINK, YELLOW } from "./theme";

/** Sous ce seuil, la base refuse une consultation scellée (circle_audience_guard). */
export const SEALED_MIN = 5;

/**
 * Le ratio d'émargement est-il montrable ?
 *
 * En SCELLÉ, seulement à partir de 5 convoqués : « 2/3 » sur trois personnes est
 * déjà une désignation partielle, et le seuil de 5 qui gouverne le reste du
 * régime scellé n'aurait aucun sens s'il était contourné par un compteur.
 * En NOMINATIF, sans condition : l'animateur a le droit de voir qui a répondu
 * quoi, et le votant en est averti avant de voter.
 *
 * La règle vit ICI, à côté du rendu, et non dans la RPC : celle-ci sert la
 * donnée brute au seul propriétaire du cercle. Toute surface qui l'afficherait
 * ailleurs devra importer cette fonction — pas la réécrire.
 */
export function ratioVisible(sealed: boolean, convened: number): boolean {
  return !sealed || convened >= SEALED_MIN;
}

/**
 * L'échéance est-elle passée alors que la consultation est encore « ouverte » ?
 *
 * ⚠️ RIEN NE CLÔT UNE CONSULTATION À SON ÉCHÉANCE. Aucun cron, aucun
 * déclencheur : `closes_at` est une borne que seul `cast_event_ballot` consulte,
 * pour refuser le bulletin. Le `status` en base reste donc `'open'` pour
 * toujours. Sans ce prédicat, la consultation morte est rangée « En cours »,
 * remonte en TÊTE (le tri est par échéance croissante), porte la pastille verte
 * « Ouvert » et annonce « ferme le 3 févr. » au futur, un 10 février — et
 * l'animateur relance 35 personnes qui ne peuvent plus voter, brûlant l'unique
 * relance autorisée.
 *
 * Le prédicat existait déjà pour la place PUBLIQUE (`cardIsOpen`,
 * src/lib/db/publicFeed.ts) : c'est la surface ORGANISATEUR qui l'ignorait.
 */
export function estEchue(event: Pick<EventRow, "status" | "closes_at">, now: number = Date.now()): boolean {
  return event.status === "open" && !!event.closes_at && now >= Date.parse(event.closes_at);
}

/** Pastille d'état. Aucun fond ne porte du texte sous 4,5:1 — voir l'en-tête. */
function StatusPill({ status, expired }: { status: EventRow["status"]; expired?: boolean }) {
  const t = useTranslations("Org");
  // ⚠️ LE LIBELLÉ EST RÉSOLU ICI, PAR UN APPEL LITTÉRAL, ET C'EST VOULU. Une clé
  // passée en variable est INVISIBLE au contrôle de parité : scripts/i18n-parity
  // ne reconnaît que les clés écrites en clair entre guillemets. La clé peut
  // alors manquer, ou vivre dans le mauvais namespace, sans que rien ne le dise
  // avant que l'écran n'affiche « Org.statusExpired » en toutes lettres — c'est
  // exactement ce qui vient d'arriver en posant cette clé-là.
  const skin = expired
    ? // Ni verte (elle n'accepte plus rien), ni « close » (personne n'a
      // dépouillé) : un troisième état, qui appelle un geste.
      { bg: YELLOW, fg: INK, label: t("statusExpired") }
    : status === "open"
      ? { bg: GREENTXT, fg: PAPER, label: t("statusOpen") }
      : status === "closed"
        ? { bg: INK, fg: PAPER, label: t("statusClosed") }
        : { bg: YELLOW, fg: INK, label: t("statusDraft") };
  return (
    <span
      style={{
        flex: "none",
        display: "inline-flex",
        alignItems: "center",
        background: skin.bg,
        color: skin.fg,
        border: `2px solid ${INK}`,
        borderRadius: 20,
        padding: "2px 10px",
        fontWeight: 800,
        fontSize: 11.5,
        whiteSpace: "nowrap",
      }}
    >
      {skin.label}
    </span>
  );
}

export default function ConsultationRow({ event, stats }: { event: EventRow; stats?: EventStats | null }) {
  const t = useTranslations("Org");
  // Le régime du bulletin porte les mêmes mots ici que sur la place publique :
  // un votant ne doit pas avoir à traduire d'un écran à l'autre.
  const tx = useTranslations("Explore");
  const locale = useLocale();

  // Année comprise : « ferme le 3 févr. » se lit dans deux sens à cheval sur un
  // changement d'année, et une échéance est justement ce qu'on ne veut pas
  // deviner. Le tableau de bord l'omettait, la vue de gestion l'écrivait.
  const fmt = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", year: "numeric" });

  const ratio = stats && ratioVisible(event.secret_ballot, stats.convened) ? stats : null;
  const echue = estEchue(event);

  return (
    <Link
      href={`/evenement/${event.id}`}
      style={{
        display: "block",
        background: CREAM,
        border: `2px solid ${INK}`,
        borderRadius: 14,
        padding: "12px 14px",
        textDecoration: "none",
        color: INK,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16, lineHeight: 1.25 }}>{event.title}</span>
        <StatusPill status={event.status} expired={echue} />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 7, fontSize: 12.5, color: SUBINK, fontWeight: 600 }}>
        {/* `audience_label` n'est écrit que par le parcours `/new?espace=` : une
            consultation née de l'éditeur le laisse à nul QUEL QUE SOIT le public
            convoqué. Écrire « tout le groupe » sur ce nul annoncerait 47 membres
            à une consultation qui n'en a convoqué 6 — on dit qu'on ne sait pas. */}
        <span>{event.audience_label ?? (stats ? t("convenedN", { count: stats.convened }) : t("audienceUnknown"))}</span>
        <span>
          <span aria-hidden>{event.secret_ballot ? "🔒" : "👁"}</span> {event.secret_ballot ? tx("sealed") : tx("named")}
        </span>
        {stats && <span>{t("questionCount", { count: stats.questions })}</span>}
        {/* Au PASSÉ dès que la date l'est : « ferme le 3 févr. » écrit un 10
            février se lit comme une urne encore ouverte. */}
        {event.closes_at && (
          <span style={{ color: echue ? INK : MUTED, fontWeight: echue ? 700 : 600 }}>
            {echue
              ? t("closedSinceShort", { date: fmt.format(new Date(event.closes_at)) })
              : t("closesOnShort", { date: fmt.format(new Date(event.closes_at)) })}
          </span>
        )}
        {/* L'émargement : le fait d'avoir participé, jamais ce qui a été répondu.
            Chargé UNE FOIS au montage — un compteur qui bouge en direct, corrélé
            à l'envoi d'un lien individuel, redeviendrait un canal d'attribution. */}
        {ratio && (
          <span style={{ color: ratio.signed > 0 ? GREENTXT : MUTED, fontWeight: 700 }}>
            {t("signedRatio", { signed: ratio.signed, convened: ratio.convened })}
          </span>
        )}
      </div>
    </Link>
  );
}
