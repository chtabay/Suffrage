"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  addBallot,
  castInvitedBallot,
  closePoll,
  getBallots,
  getPollByToken,
  getVoterContext,
  getVoters,
  pollPhase,
  reopenPoll,
  type PollRow,
  type Voter,
  type VoterContext,
} from "@/lib/db/polls";
import {
  compute,
  describeRecipe,
  methodMode,
  normalizeFromApproved,
  normalizeFromGrades,
  normalizeFromRank,
  normalizeFromSingle,
  operativeMethod,
} from "@/lib/voting/engine";
import type { Ballot, BallotMode, ComputeResult } from "@/lib/voting/types";
import InstallInline from "@/components/pwa/InstallInline";
import BallotCard, { EMPTY_DRAFT, type BallotDraft } from "./BallotCard";
import ResultCard from "./ResultCard";
import { CORAL, CREAM, FONT_BODY, FONT_DISPLAY, GREEN, INK, MUTED, REDTXT, YELLOW, lift } from "./theme";

const INSTRUCTIONS: Record<string, string> = {
  single: "Choisissez une seule option.",
  approve: "Cochez toutes les options qui vous conviennent.",
  rank: "Classez les options de la préférée à la moins aimée.",
  grade: "Donnez une mention à chaque option.",
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
          <div
            style={{
              width: 38,
              height: 38,
              border: `2.5px solid ${INK}`,
              borderRadius: 11,
              background: YELLOW,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              boxShadow: `3px 3px 0 ${INK}`,
            }}
          >
            🗳️
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 21, letterSpacing: "-0.02em" }}>
            Scrutin
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
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        title={v.voted ? "A voté" : "En attente"}
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
        {copied ? "✓" : "Copier"}
      </button>
    </div>
  );
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
}

function Countdown({ closesAt, onExpire }: { closesAt: string; onExpire: () => void }) {
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
  const label = d > 0 ? `${d} j ${h} h ${m} min` : h > 0 ? `${h} h ${m} min ${s} s` : `${m} min ${s} s`;
  return (
    <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: MUTED }}>⏲ Clôture dans {label}</div>
  );
}

function QuorumBanner({ quorum, count }: { quorum: number; count: number }) {
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
      ⚠️ Quorum non atteint : {count} / {quorum} bulletins — résultat non validé.
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
  const [view, setView] = useState<View>("loading");
  const [poll, setPoll] = useState<PollRow | null>(null);
  const [voter, setVoter] = useState<VoterContext | null>(null);
  const [draft, setDraft] = useState<BallotDraft>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ComputeResult | null>(null);
  const [ballotCount, setBallotCount] = useState(0);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const loadResults = useCallback(async (p: PollRow) => {
    const ballots = await getBallots(p.id);
    setBallotCount(ballots.length);
    setResult(compute({ recipe: p.recipe, options: p.options, ballots, districtElectors: electorsOf(p) }));
  }, []);

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
        <div style={{ color: MUTED, padding: "28px 0" }}>Chargement du scrutin…</div>
      </Shell>
    );
  }
  if (view === "notfound" || !poll) {
    return (
      <Shell>
        <div style={{ textAlign: "center", padding: "28px 0" }}>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 28 }}>Scrutin introuvable</h1>
          <p style={{ color: MUTED, marginTop: 8 }}>Ce lien n'existe pas ou a expiré.</p>
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
            Créer mon scrutin →
          </Link>
        </div>
      </Shell>
    );
  }

  const desc = describeRecipe(poll.recipe);
  const mode = methodMode(operativeMethod(poll.recipe));
  const voteShareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/v/${poll.token}` : `/v/${poll.token}`;

  const phase = pollPhase(poll);
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
      {phase === "open" ? "● Ouvert" : phase === "scheduled" ? "◷ Programmé" : "■ Clôturé"}
    </span>
  );

  // ---------- organisateur ----------
  if (view === "organizer") {
    const votedCount = voters.filter((v) => v.voted).length;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
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
          <span>🔑 Vous administrez ce scrutin.</span>
          {statusPill}
        </div>

        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: MUTED, marginBottom: 7 }}>
            {poll.access_mode === "invite" ? "LIEN DU SCRUTIN (les votants utilisent leur lien nominatif)" : "LIEN DE VOTE À PARTAGER"}
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
              Ouvrir →
            </a>
          </div>
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
              ↻ Rafraîchir
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
              {poll.status === "open" ? "🔒 Clôturer le vote" : "↺ Rouvrir le vote"}
            </button>
          </div>
          {poll.hide_results && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: MUTED }}>
              Résultats cachés aux votants jusqu'à la clôture (vous, vous les voyez).
            </div>
          )}
          {poll.closes_at && (
            <div style={{ marginTop: 6, fontSize: 12.5, color: MUTED }}>
              ⏲ Clôture automatique le {fmtDateTime(poll.closes_at)}.
            </div>
          )}
        </div>

        {poll.access_mode === "invite" && (
          <div style={{ ...card, marginTop: 16 }}>
            <div style={{ fontWeight: 800, fontFamily: FONT_DISPLAY, fontSize: 15, marginBottom: 4 }}>
              Votants — {votedCount}/{voters.length} ont voté
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10, maxHeight: 320, overflowY: "auto" }}>
              {voters.map((v) => (
                <VoterLinkRow key={v.token} v={{ ...v, url: `${origin}/v/${token}?u=${v.token}` }} />
              ))}
              {voters.length === 0 && <div style={{ color: MUTED, fontSize: 14 }}>Aucun votant inscrit.</div>}
            </div>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          {result ? (
            <>
              {poll.quorum != null && <QuorumBanner quorum={poll.quorum} count={ballotCount} />}
              <ResultCard result={result} question={poll.question} ballotCount={ballotCount} />
            </>
          ) : (
            <div style={{ ...card, color: MUTED, fontSize: 15 }}>Aucun bulletin pour l'instant.</div>
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
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22 }}>🎟️ Scrutin sur invitation</div>
          <p style={{ color: MUTED, marginTop: 8, lineHeight: 1.5 }}>
            Ce vote est réservé aux personnes invitées. Utilisez le <strong>lien personnel</strong> qui
            vous a été envoyé.
          </p>
        </div>
      </Shell>
    );
  }

  if (view === "scheduled") {
    return (
      <Shell>
        <div style={{ ...card, textAlign: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22 }}>⏳ Vote pas encore ouvert</div>
          <p style={{ color: MUTED, marginTop: 8, lineHeight: 1.5 }}>
            « {poll.question} »
            <br />
            Ouverture le <strong>{poll.opens_at ? fmtDateTime(poll.opens_at) : "—"}</strong>.
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
            ✓ Vote enregistré
          </div>
          <p style={{ color: MUTED, marginTop: 8, lineHeight: 1.5 }}>
            Merci{voter ? ` ${voter.label}` : ""} ! Les résultats seront visibles à la clôture du scrutin.
          </p>
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
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>🔒 Vote clôturé</span>
          <span style={{ color: MUTED, fontSize: 14 }}>Le scrutin est terminé, voici le résultat.</span>
        </div>
        {result ? (
          <>
            {poll.quorum != null && <QuorumBanner quorum={poll.quorum} count={ballotCount} />}
            <ResultCard result={result} question={poll.question} ballotCount={ballotCount} />
          </>
        ) : (
          <div style={{ ...card, color: MUTED }}>Aucun bulletin n'a été déposé.</div>
        )}
      </Shell>
    );
  }

  // ---------- résultats (votant) ----------
  if (view === "results" && result) {
    const footer = (
      <Link
        href="/"
        style={{
          display: "inline-block",
          marginTop: 18,
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
        Créer mon scrutin →
      </Link>
    );
    return (
      <Shell>
        {poll.quorum != null && <QuorumBanner quorum={poll.quorum} count={ballotCount} />}
        <ResultCard result={result} question={poll.question} ballotCount={ballotCount} footer={footer} />
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
        const r = await castInvitedBallot(voterToken, ballot);
        if (r === "ok") {
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
          setError("Lien de vote invalide.");
        }
      } else {
        await addBallot(poll.id, ballot);
        if (voterCanSeeResults(poll)) {
          await loadResults(poll);
          setView("results");
        } else setView("thanks");
      }
    } catch {
      setError("Impossible d'enregistrer le bulletin. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell>
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
          {desc.name}
        </div>
        {voter && (
          <span style={{ fontSize: 13, fontWeight: 700, color: MUTED }}>
            Vous votez en tant que <span style={{ color: INK }}>{voter.label}</span>
          </span>
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
      <p style={{ fontSize: 15, color: MUTED, margin: "8px 0 0" }}>{INSTRUCTIONS[mode]}</p>

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
          {submitting ? "Enregistrement…" : "✓ Voter"}
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
          Voir les résultats sans voter →
        </button>
      )}
    </Shell>
  );
}
