"use client";

// LA RÉVÉLATION — la seconde moitié de la récompense.
//
// Le jeu promet deux plaisirs (spec §1) : trouver le pays, PUIS comprendre enfin
// pourquoi les essais d'avant donnaient ces scores. Le second n'arrive pas tout
// seul : il faut montrer les cinq critères, leurs sources, et rendre la carte
// entière lisible d'un coup.
//
// L'ordre de cet écran est celui du soulagement : le pays, le nombre d'essais,
// les cinq critères un par un, puis la carte complète — et seulement à la fin le
// partage. Mettre le partage en haut ferait de la victoire une occasion de
// communiquer ; elle est d'abord une occasion de comprendre.
import { useState } from "react";
import { nomPays } from "@/content/pays/referentiel";
import { ENCRE_SUR_GRADIENT, GRADIENT } from "@/lib/games/pays/palette";
import type { Revelation as Donnees } from "@/lib/games/pays/types";
import type { GameSkin } from "@/lib/games/skin";
import { GBtn, GCard, GLabel } from "@/components/games/ui";

export interface TextesRevelation {
  titre: string;
  essais: string;
  criteres: string;
  voirCarte: string;
  cacherCarte: string;
  legende: string;
  partager: string;
  copie: string;
  demain: string;
  source: string;
}

export default function Revelation({
  skin,
  locale,
  cible,
  donnees,
  carteComplete,
  onCarteComplete,
  onPartage,
  onSource,
  textes,
}: {
  skin: GameSkin;
  locale: string;
  cible: string;
  donnees: Donnees;
  carteComplete: boolean;
  onCarteComplete: (ouvert: boolean) => void;
  onPartage: () => void;
  onSource: () => void;
  textes: TextesRevelation;
}) {
  const [copie, setCopie] = useState(false);

  return (
    <GCard skin={skin} accent={skin.good} padding={16} style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: "clamp(24px,5vw,34px)", lineHeight: 1.05 }}>
          {nomPays(cible, locale)}
        </span>
        <span style={{ fontWeight: 700, color: skin.muted }}>{textes.titre}</span>
      </div>
      {/* ⚠️ LE NOMBRE D'ESSAIS N'EST PLUS UNE MENTION GRISE. C'est le seul
          chiffre que le joueur a produit lui-même, celui qu'il retient et qu'il
          cite ; il était rendu à la même taille et dans la même couleur que le
          reste du décor. Il passe en police de titre et en encre pleine — la
          phrase entière est conservée telle quelle, donc la traduction et le
          pluriel ICU restent intacts. */}
      <p
        style={{
          margin: "8px 0 0",
          fontFamily: skin.fontDisplay,
          fontWeight: 800,
          fontSize: "clamp(17px,3.4vw,21px)",
          lineHeight: 1.2,
          color: skin.ink,
        }}
      >
        {textes.essais}
      </p>

      <GLabel skin={skin} style={{ marginTop: 18 }}>
        {textes.criteres}
      </GLabel>
      <ol style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
        {donnees.criteres.map((c, i) => (
          <li
            key={i}
            style={{
              border: `2px solid ${skin.ink}22`,
              borderRadius: 10,
              padding: "10px 12px",
              background: `${skin.accent2}18`,
            }}
          >
            <div style={{ display: "flex", gap: 9 }}>
              <span
                aria-hidden
                style={{
                  flex: "none",
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: skin.accent,
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontWeight: 700, lineHeight: 1.4 }}>{c.libelle}</span>
            </div>
            {c.eclairage && (
              <p style={{ margin: "7px 0 0 31px", fontSize: 14, lineHeight: 1.5, color: skin.muted }}>{c.eclairage}</p>
            )}
            <p style={{ margin: "7px 0 0 31px", fontSize: 12.5 }}>
              <a
                href={c.source.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onSource}
                style={{ color: skin.accent, fontWeight: 700 }}
              >
                {textes.source} {c.source.nom}
              </a>
              <span style={{ color: skin.muted }}> · {c.source.date}</span>
            </p>
          </li>
        ))}
      </ol>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
        <GBtn skin={skin} variant="accent" onClick={() => onCarteComplete(!carteComplete)}>
          {carteComplete ? textes.cacherCarte : textes.voirCarte}
        </GBtn>
        <GBtn
          skin={skin}
          onClick={() => {
            onPartage();
            setCopie(true);
            window.setTimeout(() => setCopie(false), 2200);
          }}
        >
          {copie ? textes.copie : textes.partager}
        </GBtn>
      </div>

      {/* La légende n'apparaît qu'avec la carte complète : avant la victoire,
          elle apprendrait au joueur à lire un gradient qu'il doit deviner. */}
      {carteComplete && (
        <div style={{ marginTop: 14 }}>
          <GLabel skin={skin}>{textes.legende}</GLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}>
            {GRADIENT.map((couleur, i) => (
              <span
                key={i}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 9px",
                  borderRadius: 999,
                  border: `2px solid ${skin.ink}`,
                  background: couleur,
                  color: ENCRE_SUR_GRADIENT[i],
                  fontWeight: 800,
                  fontSize: 12.5,
                }}
              >
                {i}/5
                <span style={{ opacity: 0.85 }}>
                  {donnees.scores ? Object.values(donnees.scores).filter((s) => s === i).length : 0}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <p style={{ margin: "16px 0 0", fontSize: 13.5, color: skin.muted, fontWeight: 600 }}>
        {textes.demain}
      </p>
    </GCard>
  );
}
