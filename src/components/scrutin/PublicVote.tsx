"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { intlLocale } from "@/i18n/locales";
import PlacetMark from "./PlacetMark";
import {
  addBallot,
  castInvitedBallot,
  closePoll,
  getBallots,
  getComments,
  getPollByToken,
  getVoterContext,
  getVoters,
  pollPhase,
  reopenPoll,
  type BallotComment,
  type PollRow,
  type Voter,
  type VoterContext,
} from "@/lib/db/polls";
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
import type { Ballot, BallotMode, ComputeResult } from "@/lib/voting/types";
import { APP_URL } from "@/lib/voting/aiPrompt";
import InstallInline from "@/components/pwa/InstallInline";
import NotifyButton from "@/components/pwa/NotifyButton";
import BallotCard, { EMPTY_DRAFT, type BallotDraft } from "./BallotCard";
import ResultCard from "./ResultCard";
import ResultShare from "./ResultShare";
import QrCode from "./QrCode";
import { CORAL, CREAM, FONT_BODY, FONT_DISPLAY, GREEN, INK, MUTED, REDTXT, SUBINK, YELLOW, lift } from "./theme";

// Clés i18n des consignes par mode de vote (résolues via t() au rendu).
const INSTRUCTIONS: Record<string, string> = {
  single: "instructionSingle",
  approve: "instructionApprove",
  rank: "instructionRank",
  grade: "instructionGrade",
};

function draftToBallot(mode: BallotMode, draft: BallotDraft, n: number): Ballot | null {
  const seed = Math.floor(Math.random() * 100000);
  if (mode === "single") return draft.choice === null ? null : normalizeFromSingle(draft.choice, n, seed);
  if (mode === "approve") return draft.approved.length ? normalizeFromApproved(draft.approved, n, seed) : null;
  if (mode === "rank") return draft.rank.length ? normalizeFromRank(draft.rank, n, seed) : null;
  return normalizeFromGrades(draft.grades, n, seed);
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

type View =
  | "loading"
  | "notfound"
  | "needsInvite"
  | "scheduled"
  | "vote"
  | "thanks"
  | "results"
  | "organizer"
  | "closed";

function Header() {
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
      <div
        className="pad"
        style={{ maxWidth: 880, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", gap: 11 }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none", color: INK }}>
          <PlacetMark size={38} />
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 21, letterSpacing: "-0.02em" }}>
            Placet
          </div>
        </Link>
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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
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

function Countdown({ closesAt, onExpire }: { closesAt: string; onExpire: () => void }) {
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
    <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: MUTED }}>⏲ {t("closesIn")} {label}</div>
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
  const locale = useLocale();
  const [view, setView] = useState<View>("loading");
  const [poll, setPoll] = useState<PollRow | null>(null);
  const [voter, setVoter] = useState<VoterContext | null>(null);
  const [draft, setDraft] = useState<BallotDraft>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [pseudo, setPseudo] = useState("");
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<BallotComment[]>([]);
  const [result, setResult] = useState<ComputeResult | null>(null);
  const [ballotCount, setBallotCount] = useState(0);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const loadResults = useCallback(async (p: PollRow) => {
    const ballots = await getBallots(p.id);
    setBallotCount(ballots.length);
    setResult(compute({ recipe: p.recipe, options: p.options, ballots, districtElectors: electorsOf(p) }, locale));
    setComments(await getComments(p.id));
  }, [locale]);

  const refreshOrganizer = useCallback(
    async (p: PollRow) => {
      await loadResults(p);
      if (p.access_mode === "invite" && adminKey) {
        const vs = await getVoters(token, adminKey).catch(() => [] as Voter[]);
        setVoters(vs);
      }
    },
    [adminKey, token, loadResults],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await getPollByToken(token);
        if (!alive) return;
        if (!p) {
          setView("notfound");
          return;
        }
        setPoll(p);
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
          if (phase === "closed") {
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
        } else if (phase === "scheduled") {
          if (alive) setView("scheduled");
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
  }, [token, adminKey, voterToken, refreshOrganizer, loadResults]);

  // ---------- états simples ----------
  if (view === "loading") {
    return (
      <Shell>
        <div style={{ color: MUTED, padding: "28px 0" }}>{t("loading")}</div>
      </Shell>
    );
  }
  if (view === "notfound" || !poll) {
    return (
      <Shell>
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

  const desc = describeRecipe(poll.recipe, locale);
  // Nom de méthode affiché : via le catalogue traduit (Methods), pas le nom FR du moteur.
  const mKey = resolveKey(poll.recipe);
  const twoRound =
    poll.recipe.suffrage !== "indirect" && poll.recipe.rounds === 2 && poll.recipe.counting !== "majority";
  const methodName = twoRound ? `${tm(`${mKey}.name`)} ${tm("twoRounds")}` : tm(`${mKey}.name`);
  const mode = methodMode(operativeMethod(poll.recipe));
  const voteShareUrl = `${APP_URL}/v/${poll.token}`;

  const phase = pollPhase(poll);
  // Vote de dates clos → créneau gagnant (option .at) pour proposer un .ics.
  const winnerSlot =
    result && phase === "closed" && result.bars[0] ? poll.options[result.bars[0].idx]?.at : undefined;
  const statusPill = (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: phase === "open" ? GREEN : phase === "scheduled" ? YELLOW : INK,
        color: phase === "scheduled" ? INK : "#fff",
        border: `2px solid ${INK}`,
        borderRadius: 20,
        padding: "4px 11px",
        fontWeight: 700,
        fontSize: 12,
      }}
    >
      {phase === "open" ? `● ${t("statusOpen")}` : phase === "scheduled" ? `◷ ${t("statusScheduled")}` : `■ ${t("statusClosed")}`}
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
    return (
      <Shell>
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
        </div>

        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: MUTED, marginBottom: 7 }}>
            {poll.access_mode === "invite" ? t("linkLabelInvite") : t("linkLabelOpen")}
          </div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <input
              readOnly
              value={voteShareUrl}
              onFocus={(e) => e.currentTarget.select()}
              style={{
                flex: 1,
                minWidth: 220,
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
            <a
              href={voteShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textDecoration: "none",
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 14,
                border: `2.5px solid ${INK}`,
                background: YELLOW,
                color: INK,
                padding: "11px 16px",
                borderRadius: 11,
              }}
            >
              {t("open")}
            </a>
          </div>
          {poll.access_mode === "open" && (
            <div style={{ marginTop: 12 }}>
              <QrCode url={voteShareUrl} />
            </div>
          )}
          <div style={{ display: "flex", gap: 11, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
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
          </div>
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

        {poll.access_mode === "invite" && (
          <div style={{ ...card, marginTop: 16 }}>
            <div style={{ fontWeight: 800, fontFamily: FONT_DISPLAY, fontSize: 15, marginBottom: 4 }}>
              {t("votersVotedCount", { voted: votedCount, total: voters.length })}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10, maxHeight: 320, overflowY: "auto" }}>
              {voters.map((v) => (
                <VoterLinkRow key={v.token} v={{ ...v, url: `${origin}/v/${token}?u=${v.token}` }} />
              ))}
              {voters.length === 0 && <div style={{ color: MUTED, fontSize: 14 }}>{t("noVotersRegistered")}</div>}
            </div>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          {result ? (
            <>
              {poll.quorum != null && <QuorumBanner quorum={poll.quorum} count={ballotCount} />}
              <ResultCard result={result} question={poll.question} ballotCount={ballotCount} calendarSlot={winnerSlot} calendarUrl={voteShareUrl} calendarDuration={poll.slot_minutes ?? undefined} />
              <ResultShare
                question={poll.question}
                result={result}
                ballotCount={ballotCount}
                optionsCount={poll.options.length}
                url={voteShareUrl}
              />
              <CommentsFeed comments={comments} />
              <OfficialRecordCta token={token} />
            </>
          ) : (
            <div style={{ ...card, color: MUTED, fontSize: 15 }}>{t("noBallotsYet")}</div>
          )}
        </div>
      </Shell>
    );
  }

  // ---------- invitation requise ----------
  if (view === "needsInvite") {
    return (
      <Shell>
        <div style={{ ...card, textAlign: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22 }}>🎟️ {t("inviteOnlyTitle")}</div>
          <p style={{ color: MUTED, marginTop: 8, lineHeight: 1.5 }}>
            {t.rich("inviteOnlyDesc", { strong: (chunks) => <strong>{chunks}</strong> })}
          </p>
        </div>
      </Shell>
    );
  }

  if (view === "scheduled") {
    return (
      <Shell>
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
        </div>
      </Shell>
    );
  }

  // ---------- merci (résultats cachés) ----------
  if (view === "thanks") {
    return (
      <Shell>
        <div style={{ ...card, textAlign: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 24, color: "#1f6b34" }}>
            ✓ {t("voteRecorded")}
          </div>
          <p style={{ color: MUTED, marginTop: 8, lineHeight: 1.5 }}>
            {t("thanksHiddenResults", { name: voter ? ` ${voter.label}` : "" })}
          </p>
        </div>
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
      <Shell>
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
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>🔒 {t("voteClosedTitle")}</span>
          <span style={{ color: MUTED, fontSize: 14 }}>{t("voteClosedDesc")}</span>
        </div>
        {result ? (
          <>
            {poll.quorum != null && <QuorumBanner quorum={poll.quorum} count={ballotCount} />}
            <ResultCard result={result} question={poll.question} ballotCount={ballotCount} calendarSlot={winnerSlot} calendarUrl={voteShareUrl} calendarDuration={poll.slot_minutes ?? undefined} />
            <ResultShare
              question={poll.question}
              result={result}
              ballotCount={ballotCount}
              optionsCount={poll.options.length}
              url={voteShareUrl}
            />
            <CommentsFeed comments={comments} />
            <OfficialRecordCta token={token} />
          </>
        ) : (
          <div style={{ ...card, color: MUTED }}>{t("noBallotsCast")}</div>
        )}
      </Shell>
    );
  }

  // ---------- résultats (votant) ----------
  if (view === "results" && result) {
    const footer = (
      <>
        <ResultShare
          question={poll.question}
          result={result}
          ballotCount={ballotCount}
          optionsCount={poll.options.length}
          url={voteShareUrl}
        />
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
      <Shell>
        {poll.quorum != null && <QuorumBanner quorum={poll.quorum} count={ballotCount} />}
        <ResultCard result={result} question={poll.question} ballotCount={ballotCount} footer={footer} calendarSlot={winnerSlot} calendarUrl={voteShareUrl} calendarDuration={poll.slot_minutes ?? undefined} />
        <CommentsFeed comments={comments} />
        <OfficialRecordCta token={token} />
      </Shell>
    );
  }

  // ---------- vote ----------
  const ballotValid = draftToBallot(mode, draft, poll.options.length) !== null;

  const submit = async () => {
    const ballot = draftToBallot(mode, draft, poll.options.length);
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
      } else {
        await addBallot(poll.id, ballot, { comment, author: pseudo });
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
    <Shell>
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
      <p style={{ fontSize: 15, color: MUTED, margin: "8px 0 0" }}>{t(INSTRUCTIONS[mode])}</p>
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
          draft={draft}
          onChoice={(i) => setDraft((d) => ({ ...d, choice: i }))}
          onToggle={(i) =>
            setDraft((d) => ({
              ...d,
              approved: d.approved.includes(i) ? d.approved.filter((x) => x !== i) : [...d.approved, i],
            }))
          }
          onRank={(i) => setDraft((d) => (d.rank.includes(i) ? d : { ...d, rank: [...d.rank, i] }))}
          onResetRank={() => setDraft((d) => ({ ...d, rank: [] }))}
          onGrade={(i, gi) => setDraft((d) => ({ ...d, grades: { ...d.grades, [i]: gi } }))}
        />

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 9 }}>
          <input
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            placeholder={t("pseudoPlaceholder")}
            maxLength={40}
            style={{
              fontFamily: FONT_BODY,
              fontSize: 14,
              fontWeight: 600,
              padding: "10px 12px",
              border: `2px solid ${INK}`,
              borderRadius: 10,
              background: CREAM,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("commentPlaceholder")}
            maxLength={280}
            rows={2}
            style={{
              fontFamily: FONT_BODY,
              fontSize: 14,
              fontWeight: 500,
              padding: "10px 12px",
              border: `2px solid ${INK}`,
              borderRadius: 10,
              background: CREAM,
              outline: "none",
              boxSizing: "border-box",
              resize: "vertical",
            }}
          />
        </div>

        {error && <div style={{ marginTop: 12, color: REDTXT, fontWeight: 700, fontSize: 13 }}>{error}</div>}

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
    </Shell>
  );
}
