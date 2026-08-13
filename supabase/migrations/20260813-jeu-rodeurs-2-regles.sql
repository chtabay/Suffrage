-- ═══════════════════════════════════════════════════════════════════════════
-- RÔDEURS — étage 2 : la donne, les verbes, la clôture, le score.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Suite de `20260813-jeu-rodeurs-1-schema.sql`. Ce fichier porte TOUTE la règle
-- et il est rejouable à blanc : chaque fonction est un `create or replace`, le
-- catalogue un `on conflict do nothing`. Il consolide les étages appliqués à la
-- main (donne, verbes, clôture, score, flux) en leur DERNIÈRE version — et un
-- contrôle md5 contre `pg_proc.prosrc` a vérifié qu'il décrit exactement la
-- base au moment du commit.
--
-- ⚠️ AUCUN VERBE D'HÔTE. Sur les 35 minutes d'Alibi, un hôte qui pose son
-- téléphone est un incident ; sur une soirée de deux heures où il va le mettre
-- à charger ou sortir prendre l'air, c'est la partie de onze personnes qui
-- s'arrête. Tout est gardé par le JETON DU JOUEUR — `game_reveal` et
-- `game_next_round` acceptent n'importe quel joueur quand le jeu est `rodeurs`.
--
-- ⚠️ LE CORRECTIF QUI SAUVE LE JEU est dans `rodeurs_meet` : une rencontre
-- entre deux rôdeurs NE S'ÉCRIT PAS. Sans lui, trois complices qui ne se
-- valident qu'entre eux ne produisent aucune marque, ne figurent pas dans la
-- liste publique « sans aucune rencontre » (ils ont des rencontres — entre
-- eux) et deviennent invisibles : le village retombe à 0,5 %, le hasard exact.
-- REPRODUIT EN BASE avant correctif, refermé, re-vérifié.
--
-- ⚠️ RÉSERVE : la règle « quitter, c'est se rendre » (`rodeurs_leave`) n'a
-- jamais été simulée. Elle ferme une ligne strictement dominante mesurée sur
-- une mécanique voisine (village 58 % → 0,1 % quand s'absenter est gratuit),
-- mais son coût ici n'est pas chiffré. `hit` et `size` sont écrits dans le
-- résultat final pour lire le vrai taux sur les vraies parties.

-- ══════════════════════════════════════════ 1. LE CATALOGUE DES PATRONS
-- Treize patrons, tous choisis sur un seul critère : VÉRIFIABLES par une
-- requête simple sur le registre. Les libellés vivent côté client, dans les
-- quatre langues — la base garde ce qui a été joué, pas un catalogue traduit.
insert into public.scrutin_game_rodeurs_patterns
  (pattern, band, needs_target, needs_place, needs_n, n_min, n_max)
values
  ('VALIDE_PAR',   'petit', true,  false, false, null, null),
  ('VALIDE_PAR_N', 'petit', false, false, true,  2, 3),
  ('DANS_LIEU',    'petit', false, true,  false, null, null),
  ('DEUX_LIEUX',   'petit', false, false, false, null, null),
  ('VALIDE_N',     'moyen', false, false, true,  3, 4),
  ('ALLER_RETOUR', 'moyen', true,  false, false, null, null),
  ('LIEUX_N',      'moyen', false, false, true,  2, 3),
  ('PAIRE_LIEU',   'moyen', false, false, false, null, null),
  ('EVITE',        'moyen', true,  false, false, null, null),
  ('TABLEE',       'grand', false, false, true,  4, 6),
  ('CHAINE',       'grand', true,  false, false, null, null),
  ('PREMIER',      'grand', false, false, false, null, null),
  ('DISCRET',      'grand', false, false, false, null, null)
on conflict (pattern) do nothing;

-- ══════════════════════════════════════════ 2. LE SCEAU
-- Le code à quatre chiffres, régénéré à CHAQUE manche — un code crié à travers
-- la maison ne vaut pas la soirée. Pourquoi pas un QR : vérifié sur sources,
-- BarcodeDetector n'existe sur AUCUN navigateur iOS ; un joueur qui ne peut pas
-- valider est sans alibi structurel, et la couverture exigée est 100 %.
create or replace function public.scrutin_game_rodeurs_seal(p_room uuid)
returns text language plpgsql volatile set search_path to 'public' as $function$
declare v_c text; v_try int := 0;
begin
  loop
    v_try := v_try + 1;
    v_c := lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (
      select 1 from scrutin_game_players p
       where p.room_id = p_room and p.secret->>'seal' = v_c);
    if v_try > 50 then return v_c; end if;   -- 16 codes sur 10 000 : inatteignable
  end loop;
  return v_c;
end $function$;

-- ══════════════════════════════════════════ 3. LA DONNE
-- Appelée à l'ouverture de chaque manche. ELLE EST SERVEUR, et c'est le point :
-- dans Unanimo le client de l'hôte tire le thème ; le même chemin donnerait ici
-- la liste des rôdeurs à l'hôte. Elle écrit aussi la mission dans `me.secret`
-- (le client la lit là) et remet le compteur d'échecs de frappe à zéro.
create or replace function public.scrutin_game_rodeurs_deal(p_room uuid, p_round int)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  v_ids uuid[];
  v_n int;
  v_r int;
  v_rodeurs uuid[];
  v_id uuid;
  v_band text;
  v_pat record;
  v_secret jsonb;
  v_args jsonb;
  v_cible text;
  v_secretes uuid[];
  v_places text[] := array['cuisine','salon','jardin','terrasse','couloir','veranda'];
begin
  select coalesce(array_agg(p.id order by p.created_at), '{}') into v_ids
    from scrutin_game_players p
   where p.room_id = p_room and p.left_at is null;
  v_n := coalesce(array_length(v_ids, 1), 0);
  if v_n < 5 then return; end if;

  v_r := case when v_n <= 9 then 2 when v_n <= 12 then 3 else 4 end;

  select coalesce(array_agg(p.id), '{}') into v_rodeurs
    from scrutin_game_players p
   where p.room_id = p_room and p.secret->>'role' = 'rodeur';

  if coalesce(array_length(v_rodeurs, 1), 0) = 0 then
    select coalesce(array_agg(x), '{}') into v_rodeurs
      from (select unnest(v_ids) x order by random() limit v_r) s;
    foreach v_id in array v_ids loop
      update scrutin_game_players
         set secret = jsonb_build_object(
               'role', case when v_id = any(v_rodeurs) then 'rodeur' else 'habitant' end,
               'complices', case when v_id = any(v_rodeurs)
                                 then (select coalesce(jsonb_agg(p2.name), '[]'::jsonb)
                                         from scrutin_game_players p2
                                        where p2.id = any(v_rodeurs) and p2.id <> v_id)
                                 else '[]'::jsonb end,
               'faux_left', case when v_id = any(v_rodeurs) then 3 else 0 end)
       where id = v_id;
    end loop;
  end if;

  select coalesce(array_agg(x), '{}') into v_secretes
    from (select p.id x from scrutin_game_players p
           where p.room_id = p_room and p.left_at is null
             and coalesce(p.band, 'grand') <> 'petit'
           order by random() limit greatest(1, round(v_n / 3.0)::int)) s;

  foreach v_id in array v_ids loop
    select coalesce(band, 'grand') into v_band from scrutin_game_players where id = v_id;

    select * into v_pat from scrutin_game_rodeurs_patterns
     where band = v_band order by random() limit 1;
    if v_pat.pattern is null then continue; end if;

    v_args := '{}'::jsonb;
    if v_pat.needs_target then
      select p.name into v_cible from scrutin_game_players p
       where p.room_id = p_room and p.id <> v_id and p.left_at is null
         and (p_round = 1 or exists (
               select 1 from scrutin_game_meets m
                where m.room_id = p_room and m.round_no = p_round - 1
                  and (m.seen = p.id or m.seen_by = p.id)))
       order by random() limit 1;
      if v_cible is null then
        select p.name into v_cible from scrutin_game_players p
         where p.room_id = p_room and p.id <> v_id and p.left_at is null
         order by random() limit 1;
      end if;
      v_args := v_args || jsonb_build_object('cible', v_cible);
    end if;
    if v_pat.needs_place then
      v_args := v_args || jsonb_build_object('lieu', v_places[1 + floor(random() * array_length(v_places, 1))::int]);
    end if;
    if v_pat.needs_n then
      v_args := v_args || jsonb_build_object('n', v_pat.n_min + floor(random() * (v_pat.n_max - v_pat.n_min + 1))::int);
    end if;

    insert into scrutin_game_missions (room_id, round_no, player_id, pattern, args, is_secret)
    values (p_room, p_round, v_id, v_pat.pattern, v_args, v_id = any(v_secretes))
    on conflict (room_id, round_no, player_id) do nothing;

    select secret into v_secret from scrutin_game_players where id = v_id;
    update scrutin_game_players
       set secret = coalesce(v_secret, '{}'::jsonb)
                  || jsonb_build_object(
                       'seal', scrutin_game_rodeurs_seal(p_room),
                       'roundNo', p_round,
                       'misses', 0,
                       'mission', jsonb_build_object(
                         'pattern', v_pat.pattern,
                         'args', v_args,
                         'secret', v_id = any(v_secretes)))
     where id = v_id;
  end loop;
end $function$;

-- ══════════════════════════════════════════ 4. LES VERBES DU JOUEUR

-- TAPER LE CODE DE QUELQU'UN — la brique de tout le jeu. La résolution
-- code → joueur se fait ENTIÈREMENT côté serveur : le sceau d'un tiers n'est
-- jamais renvoyé à personne. Quinze échecs par manche ferment la frappe : un
-- joueur outillé pourrait sinon essayer les 10 000 codes et se fabriquer des
-- rencontres avec toute la maison sans bouger de sa chaise.
create or replace function public.rodeurs_meet(p_token text, p_seal text, p_place text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me scrutin_game_players;
  v_room scrutin_game_rooms;
  v_round scrutin_game_rounds;
  v_other scrutin_game_players;
  v_place text := lower(btrim(coalesce(p_place, '')));
  v_miss int;
begin
  select * into v_me from scrutin_game_players where token = p_token;
  if v_me.id is null then return jsonb_build_object('status', 'invalid'); end if;
  select * into v_room from scrutin_game_rooms where id = v_me.room_id;
  if v_room.game <> 'rodeurs' then return jsonb_build_object('status', 'invalid'); end if;
  if v_room.round_no < 1 then return jsonb_build_object('status', 'not_started'); end if;
  if v_me.left_at is not null then return jsonb_build_object('status', 'left'); end if;
  select * into v_round from scrutin_game_rounds
   where room_id = v_room.id and round_no = v_room.round_no;
  if v_round.id is null or v_round.phase <> 'contribution' then
    return jsonb_build_object('status', 'closed');
  end if;
  if v_place !~ '^[a-z][a-z0-9_-]{1,24}$' then return jsonb_build_object('status', 'bad_place'); end if;

  v_miss := coalesce((v_me.secret->>'misses')::int, 0);
  if v_miss >= 15 then return jsonb_build_object('status', 'too_many'); end if;

  select * into v_other from scrutin_game_players
   where room_id = v_room.id and secret->>'seal' = btrim(coalesce(p_seal, ''))
     and left_at is null;
  if v_other.id is null then
    update scrutin_game_players
       set secret = secret || jsonb_build_object('misses', v_miss + 1)
     where id = v_me.id;
    return jsonb_build_object('status', 'no_seal');
  end if;
  if v_other.id = v_me.id then return jsonb_build_object('status', 'self'); end if;

  -- LE CORRECTIF QUI SAUVE LE JEU : entre complices, rien ne s'écrit — ni
  -- alibi, ni rencontre. La clique retombe à zéro rencontre, donc dans la
  -- liste publique « sans aucune rencontre » (reproduit en base : 0,5 % → le
  -- coup fermé). Seul un rôdeur peut voir ce statut, et il connaît déjà les
  -- siens depuis la donne.
  if v_me.secret->>'role' = 'rodeur' and v_other.secret->>'role' = 'rodeur' then
    return jsonb_build_object('status', 'complice', 'name', v_other.name);
  end if;

  begin
    insert into scrutin_game_meets (room_id, round_no, seen_by, seen, place)
    values (v_room.id, v_room.round_no, v_me.id, v_other.id, v_place);
  exception when unique_violation then
    return jsonb_build_object('status', 'already', 'name', v_other.name);
  end;

  update scrutin_game_rooms set last_active_at = now() where id = v_room.id;
  return jsonb_build_object('status', 'ok', 'name', v_other.name);
end $function$;

-- POSER UNE MARQUE — le seul geste du rôdeur, un par manche, phase contribution
-- seulement. La pièce annoncée vient OBLIGATOIREMENT d'une rencontre où il est
-- partie prenante : le mensonge existe, mais il est borné par le registre
-- (paramètre libre mesuré à 9,8 % de victoires du village — fermé).
create or replace function public.rodeurs_mark(p_token text, p_meet_id uuid, p_alibi_meet_id uuid default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me scrutin_game_players;
  v_room scrutin_game_rooms;
  v_round scrutin_game_rounds;
  v_meet scrutin_game_meets;
  v_alibi scrutin_game_meets;
  v_victim uuid;
  v_place text;
  v_faked boolean := false;
  v_left int;
begin
  select * into v_me from scrutin_game_players where token = p_token;
  if v_me.id is null then return jsonb_build_object('status', 'invalid'); end if;
  if v_me.secret->>'role' <> 'rodeur' then return jsonb_build_object('status', 'forbidden'); end if;
  select * into v_room from scrutin_game_rooms where id = v_me.room_id;
  if v_room.round_no < 1 then return jsonb_build_object('status', 'not_started'); end if;
  select * into v_round from scrutin_game_rounds
   where room_id = v_room.id and round_no = v_room.round_no;
  if v_round.id is null or v_round.phase <> 'contribution' then
    return jsonb_build_object('status', 'closed');
  end if;

  select * into v_meet from scrutin_game_meets
   where id = p_meet_id and room_id = v_room.id and round_no = v_room.round_no
     and (seen_by = v_me.id or seen = v_me.id);
  if v_meet.id is null then return jsonb_build_object('status', 'no_meet'); end if;

  v_victim := case when v_meet.seen_by = v_me.id then v_meet.seen else v_meet.seen_by end;
  if exists (select 1 from scrutin_game_players p
              where p.id = v_victim and p.secret->>'role' = 'rodeur') then
    return jsonb_build_object('status', 'complice');
  end if;

  v_place := v_meet.place;
  if p_alibi_meet_id is not null then
    select * into v_alibi from scrutin_game_meets
     where id = p_alibi_meet_id and room_id = v_room.id and round_no = v_room.round_no
       and (seen_by = v_me.id or seen = v_me.id);
    if v_alibi.id is null then return jsonb_build_object('status', 'no_alibi'); end if;
    v_left := coalesce((v_me.secret->>'faux_left')::int, 0);
    if v_left <= 0 then return jsonb_build_object('status', 'no_fake_left'); end if;
    if v_alibi.place <> v_meet.place then
      v_place := v_alibi.place;
      v_faked := true;
      update scrutin_game_players
         set secret = secret || jsonb_build_object('faux_left', v_left - 1)
       where id = v_me.id;
    end if;
  end if;

  insert into scrutin_game_marks (room_id, round_no, rodeur_id, victim_id, meet_id, place, faked)
  values (v_room.id, v_room.round_no, v_me.id, v_victim, v_meet.id, v_place, v_faked)
  on conflict (room_id, round_no, rodeur_id)
    do update set victim_id = excluded.victim_id, meet_id = excluded.meet_id,
                  place = excluded.place, faked = excluded.faked, at = now();

  update scrutin_game_rooms set last_active_at = now() where id = v_room.id;
  return jsonb_build_object('status', 'ok', 'faked', v_faked);
end $function$;

-- PUBLIER SON LOT. Le bouton est gros et rapporte un point : si plus personne
-- ne publie, le village tombe de 58,9 % à 19,8 %. Brûler une mission secrète
-- VIDE aussi ses points — publier pendant le reveal arrive APRÈS l'évaluation,
-- qui avait déjà écrit 3.
create or replace function public.rodeurs_publish(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me scrutin_game_players;
  v_room scrutin_game_rooms;
  v_n int;
begin
  select * into v_me from scrutin_game_players where token = p_token;
  if v_me.id is null then return jsonb_build_object('status', 'invalid'); end if;
  select * into v_room from scrutin_game_rooms where id = v_me.room_id;

  update scrutin_game_marks
     set published_at = now()
   where room_id = v_room.id and round_no = v_room.round_no
     and victim_id = v_me.id and published_at is null;
  get diagnostics v_n = row_count;
  if v_n = 0 then return jsonb_build_object('status', 'nothing'); end if;

  update scrutin_game_missions
     set burned = true, points = 0
   where room_id = v_room.id and round_no = v_room.round_no
     and player_id = v_me.id and is_secret;

  -- Les listes du tableau public reflètent la parole tout de suite.
  update scrutin_game_rounds
     set result = result || jsonb_build_object(
           'lots', scrutin_game_rodeurs_lots(v_room.id, v_room.round_no))
   where room_id = v_room.id and round_no = v_room.round_no
     and phase = 'reveal' and result is not null;

  return jsonb_build_object('status', 'ok');
end $function$;

-- LA CONFRONTATION — un nom, en secret, pendant la révélation. Elle se résout
-- TOUTE SEULE au dernier vote : aucun meneur, et le moment dramatique n'attend
-- pas l'ouverture de la manche suivante.
create or replace function public.rodeurs_vote(p_token text, p_name text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me scrutin_game_players;
  v_room scrutin_game_rooms;
  v_round scrutin_game_rounds;
  v_target scrutin_game_players;
  v_votes int;
  v_actifs int;
begin
  select * into v_me from scrutin_game_players where token = p_token;
  if v_me.id is null then return jsonb_build_object('status', 'invalid'); end if;
  if v_me.left_at is not null then return jsonb_build_object('status', 'left'); end if;
  select * into v_room from scrutin_game_rooms where id = v_me.room_id;
  select * into v_round from scrutin_game_rounds
   where room_id = v_room.id and round_no = v_room.round_no;
  if v_round.id is null or v_round.phase <> 'reveal' then
    return jsonb_build_object('status', 'closed');
  end if;
  if (v_round.result ? 'light') then return jsonb_build_object('status', 'done'); end if;

  select * into v_target from scrutin_game_players
   where room_id = v_room.id and name = btrim(coalesce(p_name, '')) and left_at is null;
  if v_target.id is null or v_target.id = v_me.id then
    return jsonb_build_object('status', 'bad_target');
  end if;

  insert into scrutin_game_entries (round_id, player_id, payload)
  values (v_round.id, v_me.id, jsonb_build_object('accuse', v_target.name))
  on conflict (round_id, player_id) do update
    set payload = excluded.payload, submitted_at = now();

  select count(*) into v_votes from scrutin_game_entries e
   where e.round_id = v_round.id and e.payload ? 'accuse';
  select count(*) into v_actifs from scrutin_game_players p
   where p.room_id = v_room.id and p.left_at is null;
  if v_votes >= v_actifs then
    perform scrutin_game_rodeurs_confront(v_round.id);
  end if;

  update scrutin_game_rooms set last_active_at = now() where id = v_room.id;
  return jsonb_build_object('status', 'ok');
end $function$;

-- LA BANDE D'ÂGE — déclarée par le joueur, au salon seulement. Publique et non
-- vérifiée : nier qu'on voit qui a huit ans dans une pièce serait absurde.
create or replace function public.rodeurs_band(p_token text, p_band text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_me scrutin_game_players; v_room scrutin_game_rooms;
begin
  if p_band not in ('petit', 'moyen', 'grand') then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into v_me from scrutin_game_players where token = p_token;
  if v_me.id is null then return jsonb_build_object('status', 'invalid'); end if;
  select * into v_room from scrutin_game_rooms where id = v_me.room_id;
  if v_room.game <> 'rodeurs' or v_room.status <> 'lobby' then
    return jsonb_build_object('status', 'closed');
  end if;
  update scrutin_game_players set band = p_band where id = v_me.id;
  return jsonb_build_object('status', 'ok');
end $function$;

-- QUITTER, C'EST SE RENDRE. Un rôdeur qui touche « je vais me coucher » est
-- révélé à la clôture et compté comme démasqué — sans cette règle, se déclarer
-- absent est une ligne strictement dominante (mesuré sur une mécanique voisine :
-- village 58 % → 0,1 %). ⚠️ Non simulée ici : c'est la réserve du lot.
create or replace function public.rodeurs_leave(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_me scrutin_game_players;
begin
  select * into v_me from scrutin_game_players where token = p_token;
  if v_me.id is null then return jsonb_build_object('status', 'invalid'); end if;
  update scrutin_game_players set left_at = now() where id = v_me.id and left_at is null;
  return jsonb_build_object('status', 'ok', 'wasRodeur', v_me.secret->>'role' = 'rodeur');
end $function$;

-- ══════════════════════════════════════════ 5. LA CLÔTURE ET LES MISSIONS

-- ÉVALUER UNE MISSION : un seul CASE sur le patron, relu à la clôture.
create or replace function public.scrutin_game_rodeurs_mission_done(
  p_room uuid, p_round int, p_player uuid, p_pattern text, p_args jsonb)
returns boolean language plpgsql stable set search_path to 'public' as $function$
declare
  v_n int := coalesce((p_args->>'n')::int, 2);
  v_lieu text := p_args->>'lieu';
  v_cible uuid;
begin
  if p_args ? 'cible' then
    select id into v_cible from scrutin_game_players
     where room_id = p_room and name = p_args->>'cible';
  end if;

  return case p_pattern
    when 'VALIDE_PAR' then exists (
      select 1 from scrutin_game_meets m where m.room_id = p_room and m.round_no = p_round
        and m.seen = p_player and m.seen_by = v_cible)
    when 'VALIDE_PAR_N' then (
      select count(distinct m.seen_by) from scrutin_game_meets m
       where m.room_id = p_room and m.round_no = p_round and m.seen = p_player) >= v_n
    when 'DANS_LIEU' then exists (
      select 1 from scrutin_game_meets m where m.room_id = p_room and m.round_no = p_round
        and (m.seen = p_player or m.seen_by = p_player) and m.place = v_lieu)
    when 'DEUX_LIEUX' then (
      select count(distinct m.place) from scrutin_game_meets m
       where m.room_id = p_room and m.round_no = p_round
         and (m.seen = p_player or m.seen_by = p_player)) >= 2
    when 'VALIDE_N' then (
      select count(distinct m.seen) from scrutin_game_meets m
       where m.room_id = p_room and m.round_no = p_round and m.seen_by = p_player) >= v_n
    when 'ALLER_RETOUR' then exists (
      select 1 from scrutin_game_meets m where m.room_id = p_room and m.round_no = p_round
        and ((m.seen_by = p_player and m.seen = v_cible) or (m.seen_by = v_cible and m.seen = p_player)))
    when 'LIEUX_N' then (
      select count(distinct m.place) from scrutin_game_meets m
       where m.room_id = p_room and m.round_no = p_round
         and (m.seen = p_player or m.seen_by = p_player)) >= v_n
    when 'PAIRE_LIEU' then exists (
      select 1 from scrutin_game_meets m where m.room_id = p_room and m.round_no = p_round
        and (m.seen = p_player or m.seen_by = p_player)
       group by m.place having count(*) >= 2)
    when 'EVITE' then not exists (
      select 1 from scrutin_game_meets m where m.room_id = p_room and m.round_no = p_round
        and ((m.seen = p_player and m.seen_by = v_cible) or (m.seen_by = p_player and m.seen = v_cible)))
    when 'TABLEE' then exists (
      select 1 from scrutin_game_meets m2 where m2.room_id = p_room and m2.round_no = p_round
        and m2.place in (select m.place from scrutin_game_meets m
                          where m.room_id = p_room and m.round_no = p_round
                            and (m.seen = p_player or m.seen_by = p_player))
       group by m2.place having count(*) >= v_n)
    when 'CHAINE' then exists (
      select 1 from scrutin_game_meets a
        join scrutin_game_meets b on b.room_id = a.room_id and b.round_no = a.round_no
       where a.room_id = p_room and a.round_no = p_round and a.seen_by = p_player
         and (b.seen_by = a.seen or b.seen = a.seen)
         and (b.seen = v_cible or b.seen_by = v_cible))
    when 'PREMIER' then exists (
      select 1 from scrutin_game_meets m where m.room_id = p_room and m.round_no = p_round
        and (m.seen = p_player or m.seen_by = p_player)
       order by m.at, m.id limit 1)
      and (select (m.seen = p_player or m.seen_by = p_player) from scrutin_game_meets m
            where m.room_id = p_room and m.round_no = p_round order by m.at, m.id limit 1)
    when 'DISCRET' then (
      select count(distinct case when m.seen = p_player then m.seen_by else m.seen end)
        from scrutin_game_meets m where m.room_id = p_room and m.round_no = p_round
         and (m.seen = p_player or m.seen_by = p_player)) = 1
    else false end;
end $function$;

-- ⚠️ PUBLIER DOIT SE VOIR — défaut trouvé en jouant au navigateur, invisible
-- autrement : les listes étaient figées dans `result` au dépouillement, et
-- publier ne les réécrivait pas. Le tableau disait « la personne se tait »
-- toute la manche, même après que la victime avait parlé. Le calcul vit donc
-- dans UNE fonction, que le dépouillement ET la publication appellent.
create or replace function public.scrutin_game_rodeurs_lots(p_room uuid, p_round int)
returns jsonb language plpgsql stable set search_path to 'public' as $function$
declare v_lots jsonb;
begin
  -- ⚠️ Si le lot se réduit à UN nom, pas de pièce : le lot devient tout le
  -- carnet de la manche. Servir les singletons ferait passer la preuve directe
  -- de 34 % à 45 % — une machine qui vous sert le coupable n'est pas un jeu.
  select coalesce(jsonb_agg(x order by x->>'place'), '[]'::jsonb) into v_lots
    from (
      select jsonb_build_object(
               'place', case when cardinality(t.noms) <= 1 then null else k.place end,
               'names', to_jsonb(case when cardinality(t.noms) <= 1 then t.tous else t.noms end),
               'published', (k.published_at is not null),
               'victim', case when k.published_at is not null then vp.name else null end) as x
        from scrutin_game_marks k
        join scrutin_game_players vp on vp.id = k.victim_id
        cross join lateral (
          select coalesce(array_agg(distinct o.name) filter (where m.place = k.place), '{}') as noms,
                 coalesce(array_agg(distinct o.name), '{}') as tous
            from scrutin_game_meets m
            join scrutin_game_players o
              on o.id = case when m.seen_by = k.victim_id then m.seen else m.seen_by end
           where m.room_id = p_room and m.round_no = p_round
             and (m.seen_by = k.victim_id or m.seen = k.victim_id)) t
       where k.room_id = p_room and k.round_no = p_round) s;
  return v_lots;
end $function$;

-- LA CLÔTURE D'UNE MANCHE : dépôt d'office des marques, missions, lots.
create or replace function public.scrutin_game_rodeurs_reveal(p_round_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  v_round scrutin_game_rounds;
  v_room scrutin_game_rooms;
  v_r record;
  v_meet scrutin_game_meets;
  v_nomeet jsonb;
  v_asleep jsonb;
begin
  select * into v_round from scrutin_game_rounds where id = p_round_id;
  select * into v_room from scrutin_game_rooms where id = v_round.room_id;

  -- (a) LE DÉPÔT D'OFFICE DE LA MARQUE. Le rôdeur qui n'a rien fait est marqué
  -- au hasard parmi ses rencontres : jouer au hasard fait passer le village de
  -- 59,3 % à 90,4 %. La passivité coûte 31 points et ne peut pas être une
  -- stratégie.
  for v_r in
    select p.id from scrutin_game_players p
     where p.room_id = v_room.id and p.secret->>'role' = 'rodeur' and p.left_at is null
       and not exists (select 1 from scrutin_game_marks k
                        where k.room_id = v_room.id and k.round_no = v_round.round_no
                          and k.rodeur_id = p.id)
  loop
    select m.* into v_meet from scrutin_game_meets m
     where m.room_id = v_room.id and m.round_no = v_round.round_no
       and (m.seen_by = v_r.id or m.seen = v_r.id)
       and not exists (select 1 from scrutin_game_players p2
                        where p2.id = case when m.seen_by = v_r.id then m.seen else m.seen_by end
                          and p2.secret->>'role' = 'rodeur')
     order by random() limit 1;
    -- (b) S'il n'a validé PERSONNE, pas de marque — et il apparaît publiquement
    -- en « sans aucune rencontre » : le rendez-vous des complices est un
    -- suicide, pas une stratégie (0,5 % -> 99,8 %, coût +4 à +7 points).
    if v_meet.id is not null then
      insert into scrutin_game_marks (room_id, round_no, rodeur_id, victim_id, meet_id, place, auto)
      values (v_room.id, v_round.round_no, v_r.id,
              case when v_meet.seen_by = v_r.id then v_meet.seen else v_meet.seen_by end,
              v_meet.id, v_meet.place, true)
      on conflict (room_id, round_no, rodeur_id) do nothing;
    end if;
  end loop;

  -- (c) LES MISSIONS : 3 points dans les TROIS bandes — la bande change la
  -- forme de la consigne, jamais la valeur.
  update scrutin_game_missions m
     set done_at = now(),
         points = case when m.is_secret and m.burned then 0 else 3 end
   where m.room_id = v_room.id and m.round_no = v_round.round_no and m.done_at is null
     and scrutin_game_rodeurs_mission_done(v_room.id, v_round.round_no, m.player_id, m.pattern, m.args);

  -- (e) SANS AUCUNE RENCONTRE, et QUI DORT.
  select coalesce(jsonb_agg(p.name order by p.name), '[]'::jsonb) into v_nomeet
    from scrutin_game_players p
   where p.room_id = v_room.id and p.left_at is null
     and not exists (select 1 from scrutin_game_meets m
                      where m.room_id = v_room.id and m.round_no = v_round.round_no
                        and (m.seen_by = p.id or m.seen = p.id));
  select coalesce(jsonb_agg(p.name order by p.name), '[]'::jsonb) into v_asleep
    from scrutin_game_players p where p.room_id = v_room.id and p.left_at is not null;

  update scrutin_game_rounds
     set result = jsonb_build_object(
           'rule', 'rodeurs-v1',
           -- (d) LES LOTS — via la fonction partagée : `rodeurs_publish` les
           -- recalcule avec elle quand une victime parle.
           'lots', scrutin_game_rodeurs_lots(v_room.id, v_round.round_no),
           'noMeet', v_nomeet,
           'asleep', v_asleep,
           'marks', (select count(*) from scrutin_game_marks
                      where room_id = v_room.id and round_no = v_round.round_no))
   where id = p_round_id;
end $function$;

-- LA CONFRONTATION porte la fin de partie : mise en lumière, puis — si tous les
-- rôdeurs sont pris, ou si c'était la dernière manche — résolution et salle
-- fermée. LA SOIRÉE S'ARRÊTE DÈS QUE C'EST FAIT.
create or replace function public.scrutin_game_rodeurs_confront(p_round_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  v_round scrutin_game_rounds;
  v_room scrutin_game_rooms;
  v_name text;
  v_was boolean;
  v_r int;
  v_pris int;
begin
  select * into v_round from scrutin_game_rounds where id = p_round_id;
  if v_round.result ? 'light' then return; end if;
  select * into v_room from scrutin_game_rooms where id = v_round.room_id;

  select e.payload->>'accuse' into v_name
    from scrutin_game_entries e
   where e.round_id = p_round_id and coalesce(e.payload->>'accuse', '') <> ''
   group by e.payload->>'accuse'
   order by count(*) desc, e.payload->>'accuse'
   limit 1;

  if v_name is null then
    update scrutin_game_rounds set result = coalesce(result, '{}'::jsonb)
             || jsonb_build_object('light', null, 'wasRodeur', false)
     where id = p_round_id;
  else
    select (p.secret->>'role' = 'rodeur') into v_was from scrutin_game_players p
     where p.room_id = v_room.id and p.name = v_name;
    update scrutin_game_rounds set result = coalesce(result, '{}'::jsonb)
             || jsonb_build_object('light', v_name, 'wasRodeur', coalesce(v_was, false))
     where id = p_round_id;
  end if;

  select count(*) into v_r from scrutin_game_players
   where room_id = v_room.id and secret->>'role' = 'rodeur';
  select count(distinct x) into v_pris from (
    select r.result->>'light' x from scrutin_game_rounds r
     where r.room_id = v_room.id and (r.result->>'wasRodeur') = 'true'
    union
    select p.name from scrutin_game_players p
     where p.room_id = v_room.id and p.left_at is not null and p.secret->>'role' = 'rodeur') s
   where x is not null;

  if v_pris >= v_r or v_round.round_no >= v_room.rounds_total then
    perform scrutin_game_rodeurs_final(p_round_id);
    update scrutin_game_rooms set status = 'ended' where id = v_room.id;
  end if;
end $function$;

-- ══════════════════════════════════════════ 6. LE SCORE ET LA RÉSOLUTION
--
-- ⚠️ PLANCHER À ZÉRO, STRUCTUREL : aucune soustraction n'existe nulle part.
-- Le pire score possible est 0 — quelqu'un qui n'a pas touché son téléphone.
-- Un enfant ne peut JAMAIS voir son score baisser.
-- LA MAISON EST NETTE si les r rôdeurs sont tous mis en lumière avant que
-- E = r−1 innocents ne l'aient été. Résultat GRADUÉ : un budget qui ferme la
-- soirée d'un coup a été mesuré à 1,6 manche jouée.
create or replace function public.scrutin_game_rodeurs_final(p_round_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  v_round scrutin_game_rounds;
  v_room scrutin_game_rooms;
  v_r int;
  v_pris int;
  v_perdus int;
  v_nette boolean;
  v_scores jsonb;
  v_rodeurs jsonb;
begin
  select * into v_round from scrutin_game_rounds where id = p_round_id;
  select * into v_room from scrutin_game_rooms where id = v_round.room_id;

  select count(*) into v_r from scrutin_game_players
   where room_id = v_room.id and secret->>'role' = 'rodeur';

  select count(distinct x) into v_pris from (
    select r.result->>'light' x from scrutin_game_rounds r
     where r.room_id = v_room.id and (r.result->>'wasRodeur') = 'true'
    union
    select p.name from scrutin_game_players p
     where p.room_id = v_room.id and p.left_at is not null and p.secret->>'role' = 'rodeur') s
   where x is not null;

  select count(distinct r.result->>'light') into v_perdus from scrutin_game_rounds r
   where r.room_id = v_room.id and (r.result->>'wasRodeur') = 'false'
     and r.result->>'light' is not null;

  v_nette := (v_pris >= v_r) and (v_perdus <= greatest(v_r - 1, 1));

  with pts as (
    select p.id, p.name, (p.secret->>'role' = 'rodeur') as rod,
           coalesce((select sum(m.points) from scrutin_game_missions m
                      where m.room_id = v_room.id and m.player_id = p.id), 0) as miss,
           coalesce((select count(*) from scrutin_game_marks k
                      where k.room_id = v_room.id and k.victim_id = p.id
                        and k.published_at is not null), 0) as publies,
           coalesce((select count(*) from scrutin_game_entries e
                      join scrutin_game_rounds r on r.id = e.round_id
                     where r.room_id = v_room.id and e.player_id = p.id
                       and (r.result->>'wasRodeur') = 'true'
                       and e.payload->>'accuse' = r.result->>'light'), 0) as bons,
           -- RÔDEUR : ses missions ne rapportent RIEN — elles sont sa
           -- couverture, pas son objectif. Sinon il domine le classement en
           -- faisant exactement ce que le jeu lui demande déjà.
           coalesce((select count(*) filter (where not k.auto) * 3
                          + count(*) filter (where k.auto) from scrutin_game_marks k
                      where k.room_id = v_room.id and k.rodeur_id = p.id), 0) as marques,
           (not exists (select 1 from scrutin_game_rounds r
                         where r.room_id = v_room.id and r.result->>'light' = p.name
                           and (r.result->>'wasRodeur') = 'true')
            and p.left_at is null) as jamais_vu,
           coalesce((select count(*) * 2 from scrutin_game_rounds r
                      where r.room_id = v_room.id and (r.result->>'wasRodeur') = 'false'
                        and r.result->>'light' is not null), 0) as innocents_grilles
      from scrutin_game_players p where p.room_id = v_room.id
  )
  select coalesce(jsonb_object_agg(name, total), '{}'::jsonb) into v_scores from (
    select name,
           greatest(0, case when rod
             then marques + (case when jamais_vu then 8 else 0 end) + innocents_grilles
             else miss + publies + bons * 2 + (case when v_nette then 4 else 0 end) end) as total
      from pts) t;

  update scrutin_game_players p set score = coalesce((v_scores->>p.name)::int, 0)
   where p.room_id = v_room.id;

  select coalesce(jsonb_agg(p.name order by p.name), '[]'::jsonb) into v_rodeurs
    from scrutin_game_players p
   where p.room_id = v_room.id and p.secret->>'role' = 'rodeur';

  update scrutin_game_rounds
     set result = coalesce(result, '{}'::jsonb) || jsonb_build_object(
           'final', true,
           'rodeurs', v_rodeurs,
           'caught', v_pris,
           'wrong', v_perdus,
           'outcome', case when v_nette then 'nette'
                           when v_pris >= v_r - 1 then 'un_reste'
                           else 'perdu' end,
           -- L'INSTRUMENTATION : le jeu corrigé n'a jamais été simulé en
           -- entier ; `hit` et `size` servent à lire le vrai taux sur les
           -- vraies parties.
           'hit', v_nette,
           'size', (select count(*) from scrutin_game_players where room_id = v_room.id),
           'scores', v_scores)
   where id = p_round_id;
end $function$;

-- ══════════════════════════════════════════ 7. LES BRANCHES GÉNÉRIQUES

-- AVANCER. Pour Rôdeurs, N'IMPORTE QUEL JOUEUR — pas de verbe d'hôte sur une
-- soirée de deux heures. La confrontation de la manche écoulée se résout ici si
-- elle ne s'est pas résolue toute seule (quelqu'un n'a jamais voté).
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
  if v_room.game <> 'rodeurs' and not v_p.is_host then
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
  end if;

  return jsonb_build_object('status', 'ok', 'roundNo', v_next);
end $function$;

-- DÉPOUILLER. Pour Rôdeurs, n'importe quel joueur — et SANS résoudre la
-- confrontation de la dernière manche : elle se joue APRÈS le dépouillement, au
-- dernier vote ou à la demande de la manche suivante. (L'ancienne branche la
-- résolvait AVANT tout vote : les votes de la manche 5 tombaient en `done`,
-- silencieusement — le test l'avait masqué en votant après le reveal sans lire
-- les statuts.)
create or replace function public.game_reveal(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_p scrutin_game_players;
  v_room scrutin_game_rooms;
  v_round scrutin_game_rounds;
  v_ok int;
begin
  select * into v_p from scrutin_game_players where token = p_token;
  if v_p.id is null then return jsonb_build_object('status', 'forbidden'); end if;
  select * into v_room from scrutin_game_rooms where id = v_p.room_id for update;
  if v_room.game <> 'rodeurs' and not v_p.is_host then
    return jsonb_build_object('status', 'forbidden');
  end if;
  select * into v_round from scrutin_game_rounds
   where room_id = v_room.id and round_no = v_room.round_no;
  if v_round.id is null then return jsonb_build_object('status', 'no_round'); end if;

  update scrutin_game_rounds set phase = 'reveal', revealed_at = now()
   where id = v_round.id and phase = 'contribution';
  get diagnostics v_ok = row_count;
  if v_ok = 0 then return jsonb_build_object('status', 'ok'); end if;

  if v_room.game = 'unanimo' then
    perform scrutin_game_unanimo_reveal(v_round.id);
  elsif v_room.game = 'alibi' then
    if v_round.round_no >= v_room.rounds_total then
      perform scrutin_game_alibi_verdict(v_round.id);
    else
      perform scrutin_game_alibi_reveal(v_round.id);
    end if;
  elsif v_room.game = 'rodeurs' then
    perform scrutin_game_rodeurs_reveal(v_round.id);
  end if;

  update scrutin_game_rooms set last_active_at = now() where id = v_room.id;
  return jsonb_build_object('status', 'ok');
end $function$;

-- REJOINDRE : le roster se ferme au lancement pour Alibi ET Rôdeurs — un second
-- onglet donnerait un sceau de plus, donc des alibis fabriqués à volonté.
create or replace function public.game_join(p_code text, p_name text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_room scrutin_game_rooms;
  v_name text := left(btrim(coalesce(p_name, '')), 24);
  v_token text;
  v_joined int;
  v_count int;
begin
  if v_name = '' then return jsonb_build_object('status', 'no_name'); end if;
  select * into v_room from scrutin_game_rooms
   where code = upper(btrim(coalesce(p_code, ''))) for update;
  if v_room.id is null then return jsonb_build_object('status', 'not_found'); end if;

  if v_room.game in ('alibi', 'rodeurs') and v_room.status <> 'lobby' then
    return jsonb_build_object('status', 'started');
  end if;

  select count(*) into v_count from scrutin_game_players where room_id = v_room.id;
  if v_count >= 60 then return jsonb_build_object('status', 'full'); end if;

  v_joined := case when v_room.status = 'lobby' then 1 else v_room.round_no + 1 end;

  begin
    insert into scrutin_game_players (room_id, name, joined_round)
    values (v_room.id, v_name, v_joined)
    returning token into v_token;
  exception when unique_violation then
    return jsonb_build_object('status', 'name_taken');
  end;

  update scrutin_game_rooms set last_active_at = now() where id = v_room.id;
  return jsonb_build_object('status', 'ok', 'token', v_token, 'name', v_name, 'joinedRound', v_joined);
end $function$;

-- ══════════════════════════════════════════ 8. L'ÉTAT SERVI AU CLIENT
-- Trois ajouts pour Rôdeurs, tous sous le jeton : `players[].band` et
-- `players[].left` (publics par conception) ; `me.meets` — MES rencontres de la
-- manche (il faut un meet_id pour marquer, personne d'autre ne les reçoit) ;
-- `me.approached` — « on t'a approché », au reveal seulement, avec la même règle
-- du singleton que le tableau public.
create or replace function public.get_game_room(p_code text, p_token text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_room scrutin_game_rooms;
  v_me scrutin_game_players;
  v_round scrutin_game_rounds;
  v_players jsonb;
  v_expected int;
  v_submitted int;
  v_used jsonb;
begin
  select * into v_room from scrutin_game_rooms where code = upper(btrim(coalesce(p_code, '')));
  if v_room.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  if p_token is not null and p_token <> '' then
    select * into v_me from scrutin_game_players where token = p_token and room_id = v_room.id;
    if v_me.id is not null then
      update scrutin_game_players set seen_at = now()
       where id = v_me.id and seen_at < now() - interval '15 seconds';
    end if;
  end if;

  select * into v_round from scrutin_game_rounds where room_id = v_room.id and round_no = v_room.round_no;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'name', p.name,
               'score', p.score,
               'joinedRound', p.joined_round,
               'isHost', p.is_host,
               'isMe', (v_me.id is not null and p.id = v_me.id),
               'playing', (v_room.round_no > 0 and p.joined_round <= v_room.round_no),
               'band', p.band,
               'left', (p.left_at is not null),
               'done', (v_round.id is not null and exists (
                          select 1 from scrutin_game_entries e
                           where e.round_id = v_round.id and e.player_id = p.id)),
               'idle', (now() - p.seen_at > interval '90 seconds')
             )
             order by p.score desc, p.created_at
           ),
           '[]'::jsonb
         )
    into v_players
    from scrutin_game_players p
   where p.room_id = v_room.id;

  select count(*) into v_expected
    from scrutin_game_players p
   where p.room_id = v_room.id and p.left_at is null
     and (v_room.round_no = 0 or p.joined_round <= v_room.round_no);
  select count(*) into v_submitted
    from scrutin_game_entries e
   where v_round.id is not null and e.round_id = v_round.id;

  select coalesce(jsonb_agg(r.prompt->>'text'), '[]'::jsonb) into v_used
    from scrutin_game_rounds r where r.room_id = v_room.id and r.prompt ? 'text';

  return jsonb_build_object(
    'status', 'ok',
    'game', v_room.game,
    'code', v_room.code,
    'roomStatus', v_room.status,
    'roundNo', v_room.round_no,
    'roundsTotal', v_room.rounds_total,
    'settings', v_room.settings,
    'locale', v_room.locale,
    'nextCode', v_room.next_code,
    'usedPrompts', v_used,
    'players', v_players,
    'expected', v_expected,
    'me', case
            when v_me.id is null then null
            else jsonb_build_object(
                   'name', v_me.name, 'isHost', v_me.is_host,
                   'score', v_me.score, 'joinedRound', v_me.joined_round,
                   'band', v_me.band,
                   'left', (v_me.left_at is not null),
                   -- LE SEUL ENDROIT OÙ UN SECRET SORT.
                   'secret', v_me.secret,
                   'meets', case
                              when v_room.game = 'rodeurs' and v_round.id is not null then
                                (select coalesce(jsonb_agg(jsonb_build_object(
                                          'id', m.id, 'name', o.name, 'place', m.place)
                                          order by m.at), '[]'::jsonb)
                                   from scrutin_game_meets m
                                   join scrutin_game_players o
                                     on o.id = case when m.seen_by = v_me.id then m.seen else m.seen_by end
                                  where m.room_id = v_room.id and m.round_no = v_room.round_no
                                    and (m.seen_by = v_me.id or m.seen = v_me.id))
                              else null
                            end,
                   'approached', case
                              when v_room.game = 'rodeurs' and v_round.id is not null
                                   and v_round.phase = 'reveal' then
                                (select coalesce(jsonb_agg(jsonb_build_object(
                                          'place', case when (select count(*) from scrutin_game_meets m
                                                          where m.room_id = v_room.id
                                                            and m.round_no = v_room.round_no
                                                            and (m.seen_by = v_me.id or m.seen = v_me.id)
                                                            and m.place = k.place) <= 1
                                                        then null else k.place end,
                                          'published', (k.published_at is not null))), '[]'::jsonb)
                                   from scrutin_game_marks k
                                  where k.room_id = v_room.id and k.round_no = v_room.round_no
                                    and k.victim_id = v_me.id)
                              else null
                            end)
          end,
    'round', case
               when v_round.id is null then null
               else jsonb_build_object(
                      'no', v_round.round_no,
                      'prompt', v_round.prompt,
                      'phase', v_round.phase,
                      'submitted', v_submitted,
                      'mine', case
                                when v_me.id is null then null
                                when v_room.game = 'unanimo' then
                                  (select e.payload->'words' from scrutin_game_entries e
                                    where e.round_id = v_round.id and e.player_id = v_me.id)
                                else
                                  (select e.payload from scrutin_game_entries e
                                    where e.round_id = v_round.id and e.player_id = v_me.id)
                              end,
                      -- LE POINT DE COUPE : rien avant la révélation.
                      'result', case when v_round.phase = 'reveal' then v_round.result else null end)
             end
  );
end $function$;

-- ══════════════════════════════════════════ 9. LES DROITS
-- ⚠️ Le `grant` ne suffit pas : PUBLIC détient l'EXECUTE par défaut sur toute
-- fonction. Le `revoke` vient AVANT, et dans cet ordre.
revoke all on function public.scrutin_game_rodeurs_seal(uuid) from public, anon, authenticated;
revoke all on function public.scrutin_game_rodeurs_deal(uuid, int) from public, anon, authenticated;
revoke all on function public.scrutin_game_rodeurs_mission_done(uuid, int, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.scrutin_game_rodeurs_lots(uuid, int) from public, anon, authenticated;
revoke all on function public.scrutin_game_rodeurs_reveal(uuid) from public, anon, authenticated;
revoke all on function public.scrutin_game_rodeurs_confront(uuid) from public, anon, authenticated;
revoke all on function public.scrutin_game_rodeurs_final(uuid) from public, anon, authenticated;

revoke all on function public.rodeurs_meet(text, text, text) from public;
revoke all on function public.rodeurs_mark(text, uuid, uuid) from public;
revoke all on function public.rodeurs_publish(text) from public;
revoke all on function public.rodeurs_vote(text, text) from public;
revoke all on function public.rodeurs_band(text, text) from public;
revoke all on function public.rodeurs_leave(text) from public;
revoke all on function public.game_next_round(text, jsonb) from public;
revoke all on function public.game_reveal(text) from public;
revoke all on function public.game_join(text, text) from public;
revoke all on function public.get_game_room(text, text) from public;

grant execute on function public.rodeurs_meet(text, text, text) to anon, authenticated;
grant execute on function public.rodeurs_mark(text, uuid, uuid) to anon, authenticated;
grant execute on function public.rodeurs_publish(text) to anon, authenticated;
grant execute on function public.rodeurs_vote(text, text) to anon, authenticated;
grant execute on function public.rodeurs_band(text, text) to anon, authenticated;
grant execute on function public.rodeurs_leave(text) to anon, authenticated;
grant execute on function public.game_next_round(text, jsonb) to anon, authenticated;
grant execute on function public.game_reveal(text) to anon, authenticated;
grant execute on function public.game_join(text, text) to anon, authenticated;
grant execute on function public.get_game_room(text, text) to anon, authenticated;
