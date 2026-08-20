-- ═══════════════════════════════════════════════════════════════════════════
-- ÉCHECS COLLABORATIFS — étage 1 : le schéma, et le vote.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Spec : docs/echecs-spec.md. Lot 1 = MODE SALON, ÉQUIPE CONTRE ÉQUIPE, sans
-- aucun moteur d'échecs : deux équipes s'affrontent, il ne reste que l'arbitre
-- (chess.js, côté serveur) pour calculer les coups légaux.
--
-- ⚠️ LE SOCLE PORTE PRESQUE TOUT, ET C'EST VOULU. Une position est une MANCHE
-- (`scrutin_game_rounds`) : la position et les coups légaux vivent dans son
-- `prompt`, le dépouillement dans son `result`. Un vote est une CONTRIBUTION
-- (`scrutin_game_entries`), et `scrutin_game_entries_uk UNIQUE (round_id,
-- player_id)` garantit déjà UNE VOIX PAR SIÈGE ET PAR TOUR — par un index, pas
-- par du code. On n'ajoute donc qu'une colonne et cinq verbes.
--
-- ⚠️ CE QUI CHANGE TOUT PAR RAPPORT AUX QUATRE AUTRES JEUX : on ne rend JAMAIS
-- la liste des joueurs. `get_game_room` en rend une entrée par joueur, ce qui
-- pèse 552 Ko et 1,1 Go/s de sortie à 4 000 joueurs (mesuré, spec §4).
-- `echecs_state` ne rend que des COMPTEURS : 294 octets, constant quel que soit
-- l'effectif. Ce jeu a sa propre voie de lecture, et ne touche pas à celle des
-- autres.

-- ═════════════════════════════════════════════ 1. UNE COLONNE SUR LE SOCLE
--
-- Chacun rejoint l'équipe qu'il veut — pas d'organisateur qui distribue des
-- invitations. `null` = présent mais pas encore engagé (on peut regarder).
alter table public.scrutin_game_players
  add column if not exists team text;

do $$ begin
  alter table public.scrutin_game_players
    add constraint scrutin_game_players_team_chk check (team is null or team in ('w', 'b'));
exception when duplicate_object then null; end $$;

-- Compter les membres d'une équipe est l'opération la plus fréquente du jeu.
create index if not exists scrutin_game_players_team_ix
  on public.scrutin_game_players (room_id, team) where team is not null;

-- ═══════════════════════════════════════════════════ 2. CHOISIR SON CAMP
create or replace function public.echecs_team(p_token text, p_team text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me scrutin_game_players;
  v_room scrutin_game_rooms;
begin
  select * into v_me from scrutin_game_players where token = p_token;
  if v_me.id is null then return jsonb_build_object('status', 'invalid'); end if;
  if p_team is not null and p_team not in ('w', 'b') then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into v_room from scrutin_game_rooms where id = v_me.room_id;
  if v_room.game <> 'echecs' then return jsonb_build_object('status', 'invalid'); end if;

  -- On change de camp quand on veut : le collectif est une entité dynamique, et
  -- rien ne se rattrape individuellement. Les votes déjà déposés restent — ils
  -- appartiennent au tour, pas au joueur.
  update scrutin_game_players set team = p_team where id = v_me.id;
  return jsonb_build_object('status', 'ok', 'team', p_team);
end $function$;

-- ═══════════════════════════════════════════════════════ 3. LE VOTE
--
-- ⚠️ LA LISTE DES COUPS LÉGAUX, CALCULÉE UNE FOIS PAR TOUR PAR L'ARBITRE, EST
-- LE BULLETIN. Elle est stockée dans `prompt.legal` ; voter revient à vérifier
-- une appartenance à cette liste. Zéro logique d'échecs dans Postgres, aucun
-- coup illégal possible — et l'ouverture gratuite vers les autres méthodes de
-- décision (§19 de la spec), puisque le bulletin est une liste d'options.
create or replace function public.echecs_vote(p_token text, p_move text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me scrutin_game_players;
  v_room scrutin_game_rooms;
  v_round scrutin_game_rounds;
begin
  select * into v_me from scrutin_game_players where token = p_token;
  if v_me.id is null then return jsonb_build_object('status', 'invalid'); end if;
  select * into v_room from scrutin_game_rooms where id = v_me.room_id;
  if v_room.game <> 'echecs' or v_room.status <> 'playing' then
    return jsonb_build_object('status', 'closed');
  end if;

  select * into v_round from scrutin_game_rounds
   where room_id = v_room.id and round_no = v_room.round_no;
  if v_round.id is null or v_round.phase <> 'contribution' then
    return jsonb_build_object('status', 'closed');
  end if;

  -- On ne vote que dans son camp, et seulement quand c'est à lui.
  if v_me.team is null then return jsonb_build_object('status', 'no_team'); end if;
  if v_me.team <> (v_round.prompt->>'turn') then
    return jsonb_build_object('status', 'not_your_turn');
  end if;

  -- ⚠️ La borne. Un coup absent de la liste servie par l'arbitre n'existe pas.
  if not (v_round.prompt->'legal' ? p_move) then
    return jsonb_build_object('status', 'illegal');
  end if;

  -- Le dernier choix remplace le précédent : une seule préférence active.
  insert into scrutin_game_entries (round_id, player_id, payload)
  values (v_round.id, v_me.id, jsonb_build_object('move', p_move))
  on conflict (round_id, player_id) do update set payload = excluded.payload;

  update scrutin_game_rooms set last_active_at = now() where id = v_room.id;
  return jsonb_build_object('status', 'ok', 'move', p_move);
end $function$;

revoke all on function public.echecs_team(text, text) from public, anon, authenticated;
revoke all on function public.echecs_vote(text, text) from public, anon, authenticated;
grant execute on function public.echecs_team(text, text) to anon, authenticated;
grant execute on function public.echecs_vote(text, text) to anon, authenticated;
