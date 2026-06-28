"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import {
  addMembers,
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
import { CREAM, FONT_BODY, FONT_DISPLAY, INK, MUTED, REDTXT, SUBINK } from "./theme";

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
      let name = cells[0] || "";
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
  const router = useRouter();
  const { user, loading } = useAuth();
  const [space, setSpace] = useState<Space | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [memberText, setMemberText] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [s, m, e] = await Promise.all([getSpace(spaceId), listMembers(spaceId), listEvents(spaceId)]);
      setSpace(s);
      setMembers(m);
      setEvents(e);
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

  const onDeleteSpace = async () => {
    if (!confirm(t("confirmDeleteSpace"))) return;
    await deleteSpace(spaceId);
    router.push("/espaces");
  };

  if (loading) return <OrgShell><div style={{ ...card, color: MUTED }}>{t("loading")}</div></OrgShell>;
  if (!user) return <OrgShell><div style={card}>{t("signInPrompt")}</div></OrgShell>;

  return (
    <OrgShell>
      <Link href="/espaces" style={{ color: SUBINK, fontWeight: 700, textDecoration: "none", fontSize: 14 }}>{t("back")}</Link>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: "clamp(26px,5vw,36px)", letterSpacing: "-0.03em", margin: "10px 0 0" }}>
        {space?.name ?? "…"}
      </h1>

      {/* ---- Corps électoral (roster) ---- */}
      <div style={{ ...card, marginTop: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19 }}>{t("members")}</div>
          <div style={{ color: SUBINK, fontWeight: 700, fontSize: 14 }}>{t("memberCount", { count: members.length })}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 14 }}>
          {!members.length && <div style={{ color: MUTED, fontSize: 14 }}>{t("noMembers")}</div>}
          {members.map((m) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, background: CREAM, border: `2px solid ${INK}`, borderRadius: 11, padding: "9px 12px" }}>
              <span style={{ fontWeight: 700, fontSize: 14.5, flex: 1 }}>{m.name}</span>
              {m.email && <span style={{ color: MUTED, fontSize: 12.5 }}>{m.email}</span>}
              {m.weight > 1 && <span style={{ color: SUBINK, fontSize: 12.5, fontWeight: 700 }}>×{m.weight}</span>}
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

      {/* ---- Événements ---- */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19 }}>{t("events")}</div>
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

      <button onClick={onDeleteSpace} style={{ marginTop: 22, border: "none", background: "none", color: REDTXT, cursor: "pointer", fontSize: 13.5, fontWeight: 700 }}>
        {t("deleteSpace")}
      </button>
    </OrgShell>
  );
}
