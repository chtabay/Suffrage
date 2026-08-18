"use client";

// APERÇUS D'ÉCRANS — montrer le jeu avant d'y entrer.
//
// Une page de présentation qui ne décrit qu'avec des mots demande de la
// confiance : « chacun a son téléphone, il montre un code, quelqu'un le tape »
// ne ressemble à rien tant qu'on ne l'a pas vu. Trois vignettes le disent en une
// seconde.
//
// ⚠️ CE SONT DES REPRODUCTIONS, PAS DES CAPTURES D'ÉCRAN, et c'est un choix
// d'ingénierie, pas de la paresse :
//
//  1. **Les captures ne parlent qu'une langue.** Placet en sert quatre. Une
//     capture française montrée à un hispanophone est exactement le défaut qu'on
//     vient de corriger sur les sources des critères — sauf qu'ici il serait
//     dans une image, donc invisible au contrôle de parité. Une reproduction
//     passe par `t()` : elle est juste dans les quatre langues, par construction.
//
//  2. **Les captures pourrissent en silence.** Elles sont justes le jour où on
//     les prend et fausses au premier changement de teinte, sans que rien ne le
//     signale. Celles-ci lisent le `skin` du jeu : elles suivent.
//
//  3. **Le poids.** Six captures en 2× pèsent plus que tout le reste de la page.
//
// Ce que ça coûte, dit franchement : une reproduction est une APPROXIMATION.
// Elle emprunte les vrais libellés et les vraies couleurs, mais elle n'est pas
// l'écran. On ne l'annonce donc jamais comme une capture — d'où le mot
// « aperçu ».
import type { CSSProperties, ReactNode } from "react";
import type { GameSkin } from "@/lib/games/skin";
import { GLabel } from "./ui";

export interface Ecran {
  /** La légende sous la vignette : ce que le joueur fait sur cet écran. */
  legende: string;
  contenu: ReactNode;
}

export default function Apercus({
  skin,
  titre,
  ecrans,
}: {
  skin: GameSkin;
  titre: string;
  ecrans: Ecran[];
}) {
  return (
    <div>
      <GLabel skin={skin}>{titre}</GLabel>
      {/* La rangée DÉBORDE et défile plutôt que de se replier : trois vignettes
          côte à côte se comparent d'un coup d'œil, trois vignettes empilées
          redeviennent une liste — c'est-à-dire ce que le texte disait déjà. */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 9,
          overflowX: "auto",
          paddingBottom: 6,
          WebkitOverflowScrolling: "touch",
          // ⚠️ Les cadres s'étirent à la hauteur du plus grand. Sans ça, trois
          // vignettes de hauteurs différentes se lisent comme trois choses sans
          // rapport, alors que ce sont trois moments du même écran.
          alignItems: "stretch",
        }}
      >
        {ecrans.map((e) => (
          <figure key={e.legende} style={{ margin: 0, flex: "none", width: 184, display: "flex", flexDirection: "column" }}>
            {/* Le cadre reprend l'empilement réel de l'écran : le fond du jeu,
                puis une carte de papier dessus. C'est ce qui fait qu'on
                reconnaît le jeu avant de lire le texte. */}
            <div
              style={{
                border: `3px solid ${skin.ink}`,
                borderRadius: 17,
                background: skin.bg,
                padding: 9,
                minHeight: 190,
                flex: 1,
                display: "flex",
                boxShadow: `4px 4px 0 ${skin.accent}`,
              }}
            >
              <div
                style={{
                  flex: 1,
                  background: skin.paper,
                  border: `2px solid ${skin.ink}`,
                  borderRadius: 11,
                  padding: 10,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 5,
                  minWidth: 0,
                }}
              >
                {e.contenu}
              </div>
            </div>
            {/* ⚠️ HAUTEUR MINIMALE SUR LA LÉGENDE, pas seulement sur le cadre.
                Les figures s'étirent à la plus haute ; ce qui reste au cadre est
                donc ce que la légende ne prend pas. Une légende d'une ligne à
                côté d'une légende de trois donnait deux cadres de hauteurs
                différentes — le défaut se voyait sur le cadre, la cause était en
                dessous. */}
            <figcaption style={{ fontSize: 12, color: skin.muted, lineHeight: 1.35, marginTop: 7, minHeight: 49 }}>
              {e.legende}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

/** Le petit titre en capitales d'un écran de jeu, à l'échelle de la vignette. */
export function ApercuTitre({ skin, children }: { skin: GameSkin; children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: skin.fontDisplay,
        fontWeight: 800,
        fontSize: 9.5,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        color: skin.muted,
      }}
    >
      {children}
    </div>
  );
}

/** Une ligne de texte de vignette. `fort` pour ce que l'écran met en avant. */
export function ApercuTexte({
  skin,
  fort,
  taille = 11,
  style,
  children,
}: {
  skin: GameSkin;
  fort?: boolean;
  taille?: number;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        fontFamily: fort ? skin.fontDisplay : skin.fontBody,
        fontWeight: fort ? 800 : 500,
        fontSize: taille,
        lineHeight: 1.32,
        color: fort ? skin.ink : skin.muted,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Une pastille de mot : le geste visuel d'Unanimo comme celui des essais. */
export function ApercuPastille({ skin, children, plein }: { skin: GameSkin; children: ReactNode; plein?: boolean }) {
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 800,
        padding: "2px 7px",
        borderRadius: 999,
        border: `2px solid ${plein ? skin.ink : `${skin.ink}33`}`,
        background: plein ? skin.accent2 : "transparent",
        color: skin.ink,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
