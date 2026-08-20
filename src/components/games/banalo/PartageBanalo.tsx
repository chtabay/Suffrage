"use client";

// LE PARTAGE DE BANALO DU JOUR — aligné sur celui de Cinq sur cinq.
//
// Trois choses viennent de là-bas, et chacune pour la raison qui l'y a mise :
//
//  · **Une FORME, jamais une transcription.** Le partage de Cinq sur cinq a
//    cessé de recopier un emoji par essai le jour où une partie de 156 coups a
//    produit 509 caractères de bruit. Ici la forme tient en une ligne, quel que
//    soit le format du jour.
//
//  · **`navigator.share` d'abord, le presse-papier ensuite.** Sur téléphone, la
//    feuille de partage du système est le geste attendu.
//
//  · **Un QR agrandissable.** Retour de terrain : le texte marche par
//    messagerie, mais devant quelqu'un on ne dicte pas une URL.
//
// ⚠️ ET UNE RÈGLE PROPRE À CE JEU : LE PARTAGE NE DOIT RIEN DONNER À COPIER.
// Cinq sur cinq peut tout montrer sauf le pays ; ici, la réponse elle-même EST
// la performance. Un ami qui lit mon nombre, ou mes six mots, n'a plus qu'à les
// recopier — et comme on est noté par rapport à la foule, il fera au moins aussi
// bien que moi sans avoir joué. Le partage ne porte donc que des ÉCARTS et des
// PARTS : mon score, la forme, et l'écart en facteur. Ni ma réponse, ni la
// médiane, ni mes mots.
import { useState } from "react";
import { useTranslations } from "next-intl";
import { UNANIMO_SKIN as skin } from "@/lib/games/skin";
import { GBtn } from "@/components/games/ui";
import PartageQR from "@/components/games/PartageQR";
import { QR_CHEMIN, QR_TAILLE, QR_URL } from "@/content/banalo/qr";

export default function PartageBanalo({
  jour,
  points,
  forme,
  partMieux,
}: {
  jour: number;
  /** Le score, déjà formaté dans la langue de l'écran. */
  points: string;
  /** La ligne de forme : les blocs de chaleur, ou l'écart. Jamais la réponse. */
  forme: string;
  partMieux: number | null;
}) {
  const t = useTranslations("BanaloJour");
  const [copie, setCopie] = useState(false);
  const [qr, setQr] = useState(false);

  const partage = async () => {
    const lignes = [
      t("partageTitre", { n: jour, points }),
      forme,
      partMieux !== null ? t("partMieux", { n: partMieux }) : "",
    ].filter(Boolean);
    // Une ligne vide avant le lien : collé à la dernière ligne, il se lisait
    // comme une suite de la forme. Même correction que sur Cinq sur cinq.
    const texte = `${lignes.join("\n")}\n\n${QR_URL}`;
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
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <GBtn skin={skin} variant="accent" onClick={() => void partage()}>
        {copie ? t("copie") : t("partager")}
      </GBtn>
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
