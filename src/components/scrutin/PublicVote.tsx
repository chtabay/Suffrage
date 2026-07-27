"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { intlLocale } from "@/i18n/locales";
import PlacetMark from "./PlacetMark";
import {
  addBallot,
  addProposal,
  addProposalOpen,
  castInvitedBallot,
  castPublicBallot,
  closePoll,
  openVoting,
  editProposalNote,
  removeProposal,
  getAssignData,
  getBallots,
  addComment,
  getComments,
  getPollByToken,
  getPollMessages,
  getVoterContext,
  getVoters,
  leavePollMessage,
  pollPhase,
  reopenPoll,
  reportPoll,
  setPollVisibility,
  type BallotComment,
  type PollMessage,
  type PollRow,
  type ReportReason,
  type Voter,
  type VoterContext,
} from "@/lib/db/polls";
import { trackShare } from "@/lib/db/track";
import { isPlaceUrl, optionIllustration, optionPlace, resolvePlace } from "@/lib/voting/geo";
import {
  compute,
  describeRecipe,
  resolveKey,
  methodMode,
  normalizeFromApproved,
  normalizeFromGrades,
  normalizeFromRank,
  normalizeFromSingle,
  operativeMethod,
} from "@/lib/voting/engine";
import { resolveScale } from "@/lib/voting/scales";
import { getPollBrand, type Brand } from "@/lib/db/brand";
import { getArguments, type Argument } from "@/lib/db/arguments";
import type { Ballot, BallotMode, ComputeResult, Option } from "@/lib/voting/types";
import { APP_URL } from "@/lib/voting/aiPrompt";
import InstallInline from "@/components/pwa/InstallInline";
import NotifyButton from "@/components/pwa/NotifyButton";
import BallotCard, { EMPTY_DRAFT, type BallotDraft } from "./BallotCard";
import PollMap from "./PollMap";
import PollCalendar from "./PollCalendar";
import ProposalAiHelper from "./ProposalAiHelper";
import ResultCard from "./ResultCard";
import ArgumentsPanel from "./ArgumentsPanel";
import AssignResult from "./AssignResult";
import { ASSIGN_METHODS, isAssignMethod } from "@/lib/assign/methods";
import type { AssignRowData } from "@/lib/assign/run";
import ResultShare from "./ResultShare";
import QrCode from "./QrCode";
import ShareRow from "./ShareRow";
import { CORAL, CREAM, FONT_BODY, FONT_DISPLAY, GREEN, INK, MUTED, REDTXT, SUBINK, YELLOW, lift } from "./theme";

// Clés i18n des consignes par mode de vote (résolues via t() au rendu).
const INSTRUCTIONS: Record<string, string> = {
  single: "instructionSingle",
  approve: "instructionApprove",
  rank: "instructionRank",
  grade: "instructionGrade",
};

function draftToBallot(mode: BallotMode, draft: BallotDraft, n: number, nGrades = 6): Ballot | null {
  const seed = Math.floor(Math.random() * 100000);
  if (mode === "single") return draft.choice === null ? null : normalizeFromSingle(draft.choice, n, seed);
  if (mode === "approve") return draft.approved.length ? normalizeFromApproved(draft.approved, n, seed) : null;
  if (mode === "rank") return draft.rank.length ? normalizeFromRank(draft.rank, n, seed) : null;
  return normalizeFromGrades(draft.grades, n, seed, nGrades);
}

const electorsOf = (p: PollRow): number[] | undefined => (p.districts ? p.districts.map((d) => d.electors) : undefined);
const voterCanSeeResults = (p: PollRow) => p.status === "closed" || !p.hide_results;

// Test concierge (monétisation) : proposer un « PV officiel » payant du résultat.
// Le lien Stripe passe le token en client_reference_id pour identifier le scrutin.
function OfficialRecordCta({ token }: { token: string }) {
  const t = useTranslations("Vote");
  const link = process.env.NEXT_PUBLIC_PV_PAYMENT_LINK;
  if (!link) return null;
  return (
    <a
      href={`${link}?client_reference_id=${encodeURIComponent(token)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="dc-lift"
      style={{
        display: "block",
        marginTop: 22,
        textDecoration: "none",
        background: YELLOW,
        border: `2.5px solid ${INK}`,
        borderRadius: 16,
        padding: "16px 18px",
        boxShadow: `4px 4px 0 ${INK}`,
        color: INK,
      }}
    >
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16 }}>{t("officialRecordTitle")}</div>
      <div style={{ fontSize: 13, color: INK, marginTop: 5, lineHeight: 1.45 }}>
        {t("officialRecordDesc")}
      </div>
    </a>
  );
}

// Déclencheur direct : après un vote, signale au serveur (notif si le scrutin vient de se clore).
function pingPollEvent(token: string) {
  void fetch("/api/notify/poll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  }).catch(() => {});
}

// Marqueur local « déjà voté » des scrutins PUBLICS : la dédup serveur (empreinte
// IP) est la vraie garde ; ce marqueur évite juste de représenter un bulletin
// inutile au retour sur la page.
const votedKey = (token: string) => `scrutin.voted.${token}`;
const hasVotedLocally = (token: string) => {
  try {
    return localStorage.getItem(votedKey(token)) === "1";
  } catch {
    return false;
  }
};
const markVotedLocally = (token: string) => {
  try {
    localStorage.setItem(votedKey(token), "1");
  } catch {
    /* stockage indisponible : la dédup serveur suffit */
  }
};

// Signalement d'un scrutin public : lien discret en pied de page, 4 raisons,
// envoi anonyme via la RPC (masquage automatique à 3 signalements).
function ReportFold({ token }: { token: string }) {
  const t = useTranslations("Vote");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const REASONS: { key: ReportReason; labelKey: string }[] = [
    { key: "spam", labelKey: "reasonSpam" },
    { key: "offensive", labelKey: "reasonOffensive" },
    { key: "illegal", labelKey: "reasonIllegal" },
    { key: "other", labelKey: "reasonOther" },
  ];
  if (done) {
    return (
      <div style={{ marginTop: 26, textAlign: "center", fontSize: 12.5, color: MUTED, fontWeight: 600 }}>
        ✓ {done}
      </div>
    );
  }
  const send = async () => {
    if (!reason) return;
    setSending(true);
    try {
      const r = await reportPoll(token, reason);
      setDone(r === "already" ? t("reportAlready") : t("reportSent"));
    } catch {
      // Confirmation sobre même en échec réseau : pas de friction sur un signalement.
      setDone(t("reportSent"));
    } finally {
      setSending(false);
    }
  };
  return (
    <div style={{ marginTop: 26, textAlign: "center" }}>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            fontFamily: FONT_BODY,
            fontWeight: 600,
            fontSize: 12.5,
            cursor: "pointer",
            border: "none",
            background: "none",
            color: MUTED,
            textDecoration: "underline",
            padding: 4,
          }}
        >
          🚩 {t("reportCta")}
        </button>
      ) : (
        <div style={{ ...card, textAlign: "left", maxWidth: 420, margin: "0 auto" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15 }}>🚩 {t("reportTitle")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 11 }}>
            {REASONS.map((r) => {
              const on = reason === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setReason(r.key)}
                  style={{
                    fontFamily: FONT_BODY,
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: "pointer",
                    border: `2px solid ${INK}`,
                    padding: "7px 12px",
                    borderRadius: 9,
                    background: on ? INK : CREAM,
                    color: on ? "#fff" : INK,
                  }}
                >
                  {t(r.labelKey)}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={send}
            disabled={!reason || sending}
            style={{
              marginTop: 12,
              width: "100%",
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 13.5,
              cursor: !reason || sending ? "default" : "pointer",
              border: `2px solid ${INK}`,
              background: INK,
              color: "#fff",
              padding: 10,
              borderRadius: 10,
              opacity: !reason || sending ? 0.5 : 1,
            }}
          >
            {sending ? t("submitting") : t("reportSend")}
          </button>
        </div>
      )}
    </div>
  );
}

// Partage replié côté votant : la viralité reste à un tap, sans encombrer
// l'action principale (voter / lire le résultat). L'organisateur, lui, garde
// son bloc de partage déplié — partager est SON action principale.
function ShareFold({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 16, textAlign: "center" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 13.5,
          cursor: "pointer",
          border: `2px solid ${INK}`,
          background: open ? INK : "transparent",
          color: open ? "#fff" : INK,
          padding: "8px 16px",
          borderRadius: 20,
        }}
      >
        📤 {label} {open ? "▴" : "▸"}
      </button>
      {open && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  );
}

// Messages laissés par les votants, détachés des choix (secret du vote préservé).
function CommentsFeed({ comments }: { comments: BallotComment[] }) {
  const t = useTranslations("Vote");
  if (!comments.length) return null;
  return (
    <div
      style={{
        marginTop: 22,
        background: "#fff",
        border: `2.5px solid ${INK}`,
        borderRadius: 16,
        padding: "16px 18px",
        boxShadow: `4px 4px 0 ${INK}`,
      }}
    >
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16 }}>
        💬 {t("votersMessages")} ({comments.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 12 }}>
        {comments.map((c, i) => (
          <div key={i} style={{ borderLeft: `3px solid ${YELLOW}`, paddingLeft: 11 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: INK }}>{c.author || t("anonymous")}</div>
            <div style={{ fontSize: 14, color: SUBINK, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{c.comment}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Message privé à l'organisateur (scrutins rattachés à un compte uniquement) :
// stocké à part des bulletins — impossible de relier un message à un choix de vote.
// Carte « mot à l'organisateur » : action à valeur (lead-gen opt-in). Visible et
// non repliée — bénéfice explicite + ligne de confiance TOUJOURS affichée (le
// message et les coordonnées vont dans une table détachée, jamais reliés au vote).
function MessageToOrganizer({ token }: { token: string }) {
  const t = useTranslations("Vote");
  const [body, setBody] = useState("");
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);
  if (sent) {
    return (
      <div style={{ ...card, marginTop: 16, textAlign: "center", background: "#f2faf4" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, color: "#1f6b34" }}>
          ✓ {t("msgOrgaSent")}
        </div>
      </div>
    );
  }
  const send = async () => {
    setSending(true);
    setFailed(false);
    try {
      const r = await leavePollMessage(token, body, contact);
      if (r === "ok") setSent(true);
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  };
  const field = {
    fontFamily: FONT_BODY,
    fontSize: 14,
    fontWeight: 500,
    padding: "10px 12px",
    border: `2px solid ${INK}`,
    borderRadius: 10,
    background: CREAM,
    outline: "none",
    boxSizing: "border-box",
    width: "100%",
  } as const;
  return (
    <div style={{ ...card, marginTop: 16, background: CREAM }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16 }}>✉️ {t("msgOrgaCardTitle")}</div>
      <p style={{ color: MUTED, fontSize: 13.5, lineHeight: 1.5, marginTop: 6 }}>{t("msgOrgaCardSub")}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("msgOrgaPlaceholder")}
          maxLength={1000}
          rows={3}
          style={{ ...field, background: "#fff", resize: "vertical" }}
        />
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={t("msgOrgaContactPlaceholder")}
          maxLength={160}
          style={{ ...field, background: "#fff" }}
        />
      </div>
      <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginTop: 9, lineHeight: 1.45 }}>
        🔒 {t("msgOrgaHint")}
      </div>
      {failed && <div style={{ marginTop: 10, color: REDTXT, fontWeight: 700, fontSize: 13 }}>{t("msgOrgaError")}</div>}
      <button
        onClick={send}
        disabled={!body.trim() || sending}
        style={{
          marginTop: 12,
          width: "100%",
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 14,
          cursor: !body.trim() || sending ? "default" : "pointer",
          border: `2.5px solid ${INK}`,
          background: INK,
          color: "#fff",
          padding: 11,
          borderRadius: 11,
          opacity: !body.trim() || sending ? 0.5 : 1,
        }}
      >
        {sending ? t("submitting") : `✉️ ${t("msgOrgaSend")}`}
      </button>
    </div>
  );
}

// Bloc COMPACT « amener d'autres votants » : partage du SCRUTIN (pas du résultat)
// tant qu'il est ouvert. Réservé à l'accès ouvert (en invitation, le lien nu
// mènerait à « invitation requise »). Réutilise la barre de partage compacte.
function InviteMoreVoters({ question, url }: { question: string; url: string }) {
  const t = useTranslations("Vote");
  if (!url) return null;
  return (
    <div style={{ ...card, marginTop: 16, background: "#fffaf0" }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15 }}>📣 {t("inviteVotersTitle")}</div>
      <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.5, margin: "5px 0 12px" }}>{t("inviteVotersSub")}</p>
      <ShareRow question={question} url={url} withCopy iconOnly />
    </div>
  );
}

// Rend un contact laissé par un votant ACTIONNABLE : lien mailto/tel si on
// reconnaît un email ou un téléphone, sinon texte ; toujours un bouton copier.
function contactHref(c: string): string | null {
  const s = c.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return `mailto:${s}`;
  const digits = s.replace(/[^\d+]/g, "");
  if (digits.replace(/\D/g, "").length >= 7) return `tel:${digits}`;
  return null;
}

function ContactRow({ contact }: { contact: string }) {
  const t = useTranslations("Vote");
  const [copied, setCopied] = useState(false);
  const href = contactHref(contact);
  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(contact);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* presse-papiers indisponible : le contact reste sélectionnable */
    }
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
      <span style={{ fontSize: 13 }}>📇</span>
      {href ? (
        <a href={href} style={{ fontWeight: 700, fontSize: 13, color: INK }}>
          {contact}
        </a>
      ) : (
        <span style={{ fontWeight: 700, fontSize: 13, color: INK }}>{contact}</span>
      )}
      <button
        onClick={copy}
        aria-live="polite"
        style={{
          fontWeight: 700,
          fontSize: 11.5,
          cursor: "pointer",
          border: `2px solid ${INK}`,
          background: copied ? GREEN : "#fff",
          color: copied ? "#fff" : INK,
          padding: "3px 9px",
          borderRadius: 8,
        }}
      >
        {copied ? "✓" : t("copy")}
      </button>
    </div>
  );
}

// Bouton « copier le lien » cohérent (reset après 1,6 s, annonce a11y). Le lien
// maître du scrutin n'en avait aucun, alors que chaque lien votant en a un.
function LinkCopyBtn({ url }: { url: string }) {
  const t = useTranslations("Vote");
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(url);
      // Sans API clipboard, `?.` résout sans copier : on ne compte alors rien.
      if (navigator.clipboard) trackShare(url, "copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* presse-papiers indisponible : le champ reste sélectionnable */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className="dc-lift"
      style={{
        fontFamily: FONT_DISPLAY,
        fontWeight: 700,
        fontSize: 14,
        cursor: "pointer",
        border: `2.5px solid ${INK}`,
        background: copied ? GREEN : CREAM,
        color: copied ? "#fff" : INK,
        padding: "11px 16px",
        borderRadius: 11,
      }}
    >
      {copied ? t("linkCopied") : t("copyLink")}
    </button>
  );
}

// Boîte de réception privée de l'organisateur. Scrutin non rattaché à un compte :
// simple incitation à se connecter (le dépôt est de toute façon bloqué en base).
function PrivateMessagesCard({ owned, messages, locale }: { owned: boolean; messages: PollMessage[]; locale: string }) {
  const t = useTranslations("Vote");
  if (!owned) {
    return (
      <div style={{ marginTop: 16, fontSize: 12.5, color: MUTED, fontWeight: 600, lineHeight: 1.5 }}>
        💡 {t("privateMessagesTeaser")}
      </div>
    );
  }
  return (
    <div id="leads" style={{ ...card, marginTop: 16, scrollMarginTop: 16 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16 }}>
        ✉️ {t("privateMessagesTitle")} ({messages.length})
      </div>
      <div style={{ fontSize: 12.5, color: MUTED, fontWeight: 600, marginTop: 4 }}>🔒 {t("privateMessagesOnlyYou")}</div>
      {messages.length === 0 ? (
        <div style={{ marginTop: 12, fontSize: 14, color: MUTED, lineHeight: 1.5 }}>{t("privateMessagesEmpty")}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ borderLeft: `3px solid ${CORAL}`, paddingLeft: 11 }}>
              <div style={{ fontSize: 14, color: SUBINK, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{m.body}</div>
              {m.contact && <ContactRow contact={m.contact} />}
              <div style={{ fontSize: 11.5, color: MUTED, marginTop: 3 }}>{fmtDateTime(m.created_at, locale)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type View =
  | "loading"
  | "notfound"
  | "needsInvite"
  | "scheduled"
  | "proposals"
  | "vote"
  | "thanks"
  | "results"
  | "organizer"
  | "closed";

// Logo de marque de l'organisateur (image distante). Repli silencieux sur le nom
// (ou rien) si l'URL est cassée. Cliquable vers le site de l'organisateur si un
// lien http(s) est renseigné (nouvel onglet, pour ne pas interrompre le vote).
function BrandLogo({ brand }: { brand: Brand }) {
  const [broken, setBroken] = useState(false);
  const content =
    brand.logoUrl && !broken ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={brand.logoUrl}
        alt={brand.name ?? ""}
        onError={() => setBroken(true)}
        style={{ height: 34, maxWidth: 190, objectFit: "contain", display: "block" }}
      />
    ) : brand.name ? (
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em", color: INK }}>
        {brand.name}
      </div>
    ) : null;
  if (!content) return null;
  const link = brand.url && /^https?:\/\//i.test(brand.url) ? brand.url : null;
  if (link) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
        {content}
      </a>
    );
  }
  return content;
}

function Header({ brand }: { brand?: Brand | null }) {
  const t = useTranslations("Vote");
  const branded = Boolean(brand && (brand.logoUrl || brand.name));
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(6px)",
        background: "rgba(251,246,236,0.82)",
        borderBottom: `2.5px solid ${INK}`,
      }}
    >
      {branded && brand?.accent && <div style={{ height: 5, background: brand.accent }} />}
      <div
        className="pad"
        style={{ maxWidth: 880, margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
      >
        {branded ? (
          <>
            <BrandLogo brand={brand!} />
            <a
              href="https://placet.app"
              target="_blank"
              rel="noopener noreferrer"
              title="Placet"
              style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", color: MUTED, fontSize: 12, fontWeight: 700 }}
            >
              {t("poweredBy")} <PlacetMark size={20} />
            </a>
          </>
        ) : (
          <>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none", color: INK }}>
              <PlacetMark size={38} />
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 21, letterSpacing: "-0.02em" }}>
                Placet
              </div>
            </Link>
            {/* Pont vers le produit : la page de vote est la 1re surface d'acquisition
                (on y arrive par lien partagé) — offrir une sortie « découvrir / créer »
                sans concurrencer le bulletin. Uniquement en en-tête non brandé. */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Link
                href="/explorer"
                style={{ textDecoration: "none", color: MUTED, fontSize: 13, fontWeight: 700 }}
              >
                {t("discoverExploreLink")}
              </Link>
              <Link
                href="/new"
                style={{
                  textDecoration: "none",
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 13,
                  color: INK,
                  border: `2px solid ${INK}`,
                  background: CREAM,
                  padding: "7px 13px",
                  borderRadius: 10,
                }}
              >
                {t("discoverCreateCta")}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const card = {
  background: "#fff",
  border: `2.5px solid ${INK}`,
  borderRadius: 16,
  padding: 18,
  boxShadow: `5px 5px 0 ${INK}`,
} as const;

function Shell({ children, brand }: { children: React.ReactNode; brand?: Brand | null }) {
  return (
    <>
      <Header brand={brand} />
      <div className="pad" style={{ maxWidth: 880, margin: "0 auto", padding: "32px 24px 100px" }}>
        {children}
      </div>
    </>
  );
}

function VoterLinkRow({ v }: { v: Voter & { url: string } }) {
  const t = useTranslations("Vote");
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        title={v.voted ? t("hasVoted") : t("pending")}
        style={{ flex: "none", fontSize: 14, color: v.voted ? GREEN : MUTED, fontWeight: 800 }}
      >
        {v.voted ? "✓" : "•"}
      </span>
      <span
        style={{
          width: 92,
          flex: "none",
          fontWeight: 700,
          fontSize: 13,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {v.label}
      </span>
      <input
        readOnly
        value={v.url}
        onFocus={(e) => e.currentTarget.select()}
        style={{
          flex: 1,
          minWidth: 110,
          fontFamily: FONT_BODY,
          fontSize: 12,
          fontWeight: 600,
          padding: "7px 9px",
          border: `2px solid ${INK}`,
          borderRadius: 9,
          background: CREAM,
          outline: "none",
        }}
      />
      <button
        onClick={async () => {
          try {
            await navigator.clipboard?.writeText(v.url);
            setCopied(true);
          } catch {
            /* ignore */
          }
        }}
        style={{
          flex: "none",
          fontWeight: 700,
          fontSize: 12,
          cursor: "pointer",
          border: `2px solid ${INK}`,
          background: copied ? GREEN : YELLOW,
          color: copied ? "#fff" : INK,
          padding: "7px 11px",
          borderRadius: 9,
        }}
      >
        {copied ? "✓" : t("copy")}
      </button>
    </div>
  );
}

function fmtDateTime(iso: string, locale = "fr") {
  return new Date(iso).toLocaleString(intlLocale(locale), { dateStyle: "long", timeStyle: "short" });
}

function Countdown({ closesAt, onExpire, prefix }: { closesAt: string; onExpire: () => void; prefix?: string }) {
  const t = useTranslations("Vote");
  const [now, setNow] = useState<number | null>(null);
  const target = Date.parse(closesAt);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (now !== null && now >= target) onExpire();
  }, [now, target, onExpire]);
  if (now === null) return null;
  const total = Math.max(0, Math.floor((target - now) / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const label =
    d > 0
      ? `${d} ${t("unitDay")} ${h} ${t("unitHour")} ${m} ${t("unitMin")}`
      : h > 0
        ? `${h} ${t("unitHour")} ${m} ${t("unitMin")} ${s} ${t("unitSec")}`
        : `${m} ${t("unitMin")} ${s} ${t("unitSec")}`;
  return (
    <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: MUTED }}>⏲ {prefix ?? t("closesIn")} {label}</div>
  );
}

function QuorumBanner({ quorum, count }: { quorum: number; count: number }) {
  const t = useTranslations("Vote");
  if (count >= quorum) return null;
  return (
    <div
      style={{
        background: "#fff4e0",
        border: `2px solid ${INK}`,
        borderRadius: 12,
        padding: "12px 14px",
        fontWeight: 700,
        fontSize: 13.5,
        color: "#8a5a00",
        marginBottom: 14,
      }}
    >
      ⚠️ {t("quorumNotReached", { count, quorum })}
    </div>
  );
}

// Suggestions rapides ; le champ emoji libre permet en plus N'IMPORTE quel emoji
// (clavier emoji de l'OS) — le choix n'est plus limité à cette liste.
const PROPOSAL_ICONS = ["💡", "✅", "🔥", "⭐", "🎯", "🌱", "🚀", "🎨", "💬", "📌", "❤️", "👍", "📍", "🍕", "🎉", "⚡", "🌍", "🏆"];

/**
 * Vue votant pendant la phase de COLLECTE : le votant propose des options (il ne
 * vote pas encore). Isole son propre état d'input et recharge la liste courante
 * après chaque ajout. Si l'organisateur ouvre le vote entre-temps, l'ajout
 * renvoie 'notcollecting' → invitation à recharger pour passer au bulletin.
 */
function ProposalsView({
  token,
  voterToken,
  poll,
  brand,
  statusPill,
}: {
  token: string;
  voterToken: string | null;
  poll: PollRow;
  brand: Brand | null;
  statusPill: React.ReactNode;
}) {
  const t = useTranslations("Vote");
  const [opts, setOpts] = useState<Option[]>(poll.options);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(PROPOSAL_ICONS[0]);
  const [url, setUrl] = useState("");
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  // Le formulaire est replié : la liste des propositions passe en premier.
  const [addOpen, setAddOpen] = useState(false);

  const submit = async () => {
    const clean = name.trim();
    if (!clean || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      // Un lien de carte collé dans « illustration » est en fait un lieu — mais
      // seulement si le champ lieu est vide : sinon on écraserait sa saisie.
      const isMap = isPlaceUrl(url) && !place.trim();
      const finalUrl = isMap ? "" : url;
      const finalPlace = isMap ? url : place;
      // Coordonnées résolues côté client : le lieu apparaît sur la carte tout de suite.
      const geo = finalPlace ? await resolvePlace(finalPlace) : null;
      // Vérifié : jeton nominatif. Rapide : par le lien du scrutin (accès ouvert).
      const r = voterToken
        ? await addProposal(voterToken, clean, icon, finalUrl, note, finalPlace, geo?.lat, geo?.lng)
        : await addProposalOpen(token, clean, icon, finalUrl, note, finalPlace, geo?.lat, geo?.lng);
      if (r === "ok") {
        setName("");
        setUrl("");
        setPlace("");
        setNote("");
        setNotice(t("proposalAdded"));
        const fresh = await getPollByToken(token).catch(() => null);
        if (fresh) setOpts(fresh.options);
      } else if (r === "dup") {
        setNotice(t("proposalDup"));
      } else if (r === "full") {
        setNotice(t("proposalFull"));
      } else if (r === "notcollecting") {
        // Le vote a été ouvert (ou clos) pendant la saisie : les options sont figées.
        setEnded(true);
      } else {
        setNotice(t("proposalError"));
      }
    } catch {
      setNotice(t("proposalError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell brand={brand}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        {statusPill}
      </div>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 26, lineHeight: 1.2 }}>{poll.question}</h1>
      <div style={{ ...card, marginTop: 16, background: "#fffaf0" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16 }}>✎ {t("proposalsTitle")}</div>
        <p style={{ color: SUBINK, fontSize: 14, lineHeight: 1.55, marginTop: 8 }}>{t("proposalsIntro")}</p>

        {ended ? (
          <div
            style={{
              marginTop: 12,
              border: `2px solid ${INK}`,
              borderRadius: 12,
              background: GREEN,
              color: "#fff",
              padding: "13px 15px",
              fontWeight: 700,
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            ▶ {t("proposalsEnded")}
            <button
              onClick={() => window.location.reload()}
              style={{
                display: "block",
                marginTop: 10,
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
                border: `2.5px solid ${INK}`,
                background: "#fff",
                color: INK,
                padding: "10px 16px",
                borderRadius: 11,
              }}
            >
              {t("proposalsGoVote")}
            </button>
          </div>
        ) : null}
      </div>

      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ fontWeight: 800, fontFamily: FONT_DISPLAY, fontSize: 15, marginBottom: 10 }}>
          {t("proposalsListTitle", { count: opts.length })}
        </div>
        {opts.length === 0 ? (
          <div style={{ color: MUTED, fontSize: 14 }}>{t("proposalsListEmpty")}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {opts.map((o, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  border: `2px solid ${INK}`,
                  borderRadius: 10,
                  background: CREAM,
                  padding: "9px 12px",
                  fontSize: 14,
                }}
              >
                <span style={{ fontSize: 18, flex: "none" }}>{o.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{o.name}</div>
                  {o.note && <div style={{ fontSize: 12.5, color: SUBINK, marginTop: 2, lineHeight: 1.4 }}>{o.note}</div>}
                  {optionIllustration(o) && (
                    <a
                      href={optionIllustration(o)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-block", marginTop: 4, fontSize: 12, fontWeight: 700, color: INK, textDecoration: "underline" }}
                    >
                      🔗 {t("proposalLinkLabel")}
                    </a>
                  )}
                  {optionPlace(o) && /^https?:\/\//i.test(optionPlace(o)!) && (
                    <a
                      href={optionPlace(o)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-block", marginTop: 4, marginLeft: o.url ? 10 : 0, fontSize: 12, fontWeight: 700, color: INK, textDecoration: "underline" }}
                    >
                      📍 {t("placeChip")}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ajouter une proposition : un bouton qui se déplie À LA SUITE de la
            liste — on lit d'abord ce qui existe, on complète ensuite. */}
        {!ended && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `2px dashed ${INK}` }}>
            {addOpen ? (
              <div>
            {/* Emoji : champ LIBRE (n'importe quel emoji via le clavier de l'OS) +
                suggestions rapides. Le choix n'est plus limité. */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={8}
                aria-label={t("proposalEmojiLabel")}
                title={t("proposalEmojiLabel")}
                style={{
                  width: 54,
                  height: 44,
                  flex: "none",
                  textAlign: "center",
                  fontSize: 22,
                  border: `2px solid ${INK}`,
                  borderRadius: 10,
                  background: "#fff",
                  outline: "none",
                }}
              />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {PROPOSAL_ICONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setIcon(e)}
                    aria-label={e}
                    style={{
                      width: 36,
                      height: 36,
                      fontSize: 18,
                      cursor: "pointer",
                      borderRadius: 9,
                      border: `2px solid ${INK}`,
                      background: icon === e ? YELLOW : "#fff",
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                maxLength={60}
                placeholder={t("proposalPlaceholder")}
                style={{
                  flex: 1,
                  minWidth: 200,
                  fontFamily: FONT_BODY,
                  fontSize: 15,
                  fontWeight: 600,
                  padding: "11px 13px",
                  border: `2px solid ${INK}`,
                  borderRadius: 11,
                  background: CREAM,
                  outline: "none",
                }}
              />
              <button
                onClick={submit}
                disabled={busy || !name.trim()}
                className="dc-lift"
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: busy || !name.trim() ? "default" : "pointer",
                  border: `2.5px solid ${INK}`,
                  background: CORAL,
                  color: "#fff",
                  padding: "11px 18px",
                  borderRadius: 11,
                  opacity: busy || !name.trim() ? 0.6 : 1,
                  ...lift(`3px 3px 0 ${INK}`, `4px 4px 0 ${INK}`),
                }}
              >
                ＋ {t("proposalAdd")}
              </button>
            </div>
            {/* Étayer la proposition : lien + commentaire, facultatifs. */}
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              maxLength={500}
              placeholder={t("proposalUrlPlaceholder")}
              style={{ width: "100%", boxSizing: "border-box", marginTop: 9, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, padding: "10px 12px", border: `2px solid ${INK}`, borderRadius: 10, background: "#fff", outline: "none" }}
            />
            {/* Lieu : distinct de l'illustration — il place l'option sur la carte. */}
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              maxLength={500}
              placeholder={t("proposalPlacePlaceholder")}
              style={{ width: "100%", boxSizing: "border-box", marginTop: 9, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, padding: "10px 12px", border: `2px solid ${INK}`, borderRadius: 10, background: "#fff", outline: "none" }}
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              maxLength={280}
              placeholder={t("proposalNotePlaceholder")}
              style={{ width: "100%", boxSizing: "border-box", marginTop: 9, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, padding: "10px 12px", border: `2px solid ${INK}`, borderRadius: 10, background: "#fff", outline: "none" }}
            />
            {notice && (
              <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: SUBINK }}>{notice}</div>
            )}
            <div style={{ marginTop: 8, fontSize: 12.5, color: MUTED, lineHeight: 1.45 }}>{t("proposalsWait")}</div>
            {/* Son propre assistant, avec le contexte du scrutin déjà dedans. */}
            <ProposalAiHelper question={poll.question} description={poll.description} options={opts} />
              </div>
            ) : (
              <button
                onClick={() => setAddOpen(true)}
                aria-expanded={false}
                className="dc-lift"
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: "pointer",
                  border: `2.5px solid ${INK}`,
                  background: CORAL,
                  color: "#fff",
                  padding: "11px 18px",
                  borderRadius: 11,
                  ...lift(`3px 3px 0 ${INK}`, `4px 4px 0 ${INK}`),
                }}
              >
                ＋ {t("proposalAddOpen")}
              </button>
            )}
          </div>
        )}
      </div>

      {/* La carte vaut DÉJÀ pendant la collecte : voir où tombent les propositions
          des autres est précisément ce qui aide à en ajouter une utile. */}
      <PollMap options={opts} />

      {/* Collecte en accès ouvert : élargir le cercle a le plus de valeur ici
          (plus de monde = plus de propositions, puis plus de votes). */}
      {poll.access_mode === "open" && <InviteMoreVoters question={poll.question} url={`${APP_URL}/v/${token}`} />}
    </Shell>
  );
}

export default function PublicVote({
  token,
  adminKey,
  voterToken,
}: {
  token: string;
  adminKey?: string | null;
  voterToken?: string | null;
}) {
  const t = useTranslations("Vote");
  const tm = useTranslations("Methods");
  const ta = useTranslations("Assign");
  const locale = useLocale();
  const [view, setView] = useState<View>("loading");
  const [poll, setPoll] = useState<PollRow | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [voter, setVoter] = useState<VoterContext | null>(null);
  const [draft, setDraft] = useState<BallotDraft>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [pseudo, setPseudo] = useState("");
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<BallotComment[]>([]);
  const [args, setArgs] = useState<Argument[]>([]);
  const [privMessages, setPrivMessages] = useState<PollMessage[]>([]);
  const [result, setResult] = useState<ComputeResult | null>(null);
  const [ballotCount, setBallotCount] = useState(0);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [assignRows, setAssignRows] = useState<AssignRowData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  // Bandeau d'info (ex. « déjà voté » sur un scrutin public) affiché sur les résultats.
  const [notice, setNotice] = useState<string | null>(null);
  // Retour de la publication/dépublication côté organisateur (ex. rate-limit).
  const [pubNotice, setPubNotice] = useState<string | null>(null);
  // Commentaire de proposition en cours d'édition par l'organisateur.
  const [editNote, setEditNote] = useState<{ index: number; text: string } | null>(null);

  // Le débat (arguments par option) se recharge aux mêmes moments que les
  // résultats. Pas de débat sur les affectations (pas d'options à défendre).
  const reloadArgs = useCallback(async (p: PollRow) => {
    if (isAssignMethod(p.recipe.assign)) return;
    setArgs(await getArguments(p.token).catch(() => [] as Argument[]));
  }, []);

  const loadResults = useCallback(async (p: PollRow) => {
    await reloadArgs(p);
    // Affectation : pas de « gagnant » à calculer — on charge votants + classements
    // (RPC publique uniquement une fois le scrutin clos) pour AssignResult.
    if (isAssignMethod(p.recipe.assign)) {
      const rows = await getAssignData(p.token).catch(() => [] as AssignRowData[]);
      setAssignRows(rows);
      setBallotCount(rows.filter((r) => r.voted).length);
      setComments(await getComments(p.token));
      return;
    }
    const ballots = await getBallots(p.id);
    setBallotCount(ballots.length);
    setResult(compute({ recipe: p.recipe, options: p.options, ballots, districtElectors: electorsOf(p) }, locale));
    setComments(await getComments(p.token));
  }, [locale, reloadArgs]);

  const refreshOrganizer = useCallback(
    async (p: PollRow) => {
      // Pendant la collecte, rien à dépouiller (options non figées, 0 bulletin) —
      // et compute() n'aime pas une liste d'options vide. On charge juste le corps
      // électoral et les messages.
      if (pollPhase(p) !== "proposals") await loadResults(p);
      if (adminKey) {
        setPrivMessages(await getPollMessages(token, adminKey).catch(() => [] as PollMessage[]));
        if (p.access_mode === "invite") {
          const vs = await getVoters(token, adminKey).catch(() => [] as Voter[]);
          setVoters(vs);
        }
      }
    },
    [adminKey, token, loadResults],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [p, b] = await Promise.all([getPollByToken(token), getPollBrand(token).catch(() => null)]);
        if (!alive) return;
        if (!p) {
          setView("notfound");
          return;
        }
        setPoll(p);
        setBrand(b);
        // La vue « vote » ne passe pas par loadResults : on charge le débat ici
        // pour qu'il soit disponible sous le bulletin (compteur ou lecture).
        void reloadArgs(p);
        const phase = pollPhase(p);

        if (adminKey) {
          await refreshOrganizer(p);
          if (alive) setView("organizer");
          return;
        }
        if (p.access_mode === "invite") {
          if (!voterToken) {
            setView("needsInvite");
            return;
          }
          const vc = await getVoterContext(voterToken);
          if (!alive) return;
          if (!vc || vc.poll_token !== token) {
            setView("needsInvite");
            return;
          }
          setVoter(vc);
          if (phase === "proposals") {
            // Phase de collecte : le votant propose des options, il ne vote pas encore.
            if (alive) setView("proposals");
          } else if (phase === "closed") {
            await loadResults(p);
            if (alive) setView("closed");
          } else if (phase === "scheduled") {
            if (alive) setView("scheduled");
          } else if (vc.voted) {
            if (voterCanSeeResults(p)) {
              await loadResults(p);
              if (alive) setView("results");
            } else if (alive) setView("thanks");
          } else if (alive) setView("vote");
          return;
        }
        // accès ouvert
        if (phase === "closed") {
          await loadResults(p);
          if (alive) setView("closed");
        } else if (phase === "proposals") {
          // Collecte en accès ouvert : toute personne ayant le lien (privé) propose.
          if (alive) setView("proposals");
        } else if (phase === "scheduled") {
          if (alive) setView("scheduled");
        } else if (p.visibility === "public" && hasVotedLocally(token)) {
          // Scrutin public déjà voté sur cet appareil : droit aux résultats
          // (ou au merci si l'organisateur les cache), pas de second bulletin.
          if (voterCanSeeResults(p)) {
            await loadResults(p);
            if (alive) setView("results");
          } else if (alive) setView("thanks");
        } else if (alive) {
          setView("vote");
        }
      } catch {
        if (alive) setView("notfound");
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, adminKey, voterToken, refreshOrganizer, loadResults, reloadArgs]);

  // Suivi de participation en direct (organisateur) : rafraîchit tant que le scrutin
  // est ouvert, en pause si l'onglet est masqué — sinon les chiffres restent figés.
  useEffect(() => {
    if (view !== "organizer" || !adminKey) return;
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      getPollByToken(token)
        .then((fresh) => {
          if (fresh && pollPhase(fresh) !== "closed") {
            setPoll(fresh);
            refreshOrganizer(fresh);
          }
        })
        .catch(() => {});
    }, 25000);
    return () => clearInterval(id);
  }, [view, adminKey, token, refreshOrganizer]);

  // ---------- états simples ----------
  if (view === "loading") {
    return (
      <Shell brand={brand}>
        <div style={{ color: MUTED, padding: "28px 0" }}>{t("loading")}</div>
      </Shell>
    );
  }
  if (view === "notfound" || !poll) {
    return (
      <Shell brand={brand}>
        <div style={{ textAlign: "center", padding: "28px 0" }}>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 28 }}>{t("notFoundTitle")}</h1>
          <p style={{ color: MUTED, marginTop: 8 }}>{t("notFoundDesc")}</p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              marginTop: 16,
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              textDecoration: "none",
              border: `2.5px solid ${INK}`,
              background: CORAL,
              color: "#fff",
              padding: "12px 20px",
              borderRadius: 12,
            }}
          >
            {t("createMyPoll")}
          </Link>
        </div>
      </Shell>
    );
  }

  const baseDesc = describeRecipe(poll.recipe, locale);
  // Nom de méthode affiché : via le catalogue traduit (Methods), pas le nom FR du moteur.
  const mKey = resolveKey(poll.recipe);
  const twoRound =
    poll.recipe.suffrage !== "indirect" && poll.recipe.rounds === 2 && poll.recipe.counting !== "majority";
  // Affectation : badge, nom et consigne portés par le catalogue Assign.
  const aKey = isAssignMethod(poll.recipe.assign) ? poll.recipe.assign : null;
  const aDef = aKey ? ASSIGN_METHODS[aKey] : null;
  // Sondage : même dépouillement, mais le résultat est un panorama (pas de vainqueur).
  const isSurvey = Boolean(poll.recipe.survey) && !aDef;
  const desc = aDef ? { ...baseDesc, color: aDef.color, icon: aDef.icon } : baseDesc;
  const methodName = aKey
    ? ta(`methods.${aKey}.name`)
    : twoRound
      ? `${tm(`${mKey}.name`)} ${tm("twoRounds")}`
      : tm(`${mKey}.name`);
  const mode = methodMode(operativeMethod(poll.recipe));
  const gradeCount = resolveScale(poll.recipe, locale).labels.length;
  const voteShareUrl = `${APP_URL}/v/${poll.token}`;
  // Message privé à l'organisateur : uniquement si le scrutin est rattaché à un compte.
  const showMsgOrga = Boolean(poll.created_by) && !adminKey;
  // Signalement : réservé aux scrutins publics, jamais montré à l'organisateur.
  const showReport = poll.visibility === "public" && !adminKey;

  const phase = pollPhase(poll);
  // Vote de dates clos → créneau gagnant (option .at) pour proposer un .ics.
  // `hasWinner` est indispensable : sans lui, un paradoxe de Condorcet ou une
  // égalité (result.noWinner) proposerait quand même « Ajouter au calendrier »
  // pour une décision qui n'a PAS été prise — bars[0] n'est que la tête de tri.
  const winnerOption =
    result && phase === "closed" && !isSurvey && result.hasWinner && result.bars[0]
      ? poll.options[result.bars[0].idx]
      : undefined;
  const winnerSlot = winnerOption?.at;
  const winnerEnd = winnerOption?.end;
  // La décision prise est déjà ANNONÇABLE/COPIABLE dans la carte de résultat
  // (bande « Et maintenant ? »). Dans ce cas, le bloc ResultShare séparé fait
  // doublon → on ne le montre QUE si cette bande n'est pas là (sondage, sans
  // vainqueur, ou vote encore ouvert).
  const decisionAnnounced = phase === "closed" && !isSurvey && Boolean(result?.hasWinner);
  // Calendrier des créneaux : chauffé par les voix dès que le résultat est
  // visible ici (sinon la grille montre seulement les créneaux candidats).
  // Garde explicite : résultats masqués ⇒ la grille ne doit rien laisser filtrer
  // des tendances. L'organisateur, lui, voit toujours (adminKey).
  const slotCounts =
    result && (adminKey || voterCanSeeResults(poll))
      ? Object.fromEntries(result.bars.map((b) => [b.idx, b.value]))
      : undefined;
  const isSlotPoll = poll.options.some((o) => o.at);
  // On ne propose de PARTAGER LE RÉSULTAT que quand il a du sens : scrutin clos
  // (résultat final) ou sondage (panorama). Tant qu'un vote de décision est OUVERT,
  // le résultat est provisoire → pas de bouton « partager le résultat » (et le
  // partage utile à ce stade, c'est amener des votants). Et jamais en doublon de la
  // bande « Annoncer » de la carte (decisionAnnounced).
  const showResultShare = !decisionAnnounced && (phase === "closed" || isSurvey);
  const statusPill = (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: phase === "open" ? GREEN : phase === "scheduled" || phase === "proposals" ? YELLOW : INK,
        color: phase === "scheduled" || phase === "proposals" ? INK : "#fff",
        border: `2px solid ${INK}`,
        borderRadius: 20,
        padding: "4px 11px",
        fontWeight: 700,
        fontSize: 12,
      }}
    >
      {phase === "open"
        ? `● ${t("statusOpen")}`
        : phase === "proposals"
          ? `✎ ${t("statusProposals")}`
          : phase === "scheduled"
            ? `◷ ${t("statusScheduled")}`
            : `■ ${t("statusClosed")}`}
    </span>
  );

  // ---------- organisateur ----------
  if (view === "organizer") {
    const votedCount = voters.filter((v) => v.voted).length;
    const origin = APP_URL;
    const toggleClose = async () => {
      if (!adminKey) return;
      setWorking(true);
      try {
        if (poll.status === "open") await closePoll(token, adminKey);
        else await reopenPoll(token, adminKey);
        const fresh = await getPollByToken(token);
        if (fresh) {
          setPoll(fresh);
          await refreshOrganizer(fresh);
        }
      } finally {
        setWorking(false);
      }
    };
    // Publication/dépublication sur le feed /explorer (RPC, rate-limit 5/24 h).
    const togglePublish = async (makePublic: boolean) => {
      if (!adminKey) return;
      // Publier est peu réversible côté perception (indexable) : on confirme.
      if (makePublic && typeof window !== "undefined" && !window.confirm(t("publishConfirm"))) return;
      setWorking(true);
      setPubNotice(null);
      try {
        const r = await setPollVisibility(token, adminKey, makePublic);
        if (r === "rate_limited") {
          setPubNotice(t("publishRateLimited"));
        } else if (r === "moderated") {
          // Masqué par la modération : seule la régie peut lever le masquage.
          setPubNotice(t("publishModerated"));
        } else if (r === "ok") {
          const fresh = await getPollByToken(token);
          if (fresh) setPoll(fresh);
        }
      } catch {
        /* échec réseau : l'état affiché reste inchangé, on pourra réessayer */
      } finally {
        setWorking(false);
      }
    };
    // Fin de la phase de collecte : fige les options et ouvre le vote.
    const openVote = async () => {
      if (!adminKey) return;
      setWorking(true);
      try {
        await openVoting(token, adminKey);
        const fresh = await getPollByToken(token);
        if (fresh) {
          setPoll(fresh);
          await refreshOrganizer(fresh);
        }
      } finally {
        setWorking(false);
      }
    };
    // Retrait d'une option proposée (modération), possible seulement en collecte.
    // Curation du commentaire d'une proposition (collecte seulement).
    const saveNote = async (index: number, note: string) => {
      if (!adminKey || working) return;
      setWorking(true);
      try {
        await editProposalNote(token, adminKey, index, note);
        const fresh = await getPollByToken(token);
        if (fresh) setPoll(fresh);
        setEditNote(null);
      } finally {
        setWorking(false);
      }
    };
    const removeOpt = async (index: number) => {
      if (!adminKey || working) return;
      setWorking(true);
      try {
        await removeProposal(token, adminKey, index);
        const fresh = await getPollByToken(token);
        if (fresh) setPoll(fresh);
      } finally {
        setWorking(false);
      }
    };
    // Bloc résultat extrait : on le rend EN TÊTE quand le scrutin est clos (la
    // décision s'impose), sinon à sa place habituelle sous la carte de gestion.
    const orgResult = (
      <div style={{ marginTop: 16 }}>
        {aDef ? (
          phase === "closed" && assignRows.length ? (
            <>
              <AssignResult poll={poll} rows={assignRows} />
              <CommentsFeed comments={comments} />
            </>
          ) : (
            <div style={{ ...card, color: MUTED, fontSize: 15 }}>{ta("resultsAtClose")}</div>
          )
        ) : result ? (
          <>
            {poll.quorum != null && <QuorumBanner quorum={poll.quorum} count={ballotCount} />}
            <ResultCard result={result} question={poll.question} ballotCount={ballotCount} calendarSlot={winnerSlot} calendarEnd={winnerEnd} calendarUrl={voteShareUrl} calendarDuration={poll.slot_minutes ?? undefined} survey={isSurvey} decided={phase === "closed"} />
            {showResultShare && (
              <ResultShare
                question={poll.question}
                result={result}
                ballotCount={ballotCount}
                optionsCount={poll.options.length}
                url={voteShareUrl}
                survey={isSurvey}
              />
            )}
            <CommentsFeed comments={comments} />
            <OfficialRecordCta token={token} />
          </>
        ) : (
          <div style={{ ...card, color: MUTED, fontSize: 15 }}>{t("noBallotsYet")}</div>
        )}
      </div>
    );
    // Corps électoral / participation. Sur un scrutin sur INVITATION en cours, c'est
    // le HERO (les liens nominatifs sont le vrai canal — le lien générique mène à
    // « invitation requise ») : rendu en tête quand ouvert, à sa place sinon.
    const votersCard =
      poll.access_mode === "invite" ? (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ fontWeight: 800, fontFamily: FONT_DISPLAY, fontSize: 15, marginBottom: 4 }}>
            {t("votersVotedCount", { voted: votedCount, total: voters.length })}
          </div>
          {phase === "open" && voters.length > 0 && (
            <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 4 }}>{t("distributeVoterLinks")}</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10, maxHeight: 320, overflowY: "auto" }}>
            {voters.map((v) => (
              <VoterLinkRow key={v.token} v={{ ...v, url: `${origin}/v/${token}?u=${v.token}` }} />
            ))}
            {voters.length === 0 && <div style={{ color: MUTED, fontSize: 14 }}>{t("noVotersRegistered")}</div>}
          </div>
        </div>
      ) : null;
    return (
      <Shell brand={brand}>
        <div
          style={{
            background: "#fff4e0",
            border: `2px solid ${INK}`,
            borderRadius: 14,
            padding: "14px 16px",
            fontWeight: 700,
            fontSize: 13.5,
            color: "#2c3447",
            lineHeight: 1.5,
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span>🔑 {t("youAdminister")}</span>
          {statusPill}
          {poll.visibility === "public" && (
            <Link
              href="/explorer"
              title={t("viewOnFeed")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                textDecoration: "none",
                background: YELLOW,
                color: INK,
                border: `2px solid ${INK}`,
                borderRadius: 20,
                padding: "4px 11px",
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              📣 {t("publishedBadge")} ↗
            </Link>
          )}
          {/* Signal de leads en tête : les messages/coordonnées reçus sont l'action
              la plus stratégique côté organisateur — on les remonte du bas de page. */}
          {Boolean(poll.created_by) && privMessages.length > 0 && (
            <button
              type="button"
              onClick={() => document.getElementById("leads")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                background: CORAL,
                color: "#fff",
                border: `2px solid ${INK}`,
                borderRadius: 20,
                padding: "4px 12px",
                fontWeight: 800,
                fontSize: 12,
              }}
            >
              ✉️ {t("leadsPill", { count: privMessages.length })}
            </button>
          )}
        </div>

        {phase === "proposals" && (
          <div
            style={{
              ...card,
              marginTop: 16,
              background: "#fffaf0",
              borderColor: INK,
            }}
          >
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16 }}>
              ✎ {t("orgProposalsTitle")}
            </div>
            <p style={{ color: SUBINK, fontSize: 13.5, lineHeight: 1.55, marginTop: 8 }}>
              {t("orgProposalsDesc")}
            </p>
            <button
              onClick={openVote}
              disabled={working}
              className="dc-lift"
              style={{
                marginTop: 12,
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                fontSize: 15,
                cursor: working ? "default" : "pointer",
                border: `2.5px solid ${INK}`,
                background: GREEN,
                color: "#fff",
                padding: "12px 20px",
                borderRadius: 12,
                opacity: working ? 0.7 : 1,
                ...lift(`3px 3px 0 ${INK}`, `4px 4px 0 ${INK}`),
              }}
            >
              ▶ {t("openVoteCta")}
            </button>
            <div style={{ marginTop: 9, fontSize: 12, color: MUTED, lineHeight: 1.45 }}>
              {t("openVoteWarn")}
              {poll.access_mode === "open" ? ` ${t("openVoteThenPublish")}` : ""}
            </div>
          </div>
        )}

        {/* Scrutin clos : la décision s'impose EN TÊTE, avant la gestion/partage. */}
        {phase === "closed" && orgResult}
        {/* Invitation en cours : la PARTICIPATION + les liens nominatifs en HERO. */}
        {phase === "open" && votersCard}

        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: MUTED, marginBottom: 7 }}>
            {phase === "closed" ? t("shareResultsLabel") : poll.access_mode === "invite" ? t("linkLabelInvite") : t("linkLabelOpen")}
          </div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <input
              readOnly
              value={voteShareUrl}
              onFocus={(e) => e.currentTarget.select()}
              style={{
                flex: 1,
                minWidth: 200,
                fontFamily: FONT_DISPLAY,
                fontSize: 14,
                fontWeight: 600,
                padding: "11px 13px",
                border: `2px solid ${INK}`,
                borderRadius: 11,
                background: CREAM,
                outline: "none",
              }}
            />
            <LinkCopyBtn url={voteShareUrl} />
          </div>
          {/* Envoyer directement : WhatsApp / partage natif / mini-QR (vignette qui
              s'agrandit au clic). Ligne dédiée, sous le lien+copie — flux direct. */}
          {poll.access_mode === "open" && (
            <div style={{ display: "flex", gap: 10, marginTop: 11, alignItems: "center", flexWrap: "wrap" }}>
              <ShareRow question={poll.question} url={voteShareUrl} iconOnly />
              <QrCode url={voteShareUrl} mini size={58} />
            </div>
          )}
          {/* Prévisualiser la page publique — action utilitaire secondaire, démotée
              en lien discret (ce n'est pas un canal de partage). */}
          {poll.access_mode === "open" && (
            <a
              href={voteShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                marginTop: 11,
                fontFamily: FONT_DISPLAY,
                fontWeight: 600,
                fontSize: 13,
                color: MUTED,
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              {t("previewPublicPage")} ↗
            </a>
          )}

          {/* ── GÉRER : actions sur le scrutin, séparées visuellement du partage
              (trait + intitulé) pour ne plus confondre « partager » et « gérer ». */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `2px dashed ${INK}` }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: MUTED, marginBottom: 9 }}>{t("manageSectionLabel")}</div>
          <div style={{ display: "flex", gap: 11, flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={() => refreshOrganizer(poll)}
              className="dc-lift"
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                border: `2.5px solid ${INK}`,
                background: "#fff",
                color: INK,
                padding: "11px 16px",
                borderRadius: 11,
                ...lift(`3px 3px 0 ${INK}`, `4px 4px 0 ${INK}`),
              }}
            >
              ↻ {t("refresh")}
            </button>
            {phase !== "proposals" && (
              <button
                onClick={toggleClose}
                disabled={working}
                className="dc-lift"
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: working ? "default" : "pointer",
                  border: `2.5px solid ${INK}`,
                  background: poll.status === "open" ? CORAL : GREEN,
                  color: "#fff",
                  padding: "11px 16px",
                  borderRadius: 11,
                  opacity: working ? 0.7 : 1,
                  ...lift(`3px 3px 0 ${INK}`, `4px 4px 0 ${INK}`),
                }}
              >
                {poll.status === "open" ? `🔒 ${t("closeVote")}` : `↺ ${t("reopenVote")}`}
              </button>
            )}
            {/* Feed public : dépublier si public ; publier si privé ET ouvert
                (un scrutin sur invitation n'a rien à faire sur /explorer).
                Pendant la collecte : rien — la publication n'est possible qu'une
                fois la liste figée (voir le bandeau « Ouvrir le vote »). */}
            {phase === "proposals" ? null : poll.visibility === "public" ? (
              <button
                onClick={() => togglePublish(false)}
                disabled={working}
                style={{
                  fontFamily: FONT_BODY,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: working ? "default" : "pointer",
                  border: `2px solid ${INK}`,
                  background: "#fff",
                  color: INK,
                  padding: "9px 13px",
                  borderRadius: 10,
                  opacity: working ? 0.7 : 1,
                }}
              >
                🙈 {t("unpublishCta")}
              </button>
            ) : poll.access_mode === "open" ? (
              <button
                onClick={() => togglePublish(true)}
                disabled={working}
                style={{
                  fontFamily: FONT_BODY,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: working ? "default" : "pointer",
                  border: `2px solid ${INK}`,
                  background: "#fff",
                  color: INK,
                  padding: "9px 13px",
                  borderRadius: 10,
                  opacity: working ? 0.7 : 1,
                }}
              >
                📣 {t("publishCta")}
              </button>
            ) : null}
          </div>
          {pubNotice && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: REDTXT, fontWeight: 700 }}>{pubNotice}</div>
          )}
          {/* Conséquence de la publication annoncée avant l'action (peu réversible). */}
          {poll.visibility !== "public" && poll.access_mode === "open" && phase !== "proposals" && (
            <div style={{ marginTop: 8, fontSize: 12, color: MUTED, lineHeight: 1.45 }}>{t("publishDesc")}</div>
          )}
          {poll.hide_results && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: MUTED }}>
              {t("resultsHiddenNote")}
            </div>
          )}
          {poll.closes_at && (
            <div style={{ marginTop: 6, fontSize: 12.5, color: MUTED }}>
              ⏲ {t("autoCloseAt", { date: fmtDateTime(poll.closes_at, locale) })}
            </div>
          )}
          </div>
        </div>

        {/* Ouvert : déjà rendu en tête (hero). Clos / collecte : à sa place ici. */}
        {phase !== "open" && votersCard}

        {/* Pendant la collecte, ni résultats ni débat : les options ne sont pas
            figées. On montre à l'organisateur ce qui a été proposé (revue). */}
        {phase === "proposals" ? (
          <div style={{ ...card, marginTop: 16 }}>
            <div style={{ fontWeight: 800, fontFamily: FONT_DISPLAY, fontSize: 15, marginBottom: 10 }}>
              {t("orgProposalsListTitle", { count: poll.options.length })}
            </div>
            {poll.options.length === 0 ? (
              <div style={{ color: MUTED, fontSize: 14 }}>{t("orgProposalsEmpty")}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {poll.options.map((o, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      border: `2px solid ${INK}`,
                      borderRadius: 10,
                      background: CREAM,
                      padding: "9px 12px",
                      fontSize: 14,
                    }}
                  >
                    <span style={{ fontSize: 18, flex: "none" }}>{o.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{o.name}</div>
                      {/* Commentaire : l'organisateur peut le réécrire, le compléter
                          ou l'effacer tant que la liste n'est pas figée. */}
                      {editNote?.index === i ? (
                        <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                          <input
                            autoFocus
                            value={editNote.text}
                            onChange={(e) => setEditNote({ index: i, text: e.target.value.slice(0, 280) })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveNote(i, editNote.text);
                              if (e.key === "Escape") setEditNote(null);
                            }}
                            placeholder={t("orgProposalNotePlaceholder")}
                            aria-label={t("orgProposalEditNote")}
                            style={{
                              flex: 1,
                              minWidth: 160,
                              fontFamily: FONT_BODY,
                              fontSize: 13,
                              fontWeight: 500,
                              padding: "7px 10px",
                              border: `2px solid ${INK}`,
                              borderRadius: 8,
                              background: "#fff",
                              outline: "none",
                            }}
                          />
                          <button
                            onClick={() => saveNote(i, editNote.text)}
                            disabled={working}
                            style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 12.5, cursor: "pointer", border: `2px solid ${INK}`, background: GREEN, color: "#fff", padding: "6px 11px", borderRadius: 8 }}
                          >
                            ✓ {t("orgProposalNoteSave")}
                          </button>
                          <button
                            onClick={() => setEditNote(null)}
                            disabled={working}
                            style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 12.5, cursor: "pointer", border: `2px solid ${INK}`, background: "#fff", color: INK, padding: "6px 11px", borderRadius: 8 }}
                          >
                            {t("orgProposalNoteCancel")}
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                          {o.note ? (
                            <div style={{ fontSize: 12.5, color: SUBINK, marginTop: 2, lineHeight: 1.4 }}>{o.note}</div>
                          ) : null}
                          <button
                            onClick={() => setEditNote({ index: i, text: o.note ?? "" })}
                            disabled={working}
                            style={{ fontSize: 11.5, fontWeight: 700, cursor: "pointer", border: "none", background: "none", color: MUTED, padding: 0, textDecoration: "underline" }}
                          >
                            ✏️ {o.note ? t("orgProposalEditNote") : t("orgProposalAddNote")}
                          </button>
                        </div>
                      )}
                      {optionIllustration(o) && (
                        <a href={optionIllustration(o)} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 4, fontSize: 12, fontWeight: 700, color: INK, textDecoration: "underline" }}>
                          🔗 {t("proposalLinkLabel")}
                        </a>
                      )}
                      {optionPlace(o) && /^https?:\/\//i.test(optionPlace(o)!) && (
                        <a href={optionPlace(o)} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 4, marginLeft: o.url ? 10 : 0, fontSize: 12, fontWeight: 700, color: INK, textDecoration: "underline" }}>
                          📍 {t("placeChip")}
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => removeOpt(i)}
                      disabled={working}
                      title={t("orgProposalRemove")}
                      aria-label={t("orgProposalRemove")}
                      style={{
                        flex: "none",
                        width: 30,
                        height: 30,
                        border: `2px solid ${INK}`,
                        background: "#fff",
                        borderRadius: 8,
                        cursor: working ? "default" : "pointer",
                        fontSize: 15,
                        color: REDTXT,
                        lineHeight: 1,
                        opacity: working ? 0.6 : 1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Ouvert/programmé : le résultat reste à sa place, sous la gestion.
                Clos : il a déjà été rendu en tête (orgResult), on ne le répète pas. */}
            {phase !== "closed" && orgResult}
            <PollMap options={poll.options} />
            {isSlotPoll && <PollCalendar options={poll.options} counts={slotCounts} />}
            {/* Le débat : lecture complète pour l'organisateur, dépôt tant que c'est ouvert. */}
            {!aDef && (
              <ArgumentsPanel
                token={token}
                options={poll.options}
                args={args}
                showList
                canAdd={phase !== "closed"}
                onAdded={() => reloadArgs(poll)}
              />
            )}
          </>
        )}
        <PrivateMessagesCard owned={Boolean(poll.created_by)} messages={privMessages} locale={locale} />
      </Shell>
    );
  }

  // ---------- invitation requise ----------
  if (view === "needsInvite") {
    return (
      <Shell brand={brand}>
        <div style={{ ...card, textAlign: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22 }}>🎟️ {t("inviteOnlyTitle")}</div>
          <p style={{ color: MUTED, marginTop: 8, lineHeight: 1.5 }}>
            {t.rich("inviteOnlyDesc", { strong: (chunks) => <strong>{chunks}</strong> })}
          </p>
          {/* Pas de cul-de-sac : on aide (redemander son lien) et on offre une sortie
              vers la création — sans jamais révéler la question (scrutin privé). */}
          <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, marginTop: 12 }}>{t("inviteOnlyHelp")}</div>
          <Link
            href="/"
            style={{
              display: "inline-block",
              marginTop: 16,
              textDecoration: "none",
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 14,
              border: `2.5px solid ${INK}`,
              background: CORAL,
              color: "#fff",
              padding: "11px 18px",
              borderRadius: 12,
            }}
          >
            {t("createMyPoll")}
          </Link>
        </div>
      </Shell>
    );
  }

  // ---------- phase de propositions (votant) ----------
  if (view === "proposals") {
    return <ProposalsView token={token} voterToken={voterToken ?? null} poll={poll} brand={brand} statusPill={statusPill} />;
  }

  if (view === "scheduled") {
    return (
      <Shell brand={brand}>
        <div style={{ ...card, textAlign: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22 }}>⏳ {t("notOpenYetTitle")}</div>
          <p style={{ color: MUTED, marginTop: 8, lineHeight: 1.5 }}>
            « {poll.question} »
            <br />
            {t.rich("opensAt", {
              date: poll.opens_at ? fmtDateTime(poll.opens_at, locale) : "—",
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
          {/* Un votant motivé arrivé trop tôt ne doit pas repartir : compte à rebours
              vers l'ouverture + rappel pour revenir au bon moment. */}
          {poll.opens_at && (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Countdown closesAt={poll.opens_at} prefix={t("opensIn")} onExpire={() => window.location.reload()} />
            </div>
          )}
        </div>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
          <NotifyButton pollToken={token} label={`🔔 ${t("notifyAtOpen")}`} />
        </div>
      </Shell>
    );
  }

  // ---------- merci (résultats cachés) ----------
  if (view === "thanks") {
    return (
      <Shell brand={brand}>
        <div style={{ ...card, textAlign: "center" }}>
          {/* « Déjà voté » (scrutin public) : on ne prétend pas avoir enregistré un bulletin. */}
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 24, color: notice ? INK : "#1f6b34" }}>
            {notice ? `ℹ️ ${notice}` : `✓ ${t("voteRecorded")}`}
          </div>
          <p style={{ color: MUTED, marginTop: 8, lineHeight: 1.5 }}>
            {t("thanksHiddenResults", { name: voter ? ` ${voter.label}` : "" })}
          </p>
        </div>
        {poll.access_mode === "open" && <InviteMoreVoters question={poll.question} url={voteShareUrl} />}
        {showMsgOrga && <MessageToOrganizer token={token} />}
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
          <NotifyButton pollToken={token} />
        </div>
        <InstallInline />
      </Shell>
    );
  }

  // ---------- clôturé (résultats révélés) ----------
  if (view === "closed") {
    return (
      <Shell brand={brand}>
        <div
          style={{
            ...card,
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          {/* Une décision n'est « prise » que s'il y a un vainqueur établi et
              qu'on n'est pas en sondage ; sinon on reste factuel (vote clos). */}
          {result?.hasWinner && !isSurvey ? (
            <>
              <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>✅ {t("decisionTakenTitle")}</span>
              <span style={{ color: MUTED, fontSize: 14 }}>{t("decisionTakenDesc")}</span>
            </>
          ) : (
            <>
              <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>🔒 {t("voteClosedTitle")}</span>
              <span style={{ color: MUTED, fontSize: 14 }}>{t("voteClosedDesc")}</span>
            </>
          )}
        </div>
        {aDef ? (
          assignRows.length ? (
            <>
              <AssignResult poll={poll} rows={assignRows} />
              <CommentsFeed comments={comments} />
            </>
          ) : (
            <div style={{ ...card, color: MUTED }}>{t("noBallotsCast")}</div>
          )
        ) : result ? (
          <>
            {poll.quorum != null && <QuorumBanner quorum={poll.quorum} count={ballotCount} />}
            <ResultCard result={result} question={poll.question} ballotCount={ballotCount} calendarSlot={winnerSlot} calendarEnd={winnerEnd} calendarUrl={voteShareUrl} calendarDuration={poll.slot_minutes ?? undefined} survey={isSurvey} decided={phase === "closed"} />
            {showResultShare && (
              <ShareFold label={t("shareFoldResult")}>
                <ResultShare
                  question={poll.question}
                  result={result}
                  ballotCount={ballotCount}
                  optionsCount={poll.options.length}
                  url={voteShareUrl}
                  survey={isSurvey}
                />
              </ShareFold>
            )}
            <PollMap options={poll.options} />
            {isSlotPoll && <PollCalendar options={poll.options} counts={slotCounts} />}
            <CommentsFeed comments={comments} />
            <OfficialRecordCta token={token} />
          </>
        ) : (
          <div style={{ ...card, color: MUTED }}>{t("noBallotsCast")}</div>
        )}
        {/* Débat en lecture seule : le scrutin est clos, on n'argumente plus. */}
        {!aDef && (
          <ArgumentsPanel
            token={token}
            options={poll.options}
            args={args}
            showList
            canAdd={false}
            onAdded={() => reloadArgs(poll)}
          />
        )}
        {showMsgOrga && <MessageToOrganizer token={token} />}
        {/* Scrutin public clos atteint via /explorer : moment de conversion — proposer
            de créer le sien plutôt que de laisser un cul-de-sac. */}
        {poll.visibility === "public" && (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <Link
              href="/"
              style={{
                display: "inline-block",
                textDecoration: "none",
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 14,
                border: `2.5px solid ${INK}`,
                background: CORAL,
                color: "#fff",
                padding: "11px 18px",
                borderRadius: 12,
              }}
            >
              {t("createMyPoll")}
            </Link>
          </div>
        )}
        {showReport && <ReportFold token={token} />}
      </Shell>
    );
  }

  // ---------- résultats (votant) ----------
  if (view === "results" && result) {
    const footer = (
      <>
        {showResultShare && (
          <ShareFold label={t("shareFoldResult")}>
            <ResultShare
              question={poll.question}
              result={result}
              ballotCount={ballotCount}
              optionsCount={poll.options.length}
              url={voteShareUrl}
              survey={isSurvey}
            />
          </ShareFold>
        )}
        <Link
          href="/"
          style={{
            display: "inline-block",
            marginTop: 14,
            textAlign: "center",
            textDecoration: "none",
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 15,
            border: `2.5px solid ${INK}`,
            background: YELLOW,
            color: INK,
            padding: "12px 18px",
            borderRadius: 12,
          }}
        >
          {t("createMyPoll")}
        </Link>
      </>
    );
    return (
      <Shell brand={brand}>
        {notice && (
          <div
            style={{
              background: "#fff4e0",
              border: `2px solid ${INK}`,
              borderRadius: 12,
              padding: "12px 14px",
              fontWeight: 700,
              fontSize: 13.5,
              color: "#8a5a00",
              marginBottom: 14,
            }}
          >
            ℹ️ {notice}
          </div>
        )}
        {poll.quorum != null && <QuorumBanner quorum={poll.quorum} count={ballotCount} />}
        <ResultCard result={result} question={poll.question} ballotCount={ballotCount} footer={footer} calendarSlot={winnerSlot} calendarEnd={winnerEnd} calendarUrl={voteShareUrl} calendarDuration={poll.slot_minutes ?? undefined} survey={isSurvey} decided={phase === "closed"} />
        {/* Scrutin encore ouvert : inviter à amener d'autres votants (partage du SCRUTIN). */}
        {phase !== "closed" && poll.access_mode === "open" && <InviteMoreVoters question={poll.question} url={voteShareUrl} />}
        <PollMap options={poll.options} />
        {isSlotPoll && <PollCalendar options={poll.options} counts={slotCounts} />}
        <CommentsFeed comments={comments} />
        {/* Débat complet ; on peut encore argumenter tant que le scrutin est ouvert. */}
        {!aDef && (
          <ArgumentsPanel
            token={token}
            options={poll.options}
            args={args}
            showList
            canAdd={phase !== "closed"}
            onAdded={() => reloadArgs(poll)}
          />
        )}
        {showMsgOrga && <MessageToOrganizer token={token} />}
        <OfficialRecordCta token={token} />
        {showReport && <ReportFold token={token} />}
      </Shell>
    );
  }

  // ---------- vote ----------
  // Affectation : cartes masquées sur le bulletin — soi-même (binômes), ou tout
  // son propre côté (deux groupes : chacun ne classe que l'autre côté).
  const hiddenIdx = (() => {
    if (!aDef || aDef.oneSided || !voter) return undefined;
    const self = poll.options.findIndex((o) => o.name === voter.label);
    if (self < 0) return undefined;
    if (aDef.twoLists) {
      const nA = poll.recipe.assignA ?? 0;
      const mine = (i: number) => (self < nA ? i < nA : i >= nA);
      return poll.options.map((_, i) => i).filter(mine);
    }
    return [self];
  })();
  // Options que le votant doit renseigner (hors options masquées en affectation).
  const gradeableCount = poll.options.length - (hiddenIdx?.length ?? 0);
  const gradedCount = poll.options.reduce(
    (n, _, i) => (hiddenIdx?.includes(i) ? n : n + (draft.grades[i] !== undefined ? 1 : 0)),
    0,
  );
  // Affectation : classement COMPLET exigé (pas de complétion aléatoire du bulletin).
  // Jugement majoritaire : TOUTES les options doivent être notées — sinon une option
  // omise recevrait une mention médiane jamais choisie (l'inverse d'un bulletin sûr).
  const ballotValid = aDef
    ? draft.rank.length >= gradeableCount
    : mode === "grade"
      ? gradeableCount > 0 && gradedCount === gradeableCount
      : draftToBallot(mode, draft, poll.options.length, gradeCount) !== null;

  const submit = async () => {
    const ballot = draftToBallot(mode, draft, poll.options.length, gradeCount);
    if (!ballot) return;
    setSubmitting(true);
    setError(null);
    try {
      if (poll.access_mode === "invite" && voterToken) {
        ballot.district = voter?.district ?? ballot.district;
        const r = await castInvitedBallot(voterToken, ballot, { comment, author: pseudo });
        if (r === "ok") {
          pingPollEvent(token);
          if (voterCanSeeResults(poll)) {
            await loadResults(poll);
            setView("results");
          } else setView("thanks");
        } else if (r === "already") {
          setView("thanks");
        } else if (r === "closed") {
          await loadResults(poll);
          setView("closed");
        } else {
          setError(t("invalidVoteLink"));
        }
      } else if (poll.visibility === "public") {
        // Scrutin PUBLIC : dépôt via la RPC (dédup par empreinte IP détachée du
        // bulletin). Le vote privé garde addBallot — flux inchangé.
        const r = await castPublicBallot(token, ballot);
        if (r === "ok") {
          markVotedLocally(token);
          // Le « mot au groupe » part dans une table dédiée, détaché du bulletin.
          if (comment.trim()) await addComment(token, comment, pseudo).catch(() => {});
          pingPollEvent(token);
          if (voterCanSeeResults(poll)) {
            await loadResults(poll);
            setView("results");
          } else setView("thanks");
        } else if (r === "already") {
          // Déjà voté (empreinte connue) : on l'explique et on bascule sur les résultats.
          markVotedLocally(token);
          setNotice(t("voteAlreadyPublic"));
          if (voterCanSeeResults(poll)) {
            await loadResults(poll);
            setView("results");
          } else setView("thanks");
        } else if (r === "closed") {
          await loadResults(poll);
          setView("closed");
        } else if (r === "notopen") {
          setView("scheduled");
        } else {
          setError(t("ballotSaveError"));
        }
      } else {
        await addBallot(poll.id, ballot);
        // Le « mot au groupe » part dans une table dédiée, détaché du bulletin.
        if (comment.trim()) await addComment(token, comment, pseudo).catch(() => {});
        pingPollEvent(token);
        if (voterCanSeeResults(poll)) {
          await loadResults(poll);
          setView("results");
        } else setView("thanks");
      }
    } catch {
      setError(t("ballotSaveError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell brand={brand}>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: desc.color,
            color: "#fff",
            border: `2.5px solid ${INK}`,
            borderRadius: 30,
            padding: "6px 14px",
            fontWeight: 700,
            fontSize: 13,
            boxShadow: `3px 3px 0 ${INK}`,
          }}
        >
          <span>{desc.icon}</span>
          {methodName}
        </div>
        {voter && (
          <span style={{ fontSize: 13, fontWeight: 700, color: MUTED }}>
            {t.rich("votingAs", {
              name: voter.label,
              strong: (chunks) => <span style={{ color: INK }}>{chunks}</span>,
            })}
          </span>
        )}
        {poll.access_mode === "open" && (
          <div className="vote-qr-mobile" style={{ marginLeft: "auto" }}>
            <QrCode url={voteShareUrl} mini size={46} />
          </div>
        )}
      </div>

      <h1
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 800,
          fontSize: "clamp(26px,4vw,40px)",
          letterSpacing: "-0.025em",
          margin: "14px 0 0",
          lineHeight: 1.05,
        }}
      >
        {poll.question}
      </h1>
      {poll.description && (
        <p style={{ fontSize: 15.5, color: SUBINK, lineHeight: 1.5, margin: "12px 0 0", whiteSpace: "pre-wrap" }}>
          {poll.description}
        </p>
      )}
      <p style={{ fontSize: 15, color: MUTED, margin: "8px 0 0" }}>
        {aDef ? ta(aDef.oneSided ? "instructionAssign" : "instructionPairs") : t(INSTRUCTIONS[mode])}
      </p>
        </div>
        {poll.access_mode === "open" && (
          <div className="vote-qr-desktop" style={{ flex: "none" }}>
            <QrCode url={voteShareUrl} compact size={132} />
          </div>
        )}
      </div>

      <div
        style={{
          background: "#fff",
          border: `2.5px solid ${INK}`,
          borderRadius: 20,
          padding: 22,
          boxShadow: `5px 5px 0 ${INK}`,
          marginTop: 22,
        }}
      >
        <BallotCard
          mode={mode}
          options={poll.options}
          color={desc.color}
          hidden={hiddenIdx}
          scale={poll.recipe.scale}
          draft={draft}
          onChoice={(i) => setDraft((d) => ({ ...d, choice: i }))}
          onToggle={(i) =>
            setDraft((d) => ({
              ...d,
              approved: d.approved.includes(i) ? d.approved.filter((x) => x !== i) : [...d.approved, i],
            }))
          }
          onRank={(i) =>
            setDraft((d) => ({
              ...d,
              // Re-tap sur une option déjà classée = la retirer (le reste se renumérote
              // tout seul) ; sinon on l'ajoute au bout. Plus besoin de tout recommencer.
              rank: d.rank.includes(i) ? d.rank.filter((x) => x !== i) : [...d.rank, i],
            }))
          }
          onResetRank={() => setDraft((d) => ({ ...d, rank: [] }))}
          onGrade={(i, gi) => setDraft((d) => ({ ...d, grades: { ...d.grades, [i]: gi } }))}
        />

        {/* « Mot au groupe » séparé visuellement du bulletin + rassurance de secret
            posée exactement là où le votant écrit son nom : le bulletin reste secret,
            seul ce mot (facultatif) est visible, signé du pseudo. */}
        <div style={{ ...card, marginTop: 18, background: CREAM }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14.5 }}>✍️ {t("wordToGroupTitle")}</div>
          <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginTop: 5, lineHeight: 1.45 }}>
            🔒 {t("ballotSecretNote")}
          </div>
          <div style={{ marginTop: 11, display: "flex", flexDirection: "column", gap: 9 }}>
            <input
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder={t("pseudoPlaceholder")}
              aria-label={t("pseudoLabel")}
              maxLength={40}
              style={{
                fontFamily: FONT_BODY,
                fontSize: 14,
                fontWeight: 600,
                padding: "10px 12px",
                border: `2px solid ${INK}`,
                borderRadius: 10,
                background: "#fff",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("commentPlaceholder")}
              aria-label={t("wordToGroupTitle")}
              maxLength={280}
              rows={2}
              style={{
                fontFamily: FONT_BODY,
                fontSize: 14,
                fontWeight: 500,
                padding: "10px 12px",
                border: `2px solid ${INK}`,
                borderRadius: 10,
                background: "#fff",
                outline: "none",
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
          </div>
        </div>

        {error && <div style={{ marginTop: 12, color: REDTXT, fontWeight: 700, fontSize: 13 }}>{error}</div>}

        {/* Progression : nudge à compléter (JM = tout noter ; classement partiel). */}
        {mode === "grade" && gradedCount < gradeableCount && (
          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: MUTED, textAlign: "center" }}>
            {t("gradeProgress", { done: gradedCount, total: gradeableCount })}
          </div>
        )}
        {mode === "rank" && draft.rank.length > 0 && draft.rank.length < gradeableCount && (
          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: MUTED, textAlign: "center" }}>
            {t("rankProgress", { done: draft.rank.length, total: gradeableCount })}
          </div>
        )}

        <button
          onClick={submit}
          disabled={!ballotValid || submitting}
          className="dc-lift"
          style={{
            marginTop: 20,
            width: "100%",
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 16,
            cursor: !ballotValid || submitting ? "default" : "pointer",
            border: `2.5px solid ${INK}`,
            background: GREEN,
            color: "#fff",
            padding: 14,
            borderRadius: 13,
            opacity: !ballotValid || submitting ? 0.5 : 1,
            ...lift(`4px 4px 0 ${INK}`, `6px 6px 0 ${INK}`),
          }}
        >
          {submitting ? t("submitting") : `✓ ${t("vote")}`}
        </button>
      </div>

      {/* Carte des lieux : sous le bulletin, elle situe les options les unes par
          rapport aux autres — ce qu'aucune liste ne montre. */}
      <PollMap options={poll.options} />
      {isSlotPoll && <PollCalendar options={poll.options} counts={slotCounts} />}

      {/* Le débat sous le bulletin : argumenter est indépendant du vote. Si les
          résultats sont cachés, la lecture l'est aussi (un débat déséquilibré
          télégraphierait les tendances) — seuls la saisie et un compteur restent. */}
      {!aDef && (
        <ArgumentsPanel
          token={token}
          options={poll.options}
          args={args}
          showList={voterCanSeeResults(poll)}
          canAdd
          onAdded={() => reloadArgs(poll)}
        />
      )}

      {poll.closes_at && (
        <Countdown closesAt={poll.closes_at} onExpire={() => loadResults(poll).then(() => setView("closed"))} />
      )}

      {voterCanSeeResults(poll) && (
        <button
          onClick={async () => {
            await loadResults(poll);
            setView("results");
          }}
          style={{
            marginTop: 16,
            width: "100%",
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            border: `2px solid ${INK}`,
            background: CREAM,
            color: INK,
            padding: 12,
            borderRadius: 11,
          }}
        >
          {t("seeResultsWithoutVoting")}
        </button>
      )}
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <NotifyButton pollToken={token} label={`🔔 ${t("notifyAtClose")}`} />
      </div>
      {poll.access_mode === "open" && (
        <ShareFold label={t("shareFold")}>
          <ShareRow question={poll.question} url={voteShareUrl} withCopy iconOnly style={{ justifyContent: "center" }} />
        </ShareFold>
      )}
      {showReport && <ReportFold token={token} />}
    </Shell>
  );
}
