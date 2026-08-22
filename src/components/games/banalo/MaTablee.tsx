"use client";

// LA TABLÉE — la couche sociale, sans graphe d'amis.
//
// On n'est pas ami AVEC QUELQU'UN, on est DANS UNE TABLÉE : on rejoint par lien,
// on voit qui a joué aujourd'hui, et la tablée meurt avec sa purge. Il n'y a ni
// demande, ni acceptation, ni blocage, ni annuaire — et c'est exactement ce qui
// évite les cinq coûts que `docs/regularite-des-joueurs.md` §5 a refusé de
// payer. L'étude est dans `docs/amis-et-notifications.md`.
//
// ⚠️ CE BLOC N'OCCUPE PAS LA PLACE UNIQUE DE L'APRÈS-PARTIE, et la distinction
// est fine mais réelle. §0 réserve une seule place aux DEMANDES (le compte,
// l'installation, le pont vers Placet) — des choses qui font quitter le jeu.
// Une tablée qu'on a déjà est du RÉSULTAT, comme le tableau du jour : elle ne
// demande rien. En revanche l'OFFRE d'en créer une est bien une demande, et elle
// respecte donc la règle « la première demande se mérite » : rien avant deux
// journées jouées.
//
// ⚠️ ET L'OFFRE NE CONCURRENCE PAS L'OFFRE DE COMPTE, elle prolonge
// `InviterBanalo` : les deux servent à AMENER DU MONDE, et à onze joueurs c'est
// ce dont le jeu a besoin. Une tablée est une invitation qui garde les gens.
//
// ⚠️ PAS DE QR ICI, contrairement à `InviterBanalo`. Le QR du jeu est gravé dans
// `content/banalo/qr.ts` parce que l'URL du jeu ne change jamais ; le lien d'une
// tablée est différent à chaque fois, et l'encoder demanderait un générateur
// dans le navigateur. Le lien texte suffit — une tablée se partage par message.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/useAuth";
import { UNANIMO_SKIN as skin } from "@/lib/games/skin";
import { GBtn, GCard, GLabel } from "@/components/games/ui";
import { monJeton } from "@/lib/games/banalo/jeton";
import { nomDe } from "@/content/banalo/noms";
import { QR_URL } from "@/content/banalo/qr";
import ChoisirSonNom, { NOM_VIERGE, choixDeNom, type EtatNom } from "./ChoisirSonNom";
import {
  creerTablee,
  derniereJourneeClose,
  mesTablees,
  type MembreTablee,
  type Tablee,
} from "@/lib/db/banalo";

const bcp = (locale: string) => (locale === "pcm" ? "en" : locale);

/** Le lien d'une tablée, construit sur l'URL GRAVÉE du jeu. */
export const lienTablee = (code: string) => `${QR_URL}/tablee/${code}`;

export default function MaTablee({
  jour,
  theme,
  bloque = false,
}: {
  jour: number;
  theme: string | null;
  /**
   * Le tableau du jour demande déjà un nom : on se tait.
   *
   * ⚠️ UNE SEULE DEMANDE DE NOM PAR ÉCRAN. Les deux formulaires se sont
   * retrouvés l'un sous l'autre avec les MÊMES quatre noms proposés — même
   * jeton, même graine, même tour — et le joueur voyait deux fois le même nom
   * dans deux cartes voulant dire deux choses différentes. Le tableau passe
   * d'abord parce qu'il concerne AUJOURD'HUI et disparaît avec la journée ; une
   * tablée, elle, peut se créer demain. Ça ne bloque QUE l'offre : une tablée
   * qu'on a déjà reste affichée, c'est du résultat et non une demande.
   */
  bloque?: boolean;
}) {
  const t = useTranslations("BanaloJour");
  const locale = useLocale();
  const { user, loading } = useAuth();

  const [tablees, setTablees] = useState<Tablee[] | null>(null);
  /** A-t-il joué une journée AVANT celle-ci ? C'est le seuil de deux journées. */
  const [ancien, setAncien] = useState(false);
  const [nom, setNom] = useState<EtatNom>(NOM_VIERGE);
  const [envoi, setEnvoi] = useState(false);
  const [souci, setSouci] = useState<"trop" | "panne" | null>(null);
  const [copie, setCopie] = useState(false);

  const relis = useCallback(async () => {
    const jeton = monJeton();
    if (!jeton) return null;
    return mesTablees(jeton, jour, locale, theme);
  }, [jour, locale, theme]);

  useEffect(() => {
    let vivant = true;
    const jeton = monJeton();
    if (!jeton) return;
    void relis().then((ts) => {
      if (vivant && ts) setTablees(ts);
    });
    // ⚠️ « DEUX JOURNÉES JOUÉES » SE LIT AVEC LA FONCTION QUI EXISTE DÉJÀ. Une
    // journée close jouée avant celle-ci, plus celle d'aujourd'hui — puisque ce
    // bloc ne s'affiche qu'après avoir répondu — font exactement deux. Pas de
    // compteur à ajouter en base pour une question à laquelle on sait répondre.
    void derniereJourneeClose(jeton, jour).then((j) => {
      if (vivant) setAncien(j !== null);
    });
    return () => {
      vivant = false;
    };
  }, [relis, jour]);

  const nb = useMemo(
    () => new Intl.NumberFormat(bcp(locale), { maximumFractionDigits: theme === null ? 1 : 0 }),
    [locale, theme],
  );

  const partage = async (code: string) => {
    const texte = `${t("tablee.inviteTitre")}\n\n${lienTablee(code)}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) await navigator.share({ text: texte });
      else {
        await navigator.clipboard.writeText(texte);
        setCopie(true);
        window.setTimeout(() => setCopie(false), 2000);
      }
    } catch {
      // Partage refusé par l'utilisateur : rien à dire.
    }
  };

  const cree = async () => {
    const jeton = monJeton();
    const choix = choixDeNom(nom);
    if (!jeton || !choix || envoi) return;
    setEnvoi(true);
    setSouci(null);
    const r = await creerTablee(jeton, choix);
    setEnvoi(false);
    if (r.status === "ok") {
      const ts = await relis();
      if (ts) setTablees(ts);
      void partage(r.code);
      return;
    }
    setSouci(r.status === "trop" ? "trop" : "panne");
  };

  if (loading || tablees === null) return null;

  const membre = (m: MembreTablee, cle: string) => (
    <li
      key={cle}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 12,
        minWidth: 0,
        padding: "5px 8px",
        borderRadius: 6,
        background: m.moi ? `${skin.accent}1A` : "transparent",
        fontWeight: m.moi ? 800 : 600,
        // Qui n'a pas encore joué s'estompe — le geste de `RevealBoard`, qui ne
        // barre rien et ne colle aucune icône.
        opacity: m.joue ? 1 : 0.55,
      }}
    >
      <span style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {m.index !== null ? nomDe(m.index, locale) : (m.nom ?? "")}
        {m.moi ? <span style={{ color: skin.accent, fontWeight: 800 }}> · {t("tableau.vous")}</span> : null}
      </span>
      {/* TROIS ÉTATS, ET IL EN FAUT TROIS. Un score ; « a joué » sans chiffre
          pour qui a joué dans une AUTRE langue — sa foule n'est pas la mienne,
          donc son résultat ne se compare pas au mien ; et « pas encore » pour
          qui n'a pas joué. Replier le deuxième sur le troisième dirait « n'a pas
          joué » de quelqu'un qui a joué. */}
      <span
        style={{
          flex: "none",
          fontFamily: m.score !== null ? skin.fontDisplay : undefined,
          fontWeight: m.score !== null ? 800 : 700,
          fontSize: m.score !== null ? 15 : 12.5,
          color: m.score !== null ? skin.ink : skin.muted,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {m.score !== null
          ? theme === null
            ? t("tableau.scoreNombre", { n: nb.format(m.score) })
            : t("motsScoreCourt", { n: nb.format(m.score) })
          : m.joue
            ? t("tablee.ailleurs")
            : t("tablee.pasEncore")}
      </span>
    </li>
  );

  if (tablees.length > 0) {
    return (
      <>
        {tablees.map((tb) => {
          const joueurs = tb.membres.filter((m) => m.joue).length;
          // ⚠️ UNE TABLÉE D'UN SEUL MEMBRE N'EST PAS UN CLASSEMENT, c'est une
          // invitation qui n'a pas encore abouti. Imprimer une liste d'une ligne
          // avec son propre score, c'est le « 1er sur 1 » que le jeu refuse
          // partout ailleurs — `VOTANTS_MIN` vaut 2, `INSCRITS_MIN` vaut 2, la
          // courbe attend cinquante. Vu à l'écran juste après la création : la
          // carte affichait « 1 joueur » et une seule ligne, ce qui se lit comme
          // un tableau cassé.
          const seul = tb.membres.length < 2;
          return (
            <GCard key={tb.code} skin={skin} padding={18}>
              {/* ⚠️ UN TITRE ET UNE PHRASE D'ÉTAT, PAS UN EN-TÊTE DE TABLEAU —
                  et c'est ce qui distingue cette carte de la précédente. Mesuré
                  à l'écran : le tableau du jour et la tablée affichaient deux
                  listes de noms d'animaux avec des voix à droite, à vingt pixels
                  l'une de l'autre, tirées du MÊME vocabulaire de 600 — le même
                  nom pouvait figurer dans les deux. Un joueur ne pouvait pas les
                  distinguer au coup d'œil. La tablée dit d'abord l'état du
                  groupe (« 3 sur 4 ont joué »), le tableau dit d'abord le
                  classement : deux objets, deux lectures. */}
              <p
                style={{
                  fontFamily: skin.fontDisplay,
                  fontWeight: 800,
                  fontSize: 17,
                  lineHeight: 1.25,
                  margin: 0,
                }}
              >
                {t("tablee.titre")}
              </p>
              <p style={{ margin: "5px 0 0", fontSize: 13.5, color: skin.muted, lineHeight: 1.45 }}>
                {/* Les trois clés sont écrites EN CLAIR : une clé choisie en
                    variable échapperait au contrôle de parité i18n. Le cas
                    « personne n'a joué » n'existe pas — cette carte ne s'affiche
                    qu'après ma propre réponse, et j'en suis membre. */}
                {seul
                  ? t("tablee.seulMembre")
                  : joueurs > 1
                    ? t("tablee.ontJoue", { n: joueurs, total: tb.membres.length })
                    : t("tablee.aJoue", { total: tb.membres.length })}
              </p>
              {!seul ? (
                <ul style={{ display: "grid", gap: 2, margin: "12px 0 0", padding: 0, listStyle: "none", minWidth: 0, fontSize: 14.5 }}>
                  {tb.membres.map((m, i) => membre(m, `${tb.code}-${i}`))}
                </ul>
              ) : null}
              <div style={{ marginTop: 12 }}>
                <GBtn skin={skin} variant="ghost" onClick={() => void partage(tb.code)}>
                  {copie ? t("copie") : t("tablee.inviter")}
                </GBtn>
              </div>
            </GCard>
          );
        })}
      </>
    );
  }

  // ⚠️ RIEN AVANT DEUX JOURNÉES JOUÉES. §0 : « la première demande se mérite ».
  // Un joueur qui découvre le jeu n'a personne à inviter et n'a rien à garder ;
  // une demande ignorée coûte la crédibilité des suivantes.
  if (!ancien || bloque) return null;

  // ⚠️ L'OFFRE EST DISCRÈTE, ET C'EST LA RÈGLE D'`InviterBanalo` REPRISE TELLE
  // QUELLE. Vu à l'écran : en carte à l'accent, elle se retrouvait empilée avec
  // l'offre de compte, elle aussi à l'accent — deux demandes qui crient pareil,
  // c'est-à-dire exactement ce que §0 appelle se cannibaliser. `InviterBanalo`
  // avait déjà tranché pour son bouton : même forme, même famille, mais `ghost`
  // et pas `accent`, parce qu'il cohabite avec une demande plus forte. Le bloc
  // du compte garde donc l'accent — il l'a reçu après un retour de vrais joueurs
  // qui le trouvaient trop discret, et on ne le lui reprend pas.
  //
  // ⚠️ Si la mesure montre un jour que personne ne crée de tablée, c'est LÀ que
  // ça se corrige — en la promouvant dans l'échelle du §0, sur des chiffres, pas
  // en lui redonnant l'accent au jugé.
  return (
    <GCard skin={skin} padding={18}>
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
        {t("tablee.creerTitre")}
      </p>
      <p style={{ margin: "7px 0 0", fontSize: 14, lineHeight: 1.5, color: skin.muted, maxWidth: "46ch" }}>
        {t("tablee.creerTexte")}
      </p>
      <ChoisirSonNom
        jeton={monJeton()}
        portee="tablee"
        connecte={Boolean(user)}
        etat={nom}
        setEtat={(e) => {
          setNom(e);
          setSouci(null);
        }}
      />
      {souci ? (
        <p style={{ margin: "10px 0 0", fontSize: 13, fontWeight: 700, color: skin.ink }}>
          {souci === "trop" ? t("tablee.trop") : t("tableau.panne")}
        </p>
      ) : null}
      <GBtn
        skin={skin}
        variant="ghost"
        full
        style={{ marginTop: 12 }}
        disabled={choixDeNom(nom) === null || envoi}
        onClick={() => void cree()}
      >
        {t("tablee.creerBouton")}
      </GBtn>
    </GCard>
  );
}
