-- Cercles, lot 2 — l'adhésion.
--
-- POURQUOI. Le socle « espace → membres » existait, mais l'adhésion vivait sur
-- l'ÉVÉNEMENT (`scrutin_events.enroll_token`) et `self_enroll` insérait avec
-- `member_id = NULL` : l'auto-inscrit n'entrait JAMAIS dans le roster. Un cercle
-- veut exactement l'inverse — on rejoint le groupe, pas une réunion.
--
-- Un espace EST un cercle si et seulement si `join_open`. Pas de table nouvelle
-- pour l'objet « cercle », et défaut `false` : aucun espace existant ne change.
--
-- Deux garanties portées par ce fichier, et non par l'interface :
--   1. personne n'entre dans le roster sans avoir cliqué (file d'attente) ;
--   2. le formulaire public ne révèle JAMAIS si une adresse est déjà membre —
--      sinon il devient un oracle d'appartenance et un outil d'envoi d'emails.
--
-- Spec : docs/cercles-spec.md.

-- ---------------------------------------------------------------- schéma

alter table public.scrutin_spaces
  add column if not exists join_token text not null default encode(gen_random_bytes(9), 'hex'),
  add column if not exists join_open boolean not null default false,
  add column if not exists join_cap integer,
  add column if not exists join_closes_at timestamptz,
  add column if not exists pitch text,
  -- NULL = aucune limite (« je ne m'engage pas ») : la page d'adhésion n'affiche
  -- alors AUCUN chiffre et ne promet rien. Une valeur = engagement opposable,
  -- refusé en base au lot 3.
  add column if not exists solicit_per_day smallint default 1;

create unique index if not exists scrutin_spaces_join_token_key
  on public.scrutin_spaces (join_token);

comment on column public.scrutin_spaces.join_open is
  'Un espace EST un cercle si et seulement si join_open. Pas de table « cercles ».';
comment on column public.scrutin_spaces.solicit_per_day is
  'Plafond de consultations par jour, réglable par cercle. NULL = aucune limite, et alors on n''affiche aucun chiffre au membre.';

-- Le jeton stable du membre : ce qui manquait pour qu'il ait une adresse à lui
-- (`/m/<token>`), indépendante de tout événement.
alter table public.scrutin_members
  add column if not exists token text not null default encode(gen_random_bytes(9), 'hex'),
  add column if not exists self_joined boolean not null default false,
  add column if not exists consent_at timestamptz,
  add column if not exists consent_source text;

create unique index if not exists scrutin_members_token_key
  on public.scrutin_members (token);

-- Le dédoublonnage par email était 100 % côté client (SpaceDashboard.tsx) : sans
-- cet index, ouvrir un lien public créait des doublons dès la première course.
-- Vérifié avant pose : aucun doublon existant.
create unique index if not exists scrutin_members_space_email_key
  on public.scrutin_members (space_id, lower(email))
  where email is not null and btrim(email) <> '';

-- La file d'attente du double opt-in. Personne n'entre dans le roster tant qu'il
-- n'a pas cliqué : c'est ce qui empêche d'inscrire un tiers à son insu, et ce qui
-- permet de répondre « ok » à tout le monde sans créer d'oracle d'appartenance.
create table if not exists public.scrutin_join_requests (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.scrutin_spaces(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '72 hours',
  confirmed_at timestamptz
);

-- Une seule demande vivante par (cercle, email) : borne le débit d'emails de
-- confirmation, donc empêche d'utiliser le formulaire comme outil d'envoi.
create unique index if not exists scrutin_join_requests_pending_key
  on public.scrutin_join_requests (space_id, lower(email))
  where confirmed_at is null;

create index if not exists scrutin_join_requests_expiry_idx
  on public.scrutin_join_requests (expires_at) where confirmed_at is null;

-- RLS active, ZÉRO policy : la file contient des emails NON confirmés — elle ne
-- doit être lisible ni par anon, ni par l'animateur.
alter table public.scrutin_join_requests enable row level security;

-- ---------------------------------------------------------------- adhésion

-- Vitrine publique du cercle, sans jeton ni secret. Ne renvoie AUCUN effectif :
-- dans un petit cercle, la taille est déjà une information sur les répondants.
create or replace function public.get_circle_info(p_join_token text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare s scrutin_spaces; v_count integer;
begin
  select * into s from scrutin_spaces where join_token = p_join_token;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  if not s.join_open then return jsonb_build_object('status', 'closed'); end if;
  if s.join_closes_at is not null and now() > s.join_closes_at then
    return jsonb_build_object('status', 'closed');
  end if;
  if s.join_cap is not null then
    select count(*) into v_count from scrutin_members where space_id = s.id and self_joined;
    if v_count >= s.join_cap then return jsonb_build_object('status', 'full', 'name', s.name); end if;
  end if;
  return jsonb_build_object(
    'status', 'open', 'name', s.name, 'pitch', s.pitch,
    -- NULL renvoyé tel quel : la page n'affichera alors aucun engagement de
    -- fréquence, plutôt qu'un chiffre générique que ce cercle n'a pas pris.
    'solicit_per_day', s.solicit_per_day
  );
end $function$;

grant execute on function public.get_circle_info(text) to anon, authenticated;

-- Demande d'adhésion. Gardée par le SECRET SERVEUR vérifié dans le corps (patron
-- `self_enroll`) — et donc exécutable par `anon`, puisque la route serveur
-- l'appelle avec la clé publique. La révoquer la rendrait simplement inappelable
-- (500) : c'est exactement le piège décrit par la règle 5 du README.
--
-- INVARIANT ANTI-ÉNUMÉRATION : dès lors que le cercle est ouvert, le statut rendu
-- est 'ok' — adresse déjà membre, inconnue ou demande en cours. Le champ `kind`
-- dit au SERVEUR quel email écrire ; il ne redescend jamais au navigateur.
create or replace function public.request_join_circle(
  p_secret text, p_join_token text, p_name text, p_email text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  s scrutin_spaces; v_count integer; v_existing scrutin_members; v_req scrutin_join_requests;
  v_name text := nullif(btrim(p_name), '');
  v_email text := lower(nullif(btrim(p_email), ''));
begin
  if not notify_secret_ok(p_secret) then return jsonb_build_object('status', 'forbidden'); end if;
  if v_name is null or v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into s from scrutin_spaces where join_token = p_join_token;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  if not s.join_open or (s.join_closes_at is not null and now() > s.join_closes_at) then
    return jsonb_build_object('status', 'closed');
  end if;
  if s.join_cap is not null then
    select count(*) into v_count from scrutin_members where space_id = s.id and self_joined;
    if v_count >= s.join_cap then return jsonb_build_object('status', 'full'); end if;
  end if;

  -- Déjà membre : on répond 'ok' comme pour tout le monde, et on lui renvoie SON
  -- lien par email. Le propriétaire de l'adresse est le seul à l'apprendre.
  select * into v_existing from scrutin_members
    where space_id = s.id and lower(email) = v_email limit 1;
  if found then
    return jsonb_build_object('status','ok','kind','already','token',v_existing.token,
                              'name',v_existing.name,'circle',s.name);
  end if;

  -- Balayage : demandes périmées (sinon l'index d'unicité bloquerait à vie une
  -- adresse jamais confirmée) ET demandes confirmées de plus de 72 h, qui ne
  -- servent plus qu'à dupliquer une donnée personnelle déjà dans le roster.
  delete from scrutin_join_requests
   where space_id = s.id
     and ((confirmed_at is null and expires_at < now())
       or (confirmed_at is not null and confirmed_at < now() - interval '72 hours'));

  select * into v_req from scrutin_join_requests
    where space_id = s.id and lower(email) = v_email and confirmed_at is null limit 1;
  if found then
    -- Demande déjà en cours : pas de nouvel email avant 10 minutes. Borne le
    -- débit par adresse ET par cercle.
    if v_req.created_at > now() - interval '10 minutes' then
      return jsonb_build_object('status', 'ok', 'kind', 'throttled');
    end if;
    update scrutin_join_requests
       set created_at = now(), expires_at = now() + interval '72 hours', name = v_name
     where id = v_req.id returning * into v_req;
  else
    insert into scrutin_join_requests (space_id, name, email)
      values (s.id, v_name, v_email) returning * into v_req;
  end if;

  return jsonb_build_object('status','ok','kind','confirm','token',v_req.token,
                            'name',v_name,'circle',s.name);
end $function$;

grant execute on function public.request_join_circle(text,text,text,text) to anon, authenticated;

-- Confirmation. Déclenchée par un POST (jamais un GET) : les passerelles
-- anti-phishing d'entreprise visitent les liens des emails pour les inspecter et
-- valideraient le double opt-in toutes seules. Vérifié : charger la page de
-- confirmation ne crée aucun membre.
create or replace function public.confirm_join_circle(p_secret text, p_request_token text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare r scrutin_join_requests; s scrutin_spaces; m scrutin_members;
begin
  if not notify_secret_ok(p_secret) then return jsonb_build_object('status', 'forbidden'); end if;
  select * into r from scrutin_join_requests where token = p_request_token;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  select * into s from scrutin_spaces where id = r.space_id;
  if not found then return jsonb_build_object('status', 'invalid'); end if;

  -- Déjà confirmée : on rejoue le résultat plutôt que d'échouer. Un second clic
  -- (ou un client mail qui rejoue la requête) doit atterrir sur sa page.
  if r.confirmed_at is not null then
    select * into m from scrutin_members where space_id = r.space_id and lower(email) = lower(r.email);
    if found then
      return jsonb_build_object('status','ok','token',m.token,'name',m.name,'circle',s.name);
    end if;
    return jsonb_build_object('status', 'expired');
  end if;
  if r.expires_at < now() then return jsonb_build_object('status', 'expired'); end if;

  -- L'animateur a pu ajouter l'adresse entre-temps : on se rattache à la ligne
  -- existante au lieu de heurter l'index d'unicité.
  insert into scrutin_members (space_id, name, email, weight, self_joined, consent_at, consent_source)
    values (r.space_id, r.name, lower(r.email), 1, true, now(), 'link')
  on conflict (space_id, lower(email)) where email is not null and btrim(email) <> ''
    do update set consent_at = coalesce(scrutin_members.consent_at, now()),
                  consent_source = coalesce(scrutin_members.consent_source, 'link')
  returning * into m;

  update scrutin_join_requests set confirmed_at = now() where id = r.id;
  return jsonb_build_object('status','ok','token',m.token,'name',m.name,'circle',s.name);
end $function$;

grant execute on function public.confirm_join_circle(text,text) to anon, authenticated;

-- ---------------------------------------------------------------- page membre

-- STABLE et sans effet de bord : cette page est ouverte depuis chaque email, elle
-- ne doit rien écrire.
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
    'name', m.name, 'email', m.email,
    'self_joined', m.self_joined, 'consent_at', m.consent_at,
    'consultations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', e.title, 'status', e.status, 'secret_ballot', e.secret_ballot,
        'closes_at', e.closes_at,
        -- Son jeton d'événement : aussi personnel que celui qu'il détient déjà
        -- pour être ici. Rien de nouveau n'est divulgué.
        'token', em.token,
        'voted', case when e.secret_ballot
                   then exists (select 1 from scrutin_event_signins g
                                 join scrutin_polls p on p.id = g.poll_id
                                where p.event_id = e.id and g.event_member_id = em.id)
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

-- Le retrait, en un clic, depuis n'importe quel email. Le jeton EST le titre : il
-- vient de la boîte du destinataire, comme `get_event_context`.
--
-- Le point délicat : `scrutin_ballots.event_member_id` est en ON DELETE CASCADE.
-- Supprimer brutalement les convocations effacerait des bulletins et donc
-- MODIFIERAIT le résultat d'une assemblée déjà close. D'où la distinction :
--   événement clos     -> on anonymise la convocation (le décompte survit)
--   événement en cours -> on la supprime (il se retire, son bulletin part avec)
-- Sur une consultation SCELLÉE, le bulletin porte event_member_id NULL : il n'est
-- touché dans aucun des deux cas. C'est la vertu du lot 1 — le droit à
-- l'effacement s'exerce sans détruire le vote, parce que le vote n'a jamais porté
-- son nom.
--
-- Le `delete` sur scrutin_join_requests a été ajouté après un test de bout en
-- bout : sans lui, la demande d'adhésion survivait AVEC le nom et l'email, alors
-- que l'écran promettait « vos données ont été effacées ».
create or replace function public.leave_circle(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare m scrutin_members; s scrutin_spaces;
begin
  select * into m from scrutin_members where token = p_token;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  select * into s from scrutin_spaces where id = m.space_id;

  -- `extensions.` est obligatoire : pgcrypto vit hors du search_path verrouillé.
  update scrutin_event_members em
     set name = '—', email = null, member_id = null,
         token = encode(extensions.gen_random_bytes(9), 'hex')
    from scrutin_events e
   where e.id = em.event_id and em.member_id = m.id and e.status = 'closed';

  delete from scrutin_event_members em
   using scrutin_events e
   where e.id = em.event_id and em.member_id = m.id and e.status <> 'closed';

  if m.email is not null then
    delete from scrutin_join_requests
     where space_id = m.space_id and lower(email) = lower(m.email);
  end if;

  delete from scrutin_members where id = m.id;
  return jsonb_build_object('status', 'ok', 'circle', coalesce(s.name, ''));
end $function$;

grant execute on function public.leave_circle(text) to anon, authenticated;

-- ------------------------------------------------------------- email obligatoire
-- Décision 3 de la spec. Un membre sans adresse est silencieusement injoignable :
-- jamais convoqué (la convocation filtre sur email) et sans moyen d'exercer son
-- retrait. Ce n'est pas un membre, c'est une donnée personnelle orpheline.
-- Refusé en base, sinon la règle n'est qu'un commentaire.

create or replace function public.scrutin_circle_member_needs_email()
returns trigger language plpgsql set search_path to 'public' as $function$
begin
  if nullif(btrim(coalesce(new.email, '')), '') is null
     and exists (select 1 from scrutin_spaces where id = new.space_id and join_open) then
    raise exception 'circle_member_needs_email'
      using hint = 'Dans un cercle, chaque membre doit avoir une adresse email.';
  end if;
  return new;
end $function$;

drop trigger if exists scrutin_members_circle_email on public.scrutin_members;
create trigger scrutin_members_circle_email
  before insert or update on public.scrutin_members
  for each row execute function public.scrutin_circle_member_needs_email();

-- Symétrique : on n'ouvre pas un cercle en laissant derrière soi des membres
-- injoignables. Le contrôle doit exister aux DEUX bouts, sinon il suffit
-- d'ajouter les membres avant d'ouvrir pour le contourner.
create or replace function public.scrutin_space_open_needs_emails()
returns trigger language plpgsql set search_path to 'public' as $function$
declare v_orphans integer;
begin
  if new.join_open and not coalesce(old.join_open, false) then
    select count(*) into v_orphans from scrutin_members
     where space_id = new.id and nullif(btrim(coalesce(email, '')), '') is null;
    if v_orphans > 0 then
      raise exception 'circle_members_without_email:%', v_orphans
        using hint = 'Renseignez une adresse pour chaque membre avant d''ouvrir le cercle.';
    end if;
  end if;
  return new;
end $function$;

drop trigger if exists scrutin_spaces_open_emails on public.scrutin_spaces;
create trigger scrutin_spaces_open_emails
  before update on public.scrutin_spaces
  for each row execute function public.scrutin_space_open_needs_emails();
