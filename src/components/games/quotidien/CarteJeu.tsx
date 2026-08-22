"use client";

// LA CARTE D'UN JEU, sur la page commune des jeux quotidiens.
//
// La disposition suit celle d'une page de statistiques d'échecs, et pour la même
// raison : un joueur régulier ne vient pas relire une liste, il vient voir OÙ IL
// EN EST. D'où l'ordre — le chiffre du moment en gros, la courbe qui le situe
// dans le temps, les records en dessous, la liste en dernier et courte.
//
// ⚠️ LE CHIFFRE DU MOMENT EST UN CENTILE, PAS LE SCORE DU JEU. C'est la seule
// grandeur qui veut dire la même chose d'un jeu à l'autre et d'un jour à
// l'autre ; le score propre (des essais, des voix) reste affiché à côté de
// chaque journée, où il a un sens.
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { GBtn, GCard, GLabel } from "@/components/games/ui";
import type { GameSkin } from "@/lib/games/skin";
import type { JourneeCommune } from "@/lib/db/jeux";
import CourbeCentiles from "./CourbeCentiles";

const bcp = (locale: string) => (locale === "pcm" ? "en" : locale);
/** Combien de journées la liste courte montre. Au-delà, la courbe raconte mieux. */
const RECENTES = 5;

export default function CarteJeu({
  skin,
  emoji,
  nom,
  href,
  jouer,
  journees,
  couleur,
}: {
  skin: GameSkin;
  emoji: string;
  nom: string;
  href: string;
  jouer: string;
  /** De la plus RÉCENTE à la plus ancienne, comme la base les rend. */
  journees: JourneeCommune[];
  couleur: string;
}) {
  const t = useTranslations("JeuxQuotidiens");
  const locale = useLocale();
  const nb = useMemo(() => new Intl.NumberFormat(bcp(locale)), [locale]);

  const avecPosition = journees.filter((j) => j.mieux !== null);
  const dernier = avecPosition[0] ?? null;
  const meilleur = avecPosition.length > 0 ? Math.min(...avecPosition.map((j) => j.mieux!)) : null;
  const moyen =
    avecPosition.length > 0
      ? Math.round(avecPosition.reduce((s, j) => s + j.mieux!, 0) / avecPosition.length)
      : null;

  const chiffre = (etiquette: string, valeur: string) => (
    <div key={etiquette} style={{ minWidth: 78 }}>
      <GLabel skin={skin}>{etiquette}</GLabel>
      <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 20, lineHeight: 1.1 }}>{valeur}</div>
    </div>
  );

  return (
    <GCard skin={skin} padding={18} style={{ marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <p style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 18, margin: 0 }}>
          <span aria-hidden style={{ marginRight: 7 }}>
            {emoji}
          </span>
          {nom}
        </p>
        <span style={{ fontSize: 12, fontWeight: 700, color: skin.muted }}>
          {t("journees", { n: journees.length })}
        </span>
      </div>

      {journees.length === 0 ? (
        <>
          <p style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.5, color: skin.muted }}>{t("aucune")}</p>
          <div style={{ marginTop: 12 }}>
            <Link href={href} style={{ textDecoration: "none" }}>
              <GBtn skin={skin} variant="ghost">
                {jouer}
              </GBtn>
            </Link>
          </div>
        </>
      ) : (
        <>
          {/* LE CHIFFRE DU MOMENT. ⚠️ Il se tait plutôt que d'afficher un zéro
              quand aucune journée n'a de position — jouer seul n'est pas être
              premier. */}
          {dernier ? (
            <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.3 }}>
              {/* ⚠️ LA MARGE N'EST PAS DÉCORATIVE : l'espace de la phrase est
                  dessiné à 15 px, or il sépare un nombre de 30 px du mot qui
                  suit — vu sur une vraie capture d'iPhone, « 36 % » et « ont »
                  se touchent. Le blanc d'un chiffre deux fois plus gros doit
                  être payé par le chiffre, pas par le texte. */}
              <strong
                style={{ fontFamily: skin.fontDisplay, fontSize: 30, color: couleur, marginInlineEnd: 5 }}
              >
                {t("pourcent", { n: nb.format(dernier.mieux!) })}
              </strong>{" "}
              {t("ontFaitMieux")}
            </p>
          ) : (
            <p style={{ margin: "10px 0 0", fontSize: 13.5, color: skin.muted, lineHeight: 1.45 }}>
              {t("sansPosition")}
            </p>
          )}

          {/* La courbe se tait d'elle-même sous deux points. */}
          <CourbeCentiles skin={skin} couleur={couleur} points={[...avecPosition].reverse()} />

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14 }}>
            {meilleur !== null && chiffre(t("meilleur"), t("pourcent", { n: nb.format(meilleur) }))}
            {moyen !== null && chiffre(t("moyen"), t("pourcent", { n: nb.format(moyen) }))}
          </div>

          <ul style={{ display: "grid", gap: 2, margin: "14px 0 0", padding: 0, listStyle: "none", minWidth: 0 }}>
            {journees.slice(0, RECENTES).map((j) => (
              <li
                key={j.jour}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 12,
                  minWidth: 0,
                  padding: "4px 0",
                  fontSize: 13.5,
                }}
              >
                <span style={{ color: skin.muted }}>{t("numero", { n: j.jour })}</span>
                <span style={{ flex: "none", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {j.mieux !== null ? t("pourcent", { n: nb.format(j.mieux) }) : t("seul")}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </GCard>
  );
}
