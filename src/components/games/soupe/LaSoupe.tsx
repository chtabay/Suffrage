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
import { coutEnAtomes, peutBatir, presenter } from "@/lib/games/soupe/atelier";
import { FORCES, cellulesDe } from "@/lib/games/soupe/soupe";
import {
  HORIZON_ATELIER,
  LOT_SEMIS,
  PLACES_COLLECTION,
  acheter,
  agiterLaSoupe,
  cequiManque,
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
  semerDansLeBassin,
  ticDuBassin,
  ticLatelier,
} from "@/lib/games/soupe/partie";
import { ESPECES_MAX, nourriture } from "@/lib/games/soupe/bassin";
import type { Code, Espece, EvenementJournal, Grille, Partie, Piece, Voie } from "@/lib/games/soupe/types";

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

/** Le courant emporte un individu sur vingt-cinq par tour : c'est le repère. */
const SEJOUR_DU_HASARD = 25;

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
}: {
  esp: Espece;
  cote?: number;
  titre?: string;
  onRetirer?: () => void;
}) {
  const contenu = (
    <>
      <Forme grille={esp.grille} cote={cote} />
      <Chiffre>× {esp.effectif}</Chiffre>
    </>
  );
  const style: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    padding: "5px 6px",
    borderRadius: 8,
    border: `2px solid ${skin.ink}18`,
    background: skin.paper,
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
  const ouvert = (partie?.panneaux.includes("atelier") || partie?.panneaux.includes("bassin")) ?? false;
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
  }, [ouvert, acte]);

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
      const cible = partie!.cible.visage;
      if (c.gagne) return t("bassinConseilGagne", { cible });
      // L'ATOME QUI MANQUE PASSE AVANT TOUT LE RESTE : conseiller de semer
      // pendant que le bouton est grisé, c'est l'écran qui contredit l'écran.
      if (c.manque.length > 0) {
        const quoi = c.manque.map((m) => `${m.manque} ${nomAtome(m.code)}`).join(" + ");
        const source = c.inutiles.find((e) => e.utile > 0);
        const debut = c.present === 0
          ? t("bassinConseilAbsenteEtManque", { cible, quoi })
          : t("bassinConseilManque", { quoi });
        return source
          ? `${debut} ${t("bassinConseilRetirer", {
              quoi: source.visage,
              rendu: c.manque.map((m) => `${source.rendu[m.code] ?? 0} ${nomAtome(m.code)}`).join(" + "),
            })}`
          : `${debut} ${t("bassinConseilAttendre")}`;
      }
      if (c.present === 0) return t("bassinConseilAbsente", { cible });
      const meilleure = c.voies[0];
      if (!meilleure) return t("bassinConseilImpossible");
      if (meilleure.gabarits === 0) {
        const quoi = c.aider[0];
        return quoi ? t("bassinConseilSansGabarit", { quoi: quoi.visage }) : t("bassinConseilSansOutil");
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
      <span>{conseil()}</span>
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
    if (e.quoi === "bassin") return t("journalBassin", { cible: e.visage, objectif: e.objectif });
    if (e.quoi === "seme") {
      return e.remisAZero
        ? t("journalSemeRemis", { n: e.combien, quoi: e.visage })
        : t("journalSeme", { n: e.combien, quoi: e.visage });
    }
    if (e.quoi === "retire") return t("journalRetire", { quoi: e.visage });
    return t("journalSansAtomes");
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
              <Forme grille={piece.grille} titre={piece.visage} />
              {partie.acte === 3 ? (
                <>
                  <Chiffre teinte={utile ? skin.good : undefined}>
                    {dansLeBassin ? t("dejaDansLeBassin") : outil ? t("tientLesDeux") : t("neTientPas")}
                  </Chiffre>
                  <Chiffre>{t("atomesASemer", { n: piece.taille })}</Chiffre>
                  <GBtn
                    skin={skin}
                    size="sm"
                    variant={outil ? "accent" : "ghost"}
                    onClick={() => setPartie((p) => (p ? semerDansLeBassin(p, piece.grille) : p))}
                    title={t("semerPieceAide")}
                  >
                    {t("semerPiece", { n: LOT_SEMIS })}
                  </GBtn>
                </>
              ) : (
                <>
                  <Chiffre teinte={paie ? skin.good : undefined}>
                    {paie ? t("parTour", { n: signe(piece.rendement ?? 0) }) : t("sterile")}
                  </Chiffre>
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
  const bilan = partie.bilanAtelier;
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
            <Chiffre teinte={c.tension > 0.25 ? ROUGE : skin.good}>
              {c.plusRare
                ? t("cibleRarete", {
                    n: c.plusRare.requis,
                    atome: nomAtome(c.plusRare.code),
                    verse: c.plusRare.verse,
                  })
                : ""}
            </Chiffre>
            <Chiffre teinte={c.outils > 0 ? skin.good : ROUGE}>
              {c.outils > 0 ? t("cibleOutils", { n: c.outils }) : t("cibleSansOutil")}
            </Chiffre>
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
          {/* La distinction en une phrase, sous les chiffres qui la posent. */}
          <p style={{ margin: "8px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
            {t("magasinNote")}
          </p>
        </div>
      ) : null}

      {/* CE QUI VIENT DE SE PASSER. Sans cette ligne, le joueur voit des
          compteurs bouger sans pouvoir attribuer leur mouvement — et surtout
          sans distinguer « je manque d'atomes » de « mes copies se défont ». */}
      {bilan ? (
        <p style={{ margin: 0, fontSize: 12, color: skin.muted }}>
          {t("dernierTour")} —{" "}
          {bilan.baties === 0 && bilan.perdues === 0 && bilan.produit === 0
            ? t("rienFauteAtomes")
            : [
                bilan.baties > 0 ? t("baties", { n: bilan.baties }) : null,
                bilan.perdues > 0 ? t("defaites", { n: bilan.perdues }) : null,
                bilan.produit !== 0 ? t("enReserve", { n: signe(bilan.produit) }) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
        </p>
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
          {manques.some((m) => m.abordable) && manques.reduce((s, m) => s + m.manque, 0) > 1 ? (
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
              {t("toutAcheter")}
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

      <p style={{ margin: 0, fontSize: 13, color: skin.muted, lineHeight: 1.45 }}>{t("atelierAide")}</p>

      {/* ⚠️ CE QUE L'ATELIER N'EST PAS, ET IL FAUT LE DIRE.
          Chimiquement, une molécule ne se recopie pas toute seule : c'est LE
          problème difficile de l'origine de la vie, et l'atelier l'escamotait en
          l'offrant au deuxième acte. Le corriger ne demande pas de casser une
          mécanique qui fonctionne — il suffit de nommer ce qu'elle est. Ici,
          c'est VOUS qui recopiez, à la main. Rien n'est vivant.
          Et ça pose les enjeux de la suite : trouver ce qui se refait sans vous. */}
      <p style={{ margin: 0, fontSize: 13, color: skin.muted, lineHeight: 1.45, fontStyle: "italic" }}>
        {t("paillasseNote")}
      </p>

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
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <Chiffre teinte={voie.gabarits > 0 ? skin.good : ROUGE}>
            {voie.gabarits > 0 ? t("gabaritsTiennent", { n: voie.gabarits }) : t("aucunGabarit")}
          </Chiffre>
          <Chiffre>{t("seSoude", { sur: Math.max(1, Math.round(1 / voie.chance)) })}</Chiffre>
          {voie.tenants.length > 0 ? (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 3 }}>
              {voie.tenants.slice(0, 4).map((x) => (
                <Habitant key={x.empreinte} esp={x} cote={8} />
              ))}
            </div>
          ) : null}
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
            {/* ⚠️ ON DIT CE QUE VAUT LE HASARD SEUL. Sans ce repère, soixante
                tours est un chiffre arbitraire ; avec lui, c'est deux fois et
                demie ce que le courant accorde à une molécule que personne ne refait. */}
            <Chiffre>{t("repereHasard", { n: SEJOUR_DU_HASARD })}</Chiffre>
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
            {t("bassinGagneTexte", { cible: partie.cible.visage, objectif: conseilBassin.objectif })}
          </div>
        ) : null}

        {/* ⚠️ LA RÈGLE QUI DÉCIDE DE TOUT L'ACTE DOIT ÊTRE ÉCRITE, pas devinée
            après coup en voyant un compteur retomber à zéro. */}
        <p style={{ margin: 0, fontSize: 13, color: skin.muted, lineHeight: 1.45 }}>{t("semerRemetAZero")}</p>

        <p style={{ margin: 0, fontSize: 13, color: skin.muted }}>{t("parQuoiElleSeFabrique")}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {conseilBassin.voies.map((voie, i) => ligneVoie(voie, i))}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <GBtn
            skin={skin}
            size="sm"
            disabled={conseilBassin.manque.length > 0}
            onClick={() => setPartie((p) => (p && p.cible ? semerDansLeBassin(p, p.cible.grille) : p))}
            title={
              conseilBassin.manque.length > 0
                ? t("manquePour", {
                    quoi: conseilBassin.manque.map((m) => `${m.manque} ${nomAtome(m.code)}`).join(" + "),
                  })
                : t("semerCibleAide")
            }
          >
            {t("semerCible", { n: LOT_SEMIS })}
          </GBtn>
          {conseilBassin.aider.slice(0, 3).map((aide) => {
            const piece = partie.collection.find((x) => x.visage === aide.visage);
            if (!piece) return null;
            return (
              <GBtn
                key={aide.visage}
                skin={skin}
                size="sm"
                variant="ghost"
                onClick={() => setPartie((p) => (p ? semerDansLeBassin(p, piece.grille) : p))}
                title={t("semerGabaritAide")}
              >
                {t("semerGabarit", { quoi: aide.visage })}
              </GBtn>
            );
          })}
        </div>
        {conseilBassin.aider.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: skin.muted, lineHeight: 1.45 }}>{t("aucunOutil")}</p>
        ) : null}

        {/* LE BASSIN LUI-MÊME : la nourriture d'un côté, ce qui est fabriqué de
            l'autre. Les briques ne disputent aucune place — elles sont le « food
            set », et les compter comme des espèces leur donnait six places sur huit. */}
        <p style={{ margin: 0, fontSize: 13, color: skin.muted }}>{t("lesBriques")}</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {partie.bassin.especes
            .filter((e) => nourriture(e))
            .map((e) => (
              <Habitant key={e.empreinte} esp={e} />
            ))}
        </div>

        <p style={{ margin: 0, fontSize: 13, color: skin.muted }}>
          {t("ceQuiEstFabrique", {
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
                  onRetirer={cible ? undefined : () => setPartie((p) => (p ? retirerDuBassin(p, e.empreinte) : p))}
                />
              );
            })}
        </div>

        {/* ⚠️ LE SOLDE, PAS LE DÉFICIT — la même correction qu'au deuxième acte.
            « Pas assez d'atomes » annonce un manque sans montrer ce qu'on a, et
            ici la ressource qui décide de tout est justement invisible. */}
        <p style={{ margin: 0, fontSize: 13, color: skin.muted }}>{t("ceQuiFlotte")}</p>
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

        {partie.bilanBassin ? (
          <p style={{ margin: 0, fontSize: 12.5, color: skin.muted }}>
            {t("dernierTour")} —{" "}
            {[
              partie.bilanBassin.nes > 0 ? t("briquesNees", { n: partie.bilanBassin.nes }) : null,
              partie.bilanBassin.soudures > 0 ? t("soudures", { n: partie.bilanBassin.soudures }) : null,
              partie.bilanBassin.morts > 0 ? t("moleculesDefaites", { n: partie.bilanBassin.morts }) : null,
              partie.bilanBassin.emportes > 0 ? t("emportees", { n: partie.bilanBassin.emportes }) : null,
            ]
              .filter(Boolean)
              .join(" · ") || t("rien")}
          </p>
        ) : null}

        <p style={{ margin: 0, fontSize: 13, color: skin.muted, lineHeight: 1.45 }}>{t("bassinAide")}</p>
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
          texte={t("objectif")}
          fermer={() => setRegles(false)}
          fermerLabel={t("fermer")}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: 4 }}>
            {[
              [t("regle1Titre"), t("regle1")],
              [t("regle2Titre"), t("regle2")],
              [t("regle3Titre"), t("regle3")],
              [t("regle4Titre"), t("regle4")],
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
