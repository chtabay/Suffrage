// Cercles — accès client.
//
// Un cercle n'est pas un objet nouveau : c'est un `scrutin_spaces` dont le lien
// d'adhésion est ouvert (`join_open`). Voir docs/cercles-spec.md.
//
// Ce fichier ne contient QUE ce qui est appelable depuis le navigateur. La
// demande d'adhésion et sa confirmation en sont volontairement absentes : leurs
// RPC sont gardées par le secret serveur et passent par /api/circles/*, pour que
// le jeton personnel ne transite que par l'email de son destinataire.
import { createClient } from "@/lib/supabase/client";

/** Vitrine publique d'un cercle (sortie de `get_circle_info`). */
export interface CircleInfo {
  status: "open" | "closed" | "full" | "invalid";
  name?: string;
  pitch?: string | null;
  /** `null` = ce cercle n'a pris aucun engagement de fréquence : on n'affiche alors rien. */
  solicit_per_day?: number | null;
}

/** Une consultation vue depuis la page personnelle du membre. */
export interface MemberConsultation {
  title: string;
  status: "draft" | "open" | "closed";
  secret_ballot: boolean;
  closes_at: string | null;
  token: string;
  voted: boolean;
}

/** Page personnelle du membre (sortie de `get_member_home`). */
export interface MemberHome {
  status: "ok" | "invalid";
  circle?: string;
  pitch?: string | null;
  solicit_per_day?: number | null;
  name?: string;
  email?: string | null;
  self_joined?: boolean;
  consent_at?: string | null;
  consultations?: MemberConsultation[];
}

export async function getCircleInfo(joinToken: string): Promise<CircleInfo> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_circle_info", { p_join_token: joinToken });
  if (error) throw error;
  return (data as CircleInfo | null) ?? { status: "invalid" };
}

export async function getMemberHome(token: string): Promise<MemberHome> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_member_home", { p_token: token });
  if (error) throw error;
  return (data as MemberHome | null) ?? { status: "invalid" };
}

/**
 * Le retrait. Le jeton EST le titre : il vient de la boîte de son destinataire.
 * Les bulletins déjà déposés survivent — scellés, ils n'ont jamais porté de nom ;
 * sur une assemblée close, la convocation est anonymisée plutôt que supprimée,
 * pour ne pas modifier un résultat déjà acquis.
 */
export async function leaveCircle(token: string): Promise<{ status: string; circle?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("leave_circle", { p_token: token });
  if (error) throw error;
  return (data as { status: string; circle?: string } | null) ?? { status: "invalid" };
}
