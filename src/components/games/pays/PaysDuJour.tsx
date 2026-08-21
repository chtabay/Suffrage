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
import { ENCRE_SUR_GRADIENT, GRADIENT } from "@/lib/games/pays/palette";
import type { Essai, ReponseEssai, Revelation as DonneesRevelation } from "@/lib/games/pays/types";

/** Ce que le serveur renvoie pour une case qui parle : un emoji et un mot. */
type Etiquette = { picto: string; texte: string };
import { PAYS_SKIN as skin } from "@/lib/games/skin";
import GameShell from "@/components/games/GameShell";
import { GCard, GLabel } from "@/components/games/ui";
import Carte from "./Carte";
import Compte from "./Compte";
import { monRang } from "@/lib/db/pays";
import ComparaisonAmi from "@/components/games/ComparaisonAmi";
import { lienDefi, litDefi, type Defi } from "@/lib/games/comparaison";
import InstallJeu from "@/components/games/InstallJeu";
import Recherche from "./Recherche";
import Revelation from "./Revelation";
import AideModale from "./AideModale";

interface Sauvegarde {
  essais: Essai[];
  /** `cases[i]` : les cinq 0/1 de l'essai i, du critère le plus courant au plus rare. */
  cases?: number[][];
  /**
   * L'étiquette de chaque critère, une fois le seuil d'essais passé.
   *
   * ⚠️ GARDÉ AVEC LA PARTIE, alors qu'il se recalcule à chaque essai. Sans ça,
   * un rechargement après le 30e essai ferait DISPARAÎTRE la légende jusqu'au
   * coup suivant — un joueur qui vient de comprendre où chercher perdrait son
   * repère au pire moment, et croirait à un bug.
   */
  pictos?: (Etiquette | null)[];
  /**
   * LE PAYS OFFERT passé cinquante essais, et ses cinq cases.
   *
   * ⚠️ GARDÉ AVEC LA PARTIE, pour la même raison que `pictos` : il ne revient
   * du serveur qu'à l'essai suivant, et un rechargement le ferait DISPARAÎTRE
   * entre-temps — l'aide s'évaporerait sous les yeux de qui vient de la
   * recevoir.
   */
  coupDePouce?: CoupDePouce;
  /**
   * Les annonces déjà vues. ⚠️ SANS ÇA, LA MODALE REVIENT À CHAQUE ESSAI : les
   * pictos sont présents dans toutes les réponses passé le seuil, pas seulement
   * dans celle qui les débloque. Ce qui doit être mémorisé, c'est le PALIER
   * FRANCHI, pas la présence de l'aide.
   */
  vues?: { pictos?: boolean; pouce?: boolean };
  revelation?: DonneesRevelation;
  /** Horodatage de l'arrivée sur la carte : sert au délai avant premier essai. */
  debut?: number;
  partie?: string;
}

type CoupDePouce = { pays: string; nom: string; cases: number[] };

const cle = (jour: number) => `placet.pays.${jour}`;

/** La borne d'essais du jeu — la même que le `check` de `scrutin_game_pays_results`. */
const ESSAIS_MAX = 500;

/** Jeton anonyme d'une partie : de quoi recoudre les essais entre eux, rien de plus. */
const tirePartie = () => Math.random().toString(36).slice(2, 12);

export default function PaysDuJour({ jour }: { jour: number }) {
  const t = useTranslations("Pays");
  const locale = useLocale();

  const [essais, setEssais] = useState<Essai[]>([]);
  const [cases, setCases] = useState<number[][]>([]);
  const [pictos, setPictos] = useState<(Etiquette | null)[]>([]);
  const [pouce, setPouce] = useState<CoupDePouce | null>(null);
  // Les paliers déjà annoncés. ⚠️ EN `useRef`, pas en état : ils sont lus dans
  // le gestionnaire d'essai juste après l'avoir mis à jour, et un état de React
  // n'y serait pas encore à jour.
  const vues = useRef<{ pictos?: boolean; pouce?: boolean }>({});
  // ⚠️ UNE FILE, PAS UNE ANNONCE. Les deux paliers ne tombent jamais ensemble en
  // jeu normal (15 puis 50), mais ils tombent ensemble dès qu'un joueur reprend
  // une partie ou poste son historique d'un coup. La première version gardait
  // UNE annonce et marquait les deux comme vues : la seconde disparaissait en
  // silence. Vu au navigateur en semant une partie de 49 essais.
  const [annonces, setAnnonces] = useState<("pictos" | "pouce")[]>([]);
  const [revelation, setRevelation] = useState<DonneesRevelation | null>(null);
  const [carteComplete, setCarteComplete] = useState(false);
  const [surbrillance, setSurbrillance] = useState<string | null>(null);
  const [dernier, setDernier] = useState<{ pays: string; score: number; repete?: boolean } | null>(null);
  const [erreur, setErreur] = useState(false);
  const [pret, setPret] = useState(false);
  const [serie, setSerie] = useState(0);
  // ⚠️ LE RANG N'EXISTE QUE POUR UN COMPTE. `scrutin_game_pays_rank` lève
  // `forbidden` sans session, et `anon` n'a même pas le droit d'exécution : le
  // passe-plat rend alors `null`, et le partage se tait. On ne le cherche
  // qu'une fois la partie finie — avant, il n'y a rien à classer.
  const [rang, setRang] = useState<{ rang: number; joueurs: number } | null>(null);

  // Le défi d'un ami, lu après le montage (voir `NombreDuJour` pour pourquoi
  // pas `useSearchParams`).
  const [defi, setDefi] = useState<Defi | null>(null);
  useEffect(() => {
    setDefi(litDefi(window.location.search, ESSAIS_MAX));
  }, []);
  const partie = useRef<string>("");
  const debut = useRef<number>(0);

  // ⚠️ LE LOCALSTORAGE NE SE LIT QU'APRÈS LE MONTAGE. Le lire dans un
  // `useState(() => …)` fait diverger le rendu serveur (vide) du rendu client
  // (une partie en cours) : React ne rattrape pas les attributs, et l'écran
  // reste bloqué sur l'état du serveur. La leçon est déjà écrite dans
  // BanaloCreate ; elle vaut ici mot pour mot.
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
    setPouce(sauve?.coupDePouce ?? null);
    vues.current = sauve?.vues ?? {};
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
    (
      prochains: Essai[],
      reveal: DonneesRevelation | null,
      remplies: number[][],
      domaines: (Etiquette | null)[],
      offert: CoupDePouce | null,
    ) => {
      const corps: Sauvegarde = {
        essais: prochains,
        cases: remplies,
        pictos: domaines,
        coupDePouce: offert ?? undefined,
        vues: vues.current,
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
      const offert = rep.coupDePouce ?? pouce;
      if (offert) setPouce(offert);

      // LES DEUX PALIERS. ⚠️ ON ANNONCE LE FRANCHISSEMENT, PAS LA PRÉSENCE : les
      // pictos reviennent dans TOUTES les réponses passé le seuil, donc tester
      // leur présence rouvrirait la modale à chaque essai. Le drapeau `vues`
      // est ce qui distingue « ça vient d'arriver » de « c'est là depuis vingt
      // coups ».
      //
      // Le coup de pouce passe en second : quand un joueur poste tout son
      // historique d'un coup, les deux paliers tombent ensemble, et c'est la
      // légende qu'il faut lire d'abord — le pays offert ne se comprend qu'avec.
      const aAnnoncer: ("pictos" | "pouce")[] = [];
      if (domaines.some(Boolean) && !vues.current.pictos) {
        vues.current = { ...vues.current, pictos: true };
        aAnnoncer.push("pictos");
      }
      if (offert && !vues.current.pouce) {
        vues.current = { ...vues.current, pouce: true };
        aAnnoncer.push("pouce");
      }

      const reveal = rep.revelation ?? null;
      if (reveal) {
        const secondes = Math.round((Date.now() - debut.current) / 1000);
        setRevelation(reveal);
        setCarteComplete(false);
        mesure("fini", { essais: prochains.length, secondes });
        // Sans compte, l'appel est refusé et rend `null` : le partage n'aura
        // simplement pas de ligne de rang.
        void monRang(jour).then((r) => {
          if (r && r.rang !== null) setRang({ rang: r.rang, joueurs: r.joueurs });
        });
        // La série se met à jour AVANT que le bloc « compte » ne s'affiche : il
        // propose de garder un chiffre que le joueur doit déjà voir.
        setSerie(serieEnCours(jour, ajouteResultat({ jour, essais: prochains.length, secondes })));
      }
      // ⚠️ AUCUNE ANNONCE QUAND ON VIENT DE GAGNER. La révélation est l'écran
      // le plus attendu du jeu ; une modale « voici une aide » posée par-dessus
      // serait une insulte au joueur qui vient de trouver.
      if (aAnnoncer.length > 0 && !reveal) setAnnonces(aAnnoncer);
      enregistre(prochains, reveal, remplies, domaines, offert);
    } catch {
      setErreur(true);
    }
  };

  /**
   * Le partage ne dit ni le pays, ni les critères : seulement le CHIFFRE de la
   * partie, et le rang quand il existe.
   *
   * ⚠️ L'HISTORIQUE EST PARTI, EN DEUX TEMPS. La première version recopiait un
   * emoji par essai : 509 caractères pour une partie de 156 coups contre 54 pour
   * une de 5 — la taille du partage était celle de la partie, donc sans borne.
   * La deuxième la remplaçait par la « montée », cinq lignes fixes disant à quel
   * essai chaque marche tombait. Retour de terrain : ça n'aide pas non plus. Un
   * ami ne compare pas des trajectoires, il compare un score — et cinq lignes de
   * chiffres à déchiffrer coûtent plus qu'elles ne racontent.
   *
   * Reste ce qui se compare d'un coup d'œil : en combien d'essais, et où ça
   * situe dans la journée.
   */
  const partage = () => {
    const lignes = [t("partageTitre", { jeu: t("name"), n: jour, essais: essais.length })];
    if (rang) lignes.push(t("partageRang", { rang: rang.rang, joueurs: rang.joueurs }));
    const texte = lignes.join("\n");
    mesure("partage", { essais: essais.length });
    // ⚠️ PAS `location.href`, ET C'EST UNE CORRECTION. La page peut avoir été
    // ouverte depuis le lien d'un ami, qui porte SON résultat (`?j=&r=`) :
    // repartager `href` aurait renvoyé le score de l'ami sous notre nom, en
    // silence. On repart donc du chemin nu, et on y remet le NÔTRE.
    const nu =
      typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "";
    const url = lienDefi(nu, jour, essais.length, ESSAIS_MAX);
    // Une ligne vide avant le lien : collé à la dernière marche, il se lisait
    // comme une sixième ligne de l'escalier.
    const complet = `${texte}\n\n${url}`;
    if (navigator.share) {
      void navigator.share({ text: complet }).catch(() => {});
      return;
    }
    void navigator.clipboard?.writeText(complet).catch(() => {});
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
              qrAide: t("victoire.qrAide"),
              qrTitre: t("victoire.qrTitre"),
              qrFermer: t("victoire.qrFermer"),
            }}
          />
        )}

        {/* FACE À UN AMI — sans graphe, sans identité : le lien qu'il a partagé
            porte son nombre d'essais. Voir `lib/games/comparaison.ts`. */}
        {gagne && defi && (
          <ComparaisonAmi
            skin={skin}
            mien={t("historique", { n: essais.length })}
            sien={t("historique", { n: defi.resultat })}
            memeJournee={defi.jour === jour}
            textes={{
              titre: t("compareTitre"),
              moi: t("compareMoi"),
              ami: t("compareAmi"),
              passee: t("comparePassee"),
            }}
          />
        )}

        {/* LE COMPTE — après la révélation, jamais avant (§16). */}
        {gagne && (
          <Compte skin={skin} jour={jour} serieLocale={serie} essaisDuJour={essais.length} />
        )}

        {/* L'INSTALLATION — même règle que le compte : après la partie. Avant,
            elle demande un engagement à quelqu'un à qui le jeu n'a encore rien
            donné. Le FAB de Placet ne flotte plus ici : c'est le jeu qui
            invite, à ses couleurs et en vouvoyant comme le reste de l'écran. */}
        {gagne && <InstallJeu skin={skin} />}

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
            {/* LE PAYS OFFERT. Posé AU-DESSUS de l'historique et non dedans :
                l'historique dit « ce que vous avez essayé », et y glisser un
                pays qu'on n'a pas proposé fausserait la seule liste que le
                joueur relit. Mais il en garde la forme exacte — pastille, nom,
                cinq cases — pour que l'aller-retour se fasse à l'œil. */}
            {pouce && !gagne && (
              <PaysOffert
                offert={pouce}
                titre={t("pouceTitre")}
                aide={t("pouceAide")}
                lecture={t("casesLues", { n: pouce.cases.filter(Boolean).length })}
              />
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

      {/* LES DEUX ANNONCES. Une seule à la fois, et une seule fois par partie.
          Les clés sont écrites EN CLAIR, branche par branche : une clé choisie
          en variable échapperait au contrôle de parité i18n. */}
      {annonces[0] === "pictos" && (
        <AideModale
          skin={skin}
          titre={t("annoncePictosTitre")}
          texte={t("annoncePictosTexte")}
          fermerLabel={t("annonceFermer")}
          fermer={() => setAnnonces((a) => a.slice(1))}
        >
          <Legende pictos={pictos} mystere={t("catMystere")} />
        </AideModale>
      )}
      {annonces[0] === "pouce" && pouce && (
        <AideModale
          skin={skin}
          titre={t("annoncePouceTitre")}
          texte={t("annoncePouceTexte")}
          fermerLabel={t("annonceFermer")}
          fermer={() => setAnnonces((a) => a.slice(1))}
        >
          <PaysOffert
            offert={pouce}
            titre={t("pouceTitre")}
            aide={t("pouceAide")}
            lecture={t("casesLues", { n: pouce.cases.filter(Boolean).length })}
          />
        </AideModale>
      )}
    </GameShell>
  );
}

/**
 * LE PAYS OFFERT — la forme d'une ligne d'historique, le statut d'une aide.
 *
 * ⚠️ IL N'A PAS DE PASTILLE DE SCORE, alors que les lignes d'historique en ont
 * une. C'est délibéré : le score se LIT sur les cases (quatre pleines), et
 * l'afficher en chiffre ferait de ce pays un essai comme les autres — or il
 * n'en est pas un, il ne compte pas dans le total. La bordure d'accent et le
 * titre disent le reste.
 */
function PaysOffert({
  offert,
  titre,
  aide,
  lecture,
}: {
  offert: CoupDePouce;
  titre: string;
  aide: string;
  /** ⚠️ CE QUE LIT UN LECTEUR D'ÉCRAN SUR LES CASES : « 4 caractéristiques sur
   *  5 », pas la consigne. La première version passait la phrase d'aide en
   *  `aria-label` — le seul chiffre de la carte devenait alors inaudible, et
   *  la consigne était lue deux fois. */
  lecture: string;
}) {
  return (
    <div
      style={{
        margin: "10px 0 0",
        padding: "10px 12px",
        borderRadius: 11,
        background: skin.paper,
        border: `2.5px dashed ${skin.accent}`,
      }}
    >
      <p
        style={{
          fontFamily: skin.fontDisplay,
          fontWeight: 800,
          fontSize: 11.5,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: skin.accent,
          margin: 0,
        }}
      >
        {titre}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 6, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 700, flex: "1 1 auto", minWidth: 0 }}>{offert.nom}</span>
        <Cases remplies={offert.cases} etiquette={lecture} />
      </div>
      <p style={{ margin: "7px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>{aide}</p>
    </div>
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
