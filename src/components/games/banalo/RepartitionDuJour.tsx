"use client";

// OÙ TOUT LE MONDE S'EST POSÉ — la journée close, en une bande.
//
// La médiane révélée est un point ; elle ne dit pas si la foule était serrée
// autour ou étalée sur trois décades. C'est ce paysage-là que la bande montre,
// avec deux repères : la foule, et vous.
//
// ⚠️ CE N'EST PAS UNE COURBE DE POSITION DANS LA JOURNÉE, et c'est un choix
// mesuré. Sur des journées simulées, le percentile d'un joueur arrivé après la
// 500e réponse bouge de 1,1 à 2,0 points sur tout le reste de la journée : une
// ligne plate. La seule courbe qui aurait bougé est celle du RANG BRUT — et
// elle glisse pour tout le monde de la même façon (5e → 2170e pour le 31e
// joueur, sans qu'il ait rien fait), donc elle ment. La répartition, elle, est
// une image fixe qui dit quelque chose de vrai.
//
// ⚠️ ELLE NE S'AFFICHE QUE SUR UNE JOURNÉE CLOSE, et la garde est en base :
// `scrutin_banalo_etat` ne rend `repartition` qu'après la charnière. Un
// histogramme des réponses est une carte au trésor — il montre la bosse, donc
// la médiane, sans demander le moindre raisonnement.
//
// ⚠️ L'ÉCHELLE EST LOGARITHMIQUE, ET LES BARRES SONT DES FRACTIONS DE DÉCADE.
// Mesuré : les réponses s'étalent sur 1,9 à 3,8 décades, et une foule répond en
// nombres RONDS — la bande est un peigne, pas une cloche. Un pas de 1/6 de
// décade fait tomber les puissances de dix et les demi-décades sur des BORDS de
// barre ; un pas calculé sur l'étendue couperait chaque tour en deux. Tout ça
// est décidé en base (`20260821-banalo-repartition-du-jour.sql`) : l'écran ne
// fait que dessiner ce qu'on lui donne.
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { UNANIMO_SKIN as skin } from "@/lib/games/skin";
import type { Repartition } from "@/lib/db/banalo";

/** `Intl` ne connaît pas `pcm` : le pidgin s'écrit aux conventions anglaises. */
const bcp = (locale: string) => (locale === "pcm" ? "en" : locale);

const HAUTEUR = 62;

export default function RepartitionDuJour({ rep, votants }: { rep: Repartition; votants: number }) {
  const t = useTranslations("BanaloJour");
  const locale = useLocale();

  // « 1 M », « 100 k » : un axe de décades écrit en toutes lettres
  // (« 1 000 000 ») mangerait la largeur de trois barres.
  const compact = useMemo(
    () => new Intl.NumberFormat(bcp(locale), { notation: "compact", maximumFractionDigits: 0 }),
    [locale],
  );

  const n = rep.seaux.length;
  const max = Math.max(1, ...rep.seaux);

  // Les graduations : une par puissance de dix contenue dans la bande. Elles
  // tombent forcément sur un bord de barre — c'est ce que le pas garantit.
  const droite = rep.gauche + n * rep.pas;
  const decades: { pct: number; texte: string }[] = [];
  for (let k = Math.ceil(rep.gauche - 1e-9); k <= Math.floor(droite + 1e-9); k++) {
    decades.push({ pct: (100 * (k - rep.gauche)) / (n * rep.pas), texte: compact.format(Math.pow(10, k)) });
  }

  // ⚠️ QUAND LES DEUX REPÈRES TOMBENT SUR LA MÊME BARRE, il n'y en a plus qu'un :
  // une barre ne peut pas porter deux états, et « vous » puis « la foule » côte à
  // côte sous le même trait se lit comme deux barres voisines.
  const ensemble = rep.mien === rep.foule;

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
        {t("repartitionTitre")}
      </p>

      <div
        role="img"
        aria-label={t("repartitionAlt", { n: votants })}
        style={{ display: "flex", alignItems: "flex-end", gap: 2, height: HAUTEUR }}
      >
        {rep.seaux.map((v, i) => {
          const mienne = i === rep.mien;
          const foule = i === rep.foule;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                // ⚠️ UN PLANCHER DE 3 px SUR LES BARRES NON VIDES. Un seau de 3
                // sur 51 tombait sous le pixel et disparaissait : la bande
                // affichait alors « personne n'a répondu ça », ce qui est faux.
                // Un seau VIDE, lui, reste à zéro — c'est le creux du peigne, et
                // il doit se voir.
                height: v === 0 ? 0 : Math.max(3, Math.round((HAUTEUR * v) / max)),
                borderRadius: 3,
                // ⚠️ LES DEUX REPÈRES SONT DES BARRES PLEINES, PAS UN CADRE.
                // La première version dessinait « vous » en contour sur fond
                // clair : sur la plus haute barre de la bande, ça faisait un
                // trou rectangulaire, et l'œil lisait « il manque quelque chose
                // ici » au lieu de « c'est vous ». Deux pleins bien séparés
                // (l'encre presque noire, l'accent violet) se distinguent sans
                // ambiguïté — et la légende les nomme de toute façon.
                background: foule ? skin.accent : mienne ? skin.ink : `${skin.ink}2E`,
                border: mienne && foule ? `2px solid ${skin.ink}` : undefined,
                boxSizing: "border-box",
              }}
            />
          );
        })}
      </div>

      {/* L'AXE. Sans lui, la bande est jolie et muette : on voit une forme, on ne
          sait pas de quels nombres elle parle. */}
      <div style={{ position: "relative", height: 16, marginTop: 4, borderTop: `1.5px solid ${skin.ink}33` }}>
        {decades.map((d) => (
          <span
            key={d.texte}
            style={{
              position: "absolute",
              left: `${d.pct}%`,
              // ⚠️ LES ÉTIQUETTES DES BORDS S'ACCROCHENT AU BORD. Centrée sur
              // 0 %, la première dépassait du cadre et se faisait couper — vu à
              // l'écran, invisible au test.
              transform: d.pct < 8 ? "none" : d.pct > 92 ? "translateX(-100%)" : "translateX(-50%)",
              fontSize: 10.5,
              fontWeight: 700,
              color: skin.muted,
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
            }}
          >
            {d.texte}
          </span>
        ))}
      </div>

      {/* LA LÉGENDE. ⚠️ ELLE N'EST PAS DÉCORATIVE : sans elle, la couleur porte
          seule l'information, et c'est la règle que la chaleur du score s'impose
          déjà (`chaleur.ts`). Les trois clés sont écrites EN CLAIR, une par une —
          une clé choisie en variable échapperait au contrôle de parité i18n. */}
      <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 12, color: skin.muted }}>
        {ensemble ? (
          <Repere couleur={skin.accent} bordure={skin.ink} texte={t("repartitionVousEtFoule")} />
        ) : (
          <>
            <Repere couleur={skin.accent} texte={t("repartitionFoule")} />
            <Repere couleur={skin.ink} texte={t("repartitionVous")} />
          </>
        )}
      </div>
    </div>
  );
}

function Repere({ couleur, bordure, texte }: { couleur: string; bordure?: string; texte: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span
        aria-hidden
        style={{
          width: 11,
          height: 11,
          borderRadius: 3,
          background: couleur,
          border: bordure ? `2px solid ${bordure}` : undefined,
          boxSizing: "border-box",
        }}
      />
      {texte}
    </span>
  );
}
