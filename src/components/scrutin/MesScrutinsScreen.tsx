"use client";

import { useEffect, useState } from "react";
import { getLocalPolls, removeLocalPoll, type LocalPoll } from "@/lib/db/localPolls";
import type { ScrutinController } from "@/lib/voting/useScrutin";
import { CREAM, FONT_DISPLAY, INK, MUTED, REDTXT, SUBINK } from "./theme";

export default function MesScrutinsScreen({ ctrl }: { ctrl: ScrutinController }) {
  const { go } = ctrl;
  const [polls, setPolls] = useState<LocalPoll[]>([]);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    setPolls(getLocalPolls());
  }, []);

  const remove = (token: string) => {
    removeLocalPoll(token);
    setPolls(getLocalPolls());
  };

  const fmtDate = (ms: number) => new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

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
        Mes scrutins
      </h1>
      <p style={{ fontSize: 15, color: SUBINK, margin: "12px 0 0", lineHeight: 1.5, maxWidth: "60ch" }}>
        Les scrutins créés sur cet appareil. Conservés localement (sans compte) — un compte pour les
        retrouver partout viendra plus tard.
      </p>

      {polls.length === 0 ? (
        <div
          style={{
            marginTop: 28,
            background: "#fff",
            border: `2.5px solid ${INK}`,
            borderRadius: 18,
            padding: 28,
            textAlign: "center",
            boxShadow: `5px 5px 0 ${INK}`,
          }}
        >
          <div style={{ fontSize: 15, color: MUTED }}>Aucun scrutin sur cet appareil pour le moment.</div>
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
            Créer un scrutin →
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 26 }}>
          {polls.map((p) => {
            const voteUrl = `${origin}/v/${p.token}`;
            const adminUrl = `${origin}/v/${p.token}?k=${p.secret}`;
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
                    <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4 }}>Créé le {fmtDate(p.createdAt)}</div>
                  </div>
                  <button
                    onClick={() => remove(p.token)}
                    title="Retirer de cet appareil"
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
                    Ouvrir / résultats →
                  </a>
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
                    🔑 Gérer
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
