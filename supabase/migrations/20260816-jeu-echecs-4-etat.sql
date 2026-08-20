-- ═══════════════════════════════════════════════════════════════════════════
-- ÉCHECS COLLABORATIFS — étage 4 : l'état, et seulement des compteurs.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️ CE JEU NE REND JAMAIS LA LISTE DES JOUEURS, ET C'EST TOUTE LA DIFFÉRENCE.
-- `get_game_room` rend une entrée par joueur : mesuré, cela pèse 552 Ko et
-- 1,1 Go/s de sortie à 4 000 joueurs qui sondent toutes les deux secondes — et
-- le socle casse déjà quelque part entre 40 et 400. Ici on ne rend que des
-- NOMBRES : la réponse est constante, quel que soit l'effectif.
--
-- Le §18 de la spec l'exige explicitement : « ne pas utiliser une architecture
-- qui suppose un nombre faible et connu de joueurs, une ligne d'interface par
-- joueur, une attente de tous les votes, une liste figée de participants ».
--
-- ⚠️ ON NE REND PAS NON PLUS LES VOTES EN COURS. Le §7 est formel : les choix
-- des autres ne sont pas visibles pendant le tour. On rend `votes` — combien
-- de bulletins sont arrivés — et rien de plus. La répartition n'apparaît qu'au
-- dépouillement, dans `result`.
--
-- ⚠️ ET CHACUN NE RETROUVE QUE SON PROPRE CHOIX. Jamais celui d'un autre : ce
-- dépôt a payé trois fois les écrans qui désignent quelqu'un.
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
