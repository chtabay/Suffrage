"use client";

// CADRE D'UNE PAGE DE JEU — générique, habillé par le skin qu'on lui passe.
//
// TROIS DÉCISIONS QUI SE VOIENT :
//
// 1. PAS LA NAV DE PLACET. On vient jouer. Greffer « Créer un scrutin »,
//    « Explorer », « Mes votes » au-dessus d'une manche mettrait quatre sorties
//    en concurrence avec le seul geste attendu. Même raisonnement que la page de
//    vote d'un convoqué (LivretVote), qui a tranché pareil.
//
// 2. MAIS PAS UN CUL-DE-SAC. Un pied de page discret : le jeu ramène aux autres
//    jeux, et une mention « Propulsé par Placet » permet de remonter à la source
//    sans jamais concurrencer l'action principale. C'est la réciprocité demandée
//    — Placet fait découvrir les jeux, chaque jeu peut faire découvrir Placet.
//
//    ⚠️ AVEC UNE EXCEPTION : LE CHOIX DE LA LANGUE. Supprimer la nav de Placet
//    l'emportait avec elle, et sur les jeux quotidiens la langue ne décide pas
//    que de l'habillage — elle décide de LA QUESTION (le français demande la
//    France, le pidgin le Nigeria) et de la FOULE contre laquelle on est noté,
//    les classements étant séparés par langue. Quelqu'un qui ouvre un lien de
//    partage dans une langue qu'il ne lit pas n'avait aucun moyen d'en changer.
//    Ce n'est donc pas une sortie de plus en concurrence avec le jeu, c'est la
//    condition pour pouvoir y jouer.
//
// 3. LE FOND DU JEU RECOUVRE CELUI DE PLACET. `globals.css` peint le corps en
//    crème pointillée ; une page de jeu doit pouvoir être ailleurs, donc on pose
//    un calque plein écran à la couleur du skin.
import type { CSSProperties, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import LocaleSwitch from "@/components/LocaleSwitch";
import PlacetMark from "@/components/scrutin/PlacetMark";
import type { GameSkin } from "@/lib/games/skin";

export default function GameShell({
  skin,
  title,
  emoji,
  /** Ligne de contexte à droite du titre (le code de la salle, la manche…). */
  aside,
  backLabel,
  poweredBy,
  /** Largeur de la colonne. Par défaut 720 — la lecture ; une CARTE en veut plus. */
  maxWidth = 720,
  children,
}: {
  skin: GameSkin;
  title: string;
  emoji: string;
  aside?: ReactNode;
  backLabel: string;
  poweredBy: string;
  maxWidth?: number;
  children: ReactNode;
}) {
  const head: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "space-between",
  };
  return (
    <div
      style={{
        background: skin.bg,
        // ⚠️ LE MOTIF SE POSE PAR-DESSUS L'APLAT, jamais à la place. Un
        // `background` unique écraserait la couleur de fond et laisserait le
        // blanc du navigateur transparaître entre les tuiles.
        backgroundImage: skin.sol?.image,
        backgroundSize: skin.sol?.taille,
        minHeight: "100dvh",
        color: skin.ink,
        fontFamily: skin.fontBody,
      }}
    >
      <div className="pad" style={{ maxWidth, margin: "0 auto", padding: "14px 18px 34px" }}>
        <header style={head}>
          <Link
            href="/games"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              color: skin.ink,
              fontFamily: skin.fontDisplay,
              fontWeight: 800,
              fontSize: 19,
              letterSpacing: "-0.02em",
            }}
          >
            <span aria-hidden style={{ fontSize: 22 }}>
              {emoji}
            </span>
            {title}
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {aside}
            <LocaleSwitch
              skin={{ ink: skin.ink, paper: skin.paper, accent: skin.accent2, border: skin.border, radius: skin.radius - 4 }}
            />
          </div>
        </header>

        <main style={{ marginTop: 16 }}>{children}</main>

        {/* Le pied : deux sorties, aucune ne rivalise avec le jeu. */}
        <footer
          style={{
            marginTop: 34,
            paddingTop: 14,
            borderTop: `2px dashed ${skin.ink}22`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            fontSize: 12.5,
          }}
        >
          <Link href="/games" style={{ color: skin.muted, fontWeight: 700, textDecoration: "none" }}>
            ← {backLabel}
          </Link>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: skin.muted,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            <PlacetMark size={16} />
            {poweredBy}
          </Link>
        </footer>
      </div>
    </div>
  );
}
