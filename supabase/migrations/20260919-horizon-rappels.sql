-- Rappels personnels de la page Horizon. Le lien reste autonome ; ces tables
-- ne reçoivent des données que lorsqu'une personne active explicitement les
-- rappels après connexion.

create table if not exists public.scrutin_horizon_rappels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  naissance date not null check (naissance between date '1908-01-01' and date '2022-12-31'),
  sexe text not null check (sexe in ('f', 'm')),
  prenom text not null check (length(btrim(prenom)) between 1 and 40),
  anniversaire boolean not null default true,
  seuils boolean not null default true,
  retraite boolean not null default true,
  prochain_seuil int check (prochain_seuil in (30, 20, 10, 5, 1)),
  fuseau text not null default 'Europe/Paris' check (length(fuseau) between 3 and 64 and fuseau ~ '^[A-Za-z0-9_+/-]+$'),
  langue text not null default 'fr' check (langue in ('fr', 'en', 'es', 'pcm')),
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);
create unique index if not exists scrutin_horizon_rappels_identite
  on public.scrutin_horizon_rappels(user_id, naissance, sexe, lower(prenom));
alter table public.scrutin_horizon_rappels enable row level security;
revoke all on table public.scrutin_horizon_rappels from public, anon, authenticated;

create table if not exists public.scrutin_horizon_rappels_envoyes (
  rappel_id uuid not null references public.scrutin_horizon_rappels(id) on delete cascade,
  genre text not null check (genre in ('anniversaire', 'seuil', 'retraite')),
  repere text not null,
  cree_le timestamptz not null default now(),
  primary key (rappel_id, genre, repere)
);
alter table public.scrutin_horizon_rappels_envoyes enable row level security;
revoke all on table public.scrutin_horizon_rappels_envoyes from public, anon, authenticated;

create or replace function public.scrutin_horizon_rappel_lire(
  p_naissance date, p_sexe text, p_prenom text
) returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare v_uid uuid := auth.uid(); v_r record;
begin
  if v_uid is null then return jsonb_build_object('status', 'refus'); end if;
  select * into v_r from scrutin_horizon_rappels
   where user_id = v_uid and naissance = p_naissance and sexe = p_sexe
     and lower(prenom) = lower(btrim(p_prenom)) limit 1;
  if not found then return jsonb_build_object('status', 'absent'); end if;
  return jsonb_build_object(
    'status', 'ok', 'id', v_r.id, 'anniversaire', v_r.anniversaire,
    'seuils', v_r.seuils, 'retraite', v_r.retraite,
    'appareils', (select count(*) from scrutin_push_subscriptions s where s.user_id = v_uid)
  );
end $function$;

create or replace function public.scrutin_horizon_rappel_enregistrer(
  p_naissance date, p_sexe text, p_prenom text,
  p_anniversaire boolean, p_seuils boolean, p_retraite boolean,
  p_restant numeric, p_fuseau text, p_langue text
) returns jsonb language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid(); v_id uuid; v_seuil int; v_fuseau text; v_langue text;
begin
  if v_uid is null then return jsonb_build_object('status', 'refus'); end if;
  if p_naissance is null or p_naissance < date '1908-01-01' or p_naissance > date '2022-12-31'
     or p_sexe not in ('f', 'm') or length(btrim(coalesce(p_prenom, ''))) not between 1 and 40
     or p_anniversaire is null or p_seuils is null or p_retraite is null
     or not (p_anniversaire or p_seuils or p_retraite)
     or p_restant is null or p_restant < 0 or p_restant > 120 then
    return jsonb_build_object('status', 'invalide');
  end if;
  v_langue := case when p_langue in ('fr', 'en', 'es', 'pcm') then p_langue else 'fr' end;
  select name into v_fuseau from pg_timezone_names where name = p_fuseau limit 1;
  v_fuseau := coalesce(v_fuseau, 'Europe/Paris');
  v_seuil := case when p_restant > 30 then 30 when p_restant > 20 then 20
                  when p_restant > 10 then 10 when p_restant > 5 then 5
                  when p_restant > 1 then 1 else null end;

  select id into v_id from scrutin_horizon_rappels
   where user_id = v_uid and naissance = p_naissance and sexe = p_sexe
     and lower(prenom) = lower(btrim(p_prenom)) limit 1;
  if v_id is null then
    insert into scrutin_horizon_rappels
      (user_id, naissance, sexe, prenom, anniversaire, seuils, retraite, prochain_seuil, fuseau, langue)
    values
      (v_uid, p_naissance, p_sexe, btrim(p_prenom), p_anniversaire, p_seuils, p_retraite, v_seuil, v_fuseau, v_langue)
    returning id into v_id;
  else
    update scrutin_horizon_rappels set
      prenom = btrim(p_prenom), anniversaire = p_anniversaire, seuils = p_seuils,
      retraite = p_retraite, fuseau = v_fuseau, langue = v_langue, maj_le = now()
    where id = v_id and user_id = v_uid;
  end if;
  return public.scrutin_horizon_rappel_lire(p_naissance, p_sexe, p_prenom);
end $function$;

create or replace function public.scrutin_horizon_rappel_supprimer(p_id uuid)
returns boolean language sql volatile security definer set search_path to 'public' as $function$
  with deleted as (
    delete from scrutin_horizon_rappels where id = p_id and user_id = auth.uid() returning 1
  ) select exists(select 1 from deleted);
$function$;

-- Lecture serveur : une ligne par appareil, uniquement pendant l'heure locale
-- choisie. La route Next recalcule ensuite l'horizon depuis la table figée.
create or replace function public.scrutin_horizon_rappels_a_evaluer(p_secret text)
returns table(
  rappel uuid, naissance date, sexe text, prenom text,
  anniversaire boolean, seuils boolean, retraite boolean, prochain_seuil int,
  fuseau text, langue text, cree_le timestamptz,
  endpoint text, p256dh text, auth text
) language sql stable security definer set search_path to 'public' as $function$
  select r.id, r.naissance, r.sexe, r.prenom, r.anniversaire, r.seuils,
         r.retraite, r.prochain_seuil, r.fuseau, r.langue, r.cree_le,
         s.endpoint, s.p256dh, s.auth
    from scrutin_horizon_rappels r
    join scrutin_push_subscriptions s on s.user_id = r.user_id
   where notify_secret_ok(p_secret)
     and extract(hour from now() at time zone r.fuseau)::int = 9
     and (r.anniversaire or r.seuils or r.retraite);
$function$;

create or replace function public.scrutin_horizon_rappel_reserver(
  p_secret text, p_id uuid, p_genre text, p_repere text
) returns boolean language plpgsql volatile security definer set search_path to 'public' as $function$
declare v_current int; v_inserted int;
begin
  if not notify_secret_ok(p_secret) or p_genre not in ('anniversaire', 'seuil', 'retraite') then return false; end if;
  if p_genre = 'seuil' then
    select prochain_seuil into v_current from scrutin_horizon_rappels where id = p_id for update;
    if v_current is null or v_current::text <> p_repere then return false; end if;
  end if;
  insert into scrutin_horizon_rappels_envoyes(rappel_id, genre, repere)
    values (p_id, p_genre, p_repere) on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return false; end if;
  if p_genre = 'seuil' then
    update scrutin_horizon_rappels set prochain_seuil = case v_current
      when 30 then 20 when 20 then 10 when 10 then 5 when 5 then 1 else null end,
      maj_le = now() where id = p_id;
  end if;
  return true;
end $function$;

revoke all on function public.scrutin_horizon_rappel_lire(date, text, text) from public, anon, authenticated;
revoke all on function public.scrutin_horizon_rappel_enregistrer(date, text, text, boolean, boolean, boolean, numeric, text, text) from public, anon, authenticated;
revoke all on function public.scrutin_horizon_rappel_supprimer(uuid) from public, anon, authenticated;
revoke all on function public.scrutin_horizon_rappels_a_evaluer(text) from public, anon, authenticated;
revoke all on function public.scrutin_horizon_rappel_reserver(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.scrutin_horizon_rappel_lire(date, text, text) to authenticated;
grant execute on function public.scrutin_horizon_rappel_enregistrer(date, text, text, boolean, boolean, boolean, numeric, text, text) to authenticated;
grant execute on function public.scrutin_horizon_rappel_supprimer(uuid) to authenticated;
grant execute on function public.scrutin_horizon_rappels_a_evaluer(text) to anon;
grant execute on function public.scrutin_horizon_rappel_reserver(text, uuid, text, text) to anon;

select cron.unschedule('scrutin-horizon-rappels')
 where exists (select 1 from cron.job where jobname = 'scrutin-horizon-rappels');
select cron.schedule('scrutin-horizon-rappels', '19 * * * *', $cron$
  select net.http_post(
    url := 'https://placet.app/api/cron/horizon-rappels',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' ||
        (select c.value from public.scrutin_config c where c.key = 'notify_secret')),
    body := '{}'::jsonb);
$cron$);
