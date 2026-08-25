"use client";

// Régie Placet : accès admin de plateforme (allowlist scrutin_admins).
// Tout passe par des RPC SECURITY DEFINER gardées par auth.uid() — le client
// ne reçoit que des AGRÉGATS : jamais un bulletin, jamais un votant.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AccessMode, PollStatus, PollVisibility } from "@/lib/db/polls";

export type ModerationStatus = "pending" | "approved" | "flagged" | "hidden";
export type AdminAction = "approve" | "hide" | "close";

export interface AdminReport {
  reason: string;
  detail: string | null;
  at: string;
}

export interface AdminPollRow {
  token: string;
  question: string;
  status: PollStatus;
  access: AccessMode;
  visibility: PollVisibility;
  moderation: ModerationStatus;
  reports: number;
  created_at: string;
  closed_at: string | null;
  method: string | null;
  options: number;
  ballots: number;
  shares: number;
  /** Roster (mode invitation) ; 0 en accès ouvert (count() ne renvoie jamais null). */
  voters: number;
  voted: number;
  reportDetails: AdminReport[];
}

export interface AdminDay {
  d: string;
  ballots: number;
  shares: number;
  polls: number;
}

export interface AdminOverview {
  totals: {
    polls: number;
    polls7d: number;
    open: number;
    proposals: number;
    closed: number;
    public: number;
    organizers: number;
  };
  ballots: { total: number; last7: number };
  shares: { total: number; last7: number };
  channels: Partial<Record<"copy" | "whatsapp" | "native" | "qr", number>>;
  reportsPending: number;
  days: AdminDay[];
  polls: AdminPollRow[];
}

/** Le compte connecté est-il admin de plateforme ? (false si déconnecté) */
export async function adminCheck(): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_admin_check");
  if (error) return false;
  return data === true;
}

/**
 * Vue d'ensemble complète ; null si l'appelant n'est pas admin.
 * Lève sur erreur réseau/RPC — un échec transitoire n'est PAS un refus d'accès.
 */
export async function adminOverview(): Promise<AdminOverview | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_admin_overview");
  if (error) throw error;
  return (data as AdminOverview | null) ?? null;
}

/** Action de modération. Renvoie 'ok' | 'forbidden' | 'not_found' | 'invalid'. */
export async function adminModerate(token: string, action: AdminAction): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_admin_moderate", {
    p_token: token,
    p_action: action,
  });
  if (error) throw error;
  return data as string;
}

/** Compte connu de Placet (métadonnée lang ou données scrutin_). */
export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  provider: string;
  polls: number;
  spaces: number;
  isAdmin: boolean;
}

/** Comptes connus de Placet ; null si l'appelant n'est pas admin. Lève sur erreur réseau. */
export async function adminListUsers(): Promise<AdminUser[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_admin_list_users");
  if (error) throw error;
  return (data as AdminUser[] | null) ?? null;
}

/** Promotion/rétrogradation admin. 'ok' | 'forbidden' | 'self' | 'not_found'. */
export async function adminSetRole(userId: string, admin: boolean): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_admin_set_role", {
    p_user_id: userId,
    p_admin: admin,
  });
  if (error) throw error;
  return data as string;
}

/**
 * Suppression d'un compte (cascades Placet ; scrutins détachés, pas supprimés).
 * 'ok' | 'forbidden' | 'self' | 'is_admin' | 'not_found' | 'linked_elsewhere'
 * — ce dernier quand le compte a des données dans l'autre app de la base partagée.
 */
export async function adminDeleteUser(userId: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_admin_delete_user", {
    p_user_id: userId,
  });
  if (error) throw error;
  return data as string;
}

// Cache de session : un seul appel RPC par compte connecté, partagé entre les
// montages (la nav re-monte à chaque navigation).
let adminCache: { userId: string; isAdmin: boolean } | null = null;

/** Le compte connecté est-il admin de plateforme ? (pour l'affichage du lien Régie) */
export function useIsAdmin(userId: string | null | undefined): boolean {
  const [isAdmin, setIsAdmin] = useState(
    () => Boolean(userId && adminCache !== null && adminCache.userId === userId && adminCache.isAdmin),
  );
  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    if (adminCache?.userId === userId) {
      setIsAdmin(adminCache.isAdmin);
      return;
    }
    let alive = true;
    adminCheck().then((v) => {
      adminCache = { userId, isAdmin: v };
      if (alive) setIsAdmin(v);
    });
    return () => {
      alive = false;
    };
  }, [userId]);
  return isAdmin;
}

// ───────────────────────────────────── les pseudos des jeux quotidiens

/**
 * ⚠️ LA LISTE DES PSEUDOS N'A PLUS DE PASSE-PLAT, ET C'EST VOULU.
 * `adminPseudos()` servait une carte à elle, sous celle des comptes qui jouent
 * — laquelle nomme déjà le pseudo à côté de l'adresse. Deux listes de comptes
 * l'une sous l'autre : signalé comme un doublon, et c'en était un. Le bouton de
 * blocage a rejoint la première ; le passe-plat est parti avec la seconde,
 * parce qu'une fonction qui reste est l'invitation à recopier l'écran qu'elle
 * servait.
 *
 * La FONCTION `scrutin_admin_pseudos` reste en base : les migrations appliquées
 * ne se réécrivent pas, et plus rien ne l'appelle. Ce qui la remplace est
 * `scrutin_admin_notifs`, qui retient un compte dès qu'il porte un pseudo —
 * donc aucune prise perdue.
 *
 * ⚠️ CETTE PRISE EST LA CONTREPARTIE D'UNE DÉCISION, pas un outil de confort.
 * Le pseudo des classements sur la durée est le SEUL nom de ce produit qui
 * survit à une journée : partout ailleurs (tableau du jour, groupe d'amis) le
 * nom vit dans son contexte et meurt avec lui. Un nom persistant, lisible par
 * tous les joueurs, n'est tenable que s'il existe quelqu'un pour agir.
 */

/**
 * Retire un pseudo des classements, ou l'y remet.
 *
 * ⚠️ ON BLOQUE UN NOM, PAS UN JOUEUR. Le compte continue de jouer, de garder ses
 * résultats et de voir sa propre progression ; il disparaît des classements
 * jusqu'à ce qu'il en pose un autre — et en poser un autre lève le blocage.
 */
export async function adminBloquerPseudo(userId: string, bloque: boolean): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_admin_pseudo_bloquer", {
    p_user: userId,
    p_bloque: bloque,
  });
  if (error) return false;
  return (data as Record<string, unknown> | null)?.status === "ok";
}

/**
 * LES COMPTES QUI JOUENT, ET L'ÉTAT DE LEURS NOTIFICATIONS.
 *
 * ⚠️ CE N'EST PAS `adminListUsers`, ET C'EST UN CONSTAT. Celle-là filtre sur un
 * scrutin, un espace, un événement, un rôle d'admin ou une méta `lang` : un
 * compte créé DEPUIS UN JEU n'a rien de tout ça, donc l'onglet « Personnes » ne
 * montrait pas les joueurs. Ici on liste par l'USAGE DES JEUX — un abonnement,
 * un pseudo, une journée jouée.
 */
export interface AdminNotif {
  id: string;
  email: string;
  creeLe: string;
  pseudo: string | null;
  bloque: boolean;
  /** Combien d'appareils de ce compte sont abonnés. Zéro : jamais accordé, ou retiré. */
  appareils: number;
  journee: boolean;
  hebdo: boolean;
  saison: boolean;
  /**
   * La dernière notification RÉELLEMENT envoyée.
   *
   * ⚠️ `null` SUR UN COMPTE ABONNÉ EST LE SIGNAL QUI MANQUAIT. C'est ce qu'on
   * n'avait aucun moyen de voir quand la tournée sortait en silence sur un
   * numéro de journée `NaN` : trois appareils abonnés, quatorze journées jouées,
   * et pas un envoi.
   */
  derniereNotif: string | null;
  /** Journées jouées, les deux jeux réunis. */
  journees: number;
}

export async function adminNotifs(): Promise<AdminNotif[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_admin_notifs");
  if (error) return null;
  const d = data as Record<string, unknown> | null;
  if (!d || d.status !== "ok" || !Array.isArray(d.comptes)) return null;
  return (d.comptes as Record<string, unknown>[])
    .map((c) =>
      typeof c.id === "string"
        ? {
            id: c.id,
            email: typeof c.email === "string" ? c.email : "",
            creeLe: typeof c.creeLe === "string" ? c.creeLe : "",
            pseudo: typeof c.pseudo === "string" ? c.pseudo : null,
            bloque: c.bloque === true,
            appareils: typeof c.appareils === "number" ? c.appareils : 0,
            // ⚠️ VRAIS PAR DÉFAUT : s'abonner EST le consentement, et un compte
            // sans ligne de réglages reçoit tout. Lire l'absence comme « éteint »
            // ferait croire à un refus qui n'a pas eu lieu.
            journee: c.journee !== false,
            hebdo: c.hebdo !== false,
            saison: c.saison !== false,
            derniereNotif: typeof c.derniereNotif === "string" ? c.derniereNotif : null,
            journees: typeof c.journees === "number" ? c.journees : 0,
          }
        : null,
    )
    .filter((c): c is AdminNotif => c !== null);
}
