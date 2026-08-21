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
// ⚠️ IL A LA MÊME FORME QUE `PartageBanalo` — un `GBtn` et le QR côte à côte,
// l'idiome des deux jeux quotidiens. Il n'en diffère que par la couleur du
// bouton : le partage de résultat porte le jaune parce qu'il récompense, celui-
// ci reste en papier parce qu'il cohabite parfois avec « Envoyer ma réponse ».
//
// ⚠️ LE LIEN EST LE CHEMIN NU, JAMAIS `window.location.href`. La page a pu être
// ouverte depuis le lien d'un ami, qui porte SON résultat : repartager l'URL
// courante renverrait le score de l'ami sous notre nom, en silence. Même règle
// que sur Cinq sur cinq.
import { useState } from "react";
import { useTranslations } from "next-intl";
import { UNANIMO_SKIN as skin } from "@/lib/games/skin";
import { GBtn } from "@/components/games/ui";
import PartageQR from "@/components/games/PartageQR";
import { QR_CHEMIN, QR_TAILLE, QR_URL } from "@/content/banalo/qr";

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
  const [qr, setQr] = useState(false);

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
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 14 }}>
      {/* ⚠️ `ghost` ET PAS `accent`, ET C'EST LA SEULE DIFFÉRENCE AVEC
          `PartageBanalo`. Même forme, même ombre, même famille — mais le
          partage de RÉSULTAT porte le jaune, parce qu'il vient récompenser ;
          l'invitation reste en papier. Avant le dépôt, elle cohabite avec
          « Envoyer ma réponse », et §0 de `docs/regularite-des-joueurs.md`
          interdit de mettre quoi que ce soit en concurrence avec le seul geste
          attendu. La taille suffit d'ailleurs à les séparer : le bouton d'envoi
          est `lg` et pleine largeur, celui-ci non. */}
      <GBtn skin={skin} variant="ghost" onClick={() => void invite()}>
        {copie ? t("copie") : t("inviteBouton")}
      </GBtn>
      {/* Le QR pointe l'URL NUE du jeu — donc exactement ce qu'une invitation
          veut dire. C'est même son meilleur usage : montrer le code à quelqu'un
          qui est là, sans rien avoir à s'envoyer. */}
      <PartageQR
        skin={skin}
        qr={{ url: QR_URL, taille: QR_TAILLE, chemin: QR_CHEMIN }}
        ouvert={qr}
        onOuvrir={setQr}
        textes={{ aide: t("qrAide"), titre: t("qrTitre"), fermer: t("qrFermer") }}
      />
    </div>
  );
}
