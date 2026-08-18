"use client";

// LA RECHERCHE DE PAYS — le second geste, et le seul accessible au clavier.
//
// Elle n'est pas un confort : c'est l'équivalent de la carte pour qui ne peut
// pas viser (souris imprécise, écran de téléphone, lecteur d'écran). Elle doit
// donc pouvoir atteindre les 193 pays, y compris ceux qui n'ont qu'un point.
//
// ⚠️ ON COMPARE SANS ACCENTS ET SANS CASSE. « perou », « Pérou », « PEROU »
// désignent le même pays, et le joueur qui tape vite ne met pas d'accent. On
// accepte aussi le code ISO — « FRA » — parce qu'il est court et sans ambiguïté.
import { useMemo, useState } from "react";
import { PAYS, nomPays } from "@/content/pays/referentiel";
import { CHIFFRES } from "@/lib/games/pays/palette";
import type { GameSkin } from "@/lib/games/skin";

/** Minuscules, sans accent, sans ponctuation : la forme qu'on compare. */
const pliage = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "");

export default function Recherche({
  skin,
  locale,
  scores,
  onChoix,
  onSurvol,
  placeholder,
  dejaJoue,
}: {
  skin: GameSkin;
  locale: string;
  /** Sert à montrer, dans la liste, ce qui a déjà été essayé. */
  scores: Record<string, number>;
  onChoix: (id: string) => void;
  onSurvol: (id: string | null) => void;
  placeholder: string;
  /** Libellé d'un pays déjà tenté, pour ne pas laisser croire à un nouvel essai. */
  dejaJoue: string;
}) {
  const [saisie, setSaisie] = useState("");

  // L'index est construit une fois : replier 193 noms à chaque frappe se sent
  // sur un téléphone d'entrée de gamme.
  const index = useMemo(
    () => PAYS.map((p) => ({ id: p.id, nom: nomPays(p.id, locale), plie: pliage(nomPays(p.id, locale)) })),
    [locale],
  );

  const q = pliage(saisie);
  const trouves = useMemo(() => {
    if (q.length < 1) return [];
    const commence = index.filter((e) => e.plie.startsWith(q) || e.id.toLowerCase() === q);
    const contient = index.filter((e) => !commence.includes(e) && e.plie.includes(q));
    // Ce qui commence par la saisie d'abord : c'est ce que le joueur cherche
    // neuf fois sur dix, et le faire remonter évite une lecture de liste.
    return [...commence, ...contient].slice(0, 6);
  }, [index, q]);

  const choisir = (id: string) => {
    setSaisie("");
    onSurvol(null);
    onChoix(id);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        value={saisie}
        onChange={(e) => setSaisie(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && trouves[0]) choisir(trouves[0].id);
          if (e.key === "Escape") setSaisie("");
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        spellCheck={false}
        style={{
          width: "100%",
          boxSizing: "border-box",
          fontFamily: skin.fontBody,
          fontWeight: 600,
          fontSize: 16,
          padding: "12px 14px",
          border: `${skin.border}px solid ${skin.ink}`,
          borderRadius: 12,
          background: skin.paper,
          color: skin.ink,
          outline: "none",
        }}
      />

      {trouves.length > 0 && (
        <ul
          style={{
            position: "absolute",
            zIndex: 5,
            left: 0,
            right: 0,
            top: "calc(100% + 6px)",
            margin: 0,
            padding: 4,
            listStyle: "none",
            background: skin.paper,
            border: `${skin.border}px solid ${skin.ink}`,
            borderRadius: 12,
            boxShadow: `4px 4px 0 ${skin.ink}22`,
          }}
        >
          {trouves.map((e) => {
            const score = scores[e.id];
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => choisir(e.id)}
                  onMouseEnter={() => onSurvol(e.id)}
                  onFocus={() => onSurvol(e.id)}
                  onMouseLeave={() => onSurvol(null)}
                  onBlur={() => onSurvol(null)}
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    minHeight: 44,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: "transparent",
                    color: skin.ink,
                    font: "inherit",
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span>{e.nom}</span>
                  {score !== undefined && (
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: skin.muted }}>
                      {CHIFFRES[score]} {dejaJoue}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
