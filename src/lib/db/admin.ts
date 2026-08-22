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
 * UN PSEUDO DE JEU, VU DE LA RÉGIE.
 *
 * ⚠️ C'EST LA CONTREPARTIE D'UNE DÉCISION, pas un outil de confort. Le pseudo
 * des classements sur la durée est le SEUL nom de ce produit qui survit à une
 * journée : partout ailleurs (tableau du jour, groupe d'amis) le nom vit dans
 * son contexte et meurt avec lui. Un nom persistant, lisible par tous les
 * joueurs, n'est tenable que s'il existe quelqu'un pour agir — et c'est ici.
 */
export interface AdminPseudo {
  userId: string;
  pseudo: string;
  creeLe: string;
  bloque: boolean;
}

export async function adminPseudos(): Promise<AdminPseudo[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("scrutin_admin_pseudos");
  if (error) return null;
  const d = data as Record<string, unknown> | null;
  if (!d || d.status !== "ok" || !Array.isArray(d.pseudos)) return null;
  return (d.pseudos as Record<string, unknown>[])
    .map((p) =>
      typeof p.userId === "string" && typeof p.pseudo === "string"
        ? {
            userId: p.userId,
            pseudo: p.pseudo,
            creeLe: typeof p.creeLe === "string" ? p.creeLe : "",
            bloque: p.bloque === true,
          }
        : null,
    )
    .filter((p): p is AdminPseudo => p !== null);
}

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
