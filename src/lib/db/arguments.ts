// Arguments d'aide à la décision, rattachés à une OPTION (pour / contre).
//
// Secret du vote préservé par construction : la table `scrutin_arguments` n'a
// aucun lien avec les bulletins (ni ballot_id, ni voter_id). Argumenter contre
// une option ne dit rien du bulletin de l'auteur.
import { createClient } from "@/lib/supabase/client";

export type Stance = "pro" | "con";

export interface Argument {
  optionIdx: number;
  stance: Stance;
  body: string;
  author: string | null;
  created_at: string;
}

/** Arguments d'un scrutin (lecture publique : ils aident à décider AVANT de voter). */
export async function getArguments(token: string): Promise<Argument[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_arguments", { p_token: token });
  if (error) throw error;
  return ((data ?? []) as Argument[]) || [];
}

/** Dépose un argument. Renvoie 'ok' | 'empty' | 'not_found' | 'bad_option' | 'closed'. */
export async function addArgument(
  token: string,
  optionIdx: number,
  stance: Stance,
  body: string,
  author?: string,
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("add_argument", {
    p_token: token,
    p_option_idx: optionIdx,
    p_stance: stance,
    p_body: body,
    p_author: author?.trim() || null,
  });
  if (error) throw error;
  return data as string;
}
