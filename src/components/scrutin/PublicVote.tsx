"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { addBallot, getBallots, getPollByToken, type PollRow } from "@/lib/db/polls";
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
import BallotCard, { EMPTY_DRAFT, type BallotDraft } from "./BallotCard";
import ResultCard from "./ResultCard";
import { CORAL, CREAM, FONT_DISPLAY, GREEN, INK, MUTED, YELLOW, lift } from "./theme";

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

type View = "loading" | "notfound" | "vote" | "results" | "organizer";

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

export default function PublicVote({ token, adminKey }: { token: string; adminKey?: string | null }) {
  const [view, setView] = useState<View>("loading");
  const [poll, setPoll] = useState<PollRow | null>(null);
  const [draft, setDraft] = useState<BallotDraft>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [justVoted, setJustVoted] = useState(false);
  const [result, setResult] = useState<ComputeResult | null>(null);
  const [ballotCount, setBallotCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadResults = useCallback(async (p: PollRow, asView: View = "results") => {
    const ballots = await getBallots(p.id);
    setBallotCount(ballots.length);
    setResult(compute({ recipe: p.recipe, options: p.options, ballots }));
    setView(asView);
  }, []);

  useEffect(() => {
    let alive = true;
    getPollByToken(token)
      .then((p) => {
        if (!alive) return;
        if (!p) {
          setView("notfound");
          return;
        }
        setPoll(p);
        if (adminKey) loadResults(p, "organizer");
        else setView("vote");
      })
      .catch(() => alive && setView("notfound"));
    return () => {
      alive = false;
    };
  }, [token, adminKey, loadResults]);

  if (view === "loading") {
    return (
      <>
        <Header />
        <div className="pad" style={{ maxWidth: 880, margin: "0 auto", padding: "60px 24px", color: MUTED }}>
          Chargement du scrutin…
        </div>
      </>
    );
  }

  if (view === "notfound" || !poll) {
    return (
      <>
        <Header />
        <div className="pad" style={{ maxWidth: 880, margin: "0 auto", padding: "60px 24px", textAlign: "center" }}>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 28 }}>Scrutin introuvable</h1>
          <p style={{ color: MUTED, marginTop: 8 }}>Ce lien de vote n'existe pas ou a expiré.</p>
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
      </>
    );
  }

  const desc = describeRecipe(poll.recipe);
  const mode = methodMode(operativeMethod(poll.recipe));
  const ballotValid = draftToBallot(mode, draft, poll.options.length) !== null;

  const submit = async () => {
    const ballot = draftToBallot(mode, draft, poll.options.length);
    if (!ballot) return;
    setSubmitting(true);
    setError(null);
    try {
      await addBallot(poll.id, ballot);
      setJustVoted(true);
      await loadResults(poll);
    } catch {
      setError("Impossible d'enregistrer le bulletin. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  if (view === "organizer") {
    const voteShareUrl =
      typeof window !== "undefined" ? `${window.location.origin}/v/${poll.token}` : `/v/${poll.token}`;
    return (
      <>
        <Header />
        <div className="pad" style={{ maxWidth: 880, margin: "0 auto", padding: "32px 24px 100px" }}>
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
            }}
          >
            🔑 Vous administrez ce scrutin. Cette page vous est réservée — partagez plutôt le lien de
            vote ci-dessous.
          </div>

          <div
            style={{
              marginTop: 16,
              background: "#fff",
              border: `2.5px solid ${INK}`,
              borderRadius: 16,
              padding: 18,
              boxShadow: `5px 5px 0 ${INK}`,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 12, color: MUTED, marginBottom: 7 }}>
              LIEN DE VOTE À PARTAGER
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
                onClick={() => loadResults(poll, "organizer")}
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
              <span style={{ fontSize: 12.5, color: MUTED, fontWeight: 600 }}>⏳ Clôture du vote — bientôt</span>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            {result ? (
              <ResultCard result={result} question={poll.question} ballotCount={ballotCount} />
            ) : (
              <div
                style={{
                  background: "#fff",
                  border: `2.5px solid ${INK}`,
                  borderRadius: 16,
                  padding: 22,
                  boxShadow: `5px 5px 0 ${INK}`,
                  color: MUTED,
                  fontSize: 15,
                }}
              >
                Aucun bulletin pour l'instant. Partagez le lien de vote pour lancer la collecte.
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  if (view === "results" && result) {
    const footer = (
      <>
        {justVoted && (
          <div
            style={{
              marginTop: 20,
              background: "#e9f8e2",
              border: `2px solid ${INK}`,
              borderRadius: 12,
              padding: "12px 14px",
              fontWeight: 700,
              fontSize: 13.5,
              color: "#1f6b34",
            }}
          >
            ✓ Merci, votre bulletin a bien été enregistré.
          </div>
        )}
        <div style={{ display: "flex", gap: 11, marginTop: 16, flexWrap: "wrap" }}>
          <button
            onClick={() => loadResults(poll)}
            className="dc-lift"
            style={{
              flex: 1,
              minWidth: 150,
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
              border: `2.5px solid ${INK}`,
              background: "#fff",
              color: INK,
              padding: 13,
              borderRadius: 12,
              ...lift(`4px 4px 0 ${INK}`, `6px 6px 0 ${INK}`),
            }}
          >
            ↻ Rafraîchir les résultats
          </button>
          <Link
            href="/"
            style={{
              flex: 1,
              minWidth: 150,
              textAlign: "center",
              textDecoration: "none",
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 15,
              border: `2.5px solid ${INK}`,
              background: YELLOW,
              color: INK,
              padding: 13,
              borderRadius: 12,
            }}
          >
            Créer mon scrutin →
          </Link>
        </div>
      </>
    );
    return (
      <>
        <Header />
        <div className="pad" style={{ maxWidth: 880, margin: "0 auto", padding: "32px 24px 100px" }}>
          <ResultCard result={result} question={poll.question} ballotCount={ballotCount} footer={footer} />
        </div>
      </>
    );
  }

  // view === "vote"
  return (
    <>
      <Header />
      <div className="pad" style={{ maxWidth: 880, margin: "0 auto", padding: "32px 24px 100px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
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

          {error && <div style={{ marginTop: 12, color: "#d23b3b", fontWeight: 700, fontSize: 13 }}>{error}</div>}

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

        <button
          onClick={() => loadResults(poll)}
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
      </div>
    </>
  );
}
