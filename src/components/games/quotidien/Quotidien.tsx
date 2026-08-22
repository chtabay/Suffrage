"use client";

// LA PAGE COMMUNE DES JEUX QUOTIDIENS — mes résultats, et les classements.
//
// ⚠️ ELLE EST MUTUALISÉE PARCE QUE LA QUESTION L'EST. « Où j'en suis » et « où
// je me situe » ne sont pas des questions de Banalo ni de Cinq sur cinq : ce
// sont des questions du JOUEUR, qui joue les deux. Chaque jeu gardait sa réponse
// pour lui — Banalo avait un historique caché derrière une ligne de texte dans
// sa carte de compte, Cinq sur cinq n'avait rien du tout — et passé la
// charnière, le classement du jour devenait inatteignable.
//
// ⚠️ ELLE PORTE LA MATIÈRE DE LA PORTE `/games`, PAS CELLE D'UN JEU. Habillée en
// Banalo, elle dirait que Cinq sur cinq y est invité ; `PLACET_GAMES_SKIN` est
// la matière de la maison, et c'est celle du lieu où l'on choisit un jeu.
//
// ⚠️ ET ELLE DEMANDE UN COMPTE, ce que le reste des jeux ne fait jamais. C'est
// assumé et c'est même l'argument : les réponses brutes s'effacent à trente
// jours, seuls les résumés de compte survivent. Une page d'historique sans
// compte ne pourrait montrer qu'un mois, et rien du tout sur un autre appareil.
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import GameShell from "@/components/games/GameShell";
import { PLACET_GAMES_SKIN as skin, UNANIMO_SKIN, PAYS_SKIN } from "@/lib/games/skin";
import { GBtn, GCard } from "@/components/games/ui";
import { numeroDuJour } from "@/lib/games/banalo/jour";
import { numeroDeJournee } from "@/lib/games/pays/calendrier";
import { mesJourneesBanalo, mesJourneesPays, type JourneeCommune } from "@/lib/db/jeux";
import CarteJeu from "./CarteJeu";
import Classements from "./Classements";

export default function Quotidien() {
  const t = useTranslations("JeuxQuotidiens");
  const { user, loading, signIn, signInWithEmail } = useAuth();

  const [banalo, setBanalo] = useState<JourneeCommune[] | null>(null);
  const [pays, setPays] = useState<JourneeCommune[] | null>(null);
  const [panne, setPanne] = useState(false);
  const [onglet, setOnglet] = useState<"moi" | "classements">("moi");
  /**
   * Les deux numéros de journée.
   *
   * ⚠️ IL EN FAUT DEUX, ET ILS SE CALCULENT APRÈS LE MONTAGE. Les deux jeux
   * n'ont ni la même origine ni la même charnière — 11 h 30 pour Banalo, minuit
   * pour Cinq sur cinq — donc un seul numéro pour les deux serait faux pour
   * l'un. Et les calculer au rendu serveur les figerait dans le HTML, en faisant
   * diverger l'hydratation autour de la charnière. Même leçon que `JeuxDuJour`.
   */
  const [jours, setJours] = useState<{ banalo: number; pays: number } | null>(null);
  useEffect(() => {
    setJours({ banalo: numeroDuJour(), pays: numeroDeJournee(new Date().toISOString()) });
  }, []);
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<"repos" | "envoi" | "envoye" | "erreur">("repos");

  // ⚠️ ON DÉPEND DE `user?.id`, PAS DE `user`. `useAuth` rend un OBJET dont la
  // référence change à chaque relecture de session : un effet qui dépend de lui
  // se relance en boucle, et son ménage coupe la réponse précédente avant
  // qu'elle n'arrive — la page reste blanche pour toujours tout en martelant la
  // base. Trouvé au navigateur sur `MonHistorique`, jamais à la relecture.
  const uid = user?.id ?? null;
  const charge = useRef<string | null>(null);
  useEffect(() => {
    if (!uid) return;
    charge.current = uid;
    let vivant = true;
    void Promise.all([mesJourneesBanalo(), mesJourneesPays()]).then(([b, p]) => {
      if (!vivant) return;
      if (b === null && p === null) setPanne(true);
      setBanalo(b ?? []);
      setPays(p ?? []);
    });
    return () => {
      vivant = false;
    };
  }, [uid]);

  const envoie = async () => {
    if (!email.includes("@") || etat === "envoi") return;
    setEtat("envoi");
    setEtat((await signInWithEmail(email)) ? "envoye" : "erreur");
  };

  const cadre = (enfants: React.ReactNode) => (
    <GameShell
      skin={skin}
      title={t("titre")}
      emoji="📈"
      backLabel={t("retour")}
      poweredBy={t("poweredBy")}
    >
      {enfants}
    </GameShell>
  );

  if (loading) return cadre(null);

  // ── sans compte ──────────────────────────────────────────────────────────
  //
  // ⚠️ ON DIT CE QUE LE COMPTE APPORTE, PAS « connectez-vous ». Même règle que
  // partout : on propose de GARDER quelque chose, on ne demande pas de croire
  // sur parole.
  //
  // ⚠️ ET CE BLOC NE REMPLACE PLUS LA PAGE ENTIÈRE. Le classement sur la durée
  // SE LIT sans compte — il faut un compte pour y FIGURER — et une page qui se
  // refuse à un visiteur ne lui donne aucune raison de s'inscrire. Seule la
  // moitié « mes résultats » exige la session, parce qu'elle n'a rien à montrer
  // sans elle.
  const offre = (
      <GCard skin={skin} padding={18} accent={skin.accent}>
        <p style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 19, margin: 0, textWrap: "balance" }}>
          {t("sansCompteTitre")}
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 14.5, lineHeight: 1.5, color: skin.muted, maxWidth: "46ch" }}>
          {t("sansCompteTexte")}
        </p>
        {etat === "envoye" ? (
          <p style={{ margin: "12px 0 0", fontWeight: 700, color: skin.good }}>{t("envoye")}</p>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <GBtn skin={skin} variant="ghost" onClick={() => void signIn()}>
              {t("google")}
            </GBtn>
            <div style={{ display: "flex", gap: 8, flex: "1 1 240px", minWidth: 0 }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void envoie();
                }}
                placeholder={t("emailPlaceholder")}
                aria-label={t("emailPlaceholder")}
                autoComplete="email"
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontFamily: skin.fontBody,
                  fontSize: 15,
                  padding: "10px 12px",
                  border: `${skin.border}px solid ${skin.ink}`,
                  borderRadius: 11,
                  background: "#fff",
                  color: skin.ink,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <GBtn skin={skin} onClick={envoie} disabled={!email.includes("@") || etat === "envoi"}>
                {etat === "envoi" ? "…" : t("envoyer")}
              </GBtn>
            </div>
          </div>
        )}
        {etat === "erreur" && (
          <p role="alert" style={{ margin: "8px 0 0", fontWeight: 700, color: "#B3261E", fontSize: 13.5 }}>
            {t("erreur")}
          </p>
        )}
        <p style={{ margin: "14px 0 0", fontSize: 13.5 }}>
          <Link href="/games" style={{ color: skin.ink, fontWeight: 700 }}>
            {t("versLesJeux")}
          </Link>
        </p>
      </GCard>
  );

  const onglets: { cle: "moi" | "classements"; texte: string }[] = [
    { cle: "moi", texte: t("ongletMoi") },
    { cle: "classements", texte: t("ongletClassements") },
  ];

  return cadre(
    <>
      {/* DEUX ONGLETS, DEUX QUESTIONS : « où j'en suis » et « où je me situe ».
          Les empiler sur une seule page ferait quatre cartes avant la première
          réponse ; les séparer laisse chacune tenir dans un écran. */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {onglets.map((o) => (
          <button
            key={o.cle}
            type="button"
            onClick={() => setOnglet(o.cle)}
            aria-pressed={onglet === o.cle}
            style={{
              fontFamily: skin.fontDisplay,
              fontWeight: 800,
              fontSize: 14,
              padding: "8px 14px",
              borderRadius: 999,
              cursor: "pointer",
              border: `2px solid ${skin.ink}`,
              background: onglet === o.cle ? skin.ink : skin.paper,
              color: onglet === o.cle ? skin.paper : skin.ink,
            }}
          >
            {o.texte}
          </button>
        ))}
      </div>

      {onglet === "classements" ? (
        jours ? (
          <Classements user={user} jourBanalo={jours.banalo} jourPays={jours.pays} />
        ) : null
      ) : !user ? (
        offre
      ) : panne ? (
        <p style={{ fontSize: 14, fontWeight: 700 }}>{t("panne")}</p>
      ) : banalo === null || pays === null ? null : (
        <>
      <p style={{ margin: 0, fontSize: 13.5, color: skin.muted, lineHeight: 1.5, maxWidth: "52ch" }}>
        {t("intro")}
      </p>
      {/* ⚠️ L'ORDRE EST FIXE, il ne suit pas l'activité. Classer les jeux par
          « le plus joué d'abord » ferait bouger la page d'un jour à l'autre, et
          on chercherait sa carte au lieu de la retrouver. */}
      <CarteJeu
        skin={skin}
        couleur={UNANIMO_SKIN.accent}
        emoji="💬"
        nom={t("banalo")}
        href="/games/banalo-jour"
        jouer={t("jouer")}
        journees={banalo}
      />
      <CarteJeu
        skin={skin}
        couleur={PAYS_SKIN.accent}
        emoji="🌍"
        nom={t("pays")}
        href="/games/pays"
        jouer={t("jouer")}
        journees={pays}
      />
        </>
      )}
    </>,
  );
}
