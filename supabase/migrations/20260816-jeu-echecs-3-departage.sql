-- ═══════════════════════════════════════════════════════════════════════════
-- ÉCHECS COLLABORATIFS — étage 3 : le départage change de méthode.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️ LE SECOND TOUR À LA PLURALITÉ NE TRANCHAIT RIEN, ET C'EST MESURÉ. Reposer
-- la même question à des gens qui viennent de se partager reproduit le partage :
-- avec trois votants sur trois coups ex æquo, si 90 % d'entre eux répètent leur
-- choix, le second tour ne départage que **18 %** du temps — il faut **3,81
-- tours-machine pour jouer UN coup**. C'est exactement la sensation de panne.
--
-- ✅ LE MÊME SECOND TOUR À L'APPROBATION (« coche tous ceux qui te vont »)
-- tranche **56 %** du temps dans le même cas, et 60 à 74 % dès qu'on est
-- quatre. La différence tient à l'entêtement : approuver un second coup coûte
-- peu à quelqu'un qui refuse de lâcher le sien.
--
-- ⚠️ ET C'EST L'INVERSE POUR LE PREMIER TOUR. Sur les 25 coups légaux d'une
-- position, avec des préférences diverses, l'approbation APLATIT les comptes et
-- crée des égalités là où la pluralité lit une concentration — c'est justement
-- cette concentration que Moussaïd a mesurée (« beaucoup de façons d'avoir
-- tort, une seule d'avoir raison »). Les deux mesures ne se contredisent pas :
-- elles décrivent deux régimes.
--   • Beaucoup d'options, préférences diverses  → PLURALITÉ (le vote normal).
--   • Peu d'options, partage entêté            → APPROBATION (le départage).
--
-- ⚠️ ET IL N'Y A JAMAIS DE TROISIÈME TOUR. Si l'approbation laisse encore une
-- égalité, LE SORT TRANCHE IMMÉDIATEMENT : deux tours-machine au maximum, quoi
-- qu'il arrive. Une partie ne doit pas pouvoir boucler.

-- ═══════════════════════ LE BULLETIN DEVIENT UNE LISTE, TOUJOURS
--
-- `{"moves": ["e2e4"]}` en pluralité, `{"moves": [...]}` en approbation. Une
-- seule forme, donc un seul dépouillement — et c'est aussi ce qui ouvrira les
-- autres méthodes du §19 sans migration douloureuse.
create or replace function public.echecs_vote(p_token text, p_moves jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me scrutin_game_players;
  v_room scrutin_game_rooms;
  v_round scrutin_game_rounds;
  v_method text;
  v_n int;
  v_bad text;
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
  if v_me.team is null then return jsonb_build_object('status', 'no_team'); end if;
  if v_me.team <> (v_round.prompt->>'turn') then
    return jsonb_build_object('status', 'not_your_turn');
  end if;

  if jsonb_typeof(p_moves) <> 'array' then return jsonb_build_object('status', 'invalid'); end if;
  v_n := jsonb_array_length(p_moves);
  v_method := coalesce(v_round.prompt->>'method', 'plurality');
  -- En pluralité, un seul coup : c'est la règle du fondateur (un joueur = un
  -- coup = une voix). En approbation, autant qu'on veut — mais tout approuver
  -- n'influence rien, c'est la propriété connue de la méthode.
  if v_n = 0 then return jsonb_build_object('status', 'empty'); end if;
  if v_method = 'plurality' and v_n <> 1 then return jsonb_build_object('status', 'one_only'); end if;
  if v_n > jsonb_array_length(v_round.prompt->'legal') then
    return jsonb_build_object('status', 'invalid');
  end if;

  -- ⚠️ La borne. Un coup absent de la liste servie par l'arbitre n'existe pas.
  select x into v_bad from jsonb_array_elements_text(p_moves) x
   where not (v_round.prompt->'legal' ? x) limit 1;
  if v_bad is not null then return jsonb_build_object('status', 'illegal'); end if;

  -- Le dernier choix remplace le précédent : une seule préférence active.
  insert into scrutin_game_entries (round_id, player_id, payload)
  values (v_round.id, v_me.id, jsonb_build_object('moves', p_moves))
  on conflict (round_id, player_id) do update set payload = excluded.payload;

  update scrutin_game_rooms set last_active_at = now() where id = v_room.id;
  return jsonb_build_object('status', 'ok', 'moves', p_moves, 'method', v_method);
end $function$;

revoke all on function public.echecs_vote(text, jsonb) from public, anon, authenticated;
grant execute on function public.echecs_vote(text, jsonb) to anon, authenticated;
-- L'ancienne signature à un seul coup disparaît : elle ne saurait pas exprimer
-- une approbation, et deux portes pour le même geste finissent toujours par
-- diverger.
drop function if exists public.echecs_vote(text, text);

-- ═══════════════════════ LA CLÔTURE, AVEC LE DÉPARTAGE À L'APPROBATION
create or replace function public.echecs_close(p_secret text, p_code text, p_token text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_room scrutin_game_rooms;
  v_round scrutin_game_rounds;
  v_me scrutin_game_players;
  v_res jsonb;
  v_expired boolean;
  v_votes int;
  v_runoff boolean;
begin
  if not notify_secret_ok(p_secret) then return jsonb_build_object('status', 'forbidden'); end if;
  select * into v_room from scrutin_game_rooms where code = upper(btrim(coalesce(p_code, '')));
  if v_room.id is null or v_room.game <> 'echecs' then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into v_round from scrutin_game_rounds
   where room_id = v_room.id and round_no = v_room.round_no;
  if v_round.id is null then return jsonb_build_object('status', 'no_round'); end if;
  if v_round.phase = 'reveal' then
    return jsonb_build_object('status', 'ok', 'already', true, 'result', v_round.result);
  end if;

  if p_token is not null then
    select * into v_me from scrutin_game_players where token = p_token and room_id = v_room.id;
  end if;
  v_expired := (v_round.prompt->>'valveAt')::timestamptz <= now();
  if (v_me.id is null or v_me.team is distinct from (v_round.prompt->>'turn'))
     and not v_expired then
    return jsonb_build_object('status', 'not_yours');
  end if;

  -- ⚠️ AUX ÉCHECS, IL FAUT JOUER — on ne peut pas passer son tour. L'équipe
  -- active qui clôt sans avoir voté est REFUSÉE (ce serait sinon un moyen de
  -- forcer un coup au hasard) ; la soupape qui expire sur zéro voix TIRE AU
  -- SORT, ce qui est la convention des échecs.
  select count(*) into v_votes from scrutin_game_entries
   where round_id = v_round.id and payload ? 'moves';
  if v_votes = 0 and not v_expired then
    return jsonb_build_object('status', 'no_votes');
  end if;

  v_runoff := coalesce((v_round.prompt->>'runoff')::boolean, false);

  with bul as (
    select e.player_id, x.mv
      from scrutin_game_entries e
      cross join lateral jsonb_array_elements_text(e.payload->'moves') as x(mv)
     where e.round_id = v_round.id and e.payload ? 'moves'
  ), tally as (
    select mv, count(*)::int as n from bul group by 1
  ), top as (
    select coalesce(max(n), 0) as best from tally
  ), lead as (
    select array_agg(t.mv order by t.mv) as moves
      from tally t, top where t.n = top.best and top.best > 0
  ), rows as (
    select coalesce(jsonb_agg(jsonb_build_object('move', t.mv, 'n', t.n)
                              order by t.n desc, t.mv), '[]'::jsonb) as list
      from tally t
  )
  select jsonb_build_object(
           'rule', 'echecs-v1',
           'method', coalesce(v_round.prompt->>'method', 'plurality'),
           'tally', rows.list,
           -- ⚠️ `voters` compte les PERSONNES, pas les approbations : en
           -- approbation la somme des voix dépasse le nombre de votants, et
           -- afficher « 7 voix sur 4 votants » n'a aucun sens.
           'voters', v_votes,
           -- L'égalité ouvre UN second tour, à l'APPROBATION — reposer la même
           -- question ne trancherait que 18 % du temps (mesuré). Et jamais de
           -- troisième tour : si ça tient encore, le sort départage tout de
           -- suite. Deux tours-machine au maximum, quoi qu'il arrive.
           'tied', case when array_length(lead.moves, 1) > 1 and not v_runoff
                        then to_jsonb(lead.moves) else null end,
           'move', case
                     when lead.moves is null then
                       v_round.prompt->'legal'->>(
                         floor(random() * greatest(1, jsonb_array_length(v_round.prompt->'legal')))::int)
                     when array_length(lead.moves, 1) = 1 then lead.moves[1]
                     when v_runoff
                       then lead.moves[1 + floor(random() * array_length(lead.moves, 1))::int]
                     else null end,
           'drawn', (lead.moves is null
                     or (v_runoff and coalesce(array_length(lead.moves, 1), 0) > 1)),
           'silent', (lead.moves is null))
    into v_res
    from top, lead, rows;

  update scrutin_game_rounds
     set phase = 'reveal', revealed_at = now(), result = v_res
   where id = v_round.id and phase = 'contribution';
  if not found then
    select result into v_res from scrutin_game_rounds where id = v_round.id;
    return jsonb_build_object('status', 'ok', 'already', true, 'result', v_res);
  end if;

  update scrutin_game_rooms set last_active_at = now() where id = v_room.id;
  return jsonb_build_object('status', 'ok', 'result', v_res);
end $function$;

revoke all on function public.echecs_close(text, text, text) from public, anon, authenticated;
