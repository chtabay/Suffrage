-- REJOUER UNE PARTIE D'ÉCHECS — le geste qui manquait au SEUL jeu de salle qui
-- n'en avait aucun.
--
-- ⚠️ CE QUE VOYAIT UNE TABLE À LA FIN D'UNE PARTIE : « Échec et mat — les blancs
-- gagnent », deux statistiques, et rien. Pas de bouton, pas de phrase, pas même
-- pour l'hôte — alors que les quatre autres jeux de salle offrent « Rejouer »
-- depuis le premier jour. `GameShell` écrit pourtant la règle en toutes lettres
-- depuis l'origine : « MAIS PAS UN CUL-DE-SAC ».
--
-- ⚠️ AUCUN VERBE NOUVEAU N'EST NÉCESSAIRE, ET C'EST TOUT L'INTÉRÊT.
-- `game_replay` est générique depuis `20260810-jeux-salle-et-unanimo.sql` : il
-- rouvre une salle du MÊME jeu, avec le même nombre de manches, les mêmes
-- réglages et la même langue, puis chaîne l'ancienne vers la neuve. Les échecs
-- y entrent sans une ligne de SQL de plus — la salle neuve naît en `lobby`,
-- c'est-à-dire à l'écran où l'on choisit son camp, ce qui est exactement ce
-- qu'une revanche demande.
--
-- ⚠️ CE QUI MANQUAIT ÉTAIT DANS L'ÉTAT, PAS DANS LES VERBES. `echecs_state` est
-- une fonction à part — les échecs ne passent pas par `get_game_room`, parce
-- qu'elle rend une ligne par joueur et que ce jeu se veut jouable à six cents —
-- et elle ne rendait NI `next_code` NI `is_host`. Sans le premier, l'hôte
-- ouvrait une salle que personne ne pouvait trouver ; sans le second, l'écran ne
-- savait pas à qui offrir le bouton.
--
-- ⚠️ ET LE CORPS EST REPRIS TEL QUEL, PAS RÉÉCRIT DE MÉMOIRE. Deux clés
-- s'ajoutent, le reste est l'octet près celui du 20/08 (md5 vérifié avant et
-- après) — la leçon de `20260820-entonnoir-canal-jeu.sql`, dont la première
-- rédaction avait remplacé au passage la table, l'empreinte et la fenêtre par
-- des approximations plausibles et fausses.
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
    -- LA SALLE NEUVE, quand l'hôte a rejoué. Sans elle, `game_replay` ouvrait
    -- bien une partie mais PERSONNE ne l'apprenait : le chaînage `next_code`
    -- est le seul canal, les autres jeux de salle le lisent déjà.
    'nextCode', v_room.next_code,
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
            -- Qui peut rejouer. Le navigateur garde bien `isHost` dans son
            -- siège, mais un siège se recopie à la main : la vérité est ici.
            'isHost', v_me.is_host,
            'team', v_me.team,
            'mine', coalesce(v_mine, '[]'::jsonb),
            'canVote', (v_me.team is not null and v_me.team = v_turn
                        and v_round.phase = 'contribution')) end);
end $function$;

-- ⚠️ Le `revoke` vient AVANT le `grant`, et il NOMME `anon` : Supabase pose des
-- privilèges par défaut sur les fonctions du schéma public, donc un
-- `revoke ... from public` seul laisse `anon=X` en place. On joue sans compte :
-- la garde n'est pas le rôle, c'est le jeton.
revoke all on function public.echecs_state(text, text) from public, anon, authenticated;
grant execute on function public.echecs_state(text, text) to anon, authenticated;
