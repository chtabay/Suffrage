-- ═══════════════════════════════════════════════════════════════════════════
-- LA NUIT DU FANTÔME — étage 5 : l'état que le client a le droit de voir.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️ POURQUOI UNE RPC À PART, ET PAS UNE BRANCHE DANS `get_game_room`.
-- `get_game_room` est partagée par les quatre jeux, dont Alibi — un chantier
-- CLOS, relu et corrigé, qu'on ne rouvre pas. La réécrire en entier pour y
-- greffer le Fantôme, c'est risquer de casser trois jeux en production pour
-- gagner un aller-retour réseau. Le client appelle donc les deux en parallèle
-- (`Promise.all`) : une seule attente en temps de mur, zéro risque pour
-- l'existant.
--
-- CE QUI SORT ICI, ET SEULEMENT ICI : mon sceau, ma ronde en cours, et — pour
-- le Fantôme SEUL — sa fenêtre de hantise. Les secrets des bornes ne sortent
-- JAMAIS : le client reçoit des noms de pièces, jamais un code ni un secret
-- d'appairage. Un joueur qui lirait cette réponse dans l'onglet réseau
-- n'apprend rien qu'il ne voie déjà sur les murs de la maison.
create or replace function public.fantome_state(p_code text, p_token text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_room scrutin_game_rooms;
  v_me scrutin_game_players;
  v_round scrutin_game_rounds;
  v_st scrutin_game_stints;
  v_h scrutin_game_hauntings;
  v_place text;
  v_signed boolean := false;
  v_gauge int;
  v_target int;
  v_n int;
begin
  select * into v_room from scrutin_game_rooms where code = upper(btrim(coalesce(p_code, '')));
  if v_room.id is null or v_room.game <> 'fantome' then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into v_round from scrutin_game_rounds
   where room_id = v_room.id and round_no = v_room.round_no;

  if p_token is not null and p_token <> '' then
    select * into v_me from scrutin_game_players where token = p_token and room_id = v_room.id;
  end if;

  -- La jauge du testament : publique, c'est elle qui donne à la maison une
  -- raison de jouer autre chose que la chasse au Fantôme.
  select count(*) into v_gauge from scrutin_game_stints
   where room_id = v_room.id and completed_at is not null;
  select count(*) into v_n from scrutin_game_players
   where room_id = v_room.id and left_at is null;
  v_target := greatest(1, (v_n * 3 * v_room.rounds_total * 2) / 3);

  if v_me.id is not null then
    select * into v_st from scrutin_game_stints
     where room_id = v_room.id and player_id = v_me.id
       and completed_at is null and aborted_at is null;
    if v_st.id is not null then
      select place into v_place from scrutin_game_bornes where id = v_st.borne_id;
      if v_st.duo then
        select exists (select 1 from scrutin_game_meets m
                        where m.room_id = v_room.id and m.round_no = v_room.round_no
                          and (m.seen_by = v_me.id or m.seen = v_me.id)
                          and m.place = v_place) into v_signed;
      end if;
    end if;

    -- ⚠️ LA FENÊTRE DE HANTISE NE SORT QUE POUR LE FANTÔME. Un innocent qui
    -- lirait la réponse ne doit pas apprendre qu'une charge est amorcée —
    -- sinon « regarde ton écran » désigne le coupable en une seconde.
    if v_me.secret->>'role' = 'fantome' then
      select * into v_h from scrutin_game_hauntings
       where room_id = v_room.id and round_no = v_room.round_no and kind = 'charge'
         and done_at is null and armed_at <= now() and armed_at > now() - interval '45 s'
       order by seq limit 1;
    end if;
  end if;

  return jsonb_build_object(
    'status', 'ok',
    -- Les pièces qui portent un portrait, et s'il bat encore. Public par
    -- conception : nier qu'on voit une tablette posée dans la cuisine serait
    -- absurde, et savoir qu'un portrait est mort fait partie de l'enquête.
    'bornes', coalesce((select jsonb_agg(jsonb_build_object(
                          'place', b.place,
                          'alive', (b.seen_at > now() - interval '90 s')) order by b.place)
                          from scrutin_game_bornes b
                         where b.room_id = v_room.id and b.paired_at is not null), '[]'::jsonb),
    'gauge', v_gauge,
    'target', v_target,
    'me', case when v_me.id is null then null else jsonb_build_object(
            'seal', scrutin_game_fantome_seal(v_me.token, now()),
            'photoOk', v_me.photo_ok,
            'photoDone', exists (select 1 from scrutin_game_photos ph
                                  where ph.room_id = v_room.id and ph.round_no = v_room.round_no
                                    and ph.player_id = v_me.id and ph.taken_at is not null),
            -- Combien de rondes j'ai déjà menées à terme cette manche : c'est
            -- ce qui dit au joueur « il t'en reste une ».
            'doneThisRound', (select count(*) from scrutin_game_stints s
                               where s.room_id = v_room.id and s.round_no = v_room.round_no
                                 and s.player_id = v_me.id and s.completed_at is not null),
            'stint', case when v_st.id is null then null else jsonb_build_object(
                       'place', v_place,
                       'duo', v_st.duo,
                       'signed', v_signed,
                       'elapsed', extract(epoch from now() - v_st.started_at)::int,
                       -- Le temps depuis le dernier battement : au-delà de 35 s
                       -- la ronde se rompt, et l'écran doit le montrer AVANT.
                       'since', extract(epoch from now() - v_st.beat_at)::int) end,
            'charge', case when v_h.id is null then null else jsonb_build_object(
                       'left', greatest(0, 45 - extract(epoch from now() - v_h.armed_at)::int)) end)
          end);
end $function$;

revoke all on function public.fantome_state(text, text) from public, anon, authenticated;
grant execute on function public.fantome_state(text, text) to anon, authenticated;
