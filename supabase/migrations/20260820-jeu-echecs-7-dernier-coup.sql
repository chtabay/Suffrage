-- ═══════════════════════════════════════════════════════════════════════════
-- ÉCHECS COLLABORATIFS — étage 7 : le dernier coup garde sa notation.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️ LE DÉFAUT, VU EN JOUANT UN MAT DU SOT DE BOUT EN BOUT. À la fin d'une
-- partie, l'écran affichait le dépouillement de l'AVANT-DERNIER coup — « les
-- blancs ont joué g4 » sous un « échec et mat, les noirs gagnent ».
--
-- La cause tient en une ligne : `echecs_open` incrémente `round_no`, mais
-- `echecs_finish` NE L'INCRÉMENTE PAS — il n'y a pas de tour suivant. Donc à la
-- fin, la manche courante EST celle qu'on vient de clore, et le `prev` que
-- l'étage 6 rend (à `round_no - 1`) pointe un cran trop tôt.
--
-- L'écran lit donc `result` plutôt que `prev` quand la partie est finie. Mais il
-- lui manquait alors la NOTATION : `result.move` ne porte que l'UCI (`d8h4`), et
-- la notation algébrique n'est calculable qu'avec les règles du jeu, que seul
-- l'arbitre connaît. On la lui fait donc écrire au moment où il la calcule.
--
-- Et c'est justement le coup où elle compte le plus : « Dh4# », avec son dièse,
-- est le seul endroit du jeu où la notation raconte quelque chose.
--
-- ⚠️ ON SUPPRIME AVANT DE RECRÉER. Ajouter un paramètre — même avec une valeur
-- par défaut — change la signature : Postgres créerait une SURCHARGE et
-- laisserait l'ancienne fonction en place, appelable et fausse. Le `drop` est
-- conditionnel pour que ce fichier reste rejouable à blanc.
drop function if exists public.echecs_finish(text, text, text, text);

create or replace function public.echecs_finish(
  p_secret text, p_code text, p_outcome text,
  p_winner text default null, p_san text default null)
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
           -- La notation du coup qui conclut, calculée une seule fois, par la
           -- seule pièce du jeu qui connaisse les règles.
           'san', p_san,
           -- L'INSTRUMENTATION, comme pour les autres jeux : le vrai intérêt
           -- de ce jeu ne se lira que sur de vraies parties.
           'plies', v_n,
           'ballots', (select count(*) from scrutin_game_entries e
                        join scrutin_game_rounds r on r.id = e.round_id
                       where r.room_id = v_room.id),
           -- ⚠️ `peak` EXISTAIT DÉJÀ et compte TOUS les joueurs passés par la
           -- salle, présents ou non — c'est la seule mesure de foule que ce jeu
           -- garde. Le relire avant de réécrire la fonction a évité de le
           -- supprimer en silence.
           'peak', (select count(*) from scrutin_game_players where room_id = v_room.id))
   where room_id = v_room.id and round_no = v_room.round_no;

  return jsonb_build_object('status', 'ok', 'outcome', p_outcome);
end $function$;

revoke all on function public.echecs_finish(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.echecs_finish(text, text, text, text, text) to anon, authenticated;
