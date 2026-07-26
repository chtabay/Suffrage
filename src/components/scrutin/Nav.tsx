"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { AuthController } from "@/lib/auth/useAuth";
import type { ScrutinController } from "@/lib/voting/useScrutin";
import { Link } from "@/i18n/navigation";
import LocaleSwitch from "@/components/LocaleSwitch";
import AboutPlacet from "./AboutPlacet";
import PlacetMark from "./PlacetMark";
import { CORAL, CREAM, FONT_BODY, FONT_DISPLAY, GREEN, INK, lift } from "./theme";

export default function Nav({ ctrl, auth }: { ctrl: ScrutinController; auth: AuthController }) {
  const { go } = ctrl;
  const t = useTranslations("Nav");
  const [open, setOpen] = useState(false);
  // Toute action ferme le menu mobile.
  const act = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  const secondary = {
    fontFamily: FONT_BODY,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    border: `2px solid ${INK}`,
    background: CREAM,
    color: INK,
    padding: "9px 15px",
    borderRadius: 10,
  } as const;

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
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          rowGap: 10,
        }}
      >
        <div onClick={act(() => go("home"))} style={{ display: "flex", alignItems: "center", gap: 11, cursor: "pointer" }}>
          <PlacetMark size={36} />
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 21, letterSpacing: "-0.02em" }}>
            Placet
          </div>
        </div>

        {/* Bouton menu (mobile uniquement, géré par CSS .nav-burger) */}
        <button
          className="nav-burger"
          onClick={() => setOpen((o) => !o)}
          aria-label={t("menu")}
          aria-expanded={open}
          style={{
            width: 42,
            height: 42,
            border: `2.5px solid ${INK}`,
            background: CREAM,
            color: INK,
            borderRadius: 10,
            fontSize: 18,
            cursor: "pointer",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {open ? "✕" : "☰"}
        </button>

        <div className={`nav-links${open ? " open" : ""}`}>
          <LocaleSwitch />
          {!auth.loading && auth.user && (
            <Link
              href="/espaces"
              onClick={() => setOpen(false)}
              className="dc-paper"
              style={{ ...secondary, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            >
              {t("spaces")}
            </Link>
          )}
          <button onClick={act(() => go("mine"))} className="dc-paper" style={secondary}>
            {t("myPolls")}
          </button>
          <button onClick={act(() => go("gallery"))} className="dc-paper" style={secondary}>
            {t("methods")}
          </button>
          {/* Feed public : accessible à tous, sans compte. */}
          <Link
            href="/explorer"
            onClick={() => setOpen(false)}
            className="dc-paper"
            style={{ ...secondary, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          >
            {t("explore")}
          </Link>
          {/* Aide « C'est quoi Placet ? » — dans le header, sans couper le flux de création. */}
          <AboutPlacet compact />
          <button
            onClick={act(() => go("create"))}
            className="dc-lift"
            style={{
              fontFamily: FONT_BODY,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              border: `2.5px solid ${INK}`,
              background: CORAL,
              color: "#fff",
              padding: "9px 16px",
              borderRadius: 10,
              ...lift(`3px 3px 0 ${INK}`, `4px 4px 0 ${INK}`),
            }}
          >
            {t("create")}
          </button>
          {!auth.loading &&
            (auth.user ? (
              <button
                onClick={act(auth.signOut)}
                className="dc-paper"
                title={auth.user.email ?? undefined}
                style={{ ...secondary, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN, display: "inline-block" }} />
                {t("signOut")}
              </button>
            ) : (
              <Link
                href="/espaces"
                onClick={() => setOpen(false)}
                className="dc-paper"
                style={{ ...secondary, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                {t("signIn")}
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
