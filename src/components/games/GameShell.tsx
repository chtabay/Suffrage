"use client";

// CADRE D'UNE PAGE DE JEU — générique, habillé par le skin qu'on lui passe.
//
// QUATRE DÉCISIONS QUI SE VOIENT :
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
// 3. L'EN-TÊTE PEUT RESTER, ET C'EST UNE OPTION, PAS UN DÉFAUT.
//
//    ⚠️ CE N'EST PAS UNE BARRE DE PLUS : c'est CELLE-CI qui cesse de partir. Sur
//    les jeux quotidiens, l'après-partie dépasse deux mille pixels — l'en-tête
//    disparaît au premier défilement, et avec lui le retour vers /games ET LE
//    CHOIX DE LA LANGUE. Or la décision n°2 écrit que la langue n'est pas une
//    sortie de plus mais « la condition pour pouvoir y jouer » : elle décide de
//    la question et de la foule qui vous note. La rendre inatteignable dès qu'on
//    défile vide cette décision de son sens.
//
//    ⚠️ ET RIEN N'Y ENTRE DE NOUVEAU. La tentation, en voyant l'en-tête d'Horizon,
//    est d'y poser le QR et le partage. Refusé : le partage des jeux est le
//    CENTRE de l'après-partie — posé plus bas, il tombait à 1 465 px et on l'a
//    fait remonter à 726 px parce que c'est le seul geste qui amène du monde. Le
//    réduire à une icône de 40 px déferait cette mesure. La décision n°1 tient
//    entière : ce qui est là y était déjà.
//
//    ⚠️ OPTIONNELLE PARCE QUE CE CADRE HABILLE HUIT JEUX, dont trois qui
//    appartiennent à d'autres chantiers et un qui est clos. Un défaut à `true`
//    changerait le rendu de tous ; seuls les deux quotidiens la demandent.
//
// 4. LE FOND DU JEU RECOUVRE CELUI DE PLACET. `globals.css` peint le corps en
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
  /** L'en-tête suit le défilement (voir la décision n°3). Réservé aux quotidiens. */
  collant = false,
  children,
}: {
  skin: GameSkin;
  title: string;
  emoji: string;
  aside?: ReactNode;
  backLabel: string;
  poweredBy: string;
  maxWidth?: number;
  collant?: boolean;
  children: ReactNode;
}) {
  /**
   * La couleur de fond du jeu, rendue translucide pour la barre collante.
   *
   * ⚠️ ON NE PEUT PAS SE CONTENTER DU FLOU : sous une barre entièrement
   * transparente, le texte de la page défile visiblement derrière le titre. Et
   * on ne peut pas non plus la peindre en opaque, sinon le SOL du jeu (le motif
   * répété) se coupe net sur la barre. D'où l'aplat à 92 %.
   *
   * Repli sur la couleur telle quelle si elle n'est pas en `#rrggbb` — une barre
   * opaque reste lisible, une barre sans fond ne l'est pas.
   */
  const voile = (couleur: string): string => {
    const m = /^#([0-9a-f]{6})$/i.exec(couleur.trim());
    if (!m) return couleur;
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, .92)`;
  };

  const head: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "space-between",
  };
  // Un seul exemplaire du contenu : collante ou non, c'est le MÊME en-tête —
  // recopié, il dériverait, et les deux quotidiens verraient autre chose que
  // les six autres jeux.
  const enTete = (
    <>
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
    </>
  );

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
      {/* ⚠️ LA BARRE COLLANTE VIT HORS DE LA COLONNE, sinon son fond s'arrête à
          la largeur du texte et le contenu défile dans les marges, à côté d'elle.
          Elle porte donc le fond sur toute la largeur, et remet la colonne à
          l'intérieur. Son `zIndex` est 20 : au-dessus de la page, sous les
          modales des jeux, qui sont à 60. */}
      {collant ? (
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            background: voile(skin.bg),
            backdropFilter: "blur(8px)",
            borderBottom: `2px solid ${skin.ink}`,
          }}
        >
          <div className="pad" style={{ ...head, maxWidth, margin: "0 auto", padding: "10px 18px" }}>
            {enTete}
          </div>
        </header>
      ) : null}

      <div className="pad" style={{ maxWidth, margin: "0 auto", padding: collant ? "0 18px 34px" : "14px 18px 34px" }}>
        {collant ? null : <header style={head}>{enTete}</header>}

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
