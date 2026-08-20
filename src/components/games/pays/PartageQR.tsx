"use client";

// LE QR DE PARTAGE EN PRÉSENCE — le cas que le partage texte ne couvre pas.
//
// Retour de terrain : le texte marche par messagerie, mais devant quelqu'un il
// ne sert à rien. On ne dicte pas une URL, et sortir son téléphone pour
// s'envoyer un message à deux mètres l'un de l'autre est absurde. Le QR est
// l'outil de ce moment-là — et de celui-là seulement, d'où la vignette : il
// n'encombre pas ceux qui partagent par écrit.
//
// ⚠️ LE QR AGRANDI EST NOIR SUR BLANC, PAS AUX COULEURS DU JEU. Le papier crème
// et l'encre bleu-nuit de la palette passent à l'écran, mais un QR n'est pas lu
// par un œil : il est lu par une caméra, souvent de biais, souvent dans une
// pièce mal éclairée, sur un écran dont on ignore la luminosité. Le contraste
// maximal n'est pas une préférence esthétique, c'est ce qui fait la différence
// entre « ça scanne » et « approche encore un peu ». La vignette, elle, garde
// l'encre du jeu : personne ne scanne une vignette de 62 pixels.
//
// ⚠️ ET L'URL EST TOUJOURS ÉCRITE EN TOUTES LETTRES sous le QR agrandi. Une
// caméra qui refuse, un appareil trop vieux, quelqu'un qui préfère taper : le QR
// est un raccourci, jamais le seul chemin.
import { useEffect } from "react";
import { QR_CHEMIN, QR_TAILLE, QR_URL } from "@/content/pays/qr";
import type { GameSkin } from "@/lib/games/skin";

/** Le dessin seul, à la couleur et à la taille qu'on lui donne. */
function Dessin({ couleur, taille }: { couleur: string; taille: number | string }) {
  return (
    <svg
      viewBox={`0 0 ${QR_TAILLE} ${QR_TAILLE}`}
      width={taille}
      height={taille}
      aria-hidden
      // `shape-rendering: crispEdges` désactive l'antialiasing : un module de QR
      // doit avoir un bord net. Adouci, il devient gris sur ses arêtes et une
      // caméra hésite entre clair et sombre — exactement l'erreur que la
      // correction d'erreur doit ensuite rattraper pour rien.
      style={{ display: "block", shapeRendering: "crispEdges" }}
    >
      <path d={QR_CHEMIN} stroke={couleur} strokeWidth={1} fill="none" />
    </svg>
  );
}

export default function PartageQR({
  skin,
  ouvert,
  onOuvrir,
  textes,
}: {
  skin: GameSkin;
  ouvert: boolean;
  onOuvrir: (ouvert: boolean) => void;
  textes: { aide: string; titre: string; fermer: string };
}) {
  // Échap ferme, comme partout. Un panneau plein écran sans sortie au clavier
  // est un piège pour qui n'utilise pas d'écran tactile.
  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOuvrir(false);
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [ouvert, onOuvrir]);

  return (
    <>
      <button
        type="button"
        onClick={() => onOuvrir(true)}
        aria-label={textes.titre}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 9,
          padding: "7px 11px 7px 8px",
          borderRadius: 12,
          border: `2px solid ${skin.ink}22`,
          background: skin.paper,
          color: skin.muted,
          font: "inherit",
          fontSize: 12.5,
          fontWeight: 700,
          lineHeight: 1.3,
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <span style={{ background: "#fff", borderRadius: 4, flex: "none", overflow: "hidden", lineHeight: 0 }}>
          <Dessin couleur={skin.ink} taille={52} />
        </span>
        <span style={{ maxWidth: "18ch" }}>{textes.aide}</span>
      </button>

      {ouvert && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={textes.titre}
          onClick={() => onOuvrir(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 20,
            // Fond très sombre : il éteint le reste de l'écran et fait ressortir
            // le blanc du QR, qui est la surface que la caméra cherche.
            background: "rgba(10,14,20,0.92)",
          }}
        >
          {/* ⚠️ AUCUN `padding` ICI, et c'est voulu : la zone de silence de
              4 modules est GRAVÉE dans le `viewBox` par le générateur. Confiée
              au CSS, elle valait ce que valaient les pixels du moment — sur un
              écran étroit, 12 px autour d'un module de 11 px font un module au
              lieu de quatre, ce qui passe sur un décodeur logiciel et échoue sur
              une caméra de biais. */}
          <div style={{ background: "#FFFFFF", borderRadius: 14, lineHeight: 0, overflow: "hidden" }}>
            <Dessin couleur="#000000" taille="min(72vw, 320px)" />
          </div>
          <p
            style={{
              margin: 0,
              color: "#FFFFFF",
              fontFamily: skin.fontBody,
              fontSize: 14.5,
              fontWeight: 700,
              letterSpacing: "0.01em",
              textAlign: "center",
              wordBreak: "break-all",
            }}
          >
            {QR_URL.replace(/^https:\/\//, "")}
          </p>
          <button
            type="button"
            onClick={() => onOuvrir(false)}
            style={{
              font: "inherit",
              fontFamily: skin.fontDisplay,
              fontWeight: 800,
              fontSize: 15,
              color: "#0A0E14",
              background: "#FFFFFF",
              border: "none",
              borderRadius: 999,
              padding: "9px 20px",
              cursor: "pointer",
            }}
          >
            {textes.fermer}
          </button>
        </div>
      )}
    </>
  );
}
