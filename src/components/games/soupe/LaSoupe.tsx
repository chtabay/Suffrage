"use client";

// L'ÉCRAN DE LA SOUPE — le seul, pour toute la partie.
//
// LA BOUCLE, et rien d'autre : j'agite → quelque chose se forme → je garde ce
// qui me plaît → j'en fais un atelier. Le joueur ne pose jamais un atome à la
// main ; il choisit AVEC QUELLE FORCE il secoue, et le monde s'assemble seul.
//
// ⚠️ CE COMPOSANT NE DÉCIDE RIEN DE LA RÈGLE. Il lit `ecran(partie)` pour savoir
// quels panneaux existent, appelle les gestes de `lib/games/soupe/partie`, et
// redessine. Toute règle écrite ici serait une règle que les 73 tests du dépôt
// d'origine ne verraient pas.
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
// séparément — c'est exactement le défaut qui a motivé ce portage. Ici la page
// défile comme toutes les pages de Placet, et c'est le BUDGET DE PANNEAUX qui
// porte la thèse. Il n'a jamais eu besoin du `100dvh` : ce qui garde l'écran
// lisible, c'est que rien ne s'ajoute sans que quelque chose parte.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import GameShell from "@/components/games/GameShell";
import { GBtn, GCard, GLabel } from "@/components/games/ui";
import { SOUPE_SKIN as skin } from "@/lib/games/skin";
import { CODES, caseA } from "@/lib/games/soupe/grille";
import { presenter } from "@/lib/games/soupe/atelier";
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
import { peutBatir } from "@/lib/games/soupe/atelier";
import type { Code, EvenementJournal, Grille, Partie, Piece } from "@/lib/games/soupe/types";

/**
 * LES COULEURS DE LA MATIÈRE — le seul endroit du jeu où la couleur porte du sens.
 *
 * Le joueur n'a aucun code à retenir : le milieu affiche ce qu'il paie avec ces
 * mêmes carrés, en haut de l'écran. Il voit du cyan sur une molécule, il sait.
 */
const TEINTE: Record<Code, string> = {
  C: "#33454B",
  N: "#0C88A2",
  S: "#D2921F",
};

/** Le produit total au-delà duquel le deuxième acte n'a plus rien à dire. */
const HORIZON = 400;

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
 * LA FORME D'UNE MOLÉCULE, recadrée sur ce qu'elle occupe.
 *
 * ⚠️ `aria-label` PORTE LE VISAGE, pas la forme. Un lecteur d'écran ne peut rien
 * faire d'une grille de carrés ; le visage — « CCN » — est justement le nom que
 * le jeu donne à cette forme-là, et c'est sur lui que porte tout le reste.
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
          style={{
            width: cote,
            height: cote,
            borderRadius: 2,
            background: code ? TEINTE[code] : "transparent",
          }}
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
        <span
          key={i}
          style={{ width: cote, height: cote, borderRadius: 2, background: TEINTE[code as Code] }}
        />
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

export default function LaSoupe() {
  const t = useTranslations("Soupe");

  // ⚠️ LA GRAINE EST TIRÉE APRÈS LE MONTAGE, jamais au premier rendu. Un
  // `Math.random()` dans l'état initial donne une valeur au serveur et une autre
  // au navigateur : React signale l'écart en hydratation, et la partie affichée
  // n'est pas celle que le serveur a rendue.
  const [partie, setPartie] = useState<Partie | null>(null);
  const [derniereForce, setDerniereForce] = useState<number | null>(null);
  useEffect(() => {
    setPartie(nouvellePartie(1 + Math.floor(Math.random() * 999999)));
  }, []);

  // L'ATELIER BAT TOUT SEUL. C'est ce qui distingue le deuxième acte du premier :
  // au premier, rien n'arrive sans le joueur ; au second, tout arrive sans lui,
  // et il ne lui reste qu'à alimenter et à juger.
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
    // Triées par ce qu'elles rapportent : l'œil compare au lieu de chercher.
    // La soupe rebat ses molécules à chaque agitation, et un ordre qui saute
    // rendrait la comparaison impossible.
    return [...moleculesVisibles(partie)].sort(
      (a, b) => (b.rendement ?? 0) - (a.rendement ?? 0) || b.taille - a.taille,
    );
  }, [partie]);

  if (!partie) return null;

  const panneaux = ecran(partie).map((e) => e.nom);
  const manques = cequiManque(partie);
  const places = PLACES_COLLECTION - partie.collection.length;
  const pleine = collectionPleine(partie);

  // ── Le milieu, en en-tête ────────────────────────────────────────────────
  // Il tient en une ligne — ce que le monde paie — et reste visible quel que
  // soit l'acte, puisque c'est lui qui donne leur valeur à toutes les molécules.
  const enTeteMilieu = (
    <GCard skin={skin} padding={13} style={{ marginBottom: 14 }}>
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
            <span style={{ fontSize: 13, fontWeight: 800, color: m.valeur > 0 ? skin.good : "#A2402F" }}>
              {signe(m.valeur)}
            </span>
          </span>
        ))}
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 13, color: skin.muted, maxWidth: "60ch" }}>{t("milieuQuoi")}</p>
    </GCard>
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

      {/* LES TROIS FORCES. Chaque bouton EST une agitation : le geste du premier
          acte tient dans le choix de l'intensité, rien d'autre. */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        {FORCES.map((f) => (
          <GBtn
            key={f.force}
            skin={skin}
            size="lg"
            variant={derniereForce === f.force ? "primary" : "ghost"}
            onClick={() => agiter(f.force)}
            // ⚠️ `1 1 0` ET `minWidth: 0`, PAS `1 1 30%`. Vu sur un téléphone de
            // 390 px : à 30 % de base, « Battre » passait à la ligne et la
            // commande du premier acte se lisait comme deux commandes — deux
            // forces d'un côté, une orpheline en dessous. À base zéro, les trois
            // se partagent la largeur à égalité, ce qu'elles sont.
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
          const estGabarit = partie.atelier.gabarit?.visage === piece.visage;
          return (
            <div
              key={piece.piece}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "10px 11px",
                minWidth: 108,
                background: skin.paper,
                border: `2px solid ${(piece.rendement ?? 0) > 0 ? skin.good : `${skin.ink}22`}`,
                borderRadius: 10,
              }}
            >
              <Forme grille={piece.grille} titre={piece.visage} />
              <Chiffre teinte={(piece.rendement ?? 0) > 0 ? skin.good : undefined}>
                {piece.rendement ? t("parTour", { n: signe(piece.rendement) }) : t("sterile")}
              </Chiffre>
              <Chiffre>{t("tient", { n: nb(piece.cohesion) })}</Chiffre>

              {partie.acte === 1 && (piece.rendement ?? 0) > 0 ? (
                <GBtn
                  skin={skin}
                  size="sm"
                  variant="accent"
                  onClick={() => setPartie((p) => (p ? ouvrirLatelier(p, piece.piece) : p))}
                >
                  {t("fonderIci")}
                </GBtn>
              ) : null}
              {partie.acte === 2 && (piece.rendement ?? 0) > 0 && !estGabarit ? (
                <GBtn
                  skin={skin}
                  size="sm"
                  variant="ghost"
                  onClick={() => setPartie((p) => (p ? changerGabarit(p, piece.piece) : p))}
                >
                  {t("gabarit")}
                </GBtn>
              ) : null}
              {estGabarit ? <Chiffre teinte={skin.accent}>{t("enProduction")}</Chiffre> : null}

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
          style={{
            listStyle: "none",
            padding: 0,
            margin: "14px 0 0",
            fontSize: 12,
            color: skin.muted,
            lineHeight: 1.6,
          }}
        >
          {partie.journal.slice(-4).map((e: EvenementJournal, i) => (
            <li key={i}>{raconter(e)}</li>
          ))}
        </ul>
      ) : null}
    </GCard>
  );

  /** Met un événement du journal en mots — à chaque rendu, donc dans la langue du moment. */
  function raconter(e: EvenementJournal): string {
    if (e.quoi === "preleve") return t("journalPreleve", { visage: e.visage, n: e.rendement });
    if (e.quoi === "rejete") return t("journalRejete", { visage: e.visage });
    if (e.quoi === "fonde") return t("journalFonde", { visage: e.visage, n: e.rendement });
    return t("journalGabarit", { visage: e.visage, perdues: e.perdues });
  }

  // ── Le panneau de l'atelier ──────────────────────────────────────────────
  const gabarit = partie.atelier.gabarit;
  const vue = gabarit ? presenter(gabarit, partie.milieu) : null;
  const bilan = partie.bilanAtelier;
  // L'ARRÊT COMPLET : plus de copies, plus de quoi en bâtir, plus de quoi
  // acheter. Une machine morte doit le dire, et dire ce qui reste à faire.
  const bloque =
    !!gabarit &&
    partie.atelier.copies === 0 &&
    !peutBatir(partie.atelier) &&
    manques.every((m) => !m.abordable);
  const recours = partie.collection.some((p) => (p.rendement ?? 0) > 0 && p.visage !== gabarit?.visage);

  const panneauAtelier = (
    <GCard skin={skin} key="atelier">
      <GLabel skin={skin}>{t("panneauAtelier")}</GLabel>

      <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginTop: 10 }}>
        {[
          { v: partie.atelier.copies, n: t("copies") },
          { v: partie.atelier.reserve, n: t("reserve") },
          { v: partie.atelier.produitTotal, n: t("produit") },
        ].map((c) => (
          <div key={c.n} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span
              style={{
                fontFamily: skin.fontDisplay,
                fontWeight: 800,
                fontSize: 28,
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

      {vue && gabarit ? (
        <div
          style={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            marginTop: 14,
            padding: "12px 14px",
            border: `2px solid ${skin.ink}22`,
            borderRadius: 10,
          }}
        >
          <Forme grille={gabarit.grille} cote={16} titre={vue.visage} />
          <Chiffre>{vue.composition}</Chiffre>
          <Chiffre teinte={(vue.rendement ?? 0) > 0 ? skin.good : undefined}>
            {t("parCopie", { n: signe(vue.rendement ?? 0) })}
          </Chiffre>
          <Chiffre teinte={vue.fragilite > 20 ? "#A2402F" : undefined}>
            {t("seDefait", { p: nb(vue.fragilite, 1) })}
          </Chiffre>
          <Chiffre teinte={vue.net > 0 ? skin.good : "#A2402F"}>{t("net", { n: signe(vue.net) })}</Chiffre>
        </div>
      ) : null}

      {/* CE QUI VIENT DE SE PASSER. Sans cette ligne, le joueur voit des
          compteurs bouger sans pouvoir attribuer leur mouvement — et surtout
          sans distinguer « je manque d'atomes » de « mes copies se défont ». */}
      {bilan ? (
        <p style={{ margin: "12px 0 0", fontSize: 12, color: skin.muted }}>
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
        <>
          <div
            style={{
              marginTop: 12,
              padding: "9px 12px",
              borderRadius: 10,
              borderLeft: `3px solid ${skin.accent2}`,
              background: `${skin.accent2}14`,
              fontSize: 13,
            }}
          >
            {t("manque", { liste: manques.map((m) => `${m.manque} ${m.code}`).join(", ") })}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {manques.map((m) => (
              <GBtn
                key={m.code}
                skin={skin}
                size="sm"
                variant="ghost"
                disabled={!m.abordable}
                onClick={() => setPartie((p) => (p ? acheter(p, m.code) : p))}
              >
                {t("acheter", { code: m.code, prix: m.prix })}
              </GBtn>
            ))}
            {manques.some((m) => m.abordable) ? (
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
                {t("combler")}
              </GBtn>
            ) : null}
          </div>
        </>
      ) : null}

      {bloque ? (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 10,
            border: `2px solid #A2402F`,
            background: "#A2402F14",
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

      <p style={{ margin: "12px 0 0", fontSize: 13, color: skin.muted, lineHeight: 1.45 }}>{t("atelierAide")}</p>

      {/* LA FIN DE CE QUI EST ÉCRIT. On le dit franchement plutôt que de laisser
          le joueur chercher une suite qui n'existe pas encore. */}
      {partie.atelier.produitTotal >= HORIZON ? (
        <div
          style={{
            marginTop: 12,
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
    </GameShell>
  );
}
