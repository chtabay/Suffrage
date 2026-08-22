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

export interface Saison {
  /** Le mois, en `AAAA-MM`. C'est une clé, jamais un libellé : l'écran le traduit. */
  saison: string;
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
export async function saison(portee: PorteeCumul, mois?: string): Promise<Saison | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_jeux_saison", {
    p_jeu: portee,
    p_saison: mois ?? null,
  });
  if (error) return null;
  const d = data as Record<string, unknown> | null;
  if (!d || d.status !== "ok" || typeof d.saison !== "string") return null;
  const brutes = Array.isArray(d.lignes) ? d.lignes : [];
  const moi = litLigneSaison(d.moi);
  return {
    saison: d.saison,
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
