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
  adminNotifs,
  adminBloquerPseudo,
  type AdminNotif,
} from "@/lib/db/admin";
import { intlLocale } from "@/i18n/locales";
import Nav from "@/components/scrutin/Nav";
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
  /**
   * QUATRE ONGLETS, QUATRE MÉTIERS.
   *
   * ⚠️ LA RÉGIE ÉTAIT UN SEUL ROULEAU DE SIX BLOCS EMPILÉS : indicateurs,
   * activité, file de modération, registre des scrutins, comptes, pseudos de
   * jeux. Trois métiers différents à la suite, sans rupture — on descendait à
   * travers la modération des scrutins pour atteindre la gestion des comptes, et
   * les pseudos des jeux se retrouvaient tout en bas d'une page qui parlait de
   * votes. Séparer, c'est rendre chaque question atteignable en un geste.
   *
   * ⚠️ ET « JEUX » EST UN ONGLET PRESQUE VIDE, VOLONTAIREMENT. Il ne porte
   * aujourd'hui que les comptes qui jouent et la prise sur leur pseudo : la
   * Régie ne sait RIEN des jeux — ni combien de journées jouées, ni combien de
   * joueurs, ni combien de salles ouvertes — alors qu'ils sont la moitié du
   * produit. L'onglet le montre au lieu de le cacher au fond d'un rouleau.
   */
  const [notifs, setNotifs] = useState<AdminNotif[]>([]);
  const [onglet, setOnglet] = useState<"apercu" | "scrutins" | "jeux" | "personnes">("apercu");

  const basculePseudo = async (c: AdminNotif) => {
    setBusy(c.id);
    const ok = await adminBloquerPseudo(c.id, !c.bloque);
    setBusy(null);
    // On relit plutôt que de deviner : un échec silencieux laisserait l'écran
    // afficher un blocage qui n'a pas eu lieu.
    if (ok) setNotifs((await adminNotifs()) ?? []);
  };

  const load = useCallback(async () => {
    try {
      const [overview, userList, abonnes] = await Promise.all([
        adminOverview(),
        adminListUsers(),
        adminNotifs(),
      ]);
      if (!overview) {
        // null = la RPC a répondu « pas admin » ; les erreurs réseau lèvent.
        setState("denied");
        return;
      }
      setData(overview);
      setUsers(userList ?? []);
      setNotifs(abonnes ?? []);
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
      <Nav />
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "26px 18px 60px" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
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

  const ONGLETS = [
    { cle: "apercu" as const, texte: `📊 ${t("ongletApercu")}`, alerte: 0 },
    // ⚠️ LA FILE DE MODÉRATION PORTE SON COMPTE SUR L'ONGLET. Un signalement en
    // attente est la seule chose urgente de cette page ; le ranger derrière un
    // onglet muet le rendrait invisible jusqu'à ce qu'on pense à cliquer. Le
    // chiffre reste aussi en indicateur sur l'aperçu, à l'accent, comme avant.
    { cle: "scrutins" as const, texte: `🗳️ ${t("ongletScrutins")}`, alerte: reportsPending },
    { cle: "jeux" as const, texte: `🎮 ${t("ongletJeux")}`, alerte: 0 },
    { cle: "personnes" as const, texte: `👤 ${t("ongletPersonnes")}`, alerte: 0 },
  ];

  return shell(
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {ONGLETS.map((o) => (
          <button
            key={o.cle}
            type="button"
            onClick={() => setOnglet(o.cle)}
            aria-pressed={onglet === o.cle}
            className="dc-lift"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontFamily: FONT_DISPLAY,
              fontWeight: 800,
              fontSize: 14,
              padding: "9px 15px",
              borderRadius: 999,
              cursor: "pointer",
              border: `2.5px solid ${INK}`,
              background: onglet === o.cle ? INK : PAPER,
              color: onglet === o.cle ? CREAM : INK,
              ...lift("3px 3px 0 rgba(22,33,58,0.14)", "5px 5px 0 rgba(22,33,58,0.2)"),
            }}
          >
            {o.texte}
            {o.alerte > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  minWidth: 19,
                  padding: "1px 6px",
                  borderRadius: 999,
                  background: CORAL,
                  color: INK,
                  border: `1.5px solid ${INK}`,
                }}
              >
                {o.alerte}
              </span>
            )}
          </button>
        ))}
      </div>

      {onglet === "apercu" && (
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
        </>
      )}

      {onglet === "apercu" && (
        <>
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
        </>
      )}

      {onglet === "scrutins" && (
        <>
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
        </>
      )}

      {onglet === "scrutins" && (
        <>
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
        </>
      )}

      {onglet === "personnes" && (
        <>
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
        </>
      )}

      {onglet === "jeux" && (
        <>
      {/* ⚠️ CET ONGLET DIT CE QU'IL NE SAIT PAS, ET C'EST LE POINT. La Régie
          mesure les scrutins — bulletins, partages, canaux, signalements — et
          ne mesure RIEN des jeux : ni les journées jouées, ni les joueurs, ni
          les salles ouvertes, alors que six salles ont vécu sur les sept
          derniers jours. Le seul geste qu'elle y offre est de retirer un
          pseudo. Écrire l'absence vaut mieux que de laisser croire qu'un onglet
          presque vide est un produit peu utilisé. */}
      <div style={{ ...card, marginBottom: 16, borderStyle: "dashed" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, marginBottom: 6 }}>
          {t("jeuxTitre")}
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: MUTED, margin: 0, lineHeight: 1.5 }}>
          {t("jeuxManque")}
        </p>
      </div>

      {/* ══ LES COMPTES QUI JOUENT, ET LEURS NOTIFICATIONS ════════════════════
          Demandé : « voir les comptes créés avec application des notifs ».

          ⚠️ CES COMPTES-LÀ N'APPARAISSENT PAS DANS « PERSONNES », et c'est ce
          que la question a révélé : `scrutin_admin_list_users` filtre sur un
          scrutin, un espace, un événement ou un rôle d'admin. Un compte créé
          depuis un jeu n'a rien de tout ça — la Régie ne voyait littéralement
          pas ses joueurs.

          ⚠️ LA COLONNE QUI COMPTE EST LA DERNIÈRE NOTIFICATION. Des appareils
          abonnés et « jamais » en face, c'est exactement le défaut qu'on vient
          de corriger : la tournée sortait en silence sur un numéro de journée
          `NaN`. Sans cette colonne, rien ne le montrait nulle part.

          ⚠️ ET C'EST ICI QUE LE PSEUDO SE RETIRE, DEPUIS QUE LA SECONDE CARTE A
          DISPARU. Il y avait deux listes de comptes l'une sous l'autre — celle-ci
          nommait déjà le pseudo à côté de l'adresse, et la suivante ne portait
          que ce même pseudo avec son bouton. Signalé comme un doublon, et c'en
          était un : deux listes qui répondent à la même question finissent
          toujours par diverger.

          ⚠️ AUCUNE COUVERTURE PERDUE, ET C'EST VÉRIFIÉ DANS LA FONCTION :
          `scrutin_admin_notifs` retient un compte dès qu'il a un abonnement, un
          pseudo (`or p.user_id is not null`), une journée de Banalo OU une de
          Cinq sur cinq. Tout porteur de pseudo est donc dans cette liste — la
          prise de la Régie reste entière. Elle est bornée à 200 comptes, comme
          l'était `scrutin_admin_pseudos`.

          ⚠️ LE BOUTON NE SORT QUE POUR UN COMPTE QUI A UN PSEUDO : un compte qui
          n'en a pas n'a rien à retirer, et un bouton mort se presse quand même.
          `PAS D'ACCROCHE SANS BOUTON`, la règle d'`InstallJeu`, dans l'autre
          sens. */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, marginBottom: 6 }}>
          {t("notifsTitre")}
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: MUTED, margin: "4px 0 4px", lineHeight: 1.5 }}>
          {t("notifsHint")}
        </p>
        {/* ⚠️ LA RÈGLE DU BLOCAGE SUIT LE BOUTON. Elle vivait sous le titre de la
            carte des pseudos ; sans elle, « Retirer » à côté d'une adresse
            e-mail se lit comme « supprimer ce compte ». On bloque un NOM. */}
        <p style={{ fontSize: 13, fontWeight: 600, color: MUTED, margin: "0 0 12px", lineHeight: 1.5 }}>
          {t("pseudosHint")}
        </p>
        {notifs.length === 0 ? (
          <p style={{ fontSize: 13.5, fontWeight: 600, color: MUTED, margin: 0 }}>{t("notifsVide")}</p>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {notifs.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  flexWrap: "wrap",
                  padding: "8px 10px",
                  borderRadius: 8,
                  // Deux états se peignent, et le BLOCAGE l'emporte : « abonné
                  // mais jamais servi » est un défaut à surveiller, un pseudo
                  // retiré est une décision prise. Sans priorité, un compte
                  // bloqué et jamais notifié se serait affiché en jaune, donc
                  // comme non bloqué.
                  background: c.bloque
                    ? "#ffe1e0"
                    : c.appareils > 0 && !c.derniereNotif
                      ? "#fff4d6"
                      : "transparent",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 13.5, flex: "1 1 190px", minWidth: 0,
                               overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c.email || c.id}
                  {c.pseudo ? (
                    <span style={{ color: MUTED, fontWeight: 600 }}> · {c.pseudo}</span>
                  ) : null}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {t("notifsAppareils", { n: c.appareils })}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: MUTED, fontVariantNumeric: "tabular-nums" }}>
                  {t("notifsJournees", { n: c.journees })}
                </span>
                {/* ⚠️ LES TROIS GENRES NE S'AFFICHENT QUE QUAND L'UN EST COUPÉ.
                    Vrais par défaut, les montrer toujours ferait trois pastilles
                    identiques sur chaque ligne — du mobilier. */}
                {c.journee && c.hebdo && c.saison ? null : (
                  <span style={{ fontSize: 12, fontWeight: 700, color: MUTED }}>
                    {[c.journee ? null : t("notifsSansJournee"),
                      c.hebdo ? null : t("notifsSansHebdo"),
                      c.saison ? null : t("notifsSansSaison")].filter(Boolean).join(" · ")}
                  </span>
                )}
                <span style={{ fontSize: 12.5, fontWeight: 700,
                               color: c.derniereNotif ? MUTED : "#8a6100" }}>
                  {c.derniereNotif ? c.derniereNotif.slice(0, 10) : t("notifsJamais")}
                </span>
                {c.pseudo
                  ? actionBtn(
                      c.bloque ? `↩ ${t("pseudoUnblock")}` : `🚫 ${t("pseudoBlock")}`,
                      () => void basculePseudo(c),
                      busy === c.id,
                      c.bloque ? undefined : "#ffe1e0",
                    )
                  : null}
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}

    </>,
  );
}
