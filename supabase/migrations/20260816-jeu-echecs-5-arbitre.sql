-- ═══════════════════════════════════════════════════════════════════════════
-- ÉCHECS COLLABORATIFS — étage 5 : ce dont l'arbitre a besoin.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️ DEUX CHOSES APPRISES EN APPELANT LA ROUTE POUR DE VRAI, et pas avant :
--
--   • `scrutin_game_json_bound` REFUSE LES OBJETS IMBRIQUÉS dans un `prompt`.
--     Mon premier `last: {uci, san}` a été refusé BRUYAMMENT — c'est exactement
--     pour ça que cette borne est écrite ainsi (elle avait déjà arrêté Alibi de
--     la même façon). On aplatit le dernier coup en `lastUci` / `lastSan` au
--     lieu d'assouplir la garde, et `echecs_state` le recompose à la lecture.
--
--   • LE SECRET EST LA SERRURE, PAS LE `grant`. La route de Next utilise la CLÉ
--     ANONYME : révoquer l'exécution à `anon` casse l'arbitre. C'est le motif
--     déjà en production pour `request_join_circle` — la fonction est
--     appelable, et `notify_secret_ok` en première ligne rend `forbidden` à qui
--     n'a pas le secret. Ce n'est pas un relâchement : sans le secret, ces
--     fonctions n'écrivent rien.
--
-- Deux ajouts, appelés par la route `/api/echecs/ply` qui tient chess.js :
-- ouvrir un tour EN PRÉCISANT SA MÉTHODE (le départage se joue à l'approbation,
-- voir l'étage 3), et clore la partie quand l'échiquier a parlé.

-- ═══════════════ 1. OUVRIR, EN PRÉCISANT LA MÉTHODE DE DÉCISION
create or replace function public.echecs_open(
  p_secret text, p_code text, p_from int,
  p_ply int, p_turn text, p_fen text, p_legal jsonb,
  p_last_uci text default null, p_last_san text default null,
  p_runoff boolean default false, p_method text default 'plurality')
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_room scrutin_game_rooms;
  v_next int;
  v_valve int;
begin
  if not notify_secret_ok(p_secret) then return jsonb_build_object('status', 'forbidden'); end if;
  if p_method not in ('plurality', 'approval') then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into v_room from scrutin_game_rooms where code = upper(btrim(coalesce(p_code, '')));
  if v_room.id is null or v_room.game <> 'echecs' then
    return jsonb_build_object('status', 'not_found');
  end if;

  update scrutin_game_rooms
     set round_no = round_no + 1, status = 'playing', last_active_at = now()
   where id = v_room.id and round_no = p_from and status <> 'ended'
  returning round_no into v_next;
  if v_next is null then
    -- Quelqu'un a déjà ouvert cette position. Rien à faire, et surtout pas
    -- d'erreur : cinq cents clients arrivent ici en même temps.
    return jsonb_build_object('status', 'ok', 'already', true);
  end if;

  -- ⚠️ LA SOUPAPE, PAS UNE PENDULE. En mode salon il n'y a PAS d'horloge :
  -- l'équipe active clôt son tour quand elle a fini. Ce délai n'existe que pour
  -- qu'une table qui se disperse ne bloque pas la partie. Un départage est
  -- court par nature : on lui laisse le tiers du temps.
  v_valve := coalesce((v_room.settings->>'valveSeconds')::int, 180);
  if p_runoff then v_valve := greatest(30, v_valve / 3); end if;

  insert into scrutin_game_rounds (room_id, round_no, prompt)
  values (v_room.id, v_next, jsonb_build_object(
            'ply', p_ply, 'turn', p_turn, 'fen', p_fen, 'legal', p_legal,
            -- ⚠️ À PLAT, ET C'EST LA BORNE DU SOCLE QUI L'EXIGE.
            'lastUci', p_last_uci, 'lastSan', p_last_san,
            'runoff', p_runoff, 'method', p_method,
            'openedAt', now(), 'valveAt', now() + make_interval(secs => v_valve)))
  on conflict (room_id, round_no) do nothing;

  return jsonb_build_object('status', 'ok', 'roundNo', v_next);
end $function$;

-- ═══════════════ 2. CLORE LA PARTIE — mat, pat, nulle, abandon
--
-- Idempotent comme le reste : la garde vit dans le `WHERE`. Le résultat est
-- écrit sur la DERNIÈRE manche, là où le client le lit déjà.
create or replace function public.echecs_finish(
  p_secret text, p_code text, p_outcome text, p_winner text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_room scrutin_game_rooms;
  v_n int;
begin
  if not notify_secret_ok(p_secret) then return jsonb_build_object('status', 'forbidden'); end if;
  if p_outcome not in ('checkmate', 'stalemate', 'draw', 'resign') then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into v_room from scrutin_game_rooms where code = upper(btrim(coalesce(p_code, '')));
  if v_room.id is null or v_room.game <> 'echecs' then
    return jsonb_build_object('status', 'not_found');
  end if;

  update scrutin_game_rooms set status = 'ended', last_active_at = now()
   where id = v_room.id and status <> 'ended';
  if not found then return jsonb_build_object('status', 'ok', 'already', true); end if;

  select count(*) into v_n from scrutin_game_rounds where room_id = v_room.id;

  update scrutin_game_rounds
     set result = coalesce(result, '{}'::jsonb) || jsonb_build_object(
           'final', true,
           'outcome', p_outcome,
           'winner', p_winner,
           -- L'INSTRUMENTATION, comme pour les autres jeux : le vrai intérêt
           -- de ce jeu ne se lira que sur de vraies parties.
           'plies', v_n,
           'ballots', (select count(*) from scrutin_game_entries e
                        join scrutin_game_rounds r on r.id = e.round_id
                       where r.room_id = v_room.id),
           'peak', (select count(*) from scrutin_game_players where room_id = v_room.id))
   where room_id = v_room.id and round_no = v_room.round_no;

  return jsonb_build_object('status', 'ok', 'outcome', p_outcome);
end $function$;

-- ⚠️ LE SECRET EST LA SERRURE, PAS LE `grant`. La route de Next utilise la
-- CLÉ ANONYME : révoquer l'exécution à `anon` casse l'arbitre (payé en
-- appelant la route pour de vrai). C'est le motif déjà en production pour
-- `request_join_circle` — la fonction est appelable, et `notify_secret_ok`
-- en première ligne rend `forbidden` à qui n'a pas le secret.
grant execute on function
  public.echecs_open(text, text, int, int, text, text, jsonb, text, text, boolean, text)
  to anon, authenticated;
grant execute on function public.echecs_finish(text, text, text, text) to anon, authenticated;
-- L'ancienne signature sans méthode disparaît : deux portes pour le même geste
-- finissent toujours par diverger.
drop function if exists public.echecs_open(text, text, int, int, text, text, jsonb, jsonb, boolean);
drop function if exists public.echecs_open(text, text, int, int, text, text, jsonb, jsonb, boolean, text);
