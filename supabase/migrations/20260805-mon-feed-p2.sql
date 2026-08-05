-- P2 — LA VUE DU CONNECTÉ.
--
-- Ce que P0 a rendu calculable, cette RPC le sert en une fois. Elle remplace
-- get_my_participations, qui n'en couvrait que la moitié.
--
-- CE QUE CETTE VUE N'EST PAS. Une place de marché façon Polymarket : un marché a
-- un prix et un volume — des nombres continus, comparables, qui bougent. Un
-- scrutin n'a ni l'un ni l'autre avant sa clôture, et la plupart sont
-- volontairement secrets. Une grille de cartes « vivantes » afficherait des
-- cartes mortes. C'est donc une FILE D'ATTENTE D'ACTIONS, plus proche d'une boîte
-- de réception — d'où l'ordre des sections : l'actionnable d'abord.
--
-- Elle ne lit JAMAIS un bulletin. « Répondu » vient de l'émargement en scellé,
-- du rattachement du bulletin sinon — exactement comme get_member_home.
drop function if exists public.get_my_participations();

create or replace function public.get_my_feed()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('status','anonymous'); end if;

  return jsonb_build_object(
    'status', 'ok',

    -- Les cercles où je suis MEMBRE (pas animateur).
    'circles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'space_id', s.id, 'name', s.name, 'pitch', s.pitch,
        'member_token', m.token, 'since', m.consent_at,
        'solicit_per_day', s.solicit_per_day) order by s.name)
      from scrutin_member_links ml
      join scrutin_members m on m.id = ml.member_id
      join scrutin_spaces s on s.id = m.space_id
      where ml.user_id = v_uid), '[]'::jsonb),

    -- CE QUI M'ATTEND. La seule section réellement actionnable, donc la première.
    'todo', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', e.title, 'circle', s.name, 'token', em.token,
        'secret_ballot', e.secret_ballot, 'audience', e.audience_label,
        'closes_at', e.closes_at) order by e.closes_at nulls last, e.created_at desc)
      from scrutin_member_links ml
      join scrutin_members m on m.id = ml.member_id
      join scrutin_event_members em on em.member_id = m.id
      join scrutin_events e on e.id = em.event_id
      join scrutin_spaces s on s.id = m.space_id
      where ml.user_id = v_uid and e.status = 'open'
        and not (case when e.secret_ballot
                   then exists (select 1 from scrutin_event_signins g
                                 join scrutin_polls p on p.id = g.poll_id
                                where p.event_id = e.id and g.event_member_id = em.id)
                   else exists (select 1 from scrutin_ballots b
                                 join scrutin_polls p on p.id = b.poll_id
                                where p.event_id = e.id and b.event_member_id = em.id)
                 end)), '[]'::jsonb),

    -- J'ai répondu, le résultat n'est pas encore là.
    'answered', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', e.title, 'circle', s.name, 'token', em.token,
        'secret_ballot', e.secret_ballot, 'closes_at', e.closes_at)
        order by e.closes_at nulls last)
      from scrutin_member_links ml
      join scrutin_members m on m.id = ml.member_id
      join scrutin_event_members em on em.member_id = m.id
      join scrutin_events e on e.id = em.event_id
      join scrutin_spaces s on s.id = m.space_id
      where ml.user_id = v_uid and e.status = 'open'
        and (case when e.secret_ballot
               then exists (select 1 from scrutin_event_signins g
                             join scrutin_polls p on p.id = g.poll_id
                            where p.event_id = e.id and g.event_member_id = em.id)
               else exists (select 1 from scrutin_ballots b
                             join scrutin_polls p on p.id = b.poll_id
                            where p.event_id = e.id and b.event_member_id = em.id)
             end)), '[]'::jsonb),

    -- Ce que j'ai ouvert. `audience` est le mot unique de P1.
    'created', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'token', p.token, 'question', p.question,
        'status', p.status, 'audience', p.audience, 'closes_at', p.closes_at,
        'event_id', p.event_id,
        'ballots', (select count(*) from scrutin_ballots b where b.poll_id = p.id))
        order by p.created_at desc)
      from scrutin_polls p
      where p.created_by = v_uid and p.status <> 'closed'), '[]'::jsonb),

    -- L'historique, les deux rôles confondus : ce à quoi j'ai été convié et ce
    -- que j'ai ouvert, une fois clos.
    'history', coalesce((
      select jsonb_agg(h order by (h->>'at') desc) from (
        select jsonb_build_object('kind','participant','title', e.title,
                 'circle', s.name, 'token', em.token, 'at', e.created_at) as h
          from scrutin_member_links ml
          join scrutin_members m on m.id = ml.member_id
          join scrutin_event_members em on em.member_id = m.id
          join scrutin_events e on e.id = em.event_id
          join scrutin_spaces s on s.id = m.space_id
         where ml.user_id = v_uid and e.status = 'closed'
        union all
        select jsonb_build_object('kind','creator','title', p.question,
                 'token', p.token, 'audience', p.audience, 'at', p.created_at)
          from scrutin_polls p
         where p.created_by = v_uid and p.status = 'closed'
      ) x), '[]'::jsonb)
  );
end $function$;

grant execute on function public.get_my_feed() to authenticated;
