-- Cercles, lot 3 — ouvrir une consultation.
--
-- POURQUOI. Le bulletin scellé (lot 1) ne protège de rien si l'animateur choisit
-- qui répond : il convoque UNE SEULE personne et lit le bulletin qui apparaît.
-- Aucune jointure n'est nécessaire, aucun chiffrement n'y changerait quoi que ce
-- soit. La parade est procédurale — **la convocation n'est plus au choix**. Cette
-- RPC convoque tout le roster, ou elle refuse.
--
-- Elle porte aussi le plafond de sollicitation, refusé ICI et non dans
-- l'interface : un plafond affiché mais appliqué côté client n'est pas un
-- plafond, il suffit d'appeler la RPC directement.
--
-- Spec : docs/cercles-spec.md (attaques 2 et 6, décisions 1 et 2).
-- Vérifié en base sous l'identité de l'animateur authentifié :
--   roster de 3 (seuil 5)          -> too_small
--   ouverture nominale             -> ok, 6 convoqués, scellé, poids uniformes
--   2e consultation le même jour   -> capped (cap 1, aujourd'hui 1)
--   ouverture par un autre compte  -> forbidden
--   espace non ouvert en cercle    -> not_a_circle

alter table public.scrutin_events
  add column if not exists reminded_at timestamptz;

comment on column public.scrutin_events.reminded_at is
  'Horodate de l''unique relance autorisée. Une consultation de cercle ne se rappelle qu''une fois : au-delà, ce n''est plus un rappel, c''est du harcèlement. Appliqué dans /api/events/[id]/remind, unique source d''envoi d''emails.';

create or replace function public.open_circle_consultation(
  p_space_id uuid,
  p_question text,
  p_options jsonb,
  p_recipe jsonb,
  p_description text default null,
  p_closes_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  s scrutin_spaces;
  v_event uuid; v_token text;
  v_roster int; v_today int;
  v_min constant int := 5;
  v_question text := nullif(btrim(p_question), '');
begin
  select * into s from scrutin_spaces where id = p_space_id;
  if not found then return jsonb_build_object('status','invalid'); end if;
  if s.owner_id <> auth.uid() then return jsonb_build_object('status','forbidden'); end if;
  if v_question is null then return jsonb_build_object('status','invalid'); end if;

  -- Un espace n'est un cercle que si son lien d'adhésion est ouvert. Ailleurs on
  -- passe par le parcours d'événement normal, où choisir les convoqués est
  -- légitime (une AG convoque des sociétaires nommés, et l'assume).
  if not s.join_open then return jsonb_build_object('status','not_a_circle'); end if;

  -- ROSTER TROP PETIT. Sous le seuil de dépouillement, la consultation ne pourrait
  -- JAMAIS livrer de résultat — et c'est exactement la forme que prend l'attaque
  -- par cardinalité. On refuse d'ouvrir plutôt que d'ouvrir un piège.
  select count(*) into v_roster from scrutin_members where space_id = s.id;
  if v_roster < v_min then
    return jsonb_build_object('status','too_small','roster',v_roster,'min',v_min);
  end if;

  -- PLAFOND DU JOUR. On compte les événements réellement OUVERTS aujourd'hui dans
  -- cet espace — un brouillon ne sollicite personne, et un événement ouvert à la
  -- main sollicite tout autant : la promesse porte sur la boîte mail du membre,
  -- pas sur le mécanisme. (Fenêtre en UTC ; voir la réserve consignée dans la
  -- spec — 1/jour ≈ 30/mois, c'est un garde-fou, pas l'argument commercial.)
  if s.solicit_per_day is not null then
    select count(*) into v_today from scrutin_events
     where space_id = s.id and status <> 'draft'
       and created_at >= date_trunc('day', now());
    if v_today >= s.solicit_per_day then
      return jsonb_build_object('status','capped','cap',s.solicit_per_day,'today',v_today);
    end if;
  end if;

  -- Scellée par construction : dans un cercle, on ne demande pas au membre de
  -- faire confiance à une case que l'animateur pourrait oublier de cocher.
  insert into scrutin_events (owner_id, space_id, title, description, mode, status,
                              secret_ballot, closes_at)
    values (auth.uid(), s.id, left(v_question, 150), p_description, 'async', 'open',
            true, p_closes_at)
    returning id into v_event;

  insert into scrutin_polls (question, description, options, recipe, status,
                             access_mode, visibility, event_id, order_index, closes_at)
    values (v_question, p_description, p_options, p_recipe, 'open',
            'invite', 'private', v_event, 0, p_closes_at)
    returning token into v_token;

  -- TOUT LE ROSTER, sans exception et sans choix. Poids uniforme et district nul :
  -- un poids rare ou un district rare est un identifiant, et le dépouillement les
  -- neutralise déjà — autant ne pas les écrire.
  -- `invited_at` reste NULL : il est posé par /api/events/[id]/convoke APRÈS envoi
  -- réel, et sert à savoir qui a effectivement été contacté.
  insert into scrutin_event_members (event_id, member_id, name, email, weight, district)
  select v_event, m.id, m.name, m.email, 1, null
    from scrutin_members m
   where m.space_id = s.id;

  return jsonb_build_object('status','ok','event_id',v_event,'poll_token',v_token,
                            'convened',v_roster);
end $function$;

grant execute on function public.open_circle_consultation(uuid,text,jsonb,jsonb,text,timestamptz)
  to authenticated;
