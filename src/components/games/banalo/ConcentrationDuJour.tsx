"use client";

// LA FORME D'UNE JOURNÉE DE MOTS — dix barres, et la vôtre parmi elles.
//
// C'est le pendant, pour les mots, de `RepartitionDuJour`. ⚠️ ET L'ANALOGUE
// N'EST PAS CELUI QU'ON CROIT : le diagramme des nombres montre une
// DISTRIBUTION de valeurs, or il n'existe pas d'axe pour des mots. Ce qui se
// distribue ici, c'est la CONCENTRATION — la part des joueurs qui ont donné le
// mot n° 1, puis le n° 2, et ainsi de suite.
//
// ⚠️ ET C'EST BIEN LA SIGNATURE DE LA JOURNÉE, mesuré en simulation à 3 000
// joueurs et 6 cases : sur un thème à évidence brutale le premier mot est écrit
// par 99 % des joueurs et les six premiers couvrent 58 % des réponses ; sur un
// thème ouvert, 23 % et 13 %. Un écart de quatre entre journées — et il explique
// directement les scores du jour, ce qu'aucun autre chiffre de l'écran ne dit.
//
// ⚠️ LES BARRES DES AUTRES SONT MUETTES, ET CE N'EST PAS UNE PUDEUR DE FAÇADE.
// Nommer les mots les plus donnés reviendrait à diffuser du TEXTE LIBRE écrit
// par des joueurs à TOUS les autres, sur un jeu public, anonyme, dont la
// politique déclare une tranche d'âge « enfant ». La justification écrite dans
// `CLAUDE.md` pour l'absence de tout signalement repose sur le modèle de la
// SALLE — entrée par code, salle jetable, effacement à sept jours — et aucune
// des trois propriétés ne tient ici. La garde vit en base
// (`20260822-banalo-mots-concentration.sql`) : le libellé n'est même pas rendu.
//
// Les mots du joueur, eux, portent leur nom : la grille juste au-dessus les lui
// montre déjà, et les nommer ici ne fait que relier deux choses qu'il a sous les
// yeux.
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { UNANIMO_SKIN as skin } from "@/lib/games/skin";
import type { Concentration } from "@/lib/db/banalo";

/** `Intl` ne connaît pas `pcm` : le pidgin s'écrit aux conventions anglaises. */
const bcp = (locale: string) => (locale === "pcm" ? "en" : locale);

const HAUTEUR = 64;

export default function ConcentrationDuJour({ conc }: { conc: Concentration }) {
  const t = useTranslations("BanaloJour");
  const locale = useLocale();
  const part = useMemo(
    () => new Intl.NumberFormat(bcp(locale), { maximumFractionDigits: 1 }),
    [locale],
  );

  // ⚠️ L'ÉCHELLE PART DE LA PLUS HAUTE BARRE, PAS DE 100 %. Sur un thème ouvert
  // le premier mot plafonne à 23 % : à l'échelle absolue, les dix barres
  // seraient dix traits collés au sol et la journée n'aurait plus de forme du
  // tout. C'est le PROFIL qu'on montre, et le chiffre en dessous donne l'échelle.
  const max = Math.max(1, ...conc.barres.map((b) => b.part));
  const miens = conc.barres.filter((b) => b.mien);

  return (
    <div style={{ marginTop: 14 }}>
      <p
        style={{
          fontFamily: skin.fontDisplay,
          fontWeight: 800,
          fontSize: 12,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: skin.muted,
          margin: "0 0 8px",
        }}
      >
        {t("concentrationTitre")}
      </p>

      <div
        role="img"
        aria-label={t("concentrationAlt", { n: conc.barres.length, distincts: conc.distincts })}
        style={{ display: "flex", alignItems: "flex-end", gap: 4, height: HAUTEUR }}
      >
        {conc.barres.map((b, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              // Un plancher de 3 px : une barre de traîne ne doit pas
              // disparaître, sinon la journée paraît plus concentrée qu'elle
              // ne l'est.
              height: Math.max(3, Math.round((HAUTEUR * b.part) / max)),
              borderRadius: 3,
              background: b.mien ? skin.accent : `${skin.ink}2E`,
            }}
          />
        ))}
      </div>

      {/* LES RANGS, sous les barres : ils donnent l'axe sans étiqueter personne. */}
      <div
        aria-hidden
        style={{
          display: "flex",
          gap: 4,
          marginTop: 3,
          fontSize: 9.5,
          fontWeight: 700,
          color: skin.muted,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {conc.barres.map((_, i) => (
          <span key={i} style={{ flex: 1, textAlign: "center" }}>
            {i + 1}
          </span>
        ))}
      </div>

      {/* ⚠️ LE CHIFFRE PORTE L'ÉCHELLE QUE LES BARRES NE PORTENT PAS, puisque
          celles-ci sont normalisées sur la plus haute. Sans lui, un thème serré
          et un thème ouvert dessinent la même silhouette. */}
      {conc.couverture !== null ? (
        <p style={{ margin: "8px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
          {t("concentrationCouverture", { n: conc.cases, part: part.format(conc.couverture) })}
        </p>
      ) : null}

      {/* Où le joueur se situe dedans. Les deux clés sont écrites EN CLAIR : une
          clé choisie en variable échapperait au contrôle de parité i18n. */}
      <p style={{ margin: "4px 0 0", fontSize: 12.5, color: skin.ink, lineHeight: 1.45, fontWeight: 600 }}>
        {miens.length === 0
          ? t("concentrationAucun", { n: conc.barres.length })
          : t("concentrationMiens", { n: miens.length, total: conc.barres.length })}
      </p>
    </div>
  );
}
