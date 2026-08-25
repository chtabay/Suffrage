"use client";

// LE TABLEAU DU JOUR — un nom, un score, et rien d'autre.
//
// ══ LA RÈGLE ═══════════════════════════════════════════════════════════════
//
// Pour figurer au tableau il faut DÉPOSER UN NOM : le pseudo de son compte
// Placet si on en a un, sinon un nom qu'on ÉCRIT — ou qu'on prend dans la liste
// que le jeu propose (`src/content/banalo/noms.ts`, 600 noms par langue). Qui ne
// dépose rien joue normalement, voit son rang et son centile sur sa carte de
// score, et n'apparaît pas ici.
//
// ⚠️ LE TEXTE LIBRE SANS COMPTE A ÉTÉ FERMÉ, PUIS ROUVERT LE 24/08. Le
// raisonnement qui le fermait n'est pas réfuté — un champ de pseudo public est
// un canal de publication, un filtre de gros mots n'attrape pas « Marie du CM2
// pue », un jeton anonyme ne se bannit pas — il est SURCLASSÉ : la liste fermée
// n'était pas une friction, c'était un refus, et le tableau restait vide. Tout
// est écrit dans `ChoisirSonNom` et dans
// `20260913-jeux-nom-libre-sans-compte.sql`, avec la prise de Régie qui permet
// d'en retirer un. La politique de modération est REPORTÉE, pas décidée.
//
// ⚠️ ON N'Y ENTRE QUE PAR UN GESTE. Personne n'est inscrit sans l'avoir voulu :
// c'est ce qui rend acceptable d'afficher le dernier autant que le premier,
// puisque le dernier n'y est que s'il a choisi d'y être.
//
// ⚠️ ET IL NE MONTRE JAMAIS LES MOTS. Un nom et un score. La garde du format
// « mots » — ne jamais rendre à un joueur le mot d'un autre — n'est pas entamée
// d'un pouce, et le tableau n'est pas la porte dérobée par laquelle elle
// tomberait.
//
// ⚠️ ET LE COMPTE CONDITIONNE LE NOM, JAMAIS LA PRÉSENCE, parce que c'est
// mesuré : la base compte 2 comptes rattachés contre 11 joueurs sur la
// journée 2. Exiger un compte pour figurer au tableau le réduirait à deux lignes
// sur onze — un tableau vide n'est pas un tableau prudent, c'est un tableau
// mort.
//
// ⚠️ ON N'Y ENTRE QUE PAR UN GESTE. Personne n'est inscrit sans l'avoir voulu :
// c'est ce qui rend acceptable d'afficher le dernier autant que le premier,
// puisque le dernier n'y est que s'il a choisi d'y être.
//
// ⚠️ ET IL NE MONTRE JAMAIS LES MOTS. Un nom et un score. La garde du format
// « mots » — ne jamais rendre à un joueur le mot d'un autre — n'est pas entamée
// d'un pouce, et le tableau n'est pas la porte dérobée par laquelle elle
// tomberait.
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/useAuth";
import type { GameSkin } from "@/lib/games/skin";
import { GBtn, GCard, GLabel } from "@/components/games/ui";
import ChoisirSonNom, { NOM_VIERGE, choixDeNom, type EtatNom } from "./ChoisirSonNom";
import ListeDuTableau from "./ListeDuTableau";
import ConnexionJeux from "./ConnexionJeux";
import Modale from "./Modale";
import OffreNotifs from "./OffreNotifs";
import { monPseudo } from "@/lib/db/jeux";
import type { ChoixDeNom, DepotNom, Tableau } from "@/lib/db/banalo";


/** Le plancher d'affichage, celui de la base (`v_min`). Seul inscrit, on serait « premier sur un ». */
const INSCRITS_MIN = 2;

/**
 * Où l'on se souvient d'avoir proposé les notifications.
 *
 * ⚠️ SANS NUMÉRO DE JOURNÉE NI NOM DE JEU, contrairement à `memoire`. Un
 * abonnement vaut pour le navigateur, pour les deux jeux et pour toujours : le
 * proposer une fois par jeu et par jour ferait quatorze boîtes par semaine pour
 * une décision qui se prend une fois.
 */
const MEMOIRE_NOTIFS = "placet.jeux.notifs.propose";

export default function TableauDuJour({
  skin,
  jeton,
  lis,
  depose: deposeChoix,
  score: enMots,
  explication,
  duree,
  memoire,
  onDemande,
}: {
  skin: GameSkin;
  /** Le jeton du jeu appelant. Chaque jeu a le sien, et ils sont distincts. */
  jeton: string | null;
  /** Relire le tableau. L'appelant sait quelles clés son jeu exige. */
  lis: () => Promise<Tableau | null>;
  /** Déposer un nom, et rendre le statut de la base. */
  depose: (choix: ChoixDeNom) => Promise<DepotNom>;
  /**
   * Le chiffre d'une ligne, mis en mots.
   *
   * ⚠️ CHAQUE JEU A SON UNITÉ, ET ELLES NE SE COMPARENT PAS : une somme de voix
   * chez Banalo, une note sur 100 sur son format chiffré, un NOMBRE D'ESSAIS
   * chez Cinq sur cinq — où le meilleur est le plus PETIT. Le tableau ne
   * formate donc rien lui-même : il affiche ce que l'appelant lui rend.
   */
  score: (n: number) => string;
  /** Pourquoi la liste est fermée, en une phrase (voir `ChoisirSonNom`). */
  explication: string;
  /** Ce que devient ce nom, en une phrase — ou `null` si le joueur a un compte. */
  duree: string;
  /**
   * De quoi se souvenir qu'on a déjà proposé, pour CE jeu et CETTE journée.
   *
   * ⚠️ LA MODALE NE S'OUVRE QU'UNE FOIS PAR JOURNÉE, et c'est ce qui la rend
   * acceptable. `AideModale` est la seule modale des jeux pour une raison
   * précise — « une fois par aide et par partie » —, et une boîte qui surgit à
   * chaque visite devient la boîte qu'on ferme sans lire, ce qui userait la
   * seule forme d'annonce dont le jeu dispose.
   */
  memoire: string;
  /**
   * Prévient le parent que CE bloc demande un nom au joueur.
   *
   * ⚠️ IL NE PEUT Y AVOIR QU'UNE DEMANDE DE NOM PAR ÉCRAN. La tablée en pose une
   * aussi, et les deux formulaires se sont retrouvés l'un sous l'autre, avec les
   * MÊMES quatre noms proposés (même graine, même tour) : le joueur voyait deux
   * fois « Renard des sables » dans deux cartes différentes, et le choisir d'un
   * côté ne le choisissait pas de l'autre. Vu au navigateur, invisible autrement.
   */
  onDemande?: (demande: boolean) => void;
}) {
  const t = useTranslations("TableauJeux");
  // ⚠️ `loading` COMPTE : sans lui, le champ de nom libre clignoterait — absent
  // le temps que la session revienne, puis présent — devant quelqu'un qui a un
  // compte. Le même défaut que `CompteBanalo` évite en ne rendant rien.
  const { user, loading } = useAuth();

  const [tableau, setTableau] = useState<Tableau | null>(null);
  // ⚠️ LE CHOIX DU NOM VIT DANS `ChoisirSonNom`, PAS ICI — la règle est partagée
  // avec la tablée, et une règle recopiée dérive.
  const [nom, setNom] = useState<EtatNom>(NOM_VIERGE);
  const [envoi, setEnvoi] = useState(false);
  const [souci, setSouci] = useState<DepotNom | null>(null);
  /**
   * LA MODALE QUI PROPOSE DE SE NOMMER.
   *
   * ⚠️ ELLE SURGIT, ET C'EST UNE EXCEPTION ASSUMÉE. La règle du dépôt est
   * qu'« une modale que le joueur ouvre n'est pas une modale qui surgit » ;
   * celle-ci surgit parce que le formulaire posé en bas d'un écran de 2 400 px
   * ne se voyait pas — c'est le troisième reproche de terrain de la même
   * semaine sur un bloc trop discret. Deux gardes la rendent tenable : UNE FOIS
   * par jeu et par journée, et jamais avant que la partie ne soit finie
   * (l'appelant ne monte ce bloc qu'à ce moment-là).
   */
  const [modale, setModale] = useState<null | "nom" | "notifs">(null);
  /**
   * L'offre de notification a-t-elle un BOUTON à montrer ?
   *
   * ⚠️ SANS CETTE RÉPONSE ON OUVRIRAIT UNE BOÎTE VIDE. `OffreNotifs` se tait
   * dans cinq cas et ne rend qu'une phrase dans trois autres ; ouvrir une modale
   * pour annoncer « votre navigateur a refusé » serait du bruit.
   */
  const [notifsUtiles, setNotifsUtiles] = useState(false);

  const relis = useCallback(async () => (jeton ? lis() : null), [jeton, lis]);

  /**
   * LE PSEUDO DU COMPTE, LU ICI ET PAS DANS LE FORMULAIRE.
   *
   * ⚠️ IL ÉTAIT LU PAR `ChoisirSonNom`, ET ÇA FAISAIT UN VERROU. `demande` a
   * besoin de `nom.lu` pour décider s'il faut demander quelque chose ; or
   * `ChoisirSonNom` n'est monté QUE si `demande` est vrai. Tant que la carte
   * montrait le formulaire dans tous les cas, l'amorçage passait par hasard ;
   * le jour où elle a cessé de le faire, `lu` n'est jamais devenu vrai, et la
   * carte s'est effacée entièrement. Vu à l'écran, invisible à tsc.
   *
   * ⚠️ ON DÉPEND DE L'IDENTIFIANT, PAS DE L'OBJET `user` : `useAuth` rend un
   * objet dont la référence change à chaque relecture de session.
   */
  const uid = user?.id ?? null;
  const luPseudo = useRef<string | null>(null);
  useEffect(() => {
    if (!uid || luPseudo.current === uid) return;
    luPseudo.current = uid;
    let vivant = true;
    void monPseudo().then((p) => {
      if (!vivant) return;
      // ⚠️ UN REFUS (`null`) N'EST PAS « PAS DE PSEUDO » : on le traite comme une
      // lecture finie sans nom, et la base tranchera au dépôt. Mentir dans
      // l'autre sens afficherait un nom vide en gros caractères.
      setNom((n) => ({ ...n, pseudo: p?.pseudo ?? null, bloque: p?.bloque === true, lu: true }));
    });
    return () => {
      vivant = false;
    };
  }, [uid]);

  useEffect(() => {
    let vivant = true;
    void relis().then((tb) => {
      if (vivant && tb) setTableau(tb);
    });
    return () => {
      vivant = false;
    };
  }, [relis]);

  // ⚠️ DANS UN EFFET, PAS PENDANT LE RENDU : appeler `onDemande` au fil du rendu
  // ferait un `setState` du parent pendant le rendu de l'enfant, ce que React
  // refuse.
  /**
   * LE JOUEUR CONNECTÉ QUI A DÉJÀ UN PSEUDO N'A RIEN À DÉPOSER.
   *
   * ⚠️ SIGNALÉ PAR UN JOUEUR : « en tant que joueur connecté, il m'est demandé
   * après avoir joué de déposer son pseudo qu'on a enregistré ». Il a raison, et
   * `choixDeNom` le prouve — il rend `{ compte: true }`, une charge utile SANS
   * libellé, parce que la base résout le nom elle-même. Le bouton n'apprenait
   * rien à personne.
   *
   * ⚠️ CE N'ÉTAIT POURTANT PAS UN DÉPÔT DE NOM, MAIS UN CONSENTEMENT À
   * PUBLICATION — « on n'y entre que par un geste », en tête de ce fichier.
   * L'argument tombe pour un COMPTE, et c'est vérifiable :
   * `scrutin_jeux_saison_table` joint UNIQUEMENT `scrutin_jeux_pseudos`, donc
   * tout compte qui a posé un pseudo figure déjà au classement de saison,
   * publiquement, sous ce même nom, sans aucun geste quotidien — et ce
   * tableau-là est permanent, quand celui du jour se purge à trente jours. On
   * demandait tous les jours l'autorisation d'une exposition PLUS FAIBLE que
   * celle qu'on avait accordée une fois. Le jeu allait jusqu'à écrire, le jour
   * où le pseudo se crée, « on ne vous le redemandera plus ».
   *
   * ⚠️ SANS COMPTE, RIEN NE CHANGE : la liste fermée et le consentement unique
   * y font tout le travail, et c'est cette moitié-là qui porte la justification
   * de l'absence de modération.
   *
   * ⚠️ ET LA SORTIE EXISTE DÉSORMAIS : `scrutin_jeux_pseudo_retirer`, dans
   * « Résultats et classements ». Une décision, au lieu d'une par jour.
   */
  const inscritDOffice = Boolean(user) && nom.lu && nom.pseudo !== null && !nom.bloque;
  // ⚠️ TANT QU'ON NE SAIT PAS, ON NE DEMANDE PAS. Sans cette attente, un
  // connecté verrait `demande` passer à vrai puis à faux le temps de la lecture
  // du pseudo — et la tablée, qui s'efface quand ce bloc demande, clignoterait.
  const enAttente = Boolean(user) && !nom.lu;
  const demande = tableau !== null && !tableau.inscrit && !inscritDOffice && !enAttente;
  useEffect(() => {
    onDemande?.(demande);
  }, [demande, onDemande]);

  /**
   * L'OUVERTURE, UNE SEULE FOIS.
   *
   * ⚠️ LA MARQUE S'ÉCRIT À L'OUVERTURE, PAS À LA FERMETURE. Écrite en fermant,
   * elle manquerait à tous ceux qui rechargent la page ou la quittent sans
   * répondre : la boîte reviendrait au chargement suivant, c'est-à-dire
   * exactement la boîte qu'on ferme sans lire.
   *
   * ⚠️ ET LE `ref` NE SUFFIT PAS TOUT SEUL. Il empêche la boucle dans CETTE
   * page ; c'est `localStorage` qui tient la promesse d'une seule fois par
   * journée. Le `try` est nécessaire : en navigation privée, y écrire lève.
   */
  const proposee = useRef(false);
  useEffect(() => {
    if (proposee.current || !demande) return;
    proposee.current = true;
    try {
      if (window.localStorage.getItem(memoire)) return;
      window.localStorage.setItem(memoire, "1");
    } catch {
      // Pas de mémoire : on propose quand même, une fois par chargement. Se
      // taire priverait de l'annonce ceux qui bloquent le stockage.
    }
    setModale("nom");
  }, [demande, memoire]);

  /**
   * L'INSCRIPTION D'OFFICE, une seule fois par écran.
   *
   * ⚠️ LE `ref` N'EST PAS UNE PRÉCAUTION DE STYLE. `depose` et `lis` arrivent en
   * fonctions fléchées, donc leur référence change à chaque rendu : sans lui,
   * l'effet rejouerait son écriture à chaque battement. C'est le même garde que
   * `ChoisirSonNom` pose sur la lecture du pseudo.
   */
  const posee = useRef(false);
  useEffect(() => {
    if (posee.current || !jeton || !tableau || tableau.inscrit || !inscritDOffice) return;
    posee.current = true;
    void (async () => {
      const r = await deposeChoix({ compte: true });
      // « deja » veut dire qu'un autre onglet a été plus rapide : dans les deux
      // cas la vérité est en base, on relit plutôt que de la supposer.
      if (r === "ok" || r === "deja") {
        const tb = await relis();
        if (tb) setTableau(tb);
      }
    })();
  }, [jeton, tableau, inscritDOffice, deposeChoix, relis]);

  /**
   * L'OFFRE DE NOTIFICATION, PROPOSÉE UNE FOIS PAR NAVIGATEUR.
   *
   * ⚠️ C'EST LE TROU QU'UN JOUEUR A VU : « est-ce que la notif est demandée dès
   * qu'on crée un compte ? ». Non — un connecté qui a un pseudo est INSCRIT
   * D'OFFICE, donc `demande` est faux, donc la modale du nom ne s'ouvrait jamais
   * pour lui. Il ne se voyait proposer les notifications nulle part, sauf sur
   * `/games/quotidien` — la page que les joueurs ne visitent pas.
   *
   * ⚠️ UNE FOIS PAR NAVIGATEUR, PAS PAR JOURNÉE. Un nom se dépose chaque jour ;
   * un abonnement se pose UNE fois et vaut pour toujours. Redemander chaque jour
   * ferait la boîte qu'on ferme sans lire — le défaut que `rappelleLaMethode`
   * évite chez Cinq sur cinq. Qui refuse garde le chemin des réglages.
   *
   * ⚠️ ET JAMAIS EN MÊME TEMPS QUE LA DEMANDE DE NOM : §0 n'admet qu'une
   * demande. Celle du nom passe d'abord — elle ne vaut que pour aujourd'hui,
   * l'autre attendra demain.
   */
  const offerte = useRef(false);
  useEffect(() => {
    if (offerte.current || demande || modale || !notifsUtiles) return;
    offerte.current = true;
    try {
      if (window.localStorage.getItem(MEMOIRE_NOTIFS)) return;
      window.localStorage.setItem(MEMOIRE_NOTIFS, "1");
    } catch {
      // Pas de mémoire : on propose une fois par chargement plutôt que jamais.
    }
    setModale("notifs");
  }, [demande, modale, notifsUtiles]);

  // ⚠️ MÉMORISÉ : passé en fonction fléchée, sa référence changerait à chaque
  // rendu et l'effet de `OffreNotifs` rejouerait à chaque battement.
  const ditSiUtile = useCallback((u: boolean) => setNotifsUtiles(u), []);

  const deposeLeNom = async () => {
    if (!jeton || envoi) return;
    const choix = choixDeNom(nom);
    if (!choix) return;
    setEnvoi(true);
    setSouci(null);
    const r = await deposeChoix(choix);
    setEnvoi(false);
    if (r === "ok") {
      const tb = await relis();
      if (tb) setTableau(tb);
      // Le nom est déposé : la boîte n'a plus rien à demander.
      setModale(null);
      return;
    }
    setSouci(r);
    // ⚠️ UN NOM PRIS SE REMPLACE, IL NE SE REDEMANDE PAS. Laisser la même liste
    // sous un message d'erreur invite à recliquer le nom qui vient d'échouer.
    if (r === "pris") setNom({ ...nom, tour: nom.tour + 1, index: null, libre: "" });
    // « deja » veut dire que ce joueur est inscrit — depuis un autre onglet, ou
    // parce que la réponse du premier dépôt s'est perdue en route. On relit
    // plutôt que de le laisser devant un formulaire qui ne marchera jamais.
    if (r === "deja") {
      const tb = await relis();
      if (tb) setTableau(tb);
    }
  };

  // ⚠️ LE GARDE DE RENDU VIENT APRÈS TOUS LES CROCHETS, jamais avant : un
  // `return` placé plus haut sauterait `useEffect` selon l'état,
  // ce que React interdit.
  if (loading || !tableau) return null;

  // ⚠️ PAS DE CARTE VIDE. `enAttente` dure le temps de lire le pseudo du compte,
  // et pendant ce temps il n'y a ni liste, ni formulaire, ni phrase : la carte
  // se réduisait à son titre — 70 px d'un cadre qui n'annonce rien, mesuré à
  // l'écran. C'est la même règle que `ChoisirSonNom` s'applique déjà (« on
  // n'affiche rien tant qu'on ne sait pas ») et que `InstallJeu` écrit en
  // majuscules : PAS D'ACCROCHE SANS BOUTON. La liste, elle, vaut d'être
  // montrée même pendant l'attente — c'est le reste qui n'existe pas encore.
  if (enAttente && tableau.lignes.length === 0) return null;

  const pret = choixDeNom(nom) !== null;

  /**
   * LE FORMULAIRE, EN UN SEUL EXEMPLAIRE.
   *
   * ⚠️ IL NE PEUT PAS ÊTRE RENDU DEUX FOIS. La carte et la modale montreraient
   * les MÊMES trois suggestions (même jeton, même graine, même tour) dans deux
   * boîtes voulant dire deux choses — exactement le défaut déjà payé entre le
   * tableau et la tablée, où le joueur voyait deux fois « Renard des sables ».
   * Tant que la modale est ouverte, la carte s'en passe.
   */
  const formulaire = (
      <div style={{ marginTop: tableau.lignes.length > 0 ? 16 : 10 }}>
        {/* ⚠️ L'INVITE EST DANS LA CARTE, PAS DANS LA MODALE. La boîte a déjà un
            TITRE et une phrase qui disent la même chose ; empilées, on lisait
            « Laissez un nom : les autres joueurs verront votre résultat » puis
            « Laissez un nom pour figurer au tableau de la journée ». Ça ne se
            voit qu'à l'écran. */}
        {modale ? null : (
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>{t("invite")}</p>
        )}

        <ChoisirSonNom
          skin={skin}
          jeton={jeton}
          explication={explication}
          connecte={Boolean(user)}
          etat={nom}
          setEtat={(e) => {
            setNom(e);
            setSouci(null);
          }}
        />

        {/* ⚠️ LE MESSAGE SE POSE SOUS LES PASTILLES, PAS SOUS LE BOUTON. Vu à
            l'écran : plus bas, « ce nom est déjà porté » se lisait quatre
            lignes après la liste qu'il vient de renouveler, et le joueur ne
            faisait pas le lien entre les deux. */}
        {/* ⚠️ LES CLÉS SONT ÉCRITES EN CLAIR, une par branche : une clé choisie
            en variable échapperait au contrôle de parité i18n. */}
        {souci ? (
          <p style={{ margin: "10px 0 0", fontSize: 13, fontWeight: 700, color: skin.ink }}>
            {souci === "pris" ? t("pris") : null}
            {souci === "deja" ? t("deja") : null}
            {souci === "court" ? t("court") : null}
            {souci === "long" ? t("long") : null}
            {souci === "bloque" ? t("pseudoRetire") : null}
            {souci === "panne" || souci === "refus" || souci === "compte" || souci === "pseudo"
              ? t("panne")
              : null}
          </p>
        ) : null}
        <GBtn
          skin={skin}
          variant="accent"
          size="md"
          full
          style={{ marginTop: 12 }}
          disabled={!pret || envoi}
          onClick={() => void deposeLeNom()}
        >
          {t("deposer")}
        </GBtn>

        {/* ⚠️ CETTE PHRASE NE S'ADRESSE QU'À QUI N'A PAS DE COMPTE, pour deux
            raisons. Elle serait FAUSSE pour les autres — derrière un compte le
            nom est le pseudo Placet, permanent. Et elle serait REDONDANTE :
            `ChoisirSonNom` vient de dire, deux lignes plus haut, soit « c'est
            votre pseudo Placet », soit « ce nom devient votre pseudo Placet ».
            Vu à l'écran : les deux phrases s'empilaient et disaient la même
            chose deux fois.

            Pour un anonyme elle reste nécessaire : « ce nom ne vaut que pour
            aujourd'hui » est la différence entre ce tableau et le « nom
            permanent et découvrable » que `docs/regularite-des-joueurs.md` §5
            donnait comme le vrai coût d'un système d'amis. */}
        {user ? null : (
          <p style={{ margin: "10px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
            {duree}
          </p>
        )}
      </div>
  );

  return (
    <>
    <GCard skin={skin} padding={18}>
      <GLabel skin={skin}>{t("titre")}</GLabel>

      {/* ⚠️ DIX LIGNES ICI, CINQ SUR LA JOURNÉE ARRÊTÉE. C'est l'écran de la
          partie : le joueur vient d'y jouer, la liste est ce qu'il est venu
          voir. `JourneePrecedente` est une carte de relecture, elle en montre
          moins. La règle de coupe — et le repêchage de ma ligne quand elle
          tombe hors de la tête coupée — vit dans `ListeDuTableau`, en un seul
          endroit. */}
      <ListeDuTableau
        skin={skin}
        lignes={tableau.lignes}
        moi={tableau.moi}
        score={enMots}
        max={10}
        effectif={t("inscrits", { n: tableau.inscrits })}
      />

      {/* ⚠️ C'EST `demande` QUI DÉCIDE, PAS `tableau.inscrit`, ET C'ÉTAIT LE
          DÉFAUT. Signalé avec une capture : « je vois "déposer ce nom" alors
          que je suis connecté et que le pseudo est déjà enregistré ; il n'y a
          plus rien à faire à ce stade ». Un connecté qui a un pseudo est
          INSCRIT D'OFFICE — `demande` est donc faux, la modale ne s'ouvre pas,
          et le parent est prévenu — mais la CARTE, elle, testait
          `tableau.inscrit`. Tant que l'écriture de fond n'avait pas atterri (ou
          si elle échouait), elle retombait sur le formulaire et offrait un
          bouton qui n'apprend rien à personne. Les trois branches lisent
          maintenant la même vérité. */}
      {tableau.inscrit && tableau.bloque ? (
        // ⚠️ INSCRIT, MAIS RETIRÉ DE LA LISTE. Sans cette phrase, le joueur se
        // cherche dans un tableau où il ne peut pas être, et rien ne lui dit
        // que le geste qui l'y remettrait est de reposer un pseudo.
        <p style={{ margin: "10px 0 0", fontSize: 13.5, lineHeight: 1.5, fontWeight: 700 }}>
          {t("pseudoRetire")}
        </p>
      ) : demande ? (
        modale ? null : formulaire
      ) : enAttente ? null : (
        <>
          {tableau.lignes.length === 0 ? (
            // Inscrit, mais seul : le tableau n'existe pas encore. On le DIT — une
            // information absente sans un mot se lit comme une panne, et le joueur
            // part la chercher ailleurs.
            <p style={{ margin: "10px 0 0", fontSize: 13.5, color: skin.muted, lineHeight: 1.5 }}>
              {t("seul", { n: INSCRITS_MIN })}
            </p>
          ) : null}
          {/* ⚠️ ON DIT SOUS QUEL NOM ON PUBLIE, PUISQU'ON NE LE DEMANDE PLUS.
              Retirer le geste sans dire le nom publierait quelqu'un sans qu'il
              puisse le lire — et le premier jour, quand le tableau est encore
              sous son plancher de deux inscrits, il ne verrait même pas sa
              propre ligne. La phrase dit aussi où ce nom se change ET se
              retire : sans lien, `GameShell` interdisant la nav de Placet
              pendant une partie. */}
          {inscritDOffice && nom.pseudo ? (
            <p style={{ margin: "10px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
              {t("figureSous", { nom: nom.pseudo })}
            </p>
          ) : null}
        </>
      )}

      {/* ⚠️ L'OFFRE DE NOTIFICATION VIT DANS LA CARTE, la modale ne fait que la
          MONTRER une fois. C'est elle qui dit au parent s'il y a un bouton, donc
          elle doit être montée même quand la boîte est fermée — et c'est aussi
          le lieu durable pour qui a fait « Plus tard » : sans ça, un refus la
          ferait disparaître pour toujours.

          ⚠️ ELLE SE TAIT PENDANT QU'ON DEMANDE UN NOM. §0 n'admet qu'une demande
          à la fois, et le nom passe d'abord : il ne vaut que pour aujourd'hui. */}
      {user && !demande ? (
        <div style={{ marginTop: tableau.lignes.length > 0 ? 16 : 12 }}>
          <OffreNotifs
            skin={skin}
            uid={user.id}
            texte={t("modaleNotifsTexte")}
            onUtile={ditSiUtile}
          />
        </div>
      ) : null}
    </GCard>

    {/* ⚠️ LA MODALE PORTE LE MÊME FORMULAIRE, jamais une copie — voir sa
        déclaration. Elle y ajoute la SECONDE porte : un compte. Les deux
        répondent à la même question (« sous quel nom ? »), mais l'une nomme
        pour aujourd'hui et l'autre pour toujours, et c'est au joueur de
        choisir. */}
    {modale ? (
      <Modale
        skin={skin}
        /* ⚠️ LES QUATRE CLÉS SONT ÉCRITES EN CLAIR, deux par branche : une clé
           choisie en variable échapperait au contrôle de parité i18n. */
        titre={modale === "notifs" ? t("modaleNotifsTitre") : t("modaleTitre")}
        texte={modale === "notifs" ? t("modaleNotifsTexte") : t("modaleTexte")}
        fermer={() => setModale(null)}
        fermerLabel={t("modalePlusTard")}
        /* ⚠️ « Plus tard » S'EFFACE : le geste de la boîte est de se nommer, et
           un bouton de sortie plein et pleine largeur devient l'élément le plus
           fort de la carte — l'œil va vers la sortie plutôt que vers ce qu'on
           est venu faire. Même leçon que le tiroir de création d'un groupe. */
        fermerDiscret
      >
        {modale === "notifs" ? (
          /* La boîte des notifications ne porte QUE le bouton : le joueur est
             déjà nommé, il n'a rien d'autre à faire ici. */
          <OffreNotifs skin={skin} uid={user?.id ?? null} texte={t("modaleNotifsPitch")} />
        ) : null}
        {modale === "nom" ? formulaire : null}
        {/* ⚠️ LES NOTIFICATIONS NE SE PROPOSENT QU'À UN COMPTE — réglages et
            tournée sont indexés sur `user_id`. C'est aussi pourquoi elles
            prennent EXACTEMENT la place que l'offre de compte laisse vide :
            un connecté ne voit pas l'une, un anonyme ne voit pas l'autre, et la
            boîte garde ses deux portes au lieu d'en ouvrir trois. §0 arbitre des
            demandes, pas des écrans.

            ⚠️ ET C'EST LA SEULE CHOSE QUE LE JEU N'AVAIT PAS. `JourneePrecedente`
            existe précisément parce qu'aucune notification n'annonce la clôture :
            il GARDE le résultat arrêté et le rend quand le joueur revient. Le
            genre `journee` existe en base depuis le 01/09 et n'était offert que
            sur `/games/quotidien`, la page que les joueurs ne visitent pas. */}
        {user && modale === "nom" ? (
          <div style={{ marginTop: 22, borderTop: `1px dashed ${skin.muted}55`, paddingTop: 16 }}>
            <GLabel skin={skin}>{t("modaleNotifs")}</GLabel>
            <div style={{ marginTop: 8 }}>
              <OffreNotifs skin={skin} uid={user.id} texte={t("modaleNotifsTexte")} />
            </div>
          </div>
        ) : null}
        {/* ⚠️ LE COMPTE N'EST PROPOSÉ QU'À QUI N'EN A PAS. Servi à un connecté
            sans pseudo, ce bloc lui offrirait de se connecter alors qu'il l'est
            déjà — et `ChoisirSonNom` vient précisément de lui dire que le nom
            qu'il tape DEVIENDRA son pseudo Placet. */}
        {!user && modale === "nom" ? (
          <div style={{ marginTop: 22, borderTop: `1px dashed ${skin.muted}55`, paddingTop: 16 }}>
            <GLabel skin={skin}>{t("modaleCompte")}</GLabel>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: skin.muted, lineHeight: 1.5 }}>
              {t("modaleComptePitch")}
            </p>
            <div style={{ marginTop: 12 }}>
              <ConnexionJeux skin={skin} />
            </div>
          </div>
        ) : null}
      </Modale>
    ) : null}
    </>
  );
}
