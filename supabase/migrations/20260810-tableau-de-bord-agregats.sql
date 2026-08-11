-- TABLEAU DE BORD DE GROUPE — les huit entiers de la page, en une requête.
--
-- POURQUOI. Le P0 a fait de /espaces/<id> une page qui GOUVERNE et n'énumère
-- pas : plus une seule ligne de membre à l'écran. Mais elle n'avait cessé
-- d'énumérer qu'à l'ÉCRAN — au réseau, elle appelait toujours `listMembers`
-- (toutes les lignes du roster, avec noms et adresses) et `listMemberSegments`
-- (toute la table de rattachement), puis parcourait les deux dans le navigateur
-- pour en tirer huit entiers : total, arrivés par le lien, sans adresse, sans
-- segment, et l'effectif de chaque segment.
--
-- Sur un groupe de 500 personnes, cela fait ~1 000 lignes transportées avant le
-- premier pixel utile d'une page qui n'en affiche aucune. Le motif de la
-- solution existait déjà à côté — `get_spaces_with_stats` sert la liste des
-- groupes de la même façon — il manquait simplement ici.
--
-- CE QU'ELLE NE REND PAS, et c'est le point : aucun nom, aucune adresse, aucun
-- jeton. Des COMPTES, et les segments eux-mêmes (qui sont des étiquettes du
-- groupe, pas des données de personne). La page des membres, elle, assume de
-- charger la liste — c'est sa raison d'être, elle a une recherche, des facettes
-- et une borne pour ça.
--
-- `no_email` applique `btrim` : une adresse faite d'espaces n'est pas une
-- adresse. Le client testait déjà `.trim()`, et les deux chiffres doivent
-- coïncider — sinon le repli du client et la fonction annonceraient deux
-- vérités différentes sur le même groupe.

create or replace function public.get_space_overview(p_space_id uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select jsonb_build_object(
    'members', (
      select jsonb_build_object(
        'total',       count(*)::int,
        'self_joined', count(*) filter (where m.self_joined)::int,
        'no_email',    count(*) filter (where coalesce(btrim(m.email), '') = '')::int,
        'no_segment',  count(*) filter (
                         where not exists (
                           select 1 from scrutin_member_segments ms where ms.member_id = m.id
                         )
                       )::int
      )
      from scrutin_members m
      where m.space_id = s.id
    ),
    'segments', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id',       g.id,
                 'name',     g.name,
                 'rank',     g.rank,
                 'position', g.position,
                 'count',    (select count(*)::int
                                from scrutin_member_segments ms
                               where ms.segment_id = g.id)
               )
               order by g.position
             )
      from scrutin_segments g
      where g.space_id = s.id
    ), '[]'::jsonb)
  )
  from scrutin_spaces s
  where s.id = p_space_id
    and s.owner_id = auth.uid();
$function$;

-- ⚠️ `grant to authenticated` NE SUFFIT PAS : Postgres donne à PUBLIC un droit
-- d'exécution par défaut sur toute fonction. Le `revoke` vient donc AVANT, et
-- dans cet ordre. Piège déjà payé sur `get_my_circle_cards` le 2026-08-06.
revoke all on function public.get_space_overview(uuid) from public, anon;
grant execute on function public.get_space_overview(uuid) to authenticated;
