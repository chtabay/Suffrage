"use client";

// LA SÉRIE, ET CE QU'ELLE DEVIENT DEMAIN — en un seul endroit pour les deux
// jeux quotidiens.
//
// ⚠️ ELLE SE CACHAIT À 1, ET C'ÉTAIT LE TROU DU JOUR 1. Les deux jeux écrivaient
// `serie > 1`, donc un joueur qui venait de finir sa PREMIÈRE partie ne voyait
// rien — pendant que la carte au-dessus lui disait « gardez votre série ». On
// lui demandait de conserver une chose qu'on ne lui avait jamais montrée.
//
// ⚠️ C'EST LE SEUL ENDROIT DE L'APRÈS-PARTIE QUI PARLE AU JOUEUR DU JOUR 1.
// L'échelle du §0 (`docs/regularite-des-joueurs.md`) commence à DEUX journées
// jouées : en dessous, elle prescrit « rien ». Mesuré le 2026-09-09, **3 joueurs
// sur 12 reviennent une seconde journée** — l'échelle vaut donc « rien » pour
// les trois quarts des gens. Ce bloc ne la contredit pas : il ne DEMANDE rien
// (ni compte, ni installation, ni ami), il RACONTE l'état du joueur. Il ne
// consomme donc aucune des places que l'échelle arbitre.
//
// ⚠️ ET LA PHRASE DE RELANCE NE SORT QU'À 1. Servie tous les jours à un habitué,
// « revenez demain » deviendrait la boîte qu'on ferme sans lire — exactement ce
// que `rappelleLaMethode` évite chez Cinq sur cinq. À partir de 2, la série se
// suffit : le chiffre lui-même est la raison de revenir.
//
// ⚠️ ELLE S'ARRÊTE APRÈS « elle passera à 2 ». La première rédaction ajoutait
// « c'est la seule chose que ce jeu vous demande » — vrai sur le papier, et
// contredit à l'écran par l'offre de compte qui suit IMMÉDIATEMENT dans la même
// carte. Ça ne se voit qu'en regardant le rendu.
import { useTranslations } from "next-intl";
import type { GameSkin } from "@/lib/games/skin";

export default function SerieDuJour({ skin, serie }: { skin: GameSkin; serie: number }) {
  const t = useTranslations("SerieJeux");
  if (serie < 1) return null;

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 19 }}>
        {/* Les deux clés sont écrites EN CLAIR : une clé choisie en variable
            échapperait au contrôle de parité i18n. */}
        🔥 {serie === 1 ? t("jourUn") : t("jours", { n: serie })}
      </div>
      {serie === 1 && (
        <p style={{ margin: "3px 0 0", fontSize: 13, color: skin.muted, lineHeight: 1.45, maxWidth: "40ch" }}>
          {t("demain")}
        </p>
      )}
    </div>
  );
}
