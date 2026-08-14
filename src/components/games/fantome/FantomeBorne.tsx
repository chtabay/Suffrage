"use client";

// UN PORTRAIT DU MANOIR — l'écran posé dans une pièce.
//
// C'est un ÉCRAN-BALISE, JAMAIS UN GUICHET : il affiche un cadre, un œil et un
// code qui tourne, et ne reçoit rien. Ce renversement n'est pas une préférence,
// c'est une contrainte chiffrée — 11 joueurs × 3 rondes × 90 s font 49 min de
// borne-temps par manche contre 24 min de capacité si les portraits étaient des
// guichets où l'on fait la queue.
//
// ⚠️ LE SECRET D'APPAIRAGE NE PASSE JAMAIS PAR L'URL. Il est rendu une fois par
// `fantome_borne_pair` et vit dans le localStorage de CET appareil. Une URL
// porteuse ferait du préparateur un oracle : il rouvrirait chaque portrait sur
// son téléphone et lirait tous les codes de la maison depuis son fauteuil.
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FANTOME_SKIN } from "@/lib/games/skin";
import { PIECES, pieceEmoji, pieceLabel } from "@/lib/games/fantome/manoir";
import * as verbes from "@/lib/games/fantome/verbes";

const skin = FANTOME_SKIN;
const KEY = (code: string) => `placet.fantome.borne.${code.toUpperCase()}`;

export default function FantomeBorne({ code }: { code: string }) {
  const t = useTranslations("Fantome");
  const locale = useLocale();
  const [secret, setSecret] = useState<string | null>(null);
  const [read, setRead] = useState(false);
  const [place, setPlace] = useState<string | null>(null);
  const [display, setDisplay] = useState<string>("····");
  const [toll, setToll] = useState(false);
  const [lost, setLost] = useState(false);
  const [busy, setBusy] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY(code));
      if (raw) {
        const o = JSON.parse(raw) as { secret: string; place: string };
        setSecret(o.secret);
        setPlace(o.place);
      }
    } catch {
      /* localStorage indisponible : on repart de l'appairage. */
    }
    setRead(true);
  }, [code]);

  // Le glas, fabriqué à la volée : deux coups graves, sans aucun fichier à
  // charger. ⚠️ Un AudioContext doit être créé APRÈS un geste de l'utilisateur —
  // d'où l'armement au moment où l'on accroche le portrait.
  const ring = useCallback(() => {
    const ctx = audioRef.current;
    if (!ctx) return;
    [0, 0.9].forEach((delay) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 98;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 2.2);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + 2.3);
    });
  }, []);

  // Le battement. Cinq secondes : le code tourne toutes les vingt, et c'est
  // aussi ce battement qui dit au serveur que le portrait est vivant — une
  // borne débranchée est traitée COMME une pièce hantée au dépouillement.
  useEffect(() => {
    if (!secret) return;
    let stop = false;
    let last = false;
    const tick = async () => {
      try {
        const a = await verbes.pollBorne(secret);
        if (stop) return;
        if (a.status !== "ok") {
          setLost(true);
          return;
        }
        setLost(false);
        if (a.code) setDisplay(a.code);
        if (a.place) setPlace(a.place);
        if (a.toll && !last) {
          setToll(true);
          ring();
          window.setTimeout(() => setToll(false), 6000);
        }
        last = !!a.toll;
      } catch {
        /* Un wifi de gîte qui hoquette : on retentera dans 5 s. */
      }
    };
    void tick();
    const id = window.setInterval(tick, 5000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [secret, ring]);

  // Garder l'écran allumé. ⚠️ L'API n'existe pas sur les vieux navigateurs —
  // exactement les appareils de récupération qu'on pose dans les pièces — donc
  // l'écran l'écrit aussi en toutes lettres : « règle la veille sur jamais ».
  useEffect(() => {
    if (!secret) return;
    let sentinel: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    const ask = async () => {
      try {
        if (nav.wakeLock) sentinel = await nav.wakeLock.request("screen");
      } catch {
        /* Refusé ou indisponible : la consigne écrite prend le relais. */
      }
    };
    void ask();
    const onVis = () => {
      if (document.visibilityState === "visible") void ask();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      void sentinel?.release().catch(() => {});
    };
  }, [secret]);

  const hang = async (key: string) => {
    if (busy) return;
    setBusy(true);
    try {
      // L'audio s'arme ICI : c'est le seul geste utilisateur de toute la
      // soirée sur cet appareil.
      try {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctx) audioRef.current = new Ctx();
      } catch {
        /* Pas de son : le vacillement visuel reste. */
      }
      const a = await verbes.pairBorne(code, key);
      if (a.status !== "ok" || !a.secret) return;
      window.localStorage.setItem(KEY(code), JSON.stringify({ secret: a.secret, place: a.place }));
      setSecret(a.secret);
      setPlace(a.place ?? key);
    } finally {
      setBusy(false);
    }
  };

  const frame = (children: React.ReactNode) => (
    <div
      style={{
        minHeight: "100dvh",
        background: toll ? "#0B0710" : skin.ink,
        color: skin.paper,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        transition: "background 220ms",
        fontFamily: skin.fontBody,
      }}
    >
      {children}
    </div>
  );

  if (!read) return frame(<div style={{ color: skin.muted }}>{t("loading")}</div>);

  // ─────────────────────────────────────────── on accroche le portrait
  if (!secret) {
    return frame(
      <div style={{ width: "100%", maxWidth: 520, display: "grid", gap: 14 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 44 }} aria-hidden>🖼️</div>
          <h1 style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 26, margin: "6px 0 0" }}>
            {t("borne.title")}
          </h1>
          <p style={{ color: "#BFB4C9", fontSize: 15, lineHeight: 1.5, marginTop: 8 }}>{t("borne.pick")}</p>
          <p style={{ color: "#8E8199", fontSize: 13.5, lineHeight: 1.5 }}>{t("borne.pickHint")}</p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {PIECES.map((p) => (
            <button
              key={p.key}
              type="button"
              disabled={busy}
              onClick={() => hang(p.key)}
              style={{
                border: `2px solid ${skin.accent2}`,
                borderRadius: 999,
                background: "transparent",
                color: skin.paper,
                fontFamily: skin.fontDisplay,
                fontWeight: 700,
                fontSize: 15,
                padding: "11px 16px",
                minHeight: 46,
                cursor: "pointer",
              }}
            >
              {p.emoji} {pieceLabel(p.key, locale)}
            </button>
          ))}
        </div>
      </div>,
    );
  }

  // ─────────────────────────────────────────── le portrait est accroché
  return frame(
    <div style={{ width: "100%", maxWidth: 640, textAlign: "center", display: "grid", gap: 10 }}>
      <div
        style={{
          border: `10px solid ${skin.accent2}`,
          borderRadius: 8,
          padding: "26px 18px",
          background: toll ? "#150C1E" : "#241C31",
          boxShadow: toll ? "none" : "0 0 60px rgba(201,162,39,0.18) inset",
          animation: toll ? "flick 260ms steps(2) infinite" : undefined,
        }}
      >
        <div style={{ fontSize: "clamp(40px,11vw,68px)", lineHeight: 1 }} aria-hidden>
          {toll ? "🕯️" : "👁️"}
        </div>
        <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 19, marginTop: 8, color: skin.accent2 }}>
          {pieceEmoji(place ?? "")} {pieceLabel(place ?? "", locale)}
        </div>

        {toll ? (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: "clamp(30px,9vw,52px)", letterSpacing: "0.14em", color: "#E8D9A0" }}>
              {t("borne.toll")}
            </div>
            <div style={{ fontSize: 15, color: "#BFB4C9", marginTop: 6 }}>{t("borne.tollHint")}</div>
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8E8199" }}>
              {t("borne.codeLabel")}
            </div>
            <div
              style={{
                fontFamily: skin.fontDisplay,
                fontWeight: 800,
                fontSize: "clamp(56px,17vw,110px)",
                letterSpacing: "0.16em",
                lineHeight: 1.05,
                color: skin.paper,
              }}
            >
              {display}
            </div>
          </div>
        )}
      </div>

      {lost ? (
        <div role="alert" style={{ fontSize: 14, fontWeight: 700, color: skin.accent2 }}>
          {t("borne.lost")}
        </div>
      ) : (
        <div style={{ fontSize: 12.5, color: "#8E8199", lineHeight: 1.5 }}>
          🔌 {t("borne.keepAwake")} — {t("borne.keepAwakeHint")}
        </div>
      )}

      <style>{`@keyframes flick{0%{opacity:1}50%{opacity:.35}100%{opacity:1}}`}</style>
    </div>,
  );
}
