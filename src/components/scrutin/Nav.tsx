"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { useTranslations } from "next-intl";
import { useIsAdmin } from "@/lib/db/admin";
import { Link, usePathname as useHere } from "@/i18n/navigation";
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
 * écrans n'avaient aucune URL. Elle lit désormais la session elle-même.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA RÈGLE DE RANGEMENT, et il n'y en a qu'une :
 *
 *   Un MOT NU mène à une page du site — et la page où je suis est le seul mot
 *   en plein. Un CADRE crème ne quitte pas la page : il ouvre un panneau, il
 *   règle, il ferme ma session. Le seul APLAT CORAIL est l'action : créer.
 *
 * Elle vaut sur les onze objets visibles, sans exception — c'est ce qui la rend
 * devinable sans l'avoir apprise. Deux conséquences qui surprennent et qu'il ne
 * faut pas « corriger » :
 *   • « Se connecter » est un MOT NU (c'est une page) tandis que « Déconnexion »
 *     est un CADRE (c'est un bouton qui détruit la session). L'asymétrie du code
 *     devient exactement l'asymétrie visible.
 *   • Le logo porte `aria-current` sur l'accueil mais AUCUN pavé, et « Créer »
 *     n'est jamais marqué même sur /new : le marqueur appartient aux mots de la
 *     bande, pas aux aplats.
 *
 * Avant cette refonte, dix entrées portaient le même vêtement, aucune ne disait
 * où l'on était (`aria-current` : zéro occurrence dans tout src/), et l'ordre
 * n'obéissait à aucune règle qu'on pût énoncer.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function Nav() {
  const auth = useAuth();
  const t = useTranslations("Nav");
  // Chemin AVEC le préfixe de langue : il alimente `next=`, et la route de
  // callback vit hors du segment [locale].
  const pathname = usePathname();
  // Chemin DÉ-préfixé (`/explorer` et non `/es/explorer`) : il sert à marquer la
  // page courante. Sûr tant que `src/i18n/routing.ts` ne déclare aucun bloc
  // `pathnames` — si des chemins sont un jour localisés, le marqueur s'éteint en
  // silence sans rien casser, et il faudra passer par `getPathname()`.
  const here = useHere();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLElement>(null);
  const burger = useRef<HTMLButtonElement>(null);
  // Lien Régie : visible uniquement pour un admin de plateforme (allowlist en base).
  const isAdmin = useIsAdmin(auth.user?.id);

  const close = useCallback(() => setOpen(false), []);
  const act = (fn: () => void) => () => {
    close();
    fn();
  };

  // ---- Le tiroir mobile : trois manques qui se remarquent tous ----
  // Échap et le clic extérieur existaient déjà ailleurs dans le dépôt
  // (AboutPlacet, LocaleSwitch) ; le verrou de défilement est celui qu'on
  // remarque le plus — le tiroir reste épinglé pendant que la page défile
  // dessous. Le focus n'est PAS piégé : le tiroir suit immédiatement le bouton
  // dans le DOM, Tab y entre et en sort naturellement.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        burger.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  /** Suis-je sur cette page, ou dans l'une de ses sous-pages ? */
  const at = (h: string) => here === h || here.startsWith(`${h}/`);

  // Un MOT : mène à une page. En plein quand c'est la page courante — et sans
  // `dc-paper`, dont le survol repeindrait le pavé en blanc.
  const Mot = ({ href, children, label }: { href: string; children: React.ReactNode; label?: string }) => {
    const ici = at(href);
    return (
      <li>
        <Link
          href={href}
          onClick={close}
          aria-current={ici ? "page" : undefined}
          title={label}
          className={ici ? undefined : "dc-paper"}
          // Mêmes hauteur et gouttières dans les deux états : la barre a
          // exactement la même largeur sur toutes les pages, aucune entrée ne
          // se déplace quand on navigue.
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: 38,
            padding: "0 10px",
            borderRadius: 10,
            fontFamily: FONT_BODY,
            fontWeight: ici ? 800 : 600,
            fontSize: 14,
            textDecoration: "none",
            background: ici ? INK : "transparent",
            color: ici ? CREAM : INK,
            whiteSpace: "nowrap",
          }}
        >
          {children}
        </Link>
      </li>
    );
  };

  // Un CADRE : ne quitte pas la page.
  const cadre = {
    fontFamily: FONT_BODY,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    border: `2px solid ${INK}`,
    background: CREAM,
    color: INK,
    height: 38,
    padding: "0 14px",
    borderRadius: 10,
  } as const;

  const connecte = !auth.loading && auth.user;

  return (
    <header
      ref={box}
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
          gap: 12,
          // `wrap` est conservé : c'est lui qui donne sa ligne au tiroir mobile
          // (`flex-basis: 100%`). La contrainte de retour à la ligne porte sur
          // la seule bande de destinations, pas sur la barre entière.
          flexWrap: "wrap",
          rowGap: 10,
        }}
      >
        <Link href="/" onClick={close} aria-current={here === "/" ? "page" : undefined} style={{ display: "flex", alignItems: "center", gap: 11, cursor: "pointer", textDecoration: "none", color: "inherit", flex: "none" }}>
          <PlacetMark size={36} />
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 21, letterSpacing: "-0.02em" }}>Placet</div>
        </Link>

        {/* L'ACTION, collée au logo et enfant DIRECT du conteneur : même pixel
            sur toutes les pages, dans tous les états, à toutes les largeurs, et
            jamais repliée sous le ☰. La promesse des trente secondes cesse de
            coûter deux gestes sur mobile. */}
        <Link
          href="/new"
          onClick={close}
          className="dc-lift"
          style={{
            flex: "none",
            display: "inline-flex",
            alignItems: "center",
            fontFamily: FONT_BODY,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            textDecoration: "none",
            border: `2.5px solid ${INK}`,
            background: CORAL,
            color: "#fff",
            height: 38,
            padding: "0 16px",
            borderRadius: 10,
            ...lift(`3px 3px 0 ${INK}`, `4px 4px 0 ${INK}`),
          }}
        >
          {t("create")}
        </Link>

        <button
          ref={burger}
          className="nav-burger"
          onClick={() => setOpen((o) => !o)}
          aria-label={t("menu")}
          aria-expanded={open}
          aria-controls="nav-principale"
          style={{ width: 44, height: 44, border: `2.5px solid ${INK}`, background: CREAM, color: INK, borderRadius: 10, fontSize: 18, cursor: "pointer", alignItems: "center", justifyContent: "center" }}
        >
          {open ? "✕" : "☰"}
        </button>

        <nav id="nav-principale" aria-label={t("mainNav")} className={`nav-links${open ? " open" : ""}`}>
          {/* La bande : que des pages. C'est la seule partie qui peut passer à
              la ligne — les réglages et la session restent sur la ligne 1. */}
          <ul className="nav-band">
            {connecte && (
              <Mot href="/mes-votes" label={t("myVotesHint")}>
                {t("myVotes")}
                <span className="nav-hint">{t("myVotesHint")}</span>
              </Mot>
            )}
            {connecte && (
              <Mot href="/mes-scrutins" label={t("myPollsHint")}>
                {t("myPolls")}
                <span className="nav-hint">{t("myPollsHint")}</span>
              </Mot>
            )}
            {connecte && (
              <Mot href="/espaces" label={t("spacesHint")}>
                {t("spaces")}
                <span className="nav-hint">{t("spacesHint")}</span>
              </Mot>
            )}
            <Mot href="/methodes">{t("methods")}</Mot>
            {/* Feed public : accessible à tous, sans compte. */}
            <Mot href="/explorer">{t("explore")}</Mot>
            {/* Les jeux. Une PAGE, donc un mot — et il reste dans la bande alors
                qu'il mène ailleurs (les jeux ont leur propre habillage) : c'est
                Placet qui les fait découvrir, la réciproque se fait en pied de
                chaque partie. */}
            <Mot href="/games">{t("games")}</Mot>
            {/* Régie : une page, donc un mot. Un glyphe suffit pour un lien dont
                l'audience est UNE personne — et il cesse de peser sur la rangée
                dans les langues où « Control room » fait douze caractères. */}
            {!auth.loading && isAdmin && (
              <Mot href="/admin" label={t("regie")}>
                <span aria-hidden>🎛️</span>
                <span className="nav-hint">{t("regie")}</span>
                <span className="sr-only">{t("regie")}</span>
              </Mot>
            )}
          </ul>

          {/* Les cadres : rien ici ne quitte la page. */}
          <ul className="nav-acts">
            <li>
              {/* Aide « C'est quoi Placet ? » — sans couper le flux de création. */}
              <AboutPlacet compact />
            </li>
            <li>
              {/* Le choix de langue est un réglage occasionnel, pas une entrée de
                  premier plan — mais il reste de premier NIVEAU et jamais dans un
                  menu : l'hispanophone arrivé par Google sur une fiche française
                  doit pouvoir en changer sans lire le français. */}
              <LocaleSwitch />
            </li>
            <li style={{ minWidth: 120, display: "flex", justifyContent: "flex-end" }}>
              {!auth.loading &&
                (auth.user ? (
                  <button
                    onClick={act(auth.signOut)}
                    className="dc-paper"
                    title={auth.user.email ?? undefined}
                    style={{ ...cadre, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN, display: "inline-block" }} />
                    {t("signOut")}
                  </button>
                ) : (
                  // « Se connecter » emporte la page d'où l'on part : sans elle, on
                  // s'authentifie et on atterrit chez l'organisateur, en ayant perdu
                  // la carte qu'on voulait épingler ou le vote qu'on lisait.
                  <Link
                    href={`/espaces?next=${encodeURIComponent(pathname || "/")}`}
                    onClick={close}
                    className="dc-paper"
                    style={{ display: "inline-flex", alignItems: "center", height: 38, padding: "0 10px", borderRadius: 10, fontFamily: FONT_BODY, fontWeight: 600, fontSize: 14, textDecoration: "none", color: INK, whiteSpace: "nowrap" }}
                  >
                    {t("signIn")}
                  </Link>
                ))}
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
