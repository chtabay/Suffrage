"use client";

// L'OFFRE DE S'ABONNER AUX NOTIFICATIONS — sortie de `Notifications`.
//
// ⚠️ ELLE EN EST SORTIE PARCE QU'ELLE VIT MAINTENANT À DEUX ENDROITS : l'onglet
// « mes résultats », où elle a toujours été, et la modale qui demande son nom à
// la fin d'une partie. Recopier le bouton aurait produit deux offres qui
// dérivent — le chemin qu'avaient pris les trois offres de compte, la règle du
// mot orphelin et le calcul des scores. Ce qui se partage est la plomberie et
// les trois empêchements ; la PHRASE, elle, voyage en paramètre, parce que la
// raison de s'abonner n'est pas la même dans les deux écrans.
//
// ⚠️ ET `Notifications` GARDE LES INTERRUPTEURS. Ce composant n'offre que de
// s'ABONNER : la modale n'est pas un écran de réglages, et trois interrupteurs
// dans une boîte qui demande un nom seraient une quatrième demande.
//
// ⚠️ RIEN N'EST VÉRIFIABLE ICI — ni la permission, ni l'envoi, ni le rendu par
// le système. Et sans clé VAPID (le `.env.local` du conteneur n'en a pas)
// `notifyDeployed()` est faux, donc ce bloc est INVISIBLE en développement. Ce
// qui est éprouvé au navigateur, c'est qu'il ne s'affiche pas — pas qu'il
// marche.
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { GameSkin } from "@/lib/games/skin";
import { GBtn } from "@/components/games/ui";
import { useInstall } from "@/lib/pwa/install";
import { abonnementDIci, notifyDeployed, subscribeNotifications, useNotify } from "@/lib/pwa/notify";
import { reglagesNotifs } from "@/lib/db/jeux";

export default function OffreNotifs({
  skin,
  uid,
  appareils,
  texte,
  onAbonne,
}: {
  skin: GameSkin;
  /**
   * Le compte. `null` ⇒ rien.
   *
   * ⚠️ LES NOTIFICATIONS EXIGENT UN COMPTE — réglages et tournée sont indexés
   * sur `user_id`. Offrir le bouton à un anonyme promettrait quelque chose que
   * la base ne saurait pas lui envoyer.
   */
  uid: string | null;
  /**
   * Combien d'appareils de ce compte sont déjà abonnés. Chargé ici si absent.
   *
   * ⚠️ L'APPELANT PEUT LE PASSER POUR ÉVITER UN SECOND ALLER-RETOUR : l'onglet
   * des réglages a déjà lu cette valeur pour ses interrupteurs, et la relire
   * doublerait le trafic de la page pour une réponse identique.
   */
  appareils?: number;
  /**
   * Pourquoi s'abonner, en une phrase.
   *
   * ⚠️ ELLE ARRIVE DE L'APPELANT : dans l'onglet des réglages on explique le
   * dispositif, dans la modale de fin de partie on répond à la question que le
   * joueur vient de se poser — « quand est-ce que je saurai comment ça s'est
   * terminé ? ». Le texte voyage, pas la clé : une clé prise en variable
   * échapperait au contrôle de parité i18n.
   */
  texte?: string;
  /** Prévient l'appelant qu'un abonnement vient d'être posé. */
  onAbonne?: () => void;
}) {
  const t = useTranslations("NotifsJeux");
  const { supported, permission } = useNotify();
  const { ios } = useInstall();

  const [ici, setIci] = useState<boolean | null>(null);
  const [combien, setCombien] = useState<number | null>(appareils ?? null);
  const [envoi, setEnvoi] = useState(false);
  const [rate, setRate] = useState<"denied" | "erreur" | null>(null);

  // ⚠️ ON DÉPEND DE L'IDENTIFIANT, PAS DE L'OBJET `user` : `useAuth` rend un
  // objet dont la référence change à chaque relecture de session, et un effet
  // qui en dépend se relance en boucle en coupant sa propre réponse.
  const lu = useRef<string | null>(null);
  useEffect(() => {
    if (!uid || appareils !== undefined || lu.current === uid) return;
    lu.current = uid;
    let vivant = true;
    void reglagesNotifs().then((r) => {
      if (vivant) setCombien(r?.appareils ?? 0);
    });
    return () => {
      vivant = false;
    };
  }, [uid, appareils]);

  useEffect(() => {
    let vivant = true;
    void abonnementDIci().then((a) => {
      if (vivant) setIci(a);
    });
    return () => {
      vivant = false;
    };
  }, [permission]);

  const abonne = useCallback(async () => {
    setEnvoi(true);
    setRate(null);
    const r = await subscribeNotifications();
    setEnvoi(false);
    if (r !== "ok") {
      // ⚠️ UN REFUS DE PERMISSION N'EST PAS UNE PANNE, et les deux n'appellent
      // pas le même geste : un refus ne se redemande pas depuis la page — il se
      // lève dans les réglages du navigateur — là où un échec se réessaie.
      setIci(false);
      setRate(r === "denied" ? "denied" : "erreur");
      return;
    }
    setIci(true);
    onAbonne?.();
  }, [onAbonne]);

  if (!uid) return null;
  // ⚠️ SANS CLÉ VAPID, RIEN. La plomberie n'est pas déployée, donc l'abonnement
  // échouerait : un bloc qui s'excuse vaut moins qu'un bloc absent.
  if (!notifyDeployed()) return null;
  // Déjà abonné ICI, ou pas encore su : dans les deux cas on se tait.
  if (ici !== false || combien === null) return null;

  /**
   * Ce qui manque à CET appareil, dit en une phrase — jamais un silence.
   *
   * ⚠️ TROIS EMPÊCHEMENTS, TROIS PHRASES, parce qu'ils appellent trois gestes
   * différents : sur iPhone il faut d'abord installer le jeu (le push web n'y
   * existe que pour une application posée sur l'écran d'accueil) ; un refus déjà
   * donné ne se redemande pas depuis la page ; et un navigateur qui ne sait pas
   * faire ne saura pas mieux en réessayant. Un bouton servi dans l'un de ces
   * trois cas serait un bouton mort.
   */
  const empechement =
    ios ? t("iosInstaller") : permission === "denied" ? t("refusee") : !supported ? t("nonSupporte") : null;

  return (
    <div>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: skin.muted, maxWidth: "48ch" }}>
        {/* ⚠️ « CET APPAREIL », PAS « VOUS ». Les réglages sont par compte,
            l'abonnement est par navigateur : quelqu'un d'abonné sur son
            ordinateur lirait « vous n'êtes pas abonné » comme un effacement de
            ce qu'il vient de faire ailleurs. */}
        {combien > 0 ? t("ailleursTexte", { n: combien }) : (texte ?? t("offreTexte"))}
      </p>
      {empechement ? (
        <p style={{ margin: "10px 0 0", fontSize: 13.5, lineHeight: 1.5, fontWeight: 700 }}>{empechement}</p>
      ) : (
        <div style={{ marginTop: 12 }}>
          <GBtn skin={skin} onClick={() => void abonne()} disabled={envoi}>
            {envoi ? "…" : t("activer")}
          </GBtn>
          {rate && (
            <p
              role="alert"
              style={{ margin: "10px 0 0", fontSize: 13.5, lineHeight: 1.5, fontWeight: 700, maxWidth: "44ch" }}
            >
              {rate === "denied" ? t("refusee") : t("echec")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
