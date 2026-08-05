-- P0 — L'IDENTITÉ DE PARTICIPANT.
--
-- POURQUOI. Jusqu'ici un compte connecté n'était JAMAIS un participant, seulement
-- un organisateur : les seules colonnes reliées à auth.users sont owner_id
-- (espaces, événements), created_by (scrutins), et l'admin. L'appartenance à un
-- cercle vit dans scrutin_members, identifiée par un EMAIL et un jeton reçu par
-- courrier ; la participation à un scrutin public vit dans le localStorage du
-- navigateur, donc perdue au changement d'appareil.
--
-- Conséquence mesurée avant d'écrire ce fichier : sur les cinq colonnes d'une vue
-- « ce qui m'attend » (public / créés par moi / auxquels je participe / ouverts
-- par mes cercles / historique), TROIS étaient littéralement incalculables. Pas
-- difficiles à afficher : impossibles à obtenir.
--
-- Ce fichier pose le pont manquant, et rien d'autre. Voir docs/participant-spec.md.

-- ---------------------------------------------------------------- le lien
--
-- TABLE SÉPARÉE, ET C'EST LE CŒUR DU SUJET. On aurait pu ajouter `user_id` sur
-- scrutin_members — mais cette table est lisible par l'ANIMATEUR (policy
-- members_owner). Il apprendrait alors quels membres possèdent un compte Placet,
-- ce qui n'est pas son affaire : le membre lui a donné une adresse, pas son
-- inscription à un service. Même principe que scrutin_event_signins — ce qui ne
-- doit pas être joint est rangé ailleurs.
create table if not exists public.scrutin_member_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references public.scrutin_members(id) on delete cascade,
  linked_at timestamptz not null default now(),
  primary key (user_id, member_id)
);

create index if not exists scrutin_member_links_member_idx
  on public.scrutin_member_links (member_id);

alter table public.scrutin_member_links enable row level security;

-- L'INTÉRESSÉ SEUL lit et défait ses liens. Aucune policy pour l'animateur.
drop policy if exists member_links_read_self on public.scrutin_member_links;
create policy member_links_read_self on public.scrutin_member_links
  for select to public using (user_id = auth.uid());

drop policy if exists member_links_delete_self on public.scrutin_member_links;
create policy member_links_delete_self on public.scrutin_member_links
  for delete to public using (user_id = auth.uid());

-- ⚠️ AUCUNE policy d'INSERT, volontairement. Si l'utilisateur pouvait écrire ses
-- propres liens, un identifiant de membre suffirait à s'attribuer l'appartenance
-- à un cercle dont on ne fait pas partie — et donc à recevoir ses consultations.
-- L'écriture passe exclusivement par la RPC ci-dessous, qui vérifie l'email.
-- Vérifié : une insertion directe sous l'identité d'un compte authentifié est
-- refusée par la RLS.

-- ---------------------------------------------------------------- rattachement
--
-- Rattache le compte courant aux membres qui portent SON adresse — et seulement
-- sur un email VÉRIFIÉ (email_confirmed_at non nul). Sans cette condition,
-- s'inscrire avec l'adresse d'un tiers suffirait à hériter de ses cercles.
--
-- Idempotent : appelée à chaque connexion sans effet de bord (on conflict do
-- nothing), elle renvoie le nombre de liens NOUVELLEMENT créés.
create or replace function public.link_my_memberships()
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare v_email text; v_n integer;
begin
  if auth.uid() is null then return 0; end if;
  select lower(u.email) into v_email
    from auth.users u
   where u.id = auth.uid() and u.email_confirmed_at is not null;
  if v_email is null then return 0; end if;

  insert into scrutin_member_links (user_id, member_id)
  select auth.uid(), m.id
    from scrutin_members m
   where lower(m.email) = v_email
  on conflict do nothing;

  get diagnostics v_n = row_count;
  return v_n;
end $function$;

grant execute on function public.link_my_memberships() to authenticated;

-- ---------------------------------------------------------------- lecture
--
-- Ce que le connecté doit voir : ses cercles, et les consultations qui lui sont
-- ADRESSÉES. On ne lit jamais un bulletin — l'état « répondu » vient de
-- l'émargement en scellé, du rattachement du bulletin sinon. C'est la même règle
-- que get_member_home, étendue à tous ses cercles d'un coup.
--
-- ⚠️ STABLE : la fonction voit l'instantané du DÉBUT de l'instruction. L'appeler
-- dans la même requête SQL que link_my_memberships() ne montre donc pas les liens
-- qui viennent d'être créés — piège rencontré en test, sans conséquence en
-- production où les deux appels sont deux requêtes distinctes.
create or replace function public.get_my_participations()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
begin
  if auth.uid() is null then return jsonb_build_object('status','anonymous'); end if;

  return jsonb_build_object(
    'status', 'ok',
    'circles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'space_id', s.id, 'name', s.name, 'pitch', s.pitch,
        'member_token', m.token, 'since', m.consent_at,
        'solicit_per_day', s.solicit_per_day)
        order by s.name)
      from scrutin_member_links ml
      join scrutin_members m on m.id = ml.member_id
      join scrutin_spaces s on s.id = m.space_id
      where ml.user_id = auth.uid()), '[]'::jsonb),
    'consultations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', e.title, 'status', e.status, 'secret_ballot', e.secret_ballot,
        'audience', e.audience_label, 'closes_at', e.closes_at,
        'circle', s.name, 'token', em.token,
        'voted', case when e.secret_ballot
                   then exists (select 1 from scrutin_event_signins g
                                 join scrutin_polls p on p.id = g.poll_id
                                where p.event_id = e.id and g.event_member_id = em.id)
                   else exists (select 1 from scrutin_ballots b
                                 join scrutin_polls p on p.id = b.poll_id
                                where p.event_id = e.id and b.event_member_id = em.id)
                 end)
        order by e.created_at desc)
      from scrutin_member_links ml
      join scrutin_members m on m.id = ml.member_id
      join scrutin_event_members em on em.member_id = m.id
      join scrutin_events e on e.id = em.event_id
      join scrutin_spaces s on s.id = m.space_id
      where ml.user_id = auth.uid()), '[]'::jsonb)
  );
end $function$;

grant execute on function public.get_my_participations() to authenticated;
