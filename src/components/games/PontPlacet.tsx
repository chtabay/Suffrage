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
// ⚠️ CE BLOC ÉTAIT DU CODE MORT, ET PERSONNE NE POUVAIT LE VOIR. Il exige
// `connecte`, et les deux jeux le montaient APRÈS un `if (user) return …` —
// c'est-à-dire dans la seule branche où `user` est forcément absent. Sur Banalo
// du jour comme sur Cinq sur cinq, `ouvert` valait donc faux à tous les coups,
// depuis le premier jour. La seule trace de Placet sur un écran de résultat
// restait une phrase grise de 13 px, générique et identique tous les jours —
// exactement ce que ce fichier existe pour remplacer.
//
// ⚠️ ET LA GARDE `!installPossible` EST TOMBÉE AVEC. Elle plaçait le pont
// derrière l'installation, qui est possible sur Chrome Android, sur iOS et sur
// Chrome bureau : même bien monté, il n'aurait paru que chez quelqu'un ayant
// déjà installé l'application, ou sur Firefox. Deux verrous pour un bloc que
// personne n'a jamais vu.
//
// ⚠️ CE N'EST PAS UNE DEMANDE DE PLUS DANS L'ÉCHELLE DU §0, et c'est ce qui
// autorise à le montrer à côté de l'installation. L'échelle arbitre des
// ENGAGEMENTS — créer un compte, installer, accepter d'être prévenu. Un scrutin
// public est du CONTENU : il change tous les jours, il ne réclame aucun lien
// durable, et il se lit sans rien accepter. Il vit donc DANS la carte des
// résultats, dans la matière de cette carte, pendant que la seule demande de
// l'écran reste le cadre pointillé en dessous.
//
//   moins de deux journées jouées  → rien (la première demande se mérite)
//   pas de compte                  → rien, c'est l'offre de compte qui parle
//   sinon                          → un scrutin public, votable en un tap
//
// ⚠️ ET RIEN AVANT LA FIN DE LA PARTIE. L'écran d'avant-jeu a une tâche et une
// seule — `GameShell` le dit déjà : « On vient jouer. » Ce composant n'est
// monté que par les écrans de résultat.
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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
  const [carte, setCarte] = useState<PublicPollCard | null>(null);

  const ouvert = connecte && journees >= JOURNEES_MIN;

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
    // ⚠️ PLUS DE CADRE POINTILLÉ : c'est la matière des OFFRES du produit
    // (`InstallJeu`, `ApresLaSalle`), et l'emprunter ferait lire ce bloc comme
    // une demande de plus. Il vit dans la carte des résultats, séparé par un
    // filet, dans la matière de cette carte — comme la légende ou le lien vers
    // l'historique juste au-dessus.
    <div
      style={{
        marginTop: 12,
        paddingTop: 12,
        borderTop: `2px dashed ${skin.ink}22`,
        display: "grid",
        gap: 7,
      }}
    >
      {/* ⚠️ L'INTRODUCTION PARLE DE CE QUE LE JOUEUR VIENT DE FAIRE, pas du
          produit : « ce jeu vous note contre la foule, Placet sert à décider
          avec elle ». C'est ce qui distingue une continuation d'une réclame — et
          c'est la QUESTION, en dessous, qui porte la taille, parce que c'est
          elle qui change tous les jours. */}
      <p style={{ margin: 0, fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>{t("pontIntro")}</p>
      <Link
        href={lien}
        style={{
          fontFamily: skin.fontDisplay,
          fontWeight: 800,
          fontSize: 16.5,
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
