"use client";

// L'ÉCRAN DU JEU — un seul, pour toute la partie.
//
// LA BOUCLE, et rien d'autre (spec §20) : je clique sur un pays → il obtient
// X/5 → j'ai envie d'en essayer un autre. Tout ce qui n'améliore pas ce
// mouvement est secondaire, et la plupart du temps nuisible.
//
// CE QUI N'EST PAS À L'ÉCRAN, et pourquoi :
//   · pas de cases vides pour les cinq critères — elles diraient au joueur qu'il
//     y a cinq choses à trouver, et transformeraient un sondage en formulaire ;
//   · pas d'indice automatique — chaque essai EST l'indice ;
//   · pas de compte, pas de salon, pas de tutoriel : une phrase, puis la carte.
//
// ⚠️ LE SCORE NE SE CALCULE PAS ICI. Ce composant ne connaît ni les critères ni
// la réponse : il envoie un code pays et reçoit un entier. C'est ce qui permet
// d'ouvrir les outils de développement sans lire la solution du jour.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { nomPays } from "@/content/pays/referentiel";
import { ajouteResultat, serieEnCours } from "@/lib/games/pays/local";
import { CHIFFRES, ENCRE_SUR_GRADIENT, GRADIENT } from "@/lib/games/pays/palette";
import type { Essai, ReponseEssai, Revelation as DonneesRevelation } from "@/lib/games/pays/types";

/** Ce que le serveur renvoie pour une case qui parle : un emoji et un mot. */
type Etiquette = { picto: string; texte: string };
import { PAYS_SKIN as skin } from "@/lib/games/skin";
import GameShell from "@/components/games/GameShell";
import { GCard, GLabel } from "@/components/games/ui";
import Carte from "./Carte";
import Compte from "./Compte";
import Recherche from "./Recherche";
import Revelation from "./Revelation";

interface Sauvegarde {
  essais: Essai[];
  /** `cases[i]` : les cinq 0/1 de l'essai i, du critère le plus courant au plus rare. */
  cases?: number[][];
  /**
   * L'étiquette de chaque critère, une fois les 25 essais passés.
   *
   * ⚠️ GARDÉ AVEC LA PARTIE, alors qu'il se recalcule à chaque essai. Sans ça,
   * un rechargement après le 30e essai ferait DISPARAÎTRE la légende jusqu'au
   * coup suivant — un joueur qui vient de comprendre où chercher perdrait son
   * repère au pire moment, et croirait à un bug.
   */
  pictos?: (Etiquette | null)[];
  revelation?: DonneesRevelation;
  /** Horodatage de l'arrivée sur la carte : sert au délai avant premier essai. */
  debut?: number;
  partie?: string;
}

const cle = (jour: number) => `placet.pays.${jour}`;

/** Jeton anonyme d'une partie : de quoi recoudre les essais entre eux, rien de plus. */
const tirePartie = () => Math.random().toString(36).slice(2, 12);

export default function PaysDuJour({ jour }: { jour: number }) {
  const t = useTranslations("Pays");
  const locale = useLocale();

  const [essais, setEssais] = useState<Essai[]>([]);
  const [cases, setCases] = useState<number[][]>([]);
  const [pictos, setPictos] = useState<(Etiquette | null)[]>([]);
  const [revelation, setRevelation] = useState<DonneesRevelation | null>(null);
  const [carteComplete, setCarteComplete] = useState(false);
  const [surbrillance, setSurbrillance] = useState<string | null>(null);
  const [dernier, setDernier] = useState<{ pays: string; score: number; repete?: boolean } | null>(null);
  const [erreur, setErreur] = useState(false);
  const [pret, setPret] = useState(false);
  const [serie, setSerie] = useState(0);
  const partie = useRef<string>("");
  const debut = useRef<number>(0);

  // ⚠️ LE LOCALSTORAGE NE SE LIT QU'APRÈS LE MONTAGE. Le lire dans un
  // `useState(() => …)` fait diverger le rendu serveur (vide) du rendu client
  // (une partie en cours) : React ne rattrape pas les attributs, et l'écran
  // reste bloqué sur l'état du serveur. La leçon est déjà écrite dans
  // UnanimoCreate ; elle vaut ici mot pour mot.
  useEffect(() => {
    let sauve: Sauvegarde | null = null;
    try {
      sauve = JSON.parse(window.localStorage.getItem(cle(jour)) ?? "null");
    } catch {
      sauve = null;
    }
    partie.current = sauve?.partie ?? tirePartie();
    debut.current = sauve?.debut ?? Date.now();
    setEssais(sauve?.essais ?? []);
    setCases(sauve?.cases ?? []);
    setPictos(sauve?.pictos ?? []);
    setRevelation(sauve?.revelation ?? null);
    setSerie(serieEnCours(jour));
    setPret(true);

    // On efface les journées précédentes : sans ça, le stockage grossit d'une
    // partie par jour, indéfiniment, pour un jeu qui ne relit jamais hier.
    //
    // ⚠️ LE FILTRE VISE UN NUMÉRO, PAS UN PRÉFIXE. La première version balayait
    // tout ce qui commence par `placet.pays.` — ce qui emportait aussi
    // `placet.pays.resultats`, la liste des victoires. Effet : la série se
    // remettait à zéro au premier changement de journée, c'est-à-dire pour tout
    // le monde, tous les jours, en silence. Trouvé en jouant deux journées de
    // suite au navigateur ; ni tsc, ni eslint, ni le test ne pouvaient le voir.
    const journaliere = /^placet\.pays\.\d+$/;
    for (const k of Object.keys(window.localStorage)) {
      if (journaliere.test(k) && k !== cle(jour)) window.localStorage.removeItem(k);
    }
  }, [jour]);

  const enregistre = useCallback(
    (prochains: Essai[], reveal: DonneesRevelation | null, remplies: number[][], domaines: (Etiquette | null)[]) => {
      const corps: Sauvegarde = {
        essais: prochains,
        cases: remplies,
        pictos: domaines,
        revelation: reveal ?? undefined,
        debut: debut.current,
        partie: partie.current,
      };
      try {
        window.localStorage.setItem(cle(jour), JSON.stringify(corps));
      } catch {
        // Navigation privée, quota plein : la partie continue en mémoire. Perdre
        // l'historique au rechargement est désagréable ; refuser de jouer serait pire.
      }
    },
    [jour],
  );

  /** Une mesure ne doit jamais faire échouer une partie : tout est avalé. */
  const mesure = useCallback(
    (evt: string, champs: Record<string, number> = {}) => {
      const corps = JSON.stringify({ evt, jour, partie: partie.current, ...champs });
      try {
        if (navigator.sendBeacon) navigator.sendBeacon("/api/games/pays/journal", new Blob([corps], { type: "application/json" }));
        else void fetch("/api/games/pays/journal", { method: "POST", body: corps, headers: { "Content-Type": "application/json" }, keepalive: true });
      } catch {
        /* rien */
      }
    },
    [jour],
  );

  useEffect(() => {
    if (pret) mesure("partie", { essais: essais.length });
    // Une seule fois par arrivée sur la carte : `essais` n'est pas une dépendance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pret]);

  const scores = useMemo(() => Object.fromEntries(essais.map((e) => [e.pays, e.score])), [essais]);

  const gagne = revelation !== null;

  const joue = async (id: string) => {
    if (gagne) return;
    const deja = essais.find((e) => e.pays === id);
    if (deja) {
      // §10 : on ne rejoue pas le même pays par accident. Le retour reste
      // informatif — il rappelle le score — mais ne compte pas un essai.
      setDernier({ pays: id, score: deja.score, repete: true });
      return;
    }
    setErreur(false);
    try {
      const r = await fetch("/api/games/pays/essai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // `rang` est ce qui rend lisible « le score moyen du n-ième essai »
        // (§13) : sans lui, le journal sait combien d'essais ont été faits, mais
        // plus lequel valait combien.
        // On renvoie toute la suite des essais : le serveur rend alors la
        // matrice ENTIÈRE des recouvrements, y compris pour une partie reprise
        // après un rechargement. Une matrice complète, jamais rapiécée.
        body: JSON.stringify({
          jour,
          pays: id,
          locale,
          partie: partie.current,
          rang: essais.length + 1,
          precedents: essais.map((e) => e.pays),
        }),
      });
      if (!r.ok) throw new Error("refus");
      const rep = (await r.json()) as ReponseEssai;
      const prochains = [...essais, { pays: id, score: rep.score }];
      const remplies = rep.cases ?? [];
      const domaines = rep.pictos ?? [];
      setCases(remplies);
      setPictos(domaines);
      if (essais.length === 0) mesure("premier", { secondes: Math.round((Date.now() - debut.current) / 1000) });
      setEssais(prochains);
      setDernier({ pays: id, score: rep.score });
      const reveal = rep.revelation ?? null;
      if (reveal) {
        const secondes = Math.round((Date.now() - debut.current) / 1000);
        setRevelation(reveal);
        setCarteComplete(false);
        mesure("fini", { essais: prochains.length, secondes });
        // La série se met à jour AVANT que le bloc « compte » ne s'affiche : il
        // propose de garder un chiffre que le joueur doit déjà voir.
        setSerie(serieEnCours(jour, ajouteResultat({ jour, essais: prochains.length, secondes })));
      }
      enregistre(prochains, reveal, remplies, domaines);
    } catch {
      setErreur(true);
    }
  };

  /** Le partage ne dit ni le pays, ni les critères : seulement la forme de la partie. */
  const partage = () => {
    const texte = `${t("partageTitre", { n: jour, essais: essais.length })}\n${essais.map((e) => CHIFFRES[e.score]).join("")}`;
    mesure("partage", { essais: essais.length });
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      void navigator.share({ text: `${texte}\n${url}` }).catch(() => {});
      return;
    }
    void navigator.clipboard?.writeText(`${texte}\n${url}`).catch(() => {});
  };

  // La carte montre les essais pendant la partie, et TOUT après la victoire —
  // jamais l'inverse : colorer d'avance les pays non essayés donnerait la
  // structure du puzzle sans que le joueur l'ait sondée (§4.2).
  const scoresAffiches = carteComplete && revelation ? revelation.scores : scores;

  return (
    <GameShell
      skin={skin}
      title={t("name")}
      emoji="🌍"
      backLabel={t("back")}
      poweredBy={t("poweredBy")}
      maxWidth={860}
      aside={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
          {/* La série se montre dès qu'elle vaut quelque chose, et ne demande
              RIEN. C'est la seule trace du compte avant la victoire : une
              récompense, pas un appel à l'inscription. */}
          {serie > 1 && (
            <span
              title={t("serieTitre", { n: serie })}
              style={{
                fontWeight: 800,
                fontSize: 13,
                padding: "2px 9px",
                borderRadius: 999,
                border: `2px solid ${skin.ink}`,
                background: skin.accent2,
              }}
            >
              🔥 {serie}
            </span>
          )}
          <span style={{ fontWeight: 800, fontSize: 13, color: skin.muted }}>{t("numero", { n: jour })}</span>
        </span>
      }
    >
      <h1
        style={{
          fontFamily: skin.fontDisplay,
          fontWeight: 800,
          fontSize: "clamp(26px,7vw,38px)",
          lineHeight: 1.05,
          letterSpacing: "-0.03em",
          margin: 0,
        }}
      >
        {t("titre")}
      </h1>
      <p style={{ margin: "8px 0 0", fontSize: 15.5, lineHeight: 1.5, color: skin.muted, maxWidth: "52ch" }}>
        {t("consigne")}
      </p>

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {!gagne && (
          <Recherche
            skin={skin}
            locale={locale}
            scores={scores}
            onChoix={joue}
            onSurvol={setSurbrillance}
            placeholder={t("recherche")}
            dejaJoue={t("dejaCourt")}
          />
        )}

        <Carte
          skin={skin}
          scores={scoresAffiches}
          surbrillance={surbrillance}
          onPays={joue}
          etiquette={t("carteEtiquette")}
        />

        {/* LE RETOUR D'UN ESSAI. Compact, juste sous la carte, et toujours au
            même endroit : c'est la seule ligne que le joueur relit vingt fois. */}
        <div role="status" aria-live="polite" style={{ minHeight: 46 }}>
          {erreur && (
            <GCard skin={skin} padding={11} accent={skin.accent2}>
              <span style={{ fontWeight: 700 }}>{t("erreur")}</span>
            </GCard>
          )}
          {!erreur && dernier && (
            <GCard skin={skin} padding={11} accent={dernier.score === 5 ? skin.good : skin.accent}>
              <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <Pastille score={dernier.score} />
                <span style={{ fontWeight: 800, fontSize: 17 }}>{nomPays(dernier.pays, locale)}</span>
                {dernier.repete && <span style={{ fontWeight: 700, color: skin.muted }}>{t("deja")}</span>}
              </span>
            </GCard>
          )}
        </div>

        {gagne && revelation && (
          <Revelation
            skin={skin}
            locale={locale}
            cible={essais[essais.length - 1]?.pays ?? ""}
            donnees={revelation}
            carteComplete={carteComplete}
            onCarteComplete={(ouvert) => {
              setCarteComplete(ouvert);
              if (ouvert) mesure("carte-complete", { essais: essais.length });
            }}
            onPartage={partage}
            onSource={() => mesure("source")}
            textes={{
              titre: t("victoire.titre"),
              essais: t("victoire.essais", { n: essais.length }),
              criteres: t("victoire.criteres"),
              voirCarte: t("victoire.voirCarte"),
              cacherCarte: t("victoire.cacherCarte"),
              legende: t("victoire.legende"),
              partager: t("victoire.partager"),
              copie: t("victoire.copie"),
              demain: t("victoire.demain"),
              source: t("victoire.source"),
            }}
          />
        )}

        {/* LE COMPTE — après la révélation, jamais avant (§16). */}
        {gagne && (
          <Compte skin={skin} jour={jour} serieLocale={serie} essaisDuJour={essais.length} />
        )}

        {/* L'HISTORIQUE — et le vrai retour du jeu.
            
            CINQ CASES PAR ESSAI, du critère le plus courant au plus rare. Le
            rang veut dire la même chose d'une ligne à l'autre : deux essais qui
            remplissent la même case partagent ce critère-là, et ça se voit sans
            un mot, sans repère à désigner et sans nombre à comparer. C'est ce
            qui remplace, en plus simple et en disant plus, l'affichage du
            recouvrement et celui de la rareté essayés avant.
            
            La dernière case est la plus rare de la journée : c'est la seule qui
            porte une couleur, parce que c'est la seule dont le remplissage
            change vraiment la donne. */}
        {essais.length > 0 && (
          <div>
            <GLabel skin={skin}>{t("historique", { n: essais.length })}</GLabel>
            {cases.length === essais.length && (
              <p style={{ margin: "5px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
                {t("casesAide")}
              </p>
            )}
            {pictos.some(Boolean) && (
              <>
                <p style={{ margin: "7px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
                  {t("pictosAide")}
                </p>
                <Legende pictos={pictos} mystere={t("catMystere")} />
              </>
            )}
            <ol style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 5 }}>
              {essais.map((e, i) => (
                <li
                  key={`${e.pays}-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 9,
                    rowGap: 7,
                    padding: "7px 10px",
                    borderRadius: 9,
                    background: skin.paper,
                    border: `2px solid ${skin.ink}18`,
                  }}
                >
                  <span style={{ width: 20, textAlign: "right", fontSize: 12, fontWeight: 700, color: skin.muted }}>
                    {i + 1}
                  </span>
                  <Pastille score={e.score} />
                  <span style={{ fontWeight: 700, flex: "1 1 auto", minWidth: 0 }}>{nomPays(e.pays, locale)}</span>
                  {cases[i] && <Cases remplies={cases[i]} etiquette={t("casesLues", { n: e.score })} />}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </GameShell>
  );
}

/**
 * LA LÉGENDE DES CASES — de quoi parle chaque critère, jamais lequel c'est.
 *
 * LE DÉFAUT QU'ELLE RÈGLE, rapporté par un joueur : « il m'a fallu 156
 * tentatives ; à partir de la 50e, mes conclusions n'ont pas évolué. » Les cases
 * disent quelles positions deux pays partagent, jamais de quoi elles parlent :
 * passé un moment, tout est allumé et plus rien ne se déduit. Le domaine rend la
 * recherche dirigeable — « il me manque quelque chose d'économique » est une
 * piste, « il me manque la case 4 » n'en est pas une.
 *
 * ⚠️ LA CINQUIÈME NE PARLE JAMAIS, et c'est le cœur du réglage : 28 % des pays à
 * 4/5 ne ratent qu'elle. Lui donner un domaine transformerait la fin de partie
 * en formulaire ; la taire garde la dernière marche à gravir. Elle porte donc un
 * libellé qui le DIT (« à toi de trouver ») plutôt qu'un blanc — un blanc se lit
 * comme une panne, pas comme une intention.
 *
 * La légende reprend la forme des cases plutôt qu'un numéro : c'est ce qui
 * permet de faire l'aller-retour avec les lignes en dessous sans compter.
 */
function Legende({ pictos, mystere }: { pictos: (Etiquette | null)[]; mystere: string }) {
  return (
    <ul
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        margin: "8px 0 0",
        padding: 0,
        listStyle: "none",
      }}
    >
      {pictos.map((etiq, k) => {
        const derniere = k === pictos.length - 1;
        const nom = etiq ? etiq.texte : derniere ? mystere : null;
        // Une case des quatre premières peut se taire aussi : le garde-fou du
        // serveur la fait taire quand son domaine ne laisserait qu'un critère
        // possible. Rien à montrer alors — mais on garde sa place dans la
        // rangée, sinon les positions ne correspondent plus aux lignes.
        return (
          <li
            key={k}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 8px 3px 6px",
              borderRadius: 999,
              background: skin.paper,
              border: `2px solid ${skin.ink}18`,
              fontSize: 11.5,
              fontWeight: 700,
              color: nom ? skin.ink : skin.muted,
            }}
          >
            {/* ⚠️ UN REPÈRE DE POSITION, PAS UNE CASE. La première version
                montrait une seule case vide devant chaque pastille : les quatre
                premières étaient alors strictement identiques, donc plus rien ne
                disait de QUELLE colonne parlait la pastille — et il suffisait
                que la rangée passe à la ligne pour que l'ordre ne suffise plus.
                Vu en jouant, pas en lisant le code. On montre donc les cinq
                positions avec la bonne noircie : la pastille se décrit
                elle-même, où qu'elle tombe. */}
            <span aria-hidden style={{ display: "inline-flex", gap: 2, flex: "none" }}>
              {pictos.map((_, j) => {
                const cinq = j === pictos.length - 1;
                return (
                  <span
                    key={j}
                    style={{
                      display: "block",
                      width: cinq ? 5 : 6,
                      height: cinq ? 5 : 6,
                      borderRadius: 1,
                      border: `1.5px solid ${j === k ? skin.ink : `${skin.ink}30`}`,
                      background: j === k ? (cinq ? skin.accent2 : skin.ink) : "transparent",
                      transform: cinq ? "rotate(45deg)" : undefined,
                    }}
                  />
                );
              })}
            </span>
            {etiq && <span aria-hidden>{etiq.picto}</span>}
            <span>{nom ?? "\u00B7"}</span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * LES CINQ CASES D'UN ESSAI — le retour d'information du jeu.
 *
 * Rang fixe, du critère le plus courant au plus rare. Deux essais qui
 * remplissent la même case partagent ce critère : c'est tout le mécanisme, et
 * il tient sans légende.
 *
 * ⚠️ LA FORME PORTE L'INFORMATION, PAS SEULEMENT LA COULEUR. Une case pleine est
 * un aplat cerné d'encre, une case vide est un contour sur fond de papier :
 * l'écart se voit en noir et blanc, comme le gradient 0→5 de la carte. La
 * dernière — la plus rare — est un losange doré : une forme ET une couleur de
 * plus, parce que c'est la case dont le remplissage vaut le plus cher.
 *
 * Le lecteur d'écran reçoit la phrase entière ; les cases lui sont cachées,
 * sinon il énoncerait cinq carrés.
 */
function Cases({ remplies, etiquette }: { remplies: number[]; etiquette: string }) {
  return (
    <span
      role="img"
      aria-label={etiquette}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, flex: "none", marginLeft: "auto" }}
    >
      {remplies.map((pleine, k) => {
        const derniere = k === remplies.length - 1;
        return (
          <span
            key={k}
            aria-hidden
            style={{
              display: "block",
              width: derniere ? 12 : 13,
              height: derniere ? 12 : 13,
              borderRadius: derniere ? 3 : 4,
              border: `2px solid ${pleine ? skin.ink : `${skin.ink}45`}`,
              background: pleine ? (derniere ? skin.accent2 : skin.ink) : "transparent",
              transform: derniere ? "rotate(45deg)" : undefined,
            }}
          />
        );
      })}
    </span>
  );
}

/** Le score, en toutes lettres : « 3/5 » se lit, une couleur seule ne se lit pas. */
function Pastille({ score }: { score: number }) {
  return (
    <span
      style={{
        flex: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 42,
        padding: "3px 8px",
        borderRadius: 999,
        border: `2px solid ${skin.ink}`,
        background: GRADIENT[score],
        color: ENCRE_SUR_GRADIENT[score],
        fontWeight: 800,
        fontSize: 13.5,
      }}
    >
      {score}/5
    </span>
  );
}
