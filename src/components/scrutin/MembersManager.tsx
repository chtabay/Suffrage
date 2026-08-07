"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import {
  addMembers,
  getSpace,
  listMembers,
  removeMember,
  type Member,
  type Space,
} from "@/lib/db/events";
import {
  assignSegment,
  createSegment,
  deleteSegment,
  listMemberSegments,
  listSegments,
  unassignSegment,
  updateSegment,
  type Segment,
} from "@/lib/db/circles";
import { intlLocale } from "@/i18n/locales";
import { OrgShell } from "./SpacesHome";
import { CREAM, FONT_BODY, FONT_DISPLAY, GREENTXT, INK, MUTED, PAPER, REDTXT, SUBINK, YELLOW } from "./theme";

const card = {
  background: PAPER,
  border: `2.5px solid ${INK}`,
  borderRadius: 18,
  padding: "20px 22px",
  boxShadow: `5px 5px 0 ${INK}`,
} as const;

// Teintes de l'APERÇU d'import (ligne en erreur, ligne en doublon, filet de
// séparation) et fond du bouton inerte. Ce ne sont pas des couleurs de marque :
// ce sont les tokens DÉLAVÉS. On les COMPOSE donc à partir de theme.ts au lieu
// d'en recopier les hexadécimaux — sinon un changement d'encre laisserait ici
// quatre valeurs orphelines que personne ne penserait à suivre.
// Si `color-mix` manque au navigateur, la déclaration tombe et le fond revient
// à celui de la carte : exactement le cas neutre.
const TINT = {
  bad: `color-mix(in srgb, ${REDTXT} 9%, ${PAPER})`,
  dup: `color-mix(in srgb, ${INK} 3%, ${CREAM})`,
  rule: `color-mix(in srgb, ${INK} 8%, ${CREAM})`,
  disabled: `color-mix(in srgb, ${INK} 10%, ${CREAM})`,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Seuil appliqué EN BASE au bulletin scellé. On l'affiche ici, où il se corrige. */
const SEALED_MIN = 5;

/** Une page de liste. 200 lignes montées d'un coup, c'est la page qui rame. */
const PAGE = 50;

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

// Repli de casse ET de diacritiques : « Mémé » doit se trouver en tapant « meme ».
// Une recherche qui ignore les accents est la seule qui marche sur des noms français
// saisis au clavier d'un téléphone.
function fold(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Le doublon de segment est une violation d'index unique, PAS un synonyme
// d'« échec ». Confondre les deux fait dire « ce segment existe déjà » à
// quelqu'un dont la connexion vient de tomber : il cherche alors un segment
// qui n'existe pas.
function isDuplicateError(e: unknown): boolean {
  const err = e as { message?: string; details?: string; code?: string } | null;
  const msg = `${err?.message ?? ""} ${err?.details ?? ""} ${err?.code ?? ""}`.toLowerCase();
  return msg.includes("scrutin_segments_space_name_key") || msg.includes("duplicate") || msg.includes("23505");
}

type Facet = { kind: "all" } | { kind: "segment"; id: string } | { kind: "no-segment" } | { kind: "no-email" };

export default function MembersManager({ spaceId }: { spaceId: string }) {
  const t = useTranslations("Org");
  const locale = useLocale();
  const { user, loading } = useAuth();

  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [space, setSpace] = useState<Space | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [memberSegs, setMemberSegs] = useState<Record<string, string[]>>({});
  // Les segments peuvent tomber sans que le roster tombe : on le dit, plutôt que
  // de faire disparaître une bande entière comme si le cercle n'en avait aucun.
  const [segsDown, setSegsDown] = useState(false);

  const [segName, setSegName] = useState("");
  const [segRanked, setSegRanked] = useState(false);
  const [segErr, setSegErr] = useState("");
  const [saved, setSaved] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  const [search, setSearch] = useState("");
  const [facet, setFacet] = useState<Facet>({ kind: "all" });
  const [limit, setLimit] = useState(PAGE);

  // Le sélecteur de segment n'existe qu'à UN endroit du document à la fois :
  // l'identifiant du membre en cours d'édition, ou nul. Monter un select par
  // ligne, c'est 200 × 12 options construites pour un geste qui, statistiquement,
  // n'arrive jamais.
  const [segEditing, setSegEditing] = useState<string | null>(null);
  const [rowErr, setRowErr] = useState<{ id: string; msg: string } | null>(null);

  const [memberText, setMemberText] = useState("");
  const [addErr, setAddErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(true);
  const didInit = useRef(false);

  const tick = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  // Le tag BCP-47 passe par `intlLocale`, comme partout ailleurs : la locale de
  // l'app (« pcm ») n'est pas un tag qu'`Intl` sait résoudre, et la date de
  // consentement sortirait au format du navigateur au lieu de celui du cercle.
  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", year: "numeric" }),
    [locale],
  );

  const load = useCallback(async () => {
    if (!user) return;
    setStatus("loading");
    try {
      const [s, m] = await Promise.all([getSpace(spaceId), listMembers(spaceId)]);
      setSpace(s);
      setMembers(m);
      if (!didInit.current) {
        didInit.current = true;
        setAddOpen(m.length === 0);
      }
      try {
        const [sg, ms] = await Promise.all([listSegments(spaceId), listMemberSegments(spaceId)]);
        setSegments(sg);
        setMemberSegs(ms);
        setSegsDown(false);
      } catch {
        setSegsDown(true);
      }
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [user, spaceId]);
  useEffect(() => {
    load();
  }, [load]);

  // La facette est LUE au montage : le tableau de bord envoie ici avec un filtre
  // pré-réglé (« 12 sans adresse » → la liste de ces 12). Lecture directe de
  // window.location : useSearchParams imposerait une frontière Suspense à la page
  // serveur, qui n'en a pas, et le build tomberait au prerender.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    const seg = q.get("segment");
    const f = q.get("filtre");
    if (seg) setFacet({ kind: "segment", id: seg });
    else if (f === "sans-segment") setFacet({ kind: "no-segment" });
    else if (f === "sans-adresse") setFacet({ kind: "no-email" });
  }, []);

  // replaceState et non pushState : le bouton retour doit ramener au tableau de
  // bord, pas rejouer douze états de filtre. La RECHERCHE, elle, n'entre jamais
  // dans l'URL — une chaîne saisie dans « chercher un nom » est une donnée
  // personnelle, et une URL finit collée dans une conversation.
  const pickFacet = (f: Facet) => {
    setFacet(f);
    setLimit(PAGE);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("segment");
    url.searchParams.delete("filtre");
    if (f.kind === "segment") url.searchParams.set("segment", f.id);
    else if (f.kind === "no-segment") url.searchParams.set("filtre", "sans-segment");
    else if (f.kind === "no-email") url.searchParams.set("filtre", "sans-adresse");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const segOf = useCallback((id: string) => memberSegs[id] ?? [], [memberSegs]);

  const counts = useMemo(() => {
    const bySeg: Record<string, number> = {};
    let noSeg = 0;
    let noEmail = 0;
    let selfJoined = 0;
    for (const m of members) {
      const s = memberSegs[m.id] ?? [];
      if (!s.length) noSeg += 1;
      for (const id of s) bySeg[id] = (bySeg[id] ?? 0) + 1;
      // `.trim()` comme le tableau de bord : une adresse vide n'est pas une
      // adresse, et les deux écrans doivent annoncer le MÊME chiffre.
      if (!m.email?.trim()) noEmail += 1;
      if (m.self_joined) selfJoined += 1;
    }
    return { bySeg, noSeg, noEmail, selfJoined };
  }, [members, memberSegs]);

  const filtered = useMemo(() => {
    const q = fold(search.trim());
    return members.filter((m) => {
      const segs = memberSegs[m.id] ?? [];
      if (facet.kind === "segment" && !segs.includes(facet.id)) return false;
      if (facet.kind === "no-segment" && segs.length) return false;
      if (facet.kind === "no-email" && m.email?.trim()) return false;
      if (!q) return true;
      return fold(m.name).includes(q) || fold(m.email ?? "").includes(q);
    });
  }, [members, memberSegs, facet, search]);

  const shown = filtered.slice(0, limit);
  const rest = Math.max(0, filtered.length - shown.length);
  const filtering = search.trim().length > 0 || facet.kind !== "all";

  const clearFilters = () => {
    setSearch("");
    pickFacet({ kind: "all" });
  };

  const preview = useMemo(() => buildPreview(memberText, members), [memberText, members]);
  const toAdd = preview.filter((p) => p.status === "new");
  const dupCount = preview.filter((p) => p.status === "dup").length;
  const badCount = preview.filter((p) => p.status === "bad").length;

  // ---------------------------------------------------------------- écritures
  // Règle commune : l'état local n'est appliqué QU'AU SUCCÈS, et l'erreur se pose
  // au contact de son champ. Un écran qui affirme un rattachement que la base n'a
  // pas envoie ensuite la consultation à un segment amputé.

  const onAddMembers = async () => {
    if (!toAdd.length || busy) return;
    setBusy(true);
    setAddErr("");
    try {
      const added = await addMembers(
        spaceId,
        toAdd.map(({ name, email, weight }) => ({ name, email, weight })),
      );
      setMembers((l) => [...l, ...added].sort((a, b) => a.name.localeCompare(b.name)));
      setMemberText("");
    } catch {
      setAddErr(t("writeError"));
    }
    setBusy(false);
  };

  // `file.text()` REJETTE sur un fichier illisible (déplacé, verrouillé, clé USB
  // retirée). Sans garde, la promesse partait non traitée : le fichier était
  // choisi, la zone de texte restait vide, et rien à l'écran ne le disait.
  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    setAddErr("");
    try {
      const text = await file.text();
      setMemberText((prev) => (prev.trim() ? `${prev}\n${text}` : text));
    } catch {
      setAddErr(t("writeError"));
    }
  };

  const onRemoveMember = async (m: Member) => {
    // Retrait destructif sans undo (un membre du roster = un lead) : on confirme.
    if (typeof window !== "undefined" && !window.confirm(t("confirmRemoveMember"))) return;
    setRowErr(null);
    try {
      await removeMember(m.id);
      setMembers((l) => l.filter((x) => x.id !== m.id));
    } catch {
      setRowErr({ id: m.id, msg: t("writeError") });
    }
  };

  const addSegment = async () => {
    const name = segName.trim();
    if (!space || !name) return;
    setSegErr("");
    try {
      // Un cercle qui numérote ses segments déclare une échelle ; sinon ce sont
      // des étiquettes sans ordre. Le choix est fait au premier segment créé.
      const rank = segRanked ? segments.length + 1 : null;
      const seg = await createSegment(space.id, name, rank, segments.length);
      setSegments((l) => [...l, seg]);
      setSegName("");
      tick();
    } catch (e) {
      setSegErr(isDuplicateError(e) ? t("segmentDuplicate") : t("writeError"));
    }
  };

  const commitRename = async (seg: Segment) => {
    const name = renameText.trim();
    setRenaming(null);
    if (!name || name === seg.name) return;
    setSegErr("");
    try {
      await updateSegment(seg.id, { name });
      setSegments((l) => l.map((g) => (g.id === seg.id ? { ...g, name } : g)));
      tick();
    } catch (e) {
      setSegErr(isDuplicateError(e) ? t("segmentDuplicate") : t("writeError"));
    }
  };

  const removeSegment = async (seg: Segment) => {
    if (typeof window !== "undefined" && !window.confirm(t("segmentRemoveConfirm"))) return;
    setSegErr("");
    try {
      await deleteSegment(seg.id);
      setSegments((l) => l.filter((g) => g.id !== seg.id));
      setMemberSegs((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.filter((x) => x !== seg.id)])));
      if (facet.kind === "segment" && facet.id === seg.id) pickFacet({ kind: "all" });
    } catch {
      setSegErr(t("writeError"));
    }
  };

  const setMemberSegment = async (m: Member, segmentId: string, on: boolean) => {
    setRowErr(null);
    try {
      if (on) await assignSegment(m.id, segmentId);
      else await unassignSegment(m.id, segmentId);
      setMemberSegs((prev) => {
        const cur = prev[m.id] ?? [];
        return { ...prev, [m.id]: on ? [...cur, segmentId] : cur.filter((x) => x !== segmentId) };
      });
    } catch {
      setRowErr({ id: m.id, msg: t("writeError") });
      // Après un échec, l'écran ne doit plus rien affirmer de son cru : on
      // reprend l'état des rattachements à la source.
      try {
        setMemberSegs(await listMemberSegments(spaceId));
      } catch {
        /* la ligne porte déjà son erreur */
      }
    }
  };

  // ------------------------------------------------------------ sorties avant rendu
  if (loading || (user && status === "loading"))
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
  if (status === "error")
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

  const facetBtn = (active: boolean, key: string, label: string, ariaLabel: string, onClick: () => void) => (
    <button
      key={key}
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 13.5, cursor: "pointer", border: `2.5px solid ${INK}`, background: active ? INK : PAPER, color: active ? PAPER : INK, padding: "10px 15px", borderRadius: 11 }}
    >
      {label}
    </button>
  );

  return (
    <OrgShell>
      <Link href={`/espaces/${spaceId}`} style={{ color: SUBINK, fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
        {t("backToSpace")}
      </Link>
      <div style={{ marginTop: 12, fontSize: 13, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>{space.name}</div>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: "clamp(26px,5vw,36px)", letterSpacing: "-0.03em", margin: "4px 0 0" }}>
        {t("members")}
      </h1>
      <p style={{ fontSize: 14.5, color: SUBINK, lineHeight: 1.5, marginTop: 8, maxWidth: "62ch" }}>{t("membersSubtitle")}</p>

      {/* Les chiffres de tête. aria-live : ils bougent à chaque ajout ou retrait,
          et c'est la seule confirmation qu'un lecteur d'écran reçoive. */}
      <div aria-live="polite" style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 12, fontSize: 13.5, fontWeight: 700, color: SUBINK }}>
        <span style={{ color: INK }}>{t("memberCount", { count: members.length })}</span>
        {counts.selfJoined > 0 && <span style={{ color: GREENTXT }}>{t("statSelfJoined", { count: counts.selfJoined })}</span>}
        {counts.noEmail > 0 && <span style={{ color: REDTXT }}>{t("statNoEmail", { count: counts.noEmail })}</span>}
        {counts.noSeg > 0 && segments.length > 0 && <span style={{ color: MUTED }}>{t("statNoSegment", { count: counts.noSeg })}</span>}
      </div>

      {/* ---- Segments ----
          Placet n'impose aucun vocabulaire : le cercle nomme les siens.
          L'échelle (rang) est une OPTION, décidée au premier segment. */}
      <div id="segments" style={{ ...card, marginTop: 18, scrollMarginTop: 90 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19 }}>{t("segmentsTitle")}</div>
        <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4, lineHeight: 1.45 }}>{t("segmentsHint")}</div>

        {segsDown && <div style={{ marginTop: 10, color: REDTXT, fontWeight: 700, fontSize: 13 }}>{t("segmentsUnavailable")}</div>}

        {segments.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            {segments.map((g) => {
              const n = counts.bySeg[g.id] ?? 0;
              const thin = n < SEALED_MIN;
              if (renaming === g.id)
                return (
                  <input
                    key={g.id}
                    autoFocus
                    value={renameText}
                    onChange={(e) => setRenameText(e.target.value)}
                    onBlur={() => void commitRename(g)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      if (e.key === "Escape") setRenaming(null);
                    }}
                    aria-label={t("segmentRenameAria", { segment: g.name })}
                    style={{ width: 190, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, padding: "6px 10px", border: `2px solid ${INK}`, borderRadius: 9 }}
                  />
                );
              return (
                <span key={g.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, border: `2px solid ${INK}`, borderRadius: 9, padding: "4px 6px 4px 10px", fontSize: 13, fontWeight: 700 }}>
                  {g.rank != null && <span style={{ color: MUTED, fontSize: 11.5 }}>{g.rank}</span>}
                  {g.name}
                  <span style={{ color: thin ? REDTXT : MUTED, fontSize: 12 }}>{n}</span>
                  {/* Le seuil de 5 est celui que la BASE applique au bulletin
                      scellé. Sans ce signe, il ne se découvre qu'au refus, une
                      fois la question déjà écrite. */}
                  {thin && (
                    <span role="img" aria-label={t("segmentBelowMinTitle")} title={t("segmentBelowMinTitle")} style={{ color: REDTXT, fontSize: 13 }}>
                      ⚠
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setRenameText(g.name);
                      setRenaming(g.id);
                    }}
                    aria-label={t("segmentRenameAria", { segment: g.name })}
                    style={{ border: "none", background: "none", color: SUBINK, cursor: "pointer", fontSize: 11.5, fontWeight: 700, textDecoration: "underline", padding: "4px 2px", minHeight: 24 }}
                  >
                    {t("segmentRename")}
                  </button>
                  {/* 24 × 24 minimum (WCAG 2.5.8) : la croix d'origine faisait
                      ~15 px sans padding, et s'annonçait « × ». */}
                  <button
                    onClick={() => void removeSegment(g)}
                    aria-label={t("segmentDeleteAria", { segment: g.name })}
                    title={t("remove")}
                    style={{ width: 24, height: 24, display: "grid", placeItems: "center", flex: "none", border: "none", background: "none", color: REDTXT, cursor: "pointer", fontSize: 16, lineHeight: 1, borderRadius: 7 }}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", gap: 9, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={segName}
            onChange={(e) => {
              setSegName(e.target.value);
              if (segErr) setSegErr("");
            }}
            onKeyDown={(e) => e.key === "Enter" && addSegment()}
            placeholder={t("segmentPlaceholder")}
            aria-label={t("segmentPlaceholder")}
            style={{ flex: 1, minWidth: 170, fontFamily: FONT_BODY, fontSize: 14, padding: "9px 12px", border: `2px solid ${segErr ? REDTXT : INK}`, borderRadius: 10 }}
          />
          <button
            onClick={addSegment}
            disabled={!segName.trim()}
            style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 13.5, cursor: segName.trim() ? "pointer" : "not-allowed", border: `2.5px solid ${INK}`, background: PAPER, color: INK, padding: "9px 14px", borderRadius: 10, opacity: segName.trim() ? 1 : 0.5 }}
          >
            {t("segmentAddCta")}
          </button>
          {saved && <span style={{ color: GREENTXT, fontWeight: 700, fontSize: 12.5 }}>{t("savedTick")} ✓</span>}
        </div>
        {segErr && <div role="alert" style={{ marginTop: 8, color: REDTXT, fontWeight: 700, fontSize: 13, lineHeight: 1.45 }}>{segErr}</div>}

        {segments.length === 0 && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9, fontSize: 12.5, color: SUBINK, cursor: "pointer" }}>
            <input type="checkbox" checked={segRanked} onChange={(e) => setSegRanked(e.target.checked)} style={{ width: 15, height: 15, accentColor: INK }} />
            {t("segmentRanked")}
          </label>
        )}
      </div>

      {/* ---- Recherche et facettes ----
          Le filtrage est CLIENT : les membres sont déjà en mémoire, une requête
          par frappe n'apporterait rien qu'une latence. */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 18 }}>
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setLimit(PAGE);
          }}
          placeholder={t("searchMembers")}
          aria-label={t("searchMembers")}
          style={{ flex: "1 1 240px", fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, padding: "11px 14px", border: `2.5px solid ${INK}`, borderRadius: 12, background: PAPER }}
        />
      </div>

      {/* Le compteur est DANS la puce : le chiffre existe même quand la facette
          n'est pas choisie — c'est ce qui permet de voir « 12 sans adresse »
          sans avoir à cliquer pour le découvrir.
          L'étiquette lue COMMENCE par l'étiquette vue (« Sans adresse 12 » →
          « Sans adresse 12 membres ») : un nom accessible qui ne contient pas
          le texte visible casse la commande vocale, qui vise ce qu'elle lit. */}
      <div role="group" aria-label={t("members")} style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}>
        {facetBtn(facet.kind === "all", "all", `${t("filterAll")} ${members.length}`, `${t("filterAll")} ${t("memberCount", { count: members.length })}`, () => pickFacet({ kind: "all" }))}
        {segments.map((g) =>
          facetBtn(
            facet.kind === "segment" && facet.id === g.id,
            g.id,
            `${g.name} ${counts.bySeg[g.id] ?? 0}`,
            `${g.name} ${t("memberCount", { count: counts.bySeg[g.id] ?? 0 })}`,
            () => pickFacet({ kind: "segment", id: g.id }),
          ),
        )}
        {segments.length > 0 &&
          facetBtn(facet.kind === "no-segment", "no-segment", `${t("filterNoSegment")} ${counts.noSeg}`, `${t("filterNoSegment")} ${t("memberCount", { count: counts.noSeg })}`, () => pickFacet({ kind: "no-segment" }))}
        {facetBtn(facet.kind === "no-email", "no-email", `${t("filterNoEmail")} ${counts.noEmail}`, `${t("filterNoEmail")} ${t("memberCount", { count: counts.noEmail })}`, () => pickFacet({ kind: "no-email" }))}
      </div>

      {/* ---- La liste ---- */}
      <div style={{ ...card, marginTop: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {/* Deux vides à ne jamais confondre : un cercle sans membre, et une
              recherche sans résultat. Dire « aucun membre » à quelqu'un qui en a
              200 et a mal tapé trois lettres est un mensonge d'écran. */}
          {!members.length && <div style={{ color: MUTED, fontSize: 14, lineHeight: 1.5 }}>{t("noMembers")}</div>}
          {members.length > 0 && !filtered.length && (
            <div>
              <div style={{ color: MUTED, fontSize: 14, lineHeight: 1.5 }}>{t("membersNoMatch")}</div>
              <button
                onClick={clearFilters}
                style={{ marginTop: 10, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 13.5, cursor: "pointer", border: `2.5px solid ${INK}`, background: PAPER, color: INK, padding: "9px 14px", borderRadius: 10 }}
              >
                {t("clearFilters")}
              </button>
            </div>
          )}

          {shown.map((m) => {
            const mine = segOf(m.id);
            const free = segments.filter((g) => !mine.includes(g.id));
            return (
              <div key={m.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: CREAM, border: `2px solid ${INK}`, borderRadius: 11, padding: "9px 12px" }}>
                  <span style={{ fontWeight: 700, fontSize: 14.5, flex: "1 1 140px" }}>{m.name}</span>
                  {/* D'où vient ce membre, et depuis quand. Un adhérent volontaire et
                      une ligne importée n'ont pas le même statut : la distinction doit
                      être visible pour celui qui écrit au cercle. */}
                  {m.self_joined && (
                    <span
                      title={m.consent_at ? t("consentOn", { date: dateFmt.format(new Date(m.consent_at)) }) : undefined}
                      style={{ fontSize: 11.5, fontWeight: 800, color: GREENTXT, border: `1.5px solid ${GREENTXT}`, borderRadius: 7, padding: "3px 7px", whiteSpace: "nowrap" }}
                    >
                      {t("tagSelfJoined")}
                    </span>
                  )}
                  {!m.self_joined && m.consent_source === "import" && (
                    <span
                      title={m.consent_at ? t("consentAdded", { date: dateFmt.format(new Date(m.consent_at)) }) : undefined}
                      style={{ fontSize: 11.5, fontWeight: 800, color: MUTED, border: `1.5px solid ${MUTED}`, borderRadius: 7, padding: "3px 7px", whiteSpace: "nowrap" }}
                    >
                      {t("tagImported")}
                    </span>
                  )}
                  {m.email && <span style={{ color: MUTED, fontSize: 12.5 }}>{m.email}</span>}
                  {m.weight > 1 && <span style={{ color: SUBINK, fontSize: 12.5, fontWeight: 700 }}>×{m.weight}</span>}

                  {segments.length > 0 && (
                    <span style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                      {mine.map((sid) => {
                        const seg = segments.find((g) => g.id === sid);
                        if (!seg) return null;
                        return (
                          // La puce est INERTE. Elle était un bouton qui désaffectait
                          // au clic : le geste le plus naturel — toucher l'étiquette
                          // pour la lire — était le plus destructeur, et silencieux.
                          // Seule la croix retire, et elle s'annonce.
                          <span key={sid} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 800, color: INK, border: `1.5px solid ${INK}`, background: PAPER, borderRadius: 7, padding: "2px 2px 2px 8px", whiteSpace: "nowrap" }}>
                            {seg.name}
                            <button
                              onClick={() => void setMemberSegment(m, sid, false)}
                              aria-label={t("segmentRemoveFromAria", { segment: seg.name, name: m.name })}
                              title={t("segmentRemoveFrom")}
                              style={{ width: 24, height: 24, display: "grid", placeItems: "center", flex: "none", border: "none", background: "none", color: REDTXT, cursor: "pointer", fontSize: 14, lineHeight: 1, borderRadius: 6 }}
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                      {free.length > 0 &&
                        (segEditing === m.id ? (
                          <select
                            autoFocus
                            value=""
                            onChange={(e) => {
                              const v = e.target.value;
                              setSegEditing(null);
                              if (v) void setMemberSegment(m, v, true);
                            }}
                            onBlur={() => setSegEditing(null)}
                            aria-label={t("segmentAddAria", { name: m.name })}
                            style={{ fontSize: 11.5, fontFamily: FONT_BODY, border: `1.5px solid ${INK}`, borderRadius: 7, padding: "5px 6px", minHeight: 26, background: PAPER, color: INK, cursor: "pointer" }}
                          >
                            <option value="">{t("segmentAdd")}</option>
                            {free.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() => setSegEditing(m.id)}
                            aria-label={t("segmentAddAria", { name: m.name })}
                            style={{ fontSize: 11.5, fontWeight: 800, fontFamily: FONT_BODY, color: SUBINK, border: `1.5px dashed ${MUTED}`, background: PAPER, borderRadius: 7, padding: "4px 8px", minHeight: 26, cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            {t("segmentAdd")}
                          </button>
                        ))}
                    </span>
                  )}

                  <button
                    onClick={() => void onRemoveMember(m)}
                    aria-label={t("removeMemberAria", { name: m.name })}
                    title={t("remove")}
                    style={{ width: 28, height: 28, display: "grid", placeItems: "center", flex: "none", border: "none", background: "none", color: REDTXT, cursor: "pointer", fontSize: 18, lineHeight: 1, borderRadius: 8 }}
                  >
                    ×
                  </button>
                </div>
                {rowErr?.id === m.id && (
                  <div role="alert" style={{ color: REDTXT, fontWeight: 700, fontSize: 12.5, margin: "4px 0 0 12px" }}>
                    {rowErr.msg}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {rest > 0 && (
          <button
            onClick={() => setLimit((n) => n + PAGE)}
            style={{ marginTop: 12, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 13.5, cursor: "pointer", border: `2.5px solid ${INK}`, background: PAPER, color: INK, padding: "10px 16px", borderRadius: 11 }}
          >
            {t("showMore", { count: Math.min(PAGE, rest) })}
          </button>
        )}
        {filtering && filtered.length > 0 && (
          <button
            onClick={clearFilters}
            style={{ marginTop: 12, marginLeft: 10, border: "none", background: "none", color: SUBINK, cursor: "pointer", fontSize: 13, fontWeight: 700, textDecoration: "underline", padding: 0 }}
          >
            {t("clearFilters")}
          </button>
        )}
      </div>

      {/* ---- Ajout ----
          Replié quand le cercle a déjà des membres : à ce moment-là on vient
          chercher quelqu'un, pas coller une liste. Ouvert d'emblée sur un cercle
          vide, où c'est la seule chose à faire. */}
      <details
        open={addOpen}
        onToggle={(e) => setAddOpen((e.currentTarget as HTMLDetailsElement).open)}
        style={{ ...card, marginTop: 16 }}
      >
        <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: 17, fontFamily: FONT_DISPLAY, listStyle: "revert" }}>
          {t("addMembersTitle")}
        </summary>
        <div style={{ fontSize: 12, color: MUTED, margin: "8px 0 7px", lineHeight: 1.45 }}>{t("addMembersHint")}</div>
        <textarea
          value={memberText}
          onChange={(e) => {
            setMemberText(e.target.value);
            if (addErr) setAddErr("");
          }}
          placeholder={t("addMembersPlaceholder")}
          aria-label={t("addMembersTitle")}
          rows={3}
          style={{ width: "100%", fontFamily: FONT_BODY, fontSize: 14, padding: "10px 12px", border: `2px solid ${addErr ? REDTXT : INK}`, borderRadius: 11, resize: "vertical" }}
        />

        {preview.length > 0 && (
          <div style={{ marginTop: 9, border: `2px solid ${INK}`, borderRadius: 11, overflow: "hidden" }}>
            <div style={{ maxHeight: 188, overflowY: "auto" }}>
              {preview.map((p, i) => {
                const bad = p.status === "bad";
                const dup = p.status === "dup";
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 11px", borderTop: i ? `1px solid ${TINT.rule}` : "none", background: bad ? TINT.bad : dup ? TINT.dup : PAPER, opacity: dup ? 0.75 : 1 }}>
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
            style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14.5, cursor: toAdd.length ? "pointer" : "not-allowed", border: `2.5px solid ${INK}`, background: toAdd.length ? YELLOW : TINT.disabled, color: INK, padding: "10px 18px", borderRadius: 11, opacity: toAdd.length ? 1 : 0.65 }}
          >
            {toAdd.length ? t("addMembersN", { count: toAdd.length }) : t("addMembers")}
          </button>
          <label style={{ fontSize: 13, fontWeight: 700, color: SUBINK, cursor: "pointer", textDecoration: "underline" }}>
            {t("importFile")}
            <input
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={(e) => {
                void onImportFile(e.target.files?.[0]);
                e.target.value = "";
              }}
              style={{ display: "none" }}
            />
          </label>
        </div>
        {addErr && <div role="alert" style={{ marginTop: 9, color: REDTXT, fontWeight: 700, fontSize: 13 }}>{addErr}</div>}
      </details>
    </OrgShell>
  );
}
