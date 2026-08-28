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
import AideModale from "@/components/games/Modale";
import { GBtn } from "@/components/games/ui";

export default function InstallJeu({ skin, quand, fermerLabel }: {
  skin: GameSkin;
  /**
   * Quand la prochaine notification arriverait, en clair — « demain à 11 h 30 ».
   *
   * ⚠️ ELLE VIENT DE L'APPELANT PARCE QUE LES DEUX JEUX N'ONT PAS LA MÊME
   * CHARNIÈRE : 11 h 30 pour Banalo, minuit pour Cinq sur cinq. La calculer ici
   * demanderait une quatrième copie de l'origine du calendrier. Absente, la
   * barre dit la promesse sans l'heure — jamais une heure inventée.
   */
  quand?: string;
  /** Libellé de fermeture du tiroir, dans le vocabulaire de l'appelant. */
  fermerLabel: string;
}) {
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
  const [ouvert, setOuvert] = useState(false);
  // ⚠️ LA RÉUSSITE SE DIT, ELLE NE FAIT PAS DISPARAÎTRE LA BOÎTE. Une fois
  // abonné, `demande` retombe à null et tout ce composant s'effacerait : le
  // joueur presserait un bouton et verrait le bloc s'évanouir, ce qui est
  // indiscernable d'une panne — le défaut déjà payé sur le dépôt du pseudo.
  const [succes, setSucces] = useState(false);

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
      setSucces(true);
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
  if (!demande && rate !== "denied" && !succes) return null;

  const surIos = demande === "installe" && ios;

  // ⚠️ ABONNEMENT POSÉ : ON LE CONFIRME, ET ON S'ARRÊTE LÀ. `demande` vient de
  // retomber, donc sans ce retour le composant s'effacerait sous le doigt — ou
  // pire, enchaînerait sur « Installer », c'est-à-dire une deuxième demande
  // dans un créneau que §0 n'accorde qu'une fois.
  if (succes) {
    return ouvert ? (
      <AideModale
        skin={skin}
        titre={tn("titre")}
        texte={tn("activee")}
        fermer={() => setOuvert(false)}
        fermerLabel={fermerLabel}
      />
    ) : null;
  }

  // ⚠️ UN REFUS DE PERMISSION NE MÉRITE PAS UNE BARRE : il n'y a plus aucun
  // geste à faire ici (le navigateur ne redemandera pas), donc une barre qui
  // ouvre une boîte pour annoncer un refus serait une accroche sans bouton —
  // la règle de ce fichier. Il reste la phrase, et rien d'autre.
  if (!demande) {
    return (
      <p role="alert" style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 700, lineHeight: 1.45, color: skin.muted }}>
        {tn("refusee")}
      </p>
    );
  }

  // Le libellé de la barre porte la PROMESSE, pas l'organe. « Être prévenu
  // demain à 11 h 30 » se décide ; « Notifications » se subit. Sans charnière
  // fournie par l'appelant, on retombe sur la formule sans heure — jamais sur
  // une heure inventée, les deux jeux n'ayant pas la même (11 h 30 et minuit).
  const libelle =
    demande === "notif"
      ? quand
        ? tn("barreQuand", { quand })
        : tn("barreOffre")
      : t("installCta");

  return (
    <>
      {/* La barre : une seule ligne, tout le reste dans le tiroir. Elle remplace
          une carte à cadre pointillé de quatre éléments empilés — sur un écran
          d'après-partie qui fait plus de deux mille pixels, ce qui se répète à
          l'identique chaque jour doit tenir en une ligne. */}
      <button
        type="button"
        onClick={() => setOuvert(true)}
        style={{
          display: "flex",
          width: "100%",
          minHeight: 54,
          alignItems: "center",
          gap: 12,
          marginTop: 4,
          padding: "11px 14px",
          border: `${skin.border}px solid ${skin.ink}`,
          borderRadius: skin.radius,
          // ⚠️ `paper`, PAS `accent` : le cadre pointillé qu'elle remplace était
          // la matière des offres discrètes, et §0 ne lui accorde qu'un barreau.
          // En accent elle rivaliserait avec l'offre de compte, qui le porte.
          background: skin.paper,
          color: skin.ink,
          textAlign: "left",
          cursor: "pointer",
          fontFamily: skin.fontBody,
        }}
      >
        <span
          aria-hidden="true"
          style={{ display: "grid", placeItems: "center", flex: "0 0 30px", width: 30, height: 30, border: `2px solid ${skin.ink}`, borderRadius: "50%", background: skin.bg }}
        >
          {demande === "notif" ? (
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" />
              <path d="m7 11 5 5 5-5" />
              <path d="M4 20h16" />
            </svg>
          )}
        </span>
        <span style={{ flex: 1, fontFamily: skin.fontDisplay, fontSize: 14.5, fontWeight: 800, lineHeight: 1.35 }}>{libelle}</span>
        <span aria-hidden="true" style={{ fontSize: 23, fontWeight: 800, lineHeight: 1 }}>›</span>
      </button>

      {ouvert ? (
        <AideModale
          skin={skin}
          // ⚠️ LE TITRE DIT LE BUT, LE BOUTON DIT LE GESTE. Titrer le tiroir
          // « Installer Placet » au-dessus d'un bouton « Installer Placet »
          // imprimait deux fois la même phrase à trois lignes d'écart — et une
          // troisième dans la barre qu'on vient de toucher. Vu à l'écran.
          titre={demande === "notif" ? tn("titre") : t("installTitre")}
          texte={
            demande === "notif"
              ? tn("offreTexte")
              : surIos && notifyDeployed() && user
                ? t("installPourNotif")
                : t("installTexte")
          }
          fermer={() => setOuvert(false)}
          fermerLabel={fermerLabel}
          fermerDiscret
        >
          <div style={{ display: "grid", gap: 10 }}>
            <GBtn
              skin={skin}
              variant="accent"
              size="lg"
              onClick={() => (demande === "notif" ? void abonne() : ios ? setModeEmploi((v) => !v) : void promptInstall())}
              disabled={envoi}
              style={{ width: "100%" }}
            >
              {envoi ? "…" : demande === "notif" ? tn("activer") : t("installCta")}
            </GBtn>

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
        </AideModale>
      ) : null}
    </>
  );
}
