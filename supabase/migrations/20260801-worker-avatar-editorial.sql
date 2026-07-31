-- LE WORKER DE L'AVATAR ÉDITORIAL — machine à états et journal
--
-- Pourquoi une machine à états, et non un agent en boucle libre. L'avatar
-- publie SANS relecture humaine. Dans ce régime, « ne publie jamais sur un
-- drame en cours » ne peut pas être une consigne adressée à un modèle : un
-- modèle interprète, et une interprétation n'est pas un contrôle. Les garde-fous
-- doivent être exécutables. Ce fichier les rend exécutables ; le modèle, lui, ne
-- fait qu'écrire, et jamais décider de publier.
--
-- Trois décisions structurantes, chacune contre une panne déjà vue ici :
--
-- 1. L'INTERRUPTEUR EST À L'ARRÊT PAR DÉFAUT (`enabled = false`) et la clé du
--    worker est nulle. Une installation neuve ne publie rien. Comme pour le cron
--    (commit 19d944d), une variable oubliée doit couper l'avatar, pas ouvrir la
--    porte. Armer est un acte volontaire, documenté en fin de fichier.
--
-- 2. LE JOURNAL NE DISPARAÎT PAS AVEC LA CAMPAGNE. `on delete set null`, pas
--    CASCADE : le journal EST la trace qui justifie d'avoir publié sans
--    relecture. Le faire disparaître avec son objet reviendrait à effacer la
--    preuve en même temps que le fait. (Même leçon que les bulletins des
--    cercles, tirée dans l'autre sens.)
--
-- 3. AUCUNE COLONNE POUR LE TITRE DE PRESSE. On ne stocke que l'URL et le nom de
--    l'éditeur. Le droit voisin ne couvre ni les liens, ni les faits, mais
--    l'exception « très courts extraits » tombe quand la reprise dispense de
--    consulter la source — ce qu'est exactement un titre. La règle n'est pas
--    écrite dans un commentaire qu'on oublie : elle est rendue IMPOSSIBLE à
--    enfreindre par l'absence de colonne où la stocker.

-- ── Réglages : un seul enregistrement, l'interrupteur et la clé ───────────────
create table if not exists public.scrutin_agent_settings (
  id         smallint primary key default 1 check (id = 1),
  enabled    boolean not null default false,
  key_hash   text,
  updated_at timestamptz not null default now()
);
insert into public.scrutin_agent_settings (id) values (1) on conflict (id) do nothing;

-- ── Campagnes : une question, de sa rédaction à son analyse ───────────────────
create table if not exists public.scrutin_agent_campaigns (
  id                uuid primary key default gen_random_uuid(),
  state             text not null default 'draft'
                      check (state in ('draft','published','closed','analysed','blocked','cancelled')),
  -- La source, RÉDUITE À CE QUI EST LICITE : un lien et un nom d'éditeur.
  source_url        text,
  source_publisher  text,
  -- Ce que l'avatar publie, et qui est de NOUS : une question, une amorce.
  question          text not null,
  options           jsonb not null,
  method            text not null default 'simple_vote',
  -- Le scrutin réel, une fois créé. Le secret est ici parce que le worker doit
  -- pouvoir clôturer plus tard : d'où RLS active SANS policy sur cette table.
  poll_token        text,
  poll_secret       text,
  publish_at        timestamptz not null default now(),
  close_at          timestamptz,
  blocked_reason    text,
  analysis          text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists scrutin_agent_campaigns_due_idx
  on public.scrutin_agent_campaigns (state, publish_at);

-- ── Journal : toute décision éditoriale, y compris les refus ──────────────────
create table if not exists public.scrutin_agent_events (
  id          bigint generated always as identity primary key,
  campaign_id uuid references public.scrutin_agent_campaigns(id) on delete set null,
  at          timestamptz not null default now(),
  from_state  text,
  to_state    text,
  detail      text
);
create index if not exists scrutin_agent_events_at_idx on public.scrutin_agent_events (at desc);

-- Aucune de ces tables n'est lisible par le navigateur : RLS active, AUCUNE
-- policy. La clé anon étant publique, c'est la seule protection qui vaille pour
-- une table qui contient des secrets d'administration.
alter table public.scrutin_agent_settings  enable row level security;
alter table public.scrutin_agent_campaigns enable row level security;
alter table public.scrutin_agent_events    enable row level security;
revoke all on public.scrutin_agent_settings, public.scrutin_agent_campaigns,
              public.scrutin_agent_events from anon, authenticated;

-- ── La garde : clé du worker, et interrupteur ─────────────────────────────────
-- Les routes serveur appellent avec la clé ANON (convention du projet, pas de
-- service-role). N'importe qui peut donc appeler ces fonctions : le secret
-- passé en argument est la vraie garde, exactement comme `close_poll`.
-- `sha256` natif, pas pgcrypto — dont l'absence du search_path a déjà cassé une
-- fonction ici.
create or replace function public.scrutin_agent_armed(p_key text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(
    (select s.enabled
       and s.key_hash is not null
       and s.key_hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex')
     from public.scrutin_agent_settings s where s.id = 1),
    false);
$function$;

-- ── Journalisation interne ────────────────────────────────────────────────────
create or replace function public.scrutin_agent_log(
  p_id uuid, p_from text, p_to text, p_detail text
) returns void
language sql
security definer
set search_path to 'public'
as $function$
  insert into public.scrutin_agent_events (campaign_id, from_state, to_state, detail)
  values (p_id, p_from, p_to, p_detail);
$function$;

-- ── Déposer une question dans la file ─────────────────────────────────────────
create or replace function public.agent_enqueue(
  p_key text, p_question text, p_options jsonb, p_method text,
  p_source_url text, p_source_publisher text,
  p_publish_at timestamptz, p_close_at timestamptz
) returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_id uuid;
begin
  if not public.scrutin_agent_armed(p_key) then return null; end if;
  if p_question is null or length(trim(p_question)) < 8 then return null; end if;
  if p_options is null or jsonb_array_length(p_options) < 2 then return null; end if;

  insert into public.scrutin_agent_campaigns
    (question, options, method, source_url, source_publisher, publish_at, close_at)
  values (trim(p_question), p_options, coalesce(p_method,'simple_vote'),
          p_source_url, p_source_publisher,
          coalesce(p_publish_at, now()), p_close_at)
  returning id into v_id;

  perform public.scrutin_agent_log(v_id, null, 'draft', 'file');
  return v_id;
end; $function$;

-- ── Ce qui est à faire MAINTENANT ─────────────────────────────────────────────
-- Rend vide si l'interrupteur est coupé : arrêter l'avatar ne demande aucun
-- déploiement, juste un UPDATE. C'est l'exigence « couper en trente secondes ».
create or replace function public.agent_due(p_key text)
returns table (
  id uuid, state text, question text, options jsonb, method text,
  source_url text, source_publisher text,
  poll_token text, poll_secret text, close_at timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select c.id, c.state, c.question, c.options, c.method,
         c.source_url, c.source_publisher, c.poll_token, c.poll_secret, c.close_at
  from public.scrutin_agent_campaigns c
  where public.scrutin_agent_armed(p_key)
    and (
      (c.state = 'draft'     and c.publish_at <= now())
      or (c.state = 'published' and c.close_at is not null and c.close_at <= now())
      or c.state = 'closed'
    )
  order by c.publish_at
  limit 20;
$function$;

-- ── Les transitions ───────────────────────────────────────────────────────────
-- Toutes gardées par l'ÉTAT ATTENDU (`and state = …`). Un cron qui se déclenche
-- deux fois — ce qui arrivera : Vercel Hobby dérive de ±59 min et les reprises
-- existent — ne publiera donc pas deux fois : la seconde passe met à jour zéro
-- ligne et renvoie false. L'idempotence est dans le WHERE, pas dans un verrou.
create or replace function public.agent_mark_published(
  p_key text, p_id uuid, p_token text, p_secret text
) returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_n int;
begin
  if not public.scrutin_agent_armed(p_key) then return false; end if;
  update public.scrutin_agent_campaigns
     set state = 'published', poll_token = p_token, poll_secret = p_secret, updated_at = now()
   where id = p_id and state = 'draft';
  get diagnostics v_n = row_count;
  if v_n > 0 then perform public.scrutin_agent_log(p_id, 'draft', 'published', p_token); end if;
  return v_n > 0;
end; $function$;

create or replace function public.agent_mark_closed(p_key text, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_n int;
begin
  if not public.scrutin_agent_armed(p_key) then return false; end if;
  update public.scrutin_agent_campaigns
     set state = 'closed', updated_at = now()
   where id = p_id and state = 'published';
  get diagnostics v_n = row_count;
  if v_n > 0 then perform public.scrutin_agent_log(p_id, 'published', 'closed', null); end if;
  return v_n > 0;
end; $function$;

create or replace function public.agent_mark_analysed(p_key text, p_id uuid, p_analysis text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_n int;
begin
  if not public.scrutin_agent_armed(p_key) then return false; end if;
  update public.scrutin_agent_campaigns
     set state = 'analysed', analysis = p_analysis, updated_at = now()
   where id = p_id and state = 'closed';
  get diagnostics v_n = row_count;
  if v_n > 0 then perform public.scrutin_agent_log(p_id, 'closed', 'analysed', null); end if;
  return v_n > 0;
end; $function$;

-- Le refus est une décision éditoriale : il se journalise comme les autres.
-- Depuis n'importe quel état sauf les états terminaux.
create or replace function public.agent_block(p_key text, p_id uuid, p_reason text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_n int; v_from text;
begin
  if not public.scrutin_agent_armed(p_key) then return false; end if;
  select state into v_from from public.scrutin_agent_campaigns where id = p_id;
  update public.scrutin_agent_campaigns
     set state = 'blocked', blocked_reason = p_reason, updated_at = now()
   where id = p_id and state not in ('blocked','cancelled','analysed');
  get diagnostics v_n = row_count;
  if v_n > 0 then perform public.scrutin_agent_log(p_id, v_from, 'blocked', p_reason); end if;
  return v_n > 0;
end; $function$;

grant execute on function public.agent_enqueue(text,text,jsonb,text,text,text,timestamptz,timestamptz) to anon;
grant execute on function public.agent_due(text) to anon;
grant execute on function public.agent_mark_published(text,uuid,text,text) to anon;
grant execute on function public.agent_mark_closed(text,uuid) to anon;
grant execute on function public.agent_mark_analysed(text,uuid,text) to anon;
grant execute on function public.agent_block(text,uuid,text) to anon;

-- ── ARMER L'AVATAR (acte volontaire, à faire à la main) ───────────────────────
-- Tant que ceci n'a pas été exécuté, `agent_due` rend vide et toute transition
-- renvoie false : le worker tourne à blanc, sans rien publier.
--
--   update public.scrutin_agent_settings
--      set enabled = true,
--          key_hash = encode(sha256(convert_to('<AGENT_WORKER_KEY>','UTF8')),'hex'),
--          updated_at = now()
--    where id = 1;
--
-- Pour l'arrêter net, sans déploiement :
--   update public.scrutin_agent_settings set enabled = false where id = 1;
