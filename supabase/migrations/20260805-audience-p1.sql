-- P1 — L'AUDIENCE COMME CONCEPT UNIQUE.
--
-- POURQUOI. « Qui peut voter » était éparpillé sur QUATRE mécanismes qui ne se
-- parlent pas : access_mode, visibility, la convocation d'événement, et
-- open_circle_consultation. Or trois combinaisons seulement sont utilisées en
-- pratique (mesuré : 23 « link », 9 « roster », 3 « public ») — le signe qu'il
-- n'y a pas quatre concepts mais UN SEUL, mal découpé.
--
--   visibility = public    -> 'public'   indexé, tout le monde vote
--   access_mode = invite   -> 'roster'   seuls les convoqués
--   sinon                  -> 'link'     qui a le lien, vote
--
-- Colonne GÉNÉRÉE et non colonne libre : une troisième source de vérité qui
-- dériverait des deux autres finirait par mentir. Ici la dérive est impossible.
alter table public.scrutin_polls
  add column if not exists audience text
    generated always as (
      case when visibility = 'public' then 'public'
           when access_mode = 'invite' then 'roster'
           else 'link' end
    ) stored;

comment on column public.scrutin_polls.audience is
  'Concept unique « qui peut voter », DÉRIVÉ de visibility et access_mode : public | link | roster. Lecture seule — pour changer d''audience, passer par set_poll_audience() ou set_poll_visibility().';

create index if not exists scrutin_polls_audience_idx on public.scrutin_polls (audience);

-- ------------------------------------------------------------- les garanties
--
-- LE CŒUR DE P1. Les quatre garanties du cercle — convoquer tout le segment ou
-- refuser, seuil de 5 en scellé, plafond du jour, scellé assumé — étaient
-- enfermées dans open_circle_consultation, donc attachées à un CHEMIN DE
-- CRÉATION. Le jour où l'on affecte une audience depuis le parcours normal,
-- elles s'évaporeraient et le bulletin scellé redeviendrait cassable : viser un
-- segment d'une seule personne suffirait à lire son bulletin.
--
-- Elles sont donc extraites ici, en UNE implémentation, attachée au TYPE
-- D'AUDIENCE. Tout chemin menant à une audience « roster » y passe.
--
-- Vérifié en base : par le parcours normal, un segment de 3 en scellé est refusé
-- (too_small, 3 < 5) et le scrutin reste intact ; le même en nominatif passe.
create or replace function public.circle_audience_guard(
  p_space_id uuid, p_segment_ids uuid[], p_sealed boolean)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare
  s scrutin_spaces; v_seg_count int; v_roster int; v_today int; v_label text;
  v_min constant int := 5;
  v_targeted boolean := p_segment_ids is not null and array_length(p_segment_ids, 1) > 0;
begin
  select * into s from scrutin_spaces where id = p_space_id;
  if not found then return jsonb_build_object('status','invalid'); end if;
  if s.owner_id <> auth.uid() then return jsonb_build_object('status','forbidden'); end if;
  if not s.join_open then return jsonb_build_object('status','not_a_circle'); end if;

  -- Les segments visés doivent TOUS appartenir à cet espace : un identifiant
  -- emprunté à un autre groupe convoquerait ses membres.
  if v_targeted then
    select count(*) into v_seg_count from scrutin_segments
     where id = any(p_segment_ids) and space_id = s.id;
    if v_seg_count <> array_length(p_segment_ids, 1) then
      return jsonb_build_object('status','bad_segment');
    end if;
    select string_agg(name, ' + ' order by coalesce(rank, position), name)
      into v_label from scrutin_segments where id = any(p_segment_ids);
    select count(distinct ms.member_id) into v_roster
      from scrutin_member_segments ms
      join scrutin_members m on m.id = ms.member_id
     where ms.segment_id = any(p_segment_ids) and m.space_id = s.id;
  else
    select count(*) into v_roster from scrutin_members where space_id = s.id;
  end if;

  -- Seuil : uniquement en scellé, car il ne protège qu'un anonymat. En nominatif
  -- il n'y a rien à préserver en refusant de compter.
  if v_roster = 0 then
    return jsonb_build_object('status','too_small','roster',0,'min',1,'audience',v_label);
  end if;
  if coalesce(p_sealed, true) and v_roster < v_min then
    return jsonb_build_object('status','too_small','roster',v_roster,'min',v_min,'audience',v_label);
  end if;

  -- Plafond du jour : porte sur la boîte mail du membre, donc sur les événements
  -- réellement ouverts (brouillons exclus, ouvertures manuelles incluses).
  if s.solicit_per_day is not null then
    select count(*) into v_today from scrutin_events
     where space_id = s.id and status <> 'draft'
       and created_at >= date_trunc('day', now());
    if v_today >= s.solicit_per_day then
      return jsonb_build_object('status','capped','cap',s.solicit_per_day,'today',v_today);
    end if;
  end if;

  return jsonb_build_object('status','ok','roster',v_roster,'audience',v_label);
end $function$;

revoke all on function public.circle_audience_guard(uuid,uuid[],boolean) from public, anon, authenticated;

-- ------------------------------------------------------- affecter une audience
--
-- Donne une audience « roster » à N'IMPORTE QUEL scrutin, y compris créé par le
-- parcours normal. C'est ce qui rendra le formulaire dédié du cercle inutile.
--
-- La convocation vit sur l'ÉVÉNEMENT (scrutin_event_members). Un scrutin isolé
-- n'en a pas : on lui en crée un, transparent, qui l'enveloppe. Aucun refactor du
-- chemin de vote — cast_event_ballot et get_event_context sont inchangés.
create or replace function public.set_poll_audience(
  p_poll_id uuid, p_space_id uuid,
  p_segment_ids uuid[] default null, p_sealed boolean default true)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  p scrutin_polls; g jsonb; v_event uuid; v_sealed boolean := coalesce(p_sealed, true);
  v_targeted boolean := p_segment_ids is not null and array_length(p_segment_ids, 1) > 0;
begin
  select * into p from scrutin_polls where id = p_poll_id;
  if not found then return jsonb_build_object('status','invalid'); end if;
  if p.created_by is null or p.created_by <> auth.uid() then
    return jsonb_build_object('status','forbidden');
  end if;

  -- On ne change pas l'audience d'un scrutin déjà voté : ce serait changer les
  -- règles en cours de partie, et mélanger des bulletins de deux régimes.
  if exists (select 1 from scrutin_ballots where poll_id = p.id) then
    return jsonb_build_object('status','already_voted');
  end if;

  g := circle_audience_guard(p_space_id, p_segment_ids, v_sealed);
  if g->>'status' <> 'ok' then return g; end if;

  if p.event_id is null then
    insert into scrutin_events (owner_id, space_id, title, mode, status, secret_ballot,
                                closes_at, audience_label)
      values (auth.uid(), p_space_id, left(p.question, 150), 'async', 'open', v_sealed,
              p.closes_at, g->>'audience')
      returning id into v_event;
    update scrutin_polls set event_id = v_event, order_index = 0 where id = p.id;
  else
    v_event := p.event_id;
    update scrutin_events
       set secret_ballot = v_sealed, audience_label = g->>'audience', status = 'open'
     where id = v_event;
  end if;

  -- L'audience devient « roster » : seuls les convoqués votent, et le scrutin
  -- quitte le feed public s'il y était.
  update scrutin_polls set access_mode = 'invite', visibility = 'private' where id = p.id;

  -- TOUT le public visé, sans exception et sans choix individuel.
  insert into scrutin_event_members (event_id, member_id, name, email, weight, district)
  select v_event, m.id, m.name, m.email, 1, null
    from scrutin_members m
   where m.space_id = p_space_id
     and (not v_targeted
          or exists (select 1 from scrutin_member_segments ms
                      where ms.member_id = m.id and ms.segment_id = any(p_segment_ids)))
     and not exists (select 1 from scrutin_event_members em
                      where em.event_id = v_event and em.member_id = m.id);

  return jsonb_build_object('status','ok','event_id',v_event,'poll_token',p.token,
                            'convened',(g->>'roster')::int,'audience',g->>'audience',
                            'sealed',v_sealed);
end $function$;

grant execute on function public.set_poll_audience(uuid,uuid,uuid[],boolean) to authenticated;

-- ------------------------------------------------------------- unification
--
-- open_circle_consultation n'est plus qu'un RACCOURCI : créer le scrutin, puis
-- lui donner une audience. Les garanties ne vivent plus ici — elles vivent dans
-- circle_audience_guard, donc un seul endroit à relire pour savoir ce qui protège
-- le bulletin scellé.
create or replace function public.open_circle_consultation(
  p_space_id uuid, p_question text, p_options jsonb, p_recipe jsonb,
  p_description text default null, p_closes_at timestamptz default null,
  p_segment_ids uuid[] default null, p_sealed boolean default true)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  g jsonb; v_event uuid; v_token text;
  v_question text := nullif(btrim(p_question), '');
  v_sealed boolean := coalesce(p_sealed, true);
  v_targeted boolean := p_segment_ids is not null and array_length(p_segment_ids, 1) > 0;
begin
  if v_question is null then return jsonb_build_object('status','invalid'); end if;

  -- MÊME garde que le parcours normal.
  g := circle_audience_guard(p_space_id, p_segment_ids, v_sealed);
  if g->>'status' <> 'ok' then return g; end if;

  insert into scrutin_events (owner_id, space_id, title, description, mode, status,
                              secret_ballot, closes_at, audience_label)
    values (auth.uid(), p_space_id, left(v_question, 150), p_description, 'async', 'open',
            v_sealed, p_closes_at, g->>'audience')
    returning id into v_event;

  insert into scrutin_polls (question, description, options, recipe, status,
                             access_mode, visibility, event_id, order_index, closes_at)
    values (v_question, p_description, p_options, p_recipe, 'open',
            'invite', 'private', v_event, 0, p_closes_at)
    returning token into v_token;

  insert into scrutin_event_members (event_id, member_id, name, email, weight, district)
  select v_event, m.id, m.name, m.email, 1, null
    from scrutin_members m
   where m.space_id = p_space_id
     and (not v_targeted
          or exists (select 1 from scrutin_member_segments ms
                      where ms.member_id = m.id and ms.segment_id = any(p_segment_ids)));

  return jsonb_build_object('status','ok','event_id',v_event,'poll_token',v_token,
                            'convened',(g->>'roster')::int,'audience',g->>'audience',
                            'sealed',v_sealed);
end $function$;

grant execute on function public.open_circle_consultation(uuid,text,jsonb,jsonb,text,timestamptz,uuid[],boolean)
  to authenticated;
