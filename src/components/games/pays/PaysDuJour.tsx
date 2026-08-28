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
import { ajouteResultat, rappelleLaMethode, serieEnCours } from "@/lib/games/pays/local";
import { ENCRE_SUR_GRADIENT, GRADIENT } from "@/lib/games/pays/palette";
import type { Essai, ReponseEssai, Revelation as DonneesRevelation } from "@/lib/games/pays/types";

/** Ce que le serveur renvoie pour une case qui parle : un emoji et un mot. */
type Etiquette = { picto: string; texte: string };
import { PAYS_SKIN as skin } from "@/lib/games/skin";
import GameShell from "@/components/games/GameShell";
import { GCard, GLabel } from "@/components/games/ui";
import Carte from "./Carte";
import Compte from "./Compte";
import { deposePartie, deposerNomPays, litTableauPays, maPosition } from "@/lib/db/pays";
import { monJetonPays } from "@/lib/games/pays/jeton";
import JourneePrecedente from "./JourneePrecedente";
import type { ChoixDeNom, DepotNom } from "@/lib/db/banalo";
import TableauDuJour from "@/components/games/TableauDuJour";
import ComparaisonAmi from "@/components/games/ComparaisonAmi";
import { lienDefi, litDefi, type Defi } from "@/lib/games/comparaison";
import InstallJeu from "@/components/games/InstallJeu";
import Recherche from "./Recherche";
import Revelation from "./Revelation";
import AideModale from "@/components/games/Modale";

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
  /** Les étiquettes du coup précédent : ce qui a changé depuis se met en lumière. */
  pictosAvant?: (Etiquette | null)[];
  /** Le sujet annoncé au cinquième coup, en clé. */
  sujetDuJour?: string;
  /**
   * Les annonces déjà vues. ⚠️ SANS ÇA, LA MODALE REVIENT À CHAQUE ESSAI : les
   * pictos sont présents dans toutes les réponses passé le seuil, pas seulement
   * dans celle qui les débloque. Ce qui doit être mémorisé, c'est le PALIER
   * FRANCHI, pas la présence de l'aide.
   */
  vues?: { intro?: boolean; jour?: boolean; pictos?: boolean; pouce?: boolean };
  revelation?: DonneesRevelation;
  /** Horodatage de l'arrivée sur la carte : sert au délai avant premier essai. */
  debut?: number;
  partie?: string;
}

type CoupDePouce = { pays: string; nom: string; cases: number[] };

const cle = (jour: number) => `placet.pays.${jour}`;

/**
 * Combien d'essais l'exemple d'enquête accompagne. Assez pour être vu deux ou
 * trois fois, trop peu pour devenir du mobilier.
 */
const ESSAIS_AVEC_EXEMPLE = 6;

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
  // Les étiquettes telles qu'elles étaient AU COUP PRÉCÉDENT. La différence
  // avec les actuelles donne ce qui vient d'arriver — et c'est ça qu'on met en
  // lumière dans la rangée. Gardé avec la partie : sinon un rechargement
  // éteindrait la nouveauté avant que le joueur ne l'ait vue.
  const [pictosAvant, setPictosAvant] = useState<(Etiquette | null)[]>([]);
  // Les paliers déjà annoncés. ⚠️ EN `useRef`, pas en état : ils sont lus dans
  // le gestionnaire d'essai juste après l'avoir mis à jour, et un état de React
  // n'y serait pas encore à jour.
  const vues = useRef<{ intro?: boolean; jour?: boolean; pictos?: boolean; pouce?: boolean }>({});
  // ⚠️ UNE FILE, PAS UNE ANNONCE. Les deux paliers ne tombent jamais ensemble en
  // jeu normal (15 puis 50), mais ils tombent ensemble dès qu'un joueur reprend
  // une partie ou poste son historique d'un coup. La première version gardait
  // UNE annonce et marquait les deux comme vues : la seconde disparaissait en
  // silence. Vu au navigateur en semant une partie de 49 essais.
  const [annonces, setAnnonces] = useState<("intro" | "jour" | "pictos" | "pouce")[]>([]);
  // Le sujet de la journée, rendu par le serveur au cinquième coup. Gardé avec
  // la partie : sinon un rechargement effacerait l'intro avant qu'on la lise.
  const [sujet, setSujet] = useState<string | null>(null);
  // ⚠️ CALCULÉ UNE FOIS, APRÈS LE MONTAGE. `lisResultats` touche le
  // `localStorage` : l'appeler au rendu ferait diverger serveur et client.
  const [debutant, setDebutant] = useState(false);
  const [revelation, setRevelation] = useState<DonneesRevelation | null>(null);
  const [carteComplete, setCarteComplete] = useState(false);
  const [surbrillance, setSurbrillance] = useState<string | null>(null);
  // La case éclairée depuis la légende. ⚠️ PAS DANS LA SAUVEGARDE : c'est un
  // geste de lecture, pas un état de partie — le retrouver au rechargement
  // ferait revenir un historique à moitié éteint sans que rien ne l'explique.
  const [colonne, setColonne] = useState<number | null>(null);
  const [dernier, setDernier] = useState<{ pays: string; score: number; repete?: boolean } | null>(null);
  const [erreur, setErreur] = useState(false);
  const [pret, setPret] = useState(false);
  const [serie, setSerie] = useState(0);
  // ⚠️ LE RANG EXISTE MAINTENANT SANS COMPTE, et c'est le sens du dépôt du
  // 27 août : chaque partie part en base à la fin, sous un jeton anonyme si
  // besoin, donc « votre rang » se calcule enfin sur TOUTE la foule et plus sur
  // les deux ou trois comptes qui s'étaient inscrits. On ne le cherche qu'une
  // fois la partie finie — avant, il n'y a rien à classer.
  const [rang, setRang] = useState<{ rang: number; joueurs: number } | null>(null);

  /**
   * Ce que le COMPTE sait de cette journée, quand ce navigateur n'en sait rien.
   *
   * ⚠️ LA PARTIE VIT DANS `localStorage`, DONC ELLE NE SUIT PAS LE COMPTE.
   * Signalé par un joueur connecté sur un second appareil : le jeu lui offrait
   * une grille vierge pour une journée qu'il avait déjà gagnée. Contrairement à
   * Banalo, ce n'est PAS un problème de données — `scrutin_game_pays_jouer`
   * garde `least(r.essais, p_essais)`, donc rejouer ne peut rien abîmer — mais
   * c'est un mensonge d'écran, et le joueur refait une énigme pour rien.
   *
   * ⚠️ ON NE RESTITUE PAS LA PARTIE, ON LA DIT. La révélation (les cinq critères,
   * la carte complète) n'est pas stockée : la rendre demanderait de la garder en
   * base pour chaque joueur et chaque journée. Le dire coûte une phrase et
   * suffit à ne plus tromper.
   */
  const [ailleurs, setAilleurs] = useState<number | null>(null);

  // ⚠️ ON NE DEMANDE RIEN SI LE JOUEUR A COMMENCÉ ICI. Interrompre quelqu'un qui
  // est en train de chercher pour lui dire qu'il a déjà trouvé ailleurs serait
  // la pire des annonces — et `maPosition` rend le résultat du COMPTE, donc
  // elle répondrait « oui » à qui vient de gagner sur cet écran-ci.
  const demandeAilleurs = useRef(false);
  useEffect(() => {
    if (demandeAilleurs.current || essais.length > 0 || gagne) return;
    demandeAilleurs.current = true;
    let vivant = true;
    void maPosition(jour).then((r) => {
      if (vivant && r && typeof r.essais === "number") setAilleurs(r.essais);
    });
    return () => {
      vivant = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jour]);

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
    setPictosAvant(sauve?.pictosAvant ?? []);
    setSujet(sauve?.sujetDuJour ?? null);
    setDebutant(rappelleLaMethode(jour));
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
      avant: (Etiquette | null)[],
      sujetJour: string | null,
    ) => {
      const corps: Sauvegarde = {
        essais: prochains,
        cases: remplies,
        pictos: domaines,
        coupDePouce: offert ?? undefined,
        pictosAvant: avant,
      sujetDuJour: sujetJour ?? undefined,
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

  // Une seule case parle : on est entre le premier coup et le seuil des trois
  // autres. C'est la fenêtre où la légende est une récompense.
  const premierSeul = pictos.filter(Boolean).length === 1;

  // Ce qui vient d'apparaître dans la rangée, depuis le coup précédent.
  const nouveaux = pictos.map((e, k) => e !== null && !pictosAvant[k]);

  // ⚠️ UN `switch` DE CLÉS LITTÉRALES, PAS `t(`sujetJour.${cle}`)`. Le contrôle
  // de parité ne voit que les clés écrites EN CLAIR : une clé construite lui
  // échapperait, et l'écran afficherait « Pays.sujetJour.mers » en toutes
  // lettres le jour où une langue l'oublierait. Les dix sujets sont donc écrits
  // un par un — c'est verbeux, et c'est ce qui les rend vérifiables.
  const phraseDuJour = (cle: string) => {
    switch (cle) {
      case "position":
        return t("sujetJour.position");
      case "mers":
        return t("sujetJour.mers");
      case "taille":
        return t("sujetJour.taille");
      case "voisinage":
        return t("sujetJour.voisinage");
      case "culture":
        return t("sujetJour.culture");
      case "etat":
        return t("sujetJour.etat");
      case "alliances":
        return t("sujetJour.alliances");
      case "richesse":
        return t("sujetJour.richesse");
      case "ressources":
        return t("sujetJour.ressources");
      case "usages":
        return t("sujetJour.usages");
      default:
        return t("sujetJour.autre");
    }
  };

  const bascule = (k: number) => setColonne((c) => (c === k ? null : k));
  // Les pays de MES essais qui remplissent la case éclairée. Le filtre ne
  // regarde que ce que le joueur a déjà joué : il ne révèle rien de neuf, il
  // rend visible ce qu'il a sous les yeux depuis le début.
  const eclaires =
    colonne === null ? [] : essais.filter((_, i) => cases[i]?.[colonne] === 1).map((e) => e.pays);

  // L'EXEMPLE D'ENQUÊTE — deux de MES pays qui remplissent la même case.
  //
  // ⚠️ LE MÉCANISME NE SE DEVINE PAS TOUT SEUL, signalé sur de vrais joueurs :
  // « ils ont du mal à voir qu'il y a une enquête à faire entre les indices
  // communs entre pays ». La règle est pourtant écrite au-dessus de la liste —
  // mais une phrase générale se saute, alors qu'une phrase qui nomme LEURS deux
  // pays se lit. On la construit donc sur leurs données, au moment précis où la
  // déduction devient possible : au deuxième essai, pas avant.
  //
  // ⚠️ ON PRÉFÈRE LA CASE LA PLUS RARE partagée — c'est celle qui vaut le plus
  // cher, et l'exemple doit désigner le geste utile, pas le premier venu.
  const enquete = useMemo(() => {
    if (essais.length < 2 || cases.length !== essais.length) return null;
    const dernier = cases[cases.length - 1];
    for (let i = cases.length - 2; i >= 0; i--) {
      for (let k = dernier.length - 1; k >= 0; k--) {
        if (dernier[k] === 1 && cases[i][k] === 1) {
          return { a: essais[essais.length - 1].pays, b: essais[i].pays, case: k, n: dernier.length };
        }
      }
    }
    return null;
  }, [cases, essais]);

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
      // ⚠️ ON CAPTURE L'ÉTAT D'AVANT AVANT DE L'ÉCRASER. C'est la seule chose
      // qui permette de dire « ces deux-là viennent d'arriver » plutôt que
      // « voici cinq pastilles ».
      const avant = pictos;
      setPictosAvant(avant);
      // ⚠️ LE FILTRE TOMBE À CHAQUE COUP. Sans ça, le pays qu'on vient de jouer
      // peut arriver ÉTEINT dans une liste à moitié grisée : le joueur voit son
      // propre essai s'effacer et croit à une panne.
      setColonne(null);
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
      const duJour = rep.sujetDuJour ?? sujet;
      if (duJour) setSujet(duJour);

      const aAnnoncer: ("intro" | "jour" | "pictos" | "pouce")[] = [];
      // ⚠️ L'INTRO PASSE EN PREMIER, ET ELLE NE COÛTE AUCUN ALLER-RETOUR. Elle
      // ne dit rien que l'écran n'ait déjà : la catégorie de la case 1 arrive
      // avec la réponse du premier essai. Rien de neuf ne descend du serveur,
      // donc rien de neuf ne peut fuiter.
      // ⚠️ LA MÉTHODE N'EST RAPPELÉE QU'À QUI EN A BESOIN. Elle dit toujours la
      // même chose — c'est son objet — donc servie tous les jours à un habitué,
      // elle devient une boîte qu'on ferme sans lire, et c'est la seule forme
      // d'annonce dont le jeu dispose qu'on userait ainsi.
      if (prochains.length === 1 && debutant && !vues.current.intro) {
        vues.current = { ...vues.current, intro: true };
        aAnnoncer.push("intro");
      }
      // L'INTRO DU JOUR, elle, est pour tout le monde : c'est la seule annonce
      // dont le contenu CHANGE d'une journée à l'autre.
      if (duJour && !vues.current.jour) {
        vues.current = { ...vues.current, jour: true };
        aAnnoncer.push("jour");
      }
      // ⚠️ `> 1`, PAS `some`. Depuis que la première case parle dès le premier
      // coup, un `some` ferait surgir la modale sur la première proposition de
      // CHAQUE partie — une interruption quotidienne, exactement ce que la
      // rareté de cette modale est censée éviter. Ce qu'on annonce, c'est
      // l'arrivée des TROIS AUTRES ; la première a son propre cadre, en ligne.
      if (domaines.filter(Boolean).length > 1 && !vues.current.pictos) {
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
        // ⚠️ LE DÉPÔT ET LA LECTURE SONT LE MÊME APPEL. La base range la partie
        // et rend la position dans la foulée : c'est exactement l'instant où le
        // joueur la regarde, et le faire en deux allers-retours l'afficherait
        // une seconde trop tard. Hors ligne, l'appel rend `null` et le partage
        // n'a simplement pas de ligne de rang — la partie, elle, reste dans le
        // navigateur et repartira à la prochaine occasion.
        void deposePartie(jour, prochains.length, secondes).then((r) => {
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
      enregistre(prochains, reveal, remplies, domaines, offert, avant, duJour);
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

  /**
   * Ce que le tableau du jour partagé ne peut pas savoir tout seul.
   *
   * ⚠️ IL EST PARTAGÉ AVEC BANALO, donc il ignore l'unité du chiffre. Ici c'est
   * un NOMBRE D'ESSAIS et le meilleur est le plus PETIT — chez Banalo c'est une
   * somme de voix et le meilleur est le plus grand. Le composant se contente
   * d'afficher ce qu'on lui rend ; c'est la base qui trie, dans le bon sens.
   */
  const lisLeTableau = useCallback(async () => {
    const jeton = monJetonPays();
    return jeton ? litTableauPays(jeton, jour) : null;
  }, [jour]);
  const deposeLeNom = useCallback(
    async (choix: ChoixDeNom) => {
      const jeton = monJetonPays();
      return jeton ? deposerNomPays(jeton, jour, choix) : ("panne" as DepotNom);
    },
    [jour],
  );
  const essaisEnMots = useCallback((n: number) => t("tableau.essais", { n }), [t]);

  return (
    <GameShell
      skin={skin}
      title={t("name")}
      emoji="🌍"
      backLabel={t("back")}
      poweredBy={t("poweredBy")}
      maxWidth={860}
      // ⚠️ L'EN-TÊTE RESTE (décision n°3 de `GameShell`) : l'après-partie de ce
      // jeu dépasse deux mille pixels, et sans ça le retour vers /games ET le
      // choix de la langue disparaissent au premier défilement.
      collant
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

      {/* ⚠️ LA VEILLE EST ICI, SOUS LE TITRE, ET PAS EN BAS DE PAGE. Demandé :
          « l'information de la journée précédente devrait être proche du titre,
          très simple ». Mesurée à son ancienne place, elle était 1 507 px plus
          bas — quatre écrans. Elle ne demande rien et ne divulgue rien du jour,
          donc elle ne consomme aucune place de l'échelle du §0 : même
          raisonnement que `SerieDuJour`. */}
      <JourneePrecedente jour={jour} />

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {/* ⚠️ ELLE NE DIT RIEN DU PAYS. `games/pays/page.tsx` interdit toute
            métadonnée dérivée du puzzle ; un nombre d'essais n'en est pas une —
            il ne réduit aucune recherche. */}
        {!gagne && ailleurs !== null && essais.length === 0 && (
          <div
            style={{
              padding: "11px 13px",
              borderRadius: 12,
              border: `2px solid ${skin.ink}33`,
              fontSize: 13.5,
              lineHeight: 1.5,
              color: skin.muted,
            }}
          >
            {t("dejaAilleurs", { n: ailleurs })}
          </div>
        )}
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
          enLumiere={eclaires}
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

        {/* LE TABLEAU DU JOUR — le même composant que Banalo, la même mécanique
            de nom. Il passe AVANT l'offre de compte pour la raison déjà mesurée
            chez Banalo : ce qui CHANGE tous les jours monte, l'annonce qui se
            répète descend. Et il ne sort qu'une fois la partie gagnée — avant,
            il n'y a rien à classer, et §16 interdit de toute façon la moindre
            distraction pendant la manche.

            ⚠️ SON CHIFFRE EST UN NOMBRE D'ESSAIS, DONC LE PLUS PETIT GAGNE —
            l'inverse de Banalo. C'est la base qui trie ; l'écran ne fait que
            mettre le nombre en mots. */}
        {gagne && (
          <div style={{ marginTop: 14 }}>
            <TableauDuJour
              skin={skin}
              jeton={monJetonPays()}
              lis={lisLeTableau}
              depose={deposeLeNom}
              score={essaisEnMots}
              memoire={`placet.pays.nom.${jour}`}
              explication={t("tableau.pourquoi")}
              duree={t("tableau.duree")}
            />
          </div>
        )}

        {/* LE COMPTE — après la révélation, jamais avant (§16). */}
        {gagne && (
          <Compte skin={skin} jour={jour} serieLocale={serie} essaisDuJour={essais.length} />
        )}

        {/* CE QUI REVIENT DEMAIN — la plus petite raison de revenir, et la
            seule que ce jeu n'avait pas. Banalo la dit depuis toujours
            (« nouveau thème à 09 h 30 ») ; Cinq sur cinq ne disait rien du
            lendemain, alors que c'est exactement le moment où le joueur décide
            s'il reviendra.

            ⚠️ SANS HEURE, CONTRAIREMENT À BANALO. Sa charnière est minuit, ce
            que personne n'a besoin qu'on lui explique ; celle de Banalo est
            11 h 30, et c'est ÇA qui demandait un chiffre.

            ⚠️ ET SEULEMENT UNE FOIS LA PARTIE GAGNÉE : annoncer le pays de
            demain à quelqu'un qui cherche encore celui d'aujourd'hui lui dirait
            de laisser tomber. */}
        {gagne && (
          <p style={{ marginTop: 18, fontSize: 13, color: skin.muted, textAlign: "center" }}>
            {t("demainPays")}
          </p>
        )}

        {/* L'INSTALLATION — même règle que le compte : après la partie. Avant,
            elle demande un engagement à quelqu'un à qui le jeu n'a encore rien
            donné. Le FAB de Placet ne flotte plus ici : c'est le jeu qui
            invite, à ses couleurs et en vouvoyant comme le reste de l'écran. */}
        {gagne && <InstallJeu skin={skin} quand={t("prevenuQuand")} fermerLabel={t("derniereFermer")} />}

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
            {/* ⚠️ UNE FENÊTRE D'APPRENTISSAGE, PAS UN MEUBLE. L'exemple ne sert
                qu'à faire comprendre le geste ; passé quelques coups, il
                répéterait à un joueur qui a compris une évidence bruyante, à
                l'endroit exact où il vient lire ses essais. */}
            {enquete && !gagne && essais.length <= ESSAIS_AVEC_EXEMPLE && (
              <p
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 7,
                  margin: "8px 0 0",
                  padding: "8px 11px",
                  borderRadius: 10,
                  // ⚠️ PLUS DISCRET QUE LA RÉCOMPENSE, ET C'EST VOULU. Les deux
                  // blocs cohabitent pendant les premiers coups ; deux cadres à
                  // l'accent empilés font un mur, et c'est l'INDICE qu'il faut
                  // voir en premier — la règle du jeu peut se contenter d'un
                  // filet. La première version leur donnait la même bordure.
                  background: `${skin.accent}0F`,
                  borderLeft: `3px solid ${skin.accent}`,
                  fontSize: 12.5,
                  lineHeight: 1.45,
                }}
              >
                <span style={{ flex: "none", transform: "translateY(1px)" }}>
                  <Reperes k={enquete.case} n={enquete.n} />
                </span>
                <span>
                  {t("enqueteExemple", { a: nomPays(enquete.a, locale), b: nomPays(enquete.b, locale) })}
                </span>
              </p>
            )}
            {/* LA LÉGENDE, EN DEUX TEMPS.
                
                ⚠️ AU PREMIER COUP, ELLE EST UNE RÉCOMPENSE, PAS UNE NOTE DE BAS
                DE PAGE. Vu sur de vrais nouveaux joueurs : après leur première
                proposition, sans repère, ils cliquent partout sur la carte. À ce
                moment-là l'écran est presque vide et la légende tombe juste sous
                le résultat — mais en gris 12,5 px elle se lisait comme une
                mention légale. Tant qu'une seule case parle, elle prend donc un
                cadre à l'accent et sa phrase à elle. Passé le seuil, les quatre
                étiquettes sont devenues du mobilier utile : la mise en avant
                retombe, et c'est la modale qui annonce le changement. */}
            {pictos.some(Boolean) &&
              (premierSeul && !gagne ? (
                <div
                  style={{
                    margin: "8px 0 0",
                    padding: "10px 12px",
                    borderRadius: 11,
                    background: skin.paper,
                    border: `2.5px solid ${skin.accent}`,
                  }}
                >
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45 }}>{t("pictosAidePremier")}</p>
                  <Legende
                    pictos={pictos}
                    mystere={t("catMystere")}
                    aVenir={t("catAVenir")}
                    nouveaux={nouveaux}
                    choisie={colonne}
                    onChoix={bascule}
                    position={(k) => t("catPosition", { n: k + 1 })}
                  />
                </div>
              ) : (
                <>
                  <p style={{ margin: "7px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
                    {t("pictosAide")}
                  </p>
                  <Legende
                    pictos={pictos}
                    mystere={t("catMystere")}
                    nouveaux={nouveaux}
                    choisie={colonne}
                    onChoix={bascule}
                    position={(k) => t("catPosition", { n: k + 1 })}
                  />
                </>
              ))}
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
            <p style={{ margin: "8px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
              {/* ⚠️ LES TROIS CLÉS SONT ÉCRITES EN CLAIR, branche par branche.
                  Le cas « zéro » a la sienne : le pluriel ICU du français range
                  0 avec 1, donc « 0 de vos 6 essais remplit cette case » —
                  correct pour la machine, bancal pour un lecteur. Et une clé
                  choisie en variable échapperait au contrôle de parité. */}
              {colonne === null
                ? t("filtreInvite")
                : eclaires.length === 0
                  ? t("filtreVide")
                  : t("filtreActif", { n: eclaires.length, total: essais.length })}
            </p>
            <ol style={{ margin: "6px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 5 }}>
              {essais.map((e, i) => {
                // ⚠️ ON ÉTEINT, ON NE MASQUE PAS. Retirer les lignes qui ne
                // remplissent pas la case ferait sauter les numéros d'essai et
                // détruirait la chronologie — or c'est elle qui raconte la
                // partie. Éteintes, elles restent lisibles et le motif de la
                // colonne saute aux yeux.
                const eteint = colonne !== null && cases[i]?.[colonne] !== 1;
                return (
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
                    border: `2px solid ${colonne !== null && !eteint ? skin.accent : `${skin.ink}18`}`,
                    opacity: eteint ? 0.32 : 1,
                  }}
                >
                  <span style={{ width: 20, textAlign: "right", fontSize: 12, fontWeight: 700, color: skin.muted }}>
                    {i + 1}
                  </span>
                  <Pastille score={e.score} />
                  <span style={{ fontWeight: 700, flex: "1 1 auto", minWidth: 0 }}>{nomPays(e.pays, locale)}</span>
                  {cases[i] && <Cases remplies={cases[i]} etiquette={t("casesLues", { n: e.score })} />}
                </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>

      {/* LES DEUX ANNONCES. Une seule à la fois, et une seule fois par partie.
          Les clés sont écrites EN CLAIR, branche par branche : une clé choisie
          en variable échapperait au contrôle de parité i18n. */}
      {annonces[0] === "intro" && (
        <AideModale
          skin={skin}
          titre={t("introTitre")}
          // ⚠️ DEUX TEXTES, ÉCRITS EN CLAIR. Sur 3 journées des 51, la case 1
          // se tait (son garde-fou passe avant) : l'intro doit alors se
          // contenter de la méthode, sans nommer une catégorie qui n'existe
          // pas. Une clé choisie en variable échapperait au contrôle de parité.
          texte={pictos[0] ? t("introTexte", { cat: pictos[0].texte }) : t("introTexteMuet")}
          fermerLabel={t("annonceFermer")}
          fermer={() => setAnnonces((a) => a.slice(1))}
        />
      )}
      {annonces[0] === "jour" && sujet && (
        <AideModale
          skin={skin}
          titre={t("sujetJour.titre")}
          texte={phraseDuJour(sujet)}
          fermerLabel={t("annonceFermer")}
          fermer={() => setAnnonces((a) => a.slice(1))}
        />
      )}
      {annonces[0] === "pictos" && (
        <AideModale
          skin={skin}
          titre={t("annoncePictosTitre")}
          texte={t("annoncePictosTexte")}
          fermerLabel={t("annonceFermer")}
          fermer={() => setAnnonces((a) => a.slice(1))}
        >
          {/* Dans la modale, on met en lumière ce qui vient d'arriver : la
              première case, elle, est là depuis le premier coup. */}
          <Legende
            pictos={pictos}
            mystere={t("catMystere")}
            nouveaux={nouveaux}
            choisie={null}
            onChoix={() => {}}
            position={(k) => t("catPosition", { n: k + 1 })}
          />
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
 * LES CINQ POSITIONS, AVEC UNE DÉSIGNÉE — le « de quelle colonne je parle » du jeu.
 *
 * ⚠️ UN REPÈRE DE POSITION, PAS UNE CASE. La première version montrait une seule
 * case vide devant chaque pastille : les quatre premières étaient alors
 * strictement identiques, donc plus rien ne disait de QUELLE colonne parlait la
 * pastille — et il suffisait que la rangée passe à la ligne pour que l'ordre ne
 * suffise plus. Vu en jouant, pas en lisant le code. On montre donc les cinq
 * positions avec la bonne noircie : le repère se décrit lui-même, où qu'il
 * tombe. Extrait de `Legende` le jour où l'exemple d'enquête a eu besoin du
 * même geste — deux copies auraient divergé.
 */
function Reperes({ k, n, clair }: { k: number; n: number; clair?: boolean }) {
  // ⚠️ SUR UNE PASTILLE ACTIVE, LE FOND EST L'ACCENT : des repères à l'encre y
  // disparaîtraient au moment exact où on les regarde. Ils passent en clair.
  const trait = clair ? "#fff" : skin.ink;
  const eteint = clair ? "#ffffff55" : `${skin.ink}30`;
  return (
    <span aria-hidden style={{ display: "inline-flex", gap: 2, flex: "none" }}>
      {Array.from({ length: n }, (_, j) => {
        const cinq = j === n - 1;
        return (
          <span
            key={j}
            style={{
              display: "block",
              width: cinq ? 5 : 6,
              height: cinq ? 5 : 6,
              borderRadius: 1,
              border: `1.5px solid ${j === k ? trait : eteint}`,
              background: j === k ? (cinq && !clair ? skin.accent2 : trait) : "transparent",
              transform: cinq ? "rotate(45deg)" : undefined,
            }}
          />
        );
      })}
    </span>
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
function Legende({
  pictos,
  mystere,
  aVenir,
  nouveaux,
  choisie,
  onChoix,
  position,
}: {
  pictos: (Etiquette | null)[];
  mystere: string;
  /**
   * Les cases dont l'étiquette VIENT D'ARRIVER, au dernier coup.
   *
   * ⚠️ SANS ÇA, L'AJOUT PASSE INAPERÇU — signalé sur de vrais joueurs. La rangée
   * montre cinq pastilles ; quand trois se remplissent d'un coup au seuil, rien
   * ne dit lesquelles sont neuves, et la ligne entière se lit comme du décor
   * qui était déjà là. La nouveauté doit se voir DANS la rangée, pas seulement
   * dans une modale qu'on ferme.
   */
  nouveaux?: boolean[];
  /**
   * ⚠️ CE QU'AFFICHE UNE CASE ENCORE VERROUILLÉE — et c'est un mot différent de
   * celui d'une case muette. Le « · » veut dire « celle-là ne parlera jamais »
   * (garde-fou du serveur) ; au premier coup, les trois du milieu ne sont pas
   * muettes, elles sont À VENIR. Le même glyphe pour les deux se lisait comme
   * une panne — vu à l'écran, sur la capture du premier essai.
   */
  aVenir?: string;
  /** La case actuellement éclairée, ou `null`. */
  choisie: number | null;
  /**
   * Bascule l'éclairage d'une case.
   *
   * ⚠️ C'EST CE QUI FAIT DE LA LÉGENDE UNE BARRE DE FILTRE, et pas seulement un
   * décodeur. Signalé sur de vrais joueurs : « ils ont du mal à voir qu'il y a
   * une enquête à faire entre les indices communs ». Toucher une case allume les
   * pays qui la remplissent, dans l'historique ET sur la carte — le recoupement
   * cesse d'être une chose à imaginer, il devient un geste.
   */
  onChoix: (k: number) => void;
  /** Ce que lit un lecteur d'écran sur une pastille sans étiquette. */
  position: (k: number) => string;
}) {
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
        const nom = etiq ? etiq.texte : derniere ? mystere : (aVenir ?? null);
        // Une case des quatre premières peut se taire aussi : le garde-fou du
        // serveur la fait taire quand son domaine ne laisserait qu'un critère
        // possible. Rien à montrer alors — mais on garde sa place dans la
        // rangée, sinon les positions ne correspondent plus aux lignes.
        // ⚠️ TROIS ÉTATS, PAS DEUX. Une pastille qui PARLE est l'information ;
        // une pastille EN ATTENTE ou MUETTE n'est qu'un repère de colonne. La
        // première version les habillait pareil : cinq pastilles identiques
        // dont une seule portait quelque chose, et l'œil ne trouvait pas
        // laquelle. Celle qui parle est donc pleine, les autres s'effacent.
        const parle = etiq !== null;
        const neuve = parle && nouveaux?.[k] === true;
        // ⚠️ TOUTES LES PASTILLES SONT CLIQUABLES, MÊME CELLES QUI SE TAISENT.
        // Ce qui filtre, c'est la POSITION, pas l'étiquette : « quels de mes
        // essais remplissent la cinquième case ? » est la question la plus utile
        // du jeu, et c'est justement celle qui n'a pas de nom. Ça donne du même
        // coup un rôle aux pastilles « à venir », qui n'étaient jusque-là que de
        // l'échafaudage.
        const active = choisie === k;
        return (
          <li key={k}>
            <button
              type="button"
              onClick={() => onChoix(k)}
              aria-pressed={active}
              aria-label={etiq ? undefined : position(k)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: parle ? "4px 10px 4px 7px" : "3px 8px 3px 6px",
                borderRadius: 999,
                background: active ? skin.accent : neuve ? skin.accent2 : parle ? skin.paper : "transparent",
                border: `2px solid ${active ? skin.accent : parle ? skin.ink : `${skin.ink}18`}`,
                fontSize: parle ? 12.5 : 11,
                fontFamily: "inherit",
                fontWeight: parle ? 800 : 600,
                color: active ? "#fff" : parle ? skin.ink : skin.muted,
                opacity: parle || active ? 1 : 0.75,
                cursor: "pointer",
              }}
            >
              <Reperes k={k} n={pictos.length} clair={active} />
              {etiq && <span aria-hidden>{etiq.picto}</span>}
              <span>{nom ?? "\u00B7"}</span>
            </button>
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
