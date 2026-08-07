"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { useTranslations } from "next-intl";
import { useIsAdmin } from "@/lib/db/admin";
import { Link } from "@/i18n/navigation";
import LocaleSwitch from "@/components/LocaleSwitch";
import AboutPlacet from "./AboutPlacet";
import PlacetMark from "./PlacetMark";
import { CORAL, CREAM, FONT_BODY, FONT_DISPLAY, GREEN, INK, lift } from "./theme";

/**
 * Barre de navigation — SANS contrôleur.
 *
 * Elle en dépendait pour deux entrées (« Mes scrutins », « Les méthodes ») qui
 * étaient des changements d'ÉTAT React, pas des liens. Conséquence : la nav ne
 * pouvait être montée que là où vivait le contrôleur — sur `/` et `/new` — donc
 * elle disparaissait dès qu'on ouvrait l'un de ses propres onglets, et ces deux
 * écrans n'avaient aucune URL (impartageables, perdus au rafraîchissement).
 *
 * Les deux boutons sont devenus des liens vers de vraies routes. La nav est
 * désormais autonome et montée sur toutes les surfaces du compte.
 */
export default function Nav() {
  // Elle lit la session elle-même : aucune prop, donc montable depuis n'importe
  // quelle page — y compris une page SERVEUR comme /explorer.
  const auth = useAuth();
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Lien Régie : visible uniquement pour un admin de plateforme (allowlist en base).
  const isAdmin = useIsAdmin(auth.user?.id);
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
        <Link href="/" onClick={() => setOpen(false)} style={{ display: "flex", alignItems: "center", gap: 11, cursor: "pointer", textDecoration: "none", color: "inherit" }}>
          <PlacetMark size={36} />
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 21, letterSpacing: "-0.02em" }}>
            Placet
          </div>
        </Link>

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
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="dc-paper"
              style={{ ...secondary, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              🎛️ {t("regie")}
            </Link>
          )}
          {!auth.loading && auth.user && (
            <Link
              href="/mes-votes"
              onClick={() => setOpen(false)}
              className="dc-paper"
              style={{ ...secondary, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            >
              {t("myVotes")}
            </Link>
          )}
          {!auth.loading && auth.user && (
            <Link
              href="/mes-scrutins"
              onClick={() => setOpen(false)}
              className="dc-paper"
              style={{ ...secondary, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            >
              {t("myPolls")}
            </Link>
          )}
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
          <Link
            href="/methodes"
            onClick={() => setOpen(false)}
            className="dc-paper"
            style={{ ...secondary, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          >
            {t("methods")}
          </Link>
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
          <Link
            href="/new"
            onClick={() => setOpen(false)}
            className="dc-lift"
            style={{
              fontFamily: FONT_BODY,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              textDecoration: "none",
              border: `2.5px solid ${INK}`,
              background: CORAL,
              color: "#fff",
              padding: "9px 16px",
              borderRadius: 10,
              ...lift(`3px 3px 0 ${INK}`, `4px 4px 0 ${INK}`),
            }}
          >
            {t("create")}
          </Link>
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
              // « Se connecter » emporte la page d'où l'on part : sans elle, on
              // s'authentifie et on atterrit chez l'organisateur, en ayant perdu
              // la carte qu'on voulait épingler ou le vote qu'on lisait.
              // `usePathname` de next/navigation rend le chemin AVEC le préfixe
              // de langue — celui de next-intl le retire, et la route de
              // callback vit hors du segment [locale].
              <Link
                href={`/espaces?next=${encodeURIComponent(pathname || "/")}`}
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
