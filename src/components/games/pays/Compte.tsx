"use client";

// LE COMPTE — proposé à la victoire, jamais avant, et jamais obligatoire.
//
// TROIS RÈGLES, dans cet ordre :
//
// 1. **On ne demande rien à quelqu'un qui n'a rien gagné.** Ce bloc n'existe
//    qu'APRÈS la révélation, sous le partage. Le §16 de la spec range les
//    comptes obligatoires dans les non-objectifs, et une invitation posée avant
//    la première partie serait exactement le péage que le jeu promet de ne pas
//    mettre.
//
// 2. **On propose de GARDER quelque chose qui existe déjà.** La série est
//    calculée dans le navigateur dès la deuxième journée, sans compte. Le joueur
//    voit donc ce qu'il a avant qu'on lui parle de le sauvegarder — l'inverse
//    (« créez un compte pour commencer à cumuler ») demande de croire sur
//    parole.
//
// 3. **Ce qu'on montre à un connecté n'est jamais nominatif.** Le rang est une
//    position et un effectif : « 12e sur 47 ». Il n'existe aucun appel, dans ce
//    fichier ni derrière lui, qui rende le nom d'un autre joueur.
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { enregistreResultats, maPosition, monBilan, rattachePays, type BilanPays, type RangPays } from "@/lib/db/pays";
import { lisResultats, serieEnCours } from "@/lib/games/pays/local";
import type { GameSkin } from "@/lib/games/skin";
import { GCard, GLabel } from "@/components/games/ui";
import ConnexionJeux from "@/components/games/ConnexionJeux";
import SerieDuJour from "@/components/games/SerieDuJour";
import PontPlacet from "@/components/games/PontPlacet";

// ⚠️ CE BLOC LIT SES TEXTES LUI-MÊME, contrairement à `Revelation` qui les
// reçoit en props. La raison est concrète : deux de ses libellés dépendent de
// données qui n'arrivent qu'APRÈS un aller-retour réseau (le rang, l'effectif du
// jour). Les faire descendre en props obligeait le parent à pré-formater
// « {rang}e sur {joueurs} » avec de faux arguments, puis le composant à
// remplacer les accolades à la main — un formatage ICU contourné par un
// `replace`, c'est-à-dire une traduction qu'aucun contrôle ne vérifie plus.

export default function Compte({
  skin,
  jour,
  serieLocale,
  essaisDuJour,
}: {
  skin: GameSkin;
  jour: number;
  serieLocale: number;
  /**
   * Ce que le joueur vient de faire, compté dans le navigateur.
   *
   * ⚠️ IL VIENT D'ICI ET PAS DE LA RPC, exprès : un refus ou une coupure réseau
   * rend `monRang()` à `null`, et la règle du dépôt est qu'un NULL de RPC est un
   * REFUS, pas une donnée. Le chiffre du joueur ne doit pas disparaître pour
   * autant — c'est le sien, il est juste, et c'est justement celui qu'on veut
   * mettre en avant. La médiane, elle, ne s'affiche que si le serveur a répondu.
   */
  essaisDuJour: number;
}) {
  const t = useTranslations("Pays");
  const { user, loading } = useAuth();
  const [bilan, setBilan] = useState<BilanPays | null>(null);
  const [rang, setRang] = useState<RangPays | null>(null);
  const rattachePour = useRef<string | null>(null);

  // ⚠️ LE RATTACHEMENT SE FAIT À LA CONNEXION, PAS À L'INSCRIPTION. Quelqu'un qui
  // a joué six jours sans compte puis se connecte doit retrouver ses six jours :
  // on envoie donc TOUT ce que le navigateur a gardé, à chaque fois qu'un compte
  // apparaît. La fonction d'en face est idempotente et garde le meilleur
  // résultat — la répéter ne coûte qu'un aller-retour, et évite d'avoir à retenir
  // si ce navigateur a déjà été rattaché.
  //
  // Même forme que `claimPolls` dans `useAuth` : un `ref` par identifiant de
  // compte, pour ne pas rejouer à chaque rendu.
  useEffect(() => {
    if (!user || rattachePour.current === user.id) return;
    rattachePour.current = user.id;
    let vivant = true;
    void (async () => {
      // ⚠️ DEUX RATTACHEMENTS, ET IL FAUT LES DEUX. Le lot du navigateur porte
      // les parties jouées AVANT que le jeu ne sache écrire en base ; le jeton
      // porte celles d'après. Les deux fonctions gardent le meilleur essai et
      // sont idempotentes, donc les répéter à chaque connexion ne coûte que
      // deux allers-retours.
      await Promise.all([enregistreResultats(lisResultats()), rattachePays()]);
      if (!vivant) return;
      // On ne relit qu'APRÈS avoir écrit : sinon le bilan affiché serait celui
      // d'avant le rattachement, donc faux exactement au moment où il compte.
      const [b, r] = await Promise.all([monBilan(), maPosition(jour)]);
      if (!vivant) return;
      setBilan(b);
      setRang(r);
    })();
    return () => {
      vivant = false;
    };
  }, [user, jour]);


  // Tant qu'on ne sait pas s'il y a un compte, on n'affiche rien : faire
  // clignoter « créez un compte » devant quelqu'un qui en a un est un manque de
  // mémoire, et ça se voit.
  if (loading) return null;

  const ligne = (etiquette: string, valeur: string) => (
    <div key={etiquette} style={{ minWidth: 92 }}>
      <GLabel skin={skin}>{etiquette}</GLabel>
      <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 22, lineHeight: 1.1 }}>{valeur}</div>
    </div>
  );

  if (user) {
    // Le bilan peut être `null` — refus ou réseau. On montre alors ce qu'on sait
    // de source sûre (la série locale) plutôt qu'un tableau de zéros.
    const b = bilan;
    return (
      <GCard skin={skin} padding={15} style={{ marginTop: 12 }} accent={skin.accent2}>
        {/* LA JOURNÉE D'ABORD, ET SON CHIFFRE À LUI.
            
            ⚠️ CE QU'ON MET DEVANT N'EST PLUS LE RANG. Le rang répond à « qui a
            fait mieux que moi », et cette question-là punit deux joueurs sur
            trois pour une raison qui ne leur appartient pas : les journées n'ont
            pas la même difficulté, et se faire dire « 12e » après une partie
            honnête décourage sans rien apprendre. Le nombre d'essais est ce que
            le joueur a VRAIMENT fait, et la médiane du jour lui donne l'échelle
            sans le classer. Le rang reste — il est utile à qui le cherche — mais
            en dessous et en petit.
            
            La médiane était déjà renvoyée par la position du jour et
            n'était affichée nulle part. */}
        <GLabel skin={skin}>{t("compte.jourTitre")}</GLabel>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 8 }}>
          {ligne(t("compte.essaisJour"), String(rang?.essais ?? essaisDuJour))}
          {rang?.median != null && ligne(t("compte.medianeJour"), String(rang.median))}
        </div>
        {rang?.rang != null && rang.joueurs > 0 && (
          <p style={{ margin: "9px 0 0", fontSize: 13, color: skin.muted, lineHeight: 1.45 }}>
            {rang.joueurs > 1 ? t("compte.rang", { rang: rang.rang, joueurs: rang.joueurs }) : t("compte.rangSeul")}
          </p>
        )}

        <GLabel skin={skin} style={{ marginTop: 16 }}>
          {t("compte.bilanTitre")}
        </GLabel>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 8 }}>
          {ligne(t("compte.serieLabel"), String(b?.serie ?? serieLocale))}
          {b && ligne(t("compte.parties"), String(b.parties))}
          {b?.moyenne != null && ligne(t("compte.moyenne"), String(b.moyenne))}
          {b?.meilleur != null && ligne(t("compte.meilleur"), String(b.meilleur))}
        </div>
        {/* LA PORTE DE LA PAGE COMMUNE. ⚠️ Elle ne s'ouvre qu'au-delà d'une
            journée : y envoyer quelqu'un qui n'en a joué qu'une lui montrerait
            une courbe d'un point, c'est-à-dire ce qu'il vient de lire. */}
        {b && b.parties > 1 ? (
          <p style={{ margin: "9px 0 0", fontSize: 13.5 }}>
            <Link href="/games/quotidien" style={{ color: skin.ink, fontWeight: 700 }}>
              {t("compte.mesResultats")}
            </Link>
          </p>
        ) : null}
        <p style={{ margin: "10px 0 0", fontSize: 13.5, color: skin.muted, lineHeight: 1.5 }}>
          {t("compte.placet")}{" "}
          <Link href="/" style={{ color: skin.ink, fontWeight: 700 }}>
            {t("compte.placetLien")}
          </Link>
        </p>
      </GCard>
    );
  }

  return (
    <GCard skin={skin} padding={15} style={{ marginTop: 12 }}>
      {/* Ce qu'il a DÉJÀ, avant qu'on lui demande quoi que ce soit. */}
      <SerieDuJour skin={skin} serie={serieLocale} />
      <GLabel skin={skin}>{t("compte.titre")}</GLabel>
      <p style={{ margin: "7px 0 0", fontSize: 14.5, lineHeight: 1.5, color: skin.muted, maxWidth: "46ch" }}>
        {t("compte.texte")}
      </p>

      <ConnexionJeux skin={skin} />
      <p style={{ margin: "10px 0 0", fontSize: 13, color: skin.muted, lineHeight: 1.5 }}>
        {t("compte.placet")}{" "}
        <Link href="/" style={{ color: skin.ink, fontWeight: 700 }}>
          {t("compte.placetLien")}
        </Link>
      </p>
      {/* ⚠️ RENDU ICI parce que c'est ce bloc qui détient l'état dont dépend
          l'échelle de l'après-partie : compte ou non, et combien de journées.
          Voir `docs/regularite-des-joueurs.md` §0. */}
      <PontPlacet skin={skin} connecte={Boolean(user)} journees={bilan?.parties ?? 0} />
    </GCard>
  );
}
