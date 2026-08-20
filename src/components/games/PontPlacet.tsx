"use client";

// LE PONT VERS PLACET — montrer, pas expliquer.
//
// Trois portes existaient déjà : le pied de page des jeux (« Propulsé par
// Placet »), le paragraphe au bas de `/games` (« Sous ces jeux, il y a
// Placet »), et le bloc compte. Toutes EXPLIQUENT. Celle-ci montre : un vrai
// scrutin public, votable en un tap.
//
// ⚠️ POURQUOI UN SCRUTIN PLUTÔT QU'UNE PRÉSENTATION. Une présentation est
// identique tous les jours ; au troisième passage c'est du mobilier, et un
// joueur régulier la verrait trente fois. Un scrutin change tout seul. Et
// surtout, le joueur vient de donner un avis et d'être noté contre une foule :
// lui proposer une question où son avis DÉCIDE est une continuation, pas une
// interruption.
//
// ⚠️ L'APRÈS-PARTIE N'A QU'UNE PLACE, ET CE BLOC EST LE DERNIER SERVI.
// Il se tait tant qu'une demande plus utile a quelque chose à dire :
//
//   moins de deux journées jouées  → rien (la première demande se mérite)
//   pas de compte                  → rien, c'est l'offre de compte qui parle
//   installation encore possible   → rien, c'est elle qui ramènera demain
//   sinon                          → un scrutin public
//
// Empiler les blocs les ferait se cannibaliser ; l'échelle est écrite dans
// `docs/regularite-des-joueurs.md` §0.
//
// ⚠️ ET RIEN AVANT LA FIN DE LA PARTIE. L'écran d'avant-jeu a une tâche et une
// seule — `GameShell` le dit déjà : « On vient jouer. » Ce composant n'est
// monté que par les écrans de résultat.
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useInstall } from "@/lib/pwa/install";
import { cardIsOpen, getPublicPolls, type PublicPollCard } from "@/lib/db/publicFeed";
import { shareUrl } from "@/lib/db/track";
import type { GameSkin } from "@/lib/games/skin";

/** En dessous, on ne demande rien : le joueur n'a pas encore d'habitude à garder. */
const JOURNEES_MIN = 2;

export default function PontPlacet({
  skin,
  connecte,
  journees,
}: {
  skin: GameSkin;
  /** Le joueur a un compte : l'offre de compte s'est donc déjà tue. */
  connecte: boolean;
  /** Combien de journées ce joueur a déjà jouées. */
  journees: number;
}) {
  const t = useTranslations("Games");
  const { canPrompt, standalone, ios } = useInstall();
  const [carte, setCarte] = useState<PublicPollCard | null>(null);

  // L'installation passe avant : c'est elle qui ramène demain.
  const installPossible = !standalone && (canPrompt || ios);
  const ouvert = connecte && journees >= JOURNEES_MIN && !installPossible;

  useEffect(() => {
    if (!ouvert) return;
    let vivant = true;
    // ⚠️ ON NE DEMANDE LE FEED QUE SI ON VA S'EN SERVIR. Un appel réseau sur
    // chaque écran de résultat, pour un bloc qui ne s'affiche presque jamais,
    // serait une taxe invisible sur tout le monde.
    void getPublicPolls(6)
      .then((cartes) => {
        if (!vivant) return;
        // Un scrutin clos ne se vote pas : l'inviter serait une porte fermée.
        setCarte(cartes.find((c) => cardIsOpen(c)) ?? null);
      })
      .catch(() => {
        // Le pont est un bonus : il disparaît en silence, il ne casse rien.
      });
    return () => {
      vivant = false;
    };
  }, [ouvert]);

  if (!ouvert || !carte) return null;

  // ⚠️ LE LIEN PORTE SON CANAL. Sans `?s=jeu`, on saurait qu'on a affiché une
  // invitation, jamais qu'elle amène quelqu'un — et un bloc qui ne convertit pas
  // resterait là par inertie. `scrutin_track_funnel` compte la visite à
  // l'arrivée, et la création si elle suit.
  const lien = shareUrl(`/v/${carte.token}`, "jeu");

  return (
    <div
      style={{
        marginTop: 4,
        padding: 14,
        border: `2px dashed ${skin.ink}33`,
        borderRadius: skin.radius,
        display: "grid",
        gap: 8,
      }}
    >
      <p style={{ margin: 0, fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>{t("pontIntro")}</p>
      <Link
        href={lien}
        style={{
          fontFamily: skin.fontDisplay,
          fontWeight: 800,
          fontSize: 16,
          lineHeight: 1.3,
          color: skin.ink,
          textDecoration: "none",
          textWrap: "balance",
        }}
      >
        {carte.question}
      </Link>
      <Link
        href={lien}
        style={{ fontSize: 13.5, fontWeight: 700, color: skin.accent, textDecoration: "none" }}
      >
        {t("pontCta")} →
      </Link>
    </div>
  );
}
