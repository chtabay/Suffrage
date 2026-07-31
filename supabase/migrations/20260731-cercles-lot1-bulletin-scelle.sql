-- Cercles, lot 1 — le bulletin scellé.
--
-- POURQUOI. On veut pouvoir interroger un groupe sans que l'animateur — ni
-- personne muni de la clé publique — puisse relier une réponse à un nom. Le
-- secret est une propriété de la CONSULTATION (`scrutin_events.secret_ballot`),
-- pas du cercle : n'importe quelle assemblée existante peut en profiter, et le
-- défaut `false` garantit qu'aucune ne change de comportement.
--
-- Le principe : séparer physiquement trois choses qui étaient confondues.
--   prouver l'appartenance  -> scrutin_event_members.token   (existant)
--   empêcher le double vote -> scrutin_event_signins          (nouveau)
--   le vote lui-même        -> scrutin_ballots, event_member_id NULL
--
-- Spec : docs/cercles-spec.md. Vérifié en base : 5 bulletins / 0 signé /
-- 5 émargements / 0 commentaire / 1 seule horodate / 0 district marqué.

-- ---------------------------------------------------------------- schéma

alter table public.scrutin_events
  add column if not exists secret_ballot boolean not null default false;

comment on column public.scrutin_events.secret_ballot is
  'Consultation à bulletin scellé : le bulletin est écrit avec event_member_id NULL et l''unicité passe par scrutin_event_signins. Le secret est une propriété de la CONSULTATION, pas du cercle.';

-- L'émargement : qui a voté, sans dire quoi.
-- La PK EST la garantie d'unicité, et c'était indispensable : l'index unique qui
-- protège aujourd'hui du double vote est PARTIEL (`where event_member_id is not
-- null`) — un bulletin détaché y échappe entièrement, donc la protection
-- disparaîtrait exactement quand on en a le plus besoin.
-- Date au JOUR près : une horodate fine serait un canal de jointure avec le bulletin.
create table if not exists public.scrutin_event_signins (
  event_member_id uuid not null references public.scrutin_event_members(id) on delete cascade,
  poll_id uuid not null references public.scrutin_polls(id) on delete cascade,
  signed_on date not null default current_date,
  primary key (event_member_id, poll_id)
);

-- RLS active et ZÉRO policy (patron `scrutin_config`) : illisible par anon comme
-- par l'animateur. Seules les RPC SECURITY DEFINER y touchent.
alter table public.scrutin_event_signins enable row level security;

-- ---------------------------------------------------------------- lecture

-- ⚠️ PIÈGE RLS, rencontré et vérifié en base. Une policy est évaluée AVEC la RLS
-- de l'appelant. La première version de la policy ci-dessous interrogeait
-- `scrutin_events` directement en sous-requête : pour `anon` l'événement est
-- invisible (policy `events_owner` exige `auth.uid()`), donc « cet événement
-- est-il scellé ? » répondait toujours NON et la policy laissait passer TOUS les
-- bulletins scellés. Le test doit donc franchir la RLS → SECURITY DEFINER.
create or replace function public.poll_is_secret(p_poll_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (
    select 1 from public.scrutin_polls p
    join public.scrutin_events e on e.id = p.event_id
    where p.id = p_poll_id and e.secret_ballot
  );
$function$;

comment on function public.poll_is_secret(uuid) is
  'Vrai si le scrutin appartient à une consultation à bulletin scellé. SECURITY DEFINER parce qu''une policy RLS ne peut pas lire scrutin_events avec les droits de l''appelant.';

grant execute on function public.poll_is_secret(uuid) to anon, authenticated;

-- Les bulletins scellés sortent de TOUTE lecture directe : ni la clé publique ni
-- l'animateur ne les lisent en table. Ils ne s'obtiennent que par
-- get_event_results*, qui impose la clôture et le seuil de dépouillement. Sans
-- ça, l'animateur lirait les bulletins arriver en direct et les corrélerait à une
-- relance ciblée.
drop policy if exists scrutin_ballots_hide_secret on public.scrutin_ballots;
create policy scrutin_ballots_hide_secret on public.scrutin_ballots
  as restrictive for select to public
  using (not public.poll_is_secret(poll_id));

-- ---------------------------------------------------------------- écriture

-- Le chemin NON secret est reconduit mot pour mot ; toute la nouveauté est
-- derrière `if ev.secret_ballot`.
--
-- Contient aussi un correctif d'un bug PRÉEXISTANT, trouvé en testant : le client
-- envoie `p_district: b.district ?? null`, `scrutin_event_members.district` est
-- nullable et `scrutin_ballots.district` est NOT NULL. Sur un convoqué sans
-- district — il en existe en base — `coalesce(p_district, em.district)` valait
-- NULL et le vote plantait. D'où le `, 0` final.
create or replace function public.cast_event_ballot(
  p_token text, p_poll_token text, p_ranking jsonb, p_grades jsonb,
  p_district integer, p_comment text, p_author text)
returns text language plpgsql security definer set search_path to 'public' as $function$
declare em record; ev record; pl record; v_body text;
begin
  select * into em from public.scrutin_event_members where token = p_token;
  if not found then return 'invalid'; end if;
  select * into ev from public.scrutin_events where id = em.event_id;
  if not found then return 'invalid'; end if;
  select * into pl from public.scrutin_polls where token = p_poll_token and event_id = ev.id;
  if not found then return 'invalid'; end if;
  if pl.status = 'closed' or ev.status = 'closed'
     or (pl.closes_at is not null and now() >= pl.closes_at)
     or (ev.closes_at is not null and now() >= ev.closes_at)
     or (pl.opens_at is not null and now() < pl.opens_at) then return 'closed'; end if;
  if ev.mode = 'live' and ev.current_poll_id is not null and ev.current_poll_id <> pl.id then return 'closed'; end if;

  if ev.secret_ballot then
    -- 1. L'ÉMARGEMENT D'ABORD : écriture autoritaire. Si la ligne existe déjà, on
    --    sort sans jamais toucher à l'urne. Atomique.
    insert into public.scrutin_event_signins (event_member_id, poll_id)
    values (em.id, pl.id)
    on conflict do nothing;
    if not found then return 'already'; end if;

    -- 2. LE BULLETIN, DÉTACHÉ. Pas d'identité ; horodate arrondie au jour (une
    --    horodate fine se joint au commentaire, inséré dans la MÊME transaction
    --    donc au même now() à la microseconde) ; district ramené à sa valeur
    --    neutre 0 (un district rare est un identifiant).
    insert into public.scrutin_ballots (poll_id, event_member_id, ranking, grades, district, created_at)
    values (pl.id, null, p_ranking, p_grades, 0, date_trunc('day', now()));

    -- 3. AUCUN COMMENTAIRE : un texte libre ré-identifie (style, nom d'agence) et
    --    survivrait au retrait du membre.
    return 'ok';
  end if;

  begin
    insert into public.scrutin_ballots (poll_id, event_member_id, ranking, grades, district)
    values (pl.id, em.id, p_ranking, p_grades, coalesce(p_district, em.district, 0));
  exception when unique_violation then return 'already';
  end;
  v_body := left(nullif(btrim(coalesce(p_comment, '')), ''), 280);
  if v_body is not null then
    insert into public.scrutin_comments (poll_id, body, author)
    values (pl.id, v_body, nullif(left(btrim(coalesce(p_author, '')), 40), ''));
  end if;
  return 'ok';
end; $function$;

-- « J'ai déjà voté » doit lire l'émargement en mode scellé : le bulletin ne porte
-- plus l'identité, donc l'ancien test renverrait toujours false → revote infini.
create or replace function public.get_event_context(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare em record; ev record; res jsonb;
begin
  select * into em from public.scrutin_event_members where token = p_token;
  if not found then return null; end if;
  select * into ev from public.scrutin_events where id = em.event_id;
  if not found then return null; end if;
  select jsonb_build_object(
    'event', jsonb_build_object('title',ev.title,'description',ev.description,'mode',ev.mode,
                                'status',ev.status,'closes_at',ev.closes_at,'current_poll_id',ev.current_poll_id,
                                'secret_ballot',ev.secret_ballot),
    'member', jsonb_build_object('name', em.name),
    'resolutions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'token',p.token,'question',p.question,'description',p.description,'options',p.options,
        'recipe',p.recipe,'status',p.status,'order_index',p.order_index,
        'voted', case when ev.secret_ballot
                   then exists (select 1 from public.scrutin_event_signins s
                                 where s.poll_id = p.id and s.event_member_id = em.id)
                   else exists (select 1 from public.scrutin_ballots b
                                 where b.poll_id = p.id and b.event_member_id = em.id)
                 end
      ) order by p.order_index)
      from public.scrutin_polls p where p.event_id = ev.id), '[]'::jsonb)
  ) into res;
  return res;
end; $function$;

-- ---------------------------------------------------------------- dépouillement

-- Écrit UNE fois, servi par deux portes : le votant (par son jeton, après
-- clôture) et l'animateur (par sa session). En scellé c'est le SEUL chemin vers
-- les bulletins — la policy restrictive a fermé la lecture directe.
create or replace function public.event_results_payload(p_event_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_event scrutin_events; v_resolutions jsonb; v_min constant int := 5; v_count int;
begin
  select * into v_event from scrutin_events where id = p_event_id;
  if not found then return jsonb_build_object('status', 'invalid'); end if;

  -- Seuil de dépouillement : sous 5 bulletins, un résultat désigne les votants.
  -- Refusé ICI, en base : un seuil appliqué dans un composant est une décoration.
  if v_event.secret_ballot then
    select count(*) into v_count from scrutin_ballots b
      join scrutin_polls p on p.id = b.poll_id where p.event_id = v_event.id;
    if v_count < v_min then
      return jsonb_build_object('status','too_few','ballots',v_count,'min',v_min,'title',v_event.title);
    end if;
  end if;

  select coalesce(jsonb_agg(obj order by ord), '[]'::jsonb) into v_resolutions
  from (
    select
      p.order_index as ord,
      jsonb_build_object(
        'id', p.id, 'token', p.token, 'question', p.question, 'description', p.description,
        'options', p.options, 'recipe', p.recipe, 'status', p.status,
        'order_index', p.order_index, 'closes_at', p.closes_at,
        'ballots', coalesce((
          select jsonb_agg(jsonb_build_object(
            'ranking', b.ranking, 'grades', b.grades,
            -- En scellé : ni district ni poids. Un attribut rare est un
            -- identifiant, et l'ordre d'insertion trahirait l'ordre de passage.
            'district', case when v_event.secret_ballot then 0 else b.district end,
            'weight', case when v_event.secret_ballot then 1 else coalesce(em.weight, 1) end)
            order by case when v_event.secret_ballot then random() else 0 end)
          from scrutin_ballots b
          left join scrutin_event_members em on em.id = b.event_member_id
          where b.poll_id = p.id
        ), '[]'::jsonb)
      ) as obj
    from scrutin_polls p
    where p.event_id = v_event.id
  ) sub;

  return jsonb_build_object(
    'status', 'closed', 'title', v_event.title, 'quorum', v_event.quorum,
    'secret_ballot', v_event.secret_ballot,
    'convened', (select count(*) from scrutin_event_members where event_id = v_event.id),
    'resolutions', v_resolutions
  );
end $function$;

-- Helper interne : jamais appelable depuis le navigateur. (Contrairement aux RPC
-- de bord ci-dessous, qui DOIVENT rester exécutables par `anon` — voir règle 5
-- du README : révoquer un droit casse le chemin serveur.)
revoke all on function public.event_results_payload(uuid) from public, anon, authenticated;

-- Porte VOTANT : par jeton, et seulement une fois l'événement clos.
create or replace function public.get_event_results(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_member scrutin_event_members; v_event scrutin_events;
begin
  select * into v_member from scrutin_event_members where token = p_token;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  select * into v_event from scrutin_events where id = v_member.event_id;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  if v_event.status <> 'closed' then return jsonb_build_object('status', 'not_closed'); end if;
  return public.event_results_payload(v_event.id);
end $function$;

-- Porte ANIMATEUR : par session. En scellé c'est son seul accès aux bulletins, et
-- il reste soumis au seuil — la RPC ne connaît pas de privilège d'animateur.
create or replace function public.get_event_results_owner(p_event_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_ok boolean;
begin
  select exists (
    select 1 from scrutin_events e
    left join scrutin_spaces s on s.id = e.space_id
    where e.id = p_event_id and (e.owner_id = auth.uid() or s.owner_id = auth.uid())
  ) into v_ok;
  if not v_ok then return jsonb_build_object('status', 'forbidden'); end if;
  return public.event_results_payload(p_event_id);
end $function$;

grant execute on function public.get_event_results_owner(uuid) to authenticated;

-- Qui a déjà voté, pour la relance. En scellé le bulletin ne porte plus
-- l'identité : sans cette RPC, /api/events/[id]/remind trouverait « personne n'a
-- voté » et relancerait TOUT LE MONDE — l'inverse exact de la promesse.
-- Ne renvoie que des identifiants de convoqués, jamais un bulletin.
create or replace function public.get_event_voted_members(p_event_id uuid)
returns uuid[] language plpgsql security definer set search_path to 'public' as $function$
declare v_ok boolean; v_secret boolean; v_ids uuid[];
begin
  select exists (
    select 1 from scrutin_events e
    left join scrutin_spaces s on s.id = e.space_id
    where e.id = p_event_id and (e.owner_id = auth.uid() or s.owner_id = auth.uid())
  ) into v_ok;
  if not v_ok then return null; end if;

  select secret_ballot into v_secret from scrutin_events where id = p_event_id;

  if v_secret then
    select coalesce(array_agg(distinct s.event_member_id), '{}')
      into v_ids
      from scrutin_event_signins s
      join scrutin_polls p on p.id = s.poll_id
     where p.event_id = p_event_id;
  else
    select coalesce(array_agg(distinct b.event_member_id), '{}')
      into v_ids
      from scrutin_ballots b
      join scrutin_polls p on p.id = b.poll_id
     where p.event_id = p_event_id and b.event_member_id is not null;
  end if;
  return v_ids;
end $function$;

grant execute on function public.get_event_voted_members(uuid) to authenticated;
