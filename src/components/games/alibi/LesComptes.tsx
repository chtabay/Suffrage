"use client";

// LES COMPTES — la révélation d'une manche.
//
// C'EST L'ÉCRAN QUI PORTE LE JEU. Tout ce que la table apprend passe par lui, et
// il ne doit rien expliquer que l'arithmétique ne montre déjà : trois pièces,
// leurs bulletins, leur nombre annoncé, et le verdict qui en découle.
//
// LE ROUGE EST RÉSERVÉ À UNE SEULE CHOSE : la pièce qui compte un occupant de
// trop. C'est le seul endroit du jeu où il apparaît, pour qu'il saute aux yeux
// d'un bout de la table sans qu'on ait à lire.
//
// ⚠️ LA PHRASE DU BAS N'EST PAS DÉCORATIVE. « Le serveur n'a rien révélé : ce
// sont vos bulletins qui se contredisent. » Sans elle, la table croit que
// l'application désigne quelqu'un — et cherche à la prendre en défaut au lieu de
// se parler. C'est ce qui distingue ce jeu d'un oracle.
import { useTranslations } from "next-intl";
import type { GameSkin } from "@/lib/games/skin";
import { ALIBI_ALERT } from "@/lib/games/skin";
import { placeEmoji, placeLabel } from "@/lib/games/alibi/lieux";
import type { AlibiResult, AlibiRoomResult } from "@/lib/games/alibi/regles";
import { GCard, GLabel } from "@/components/games/ui";

export default function LesComptes({
  skin,
  locale,
  result,
  previous,
}: {
  skin: GameSkin;
  locale: string;
  result: AlibiResult;
  /** Taille du vivier à la manche précédente, pour dire de combien on a resserré. */
  previous: number | null;
}) {
  const t = useTranslations("Alibi");
  const rooms = result.rooms ?? [];
  const suspects = result.suspects ?? [];

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gap: 9 }}>
        <GLabel skin={skin}>{t("reveal.title")}</GLabel>
        {rooms.map((r) => (
          <Piece key={r.room} skin={skin} locale={locale} r={r} />
        ))}
      </div>

      <GCard skin={skin} accent={suspects.length <= 2 ? ALIBI_ALERT : skin.accent} padding={16}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 18, color: skin.ink }}>
            {suspects.length === 1
              ? t("reveal.onlyOne")
              : suspects.length === 2
                ? t("reveal.duel")
                : t("reveal.suspects", { n: suspects.length })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {suspects.map((n) => (
              <span
                key={n}
                style={{
                  border: `${skin.border}px solid ${skin.ink}`,
                  borderRadius: 999,
                  padding: "7px 12px",
                  background: skin.paper,
                  fontFamily: skin.fontDisplay,
                  fontWeight: 800,
                  fontSize: 14.5,
                  color: skin.ink,
                }}
              >
                {n}
              </span>
            ))}
          </div>
          {previous != null && previous > suspects.length ? (
            <div style={{ fontSize: 13.5, color: skin.muted }}>
              {t("reveal.narrowed", { before: previous, after: suspects.length })}
            </div>
          ) : null}
        </div>
      </GCard>

      <p style={{ fontSize: 13, color: skin.muted, lineHeight: 1.5, margin: 0, textAlign: "center" }}>
        {t("reveal.hint")}
      </p>
    </div>
  );
}

function Piece({ skin, locale, r }: { skin: GameSkin; locale: string; r: AlibiRoomResult }) {
  const t = useTranslations("Alibi");
  const tone = r.verdict === "clean" ? skin.good : r.verdict === "liar" ? ALIBI_ALERT : ALIBI_ALERT;
  const titre = r.verdict === "clean" ? t("reveal.clean") : r.verdict === "liar" ? t("reveal.liar") : t("reveal.extra");
  const aide =
    r.verdict === "clean"
      ? t("reveal.cleanHint", { n: r.names.length })
      : r.verdict === "liar"
        ? t("reveal.liarHint")
        : t("reveal.extraHint");
  // Les noms mis en avant : les menteurs désignés, sinon toute la pièce quand
  // elle est suspecte. Une pièce nette n'a personne à souligner.
  const vedettes = r.verdict === "liar" ? r.odd : r.verdict === "extra" ? r.names : [];

  return (
    <div
      style={{
        border: `${skin.border}px solid ${skin.ink}`,
        borderLeft: `7px solid ${tone}`,
        borderRadius: skin.radius - 4,
        background: skin.paper,
        padding: "12px 14px",
        display: "grid",
        gap: 7,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 17, color: skin.ink }}>
          <span aria-hidden style={{ marginRight: 6 }}>
            {placeEmoji(r.place)}
          </span>
          {placeLabel(r.place, locale)}
        </span>
        <span style={{ fontSize: 13.5, color: skin.muted, fontVariantNumeric: "tabular-nums" }}>
          {t("reveal.ballotsFor", { n: r.ballots })} · {t("reveal.said", { n: r.said })}
        </span>
      </div>

      <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 15, color: tone }}>{titre}</div>
      <div style={{ fontSize: 13.5, color: skin.muted, lineHeight: 1.45 }}>{aide}</div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {r.names.map((n) => {
          const fort = vedettes.includes(n);
          return (
            <span
              key={n}
              style={{
                border: `2px solid ${fort ? tone : skin.muted}`,
                borderRadius: 999,
                padding: "4px 10px",
                fontSize: 13.5,
                fontWeight: fort ? 800 : 600,
                color: fort ? skin.ink : skin.muted,
                background: fort ? "#fff" : "transparent",
              }}
            >
              {n}
            </span>
          );
        })}
      </div>
    </div>
  );
}
