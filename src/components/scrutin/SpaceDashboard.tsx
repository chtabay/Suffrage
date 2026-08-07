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
  listEvents,
  listMembers,
  type EventRow,
  type Member,
  type Space,
} from "@/lib/db/events";
import { OrgShell } from "./SpacesHome";
import { listSegments, listMemberSegments, type Segment } from "@/lib/db/circles";
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
/** Sous ce seuil, la base refuse une consultation scellée (circle_audience_guard). */
const SEALED_MIN = 5;

export default function SpaceDashboard({ spaceId }: { spaceId: string }) {
  const t = useTranslations("Org");
  const locale = useLocale();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [space, setSpace] = useState<Space | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [memberSegs, setMemberSegs] = useState<Record<string, string[]>>({});

  // DEUX DRAPEAUX, PAS UN. `load()` fait deux vagues ; un seul indicateur ferait
  // rendre « 0 segment » sur un cercle qui en a douze. Tant que la page portait
  // la liste des membres, ce mensonge était démenti par les puces de chaque
  // ligne — une fois les listes parties, plus rien ne le dément, et l'animateur
  // convoquerait « tout le cercle » faute de cible visible.
  const [ready, setReady] = useState(false);
  const [coreErr, setCoreErr] = useState(false);
  const [segErr, setSegErr] = useState(false);

  const [name, setName] = useState("");
  const [pitch, setPitch] = useState("");
  const [paceInput, setPaceInput] = useState("");
  const [chatUrl, setChatUrl] = useState("");
  const [circleErr, setCircleErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);
  const [delText, setDelText] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setCoreErr(false);
    setSegErr(false);
    try {
      const [s, m, e] = await Promise.all([getSpace(spaceId), listMembers(spaceId), listEvents(spaceId)]);
      setSpace(s);
      setMembers(m);
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
      const [sg, ms] = await Promise.all([listSegments(spaceId), listMemberSegments(spaceId)]);
      setSegments(sg);
      setMemberSegs(ms);
    } catch {
      setSegErr(true);
    }
    setReady(true);
  }, [user, spaceId]);
  useEffect(() => {
    void load();
  }, [load]);

  // ------------------------------------------------------------- les chiffres

  const stats = useMemo(() => {
    const selfJoined = members.filter((m) => m.self_joined).length;
    const noEmail = members.filter((m) => !m.email?.trim()).length;
    const noSegment = members.filter((m) => !(memberSegs[m.id] ?? []).length).length;
    return { total: members.length, selfJoined, noEmail, noSegment };
  }, [members, memberSegs]);

  /** memberSegs (membre → segments) inversé en segment → effectif. */
  const segCount = useMemo(() => {
    const out: Record<string, number> = {};
    for (const ids of Object.values(memberSegs)) for (const id of ids) out[id] = (out[id] ?? 0) + 1;
    return out;
  }, [memberSegs]);

  const segSorted = useMemo(() => {
    // Les segments trop petits d'abord : ce sont les seuls qui exigent une
    // décision — sous 5, une consultation scellée sera refusée.
    return [...segments].sort((a, b) => {
      const ua = (segCount[a.id] ?? 0) < SEALED_MIN ? 0 : 1;
      const ub = (segCount[b.id] ?? 0) < SEALED_MIN ? 0 : 1;
      if (ua !== ub) return ua - ub;
      if (a.rank != null && b.rank != null && a.rank !== b.rank) return a.rank - b.rank;
      return a.position - b.position;
    });
  }, [segments, segCount]);
  const segBelow = segSorted.filter((g) => (segCount[g.id] ?? 0) < SEALED_MIN).length;

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
    const lastClosed = closed
      .map((e) => e.closes_at ?? e.created_at)
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

  const fmt = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short" });

  // ------------------------------------------------------------- les écritures

  const tick = (key: string) => {
    setSaved(key);
    setTimeout(() => setSaved((k) => (k === key ? null : k)), 1600);
  };

  const saveCircle = async (patch: Parameters<typeof updateSpace>[1], key?: string) => {
    if (!space) return;
    setCircleErr("");
    try {
      await updateSpace(space.id, patch);
      setSpace({ ...space, ...patch } as typeof space);
      if (key) tick(key);
    } catch (e) {
      // Le refus vient de la BASE : un cercle dont un membre est sans email
      // aurait un membre injoignable, jamais convoqué et sans moyen de partir.
      // On présente ce refus tel quel, on ne l'avale pas.
      const msg = String((e as { message?: string })?.message ?? "");
      setCircleErr(msg.includes("circle_members_without_email") ? t("circleNeedEmails") : t("circleSaveError"));
    }
  };

  const saveName = () => {
    const v = name.trim().slice(0, 120);
    if (!v || v === space?.name) {
      setName(space?.name ?? "");
      return;
    }
    void saveCircle({ name: v }, "name");
  };

  const saveChatUrl = () => {
    const raw = chatUrl.trim();
    if (raw && !isChatUrl(raw)) {
      setCircleErr(t("chatUrlInvalid"));
      return;
    }
    void saveCircle({ chat_url: raw || null }, "chat");
  };

  const savePace = () => {
    const raw = paceInput.trim();
    // Vide = aucun engagement (NULL en base) : la page d'adhésion n'affiche
    // alors aucun chiffre, plutôt qu'une promesse que ce cercle n'a pas faite.
    const n = raw === "" ? null : Math.min(50, Math.max(1, parseInt(raw, 10) || 1));
    setPaceInput(n == null ? "" : String(n));
    void saveCircle({ solicit_per_day: n }, "pace");
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
      setCircleErr(t("copyFailed"));
    }
  };

  const onCreateEvent = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ev = await createEvent(spaceId, { title: t("newSeriesDefault") });
      router.push(`/evenement/${ev.id}`);
    } catch {
      setCircleErr(t("writeError"));
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
      setCircleErr(t("writeError"));
    }
  };

  // --------------------------------------------------------------- le rendu

  const shell = (children: React.ReactNode) => <OrgShell>{children}</OrgShell>;

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
  // la première vague RÉUSSIE — « 0 membre · 0 consultation » est exactement ce
  // que produit un chargement en échec.
  if (!members.length && !events.length) {
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
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={saveName}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        aria-label={t("renameSpaceAria")}
        style={{ display: "block", width: "100%", margin: "10px 0 0", padding: 0, border: "none", background: "none", fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: "clamp(26px,5vw,36px)", letterSpacing: "-0.03em", color: INK, outline: "none" }}
      />
      <div style={{ fontSize: 14.5, color: SUBINK, marginTop: 6, lineHeight: 1.6 }} aria-live="polite">
        {statLink(`/espaces/${spaceId}/membres`, t("memberCount", { count: stats.total }))}
        {stats.selfJoined > 0 && (<>{dot}{t("statSelfJoined", { count: stats.selfJoined })}</>)}
        {stats.noEmail > 0 && (<>{dot}{statLink(`/espaces/${spaceId}/membres?filtre=sans-adresse`, t("statNoEmail", { count: stats.noEmail }), true)}</>)}
        {!segErr && segments.length > 0 && stats.noSegment > 0 && (
          <>{dot}{statLink(`/espaces/${spaceId}/membres?filtre=sans-segment`, t("statNoSegment", { count: stats.noSegment }), true)}</>
        )}
        {saved === "name" && <span style={{ color: GREENTXT, fontWeight: 800, marginLeft: 8 }}>✓ {t("savedTick")}</span>}
      </div>

      {/* ---- §2 — agir. Le compteur du jour et la case d'adhésion sont ICI,
           là où leur absence fait échouer l'action, et non trois cartes plus bas. */}
      <div style={{ ...card, marginTop: 18, borderColor: CORAL, boxShadow: `5px 5px 0 ${CORAL}` }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19 }}>{t("actionsTitle")}</div>
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
          <Link
            href={capped ? `/espaces/${spaceId}` : `/new?espace=${spaceId}`}
            aria-disabled={capped}
            className={capped ? undefined : "dc-bright"}
            onClick={(e) => capped && e.preventDefault()}
            style={{ textDecoration: "none", fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14.5, border: `2.5px solid ${INK}`, background: capped ? "#EFE8D6" : INK, color: capped ? MUTED : "#fff", padding: "11px 18px", borderRadius: 11, cursor: capped ? "not-allowed" : "pointer", opacity: capped ? 0.7 : 1 }}
          >
            {t("actionAsk")}
          </Link>
          <button onClick={onCreateEvent} disabled={busy} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14.5, cursor: "pointer", border: `2.5px solid ${INK}`, background: "#fff", color: INK, padding: "11px 18px", borderRadius: 11 }}>
            {t("actionSequence")}
          </button>
        </div>
        {/* La case remontée à côté de l'action qu'elle débloque. Sans elle, le
            bouton le plus contrasté de la page échoue EN BASE sur tout cercle
            fermé aux adhésions — c'est-à-dire par défaut — et le refus n'arrive
            qu'après composition de la question, sous un libellé de panne. */}
        {!space.join_open && (
          <label style={{ display: "flex", gap: 9, alignItems: "flex-start", marginTop: 14, cursor: "pointer", fontSize: 13.5, lineHeight: 1.5, color: SUBINK }}>
            <input type="checkbox" checked={false} onChange={(e) => saveCircle({ join_open: e.target.checked })} style={{ marginTop: 2, width: 17, height: 17, accentColor: INK, flex: "none" }} />
            <span>⚠ {t("needsCircleForAudience")}</span>
          </label>
        )}
      </div>

      {/* ---- §3 — les consultations EN COURS. Trois lignes au plus, quatre
           chiffres chacune : c'est le seul endroit de l'application où l'on voit
           qu'une urne se ferme demain. Le reste est derrière un compteur-lien. */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19 }}>{t("openTitle")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {!byState.open.length && <div style={{ color: MUTED, fontSize: 14 }}>{t("noOpenConsultation")}</div>}
          {byState.open.slice(0, OPEN_SHOWN).map((e) => (
            <Link key={e.id} href={`/evenement/${e.id}`} style={{ display: "block", background: CREAM, border: `2px solid ${INK}`, borderRadius: 13, padding: "12px 14px", textDecoration: "none", color: INK }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800, fontSize: 15.5 }}>{e.title}</span>
                <span style={{ fontSize: 11.5, fontWeight: 800, color: "#fff", background: GREENTXT, border: `1.5px solid ${INK}`, borderRadius: 20, padding: "2px 9px" }}>
                  {t("statusOpen")}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: MUTED, fontWeight: 600, marginTop: 5 }}>
                {/* `audience_label` n'est écrit que par le parcours /new : pour une
                    consultation née de l'éditeur il vaut NULL quel que soit le
                    public réel. Dire « tout le cercle » serait alors un mensonge. */}
                {e.audience_label ?? t("audienceUnknown")}
                {" · "}
                {e.secret_ballot ? "🔒" : "👁"}
                {e.closes_at ? ` · ${t("closesOnShort", { date: fmt.format(new Date(e.closes_at)) })}` : ""}
              </div>
            </Link>
          ))}
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 12, fontSize: 13, fontWeight: 700 }}>
          {byState.open.length > OPEN_SHOWN && (
            <Link href={`/espaces/${spaceId}/consultations?etat=ouvert`} style={{ color: CORAL, textDecoration: "none" }}>
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
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19 }}>{t("members")}</div>
          <div style={{ color: SUBINK, fontWeight: 700, fontSize: 14 }}>{t("memberCount", { count: stats.total })}</div>
        </div>

        {segErr ? (
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
                  const n = segCount[g.id] ?? 0;
                  const low = n < SEALED_MIN;
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
                      <span style={{ color: low ? REDTXT : SUBINK, fontWeight: 800 }}>· {n}{low ? " ⚠" : ""}</span>
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
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19 }}>{t("circle")}</div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13.5, fontWeight: 700, color: SUBINK }}>
            <input type="checkbox" checked={space.join_open} onChange={(e) => saveCircle({ join_open: e.target.checked })} style={{ width: 17, height: 17, accentColor: INK }} />
            {t("circleOpen")}
          </label>
        </div>
        <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4, lineHeight: 1.5 }}>{t("circleSubtitle")}</div>

        {circleErr && <div style={{ marginTop: 10, color: REDTXT, fontWeight: 700, fontSize: 13, lineHeight: 1.45 }}>{circleErr}</div>}

        {space.join_open && (
          <details style={{ marginTop: 14 }}>
            <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: 14, fontFamily: FONT_DISPLAY, color: SUBINK, listStyle: "revert" }}>
              {t("circleSettings")}
            </summary>

            <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {/* Le lien devient ouvrable : c'est la seule page où le pitch et
                  l'engagement de rythme s'affichent, et l'animateur ne l'a jamais vue. */}
              <a
                href={`${APP_URL}/cercle/${space.join_token}`}
                target="_blank"
                rel="noreferrer"
                title={t("joinPageOpen")}
                style={{ flex: "1 1 240px", minWidth: 0, overflowX: "auto", whiteSpace: "nowrap", fontSize: 12.5, fontFamily: "monospace", background: "#f6f6f4", border: `2px solid ${INK}`, borderRadius: 10, padding: "9px 11px", color: INK }}
              >
                {`${APP_URL}/cercle/${space.join_token}`}
              </a>
              <button onClick={() => void copyJoin()} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 13.5, cursor: "pointer", border: `2.5px solid ${INK}`, background: copied ? GREENTXT : "#fff", color: copied ? "#fff" : INK, padding: "9px 14px", borderRadius: 10 }}>
                {copied ? t("copied") : t("copyLink")}
              </button>
            </div>

            <div style={{ marginTop: 10 }}>
              <input
                value={chatUrl}
                onChange={(e) => setChatUrl(e.target.value)}
                onBlur={saveChatUrl}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                placeholder={t("chatUrlPlaceholder")}
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
              onBlur={() => saveCircle({ pitch }, "pitch")}
              placeholder={t("circlePitchPlaceholder")}
              rows={2}
              style={{ width: "100%", marginTop: 10, fontFamily: FONT_BODY, fontSize: 14, padding: "10px 12px", border: `2px solid ${INK}`, borderRadius: 11, resize: "vertical" }}
            />
            {saved === "pitch" && <div style={{ color: GREENTXT, fontWeight: 800, fontSize: 12.5 }}>✓ {t("savedTick")}</div>}

            <div style={{ marginTop: 12, display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 13.5, color: SUBINK }}>{t("circlePaceLabel")}</span>
              <input
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
        )}
      </div>

      {/* ---- §6 — zone rouge, inchangée sauf le try/catch ---- */}
      {!delConfirm ? (
        <button onClick={() => setDelConfirm(true)} style={{ marginTop: 22, border: "none", background: "none", color: REDTXT, cursor: "pointer", fontSize: 13.5, fontWeight: 700 }}>
          {t("deleteSpace")}
        </button>
      ) : (
        <div style={{ ...card, marginTop: 22, borderColor: REDTXT, boxShadow: `5px 5px 0 ${REDTXT}` }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16, color: REDTXT }}>{t("deleteSpace")}</div>
          <div style={{ fontSize: 13.5, color: SUBINK, margin: "8px 0 10px", lineHeight: 1.5 }}>{t("deleteSpaceConfirm", { name: space.name })}</div>
          <input
            value={delText}
            onChange={(e) => setDelText(e.target.value)}
            placeholder={space.name}
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
        </div>
      )}
    </>,
  );
}
