"use client";

// « ÊTRE PRÉVENU », ET L'INSTALLATION QUAND C'EST LE PRIX À PAYER.
//
// ⚠️ CE BLOC FAISAIT DEUX PROMESSES DONT UNE ÉTAIT FAUSSE. Il annonçait
// « installer LE JEU » et « l'avoir sur l'écran d'accueil » — or il n'existe
// qu'UNE application : `manifest.ts` porte `start_url: "/"` et le nom
// « Placet ». Le joueur obtenait donc une icône Placet ouvrant l'accueil de
// Placet, pas son jeu. Le texte dit maintenant ce que l'installation fait
// vraiment, et le manifeste a gagné des raccourcis vers les deux jeux.
//
// ⚠️ ET IL NE DEMANDAIT RIEN DE CE QUI FAIT REVENIR. L'installation est un
// engagement sans contrepartie visible ; la NOTIFICATION est le seul mécanisme
// du produit qui FABRIQUE un retour au lieu de l'espérer. Elle vivait sur
// `/games/quotidien`, la page que les joueurs ne visitent pas. Les deux sont
// fusionnées ici — pas empilées : §0 de `docs/regularite-des-joueurs.md` donne
// UNE place à l'après-partie, et cette carte en occupe une seule.
//
// ⚠️ SUR iOS, LES DEUX NE SONT MÊME PAS DEUX GESTES. Le push web n'y existe que
// pour une application posée sur l'écran d'accueil : « installer » EST « être
// prévenu ». C'est ce qui donne enfin une raison à une demande qui n'en avait
// pas.
//
// ⚠️ UNE SEULE DEMANDE À LA FOIS, ET DANS CET ORDRE : la notification d'abord
// quand elle est possible (elle rapporte au joueur), l'installation ensuite.
// Ailleurs qu'iOS, le push marche SANS installer — proposer les deux ferait deux
// boutons pour un créneau qui n'en admet qu'un.
//
// ⚠️ ET LES NOTIFICATIONS EXIGENT UN COMPTE : les réglages et la tournée
// d'envoi sont indexés sur `user_id`. Sans compte, ce bloc retombe donc sur
// l'installation seule — ce qui tombe bien, puisque l'échelle du §0 place déjà
// l'offre de compte AVANT celle-ci.
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/useAuth";
import { useInstall } from "@/lib/pwa/install";
import { abonnementDIci, notifyDeployed, subscribeNotifications } from "@/lib/pwa/notify";
import type { GameSkin } from "@/lib/games/skin";

export default function InstallJeu({ skin }: { skin: GameSkin }) {
  const t = useTranslations("Games");
  // ⚠️ LES PHRASES DE NOTIFICATION VIENNENT DE LEUR NAMESPACE, PAS D'UNE COPIE.
  // Elles sont déjà écrites pour l'écran de réglages ; les redire ici en
  // ferait deux versions qui divergeraient — le défaut qui a produit les trois
  // offres de compte. Un alias, jamais une clé en variable : le contrôle de
  // parité ne voit que les clés en clair.
  const tn = useTranslations("NotifsJeux");
  const { user } = useAuth();
  const { canPrompt, standalone, ios, promptInstall } = useInstall();
  const [modeEmploi, setModeEmploi] = useState(false);
  const [ici, setIci] = useState<boolean | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [rate, setRate] = useState<"denied" | "erreur" | null>(null);

  useEffect(() => {
    let vivant = true;
    void abonnementDIci().then((a) => {
      if (vivant) setIci(a);
    });
    return () => {
      vivant = false;
    };
  }, []);

  const abonne = useCallback(async () => {
    setEnvoi(true);
    setRate(null);
    const r = await subscribeNotifications();
    setEnvoi(false);
    if (r === "ok") {
      setIci(true);
      return;
    }
    // ⚠️ UN REFUS DE PERMISSION N'EST PAS UNE PANNE : il ne se redemande pas
    // depuis la page, là où un échec se réessaie. Les replier l'un sur l'autre
    // ferait recommencer un geste que le navigateur ne reproposera plus.
    setRate(r === "denied" ? "denied" : "erreur");
  }, []);

  /**
   * Ce que cette carte demande — une chose, ou rien.
   *
   * `notif`    : activer les notifications ici (installé, ou hors iOS).
   * `installe` : installer, parce que c'est le prix du push (iOS) ou la seule
   *              chose qui reste à offrir.
   * `null`     : il n'y a rien à demander, et la carte disparaît.
   */
  const notifPossible = notifyDeployed() && Boolean(user) && ici === false && rate !== "denied";
  const installable = !standalone && (canPrompt || ios);
  const demande = notifPossible && (standalone || !ios) ? "notif" : installable ? "installe" : null;

  // ⚠️ ON NE REND RIEN TANT QUE LA LECTURE DE L'ABONNEMENT N'EST PAS REVENUE :
  // une carte « installer » affichée une demi-seconde puis remplacée par
  // « être prévenu » clignote à l'endroit exact où l'œil se pose.
  if (ici === null && notifyDeployed() && user) return null;
  if (!demande && rate !== "denied") return null;

  const surIos = demande === "installe" && ios;

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
      {/* ⚠️ PAS D'ACCROCHE SANS BOUTON. Quand la permission vient d'être
          refusée et qu'il n'y a rien à installer, `demande` vaut `null` : la
          carte ne garde que la phrase qui explique le refus. Vu à l'écran — la
          première version servait « Placet sur votre écran d'accueil » sous un
          refus de notification, sans le moindre geste à faire.

          Chaque branche porte sa clé EN CLAIR. Sur iOS non installé, la phrase
          dit la RAISON d'installer — être prévenu — au lieu de demander un
          geste sans contrepartie. */}
      {demande ? (
        <p style={{ margin: 0, fontSize: 13.5, color: skin.muted, lineHeight: 1.45 }}>
          {demande === "notif"
            ? tn("offreTexte")
            : surIos && notifyDeployed() && user
              ? t("installPourNotif")
              : t("installTexte")}
        </p>
      ) : null}

      {demande === "notif" ? (
        <button
          type="button"
          onClick={() => void abonne()}
          disabled={envoi}
          style={{
            fontFamily: skin.fontDisplay,
            fontWeight: 800,
            fontSize: 14.5,
            cursor: envoi ? "default" : "pointer",
            border: `${skin.border}px solid ${skin.ink}`,
            background: skin.paper,
            color: skin.ink,
            padding: "11px 15px",
            borderRadius: skin.radius - 4,
            justifySelf: "start",
            opacity: envoi ? 0.5 : 1,
          }}
        >
          {envoi ? "…" : tn("activer")}
        </button>
      ) : demande === "installe" ? (
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
      ) : null}

      {surIos && modeEmploi ? (
        // ⚠️ TRADUIT, contrairement au conseil iOS de la coquille Placet qui est
        // écrit en dur en français sur toutes les pages. Les noms des deux
        // boutons de Safari changent avec la langue du téléphone.
        <p style={{ margin: 0, fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
          {t.rich("installIos", { b: (c) => <b style={{ color: skin.ink }}>{c}</b> })}
        </p>
      ) : null}

      {rate ? (
        <p role="alert" style={{ margin: 0, fontSize: 13, fontWeight: 700, lineHeight: 1.45 }}>
          {rate === "denied" ? tn("refusee") : tn("echec")}
        </p>
      ) : null}
    </div>
  );
}
