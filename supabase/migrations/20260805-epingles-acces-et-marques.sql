-- INVARIANT D'ACCÈS SUR LES ÉPINGLES + REGISTRE D'HISTORIQUE.
--
-- Règle posée par Guillaume : on accède à un cercle en y étant invité par son
-- responsable (sauf le public, ouvert à tous), et on n'épingle QUE ce à quoi on
-- a accès — les consultations des cercles dont on est participant, ou les
-- éléments publics.
--
-- La première version de toggle_pin acceptait n'importe quel jeton : un jeton
-- est certes inguessable, mais la règle doit être structurelle, pas
-- probabiliste. Et la fonction servait d'oracle de validité de jeton (true =
-- existe). Corrigé : accès vérifié, et le refus rend le MÊME false qu'un jeton
-- inexistant — aucun signal.
--
-- Vérifié en base sous identité authentifiée : public → true ; consultation de
-- mon cercle → true ; privé d'un tiers → false ; jeton inexistant → false
-- identique ; et sous RLS réelle, l'animateur ne voit ni épingles ni marques.

create or replace function public.toggle_pin(p_token text)
returns boolean language plpgsql security definer set search_path to 'public' as $function$
declare v_id uuid; v_ok boolean; v_exists boolean;
begin
  if auth.uid() is null then return false; end if;
  select id into v_id from scrutin_polls where token = p_token;
  if v_id is null then return false; end if;

  -- A-t-on ACCÈS à ce scrutin ? Quatre titres, du plus public au plus intime :
  select
    -- 1. il est public et approuvé — tout le monde y a accès ;
    exists (select 1 from scrutin_polls p
             where p.id = v_id and p.visibility = 'public' and p.moderation_status = 'approved')
    -- 2. je l'ai créé ;
    or exists (select 1 from scrutin_polls p where p.id = v_id and p.created_by = auth.uid())
    -- 3. j'anime l'événement ou l'espace qui le porte ;
    or exists (select 1 from scrutin_polls p
                join scrutin_events e on e.id = p.event_id
                left join scrutin_spaces s on s.id = e.space_id
               where p.id = v_id and (e.owner_id = auth.uid() or s.owner_id = auth.uid()))
    -- 4. il m'est ADRESSÉ : je suis convoqué via un cercle dont je suis membre
    --    rattaché (scrutin_member_links, donc email vérifié).
    or exists (select 1 from scrutin_polls p
                join scrutin_event_members em on em.event_id = p.event_id
                join scrutin_member_links ml on ml.member_id = em.member_id
               where p.id = v_id and ml.user_id = auth.uid())
  into v_ok;
  if not v_ok then return false; end if;

  select exists (select 1 from scrutin_pins where user_id = auth.uid() and poll_id = v_id)
    into v_exists;
  if v_exists then
    delete from scrutin_pins where user_id = auth.uid() and poll_id = v_id;
    return false;
  end if;
  insert into scrutin_pins (user_id, poll_id) values (auth.uid(), v_id)
    on conflict do nothing;
  return true;
end $function$;

grant execute on function public.toggle_pin(text) to authenticated;

-- ---------------------------------------------------------------- historique
--
-- DETTE : l'historique des votes publics vivait dans le localStorage, donc
-- mourait avec l'appareil. Registre (compte, scrutin) sur le modèle de
-- l'émargement : QUE le fait d'avoir participé, jamais le bulletin, et une date
-- au JOUR près — une horodate fine serait un canal de jointure avec le bulletin.
create table if not exists public.scrutin_vote_marks (
  user_id uuid not null references auth.users(id) on delete cascade,
  poll_id uuid not null references public.scrutin_polls(id) on delete cascade,
  marked_on date not null default current_date,
  primary key (user_id, poll_id)
);

alter table public.scrutin_vote_marks enable row level security;

-- L'intéressé seul lit et efface. L'écriture passe par la RPC (résolution par
-- jeton) — une auto-inscription frauduleuse serait de toute façon sans enjeu :
-- ce n'est que SON propre historique, elle ne donne aucun droit.
drop policy if exists vote_marks_self on public.scrutin_vote_marks;
create policy vote_marks_self on public.scrutin_vote_marks
  for select to public using (user_id = auth.uid());
drop policy if exists vote_marks_delete_self on public.scrutin_vote_marks;
create policy vote_marks_delete_self on public.scrutin_vote_marks
  for delete to public using (user_id = auth.uid());

-- Idempotente, silencieuse, sans effet pour l'anonyme : appelée depuis les DEUX
-- chemins de vote client (public et par lien), elle ne doit jamais faire
-- échouer un vote.
create or replace function public.mark_my_vote(p_token text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_id uuid;
begin
  if auth.uid() is null then return; end if;
  select id into v_id from scrutin_polls where token = p_token;
  if v_id is null then return; end if;
  insert into scrutin_vote_marks (user_id, poll_id) values (auth.uid(), v_id)
    on conflict do nothing;
end $function$;

grant execute on function public.mark_my_vote(text) to authenticated;

-- ---------------------------------------------------------------- lectures
--
-- Mes épingles, les DEUX sortes : cartes publiques (route /v) et consultations
-- de cercle qui me sont adressées (route /e, par MON jeton de convoqué).
-- L'invariant d'accès garantit que tout ce qui a pu être épinglé m'est visible.
create or replace function public.get_my_pins()
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select coalesce(jsonb_agg(row_to_json(x) order by x.pinned_at desc), '[]'::jsonb) from (
    select
      case when em.token is not null then 'circle' else 'poll' end as kind,
      coalesce(e.title, p.question) as title,
      p.question,
      case when em.token is not null then em.token else p.token end as url_token,
      case when em.token is not null then 'e' else 'v' end as route,
      s.name as circle,
      p.status, p.closes_at, pin.pinned_at
    from scrutin_pins pin
    join scrutin_polls p on p.id = pin.poll_id
    left join scrutin_events e on e.id = p.event_id
    left join scrutin_spaces s on s.id = e.space_id
    left join lateral (
      select em2.token from scrutin_event_members em2
        join scrutin_member_links ml on ml.member_id = em2.member_id
       where em2.event_id = p.event_id and ml.user_id = auth.uid()
       limit 1
    ) em on true
    where pin.user_id = auth.uid()
  ) x;
$function$;

grant execute on function public.get_my_pins() to authenticated;

-- Le feed « Mes participations » gagne les votes hors cercle (publics ou par
-- lien) : c'est une PARTICIPATION, pas une création — sa place est ici et non
-- dans « Mes consultations », aucun doublon réintroduit.
create or replace function public.get_my_feed()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('status','anonymous'); end if;

  return jsonb_build_object(
    'status', 'ok',
    'circles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'space_id', s.id, 'name', s.name, 'pitch', s.pitch,
        'member_token', m.token, 'since', m.consent_at,
        'solicit_per_day', s.solicit_per_day) order by s.name)
      from scrutin_member_links ml
      join scrutin_members m on m.id = ml.member_id
      join scrutin_spaces s on s.id = m.space_id
      where ml.user_id = v_uid), '[]'::jsonb),
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
    'answered', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', e.title, 'circle', s.name, 'token', em.token,
        'secret_ballot', e.secret_ballot, 'audience', e.audience_label,
        'status', e.status, 'closes_at', e.closes_at)
        order by e.created_at desc)
      from scrutin_member_links ml
      join scrutin_members m on m.id = ml.member_id
      join scrutin_event_members em on em.member_id = m.id
      join scrutin_events e on e.id = em.event_id
      join scrutin_spaces s on s.id = m.space_id
      where ml.user_id = v_uid
        and (e.status = 'closed'
             or (case when e.secret_ballot
                   then exists (select 1 from scrutin_event_signins g
                                 join scrutin_polls p on p.id = g.poll_id
                                where p.event_id = e.id and g.event_member_id = em.id)
                   else exists (select 1 from scrutin_ballots b
                                 join scrutin_polls p on p.id = b.poll_id
                                where p.event_id = e.id and b.event_member_id = em.id)
                 end))), '[]'::jsonb),
    'publicVotes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'question', p.question, 'token', p.token, 'status', p.status,
        'closes_at', p.closes_at, 'marked_on', vm.marked_on)
        order by vm.marked_on desc)
      from scrutin_vote_marks vm
      join scrutin_polls p on p.id = vm.poll_id
      where vm.user_id = v_uid), '[]'::jsonb)
  );
end $function$;

grant execute on function public.get_my_feed() to authenticated;
