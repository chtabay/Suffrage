"use client";

// LES RÉGLAGES DE NOTIFICATION DES JEUX QUOTIDIENS — et l'offre de s'abonner.
//
// ⚠️ ELLE EST ICI ET PAS APRÈS UNE PARTIE, et c'est un choix, pas un oubli.
// L'après-partie n'a QU'UNE place (`docs/regularite-des-joueurs.md` §0) et son
// échelle de priorité est déjà pleine : compte, puis installation, puis Placet.
// Y glisser une quatrième demande déplacerait l'une des trois en silence. Ici,
// le joueur est venu voir ses résultats — il n'a pas de partie en cours, rien ne
// lui est demandé par ailleurs, et c'est le seul écran du produit où « quand
// est-ce que je saurai ? » est déjà la question qu'il se pose.
//
// ⚠️ ET S'ABONNER EST LE CONSENTEMENT : les trois genres sont VRAIS par défaut.
// La permission du navigateur ne se demande qu'une fois et un refus est quasi
// définitif ; quelqu'un qui vient de l'accorder ne l'a pas fait pour ne rien
// recevoir. Ces interrupteurs servent à en RETIRER, pas à en ajouter.
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { PLACET_GAMES_SKIN as skin } from "@/lib/games/skin";
import { GCard, GLabel } from "@/components/games/ui";
import { abonnementDIci, notifyDeployed } from "@/lib/pwa/notify";
import OffreNotifs from "@/components/games/OffreNotifs";
import { reglagesNotifs, reglerNotif, type GenreNotif, type ReglagesNotifs } from "@/lib/db/jeux";

type Etat = "charge" | "prete" | "envoi" | "panne";

export default function Notifications({ uid }: { uid: string | null }) {
  const t = useTranslations("NotifsJeux");

  const [reglages, setReglages] = useState<ReglagesNotifs | null>(null);
  const [etat, setEtat] = useState<Etat>("charge");
  const [ici, setIci] = useState<boolean | null>(null);

  // ⚠️ ON DÉPEND DE L'IDENTIFIANT, PAS DE L'OBJET `user`. `useAuth` rend un objet
  // dont la référence change à chaque relecture de session : un effet qui en
  // dépend se relance en boucle et son ménage coupe la réponse précédente avant
  // qu'elle n'arrive. Défaut déjà payé sur `MonHistorique`, invisible à tsc.
  const charge = useRef<string | null>(null);
  useEffect(() => {
    if (!uid || charge.current === uid) return;
    charge.current = uid;
    let vivant = true;
    void reglagesNotifs().then((r) => {
      if (!vivant) return;
      setReglages(r);
      setEtat(r ? "prete" : "panne");
    });
    return () => {
      vivant = false;
    };
  }, [uid]);

  // ⚠️ CET APPAREIL EST-IL ABONNÉ ? `OffreNotifs` le sait pour elle-même ; cette
  // carte en a besoin pour l'ESPACE au-dessus des interrupteurs — l'offre
  // au-dessus d'eux est présente ou non, et la marge suit.
  useEffect(() => {
    let vivant = true;
    void abonnementDIci().then((a) => {
      if (vivant) setIci(a);
    });
    return () => {
      vivant = false;
    };
  }, []);

  const bascule = useCallback(
    async (genre: GenreNotif, actif: boolean) => {
      // ⚠️ ON PEINT L'INTERRUPTEUR AVANT LA RÉPONSE, ET ON LE REMET SI ELLE
      // ÉCHOUE. Un interrupteur qui met une seconde à bouger se lit comme un
      // bouton mort, et on le presse deux fois — c'est exactement le défaut
      // qu'un vrai joueur a signalé sur le dépôt du pseudo.
      setReglages((r) => (r ? { ...r, [genre]: actif } : r));
      const frais = await reglerNotif(genre, actif);
      if (frais) setReglages(frais);
      else setReglages((r) => (r ? { ...r, [genre]: !actif } : r));
    },
    [],
  );

  if (!uid) return null;
  // ⚠️ SANS CLÉ VAPID, RIEN. Ce n'est pas un réglage qu'on cache : la plomberie
  // n'est pas déployée, donc l'abonnement échouerait et les interrupteurs ne
  // commanderaient rien. Un bloc qui s'excuse vaut moins qu'un bloc absent.
  if (!notifyDeployed()) return null;
  if (etat === "charge") return null;
  if (etat === "panne" || !reglages) {
    return (
      // ⚠️ LA CARTE DE PANNE PORTE LE MÊME TITRE QUE LES RÉGLAGES. Vu à l'écran :
      // sans lui, « Impossible de lire vos réglages » flotte sous les deux
      // cartes de jeu sans que rien ne dise DE QUELS réglages il s'agit — et la
      // phrase se lit alors comme une panne du compte.
      <GCard skin={skin} padding={16}>
        <GLabel skin={skin}>{t("titre")}</GLabel>
        <p style={{ margin: "8px 0 0", fontSize: 14, fontWeight: 700 }}>{t("panne")}</p>
      </GCard>
    );
  }

  const genres: { cle: GenreNotif; titre: string; texte: string }[] = [
    { cle: "journee", titre: t("journeeTitre"), texte: t("journeeTexte") },
    { cle: "hebdo", titre: t("hebdoTitre"), texte: t("hebdoTexte") },
    { cle: "saison", titre: t("saisonTitre"), texte: t("saisonTexte") },
  ];

  return (
    <GCard skin={skin} padding={16}>
      <GLabel skin={skin}>{t("titre")}</GLabel>

      {/* ⚠️ L'OFFRE EST SORTIE D'ICI, elle vit aussi dans la modale de fin de
          partie. On lui passe `appareils` pour lui éviter de relire ce que
          cette carte a déjà lu, et `onAbonne` pour rafraîchir les
          interrupteurs, qui n'apparaissent qu'à partir d'un appareil. */}
      <OffreNotifs
        skin={skin}
        uid={uid}
        appareils={reglages.appareils}
        onAbonne={() => {
          setIci(true);
          void reglagesNotifs().then((r) => {
            if (r) setReglages(r);
          });
        }}
      />

      {/* ⚠️ LES INTERRUPTEURS NE SORTENT QUE SI QUELQUE CHOSE PEUT ARRIVER. Zéro
          appareil abonné, ce sont trois réglages qui ne commandent rien — et
          trois interrupteurs allumés promettraient des notifications que
          personne ne recevra. */}
      {reglages.appareils > 0 && (
        <div style={{ marginTop: ici === false ? 16 : 10, display: "grid", gap: 10 }}>
          {genres.map((g) => (
            <button
              key={g.cle}
              type="button"
              role="switch"
              aria-checked={reglages[g.cle]}
              onClick={() => void bascule(g.cle, !reglages[g.cle])}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
                background: skin.paper,
                border: `2px solid ${reglages[g.cle] ? skin.ink : skin.muted}`,
                borderRadius: 12,
                padding: "11px 13px",
                font: "inherit",
                color: skin.ink,
              }}
            >
              {/* La pastille porte l'état À CÔTÉ du texte, pas à sa place : une
                  couleur seule ne dit rien à qui ne la distingue pas, et
                  `aria-checked` porte la même chose pour un lecteur d'écran. */}
              <span
                aria-hidden
                style={{
                  flex: "0 0 auto",
                  width: 40,
                  height: 24,
                  borderRadius: 999,
                  border: `2px solid ${skin.ink}`,
                  background: reglages[g.cle] ? skin.accent : skin.paper,
                  position: "relative",
                  marginTop: 1,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: reglages[g.cle] ? 18 : 2,
                    width: 16,
                    height: 16,
                    borderRadius: 999,
                    background: reglages[g.cle] ? "#fff" : skin.ink,
                  }}
                />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 800, fontSize: 14.5 }}>{g.titre}</span>
                <span style={{ display: "block", fontSize: 13, lineHeight: 1.45, color: skin.muted, marginTop: 2 }}>
                  {g.texte}
                </span>
              </span>
            </button>
          ))}
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45, color: skin.muted, maxWidth: "48ch" }}>
            {t("plafond")}
          </p>
        </div>
      )}
    </GCard>
  );
}
