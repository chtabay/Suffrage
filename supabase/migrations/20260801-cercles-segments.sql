-- Segments — adresser une consultation à une PARTIE du cercle.
--
-- POURQUOI. Une association a des sous-ensembles durables : niveaux d'adhésion,
-- villes, bénévoles. Jusqu'ici une consultation prenait tout le roster ou rien.
--
-- CE QUI N'EST PAS FAIT, ET C'EST VOLONTAIRE : aucune notion de « niveau » câblée
-- dans Placet. Chaque groupe NOMME ses propres segments. `rank` est FACULTATIF —
-- renseigné, il déclare une échelle (Roulage 1 < Standard 2 < Avancé 3) et
-- l'interface peut proposer « ce niveau et au-dessus » ; laissé nul, ce sont de
-- simples étiquettes sans ordre (Lyon, Paris, Bénévoles). La hiérarchie est une
-- option que le groupe active, pas une opinion du produit.
--
-- CE QUI PRÉSERVE LE SCELLÉ. La règle du lot 3 se transpose : l'animateur choisit
-- un SEGMENT, jamais des individus, et la consultation prend tout le segment ou
-- refuse. Le seuil de 5 porte désormais sur le public VISÉ, pas sur le roster —
-- c'est là que se joue l'attaque par cardinalité. Un segment de 1 à 4 personnes
-- est donc inexploitable pour lire un bulletin.
--   ⚠️ Limite déjà consignée dans docs/cercles-spec.md et INCHANGÉE ici :
--   l'arithmétique des petits nombres. Un segment de 5 dont 4 sont complices
--   laisse déduire le 5e. Le seuil borne l'accident, il n'abolit pas le calcul.
--
-- Vérifié en base sous l'identité de l'animateur, sur le cas Grand Dynamo
-- (12 membres : 12 Roulage, 7 Standard, 3 Avancé) :
--   tout le cercle             -> ok, 12 convoqués
--   Standard et au-dessus      -> ok, 7 convoqués, 0 hors cible
--   Avancé seul (3 membres)    -> too_small (3 < 5), motif nommant le segment
--   segment d'un autre espace  -> bad_segment
--   et le membre Roulage ne voit PAS la consultation réservée aux soirées.

create table if not exists public.scrutin_segments (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.scrutin_spaces(id) on delete cascade,
  name text not null,
  -- NULL = segment sans ordre. Renseigné = position dans une échelle.
  rank smallint,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

-- Deux segments homonymes dans un même groupe rendraient le ciblage ambigu.
create unique index if not exists scrutin_segments_space_name_key
  on public.scrutin_segments (space_id, lower(name));

create index if not exists scrutin_segments_space_idx
  on public.scrutin_segments (space_id);

-- Plusieurs-à-plusieurs : un membre peut être bénévole ET lyonnais.
create table if not exists public.scrutin_member_segments (
  member_id uuid not null references public.scrutin_members(id) on delete cascade,
  segment_id uuid not null references public.scrutin_segments(id) on delete cascade,
  primary key (member_id, segment_id)
);

create index if not exists scrutin_member_segments_segment_idx
  on public.scrutin_member_segments (segment_id);

-- RLS : données d'ANIMATEUR (contrairement à scrutin_join_requests, qui n'est
-- lisible par personne). Même patron que `members_owner` : la propriété se lit
-- sur l'espace.
alter table public.scrutin_segments enable row level security;
drop policy if exists segments_owner on public.scrutin_segments;
create policy segments_owner on public.scrutin_segments
  for all to public
  using (exists (select 1 from public.scrutin_spaces s
                  where s.id = scrutin_segments.space_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.scrutin_spaces s
                       where s.id = scrutin_segments.space_id and s.owner_id = auth.uid()));

alter table public.scrutin_member_segments enable row level security;
drop policy if exists member_segments_owner on public.scrutin_member_segments;
create policy member_segments_owner on public.scrutin_member_segments
  for all to public
  using (exists (select 1 from public.scrutin_members m
                 join public.scrutin_spaces s on s.id = m.space_id
                  where m.id = scrutin_member_segments.member_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.scrutin_members m
                      join public.scrutin_spaces s on s.id = m.space_id
                       where m.id = scrutin_member_segments.member_id and s.owner_id = auth.uid()));

-- Qui a été convoqué, en clair et pour toujours. Instantané TEXTUEL et non une
-- clé étrangère : renommer ou supprimer un segment plus tard ne doit pas réécrire
-- l'histoire d'une consultation déjà tenue.
alter table public.scrutin_events
  add column if not exists audience_label text;

comment on column public.scrutin_events.audience_label is
  'Instantané du public convoqué (« Avancé », « Standard + Avancé »). Texte figé : un segment renommé ou supprimé ne doit pas réécrire une consultation passée. NULL = tout le cercle.';

-- ⚠️ Deux surcharges dont l'une n'ajoute qu'un paramètre à valeur par défaut
-- rendent tout appel à 6 arguments AMBIGU (« could not choose a best candidate
-- function »). On supprime l'ancienne : la nouvelle l'englobe, et PostgREST
-- résolvant par NOMS d'arguments, un client encore déployé qui n'envoie pas
-- p_segment_ids y est routé sans rien changer.
drop function if exists public.open_circle_consultation(uuid,text,jsonb,jsonb,text,timestamptz);

-- `p_segment_ids` NULL ou vide = tout le cercle : le comportement du lot 3 est
-- reconduit à l'identique, aucune consultation existante ne change.
--
-- La RPC ne connaît QUE des segments — jamais un rang, jamais une échelle. Si un
-- groupe déclare une hiérarchie, c'est l'interface qui traduit « Standard et
-- au-dessus » en liste d'identifiants. Une seule notion en base ; l'échelle reste
-- une commodité d'affichage.
create or replace function public.open_circle_consultation(
  p_space_id uuid,
  p_question text,
  p_options jsonb,
  p_recipe jsonb,
  p_description text default null,
  p_closes_at timestamptz default null,
  p_segment_ids uuid[] default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  s scrutin_spaces;
  v_event uuid; v_token text;
  v_roster int; v_today int; v_seg_count int;
  v_label text;
  v_min constant int := 5;
  v_question text := nullif(btrim(p_question), '');
  v_targeted boolean := p_segment_ids is not null and array_length(p_segment_ids, 1) > 0;
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

  -- EFFECTIF VISÉ, et non plus effectif du roster. Le seuil porte sur ceux qu'on
  -- consulte : c'est là que se joue l'attaque par cardinalité, pas ailleurs.
  if v_targeted then
    select count(distinct ms.member_id) into v_roster
      from scrutin_member_segments ms
      join scrutin_members m on m.id = ms.member_id
     where ms.segment_id = any(p_segment_ids) and m.space_id = s.id;
  else
    select count(*) into v_roster from scrutin_members where space_id = s.id;
  end if;

  if v_roster < v_min then
    return jsonb_build_object('status','too_small','roster',v_roster,'min',v_min,
                              'audience', v_label);
  end if;

  -- Plafond du jour : inchangé, il porte sur la boîte mail du membre.
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
            true, p_closes_at, v_label)
    returning id into v_event;

  insert into scrutin_polls (question, description, options, recipe, status,
                             access_mode, visibility, event_id, order_index, closes_at)
    values (v_question, p_description, p_options, p_recipe, 'open',
            'invite', 'private', v_event, 0, p_closes_at)
    returning token into v_token;

  -- TOUT le public visé, sans exception et sans choix individuel. Poids uniforme
  -- et district nul : un attribut rare est un identifiant.
  insert into scrutin_event_members (event_id, member_id, name, email, weight, district)
  select v_event, m.id, m.name, m.email, 1, null
    from scrutin_members m
   where m.space_id = s.id
     and (not v_targeted
          or exists (select 1 from scrutin_member_segments ms
                      where ms.member_id = m.id and ms.segment_id = any(p_segment_ids)));

  return jsonb_build_object('status','ok','event_id',v_event,'poll_token',v_token,
                            'convened',v_roster,'audience',v_label);
end $function$;

grant execute on function public.open_circle_consultation(uuid,text,jsonb,jsonb,text,timestamptz,uuid[])
  to authenticated;

-- Le membre voit ses propres segments et le public de chaque consultation. Même
-- principe que la date de consentement : ce qui décide de ce qu'il reçoit doit
-- lui être lisible, pas deviné.
create or replace function public.get_member_home(p_token text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare m scrutin_members; s scrutin_spaces;
begin
  select * into m from scrutin_members where token = p_token;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  select * into s from scrutin_spaces where id = m.space_id;
  if not found then return jsonb_build_object('status', 'invalid'); end if;

  return jsonb_build_object(
    'status', 'ok', 'circle', s.name, 'pitch', s.pitch,
    'solicit_per_day', s.solicit_per_day,
    'chat_url', s.chat_url,
    'name', m.name, 'email', m.email,
    'self_joined', m.self_joined, 'consent_at', m.consent_at,
    'segments', coalesce((
      select jsonb_agg(g.name order by coalesce(g.rank, g.position), g.name)
        from scrutin_member_segments ms
        join scrutin_segments g on g.id = ms.segment_id
       where ms.member_id = m.id), '[]'::jsonb),
    'consultations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', e.title, 'status', e.status, 'secret_ballot', e.secret_ballot,
        'closes_at', e.closes_at, 'audience', e.audience_label,
        'token', em.token,
        'voted', case when e.secret_ballot
                   then exists (select 1 from scrutin_event_signins g2
                                 join scrutin_polls p on p.id = g2.poll_id
                                where p.event_id = e.id and g2.event_member_id = em.id)
                   else exists (select 1 from scrutin_ballots b
                                 join scrutin_polls p on p.id = b.poll_id
                                where p.event_id = e.id and b.event_member_id = em.id)
                 end
      ) order by e.created_at desc)
      from scrutin_event_members em
      join scrutin_events e on e.id = em.event_id
      where em.member_id = m.id
    ), '[]'::jsonb)
  );
end $function$;

grant execute on function public.get_member_home(text) to anon, authenticated;
