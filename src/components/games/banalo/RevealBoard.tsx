"use client";

// LA RÉVÉLATION — le moment central du jeu, et le seul écran qu'on regarde à
// plusieurs sur le même téléphone.
//
// TROIS TEMPS, DANS CET ORDRE :
//   1. LES MOTS COMMUNS, du plus partagé au moins partagé, apparaissant l'un
//      après l'autre. L'escalier descendant est ce qui produit le « ahh » :
//      commencer par le mot que tout le monde a eu, finir par les orphelins.
//   2. MA MANCHE — combien j'ai pris, et sur quels mots. Sans ce bloc, chacun
//      doit chercher son nom dans sept listes de joueurs.
//   3. LE TABLEAU DE LA MANCHE, tout le monde y figure, y compris qui n'a pas
//      répondu (« — » et non « 0 » : ce n'est pas un mauvais score, c'est une
//      absence, et l'hôte a révélé sans l'attendre).
//
// L'apparition progressive est faite en CSS (`popIn` + un retard par ligne) et
// non par une minuterie JavaScript : elle ne dépend d'aucun état, donc un
// rafraîchissement du sondage ne la rejoue pas et ne la coupe pas au milieu.
import type { GameSkin } from "@/lib/games/skin";
import { GCard, GLabel } from "@/components/games/ui";

export interface BanaloWord {
  label: string;
  norm: string;
  count: number;
  points: number;
  players: string[];
}
export interface BanaloPlayerRound {
  name: string;
  points: number;
  answered: boolean;
  words: { label: string; count: number; points: number }[];
}
export interface BanaloResult {
  rule: string;
  words: BanaloWord[];
  players: BanaloPlayerRound[];
}

/** Retard d'apparition d'une ligne, plafonné : à trente mots, on n'attend pas. */
const step = (i: number) => `${Math.min(i * 0.08, 1.6)}s`;

export default function RevealBoard({
  skin,
  result,
  myName,
  labels,
}: {
  skin: GameSkin;
  result: BanaloResult;
  myName?: string | null;
  labels: {
    common: string;
    alone: string;
    nobodyElse: string;
    myRound: string;
    roundTable: string;
    noAnswer: string;
    andMore: (n: number) => string;
    empty: string;
  };
}) {
  const shared = result.words.filter((w) => w.points > 0);
  const orphans = result.words.filter((w) => w.points === 0);
  const mine = myName ? result.players.find((p) => p.name === myName) : undefined;

  if (!result.words.length) {
    return (
      <GCard skin={skin} padding={18}>
        <div style={{ color: skin.muted, fontSize: 14.5, lineHeight: 1.5 }}>{labels.empty}</div>
      </GCard>
    );
  }

  const row = (w: BanaloWord, i: number, dim: boolean) => (
    <li
      key={w.norm}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: dim ? "transparent" : skin.paper,
        border: `2px solid ${dim ? `${skin.ink}33` : skin.ink}`,
        borderRadius: 12,
        padding: "10px 12px",
        animation: "popIn 0.32s ease both",
        animationDelay: step(i),
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontFamily: skin.fontDisplay,
            fontWeight: 800,
            fontSize: dim ? 16 : "clamp(18px,5vw,23px)",
            letterSpacing: "-0.01em",
            textTransform: "uppercase",
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {w.label}
        </span>
        <span style={{ fontSize: 11.5, color: skin.muted, fontWeight: 600 }}>
          {w.players.slice(0, 3).join(", ")}
          {w.players.length > 3 ? ` ${labels.andMore(w.players.length - 3)}` : ""}
        </span>
      </span>
      {!dim && (
        <span
          aria-hidden
          style={{
            fontFamily: skin.fontDisplay,
            fontWeight: 800,
            fontSize: 14,
            background: skin.accent2,
            border: `2px solid ${skin.ink}`,
            borderRadius: 999,
            padding: "2px 9px",
            flex: "none",
          }}
        >
          ×{w.count}
        </span>
      )}
      <span
        style={{
          fontFamily: skin.fontDisplay,
          fontWeight: 800,
          fontSize: dim ? 15 : 20,
          color: dim ? skin.muted : skin.good,
          minWidth: 40,
          textAlign: "right",
          flex: "none",
        }}
      >
        +{w.points}
      </span>
    </li>
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <GLabel skin={skin}>{labels.common}</GLabel>
        <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "grid", gap: 7 }}>
          {shared.map((w, i) => row(w, i, false))}
        </ul>
        {!shared.length && (
          <div style={{ marginTop: 8, color: skin.muted, fontSize: 14, fontWeight: 600 }}>{labels.nobodyElse}</div>
        )}
      </div>

      {orphans.length > 0 && (
        <div>
          <GLabel skin={skin}>{labels.alone}</GLabel>
          <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "grid", gap: 6 }}>
            {orphans.map((w, i) => row(w, shared.length + i, true))}
          </ul>
        </div>
      )}

      {mine && (
        <GCard skin={skin} accent={skin.accent} padding={15} style={{ background: skin.accent2 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
            <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 15 }}>{labels.myRound}</span>
            <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 27 }}>
              +{mine.points}
            </span>
          </div>
          {mine.words.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {mine.words.map((w) => (
                <span
                  key={w.label}
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    padding: "4px 9px",
                    borderRadius: 999,
                    border: `2px solid ${skin.ink}`,
                    background: w.points > 0 ? skin.paper : "transparent",
                    opacity: w.points > 0 ? 1 : 0.55,
                  }}
                >
                  {w.label} <span style={{ color: skin.muted }}>+{w.points}</span>
                </span>
              ))}
            </div>
          )}
        </GCard>
      )}

      <div>
        <GLabel skin={skin}>{labels.roundTable}</GLabel>
        <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "grid", gap: 5 }}>
          {result.players.map((p) => (
            <li
              key={p.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14.5,
                padding: "7px 11px",
                borderRadius: 10,
                border: `2px solid ${skin.ink}22`,
                background: p.name === myName ? skin.paper : "transparent",
              }}
            >
              <span style={{ flex: 1, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.name}
                {!p.answered && (
                  <span style={{ fontSize: 11.5, color: skin.muted, fontWeight: 600, marginLeft: 7 }}>
                    {labels.noAnswer}
                  </span>
                )}
              </span>
              <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, minWidth: 42, textAlign: "right" }}>
                {p.answered ? `+${p.points}` : "—"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
