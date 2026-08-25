"use client";

// LA JOURNÉE PRÉCÉDENTE DE CINQ SUR CINQ — un bouton, et le classement arrêté.
//
// Demandé : « même chose dans 5 sur 5, un bouton pour avoir les données de la
// journée précédente ». Le jeu n'avait AUCUNE relecture de la veille : ses trois
// modales sont la méthode, l'intro du jour et les pictos, et une partie finie
// disparaissait avec sa journée.
//
// ⚠️ IL NE DEMANDE RIEN À LA BASE POUR SAVOIR QUELLE JOURNÉE MONTRER,
// contrairement à Banalo. Là-bas les réponses vivent en base, donc seule la base
// sait ce que ce joueur a joué (`scrutin_banalo_derniere`). Ici le résumé des
// victoires vit dans le navigateur (`placet.pays.resultats`, la seule mémoire
// longue du jeu) : on y lit la dernière journée gagnée AVANT aujourd'hui, sans
// un aller-retour de plus.
//
// ⚠️ CONSÉQUENCE ASSUMÉE : sur un appareil neuf, ce bloc ne sort pas, même pour
// un joueur connecté dont les parties sont rattachées à son compte. Le rendre
// exact partout demanderait une fonction « dernière journée jouée » côté base,
// c'est-à-dire le chemin de Banalo — pour un bloc de relecture, le prix n'en
// vaut pas la peine tant que personne ne l'a signalé.
//
// ⚠️ ET IL NE SORT QU'UNE FOIS LA PARTIE DU JOUR GAGNÉE, comme le tableau du
// jour : §16 interdit la moindre distraction pendant la manche, et relire hier
// pendant qu'on cherche aujourd'hui en est une.
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { PAYS_SKIN as skin } from "@/lib/games/skin";
import { GBtn, GCard, GLabel } from "@/components/games/ui";
import Modale from "@/components/games/Modale";
import ListeDuTableau from "@/components/games/ListeDuTableau";
import { monJetonPays } from "@/lib/games/pays/jeton";
import { lisResultats } from "@/lib/games/pays/local";
import { litTableauPays } from "@/lib/db/pays";
import type { Tableau } from "@/lib/db/banalo";

/** Cinq lignes, comme chez Banalo : c'est une carte de relecture, pas l'écran du jour. */
const LIGNES = 5;

export default function JourneePrecedente({ jour }: { jour: number }) {
  const t = useTranslations("Pays");
  const [precedente, setPrecedente] = useState<{ jour: number; essais: number } | null>(null);
  const [tableau, setTableau] = useState<Tableau | null>(null);
  const [ouvert, setOuvert] = useState(false);

  // ⚠️ APRÈS LE MONTAGE. `lisResultats` touche le `localStorage` : le lire au
  // rendu serveur rendrait une liste vide, et l'hydratation la changerait.
  useEffect(() => {
    const passees = lisResultats().filter((r) => r.jour < jour);
    const derniere = passees[passees.length - 1];
    setPrecedente(derniere ? { jour: derniere.jour, essais: derniere.essais } : null);
  }, [jour]);

  useEffect(() => {
    if (!precedente) return;
    const jeton = monJetonPays();
    if (!jeton) return;
    let vivant = true;
    // ⚠️ UN SEUL INSCRIT SUFFIT : la journée est close, donc ce qu'on montre est
    // un relevé et non une récompense. L'écran du jour, lui, garde son plancher
    // de deux.
    void litTableauPays(jeton, precedente.jour, 1).then((tb) => {
      if (vivant) setTableau(tb);
    });
    return () => {
      vivant = false;
    };
  }, [precedente]);

  const essaisEnMots = useMemo(() => (n: number) => t("tableau.essais", { n }), [t]);

  // ⚠️ RIEN À RELIRE, RIEN À MONTRER. Un bloc « vous n'avez pas joué hier » est
  // un reproche adressé à quelqu'un qui vient précisément de revenir.
  if (!precedente) return null;

  return (
    <div style={{ marginTop: 20 }}>
      <GCard skin={skin} padding={15}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          <GLabel skin={skin}>{t("derniereTitre")}</GLabel>
          <span style={{ fontSize: 12, fontWeight: 700, color: skin.muted }}>
            {t("numero", { n: precedente.jour })}
          </span>
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 17, fontWeight: 800, fontFamily: skin.fontDisplay }}>
          {t("tableau.essais", { n: precedente.essais })}
        </p>
        {/* ⚠️ ON DIT QUE C'EST ARRÊTÉ. Sans cette phrase, le joueur ne peut pas
            distinguer un classement définitif d'un classement provisoire — et
            c'est elle qui tient lieu de notification, puisqu'il n'y en a pas. */}
        <p style={{ margin: "10px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
          {t("derniereClose")}
        </p>
        {/* ⚠️ LE BOUTON NE SORT QUE S'IL Y A QUELQUE CHOSE DERRIÈRE. Un tiroir
            qui s'ouvre sur une carte vide est pire que pas de tiroir du tout :
            `PAS D'ACCROCHE SANS BOUTON`, la règle d'`InstallJeu`. */}
        {tableau && tableau.lignes.length > 0 ? (
          <div style={{ marginTop: 12 }}>
            <GBtn skin={skin} variant="ghost" onClick={() => setOuvert(true)}>
              {t("derniereBouton")}
            </GBtn>
          </div>
        ) : null}
      </GCard>

      {ouvert && tableau ? (
        <Modale
          skin={skin}
          titre={t("derniereTitre")}
          texte={t("numero", { n: precedente.jour })}
          fermer={() => setOuvert(false)}
          fermerLabel={t("derniereFermer")}
        >
          <GLabel skin={skin}>{t("derniereClassement")}</GLabel>
          <ListeDuTableau
            skin={skin}
            lignes={tableau.lignes}
            moi={tableau.moi}
            score={essaisEnMots}
            max={LIGNES}
            effectif={t("derniereInscrits", { n: tableau.inscrits })}
          />
        </Modale>
      ) : null}
    </div>
  );
}
