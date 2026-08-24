"use client";

// LA LISTE D'UN TABLEAU — la tête, ma ligne lointaine, et l'effectif.
//
// ⚠️ ELLE EST SORTIE DE `TableauDuJour` PARCE QU'IL Y EN A DEUX MAINTENANT : le
// tableau d'aujourd'hui (qui demande un nom, inscrit d'office, dépose) et celui
// de la journée ARRÊTÉE dans `JourneePrecedente` (qui ne fait que lire). La
// recopier aurait produit deux listes qui dérivent — c'est ce qui est arrivé aux
// trois offres de compte, à la règle du mot orphelin, et au calcul des scores
// avant qu'il ne finisse en base. On la coupe avant, pendant qu'il n'y en a
// qu'une à déplacer.
//
// ⚠️ CE COMPOSANT NE SAIT NI DÉPOSER NI INSCRIRE, et c'est le point. Le tableau
// de la veille porte une journée CLOSE : lui donner le moindre chemin d'écriture
// inscrirait un joueur sur une journée qu'il ne peut plus jouer.
//
// ⚠️ AUCUN NUMÉRO DE RANG, ICI NON PLUS. Le rang parmi les seuls INSCRITS serait
// un mensonge (« 1er » alors que trente joueurs ont fait mieux sans s'inscrire),
// et le rang réel ferait se suivre « 3e » puis « 17e », ce qui se lit comme un
// trou. L'ordre parle ; le vrai rang du joueur est sur sa carte de score.
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { GameSkin } from "@/lib/games/skin";
import { nomDe } from "@/content/banalo/noms";
import type { LigneTableau, Tableau } from "@/lib/db/banalo";

export default function ListeDuTableau({
  skin,
  lignes,
  moi,
  score: enMots,
  max,
  effectif,
}: {
  skin: GameSkin;
  lignes: LigneTableau[];
  /** Ma ligne quand la base me sait hors de SA tête de liste (dix lignes). */
  moi: Tableau["moi"];
  /**
   * Le chiffre d'une ligne, mis en mots.
   *
   * ⚠️ CHAQUE JEU A SON UNITÉ, ET ELLES NE SE COMPARENT PAS : une somme de voix
   * chez Banalo, une note sur 100 sur son format chiffré, un NOMBRE D'ESSAIS
   * chez Cinq sur cinq — où le meilleur est le plus PETIT. La liste ne formate
   * donc rien elle-même : elle affiche ce que l'appelant lui rend.
   */
  score: (n: number) => string;
  /**
   * Combien de lignes montrer.
   *
   * ⚠️ LA BASE EN REND DIX, ET ON PEUT EN MONTRER MOINS SANS PERDRE MA LIGNE.
   * Le tableau du jour prend les dix ; la journée arrêtée en prend cinq, parce
   * qu'elle vit dans une carte de RELECTURE et non dans l'écran de la partie.
   * Quand ma ligne tombe entre les deux — 7ᵉ sur un tableau coupé à cinq — la
   * base ne l'a pas mise dans `moi` (elle est dans SA tête de liste), donc c'est
   * ICI qu'il faut la repêcher. Sans ça, couper la liste ferait disparaître le
   * joueur de son propre tableau, en silence.
   */
  max: number;
  /**
   * Combien de joueurs ont déposé un nom, en une phrase.
   *
   * ⚠️ ELLE ARRIVE DE L'APPELANT PARCE QU'ELLE N'EST PAS LA MÊME : « … ont
   * laissé leur nom aujourd'hui » est FAUX sur une journée close, et c'est
   * exactement l'écran qui montre la journée close qui a besoin de cette liste.
   * Le texte voyage, pas la clé — une clé prise en variable échapperait au
   * contrôle de parité i18n.
   */
  effectif: ReactNode;
}) {
  const t = useTranslations("TableauJeux");
  const locale = useLocale();

  if (lignes.length === 0) return null;

  const tete = lignes.slice(0, max);
  // Ma ligne lointaine : celle que la base a mise à part, ou celle que la coupe
  // vient de rejeter hors de la tête.
  const maLigne = moi ?? lignes.slice(max).find((l) => l.moi) ?? null;

  const ligne = (nom: string, valeur: number, mien: boolean, cle: string) => (
    <li
      key={cle}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 12,
        padding: "5px 8px",
        borderRadius: 6,
        // ⚠️ MA LIGNE EST TEINTÉE, PAS ENCADRÉE. Un cadre au milieu d'une liste
        // fait un trou rectangulaire — la même leçon que les barres des deux
        // bandes, où le repère est une barre pleine et jamais un contour.
        background: mien ? `${skin.accent}1A` : "transparent",
        fontWeight: mien ? 800 : 600,
      }}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {nom}
        {mien ? <span style={{ color: skin.accent, fontWeight: 800 }}> · {t("vous")}</span> : null}
      </span>
      <span
        style={{
          flex: "none",
          fontFamily: skin.fontDisplay,
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {enMots(valeur)}
      </span>
    </li>
  );

  const libelle = (l: { index: number | null; nom: string | null }) =>
    l.index !== null ? nomDe(l.index, locale) : (l.nom ?? "");

  return (
    <>
      {/* ⚠️ UNE VRAIE LISTE ORDONNÉE, et ma ligne lointaine est DEHORS. Un
          lecteur d'écran annonce le numéro de chaque élément : dans la tête de
          liste, « 3ᵉ élément » est vrai. Ma ligne, elle, peut être la 34ᵉ du
          classement — la laisser dans le même `ol` la ferait annoncer
          « 6ᵉ élément », c'est-à-dire un rang faux, exactement le chiffre que ce
          tableau refuse d'imprimer. */}
      <ol
        style={{
          display: "grid",
          gap: 2,
          margin: "10px 0 0",
          padding: 0,
          listStyle: "none",
          fontSize: 14.5,
        }}
      >
        {tete.map((l, i) => ligne(libelle(l), l.score, l.moi, `l${i}`))}
      </ol>
      {/* ⚠️ MA LIGNE SORT MÊME HORS DE LA TÊTE DE LISTE, précédée de trois
          points : un tableau où l'on ne se trouve pas est un tableau qui parle
          des autres. Les points disent qu'il manque des lignes entre les deux,
          sinon la mienne se lirait comme la suivante. */}
      {maLigne ? (
        <ul style={{ display: "grid", gap: 2, margin: 0, padding: 0, listStyle: "none", fontSize: 14.5 }}>
          <li aria-hidden style={{ color: skin.muted, padding: "2px 8px", letterSpacing: "0.2em" }}>
            ···
          </li>
          {ligne(libelle(maLigne), maLigne.score, true, "moi")}
        </ul>
      ) : null}
      {/* ⚠️ L'EFFECTIF PORTE L'ÉCHELLE, comme sous les deux bandes. « 1er » d'une
          liste de vingt ne veut pas dire la même chose selon que trois joueurs
          ou trois mille ont déposé un nom. */}
      <p style={{ margin: "10px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
        {effectif}
      </p>
    </>
  );
}
