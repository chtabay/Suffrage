"use client";

// Vue de GESTION des consultations d'un cercle : toutes, triées PAR ÉTAT.
//
// Le tri par état est la raison d'être de cet écran. `listEvents` rend les
// consultations par date de création décroissante : une consultation OUVERTE,
// donc la seule qui attende quelque chose de quelqu'un, disparaît sous trois
// brouillons plus récents. On regroupe donc par état — en cours, brouillons,
// closes — et l'ordre à l'intérieur d'un bloc suit l'échéance, pas la naissance.
//
// Cet écran ne porte AUCUN geste destructeur. Supprimer une consultation détruit
// des bulletins scellés qui, par construction, n'ont jamais porté de nom : rien
// ne permettrait de les reconstituer, ni de prévenir ceux qui les ont déposés.
// Le renommage, lui, appartient à l'éditeur de la consultation.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import {
  createEvent,
  getSpace,
  getSpaceEventStats,
  listEvents,
  type EventRow,
  type EventStats,
  type Space,
} from "@/lib/db/events";
import { OrgShell } from "./SpacesHome";
import ConsultationRow, { estEchue } from "./ConsultationRow";
import { FONT_DISPLAY, INK, MUTED, PAPER, REDTXT, SUBINK } from "./theme";

const card = {
  background: PAPER,
  border: `2.5px solid ${INK}`,
  borderRadius: 18,
  padding: "20px 22px",
  boxShadow: `5px 5px 0 ${INK}`,
} as const;

/**
 * Valeur de facette désignant les consultations SANS public enregistré. Un
 * jeton réservé plutôt qu'un paramètre absent : « toutes » et « celles dont le
 * public est inconnu » sont deux demandes différentes, et l'URL doit les
 * distinguer.
 */
const SANS_PUBLIC = "__sans__";

/** Les trois blocs, dans l'ordre d'affichage. `etat=` de l'URL désigne l'un d'eux. */
type Bloc = "open" | "draft" | "closed";
const PARAM_ETAT: Record<string, Bloc> = { ouvert: "open", brouillon: "draft", close: "closed" };

/**
 * Ordre interne d'un bloc : ce qui expire en premier, en premier ; les
 * consultations sans échéance ferment la marche (elles n'ont aucune urgence à
 * revendiquer) ; à égalité, la plus récemment créée d'abord.
 */
function parEcheance(a: EventRow, b: EventRow): number {
  const ta = a.closes_at ? Date.parse(a.closes_at) : null;
  const tb = b.closes_at ? Date.parse(b.closes_at) : null;
  if (ta !== tb) {
    if (ta === null) return 1;
    if (tb === null) return -1;
    return ta - tb;
  }
  return Date.parse(b.created_at) - Date.parse(a.created_at);
}

export default function ConsultationsManager({ spaceId }: { spaceId: string }) {
  const t = useTranslations("Org");
  const router = useRouter();
  const { user, loading } = useAuth();

  const [space, setSpace] = useState<Space | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [writeErr, setWriteErr] = useState("");
  // "" = toutes ; SANS_PUBLIC = celles à label nul ; sinon un `audience_label`.
  const [publicFacet, setPublicFacet] = useState("");
  const [ouverts, setOuverts] = useState<Record<Bloc, boolean>>({ open: true, draft: true, closed: false });

  // `null` tant qu'on ne sait pas : ces agrégats sont un CONFORT. Leur absence
  // retire un chiffre d'une ligne, elle ne doit jamais faire lire « 0 question ».
  const [stats, setStats] = useState<Record<string, EventStats> | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setFailed(false);
    setReady(false);
    try {
      const [s, e] = await Promise.all([getSpace(spaceId), listEvents(spaceId)]);
      setSpace(s);
      setEvents(e);
    } catch {
      // Un échec de requête doit se DIRE. Un catch muet rendrait ici un écran
      // « aucune consultation » sur un cercle qui en compte quarante.
      setFailed(true);
    }
    setReady(true);
    // Après `setReady` : la liste est lisible sans ces chiffres, et l'attente
    // d'un appel de plus se paierait au temps d'ouverture.
    try {
      setStats(await getSpaceEventStats(spaceId));
    } catch {
      /* les lignes omettent leurs agrégats, la liste reste entière */
    }
  }, [user, spaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  // État initial des facettes lu dans l'URL au montage. `useSearchParams` est
  // écarté volontairement : il impose une frontière Suspense à la page serveur,
  // que celle-ci n'a pas — le build échouerait au prerender.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const pub = p.get("public");
    if (pub) setPublicFacet(pub);
    const bloc = PARAM_ETAT[p.get("etat") ?? ""];
    if (bloc) setOuverts((o) => ({ ...o, [bloc]: true }));
  }, []);

  // L'URL suit la facette par `replaceState` : `pushState` empilerait douze
  // états de filtre dans l'historique, et le bouton retour ne ramènerait plus au
  // tableau de bord du cercle mais au filtre précédent.
  const pickPublic = (v: string) => {
    setPublicFacet(v);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (v) url.searchParams.set("public", v);
    else url.searchParams.delete("public");
    // Le fragment est CONSERVÉ, comme sur l'écran des membres : un lien qui vise
    // une ancre ne doit pas perdre sa cible en changeant de facette.
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  };

  // Les publics proposés en facette sont ceux RÉELLEMENT écrits sur les
  // consultations de ce cercle : on ne propose pas un filtre qui ne trouverait
  // rien.
  const publics = useMemo(() => {
    const vus = new Set<string>();
    for (const e of events) if (e.audience_label) vus.add(e.audience_label);
    return [...vus].sort((a, b) => a.localeCompare(b));
  }, [events]);
  const aSansPublic = useMemo(() => events.some((e) => !e.audience_label), [events]);

  const filtres = useMemo(() => {
    if (!publicFacet) return events;
    if (publicFacet === SANS_PUBLIC) return events.filter((e) => !e.audience_label);
    return events.filter((e) => e.audience_label === publicFacet);
  }, [events, publicFacet]);

  // QUATRE BLOCS, PAS TROIS. « Ouvert » en base ne veut pas dire « ouvert » : rien
  // ne clôt une consultation à son échéance (ni cron, ni déclencheur), donc une
  // urne dont la date est passée reste `status = 'open'` pour toujours. Rangée
  // avec les vivantes, et remontée EN TÊTE par le tri par échéance croissante,
  // elle se lisait comme la plus urgente des consultations en cours — alors
  // qu'elle n'accepte plus un seul bulletin. Elle a son bloc, et il appelle un
  // geste : clore, pour que le résultat existe.
  const parBloc = useMemo(() => {
    const ouvertes = filtres.filter((e) => e.status === "open");
    return {
      open: ouvertes.filter((e) => !estEchue(e)).sort(parEcheance),
      expired: ouvertes.filter((e) => estEchue(e)).sort(parEcheance),
      draft: filtres.filter((e) => e.status === "draft").sort(parEcheance),
      closed: filtres.filter((e) => e.status === "closed").sort(parEcheance),
    };
  }, [filtres]);

  const onCreate = async () => {
    if (busy) return;
    setBusy(true);
    setWriteErr("");
    try {
      const ev = await createEvent(spaceId, { title: t("newSeriesDefault") });
      router.push(`/evenement/${ev.id}`);
    } catch {
      setWriteErr(t("writeError"));
      setBusy(false);
    }
  };

  // ---- les trois sorties avant rendu ----
  if (loading || (user && !ready))
    return (
      <OrgShell>
        <div style={{ ...card, color: MUTED }}>{t("loading")}</div>
      </OrgShell>
    );

  if (!user)
    return (
      <OrgShell>
        <div style={card}>{t("signInPrompt")}</div>
      </OrgShell>
    );

  if (failed)
    return (
      <OrgShell>
        <div style={card}>
          <div style={{ color: REDTXT, fontWeight: 700, fontSize: 15, lineHeight: 1.5 }}>{t("loadError")}</div>
          <button
            onClick={() => void load()}
            style={{ marginTop: 14, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14.5, cursor: "pointer", border: `2.5px solid ${INK}`, background: PAPER, color: INK, padding: "10px 16px", borderRadius: 11 }}
          >
            {t("retry")}
          </button>
        </div>
      </OrgShell>
    );

  if (!space)
    return (
      <OrgShell>
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.5 }}>{t("spaceNotFound")}</div>
          <Link href="/espaces" style={{ display: "inline-block", marginTop: 14, color: SUBINK, fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
            {t("back")}
          </Link>
        </div>
      </OrgShell>
    );

  // La LIGNE et sa PASTILLE vivent dans ConsultationRow, partagées avec le
  // tableau de bord. Elles étaient écrites deux fois, et les deux copies avaient
  // divergé : fonds, rayons et polices différents pour le même objet, la règle
  // des 5 convoqués recopiée en `>= 5` en dur, et surtout une pastille « Ouvert »
  // peinte ici en blanc sur GREEN — ~2,46:1, sous la barre AA.
  const ligne = (e: EventRow) => <ConsultationRow key={e.id} event={e} stats={stats?.[e.id]} />;

  // `details` est ici CONTRÔLÉ : on empêche la bascule native pour que
  // l'attribut `open` ne raconte jamais autre chose que l'état React.
  const titreBloc = (label: string, compte: number | null, bloc: Bloc) => (
    <summary
      onClick={(ev) => {
        ev.preventDefault();
        setOuverts((o) => ({ ...o, [bloc]: !o[bloc] }));
      }}
      style={{ cursor: "pointer", listStyle: "revert", fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 17 }}
    >
      {label}
      {compte != null && <span style={{ color: MUTED, fontWeight: 700, fontSize: 14 }}> · {compte}</span>}
    </summary>
  );

  const facette = (valeur: string, label: string) => (
    <button
      key={valeur || "all"}
      type="button"
      onClick={() => pickPublic(valeur)}
      aria-pressed={publicFacet === valeur}
      style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 13.5, cursor: "pointer", border: `2.5px solid ${INK}`, background: publicFacet === valeur ? INK : PAPER, color: publicFacet === valeur ? PAPER : INK, padding: "9px 14px", borderRadius: 11 }}
    >
      {label}
    </button>
  );

  return (
    <OrgShell>
      <Link href={`/espaces/${spaceId}`} style={{ color: SUBINK, fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
        {t("backToSpace")}
      </Link>
      <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {space.name}
      </div>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: "clamp(26px,5vw,36px)", letterSpacing: "-0.03em", margin: "6px 0 0" }}>
        {t("events")}
      </h1>
      <p style={{ fontSize: 14.5, color: SUBINK, lineHeight: 1.5, marginTop: 8, maxWidth: "62ch" }}>{t("consultationsAll")}</p>

      {writeErr && (
        <div role="alert" style={{ marginTop: 14, color: REDTXT, fontWeight: 700, fontSize: 13.5, lineHeight: 1.5 }}>
          {writeErr}
        </div>
      )}

      {events.length === 0 ? (
        <div style={{ ...card, marginTop: 18 }}>
          <div style={{ color: MUTED, fontSize: 14.5 }}>{t("noEvents")}</div>
          <button
            onClick={onCreate}
            disabled={busy}
            className="dc-bright"
            style={{ marginTop: 14, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14.5, cursor: busy ? "not-allowed" : "pointer", border: `2.5px solid ${INK}`, background: INK, color: PAPER, padding: "11px 18px", borderRadius: 11, opacity: busy ? 0.65 : 1 }}
          >
            {t("actionSequence")}
          </button>
        </div>
      ) : (
        <>
          {/* ---- LE LEVIER DE CE SUJET, SUR L'ÉCRAN DE CE SUJET ----
               Il n'était rendu que dans la branche « zéro consultation ». Dès la
               première, l'écran dédié aux consultations n'offrait plus AUCUN
               moyen d'en créer une : l'animateur qui vient constater que la
               question de la semaine est close doit remonter au tableau de bord
               pour en poser une autre. L'en-tête de ce fichier justifie
               l'absence des gestes DESTRUCTEURS, jamais celle de la création.
               Même couple, même ordre et même hiérarchie qu'au §2 du tableau de
               bord : on doit lire le même geste d'un écran à l'autre. */}
          <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
            <Link
              href={`/new?espace=${spaceId}`}
              className="dc-bright"
              style={{ textDecoration: "none", fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14.5, border: `2.5px solid ${INK}`, background: INK, color: PAPER, padding: "11px 18px", borderRadius: 11 }}
            >
              {t("actionAsk")}
            </Link>
            <button
              onClick={onCreate}
              disabled={busy}
              style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14.5, cursor: busy ? "not-allowed" : "pointer", border: `2.5px solid ${INK}`, background: PAPER, color: INK, padding: "11px 18px", borderRadius: 11, opacity: busy ? 0.65 : 1 }}
            >
              {t("actionSequence")}
            </button>
          </div>

          {/* ---- facettes de public convoqué ---- */}
          <div role="group" aria-label={t("filterAudience")} style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 14 }}>
            {facette("", t("filterAll"))}
            {publics.map((p) => facette(p, p))}
            {aSansPublic && facette(SANS_PUBLIC, t("audienceUnknown"))}
          </div>

          {filtres.length === 0 ? (
            <div style={{ ...card, marginTop: 18 }}>
              {/* Deux vides à ne pas confondre : un cercle sans consultation, et
                  un FILTRE sans résultat. Ce cas ne s'atteint que par une URL
                  portant un `public=` qu'aucune consultation ne porte (les
                  facettes, elles, sont bâties sur les labels réellement écrits).
                  Faute de clé propre, on RESTREINT le message en le coiffant de
                  la facette active, plutôt que d'affirmer « aucune
                  consultation » à un cercle qui en compte quarante. */}
              <div style={{ fontSize: 12.5, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {t("filterAudience")} · {publicFacet === SANS_PUBLIC ? t("audienceUnknown") : publicFacet}
              </div>
              <div style={{ color: MUTED, fontSize: 14.5, marginTop: 6 }}>{t("noEvents")}</div>
              <button
                onClick={() => pickPublic("")}
                style={{ marginTop: 14, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14.5, cursor: "pointer", border: `2.5px solid ${INK}`, background: PAPER, color: INK, padding: "10px 17px", borderRadius: 11 }}
              >
                {t("clearFilters")}
              </button>
            </div>
          ) : (
            <>
              {/* ---- en cours ---- toujours rendu, même vide : « rien n'attend
                   personne » est une réponse, et c'est la première qu'on vient
                   chercher ici. */}
              {/* Les trois blocs ont désormais le MÊME fond, blanc : les lignes
                  qu'ils portent sont crème, et un bloc crème rendait la ligne
                  crème invisible dans son propre cadre — c'était la raison pour
                  laquelle la ligne de cette vue avait dû devenir blanche, donc
                  diverger de celle du tableau de bord. L'accent d'« En cours »
                  tient à sa place (premier) et à son état (déplié par défaut). */}
              <details open={ouverts.open} style={{ ...card, marginTop: 18 }}>
                {titreBloc(t("openTitle"), parBloc.open.length, "open")}
                <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 13 }}>
                  {parBloc.open.length ? parBloc.open.map(ligne) : <div style={{ color: MUTED, fontSize: 14 }}>{t("noOpenConsultation")}</div>}
                </div>
              </details>

              {/* ---- ÉCHUES ---- juste sous « En cours », et jamais masquable :
                   ce sont les seules lignes de l'écran qui réclament un geste
                   dont personne d'autre ne se chargera. Rien ne clôt une
                   consultation à son échéance, donc sans ce bloc elles restaient
                   « ouvertes » indéfiniment, et leur résultat scellé — invisible
                   tant qu'on n'a pas cliqué « Clore » — n'existait jamais. */}
              {parBloc.expired.length > 0 && (
                <details open style={{ ...card, marginTop: 16, borderColor: REDTXT, boxShadow: `5px 5px 0 ${REDTXT}` }}>
                  {titreBloc(t("expiredCount", { count: parBloc.expired.length }), null, "open")}
                  <div style={{ fontSize: 12.5, color: SUBINK, marginTop: 6, lineHeight: 1.45 }}>{t("expiredHint")}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 13 }}>{parBloc.expired.map(ligne)}</div>
                </details>
              )}

              {/* ---- brouillons et closes : rendus seulement s'ils existent. Un
                   bloc « 0 brouillon » n'apprend rien et repousse le reste. ---- */}
              {parBloc.draft.length > 0 && (
                <details open={ouverts.draft} style={{ ...card, marginTop: 16 }}>
                  {titreBloc(t("draftsCount", { count: parBloc.draft.length }), null, "draft")}
                  <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 13 }}>{parBloc.draft.map(ligne)}</div>
                </details>
              )}

              {parBloc.closed.length > 0 && (
                <details open={ouverts.closed} style={{ ...card, marginTop: 16 }}>
                  {titreBloc(t("closedCount", { count: parBloc.closed.length }), null, "closed")}
                  <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 13 }}>{parBloc.closed.map(ligne)}</div>
                </details>
              )}
            </>
          )}
        </>
      )}
    </OrgShell>
  );
}
