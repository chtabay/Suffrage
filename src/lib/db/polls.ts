// Accès aux données Suffrage (tables scrutin_ du projet OpenSM partagé).
import { createClient } from "@/lib/supabase/client";
import type { Ballot, Option, Recipe } from "@/lib/voting/types";

export interface PollRow {
  id: string;
  token: string;
  question: string;
  options: Option[];
  recipe: Recipe;
  created_at: string;
}

/** Enregistre un scrutin et renvoie son token de partage. */
export async function createPoll(question: string, options: Option[], recipe: Recipe): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scrutin_polls")
    .insert({ question, options, recipe, created_by: null })
    .select("token")
    .single();
  if (error) throw error;
  return data.token as string;
}

/** Charge un scrutin par son token (null si introuvable). */
export async function getPollByToken(token: string): Promise<PollRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scrutin_polls")
    .select("id, token, question, options, recipe, created_at")
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  return (data as PollRow | null) ?? null;
}

/** Dépose un bulletin dans l'urne d'un scrutin. */
export async function addBallot(pollId: string, b: Ballot): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("scrutin_ballots")
    .insert({ poll_id: pollId, ranking: b.ranking, grades: b.grades, district: b.district });
  if (error) throw error;
}

/** Récupère tous les bulletins d'un scrutin pour le dépouillement. */
export async function getBallots(pollId: string): Promise<Ballot[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scrutin_ballots")
    .select("ranking, grades, district")
    .eq("poll_id", pollId);
  if (error) throw error;
  return (data ?? []) as Ballot[];
}
