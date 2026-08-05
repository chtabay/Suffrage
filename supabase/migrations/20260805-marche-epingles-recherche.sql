-- VUE MARCHÉ — le modèle : épingler et chercher.
--
-- POURQUOI. Le feed public rendait 12 cartes par ordre de publication, sans
-- recherche ni moyen de garder un scrutin sous la main. C'est une vitrine, pas un
-- endroit où l'on revient. Épingler et chercher sont les deux gestes qui font la
-- différence entre « regarder » et « suivre ».
--
-- CE QUE CE FICHIER NE FAIT PAS : dupliquer le feed. On étend get_public_polls,
-- qui reste la seule source des cartes publiques — une seconde fonction aurait
-- fini par en diverger.

-- ---------------------------------------------------------------- épingles
--
-- Contrairement à scrutin_member_links, l'écriture par l'intéressé est ici SANS
-- danger : épingler ne donne aucun droit sur le scrutin, c'est un marque-page.
-- La policy autorise donc l'insertion, bornée à soi-même.
create table if not exists public.scrutin_pins (
  user_id uuid not null references auth.users(id) on delete cascade,
  poll_id uuid not null references public.scrutin_polls(id) on delete cascade,
  pinned_at timestamptz not null default now(),
  primary key (user_id, poll_id)
);

create index if not exists scrutin_pins_user_idx on public.scrutin_pins (user_id, pinned_at desc);

alter table public.scrutin_pins enable row level security;

drop policy if exists pins_self on public.scrutin_pins;
create policy pins_self on public.scrutin_pins
  for all to public
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Épingler / désépingler par JETON : le client manipule des jetons, pas des
-- identifiants. Un jeton est déjà un titre d'accès — le détenir suffit à voir le
-- scrutin, donc à vouloir le garder sous la main. Renvoie le NOUVEL état.
create or replace function public.toggle_pin(p_token text)
returns boolean language plpgsql security definer set search_path to 'public' as $function$
declare v_id uuid; v_exists boolean;
begin
  if auth.uid() is null then return false; end if;
  select id into v_id from scrutin_polls where token = p_token;
  if v_id is null then return false; end if;

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

-- ---------------------------------------------------------------- le feed
--
-- ⚠️ On SUPPRIME l'ancienne signature avant de créer la nouvelle. Deux surcharges
-- dont l'une n'ajoute qu'un paramètre à défaut rendent tout appel AMBIGU
-- (« could not choose a best candidate function ») — piège déjà rencontré sur
-- open_circle_consultation. PostgREST résolvant par NOMS d'arguments, l'appelant
-- existant qui n'envoie que p_limit reste routé sans changement.
--
-- VÉRIFIÉ PAR HTTP RÉEL, comme l'exige la règle 5 du README : l'appel historique
-- {"p_limit":12} rend 200 et ses cartes ; l'appel {"p_search":"%"} rend [].
drop function if exists public.get_public_polls(integer, timestamptz);

create or replace function public.get_public_polls(
  p_limit integer default 12,
  p_before timestamptz default null,
  p_search text default null,
  p_pinned_only boolean default false)
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) from (
    select p.token, p.question, p.description, p.options, p.recipe,
           p.status, p.closes_at, p.published_at,
           (select count(*) from public.scrutin_ballots b where b.poll_id = p.id) as ballot_count,
           -- `pinned` vaut toujours false pour un visiteur anonyme : la même RPC
           -- sert la page publique (clé anon, rendue côté serveur) et la vue
           -- connectée, sans branche ni seconde fonction.
           exists (select 1 from public.scrutin_pins pin
                    where pin.poll_id = p.id and pin.user_id = auth.uid()) as pinned
    from public.scrutin_polls p
    where p.visibility = 'public' and p.moderation_status = 'approved'
      and (p_before is null or p.published_at < p_before)
      -- Recherche : les jokers de LIKE sont ÉCHAPPÉS. Sans cela un `%` saisi par
      -- un visiteur ramènerait tout le catalogue et un `_` n'importe quoi.
      -- Vérifié : la recherche « % » rend 0 résultat, pas 3.
      and (nullif(btrim(coalesce(p_search, '')), '') is null
           or p.question || ' ' || coalesce(p.description, '')
              ilike '%' || replace(replace(replace(btrim(p_search), '\', '\\'), '%', '\%'), '_', '\_') || '%'
              escape '\')
      and (not coalesce(p_pinned_only, false)
           or exists (select 1 from public.scrutin_pins pin
                       where pin.poll_id = p.id and pin.user_id = auth.uid()))
    -- Les épinglés d'abord : c'est le sens même de l'épingle.
    order by exists (select 1 from public.scrutin_pins pin
                      where pin.poll_id = p.id and pin.user_id = auth.uid()) desc,
             p.published_at desc
    limit least(coalesce(p_limit, 12), 50)
  ) x;
$function$;

grant execute on function public.get_public_polls(integer, timestamptz, text, boolean) to anon, authenticated;
