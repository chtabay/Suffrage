-- ═══════════════════════════════════════════════════════════════════════════
-- LA NUIT DU FANTÔME — étage 2 : la donne, les bornes, la manche.
-- ═══════════════════════════════════════════════════════════════════════════
-- Spec : docs/fantome-spec.md. Schéma : 20260814-jeu-fantome-1-schema.sql.
-- Le dépouillement, la réunion et le vote sont à l'étage 3.

-- ═════════════════════════════════════════════ 1. LES CODES, DÉRIVÉS
--
-- ⚠️ AUCUN ÉTAT. Le code d'une borne et le sceau d'un joueur se CALCULENT à
-- partir d'un secret et de l'instant : rien à écrire, rien à faire tourner, et
-- deux téléphones qui sondent en même temps lisent forcément la même chose.
-- Une table de codes tournants aurait demandé un ordonnanceur que ce dépôt n'a
-- pas pour les jeux.
create or replace function public.scrutin_game_fantome_code(p_secret text, p_at timestamptz)
returns text language sql immutable set search_path to 'public' as $function$
  select lpad(((('x' || substr(md5(p_secret || ':b:' ||
           floor(extract(epoch from p_at) / 20)::bigint::text), 1, 8))::bit(32)::bigint)
         % 10000)::text, 4, '0');
$function$;

-- Le sceau du joueur tourne toutes les 90 s. ⚠️ Celui de Rôdeurs était
-- PERMANENT sur la manche, donc moissonnable une fois pour toute la soirée :
-- c'est l'une des deux seules parades au relais, avec la ronde à deux.
create or replace function public.scrutin_game_fantome_seal(p_token text, p_at timestamptz)
returns text language sql immutable set search_path to 'public' as $function$
  select lpad(((('x' || substr(md5(p_token || ':s:' ||
           floor(extract(epoch from p_at) / 90)::bigint::text), 1, 8))::bit(32)::bigint)
         % 10000)::text, 4, '0');
$function$;

-- ═══════════════════════════════════════════════════════════ 2. LA DONNE
--
-- ⚠️ ENTIÈREMENT SERVEUR. Dans Unanimo, le client de l'hôte tirait le thème et
-- l'envoyait ; le même chemin donnerait ici les rôles à l'hôte. Aucun
-- navigateur ne doit connaître le Fantôme, pas même celui qui a ouvert la
-- salle.
create or replace function public.scrutin_game_fantome_deal(p_room uuid, p_round int)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  v_room scrutin_game_rooms;
  v_ids uuid[];
  v_n int;
  v_complice boolean;
  v_clauses int;
  v_i int;
  v_role text;
  v_others text[];
  v_card text;
  v_cards text[];
  v_tiers int;
  v_devant int;
  v_armed timestamptz;
begin
  select * into v_room from scrutin_game_rooms where id = p_room;

  -- ── Les rôles, à la première manche seulement : ils tiennent la nuit.
  if p_round = 1 then
    select array_agg(id order by random()) into v_ids
      from scrutin_game_players where room_id = p_room and left_at is null;
    v_n := coalesce(array_length(v_ids, 1), 0);
    if v_n < 5 then return; end if;

    -- ⚠️ UN SEUL FANTÔME. Deux saboteurs ont été mesurés à 19,6-36,6 % de
    -- victoires du village : le jeu s'effondre. Le complice MUET partage la
    -- victoire et ne sabote jamais — il existe pour que le Fantôme ne soit pas
    -- seul à avoir une raison de mentir.
    v_complice := (v_n >= 9);
    -- Environ UN TIERS de la table doit avoir une raison de se taire, sinon le
    -- Fantôme se désigne tout seul (mesuré : 73 % / 59 % / 40 % de victoires du
    -- village selon aucun / un tiers / deux tiers de menteurs).
    v_clauses := greatest(1, round(v_n::numeric / 3)::int - (case when v_complice then 2 else 1 end));

    for v_i in 1 .. v_n loop
      v_role := case
        when v_i = 1 then 'fantome'
        when v_complice and v_i = 2 then 'complice'
        when v_i <= (case when v_complice then 2 else 1 end) + v_clauses then 'clause'
        else 'heritier' end;
      -- Le Fantôme et son complice se connaissent : c'est ce qui rend
      -- l'anti-clique nécessaire, et c'est ce qui fait qu'ils ne se signent
      -- jamais entre eux (rien ne s'écrit, l'écran ment par omission).
      if v_complice and v_i = 1 then
        select array[p.name] into v_others from scrutin_game_players p where p.id = v_ids[2];
      elsif v_complice and v_i = 2 then
        select array[p.name] into v_others from scrutin_game_players p where p.id = v_ids[1];
      else
        v_others := '{}';
      end if;
      update scrutin_game_players
         set secret = jsonb_build_object('role', v_role, 'complices', coalesce(to_jsonb(v_others), '[]'::jsonb))
       where id = v_ids[v_i];
    end loop;
  end if;

  -- ── Le plan de la manche, pour chacun.
  --
  -- TROIS RONDES, DONT LA DEUXIÈME À DEUX (p = 1/3). Sur les chiffres honnêtes
  -- une ronde sur trois fait BAISSER le village (2,4 ± 0,8 pt) mais tient mieux
  -- la BANDE 40-60 % — p = 0 en sort par le haut. Au-delà, p >= 1/2 est
  -- disqualifiant (38 / 30 / 17 %).
  select count(*) into v_devant from scrutin_game_players
   where room_id = p_room and left_at is null and photo_ok is not false;

  declare
    v_pl record;
  begin
    for v_pl in
      select id, photo_ok from scrutin_game_players
       where room_id = p_room and left_at is null
    loop
      -- Le vivier sans aucune personne : toujours servable.
      v_cards := array['ombre_portee','trace_de_doigt','objet_hors_place','reflet',
                       'nature_morte','poussiere','clef_oubliee','fenetre_noire'];
      -- Les cartes à tiers ne s'ajoutent que si la maison peut les porter.
      v_tiers := 2;
      if v_pl.photo_ok is not false and (v_devant - 1) >= v_tiers + 2 then
        v_cards := v_cards || array['portrait_ancetre','six_pieds','tablee_figee'];
      end if;
      v_card := v_cards[1 + floor(random() * array_length(v_cards, 1))::int];

      update scrutin_game_players
         set secret = coalesce(secret, '{}'::jsonb) || jsonb_build_object(
               'roundNo', p_round,
               -- solo -> à deux -> solo : l'ordre est fixe, le partenaire est
               -- LIBRE (l'appariement serveur a été prouvé combinatoirement
               -- infaisable à 7 joueurs sur 4 manches).
               'plan', jsonb_build_array(
                 jsonb_build_object('duo', false),
                 jsonb_build_object('duo', true),
                 jsonb_build_object('duo', false)),
               'card', v_card)
       where id = v_pl.id;

      insert into scrutin_game_photos (room_id, round_no, player_id, card)
      values (p_room, p_round, v_pl.id, v_card)
      on conflict (room_id, round_no, player_id) do update set card = excluded.card;
    end loop;
  end;

  -- ── LA CHARGE. ⚠️ Elle s'amorce SEULE, à un instant tiré ici : laisser le
  -- Fantôme choisir son moment donne 19,5 % de victoires du village (il attend
  -- d'être couvert), une charge instable de 45 s en donne 54,8 %.
  --
  -- Entre T+3 min et T+10 min : assez tard pour que la manche ait commencé,
  -- assez tôt pour qu'une manche ne dure pas une heure. UNE SEULE par manche —
  -- deux tirages indépendants se chevauchaient, et la seconde était perdue sans
  -- que le Fantôme y soit pour rien (8 % de parties gagnées par un artefact).
  v_armed := now() + make_interval(secs => 180 + floor(random() * 420)::int);
  insert into scrutin_game_hauntings (room_id, round_no, kind, seq, armed_at)
  values (p_room, p_round, 'charge', 1, v_armed)
  on conflict (room_id, round_no, seq) do nothing;
end $function$;

-- ═══════════════════════════════════════════════════════ 3. LES BORNES
--
-- Le préparateur ouvre /games/fantome/<code>/borne sur chaque appareil et
-- choisit sa pièce. ⚠️ LE SECRET NE PASSE JAMAIS PAR L'URL : il est rendu ici,
-- une fois, et vit dans le localStorage de la borne. Une URL porteuse ferait du
-- préparateur un ORACLE — il rouvrirait chaque borne sur son téléphone et
-- lirait tous les codes de partout. Préparer n'est pas animer.
create or replace function public.fantome_borne_pair(p_code text, p_place text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_room scrutin_game_rooms;
  v_b scrutin_game_bornes;
begin
  select * into v_room from scrutin_game_rooms where code = upper(p_code);
  if v_room.id is null or v_room.game <> 'fantome' then
    return jsonb_build_object('status', 'not_found');
  end if;
  if p_place !~ '^[a-z][a-z0-9_-]{1,24}$' then
    return jsonb_build_object('status', 'invalid');
  end if;

  insert into scrutin_game_bornes (room_id, place, paired_at)
  values (v_room.id, p_place, now())
  on conflict (room_id, place) do update
    set paired_at = now(), seen_at = now(),
        -- Ré-appairer regénère le secret : une borne rouverte ailleurs invalide
        -- l'ancienne session, et le préparateur ne garde aucune clé.
        -- Voir l'étage 1 : `gen_random_bytes` (pgcrypto) est hors du
        -- search_path verrouillé de cette fonction.
        secret = replace(gen_random_uuid()::text, '-', '')
              || replace(gen_random_uuid()::text, '-', '')
  returning * into v_b;

  return jsonb_build_object('status', 'ok', 'secret', v_b.secret, 'place', v_b.place);
end $function$;

-- Le battement de la borne : elle réclame son code et signale qu'elle est
-- vivante. ⚠️ `seen_at` est ce qui permet de traiter une borne DÉBRANCHÉE comme
-- une hantise au dépouillement — sinon le trou physique redevient une
-- non-action gratuite, et c'est exactement ce qui a tué deux mécaniques.
create or replace function public.fantome_borne_poll(p_secret text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_b scrutin_game_bornes;
  v_room scrutin_game_rooms;
  v_toll timestamptz;
begin
  select * into v_b from scrutin_game_bornes where secret = p_secret;
  if v_b.id is null then return jsonb_build_object('status', 'not_found'); end if;
  update scrutin_game_bornes set seen_at = now() where id = v_b.id;
  select * into v_room from scrutin_game_rooms where id = v_b.room_id;

  -- Le glas : toutes les bornes vacillent ENSEMBLE, une à trois minutes après
  -- la hantise. Différé exprès — un vacillement immédiat horodate le sabotage
  -- et grille le Fantôme dès la manche 1.
  select h.toll_at into v_toll from scrutin_game_hauntings h
   where h.room_id = v_b.room_id and h.toll_at is not null
     and h.toll_at <= now() and h.toll_at > now() - interval '25 s'
   order by h.toll_at desc limit 1;

  return jsonb_build_object(
    'status', 'ok',
    'place', v_b.place,
    'code', scrutin_game_fantome_code(v_b.secret, now()),
    'roomStatus', v_room.status,
    'roundNo', v_room.round_no,
    'toll', (v_toll is not null));
end $function$;

-- ═══════════════════════════════════════════════════ 4. LA RONDE (LE BEAT)
--
-- Le joueur saisit le code du portrait sur SON téléphone. La borne ne reçoit
-- rien : c'est ce renversement qui rend le jeu jouable — 11 joueurs × 3 rondes
-- × 90 s = 49 min de borne-temps par manche contre 24 min de capacité si les
-- bornes étaient des guichets.
--
-- ⚠️ PAS DE COMPTEUR DE BATTEMENTS. La continuité s'enforce battement par
-- battement : si plus de 35 s séparent deux saisies, la ronde est rompue et
-- redémarre. Un compteur aurait demandé une colonne et un `+1` concurrent —
-- exactement ce qui perdait des tampons en silence sur Unanimo.
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

-- ══════════════════════════════════════════ 5. LA SIGNATURE CROISÉE (TÉMOIN)
--
-- Chacun tape le sceau de l'autre. L'arête ne s'écrit que si les DEUX ont une
-- ronde à deux ouverte à la MÊME borne : c'est ce qui fait qu'on ne peut pas
-- signer depuis le canapé.
create or replace function public.fantome_sign(p_token text, p_seal text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me scrutin_game_players;
  v_room scrutin_game_rooms;
  v_other scrutin_game_players;
  v_mine scrutin_game_stints;
  v_theirs scrutin_game_stints;
  v_b scrutin_game_bornes;
  v_pairs int;
begin
  select * into v_me from scrutin_game_players where token = p_token;
  if v_me.id is null then return jsonb_build_object('status', 'invalid'); end if;
  select * into v_room from scrutin_game_rooms where id = v_me.room_id;
  if v_room.game <> 'fantome' or v_room.status <> 'playing' then
    return jsonb_build_object('status', 'closed');
  end if;

  select * into v_mine from scrutin_game_stints
   where room_id = v_room.id and player_id = v_me.id
     and completed_at is null and aborted_at is null;
  if v_mine.id is null then return jsonb_build_object('status', 'no_stint'); end if;

  select p.* into v_other from scrutin_game_players p
   where p.room_id = v_room.id and p.id <> v_me.id and p.left_at is null
     and scrutin_game_fantome_seal(p.token, now()) = p_seal;
  if v_other.id is null then
    -- Le sceau tourne toutes les 90 s : on tolère le tic précédent.
    select p.* into v_other from scrutin_game_players p
     where p.room_id = v_room.id and p.id <> v_me.id and p.left_at is null
       and scrutin_game_fantome_seal(p.token, now() - interval '90 s') = p_seal;
  end if;
  if v_other.id is null then return jsonb_build_object('status', 'no_seal'); end if;

  select * into v_theirs from scrutin_game_stints
   where room_id = v_room.id and player_id = v_other.id
     and completed_at is null and aborted_at is null;
  if v_theirs.id is null or v_theirs.borne_id <> v_mine.borne_id then
    return jsonb_build_object('status', 'not_here', 'name', v_other.name);
  end if;

  select * into v_b from scrutin_game_bornes where id = v_mine.borne_id;

  -- ⚠️ L'ANTI-CLIQUE, RECOPIÉ TEL QUEL DE `rodeurs_meet`. Entre traîtres, RIEN
  -- ne s'écrit — et l'écran affiche LE MÊME SUCCÈS. Sans cela, deux complices
  -- se fabriquent des témoins mutuels toute la nuit ; mesuré en v1, la clique
  -- ramenait le village à 0,5 %, le hasard exact. Le complice le sait déjà : il
  -- connaît le Fantôme depuis la donne, on ne lui apprend rien.
  if v_me.secret->>'role' in ('fantome','complice')
     and v_other.secret->>'role' in ('fantome','complice') then
    return jsonb_build_object('status', 'ok', 'name', v_other.name);
  end if;

  -- Le plafond de partenaires est une RÈGLE SOCIALE, pas un levier d'équilibre
  -- (son effet mesuré, 1,7 pt, est dans le bruit) : il empêche le couple qui se
  -- co-signe quatre fois sur quatre d'être l'unique témoin de lui-même.
  select count(distinct m.round_no) into v_pairs from scrutin_game_meets m
   where m.room_id = v_room.id
     and least(m.seen_by, m.seen) = least(v_me.id, v_other.id)
     and greatest(m.seen_by, m.seen) = greatest(v_me.id, v_other.id);
  if v_pairs >= 2 then
    return jsonb_build_object('status', 'too_often', 'name', v_other.name);
  end if;

  insert into scrutin_game_meets (room_id, round_no, seen_by, seen, place)
  values (v_room.id, v_room.round_no, v_me.id, v_other.id, v_b.place)
  on conflict do nothing;

  return jsonb_build_object('status', 'ok', 'name', v_other.name);
end $function$;

-- ═══════════════════════════════════════════════════════ 6. LA HANTISE
--
-- Le Fantôme a 45 s à partir de l'instant tiré par le serveur. Il saisit le
-- code d'un portrait sur SON téléphone — un acte positif, tracé, jamais un trou.
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

-- ═════════════════════════════════════════ 7. LA PHOTO, ET LE CHOIX DU SALON
--
-- ⚠️ AUCUNE IMAGE NE PASSE PAR ICI. Le serveur n'apprend que « qui a rempli
-- quelle carte, et quand ». L'image naît et meurt dans le navigateur du joueur.
create or replace function public.fantome_photo(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me scrutin_game_players;
  v_room scrutin_game_rooms;
begin
  select * into v_me from scrutin_game_players where token = p_token;
  if v_me.id is null then return jsonb_build_object('status', 'invalid'); end if;
  select * into v_room from scrutin_game_rooms where id = v_me.room_id;
  if v_room.game <> 'fantome' or v_room.status <> 'playing' then
    return jsonb_build_object('status', 'closed');
  end if;
  update scrutin_game_photos set taken_at = now()
   where room_id = v_room.id and round_no = v_room.round_no
     and player_id = v_me.id and taken_at is null;
  if not found then return jsonb_build_object('status', 'already'); end if;
  return jsonb_build_object('status', 'ok');
end $function$;

-- « Je préfère être derrière l'objectif ». Ne coûte AUCUN point, se défait en
-- silence et sans confirmation depuis n'importe quel écran — c'est ce qui
-- permet à un enfant de défaire en trois secondes ce qu'un adulte a coché pour
-- lui. ⚠️ Ce choix ne retire AUCUNE photo déjà prise : elles dorment dans le
-- navigateur des autres, et rien ne relie une image aux gens qu'elle montre.
-- L'écran doit le dire, pas le masquer.
create or replace function public.fantome_photo_ok(p_token text, p_ok boolean)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_me scrutin_game_players;
begin
  select * into v_me from scrutin_game_players where token = p_token;
  if v_me.id is null then return jsonb_build_object('status', 'invalid'); end if;
  update scrutin_game_players set photo_ok = p_ok where id = v_me.id;
  return jsonb_build_object('status', 'ok');
end $function$;

-- ═══════════════════════════════════ 7 bis. LE BRANCHEMENT SUR LE SOCLE
--
-- `game_next_round` est PARTAGÉE par les quatre jeux : on la réécrit en entier
-- (c'est la seule façon en PL/pgSQL) en préservant mot pour mot les branches
-- d'Unanimo, d'Alibi et de Rôdeurs. Deux changements, et deux seulement :
-- `fantome` rejoint `rodeurs` dans la liste des jeux SANS verbe d'hôte, et la
-- donne du Fantôme est appelée à chaque manche.
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

  if v_room.round_no >= v_room.rounds_total then
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

-- ═══════════════════════════════════════════════════════ 8. LES DROITS
--
-- ⚠️ `grant … to authenticated` NE SUFFIT PAS : Postgres donne à PUBLIC un
-- droit d'exécution par défaut sur toute fonction. Le `revoke` vient donc
-- AVANT. Piège payé deux fois sur ce dépôt.
revoke all on function public.scrutin_game_fantome_code(text, timestamptz) from public, anon, authenticated;
revoke all on function public.scrutin_game_fantome_seal(text, timestamptz) from public, anon, authenticated;
revoke all on function public.scrutin_game_fantome_deal(uuid, int) from public, anon, authenticated;
revoke all on function public.fantome_borne_pair(text, text) from public, anon, authenticated;
revoke all on function public.fantome_borne_poll(text) from public, anon, authenticated;
revoke all on function public.fantome_beat(text, text) from public, anon, authenticated;
revoke all on function public.fantome_sign(text, text) from public, anon, authenticated;
revoke all on function public.fantome_haunt(text, text) from public, anon, authenticated;
revoke all on function public.fantome_photo(text) from public, anon, authenticated;
revoke all on function public.fantome_photo_ok(text, boolean) from public, anon, authenticated;

grant execute on function public.fantome_borne_pair(text, text) to anon, authenticated;
grant execute on function public.fantome_borne_poll(text) to anon, authenticated;
grant execute on function public.fantome_beat(text, text) to anon, authenticated;
grant execute on function public.fantome_sign(text, text) to anon, authenticated;
grant execute on function public.fantome_haunt(text, text) to anon, authenticated;
grant execute on function public.fantome_photo(text) to anon, authenticated;
grant execute on function public.fantome_photo_ok(text, boolean) to anon, authenticated;
