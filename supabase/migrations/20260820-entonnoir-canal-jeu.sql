-- UN CANAL D'ENTONNOIR POUR LES JEUX.
--
-- Les jeux quotidiens proposent, APRÈS la partie, un vrai scrutin public à voter
-- sur place (voir `docs/regularite-des-joueurs.md` §4). Il faut pouvoir répondre
-- à la seule question qui vaille — « est-ce que ça amène quelqu'un ? » — sinon
-- l'invitation restera par inertie, à taxer tous les écrans.
--
-- ⚠️ ON RÉUTILISE L'ENTONNOIR EXISTANT PLUTÔT QUE D'OUVRIR UN SECOND JOURNAL.
-- `scrutin_track_funnel` compte déjà visite et création par canal, avec une
-- empreinte anti-double-comptage, une fenêtre d'une heure et un plafond
-- journalier. Un chemin parallèle aurait ses propres bugs et ses propres
-- chiffres, à réconcilier à la main.
--
-- ⚠️ LE CORPS EST REPRIS TEL QUEL DE `20260729-entonnoir-partage.sql`. Seule la
-- liste des canaux change. C'est une règle et pas une préférence : réécrire une
-- fonction de mémoire pour y ajouter un mot, c'est réintroduire en silence des
-- différences qu'on ne verra jamais — ici il s'en est fallu d'un cheveu que la
-- table, l'empreinte, la fenêtre et le plafond ne soient tous remplacés par des
-- approximations.
--
-- ⚠️ LE CANAL EST VÉRIFIÉ À TROIS ENDROITS, et c'est volontaire : ici, dans le
-- type `FunnelChannel`, et dans la liste de `trackVisit`. Un `?s=` fabriqué à la
-- main ne doit pas pouvoir inventer une colonne dans les statistiques. Ajouter un
-- canal demande donc de toucher les trois — c'est le prix d'une liste fermée.
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
  -- 'jeu'  = invitation d'après-partie d'un jeu quotidien.
  if p_channel not in ('copy','whatsapp','native','qr','link','jeu') then return; end if;
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
