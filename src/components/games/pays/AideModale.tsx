"use client";

// L'ANNONCE D'UNE AIDE QUI VIENT DE S'OUVRIR.
//
// ⚠️ POURQUOI UNE MODALE, ALORS QU'ON EN MET NULLE PART AILLEURS. Les deux
// aides du jeu apparaissaient EN SILENCE : une rangée d'étiquettes se posait
// au-dessus d'une liste de quarante lignes, en gris, 12,5 px. Un joueur qui
// vient de taper son quinzième pays regarde sa pastille de score, pas le haut de
// l'historique — et il n'a aucune raison de soupçonner que l'écran vient de
// changer. L'aide était donc là et n'aidait personne.
//
// Une modale est le seul objet qui garantit d'être vu, et c'est acceptable ici
// pour une raison précise : elle ne s'ouvre QU'UNE FOIS PAR AIDE ET PAR PARTIE.
// Ce n'est pas une interruption récurrente, c'est un palier franchi — deux fois
// dans une partie longue, jamais dans une partie courte.
//
// ⚠️ ELLE NE BLOQUE RIEN. Échap, le fond, la croix et le bouton la ferment tous ;
// ce qu'elle montre reste ensuite affiché à demeure dans la page. Elle ne
// remplace pas l'aide, elle la présente.
import { useEffect, useRef, type ReactNode } from "react";
import type { GameSkin } from "@/lib/games/skin";
import { GBtn } from "@/components/games/ui";

export default function AideModale({
  skin,
  titre,
  texte,
  fermer,
  fermerLabel,
  children,
}: {
  skin: GameSkin;
  titre: string;
  texte: string;
  fermer: () => void;
  fermerLabel: string;
  children?: ReactNode;
}) {
  const boite = useRef<HTMLDivElement>(null);

  // ⚠️ LE FOCUS ENTRE DANS LA BOÎTE, sinon il reste sur le champ de recherche
  // DERRIÈRE la modale : au clavier, on taperait un pays dans un formulaire
  // qu'on ne voit plus. Et Échap ferme, parce qu'une boîte qui ne se ferme qu'à
  // la souris est un piège sur un jeu qui se joue au clavier.
  useEffect(() => {
    boite.current?.focus();
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [fermer]);

  return (
    <div
      onClick={fermer}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        background: `${skin.ink}A8`,
      }}
    >
      <div
        ref={boite}
        role="dialog"
        aria-modal="true"
        aria-labelledby="aide-titre"
        // `-1` : la boîte prend le focus au montage sans entrer dans l'ordre de
        // tabulation, où elle ferait une étape muette.
        tabIndex={-1}
        // Le clic sur la carte ne doit pas remonter au fond, qui ferme.
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 380,
          maxHeight: "82vh",
          overflowY: "auto",
          background: skin.paper,
          color: skin.ink,
          border: `${skin.border}px solid ${skin.ink}`,
          borderRadius: skin.radius,
          boxShadow: `${skin.ombre ?? 5}px ${skin.ombre ?? 5}px 0 ${skin.ink}`,
          padding: 20,
          outline: "none",
        }}
      >
        <h2
          id="aide-titre"
          style={{
            fontFamily: skin.fontDisplay,
            fontWeight: 800,
            fontSize: 21,
            lineHeight: 1.2,
            margin: 0,
            textWrap: "balance",
          }}
        >
          {titre}
        </h2>
        <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5, color: skin.muted }}>{texte}</p>
        {children ? <div style={{ marginTop: 14 }}>{children}</div> : null}
        <div style={{ marginTop: 18 }}>
          <GBtn skin={skin} size="lg" full onClick={fermer}>
            {fermerLabel}
          </GBtn>
        </div>
      </div>
    </div>
  );
}
