"use client";

// L'ÉCRAN DE LA SOUPE — le seul, pour toute la partie.
//
// LA BOUCLE, et rien d'autre : je secoue → quelque chose se forme → je garde ce
// qui me plaît → j'en fais un atelier. Le joueur ne pose jamais un atome à la
// main ; il choisit AVEC QUELLE FORCE il secoue, et le monde s'assemble seul.
//
// ⚠️ CE COMPOSANT NE DÉCIDE RIEN DE LA RÈGLE. Il lit `ecran(partie)` pour savoir
// quels panneaux existent, appelle les gestes de `lib/games/soupe/partie`, et
// redessine. Toute règle écrite ici serait une règle que les tests du dépôt
// d'origine ne verraient pas.
//
// ─────────────────────────────────────────────────────────────────────────────
// CE QUE LE PREMIER PASSAGE DE TEST A RENVOYÉ, ET CE QUI EN DÉCOULE
//
// « C'est assez fascinant à voir, mais les explications sont nébuleuses. J'ai du
// mal à savoir ce qui est attendu, ce qui va être pertinent. Certains mots ne
// sont pas directs (ex : gabarit). Je n'ai pas vu où les atomes étaient pris
// pour la production de la machine 2, ni pourquoi on est bloqué ou pas, ni quel
// est l'objectif. »
//
// Trois défauts distincts, et le deuxième était le plus grave :
//
// 1. LE VOCABULAIRE ÉTAIT CELUI DU CODE. « gabarit », « rendement », « réserve »,
//    « cohésion », « C / N / S » : des mots justes pour qui a écrit la règle, et
//    opaques pour qui joue. L'écran dit désormais modèle, énergie, solidité,
//    carbone / azote / soufre. Les noms internes n'ont pas bougé — c'est la
//    traduction qui change, pas la règle.
//
// 2. ⚠️ LE STOCK D'ATOMES N'ÉTAIT AFFICHÉ NULLE PART AU DEUXIÈME ACTE. Le
//    panneau de la soupe montrait « Libres — C 5 · N 0 · S 5 » ; il se referme à
//    l'ouverture de l'atelier, et la seule ressource qui décide si la production
//    tourne ou s'arrête disparaissait avec lui. « Il manque 2 N » annonçait un
//    DÉFICIT sans jamais montrer le SOLDE : impossible de savoir d'où sortent
//    les atomes, ni pourquoi on est bloqué. D'où le magasin ci-dessous, qui
//    montre possédé/requis pour chaque atome du modèle.
//
// 3. AUCUN OBJECTIF N'ÉTAIT ÉCRIT. Un incrémental qui ne dit pas où il va est
//    une machine à regarder, pas un jeu. L'objectif est chiffré (400 d'énergie),
//    affiché avec sa progression, et il coïncide avec la fin de ce qui est écrit.
//
// S'y ajoute une LIGNE DE CONSEIL, qui dit à chaque instant ce qu'on attend du
// joueur. C'est le dispositif le moins cher qui réponde à « je ne sais pas ce
// qui est attendu » : une phrase, dérivée de l'état, jamais une aide générale
// qu'on saute.
//
// ⚠️ 4. ET CETTE LIGNE-LÀ A ELLE-MÊME MENTI, AU PASSAGE SUIVANT. Capture à
//    l'appui : une copie, 189 d'énergie, « +9 par tour », et pourtant « azote 0
//    sur 3 » en rouge sous « L'atelier est à court d'atomes, il repartira au
//    tour suivant ». Question du testeur : pourquoi j'arrive à produire alors
//    qu'il me manque des atomes ?
//
//    Parce que PRODUIRE N'EST PAS GRANDIR, et que l'écran confondait les deux.
//    Une copie déjà bâtie verse son rendement à chaque tour SANS RIEN
//    CONSOMMER ; les atomes ne servent qu'à en bâtir de NOUVELLES. L'atelier
//    n'avait donc jamais cessé, « il repartira » était faux, et le rouge —
//    réservé aux pannes partout ailleurs dans Placet — annonçait un arrêt qui
//    n'existait pas. Le rouge ne sert plus qu'à l'arrêt réel (zéro copie) ; en
//    dessous c'est l'ambre d'une croissance en attente, le conseil nomme les
//    deux régimes, et une phrase à demeure sous le magasin porte la distinction.
// ─────────────────────────────────────────────────────────────────────────────
//
// LE PARI STRUCTUREL, ET CE QU'IL DEVIENT SUR UN TÉLÉPHONE
//
// Le jeu est bâti sur une règle empruntée à Universal Paperclips : l'écran a
// QUATRE EMPLACEMENTS, et ouvrir un panneau en ferme un autre. Le deuxième acte
// referme la soupe pour de bon. C'est ce qui lui permet de rester lisible sans
// jamais grandir — une mécanique nouvelle doit désigner celle qu'elle remplace.
//
// ⚠️ LA VERSION AUTONOME POUSSAIT LA RÈGLE JUSQU'À INTERDIRE LE DÉFILEMENT
// (`overflow: hidden`, deux colonnes, tout tient dans un `100dvh`). Sur un
// téléphone, ça se retourne contre elle : deux panneaux empilés à 50 % de
// hauteur chacun donnent deux fenêtres de trois centimètres qui défilent
// séparément. Ici la page défile comme toutes les pages de Placet, et c'est le
// BUDGET DE PANNEAUX qui porte la thèse. Il n'a jamais eu besoin du `100dvh` :
// ce qui garde l'écran lisible, c'est que rien ne s'ajoute sans que quelque
// chose parte.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import GameShell from "@/components/games/GameShell";
import AideModale from "@/components/games/Modale";
import { GBtn, GCard, GLabel } from "@/components/games/ui";
import { SOUPE_SKIN as skin } from "@/lib/games/skin";
import { CODES, caseA } from "@/lib/games/soupe/grille";
import { coutEnAtomes, coutEnEnergie, peutBatir, presenter } from "@/lib/games/soupe/atelier";
import { FORCES, cellulesDe } from "@/lib/games/soupe/soupe";
import {
  HORIZON_ATELIER,
  lotPayable,
  PLACES_COLLECTION,
  acheter,
  agiterLaSoupe,
  cequiManque,
  bassinGagne,
  ciblesDuBassin,
  changerGabarit,
  collectionPleine,
  conseilDuBassin,
  ecran,
  moleculesVisibles,
  nouvellePartie,
  ouvrirLatelier,
  ouvrirLeBassin,
  peutOuvrirLatelier,
  peutOuvrirLeBassin,
  preleverMolecule,
  rejeterPiece,
  retirerDuBassin,
  reviserLaCible,
  semerDansLeBassin,
  ticDuBassin,
  ticLatelier,
} from "@/lib/games/soupe/partie";
import { ESPECES_MAX, OBJECTIF as OBJECTIF_BASSIN, TAILLE_MAX, chanceDeSouder, espece, nourriture } from "@/lib/games/soupe/bassin";
import type { Code, Espece, EvenementJournal, EvenementMonde, Grille, Partie, Piece, Voie } from "@/lib/games/soupe/types";

/**
 * LES COULEURS DE LA MATIÈRE — le seul endroit du jeu où la couleur porte du sens.
 *
 * Le joueur n'a aucun code à retenir : le milieu affiche ce qu'il paie avec ces
 * mêmes carrés, en haut de l'écran. Il voit du bleu sur une molécule, il sait.
 */
const TEINTE: Record<Code, string> = {
  C: "#33454B",
  N: "#0C88A2",
  S: "#D2921F",
};

/**
 * L'objectif du deuxième acte, et le moment exact où le troisième s'ouvre.
 *
 * ⚠️ IL VIENT DE LA RÈGLE, PAS DE L'ÉCRAN. Un seuil affiché ici qui ne
 * déclencherait rien là-bas ferait deux objectifs pour un seul acte.
 */
const OBJECTIF = HORIZON_ATELIER;

/** Un tour d'atelier par seconde. Estimation honnête, jamais mesurée. */
const BATTEMENT = 1000;

/** Un nombre à la française, sans zéros bavards. */
function nb(x: number, decimales = 2): string {
  return Number(x).toFixed(decimales).replace(/\.?0+$/, "").replace(".", ",") || "0";
}

function signe(x: number): string {
  return (x > 0 ? "+" : "") + nb(x);
}

/**
 * LA SOLIDITÉ EN MOTS, parce qu'un nombre nu ne dit rien.
 *
 * « tient 1,8 » n'apprend rien à personne : 1,8 par rapport à quoi ? Les valeurs
 * observées vont de 0,8 (un dimère de soufre) à 2,9 (un bloc de carbone), et
 * c'est cette échelle-là qu'il faut donner. Le nombre reste dans l'infobulle
 * pour qui veut comparer finement.
 */
function solidite(cohesion: number): "fragile" | "moyenne" | "solide" {
  if (cohesion < 1.5) return "fragile";
  if (cohesion < 2.2) return "moyenne";
  return "solide";
}

/**
 * LA FORME D'UNE MOLÉCULE, recadrée sur ce qu'elle occupe.
 *
 * ⚠️ `aria-label` PORTE LE VISAGE, pas la forme. Un lecteur d'écran ne peut rien
 * faire d'une grille de carrés ; le visage — « CCN » — est le nom que la règle
 * donne à cette forme-là.
 */
function Forme({ grille, cote = 13, titre }: { grille: Grille; cote?: number; titre?: string }) {
  const cellules = cellulesDe(grille);
  if (cellules.length === 0) return null;
  const r0 = Math.min(...cellules.map((x) => x.r));
  const c0 = Math.min(...cellules.map((x) => x.c));
  const hauteur = Math.max(...cellules.map((x) => x.r)) - r0 + 1;
  const largeur = Math.max(...cellules.map((x) => x.c)) - c0 + 1;

  const cases = [];
  for (let r = 0; r < hauteur; r++) {
    for (let c = 0; c < largeur; c++) {
      const code = caseA(grille, r + r0, c + c0);
      cases.push(
        <div
          key={`${r}-${c}`}
          style={{ width: cote, height: cote, borderRadius: 2, background: code ? TEINTE[code] : "transparent" }}
        />,
      );
    }
  }
  return (
    <div
      role="img"
      aria-label={titre}
      style={{ display: "grid", gridTemplateColumns: `repeat(${largeur}, ${cote}px)`, gap: 2 }}
    >
      {cases}
    </div>
  );
}

/** Un motif du milieu, dessiné avec les couleurs des atomes. */
function Chaine({ motif, cote = 11 }: { motif: string; cote?: number }) {
  return (
    <span style={{ display: "inline-grid", gridTemplateColumns: `repeat(${motif.length}, ${cote}px)`, gap: 2 }}>
      {[...motif].map((code, i) => (
        <span key={i} style={{ width: cote, height: cote, borderRadius: 2, background: TEINTE[code as Code] }} />
      ))}
    </span>
  );
}

/** Une ligne de chiffres sous une molécule. */
function Chiffre({ children, teinte }: { children: React.ReactNode; teinte?: string }) {
  return (
    <span
      style={{
        fontSize: 12.5,
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
        color: teinte ?? skin.muted,
        textAlign: "center",
      }}
    >
      {children}
    </span>
  );
}

/**
 * UNE MOLÉCULE DU BASSIN, avec son effectif. Cliquable si on peut la retirer.
 *
 * Retirer est le SECOND geste du troisième acte, et la seule façon de libérer un
 * atome rare : sans affordance visible, il n'existe pas.
 */
function Habitant({
  esp,
  cote = 9,
  titre,
  onRetirer,
  laVotre,
  etiquette,
  motRetirer,
}: {
  esp: Espece;
  cote?: number;
  titre?: string;
  onRetirer?: () => void;
  /**
   * ⚠️ RIEN NE DISAIT LAQUELLE ÉTAIT LA SIENNE. Les huit tuiles portaient la même
   * bordure et la même invitation à retirer ; un testeur a perdu une partie faute
   * de reconnaître sa propre molécule dans la rangée. Elle est la seule qu'on ne
   * peut pas retirer : c'est à l'écran de le dire, pas au clic de l'apprendre.
   */
  laVotre?: boolean;
  etiquette?: string;
  /**
   * ⚠️ UN BOUTON QUI NE RESSEMBLE PAS À UN BOUTON N'EST PAS UN BOUTON. Les tuiles
   * retirables et les briques, qui ne le sont pas, se ressemblaient trait pour
   * trait, et ce qu'on pouvait en faire ne vivait que dans un `title` — donc nulle
   * part au doigt. Un testeur est resté bloqué devant huit boutons sans savoir
   * qu'il en avait sous les yeux.
   */
  motRetirer?: string;
}) {
  const contenu = (
    <>
      <Forme grille={esp.grille} cote={cote} />
      <Chiffre>× {esp.effectif}</Chiffre>
      {laVotre && etiquette ? (
        <span style={{ fontSize: 9, letterSpacing: "0.04em", textTransform: "uppercase", color: skin.good }}>
          {etiquette}
        </span>
      ) : null}
      {!laVotre && onRetirer && motRetirer ? (
        <span style={{ fontSize: 9, letterSpacing: "0.04em", textTransform: "uppercase", color: OR }}>
          {motRetirer}
        </span>
      ) : null}
    </>
  );
  const style: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    padding: "5px 6px",
    borderRadius: 8,
    border: laVotre ? `2px solid ${skin.good}` : onRetirer ? `2px dashed ${OR}` : `2px solid ${skin.ink}18`,
    background: onRetirer && !laVotre ? `${OR}14` : skin.paper,
    cursor: onRetirer ? "pointer" : "default",
  };
  if (!onRetirer) {
    return (
      <div style={style} title={titre}>
        {contenu}
      </div>
    );
  }
  return (
    <button type="button" onClick={onRetirer} title={titre} style={{ ...style, cursor: "pointer", font: "inherit", color: "inherit" }}>
      {contenu}
    </button>
  );
}

const ROUGE = "#A2402F";
/** L'ambre du projet : ce que le conseil désigne, et ce qui se clique. */
const OR = "#B07A1E";

export default function LaSoupe() {
  const t = useTranslations("Soupe");
  const [regles, setRegles] = useState(false);

  // ⚠️ LA GRAINE EST TIRÉE APRÈS LE MONTAGE, jamais au premier rendu. Un
  // `Math.random()` dans l'état initial donne une valeur au serveur et une autre
  // au navigateur : React signale l'écart en hydratation.
  const [partie, setPartie] = useState<Partie | null>(null);
  const [derniereForce, setDerniereForce] = useState<number | null>(null);
  useEffect(() => {
    setPartie(nouvellePartie(1 + Math.floor(Math.random() * 999999)));
  }, []);

  // L'ATELIER BAT TOUT SEUL. C'est ce qui distingue le deuxième acte du premier :
  // au premier, rien n'arrive sans le joueur ; au second, tout arrive sans lui,
  // et il ne lui reste qu'à l'alimenter et à juger.
  // Le bassin bat comme l'atelier battait : le temps y passe sans le joueur, et
  // il ne lui reste qu'à semer, retirer et juger.
  // ⚠️ ET ELLE S'ARRÊTE QUAND C'EST TENU. Sans ça le compteur montait à 62, 63,
  // 64 tours sur 60 pendant que l'écran annonçait la victoire : la fin était
  // écrite, et le monde continuait de la démentir.
  const tenu = (partie?.acte === 3 && partie ? bassinGagne(partie) : false) as boolean;
  const ouvert = ((partie?.panneaux.includes("atelier") || partie?.panneaux.includes("bassin")) ?? false) && !tenu;
  const acte = partie?.acte ?? 1;
  const battement = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!ouvert) return;
    battement.current = setInterval(
      () => setPartie((p) => (p ? (p.acte === 3 ? ticDuBassin(p) : ticLatelier(p)) : p)),
      BATTEMENT,
    );
    return () => {
      if (battement.current) clearInterval(battement.current);
    };
  }, [ouvert, acte, tenu]);

  const agiter = useCallback((force: number) => {
    setDerniereForce(force);
    setPartie((p) => (p ? agiterLaSoupe(p, force) : p));
  }, []);

  const molecules = useMemo(() => {
    if (!partie) return [];
    // Triées par ce qu'elles rapportent : l'œil compare au lieu de chercher. La
    // soupe rebat ses molécules à chaque secousse, et un ordre qui saute rendrait
    // la comparaison impossible.
    return [...moleculesVisibles(partie)].sort(
      (a, b) => (b.rendement ?? 0) - (a.rendement ?? 0) || b.taille - a.taille,
    );
  }, [partie]);

  if (!partie) return null;

  const panneaux = ecran(partie).map((e) => e.nom);
  const manques = cequiManque(partie);
  const places = PLACES_COLLECTION - partie.collection.length;
  const pleine = collectionPleine(partie);
  const gabarit = partie.atelier.gabarit;
  const vue = gabarit ? presenter(gabarit, partie.milieu) : null;
  const nomAtome = (code: Code) => (code === "C" ? t("atomeC") : code === "N" ? t("atomeN") : t("atomeS"));
  // Tout ce que l'écran du troisième acte a le droit de dire, en une seule
  // lecture de la règle : le maillon manquant, jamais un compteur de plus.
  const conseilBassin = partie.acte === 3 ? conseilDuBassin(partie) : null;

  /**
   * LE NOM D'UNE MOLÉCULE, POUR UN JOUEUR.
   *
   * ⚠️ « SEMER CCCNS » N'EST PAS UN NOM, C'EST UN CODE — la lecture d'un contour,
   * une notion interne que le joueur n'a aucun moyen de relier à la forme dessinée
   * deux centimètres plus loin. La collection est donc étiquetée A, B, C…, la
   * lettre est écrite sur la fiche comme dans le bouton, et le bouton porte en
   * plus la forme, qui est ce que l'œil reconnaît.
   *
   * ⚠️ ON INDEXE PAR POSITION, PAS PAR VISAGE : deux pièces gardées peuvent
   * partager un contour, et l'écran affichait alors deux fiches « C ». Une
   * étiquette qui ne distingue pas ne nomme rien.
   */
  const lettreDe = (i: number) => String.fromCharCode(65 + i);
  const etiquettes = new Map<string, string>();
  partie.collection.forEach((piece, i) => {
    if (!etiquettes.has(piece.visage)) etiquettes.set(piece.visage, lettreDe(i));
  });
  const nomLisible = (v: string) => etiquettes.get(v) ?? v;

  /**
   * CE QU'ON ATTEND DU JOUEUR, MAINTENANT.
   *
   * Une seule phrase, dérivée de l'état. Répond au reproche le plus direct du
   * premier test — « j'ai du mal à savoir ce qui est attendu » — là où une aide
   * générale ne répond à rien, puisqu'on la saute.
   */
  function conseil(): string {
    // ⚠️ LE TROISIÈME ACTE D'ABORD : c'est lui qui a le plus besoin d'être nommé,
    // parce que rien n'y dépend d'un clic et que tout y dépend d'une lecture.
    if (partie!.acte === 3 && conseilBassin && partie!.cible) {
      const c = conseilBassin;
      if (c.gagne) return t("bassinConseilGagne");
      const meilleure = c.voies[0];
      if (!meilleure) return t("bassinConseilImpossible");

      /**
       * ⚠️ LA PORTE PASSE AVANT TOUT LE RESTE, et elle passait après tout le reste.
       * Le conseil promettait « votre molécule finira par paraître » à un joueur
       * dont le bassin était plein — c'est-à-dire à qui elle ne paraîtrait jamais.
       * Mesuré : le bassin est plein 99 % du temps, et un bassin plein refuse
       * toute soudure neuve ; dans les dix-sept parties sur vingt-quatre qui ne
       * décollent pas, la cible est fabriquée et refoulée près de quatre cents
       * fois. Un biochimiste a joué 211 tours de cette promesse avant d'abandonner.
       */
      /**
       * ⚠️ « IL FAUT ATTENDRE » ÉTAIT LE DERNIER CUL-DE-SAC DU JEU. Quand les
       * huit places sont prises et que toutes tiennent une voie, l'écran ne
       * proposait plus rien et conseillait de patienter. Mesuré sur soixante
       * parties : en attendant, 34 gagnées et 5 129 tours sans un geste
       * possible ; en retirant quand même le gabarit le plus léger, 44 gagnées
       * et plus un seul tour muet. On dit ce qu'il en coûte, et on le propose.
       */
      if (c.plein && c.present === 0) {
        if (c.inutiles.length > 0) return t("bassinConseilPorteFermee");
        return c.sacrifice ? t("bassinConseilMur") : t("bassinConseilPorteToutSert");
      }
      // L'ATOME QUI MANQUE PASSE AVANT TOUT LE RESTE : conseiller de semer pendant
      // que le bouton est grisé, c'est l'écran qui contredit l'écran.
      if (c.renfort && c.manque.length > 0) {
        const quoi = c.manque.map((m) => `${m.manque} ${nomAtome(m.code)}`).join(" + ");
        // ⚠️ ON NE NOMME QUE CE QU'ELLE REND VRAIMENT. Le conseil annonçait
        // « Retirez CCCNN : elle rendra 0 soufre et 6 azote » alors que c'était le
        // soufre qui manquait : il listait les atomes manquants, pas les rendus.
        const source = c.inutiles.find((e) => e.utile > 0);
        const rendus = source ? c.manque.filter((m) => (source.rendu[m.code] ?? 0) > 0) : [];
        const tete = t("bassinConseilManque", { quoi, gabarit: nomLisible(c.renfort.visage) });
        return rendus.length > 0 && source
          ? `${tete} ${t("bassinConseilRetirer", {
              rendu: rendus.map((m) => `${source.rendu[m.code]} ${nomAtome(m.code)}`).join(" + "),
            })}`
          : `${tete} ${t("bassinConseilRienNenRend")}`;
      }
      if (meilleure.gabarits === 0) {
        return c.renfort
          ? t("bassinConseilSansGabarit", { quoi: nomLisible(c.renfort.visage) })
          : t("bassinConseilSansOutil");
      }
      if (c.present === 0) {
        // La porte est ouverte — c'est le seul cas où attendre a un sens.
        return t("bassinConseilUnePlaceLibre", { n: meilleure.gabarits });
      }
      return t("bassinConseilTient", {
        n: meilleure.gabarits,
        sur: Math.max(1, Math.round(1 / meilleure.chance)),
        restant: c.restant,
      });
    }
    if (partie!.acte === 2 && peutOuvrirLeBassin(partie!)) return t("conseilPassage");
    if (partie!.acte === 1) {
      if (partie!.soupe.agitations === 0) return t("conseilDebut");
      if (peutOuvrirLatelier(partie!)) return t("conseilLancer");
      if (partie!.collection.length === 0 && molecules.some((m) => (m.rendement ?? 0) > 0)) {
        return t("conseilGarder");
      }
      return t("conseilChercher");
    }
    // ⚠️ PRODUIRE N'EST PAS GRANDIR, et l'ancien message confondait les deux.
    // Il annonçait « l'atelier est à court d'atomes, il repartira au tour
    // suivant » alors que l'atelier n'avait jamais cessé : une copie déjà bâtie
    // verse son rendement à chaque tour SANS RIEN CONSOMMER. Les atomes ne
    // servent qu'à en bâtir de nouvelles. Le joueur voyait donc « +9 par tour »
    // et « il manque de l'azote » côte à côte, et demandait — à juste titre —
    // pourquoi il arrivait à produire.
    if (manques.length === 0) return t("conseilGrandit");
    if (partie!.atelier.copies === 0) return t("conseilArrete");
    const gain = signe(partie!.atelier.copies * (gabarit?.rendement ?? 0));
    return manques.some((m) => m.abordable)
      ? t("conseilProduitEtManque", { gain })
      : t("conseilProduitEtAttend", { gain });
  }

  // ── Le milieu, en en-tête ────────────────────────────────────────────────
  const enTeteMilieu = (
    <GCard skin={skin} padding={13} style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 16 }}>{t("milieuNom")}</span>
        {/* ⚠️ LE BANDEAU DIT CE QUI DÉCIDE MAINTENANT, PAS CE QUI DÉCIDAIT AVANT.
            Les motifs payés sont la loi des deux premiers actes ; dans le bassin
            rien n'est payé, et c'est le FLUX qui commande tout. Laisser
            « recherche CN +3 » au troisième acte afficherait une règle abrogée. */}
        <span style={{ fontSize: 13, color: skin.muted }}>
          {partie.acte === 3 ? t("verse") : t("recherche")}
        </span>
        {partie.acte === 3
          ? CODES.map((code) => (
              <span
                key={code}
                title={t("fluxAide", { n: partie.milieu.flux?.[code] ?? 0, atome: nomAtome(code) })}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 9px",
                  borderRadius: 999,
                  border: `2px solid ${skin.ink}22`,
                  background: `${skin.accent}0F`,
                }}
              >
                <span style={{ width: 11, height: 11, borderRadius: 2, background: TEINTE[code] }} />
                <span style={{ fontSize: 13, fontWeight: 800 }}>{partie.milieu.flux?.[code] ?? 0}</span>
              </span>
            ))
          : null}
        {partie.acte === 3 ? null : partie.milieu.motifs.map((m) => (
          <span
            key={m.motif}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 9px",
              borderRadius: 999,
              border: `2px solid ${skin.ink}22`,
              background: `${skin.accent}0F`,
            }}
          >
            <Chaine motif={m.motif} />
            <span style={{ fontSize: 13, fontWeight: 800, color: m.valeur > 0 ? skin.good : ROUGE }}>
              {signe(m.valeur)}
            </span>
          </span>
        ))}
      </div>
      {/* ⚠️ LA PHRASE DOIT SUIVRE L'ACTE. Elle explique ce que le milieu PAIE,
          ce qui est la loi des deux premiers actes ; dans le bassin rien n'est
          payé, et la laisser afficherait une règle abrogée sous un bandeau qui,
          lui, montre déjà le flux. */}
      <p style={{ margin: "8px 0 0", fontSize: 13, color: skin.muted, maxWidth: "62ch", lineHeight: 1.45 }}>
        {partie.acte === 3 ? t("bassinQuoi") : t("milieuQuoi")}
      </p>
      <div style={{ marginTop: 10 }}>
        <GBtn skin={skin} size="sm" variant="ghost" onClick={() => setRegles(true)}>
          {t("commentJouer")}
        </GBtn>
      </div>
    </GCard>
  );

  // LA LIGNE DE CONSEIL. Pleine largeur, au-dessus des panneaux : c'est la
  // première chose qu'on lit en arrivant et après chaque geste.
  const ligneConseil = (
    <div
      role="status"
      style={{
        display: "flex",
        // ⚠️ LE BOUTON DOIT POUVOIR PASSER À LA LIGNE. Sans ça, un intitulé un
        // peu long — « Retirer quand même — coûte une voie » — écrase la phrase
        // à un mot par ligne et déborde de l'écran sur 390 px.
        flexWrap: "wrap",
        alignItems: "flex-start",
        gap: 9,
        marginBottom: 14,
        padding: "10px 13px",
        borderRadius: skin.radius,
        border: `2px solid ${skin.accent}`,
        background: `${skin.accent}12`,
        fontSize: 14,
        lineHeight: 1.45,
      }}
    >
      <span aria-hidden style={{ fontWeight: 800, color: skin.accent }}>→</span>
      <span style={{ flex: "1 1 14rem", minWidth: "12rem" }}>{conseil()}</span>
      {/* ⚠️ UN CONSEIL IMPÉRATIF DOIT PORTER SON BOUTON. « Retirez la molécule
          marquée » désignait un contrôle tout en bas du panneau, qui affiche une
          forme et « × 6 » et dont la seule légende vivait dans un `title` — donc
          rien, au doigt. Un testeur est resté bloqué sans savoir COMMENT retirer. */}
      {partie && partie.acte === 3 && conseilBassin && conseilBassin.plein && conseilBassin.present === 0 && (conseilBassin.inutiles[0] ?? conseilBassin.sacrifice) ? (
        <button
          type="button"
          onClick={() => {
            const quoi = (conseilBassin.inutiles[0] ?? conseilBassin.sacrifice)!.empreinte;
            setPartie((x) => (x ? retirerDuBassin(x, quoi) : x));
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            flex: "0 0 auto",
            padding: "6px 10px",
            borderRadius: 8,
            border: `2px solid ${OR}`,
            background: `${OR}14`,
            color: skin.ink,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Forme grille={(conseilBassin.inutiles[0] ?? conseilBassin.sacrifice)!.grille} cote={8} />
          {conseilBassin.inutiles.length === 0 ? t("retirerQuandMeme") : t("retirerLibereUnePlace")}
        </button>
      ) : null}
    </div>
  );

  // ── Le panneau de la soupe ───────────────────────────────────────────────
  const panneauSoupe = (
    <GCard skin={skin} key="soupe">
      <GLabel skin={skin}>{t("panneauSoupe")}</GLabel>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8, fontSize: 13 }}>
        <span style={{ color: skin.muted }}>{t("libres")}</span>
        {CODES.map((code) => (
          <span key={code} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 700 }}>
            <span style={{ width: 11, height: 11, borderRadius: 2, background: TEINTE[code] }} />
            {partie.soupe.libres[code] ?? 0}
          </span>
        ))}
      </div>

      {/* LES TROIS FORCES. Chaque bouton EST une secousse : le geste du premier
          acte tient dans le choix de l'intensité, rien d'autre.
          ⚠️ `1 1 0` ET `minWidth: 0`, PAS `1 1 30%`. Vu sur un téléphone de
          390 px : à 30 % de base, « Battre » passait à la ligne et la commande du
          premier acte se lisait comme deux commandes. */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        {FORCES.map((f) => (
          <GBtn
            key={f.force}
            skin={skin}
            size="lg"
            variant={derniereForce === f.force ? "primary" : "ghost"}
            onClick={() => agiter(f.force)}
            style={{ flex: "1 1 0", minWidth: 0, padding: "15px 6px" }}
          >
            {f.force === 1 ? t("forceRemuer") : f.force === 2.5 ? t("forceSecouer") : t("forceBattre")}
          </GBtn>
        ))}
      </div>

      <p style={{ margin: "10px 0 0", fontSize: 13, color: skin.muted, lineHeight: 1.45 }}>
        {derniereForce === 1
          ? t("forceRemuerAide")
          : derniereForce === 2.5
            ? t("forceSecouerAide")
            : derniereForce === 4.5
              ? t("forceBattreAide")
              : t("inviteAgiter")}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 14 }}>
        {molecules.length === 0 ? (
          <p style={{ fontSize: 13, color: skin.muted, margin: 0 }}>{t("soupeVide")}</p>
        ) : null}
        {molecules.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={pleine}
            onClick={() => setPartie((p) => (p ? preleverMolecule(p, m.id) : p))}
            className={pleine ? undefined : "dc-lift"}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              padding: "10px 11px",
              minWidth: 78,
              cursor: pleine ? "default" : "pointer",
              background: skin.paper,
              border: `2px solid ${(m.rendement ?? 0) > 0 ? skin.good : `${skin.ink}22`}`,
              borderRadius: 10,
              opacity: pleine ? 0.5 : 1,
              font: "inherit",
              color: skin.ink,
            }}
          >
            <Forme grille={m.grille} titre={m.visage} />
            <Chiffre teinte={(m.rendement ?? 0) > 0 ? skin.good : undefined}>
              {m.rendement ? signe(m.rendement) : "—"}
            </Chiffre>
          </button>
        ))}
      </div>

      <p style={{ margin: "12px 0 0", fontSize: 13, color: skin.muted }}>
        {places > 0 ? t("garder", { places }) : t("collectionPleine")}
      </p>
    </GCard>
  );

  /** Met un événement du journal en mots — à chaque rendu, donc dans la langue du moment. */
  function raconter(e: EvenementJournal): string {
    if (e.quoi === "preleve") return t("journalPreleve", { n: e.rendement });
    if (e.quoi === "rejete") return t("journalRejete");
    if (e.quoi === "fonde") return t("journalFonde", { n: e.rendement });
    if (e.quoi === "gabarit") return t("journalGabarit", { perdues: e.perdues });
    if (e.quoi === "bassin") return t("journalBassin", { objectif: e.objectif });
    // `remisAZero` n'a plus d'emploi : la cible ne se sème plus du tout, donc
    // aucun semis ne remet le séjour à zéro.
    if (e.quoi === "seme") return t("journalSeme", { n: e.combien, quoi: nomLisible(e.visage) });
    if (e.quoi === "retire") return t("journalRetire");
    if (e.quoi === "cibleNonSemable") return t("journalCibleNonSemable");
    if (e.quoi === "revise") return e.perdu > 0 ? t("journalReviseAvecPrix", { n: e.perdu }) : t("journalRevise");
    return t("journalSansAtomes");
  }

  /**
   * Met un événement du MONDE en mots — la chronique, distincte du journal.
   *
   * ⚠️ `t.rich` POUR LA LIGNE QUI MÊLE TEXTE ET FORMES. « une ▣ a pris la place
   * d'une ▤ » ne se découpe pas en fragments : l'espagnol et le pidgin n'ont pas
   * l'ordre du français. La traduction garde donc la phrase entière et reçoit
   * les deux formes comme des balises, à placer où sa grammaire l'exige.
   */
  function raconterLeMonde(e: EvenementMonde): React.ReactNode {
    if (e.quoi === "cibleEntre") return <span>{t("chroniqueCibleEntre")}</span>;
    if (e.quoi === "cibleSort")
      return <span>{t(`chroniqueCibleSort_${e.cause}` as "chroniqueCibleSort_attrition", { n: e.apres })}</span>;
    if (e.quoi === "cibleRefoulee") return <span>{t("chroniqueCibleRefoulee", { n: e.combien })}</span>;
    if (e.quoi === "remplacement")
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          {t.rich(e.fois && e.fois > 1 ? "chroniqueRemplacements" : "chroniqueRemplacement", {
            fois: e.fois ?? 1,
            n: e.effectif,
            venue: () => <Forme grille={e.grilleVenue} cote={7} />,
            partie: () => <Forme grille={e.grillePartie} cote={7} />,
          })}
        </span>
      );
    if (e.quoi === "refoulees") return <span>{t("chroniqueRefoulees", { n: e.soudures, r: e.combien })}</span>;
    if (e.quoi === "briques") return <span>{t("chroniqueBriques", { n: e.combien })}</span>;
    return <span>{t("chroniqueCalme")}</span>;
  }

  /** Met un événement d'ATELIER en mots. Même chronique, autre acte. */
  function raconterLatelier(e: EvenementMonde): string {
    if (e.quoi === "batie") return t("chroniqueBatie", { n: e.combien, gain: signe(e.gagne) });
    if (e.quoi === "perdue") return t("chroniquePerdue", { n: e.combien, perte: signe(-e.perd) });
    if (e.quoi === "reamorce") return t("chroniqueReamorce");
    if (e.quoi === "produit") return t("chroniqueProduit", { n: signe(e.combien) });
    return t("chroniqueAttente");
  }

  // ── Le panneau de la collection ──────────────────────────────────────────
  const panneauCollection = (
    <GCard skin={skin} key="collection">
      <GLabel skin={skin}>{t("panneauCollection")}</GLabel>

      {/* L'AVERTISSEMENT DE FERMETURE, AVANT LE GESTE ET NON APRÈS. Le joueur
          doit savoir ce qu'il perd au moment où il peut encore ne pas le perdre. */}
      {partie.acte === 1 && peutOuvrirLatelier(partie) ? (
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 10,
            border: `2px solid ${skin.accent2}`,
            background: `${skin.accent2}1A`,
            fontSize: 13.5,
            lineHeight: 1.45,
          }}
        >
          <b>{t("avertFermeture")}</b> {t("avertFermetureTexte")}
        </div>
      ) : null}

      {partie.collection.length === 0 ? (
        <p style={{ fontSize: 13, color: skin.muted, marginTop: 10 }}>{t("collectionVide")}</p>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 12 }}>
        {partie.collection.map((piece: Piece) => {
          const estGabarit = gabarit?.visage === piece.visage;
          const paie = (piece.rendement ?? 0) > 0;
          /**
           * ⚠️ AU TROISIÈME ACTE, LA COLLECTION CHANGE DE SENS, et l'écran doit
           * le dire. Elle listait un rendement en énergie : c'est la mesure du
           * deuxième acte, et l'atelier est fermé. Dans le bassin, une molécule
           * ne vaut plus par ce qu'elle rapporte mais par ce qu'elle TIENT — un
           * contour long sait poser deux morceaux côte à côte, et c'est tout ce
           * qu'on lui demande. Laisser l'ancienne mesure afficherait une valeur
           * qui ne décide plus de rien.
           */
          const outil = conseilBassin?.aider.find((a) => a.visage === piece.visage) ?? null;
          const dansLeBassin =
            partie.acte === 3 && partie.bassin.especes.some((e) => e.visage === piece.visage);
          const utile = partie.acte === 3 ? Boolean(outil) || dansLeBassin : paie;
          return (
            <div
              key={piece.piece}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "10px 11px",
                minWidth: 124,
                background: skin.paper,
                border: `2px solid ${utile ? skin.good : `${skin.ink}22`}`,
                borderRadius: 10,
              }}
              title={`${piece.taille} atomes · ${t("solidite")} ${nb(piece.cohesion)}`}
            >
              {partie.acte === 3 ? (
                <span
                  style={{
                    fontFamily: skin.fontDisplay,
                    fontWeight: 800,
                    fontSize: 17,
                    lineHeight: 1,
                    color: skin.accent,
                  }}
                >
                  {lettreDe(partie.collection.indexOf(piece))}
                </span>
              ) : null}
              <Forme grille={piece.grille} titre={piece.visage} />
              {partie.acte === 3 ? (
                <>
                  {/* ⚠️ TROIS FAITS DISTINCTS, QUI SE CACHAIENT L'UN L'AUTRE. La
                      fiche disait « déjà dans le bassin » À LA PLACE de « tient les
                      deux morceaux », si bien qu'on ne savait plus si la pièce
                      servait. Et « les deux morceaux » ne nommait rien : quels
                      morceaux ? Ceux de la cible, dessinés juste au-dessus. */}
                  <Chiffre teinte={outil ? skin.good : undefined}>
                    {outil ? t("tientLesDeux") : t("neTientPas")}
                  </Chiffre>
                  {dansLeBassin ? (
                    <Chiffre teinte={skin.good}>
                      {t("dejaDansLeBassin", {
                        n: partie.bassin.especes.find((e) => e.visage === piece.visage)?.effectif ?? 0,
                      })}
                    </Chiffre>
                  ) : null}
                  {/* Au-delà du plafond de taille, le bassin ne sait pas la refaire :
                      c'est un réactif qu'on dépense, pas un habitant. */}
                  {piece.taille > TAILLE_MAX ? (
                    <Chiffre teinte={ROUGE}>{t("jamaisRefaite")}</Chiffre>
                  ) : null}
                  {/* La solidité avait disparu de la fiche au troisième acte,
                      alors que c'est elle qui décide combien de tours le gabarit
                      servira avant que le courant ne l'emporte. */}
                  <Chiffre>
                    {t("solidite")} : {t(solidite(piece.cohesion))}
                  </Chiffre>
                  <Chiffre>{t("atomesASemer", { n: piece.taille })}</Chiffre>
                  {/* ⚠️ PAS DE BOUTON SUR CE QUI NE TIENT RIEN : 43 % d'entre eux
                      étaient posés sur des pièces étiquetées « ne tient pas ces
                      morceaux » deux lignes plus haut. */}
                  {outil ? (
                    <GBtn
                      skin={skin}
                      size="sm"
                      variant={outil && lotPayable(partie, piece.grille) > 0 ? "accent" : "ghost"}
                      disabled={lotPayable(partie, piece.grille) === 0}
                      onClick={() => setPartie((p) => (p ? semerDansLeBassin(p, piece.grille) : p))}
                      title={
                        lotPayable(partie, piece.grille) === 0
                          ? t("semerImpossible", {
                              quoi: (Object.entries(piece.composition) as [Code, number][])
                                .map(([c, n]) => `${n} ${nomAtome(c)}`)
                                .join(" · "),
                            })
                          : t("semerPieceAide")
                      }
                    >
                      {lotPayable(partie, piece.grille) > 0
                        ? t("semerPiece", { n: lotPayable(partie, piece.grille) })
                        : t("pasAssezDAtomes")}
                    </GBtn>
                  ) : (
                    <Chiffre>{t("neServiraitARien")}</Chiffre>
                  )}
                </>
              ) : (
                <>
                  <Chiffre teinte={paie ? skin.good : undefined}>
                    {paie ? t("parTour", { n: signe(piece.rendement ?? 0) }) : t("sterile")}
                  </Chiffre>
                  {/* ⚠️ LE NOMBRE QUI DÉCIDE DU DEUXIÈME ACTE, MONTRÉ AVANT LE CHOIX.
                      atelier.ts le dit de lui-même : « la tension du deuxième acte
                      tient dans ce seul nombre ». Il était écrit — dans l'atelier,
                      donc APRÈS que le gabarit soit fixé, et le choix se prend ici.
                      Mesuré sur trente-six gabarits menés jusqu'à l'horizon : le
                      temps de remboursement explique 83 % du temps que met
                      l'atelier (r = 0,91), le prix et la taille 35 %, le rendement
                      seul 32 %, et la SOLIDITÉ rien du tout (r = 0,11). À rendement
                      égal, l'écart entre deux pièces va de 25 à 96 tours.
                      Pas de seuil inventé : on compare à la meilleure de la
                      collection, ce que le joueur a sous la main. */}
                  {paie && piece.composition ? (
                    (() => {
                      const amorti = (x: Piece) => Math.ceil(coutEnEnergie(x) / (x.rendement ?? 1));
                      const tours = amorti(piece);
                      const meilleur = Math.min(
                        ...partie.collection.filter((x) => (x.rendement ?? 0) > 0 && x.composition).map(amorti),
                      );
                      return (
                        <Chiffre teinte={tours === meilleur ? skin.good : undefined}>
                          {t("seRembourseEn", { n: tours })}
                        </Chiffre>
                      );
                    })()
                  ) : null}
                  <Chiffre>
                    {t("solidite")} : {t(solidite(piece.cohesion))}
                  </Chiffre>
                </>
              )}

              {partie.acte === 1 && paie ? (
                <GBtn
                  skin={skin}
                  size="sm"
                  variant="accent"
                  onClick={() => setPartie((p) => (p ? ouvrirLatelier(p, piece.piece) : p))}
                >
                  {t("produireCelleCi")}
                </GBtn>
              ) : null}
              {partie.acte === 2 && paie && !estGabarit ? (
                <GBtn
                  skin={skin}
                  size="sm"
                  variant="ghost"
                  onClick={() => setPartie((p) => (p ? changerGabarit(p, piece.piece) : p))}
                >
                  {t("produireALaPlace")}
                </GBtn>
              ) : null}
              {/* « — en production — » désigne l'atelier ; au troisième acte il
                  est fermé, et la mention parlerait d'une machine disparue. */}
              {estGabarit && partie.acte === 2 ? (
                <Chiffre teinte={skin.accent}>— {t("enProduction")} —</Chiffre>
              ) : null}

              {/* Rejeter rend la matière À LA SOUPE, fermée depuis le deuxième
                  acte : au troisième, le geste n'a plus de destinataire. */}
              {partie.acte < 3 ? (
              <button
                type="button"
                onClick={() => setPartie((p) => (p ? rejeterPiece(p, piece.piece) : p))}
                style={{
                  font: "inherit",
                  fontSize: 12,
                  fontWeight: 700,
                  color: skin.muted,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: 4,
                }}
              >
                {t("rejeter")}
              </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {partie.journal.length > 0 ? (
        <ul
          style={{ listStyle: "none", padding: 0, margin: "14px 0 0", fontSize: 12, color: skin.muted, lineHeight: 1.6 }}
        >
          {partie.journal.slice(-4).map((e: EvenementJournal, i) => (
            <li key={i}>{raconter(e)}</li>
          ))}
        </ul>
      ) : null}
    </GCard>
  );

  // ── Le panneau de l'atelier ──────────────────────────────────────────────
  // Le bilan du tour n'est plus lu ici : la chronique a remplacé sa ligne.
  const cout = gabarit ? coutEnAtomes(gabarit) : {};
  const bloque =
    !!gabarit && partie.atelier.copies === 0 && !peutBatir(partie.atelier) && manques.every((m) => !m.abordable);
  const recours = partie.collection.some((p) => (p.rendement ?? 0) > 0 && p.visage !== gabarit?.visage);
  // « se défait 5 % du temps » demandait une conversion mentale. « une copie sur
  // vingt » se lit sans calcul. Sous 2 %, le rapport ne veut plus rien dire.
  const surN = vue && vue.fragilite >= 2 ? Math.round(100 / vue.fragilite) : null;

  /**
   * LE PASSAGE AU TROISIÈME ACTE.
   *
   * ⚠️ ON MONTRE CE QU'ON PERD AVANT DE DEMANDER DE CHOISIR. La fermeture est
   * définitive, comme celle de la soupe : le joueur doit lire ce qui s'en va —
   * la copie offerte — avant de désigner sa cible, pas après.
   *
   * ⚠️ ET LE BLOC VIENT EN TÊTE DU PANNEAU, PAS EN QUEUE. Ajouté à la fin, il
   * tombait sous la ligne de flottaison : la décision la plus importante de
   * l'acte était présente, hors de portée, sans que rien ne l'indique.
   */
  const blocPassage = peutOuvrirLeBassin(partie) ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <div
        style={{
          padding: "11px 13px",
          borderRadius: 10,
          border: `2px solid ${skin.accent}`,
          background: `${skin.accent}12`,
          fontSize: 13.5,
          lineHeight: 1.5,
        }}
      >
        <b>{t("horizonTitre")}</b> {t("horizonTexte", { nom: partie.milieu.nom })}
      </div>
      <p style={{ margin: 0, fontSize: 13, color: skin.muted }}>{t("choisirCible")}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {ciblesDuBassin(partie).map((c) => (
          <button
            key={c.empreinte}
            type="button"
            onClick={() => setPartie((p) => (p ? ouvrirLeBassin(p, c.grille) : p))}
            title={t("cibleAide", {
              composition: (Object.entries(c.composition) as [Code, number][])
                .map(([k, n]) => `${n} ${nomAtome(k)}`)
                .join(" · "),
            })}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 5,
              padding: "9px 11px",
              borderRadius: 10,
              border: `2px solid ${skin.ink}22`,
              background: skin.paper,
              cursor: "pointer",
              font: "inherit",
              color: "inherit",
            }}
          >
            <Forme grille={c.grille} cote={13} />
            {/* ⚠️ CE QUI VARIE, PAS CE QUI EST CONSTANT. On affichait « N voies
                pour la faire » ; mesuré sur l'univers entier, les cent quatre
                tétramères ont exactement UNE voie. On montre donc l'atome rare
                qu'elle réclame face à ce que le milieu verse. */}
            {/* ⚠️ CE BADGE ÉTAIT TOUJOURS VERT. La règle disait `tension > 0,25`, et
                la tension d'une cible à deux soufres vaut exactement 2/8 = 0,25 dans
                cette eau : le seuil ratait le seul cas qu'il devait signaler. Et on
                ne se rattrape pas en abaissant le seuil — 3 azotes valent aussi 0,25
                et gagnent 20 fois sur 20. C'est le SOUFRE qui décide : mesuré sur
                450 cibles menées de bout en bout, 87 % de réussite à zéro ou un
                soufre, 45 % à deux. */}
            <Chiffre>
              {c.plusRare
                ? t("cibleRarete", {
                    n: c.plusRare.requis,
                    atome: nomAtome(c.plusRare.code),
                    verse: c.plusRare.verse,
                  })
                : ""}
            </Chiffre>
            {(c.composition.S ?? 0) >= 2 ? <Chiffre teinte={ROUGE}>{t("cibleDeuxSoufres")}</Chiffre> : null}
            {/* ⚠️ ET CELUI-CI N'EST PLUS VERT NON PLUS. C'est sur ce chiffre que le
                joueur choisissait. Mesuré sur les mêmes 450 cibles, SANS SEMER : à un
                soufre, 93 % avec 0-1 gabarit et 93 % avec deux ou plus. Le chiffre ne
                prédit rien — et coloré, il recommandait. C'est un fait, pas un conseil. */}
            <Chiffre>{c.outils > 0 ? t("cibleOutils", { n: c.outils }) : t("cibleSansOutil")}</Chiffre>
          </button>
        ))}
      </div>
    </div>
  ) : null;

  const panneauAtelier = (
    <GCard skin={skin} key="atelier">
      <GLabel skin={skin}>{t("panneauAtelier")}</GLabel>
      {blocPassage}

      <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginTop: 10 }}>
        {[
          { v: String(partie.atelier.copies), n: t("copies") },
          { v: String(partie.atelier.reserve), n: t("energie") },
          { v: `${partie.atelier.produitTotal} / ${OBJECTIF}`, n: t("energieProduite") },
        ].map((c) => (
          <div key={c.n} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span
              style={{
                fontFamily: skin.fontDisplay,
                fontWeight: 800,
                fontSize: 26,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {c.v}
            </span>
            <GLabel skin={skin} style={{ fontSize: 11 }}>
              {c.n}
            </GLabel>
          </div>
        ))}
      </div>

      {/* LA PROGRESSION VERS L'OBJECTIF. Un chiffre sur un total se lit ; une
          barre se voit du coin de l'œil pendant que l'atelier tourne. */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={OBJECTIF}
        aria-valuenow={Math.min(partie.atelier.produitTotal, OBJECTIF)}
        style={{ height: 7, borderRadius: 999, background: `${skin.ink}18`, overflow: "hidden" }}
      >
        <div
          style={{
            width: `${Math.min(100, (100 * partie.atelier.produitTotal) / OBJECTIF)}%`,
            height: "100%",
            background: skin.good,
          }}
        />
      </div>

      {vue && gabarit ? (
        <div
          style={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            padding: "12px 14px",
            border: `2px solid ${skin.ink}22`,
            borderRadius: 10,
            alignSelf: "flex-start",
          }}
        >
          <GLabel skin={skin} style={{ fontSize: 10 }}>
            {t("leModele")}
          </GLabel>
          <Forme grille={gabarit.grille} cote={16} titre={vue.visage} />
          <Chiffre teinte={(vue.rendement ?? 0) > 0 ? skin.good : undefined}>
            {t("parCopie", { n: signe(vue.rendement ?? 0) })}
          </Chiffre>
          <Chiffre>
            {t("solidite")} : {t(solidite(gabarit.cohesion))}
          </Chiffre>
          <Chiffre teinte={vue.fragilite > 20 ? ROUGE : undefined}>
            {surN ? t("casse", { n: surN }) : t("casseRare")}
          </Chiffre>
          <Chiffre teinte={vue.net > 0 ? skin.good : ROUGE}>{t("gainReel", { n: signe(vue.net) })}</Chiffre>
          {/* ⚠️ CE QUE COÛTE UNE COPIE, ET EN COMBIEN DE TOURS ELLE SE REMBOURSE.
              La tension du deuxième acte tient dans ce seul rapport et n'était
              écrite nulle part : l'azote est ce que l'eau paie ET l'atome le
              plus cher. Mesuré sur quatre modèles, la chaîne C-N-C-N se
              rembourse en 5 tours quand la double chaîne, plus rentable en
              brut, en demande 7. Sans ce chiffre, l'arbitrage est invisible. */}
          <Chiffre>{t("coutCopie", { n: vue.coutEnergie })}</Chiffre>
          <Chiffre teinte={vue.amortissement === null ? ROUGE : skin.accent}>
            {vue.amortissement === null ? t("jamaisAmortie") : t("amortie", { n: vue.amortissement })}
          </Chiffre>
        </div>
      ) : null}

      {/* ⚠️ LE MAGASIN — L'AJOUT QUI RÉPOND AU TEST. Sans lui, la ressource qui
          décide de tout n'était affichée nulle part : le panneau de la soupe,
          qui montrait les atomes libres, s'est refermé en ouvrant l'atelier.
          Possédé SUR requis, atome par atome : d'où ils viennent, ce qu'il en
          reste, et pourquoi ça bloque. */}
      {gabarit ? (
        <div>
          <GLabel skin={skin} style={{ fontSize: 11 }}>
            {t("pourGrandir")}
          </GLabel>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 7 }}>
            {(Object.entries(cout) as [Code, number][]).map(([code, requis]) => {
              const possede = partie.atelier.atomes[code] ?? 0;
              const suffit = possede >= requis;
              // ⚠️ LE ROUGE EST RÉSERVÉ À L'ARRÊT RÉEL. Tant qu'une copie tourne,
              // un atome qui manque n'est pas une panne : c'est une croissance
              // en attente. Le rouge disait « cassé » d'un atelier qui produisait
              // +9 par tour, et c'est ce qui a rendu l'écran incompréhensible.
              const teinteManque = partie.atelier.copies === 0 ? ROUGE : skin.accent2;
              return (
                <span
                  key={code}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 10px",
                    borderRadius: 999,
                    fontSize: 12.5,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    border: `2px solid ${suffit ? `${skin.ink}22` : teinteManque}`,
                    background: suffit ? "transparent" : `${teinteManque}1A`,
                    color: skin.ink,
                  }}
                >
                  <span style={{ width: 11, height: 11, borderRadius: 2, background: TEINTE[code] }} />
                  {nomAtome(code)} {t("surTotal", { a: possede, b: requis })}
                </span>
              );
            })}
          </div>
          {/* ⚠️ CE PARAGRAPHE DISAIT MOT POUR MOT CE QUE LA LIGNE DE CONSEIL
              VENAIT DE DIRE, CINQ LIGNES PLUS HAUT : « Vos copies produisent
              quand même — les atomes ne servent qu'à en bâtir d'AUTRES » sous
              « Vos copies produisent +6 par tour et continueront quoi qu'il
              arrive ; les atomes ne servent qu'à en bâtir de NOUVELLES ». Il
              répondait à une bonne question, mais le conseil y répond déjà, en
              premier, et c'est lui qu'on lit. */}
        </div>
      ) : null}

      {/* CE QUE L'ATELIER A FAIT — et surtout QUAND on a fait quelque chose d'utile.
          ⚠️ « JE NE SAIS PAS QUAND J'AI FAIT QUELQUE CHOSE DE PRODUCTIF », a dit
          un testeur. Le seul signal était « dernier tour — 1 bâtie », en gris, et
          il s'effaçait au tour suivant : le moment où le geste porte n'était marqué
          nulle part. La chronique le garde sous les yeux et replie l'attente au
          lieu de la répéter. */}
      {partie.chronique && partie.chronique.length > 0 ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          {[...partie.chronique].reverse().map((e, i) => (
            <li
              key={`${e.tour}-${e.quoi}-${i}`}
              style={{
                fontSize: 12,
                lineHeight: 1.35,
                color: e.quoi === "batie" ? skin.good : e.quoi === "perdue" ? ROUGE : skin.muted,
              }}
            >
              {e.jusqua ? t("chroniqueTours", { a: e.tour, b: e.jusqua }) : t("chroniqueTour", { n: e.tour })}{" "}
              {raconterLatelier(e)}
            </li>
          ))}
        </ul>
      ) : null}

      {manques.length > 0 ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {manques.map((m) => (
            <GBtn
              key={m.code}
              skin={skin}
              size="sm"
              variant="ghost"
              disabled={!m.abordable}
              onClick={() => setPartie((p) => (p ? acheter(p, m.code) : p))}
            >
              {t("acheter", { atome: nomAtome(m.code), prix: m.prix })}
            </GBtn>
          ))}
          {/* ⚠️ IL DISPARAISSAIT QUAND IL NE MANQUAIT QU'UN ATOME, et c'est
              précisément là qu'il porte la seule phrase utile : le bouton par
              atome dit son prix, celui-ci dit ce qu'il DÉBLOQUE — une copie de
              plus, pour toujours. Le moteur de référence le montrait déjà dès
              qu'un achat était possible. */}
          {manques.some((m) => m.abordable) ? (
            <GBtn
              skin={skin}
              size="sm"
              variant="primary"
              // ⚠️ IL EN ACHETAIT UN DE CHAQUE, PAS DE QUOI COMBLER. Avec
              // « azote 0 sur 3 » et 189 d'énergie, un clic n'apportait qu'un
              // seul azote : le bouton promettait « tout » et rendait un tiers.
              // On rachète donc tant qu'il manque quelque chose d'abordable.
              onClick={() =>
                setPartie((p) => {
                  if (!p) return p;
                  let suite = p;
                  for (let garde = 0; garde < 200; garde++) {
                    const encore = cequiManque(suite).find((m) => m.abordable);
                    if (!encore) break;
                    suite = acheter(suite, encore.code);
                  }
                  return suite;
                })
              }
            >
              {/* ⚠️ LE BOUTON DOIT DIRE CE QU'IL DÉBLOQUE. « Tout acheter » ne
                  disait que son geste, jamais son effet — « peu de compréhension
                  des conséquences de ce qu'on fait ». La conséquence se calcule
                  exactement : on simule l'achat et on regarde si l'atelier peut
                  alors bâtir. Ce qu'on annonce est le gain PERMANENT, qui est le
                  vrai enjeu : une copie de plus rapporte à chaque tour, pour
                  toujours. */}
              {(() => {
                let apres = partie;
                for (let garde = 0; garde < 200; garde++) {
                  const encore = cequiManque(apres).find((m) => m.abordable);
                  if (!encore) break;
                  apres = acheter(apres, encore.code);
                }
                return peutBatir(apres.atelier)
                  ? t("toutAcheterBatit", { gain: signe(partie.atelier.gabarit?.rendement ?? 0) })
                  : t("toutAcheter");
              })()}
            </GBtn>
          ) : null}
        </div>
      ) : null}

      {bloque ? (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: `2px solid ${ROUGE}`,
            background: `${ROUGE}14`,
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          {recours ? t("arretRecours") : t("arretFin")}
          {!recours ? (
            <div style={{ marginTop: 9 }}>
              <GBtn
                skin={skin}
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDerniereForce(null);
                  setPartie(nouvellePartie(1 + Math.floor(Math.random() * 999999)));
                }}
              >
                {t("recommencer")}
              </GBtn>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ⚠️ UNE EXPLICATION NE SE LIT QU'UNE FOIS. Ces deux paragraphes se
          recouvraient — l'un disait « c'est vous qui injectez », l'autre « c'est
          vous qui recopiez » — pour 382 caractères permanents sur un écran qui en
          portait 1 701 : « beaucoup de texte à plat pleine page à tout moment ».
          Une seule voix, la moitié des mots, et seulement tant que le joueur n'a
          pas fait la boucle. Dès la deuxième copie il a VU ce qu'ils décrivent.
          Le seuil n'est pas inventé : c'est le geste expliqué, accompli. */}
      {partie.atelier.copies < 2 ? (
        <p style={{ margin: 0, fontSize: 13, color: skin.muted, lineHeight: 1.45, fontStyle: "italic" }}>
          {t("paillasseNote")}
        </p>
      ) : null}

    </GCard>
  );



  /**
   * UNE VOIE VERS LA CIBLE : deux briques, et ce qui les tient.
   *
   * ⚠️ C'EST LA SEULE CHOSE QUE CE PANNEAU DOIT VRAIMENT DIRE. Le reproche revenu
   * à chaque essai est qu'on ne sait pas ce qui est attendu ; une population qui
   * monte et descend n'y répond pas. Une voie y répond : il faut CECI et CELA, et
   * il manque CE GABARIT.
   */
  function ligneVoie(voie: Voie, rang: number) {
    const forte = rang === 0;
    const cible = partie?.cible;
    if (!cible) return null;
    return (
      <div
        key={`${voie.a.empreinte}+${voie.b.empreinte}`}
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          padding: "8px 10px",
          borderRadius: 10,
          border: `2px solid ${forte ? `${skin.accent}66` : `${skin.ink}18`}`,
          background: forte ? `${skin.accent}0C` : "transparent",
        }}
      >
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {[voie.a, voie.b].map((brique, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <Forme grille={brique.grille} cote={9} />
                <Chiffre teinte={brique.effectif > 0 ? undefined : ROUGE}>
                  {brique.effectif > 0 ? `× ${brique.effectif}` : t("absente")}
                </Chiffre>
              </div>
              {i === 0 ? <span style={{ color: skin.muted, fontSize: 14 }}>+</span> : null}
            </div>
          ))}
        </div>
        {/* ⚠️ LA RÉACTION ÉTAIT RACONTÉE, ET AVEC UN MOT QUE PERSONNE NE CONNAÎT.
            « 34 gabarits tiennent les deux · se soude : une chance sur 50 » — trois
            notions à apprendre pour une chose qui se dessine. Ce que « gabarit »
            désigne est simple depuis que le bassin ne se catalyse plus lui-même :
            ce sont VOS molécules. Elles n'ont pas besoin d'un nom, il suffit de les
            montrer POSÉES SUR LA FLÈCHE — c'est exactement ce qu'est un catalyseur,
            et le dessin le dit tout seul. */}
        <div style={{ flex: "1 1 auto", minWidth: 56, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end", justifyContent: "center", minHeight: 14 }}>
            {voie.tenants.slice(0, 2).map((x) => (
              <Forme key={x.empreinte} grille={x.grille} cote={6} />
            ))}
          </div>
          <div style={{ position: "relative", width: "100%", height: 1, background: forte ? skin.accent : `${skin.ink}44` }}>
            <span
              style={{
                position: "absolute",
                right: -1,
                top: -3,
                borderLeft: `5px solid ${forte ? skin.accent : `${skin.ink}44`}`,
                borderTop: "3.5px solid transparent",
                borderBottom: "3.5px solid transparent",
              }}
            />
          </div>
          <Chiffre>{t("uneChanceSur", { sur: Math.max(1, Math.round(1 / voie.chance)) })}</Chiffre>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <Forme grille={cible.grille} cote={9} />
        </div>
      </div>
    );
  }

  // ── Le panneau du bassin ─────────────────────────────────────────────────
  const panneauBassin =
    partie.acte === 3 && partie.cible && conseilBassin ? (
      <GCard key="bassin" skin={skin} style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        <GLabel skin={skin}>{t("panneauBassin")}</GLabel>

        {/* LA CIBLE, ET OÙ ELLE EN EST. Une barre plutôt qu'un compteur : ce qui
            compte est la PART parcourue, et un nombre seul ne la donne pas. */}
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 5,
              padding: "9px 11px",
              borderRadius: 10,
              border: `2px solid ${conseilBassin.present > 0 ? `${skin.good}66` : `${skin.ink}18`}`,
              background: skin.paper,
            }}
          >
            <Chiffre>{t("aFaireTenir")}</Chiffre>
            <Forme grille={partie.cible.grille} cote={13} titre={partie.cible.visage} />
            <Chiffre teinte={conseilBassin.present > 0 ? skin.good : ROUGE}>
              {conseilBassin.present > 0
                ? t("dansLeBassin", { n: conseilBassin.present })
                : t("absenteDuBassin")}
            </Chiffre>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1, minWidth: 190 }}>
            <Chiffre>
              {t("sejour", { n: partie.bassin.tenue, sur: conseilBassin.objectif })}
            </Chiffre>
            <div style={{ height: 7, borderRadius: 4, background: `${skin.ink}14`, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, (100 * partie.bassin.tenue) / conseilBassin.objectif)}%`,
                  background: skin.good,
                  transition: "width 300ms",
                }}
              />
            </div>
            <Chiffre>{t("meilleurSejour", { n: partie.bassin.record })}</Chiffre>
            {/* ⚠️ CETTE LIGNE ACCUSAIT LE COURANT, et le courant n'y est presque
                pour rien. Mesuré sur vingt-quatre parties : sur les sorties de la
                cible, 79 % sont des expulsions par concurrence, 14 % des attritions,
                7 % le courant. Et surtout la cible ne sort presque jamais — elle
                N'ENTRE PAS : le bassin est plein 99 % du temps, et un bassin plein
                refuse toute soudure neuve. C'est cet état-là qu'il faut afficher. */}
            <Chiffre>
              {conseilBassin.plein
                ? t("bassinPlein", {
                    n: partie.bassin.especes.filter((e) => !nourriture(e)).length,
                    places: ESPECES_MAX,
                  })
                : t("bassinUnePlace", {
                    n: partie.bassin.especes.filter((e) => !nourriture(e)).length,
                    places: ESPECES_MAX,
                  })}
            </Chiffre>
          </div>
        </div>

        {conseilBassin.gagne ? (
          <div
            style={{
              padding: "11px 13px",
              borderRadius: 10,
              border: `2px solid ${skin.good}`,
              background: `${skin.good}14`,
              fontSize: 13.5,
              lineHeight: 1.5,
            }}
          >
            <b>{t("bassinGagneTitre")}</b>{" "}
            {t("bassinGagneTexte", { objectif: conseilBassin.objectif })}
            {/* ⚠️ UN BILAN, PAS UNE RÉCOMPENSE. Les cinq testeurs ont réclamé un
                écran de fin, refusé cinq fois parce qu'il donnait sur un couloir
                cassé. Le couloir est réparé. Mais le jeu dit lui-même « c'est le
                bassin qui la fait, pas vous » : le trophée mentirait sur son
                propos. On rend donc ce que le bassin a VRAIMENT fait, tiré de ses
                totaux — et le chiffre qui frappe est celui des refus, parce qu'il
                dit combien de fois la chimie a réussi pendant qu'on croyait qu'il
                ne se passait rien. */}
            {(() => {
              const b = partie.bassin;
              const dit: string[] = [];
              if (b.entreeAu) dit.push(t("bilanEntree", { n: b.entreeAu }));
              if ((b.refusCible ?? 0) > 0) dit.push(t("bilanRefusCible", { n: b.refusCible }));
              if ((b.refusees ?? 0) > 0 && (b.soudures ?? 0) > 0) {
                dit.push(t("bilanPartRefusee", { n: Math.round((100 * b.refusees) / (b.refusees + b.soudures)) }));
              }
              if ((b.expulsees ?? 0) > 0) dit.push(t("bilanExpulsees", { n: b.expulsees }));
              return dit.length > 0 ? (
                <p style={{ margin: "8px 0 0", fontSize: 12.5, lineHeight: 1.45 }}>
                  <strong>{t("bilanTitre")}</strong> {dit.join(", ")}.
                </p>
              ) : null;
            })()}
            {/* ⚠️ UNE FIN QUI NE FINIT RIEN N'EST PAS UNE FIN. Le bassin
                continuait de battre après la victoire, et l'écran ordonnait
                toujours de faire une place dont plus personne n'avait besoin.
                On offre donc la seule suite qui ait un sens. */}
            <div style={{ marginTop: 10 }}>
              <GBtn
                skin={skin}
                size="sm"
                variant="accent"
                title={t("uneAutreEauTitre")}
                onClick={() => {
                  setDerniereForce(null);
                  setPartie(nouvellePartie(1 + Math.floor(Math.random() * 999999)));
                }}
              >
                {t("uneAutreEau")}
              </GBtn>
            </div>
          </div>
        ) : null}

        {/* ⚠️ LA RÈGLE QUI DÉCIDE DE TOUT L'ACTE, ÉCRITE LÀ OÙ ON LA LIT — mais
            PAS indéfiniment. Mesuré sur 390×844 : le panneau portait 1 738
            caractères de prose en six paragraphes, identiques au premier tour et
            au trentième, pour 3 583 caractères d'écran. Ces deux-là décrivent les
            deux gestes de l'acte et s'effacent dès que le joueur en a fait un :
            il l'a alors VU, et les mots deviennent du bruit devant la chose. */}
        {/* CHANGER D'AVIS — le recours, là où le blocage se ressent.
            ⚠️ IL NE PARAÎT QUE QUAND LA PORTE EST FERMÉE ET LA MOLÉCULE ABSENTE.
            Le proposer pendant qu'elle tient serait inviter à jeter ce qu'on
            vient de gagner. Et il annonce son prix avant le clic. */}
        {conseilBassin.autresCibles.length > 0 && conseilBassin.plein ? (
          <div
            style={{
              border: `1px dashed ${OR}`,
              borderRadius: 8,
              padding: 10,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              background: `${OR}0F`,
            }}
          >
            <p style={{ margin: 0, fontSize: 13, color: skin.muted, lineHeight: 1.45 }}>
              {/* ⚠️ « LE BASSIN NE VEUT PAS DE CELLE-CI » ÉTAIT UN VERDICT, ET IL ÉTAIT
                  FAUX. Cette phrase paraît dès que le bassin est plein et la cible
                  dehors — donc 99 % du temps, dès le premier tour. Mesuré sur 304
                  parties gagnées : la cible entre au tour 13 en médiane, une sur dix
                  après le soixantième, la dernière au 228e. */}
              {conseilBassin.coutDuChangement > 0
                ? t("recoursAvecPrix", { n: conseilBassin.revisions, perdu: conseilBassin.coutDuChangement })
                : t("recours", { n: conseilBassin.revisions })}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {/* ⚠️ ON NE VEND PLUS LE COMPTE DE GABARITS. Le bouton doré disait
                  « 2 de vos molécules l'aident », le gris « aucune ne l'aide », et le
                  joueur choisissait là-dessus. Mesuré sans semer : à un soufre, 93 %
                  avec 0-1 gabarit, 93 % avec deux ou plus. Les deux boutons se valent
                  donc, et seul le soufre mérite d'être signalé. */}
              {conseilBassin.autresCibles.map((autre) => (
                <GBtn
                  key={autre.empreinte}
                  skin={skin}
                  size="sm"
                  variant="ghost"
                  onClick={() => setPartie((x) => (x ? reviserLaCible(x, autre.empreinte) : x))}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Forme grille={autre.grille} cote={9} />
                    {(autre.composition.S ?? 0) >= 2 ? t("viserDeuxSoufres") : t("viserCelleCi")}
                  </span>
                </GBtn>
              ))}
            </div>
          </div>
        ) : null}

        {/* ⚠️ LE SECOND PARAGRAPHE EXPLIQUAIT CE QUE LA FLÈCHE MONTRE. « Un gabarit
            n'entre pas dans ce qu'il fabrique : il approche les deux morceaux, puis
            repart intact » — c'est le dessin de la réaction, en quarante mots. */}
        {(partie.bassin.nes ?? 0) <= 6 && (partie.chronique?.length ?? 0) <= 2 ? (
          <p style={{ margin: 0, fontSize: 13, color: skin.muted, lineHeight: 1.45 }}>{t("cibleNonSemable")}</p>
        ) : null}

        <p style={{ margin: 0, fontSize: 13, color: skin.muted }}>{t("parQuoiElleSeFabrique")}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {conseilBassin.voies.map((voie, i) => ligneVoie(voie, i))}
        </div>

        {/* Tout ce qui suit est un geste ou un ordre. Une fois gagné, il n'en
            reste qu'un état : on montre le bassin, on ne le commande plus. */}
        <div style={{ display: conseilBassin.gagne ? "none" : "flex", gap: 8, flexWrap: "wrap" }}>
          {/* ⚠️ LE BOUTON DIT CE QU'IL FERA, PAS CE QU'ON AURAIT VOULU. Il
              annonçait « ×10 » et déposait 1,7 exemplaire en moyenne : 63 % des
              semis conseillés étaient refusés faute d'atomes, les autres tronqués
              en silence, et le joueur ne pouvait pas savoir que c'était la matière
              qu'on lui refusait. */}
          {/* ⚠️ TOUTES, PLUS SEULEMENT TROIS : c'est désormais le seul endroit
              où l'on sème, donc en tronquer la liste retirerait des gestes au
              joueur — et le moteur de référence, lui, les montrait toutes. */}
          {/* SEMER EST LE GESTE QUI DÉCIDE — et il ne l'a pas toujours été. Tant
              que le bassin se catalysait lui-même, il fournissait 60 à 120 gabarits
              tout seul pour une demi-saturation à 12 : semer n'ajoutait rien et
              dépensait une place, et suivre ce conseil faisait passer de 55 à 46
              parties sur 60. Depuis que seules les formes du joueur catalysent :
              3 molécules sans semer 33/60, en semant 46/60 ; 4 en semant 59/60. */}
          {conseilBassin.aider.map((aide) => {
            const piece = partie.collection.find((x) => x.visage === aide.visage);
            if (!piece) return null;
            const lot = lotPayable(partie, piece.grille);
            return (
              <GBtn
                key={aide.visage}
                skin={skin}
                size="sm"
                variant={aide === conseilBassin.aider[0] && lot > 0 ? "accent" : "ghost"}
                disabled={lot === 0}
                onClick={() => setPartie((p) => (p ? semerDansLeBassin(p, piece.grille) : p))}
                title={
                  lot === 0
                    ? t("semerImpossible", {
                        quoi: (Object.entries(piece.composition) as [Code, number][])
                          .map(([c, n]) => `${n} ${nomAtome(c)}`)
                          .join(" · "),
                      })
                    : t("semerGabaritAide")
                }
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Forme grille={piece.grille} cote={7} />
                  {/* ⚠️ ET CE QUE ÇA CHANGE, PAS SEULEMENT COMBIEN. Le bouton disait
                      le geste et jamais son effet. La chance après le semis se
                      calcule exactement — même courbe, gabarits en plus. Et quand
                      elle ne bouge pas, on l'écrit : le bassin fournit à lui seul
                      une soixantaine de gabarits pour une demi-saturation à douze.
                      Deux testeurs ont semé quarante tours pour rien faute de le voir. */}
                  {(() => {
                    if (lot === 0) return t("semerImpossibleCourt", { quoi: nomLisible(aide.visage) });
                    const voie = conseilBassin.voies[0];
                    if (!voie) return t("semerGabaritLot", { quoi: nomLisible(aide.visage), n: lot });
                    const avant = Math.max(1, Math.round(1 / voie.chance));
                    const apres = Math.max(1, Math.round(1 / chanceDeSouder(voie.gabarits + lot)));
                    return avant === apres
                      ? t("semerSansEffet", { quoi: nomLisible(aide.visage), n: lot, sur: avant })
                      : t("semerEtChange", { quoi: nomLisible(aide.visage), n: lot, avant, apres });
                  })()}
                </span>
              </GBtn>
            );
          })}
        </div>
        {/* ⚠️ « AUCUNE NE SAIT » ET « ELLES Y SONT DÉJÀ » NE SONT PAS LA MÊME
            PHRASE. L'écran annonçait la première au moment où le bon gabarit
            tournait dans le bassin. Une explication fausse est pire qu'une
            explication absente. */}
        {conseilBassin.aider.length === 0 && !conseilBassin.gagne ? (
          <p style={{ margin: 0, fontSize: 13, color: skin.muted, lineHeight: 1.45 }}>
            {/* ⚠️ CE PARAGRAPHE DISAIT « IL N'Y A PLUS QU'À LAISSER FAIRE » PENDANT
                QUE LE CONSEIL DISAIT « RETIREZ », sur le même écran — un testeur
                s'y est bloqué. Quand les places sont prises, les gabarits
                travaillent pour rien : la soudure a lieu et le bassin la refoule. */}
            {conseilBassin.dejaLa.length === 0
              ? t("aucunOutil")
              : t(conseilBassin.plein && conseilBassin.present === 0 ? "gabaritsDejaLaPorteFermee" : "gabaritsDejaLa", {
                  quoi: conseilBassin.dejaLa.map((x) => nomLisible(x.visage)).join(", "),
                })}
          </p>
        ) : null}

        {/* LE BASSIN LUI-MÊME : la nourriture d'un côté, ce qui est fabriqué de
            l'autre. Les briques ne disputent aucune place — elles sont le « food
            set », et les compter comme des espèces leur donnait six places sur huit. */}
        <p style={{ margin: 0, fontSize: 13, color: skin.muted, lineHeight: 1.45 }}>{t("lesBriques")}</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {partie.bassin.especes
            .filter((e) => nourriture(e))
            .map((e) => (
              <Habitant key={e.empreinte} esp={e} />
            ))}
        </div>

        {/* ⚠️ CE N'EST PAS UN INVENTAIRE, C'EST UNE PORTE. Mesuré : le bassin est
            plein 99 % du temps, et un bassin plein REFUSE toute soudure neuve —
            82 % de la chimie réussie est annulée là, y compris la cible du joueur,
            près de quatre cents fois par partie. Sans retirer, 13 parties sur 60
            sont gagnées ; en retirant chaque tour, 48 à 51. */}
        <p style={{ margin: 0, fontSize: 13, color: skin.muted }}>
          {conseilBassin.gagne
            ? t("bassinFiniPlaces")
            : t(conseilBassin.plein ? "ceQuiEstFabriquePlein" : "ceQuiEstFabrique", {
                n: partie.bassin.especes.filter((e) => !nourriture(e)).length,
                places: ESPECES_MAX,
              })}
        </p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {partie.bassin.especes
            .filter((e) => !nourriture(e))
            .sort((a, b) => b.effectif - a.effectif)
            .map((e) => {
              const rendu = conseilBassin.inutiles.find((x) => x.empreinte === e.empreinte);
              const cible = partie.cible!.empreinte === e.empreinte;
              return (
                <Habitant
                  key={e.empreinte}
                  esp={e}
                  titre={
                    cible
                      ? t("cestLaCible")
                      : rendu
                        ? t("retirerRend", {
                            quoi: e.visage,
                            rendu: (Object.entries(rendu.rendu) as [Code, number][])
                              .map(([c, n]) => `${n} ${nomAtome(c)}`)
                              .join(" · "),
                          })
                        : t("retirerSimple", { quoi: e.visage })
                  }
                  laVotre={cible}
                  etiquette={t("laVotre")}
                  motRetirer={t("motRetirer")}
                  onRetirer={
                    cible || conseilBassin.gagne
                      ? undefined
                      : () => setPartie((p) => (p ? retirerDuBassin(p, e.empreinte) : p))
                  }
                />
              );
            })}
        </div>

        {/* ⚠️ LE SOLDE, PAS LE DÉFICIT — la même correction qu'au deuxième acte.
            « Pas assez d'atomes » annonce un manque sans montrer ce qu'on a, et
            ici la ressource qui décide de tout est justement invisible. */}
        <p style={{ margin: 0, fontSize: 13, color: skin.muted }}>{t("ceQuiFlottePourGabarit")}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CODES.map((code) => {
            const manque = conseilBassin.manque.find((m) => m.code === code);
            return (
              <span
                key={code}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 9px",
                  borderRadius: 999,
                  border: `2px solid ${manque ? ROUGE : `${skin.ink}22`}`,
                  background: manque ? `${ROUGE}10` : "transparent",
                  fontSize: 13,
                }}
              >
                <span style={{ width: 11, height: 11, borderRadius: 2, background: TEINTE[code] }} />
                {nomAtome(code)} {partie.bassin.libres[code] ?? 0}
              </span>
            );
          })}
        </div>

        {/* LA CHRONIQUE DU MONDE — ce que le bassin vient de faire, tour par tour.
            ⚠️ S'IL N'Y A RIEN À FAIRE, IL FAUT QUELQUE CHOSE À REGARDER. Mesuré :
            43 % des tours passés à attendre que la cible entre n'offrent aucun
            bouton, et pendant ce temps le bassin fait naître, souder, refouler et
            remplacer par dizaines. Tout était compté et rien n'était dit. */}
        {partie.chronique && partie.chronique.length > 0 ? (
          <>
            <p style={{ margin: 0, fontSize: 13, color: skin.muted }}>{t("chroniqueTitre")}</p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 3 }}>
              {[...partie.chronique].reverse().map((e, i) => (
                <li
                  key={`${e.tour}-${e.quoi}-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    flexWrap: "wrap",
                    fontSize: 12,
                    lineHeight: 1.35,
                    color:
                      e.quoi === "cibleEntre" ? skin.good : e.quoi === "cibleSort" || e.quoi === "cibleRefoulee" ? ROUGE : skin.muted,
                  }}
                >
                  <span>{e.jusqua ? t("chroniqueTours", { a: e.tour, b: e.jusqua }) : t("chroniqueTour", { n: e.tour })}</span>
                  {raconterLeMonde(e)}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {/* ⚠️ LA CHRONIQUE A REMPLACÉ CES LIGNES — et je les avais laissées côte
            à côte. « dernier tour — 12 soudures · 67 refoulées », « votre
            molécule a été refoulée 3 fois », « votre molécule a quitté le
            bassin » : la chronique juste au-dessus dit déjà tout cela, tour par
            tour et sans se répéter. Une redondance qu'on a créée soi-même est la
            plus facile à retirer, et la première à voir. */}

        {/* ⚠️ LE MÉTIER DES TROIS ATOMES — la question posée après une partie :
            « les molécules soufrées ne semblent pas favorisées ». Elle était juste
            et mesurable : le soufre ne prend que deux voisins et lie le plus
            faiblement, si bien qu'une molécule qui en porte deux se défait 5,4 fois
            plus vite. On a cessé d'en proposer comme cible ; restait à le DIRE. */}
        {/* ⚠️ 384 CARACTÈRES DE CHIMIE À CHAQUE TOUR POUR UNE QUESTION QUI NE SE
            POSE PAS TOUJOURS. Le paragraphe parle aux trois quarts du soufre ;
            cette question ne se pose que si la cible en contient. Sinon, c'est
            une leçon sans élève. */}
        {partie.cible && Object.keys(espece(partie.cible.grille, partie.milieu).composition).includes("S") ? (
          <p style={{ margin: 0, fontSize: 13, color: skin.muted, lineHeight: 1.45 }}>
            <strong style={{ color: skin.ink, fontWeight: 700 }}>{t("metierDesAtomesTitre")}</strong>{" "}
            {t("metierDesAtomes")}
          </p>
        ) : null}
        {/* La prémisse de l'acte s'efface dès qu'une molécule fabriquée existe :
            la chose vaut mieux que ses 307 caractères. */}
        {partie.bassin.especes.filter((e) => e.taille > 2).length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: skin.muted, lineHeight: 1.45 }}>{t("bassinAide")}</p>
        ) : null}
      </GCard>
    ) : null;

  const rendu = { soupe: panneauSoupe, collection: panneauCollection, atelier: panneauAtelier, bassin: panneauBassin };
  const rang = (nom: string) => (nom === "bassin" ? 0 : nom === "atelier" ? 0 : nom === "soupe" ? 1 : 2);

  return (
    <GameShell
      skin={skin}
      title={t("title")}
      emoji="🧫"
      backLabel={t("back")}
      poweredBy={t("poweredBy")}
      maxWidth={980}
    >
      {enTeteMilieu}
      {ligneConseil}
      {/* ⚠️ `auto-fit` ET NON DEUX COLONNES FIXES. Sur un téléphone les panneaux
          s'empilent et la page défile ; à partir de 700 px ils se rangent côte à
          côte. La thèse — l'écran ne grandit jamais — tient au budget de
          panneaux, pas à la largeur. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 14 }}>
        {panneaux
          .filter((nom) => nom !== "milieu")
          // Le panneau qui porte le GESTE de l'acte vient en premier : la soupe
          // au premier acte, l'atelier au second. Sur un téléphone, où les
          // panneaux s'empilent, c'est lui qu'on doit trouver sans faire défiler.
          .sort((a, b) => rang(a) - rang(b))
          .map((nom) => rendu[nom as "soupe" | "collection" | "atelier" | "bassin"])}
      </div>

      {regles ? (
        <AideModale
          skin={skin}
          titre={t("reglesTitre")}
          texte={partie.acte === 3 ? t("objectifBassin", { n: OBJECTIF_BASSIN }) : t("objectif")}
          fermer={() => setRegles(false)}
          fermerLabel={t("fermer")}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: 4 }}>
            {/* ⚠️ LA MODALE S'ARRÊTAIT À L'ATELIER. Quatre règles, toutes pour les
                deux premiers actes, et pas un mot du bassin — alors que c'est
                l'acte où rien ne dépend d'un clic et où tout dépend d'une lecture.
                D'où « je n'ai pas tout compris à ce que je faisais ». */}
            {[
              [t("regle1Titre"), t("regle1")],
              [t("regle2Titre"), t("regle2")],
              [t("regle3Titre"), t("regle3")],
              [t("regle4Titre"), t("regle4")],
              ...(partie.acte === 3
                ? [
                    [t("regle5Titre"), t("regle5")],
                    [t("regle6Titre"), t("regle6")],
                    [t("regle7Titre"), t("regle7")],
                    [t("regle8Titre"), t("regle8")],
                  ]
                : []),
            ].map(([titre, corps]) => (
              <div key={titre}>
                <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 14.5 }}>{titre}</div>
                <p style={{ margin: "3px 0 0", fontSize: 13.5, lineHeight: 1.5, color: skin.muted }}>{corps}</p>
              </div>
            ))}
          </div>
        </AideModale>
      ) : null}
    </GameShell>
  );
}
