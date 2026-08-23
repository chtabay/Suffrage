// LES JEUX QUOTIDIENS, VUS DEPUIS UNE SEULE PAGE.
//
// ⚠️ CE FICHIER NE CONNAÎT AUCUN JEU EN PARTICULIER, et c'est son intérêt. Il
// rend une JOURNÉE JOUÉE — un numéro, un centile — sous la même forme quel que
// soit le jeu, parce que c'est la seule chose qui se compare entre eux.
//
// ⚠️ ET LE CENTILE EST CETTE SEULE CHOSE. Un nombre d'essais (Cinq sur cinq) et
// une somme de voix (Banalo, format « mots ») ne s'additionnent pas ; le sur-100
// de Banalo ne veut même pas dire la même chose d'un thème à l'autre — son
// maximum ATTEIGNABLE vaut 67,8 sur un thème serré et 13,7 sur un thème ouvert.
// « X % ont fait mieux » veut dire la même chose partout, tous les jours.
//
// ⚠️ IL EST NULLABLE, TOUJOURS. Une journée jouée seul n'a pas de position, et
// `0` voudrait dire « premier » — le repli le plus flatteur possible sur une
// donnée absente.
import { createClient } from "@/lib/supabase/client";

/** Une journée jouée, dans l'unité commune aux jeux. */
export interface JourneeCommune {
  jour: number;
  /** Le pourcentage de joueurs qui ont fait mieux. Plus c'est bas, mieux c'est. */
  mieux: number | null;
  /** Le chiffre PROPRE au jeu — des essais, des voix — pour l'afficher tel quel. */
  brut: number | null;
}

function litJournees(brut: unknown, cleBrut: string): JourneeCommune[] | null {
  const d = brut as Record<string, unknown> | null;
  if (!d || d.status !== "ok" || !Array.isArray(d.journees)) return null;
  return (d.journees as Record<string, unknown>[])
    .map((j) => {
      const jour = typeof j.jour === "number" ? j.jour : null;
      if (jour === null) return null;
      const v = j[cleBrut];
      return {
        jour,
        mieux: typeof j.mieux === "number" ? j.mieux : null,
        brut: typeof v === "number" ? v : null,
      } satisfies JourneeCommune;
    })
    .filter((j): j is JourneeCommune => j !== null);
}

/**
 * Mes journées de Cinq sur cinq.
 *
 * ⚠️ SON CENTILE EST CALCULÉ À LA LECTURE, il n'est pas stocké : le jeu ne garde
 * que le nombre d'essais. Voir `20260825-jeux-historique-pays.sql`.
 */
export async function mesJourneesPays(): Promise<JourneeCommune[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_game_pays_historique");
  if (error) return null;
  return litJournees(data, "essais");
}

/** Mes journées de Banalo du jour. Son centile, lui, est rangé en base. */
export async function mesJourneesBanalo(): Promise<JourneeCommune[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_banalo_historique");
  if (error) return null;
  return litJournees(data, "points");
}

// ──────────────────────────────────────────── le pseudo, et le classement sur la durée

/**
 * MON PSEUDO DE COMPTE.
 *
 * ⚠️ C'EST LE SEUL NOM DU PRODUIT QUI SURVIT À UNE JOURNÉE, et c'est la
 * contrepartie du classement sur la durée : sans nom qui persiste, il n'y a rien
 * à cumuler. Partout ailleurs — tableau du jour, groupe d'amis — le nom vit dans
 * son contexte et meurt avec lui. Voir `20260825-jeux-pseudo-et-cumul.sql`.
 */
export interface MonPseudo {
  pseudo: string | null;
  /** Un modérateur l'a retiré : le joueur doit en poser un autre. */
  bloque: boolean;
}

export async function monPseudo(): Promise<MonPseudo | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_jeux_pseudo_moi");
  if (error) return null;
  const d = data as Record<string, unknown> | null;
  if (!d) return null;
  return { pseudo: typeof d.pseudo === "string" ? d.pseudo : null, bloque: d.bloque === true };
}

export type DepotPseudo = "ok" | "pris" | "court" | "long" | "refus" | "panne";

export async function poserPseudo(pseudo: string): Promise<DepotPseudo> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_jeux_pseudo_poser", { p_pseudo: pseudo });
  // ⚠️ UNE PANNE N'EST PAS UN REFUS : rien n'est parti, et le dire autrement
  // ferait croire au joueur que son nom a été jugé.
  if (error) return "panne";
  const s = (data as Record<string, unknown> | null)?.status;
  return s === "ok" || s === "pris" || s === "court" || s === "long" ? s : "refus";
}

export type RetraitPseudo = "ok" | "aucun" | "compte" | "panne";

/**
 * RETIRER SON PSEUDO — la sortie, symétrique du dépôt.
 *
 * ⚠️ ELLE N'EXISTAIT PAS : `pseudo_poser` refuse moins de deux caractères, donc
 * on ne pouvait pas l'effacer, et seule la Régie savait le retirer. C'était la
 * contrepartie manquante du seul nom du produit qui survit à une journée.
 *
 * ⚠️ CE N'EST PAS UNE SUPPRESSION DE COMPTE : les résultats, la série et
 * l'historique restent. Ce qui part est le NOM PUBLIC — classement de saison,
 * palmarès, tableaux du jour. La base emporte les lignes de tableau avec le
 * pseudo, sans quoi la résolution retomberait sur un ancien texte libre.
 */
export async function retirerPseudo(): Promise<RetraitPseudo> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_jeux_pseudo_retirer");
  if (error) return "panne";
  const s = (data as Record<string, unknown> | null)?.status;
  return s === "ok" || s === "aucun" || s === "compte" ? s : "panne";
}

/** Une ligne du classement sur la durée. Un pseudo, une moyenne, un effectif. */
export interface LigneCumul {
  place: number;
  pseudo: string;
  /** Le centile moyen sur la fenêtre. Plus c'est bas, mieux c'est. */
  moyenne: number;
  journees: number;
  moi: boolean;
}

export interface Cumul {
  joueurs: number;
  lignes: LigneCumul[];
  /** Ma ligne, même hors de la tête de liste. `null` si je ne suis pas classé. */
  moi: Omit<LigneCumul, "moi"> | null;
  /** Ma place il y a une semaine, pour dire la progression. `null` si je n'étais pas classé. */
  avant: number | null;
  /** Le nombre de journées qu'il faut avoir jouées pour être classé. Vaut 1. */
  minimum: number;
  /**
   * ⚠️ LE SEUL PLANCHER QUI RESTE PORTE SUR LES JOUEURS, PAS SUR LES JOURNÉES.
   * Un classement d'UNE ligne est le « 1er sur 1 » que ce produit refuse partout
   * (`VOTANTS_MIN` 2, `INSCRITS_MIN` 2, `COURBE_MIN` 50) : une ligne unique avec
   * son propre score ne se lit pas comme un classement mais comme un tableau
   * cassé. Sous ce seuil, `lignes` et `moi` tombent ENSEMBLE.
   */
  minimumClasses: number;
  /**
   * ⚠️ MES JOURNÉES CLASSABLES, SANS LE PLANCHER — et c'est ce qui manquait.
   * Un vrai joueur a posé son pseudo sur son iPhone, validé, et lu « Personne
   * n'est encore classé : il faut avoir joué au moins 5 journées ». Vrai, mais
   * la phrase parle de TOUT LE MONDE quand la question porte sur LUI : sans un
   * chiffre à lui, il ne peut pas distinguer « ça n'a pas marché » de « il me
   * manque une journée », et il conclut à la panne.
   */
  mesJournees: number;
}

/** Les trois portées du classement sur la durée. */
export type PorteeCumul = "banalo" | "pays" | "tout";

function litLigne(brut: unknown): LigneCumul | null {
  const l = brut as Record<string, unknown> | null;
  if (!l) return null;
  const place = typeof l.place === "number" ? l.place : null;
  const pseudo = typeof l.pseudo === "string" && l.pseudo.trim().length > 0 ? l.pseudo : null;
  const moyenne = typeof l.moyenne === "number" ? l.moyenne : Number(l.moyenne);
  if (place === null || pseudo === null || !Number.isFinite(moyenne)) return null;
  return {
    place,
    pseudo,
    moyenne,
    journees: typeof l.journees === "number" ? l.journees : 0,
    moi: l.moi === true,
  };
}

/**
 * Le classement sur la durée — trente journées glissantes.
 *
 * ⚠️ LES DEUX NUMÉROS DE JOURNÉE VIENNENT D'ICI, un par jeu : les deux
 * calendriers n'ont ni la même origine ni la même charnière (11 h 30 pour
 * Banalo, minuit pour Cinq sur cinq), et la base ne connaît ni fuseau ni
 * charnière. C'est la même règle que partout dans ces jeux.
 *
 * ⚠️ ET IL SE LIT SANS COMPTE. Il faut un compte pour Y FIGURER, pas pour le
 * regarder : un classement qu'on ne peut pas voir avant de s'inscrire ne donne
 * aucune raison de s'inscrire.
 */
export async function cumul(
  jourBanalo: number,
  jourPays: number,
  portee: PorteeCumul,
): Promise<Cumul | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_jeux_cumul", {
    p_jour_banalo: jourBanalo,
    p_jour_pays: jourPays,
    p_jeu: portee,
  });
  if (error) return null;
  const d = data as Record<string, unknown> | null;
  if (!d || d.status !== "ok") return null;
  const brutes = Array.isArray(d.lignes) ? d.lignes : [];
  const moi = litLigne(d.moi);
  return {
    joueurs: typeof d.joueurs === "number" ? d.joueurs : 0,
    lignes: brutes.map(litLigne).filter((l): l is LigneCumul => l !== null),
    moi: moi ? { place: moi.place, pseudo: moi.pseudo, moyenne: moi.moyenne, journees: moi.journees } : null,
    // ⚠️ PAS DE REPLI SUR ZÉRO. « place 0 la semaine dernière » n'existe pas, et
    // afficher une progression inventée est pire que n'en afficher aucune.
    avant: typeof d.avant === "number" ? d.avant : null,
    minimum: typeof d.minimum === "number" ? d.minimum : 1,
    minimumClasses: typeof d.minimumClasses === "number" ? d.minimumClasses : 2,
    mesJournees: typeof d.mesJournees === "number" ? d.mesJournees : 0,
  };
}

// ───────────────────────────────────── la saison, et les trophées qu'elle laisse

/** Une ligne du classement de la saison. */
export interface LigneSaison {
  place: number;
  pseudo: string;
  /**
   * ⚠️ AVEC UNE DÉCIMALE, et ce n'est pas de la coquetterie. Les ex aequo se
   * partagent les places qu'ils occupent — trois joueurs en tête touchent chacun
   * (25+18+15)/3 — donc les points ne sont pas entiers. C'est exactement le rôle
   * que la décimale joue déjà dans le score de Banalo du jour : « la base est de
   * la présentation, la décimale porte la résolution ».
   */
  points: number;
  journees: number;
  /** Les journées finies à la première place. Sert de départage, comme en F1. */
  gagnees: number;
  moi: boolean;
}

/** Une langue où Banalo a été joué cette saison, avec son volume. */
export interface LangueJouee {
  code: string;
  journees: number;
}

export interface Saison {
  /** Le mois, en `AAAA-MM`. C'est une clé, jamais un libellé : l'écran le traduit. */
  saison: string;
  /**
   * ⚠️ LA LANGUE DU CLASSEMENT — Banalo seulement, `null` ailleurs. La foule de
   * Banalo est PAR LANGUE (`scrutin_banalo_etat` classe parmi ceux qui ont
   * répondu dans la même), donc un classement qui les mélange compare des gens
   * qui n'ont jamais joué les uns contre les autres : mesuré sur la journée 1,
   * 7 votants en français contre 1 en pidgin.
   */
  langue: string | null;
  /** Les langues disponibles cette saison, la plus fréquentée d'abord. */
  langues: LangueJouee[];
  courante: boolean;
  joueurs: number;
  minimumClasses: number;
  /**
   * ⚠️ COMBIEN DE MÉDAILLES SERAIENT DÉCERNÉES AUJOURD'HUI, pas un seuil. Un
   * plancher fixe de cinq classés a été posé puis retiré : il rendait la
   * récompense inatteignable (3 comptes existaient) sans rien acheter, puisque
   * la règle « toujours une médaille de moins qu'il n'y a de classés » donne
   * exactement le même résultat dès cinq et un résultat MEILLEUR en dessous.
   */
  medailles: number;
  lignes: LigneSaison[];
  moi: Omit<LigneSaison, "moi"> | null;
  /** Mes points, MÊME sous le plancher — un classement vide doit répondre « et moi ? ». */
  mesPoints: number;
  mesJournees: number;
}

function litLigneSaison(brut: unknown): LigneSaison | null {
  const l = brut as Record<string, unknown> | null;
  if (!l) return null;
  const place = typeof l.place === "number" ? l.place : null;
  const pseudo = typeof l.pseudo === "string" && l.pseudo.trim().length > 0 ? l.pseudo : null;
  const points = typeof l.points === "number" ? l.points : Number(l.points);
  if (place === null || pseudo === null || !Number.isFinite(points)) return null;
  return {
    place,
    pseudo,
    points,
    journees: typeof l.journees === "number" ? l.journees : 0,
    gagnees: typeof l.gagnees === "number" ? l.gagnees : 0,
    moi: l.moi === true,
  };
}

function nombre(v: unknown, defaut: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : defaut;
}

/**
 * Le classement de la saison. `saison` nulle = celle en cours.
 *
 * ⚠️ IL SE LIT SANS COMPTE, comme le cumul : il en faut un pour y FIGURER, pas
 * pour le regarder — un classement qu'on ne peut pas voir avant de s'inscrire ne
 * donne aucune raison de s'inscrire.
 */
export async function saison(
  portee: PorteeCumul,
  langue?: string | null,
  mois?: string,
): Promise<Saison | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_jeux_saison", {
    p_jeu: portee,
    p_saison: mois ?? null,
    p_langue: langue ?? null,
  });
  if (error) return null;
  const d = data as Record<string, unknown> | null;
  if (!d || d.status !== "ok" || typeof d.saison !== "string") return null;
  const brutes = Array.isArray(d.lignes) ? d.lignes : [];
  const moi = litLigneSaison(d.moi);
  const langues = Array.isArray(d.langues) ? (d.langues as Record<string, unknown>[]) : [];
  return {
    saison: d.saison,
    langue: typeof d.langue === "string" ? d.langue : null,
    langues: langues
      .map((l): LangueJouee | null =>
        typeof l.code === "string" ? { code: l.code, journees: nombre(l.journees, 0) } : null,
      )
      .filter((l): l is LangueJouee => l !== null),
    courante: d.courante === true,
    joueurs: nombre(d.joueurs, 0),
    minimumClasses: nombre(d.minimumClasses, 2),
    medailles: nombre(d.medailles, 0),
    lignes: brutes.map(litLigneSaison).filter((l): l is LigneSaison => l !== null),
    moi: moi ? { place: moi.place, pseudo: moi.pseudo, points: moi.points, journees: moi.journees, gagnees: moi.gagnees } : null,
    mesPoints: nombre(d.mesPoints, 0),
    mesJournees: nombre(d.mesJournees, 0),
  };
}

/** Une marche du podium d'une saison close. */
export interface Medaille {
  place: number;
  pseudo: string;
  points: number;
  journees: number;
  moi: boolean;
}

export interface TropheeJeu {
  jeu: PorteeCumul;
  /** La langue de ce classement — Banalo seulement, `null` pour `tout` et `pays`. */
  langue: string | null;
  /** L'effectif de la saison, figé avec elle : « 3ᵉ sur 4 » ≠ « 3ᵉ sur 400 ». */
  joueurs: number;
  /**
   * Combien cette saison-là a décerné — coupé à SON propre effectif, pas à un
   * seuil global : une saison à deux classés garde une seule médaille pour
   * toujours, même si le jeu compte trois mille joueurs l'année suivante.
   */
  medailles: number;
  /** Vide quand la saison n'a décerné à personne (un seul classé : tautologie). */
  podium: Medaille[];
  /** Ma ligne de cette saison, même hors du podium. */
  moi: { place: number; points: number; journees: number } | null;
}

export interface SaisonClose {
  saison: string;
  jeux: TropheeJeu[];
}

export interface Trophees {
  saisons: SaisonClose[];
}

/**
 * LA SALLE DES TROPHÉES — les saisons closes, la plus récente d'abord.
 *
 * ⚠️ ELLE SE LIT SANS COMPTE. C'est en voyant qu'il y a du monde derrière qu'on
 * a envie d'y entrer ; une salle fermée à qui n'a pas de compte n'en donne
 * aucune raison.
 */
export async function trophees(saisons = 6): Promise<Trophees | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_jeux_trophees", { p_saisons: saisons });
  if (error) return null;
  const d = data as Record<string, unknown> | null;
  if (!d || d.status !== "ok" || !Array.isArray(d.saisons)) return null;
  const saisonsLues = (d.saisons as Record<string, unknown>[])
    .map((s): SaisonClose | null => {
      if (typeof s.saison !== "string" || !Array.isArray(s.jeux)) return null;
      const jeux = (s.jeux as Record<string, unknown>[])
        .map((g): TropheeJeu | null => {
          if (g.jeu !== "banalo" && g.jeu !== "pays" && g.jeu !== "tout") return null;
          const podiumBrut = Array.isArray(g.podium) ? (g.podium as Record<string, unknown>[]) : [];
          const m = g.moi as Record<string, unknown> | null;
          return {
            jeu: g.jeu,
            langue: typeof g.langue === "string" ? g.langue : null,
            joueurs: nombre(g.joueurs, 0),
            medailles: nombre(g.medailles, 0),
            podium: podiumBrut
              .map((p): Medaille | null =>
                typeof p.pseudo === "string" && typeof p.place === "number"
                  ? {
                      place: p.place,
                      pseudo: p.pseudo,
                      points: nombre(p.points, 0),
                      journees: nombre(p.journees, 0),
                      moi: p.moi === true,
                    }
                  : null,
              )
              .filter((p): p is Medaille => p !== null),
            moi:
              m && typeof m.place === "number"
                ? { place: m.place, points: nombre(m.points, 0), journees: nombre(m.journees, 0) }
                : null,
          };
        })
        .filter((g): g is TropheeJeu => g !== null);
      return { saison: s.saison, jeux };
    })
    .filter((s): s is SaisonClose => s !== null);
  return { saisons: saisonsLues };
}

// ═══════════════════════════════════════ les réglages de notification
//
// ⚠️ ILS SONT PAR COMPTE, PAS PAR APPAREIL, et c'est délibéré : un joueur qui
// coupe le récapitulatif hebdomadaire le coupe partout. Un réglage par appareil
// obligerait à le refaire sur chaque téléphone, et le premier oubli produirait
// exactement la notification qu'on vient de refuser.

/** Ce que le compte a choisi de recevoir, et sur combien d'appareils. */
export interface ReglagesNotifs {
  journee: boolean;
  hebdo: boolean;
  saison: boolean;
  /**
   * Combien d'appareils de ce compte sont abonnés.
   *
   * ⚠️ ZÉRO NE VEUT PAS DIRE « TOUT EST COUPÉ », il veut dire « la permission
   * n'a jamais été accordée ». Les trois interrupteurs sont alors sans effet, et
   * l'écran doit proposer de s'abonner plutôt que de faire mine de régler
   * quelque chose.
   */
  appareils: number;
}

export type GenreNotif = "journee" | "hebdo" | "saison";

/**
 * ⚠️ REND `null` SUR UN REFUS, ET IL NE FAUT PAS LE REPLIER SUR DES DÉFAUTS. La
 * fonction exige `auth.uid()` ; rendre « les trois activés, zéro appareil » à un
 * appel non authentifié afficherait à un visiteur trois interrupteurs qui ne
 * commandent rien.
 */
export async function reglagesNotifs(): Promise<ReglagesNotifs | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_jeux_notifs_reglages_lire");
  if (error) return null;
  const d = data as Record<string, unknown> | null;
  if (!d || d.status !== "ok") return null;
  return {
    journee: d.journee !== false,
    hebdo: d.hebdo !== false,
    saison: d.saison !== false,
    appareils: nombre(d.appareils, 0),
  };
}

/** Écrit un réglage et rend l'état complet qui en résulte — jamais un booléen. */
export async function reglerNotif(genre: GenreNotif, actif: boolean): Promise<ReglagesNotifs | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_jeux_notifs_regler", {
    p_genre: genre,
    p_actif: actif,
  });
  if (error) return null;
  const d = data as Record<string, unknown> | null;
  if (!d || d.status !== "ok") return null;
  return {
    journee: d.journee !== false,
    hebdo: d.hebdo !== false,
    saison: d.saison !== false,
    appareils: nombre(d.appareils, 0),
  };
}

// ═══════════════════════════════ la place du joueur, vue depuis la porte
//
// ⚠️ UN SEUL APPEL POUR LES DEUX JEUX, et c'est le sujet. La porte `/games` ne
// faisait AUCUN aller-retour ; lui en faire faire deux au chargement la
// ralentirait à l'endroit où l'on veut justement entrer vite.
//
// ⚠️ ET ÇA MARCHE SANS COMPTE. C'est la moitié qui compte : un habitué sans
// compte est exactement celui à qui la porte n'avait rien à dire, et « 12e sur
// 83 aujourd'hui » est un chiffre à lui, vrai, qui change tous les jours. Le
// classement de SAISON, lui, exige un compte et un pseudo — il reste dans la
// barre de Placet (`RangJeux`).

/** La place d'un joueur dans la journée en cours d'un jeu. */
export interface PlaceDuJour {
  joue: boolean;
  rang: number | null;
  sur: number | null;
}

export interface PorteDesJeux {
  banalo: PlaceDuJour;
  pays: PlaceDuJour;
}

const PAS_JOUE: PlaceDuJour = { joue: false, rang: null, sur: null };

function litPlace(v: unknown): PlaceDuJour {
  const d = v as Record<string, unknown> | null;
  if (!d || d.joue !== true) return PAS_JOUE;
  // ⚠️ UN RANG SANS SON EFFECTIF NE S'AFFICHE PAS. « 3e » ne veut pas dire la
  // même chose sur six joueurs et sur trois mille, et c'est la règle déjà écrite
  // pour le tableau du jour comme pour le classement de saison.
  if (typeof d.rang !== "number" || typeof d.sur !== "number") return PAS_JOUE;
  return { joue: true, rang: d.rang, sur: d.sur };
}

/**
 * ⚠️ UNE LECTURE PAR SESSION, comme `RangJeux` et `useIsAdmin` : un cache de
 * module. La porte se traverse plusieurs fois par visite — on y revient entre
 * deux jeux — et recalculer deux classements à chaque passage coûterait sans
 * rien apprendre de neuf.
 */
let cachePorte: { cle: string; valeur: PorteDesJeux } | null = null;

export async function placeDuJour(args: {
  jetonBanalo: string | null;
  jourBanalo: number;
  langue: string;
  theme: string | null;
  jetonPays: string | null;
  jourPays: number;
}): Promise<PorteDesJeux | null> {
  const cle = [args.jetonBanalo, args.jourBanalo, args.langue, args.theme, args.jetonPays, args.jourPays].join("|");
  if (cachePorte?.cle === cle) return cachePorte.valeur;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_jeux_porte", {
    p_jeton_banalo: args.jetonBanalo,
    p_jour_banalo: args.jourBanalo,
    p_langue: args.langue,
    p_theme: args.theme,
    p_jeton_pays: args.jetonPays,
    p_jour_pays: args.jourPays,
  });
  if (error) return null;
  const d = data as Record<string, unknown> | null;
  if (!d || d.status !== "ok") return null;
  const valeur = { banalo: litPlace(d.banalo), pays: litPlace(d.pays) };
  cachePorte = { cle, valeur };
  return valeur;
}
