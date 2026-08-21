"use client";

// INVITER QUELQU'UN À JOUER LA JOURNÉE — avant d'avoir répondu, et après.
//
// ⚠️ CE N'EST PAS `PartageBanalo`, ET LES DEUX NE SE REMPLACENT PAS. Celui-là
// partage un RÉSULTAT : il n'existe qu'une fois la réponse notée, et il porte le
// score dans le lien pour que l'ami compare. Celui-ci partage la QUESTION : il
// ne dit rien de ce qu'on a répondu, et son lien est nu.
//
// ⚠️ LE TROU QU'IL BOUCHE ÉTAIT LE PIRE POSSIBLE. `PartageBanalo` ne s'affiche
// qu'au-delà du plancher de cinq votants — donc au moment où une journée manque
// de monde, le jeu n'offrait AUCUN moyen d'en amener. Le premier joueur de la
// journée voyait « vous êtes 1 pour l'instant » et pas un bouton pour changer ça.
//
// ⚠️ ET IL NE FUITE RIEN, MÊME AVANT LA RÉPONSE. Le thème et la question sont
// déjà publics : l'accueil de Placet les affiche sur sa carte du jour. Ce qui ne
// sort pas d'ici, c'est la réponse du joueur — il n'y en a pas encore — et le
// résultat de la foule, qui ne voyage que dans `PartageBanalo`.
//
// ⚠️ LE LIEN EST LE CHEMIN NU, JAMAIS `window.location.href`. La page a pu être
// ouverte depuis le lien d'un ami, qui porte SON résultat : repartager l'URL
// courante renverrait le score de l'ami sous notre nom, en silence. Même règle
// que sur Cinq sur cinq.
import { useState } from "react";
import { useTranslations } from "next-intl";
import { UNANIMO_SKIN as skin } from "@/lib/games/skin";
import { QR_URL } from "@/content/banalo/qr";

export default function InviterBanalo({
  jour,
  sujet,
  consigne,
}: {
  jour: number;
  /** Le thème ou la question, tel qu'il est affiché — déjà public. */
  sujet: string;
  /** Une ligne qui dit en quoi consiste la journée. */
  consigne: string;
}) {
  const t = useTranslations("BanaloJour");
  const [copie, setCopie] = useState(false);

  const invite = async () => {
    const texte = `${t("inviteTitre", { n: jour, sujet })}\n${consigne}\n\n${QR_URL}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) await navigator.share({ text: texte });
      else {
        await navigator.clipboard.writeText(texte);
        setCopie(true);
        window.setTimeout(() => setCopie(false), 2000);
      }
    } catch {
      // Partage refusé par l'utilisateur : rien à dire.
    }
  };

  return (
    <button
      type="button"
      onClick={() => void invite()}
      // ⚠️ DISCRET AVANT LA RÉPONSE, ET C'EST DÉLIBÉRÉ. La règle du dépôt est
      // qu'avant de jouer le joueur a UNE tâche et que tout le reste est du
      // bruit (§0 de `docs/regularite-des-joueurs.md`). L'invitation est le seul
      // écart admis — elle amène des joueurs, donc elle sert la journée — mais
      // elle ne prend pas la forme d'un bouton plein qui concurrencerait
      // « Envoyer ma réponse ».
      style={{
        marginTop: 12,
        padding: "8px 12px",
        borderRadius: 999,
        border: `2px solid ${skin.ink}22`,
        background: "transparent",
        color: skin.muted,
        fontFamily: skin.fontBody,
        fontWeight: 700,
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      {copie ? t("copie") : t("inviteBouton")}
    </button>
  );
}
