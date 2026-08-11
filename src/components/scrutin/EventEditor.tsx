"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import {
  addResolution,
  convene,
  countResolutionVotes,
  countEventVoters,
  deleteEvent,
  getConvocationLink,
  getEvent,
  listConvened,
  listMembers,
  listResolutions,
  removeConvened,
  removeResolution,
  setResolutionStatus,
  updateEvent,
  type EventMember,
  type EventRow,
  type Member,
  type ResolutionRow,
  getEventResultsOwner,
  type EventResultsData,
} from "@/lib/db/events";
import { resolveKey } from "@/lib/voting/engine";
import type { Ballot } from "@/lib/voting/types";
import { ASSIGN_METHODS, isAssignMethod } from "@/lib/assign/methods";
import { APP_URL } from "@/lib/voting/aiPrompt";
import { OrgShell } from "./SpacesHome";
import EventResults from "./EventResults";
import QuestionComposer, { type ComposedQuestion } from "./QuestionComposer";
import { getNamedAnswers, type NamedAnswers } from "@/lib/db/circles";
import { CREAM, FONT_BODY, FONT_DISPLAY, GREEN, GREENTXT, INK, MUTED, REDTXT, SUBINK, YELLOW } from "./theme";

const card = {
  background: "#fff",
  border: `2.5px solid ${INK}`,
  borderRadius: 18,
  padding: "20px 22px",
  boxShadow: `5px 5px 0 ${INK}`,
} as const;

const btn = (bg: string, fg: string) =>
  ({
    fontFamily: FONT_DISPLAY,
    fontWeight: 800,
    fontSize: 14.5,
    cursor: "pointer",
    border: `2.5px solid ${INK}`,
    background: bg,
    color: fg,
    padding: "11px 18px",
    borderRadius: 11,
  }) as const;

export default function EventEditor({ eventId }: { eventId: string }) {
  const t = useTranslations("Org");
  const tm = useTranslations("Methods");
  const ta = useTranslations("Assign");
  const locale = useLocale();
  // Préréglage du cas le plus courant en AG : Pour / Contre / Abstention (localisé).
  const presetOpts = () => [t("presetFor"), t("presetAgainst"), t("presetAbstain")];
  const router = useRouter();
  const { user, loading } = useAuth();
  const [ev, setEv] = useState<EventRow | null>(null);
  const [resolutions, setResolutions] = useState<ResolutionRow[]>([]);
  const [roster, setRoster] = useState<Member[]>([]);
  const [convened, setConvened] = useState<EventMember[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [linkErr, setLinkErr] = useState<string | null>(null);
  const [sendMsg, setSendMsg] = useState("");
  // Un envoi qui échoue ne se peint pas en vert. Le message était rendu en
  // GREENTXT quoi qu'il arrive : « l'envoi d'email n'est pas configuré »
  // s'affichait comme une réussite.
  const [sendKo, setSendKo] = useState(false);
  /** Avancement de l'envoi par lots : ce qui est parti, sur combien. */
  const [sendProg, setSendProg] = useState<{ done: number; total: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [capInput, setCapInput] = useState("");
  const [quorumInput, setQuorumInput] = useState("");
  const [liveCount, setLiveCount] = useState(0);
  const [votedCount, setVotedCount] = useState(0);
  // Consultation scellée : le dépouillement ne passe QUE par la RPC, et il peut
  // refuser (seuil). On garde le motif pour l'afficher au lieu d'un résultat vide.
  const [sealed, setSealed] = useState<EventResultsData | null>(null);
  const sealedRef = useRef<EventResultsData | null>(null);
  const [named, setNamed] = useState<NamedAnswers | null>(null);

  /**
   * Lecteur de bulletins d'une consultation SCELLÉE. La policy RESTRICTIVE ferme
   * la lecture directe : on passe par la RPC organisateur, une seule fois pour
   * tout l'événement, puis on sert chaque résolution depuis ce résultat.
   */
  const sealedBallots = useCallback(
    async (r: ResolutionRow) => {
      if (!ev) return [];
      const data = sealedRef.current ?? (await getEventResultsOwner(ev.id));
      sealedRef.current = data;
      setSealed(data);
      if (data.status !== "closed") return [];
      const res = (data.resolutions ?? []).find((x) => x.id === r.id);
      return (res?.ballots ?? []).map((b) => ({
        ballot: { ranking: b.ranking, grades: b.grades, district: b.district } as Ballot,
        weight: b.weight,
      }));
    },
    [ev],
  );

  // Réponses nominatives : chargées seulement si la consultation n'est PAS
  // scellée. La RPC refuse de toute façon dans l'autre cas — la garde est en base.
  useEffect(() => {
    if (!ev || ev.secret_ballot || ev.status === "draft") {
      setNamed(null);
      return;
    }
    let cancel = false;
    void getNamedAnswers(ev.id)
      .then((r) => !cancel && setNamed(r))
      .catch(() => !cancel && setNamed(null));
    return () => {
      cancel = true;
    };
  }, [ev]);

  const load = useCallback(async () => {
    if (!user) return;
    const e = await getEvent(eventId);
    setEv(e);
    if (e) {
      setCapInput(e.enroll_cap != null ? String(e.enroll_cap) : "");
      setQuorumInput(e.quorum ? String(e.quorum) : "");
      const [r, c] = await Promise.all([listResolutions(eventId), listConvened(eventId)]);
      setResolutions(r);
      setConvened(c);
      if (e.space_id) setRoster(await listMembers(e.space_id));
    }
  }, [user, eventId]);
  useEffect(() => {
    load();
  }, [load]);

  // Suivi live : compte les votes de la résolution active toutes les 4 s.
  useEffect(() => {
    if (ev?.mode !== "live" || ev.status !== "open" || !ev.current_poll_id) return;
    const pid = ev.current_poll_id;
    let cancel = false;
    const tick = async () => {
      try {
        const n = await countResolutionVotes(pid);
        if (!cancel) setLiveCount(n);
      } catch {
        /* noop */
      }
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => {
      cancel = true;
      clearInterval(id);
    };
  }, [ev?.mode, ev?.status, ev?.current_poll_id]);

  // Suivi participation (async) : membres distincts ayant voté, rafraîchi périodiquement.
  const resIdsKey = resolutions.map((r) => r.id).join(",");
  useEffect(() => {
    if ((ev?.mode ?? "async") === "live" || ev?.status !== "open" || !resIdsKey) return;
    // ⚠️ JAMAIS EN SCELLÉ, pour deux raisons qui vont dans le même sens.
    // (1) Le chiffre serait FAUX : en scellé le bulletin est écrit sans
    //     `event_member_id` et la policy restrictive `scrutin_ballots_hide_secret`
    //     retire ces bulletins de toute lecture directe — `countEventVoters`
    //     mesure donc structurellement zéro, et l'écran annonçait « 0 / 24 » à
    //     un animateur dont 18 personnes avaient voté. Il en concluait que sa
    //     convocation n'était pas partie et relançait 24 personnes.
    // (2) Le réparer en le branchant sur les émargements serait PIRE : un
    //     compteur qui bouge toutes les 12 s, corrélé à l'envoi d'un lien
    //     individuel, est exactement l'oracle que le bulletin scellé interdit.
    //     Le tableau de bord sert déjà ce ratio, une fois au montage et sous le
    //     plancher des 5 convoqués (`ratioVisible`).
    if (ev?.secret_ballot) return;
    const ids = resIdsKey.split(",");
    let cancel = false;
    const tick = async () => {
      try {
        const n = await countEventVoters(ids);
        if (!cancel) setVotedCount(n);
      } catch {
        /* noop */
      }
    };
    tick();
    const id = setInterval(tick, 12000);
    return () => {
      cancel = true;
      clearInterval(id);
    };
  }, [ev?.mode, ev?.status, ev?.secret_ballot, resIdsKey]);

  // La composition de la question (libellé, options, méthode, seuil) vit désormais
  // dans QuestionComposer, partagé avec le cercle. Ici on ne fait plus qu'écrire.
  const addRes = async (composed: ComposedQuestion) => {
    if (busy) return;
    setBusy(true);
    try {
      await addResolution(eventId, { ...composed, orderIndex: resolutions.length });
      setResolutions(await listResolutions(eventId));
    } catch {
      /* noop */
    }
    setBusy(false);
  };

  const delRes = async (id: string) => {
    await removeResolution(id);
    setResolutions((l) => l.filter((r) => r.id !== id));
  };

  // Le snapshot `event_members` est découplé du roster : un membre supprimé du
  // roster reste convoqué tant qu'on ne resynchronise pas. `Convoquer` (brouillon)
  // ajoute les nouveaux ET retire ceux qui ne sont plus dans le roster (hors auto-inscrits).
  const rosterIds = new Set(roster.map((m) => m.id));
  const toConvene = roster.filter((m) => !convened.some((c) => c.member_id === m.id));
  const staleConvened = ev?.status === "draft" ? convened.filter((c) => c.member_id && !rosterIds.has(c.member_id)) : [];

  const doConvene = async () => {
    if ((!toConvene.length && !staleConvened.length) || busy) return;
    setBusy(true);
    try {
      if (staleConvened.length) await Promise.all(staleConvened.map((c) => removeConvened(c.id)));
      const added = toConvene.length ? await convene(eventId, toConvene) : [];
      const staleIds = new Set(staleConvened.map((c) => c.id));
      setConvened((c) => [...c.filter((m) => !staleIds.has(m.id)), ...added]);
    } catch {
      /* noop */
    }
    setBusy(false);
  };

  const removeConvenedMember = async (id: string) => {
    await removeConvened(id);
    setConvened((c) => c.filter((m) => m.id !== id));
  };

  // La base REFUSE desormais deux ouvertures scellees : moins de cinq convoques,
  // et un public trop proche de celui d une consultation scellee anterieure (la
  // difference des depouillements designerait les personnes de l ecart). Sans ce
  // try/catch, l ecran affirmait un etat que la base n avait pas pris.
  const [statusErr, setStatusErr] = useState("");
  const setStatus = async (status: "draft" | "open" | "closed") => {
    setStatusErr("");
    try {
      await updateEvent(eventId, { status });
      setEv((e) => (e ? { ...e, status } : e));
    } catch (err) {
      const msg = String((err as { message?: string })?.message ?? "");
      setStatusErr(
        msg.includes("sealed_needs_5") ? t("sealedNeeds5")
        : msg.includes("sealed_too_close") ? t("sealedTooClose")
        : t("statusError"),
      );
    }
  };

  const setMode = async (mode: "async" | "live") => {
    await updateEvent(eventId, { mode });
    setEv((e) => (e ? { ...e, mode } : e));
  };

  // Pilotage live : ouvre une résolution (la rend active) ou la clôture.
  const openLive = async (pollId: string) => {
    await updateEvent(eventId, { current_poll_id: pollId });
    setEv((e) => (e ? { ...e, current_poll_id: pollId } : e));
  };
  const closeLive = async (pollId: string) => {
    await setResolutionStatus(pollId, "closed");
    await updateEvent(eventId, { current_poll_id: null });
    setResolutions((l) => l.map((r) => (r.id === pollId ? { ...r, status: "closed" } : r)));
    setEv((e) => (e ? { ...e, current_poll_id: null } : e));
  };

  const onDelete = async () => {
    if (!confirm(t("confirmDeleteEvent"))) return;
    await deleteEvent(eventId);
    router.push(ev?.space_id ? `/espaces/${ev.space_id}` : "/espaces");
  };

  /**
   * Le lien personnel d'un convoqué, DEMANDÉ À L'UNITÉ.
   *
   * ⚠️ IL ARRIVAIT AVEC LA LISTE, ET C'ÉTAIT UN ORACLE. Tant que `listConvened`
   * rendait `token`, ce navigateur détenait les N jetons du roster — et
   * `get_event_context(p_token)` rend, pour le porteur d'un jeton, un `voted`
   * calculé sur les ÉMARGEMENTS dès que la consultation est scellée. Un appel
   * par jeton reconstituait la liste nominative des émargeants d'un bulletin
   * scellé. On ne ferme pas cette lecture côté votant — c'est SA page — on coupe
   * l'accumulation : un jeton se demande, un par un, et la demande est refusée
   * en scellé (`get_convocation_link`).
   */
  const askLink = async (eventMemberId: string) => {
    setLinkErr(null);
    try {
      const r = await getConvocationLink(eventMemberId);
      if (r.status !== "ok" || !r.token) {
        // Littéral des deux côtés : une clé passée en variable échappe au
        // contrôle de parité i18n.
        setLinkErr(r.status === "sealed" ? t("linkSealedOnly") : t("writeError"));
        return;
      }
      if (!navigator.clipboard) throw new Error("no clipboard");
      await navigator.clipboard.writeText(`${APP_URL}/e/${r.token}`);
      setCopied(eventMemberId);
      setTimeout(() => setCopied((c) => (c === eventMemberId ? null : c)), 1600);
    } catch {
      setLinkErr(t("copyFailed"));
    }
  };

  const enrollUrl = ev?.enroll_token ? `${APP_URL}/rejoindre/${ev.enroll_token}` : "";
  const enrolledCount = convened.filter((c) => c.self_enrolled).length;

  const toggleEnroll = async () => {
    if (!ev) return;
    const next = !ev.enroll_open;
    await updateEvent(eventId, { enroll_open: next });
    setEv((e) => (e ? { ...e, enroll_open: next } : e));
  };

  const saveCap = async () => {
    const n = capInput.trim() ? Math.max(1, parseInt(capInput, 10) || 1) : null;
    await updateEvent(eventId, { enroll_cap: n });
    setEv((e) => (e ? { ...e, enroll_cap: n } : e));
    setCapInput(n != null ? String(n) : "");
  };

  const copyEnroll = () => {
    navigator.clipboard?.writeText(enrollUrl);
    setCopied("__enroll__");
    setTimeout(() => setCopied((c) => (c === "__enroll__" ? null : c)), 1600);
  };

  const saveQuorum = async () => {
    const n = Math.min(100, Math.max(0, parseInt(quorumInput, 10) || 0));
    await updateEvent(eventId, { quorum: n });
    setEv((e) => (e ? { ...e, quorum: n } : e));
    setQuorumInput(n ? String(n) : "");
  };

  /**
   * Envoie les convocations PAR LOTS, en rappelant la route tant qu'il en reste.
   *
   * La route ne traite qu'une vingtaine de personnes par appel et marque
   * `invited_at` à chaque lot : c'est ce qui rend l'opération reprenable. Avant,
   * une seule requête tentait les 200 d'un coup, expirait vers la 40e, et
   * laissait le pire état — les emails partis, aucune ligne marquée.
   *
   * `resend` n'est vrai que sur un renvoi explicite : par défaut la route ne
   * vise que ceux qui n'ont encore rien reçu.
   */
  // Qui reste à prévenir, et qui l'a déjà été. `invited_at` est enfin fiable :
  // la route le marque lot par lot au lieu d'un seul UPDATE final jamais atteint.
  const aConvoquer = convened.filter((c) => c.email && !c.invited_at).length;
  const dejaConvoques = convened.filter((c) => c.email && c.invited_at).length;

  const sendConvocations = async (resend = false) => {
    if (sending) return;
    setSending(true);
    setSendMsg("");
    setSendKo(false);
    let envoyes = 0;
    let echecs = 0;
    try {
      // Borne de sécurité : jamais de boucle sans fin si la route cessait de
      // décrémenter le reste.
      for (let tour = 0; tour < 200; tour++) {
        const res = await fetch(`/api/events/${eventId}/convoke`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ locale, resend: resend && tour === 0 }),
        });
        if (!res.ok) {
          setSendKo(true);
          setSendMsg(res.status === 503 ? t("emailError") : t("sentPartial", { sent: envoyes, failed: echecs + 1 }));
          break;
        }
        const d = (await res.json()) as { sent: number; failed: number; remaining: number };
        envoyes += d.sent;
        echecs += d.failed;
        setSendProg({ done: envoyes + echecs, total: envoyes + echecs + d.remaining });
        if (d.remaining === 0) {
          setSendKo(echecs > 0);
          setSendMsg(echecs > 0 ? t("sentPartial", { sent: envoyes, failed: echecs }) : t("sentResult", { sent: envoyes, total: envoyes }));
          break;
        }
      }
      load();
    } catch {
      setSendKo(true);
      setSendMsg(t("emailError"));
    }
    setSendProg(null);
    setSending(false);
  };

  const sendReminders = async () => {
    if (reminding) return;
    setReminding(true);
    setSendMsg("");
    try {
      const res = await fetch(`/api/events/${eventId}/remind`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      if (res.ok) {
        const d = (await res.json()) as { sent: number; pending: number };
        setSendMsg(d.pending === 0 ? t("remindAllVoted") : t("remindResult", { sent: d.sent }));
        load();
      } else {
        setSendMsg(t("emailError"));
      }
    } catch {
      setSendMsg(t("emailError"));
    }
    setReminding(false);
  };

  if (loading) return <OrgShell><div style={{ ...card, color: MUTED }}>{t("loading")}</div></OrgShell>;
  if (!user) return <OrgShell><div style={card}>{t("signInPrompt")}</div></OrgShell>;
  if (!ev) return <OrgShell><div style={{ ...card, color: MUTED }}>{t("loading")}</div></OrgShell>;

  const statusKey = ev.status === "open" ? "statusOpen" : ev.status === "closed" ? "statusClosed" : "statusDraft";

  return (
    <OrgShell>
      {ev.space_id && (
        <Link href={`/espaces/${ev.space_id}`} style={{ color: SUBINK, fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
          {t("backToSpace")}
        </Link>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "10px 0 0", flexWrap: "wrap" }}>
        {ev.status === "draft" ? (
          /* Renommable tant que c'est un brouillon — indispensable depuis que la
             création en un clic pose un titre par défaut. Après l'ouverture, le
             titre figure dans des emails déjà reçus : il se fige. */
          <input
            value={ev.title}
            onChange={(e) => setEv({ ...ev, title: e.target.value })}
            onBlur={() => updateEvent(ev.id, { title: ev.title }).catch(() => {})}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            aria-label={t("renameSeriesAria")}
            style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: "clamp(24px,5vw,34px)", letterSpacing: "-0.03em", margin: 0, border: "none", borderBottom: `2px dashed ${INK}`, background: "transparent", color: INK, minWidth: 0, flex: "1 1 260px", padding: 0 }}
          />
        ) : (
          <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: "clamp(24px,5vw,34px)", letterSpacing: "-0.03em", margin: 0 }}>{ev.title}</h1>
        )}
        <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", background: ev.status === "open" ? GREENTXT : INK, padding: "5px 11px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.04em" }}>{t(statusKey)}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: INK, background: "#FFE08A", padding: "5px 11px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.04em" }}>{t(ev.mode === "live" ? "modeLive" : "modeAsync")}</span>
      </div>

      {ev.status === "draft" && <div style={{ ...card, marginTop: 16, background: "#fff4e0" }}>{t("draftHint")}</div>}
      {ev.status === "draft" && (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: SUBINK, marginBottom: 8 }}>{t("modeLabel")}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["async", "live"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} style={btn(ev.mode === m ? INK : "#fff", ev.mode === m ? "#fff" : INK)}>
                {t(m === "live" ? "modeLive" : "modeAsync")}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12.5, color: MUTED, marginTop: 9 }}>{t(ev.mode === "live" ? "modeLiveHint" : "modeAsyncHint")}</div>
        </div>
      )}
      {ev.status === "closed" && <div style={{ ...card, marginTop: 16, background: "#e7f6ec", borderColor: GREEN }}>{t("closedBanner")}</div>}

      {/* ---- Résolutions ---- */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19 }}>{t("resolutions")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 13 }}>
          {!resolutions.length && <div style={{ color: MUTED, fontSize: 14 }}>{t("noResolutions")}</div>}
          {resolutions.map((r, i) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, background: CREAM, border: `2px solid ${INK}`, borderRadius: 11, padding: "10px 13px" }}>
              <span style={{ fontWeight: 800, color: SUBINK, fontSize: 13 }}>{i + 1}</span>
              <span style={{ fontWeight: 700, fontSize: 14.5, flex: 1 }}>{r.question}</span>
              <span style={{ fontSize: 12, color: SUBINK, fontWeight: 700 }}>
                {isAssignMethod(r.recipe.assign)
                  ? `${ASSIGN_METHODS[r.recipe.assign].icon} ${ta(`methods.${r.recipe.assign}.name`)}`
                  : tm(`${resolveKey(r.recipe)}.name`)}
              </span>
              {ev.status === "draft" && (
                <button onClick={() => delRes(r.id)} style={{ border: "none", background: "none", color: REDTXT, cursor: "pointer", fontSize: 17, lineHeight: 1 }}>×</button>
              )}
            </div>
          ))}
        </div>

        {ev.status === "draft" && (
          <div style={{ marginTop: 15, borderTop: `2px dashed #E4DBC6`, paddingTop: 15 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: SUBINK, marginBottom: 8 }}>{t("addResolutionTitle")}</div>
            <QuestionComposer
              presetOptions={presetOpts}
              submitLabel={t("addResolution")}
              busy={busy}
              onSubmit={addRes}
            />
          </div>
        )}
      </div>

      {/* ---- Pupitre live ---- */}
      {ev.mode === "live" && ev.status === "open" && (
        <div style={{ ...card, marginTop: 16, borderColor: GREEN, boxShadow: `5px 5px 0 ${GREEN}` }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19 }}>{t("liveTitle")}</div>
          <div style={{ fontSize: 12.5, color: MUTED, margin: "6px 0 12px" }}>{t("liveHint")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {!resolutions.length && <div style={{ color: MUTED, fontSize: 14 }}>{t("noResolutions")}</div>}
            {resolutions.map((r, i) => {
              const active = ev.current_poll_id === r.id;
              const closed = r.status === "closed";
              return (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: active ? "#e7f6ec" : CREAM, border: `2px solid ${active ? GREEN : INK}`, borderRadius: 11, padding: "10px 13px" }}>
                  <span style={{ fontWeight: 800, color: SUBINK, fontSize: 13 }}>{i + 1}</span>
                  <span style={{ fontWeight: 700, fontSize: 14.5, flex: 1, minWidth: 140 }}>{r.question}</span>
                  {closed ? (
                    <span style={{ fontSize: 12, fontWeight: 800, color: SUBINK }}>{t("liveClosed")}</span>
                  ) : active ? (
                    <>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: GREENTXT }}>🔴 {t("participation", { voted: liveCount, total: convened.length })}</span>
                      <button onClick={() => closeLive(r.id)} style={btn(INK, "#fff")}>{t("liveClose")}</button>
                    </>
                  ) : (
                    <button onClick={() => openLive(r.id)} style={btn(GREENTXT, "#fff")}>{t("liveOpen")}</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- Convocation ---- */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19 }}>{t("convocation")}</div>
          <span style={{ color: SUBINK, fontWeight: 700, fontSize: 14 }}>
            {ev.status === "open" && !ev.secret_ballot && (ev.mode ?? "async") !== "live" && convened.length > 0
              ? t("participation", { voted: votedCount, total: convened.length })
              : t("convenedCount", { count: convened.length })}
          </span>
        </div>
        {(toConvene.length > 0 || staleConvened.length > 0) && (
          <button onClick={doConvene} disabled={busy} style={{ ...btn(INK, "#fff"), marginTop: 13 }}>{t("convene")}</button>
        )}
        {convened.length > 0 && (
          <>
            <div style={{ fontSize: 12.5, color: MUTED, margin: "13px 0 8px" }}>
              {ev.secret_ballot ? t("shareHintSealed") : t("shareHint")}
            </div>
            {linkErr && (
              <div role="alert" style={{ fontSize: 13, color: REDTXT, fontWeight: 700, marginBottom: 8 }}>{linkErr}</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {convened.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, background: CREAM, border: `2px solid ${INK}`, borderRadius: 11, padding: "9px 12px" }}>
                  <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{c.name}</span>
                  {c.self_enrolled && <span style={{ fontSize: 11, fontWeight: 800, color: SUBINK }}>{t("selfEnrolledBadge")}</span>}
                  {c.invited_at && <span style={{ fontSize: 11, fontWeight: 800, color: GREENTXT }}>{t("invitedBadge")}</span>}
                  {/* En SCELLÉ, pas de bouton du tout : le refus vaut mieux que
                      le clic qui refuse. Les liens partent par courriel, écrits
                      par la route d'envoi, qui ne les rend jamais ici. */}
                  {!ev.secret_ballot && (
                    <button onClick={() => void askLink(c.id)} style={{ border: `2px solid ${INK}`, background: copied === c.id ? GREENTXT : "#fff", color: copied === c.id ? "#fff" : INK, cursor: "pointer", fontSize: 12.5, fontWeight: 700, padding: "6px 11px", borderRadius: 9 }}>
                      {copied === c.id ? t("copied") : t("copyLink")}
                    </button>
                  )}
                  {ev.status === "draft" && (
                    <button onClick={() => removeConvenedMember(c.id)} title={t("remove")} style={{ border: "none", background: "none", color: REDTXT, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
                  )}
                </div>
              ))}
            </div>
            {/* LE BOUTON DIT SA CIBLE, ET NE VISE QUE CEUX QUI N'ONT RIEN REÇU.
                Il envoyait à TOUT LE MONDE à chaque clic — y compris à ceux qui
                avaient déjà voté, et même sur une consultation close. Le renvoi
                intégral existe toujours, mais il est devenu un second geste,
                nommé, qui dit combien de personnes seront réécrites. */}
            {/* Rien ne fermait ce bouton sur une consultation CLOSE : il
                convoquait alors vers un vote qui refuse le bulletin. */}
            {ev.status !== "closed" && aConvoquer > 0 && (
              <button
                onClick={() => sendConvocations()}
                disabled={sending}
                style={{ ...btn(YELLOW, INK), marginTop: 12, opacity: sending ? 0.6 : 1, cursor: sending ? "wait" : "pointer" }}
              >
                {sending ? t("sendingConvocations") : t("sendConvocationsN", { count: aConvoquer })}
              </button>
            )}
            {ev.status !== "closed" && aConvoquer === 0 && dejaConvoques > 0 && (
              <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: SUBINK }}>{t("allConvoked", { count: dejaConvoques })}</span>
                <button
                  onClick={() => {
                    if (typeof window !== "undefined" && !window.confirm(t("resendConfirm", { count: dejaConvoques }))) return;
                    void sendConvocations(true);
                  }}
                  disabled={sending}
                  style={{ ...btn("#fff", INK), opacity: sending ? 0.6 : 1, cursor: sending ? "wait" : "pointer" }}
                >
                  {sending ? t("sendingConvocations") : t("resendConvocations")}
                </button>
              </div>
            )}
            {ev.status === "open" && convened.some((c) => c.email && c.invited_at) && (
              <button
                onClick={sendReminders}
                disabled={reminding || sending}
                style={{ ...btn("#fff", INK), marginTop: 10, marginLeft: 10, opacity: reminding ? 0.6 : 1, cursor: reminding ? "wait" : "pointer" }}
              >
                {reminding ? t("remindingNonVoters") : t("remindNonVoters")}
              </button>
            )}
            {sendProg && (
              <div style={{ marginTop: 10, fontWeight: 700, fontSize: 13.5, color: SUBINK }} aria-live="polite">
                {t("sentProgress", { done: sendProg.done, total: sendProg.total })}
              </div>
            )}
            {sendMsg && (
              <div role={sendKo ? "alert" : undefined} style={{ marginTop: 10, fontWeight: 700, fontSize: 13.5, color: sendKo ? REDTXT : GREENTXT }}>
                {sendMsg}
              </div>
            )}
          </>
        )}
      </div>

      {/* ---- Inscription ouverte ---- */}
      {ev.status !== "closed" && (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19 }}>{t("enrollTitle")}</div>
            {ev.enroll_open && <span style={{ color: SUBINK, fontWeight: 700, fontSize: 14 }}>{t("enrollEnrolled", { count: enrolledCount })}</span>}
          </div>
          <div style={{ fontSize: 12.5, color: MUTED, margin: "8px 0 12px" }}>{t("enrollHint")}</div>
          {!ev.enroll_open ? (
            <button onClick={toggleEnroll} style={btn(INK, "#fff")}>{t("enrollEnable")}</button>
          ) : (
            <>
              <div style={{ fontSize: 12.5, color: SUBINK, fontWeight: 700, marginBottom: 6 }}>{t("enrollShareHint")}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  readOnly
                  value={enrollUrl}
                  onFocus={(e) => e.target.select()}
                  style={{ flex: 1, minWidth: 220, fontFamily: FONT_BODY, fontSize: 13, padding: "9px 11px", border: `2px solid ${INK}`, borderRadius: 10, background: CREAM }}
                />
                <button
                  onClick={copyEnroll}
                  style={{ border: `2px solid ${INK}`, background: copied === "__enroll__" ? GREENTXT : "#fff", color: copied === "__enroll__" ? "#fff" : INK, cursor: "pointer", fontSize: 12.5, fontWeight: 700, padding: "8px 13px", borderRadius: 9 }}
                >
                  {copied === "__enroll__" ? t("copied") : t("copyLink")}
                </button>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: SUBINK }}>{t("enrollCap")}</span>
                <input
                  value={capInput}
                  onChange={(e) => setCapInput(e.target.value.replace(/[^0-9]/g, ""))}
                  onBlur={saveCap}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  placeholder={t("enrollCapPlaceholder")}
                  inputMode="numeric"
                  style={{ width: 110, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, padding: "8px 11px", border: `2px solid ${INK}`, borderRadius: 10 }}
                />
                <button onClick={toggleEnroll} style={{ ...btn("#fff", INK), marginLeft: "auto" }}>{t("enrollDisable")}</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ---- Quorum (paramètre d'événement) ---- */}
      {ev.status !== "closed" && (
        <div style={{ ...card, marginTop: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: SUBINK }}>{t("quorumLabel")}</span>
          <input
            value={quorumInput}
            onChange={(e) => setQuorumInput(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={saveQuorum}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            placeholder="0"
            inputMode="numeric"
            style={{ width: 80, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, padding: "8px 11px", border: `2px solid ${INK}`, borderRadius: 10 }}
          />
          <span style={{ fontSize: 13, color: MUTED }}>{t("quorumHint")}</span>
        </div>
      )}

      {/* ---- Bulletin scellé : réglable UNIQUEMENT en brouillon ----
          Après l'ouverture, basculer changerait la nature des bulletins déjà
          déposés (les uns signés, les autres non) : le dépouillement deviendrait
          incohérent et la promesse faite aux premiers votants serait rompue. */}
      {ev.status === "draft" && (
        <div style={{ ...card, marginTop: 16 }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 11, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={ev.secret_ballot}
              onChange={async (e) => {
                const on = e.target.checked;
                await updateEvent(ev.id, { secret_ballot: on });
                setEv({ ...ev, secret_ballot: on });
              }}
              style={{ width: 18, height: 18, marginTop: 2, flex: "none", accentColor: INK }}
            />
            <span>
              <span style={{ display: "block", fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15 }}>
                {t("secretBallot")}
              </span>
              <span style={{ display: "block", fontSize: 13.5, color: SUBINK, lineHeight: 1.45, marginTop: 3 }}>
                {t("secretBallotHint")}
              </span>
            </span>
          </label>
        </div>
      )}

      {/* Seuil de dépouillement atteint ou non — dit franchement, plutôt qu'un
          tableau vide qui laisserait croire que personne n'a voté. */}
      {ev.secret_ballot && sealed?.status === "too_few" && (
        <div style={{ ...card, marginTop: 16, borderColor: INK, background: "#FFF8E5" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15 }}>{t("sealedTooFewTitle")}</div>
          <div style={{ fontSize: 14, color: SUBINK, lineHeight: 1.5, marginTop: 5 }}>
            {t("sealedTooFew", { n: sealed.ballots ?? 0, min: sealed.min ?? 5 })}
          </div>
        </div>
      )}

      {/* ---- Qui a répondu quoi ----
          N'existe qu'en mode nominatif, et c'est tout son intérêt : un décompte
          anonyme ne sert à rien pour organiser une sortie. « Sans réponse » est
          affiché aussi — c'est souvent l'information la plus utile. */}
      {named?.status === "ok" &&
        (named.resolutions ?? []).map((r) => (
          <div key={r.id} style={{ ...card, marginTop: 16 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 17 }}>{t("namedAnswersTitle")}</div>
            <div style={{ fontSize: 12.5, color: MUTED, marginTop: 3 }}>{r.question}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 12 }}>
              {r.answers.map((a, i) => {
                const opts = (r.options ?? []) as { name?: string }[];
                const grades = (a.grades ?? {}) as Record<string, number>;
                const picked = Object.keys(grades)
                  .filter((k) => grades[k] > 0)
                  .map((k) => opts[Number(k)]?.name ?? k)
                  .join(", ");
                return (
                  <div key={`${a.name}-${i}`} style={{ display: "flex", alignItems: "center", gap: 10, background: CREAM, border: `2px solid ${INK}`, borderRadius: 11, padding: "9px 12px" }}>
                    <span style={{ fontWeight: 700, fontSize: 14.5, flex: 1 }}>{a.name}</span>
                    <span style={{ fontSize: 13, color: SUBINK, fontWeight: 700 }}>{picked || "—"}</span>
                  </div>
                );
              })}
              {r.pending.length > 0 && (
                <div style={{ fontSize: 13, color: MUTED, marginTop: 4, lineHeight: 1.5 }}>
                  {t("namedPending", { names: r.pending.join(", ") })}
                </div>
              )}
            </div>
          </div>
        ))}

      {/* ---- Résultats ----
          EN SCELLÉ, RIEN AVANT LA CLÔTURE. Le dépouillement était monté dès
          l'ouverture : l'animateur envoyait le lien personnel à UNE personne
          (le bouton « copier le lien » est par convoqué, plus haut), rechargeait,
          et la variation d'une voix ÉTAIT le bulletin de cette personne. Le
          seuil de 5 ne protégeait que le premier affichage, jamais les écarts.
          La base refuse aussi, désormais ; cette garde-ci évite d'afficher un
          cadre vide et de laisser croire à une panne. */}
      {ev.secret_ballot && ev.status === "open" && (
        <div style={{ ...card, marginTop: 18, background: "#eef7ef" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15 }}>🔒 {t("sealedResultsLater")}</div>
          <div style={{ fontSize: 13.5, color: SUBINK, marginTop: 5, lineHeight: 1.5 }}>{t("sealedResultsWhy")}</div>
        </div>
      )}
      {ev.status !== "draft" && (!ev.secret_ballot || ev.status === "closed") && (
        <EventResults
          resolutions={resolutions}
          convenedCount={convened.length}
          quorum={ev.quorum}
          /* Consultation scellée : la lecture directe des bulletins est fermée par
             une policy RESTRICTIVE, la RPC est le seul chemin — et elle refuse tant
             que le seuil de dépouillement n'est pas atteint. */
          getBallots={ev.secret_ballot ? sealedBallots : undefined}
        />
      )}

      {/* ---- Ouverture / clôture ---- */}
      <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {ev.status === "draft" && (
          <button
            onClick={() => (resolutions.length ? setStatus("open") : alert(t("needResolutions")))}
            style={btn(GREENTXT, "#fff")}
          >
            {t("openEvent")}
          </button>
        )}
        {ev.status === "open" && <button onClick={() => setStatus("closed")} style={btn(INK, "#fff")}>{t("closeEvent")}</button>}
        {/* Rouvrir une urne SCELLÉE close rendrait le différentiel possible une
            clôture plus tard : le dépouillement déjà lu sert de point de départ,
            et chaque voix supplémentaire s'en déduit. Le bouton disparaît. */}
        {ev.status === "closed" && !ev.secret_ballot && <button onClick={() => setStatus("open")} style={btn("#fff", INK)}>{t("reopenEvent")}</button>}
        {ev.status !== "open" && (
          <button onClick={onDelete} style={{ marginLeft: "auto", border: "none", background: "none", color: REDTXT, cursor: "pointer", fontSize: 13.5, fontWeight: 700 }}>
            {t("deleteEvent")}
          </button>
        )}
      </div>
      {statusErr && (
        <div role="alert" style={{ marginTop: 12, color: REDTXT, fontWeight: 700, fontSize: 13.5, lineHeight: 1.5 }}>
          {statusErr}
        </div>
      )}
    </OrgShell>
  );
}
