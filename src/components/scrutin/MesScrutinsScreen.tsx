"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AuthController } from "@/lib/auth/useAuth";
import {
  getHiddenTokens,
  getLocalPolls,
  getTrash,
  purgeFromTrash,
  restoreFromTrash,
  trashPoll,
  type LocalPoll,
  type TrashedPoll,
} from "@/lib/db/localPolls";
import { getMyPolls, pollPhase, type Phase, type PollRow } from "@/lib/db/polls";
import { APP_URL } from "@/lib/voting/aiPrompt";
import type { ScrutinController } from "@/lib/voting/useScrutin";
import NotifyButton from "@/components/pwa/NotifyButton";
import BrandSettings from "./BrandSettings";
import ShareRow from "./ShareRow";
import { intlLocale } from "@/i18n/locales";
import { CREAM, FONT_DISPLAY, GREEN, GREENTXT, INK, MUTED, REDTXT, SUBINK, YELLOW } from "./theme";

interface Item {
  token: string;
  question: string;
  createdAt: number;
  secret: string | null;
  poll: PollRow | null;
}

export default function MesScrutinsScreen({ ctrl, auth }: { ctrl: ScrutinController; auth: AuthController }) {
  const { go } = ctrl;
  const t = useTranslations("MyPolls");
  const locale = useLocale();
  const [locals, setLocals] = useState<LocalPoll[]>([]);
  const [cloud, setCloud] = useState<PollRow[]>([]);
  const [trash, setTrash] = useState<TrashedPoll[]>([]);
  const [showTrash, setShowTrash] = useState(false);

  const reloadLocal = useCallback(() => {
    setLocals(getLocalPolls());
    setTrash(getTrash());
  }, []);

  useEffect(() => {
    reloadLocal();
  }, [reloadLocal]);

  useEffect(() => {
    if (!auth.user) {
      setCloud([]);
      return;
    }
    getMyPolls()
      .then(setCloud)
      .catch(() => setCloud([]));
  }, [auth.user]);

  // Suppression = mise à la CORBEILLE (recouvrable), pas un effacement immédiat.
  const trashItem = (p: Item) => {
    if (!p.secret) return;
    trashPoll({ token: p.token, secret: p.secret, question: p.question, createdAt: p.createdAt });
    reloadLocal();
  };
  const onRestore = (token: string) => {
    restoreFromTrash(token);
    reloadLocal();
  };
  const onPurge = (token: string) => {
    if (typeof window !== "undefined" && !window.confirm(t("confirmPurge"))) return;
    purgeFromTrash(token);
    reloadLocal();
  };

  const fmtDate = (ms: number) =>
    Number.isFinite(ms) ? new Date(ms).toLocaleDateString(intlLocale(locale), { day: "numeric", month: "short", year: "numeric" }) : "";

  const localTokens = new Set(locals.map((p) => p.token));
  // Exclut de la liste principale ce qui est à la corbeille ou masqué définitivement
  // (y compris les lignes cloud qui reviendraient du compte).
  const hidden = getHiddenTokens();
  // On garde le PollRow cloud accessible par token pour afficher l'état (phase) même
  // sur une ligne locale qui a aussi été rattachée au compte.
  const cloudByToken = new Map(cloud.map((c) => [c.token, c]));
  const items: Item[] = [
    ...locals.map((p) => ({ token: p.token, question: p.question, createdAt: p.createdAt, secret: p.secret, poll: cloudByToken.get(p.token) ?? null })),
    ...cloud
      .filter((c) => !localTokens.has(c.token))
      .map((c) => ({ token: c.token, question: c.question, createdAt: Date.parse(c.created_at), secret: null, poll: c })),
  ]
    .filter((it) => !hidden.has(it.token))
    .sort((a, b) => b.createdAt - a.createdAt);

  // Badge d'état (phase) : « gérer » ses scrutins est impossible sans voir lequel est
  // ouvert / clos / en collecte / programmé.
  const PHASE_STYLE: Record<Phase, { bg: string; fg: string; key: string }> = {
    open: { bg: GREEN, fg: "#fff", key: "phaseOpen" },
    proposals: { bg: YELLOW, fg: INK, key: "phaseProposals" },
    scheduled: { bg: YELLOW, fg: INK, key: "phaseScheduled" },
    closed: { bg: INK, fg: "#fff", key: "phaseClosed" },
  };
  const phaseBadge = (poll: PollRow) => {
    const ph = pollPhase(poll);
    const s = PHASE_STYLE[ph];
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          background: s.bg,
          color: s.fg,
          border: `2px solid ${INK}`,
          borderRadius: 20,
          padding: "2px 10px",
          fontWeight: 700,
          fontSize: 11.5,
        }}
      >
        {t(s.key)}
      </span>
    );
  };

  return (
    <div className="pad" style={{ maxWidth: 880, margin: "0 auto", padding: "40px 24px 100px" }}>
      <h1
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 800,
          fontSize: "clamp(30px,4.5vw,46px)",
          letterSpacing: "-0.03em",
          margin: 0,
        }}
      >
        {t("title")}
      </h1>
      <p style={{ fontSize: 15, color: SUBINK, margin: "12px 0 0", lineHeight: 1.5, maxWidth: "60ch" }}>
        {t("subtitle")}
      </p>

      {/* bandeau connexion */}
      {auth.user ? (
        <div
          style={{
            marginTop: 18,
            background: "#e9f8e2",
            border: `2px solid ${INK}`,
            borderRadius: 12,
            padding: "11px 14px",
            fontSize: 13.5,
            fontWeight: 600,
            color: "#1f6b34",
          }}
        >
          {t("connectedPrefix")}{auth.user.email ? ` (${auth.user.email})` : ""}{t("connectedSuffix")}
          <div style={{ marginTop: 10 }}>
            <NotifyButton label={t("notifyActivity")} />
          </div>
          <BrandSettings />
        </div>
      ) : (
        <div
          style={{
            marginTop: 18,
            background: "#fff",
            border: `2px solid ${INK}`,
            borderRadius: 12,
            padding: "12px 14px",
            display: "flex",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 13.5, color: MUTED, fontWeight: 600 }}>
            {t("signInHint")}
          </span>
          <button
            onClick={auth.signIn}
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              border: `2.5px solid ${INK}`,
              background: INK,
              color: "#fff",
              padding: "9px 16px",
              borderRadius: 11,
            }}
          >
            {t("signInGoogle")}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div
          style={{
            marginTop: 22,
            background: "#fff",
            border: `2.5px solid ${INK}`,
            borderRadius: 18,
            padding: 28,
            textAlign: "center",
            boxShadow: `5px 5px 0 ${INK}`,
          }}
        >
          <div style={{ fontSize: 15, color: MUTED }}>{t("empty")}</div>
          <button
            onClick={() => go("create")}
            style={{
              marginTop: 16,
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
              border: `2.5px solid ${INK}`,
              background: INK,
              color: "#fff",
              padding: "12px 20px",
              borderRadius: 12,
            }}
          >
            {t("createPoll")}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 22 }}>
          {items.map((p) => {
            const voteUrl = `${APP_URL}/v/${p.token}`;
            const adminUrl = p.secret ? `${APP_URL}/v/${p.token}?k=${p.secret}` : null;
            return (
              <div
                key={p.token}
                style={{
                  background: "#fff",
                  border: `2.5px solid ${INK}`,
                  borderRadius: 16,
                  padding: 18,
                  boxShadow: `4px 4px 0 ${INK}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18, lineHeight: 1.15 }}>
                      {p.question}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12.5, color: MUTED, marginTop: 6 }}>
                      {p.poll && phaseBadge(p.poll)}
                      <span>{fmtDate(p.createdAt)}</span>
                      {!p.secret && <span>{t("cloudAccount")}</span>}
                    </div>
                  </div>
                  {p.secret && (
                    <button
                      onClick={() => trashItem(p)}
                      title={t("moveToTrash")}
                      aria-label={t("moveToTrash")}
                      style={{
                        flex: "none",
                        width: 32,
                        height: 32,
                        border: `2px solid ${INK}`,
                        background: "#fff",
                        borderRadius: 9,
                        cursor: "pointer",
                        fontSize: 14,
                        color: REDTXT,
                        lineHeight: 1,
                      }}
                    >
                      🗑
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", gap: 9, marginTop: 14, flexWrap: "wrap" }}>
                  <a
                    href={voteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      textDecoration: "none",
                      fontWeight: 700,
                      fontSize: 13.5,
                      border: `2px solid ${INK}`,
                      background: INK,
                      color: "#fff",
                      padding: "9px 14px",
                      borderRadius: 10,
                    }}
                  >
                    {t("openResults")}
                  </a>
                  {adminUrl && (
                    <a
                      href={adminUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        textDecoration: "none",
                        fontWeight: 700,
                        fontSize: 13.5,
                        border: `2px solid ${INK}`,
                        background: CREAM,
                        color: INK,
                        padding: "9px 14px",
                        borderRadius: 10,
                      }}
                    >
                      {t("manage")}
                    </a>
                  )}
                </div>
                {/* Relancer la participation : partage du lien de vote nu (jamais le
                    lien admin) tant que le scrutin est ouvert. Boutons à ICÔNE (compact,
                    surtout mobile) : copier, WhatsApp, partage natif. */}
                {p.poll && pollPhase(p.poll) !== "closed" && p.poll.access_mode === "open" && (
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12, color: MUTED, fontWeight: 700 }}>{t("inviteToVote")}</div>
                    <ShareRow question={p.question} url={voteUrl} withCopy iconOnly />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Corbeille : scrutins retirés mais recouvrables (restaurer / supprimer). */}
      {trash.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <button
            onClick={() => setShowTrash((v) => !v)}
            aria-expanded={showTrash}
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 13.5,
              cursor: "pointer",
              border: `2px solid ${INK}`,
              background: showTrash ? INK : "transparent",
              color: showTrash ? "#fff" : INK,
              padding: "8px 15px",
              borderRadius: 20,
            }}
          >
            🗑 {t("trashTitle", { count: trash.length })} {showTrash ? "▴" : "▸"}
          </button>
          {showTrash && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
              {trash.map((p) => (
                <div
                  key={p.token}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    background: CREAM,
                    border: `2px solid ${INK}`,
                    borderRadius: 12,
                    padding: "11px 14px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{p.question}</div>
                    <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>{fmtDate(p.createdAt)}</div>
                  </div>
                  <button
                    onClick={() => onRestore(p.token)}
                    style={{
                      fontWeight: 700,
                      fontSize: 12.5,
                      cursor: "pointer",
                      border: `2px solid ${INK}`,
                      background: GREENTXT,
                      color: "#fff",
                      padding: "7px 12px",
                      borderRadius: 9,
                    }}
                  >
                    ↩ {t("restore")}
                  </button>
                  <button
                    onClick={() => onPurge(p.token)}
                    style={{
                      fontWeight: 700,
                      fontSize: 12.5,
                      cursor: "pointer",
                      border: `2px solid ${INK}`,
                      background: "#fff",
                      color: REDTXT,
                      padding: "7px 12px",
                      borderRadius: 9,
                    }}
                  >
                    {t("deleteForever")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
