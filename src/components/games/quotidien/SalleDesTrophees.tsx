"use client";

// LA SALLE DES TROPHÉES — ce que les saisons closes ont laissé.
//
// ⚠️ UN TROPHÉE NE SE RECALCULE PAS, SINON CE N'EST PAS UN TROPHÉE. Tout ce qui
// est ici a été gelé à la clôture par `scrutin_jeux_saison_cloturer` : ni la
// purge des réponses, ni un changement de barème, ni le mois suivant ne peuvent
// le déplacer. C'est la différence de nature avec le classement en cours, qui se
// relit à chaque appel.
//
// ⚠️ ELLE SE LIT SANS COMPTE. C'est en voyant qu'il y a du monde derrière qu'on
// a envie d'y entrer ; une salle fermée à qui n'en a pas n'en donne aucune
// raison.
//
// ⚠️ ET LE PSEUDO N'EST PAS GELÉ AVEC LA MÉDAILLE. Il est relu à chaque
// affichage, donc un nom retiré par la Régie disparaît d'ici aussi — c'est la
// contrepartie écrite du seul nom du produit qui survit à une journée.
// Conséquence assumée : un podium peut montrer 1ᵉ et 3ᵉ sans 2ᵉ. Le trou est
// honnête ; renuméroter serait un mensonge.
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { nomDeLangue } from "@/lib/games/langue";
import { PLACET_GAMES_SKIN as skin } from "@/lib/games/skin";
import { GCard, GLabel } from "@/components/games/ui";
import { trophees as litTrophees, type Trophees, type TropheeJeu } from "@/lib/db/jeux";

const bcp = (locale: string) => (locale === "pcm" ? "en" : locale);

/** Or, argent, bronze. Au-delà, rien : le podium s'arrête à trois. */
const MEDAILLES = ["🥇", "🥈", "🥉"];

function moisLisible(saison: string, locale: string): string {
  const [a, m] = saison.split("-").map(Number);
  if (!a || !m) return saison;
  // Le 15 du mois : le 1er à minuit bascule d'un mois en arrière à l'ouest de Paris.
  return new Intl.DateTimeFormat(bcp(locale), { month: "long", year: "numeric" })
    .format(new Date(Date.UTC(a, m - 1, 15)));
}

export default function SalleDesTrophees() {
  const t = useTranslations("JeuxQuotidiens");
  const locale = useLocale();
  const [salle, setSalle] = useState<Trophees | null>(null);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    let vivant = true;
    void litTrophees(6).then((s) => {
      if (!vivant) return;
      setSalle(s);
      setPret(true);
    });
    return () => {
      vivant = false;
    };
  }, []);

  const nb = useMemo(() => new Intl.NumberFormat(bcp(locale), { maximumFractionDigits: 1 }), [locale]);

  // ⚠️ ON N'AFFICHE RIEN TANT QU'ON N'A PAS RÉPONDU, puis on dit l'absence. Un
  // bloc vide qui se remplit une seconde plus tard scintille ; une absence sans
  // un mot se lit comme une panne. La première saison ne se clôt que le 1er du
  // mois prochain, donc cet état est le NORMAL aujourd'hui, pas un défaut.
  if (!pret) return null;
  if (!salle || salle.saisons.length === 0) {
    return (
      <GCard skin={skin} padding={18} style={{ marginTop: 12 }}>
        <GLabel skin={skin}>{t("tropheesTitre")}</GLabel>
        <p style={{ margin: "8px 0 0", fontSize: 13.5, color: skin.muted, lineHeight: 1.5 }}>
          {t("tropheesVide")}
        </p>
      </GCard>
    );
  }

  const bloc = (g: TropheeJeu) => (
    // ⚠️ LA CLÉ PORTE LA LANGUE. Une saison de Banalo a maintenant un bloc par
    // langue jouée : à la seule clé `g.jeu`, React voyait deux « banalo » et
    // n'en rendait qu'un correctement.
    <div key={`${g.jeu}-${g.langue ?? ""}`} style={{ marginTop: 12, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 15 }}>
          {/* Les trois clés sont écrites EN CLAIR : une clé choisie en variable
              échapperait au contrôle de parité i18n. */}
          {g.jeu === "tout" ? t("porteeTout") : g.jeu === "banalo" ? t("banalo") : t("pays")}
          {/* ⚠️ LA LANGUE FAIT PARTIE DU NOM DU CLASSEMENT. Une saison de Banalo
              en compte une par langue jouée : sans elle, la salle afficherait
              deux blocs « Banalo du jour » qu'on prendrait pour un doublon. */}
          {g.langue ? (
            <span style={{ color: skin.muted, fontWeight: 700 }}> · {nomDeLangue(g.langue)}</span>
          ) : null}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: skin.muted }}>
          {t("classes", { n: g.joueurs })}
        </span>
      </div>

      {g.podium.length === 0 ? (
        // ⚠️ LA SAISON EXISTE, MAIS RIEN N'A ÉTÉ DÉCERNÉ — et on le DIT. Ça
        // n'arrive plus que dans un seul cas : un unique classé, c'est-à-dire
        // « 1er sur 1 », la tautologie que ce produit refuse partout. Le
        // plancher de cinq qui produisait aussi cet état a été retiré.
        <p style={{ margin: "6px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
          {t("tropheesSeul")}
        </p>
      ) : (
        <ol style={{ display: "grid", gap: 3, margin: "6px 0 0", padding: 0, listStyle: "none", minWidth: 0 }}>
          {g.podium.map((m) => (
            <li
              key={m.place}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 9,
                minWidth: 0,
                padding: "5px 8px",
                borderRadius: 6,
                fontSize: 14.5,
                background: m.moi ? `${skin.accent}1A` : "transparent",
                fontWeight: m.moi ? 800 : 600,
              }}
            >
              {/* La médaille est doublée du rang pour un lecteur d'écran : un
                  emoji seul ne dit pas « deuxième ». */}
              <span aria-hidden style={{ flex: "none", fontSize: 17 }}>
                {MEDAILLES[m.place - 1] ?? ""}
              </span>
              <span style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span className="sr-only">{t("place", { n: m.place })} </span>
                {m.pseudo}
                {m.moi ? <span style={{ color: skin.accent, fontWeight: 800 }}> · {t("vous")}</span> : null}
              </span>
              <span style={{ flex: "none", fontSize: 12, color: skin.muted }}>{t("surN", { n: m.journees })}</span>
              <span style={{ flex: "none", fontFamily: skin.fontDisplay, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                {t("points", { n: nb.format(m.points) })}
              </span>
            </li>
          ))}
        </ol>
      )}

      {/* ⚠️ MA PLACE SORT MÊME HORS DU PODIUM, et surtout même quand aucune
          médaille n'a été décernée : « 7ᵉ sur 12 en août » est un souvenir, et
          c'est ce que cette page est faite pour garder. Elle se tait si je suis
          déjà sur le podium — la ligne serait dite deux fois. */}
      {g.moi && !g.podium.some((m) => m.moi) ? (
        <p style={{ margin: "6px 0 0", fontSize: 13, fontWeight: 700 }}>
          {t("tropheesMaPlace", { place: g.moi.place, p: nb.format(g.moi.points), n: g.moi.journees })}
        </p>
      ) : null}
    </div>
  );

  return (
    <>
      <p style={{ margin: "4px 0 0", fontSize: 13.5, color: skin.muted, lineHeight: 1.5 }}>
        {t("tropheesAide")}
      </p>
      {salle.saisons.map((s) => (
        <GCard key={s.saison} skin={skin} padding={18} style={{ marginTop: 12 }}>
          <GLabel skin={skin}>{moisLisible(s.saison, locale)}</GLabel>
          {s.jeux.map(bloc)}
        </GCard>
      ))}
    </>
  );
}
