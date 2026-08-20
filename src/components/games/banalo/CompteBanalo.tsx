"use client";

// LE COMPTE — proposé après la journée, jamais avant, et jamais obligatoire.
//
// Trois règles reprises telles quelles de Cinq sur cinq, parce qu'elles ne
// dépendent pas du jeu :
//
// 1. **On ne demande rien à quelqu'un à qui le jeu n'a rien donné.** Ce bloc
//    n'existe qu'APRÈS la réponse du jour, sous le partage.
//
// 2. **On propose de GARDER quelque chose qui existe déjà.** La série est
//    calculée sans compte, et affichée avant qu'on parle de la sauvegarder.
//    L'inverse — « créez un compte pour commencer à cumuler » — demande de
//    croire sur parole.
//
// 3. **Rien de nominatif.** Aucun appel derrière cet écran ne rend le nom d'un
//    autre joueur.
//
// ⚠️ ET LE COMPTE EST CELUI DE PLACET, ce qui est l'intention et pas un détail
// d'implémentation : quelqu'un qui vient pour deux minutes de jeu repart avec un
// compte qui sert aussi à organiser de vrais votes. La phrase est en bas du
// bloc, dans les deux états.
//
// ⚠️ CE QU'IL NE RÉPÈTE PAS : le rang du jour. L'écran de score l'affiche déjà,
// juste au-dessus. Le bloc compte de Cinq sur cinq le montre parce que là-bas
// rien d'autre ne le dit ; ici ce serait le même chiffre deux fois.
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { UNANIMO_SKIN as skin } from "@/lib/games/skin";
import { GBtn, GCard, GLabel } from "@/components/games/ui";
import { monJeton } from "@/lib/games/banalo/jeton";
import { maSerie, monBilanBanalo, rattache, serieVivante, type BilanBanalo } from "@/lib/db/banalo";

export default function CompteBanalo({ jour }: { jour: number }) {
  const t = useTranslations("BanaloJour");
  const { user, loading, signIn, signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<"repos" | "envoi" | "envoye" | "erreur">("repos");
  const [bilan, setBilan] = useState<BilanBanalo | null>(null);
  const [serie, setSerie] = useState(0);
  const rattachePour = useRef<string | null>(null);

  // La série d'abord, avec ou sans compte : c'est ce que le joueur a déjà.
  useEffect(() => {
    let vivant = true;
    const jeton = monJeton();
    if (!jeton) return;
    void maSerie(jeton).then((s) => {
      if (vivant) setSerie(serieVivante(s, jour));
    });
    return () => {
      vivant = false;
    };
  }, [jour]);

  // ⚠️ LE RATTACHEMENT SE FAIT À LA CONNEXION, PAS À L'INSCRIPTION. Quelqu'un qui
  // a joué six jours sans compte puis se connecte doit retrouver ses six jours.
  // La fonction d'en face est idempotente : la répéter ne coûte qu'un
  // aller-retour, et évite d'avoir à retenir si ce navigateur a déjà été
  // rattaché. Un `ref` par identifiant de compte, comme `claimPolls`.
  useEffect(() => {
    if (!user || rattachePour.current === user.id) return;
    rattachePour.current = user.id;
    let vivant = true;
    void (async () => {
      const jeton = monJeton();
      if (jeton) await rattache(jeton);
      if (!vivant) return;
      // On ne relit qu'APRÈS avoir écrit : sinon le bilan affiché serait celui
      // d'avant le rattachement, donc faux exactement au moment où il compte.
      const b = await monBilanBanalo();
      if (vivant) setBilan(b);
    })();
    return () => {
      vivant = false;
    };
  }, [user]);

  const envoie = async () => {
    if (!email.includes("@") || etat === "envoi") return;
    setEtat("envoi");
    setEtat((await signInWithEmail(email)) ? "envoye" : "erreur");
  };

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

  const lienPlacet = (
    <p style={{ margin: "10px 0 0", fontSize: 13, color: skin.muted, lineHeight: 1.5 }}>
      {t("compte.placet")}{" "}
      <Link href="/" style={{ color: skin.ink, fontWeight: 700 }}>
        {t("compte.placetLien")}
      </Link>
    </p>
  );

  if (user) {
    // Le bilan peut être `null` — refus ou réseau. On montre alors ce qu'on sait
    // de source sûre (la série) plutôt qu'un tableau de zéros : la règle du
    // dépôt est qu'un NULL de RPC est un REFUS, pas une donnée.
    const b = bilan;
    return (
      <GCard skin={skin} padding={15} style={{ marginTop: 12 }} accent={skin.accent2}>
        <GLabel skin={skin}>{t("compte.bilanTitre")}</GLabel>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 8 }}>
          {ligne(t("compte.serieLabel"), String(b?.serie ?? serie))}
          {b && ligne(t("compte.parties"), String(b.parties))}
          {b?.moyenne != null && ligne(t("compte.moyenne"), String(b.moyenne))}
          {b?.meilleur != null && ligne(t("compte.meilleur"), String(b.meilleur))}
        </div>
        {lienPlacet}
      </GCard>
    );
  }

  return (
    <GCard skin={skin} padding={15} style={{ marginTop: 12 }}>
      {/* Ce qu'il a DÉJÀ, avant qu'on lui demande quoi que ce soit. */}
      {serie > 1 && (
        <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 19, marginBottom: 6 }}>
          🔥 {t("compte.serie", { n: serie })}
        </div>
      )}
      <GLabel skin={skin}>{t("compte.titre")}</GLabel>
      <p style={{ margin: "7px 0 0", fontSize: 14.5, lineHeight: 1.5, color: skin.muted, maxWidth: "46ch" }}>
        {t("compte.texte")}
      </p>

      {etat === "envoye" ? (
        <p style={{ margin: "12px 0 0", fontWeight: 700, color: skin.good }}>{t("compte.envoye")}</p>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <GBtn skin={skin} variant="ghost" onClick={() => void signIn()}>
            {t("compte.google")}
          </GBtn>
          <div style={{ display: "flex", gap: 8, flex: "1 1 240px", minWidth: 0 }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void envoie();
              }}
              placeholder={t("compte.emailPlaceholder")}
              aria-label={t("compte.emailPlaceholder")}
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
              {etat === "envoi" ? "…" : t("compte.envoyer")}
            </GBtn>
          </div>
        </div>
      )}
      {etat === "erreur" && (
        <p role="alert" style={{ margin: "8px 0 0", fontWeight: 700, color: "#B3261E", fontSize: 13.5 }}>
          {t("compte.erreur")}
        </p>
      )}
      {lienPlacet}
    </GCard>
  );
}
