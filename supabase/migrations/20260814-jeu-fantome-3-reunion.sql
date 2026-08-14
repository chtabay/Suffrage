-- ═══════════════════════════════════════════════════════════════════════════
-- LA NUIT DU FANTÔME — étage 3 : le dépouillement, la réunion, la résolution.
-- ═══════════════════════════════════════════════════════════════════════════
-- Spec : docs/fantome-spec.md. Étages 1 (schéma) et 2 (la manche) d'abord.

-- ═══════════════════════════════════════════ 1. LE DÉPOUILLEMENT (LA CLÔTURE)
--
-- Ce que la maison apprend : pour chaque événement, QUAND et OÙ, puis qui était
-- PROUVÉ AILLEURS. Le reste — le recoupement — est humain, et c'est voulu.
--
-- ⚠️ AUCUN INDICE AUTOMATIQUE QUI DÉSIGNE QUELQU'UN. Ni « alibi de papier »
-- (mesuré : il marque un innocent 32,7 % des nuits contre 3,4 % pour le
-- Fantôme, et coûte 3 points au village), ni cumul de soupçon par joueur, ni
-- « dernier vu à la borne » — ce dernier désigne presque toujours un innocent,
-- puisque le Fantôme évite précisément d'être le dernier. L'app publie des
-- FAITS, jamais des accusations.
create or replace function public.scrutin_game_fantome_reveal(p_round_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  v_round scrutin_game_rounds;
  v_room scrutin_game_rooms;
  v_b record;
  v_events jsonb;
  v_gauge int;
  v_target int;
  v_n int;
begin
  select * into v_round from scrutin_game_rounds where id = p_round_id;
  select * into v_room from scrutin_game_rooms where id = v_round.room_id;

  -- (a) LA CHARGE PERDUE. Le Fantôme n'a rien fait dans ses 45 s : l'événement
  -- reste au registre sans lieu — la maison apprend qu'il a hésité, ce qui est
  -- une information, et la jauge du testament avance.
  -- Rien ne le PUNIT pour autant : c'est une occasion manquée, pas une faute.

  -- (b) LA BORNE DÉBRANCHÉE EST UNE HANTISE. ⚠️ Sans cela, débrancher un
  -- appareil serait une non-action — gratuite, infalsifiable — et c'est
  -- exactement le défaut qui a tué deux mécaniques concurrentes. La fenêtre
  -- part du dernier battement.
  for v_b in
    select b.id, b.seen_at from scrutin_game_bornes b
     where b.room_id = v_room.id and b.paired_at is not null
       and b.seen_at < now() - interval '90 s'
       and not exists (select 1 from scrutin_game_hauntings h
                        where h.room_id = v_room.id and h.round_no = v_round.round_no
                          and h.kind = 'panne' and h.borne_id = b.id)
  loop
    insert into scrutin_game_hauntings (room_id, round_no, kind, seq, armed_at, borne_id, done_at, toll_at)
    values (v_room.id, v_round.round_no, 'panne',
            1 + coalesce((select max(seq) from scrutin_game_hauntings
                           where room_id = v_room.id and round_no = v_round.round_no), 0),
            v_b.seen_at, v_b.id, v_b.seen_at, v_b.seen_at)
    on conflict (room_id, round_no, seq) do nothing;
  end loop;

  -- (c) LES ÉVÉNEMENTS, avec pour chacun QUI ÉTAIT PROUVÉ AILLEURS.
  --
  -- « Prouvé ailleurs » = une ronde à une AUTRE borne dont l'intervalle couvre
  -- l'instant (started_at .. beat_at). C'est tout ce que le serveur peut
  -- savoir : un joueur physiquement présent qui ne pointait pas est invisible,
  -- et l'écran doit le dire pour qu'on ne prenne pas l'absence de trace pour
  -- une preuve.
  select coalesce(jsonb_agg(x order by x->>'at'), '[]'::jsonb) into v_events
    from (
      select jsonb_build_object(
               'kind', h.kind,
               'at', h.done_at,
               'place', bp.place,
               'lost', (h.done_at is null),
               'cleared', coalesce((
                 select jsonb_agg(p.name order by p.name)
                   from scrutin_game_players p
                  where p.room_id = v_room.id and p.left_at is null
                    and exists (select 1 from scrutin_game_stints s
                                 where s.room_id = v_room.id and s.player_id = p.id
                                   and s.borne_id <> h.borne_id
                                   and s.started_at <= h.done_at
                                   and s.beat_at >= h.done_at)), '[]'::jsonb),
               -- Ceux dont le serveur ne sait rien à cet instant. ⚠️ CE N'EST
               -- PAS UNE LISTE DE SUSPECTS : c'est l'ensemble de ceux qui ne
               -- pointaient nulle part, ce qui arrive à tout le monde. L'écran
               -- doit l'écrire ainsi, jamais « les suspects sont ».
               'silent', coalesce((
                 select jsonb_agg(p.name order by p.name)
                   from scrutin_game_players p
                  where p.room_id = v_room.id and p.left_at is null
                    and not exists (select 1 from scrutin_game_stints s
                                     where s.room_id = v_room.id and s.player_id = p.id
                                       and s.started_at <= h.done_at
                                       and s.beat_at >= h.done_at)), '[]'::jsonb)) as x
        from scrutin_game_hauntings h
        left join scrutin_game_bornes bp on bp.id = h.borne_id
       where h.room_id = v_room.id and h.round_no = v_round.round_no) s;

  -- (d) LA JAUGE DU TESTAMENT. Les rondes menées à terme sur toute la nuit,
  -- plus les charges que le Fantôme a laissées passer.
  -- ⚠️ LA CIBLE N'EST PAS MESURÉE — c'est un curseur posé à vue, à relire sur
  -- les premières vraies soirées (`hit` et `size` sont écrits à la résolution
  -- pour ça). Deux tiers des rondes possibles : assez pour que la passivité
  -- coûte, assez peu pour qu'une maison qui joue y arrive.
  select count(*) into v_gauge from scrutin_game_stints
   where room_id = v_room.id and completed_at is not null;
  select count(*) into v_n from scrutin_game_players
   where room_id = v_room.id and left_at is null;
  v_target := greatest(1, (v_n * 3 * v_room.rounds_total * 2) / 3);
  v_gauge := v_gauge + (select count(*) * 3 from scrutin_game_hauntings
                         where room_id = v_room.id and kind = 'charge' and done_at is null
                           and armed_at < now() - interval '45 s');

  update scrutin_game_rounds
     set result = jsonb_build_object(
           'rule', 'fantome-v1',
           'events', v_events,
           'gauge', v_gauge,
           'target', v_target,
           -- Les endormis, comme dans Rôdeurs : partir est propre, et ne
           -- pollue pas l'enquête.
           'asleep', coalesce((select jsonb_agg(p.name order by p.name)
                                 from scrutin_game_players p
                                where p.room_id = v_room.id and p.left_at is not null), '[]'::jsonb))
   where id = p_round_id;
end $function$;

-- ═══════════════════════════════════════════════════════ 2. LA RÉUNION
--
-- Un nom, en secret. Elle se résout TOUTE SEULE au dernier vote : la v1 avait
-- livré une confrontation qui se résolvait avant tout vote sur la dernière
-- manche, et les bulletins tombaient en silence.
create or replace function public.fantome_vote(p_token text, p_name text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me scrutin_game_players;
  v_room scrutin_game_rooms;
  v_round scrutin_game_rounds;
  v_target scrutin_game_players;
  v_left int;
begin
  select * into v_me from scrutin_game_players where token = p_token;
  if v_me.id is null then return jsonb_build_object('status', 'invalid'); end if;
  if v_me.left_at is not null then return jsonb_build_object('status', 'left'); end if;
  select * into v_room from scrutin_game_rooms where id = v_me.room_id;
  if v_room.game <> 'fantome' then return jsonb_build_object('status', 'invalid'); end if;
  select * into v_round from scrutin_game_rounds
   where room_id = v_room.id and round_no = v_room.round_no;
  if v_round.id is null or v_round.phase <> 'reveal' then
    return jsonb_build_object('status', 'closed');
  end if;
  if v_round.result ? 'light' then return jsonb_build_object('status', 'done'); end if;

  select * into v_target from scrutin_game_players
   where room_id = v_room.id and name = p_name and left_at is null and id <> v_me.id;
  if v_target.id is null then return jsonb_build_object('status', 'bad_target'); end if;

  insert into scrutin_game_entries (round_id, player_id, payload)
  values (v_round.id, v_me.id, jsonb_build_object('accuse', p_name))
  on conflict (round_id, player_id) do update set payload = excluded.payload;

  -- Le dernier bulletin résout la réunion. On compte les joueurs ENCORE là :
  -- une maison ne doit pas attendre le téléphone de quelqu'un qui dort.
  select count(*) into v_left from scrutin_game_players p
   where p.room_id = v_room.id and p.left_at is null
     and not exists (select 1 from scrutin_game_entries e
                      where e.round_id = v_round.id and e.player_id = p.id);
  if v_left = 0 then
    perform scrutin_game_fantome_light(v_round.id);
  end if;

  return jsonb_build_object('status', 'ok');
end $function$;

-- La mise en lumière. PERSONNE N'EST ÉLIMINÉ : c'est une désignation, pas une
-- exécution, et celui qu'on met en lumière joue la manche suivante.
create or replace function public.scrutin_game_fantome_light(p_round_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  v_round scrutin_game_rounds;
  v_room scrutin_game_rooms;
  v_light text;
  v_was boolean;
  v_tie int;
begin
  select * into v_round from scrutin_game_rounds where id = p_round_id;
  if v_round.result ? 'light' then return; end if;
  select * into v_room from scrutin_game_rooms where id = v_round.room_id;

  -- ✅ LE DÉPARTAGE DES EX ÆQUO PAR LES RONDES MENÉES À TERME. L'information
  -- est déjà au registre, elle n'ajoute aucune règle à expliquer, et elle
  -- rapporte +7 points au village : le Fantôme en a mécaniquement moins,
  -- puisqu'il interrompt une ronde pour aller hanter. C'est le seul levier
  -- gratuit trouvé sur ce chantier, et il remplace deux indices qui, eux,
  -- frappaient les innocents.
  with voix as (
    select e.payload->>'accuse' as nom, count(*) as n
      from scrutin_game_entries e
     where e.round_id = p_round_id and e.payload ? 'accuse'
     group by 1
  ), classe as (
    select v.nom, v.n,
           coalesce((select count(*) from scrutin_game_stints s
                      join scrutin_game_players p on p.id = s.player_id
                     where s.room_id = v_room.id and p.name = v.nom
                       and s.completed_at is not null), 0) as rondes
      from voix v
  )
  select nom into v_light from classe order by n desc, rondes asc, nom limit 1;

  -- Une égalité PARFAITE (même nombre de voix ET de rondes) ne met personne en
  -- lumière : désigner par ordre alphabétique serait une loterie, et la manche 1
  -- — où tout le monde vote au hasard — brûlerait le budget de la maison.
  if v_light is not null then
    with voix as (
      select e.payload->>'accuse' as nom, count(*) as n
        from scrutin_game_entries e
       where e.round_id = p_round_id and e.payload ? 'accuse'
       group by 1
    ), classe as (
      select v.nom, v.n,
             coalesce((select count(*) from scrutin_game_stints s
                        join scrutin_game_players p on p.id = s.player_id
                       where s.room_id = v_room.id and p.name = v.nom
                         and s.completed_at is not null), 0) as rondes
        from voix v
    )
    select count(*) into v_tie from classe c
     where (c.n, c.rondes) = (select cc.n, cc.rondes from classe cc
                               order by cc.n desc, cc.rondes asc, cc.nom limit 1);
    if v_tie > 1 then v_light := null; end if;
  end if;

  if v_light is not null then
    select (p.secret->>'role' = 'fantome') into v_was
      from scrutin_game_players p where p.room_id = v_room.id and p.name = v_light;
  end if;

  update scrutin_game_rounds
     set result = coalesce(result, '{}'::jsonb)
                  || jsonb_build_object('light', v_light, 'wasGhost', coalesce(v_was, false))
   where id = p_round_id;

  -- La maison gagne dès que le Fantôme tombe : inutile de faire jouer trois
  -- manches de plus à une table qui a trouvé.
  if coalesce(v_was, false) then
    update scrutin_game_rooms set status = 'ended' where id = v_room.id;
    perform scrutin_game_fantome_final(p_round_id);
  end if;
end $function$;

-- ═══════════════════════════════════════════════════════ 3. LA RÉSOLUTION
--
-- ⚠️ AUCUNE SOUSTRACTION NULLE PART. Le pire score est 0 — celui de quelqu'un
-- qui n'a pas touché son téléphone. Un enfant ne doit jamais voir son score
-- baisser.
create or replace function public.scrutin_game_fantome_final(p_round_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  v_round scrutin_game_rounds;
  v_room scrutin_game_rooms;
  v_ghost text;
  v_caught boolean;
  v_gauge int;
  v_target int;
  v_full boolean;
  v_scores jsonb;
  v_outcome text;
begin
  select * into v_round from scrutin_game_rounds where id = p_round_id;
  select * into v_room from scrutin_game_rooms where id = v_round.room_id;

  select p.name into v_ghost from scrutin_game_players p
   where p.room_id = v_room.id and p.secret->>'role' = 'fantome';

  v_caught := exists (select 1 from scrutin_game_rounds r
                       where r.room_id = v_room.id and (r.result->>'wasGhost') = 'true');

  v_gauge := coalesce((v_round.result->>'gauge')::int, 0);
  v_target := coalesce((v_round.result->>'target')::int, 1);
  v_full := v_gauge >= v_target;

  v_outcome := case when v_caught then 'demasque'
                    when v_full then 'testament'
                    else 'manoir' end;

  with pts as (
    select p.id, p.name,
           (p.secret->>'role') as role,
           coalesce((select count(*) from scrutin_game_stints s
                      where s.room_id = v_room.id and s.player_id = p.id
                        and s.completed_at is not null), 0) as rondes,
           coalesce((select count(*) * 2 from scrutin_game_photos ph
                      where ph.room_id = v_room.id and ph.player_id = p.id
                        and ph.taken_at is not null), 0) as photos,
           coalesce((select count(*) * 3 from scrutin_game_entries e
                      join scrutin_game_rounds r on r.id = e.round_id
                     where r.room_id = v_room.id and e.player_id = p.id
                       and (r.result->>'wasGhost') = 'true'
                       and e.payload->>'accuse' = r.result->>'light'), 0) as bons,
           coalesce((select count(*) * 4 from scrutin_game_hauntings h
                      where h.room_id = v_room.id and h.kind = 'charge'
                        and h.done_at is not null), 0) as hantises,
           (not exists (select 1 from scrutin_game_rounds r
                         where r.room_id = v_room.id and r.result->>'light' = p.name)) as jamais_vu,
           coalesce((select count(*) * 2 from scrutin_game_rounds r
                      where r.room_id = v_room.id and r.result->>'light' is not null
                        and (r.result->>'wasGhost') = 'false'), 0) as innocents_grilles
      from scrutin_game_players p where p.room_id = v_room.id
  )
  select coalesce(jsonb_object_agg(name, total), '{}'::jsonb) into v_scores from (
    select name, greatest(0, case
      -- LE FANTÔME : ses rondes ne rapportent RIEN — elles sont sa couverture,
      -- pas son objectif. Sinon il domine le classement en faisant exactement
      -- ce que le jeu lui demande déjà de faire pour se cacher.
      when role = 'fantome'
        then hantises + (case when jamais_vu then 8 else 0 end) + innocents_grilles
      -- Le complice muet partage le sort du Fantôme, mais il a joué la soirée
      -- comme les autres : ses rondes et ses photos comptent.
      when role = 'complice'
        then rondes + photos + (case when not v_caught then 6 else 0 end)
      else rondes + photos + bons
           + (case when v_caught then 5 when v_full then 5 else 0 end)
      end) as total
      from pts) t;

  update scrutin_game_players p set score = coalesce((v_scores->>p.name)::int, 0)
   where p.room_id = v_room.id;

  update scrutin_game_rounds
     set result = coalesce(result, '{}'::jsonb) || jsonb_build_object(
           'final', true,
           'ghost', v_ghost,
           'outcome', v_outcome,
           'gauge', v_gauge,
           'target', v_target,
           -- L'INSTRUMENTATION. Le jeu n'a jamais été joué par des humains, et
           -- la jauge est un curseur posé à vue : `hit` et `size` servent à
           -- lire le vrai taux sur les vraies soirées, comme pour Rôdeurs.
           'hit', v_caught,
           'size', (select count(*) from scrutin_game_players where room_id = v_room.id),
           'scores', v_scores)
   where id = p_round_id;

  update scrutin_game_rooms set status = 'ended' where id = v_room.id;
end $function$;

-- ═══════════════════════════════════ 4. LE BRANCHEMENT SUR LE SOCLE
--
-- `game_reveal` est PARTAGÉE par les quatre jeux : on la réécrit en entier en
-- préservant mot pour mot les branches d'Unanimo, d'Alibi et de Rôdeurs. Deux
-- changements : `fantome` rejoint `rodeurs` dans les jeux SANS verbe d'hôte, et
-- la dernière manche appelle la résolution.
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
  if v_room.game not in ('rodeurs', 'fantome') and not v_p.is_host then
    return jsonb_build_object('status', 'forbidden');
  end if;
  select * into v_round from scrutin_game_rounds
   where room_id = v_room.id and round_no = v_room.round_no;
  if v_round.id is null then return jsonb_build_object('status', 'no_round'); end if;

  -- ⚠️ ON NE CLÔT PAS UNE MANCHE DONT LA CHARGE N'A PAS ENCORE PARLÉ. Sinon la
  -- maison peut sonner la réunion avant que le Fantôme n'ait eu sa fenêtre, et
  -- clore tôt devient une stratégie qui le prive de son seul acte.
  if v_room.game = 'fantome' and exists (
       select 1 from scrutin_game_hauntings h
        where h.room_id = v_room.id and h.round_no = v_round.round_no
          and h.kind = 'charge' and h.done_at is null
          and h.armed_at + interval '45 s' > now()) then
    return jsonb_build_object('status', 'too_early');
  end if;

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
  elsif v_room.game = 'fantome' then
    perform scrutin_game_fantome_reveal(v_round.id);
  end if;

  update scrutin_game_rooms set last_active_at = now() where id = v_room.id;
  return jsonb_build_object('status', 'ok');
end $function$;

-- ⚠️ LA DERNIÈRE MANCHE. `game_next_round` rend `finished` quand il n'y a plus
-- de manche : pour le Fantôme, c'est là que la résolution se calcule — sinon
-- une partie où le Fantôme n'est jamais démasqué finirait sans classement.
create or replace function public.fantome_finish(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_p scrutin_game_players;
  v_room scrutin_game_rooms;
  v_round scrutin_game_rounds;
begin
  select * into v_p from scrutin_game_players where token = p_token;
  if v_p.id is null then return jsonb_build_object('status', 'forbidden'); end if;
  select * into v_room from scrutin_game_rooms where id = v_p.room_id for update;
  if v_room.game <> 'fantome' then return jsonb_build_object('status', 'invalid'); end if;
  select * into v_round from scrutin_game_rounds
   where room_id = v_room.id and round_no = v_room.round_no;
  if v_round.id is null or v_round.phase <> 'reveal' then
    return jsonb_build_object('status', 'closed');
  end if;
  if v_round.round_no < v_room.rounds_total and not (v_round.result ? 'light') then
    return jsonb_build_object('status', 'not_voted');
  end if;
  if not (v_round.result ? 'final') then
    perform scrutin_game_fantome_final(v_round.id);
  end if;
  return jsonb_build_object('status', 'ok');
end $function$;

-- ═══════════════════════════════════════════════════════ 5. LES DROITS
--
-- ⚠️ `revoke` AVANT `grant` : Postgres donne à PUBLIC un droit d'exécution par
-- défaut sur toute fonction.
revoke all on function public.scrutin_game_fantome_reveal(uuid) from public, anon, authenticated;
revoke all on function public.scrutin_game_fantome_light(uuid) from public, anon, authenticated;
revoke all on function public.scrutin_game_fantome_final(uuid) from public, anon, authenticated;
revoke all on function public.fantome_vote(text, text) from public, anon, authenticated;
revoke all on function public.fantome_finish(text) from public, anon, authenticated;

grant execute on function public.fantome_vote(text, text) to anon, authenticated;
grant execute on function public.fantome_finish(text) to anon, authenticated;
