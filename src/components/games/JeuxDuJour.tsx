"use client";

// LES DEUX JEUX QUOTIDIENS, SUR L'ACCUEIL DE PLACET.
//
// La bande « Jouer ensemble » annonçait des jeux — c'était une publicité :
// identique tous les jours, donc du mobilier au troisième passage. Deux cartes
// qui montrent CE QUI SE JOUE AUJOURD'HUI sont un hameçon vivant, et pour la
// régularité c'est un rappel passif sur la page la plus visitée, qui ne coûte
// rien en confiance — contrairement à une notification.
//
// ⚠️ DANS LES VÊTEMENTS DE PLACET, AVEC UN SEUL ACCENT DU JEU — et la nuance
// est tout le sujet. Une carte menthe-et-violet posée sur le crème (fond,
// bordure et typo étrangers d'un coup) ressemblerait à un encart publicitaire
// collé là. Un seul élément coloré sur une carte par ailleurs identique aux
// autres de la page, non.
//
// L'accent n'est pas décoratif, il ANNONCE LA DESTINATION : cliquer une carte à
// l'ombre violette et atterrir sur un écran violet est continu ; atterrir sur du
// violet après une carte neutre est un saut.
//
// On le pose sur l'OMBRE PORTÉE, parce que c'est déjà l'idiome maison — `GCard`
// prend une prop `accent` qui ne sert qu'à ça. On applique un dispositif
// existant plutôt que d'en inventer un. Pas de liseré latéral : c'est le tic le
// plus reconnaissable du design généré, et il ajoute une forme là où l'ombre
// suffit.
//
// ⚠️ TOUT LE RESTE EST IDENTIQUE d'une carte à l'autre — bordure encre, rayon,
// décalage, graisses, tailles. Si tout diffère, ce n'est plus une rangée, ce sont
// deux publicités côte à côte.
//
// ⚠️ ET PAS L'ACCENT SECONDAIRE DE BANALO (`#FFC93C`) : il est à un cheveu du
// jaune de Placet (`#FFB627`), et la distinction s'effacerait. On prend les
// accents primaires, distincts entre eux et de la page.
//
// L'accent ne porte AUCUNE information — le nom, la journée et le sujet la
// portent. Personne ne perd rien s'il ne distingue pas les deux teintes.
//
// ⚠️ ET SURTOUT : LES DEUX JEUX N'ONT PAS LE DROIT DE MONTRER LA MÊME CHOSE.
//
//   · **Banalo du jour PEUT montrer son sujet.** La question — ou le thème — EST
//     l'énoncé : elle est faite pour être lue, elle ne divulgue rien. C'est même
//     le meilleur hameçon dont on dispose.
//
//   · **Cinq sur cinq NE PEUT PAS.** Son sujet est un pays caché, et
//     `games/pays/page.tsx` l'interdit explicitement : « AUCUNE MÉTADONNÉE
//     DÉRIVÉE DU PUZZLE — ni le pays, ni un critère, ni même une image sociale
//     engendrée à partir de la carte ». Sa carte ne porte donc que le numéro de
//     journée et sa promesse. Confondre les deux ferait fuiter le jeu depuis
//     l'accueil, sur la page la plus vue du site.
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FONT_DISPLAY, INK, SUBINK, lift } from "@/components/scrutin/theme";
import { PAYS_SKIN, UNANIMO_SKIN } from "@/lib/games/skin";
import { numeroDuJour } from "@/lib/games/banalo/jour";
import { programmeDe } from "@/lib/games/banalo/programme";
import { enLangue } from "@/content/banalo/questions";
import { themeLabel } from "@/lib/games/banalo/themes";

export default function JeuxDuJour() {
  const t = useTranslations("Games");
  const locale = useLocale();

  // ⚠️ LA JOURNÉE SE CALCULE APRÈS LE MONTAGE. L'accueil est rendu côté serveur ;
  // y calculer la journée la figerait dans le HTML — au mieux jusqu'au prochain
  // déploiement, au pire dans une page mise en cache. Et le rendu serveur et le
  // rendu client ne partagent pas le même fuseau, ce qui produirait une
  // différence d'hydratation un jour sur deux autour de la charnière.
  const [jour, setJour] = useState<number | null>(null);
  useEffect(() => {
    setJour(numeroDuJour());
  }, []);

  // Rien tant qu'on ne sait pas : une carte vide qui se remplit vaut mieux
  // qu'une carte qui affiche la mauvaise journée pendant une seconde.
  if (jour === null) return null;

  const prog = programmeDe(jour);
  const sujet =
    prog.type === "mots"
      ? `${prog.theme.emoji} ${themeLabel(prog.theme, locale)}`
      : enLangue(prog.question.texte, locale);

  const carte = (href: string, emoji: string, nom: string, ligne: string, accent: string) => (
    <Link
      href={href}
      className="dc-lift"
      style={{
        flex: "1 1 240px",
        display: "block",
        textDecoration: "none",
        color: INK,
        border: `2.5px solid ${INK}`,
        background: "#fff",
        borderRadius: 12,
        padding: "10px 12px",
        // Seule la TEINTE de l'ombre change d'une carte à l'autre ; la géométrie
        // (décalage, survol) reste celle de la page.
        ...lift(`4px 4px 0 ${accent}`, `6px 6px 0 ${accent}`),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span aria-hidden style={{ fontSize: 15 }}>
          {emoji}
        </span>
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14.5 }}>{nom}</span>
        <span style={{ marginLeft: "auto", fontSize: 11.5, color: SUBINK, fontWeight: 700 }}>
          {t("jourNumero", { n: jour })}
        </span>
      </div>
      <p
        style={{
          margin: "5px 0 0",
          fontSize: 13,
          color: SUBINK,
          lineHeight: 1.35,
          // La question du jour peut être longue : on la borne à deux lignes
          // plutôt que de laisser la carte grandir sous elle.
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {ligne}
      </p>
    </Link>
  );

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
      {carte(
        "/games/banalo-jour",
        prog.type === "mots" ? "💬" : "🎯",
        t("banalo-jour.name"),
        sujet,
        UNANIMO_SKIN.accent,
      )}
      {/* Pas de sujet ici, et c'est la règle — voir l'en-tête. */}
      {carte("/games/pays", "🌍", t("pays.name"), t("pays.tagline"), PAYS_SKIN.accent)}
    </div>
  );
}
