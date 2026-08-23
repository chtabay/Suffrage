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
import { GBtn, GCard } from "@/components/games/ui";
import Modale from "@/components/games/Modale";
import { monJeton } from "@/lib/games/banalo/jeton";
import { nomDe } from "@/content/banalo/noms";
import { QR_URL } from "@/content/banalo/qr";
import ChoisirSonNom, { NOM_VIERGE, choixDeNom, type EtatNom } from "@/components/games/ChoisirSonNom";
import {
  creerTablee,
  derniereJourneeClose,
  mesTablees,
  type CreationTablee,
  type MembreTablee,
  type Tablee,
} from "@/lib/db/banalo";

const bcp = (locale: string) => (locale === "pcm" ? "en" : locale);

/**
 * Le lien d'un groupe, construit sur l'URL GRAVÉE du jeu.
 *
 * ⚠️ LE MOT VISIBLE EST « GROUPE », LES IDENTIFIANTS RESTENT « tablée ». Le
 * produit dit groupe d'amis ; les tables, les fonctions et les clés i18n gardent
 * leur nom, comme `scrutin_game_unanimo_*` l'a gardé après le passage à Banalo —
 * ce sont des identifiants, et les migrations appliquées ne se réécrivent pas.
 * L'URL, elle, a bougé : elle est visible, et aucun lien n'avait encore été
 * partagé (zéro groupe en base au moment du changement).
 */
export const lienTablee = (code: string) => `${QR_URL}/groupe/${code}`;

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
  // ⚠️ LES REFUS DE NOM VIENNENT DU NAMESPACE PARTAGÉ depuis que le tableau du
  // jour sert aussi Cinq sur cinq : « ce nom est déjà porté » se dit pareil
  // partout, et la règle qui le produit vit dans `ChoisirSonNom`. Un alias, pas
  // une clé en variable — le contrôle de parité ne voit que les clés en clair.
  const tj = useTranslations("TableauJeux");
  const locale = useLocale();
  const { user, loading } = useAuth();

  const [tablees, setTablees] = useState<Tablee[] | null>(null);
  /** A-t-il joué une journée AVANT celle-ci ? C'est le seuil de deux journées. */
  const [ancien, setAncien] = useState(false);
  const [nom, setNom] = useState<EtatNom>(NOM_VIERGE);
  const [envoi, setEnvoi] = useState(false);
  // ⚠️ LE VOCABULAIRE SUIT CELUI DU PSEUDO DE COMPTE : depuis qu'une tablée se
  // nomme par le pseudo, ses refus sont ceux du pseudo. Replier « votre pseudo a
  // été retiré » sur « panne » enverrait le joueur réessayer un geste qui ne
  // marchera jamais.
  const [souci, setSouci] = useState<CreationTablee["status"] | null>(null);
  /** Le tiroir de création. Fermé au départ : rien ne s'ouvre tout seul. */
  const [creation, setCreation] = useState(false);
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
      setCreation(false);
      const ts = await relis();
      if (ts) setTablees(ts);
      void partage(r.code);
      return;
    }
    setSouci(r.status);
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
        {/* ⚠️ UN MEMBRE PEUT N'AVOIR PLUS DE NOM, et une chaîne vide se lit
            comme une panne. La base rend `null` quand le pseudo du compte a été
            bloqué par la Régie — ou, depuis qu'elle existe, RETIRÉ par le joueur
            lui-même. On reste dans la tablée sans y être nommé : l'appartenance
            à un groupe et la publication d'un nom sont deux choses. */}
        {m.index !== null ? nomDe(m.index, locale) : (m.nom ?? tj("sansNom"))}
        {m.moi ? <span style={{ color: skin.accent, fontWeight: 800 }}> · {tj("vous")}</span> : null}
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

  // ⚠️ L'OFFRE TIENT EN UN BOUTON, PLUS EN UNE CARTE. Mesuré : la carte pesait
  // ~200 px sur un écran d'après-partie qui en fait déjà 2 500, pour une demande
  // qu'un joueur n'accepte qu'une fois dans sa vie. Le formulaire de nom part
  // dans un tiroir qu'on ouvre ; ce qui reste dans la page est une ligne.
  //
  // ⚠️ ET LE BOUTON EST `ghost`, PAS `accent` — la règle d'`InviterBanalo`. Il
  // cohabite avec l'offre de compte, qui porte l'accent depuis qu'un retour de
  // vrais joueurs l'a trouvée trop discrète ; deux demandes qui crient pareil se
  // cannibalisent (§0).
  return (
    <>
      <div style={{ marginTop: 12 }}>
        <GBtn skin={skin} variant="ghost" onClick={() => setCreation(true)}>
          {t("tablee.creerBouton")}
        </GBtn>
      </div>
      {creation ? (
        <Modale
          skin={skin}
          titre={t("tablee.creerTitre")}
          texte={t("tablee.creerTexte")}
          fermer={() => setCreation(false)}
          fermerLabel={t("qrFermer")}
          fermerDiscret
        >
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
          {/* ⚠️ CLÉS EN CLAIR, une par branche — une clé en variable échapperait
              au contrôle de parité i18n. */}
          {souci ? (
            <p role="alert" style={{ margin: "10px 0 0", fontSize: 13, fontWeight: 700, color: skin.ink }}>
              {souci === "trop" ? t("tablee.trop") : null}
              {souci === "pris" ? tj("pris") : null}
              {souci === "court" ? tj("court") : null}
              {souci === "long" ? tj("long") : null}
              {souci === "bloque" ? tj("pseudoRetire") : null}
              {souci === "ok" || souci === "compte" || souci === "pseudo" ||
              souci === "refus" || souci === "panne"
                ? tj("panne")
                : null}
            </p>
          ) : null}
          <GBtn
            skin={skin}
            variant="accent"
            full
            style={{ marginTop: 12 }}
            disabled={choixDeNom(nom) === null || envoi}
            onClick={() => void cree()}
          >
            {t("tablee.creerBouton")}
          </GBtn>
        </Modale>
      ) : null}
    </>
  );
}
