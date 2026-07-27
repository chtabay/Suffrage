"use client";

// Régie Placet — tableau de bord admin de plateforme (allowlist scrutin_admins).
// Vue d'ensemble (KPIs, activité 30 j, canaux de partage), file de modération
// avec le détail des signalements, et registre complet des scrutins.
// Agrégats uniquement : le secret du vote ne se discute pas, même en régie.
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/useAuth";
import {
  adminDeleteUser,
  adminListUsers,
  adminModerate,
  adminOverview,
  adminSetRole,
  type AdminOverview,
  type AdminPollRow,
  type AdminUser,
} from "@/lib/db/admin";
import { intlLocale } from "@/i18n/locales";
import PlacetMark from "@/components/scrutin/PlacetMark";
import {
  CORAL,
  CREAM,
  FONT_BODY,
  FONT_DISPLAY,
  GREEN,
  GREENTXT,
  INK,
  MUTED,
  PAPER,
  REDTXT,
  YELLOW,
  lift,
} from "@/components/scrutin/theme";

const card = {
  background: PAPER,
  border: `2.5px solid ${INK}`,
  borderRadius: 16,
  boxShadow: `5px 5px 0 rgba(22,33,58,0.14)`,
  padding: 18,
} as const;

const chip = (bg: string, color = INK) =>
  ({
    display: "inline-block",
    fontFamily: FONT_DISPLAY,
    fontWeight: 700,
    fontSize: 11,
    padding: "3px 8px",
    borderRadius: 8,
    border: `1.5px solid ${INK}`,
    background: bg,
    color,
    whiteSpace: "nowrap",
  }) as const;

function Kpi({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{ ...card, padding: "14px 16px", borderColor: accent ?? INK, minWidth: 0 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 26, color: accent ?? INK, lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontWeight: 700, fontSize: 12, color: MUTED, marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontWeight: 600, fontSize: 11.5, color: accent ?? MUTED, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/** Mini histogramme 30 jours en divs pures (pas de lib de charts). */
function Bars({ values, color, title }: { values: number[]; color: string; title: string }) {
  const max = Math.max(1, ...values);
  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div style={{ fontWeight: 700, fontSize: 12, color: MUTED, marginBottom: 6 }}>
        {title} <span style={{ color: INK }}>· {values.reduce((a, b) => a + b, 0)}</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 52, borderBottom: `2px solid ${INK}`, paddingBottom: 1 }}>
        {values.map((v, i) => (
          <div
            key={i}
            title={String(v)}
            style={{
              flex: 1,
              minWidth: 3,
              height: v === 0 ? 2 : Math.max(4, Math.round((v / max) * 50)),
              background: v === 0 ? "rgba(22,33,58,0.15)" : color,
              borderRadius: "2px 2px 0 0",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function AdminScreen() {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const { user, loading: authLoading, signIn } = useAuth();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [state, setState] = useState<"loading" | "denied" | "error" | "ready">("loading");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [usersNotice, setUsersNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [overview, userList] = await Promise.all([adminOverview(), adminListUsers()]);
      if (!overview) {
        // null = la RPC a répondu « pas admin » ; les erreurs réseau lèvent.
        setState("denied");
        return;
      }
      setData(overview);
      setUsers(userList ?? []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  // Dépend de l'ID (stable), pas de l'objet user : les événements auth
  // (refresh de token…) recréent l'objet et redéclencheraient le chargement.
  const userId = user?.id ?? null;
  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      setState("denied");
      return;
    }
    setState("loading");
    void load();
  }, [authLoading, userId, load]);

  const act = useCallback(
    async (row: AdminPollRow, action: "approve" | "hide" | "close") => {
      if (busy) return;
      if (action === "approve" && !window.confirm(t("confirmApprove"))) return;
      if (action === "hide" && !window.confirm(t("confirmHide"))) return;
      if (action === "close" && !window.confirm(t("confirmClose"))) return;
      setBusy(row.token + action);
      try {
        await adminModerate(row.token, action);
      } catch {
        /* échec réseau : le rechargement ci-dessous fait foi */
      } finally {
        await load().catch(() => {});
        setBusy(null);
      }
    },
    [busy, load, t],
  );

  const actUser = useCallback(
    async (u: AdminUser, action: "promote" | "demote" | "delete") => {
      if (busy) return;
      const confirms = {
        promote: t("confirmPromote", { email: u.email }),
        demote: t("confirmDemote", { email: u.email }),
        delete: t("confirmDeleteUser", { email: u.email }),
      } as const;
      if (!window.confirm(confirms[action])) return;
      setUsersNotice(null);
      setBusy(u.id + action);
      try {
        const r =
          action === "delete"
            ? await adminDeleteUser(u.id)
            : await adminSetRole(u.id, action === "promote");
        if (r === "linked_elsewhere") setUsersNotice(t("userLinkedElsewhere"));
        else if (r !== "ok") setUsersNotice(t("userActionFailed"));
      } catch {
        setUsersNotice(t("userActionFailed"));
      } finally {
        await load().catch(() => {});
        setBusy(null);
      }
    },
    [busy, load, t],
  );

  const fmtDate = useCallback(
    (iso: string) => {
      const d = new Date(iso);
      // Année affichée dès qu'elle diffère de l'année en cours (registre historique).
      const sameYear = d.getFullYear() === new Date().getFullYear();
      return d.toLocaleDateString(intlLocale(locale), {
        day: "numeric",
        month: "short",
        ...(sameYear ? {} : { year: "numeric" }),
      });
    },
    [locale],
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.polls;
    return data.polls.filter((p) => p.question.toLowerCase().includes(q) || p.token.includes(q));
  }, [data, query]);

  const moderationQueue = useMemo(
    () => (data ? data.polls.filter((p) => p.moderation === "flagged" || p.moderation === "pending" || p.reports > 0) : []),
    [data],
  );

  const shell = (content: React.ReactNode) => (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: FONT_BODY, color: INK }}>
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "26px 18px 60px" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
          <Link href="/" style={{ textDecoration: "none", color: INK, lineHeight: 0 }} aria-label="Placet">
            <PlacetMark size={34} />
          </Link>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 24, margin: 0 }}>🎛️ {t("title")}</h1>
            <div style={{ fontWeight: 600, fontSize: 13, color: MUTED }}>{t("subtitle")}</div>
          </div>
          {state === "ready" && (
            <button
              onClick={() => void load()}
              className="dc-lift"
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                border: `2.5px solid ${INK}`,
                background: PAPER,
                color: INK,
                padding: "10px 15px",
                borderRadius: 11,
                ...lift("3px 3px 0 rgba(22,33,58,0.14)", "5px 5px 0 rgba(22,33,58,0.2)"),
              }}
            >
              ↻ {t("refresh")}
            </button>
          )}
        </header>
        {content}
      </div>
    </div>
  );

  if (authLoading || state === "loading") {
    return shell(<div style={{ ...card, textAlign: "center", fontWeight: 700, color: MUTED }}>{t("loading")}</div>);
  }

  if (state === "error") {
    return shell(
      <div style={{ ...card, maxWidth: 460, margin: "40px auto", textAlign: "center" }}>
        <div style={{ fontSize: 34, marginBottom: 8 }}>📡</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19, marginBottom: 6 }}>{t("errorTitle")}</div>
        <button
          onClick={() => {
            setState("loading");
            void load();
          }}
          className="dc-lift"
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            border: `2.5px solid ${INK}`,
            background: YELLOW,
            color: INK,
            padding: "12px 18px",
            borderRadius: 12,
            ...lift("4px 4px 0 rgba(22,33,58,0.16)", "6px 6px 0 rgba(22,33,58,0.22)"),
          }}
        >
          ↻ {t("errorRetry")}
        </button>
      </div>,
    );
  }

  if (!user || state === "denied" || !data) {
    return shell(
      <div style={{ ...card, maxWidth: 460, margin: "40px auto", textAlign: "center" }}>
        <div style={{ fontSize: 34, marginBottom: 8 }}>🔐</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19, marginBottom: 6 }}>{t("deniedTitle")}</div>
        <div style={{ fontWeight: 600, fontSize: 14, color: MUTED, lineHeight: 1.5, marginBottom: 16 }}>
          {user ? t("deniedText") : t("signInText")}
        </div>
        {!user && (
          <button
            onClick={() => void signIn()}
            className="dc-lift"
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
              border: `2.5px solid ${INK}`,
              background: YELLOW,
              color: INK,
              padding: "12px 18px",
              borderRadius: 12,
              ...lift("4px 4px 0 rgba(22,33,58,0.16)", "6px 6px 0 rgba(22,33,58,0.22)"),
            }}
          >
            {t("signInButton")}
          </button>
        )}
        <div style={{ marginTop: 14 }}>
          <Link href="/" style={{ fontWeight: 700, fontSize: 13, color: MUTED }}>
            ← {t("backHome")}
          </Link>
        </div>
      </div>,
    );
  }

  const { totals, ballots, shares, channels, days, reportsPending } = data;
  const channelRows: { key: "copy" | "whatsapp" | "native" | "qr"; icon: string; label: string }[] = [
    { key: "copy", icon: "🔗", label: t("channelCopy") },
    { key: "whatsapp", icon: "💬", label: t("channelWhatsapp") },
    { key: "native", icon: "↗", label: t("channelNative") },
    { key: "qr", icon: "🔳", label: t("channelQr") },
  ];
  const channelMax = Math.max(1, ...channelRows.map((c) => channels[c.key] ?? 0));

  const statusChip = (p: AdminPollRow) =>
    p.status === "open" ? (
      <span style={chip("#e7f6dd", GREENTXT)}>● {t("statusOpen")}</span>
    ) : p.status === "proposals" ? (
      <span style={chip("#fff3d6")}>💡 {t("statusProposals")}</span>
    ) : (
      <span style={chip("rgba(22,33,58,0.08)", MUTED)}>🔒 {t("statusClosed")}</span>
    );

  const modChip = (p: AdminPollRow) =>
    p.moderation === "flagged" ? (
      <span style={chip("#ffe1e0", REDTXT)}>🚩 {t("modFlagged")}</span>
    ) : p.moderation === "pending" ? (
      <span style={chip("#fff3d6")}>⏳ {t("modPending")}</span>
    ) : p.moderation === "hidden" ? (
      <span style={chip("rgba(22,33,58,0.1)", MUTED)}>🙈 {t("modHidden")}</span>
    ) : null;

  const actionBtn = (label: string, onClick: () => void, disabled: boolean, bg = PAPER) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: FONT_DISPLAY,
        fontWeight: 700,
        fontSize: 11.5,
        cursor: disabled ? "wait" : "pointer",
        border: `2px solid ${INK}`,
        background: bg,
        color: INK,
        padding: "5px 9px",
        borderRadius: 8,
        opacity: disabled ? 0.55 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );

  const rowActions = (p: AdminPollRow) => (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <a
        href={`/v/${p.token}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 11.5,
          border: `2px solid ${INK}`,
          background: PAPER,
          color: INK,
          padding: "5px 9px",
          borderRadius: 8,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        {t("actOpen")} ↗
      </a>
      {(p.moderation === "flagged" || p.moderation === "pending" || p.moderation === "hidden" || p.reports > 0) &&
        actionBtn(`✅ ${t("actApprove")}`, () => void act(p, "approve"), busy === p.token + "approve", "#e7f6dd")}
      {p.moderation !== "hidden" &&
        actionBtn(`🙈 ${t("actHide")}`, () => void act(p, "hide"), busy === p.token + "hide", "#ffe1e0")}
      {(p.status === "open" || p.status === "proposals") &&
        actionBtn(`🔒 ${t("actClose")}`, () => void act(p, "close"), busy === p.token + "close")}
    </div>
  );

  return shell(
    <>
      {/* ── KPIs ─────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <Kpi label={t("kpiPolls")} value={totals.polls} sub={`+${totals.polls7d} ${t("last7")}`} />
        <Kpi label={t("kpiActive")} value={totals.open + totals.proposals} sub={t("kpiActiveDetail", { closed: totals.closed })} />
        <Kpi label={t("kpiBallots")} value={ballots.total} sub={`+${ballots.last7} ${t("last7")}`} />
        <Kpi label={t("kpiShares")} value={shares.total} sub={`+${shares.last7} ${t("last7")}`} />
        <Kpi label={t("kpiPublic")} value={totals.public} sub={t("kpiOrganizers", { n: totals.organizers })} />
        <Kpi
          label={t("kpiReports")}
          value={reportsPending}
          accent={reportsPending > 0 ? CORAL : undefined}
          sub={reportsPending > 0 ? t("kpiReportsAction") : "✓"}
        />
      </div>

      {/* ── Activité 30 jours + canaux ───────────────────────── */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, marginBottom: 12 }}>
          📈 {t("chartTitle")}
        </div>
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
          <Bars values={days.map((d) => d.ballots)} color={GREEN} title={t("chartBallots")} />
          <Bars values={days.map((d) => d.shares)} color={YELLOW} title={t("chartShares")} />
          <Bars values={days.map((d) => d.polls)} color={CORAL} title={t("chartPolls")} />
        </div>
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: `2px dashed ${INK}` }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: MUTED, marginBottom: 8 }}>{t("channelsTitle")}</div>
          {shares.total === 0 ? (
            <div style={{ fontWeight: 600, fontSize: 13, color: MUTED }}>{t("noShares")}</div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {channelRows.map((c) => {
                const n = channels[c.key] ?? 0;
                return (
                  <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 130, fontWeight: 700, fontSize: 12.5 }}>
                      {c.icon} {c.label}
                    </span>
                    <div style={{ flex: 1, height: 14, background: "rgba(22,33,58,0.07)", borderRadius: 7, overflow: "hidden" }}>
                      <div style={{ width: `${(n / channelMax) * 100}%`, height: "100%", background: INK, borderRadius: 7 }} />
                    </div>
                    <span style={{ width: 40, textAlign: "right", fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 13 }}>{n}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── File de modération ───────────────────────────────── */}
      {moderationQueue.length > 0 && (
        <div style={{ ...card, marginTop: 16, borderColor: CORAL }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, color: REDTXT, marginBottom: 12 }}>
            🚨 {t("modTitle", { n: moderationQueue.length })}
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {moderationQueue.map((p) => (
              <div key={p.token} style={{ border: `2px solid ${INK}`, borderRadius: 12, padding: 13, background: CREAM }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14.5, flex: 1, minWidth: 180 }}>
                    {p.question}
                  </span>
                  {statusChip(p)}
                  {modChip(p)}
                  {p.reports > 0 && <span style={chip("#ffe1e0", REDTXT)}>{t("reportsOn", { n: p.reports })}</span>}
                </div>
                {p.reportDetails.length > 0 && (
                  <ul style={{ margin: "0 0 10px", paddingLeft: 18, fontSize: 12.5, fontWeight: 600, color: MUTED, lineHeight: 1.6 }}>
                    {p.reportDetails.map((r, i) => (
                      <li key={i}>
                        <b style={{ color: INK }}>{r.reason}</b>
                        {r.detail ? ` — « ${r.detail} »` : ""} · {fmtDate(r.at)}
                      </li>
                    ))}
                  </ul>
                )}
                {rowActions(p)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Registre complet ─────────────────────────────────── */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, flex: 1 }}>
            🗂️ {t("allTitle", { n: filtered.length })}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            style={{
              fontFamily: FONT_BODY,
              fontSize: 13.5,
              fontWeight: 600,
              padding: "8px 12px",
              border: `2px solid ${INK}`,
              borderRadius: 10,
              background: CREAM,
              outline: "none",
              minWidth: 200,
            }}
          />
        </div>
        {filtered.length === 0 ? (
          <div style={{ fontWeight: 600, fontSize: 13.5, color: MUTED }}>{t("noPolls")}</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {[t("thQuestion"), t("thStatus"), t("thBallots"), t("thShares"), t("thReports"), t("thCreated"), ""].map((h, i) => (
                    <th
                      key={i}
                      scope="col"
                      style={{
                        textAlign: i >= 2 && i <= 4 ? "right" : "left",
                        fontFamily: FONT_DISPLAY,
                        fontWeight: 800,
                        fontSize: 11.5,
                        color: MUTED,
                        padding: "6px 8px",
                        borderBottom: `2px solid ${INK}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.token} style={{ borderBottom: `1px solid rgba(22,33,58,0.12)` }}>
                    <td style={{ padding: "9px 8px", minWidth: 220 }}>
                      <div style={{ fontWeight: 700, lineHeight: 1.35 }}>{p.question}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, marginTop: 2 }}>
                        {p.method ?? "—"} · {t("optCount", { n: p.options })} · {p.access === "invite" ? t("accessInvite") : t("accessOpen")}
                        {p.visibility === "public" ? ` · 📣 ${t("visPublic")}` : ""}
                      </div>
                    </td>
                    <td style={{ padding: "9px 8px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                        {statusChip(p)}
                        {modChip(p)}
                      </div>
                    </td>
                    <td style={{ padding: "9px 8px", textAlign: "right", fontFamily: FONT_DISPLAY, fontWeight: 800 }}>
                      {p.ballots}
                      {p.access === "invite" && p.voters > 0 && (
                        <div style={{ fontSize: 10.5, fontWeight: 600, color: MUTED }}>
                          {t("participation", { voted: p.voted, total: p.voters })}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "9px 8px", textAlign: "right", fontFamily: FONT_DISPLAY, fontWeight: 800 }}>{p.shares}</td>
                    <td style={{ padding: "9px 8px", textAlign: "right", fontFamily: FONT_DISPLAY, fontWeight: 800, color: p.reports > 0 ? REDTXT : INK }}>
                      {p.reports}
                    </td>
                    <td style={{ padding: "9px 8px", fontWeight: 600, color: MUTED, whiteSpace: "nowrap" }}>{fmtDate(p.created_at)}</td>
                    <td style={{ padding: "9px 8px" }}>{rowActions(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Comptes : gestion des utilisateurs connus de Placet ─ */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, marginBottom: 12 }}>
          👥 {t("usersTitle", { n: users.length })}
        </div>
        {usersNotice && (
          <div style={{ marginBottom: 10, fontSize: 13, color: REDTXT, fontWeight: 700 }}>{usersNotice}</div>
        )}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {[t("thUser"), t("thCreated"), t("thLastSeen"), t("thPolls"), t("thSpaces"), ""].map((h, i) => (
                  <th
                    key={i}
                    scope="col"
                    style={{
                      textAlign: i === 3 || i === 4 ? "right" : "left",
                      fontFamily: FONT_DISPLAY,
                      fontWeight: 800,
                      fontSize: 11.5,
                      color: MUTED,
                      padding: "6px 8px",
                      borderBottom: `2px solid ${INK}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === user?.id;
                return (
                  <tr key={u.id} style={{ borderBottom: `1px solid rgba(22,33,58,0.12)` }}>
                    <td style={{ padding: "9px 8px", minWidth: 220 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700 }}>{u.email || u.id}</span>
                        {u.isAdmin && <span style={chip(YELLOW)}>🎛️ {t("roleAdmin")}</span>}
                        {isSelf && <span style={{ fontSize: 11.5, fontWeight: 700, color: MUTED }}>({t("userYou")})</span>}
                      </div>
                      {u.provider && (
                        <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, marginTop: 2 }}>{u.provider}</div>
                      )}
                    </td>
                    <td style={{ padding: "9px 8px", fontWeight: 600, color: MUTED, whiteSpace: "nowrap" }}>{fmtDate(u.created_at)}</td>
                    <td style={{ padding: "9px 8px", fontWeight: 600, color: MUTED, whiteSpace: "nowrap" }}>
                      {u.last_sign_in_at ? fmtDate(u.last_sign_in_at) : t("neverSignedIn")}
                    </td>
                    <td style={{ padding: "9px 8px", textAlign: "right", fontFamily: FONT_DISPLAY, fontWeight: 800 }}>{u.polls}</td>
                    <td style={{ padding: "9px 8px", textAlign: "right", fontFamily: FONT_DISPLAY, fontWeight: 800 }}>{u.spaces}</td>
                    <td style={{ padding: "9px 8px" }}>
                      {/* Jamais d'action sur soi-même (anti-lockout, garde aussi en base).
                          Un admin doit être rétrogradé avant d'être supprimable. */}
                      {!isSelf && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {u.isAdmin
                            ? actionBtn(`⬇ ${t("actDemote")}`, () => void actUser(u, "demote"), busy === u.id + "demote")
                            : actionBtn(`⭐ ${t("actPromote")}`, () => void actUser(u, "promote"), busy === u.id + "promote")}
                          {!u.isAdmin &&
                            actionBtn(`🗑️ ${t("actDeleteUser")}`, () => void actUser(u, "delete"), busy === u.id + "delete", "#ffe1e0")}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>,
  );
}
