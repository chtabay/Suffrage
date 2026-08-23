"use client";

// LES CHEMINS DE CONNEXION, EN UN SEUL ENDROIT POUR LES TROIS JEUX QUOTIDIENS.
//
// ⚠️ IL Y EN AVAIT TROIS COPIES, ET UN JOUEUR A VU CE QU'ELLES AVAIENT PERDU EN
// ROUTE : « il n'est proposé que la méthode google et le magic link, la version
// avec mot de passe — qui existe sur Placet — n'est pas proposée ». Exact :
// `useAuth` expose `signInPassword`, `signUpPassword` et `resetPassword` depuis
// toujours, et seul `SpacesHome` s'en servait. Les trois offres de compte des
// jeux — Banalo, Cinq sur cinq, la page commune — avaient chacune recopié les
// deux mêmes boutons, et aucune n'avait suivi. C'est le chemin qu'avaient pris
// la règle du mot orphelin et le calcul des scores avant d'être sortis en un
// seul exemplaire.
//
// ⚠️ CE COMPOSANT NE PORTE QUE LES MÉTHODES, PAS L'ARGUMENTAIRE. Chaque écran
// garde son titre et sa promesse — « gardez votre série » ne se dit pas pareil
// après une partie de Banalo, après une partie de Cinq sur cinq et sur la page
// des classements. Ce qui se partage est la plomberie, pas la voix.
//
// ⚠️ LE LIEN MAGIQUE RESTE DEVANT, et le mot de passe est à un geste. Après une
// partie, le joueur n'a pas demandé à s'inscrire : lui présenter d'emblée un
// champ de mot de passe à inventer est une demande de plus au moment où §0 dit
// qu'il n'y en a qu'une. Celui qui a DÉJÀ un compte Placet, lui, sait où
// cliquer.
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/useAuth";
import type { GameSkin } from "@/lib/games/skin";
import { GBtn } from "@/components/games/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Le minimum de Supabase. En dessous, l'appel part et revient en erreur. */
const MDP_MIN = 6;

type Onglet = "lien" | "motDePasse";
type EtatLien = "repos" | "envoi" | "envoye" | "erreur";
type EtatMdp = "repos" | "envoi" | "erreur" | "confirme" | "reinit";

export default function ConnexionJeux({ skin }: { skin: GameSkin }) {
  const t = useTranslations("ConnexionJeux");
  const { signIn, signInWithEmail, signInPassword, signUpPassword, resetPassword } = useAuth();

  const [onglet, setOnglet] = useState<Onglet>("lien");
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [creation, setCreation] = useState(false);
  const [lien, setLien] = useState<EtatLien>("repos");
  const [etat, setEtat] = useState<EtatMdp>("repos");

  /**
   * Où revenir après la connexion.
   *
   * ⚠️ ON REVIENT SUR L'ÉCRAN DE JEU, PAS SUR L'ACCUEIL. Les appels d'origine
   * passaient `signIn()` sans destination : le joueur qui se connectait depuis
   * sa partie atterrissait sur la page d'accueil de Placet, et devait retrouver
   * son jeu tout seul. On repart du CHEMIN NU — jamais `href` — pour la raison
   * déjà écrite ailleurs : l'URL peut porter le résultat d'un ami.
   */
  const retour = () => (typeof window === "undefined" ? undefined : window.location.pathname);

  const emailOk = EMAIL_RE.test(email.trim());
  const mdpOk = emailOk && mdp.length >= MDP_MIN;

  const envoieLien = async () => {
    if (!emailOk || lien === "envoi") return;
    setLien("envoi");
    setLien((await signInWithEmail(email, retour())) ? "envoye" : "erreur");
  };

  const parMotDePasse = async () => {
    if (!mdpOk || etat === "envoi") return;
    setEtat("envoi");
    if (creation) {
      const r = await signUpPassword(email, mdp, retour());
      // `confirme` n'est pas une erreur : le compte existe, il attend un clic
      // dans un email. Le replier sur « erreur » ferait recommencer le joueur.
      setEtat(r === "ok" ? "repos" : r === "confirm" ? "confirme" : "erreur");
      return;
    }
    // ⚠️ LE MOT DE PASSE OUVRE LA SESSION SANS PASSER PAR LA ROUTE DE CALLBACK.
    // Rien ne navigue : c'est `useAuth` qui voit la session changer et fait
    // disparaître cette offre. Aucune redirection à écrire, et surtout aucune à
    // inventer — on est déjà sur la bonne page.
    setEtat((await signInPassword(email, mdp)) === "ok" ? "repos" : "erreur");
  };

  const oubli = async () => {
    if (!emailOk) return setEtat("erreur");
    setEtat("envoi");
    setEtat((await resetPassword(email)) ? "reinit" : "erreur");
  };

  const champ = {
    width: "100%",
    minWidth: 0,
    fontFamily: skin.fontBody,
    fontSize: 15,
    padding: "10px 12px",
    border: `${skin.border}px solid ${skin.ink}`,
    borderRadius: 11,
    background: "#fff",
    color: skin.ink,
    outline: "none",
    boxSizing: "border-box" as const,
  };

  // Le lien magique est parti : plus rien à proposer, il faut ouvrir l'email.
  if (lien === "envoye") {
    return <p style={{ margin: "12px 0 0", fontWeight: 700, color: skin.good }}>{t("envoye")}</p>;
  }

  return (
    <div style={{ marginTop: 14 }}>
      <GBtn skin={skin} variant="ghost" onClick={() => void signIn(retour())}>
        {t("google")}
      </GBtn>

      {/* ⚠️ DEUX PASTILLES, PAS DEUX FORMULAIRES EMPILÉS. Les deux méthodes
          partagent le champ email ; les montrer ensemble ferait deux champs
          email l'un sous l'autre, et le joueur ne saurait pas lequel remplir. */}
      <div style={{ display: "flex", gap: 6, margin: "12px 0 8px" }}>
        {(["lien", "motDePasse"] as const).map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => {
              setOnglet(o);
              setEtat("repos");
              setLien("repos");
            }}
            aria-pressed={onglet === o}
            style={{
              fontFamily: skin.fontDisplay,
              fontWeight: 800,
              fontSize: 12.5,
              padding: "6px 11px",
              borderRadius: 999,
              cursor: "pointer",
              border: `2px solid ${onglet === o ? skin.ink : skin.muted}`,
              background: onglet === o ? skin.ink : skin.paper,
              color: onglet === o ? skin.paper : skin.muted,
            }}
          >
            {/* Clés en clair : une clé choisie en variable échapperait au
                contrôle de parité i18n. */}
            {o === "lien" ? t("ongletLien") : t("ongletMotDePasse")}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void (onglet === "lien" ? envoieLien() : parMotDePasse());
          }}
          placeholder={t("emailPlaceholder")}
          aria-label={t("emailPlaceholder")}
          autoComplete="email"
          style={champ}
        />

        {onglet === "lien" ? (
          <GBtn skin={skin} onClick={() => void envoieLien()} disabled={!emailOk || lien === "envoi"}>
            {lien === "envoi" ? "…" : t("envoyer")}
          </GBtn>
        ) : (
          <>
            <input
              type="password"
              value={mdp}
              onChange={(e) => setMdp(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void parMotDePasse();
              }}
              placeholder={t("motDePassePlaceholder")}
              aria-label={t("motDePassePlaceholder")}
              // ⚠️ `new-password` À LA CRÉATION : sinon le gestionnaire du
              // navigateur propose le mot de passe existant du site dans un
              // champ qui en demande un nouveau.
              autoComplete={creation ? "new-password" : "current-password"}
              style={champ}
            />
            <GBtn skin={skin} onClick={() => void parMotDePasse()} disabled={!mdpOk || etat === "envoi"}>
              {etat === "envoi" ? "…" : creation ? t("creerCompte") : t("seConnecter")}
            </GBtn>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  setCreation(!creation);
                  setEtat("repos");
                }}
                style={{
                  border: "none",
                  background: "none",
                  padding: 0,
                  fontSize: 13,
                  fontWeight: 700,
                  color: skin.ink,
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                {creation ? t("basculeConnexion") : t("basculeCreer")}
              </button>
              {!creation && (
                <button
                  type="button"
                  onClick={() => void oubli()}
                  style={{
                    border: "none",
                    background: "none",
                    padding: 0,
                    fontSize: 13,
                    color: skin.muted,
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  {t("oublie")}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ⚠️ CHAQUE ÉTAT A SA PHRASE, et « compte créé, confirmez par email » n'est
          pas une erreur : c'est un succès qui attend un clic ailleurs. Le
          replier sur « ça n'a pas marché » ferait recommencer quelqu'un dont le
          compte existe déjà. */}
      {etat === "confirme" && (
        <p role="status" style={{ margin: "10px 0 0", fontSize: 13.5, fontWeight: 700, color: skin.good }}>
          {t("confirme")}
        </p>
      )}
      {etat === "reinit" && (
        <p role="status" style={{ margin: "10px 0 0", fontSize: 13.5, fontWeight: 700, color: skin.good }}>
          {/* ⚠️ ON DIT QUE LE LIEN MÈNE AILLEURS. `resetPassword` ramène sur
              `/espaces?recovery=1`, la seule page qui porte le formulaire de
              nouveau mot de passe : un joueur qui atterrit sur les espaces de
              Placet sans avoir été prévenu croit s'être trompé. */}
          {t("reinit")}
        </p>
      )}
      {(etat === "erreur" || lien === "erreur") && (
        <p role="alert" style={{ margin: "10px 0 0", fontSize: 13.5, fontWeight: 700, color: "#B3261E" }}>
          {t("erreur")}
        </p>
      )}
      {onglet === "motDePasse" && mdp.length > 0 && mdp.length < MDP_MIN && (
        <p style={{ margin: "8px 0 0", fontSize: 12.5, color: skin.muted }}>{t("courtMotDePasse")}</p>
      )}
    </div>
  );
}
