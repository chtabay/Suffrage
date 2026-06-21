"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuthController } from "@/lib/auth/useAuth";
import { getLocalPolls, removeLocalPoll, type LocalPoll } from "@/lib/db/localPolls";
import { getMyPolls, type PollRow } from "@/lib/db/polls";
import type { ScrutinController } from "@/lib/voting/useScrutin";
import { CREAM, FONT_DISPLAY, INK, MUTED, REDTXT, SUBINK } from "./theme";

interface Item {
  token: string;
  question: string;
  createdAt: number;
  secret: string | null;
}

export default function MesScrutinsScreen({ ctrl, auth }: { ctrl: ScrutinController; auth: AuthController }) {
  const { go } = ctrl;
  const [locals, setLocals] = useState<LocalPoll[]>([]);
  const [cloud, setCloud] = useState<PollRow[]>([]);
  const [origin, setOrigin] = useState("");

  const reloadLocal = useCallback(() => setLocals(getLocalPolls()), []);

  useEffect(() => {
    setOrigin(window.location.origin);
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

  const remove = (token: string) => {
    removeLocalPoll(token);
    reloadLocal();
  };

  const fmtDate = (ms: number) =>
    Number.isFinite(ms) ? new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";

  const localTokens = new Set(locals.map((p) => p.token));
  const items: Item[] = [
    ...locals.map((p) => ({ token: p.token, question: p.question, createdAt: p.createdAt, secret: p.secret })),
    ...cloud
      .filter((c) => !localTokens.has(c.token))
      .map((c) => ({ token: c.token, question: c.question, createdAt: Date.parse(c.created_at), secret: null })),
  ].sort((a, b) => b.createdAt - a.createdAt);

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
        Les scrutins créés sur cet appareil, plus ceux rattachés à ton compte.
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
          ✓ Connecté{auth.user.email ? ` (${auth.user.email})` : ""} — tes scrutins te suivent partout.
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
            💡 Connecte-toi pour retrouver tes scrutins sur tous tes appareils.
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
            Se connecter avec Google
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
          <div style={{ fontSize: 15, color: MUTED }}>Aucun scrutin pour le moment.</div>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 22 }}>
          {items.map((p) => {
            const voteUrl = `${origin}/v/${p.token}`;
            const adminUrl = p.secret ? `${origin}/v/${p.token}?k=${p.secret}` : null;
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
                    <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4 }}>
                      {fmtDate(p.createdAt)}
                      {!p.secret && <span style={{ marginLeft: 8 }}>☁︎ compte</span>}
                    </div>
                  </div>
                  {p.secret && (
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
                    Ouvrir / résultats →
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
                      🔑 Gérer
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
