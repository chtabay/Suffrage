"use client";

// LES DEUX JEUX QUOTIDIENS, SUR L'ACCUEIL DE PLACET.
//
// La bande « Jouer ensemble » annonçait des jeux — c'était une publicité :
// identique tous les jours, donc du mobilier au troisième passage. Deux cartes
// qui montrent CE QUI SE JOUE AUJOURD'HUI sont un hameçon vivant, et pour la
// régularité c'est un rappel passif sur la page la plus visitée, qui ne coûte
// rien en confiance — contrairement à une notification.
//
// ⚠️ AUX COULEURS DE PLACET, PAS À CELLES DES JEUX. C'est l'inverse exact de la
// règle qui vaut à l'intérieur d'un jeu (`InstallJeu`, `PontPlacet`) : ici on est
// chez Placet, sur sa page, et deux cartes en violet-menthe au milieu du crème
// ressembleraient à un encart publicitaire collé là.
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

  const carte = (
    href: string,
    emoji: string,
    nom: string,
    ligne: string,
    clamp: number,
  ) => (
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
        padding: "13px 15px",
        ...lift(`4px 4px 0 ${INK}`, `6px 6px 0 ${INK}`),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span aria-hidden style={{ fontSize: 18 }}>
          {emoji}
        </span>
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15 }}>{nom}</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: SUBINK, fontWeight: 700 }}>
          {t("jourNumero", { n: jour })}
        </span>
      </div>
      <p
        style={{
          margin: "7px 0 0",
          fontSize: 13.5,
          color: SUBINK,
          lineHeight: 1.4,
          // La question du jour peut être longue : on la borne à deux lignes
          // plutôt que de laisser la carte grandir sous elle.
          display: "-webkit-box",
          WebkitLineClamp: clamp,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {ligne}
      </p>
    </Link>
  );

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
      {carte("/games/banalo-jour", prog.type === "mots" ? "💬" : "🔢", t("banalo-jour.name"), sujet, 2)}
      {/* Pas de sujet ici, et c'est la règle — voir l'en-tête. */}
      {carte("/games/pays", "🌍", t("pays.name"), t("pays.tagline"), 2)}
    </div>
  );
}
