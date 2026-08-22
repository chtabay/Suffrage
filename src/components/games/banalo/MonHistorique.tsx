"use client";

// MES JOURNÉES — la question d'un joueur, telle qu'elle a été posée :
// « est-ce qu'on peut créer un compte pour ça ? si oui, est-ce qu'on retrouve
// son propre historique ? »
//
// ⚠️ C'EST LE COMPTE QUI REND CETTE PAGE POSSIBLE, ET C'EST L'ARGUMENT. Les
// réponses brutes s'effacent à trente jours ; `scrutin_banalo_results`, lui, ne
// se purge pas. La série de plus de trente jours et cette liste sont donc
// exactement ce qu'un navigateur ne sait pas faire — et c'est ce qu'on met en
// avant plutôt qu'une promesse.
//
// ⚠️ ON MONTRE LE CENTILE, PAS LE SCORE. Le sur-100 n'est pas comparable d'un
// format à l'autre : mesuré à 3 000 joueurs, son maximum ATTEIGNABLE vaut 67,8
// sur un thème serré et 13,7 sur un thème ouvert. Empiler ces deux nombres dans
// une même colonne fabriquerait une progression qui n'existe pas. Le centile est
// un RANG : il veut dire la même chose tous les jours et dans les deux formats.
//
// ⚠️ ET LE LIBELLÉ DE CHAQUE JOURNÉE SE CALCULE ICI, pas en base.
// `programmeDe(jour)` rend le thème ou la question dans la langue de L'ÉCRAN ;
// stocké côté base, un libellé reviendrait dans la langue où la journée a été
// jouée — un joueur qui change de langue verrait son passé en français.
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { UNANIMO_SKIN as skin } from "@/lib/games/skin";
import { GBtn, GCard, GLabel } from "@/components/games/ui";
import { programmeDe } from "@/lib/games/banalo/programme";
import { themeLabel } from "@/lib/games/banalo/themes";
import { enLangue } from "@/content/banalo/questions";
import { monJeton } from "@/lib/games/banalo/jeton";
import {
  monBilanBanalo,
  monHistoriqueBanalo,
  rattache,
  serieVivante,
  type BilanBanalo,
  type JourneeJouee,
} from "@/lib/db/banalo";

const bcp = (locale: string) => (locale === "pcm" ? "en" : locale);

export default function MonHistorique({ jour }: { jour: number }) {
  const t = useTranslations("BanaloJour");
  const locale = useLocale();
  const { user, loading, signIn, signInWithEmail } = useAuth();

  const [journees, setJournees] = useState<JourneeJouee[] | null>(null);
  const [bilan, setBilan] = useState<BilanBanalo | null>(null);
  const [panne, setPanne] = useState(false);
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<"repos" | "envoi" | "envoye" | "erreur">("repos");

  // ⚠️ L'EFFET DÉPEND DE `user?.id`, PAS DE `user`. `useAuth` rend un OBJET :
  // sa référence change à chaque fois que la session est relue, donc un effet
  // qui dépend de `user` se relance, refait ses trois appels, et son ménage
  // (`vivant = false`) coupe la réponse précédente avant qu'elle n'arrive — la
  // page reste blanche pour toujours tout en martelant la base. Vu au
  // navigateur, invisible à la relecture. Une CHAÎNE est stable, et le montage
  // double du mode strict retombe alors sur le cas normal : le premier passage
  // est annulé, le second charge.
  const uid = user?.id ?? null;
  useEffect(() => {
    if (!uid) return;
    let vivant = true;
    void (async () => {
      // ⚠️ ON RATTACHE AVANT DE LIRE. Quelqu'un qui arrive ici depuis un lien de
      // connexion vient peut-être de créer son compte : lire d'abord lui
      // montrerait une page vide, c'est-à-dire l'exact contraire de ce qu'il
      // vient chercher. La fonction d'en face est idempotente.
      const jeton = monJeton();
      if (jeton) await rattache(jeton);
      const [h, b] = await Promise.all([monHistoriqueBanalo(), monBilanBanalo()]);
      if (!vivant) return;
      if (h) setJournees(h);
      else setPanne(true);
      setBilan(b);
    })();
    return () => {
      vivant = false;
    };
  }, [uid]);

  const envoie = async () => {
    if (!email.includes("@") || etat === "envoi") return;
    setEtat("envoi");
    setEtat((await signInWithEmail(email)) ? "envoye" : "erreur");
  };

  const nb = useMemo(() => new Intl.NumberFormat(bcp(locale)), [locale]);

  if (loading) return null;

  // ── sans compte ──────────────────────────────────────────────────────────
  //
  // ⚠️ ON DIT CE QUE LE COMPTE APPORTE, PAS « connectez-vous ». C'est la même
  // règle que le bloc d'après-partie : on propose de GARDER quelque chose, on ne
  // demande pas de croire sur parole.
  if (!user) {
    return (
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
          {t("historique.sansCompteTitre")}
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 14.5, lineHeight: 1.5, color: skin.muted, maxWidth: "46ch" }}>
          {t("historique.sansCompteTexte")}
        </p>
        {etat === "envoye" ? (
          <p style={{ margin: "12px 0 0", fontWeight: 700, color: skin.good }}>{t("compte.envoye")}</p>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
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
        <p style={{ margin: "14px 0 0", fontSize: 13.5 }}>
          <Link href="/games/banalo-jour" style={{ color: skin.ink, fontWeight: 700 }}>
            {t("historique.versLeJeu")}
          </Link>
        </p>
      </GCard>
    );
  }

  if (panne) {
    return <p style={{ fontSize: 14, color: skin.ink, fontWeight: 700 }}>{t("panne")}</p>;
  }
  if (!journees) return null;

  // ⚠️ LA SÉRIE DU COMPTE PASSE PAR `serieVivante` COMME CELLE DU NAVIGATEUR. La
  // base rend la dernière journée de la suite, jamais un verdict : elle ne
  // connaît ni le fuseau du joueur ni la charnière de 11 h 30. Sans ce passage,
  // une série rompue depuis dix jours s'affichait encore intacte.
  const serie = bilan ? serieVivante({ jours: bilan.serie, fin: bilan.serieFin }, jour) : 0;

  const chiffre = (etiquette: string, valeur: string) => (
    <div key={etiquette} style={{ minWidth: 92 }}>
      <GLabel skin={skin}>{etiquette}</GLabel>
      <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 22, lineHeight: 1.1 }}>{valeur}</div>
    </div>
  );

  // Le sujet d'une journée, dans la langue de l'écran. Les deux formats ont deux
  // sources, et `programmeDe` sait laquelle.
  const sujetDe = (j: JourneeJouee) => {
    const prog = programmeDe(j.jour);
    return prog.type === "mots" ? themeLabel(prog.theme, locale) : enLangue(prog.question.texte, locale);
  };

  return (
    <>
      <GCard skin={skin} padding={16} accent={skin.accent2}>
        <GLabel skin={skin}>{t("compte.bilanTitre")}</GLabel>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 8 }}>
          {chiffre(t("compte.serieLabel"), nb.format(serie))}
          {chiffre(t("compte.parties"), nb.format(journees.length))}
          {bilan?.centileMoyen != null && chiffre(t("compte.devant"), t("motsPart", { p: nb.format(bilan.centileMoyen) }))}
          {bilan?.centileMeilleur != null &&
            chiffre(t("compte.devantMieux"), t("motsPart", { p: nb.format(bilan.centileMeilleur) }))}
        </div>
        {/* ⚠️ LA LÉGENDE EST DONNÉE UNE FOIS, PAS À CHAQUE LIGNE. « 14 % » ne se
            lit pas seul, et « plus c'est bas, mieux c'est » répété soixante fois
            devient du bruit à l'endroit exact où le joueur relit son passé. */}
        {bilan?.centileMoyen != null ? (
          <p style={{ margin: "10px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
            {t("historique.legende")}
          </p>
        ) : null}
      </GCard>

      {journees.length === 0 ? (
        <GCard skin={skin} padding={18} style={{ marginTop: 12 }}>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5 }}>{t("historique.vide")}</p>
          <p style={{ margin: "10px 0 0", fontSize: 13.5 }}>
            <Link href="/games/banalo-jour" style={{ color: skin.ink, fontWeight: 700 }}>
              {t("historique.versLeJeu")}
            </Link>
          </p>
        </GCard>
      ) : (
        <GCard skin={skin} padding={16} style={{ marginTop: 12 }}>
          <GLabel skin={skin}>{t("historique.titre")}</GLabel>
          {/* ⚠️ `minWidth: 0` SUR LA GRILLE, sinon la colonne se dimensionne sur
              le contenu le plus large. Les sujets ne se coupent pas (`nowrap`) :
              sans ça, « Quel est le poids de tous les ballons de football qui se
              trouvent en France aujourd'hui ? » poussait la carte à 760 px de
              large et faisait DÉFILER LA PAGE ENTIÈRE de côté, pourcentages
              compris, sur un téléphone de 390. Vu à l'écran ; ni tsc ni la
              relecture ne voient une largeur. */}
          <ul style={{ display: "grid", gap: 2, margin: "10px 0 0", padding: 0, listStyle: "none", minWidth: 0 }}>
            {journees.map((j) => (
              <li
                key={j.jour}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 12,
                  minWidth: 0,
                  padding: "7px 8px",
                  borderRadius: 6,
                  // La journée du jour est teintée : c'est le repère qui dit où
                  // l'on en est sans imprimer une date, que la base ne connaît pas.
                  background: j.jour === jour ? `${skin.accent}14` : "transparent",
                }}
              >
                {/* Le sujet se coupe plutôt que de pousser le centile hors de
                    la ligne : sur un téléphone, « Le poids de tous les ballons
                    de football… » fait trois fois la largeur disponible. */}
                <span
                  style={{
                    flex: "1 1 auto",
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {/* L'emoji suit le format, comme l'en-tête du jeu : c'est le
                      seul repère qui dit, avant de lire, ce qu'on a tapé ce
                      jour-là. Décoratif — le format est déjà dans le sujet. */}
                  <span aria-hidden style={{ marginRight: 7 }}>
                    {j.format === "mots" ? "💬" : "🎯"}
                  </span>
                  <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 15 }}>
                    {t("numero", { n: j.jour })}
                  </span>
                  <span style={{ color: skin.muted, fontSize: 14 }}> · {sujetDe(j)}</span>
                </span>
                {/* ⚠️ PAS DE `?? 0` SUR LE CENTILE. « 0 % ont fait mieux » veut
                    dire premier de la journée : c'est le repli le plus flatteur
                    possible sur une donnée absente, et il tomberait sur toutes
                    les journées jouées seul, où la position n'existe pas. */}
                <span
                  style={{
                    flex: "none",
                    fontFamily: skin.fontDisplay,
                    fontWeight: 800,
                    // Une journée sans position porte une PHRASE, pas un
                    // chiffre : elle se dit donc plus petit, sinon elle pèserait
                    // plus lourd que les centiles qu'on vient lire.
                    fontSize: j.mieux === null ? 12.5 : 15,
                    fontVariantNumeric: "tabular-nums",
                    color: j.mieux === null ? skin.muted : skin.ink,
                  }}
                >
                  {j.mieux === null ? t("historique.sansPosition") : t("motsPart", { p: nb.format(j.mieux) })}
                </span>
              </li>
            ))}
          </ul>
        </GCard>
      )}
    </>
  );
}
