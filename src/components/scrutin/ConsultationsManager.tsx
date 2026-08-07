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
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { createEvent, getSpace, listEvents, type EventRow, type Space } from "@/lib/db/events";
import { intlLocale } from "@/i18n/locales";
import { OrgShell } from "./SpacesHome";
import { CREAM, FONT_DISPLAY, GREEN, INK, MUTED, PAPER, REDTXT, SUBINK, YELLOW } from "./theme";

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
  // Le régime du bulletin porte les mêmes mots ici que sur la place publique :
  // un votant ne doit pas avoir à traduire d'un écran à l'autre.
  const tx = useTranslations("Explore");
  const locale = useLocale();
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

  const fmt = useMemo(
    () => new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", year: "numeric" }),
    [locale],
  );

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

  const parBloc = useMemo(
    () => ({
      open: filtres.filter((e) => e.status === "open").sort(parEcheance),
      draft: filtres.filter((e) => e.status === "draft").sort(parEcheance),
      closed: filtres.filter((e) => e.status === "closed").sort(parEcheance),
    }),
    [filtres],
  );

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

  const pastille = (statut: EventRow["status"]) => {
    const s =
      statut === "open"
        ? { bg: GREEN, fg: PAPER, key: "statusOpen" }
        : statut === "closed"
          ? { bg: INK, fg: PAPER, key: "statusClosed" }
          : { bg: YELLOW, fg: INK, key: "statusDraft" };
    return (
      <span style={{ flex: "none", display: "inline-flex", alignItems: "center", background: s.bg, color: s.fg, border: `2px solid ${INK}`, borderRadius: 20, padding: "2px 10px", fontWeight: 700, fontSize: 11.5, whiteSpace: "nowrap" }}>
        {t(s.key)}
      </span>
    );
  };

  const ligne = (e: EventRow) => (
    <Link
      key={e.id}
      href={`/evenement/${e.id}`}
      style={{ display: "block", background: PAPER, border: `2px solid ${INK}`, borderRadius: 20, padding: "13px 15px", textDecoration: "none", color: INK }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>{e.title}</span>
        {pastille(e.status)}
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 7, fontSize: 12.5, color: SUBINK, fontWeight: 600 }}>
        {/* `audience_label` n'est écrit que par le parcours `/new?espace=` : une
            consultation née de l'éditeur le laisse à nul QUEL QUE SOIT le public
            convoqué. Écrire « tout le cercle » sur ce nul annoncerait 47 membres
            à une consultation qui n'en a convoqué 6 — on dit qu'on ne sait pas. */}
        <span>{e.audience_label ?? t("audienceUnknown")}</span>
        <span>{e.secret_ballot ? `🔒 ${tx("sealed")}` : `👁 ${tx("named")}`}</span>
      </div>
      {e.closes_at && (
        <div style={{ marginTop: 5, fontSize: 12.5, color: MUTED }}>{fmt.format(new Date(e.closes_at))}</div>
      )}
    </Link>
  );

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
          {/* ---- facettes de public convoqué ---- */}
          <div role="group" aria-label={t("filterAudience")} style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 18 }}>
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
              <details open={ouverts.open} style={{ ...card, marginTop: 18, background: CREAM }}>
                {titreBloc(t("openTitle"), parBloc.open.length, "open")}
                <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 13 }}>
                  {parBloc.open.length ? parBloc.open.map(ligne) : <div style={{ color: MUTED, fontSize: 14 }}>{t("noOpenConsultation")}</div>}
                </div>
              </details>

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
