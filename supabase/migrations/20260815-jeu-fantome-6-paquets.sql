-- ═══════════════════════════════════════════════════════════════════════════
-- LA NUIT DU FANTÔME — étage 6 : le moteur de paquets, et l'album.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- UN PAQUET NE TOUCHE JAMAIS AUX RÈGLES, ET NE SAIT JAMAIS QUI EST LE FANTÔME.
-- Il déclare l'ambiance : les cartes photo disponibles, et des HALTES — de
-- courtes annonces qui tombent en plein écran sur tous les téléphones au début
-- d'une manche ou à la réunion. C'est ce qui rend le jeu rejouable : le moteur
-- reste génératif (rôles, instants, tirages), le paquet ne scripte que le
-- décor. Le paquet 2 (« Le Casse du Musée ») doit coûter une semaine, pas un
-- mois — d'où cette table et ces quatre verbes, et pas un de plus.
--
-- ⚠️ VOCABULAIRE D'EFFETS FERMÉ, ET C'EST DÉLIBÉRÉ. Au lancement :
--   ANNOUNCE   — un texte, zéro mécanique.
--   SNAPSHOT   — un texte à la réunion, zéro mécanique.
--   PHOTO_CALL — invite à sortir les appareils, zéro mécanique.
--   LAST_CALL  — annonce la dernière manche, zéro mécanique.
-- RUSH et CONVERGE attendent d'être simulés. BLACKOUT et DIAL sont ÉCARTÉS du
-- lancement : le premier peut recréer le trou d'alibi qui a coûté 44 %
-- d'accusations à tort sur ce chantier, le second touche au curseur du tiers de
-- menteurs. **Un verbe d'effet nouveau est du travail MOTEUR, pas du travail de
-- paquet** — c'est la règle qui empêche un paquet de devenir un langage.
--
-- Les TEXTES ne sont pas ici : ils vivent dans `src/content/packs/<pack>/`,
-- hors i18n — comme les fiches méthodes, déjà en production. Le contrôle de
-- parité ne voit que les clés écrites en clair, et une clé de paquet passée en
-- variable lui échapperait ; un test dédié couvre ces fichiers.

create table if not exists public.scrutin_game_fantome_packs (
  pack       text primary key,
  script     jsonb not null,
  created_at timestamptz not null default now(),
  constraint scrutin_game_fantome_packs_key_chk check (pack ~ '^[a-z][a-z0-9_-]{1,24}$')
);

alter table public.scrutin_game_fantome_packs enable row level security;
revoke all on table public.scrutin_game_fantome_packs from anon, authenticated;

-- ─────────────────────────────────────────────── LE PAQUET 1 : LE MANOIR
--
-- `cards.plain` : les cartes qui n'exigent AUCUNE personne. Il en faut une
-- vingtaine à terme — c'est le vrai coût du rôle « derrière l'objectif », qui
-- mentirait dès sa deuxième carte avec huit.
-- `cards.people` : celles à N tiers. ⚠️ Elles ne sortent que si la maison peut
-- les porter, sinon chaque carte devient une convocation nominative de ceux qui
-- ont dit non — le rôle protège la PIOCHE, jamais la PERSONNE.
insert into public.scrutin_game_fantome_packs (pack, script) values
('manoir', jsonb_build_object(
  'cards', jsonb_build_object(
    'plain', jsonb_build_array('ombre_portee','trace_de_doigt','objet_hors_place','reflet',
                               'nature_morte','poussiere','clef_oubliee','fenetre_noire'),
    'people', jsonb_build_array(
      jsonb_build_object('key','portrait_ancetre','tiers',1),
      jsonb_build_object('key','six_pieds','tiers',2),
      jsonb_build_object('key','tablee_figee','tiers',3))),
  'beats', jsonb_build_array(
    jsonb_build_object('round',1,'when','start', 'kind','ANNOUNCE',  'key','b1'),
    jsonb_build_object('round',1,'when','reveal','kind','SNAPSHOT',  'key','b2'),
    jsonb_build_object('round',2,'when','start', 'kind','ANNOUNCE',  'key','b3'),
    jsonb_build_object('round',2,'when','reveal','kind','SNAPSHOT',  'key','b4'),
    jsonb_build_object('round',3,'when','start', 'kind','ANNOUNCE',  'key','b5'),
    jsonb_build_object('round',3,'when','reveal','kind','PHOTO_CALL','key','b6'),
    jsonb_build_object('round',4,'when','start', 'kind','LAST_CALL', 'key','b7'),
    jsonb_build_object('round',4,'when','reveal','kind','SNAPSHOT',  'key','b8'))))
on conflict (pack) do update set script = excluded.script;

-- ─────────────────────────── LA DONNE LIT LE PAQUET AU LIEU D'UN TABLEAU EN DUR
--
-- Seul changement de règle : les cartes viennent du paquet. Tout le reste — les
-- rôles, le tiers de menteurs, l'instant de la charge — est identique, et
-- restera identique quel que soit le paquet.
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
  v_devant int;
  v_armed timestamptz;
  v_script jsonb;
begin
  select * into v_room from scrutin_game_rooms where id = p_room;

  -- Le paquet de la salle, ou celui du manoir par défaut : une partie ouverte
  -- avant l'existence des paquets doit continuer à se distribuer.
  select script into v_script from scrutin_game_fantome_packs
   where pack = coalesce(v_room.settings->>'pack', 'manoir');
  if v_script is null then
    select script into v_script from scrutin_game_fantome_packs where pack = 'manoir';
  end if;

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
      -- Le vivier sans aucune personne : toujours servable, quel que soit
      -- l'effectif et quels que soient les refus.
      select array_agg(x) into v_cards
        from jsonb_array_elements_text(v_script->'cards'->'plain') x;
      -- ⚠️ Une carte à N tiers ne sort que si (joueurs « devant » − 1) >= N + 2,
      -- sinon elle devient une convocation nominative de ceux qui ont dit non.
      if v_pl.photo_ok is not false then
        v_cards := v_cards || coalesce((
          select array_agg(c->>'key')
            from jsonb_array_elements(v_script->'cards'->'people') c
           where (v_devant - 1) >= (c->>'tiers')::int + 2), '{}');
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
  -- ⚠️ FENÊTRE RESSERRÉE À T+2,5 → T+7 MIN, trouvé en éprouvant le paquet :
  -- `game_reveal` refuse de clore tant que la charge n'a pas parlé (sinon
  -- sonner la réunion tôt priverait le Fantôme de son seul acte), donc une
  -- maison qui a fini ses rondes en cinq minutes attendait CINQ MINUTES DE PLUS
  -- devant un bouton qui répond « pas encore ». La borne haute est maintenant
  -- calée sur la durée réelle d'une manche (3 rondes × 90 s = 4 min 30 au
  -- minimum). UNE SEULE par manche — deux tirages indépendants se chevauchaient,
  -- et la seconde était perdue sans que le Fantôme y soit pour rien (8 % de
  -- parties gagnées par un artefact).
  v_armed := now() + make_interval(secs => 150 + floor(random() * 270)::int);
  insert into scrutin_game_hauntings (room_id, round_no, kind, seq, armed_at)
  values (p_room, p_round, 'charge', 1, v_armed)
  on conflict (room_id, round_no, seq) do nothing;
end $function$;

-- ─────────────────────────────────── L'ÉTAT : LE PAQUET, LA HALTE, L'ALBUM
--
-- ⚠️ AUCUN VOTE À L'ALBUM. Le bulletin « laquelle est la meilleure ? » EST la liste de
-- ceux qui ont montré : il publie celui qui a passé son tour. On enlève le
-- bulletin plutôt que de le maquiller — la pièce dit tout haut laquelle elle
-- préfère, ce qu'aucun logiciel ne fait mieux.
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
  v_pack text;
begin
  select * into v_room from scrutin_game_rooms where code = upper(btrim(coalesce(p_code, '')));
  if v_room.id is null or v_room.game <> 'fantome' then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into v_round from scrutin_game_rounds
   where room_id = v_room.id and round_no = v_room.round_no;
  v_pack := coalesce(v_room.settings->>'pack', 'manoir');

  if p_token is not null and p_token <> '' then
    select * into v_me from scrutin_game_players where token = p_token and room_id = v_room.id;
  end if;

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
    'pack', v_pack,
    -- La halte du moment : le client la montre en plein écran, une fois.
    'beat', (select b from jsonb_array_elements(
                      (select script->'beats' from scrutin_game_fantome_packs where pack = v_pack)) b
              where (b->>'round')::int = v_room.round_no
                and b->>'when' = case when v_round.phase = 'reveal' then 'reveal' else 'start' end
              limit 1),
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
    -- L'ALBUM, seulement quand la partie est finie. ⚠️ AUCUNE IMAGE ne transite
    -- ici : seulement « pour cette consigne, ces gens-là ont pris une photo ».
    -- `gone` recoupe avec ceux qui sont partis — sans cela l'album appellerait
    -- un écran qui n'est plus dans la pièce, et la salle attendrait dans le vide.
    'album', case when v_room.status <> 'ended' then null else
      coalesce((select jsonb_agg(x order by x->>'card') from (
        select jsonb_build_object(
                 'card', ph.card,
                 'takers', coalesce(jsonb_agg(p.name order by p.name)
                            filter (where p.left_at is null), '[]'::jsonb),
                 'gone', coalesce(jsonb_agg(p.name order by p.name)
                            filter (where p.left_at is not null), '[]'::jsonb)) as x
          from scrutin_game_photos ph
          join scrutin_game_players p on p.id = ph.player_id
         where ph.room_id = v_room.id and ph.taken_at is not null
         group by ph.card) s), '[]'::jsonb) end,
    -- Ceux qui sont passés derrière l'objectif : l'album le rappelle avant
    -- chaque révélation. ⚠️ C'est le SEUL recours possible — une photo déjà
    -- prise dort sur d'autres téléphones, et rien ne relie une image aux gens
    -- qu'elle montre.
    'behind', coalesce((select jsonb_agg(p.name order by p.name)
                          from scrutin_game_players p
                         where p.room_id = v_room.id and p.photo_ok is false), '[]'::jsonb),
    'me', case when v_me.id is null then null else jsonb_build_object(
            'seal', scrutin_game_fantome_seal(v_me.token, now()),
            'photoOk', v_me.photo_ok,
            'photoDone', exists (select 1 from scrutin_game_photos ph
                                  where ph.room_id = v_room.id and ph.round_no = v_room.round_no
                                    and ph.player_id = v_me.id and ph.taken_at is not null),
            'doneThisRound', (select count(*) from scrutin_game_stints s
                               where s.room_id = v_room.id and s.round_no = v_room.round_no
                                 and s.player_id = v_me.id and s.completed_at is not null),
            'stint', case when v_st.id is null then null else jsonb_build_object(
                       'place', v_place,
                       'duo', v_st.duo,
                       'signed', v_signed,
                       'elapsed', extract(epoch from now() - v_st.started_at)::int,
                       'since', extract(epoch from now() - v_st.beat_at)::int) end,
            'charge', case when v_h.id is null then null else jsonb_build_object(
                       'left', greatest(0, 45 - extract(epoch from now() - v_h.armed_at)::int)) end)
          end);
end $function$;

revoke all on function public.scrutin_game_fantome_deal(uuid, int) from public, anon, authenticated;
revoke all on function public.fantome_state(text, text) from public, anon, authenticated;
grant execute on function public.fantome_state(text, text) to anon, authenticated;
