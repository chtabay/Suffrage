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
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import ConnexionJeux from "@/components/games/ConnexionJeux";
import SerieDuJour from "@/components/games/SerieDuJour";
import { UNANIMO_SKIN as skin } from "@/lib/games/skin";
import { GCard, GLabel } from "@/components/games/ui";
import PontPlacet from "@/components/games/PontPlacet";
import { monJeton } from "@/lib/games/banalo/jeton";
import { maSerie, monBilanBanalo, rattache, serieVivante, type BilanBanalo } from "@/lib/db/banalo";

export default function CompteBanalo({ jour, install }: { jour: number; install?: ReactNode }) {
  const t = useTranslations("BanaloJour");
  const { user, loading } = useAuth();
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
    // ⚠️ LA SÉRIE DU COMPTE PASSE PAR `serieVivante` ELLE AUSSI. La base rend la
    // dernière journée de la suite, jamais un verdict : elle ne connaît ni le
    // fuseau du joueur ni la charnière de 11 h 30. La série anonyme y passait
    // déjà, celle du compte non — un joueur revenu après dix jours d'absence
    // lisait donc « série : 6 » là où le même écran, sans compte, affichait 0.
    //
    // ⚠️ ET ON GARDE LA PLUS LONGUE DES DEUX. Elles sont calculées à deux
    // instants et sur deux sources : le compte couvre tous les appareils, le
    // jeton ne couvre que ce navigateur mais n'attend pas le rattachement.
    // Afficher une série plus courte que ce que le navigateur seul sait prouver
    // serait une régression visible.
    const serieCompte = b ? serieVivante({ jours: b.serie, fin: b.serieFin }, jour) : 0;
    return (
      <GCard skin={skin} padding={15} style={{ marginTop: 12 }} accent={skin.accent2}>
        <GLabel skin={skin}>{t("compte.bilanTitre")}</GLabel>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 8 }}>
          {ligne(t("compte.serieLabel"), String(Math.max(serieCompte, serie)))}
          {b && ligne(t("compte.parties"), String(b.parties))}
          {/* ⚠️ DES CENTILES, PLUS DES POINTS. Le sur-100 n'est pas comparable
              d'un format à l'autre — son maximum ATTEIGNABLE vaut 67,8 sur un
              thème serré et 13,7 sur un thème ouvert — donc « score moyen : 35 »
              mélangeait des journées où 35 était hors d'atteinte par le haut et
              d'autres où c'était médiocre. Le centile est un rang : il veut dire
              la même chose tous les jours. ⚠️ Et le MEILLEUR est le PLUS PETIT,
              puisqu'il compte les joueurs qui ont fait mieux. */}
          {b?.centileMoyen != null && ligne(t("compte.devant"), t("motsPart", { p: b.centileMoyen }))}
          {b?.centileMeilleur != null && ligne(t("compte.devantMieux"), t("motsPart", { p: b.centileMeilleur }))}
        </div>
        {/* La légende, une fois : « 14 % » ne se lit pas seul. */}
        {b?.centileMoyen != null ? (
          <p style={{ margin: "9px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
            {t("historique.legende")}
          </p>
        ) : null}
        {/* LA PORTE DE L'HISTORIQUE. Elle ne s'ouvre que pour qui a déjà des
            journées : proposer « voir toutes mes journées » à quelqu'un qui n'en
            a qu'une l'envoie sur une page qui répète ce qu'il vient de lire. */}
        {b && b.parties > 1 ? (
          <p style={{ margin: "9px 0 0", fontSize: 13.5 }}>
            <Link href="/games/quotidien" style={{ color: skin.ink, fontWeight: 700 }}>
              {t("historique.lien")}
            </Link>
          </p>
        ) : null}
        {lienPlacet}
        {/* ⚠️ L'INSTALLATION NE SORT QUE POUR QUI A DÉJÀ UN COMPTE. §0 de
            `docs/regularite-des-joueurs.md` : l'après-partie n'a QU'UNE place, et
            deux demandes molles empilées valent moins qu'une nette. À qui n'a
            pas de compte, on demande le compte ; à qui en a un, l'installation. */}
        {install}
      </GCard>
    );
  }

  // ⚠️ L'OFFRE DE COMPTE PORTE L'ACCENT, comme la carte de score. Signalée trop
  // discrète sur de vrais joueurs : posée en carte neutre sous un partage et un
  // bloc d'installation, elle se lisait comme un pied de page. C'est pourtant la
  // seule chose qui empêche une série de disparaître avec le navigateur.
  return (
    <GCard skin={skin} padding={17} style={{ marginTop: 12 }} accent={skin.accent}>
      {/* Ce qu'il a DÉJÀ, avant qu'on lui demande quoi que ce soit. */}
      <SerieDuJour skin={skin} serie={serie} />
      <p
        style={{
          fontFamily: skin.fontDisplay,
          fontWeight: 800,
          fontSize: 18,
          lineHeight: 1.25,
          margin: 0,
          textWrap: "balance",
        }}
      >
        {t("compte.titre")}
      </p>
      <p style={{ margin: "7px 0 0", fontSize: 14.5, lineHeight: 1.5, color: skin.muted, maxWidth: "46ch" }}>
        {t("compte.texte")}
      </p>

      <ConnexionJeux skin={skin} />
      {lienPlacet}
      {/* ⚠️ LE PONT EST RENDU ICI, ET PAS DANS L'ÉCRAN DE RÉSULTAT, parce que
          c'est ce bloc qui détient l'état dont dépend l'échelle : y a-t-il un
          compte, et combien de journées. Le poser à côté demanderait de faire
          redescendre l'authentification et le bilan dans deux écrans, et
          rendrait possible d'afficher deux demandes en même temps. */}
      <PontPlacet skin={skin} connecte={Boolean(user)} journees={bilan?.parties ?? 0} />
    </GCard>
  );
}
