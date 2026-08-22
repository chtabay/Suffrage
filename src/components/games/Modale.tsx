"use client";

// UNE MODALE POUR LES JEUX — le comportement, pas la politique.
//
// ⚠️ ELLE A ÉTÉ ÉCRITE POUR CINQ SUR CINQ ET ELLE SERT MAINTENANT AUX DEUX, d'où
// son déplacement ici. Ce qu'elle porte est le COMPORTEMENT : Échap, le clic sur
// le fond, la croix et le bouton ferment tous ; le focus entre dans la boîte ;
// elle ne bloque rien.
//
// ⚠️ LA RÈGLE SUR L'USAGE, ELLE, APPARTIENT À CHAQUE APPELANT, et elle n'est pas
// la même selon qui ouvre. Une modale qui s'ouvre TOUTE SEULE est une
// interruption : Cinq sur cinq ne s'y autorise qu'une fois par aide et par
// partie, parce que ses deux aides apparaissaient sinon EN SILENCE — une rangée
// d'étiquettes en gris 12,5 px au-dessus de quarante lignes, que personne ne
// regardait. Une modale que le JOUEUR ouvre, elle, n'interrompt rien : c'est un
// tiroir, et le seuil est bien plus bas. Banalo s'en sert pour le détail de sa
// dernière journée et pour la création d'un groupe — deux choses qu'on demande à
// voir, jamais qu'on subit.
import { useEffect, useRef, type ReactNode } from "react";
import type { GameSkin } from "@/lib/games/skin";
import { GBtn } from "@/components/games/ui";

export default function AideModale({
  skin,
  titre,
  texte,
  fermer,
  fermerLabel,
  fermerDiscret = false,
  children,
}: {
  skin: GameSkin;
  titre: string;
  texte: string;
  fermer: () => void;
  fermerLabel: string;
  /**
   * Le bouton de fermeture s'efface quand le tiroir porte une VRAIE action.
   *
   * ⚠️ VU À L'ÉCRAN. Le composant vient de Cinq sur cinq, où « Fermer » était le
   * SEUL geste possible : il portait donc le bouton plein, grand, pleine
   * largeur. Dès qu'un tiroir contient une action — « créer un groupe » — ce
   * même bouton devient le plus fort de la boîte, et l'œil va vers la sortie
   * plutôt que vers ce qu'on est venu faire.
   */
  fermerDiscret?: boolean;
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
          <GBtn
            skin={skin}
            variant={fermerDiscret ? "ghost" : "primary"}
            size={fermerDiscret ? "md" : "lg"}
            full={!fermerDiscret}
            onClick={fermer}
          >
            {fermerLabel}
          </GBtn>
        </div>
      </div>
    </div>
  );
}
