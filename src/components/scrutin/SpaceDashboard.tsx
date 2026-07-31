"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import {
  addMembers,
  updateSpace,
  isChatUrl,
  createEvent,
  deleteSpace,
  getSpace,
  listEvents,
  listMembers,
  removeMember,
  type EventRow,
  type Member,
  type Space,
} from "@/lib/db/events";
import { OrgShell } from "./SpacesHome";
import {
  openCircleConsultation,
  listSegments,
  createSegment,
  deleteSegment,
  listMemberSegments,
  assignSegment,
  unassignSegment,
  type Segment,
} from "@/lib/db/circles";
import { recipeForSystem } from "@/lib/voting/engine";
import { APP_URL } from "@/lib/voting/aiPrompt";
import { CREAM, FONT_BODY, FONT_DISPLAY, GREEN, INK, MUTED, REDTXT, SUBINK } from "./theme";

const card = {
  background: "#fff",
  border: `2.5px solid ${INK}`,
  borderRadius: 18,
  padding: "20px 22px",
  boxShadow: `5px 5px 0 ${INK}`,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RowStatus = "new" | "dup" | "bad";
interface ParsedRow {
  name: string;
  email: string | null;
  weight: number;
  status: RowStatus;
}

// Séparateur deviné : tabulation (collage depuis un tableur), sinon « ; », sinon « , ».
function splitLine(line: string): string[] {
  const sep = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
  return line.split(sep).map((c) => c.trim());
}

// 1re ligne ignorée si elle ressemble à un en-tête de colonnes (et ne contient pas d'@).
function looksLikeHeader(cells: string[]): boolean {
  const j = cells.join(" ").toLowerCase();
  return !j.includes("@") && /\b(nom|name|nombre|e-?mail|courriel|poids|weight|peso)\b/.test(j);
}

// Construit l'aperçu : statut par ligne (nouveau / doublon / email invalide), en
// dédoublonnant par email (sinon par nom) contre le roster ET les lignes précédentes.
function buildPreview(text: string, existing: Member[]): ParsedRow[] {
  const seenEmail = new Set(existing.filter((m) => m.email).map((m) => m.email!.toLowerCase()));
  const seenName = new Set(existing.map((m) => m.name.toLowerCase()));
  const out: ParsedRow[] = [];
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const cells = splitLine(line);
      if (i === 0 && looksLikeHeader(cells)) return;
      const name = cells[0] || "";
      let email: string | null = cells[1] || null;
      const weight = cells[2] ? Math.max(1, parseInt(cells[2], 10) || 1) : 1;
      if (!email && EMAIL_RE.test(name)) email = name; // jeton seul = email
      if (!name) return;
      let status: RowStatus = "new";
      if (email && !EMAIL_RE.test(email)) status = "bad";
      else {
        const key = email ? email.toLowerCase() : null;
        if (key ? seenEmail.has(key) : seenName.has(name.toLowerCase())) status = "dup";
        else if (key) seenEmail.add(key);
        else seenName.add(name.toLowerCase());
      }
      out.push({ name, email, weight, status });
    });
  return out;
}

export default function SpaceDashboard({ spaceId }: { spaceId: string }) {
  const t = useTranslations("Org");
  const locale = useLocale();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [space, setSpace] = useState<Space | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [pitch, setPitch] = useState("");
  const [paceInput, setPaceInput] = useState("");
  const [circleErr, setCircleErr] = useState("");
  const [chatUrl, setChatUrl] = useState("");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [memberSegs, setMemberSegs] = useState<Record<string, string[]>>({});
  const [segName, setSegName] = useState("");
  const [segRanked, setSegRanked] = useState(false);
  // Cible de la prochaine consultation. "" = tout le cercle.
  const [target, setTarget] = useState("");
  const [andAbove, setAndAbove] = useState(true);
  const [copiedJoin, setCopiedJoin] = useState(false);
  const [ask, setAsk] = useState("");
  const [askMsg, setAskMsg] = useState("");
  const [asking, setAsking] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [memberText, setMemberText] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);
  const [delText, setDelText] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [s, m, e] = await Promise.all([getSpace(spaceId), listMembers(spaceId), listEvents(spaceId)]);
      setSpace(s);
      setMembers(m);
      setPitch(s?.pitch ?? "");
      setPaceInput(s?.solicit_per_day == null ? "" : String(s.solicit_per_day));
      setChatUrl(s?.chat_url ?? "");
      setEvents(e);
      const [sg, ms] = await Promise.all([listSegments(spaceId), listMemberSegments(spaceId)]);
      setSegments(sg);
      setMemberSegs(ms);
    } catch {
      /* noop */
    }
  }, [user, spaceId]);
  useEffect(() => {
    load();
  }, [load]);

  const preview = useMemo(() => buildPreview(memberText, members), [memberText, members]);
  const toAdd = preview.filter((p) => p.status === "new");
  const dupCount = preview.filter((p) => p.status === "dup").length;
  const badCount = preview.filter((p) => p.status === "bad").length;

  const onAddMembers = async () => {
    if (!toAdd.length || busy) return;
    setBusy(true);
    try {
      const added = await addMembers(
        spaceId,
        toAdd.map(({ name, email, weight }) => ({ name, email, weight })),
      );
      setMembers((l) => [...l, ...added].sort((a, b) => a.name.localeCompare(b.name)));
      setMemberText("");
    } catch {
      /* noop */
    }
    setBusy(false);
  };

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setMemberText((prev) => (prev.trim() ? `${prev}\n${text}` : text));
  };

  const onRemoveMember = async (id: string) => {
    // Retrait destructif sans undo (un membre du roster = un lead) : on confirme.
    if (typeof window !== "undefined" && !window.confirm(t("confirmRemoveMember"))) return;
    await removeMember(id);
    setMembers((l) => l.filter((m) => m.id !== id));
  };

  const onCreateEvent = async () => {
    if (!eventTitle.trim() || busy) return;
    setBusy(true);
    try {
      const ev = await createEvent(spaceId, { title: eventTitle });
      router.push(`/evenement/${ev.id}`);
    } catch {
      setBusy(false);
    }
  };

  const delMatches = delText.trim() === (space?.name ?? "").trim() && delText.trim().length > 0;
  const onDeleteSpace = async () => {
    if (!delMatches) return;
    await deleteSpace(spaceId);
    router.push("/espaces");
  };

  // ---- Cercle ----
  // Le refus d'ouverture vient de la BASE (déclencheur) : un cercle dont un membre
  // est sans email aurait un membre injoignable, jamais convoqué et sans moyen de
  // se retirer. On présente ce refus tel quel, on ne l'avale pas.
  const saveCircle = async (patch: Parameters<typeof updateSpace>[1]) => {
    if (!space) return;
    setCircleErr("");
    try {
      await updateSpace(space.id, patch);
      setSpace({ ...space, ...patch } as typeof space);
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? "");
      setCircleErr(msg.includes("circle_members_without_email") ? t("circleNeedEmails") : t("circleSaveError"));
    }
  };

  /**
   * Ouvrir une consultation. UN SEUL bouton, et surtout : aucun choix de
   * destinataires. C'est la RPC qui convoque tout le roster — pouvoir désigner
   * qui répond suffirait à lever le secret (on convoque une personne, on lit le
   * bulletin qui arrive). Les refus viennent de la base et sont affichés tels quels.
   */
  const openConsultation = async () => {
    if (!space || asking) return;
    const question = ask.trim();
    if (!question) return;
    setAsking(true);
    setAskMsg("");
    try {
      const r = await openCircleConsultation({
        spaceId: space.id,
        question,
        options: [t("presetFor"), t("presetAgainst"), t("presetAbstain")].map((name) => ({ name })),
        recipe: recipeForSystem("fptp"),
        segmentIds: targetIds(),
      });
      if (r.status === "ok") {
        setAsk("");
        await load();
        router.push(`/evenement/${r.event_id}`);
      } else if (r.status === "capped") {
        setAskMsg(t("askCapped", { cap: r.cap ?? 1 }));
      } else if (r.status === "too_small") {
        // Le motif nomme le PUBLIC visé : « Avancé compte 3 membres » est
        // actionnable, « le cercle compte 3 membres » serait faux et déroutant.
        setAskMsg(
          r.audience
            ? t("askTooSmallSegment", { audience: r.audience, n: r.roster ?? 0, min: r.min ?? 5 })
            : t("askTooSmall", { n: r.roster ?? 0, min: r.min ?? 5 }),
        );
      } else {
        setAskMsg(t("circleSaveError"));
      }
    } catch {
      setAskMsg(t("circleSaveError"));
    }
    setAsking(false);
  };

  // Le lien de conversation. Vidé = retiré. La liste blanche d'hôtes est doublée
  // en base par une contrainte CHECK : ce bouton portera le nom du cercle auprès
  // des membres, il ne doit pas pouvoir mener ailleurs.
  /**
   * Cible effective : la liste d'identifiants de segments envoyée à la base.
   * C'est ICI que l'échelle se traduit — la RPC ne connaît QUE des segments,
   * jamais un rang. « Standard et au-dessus » devient [Standard, Avancé].
   */
  const targetIds = (): string[] => {
    if (!target) return [];
    const seg = segments.find((g) => g.id === target);
    if (!seg) return [];
    if (andAbove && seg.rank != null) {
      return segments.filter((g) => g.rank != null && g.rank >= seg.rank!).map((g) => g.id);
    }
    return [seg.id];
  };

  const addSegment = async () => {
    const name = segName.trim();
    if (!space || !name) return;
    try {
      // Un groupe qui numérote ses segments déclare une échelle ; sinon ce sont
      // des étiquettes sans ordre. Le choix est fait au premier segment créé.
      const rank = segRanked ? segments.length + 1 : null;
      const seg = await createSegment(space.id, name, rank, segments.length);
      setSegments((l) => [...l, seg]);
      setSegName("");
    } catch {
      setCircleErr(t("segmentDuplicate"));
    }
  };

  const removeSegment = async (id: string) => {
    if (typeof window !== "undefined" && !window.confirm(t("segmentRemoveConfirm"))) return;
    await deleteSegment(id);
    setSegments((l) => l.filter((g) => g.id !== id));
    setMemberSegs((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.filter((x) => x !== id)])));
    if (target === id) setTarget("");
  };

  const toggleMemberSegment = async (memberId: string, segmentId: string, on: boolean) => {
    if (on) await assignSegment(memberId, segmentId);
    else await unassignSegment(memberId, segmentId);
    setMemberSegs((m) => {
      const cur = m[memberId] ?? [];
      return { ...m, [memberId]: on ? [...cur, segmentId] : cur.filter((x) => x !== segmentId) };
    });
  };

  const saveChatUrl = () => {
    const raw = chatUrl.trim();
    if (raw && !isChatUrl(raw)) {
      setCircleErr(t("chatUrlInvalid"));
      return;
    }
    setCircleErr("");
    void saveCircle({ chat_url: raw || null });
  };

  const savePace = () => {
    const raw = paceInput.trim();
    // Vide = aucun engagement (NULL en base) : la page d'adhésion n'affichera
    // alors aucun chiffre, plutôt qu'une promesse que ce cercle n'a pas faite.
    const n = raw === "" ? null : Math.min(50, Math.max(1, parseInt(raw, 10) || 1));
    setPaceInput(n == null ? "" : String(n));
    void saveCircle({ solicit_per_day: n });
  };

  if (loading) return <OrgShell><div style={{ ...card, color: MUTED }}>{t("loading")}</div></OrgShell>;
  if (!user) return <OrgShell><div style={card}>{t("signInPrompt")}</div></OrgShell>;

  return (
    <OrgShell>
      <Link href="/espaces" style={{ color: SUBINK, fontWeight: 700, textDecoration: "none", fontSize: 14 }}>{t("back")}</Link>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: "clamp(26px,5vw,36px)", letterSpacing: "-0.03em", margin: "10px 0 0" }}>
        {space?.name ?? "…"}
      </h1>
      <p style={{ fontSize: 14.5, color: SUBINK, lineHeight: 1.5, marginTop: 8, maxWidth: "62ch" }}>{t("spaceDashSubtitle")}</p>

      {/* ---- Corps électoral (roster) ---- */}
      <div style={{ ...card, marginTop: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19 }}>{t("members")}</div>
          <div style={{ color: SUBINK, fontWeight: 700, fontSize: 14 }}>{t("memberCount", { count: members.length })}</div>
        </div>
        <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4 }}>{t("membersSubtitle")}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 14 }}>
          {!members.length && <div style={{ color: MUTED, fontSize: 14 }}>{t("noMembers")}</div>}
          {members.map((m) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, background: CREAM, border: `2px solid ${INK}`, borderRadius: 11, padding: "9px 12px" }}>
              <span style={{ fontWeight: 700, fontSize: 14.5, flex: 1 }}>{m.name}</span>
              {/* D'où vient ce membre, et depuis quand. Un adhérent volontaire et
                  une ligne importée n'ont pas le même statut : la distinction doit
                  être visible pour celui qui écrit au cercle. */}
              {m.self_joined && (
                <span title={m.consent_at ? t("consentOn", { date: new Date(m.consent_at).toLocaleDateString(locale) }) : undefined}
                      style={{ fontSize: 11, fontWeight: 800, color: GREEN, border: `1.5px solid ${GREEN}`, borderRadius: 7, padding: "1px 6px", whiteSpace: "nowrap" }}>
                  {t("tagSelfJoined")}
                </span>
              )}
              {!m.self_joined && m.consent_source === "import" && (
                <span title={m.consent_at ? t("consentAdded", { date: new Date(m.consent_at).toLocaleDateString(locale) }) : undefined}
                      style={{ fontSize: 11, fontWeight: 800, color: MUTED, border: `1.5px solid ${MUTED}`, borderRadius: 7, padding: "1px 6px", whiteSpace: "nowrap" }}>
                  {t("tagImported")}
                </span>
              )}
              {m.email && <span style={{ color: MUTED, fontSize: 12.5 }}>{m.email}</span>}
              {m.weight > 1 && <span style={{ color: SUBINK, fontSize: 12.5, fontWeight: 700 }}>×{m.weight}</span>}
              {/* Segments du membre. Visibles sur la ligne : c'est ce qui décide
                  qui reçoit quoi, ça ne doit pas être caché dans un sous-écran. */}
              {segments.length > 0 && (
                <span style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                  {(memberSegs[m.id] ?? []).map((sid) => {
                    const seg = segments.find((g) => g.id === sid);
                    if (!seg) return null;
                    return (
                      <button
                        key={sid}
                        onClick={() => toggleMemberSegment(m.id, sid, false)}
                        title={t("segmentRemoveFrom")}
                        style={{ fontSize: 11, fontWeight: 800, color: INK, border: `1.5px solid ${INK}`, background: "#fff", borderRadius: 7, padding: "1px 6px", cursor: "pointer", whiteSpace: "nowrap" }}
                      >
                        {seg.name} ×
                      </button>
                    );
                  })}
                  <select
                    value=""
                    onChange={(e) => e.target.value && toggleMemberSegment(m.id, e.target.value, true)}
                    style={{ fontSize: 11.5, fontFamily: FONT_BODY, border: `1.5px solid ${MUTED}`, borderRadius: 7, padding: "2px 4px", background: "#fff", color: SUBINK, cursor: "pointer" }}
                  >
                    <option value="">{t("segmentAdd")}</option>
                    {segments
                      .filter((g) => !(memberSegs[m.id] ?? []).includes(g.id))
                      .map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                  </select>
                </span>
              )}
              <button onClick={() => onRemoveMember(m.id)} title={t("remove")} style={{ border: "none", background: "none", color: REDTXT, cursor: "pointer", fontSize: 17, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: SUBINK }}>{t("addMembersTitle")}</div>
          <div style={{ fontSize: 12, color: MUTED, margin: "3px 0 7px" }}>{t("addMembersHint")}</div>
          <textarea
            value={memberText}
            onChange={(e) => setMemberText(e.target.value)}
            placeholder={t("addMembersPlaceholder")}
            rows={3}
            style={{ width: "100%", fontFamily: FONT_BODY, fontSize: 14, padding: "10px 12px", border: `2px solid ${INK}`, borderRadius: 11, resize: "vertical" }}
          />

          {preview.length > 0 && (
            <div style={{ marginTop: 9, border: `2px solid ${INK}`, borderRadius: 11, overflow: "hidden" }}>
              <div style={{ maxHeight: 188, overflowY: "auto" }}>
                {preview.map((p, i) => {
                  const bad = p.status === "bad";
                  const dup = p.status === "dup";
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 11px", borderTop: i ? "1px solid #EEE7D6" : "none", background: bad ? "#fdecec" : dup ? "#f6f3ea" : "#fff", opacity: dup ? 0.75 : 1 }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: bad ? REDTXT : INK, flex: 1, textDecoration: dup ? "line-through" : "none" }}>{p.name}</span>
                      {p.email && <span style={{ fontSize: 12, color: bad ? REDTXT : MUTED }}>{p.email}</span>}
                      {p.weight > 1 && <span style={{ fontSize: 12, color: SUBINK, fontWeight: 700 }}>×{p.weight}</span>}
                      {bad && <span style={{ fontSize: 11, fontWeight: 800, color: REDTXT }}>{t("tagInvalid")}</span>}
                      {dup && <span style={{ fontSize: 11, fontWeight: 700, color: MUTED }}>{t("tagDuplicate")}</span>}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: "8px 11px", background: CREAM, borderTop: `2px solid ${INK}`, fontSize: 12.5, fontWeight: 700 }}>
                <span style={{ color: INK }}>{t("previewAdd", { count: toAdd.length })}</span>
                {dupCount > 0 && <span style={{ color: MUTED }}>{t("previewDup", { count: dupCount })}</span>}
                {badCount > 0 && <span style={{ color: REDTXT }}>{t("previewBad", { count: badCount })}</span>}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
            <button
              onClick={onAddMembers}
              disabled={busy || !toAdd.length}
              className="dc-bright"
              style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14.5, cursor: toAdd.length ? "pointer" : "not-allowed", border: `2.5px solid ${INK}`, background: toAdd.length ? "#FFB627" : "#EFE8D6", color: INK, padding: "10px 18px", borderRadius: 11, opacity: toAdd.length ? 1 : 0.65 }}
            >
              {toAdd.length ? t("addMembersN", { count: toAdd.length }) : t("addMembers")}
            </button>
            <label style={{ fontSize: 13, fontWeight: 700, color: SUBINK, cursor: "pointer", textDecoration: "underline" }}>
              {t("importFile")}
              <input
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={(e) => {
                  onImportFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
                style={{ display: "none" }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* ---- Cercle ---- */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19 }}>{t("circle")}</div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13.5, fontWeight: 700, color: SUBINK }}>
            <input
              type="checkbox"
              checked={space?.join_open ?? false}
              onChange={(e) => saveCircle({ join_open: e.target.checked })}
              style={{ width: 17, height: 17, accentColor: INK }}
            />
            {t("circleOpen")}
          </label>
        </div>
        <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4, lineHeight: 1.5 }}>{t("circleSubtitle")}</div>

        {circleErr && (
          <div style={{ marginTop: 10, color: REDTXT, fontWeight: 700, fontSize: 13, lineHeight: 1.45 }}>{circleErr}</div>
        )}

        {space?.join_open && (
          <>
            <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <code style={{ flex: "1 1 240px", minWidth: 0, overflowX: "auto", whiteSpace: "nowrap", fontSize: 12.5, background: "#f6f6f4", border: `2px solid ${INK}`, borderRadius: 10, padding: "9px 11px" }}>
                {`${APP_URL}/cercle/${space.join_token}`}
              </code>
              <button
                onClick={() => {
                  void navigator.clipboard?.writeText(`${APP_URL}/cercle/${space.join_token}`);
                  setCopiedJoin(true);
                  setTimeout(() => setCopiedJoin(false), 1600);
                }}
                style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 13.5, cursor: "pointer", border: `2.5px solid ${INK}`, background: copiedJoin ? GREEN : "#fff", color: copiedJoin ? "#fff" : INK, padding: "9px 14px", borderRadius: 10 }}
              >
                {copiedJoin ? t("copied") : t("copyLink")}
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
              <div style={{ fontSize: 12, color: MUTED, marginTop: 4, lineHeight: 1.45 }}>{t("chatUrlHint")}</div>
            </div>

            <textarea
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              onBlur={() => saveCircle({ pitch })}
              placeholder={t("circlePitchPlaceholder")}
              rows={2}
              style={{ width: "100%", marginTop: 10, fontFamily: FONT_BODY, fontSize: 14, padding: "10px 12px", border: `2px solid ${INK}`, borderRadius: 11, resize: "vertical" }}
            />

            {/* ---- Segments ----
                Placet n'impose aucun vocabulaire : le groupe nomme les siens.
                L'échelle (rang) est une OPTION, décidée au premier segment. */}
            <div style={{ marginTop: 14, borderTop: `2px dashed ${INK}22`, paddingTop: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 14.5, fontFamily: FONT_DISPLAY }}>{t("segmentsTitle")}</div>
              <div style={{ fontSize: 12.5, color: MUTED, marginTop: 3, lineHeight: 1.45 }}>{t("segmentsHint")}</div>
              {segments.length > 0 && (
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}>
                  {segments.map((g) => (
                    <span key={g.id} style={{ display: "inline-flex", alignItems: "center", gap: 7, border: `2px solid ${INK}`, borderRadius: 9, padding: "5px 9px", fontSize: 13, fontWeight: 700 }}>
                      {g.rank != null && <span style={{ color: MUTED, fontSize: 11.5 }}>{g.rank}</span>}
                      {g.name}
                      <button onClick={() => removeSegment(g.id)} title={t("remove")} style={{ border: "none", background: "none", color: REDTXT, cursor: "pointer", fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 9, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  value={segName}
                  onChange={(e) => setSegName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSegment()}
                  placeholder={t("segmentPlaceholder")}
                  style={{ flex: 1, minWidth: 170, fontFamily: FONT_BODY, fontSize: 14, padding: "9px 12px", border: `2px solid ${INK}`, borderRadius: 10 }}
                />
                <button onClick={addSegment} disabled={!segName.trim()} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 13.5, cursor: segName.trim() ? "pointer" : "not-allowed", border: `2.5px solid ${INK}`, background: "#fff", color: INK, padding: "9px 14px", borderRadius: 10, opacity: segName.trim() ? 1 : 0.5 }}>
                  {t("segmentAddCta")}
                </button>
              </div>
              {segments.length === 0 && (
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9, fontSize: 12.5, color: SUBINK, cursor: "pointer" }}>
                  <input type="checkbox" checked={segRanked} onChange={(e) => setSegRanked(e.target.checked)} style={{ width: 15, height: 15, accentColor: INK }} />
                  {t("segmentRanked")}
                </label>
              )}
            </div>

            {/* ---- Interroger le cercle : un seul bouton, aucun choix de destinataires ---- */}
            <div style={{ marginTop: 14, borderTop: `2px dashed ${INK}22`, paddingTop: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 14.5, fontFamily: FONT_DISPLAY }}>{t("askTitle")}</div>
              <div style={{ fontSize: 12.5, color: MUTED, marginTop: 3, lineHeight: 1.45 }}>{t("askSubtitle")}</div>
              {segments.length > 0 && (
                <div style={{ display: "flex", gap: 9, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: SUBINK }}>{t("askAudience")}</span>
                  <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, padding: "8px 10px", border: `2px solid ${INK}`, borderRadius: 10, background: "#fff" }}
                  >
                    <option value="">{t("askAudienceAll")}</option>
                    {segments.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  {/* N'apparaît que si le segment visé appartient à une échelle. */}
                  {target && segments.find((g) => g.id === target)?.rank != null && (
                    <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: SUBINK, cursor: "pointer" }}>
                      <input type="checkbox" checked={andAbove} onChange={(e) => setAndAbove(e.target.checked)} style={{ width: 15, height: 15, accentColor: INK }} />
                      {t("askAudienceAndAbove")}
                    </label>
                  )}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <input
                  value={ask}
                  onChange={(e) => setAsk(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && openConsultation()}
                  placeholder={t("askPlaceholder")}
                  style={{ flex: 1, minWidth: 220, fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, padding: "11px 13px", border: `2px solid ${INK}`, borderRadius: 11 }}
                />
                <button
                  onClick={openConsultation}
                  disabled={asking || !ask.trim()}
                  className="dc-bright"
                  style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14.5, cursor: asking || !ask.trim() ? "not-allowed" : "pointer", border: `2.5px solid ${INK}`, background: INK, color: "#fff", padding: "11px 18px", borderRadius: 11, opacity: asking || !ask.trim() ? 0.5 : 1 }}
                >
                  {asking ? t("asking") : t("askCta")}
                </button>
              </div>
              {askMsg && (
                <div style={{ marginTop: 9, color: REDTXT, fontWeight: 700, fontSize: 13, lineHeight: 1.45 }}>{askMsg}</div>
              )}
            </div>

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
              </span>
            </div>
          </>
        )}
      </div>

      {/* ---- Événements ---- */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19 }}>{t("events")}</div>
        <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4 }}>{t("eventsSubtitle")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {!events.length && <div style={{ color: MUTED, fontSize: 14 }}>{t("noEvents")}</div>}
          {events.map((e) => (
            <Link key={e.id} href={`/evenement/${e.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: CREAM, border: `2px solid ${INK}`, borderRadius: 11, padding: "11px 13px", textDecoration: "none", color: INK }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{e.title}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: SUBINK, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {t(e.status === "open" ? "statusOpen" : e.status === "closed" ? "statusClosed" : "statusDraft")}
              </span>
            </Link>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <input
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onCreateEvent()}
            placeholder={t("newEventPlaceholder")}
            style={{ flex: 1, minWidth: 220, fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, padding: "11px 13px", border: `2px solid ${INK}`, borderRadius: 11 }}
          />
          <button onClick={onCreateEvent} disabled={busy} className="dc-bright" style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14.5, cursor: "pointer", border: `2.5px solid ${INK}`, background: INK, color: "#fff", padding: "11px 18px", borderRadius: 11 }}>
            {t("createEvent")}
          </button>
        </div>
      </div>

      {!delConfirm ? (
        <button onClick={() => setDelConfirm(true)} style={{ marginTop: 22, border: "none", background: "none", color: REDTXT, cursor: "pointer", fontSize: 13.5, fontWeight: 700 }}>
          {t("deleteSpace")}
        </button>
      ) : (
        <div style={{ ...card, marginTop: 22, borderColor: REDTXT, boxShadow: `5px 5px 0 ${REDTXT}` }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16, color: REDTXT }}>{t("deleteSpace")}</div>
          <div style={{ fontSize: 13.5, color: SUBINK, margin: "8px 0 10px", lineHeight: 1.5 }}>{t("deleteSpaceConfirm", { name: space?.name ?? "" })}</div>
          <input
            value={delText}
            onChange={(e) => setDelText(e.target.value)}
            placeholder={space?.name ?? ""}
            style={{ width: "100%", fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, padding: "10px 12px", border: `2px solid ${INK}`, borderRadius: 11 }}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => { setDelConfirm(false); setDelText(""); }}
              style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14, cursor: "pointer", border: `2.5px solid ${INK}`, background: "#fff", color: INK, padding: "10px 16px", borderRadius: 11 }}
            >
              {t("deleteCancel")}
            </button>
            <button
              onClick={onDeleteSpace}
              disabled={!delMatches}
              style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14, cursor: delMatches ? "pointer" : "not-allowed", border: `2.5px solid ${INK}`, background: REDTXT, color: "#fff", padding: "10px 16px", borderRadius: 11, opacity: delMatches ? 1 : 0.5 }}
            >
              {t("deleteSpaceFinal")}
            </button>
          </div>
        </div>
      )}
    </OrgShell>
  );
}
