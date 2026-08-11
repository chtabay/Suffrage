"use client";

// TABLEAU DE BORD D'UN CERCLE — /espaces/<id>.
//
// LE PARTI, posé par Guillaume : cette page GOUVERNE, elle n'ÉNUMÈRE pas. Elle
// montre l'ÉTAT du cercle et les LEVIERS qui le changent ; les listes s'ouvrent
// à la demande, dans des vues faites pour elles (/membres, /consultations).
//
// LA FRONTIÈRE, pour que « grande liste » ne reste pas une impression. Un
// ensemble se rend en place si et seulement si les TROIS conditions tiennent :
//   (a) le CODE impose un plafond — un slice littéral, pas « en général il y en
//       a peu » ;
//   (b) chaque ligne rendue porte au moins un chiffre d'état ou un levier —
//       jamais un simple nom ;
//   (c) une règle de tri explicite décide qui tombe hors du plafond, et
//       l'excédent est résumé par un compteur qui est un lien.
// Échouer à l'une des trois = énumération = la chose sort vers une route.
// D'où : les membres sortent (sans borne), les consultations CLOSES sortent
// (sans borne, et aucune décision ne leur est attachée), les consultations EN
// COURS restent (plafond 3, quatre chiffres par ligne, tri par échéance), les
// segments restent EN LECTURE SEULE (l'effectif est un état, les gestes partent).
//
// Corollaire de forme : <details> est réservé aux RÉGLAGES — un ensemble de
// champs fixe. Il ne cache jamais une collection qui croît : il n'a ni
// recherche, ni borne, ni URL, et il monte tout le DOM quand même. Une liste
// dépliée dans le tableau de bord EST une liste dans le tableau de bord.
//
// ET LE COROLLAIRE QUI MANQUAIT : ne pas énumérer à l'écran ne sert à rien si
// l'on énumère quand même au RÉSEAU. La page tirait tout le roster et toute la
// table de rattachement pour en sortir huit entiers. Elle appelle désormais
// `getSpaceOverview`, qui les compte en base — voir
// supabase/migrations/20260810-tableau-de-bord-agregats.sql.
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import {
  updateSpace,
  isChatUrl,
  createEvent,
  deleteSpace,
  getSpace,
  getSpaceEventStats,
  getSpaceJoinPending,
  getSpaceOverview,
  listEvents,
  type EventRow,
  type EventStats,
  type JoinPending,
  type Space,
  type SpaceOverview,
} from "@/lib/db/events";
import { OrgShell } from "./SpacesHome";
import ConsultationRow, { SEALED_MIN } from "./ConsultationRow";
import { APP_URL } from "@/lib/voting/aiPrompt";
import { intlLocale } from "@/i18n/locales";
import { CORAL, CREAM, FONT_BODY, FONT_DISPLAY, GREENTXT, INK, MUTED, REDTXT, SUBINK, YELLOW } from "./theme";

const card = {
  background: "#fff",
  border: `2.5px solid ${INK}`,
  borderRadius: 18,
  padding: "20px 22px",
  boxShadow: `5px 5px 0 ${INK}`,
} as const;

/** Consultations en cours rendues en place. Plafond LITTÉRAL — voir la règle (a). */
const OPEN_SHOWN = 3;
/** Puces de segment rendues en place. Idem. */
const SEG_SHOWN = 6;

/**
 * Où s'affiche un refus d'écriture.
 *
 * IL Y AVAIT UN SEUL `circleErr`, RENDU DANS LA CARTE « ADHÉSIONS ». Or il est
 * écrit par le renommage du titre (tout en haut), par l'ouverture aux adhésions
 * depuis la carte d'action, par la création de consultation et par la
 * suppression du groupe. Renommer le groupe, échouer, et voir le message
 * apparaître trois cartes plus bas — souvent hors écran — c'est croire que
 * c'est enregistré. Un refus doit se lire au contact du geste qui l'a produit.
 */
type Zone = "name" | "actions" | "circle" | "danger";

export default function SpaceDashboard({ spaceId }: { spaceId: string }) {
  const t = useTranslations("Org");
  const locale = useLocale();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [space, setSpace] = useState<Space | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  // Les huit entiers de la page (membres + effectifs de segment), servis par la
  // base. `null` = on ne sait pas encore, ou on n'a pas pu savoir.
  const [ov, setOv] = useState<SpaceOverview | null>(null);

  // DEUX DRAPEAUX, PAS UN. `load()` fait deux vagues ; un seul indicateur ferait
  // rendre « 0 segment » sur un cercle qui en a douze. Tant que la page portait
  // la liste des membres, ce mensonge était démenti par les puces de chaque
  // ligne — une fois les listes parties, plus rien ne le dément, et l'animateur
  // convoquerait « tout le cercle » faute de cible visible.
  const [ready, setReady] = useState(false);
  const [coreErr, setCoreErr] = useState(false);
  const [ovErr, setOvErr] = useState(false);

  // TROISIÈME VAGUE, et troisième drapeau. Les agrégats de consultation sont un
  // CONFORT : leur absence retire un chiffre d'une ligne, elle ne doit ni vider
  // la page ni faire croire à « 0 question ». D'où `null` tant qu'on ne sait
  // pas, et un rendu qui omet plutôt qu'il n'invente.
  const [evStats, setEvStats] = useState<Record<string, EventStats> | null>(null);
  const [pending, setPending] = useState<JoinPending | null>(null);

  const [name, setName] = useState("");
  const [pitch, setPitch] = useState("");
  const [paceInput, setPaceInput] = useState("");
  const [chatUrl, setChatUrl] = useState("");
  const [err, setErr] = useState<{ at: Zone; msg: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);
  const [delText, setDelText] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setCoreErr(false);
    setOvErr(false);
    try {
      const [s, e] = await Promise.all([getSpace(spaceId), listEvents(spaceId)]);
      setSpace(s);
      setEvents(e);
      setName(s?.name ?? "");
      setPitch(s?.pitch ?? "");
      setPaceInput(s?.solicit_per_day == null ? "" : String(s.solicit_per_day));
      setChatUrl(s?.chat_url ?? "");
    } catch {
      setCoreErr(true);
      setReady(true);
      return;
    }
    try {
      const o = await getSpaceOverview(spaceId);
      // UN NULL N'EST PAS « ZÉRO MEMBRE », C'EST UN REFUS. La RPC est gardée par
      // `owner_id = auth.uid()` et ne lève pas d'erreur quand la ligne ne sort
      // pas : elle rend NULL. Le prendre pour une donnée ferait afficher « 0
      // membre » sur un groupe qui en compte 200 — et le §7 ci-dessous, qui
      // refuse justement de montrer l'écran de premier jour tant que les
      // agrégats ne sont pas reçus, s'ouvrirait sur un groupe plein.
      if (!o) throw new Error("overview_refused");
      setOv(o);
    } catch {
      setOvErr(true);
    }
    setReady(true);
    // Après `setReady` : la page est utilisable sans ces deux chiffres, et
    // attendre deux appels de plus pour l'afficher serait payer un confort au
    // prix du temps d'ouverture.
    try {
      const [st, pd] = await Promise.all([getSpaceEventStats(spaceId), getSpaceJoinPending(spaceId)]);
      setEvStats(st);
      setPending(pd);
    } catch {
      /* la page reste entière, les lignes omettent simplement leurs agrégats */
    }
  }, [user, spaceId]);
  useEffect(() => {
    void load();
  }, [load]);

  // ------------------------------------------------------------- les chiffres

  const membersOf = ov?.members ?? null;
  const segments = useMemo(() => ov?.segments ?? [], [ov]);

  const segSorted = useMemo(() => {
    // Les segments trop petits d'abord : ce sont les seuls qui exigent une
    // décision — sous 5, une consultation scellée sera refusée.
    return [...segments].sort((a, b) => {
      const ua = a.count < SEALED_MIN ? 0 : 1;
      const ub = b.count < SEALED_MIN ? 0 : 1;
      if (ua !== ub) return ua - ub;
      if (a.rank != null && b.rank != null && a.rank !== b.rank) return a.rank - b.rank;
      return a.position - b.position;
    });
  }, [segments]);
  const segBelow = segSorted.filter((g) => g.count < SEALED_MIN).length;

  const byState = useMemo(() => {
    const open = events.filter((e) => e.status === "open");
    // Tri par ÉCHÉANCE : la ligne qui tombe hors du plafond est toujours la
    // moins urgente. Les consultations sans échéance passent en dernier.
    open.sort((a, b) => {
      if (a.closes_at && b.closes_at) return Date.parse(a.closes_at) - Date.parse(b.closes_at);
      if (a.closes_at) return -1;
      if (b.closes_at) return 1;
      return Date.parse(a.created_at) - Date.parse(b.created_at);
    });
    const closed = events.filter((e) => e.status === "closed");
    // ⚠️ NI UNE CRÉATION, NI UNE DATE FUTURE. Aucun chemin n'écrit `closes_at`
    // à la clôture : l'éditeur ne change que `status`. Le repli sur `created_at`
    // datait donc l'archive du jour de NAISSANCE (« la dernière le 3 août »
    // alors que la décision est d'aujourd'hui), et une consultation close en
    // avance gardait son échéance prévue — le tableau de bord imprimait une date
    // FUTURE présentée comme une archive. On ne date que sur une échéance
    // révolue, et sinon on OMET : la règle de cette page est d'omettre plutôt
    // que d'inventer.
    const lastClosed = closed
      .map((e) => e.closes_at)
      .filter((d): d is string => !!d && Date.parse(d) <= Date.now())
      .sort()
      .pop();
    return { open, drafts: events.filter((e) => e.status === "draft").length, closed: closed.length, lastClosed };
  }, [events]);

  // Sollicitations du jour : on reprend LITTÉRALEMENT la définition de la garde
  // en base — `status <> 'draft' and created_at >= date_trunc('day', now())`.
  // Le début de jour est donc en UTC : le calculer en heure locale produirait
  // jusqu'à une journée d'écart aux bords, donc un écran qui annonce « 1/2 »
  // pendant que la base refuse.
  const todayCount = useMemo(() => {
    const n = new Date();
    const dayStart = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
    return events.filter((e) => e.status !== "draft" && Date.parse(e.created_at) >= dayStart).length;
  }, [events]);
  const cap = space?.solicit_per_day ?? null;
  const capped = cap != null && todayCount >= cap;
  /**
   * « Poser une question » ne peut pas aboutir. DEUX causes, un seul état visuel.
   *
   * Le plafond du jour est temporaire — il se lève à minuit. L'absence
   * d'adhésions ouvertes est l'obstacle DUR : `circle_audience_guard` refuse
   * alors `not_a_circle`, et comme l'adressage est tenté APRÈS la création du
   * scrutin, on obtient un scrutin orphelin, jamais rattaché au groupe, qu'aucun
   * écran ne permet de rattraper. C'est donc l'obstacle le plus lourd qui, seul,
   * laissait le bouton vivant.
   */
  const bloque = capped || !(space?.join_open ?? false);

  const fmt = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short" });

  /** Âge de la plus ancienne demande, en heures pleines. La fenêtre est de 72 h. */
  const pendingHours =
    pending?.oldest_at != null ? Math.floor((Date.now() - Date.parse(pending.oldest_at)) / 3_600_000) : null;

  // ------------------------------------------------------------- les écritures

  const tick = (key: string) => {
    setSaved(key);
    setTimeout(() => setSaved((k) => (k === key ? null : k)), 1600);
  };

  const saveCircle = async (patch: Parameters<typeof updateSpace>[1], at: Zone, key?: string) => {
    if (!space) return;
    // ⚠️ ON N'EFFACE QUE L'ERREUR DE SA PROPRE ZONE. Un `setErr(null)` global
    // défaisait la règle que ce fichier pose plus haut : le renommage échoue, la
    // ligne rouge s'affiche sous le titre, puis l'animateur corrige le pitch —
    // et ce second geste, réussi, EFFAÇAIT le refus du premier. L'écran montrait
    // alors le nouveau nom sans aucune erreur, état indiscernable d'un succès,
    // pendant que les convocations continuaient de partir sous l'ancien nom.
    setErr((e) => (e?.at === at ? null : e));
    try {
      await updateSpace(space.id, patch);
      setSpace({ ...space, ...patch } as typeof space);
      if (key) tick(key);
    } catch (e) {
      // Le refus vient de la BASE : un cercle dont un membre est sans email
      // aurait un membre injoignable, jamais convoqué et sans moyen de partir.
      // On présente ce refus tel quel, on ne l'avale pas — et on le pose dans la
      // zone d'où le geste est parti.
      const msg = String((e as { message?: string })?.message ?? "");
      // L'ÉCRAN NE DOIT JAMAIS AFFICHER UNE VALEUR QUE LA BASE A REFUSÉE. Le
      // champ de titre garde ce qu'on a tapé (`saveName` ne le restaure qu'à
      // vide ou à l'identique) : sur un refus, il faut le ramener au nom réel.
      if (patch.name !== undefined) setName(space.name);
      setErr({ at, msg: msg.includes("circle_members_without_email") ? t("circleNeedEmails") : t("circleSaveError") });
    }
  };

  const saveName = () => {
    const v = name.trim().slice(0, 120);
    if (!v || v === space?.name) {
      setName(space?.name ?? "");
      return;
    }
    void saveCircle({ name: v }, "name", "name");
  };

  const saveChatUrl = () => {
    const raw = chatUrl.trim();
    if (raw && !isChatUrl(raw)) {
      setErr({ at: "circle", msg: t("chatUrlInvalid") });
      return;
    }
    void saveCircle({ chat_url: raw || null }, "circle", "chat");
  };

  const savePace = () => {
    const raw = paceInput.trim();
    // Vide = aucun engagement (NULL en base) : la page d'adhésion n'affiche
    // alors aucun chiffre, plutôt qu'une promesse que ce cercle n'a pas faite.
    const n = raw === "" ? null : Math.min(50, Math.max(1, parseInt(raw, 10) || 1));
    setPaceInput(n == null ? "" : String(n));
    void saveCircle({ solicit_per_day: n }, "circle", "pace");
  };

  const copyJoin = async () => {
    const url = `${APP_URL}/cercle/${space?.join_token ?? ""}`;
    try {
      // On ATTEND la promesse, et l'absence d'API est un échec : le passage au
      // vert était inconditionnel, si bien qu'hors contexte sécurisé l'animateur
      // collait autre chose dans WhatsApp et ne l'apprenait qu'à l'autre bout.
      if (!navigator.clipboard) throw new Error("no clipboard");
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setErr({ at: "circle", msg: t("copyFailed") });
    }
  };

  const onCreateEvent = async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const ev = await createEvent(spaceId, { title: t("newSeriesDefault") });
      router.push(`/evenement/${ev.id}`);
    } catch {
      setErr({ at: "actions", msg: t("writeError") });
      setBusy(false);
    }
  };

  const delMatches = delText.trim() === (space?.name ?? "").trim() && delText.trim().length > 0;
  const onDeleteSpace = async () => {
    if (!delMatches) return;
    try {
      await deleteSpace(spaceId);
      router.push("/espaces");
    } catch {
      // Sans ce catch, l'animateur retape le nom exact, le bouton ne fait rien,
      // et il en conclut que Placet ne sait pas supprimer.
      setErr({ at: "danger", msg: t("writeError") });
    }
  };

  // --------------------------------------------------------------- le rendu

  const shell = (children: React.ReactNode) => <OrgShell>{children}</OrgShell>;

  /** Le refus, là où le geste a eu lieu — et nulle part ailleurs. */
  const errLine = (at: Zone) =>
    err?.at === at ? (
      <div role="alert" style={{ marginTop: 10, color: REDTXT, fontWeight: 700, fontSize: 13, lineHeight: 1.45 }}>
        {err.msg}
      </div>
    ) : null;

  if (loading || !ready) return shell(<div style={{ ...card, color: MUTED }}>{t("loading")}</div>);
  if (!user) return shell(<div style={card}>{t("signInPrompt")}</div>);
  if (coreErr)
    return shell(
      <div style={card}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>{t("loadError")}</div>
        <button onClick={() => void load()} style={{ marginTop: 14, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14, cursor: "pointer", border: `2.5px solid ${INK}`, background: "#fff", color: INK, padding: "10px 16px", borderRadius: 11 }}>
          {t("retry")}
        </button>
      </div>,
    );
  if (!space)
    return shell(
      <div style={card}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>{t("spaceNotFound")}</div>
        <Link href="/espaces" style={{ display: "inline-block", marginTop: 12, color: SUBINK, fontWeight: 700, fontSize: 14 }}>
          {t("back")}
        </Link>
      </div>,
    );

  const back = (
    <Link href="/espaces" style={{ color: SUBINK, fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
      {t("back")}
    </Link>
  );

  // ---- §7 — PREMIER JOUR. Rien à gouverner : une grille de zéros n'apprend
  // rien et fait croire à une panne. Condition stricte, et seulement une fois
  // les agrégats REÇUS — « 0 membre · 0 consultation » est exactement ce que
  // produit un chargement en échec.
  if (membersOf && membersOf.total === 0 && !events.length) {
    const step = (n: number, text: string, href?: string, cta?: string) => (
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginTop: 14 }}>
        <span style={{ flex: "none", width: 26, height: 26, borderRadius: "50%", background: INK, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13.5 }}>{n}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, lineHeight: 1.5 }}>{text}</div>
          {href && cta && (
            <Link href={href} className="dc-bright" style={{ display: "inline-block", marginTop: 9, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14, textDecoration: "none", border: `2.5px solid ${INK}`, background: n === 1 ? YELLOW : "#fff", color: INK, padding: "9px 15px", borderRadius: 11 }}>
              {cta} →
            </Link>
          )}
        </div>
      </div>
    );
    return shell(
      <>
        {back}
        <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: "clamp(26px,5vw,36px)", letterSpacing: "-0.03em", margin: "10px 0 0" }}>{space.name}</h1>
        <div style={{ ...card, marginTop: 18 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19 }}>{t("startTitle")}</div>
          {/* Le bloc de collage vit dans /membres, pas ici : deux copies du même
              analyseur de presse-papier finiraient par diverger. Sur un cercle
              vide, cette vue s'ouvre justement avec son bloc d'ajout déplié. */}
          {step(1, t("startStep1"), `/espaces/${spaceId}/membres`, t("manageMembers"))}
          {step(2, t("startStep2"))}
          {step(3, t("startStep3"), `/new?espace=${spaceId}`, t("actionAsk"))}
        </div>
      </>,
    );
  }

  const dot = <span style={{ color: MUTED }}> · </span>;
  const statLink = (href: string, label: string, danger = false) => (
    <Link href={href} style={{ color: danger ? REDTXT : SUBINK, fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3 }}>
      {label}
    </Link>
  );

  return shell(
    <>
      {/* ---- §1 — le nom, et quatre chiffres qui sont quatre portes ---- */}
      {back}
      {/* UN <h1>, ET UNE AFFORDANCE. Le tableau de bord PEUPLÉ n'avait aucun
          titre — l'état premier jour, si — et ses cinq en-têtes de section
          étaient des <div> : qui parcourt la page par titres (touche H, rotor)
          n'y trouvait rien, sur le seul des quatre écrans dans ce cas. Un
          <input> est du contenu phrasé, il tient donc dans un <h1>.
          Et le champ ne ressemblait à rien : ni bordure, ni fond, ni contour au
          focus. L'affordance existe déjà dans le dépôt, sur le champ jumeau de
          l'éditeur de consultation — on la reprend telle quelle. */}
      <h1 style={{ margin: "10px 0 0" }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          aria-label={t("renameSpaceAria")}
          style={{ display: "block", width: "100%", margin: 0, padding: "0 0 3px", border: "none", borderBottom: `2px dashed ${INK}`, background: "none", fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: "clamp(26px,5vw,36px)", letterSpacing: "-0.03em", color: INK }}
        />
      </h1>
      <div style={{ fontSize: 14.5, color: SUBINK, marginTop: 6, lineHeight: 1.6 }} aria-live="polite">
        {/* Le lien vers /membres existe même sans les chiffres : c'est la porte,
            elle ne doit pas disparaître avec le compteur qui l'orne. */}
        {statLink(`/espaces/${spaceId}/membres`, membersOf ? t("memberCount", { count: membersOf.total }) : t("members"))}
        {membersOf && membersOf.self_joined > 0 && (<>{dot}{t("statSelfJoined", { count: membersOf.self_joined })}</>)}
        {membersOf && membersOf.no_email > 0 && (<>{dot}{statLink(`/espaces/${spaceId}/membres?filtre=sans-adresse`, t("statNoEmail", { count: membersOf.no_email }), true)}</>)}
        {membersOf && segments.length > 0 && membersOf.no_segment > 0 && (
          <>{dot}{statLink(`/espaces/${spaceId}/membres?filtre=sans-segment`, t("statNoSegment", { count: membersOf.no_segment }), true)}</>
        )}
        {saved === "name" && <span style={{ color: GREENTXT, fontWeight: 800, marginLeft: 8 }}>✓ {t("savedTick")}</span>}
      </div>
      {/* Le refus de renommage se lit SOUS le titre qu'on vient de taper. */}
      {errLine("name")}

      {/* ---- §2 — agir. Le compteur du jour et l'ouverture aux adhésions sont
           ICI, là où leur absence fait échouer l'action, et non trois cartes
           plus bas. */}
      <div style={{ ...card, marginTop: 18, borderColor: CORAL, boxShadow: `5px 5px 0 ${CORAL}` }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19, margin: 0 }}>{t("actionsTitle")}</h2>
          {cap != null && (
            <div style={{ fontSize: 13, fontWeight: 700, color: capped ? REDTXT : MUTED }}>
              {t("solicitToday", { used: todayCount, cap })}
            </div>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4, lineHeight: 1.45 }}>{t("actionsHint")}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          {/* Seul « poser une question » est bridé par le plafond : un brouillon
              ne le consomme pas (la garde compte les événements non-brouillons),
              et le désactiver supprimerait le seul moyen de préparer demain. */}
          {/* DEUX OBSTACLES, UN SEUL TRAITEMENT. Le plafond du jour éteignait ce
              lien ; l'absence d'adhésions ouvertes, non — alors que c'est
              l'obstacle DUR et permanent, et l'état PAR DÉFAUT d'un groupe. Le
              bouton le plus contrasté de la page menait donc à un scrutin créé
              puis REFUSÉ à l'adressage (`not_a_circle`) : il existe, mais
              détaché, il ne figurera jamais au §3, et rien ne permet de le
              rattraper. Le plafond, lui, se lève tout seul à minuit. */}
          <Link
            href={bloque ? `/espaces/${spaceId}` : `/new?espace=${spaceId}`}
            aria-disabled={bloque}
            aria-describedby={!space.join_open ? "obstacle-adhesions" : undefined}
            className={bloque ? undefined : "dc-bright"}
            onClick={(e) => bloque && e.preventDefault()}
            style={{ textDecoration: "none", fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14.5, border: `2.5px solid ${INK}`, background: bloque ? "#EFE8D6" : INK, color: bloque ? MUTED : "#fff", padding: "11px 18px", borderRadius: 11, cursor: bloque ? "not-allowed" : "pointer", opacity: bloque ? 0.7 : 1 }}
          >
            {t("actionAsk")}
          </Link>
          <button onClick={onCreateEvent} disabled={busy} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14.5, cursor: "pointer", border: `2.5px solid ${INK}`, background: "#fff", color: INK, padding: "11px 18px", borderRadius: 11 }}>
            {t("actionSequence")}
          </button>
        </div>

        {/* L'OBSTACLE, remonté à côté de l'action qu'il bloque. Sans lui, le
            bouton le plus contrasté de la page échoue EN BASE sur tout cercle
            fermé aux adhésions — c'est-à-dire par défaut — et le refus n'arrive
            qu'après composition de la question, sous un libellé de panne.
            C'ÉTAIT UNE CASE À COCHER `checked={false}` EN DUR, dont le libellé
            énonçait un FAIT (« ce groupe doit accepter les adhésions ») et non
            une action : rien ne disait que la cocher ouvrait quoi que ce soit.
            C'est désormais un bouton, qui porte le NOM du réglage qu'il change
            — le même mot que la case de la carte « Adhésions » plus bas, pour
            qu'on lise un raccourci et non un second réglage. */}
        {!space.join_open && (
          <div id="obstacle-adhesions" style={{ marginTop: 14, border: `2px solid ${REDTXT}`, borderRadius: 12, background: CREAM, padding: "11px 13px" }}>
            <div style={{ fontSize: 13.5, lineHeight: 1.5, color: SUBINK }}>⚠ {t("needsCircleForAudience")}</div>
            <button
              onClick={() => void saveCircle({ join_open: true }, "actions")}
              style={{ marginTop: 10, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 13.5, cursor: "pointer", border: `2.5px solid ${INK}`, background: "#fff", color: INK, padding: "9px 15px", borderRadius: 10 }}
            >
              {t("circleOpen")}
            </button>
          </div>
        )}

        {errLine("actions")}
      </div>

      {/* ---- §3 — les consultations EN COURS. Trois lignes au plus, quatre
           chiffres chacune : c'est le seul endroit de l'application où l'on voit
           qu'une urne se ferme demain. Le reste est derrière un compteur-lien.
           La LIGNE elle-même vit dans ConsultationRow, partagée avec la vue de
           gestion : c'était le même objet rendu de deux façons. */}
      <div style={{ ...card, marginTop: 16 }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19, margin: 0 }}>{t("openTitle")}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {!byState.open.length && <div style={{ color: MUTED, fontSize: 14 }}>{t("noOpenConsultation")}</div>}
          {byState.open.slice(0, OPEN_SHOWN).map((e) => (
            <ConsultationRow key={e.id} event={e} stats={evStats?.[e.id]} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 12, fontSize: 13, fontWeight: 700 }}>
          {byState.open.length > OPEN_SHOWN && (
            // CORAL sur blanc = 4,21:1, sous la barre AA pour 13 px gras — et
            // `theme.ts` ne valide CORAL qu'en APLAT. Or c'est le seul chemin
            // vers les consultations qui tombent hors du plafond de 3.
            <Link href={`/espaces/${spaceId}/consultations?etat=ouvert`} style={{ color: REDTXT, textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t("moreOpen", { count: byState.open.length - OPEN_SHOWN })} →
            </Link>
          )}
          {byState.drafts > 0 && (
            <Link href={`/espaces/${spaceId}/consultations?etat=brouillon`} style={{ color: SUBINK, textDecoration: "none" }}>
              {t("draftsCount", { count: byState.drafts })} →
            </Link>
          )}
          {byState.closed > 0 && (
            <Link href={`/espaces/${spaceId}/consultations?etat=close`} style={{ color: SUBINK, textDecoration: "none" }}>
              {t("closedCount", { count: byState.closed })}
              {byState.lastClosed ? ` · ${t("lastClosedOn", { date: fmt.format(new Date(byState.lastClosed)) })}` : ""} →
            </Link>
          )}
        </div>
      </div>

      {/* ---- §4 — membres : des chiffres, des segments EN LECTURE, pas une
           seule ligne. Les segments sortent de la condition « adhésions
           ouvertes » : segmenter sert à CIBLER, ouvrir sert à RECRUTER, et rien
           en base ne les lie. ---- */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19, margin: 0 }}>{t("members")}</h2>
          {membersOf && <div style={{ color: SUBINK, fontWeight: 700, fontSize: 14 }}>{t("memberCount", { count: membersOf.total })}</div>}
        </div>

        {ovErr ? (
          <div style={{ marginTop: 10, fontSize: 13.5, color: REDTXT, fontWeight: 700 }}>
            {t("segmentsUnavailable")} —{" "}
            <button onClick={() => void load()} style={{ border: "none", background: "none", color: REDTXT, textDecoration: "underline", cursor: "pointer", font: "inherit" }}>
              {t("retry")}
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12.5, color: MUTED, marginTop: 6 }}>
              {t("segmentCount", { count: segments.length })}
              {segBelow > 0 && <span style={{ color: REDTXT, fontWeight: 700 }}> · {t("segmentsBelowMin", { count: segBelow })}</span>}
            </div>
            {segments.length > 0 && (
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}>
                {segSorted.slice(0, SEG_SHOWN).map((g) => {
                  const low = g.count < SEALED_MIN;
                  return (
                    // Une puce est un LIEN pré-filtré, jamais un geste : sans ce
                    // filtre, affecter un segment passerait de un clic à trois.
                    <Link
                      key={g.id}
                      href={`/espaces/${spaceId}/membres?segment=${g.id}`}
                      title={low ? t("segmentBelowMinTitle") : undefined}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, border: `2px solid ${low ? REDTXT : INK}`, borderRadius: 9, padding: "6px 10px", fontSize: 13, fontWeight: 700, textDecoration: "none", color: INK, minHeight: 26 }}
                    >
                      {g.rank != null && <span style={{ color: MUTED, fontSize: 11.5 }}>{g.rank}</span>}
                      {g.name}
                      <span style={{ color: low ? REDTXT : SUBINK, fontWeight: 800 }}>· {g.count}{low ? " ⚠" : ""}</span>
                    </Link>
                  );
                })}
                {segments.length > SEG_SHOWN && (
                  <Link href={`/espaces/${spaceId}/membres#segments`} style={{ display: "inline-flex", alignItems: "center", padding: "6px 10px", fontSize: 13, fontWeight: 700, color: SUBINK, textDecoration: "underline", textUnderlineOffset: 3 }}>
                    {t("moreSegments", { count: segments.length - SEG_SHOWN })}
                  </Link>
                )}
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: 14 }}>
          <Link href={`/espaces/${spaceId}/membres`} style={{ display: "inline-block", fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14, textDecoration: "none", border: `2.5px solid ${INK}`, background: "#fff", color: INK, padding: "10px 16px", borderRadius: 11 }}>
            {t("manageMembers")} →
          </Link>
        </div>
      </div>

      {/* ---- §5 — adhésions : un état, des réglages repliés. Ni segments, ni
           liste. Le <details> est ici à sa place : un ensemble de champs fixe. */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19, margin: 0 }}>{t("circle")}</h2>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13.5, fontWeight: 700, color: SUBINK }}>
            <input type="checkbox" checked={space.join_open} onChange={(e) => saveCircle({ join_open: e.target.checked }, "circle")} style={{ width: 17, height: 17, accentColor: INK }} />
            {t("circleOpen")}
          </label>
        </div>
        <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4, lineHeight: 1.5 }}>{t("circleSubtitle")}</div>

        {/* Les demandes en attente : un compte ET UN ÂGE. Le compte seul ne
            discrimine pas trois clics d'il y a deux minutes — rien à faire — de
            trois confirmations perdues à 70 h d'une péremption qui tombe à 72.
            Ni nom ni adresse : la file contient des adresses NON confirmées, et
            en montrer une rouvrirait l'oracle d'appartenance. */}
        {space.join_open && pending && pending.count > 0 && (
          <div style={{ marginTop: 12, fontSize: 13.5, fontWeight: 700, color: pendingHours != null && pendingHours >= 48 ? REDTXT : SUBINK }}>
            {pendingHours != null && pendingHours >= 48 ? "⚠ " : ""}
            {t("pendingRequests", { count: pending.count })}
            {pendingHours != null ? ` · ${t("pendingOldest", { hours: pendingHours })}` : ""}
            <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginTop: 3, lineHeight: 1.45 }}>{t("pendingExpiring")}</div>
          </div>
        )}

        {errLine("circle")}

        {/* LES RÉGLAGES SORTENT DE LA CONDITION, le lien d'adhésion y reste.
            Le plafond de sollicitations, le pitch et le lien de conversation
            n'avaient qu'un seul champ chacun, tous les trois enfermés ici. Sur
            un groupe FERMÉ aux adhésions — l'état par défaut — ils n'existaient
            pas dans le DOM : un animateur dont le plafond du jour éteint « Poser
            une question » n'avait qu'une issue pour le desserrer, cocher
            « Ouvrir aux adhésions », c'est-à-dire exposer une page publique
            d'adhésion pour un motif qui n'a rien à voir. Seule la rangée
            lien + copier dépend réellement de l'ouverture. */}
        <details style={{ marginTop: 14 }}>
            <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: 14, fontFamily: FONT_DISPLAY, color: SUBINK, listStyle: "revert" }}>
              {t("circleSettings")}
            </summary>

            {/* DEUX OBJETS, PAS UN. C'était un <a> maquillé en champ readonly
                — monospace, fond gris, bordure, défilement horizontal. Quand la
                copie échoue (hors contexte sécurisé), le message de secours dit
                « sélectionnez le lien et copiez-le à la main » : glisser la
                souris dessus lançait un glisser-déposer de lien, un clic ouvrait
                un onglet. Le seul chemin de secours indiqué par le produit était
                rendu inutilisable par son propre balisage. Un champ qu'on
                sélectionne, et un lien qui dit où il mène. */}
            {space.join_open && (
              <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  readOnly
                  value={`${APP_URL}/cercle/${space.join_token}`}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label={t("joinLinkAria")}
                  style={{ flex: "1 1 240px", minWidth: 0, fontSize: 12.5, fontFamily: "monospace", background: "#f6f6f4", border: `2px solid ${INK}`, borderRadius: 10, padding: "9px 11px", color: INK }}
                />
                <button onClick={() => void copyJoin()} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 13.5, cursor: "pointer", border: `2.5px solid ${INK}`, background: copied ? GREENTXT : "#fff", color: copied ? "#fff" : INK, padding: "9px 14px", borderRadius: 10 }}>
                  {copied ? t("copied") : t("copyLink")}
                </button>
                <a
                  href={`${APP_URL}/cercle/${space.join_token}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 13, fontWeight: 700, color: SUBINK, textDecoration: "underline", textUnderlineOffset: 3, padding: "6px 2px" }}
                >
                  {t("joinPageOpen")} →
                </a>
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              <input
                value={chatUrl}
                onChange={(e) => setChatUrl(e.target.value)}
                onBlur={saveChatUrl}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                placeholder={t("chatUrlPlaceholder")}
                aria-label={t("chatUrlAria")}
                style={{ width: "100%", fontFamily: FONT_BODY, fontSize: 14, padding: "10px 12px", border: `2px solid ${INK}`, borderRadius: 11 }}
              />
              <div style={{ fontSize: 12, color: MUTED, marginTop: 4, lineHeight: 1.45 }}>
                {t("chatUrlHint")}
                {saved === "chat" && <span style={{ color: GREENTXT, fontWeight: 800 }}> ✓ {t("savedTick")}</span>}
              </div>
            </div>

            <textarea
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              onBlur={() => saveCircle({ pitch }, "circle", "pitch")}
              placeholder={t("circlePitchPlaceholder")}
              aria-label={t("circlePitchAria")}
              rows={2}
              style={{ width: "100%", marginTop: 10, fontFamily: FONT_BODY, fontSize: 14, padding: "10px 12px", border: `2px solid ${INK}`, borderRadius: 11, resize: "vertical" }}
            />
            {saved === "pitch" && <div style={{ color: GREENTXT, fontWeight: 800, fontSize: 12.5 }}>✓ {t("savedTick")}</div>}

            <div style={{ marginTop: 12, display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
              {/* Le libellé existait, VISUELLEMENT, dans un <span> : aucun lien
                  programmatique, et le placeholder « aucun » n'est pas un nom. */}
              <label htmlFor="pace-input" style={{ fontWeight: 700, fontSize: 13.5, color: SUBINK }}>{t("circlePaceLabel")}</label>
              <input
                id="pace-input"
                value={paceInput}
                onChange={(e) => setPaceInput(e.target.value.replace(/[^0-9]/g, ""))}
                onBlur={savePace}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                placeholder={t("circlePaceNone")}
                inputMode="numeric"
                style={{ width: 92, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, padding: "8px 11px", border: `2px solid ${INK}`, borderRadius: 10 }}
              />
              <span style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.45, flex: "1 1 200px" }}>
                {paceInput.trim() === "" ? t("circlePaceHintNone") : t("circlePaceHint", { n: paceInput.trim() })}
                {saved === "pace" && <span style={{ color: GREENTXT, fontWeight: 800 }}> ✓ {t("savedTick")}</span>}
              </span>
            </div>
        </details>
      </div>

      {/* ---- §6 — zone rouge ---- */}
      {!delConfirm ? (
        // Seule cible de la page sous 24 px (WCAG 2.5.8) : contrôle autonome,
        // seul sur sa ligne, l'exception « en ligne » ne s'y applique pas.
        <button onClick={() => setDelConfirm(true)} style={{ marginTop: 22, border: "none", background: "none", color: REDTXT, cursor: "pointer", fontSize: 13.5, fontWeight: 700, padding: "8px 4px", minHeight: 24 }}>
          {t("deleteSpace")}
        </button>
      ) : (
        <div style={{ ...card, marginTop: 22, borderColor: REDTXT, boxShadow: `5px 5px 0 ${REDTXT}` }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16, color: REDTXT }}>{t("deleteSpace")}</div>
          <div style={{ fontSize: 13.5, color: SUBINK, margin: "8px 0 10px", lineHeight: 1.5 }}>{t("deleteSpaceConfirm", { name: space.name })}</div>
          {/* LE DERNIER REMPART AVANT LA DESTRUCTION EN CASCADE D'UN ROSTER
              s'annonçait comme un champ anonyme, et son placeholder donnait la
              réponse attendue. */}
          <input
            value={delText}
            onChange={(e) => setDelText(e.target.value)}
            aria-label={t("deleteConfirmAria")}
            placeholder={t("deleteConfirmPlaceholder")}
            style={{ width: "100%", fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, padding: "10px 12px", border: `2px solid ${INK}`, borderRadius: 11 }}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <button onClick={() => { setDelConfirm(false); setDelText(""); }} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14, cursor: "pointer", border: `2.5px solid ${INK}`, background: "#fff", color: INK, padding: "10px 16px", borderRadius: 11 }}>
              {t("deleteCancel")}
            </button>
            <button onClick={() => void onDeleteSpace()} disabled={!delMatches} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14, cursor: delMatches ? "pointer" : "not-allowed", border: `2.5px solid ${INK}`, background: REDTXT, color: "#fff", padding: "10px 16px", borderRadius: 11, opacity: delMatches ? 1 : 0.5 }}>
              {t("deleteSpaceFinal")}
            </button>
          </div>
          {errLine("danger")}
        </div>
      )}
    </>,
  );
}
