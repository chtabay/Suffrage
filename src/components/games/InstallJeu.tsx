"use client";

// « GARDEZ LE JEU SOUS LA MAIN » — l'installation, proposée au bon moment.
//
// ⚠️ PAS `InstallInline`, ET POUR LA RAISON QUI A CRÉÉ LES SKINS. Le composant
// de Placet importe `components/scrutin/theme` : il est, par construction, aux
// couleurs de Placet — encre navy, jaune, crème — et il TUTOIE (« ton écran
// d'accueil ») là où les jeux vouvoient. Ce qu'on reprend d'en face est la
// LOGIQUE (`useInstall`), pas l'habillage.
//
// ⚠️ ET LE MOMENT COMPTE PLUS QUE LE BOUTON. Un jeu quotidien ne se joue qu'une
// fois par jour : l'installation n'a de sens qu'une fois la journée finie, quand
// le joueur vient d'avoir sa réponse et qu'il existe une raison de revenir
// demain. Proposée à l'arrivée, elle demande un engagement avant d'avoir rien
// donné. C'est pour ça que ce bloc vit dans l'écran de résultat et nulle part
// ailleurs.
//
// ⚠️ IL SE TAIT TOUT SEUL DANS TROIS CAS : déjà installé (`standalone`),
// navigateur qui ne sait pas installer, et iOS tant qu'on n'a pas déplié le
// mode d'emploi — Safari n'expose aucune API d'installation, il n'y a qu'un
// geste à décrire.
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useInstall } from "@/lib/pwa/install";
import type { GameSkin } from "@/lib/games/skin";

export default function InstallJeu({ skin }: { skin: GameSkin }) {
  const t = useTranslations("Games");
  const { canPrompt, standalone, ios, promptInstall } = useInstall();
  const [modeEmploi, setModeEmploi] = useState(false);

  if (standalone || (!canPrompt && !ios)) return null;

  return (
    <div
      style={{
        marginTop: 4,
        padding: 14,
        border: `2px dashed ${skin.ink}33`,
        borderRadius: skin.radius,
        display: "grid",
        gap: 10,
      }}
    >
      <p style={{ margin: 0, fontSize: 13.5, color: skin.muted, lineHeight: 1.45 }}>
        {t("installTexte")}
      </p>
      <button
        type="button"
        onClick={() => (ios ? setModeEmploi((v) => !v) : void promptInstall())}
        aria-expanded={ios ? modeEmploi : undefined}
        style={{
          fontFamily: skin.fontDisplay,
          fontWeight: 800,
          fontSize: 14.5,
          cursor: "pointer",
          border: `${skin.border}px solid ${skin.ink}`,
          background: skin.paper,
          color: skin.ink,
          padding: "11px 15px",
          borderRadius: skin.radius - 4,
          justifySelf: "start",
        }}
      >
        {t("installCta")}
      </button>
      {ios && modeEmploi ? (
        // ⚠️ TRADUIT, contrairement au conseil iOS de la coquille Placet qui est
        // écrit en dur en français sur toutes les pages. Les noms des deux
        // boutons de Safari changent avec la langue du téléphone.
        <p style={{ margin: 0, fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
          {t.rich("installIos", { b: (c) => <b style={{ color: skin.ink }}>{c}</b> })}
        </p>
      ) : null}
    </div>
  );
}
