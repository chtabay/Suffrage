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
  PLACES_COLLECTION,
  acheter,
  agiterLaSoupe,
  cequiManque,
  changerGabarit,
  collectionPleine,
  ecran,
  moleculesVisibles,
  nouvellePartie,
  ouvrirLatelier,
  peutOuvrirLatelier,
  preleverMolecule,
  rejeterPiece,
  ticLatelier,
} from "@/lib/games/soupe/partie";
import type { Code, EvenementJournal, Grille, Partie, Piece } from "@/lib/games/soupe/types";

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

/** L'objectif, et la fin de ce qui est écrit. Les deux coïncident, et c'est dit. */
const OBJECTIF = 400;

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
  const ouvert = partie?.panneaux.includes("atelier") ?? false;
  const battement = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!ouvert) return;
    battement.current = setInterval(() => setPartie((p) => (p ? ticLatelier(p) : p)), BATTEMENT);
    return () => {
      if (battement.current) clearInterval(battement.current);
    };
  }, [ouvert]);

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

  /**
   * CE QU'ON ATTEND DU JOUEUR, MAINTENANT.
   *
   * Une seule phrase, dérivée de l'état. Répond au reproche le plus direct du
   * premier test — « j'ai du mal à savoir ce qui est attendu » — là où une aide
   * générale ne répond à rien, puisqu'on la saute.
   */
  function conseil(): string {
    if (partie!.acte === 1) {
      if (partie!.soupe.agitations === 0) return t("conseilDebut");
      if (peutOuvrirLatelier(partie!)) return t("conseilLancer");
      if (partie!.collection.length === 0 && molecules.some((m) => (m.rendement ?? 0) > 0)) {
        return t("conseilGarder");
      }
      return t("conseilChercher");
    }
    if (manques.length === 0) return t("conseilTourne");
    return manques.some((m) => m.abordable) ? t("conseilRacheter") : t("conseilAttendre");
  }

  // ── Le milieu, en en-tête ────────────────────────────────────────────────
  const enTeteMilieu = (
    <GCard skin={skin} padding={13} style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 16 }}>{t("milieuNom")}</span>
        <span style={{ fontSize: 13, color: skin.muted }}>{t("recherche")}</span>
        {partie.milieu.motifs.map((m) => (
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
      <p style={{ margin: "8px 0 0", fontSize: 13, color: skin.muted, maxWidth: "62ch", lineHeight: 1.45 }}>
        {t("milieuQuoi")}
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
    return t("journalGabarit", { perdues: e.perdues });
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
                border: `2px solid ${paie ? skin.good : `${skin.ink}22`}`,
                borderRadius: 10,
              }}
              title={`${piece.taille} atomes · ${t("solidite")} ${nb(piece.cohesion)}`}
            >
              <Forme grille={piece.grille} titre={piece.visage} />
              <Chiffre teinte={paie ? skin.good : undefined}>
                {paie ? t("parTour", { n: signe(piece.rendement ?? 0) }) : t("sterile")}
              </Chiffre>
              <Chiffre>
                {t("solidite")} : {t(solidite(piece.cohesion))}
              </Chiffre>

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
              {estGabarit ? <Chiffre teinte={skin.accent}>— {t("enProduction")} —</Chiffre> : null}

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

  const panneauAtelier = (
    <GCard skin={skin} key="atelier">
      <GLabel skin={skin}>{t("panneauAtelier")}</GLabel>

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
            {t("ilFaut")}
          </GLabel>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 7 }}>
            {(Object.entries(cout) as [Code, number][]).map(([code, requis]) => {
              const possede = partie.atelier.atomes[code] ?? 0;
              const suffit = possede >= requis;
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
                    border: `2px solid ${suffit ? `${skin.ink}22` : ROUGE}`,
                    background: suffit ? "transparent" : `${ROUGE}12`,
                    color: suffit ? skin.ink : ROUGE,
                  }}
                >
                  <span style={{ width: 11, height: 11, borderRadius: 2, background: TEINTE[code] }} />
                  {nomAtome(code)} {t("surTotal", { a: possede, b: requis })}
                </span>
              );
            })}
          </div>
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
          {manques.filter((m) => m.abordable).length > 1 ? (
            <GBtn
              skin={skin}
              size="sm"
              variant="primary"
              onClick={() =>
                setPartie((p) => {
                  if (!p) return p;
                  let suite = p;
                  for (const m of cequiManque(suite)) {
                    if (m.abordable) suite = acheter(suite, m.code);
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

      {/* LA FIN DE CE QUI EST ÉCRIT. On le dit franchement plutôt que de laisser
          le joueur chercher une suite qui n'existe pas encore. */}
      {partie.atelier.produitTotal >= OBJECTIF ? (
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
          <b>{t("horizonTitre")}</b> {t("horizonTexte")}
        </div>
      ) : null}
    </GCard>
  );

  const rendu = { soupe: panneauSoupe, collection: panneauCollection, atelier: panneauAtelier };
  const rang = (nom: string) => (nom === "atelier" ? 0 : nom === "soupe" ? 1 : 2);

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
          .map((nom) => rendu[nom as "soupe" | "collection" | "atelier"])}
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
