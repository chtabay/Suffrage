-- LIRE UN SCRUTIN PAR SON TOKEN, SANS OUVRIR TOUTE LA TABLE
--
-- Pourquoi. `scrutin_polls` porte une policy `SELECT USING (true)` pour le rôle
-- `public`. La clé anon étant publique par conception (elle est dans le bundle
-- JS), n'importe qui peut donc lister TOUS les scrutins — y compris les privés —
-- avec leur question, leurs options et leur token. Or le token EST la clé
-- d'accès de /v/<token> : ce n'est pas seulement une fuite de lecture, c'est un
-- accès. « Privé » ne veut aujourd'hui rien dire.
--
-- Ce que ce fichier fait, et ne fait pas. Il installe le chemin de remplacement
-- — une fonction qui rend UN scrutin contre son token — et la policy propriétaire
-- nécessaire aux listes. Il NE SUPPRIME PAS la policy permissive : tant qu'un
-- chemin de lecture non migré subsiste (ici ou dans un travail en cours), la
-- couper renverrait « scrutin introuvable » au lieu d'une erreur, donc en
-- silence. La fermeture fait l'objet d'une migration séparée, à passer quand
-- tous les appelants sont sur cette fonction.

-- Lecture par token : les colonnes de POLL_COLS, exactement. `admin_hash` n'y
-- est pas et n'a aucune raison d'y entrer — l'app ne l'a jamais lu.
create or replace function public.get_poll(p_token text)
returns table (
  id                uuid,
  token             text,
  question          text,
  description       text,
  options           jsonb,
  recipe            jsonb,
  created_at        timestamptz,
  status            text,
  hide_results      boolean,
  access_mode       text,
  districts         jsonb,
  opens_at          timestamptz,
  closes_at         timestamptz,
  close_on_complete boolean,
  quorum            integer,
  slot_minutes      integer,
  created_by        uuid,
  visibility        text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select p.id, p.token, p.question, p.description, p.options, p.recipe, p.created_at,
         p.status, p.hide_results, p.access_mode, p.districts, p.opens_at, p.closes_at,
         p.close_on_complete, p.quorum, p.slot_minutes, p.created_by, p.visibility
  from public.scrutin_polls p
  where p.token = p_token
  limit 1;
$function$;

grant execute on function public.get_poll(text) to anon, authenticated;

-- Les LISTES ne passent pas par un token : « mes scrutins » et les résolutions
-- d'un événement lisent par `created_by`. Cette policy leur suffit, et elle
-- restera valable une fois la policy permissive retirée.
drop policy if exists scrutin_polls_select_owner on public.scrutin_polls;
create policy scrutin_polls_select_owner
  on public.scrutin_polls for select
  to authenticated
  using (created_by = auth.uid());
