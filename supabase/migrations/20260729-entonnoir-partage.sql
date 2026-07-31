-- ENTONNOIR DE PARTAGE : partage -> visite -> création
--
-- Pourquoi. `scrutin_share_events` compte les clics sur « partager », et rien
-- d'autre : le lien partagé ne portait aucune marque, donc on ne pouvait pas
-- savoir si un partage avait produit une visite, encore moins une création.
-- C'est la seule question qui permette de juger si publier sert à quelque chose.
--
-- Pourquoi une table SÉPARÉE plutôt qu'un `kind` sur l'existante : la Régie
-- agrège déjà `scrutin_share_events` par canal. Y verser des visites gonflerait
-- silencieusement le nombre de partages affiché depuis des mois. On n'altère pas
-- une série historique pour économiser une table.

create table if not exists public.scrutin_funnel_events (
  id           bigint generated always as identity primary key,
  -- Le scrutin d'ORIGINE : celui dont le lien a été suivi. Pour un événement
  -- 'create', ce n'est donc pas le scrutin créé, mais celui qui y a mené.
  poll_id      uuid not null references public.scrutin_polls(id) on delete cascade,
  channel      text not null,
  kind         text not null,
  created_at   timestamptz not null default now(),
  fingerprint  text
);

create index if not exists scrutin_funnel_events_poll_idx
  on public.scrutin_funnel_events (poll_id, created_at desc);

-- RLS active SANS policy : personne n'écrit ni ne lit en direct. L'écriture
-- passe par la fonction ci-dessous (security definer), la lecture par la Régie
-- (service role). Même modèle que scrutin_voters.
alter table public.scrutin_funnel_events enable row level security;
revoke all on public.scrutin_funnel_events from anon, authenticated;

create or replace function public.scrutin_track_funnel(
  p_token text,
  p_channel text,
  p_kind text
) returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_id uuid; v_fp text;
begin
  -- 'link' = lien collé à la main, sans passer par un bouton de partage.
  if p_channel not in ('copy','whatsapp','native','qr','link') then return; end if;
  if p_kind not in ('visit','create') then return; end if;

  select id into v_id from public.scrutin_polls where token = p_token;
  if v_id is null then return; end if;

  v_fp := public.scrutin_fp(v_id::text, 'funnel');

  -- Une même empreinte ne compte qu'une fois par heure et par canal : recharger
  -- la page ne doit pas gonfler les visites.
  if exists (
    select 1 from public.scrutin_funnel_events
    where poll_id = v_id and channel = p_channel and kind = p_kind
      and fingerprint = v_fp and created_at > now() - interval '1 hour'
  ) then
    return;
  end if;

  -- Même plafond que scrutin_track_share : au-delà, on cesse d'écrire.
  if (select count(*) from public.scrutin_funnel_events
      where poll_id = v_id and created_at > now() - interval '24 hours') >= 500 then
    return;
  end if;

  insert into public.scrutin_funnel_events (poll_id, channel, kind, fingerprint)
  values (v_id, p_channel, p_kind, v_fp);
end;
$function$;

grant execute on function public.scrutin_track_funnel(text, text, text) to anon, authenticated;
