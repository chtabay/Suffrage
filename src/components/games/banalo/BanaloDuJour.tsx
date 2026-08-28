"use client";

// LA JOURNÉE DE BANALO — le cadre, et le format du jour.
//
// Deux formats partagent la même journée : un NOMBRE à estimer, et six MOTS à
// trouver. Ils partagent aussi la charnière de 11 h 30, le jeton anonyme et la
// purge à trente jours ; seul ce qu'on tape change.
//
// ⚠️ ET LA RÈGLE NE CHANGE PAS D'UN JOUR À L'AUTRE : dans les deux cas, on
// répond comme la foule. L'étude avertissait que « deux barèmes inverses
// cohabitent » — viser le centre pour une question, viser la bande rare pour une
// autre — et qu'un joueur qui applique le mauvais perd sans comprendre pourquoi.
// Le barème du centre a été retenu pour les mots précisément pour que cet
// avertissement tombe : il n'y a plus qu'une consigne, et elle vaut tous les
// jours. C'est ce qui autorise à mélanger les formats dans une seule habitude.
//
// ⚠️ CE COMPOSANT NE PARLE À LA BASE POUR AUCUN DES DEUX FORMATS. Chaque écran
// fait ses propres appels ; celui qui n'est pas affiché n'en fait aucun. Une
// première version gardait tout dans un seul composant, et les crochets du
// format chiffré appelaient la RPC des nombres même les jours de mots.
import { useTranslations } from "next-intl";
import GameShell from "@/components/games/GameShell";
import { UNANIMO_SKIN as skin } from "@/lib/games/skin";
import { programmeDe } from "@/lib/games/banalo/programme";
import { useProchaineCharniere } from "@/lib/games/banalo/prochaine";
import NombreDuJour from "./NombreDuJour";
import GrilleDeMots from "./GrilleDeMots";
import JourneePrecedente from "./JourneePrecedente";

export default function BanaloDuJour({ jour }: { jour: number }) {
  const t = useTranslations("BanaloJour");
  const prog = programmeDe(jour);

  // L'heure de la prochaine question, dans le fuseau du LECTEUR (voir le hook).
  const prochaine = useProchaineCharniere();

  return (
    <GameShell
      skin={skin}
      title={t("name")}
      // L'emoji suit le format : c'est le seul repère qui dit, avant même de
      // lire, ce qu'on va devoir taper aujourd'hui.
      emoji={prog.type === "mots" ? "💬" : "🎯"}
      backLabel={t("back")}
      poweredBy={t("poweredBy")}
      // ⚠️ L'EN-TÊTE RESTE (décision n°3 de `GameShell`) : l'après-partie de ce
      // jeu dépasse deux mille pixels, et sans ça le retour vers /games ET le
      // choix de la langue disparaissent au premier défilement.
      collant
      aside={
        <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 14, color: skin.muted }}>
          {t("numero", { n: jour })}
        </span>
      }
    >
      {/* LE RÉSULTAT DE LA JOURNÉE PRÉCÉDENTE — UNE LIGNE, SOUS LA QUESTION DU
          JOUR. Il vaut pour les deux formats, donc il est construit ici ; mais
          sa PLACE est dans l'écran de format, juste sous le thème ou l'énoncé,
          d'où le passage en `veille`.

          ⚠️ IL ÉTAIT EN BAS, ET C'ÉTAIT UN DÉFAUT MESURÉ : y = 1 444 sur une
          page de 1 801 px à 390 px de large, soit presque quatre écrans de
          téléphone sous le thème. Le même défaut venait d'être corrigé sur Cinq
          sur cinq. L'argument d'origine — « un joueur qui arrive doit voir la
          question d'aujourd'hui » — reste vrai et reste tenu : la carte du thème
          passe toujours en premier, la ligne se pose DESSOUS, en petit.

          ⚠️ IL NE PREND PAS LA PLACE UNIQUE DE L'APRÈS-PARTIE (§0 de
          `docs/regularite-des-joueurs.md`). Ce n'est pas une demande — il ne
          réclame ni installation, ni compte, ni ami : c'est du jeu, et il ne
          concurrence donc rien dans l'échelle de priorité. */}
      {prog.type === "mots" ? (
        <GrilleDeMots
          jour={jour}
          theme={prog.theme}
          cases={prog.cases}
          veille={<JourneePrecedente jour={jour} />}
        />
      ) : (
        <NombreDuJour jour={jour} veille={<JourneePrecedente jour={jour} />} />
      )}

      {/* Les deux clés sont écrites EN CLAIR : une clé choisie en variable
          échapperait au contrôle de parité i18n. */}
      {prochaine ? (
        <p style={{ marginTop: 22, fontSize: 13, color: skin.muted }}>
          {prog.type === "mots" ? t("demainMots", { heure: prochaine }) : t("demain", { heure: prochaine })}
        </p>
      ) : null}
    </GameShell>
  );
}
