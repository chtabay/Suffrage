"use client";

// L'ÉCRAN DE BIENVENUE D'UNE TABLÉE.
//
// ⚠️ IL NE MONTRE RIEN DE LA TABLÉE AVANT D'Y ÊTRE. Ni les membres, ni leurs
// scores, ni même leur nombre : un lien qui circule finirait sinon par exposer
// un groupe à qui le trouve. On demande un nom, on entre, et c'est l'écran de
// jeu qui montre la tablée — après avoir joué.
//
// ⚠️ ET IL NE DEMANDE PAS DE COMPTE. C'est la moitié « invitation » de la
// tablée, celle qui fabrique la foule : y mettre une friction serait retirer au
// jeu la seule chose dont il manque à onze joueurs. Le nom vient de la liste
// fermée ; le texte libre reste réservé aux comptes, comme partout ailleurs.
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import GameShell from "@/components/games/GameShell";
import { UNANIMO_SKIN as skin } from "@/lib/games/skin";
import { GBtn, GCard } from "@/components/games/ui";
import { monJeton } from "@/lib/games/banalo/jeton";
import ChoisirSonNom, { NOM_VIERGE, choixDeNom, type EtatNom } from "@/components/games/ChoisirSonNom";
import { rejoindreTablee, type EntreeTablee } from "@/lib/db/banalo";

export default function RejoindrePage({ code }: { code: string }) {
  const t = useTranslations("BanaloJour");
  // ⚠️ LES REFUS DE NOM VIENNENT DU NAMESPACE PARTAGÉ depuis que le tableau du
  // jour sert aussi Cinq sur cinq : « ce nom est déjà porté » se dit pareil
  // partout, et la règle qui le produit vit dans `ChoisirSonNom`. Un alias, pas
  // une clé en variable — le contrôle de parité ne voit que les clés en clair.
  const tj = useTranslations("TableauJeux");
  const router = useRouter();
  const { user, loading } = useAuth();

  const [nom, setNom] = useState<EtatNom>(NOM_VIERGE);
  const [envoi, setEnvoi] = useState(false);
  const [souci, setSouci] = useState<EntreeTablee | null>(null);

  const rejoint = async () => {
    const jeton = monJeton();
    const choix = choixDeNom(nom);
    if (!jeton || !choix || envoi) return;
    setEnvoi(true);
    setSouci(null);
    const r = await rejoindreTablee(jeton, code, choix);
    setEnvoi(false);
    // ⚠️ « DEJA » N'EST PAS UNE ERREUR : quelqu'un qui rouvre le lien est déjà à
    // la tablée, et le lui reprocher n'a aucun sens. On l'envoie jouer.
    if (r === "ok" || r === "deja") {
      router.push("/games/banalo-jour");
      return;
    }
    // Un nom pris renouvelle la liste : la laisser invite à recliquer celui qui
    // vient d'échouer.
    if (r === "pris") setNom({ ...nom, tour: nom.tour + 1, index: null, libre: "" });
    setSouci(r);
  };

  const message = () => {
    if (souci === "pris") return tj("pris");
    if (souci === "inconnue") return t("tablee.inconnue");
    if (souci === "pleine") return t("tablee.pleine");
    if (souci === "court") return tj("court");
    if (souci === "long") return tj("long");
    // ⚠️ UN PSEUDO RETIRÉ N'EST PAS UNE PANNE : le geste qui débloque est d'en
    // reposer un, pas de réessayer.
    if (souci === "bloque") return tj("pseudoRetire");
    return tj("panne");
  };

  return (
    <GameShell
      skin={skin}
      title={t("name")}
      emoji="👥"
      backLabel={t("back")}
      poweredBy={t("poweredBy")}
      aside={
        <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 14, color: skin.muted }}>
          {t("tablee.titre")}
        </span>
      }
    >
      <GCard skin={skin} padding={18} accent={skin.accent}>
        <p
          style={{
            fontFamily: skin.fontDisplay,
            fontWeight: 800,
            fontSize: 19,
            lineHeight: 1.25,
            margin: 0,
            textWrap: "balance",
          }}
        >
          {t("tablee.rejoindreTitre")}
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 14.5, lineHeight: 1.5, color: skin.muted, maxWidth: "46ch" }}>
          {t("tablee.rejoindreTexte")}
        </p>
        {/* Tant qu'on ne sait pas s'il y a un compte, on n'affiche pas le
            formulaire : faire clignoter le champ libre devant quelqu'un qui a un
            compte est un manque de mémoire, et ça se voit. */}
        {!loading ? (
          <ChoisirSonNom
            skin={skin}
            jeton={monJeton()}
            connecte={Boolean(user)}
            explication={t("tablee.pourquoi")}
            etat={nom}
            setEtat={(e) => {
              setNom(e);
              setSouci(null);
            }}
          />
        ) : null}
        {souci ? (
          <p role="alert" style={{ margin: "10px 0 0", fontSize: 13, fontWeight: 700, color: skin.ink }}>
            {message()}
          </p>
        ) : null}
        <GBtn
          skin={skin}
          variant="accent"
          size="lg"
          full
          style={{ marginTop: 12 }}
          disabled={choixDeNom(nom) === null || envoi || loading}
          onClick={() => void rejoint()}
        >
          {t("tablee.rejoindreBouton")}
        </GBtn>
        <p style={{ margin: "10px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
          {t("tablee.rejoindreDuree")}
        </p>
      </GCard>
    </GameShell>
  );
}
