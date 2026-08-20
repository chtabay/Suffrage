-- ═══════════════════════════════════════════════════════════════════════════
-- ÉCHECS COLLABORATIFS — étage 2 : ouvrir un tour, le clore.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️ L'ARBITRE VIT DANS UNE ROUTE, PAS ICI. Calculer les coups légaux demande
-- une bibliothèque d'échecs ; l'écrire en PL/pgSQL serait absurde. La route
-- `/api/echecs/ply` tient chess.js et appelle ces fonctions avec un SECRET que
-- seul le serveur connaît — le même motif que `/api/circles/join`, déjà en
-- production. Le navigateur, lui, ne peut que VOTER : il reçoit la liste des
-- coups légaux, il ne la fabrique jamais.
--
-- ⚠️ TOUT EST IDEMPOTENT. Les crons Vercel en Hobby sont à la journée (vérifié) :
-- aucune clôture ne peut venir d'un ordonnanceur. C'est donc LE PREMIER CLIENT
-- qui constate que le tour est fini qui la déclenche — et ils peuvent être six
-- cents à le faire dans la même seconde. La garde vit dans le `WHERE` d'un
-- `UPDATE`, jamais dans du code : ce dépôt a déjà perdu des écritures avec des
-- `max(seq)+1` concurrents.

-- ═══════════════════════════════════════════════ 1. OUVRIR UNE POSITION
--
-- `p_from` est le numéro de manche que l'appelant croit courant : si quelqu'un
-- l'a déjà fait avancer, l'`UPDATE` ne touche aucune ligne et on sort en
-- silence. C'est toute l'idempotence.
create or replace function public.echecs_open(
  p_secret text, p_code text, p_from int,
  p_ply int, p_turn text, p_fen text, p_legal jsonb,
  p_last jsonb default null, p_runoff boolean default false)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_room scrutin_game_rooms;
  v_next int;
  v_valve int;
begin
  -- Le motif du dépôt, déjà en production pour /api/circles/join : le secret
  -- vit dans `scrutin_config`, la route le connaît par `NOTIFY_SECRET`, et le
  -- navigateur ne l'a jamais. Un secret de plus n'apporterait rien.
  if not notify_secret_ok(p_secret) then return jsonb_build_object('status', 'forbidden'); end if;
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
  -- qu'une table qui se disperse ne bloque pas la partie.
  v_valve := coalesce((v_room.settings->>'valveSeconds')::int, 180);

  insert into scrutin_game_rounds (room_id, round_no, prompt)
  values (v_room.id, v_next, jsonb_build_object(
            'ply', p_ply, 'turn', p_turn, 'fen', p_fen, 'legal', p_legal,
            'last', p_last, 'runoff', p_runoff,
            'openedAt', now(), 'valveAt', now() + make_interval(secs => v_valve)))
  on conflict (room_id, round_no) do nothing;

  return jsonb_build_object('status', 'ok', 'roundNo', v_next);
end $function$;

-- ═══════════════════════════════════════════════════ 2. CLORE UN TOUR
--
-- Le dépouillement et le verrou sont DANS LA MÊME INSTRUCTION : les CTE et
-- l'`UPDATE` voient le même instantané, donc le total publié est exactement
-- celui des voix reçues au moment où la phase bascule. Deux appels simultanés
-- ne peuvent pas produire deux dépouillements — le second ne touche aucune
-- ligne et relit le résultat du premier.
create or replace function public.echecs_close(p_secret text, p_code text, p_token text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_room scrutin_game_rooms;
  v_round scrutin_game_rounds;
  v_me scrutin_game_players;
  v_res jsonb;
  v_expired boolean;
  v_votes int;
begin
  -- Le motif du dépôt, déjà en production pour /api/circles/join : le secret
  -- vit dans `scrutin_config`, la route le connaît par `NOTIFY_SECRET`, et le
  -- navigateur ne l'a jamais. Un secret de plus n'apporterait rien.
  if not notify_secret_ok(p_secret) then return jsonb_build_object('status', 'forbidden'); end if;
  select * into v_room from scrutin_game_rooms where code = upper(btrim(coalesce(p_code, '')));
  if v_room.id is null or v_room.game <> 'echecs' then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into v_round from scrutin_game_rounds
   where room_id = v_room.id and round_no = v_room.round_no;
  if v_round.id is null then return jsonb_build_object('status', 'no_round'); end if;

  -- Déjà clos : on rend le résultat tel quel. C'est le cas NORMAL quand six
  -- cents clients constatent la fin au même instant.
  if v_round.phase = 'reveal' then
    return jsonb_build_object('status', 'ok', 'already', true, 'result', v_round.result);
  end if;

  -- QUI A LE DROIT DE CLORE : un membre de l'équipe active — « on est prêts » —
  -- ou n'importe qui une fois la soupape expirée. L'équipe qui attend ne peut
  -- pas couper la parole à celle qui délibère.
  if p_token is not null then
    select * into v_me from scrutin_game_players where token = p_token and room_id = v_room.id;
  end if;
  v_expired := (v_round.prompt->>'valveAt')::timestamptz <= now();
  if (v_me.id is null or v_me.team is distinct from (v_round.prompt->>'turn'))
     and not v_expired then
    return jsonb_build_object('status', 'not_yours');
  end if;

  -- ⚠️ AUX ÉCHECS, IL FAUT JOUER — on ne peut pas passer son tour. Trouvé en
  -- éprouvant la soupape : un tour clos sans aucune voix ne produisait AUCUN
  -- coup, et la partie s'arrêtait là en silence. Deux cas, et ils ne se
  -- traitent pas pareil :
  --   • l'équipe active clôt elle-même sans avoir voté → on REFUSE. Ce serait
  --     sinon un moyen de forcer un coup au hasard.
  --   • la soupape expire et personne n'a voté → on TIRE AU SORT dans les coups
  --     légaux. C'est dur, mais c'est la convention des échecs (perdre au temps
  --     l'est davantage), et ça produit le bon aveu : « on n'a même pas voté ».
  select count(*) into v_votes from scrutin_game_entries
   where round_id = v_round.id and payload ? 'move';
  if v_votes = 0 and not v_expired then
    return jsonb_build_object('status', 'no_votes');
  end if;

  with tally as (
    select e.payload->>'move' as mv, count(*)::int as n
      from scrutin_game_entries e
     where e.round_id = v_round.id and e.payload ? 'move'
     group by 1
  ), top as (
    select coalesce(max(n), 0) as best, coalesce(sum(n), 0)::int as total from tally
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
           'tally', rows.list,
           'voters', top.total,
           -- ⚠️ L'ÉGALITÉ N'EST PAS UN INCIDENT : entre gens qui ne se parlent
           -- pas, à trois votants, elle arrive une fois sur deux (mesuré ; la
           -- conversation la fait tomber à 16 %). Elle ouvre un second tour
           -- entre les SEULS ex æquo — sauf si c'en est déjà un, auquel cas on
           -- TIRE AU SORT. L'organisateur ne choisit jamais.
           'tied', case when array_length(lead.moves, 1) > 1
                          and not coalesce((v_round.prompt->>'runoff')::boolean, false)
                        then to_jsonb(lead.moves) else null end,
           'move', case
                     -- Personne n'a voté et la soupape a parlé : le sort tranche.
                     when lead.moves is null then
                       v_round.prompt->'legal'->>(
                         floor(random() * greatest(1, jsonb_array_length(v_round.prompt->'legal')))::int)
                     when array_length(lead.moves, 1) = 1 then lead.moves[1]
                     when coalesce((v_round.prompt->>'runoff')::boolean, false)
                       then lead.moves[1 + floor(random() * array_length(lead.moves, 1))::int]
                     else null end,
           'drawn', (lead.moves is null
                     or (coalesce((v_round.prompt->>'runoff')::boolean, false)
                         and coalesce(array_length(lead.moves, 1), 0) > 1)),
           -- L'équipe n'a rien dit du tout : l'écran doit le nommer.
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

revoke all on function public.echecs_open(text, text, int, int, text, text, jsonb, jsonb, boolean)
  from public, anon, authenticated;
revoke all on function public.echecs_close(text, text, text) from public, anon, authenticated;
