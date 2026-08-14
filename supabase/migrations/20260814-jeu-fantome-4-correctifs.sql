-- ═══════════════════════════════════════════════════════════════════════════
-- LA NUIT DU FANTÔME — étage 4 : deux correctifs trouvés EN JOUANT une soirée.
-- ═══════════════════════════════════════════════════════════════════════════
-- Les étages 1 à 3 étaient écrits et éprouvés unité par unité. C'est la partie
-- jouée d'un bout à l'autre, en base, qui a sorti ces deux-là — et c'est la
-- leçon du dépôt : sur Unanimo comme sur Rôdeurs, les défauts qui comptent ne
-- sont apparus qu'en JOUANT.

-- ═══════ 1. ON NE PEUT PAS ÊTRE À DEUX PORTRAITS À LA FOIS ═══════
--
-- ⚠️ CE QUE LA SOIRÉE A MONTRÉ : le Fantôme achevait sa ronde à la cuisine et
-- hantait le fumoir dans la seconde. Son propre intervalle de ronde couvrait
-- alors l'instant de la hantise, et le dépouillement le comptait parmi les
-- BLANCHIS — 11 blanchis sur 11, l'enquête vidée de tout contenu, sans que rien
-- ne signale l'anomalie.
--
-- Ce n'est pas un défaut d'affichage : c'est LA SIGNATURE DU RELAIS. Un joueur
-- dont le registre dit « à la cuisine » pendant qu'il saisit le code du fumoir
-- ne peut pas être aux deux endroits — l'un des deux gestes est nécessairement
-- fait par un écran interposé. On refuse donc le second, pour tout le monde de
-- la même façon : quinze secondes de marche entre deux portraits, c'est la
-- physique du gîte, pas une règle de jeu à expliquer.
create or replace function public.scrutin_game_fantome_ailleurs(p_room uuid, p_player uuid, p_borne uuid)
returns boolean language sql stable set search_path to 'public' as $function$
  select exists (
    select 1 from scrutin_game_stints s
     where s.room_id = p_room and s.player_id = p_player
       and s.borne_id <> p_borne
       and s.beat_at > now() - interval '15 s');
$function$;

create or replace function public.fantome_haunt(p_token text, p_code text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me scrutin_game_players;
  v_room scrutin_game_rooms;
  v_h scrutin_game_hauntings;
  v_b scrutin_game_bornes;
begin
  select * into v_me from scrutin_game_players where token = p_token;
  if v_me.id is null then return jsonb_build_object('status', 'invalid'); end if;
  if v_me.secret->>'role' <> 'fantome' then
    -- Même réponse qu'une charge absente : un innocent qui bricolerait l'appel
    -- n'apprend pas qu'il existe une fenêtre en cours.
    return jsonb_build_object('status', 'no_charge');
  end if;
  select * into v_room from scrutin_game_rooms where id = v_me.room_id;
  if v_room.game <> 'fantome' or v_room.status <> 'playing' then
    return jsonb_build_object('status', 'closed');
  end if;

  select * into v_h from scrutin_game_hauntings
   where room_id = v_room.id and round_no = v_room.round_no and kind = 'charge'
     and done_at is null and armed_at <= now() and armed_at > now() - interval '45 s'
   order by seq limit 1;
  if v_h.id is null then return jsonb_build_object('status', 'no_charge'); end if;

  select * into v_b from scrutin_game_bornes b
   where b.room_id = v_room.id
     and (scrutin_game_fantome_code(b.secret, now()) = p_code
       or scrutin_game_fantome_code(b.secret, now() - interval '20 s') = p_code)
   limit 1;
  if v_b.id is null then return jsonb_build_object('status', 'no_code'); end if;

  -- ⚠️ La physique du gîte : quinze secondes de marche entre deux portraits.
  -- Sans cela le Fantôme se blanchit LUI-MÊME avec sa propre ronde.
  if scrutin_game_fantome_ailleurs(v_room.id, v_me.id, v_b.id) then
    return jsonb_build_object('status', 'too_fast');
  end if;

  update scrutin_game_hauntings
     set borne_id = v_b.id, done_at = now(),
         -- Le glas, différé de 1 à 3 min.
         toll_at = now() + make_interval(secs => 60 + floor(random() * 120)::int)
   where id = v_h.id;

  -- S'il a lâché une ronde pour aller hanter, elle se ferme — sans que
  -- personne n'en tire un soupçon (voir §4).
  update scrutin_game_stints set aborted_at = now()
   where room_id = v_room.id and player_id = v_me.id
     and completed_at is null and aborted_at is null;

  return jsonb_build_object('status', 'ok', 'place', v_b.place);
end $function$;

-- La même loi s'applique aux rondes : on ne commence pas une ronde à un
-- portrait quand on battait à un autre il y a trois secondes.
create or replace function public.fantome_beat(p_token text, p_code text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me scrutin_game_players;
  v_room scrutin_game_rooms;
  v_round scrutin_game_rounds;
  v_b scrutin_game_bornes;
  v_st scrutin_game_stints;
  v_idx int;
  v_duo boolean;
  v_signed boolean;
begin
  select * into v_me from scrutin_game_players where token = p_token;
  if v_me.id is null then return jsonb_build_object('status', 'invalid'); end if;
  if v_me.left_at is not null then return jsonb_build_object('status', 'left'); end if;
  select * into v_room from scrutin_game_rooms where id = v_me.room_id;
  if v_room.game <> 'fantome' or v_room.status <> 'playing' then
    return jsonb_build_object('status', 'closed');
  end if;
  select * into v_round from scrutin_game_rounds
   where room_id = v_room.id and round_no = v_room.round_no;
  if v_round.id is null or v_round.phase <> 'contribution' then
    return jsonb_build_object('status', 'closed');
  end if;

  -- On tolère le tic précédent : un code lu puis tapé prend quelques secondes,
  -- et refuser un code juste périmé ferait échouer une ronde honnête.
  select * into v_b from scrutin_game_bornes b
   where b.room_id = v_room.id
     and (scrutin_game_fantome_code(b.secret, now()) = p_code
       or scrutin_game_fantome_code(b.secret, now() - interval '20 s') = p_code)
   limit 1;
  if v_b.id is null then return jsonb_build_object('status', 'no_code'); end if;

  select * into v_st from scrutin_game_stints
   where room_id = v_room.id and player_id = v_me.id
     and completed_at is null and aborted_at is null;

  -- Ronde en cours ailleurs, ou rompue : on la ferme et on repart. Le joueur
  -- n'est pas puni — `aborted_at` n'alimente AUCUN soupçon (mesuré : le levier
  -- change de signe dès qu'un innocent lâche un cinquième de ce que lâche le
  -- Fantôme, et −38,8 pt à parité).
  if v_st.id is not null
     and (v_st.borne_id <> v_b.id or now() - v_st.beat_at > interval '35 s') then
    update scrutin_game_stints set aborted_at = now() where id = v_st.id;
    v_st := null;
  end if;

  if v_st.id is null then
    -- ⚠️ Quinze secondes de marche entre deux portraits, pour tout le monde de
    -- la même façon. C'est ce qui empêche de tenir deux rondes en parallèle
    -- avec un écran relayé, et c'est simplement vrai dans une maison.
    if scrutin_game_fantome_ailleurs(v_room.id, v_me.id, v_b.id) then
      return jsonb_build_object('status', 'too_fast', 'place', v_b.place);
    end if;
    select count(*) into v_idx from scrutin_game_stints
     where room_id = v_room.id and round_no = v_room.round_no and player_id = v_me.id;
    v_duo := (v_idx = 1);   -- la DEUXIÈME ronde de la manche se fait à deux
    insert into scrutin_game_stints (room_id, round_no, player_id, borne_id, duo)
    values (v_room.id, v_room.round_no, v_me.id, v_b.id, v_duo)
    returning * into v_st;
    return jsonb_build_object('status', 'started', 'place', v_b.place,
                              'duo', v_duo, 'elapsed', 0);
  end if;

  update scrutin_game_stints set beat_at = now() where id = v_st.id returning * into v_st;

  if now() - v_st.started_at >= interval '90 s' then
    -- Une ronde à deux ne se clôt que si le témoin a signé : c'est tout son
    -- objet. La signature vit dans `scrutin_game_meets` (§5).
    if v_st.duo then
      select exists (select 1 from scrutin_game_meets m
                      where m.room_id = v_room.id and m.round_no = v_room.round_no
                        and (m.seen_by = v_me.id or m.seen = v_me.id)
                        and m.place = v_b.place) into v_signed;
      if not v_signed then
        return jsonb_build_object('status', 'need_sign', 'place', v_b.place,
                                  'duo', true, 'elapsed', extract(epoch from now() - v_st.started_at)::int);
      end if;
    end if;
    update scrutin_game_stints set completed_at = now() where id = v_st.id;
    return jsonb_build_object('status', 'done', 'place', v_b.place, 'duo', v_st.duo);
  end if;

  return jsonb_build_object('status', 'beat', 'place', v_b.place, 'duo', v_st.duo,
                            'elapsed', extract(epoch from now() - v_st.started_at)::int);
end $function$;

-- ═══════ 2. UNE RÉUNION NE DOIT PAS POUVOIR RESTER SUSPENDUE ═══════
--
-- ⚠️ CE QUE LA SOIRÉE A MONTRÉ : si un seul joueur ne vote pas — téléphone
-- posé, enfant distrait, quelqu'un qui s'accuse lui-même par erreur — la mise
-- en lumière n'était JAMAIS calculée, et la partie s'arrêtait là, sans verdict
-- et sans classement. C'est exactement le défaut que Rôdeurs avait payé (sa
-- confrontation se résolvait avant tout vote sur la dernière manche) : il faut
-- un repli.
--
-- `game_next_round` devient ce repli. La règle reste « le dernier vote
-- résout » ; avancer n'est pas un verbe d'hôte, donc n'importe qui peut clore
-- la discussion quand la maison a fini de parler.
create or replace function public.game_next_round(p_token text, p_prompt jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_p scrutin_game_players;
  v_room scrutin_game_rooms;
  v_cur scrutin_game_rounds;
  v_next int;
  v_id uuid;
begin
  select * into v_p from scrutin_game_players where token = p_token;
  if v_p.id is null then return jsonb_build_object('status', 'forbidden'); end if;
  select * into v_room from scrutin_game_rooms where id = v_p.room_id for update;
  -- Rôdeurs et Fantôme n'ont AUCUN verbe d'hôte : sur deux heures de soirée,
  -- l'hôte va poser son téléphone, et onze personnes ne doivent pas s'arrêter
  -- avec lui.
  if v_room.game not in ('rodeurs', 'fantome') and not v_p.is_host then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if v_room.status = 'ended' then return jsonb_build_object('status', 'finished'); end if;

  select * into v_cur from scrutin_game_rounds
   where room_id = v_room.id and round_no = v_room.round_no;
  if v_cur.id is not null and v_cur.phase <> 'reveal' then
    return jsonb_build_object('status', 'not_revealed');
  end if;

  if v_cur.id is not null and v_room.game = 'rodeurs' then
    perform scrutin_game_rodeurs_confront(v_cur.id);
    -- La confrontation peut avoir clos la partie (tous pris, ou dernière manche).
    if (select status from scrutin_game_rooms where id = v_room.id) = 'ended' then
      return jsonb_build_object('status', 'finished');
    end if;
  end if;

  -- Le repli du Fantôme : la réunion se résout avec ce qu'on a.
  if v_cur.id is not null and v_room.game = 'fantome' then
    perform scrutin_game_fantome_light(v_cur.id);
    if (select status from scrutin_game_rooms where id = v_room.id) = 'ended' then
      return jsonb_build_object('status', 'finished');
    end if;
  end if;

  if v_room.round_no >= v_room.rounds_total then
    -- Dernière manche jouée : pour le Fantôme, c'est ici que la résolution se
    -- calcule — sinon une partie où il n'est jamais démasqué finirait sans
    -- classement.
    if v_room.game = 'fantome' and v_cur.id is not null and not (v_cur.result ? 'final') then
      perform scrutin_game_fantome_final(v_cur.id);
    end if;
    return jsonb_build_object('status', 'finished');
  end if;

  update scrutin_game_rooms
     set round_no = round_no + 1, status = 'playing', last_active_at = now()
   where id = v_room.id and round_no = v_room.round_no
  returning round_no into v_next;
  if v_next is null then return jsonb_build_object('status', 'ok'); end if;

  insert into scrutin_game_rounds (room_id, round_no, prompt)
  values (v_room.id, v_next, coalesce(p_prompt, '{}'::jsonb))
  on conflict (room_id, round_no) do nothing;

  select id into v_id from scrutin_game_rounds
   where room_id = v_room.id and round_no = v_next;

  if v_room.game = 'alibi' and v_next < v_room.rounds_total then
    perform scrutin_game_alibi_deal(v_id);
  elsif v_room.game = 'rodeurs' then
    perform scrutin_game_rodeurs_deal(v_room.id, v_next);
  elsif v_room.game = 'fantome' then
    perform scrutin_game_fantome_deal(v_room.id, v_next);
  end if;

  return jsonb_build_object('status', 'ok', 'roundNo', v_next);
end $function$;

revoke all on function public.scrutin_game_fantome_ailleurs(uuid, uuid, uuid) from public, anon, authenticated;
