"use client";

// CLASSEMENT D'UNE SALLE — générique : il ne sait rien des mots ni des thèmes.
//
// CE QU'IL DIT, ET POURQUOI CHAQUE SIGNE EST LÀ :
//   • le score, évidemment ;
//   • « arrivé manche 4 » sur qui n'était pas là au début — c'est la règle des
//     participants dynamiques rendue LISIBLE : sans cette mention, un joueur à 12
//     points passe pour mauvais alors qu'il a joué deux manches sur cinq ;
//   • « ✓ » pendant la contribution : qui a fini. Jamais QUOI — le contenu
//     n'existe pas côté client avant la révélation ;
//   • « 💤 » : plus de signe de vie depuis 90 s. C'est ce qui donne à l'hôte le
//     droit moral de révéler à 5/6 sans attendre un téléphone posé sur la table ;
//   • « ⏳ » : entré, mais pas encore dans la manche en cours.
import type { RoomPlayer } from "@/lib/games/room";
import type { GameSkin } from "@/lib/games/skin";

export default function PlayerBoard({
  skin,
  players,
  /** Manche en cours (0 dans le salon) : décide de l'affichage de « arrivé manche N ». */
  roundNo,
  /** Vrai pendant la contribution : on montre alors qui a fini. */
  showDone,
  labels,
  /** Classement final : on numérote et on met le premier en avant. */
  podium = false,
}: {
  skin: GameSkin;
  players: RoomPlayer[];
  roundNo: number;
  showDone: boolean;
  labels: { joinedAt: (n: number) => string; host: string; waiting: string; idle: string; done: string };
  podium?: boolean;
}) {
  const MEDALS = ["🥇", "🥈", "🥉"];
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 7 }}>
      {players.map((p, i) => {
        const first = podium && i === 0;
        return (
          <li
            key={p.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              background: p.isMe ? skin.accent2 : skin.paper,
              border: `${first ? skin.border + 0.5 : 2}px solid ${skin.ink}`,
              borderRadius: 12,
              padding: first ? "13px 13px" : "9px 12px",
              boxShadow: first ? `4px 4px 0 ${skin.ink}` : undefined,
            }}
          >
            {podium && (
              <span
                aria-hidden
                style={{ fontSize: first ? 24 : 17, width: 26, textAlign: "center", flex: "none" }}
              >
                {MEDALS[i] ?? i + 1}
              </span>
            )}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontFamily: skin.fontDisplay,
                  fontWeight: 800,
                  fontSize: first ? 21 : 15.5,
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {p.name}
                {p.isHost && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: skin.muted, marginLeft: 7 }}>
                    {labels.host}
                  </span>
                )}
              </span>
              {/* Une seule sous-ligne, la plus informative : l'arrivée tardive
                  prime sur l'attente, qui prime sur l'inactivité. */}
              {p.joinedRound > 1 ? (
                <span style={{ fontSize: 11.5, color: skin.muted, fontWeight: 600 }}>
                  {labels.joinedAt(p.joinedRound)}
                </span>
              ) : null}
            </span>
            {showDone && roundNo > 0 && !p.playing && (
              <span title={labels.waiting} style={{ fontSize: 13, flex: "none" }}>
                <span aria-hidden>⏳</span>
                <span className="sr-only">{labels.waiting}</span>
              </span>
            )}
            {showDone && p.playing && p.done && (
              <span title={labels.done} style={{ fontSize: 15, flex: "none", color: skin.good }}>
                <span aria-hidden>✓</span>
                <span className="sr-only">{labels.done}</span>
              </span>
            )}
            {showDone && p.playing && !p.done && p.idle && (
              <span title={labels.idle} style={{ fontSize: 13, flex: "none" }}>
                <span aria-hidden>💤</span>
                <span className="sr-only">{labels.idle}</span>
              </span>
            )}
            <span
              style={{
                fontFamily: skin.fontDisplay,
                fontWeight: 800,
                fontSize: first ? 26 : 18,
                minWidth: 34,
                textAlign: "right",
                flex: "none",
              }}
            >
              {p.score}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
