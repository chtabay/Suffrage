-- TROIS CHIFFRES DU TABLEAU DE BORD QUI POUVAIENT MENTIR.

-- ═══════════════════════════ 1. « AUCUNE DEMANDE EN ATTENTE » ÉTAIT AUSSI CE
--                                QUE RÉPONDAIT LA BASE QUAND ELLE REFUSAIT.
--
-- `get_space_join_pending` agrège (count, min) sur une jointure gardée par
-- `s.owner_id = auth.uid()`. Un agrégat sur ZÉRO ligne rend UNE ligne, pas zéro :
-- une session hors périmètre recevait {"count": 0, "oldest_at": null} sans la
-- moindre erreur — indiscernable de « personne n'attend ».
--
-- Ce n'est pas un cas théorique : le tableau de bord masque tout le bloc quand le
-- compte est nul, y compris l'alerte « la plus ancienne a 70 h » qui est la seule
-- raison d'être du chiffre (la fenêtre de péremption est de 72 h). Lire « rien à
-- faire » fait laisser expirer des confirmations irrattrapables.
--
-- On enveloppe donc l'agrégat : la ligne d'espace décide s'il y a une réponse.
create or replace function public.get_space_join_pending(p_space_id uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select jsonb_build_object(
    'count', (select count(*)::int from scrutin_join_requests r
               where r.space_id = s.id and r.confirmed_at is null and r.expires_at > now()),
    'oldest_at', (select min(r.created_at) from scrutin_join_requests r
                   where r.space_id = s.id and r.confirmed_at is null and r.expires_at > now())
  )
  from scrutin_spaces s
  where s.id = p_space_id and s.owner_id = auth.uid();
$function$;

revoke all on function public.get_space_join_pending(uuid) from public, anon;
grant execute on function public.get_space_join_pending(uuid) to authenticated;

-- ═══════════════════════ 2. UN SEGMENT POUVAIT ÊTRE RATTACHÉ HORS DE SON GROUPE
--
-- La policy `member_segments_owner` ne contrôlait QUE le côté membre : elle
-- vérifiait que le membre appartient à un espace dont on est propriétaire, et ne
-- disait RIEN du `segment_id`. Ni son espace, ni son propriétaire. Un écrit
-- direct sur /rest/v1/scrutin_member_segments avec le segment d'un AUTRE groupe
-- était accepté — un script d'import, un agent branché sur l'API, un
-- copier-coller entre deux groupes qu'on anime.
--
-- Et les deux chiffres qui auraient dû le démentir ne le pouvaient pas : ils ne
-- bornaient pas leurs comptages à l'espace. Le tableau de bord affichait alors
-- « Bureau · 12 » SANS l'alerte des moins de 5, l'animateur lançait une
-- consultation scellée sur ce segment, et `open_circle_consultation` — qui
-- filtre, lui, `m.space_id = s.id` — n'en visait que 3 et refusait en
-- `too_small`. Deux surfaces annonçaient deux effectifs pour le même segment.
--
-- ⚠️ LE `with check` AUTANT QUE LE `using` : le premier est aveugle au
-- CHANGEMENT, le second à l'INSERTION. Piège déjà payé sur les cercles.
drop policy if exists member_segments_owner on public.scrutin_member_segments;
create policy member_segments_owner on public.scrutin_member_segments
  for all
  using (
    exists (
      select 1 from scrutin_members m
        join scrutin_spaces s on s.id = m.space_id
        join scrutin_segments g on g.id = scrutin_member_segments.segment_id
       where m.id = scrutin_member_segments.member_id
         and s.owner_id = auth.uid()
         and g.space_id = m.space_id
    )
  )
  with check (
    exists (
      select 1 from scrutin_members m
        join scrutin_spaces s on s.id = m.space_id
        join scrutin_segments g on g.id = scrutin_member_segments.segment_id
       where m.id = scrutin_member_segments.member_id
         and s.owner_id = auth.uid()
         and g.space_id = m.space_id
    )
  );

-- ═════════════════ 3. LES DEUX COMPTEURS DE SEGMENT N'ÉTAIENT BORNÉS À RIEN
--
-- `no_segment` testait « ce membre a-t-il UN rattachement », sans exiger que le
-- segment soit de CE groupe ; le `count` d'un segment comptait ses rattachements
-- sans exiger que le membre soit de CE groupe. `listMemberSegments`, côté page
-- des membres, borne déjà (`scrutin_segments!inner(space_id)`) — d'où deux
-- chiffres différents pour la même réalité. On aligne sur le plus strict.
--
-- Remplace la version de 20260810-tableau-de-bord-agregats.sql.
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
                           select 1 from scrutin_member_segments ms
                             join scrutin_segments g on g.id = ms.segment_id
                            where ms.member_id = m.id and g.space_id = s.id
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
                                join scrutin_members m2 on m2.id = ms.member_id
                               where ms.segment_id = g.id and m2.space_id = s.id)
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

revoke all on function public.get_space_overview(uuid) from public, anon;
grant execute on function public.get_space_overview(uuid) to authenticated;
