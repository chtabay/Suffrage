-- ═══════════════════════════════════════════════════════════════════════════
-- ÉCHECS COLLABORATIFS — étage 6 : rendre le dépouillement du coup PRÉCÉDENT.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️ LE DÉFAUT QUE CET ÉTAGE CORRIGE. `echecs_close` passe la manche en
-- `reveal`, puis l'arbitre appelle aussitôt `echecs_open`, qui incrémente
-- `round_no`. Or `echecs_state` lit la manche À `room.round_no` : dès que le
-- tour suivant est ouvert — c'est-à-dire dans la même requête HTTP — le
-- dépouillement du coup qu'on vient de jouer devient INVISIBLE. Le client ne
-- voyait jamais que `last.san`, le coup retenu, sans jamais savoir avec quelle
-- majorité.
--
-- C'est pourtant TOUT le jeu. « 62 % ont joué ça » est le seul moment où le
-- collectif se voit lui-même ; sans lui, on a fait voter des gens pour rien.
--
-- On ne peut pas non plus marquer une pause sur la révélation : il n'y a AUCUN
-- ordonnanceur derrière ce jeu (les crons Vercel en Hobby sont à la journée,
-- à ±59 min près), donc rien ne rouvrirait le tour suivant. Le dépouillement
-- voyage donc AVEC la manche suivante, sous la clé `prev`, et s'affiche
-- au-dessus de la position — on voit l'échiquier ET ce que l'équipe a décidé.
--
-- ⚠️ LE DÉPOUILLEMENT EST ÉCRÊTÉ À CINQ LIGNES, ET C'EST DIT. La table
-- complète reste écrite dans `scrutin_game_rounds.result` (c'est le registre) ;
-- ici on n'en rend que les cinq premières, plus le nombre de coups distincts,
-- pour que l'écran puisse écrire « et 9 autres coups » au lieu de faire croire
-- qu'il n'y en avait que cinq. Sans cet écrêtage, `prev` triplerait le poids de
-- la réponse — 40 coups légaux × ~25 octets — et ce jeu tient précisément parce
-- que sa réponse ne dépend de rien.
--
-- ⚠️ CE N'EST PAS UNE FUITE. Un dépouillement est un AGRÉGAT : il dit ce que le
-- groupe a décidé, jamais qui a voté quoi. Le secret que ce jeu protège est
-- celui du bulletin PENDANT le tour ; une fois le coup joué, la décision est
-- publique par nature — elle est sur l'échiquier.

create or replace function public.echecs_state(p_code text, p_token text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_room scrutin_game_rooms;
  v_round scrutin_game_rounds;
  v_me scrutin_game_players;
  v_turn text;
  v_w int;
  v_b int;
  v_votes int;
  v_mine jsonb;
  v_prev jsonb;
begin
  select * into v_room from scrutin_game_rooms where code = upper(btrim(coalesce(p_code, '')));
  if v_room.id is null or v_room.game <> 'echecs' then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into v_round from scrutin_game_rounds
   where room_id = v_room.id and round_no = v_room.round_no;
  v_turn := v_round.prompt->>'turn';

  if p_token is not null and p_token <> '' then
    select * into v_me from scrutin_game_players where token = p_token and room_id = v_room.id;
    if v_me.id is not null then
      -- Le battement de présence : c'est LUI qui alimente « 612 joueurs
      -- présents », sans qu'on ait jamais à énumérer qui que ce soit.
      update scrutin_game_players set seen_at = now()
       where id = v_me.id and seen_at < now() - interval '15 seconds';
      if v_round.id is not null then
        select payload->'moves' into v_mine from scrutin_game_entries
         where round_id = v_round.id and player_id = v_me.id;
      end if;
    end if;
  end if;

  select count(*) filter (where team = 'w'), count(*) filter (where team = 'b')
    into v_w, v_b from scrutin_game_players
   where room_id = v_room.id and seen_at > now() - interval '90 seconds';

  select count(*) into v_votes from scrutin_game_entries
   where v_round.id is not null and round_id = v_round.id and payload ? 'moves';

  -- LE DÉPOUILLEMENT DE LA MANCHE PRÉCÉDENTE, écrêté.
  select jsonb_build_object(
           'move', r.result->>'move',
           -- ⚠️ LE `san` VIENT DE LA MANCHE COURANTE, PAS DE LA PRÉCÉDENTE, et
           -- c'est un décalage d'un cran payé à l'écran : `lastSan` est écrit
           -- par `echecs_open` sur la manche qu'il OUVRE, pour décrire le coup
           -- qui vient d'être joué. Le lire sur la manche close rendait le SAN
           -- du coup d'AVANT — au premier demi-coup, il n'y en avait aucun et
           -- le dépouillement s'affichait « le coup est en cours ».
           'san', v_round.prompt->>'lastSan',
           'voters', coalesce((r.result->>'voters')::int, 0),
           'drawn', coalesce((r.result->>'drawn')::boolean, false),
           'silent', coalesce((r.result->>'silent')::boolean, false),
           'runoff', coalesce((r.prompt->>'runoff')::boolean, false),
           'method', coalesce(r.prompt->>'method', 'plurality'),
           'turn', r.prompt->>'turn',
           'tally', coalesce((select jsonb_agg(x) from (
                       select x from jsonb_array_elements(r.result->'tally') as x limit 5) s), '[]'::jsonb),
           'kinds', coalesce(jsonb_array_length(r.result->'tally'), 0))
    into v_prev
    from scrutin_game_rounds r
   where r.room_id = v_room.id and r.round_no = v_room.round_no - 1
     and r.phase = 'reveal' and r.result is not null;

  return jsonb_build_object(
    'status', 'ok',
    'code', v_room.code,
    'roomStatus', v_room.status,
    'roundNo', v_room.round_no,
    'locale', v_room.locale,
    -- La position, telle que l'arbitre l'a écrite. `legal` est publique par
    -- nature : n'importe qui peut la recalculer depuis la position.
    'ply', (v_round.prompt->>'ply')::int,
    'turn', v_turn,
    'fen', v_round.prompt->>'fen',
    'legal', coalesce(v_round.prompt->'legal', '[]'::jsonb),
    -- Le dernier coup est stocké À PLAT (la borne du socle refuse les objets
    -- imbriqués dans un `prompt`) ; on le recompose ici, pour l'écran.
    'last', case when v_round.prompt->>'lastUci' is null then null else
              jsonb_build_object('uci', v_round.prompt->>'lastUci',
                                 'san', v_round.prompt->>'lastSan') end,
    'prev', v_prev,
    'method', coalesce(v_round.prompt->>'method', 'plurality'),
    'runoff', coalesce((v_round.prompt->>'runoff')::boolean, false),
    'phase', v_round.phase,
    'valveAt', v_round.prompt->>'valveAt',
    -- DES NOMBRES, PAS DES NOMS.
    'teams', jsonb_build_object('w', coalesce(v_w, 0), 'b', coalesce(v_b, 0)),
    'active', case when v_turn = 'w' then coalesce(v_w, 0) else coalesce(v_b, 0) end,
    'votes', coalesce(v_votes, 0),
    -- Le dépouillement n'existe qu'après la clôture. Avant, il n'y a rien à
    -- lire — pas même pour celui qui a déjà voté.
    'result', case when v_round.phase = 'reveal' then v_round.result else null end,
    'me', case when v_me.id is null then null else jsonb_build_object(
            'name', v_me.name,
            'team', v_me.team,
            'mine', coalesce(v_mine, '[]'::jsonb),
            'canVote', (v_me.team is not null and v_me.team = v_turn
                        and v_round.phase = 'contribution')) end);
end $function$;

revoke all on function public.echecs_state(text, text) from public, anon, authenticated;
grant execute on function public.echecs_state(text, text) to anon, authenticated;
