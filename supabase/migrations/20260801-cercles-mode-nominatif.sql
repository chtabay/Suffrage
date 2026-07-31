-- Consultation NOMINATIVE — l'autre régime, assumé comme tel.
--
-- POURQUOI. Toutes les questions d'un cercle ne sont pas sensibles. « Qui vient
-- samedi ? » exige des NOMS : un décompte anonyme ne sert à rien pour organiser
-- une sortie. Jusqu'ici toute consultation de cercle était scellée d'office, ce
-- qui rendait ce cas impossible — et rendait aussi inaccessible tout segment de
-- moins de 5 personnes, puisque le seuil s'y opposait.
--
-- LES DEUX RÉGIMES, ET CE QUI LES SÉPARE :
--   scellé (défaut) -> aucun nom, seuil de 5 réponses, pas de commentaire
--   nominatif       -> l'animateur voit qui a répondu quoi, aucun seuil, commentaires
--
-- Ce qui NE change pas : la convocation reste « tout le segment ou rien ». Le
-- seuil disparaît en nominatif parce qu'il ne protégeait qu'un anonymat qu'on ne
-- promet plus — il n'y a plus rien à préserver en refusant de compter. On exige
-- seulement qu'il y ait quelqu'un à consulter.
--
-- CE QUI SERAIT MALHONNÊTE serait de laisser croire au secret sur un formulaire
-- où l'animateur voit tout. Le régime est donc annoncé au votant sur l'écran de
-- vote lui-même, DANS LES DEUX SENS (LivretVote) — et le scellé ne l'était pas
-- davantage avant ce fichier, ce qui était un manque du lot 1.
--
-- Vérifié en base : segment de 3 refusé en scellé (too_small) et accepté en
-- nominatif ; bulletins bien rattachés au membre ; commentaires acceptés ;
-- get_event_named_answers refuse (`sealed`) sur une consultation scellée, et
-- rend `forbidden` à un autre compte comme à un événement inexistant.

-- Deux surcharges dont l'une n'ajoute qu'un paramètre à défaut rendent l'appel
-- ambigu : on remplace, on n'empile pas.
drop function if exists public.open_circle_consultation(uuid,text,jsonb,jsonb,text,timestamptz,uuid[]);

create or replace function public.open_circle_consultation(
  p_space_id uuid,
  p_question text,
  p_options jsonb,
  p_recipe jsonb,
  p_description text default null,
  p_closes_at timestamptz default null,
  p_segment_ids uuid[] default null,
  p_sealed boolean default true)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  s scrutin_spaces;
  v_event uuid; v_token text;
  v_roster int; v_today int; v_seg_count int;
  v_label text;
  v_min constant int := 5;
  v_question text := nullif(btrim(p_question), '');
  v_targeted boolean := p_segment_ids is not null and array_length(p_segment_ids, 1) > 0;
  v_sealed boolean := coalesce(p_sealed, true);
begin
  select * into s from scrutin_spaces where id = p_space_id;
  if not found then return jsonb_build_object('status','invalid'); end if;
  if s.owner_id <> auth.uid() then return jsonb_build_object('status','forbidden'); end if;
  if v_question is null then return jsonb_build_object('status','invalid'); end if;
  if not s.join_open then return jsonb_build_object('status','not_a_circle'); end if;

  -- Les segments visés doivent TOUS appartenir à cet espace. Sans ce contrôle, un
  -- identifiant emprunté à un autre groupe convoquerait ses membres.
  if v_targeted then
    select count(*) into v_seg_count from scrutin_segments
     where id = any(p_segment_ids) and space_id = s.id;
    if v_seg_count <> array_length(p_segment_ids, 1) then
      return jsonb_build_object('status','bad_segment');
    end if;
    select string_agg(name, ' + ' order by coalesce(rank, position), name)
      into v_label from scrutin_segments where id = any(p_segment_ids);
  end if;

  if v_targeted then
    select count(distinct ms.member_id) into v_roster
      from scrutin_member_segments ms
      join scrutin_members m on m.id = ms.member_id
     where ms.segment_id = any(p_segment_ids) and m.space_id = s.id;
  else
    select count(*) into v_roster from scrutin_members where space_id = s.id;
  end if;

  -- Le seuil ne s'applique QU'EN SCELLÉ : il protège un anonymat. En nominatif il
  -- n'y a rien à préserver, et interdire de demander à trois personnes si elles
  -- viennent samedi serait absurde.
  if v_roster = 0 then
    return jsonb_build_object('status','too_small','roster',0,'min',1,'audience',v_label);
  end if;
  if v_sealed and v_roster < v_min then
    return jsonb_build_object('status','too_small','roster',v_roster,'min',v_min,
                              'audience', v_label);
  end if;

  if s.solicit_per_day is not null then
    select count(*) into v_today from scrutin_events
     where space_id = s.id and status <> 'draft'
       and created_at >= date_trunc('day', now());
    if v_today >= s.solicit_per_day then
      return jsonb_build_object('status','capped','cap',s.solicit_per_day,'today',v_today);
    end if;
  end if;

  insert into scrutin_events (owner_id, space_id, title, description, mode, status,
                              secret_ballot, closes_at, audience_label)
    values (auth.uid(), s.id, left(v_question, 150), p_description, 'async', 'open',
            v_sealed, p_closes_at, v_label)
    returning id into v_event;

  insert into scrutin_polls (question, description, options, recipe, status,
                             access_mode, visibility, event_id, order_index, closes_at)
    values (v_question, p_description, p_options, p_recipe, 'open',
            'invite', 'private', v_event, 0, p_closes_at)
    returning token into v_token;

  -- TOUT le public visé, sans exception et sans choix individuel.
  insert into scrutin_event_members (event_id, member_id, name, email, weight, district)
  select v_event, m.id, m.name, m.email, 1, null
    from scrutin_members m
   where m.space_id = s.id
     and (not v_targeted
          or exists (select 1 from scrutin_member_segments ms
                      where ms.member_id = m.id and ms.segment_id = any(p_segment_ids)));

  return jsonb_build_object('status','ok','event_id',v_event,'poll_token',v_token,
                            'convened',v_roster,'audience',v_label,'sealed',v_sealed);
end $function$;

grant execute on function public.open_circle_consultation(uuid,text,jsonb,jsonb,text,timestamptz,uuid[],boolean)
  to authenticated;

-- Qui a répondu quoi — le seul intérêt du mode nominatif.
--
-- RPC dédiée plutôt qu'une jointure côté client, pour une raison : elle REFUSE
-- explicitement sur une consultation scellée. Le jour où quelqu'un branchera cet
-- écran au mauvais endroit, la base dira non. La jointure serait techniquement
-- possible pour l'animateur (scrutin_event_members n'est lisible que par lui),
-- mais rien ne l'empêcherait de la tenter sur un scrutin secret.
--
-- « pending » — qui n'a PAS répondu — est souvent l'information la plus utile
-- pour organiser, et n'existe évidemment que dans ce régime.
create or replace function public.get_event_named_answers(p_event_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare v_ok boolean; v_secret boolean;
begin
  select exists (
    select 1 from scrutin_events e
    left join scrutin_spaces s on s.id = e.space_id
    where e.id = p_event_id and (e.owner_id = auth.uid() or s.owner_id = auth.uid())
  ) into v_ok;
  if not v_ok then return jsonb_build_object('status','forbidden'); end if;

  select secret_ballot into v_secret from scrutin_events where id = p_event_id;
  if v_secret is null then return jsonb_build_object('status','invalid'); end if;
  -- Le refus est le cœur de cette fonction.
  if v_secret then return jsonb_build_object('status','sealed'); end if;

  return jsonb_build_object(
    'status','ok',
    'resolutions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'question', p.question, 'options', p.options,
        'answers', coalesce((
          select jsonb_agg(jsonb_build_object(
            'name', em.name, 'ranking', b.ranking, 'grades', b.grades)
            order by em.name)
          from scrutin_ballots b
          join scrutin_event_members em on em.id = b.event_member_id
          where b.poll_id = p.id), '[]'::jsonb),
        'pending', coalesce((
          select jsonb_agg(em.name order by em.name)
          from scrutin_event_members em
          where em.event_id = p_event_id
            and not exists (select 1 from scrutin_ballots b
                             where b.poll_id = p.id and b.event_member_id = em.id)), '[]'::jsonb)
      ) order by p.order_index)
      from scrutin_polls p where p.event_id = p_event_id), '[]'::jsonb)
  );
end $function$;

grant execute on function public.get_event_named_answers(uuid) to authenticated;
