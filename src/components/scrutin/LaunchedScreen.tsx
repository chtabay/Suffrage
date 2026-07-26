"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { ScrutinController } from "@/lib/voting/useScrutin";
import type { AuthController } from "@/lib/auth/useAuth";
import InstallInline from "@/components/pwa/InstallInline";
import ShareRow from "./ShareRow";
import QrCode from "./QrCode";
import { CREAM, FONT_BODY, FONT_DISPLAY, GREEN, INK, MUTED, YELLOW, lift } from "./theme";

function CopyRow({ url, label, hint }: { url: string; label: string; hint?: string }) {
  const t = useTranslations("Launched");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Repli si le presse-papiers est indisponible : on sélectionne le lien.
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  };
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontWeight: 700, fontSize: 12, color: MUTED, marginBottom: 7 }}>{label}</div>
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
        <input
          ref={inputRef}
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          style={{
            flex: 1,
            minWidth: 220,
            fontFamily: FONT_BODY,
            fontSize: 14,
            fontWeight: 600,
            padding: "11px 13px",
            border: `2px solid ${INK}`,
            borderRadius: 11,
            background: CREAM,
            outline: "none",
          }}
        />
        <button
          onClick={copy}
          aria-live="polite"
          className="dc-lift"
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            border: `2.5px solid ${INK}`,
            background: copied ? GREEN : YELLOW,
            color: copied ? "#fff" : INK,
            padding: "11px 16px",
            borderRadius: 11,
            ...lift(`3px 3px 0 ${INK}`, `4px 4px 0 ${INK}`),
          }}
        >
          {copied ? t("copied") : t("copy")}
        </button>
      </div>
      {hint && <div style={{ fontSize: 12, color: MUTED, marginTop: 6, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

function VoterRow({ label, url }: { label: string; url: string }) {
  const t = useTranslations("Launched");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <div
        style={{
          width: 96,
          flex: "none",
          fontWeight: 700,
          fontSize: 13,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
      <input
        ref={inputRef}
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        style={{
          flex: 1,
          minWidth: 120,
          fontFamily: FONT_BODY,
          fontSize: 12.5,
          fontWeight: 600,
          padding: "8px 10px",
          border: `2px solid ${INK}`,
          borderRadius: 9,
          background: CREAM,
          outline: "none",
        }}
      />
      <button
        onClick={copy}
        aria-live="polite"
        style={{
          flex: "none",
          fontWeight: 700,
          fontSize: 12.5,
          cursor: "pointer",
          border: `2px solid ${INK}`,
          background: copied ? GREEN : YELLOW,
          color: copied ? "#fff" : INK,
          padding: "8px 12px",
          borderRadius: 9,
        }}
      >
        {copied ? "✓" : t("copy")}
      </button>
    </div>
  );
}

export default function LaunchedScreen({ ctrl, auth }: { ctrl: ScrutinController; auth: AuthController }) {
  const t = useTranslations("Launched");
  const { state, newScrutin, go } = ctrl;
  const [showQr, setShowQr] = useState(false);
  const voteUrl = state.shareUrl ?? "";
  const adminUrl = state.adminUrl ?? "";

  return (
    <div className="pad" style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 100px" }}>
      <div
        style={{
          background: "#fff",
          border: `2.5px solid ${INK}`,
          borderRadius: 22,
          boxShadow: `6px 6px 0 ${GREEN}`,
          overflow: "hidden",
        }}
      >
        <div style={{ background: GREEN, padding: "26px 24px", borderBottom: `2.5px solid ${INK}` }}>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: "rgba(255,255,255,0.92)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {t("badge")}
          </div>
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 800,
              fontSize: 28,
              color: "#fff",
              lineHeight: 1.05,
              marginTop: 4,
              textShadow: "2px 2px 0 rgba(0,0,0,0.18)",
            }}
          >
            {t("ready")}
          </div>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{state.question}</div>
          <p style={{ color: MUTED, fontSize: 14, margin: "6px 0 18px", lineHeight: 1.5 }}>
            {t("intro")}
          </p>

          <CopyRow url={voteUrl} label={t("voteLinkLabel")} />

          <ShareRow question={state.question} url={voteUrl} style={{ marginTop: 12 }} />

          {/* QR replié par défaut : c'était la plus grosse surface du partage — on
              le garde à un tap, sans occuper tout l'écran. */}
          {state.access === "open" && (
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setShowQr((v) => !v)}
                aria-expanded={showQr}
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  border: `2px solid ${INK}`,
                  background: showQr ? INK : "transparent",
                  color: showQr ? "#fff" : INK,
                  padding: "7px 14px",
                  borderRadius: 20,
                }}
              >
                {showQr ? `📱 ${t("qrHide")}` : `📱 ${t("qrShow")}`}
              </button>
              {showQr && (
                <div style={{ marginTop: 12 }}>
                  <QrCode url={voteUrl} />
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <CopyRow
              url={adminUrl}
              label={t("adminLinkLabel")}
              hint={t("adminLinkHint")}
            />
          </div>

          <div
            style={{
              marginTop: 18,
              background: CREAM,
              border: `2px solid ${INK}`,
              borderRadius: 11,
              padding: "10px 12px",
              fontSize: 13,
              fontWeight: 600,
              color: INK,
            }}
          >
            {t("savedNotice")}
          </div>

          {/* Proposition de compte APRÈS le lancement : moment d'onboarding naturel.
              À la connexion, ce scrutin (déjà sauvé localement) est rattaché au compte
              (claimPolls) → retrouvable partout + réception des messages des votants. */}
          {!auth.user && (
            <div
              style={{
                marginTop: 12,
                background: YELLOW,
                border: `2px solid ${INK}`,
                borderRadius: 12,
                padding: "13px 15px",
              }}
            >
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15 }}>👤 {t("accountCtaTitle")}</div>
              <p style={{ fontSize: 13, color: INK, lineHeight: 1.5, margin: "5px 0 11px" }}>{t("accountCtaSub")}</p>
              <button
                onClick={auth.signIn}
                className="dc-lift"
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  border: `2.5px solid ${INK}`,
                  background: INK,
                  color: "#fff",
                  padding: "10px 16px",
                  borderRadius: 11,
                  ...lift(`3px 3px 0 ${INK}`, `4px 4px 0 ${INK}`),
                }}
              >
                {t("accountCtaBtn")}
              </button>
            </div>
          )}

          {/* Feed public : confirmation de la publication (mêmes conditions que le launch). */}
          {state.publicListing && state.access === "open" && state.optionKind !== "assign" && (
            <div
              style={{
                marginTop: 10,
                background: YELLOW,
                border: `2px solid ${INK}`,
                borderRadius: 11,
                padding: "10px 12px",
                fontSize: 13,
                fontWeight: 600,
                color: INK,
              }}
            >
              📣 {t("publishedLine")}
            </div>
          )}

          {state.voterLinks.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: MUTED, marginBottom: 7 }}>
                {t("voterLinksLabel", { count: state.voterLinks.length })}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto" }}>
                {state.voterLinks.map((v, i) => (
                  <VoterRow key={i} label={v.label} url={v.url} />
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 11, marginTop: 20, flexWrap: "wrap" }}>
            <a
              href={voteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="dc-lift"
              style={{
                flex: 1,
                minWidth: 160,
                textAlign: "center",
                textDecoration: "none",
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 15,
                border: `2.5px solid ${INK}`,
                background: INK,
                color: "#fff",
                padding: 13,
                borderRadius: 12,
                ...lift(`4px 4px 0 ${GREEN}`, `6px 6px 0 ${GREEN}`),
              }}
            >
              {t("openVotePage")}
            </a>
            <button
              onClick={() => go("mine")}
              style={{
                flex: 1,
                minWidth: 160,
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                border: `2px solid ${INK}`,
                background: "#fff",
                color: INK,
                padding: 13,
                borderRadius: 12,
              }}
            >
              {t("myPolls")}
            </button>
            <button
              onClick={newScrutin}
              style={{
                flex: 1,
                minWidth: 160,
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                border: `2px solid ${INK}`,
                background: CREAM,
                color: INK,
                padding: 13,
                borderRadius: 12,
              }}
            >
              {t("createAnother")}
            </button>
          </div>

          <InstallInline />
        </div>
      </div>
    </div>
  );
}
