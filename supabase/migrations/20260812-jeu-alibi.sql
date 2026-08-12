-- ═══════════════════════════════════════════════════════════════════════════
-- ALIBI — « La pièce en trop ». Deuxième jeu de la salle Placet.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- LA RÈGLE, EN UNE PHRASE : chaque manche le serveur range tout le monde dans
-- trois pièces — sauf un, qui rôdait ; chacun déclare où il était et combien ils
-- étaient, et l'arithmétique des bulletins désigne la pièce qui en compte un de
-- trop.
--
-- POURQUOI CE JEU ET PAS UN LOUP-GAROU. Personne n'est éliminé (un enfant écarté
-- au tour 2 a fini sa soirée), il n'y a pas de meneur (sinon un adulte ne joue
-- pas), et aucune phase les yeux fermés — les téléphones la rendent inutile.
--
-- CE QUI EST MESURÉ, ET COMMENT. La mécanique a été simulée avant d'être écrite
-- (20 000 parties par cas). L'enquête aboutit dans 50 à 57 % des parties de 7 à
-- 16 joueurs — 54,3 % à onze, contre 9,1 % au hasard — et une partie sur deux se
-- termine sur un DUEL entre deux noms, que la table doit trancher en parlant.
-- Le simulateur, lui, tranche le duel à pile ou face : 54 % est donc un
-- PLANCHER, pas une prédiction. Le vrai taux se lira sur les vraies parties
-- (voir `hit` dans le résultat de la dernière manche).
--
-- ⚠️ QUATRE FAILLES ONT ÉTÉ TROUVÉES PAR L'ATTAQUE ET SONT FERMÉES ICI. Elles
-- sont signalées §2, §3, §4 et §6. Deux d'entre elles ramenaient l'enquête au
-- niveau du hasard. Aucune n'était visible sans simuler.

-- ═════════════════════════════════════════════════════ 1. LE SECRET DU JOUEUR
--
-- Unanimo n'avait aucun secret durable : tout ce qu'on savait, on l'avait tapé.
-- Ici chaque joueur détient une information que les autres ne doivent JAMAIS
-- voir. Elle vit sur la ligne du joueur, et elle ne ressort que par l'objet
-- `me` de `get_game_room`, déjà protégé par le jeton (§5).

alter table public.scrutin_game_players
  add column if not exists secret jsonb not null default '{}'::jsonb;

-- ═══════════════════════════════════════════ 2. LE ROSTER SE FERME AU DÉPART
--
-- ⚠️ FAILLE FATALE FERMÉE ICI — « la marionnette ».
-- `game_join` accepte une arrivée EN COURS DE PARTIE (`joined_round = round_no
-- + 1`) : c'est une règle voulue pour Unanimo, où le retard fait partie du jeu.
-- Sur un jeu à rôles secrets, elle est mortelle : le coupable ouvre un onglet
-- privé, rejoint sous un autre pseudo, et sa fausse identité reçoit une CARTE
-- PRÉ-REMPLIE — une vraie pièce et son vrai nombre d'occupants. C'est un
-- renseignement gratuit, illimité et invisible.
--
-- On ferme donc le roster au lancement POUR CE JEU. Le dispatch par `game` est
-- le même mécanisme que celui de `game_reveal` : le verbe reste générique, la
-- règle reste au jeu.
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

  -- Roster fermé : voir le commentaire ci-dessus. Le message est distinct de
  -- « salle pleine » — on ne fait pas croire à un plafond quand c'est une règle.
  if v_room.game = 'alibi' and v_room.status <> 'lobby' then
    return jsonb_build_object('status', 'started');
  end if;

  -- Plafond PUREMENT TECHNIQUE (lisibilité d'une révélation, poids d'une
  -- réponse réseau), pas une règle du jeu : le nombre de joueurs est libre.
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

-- ══════════════════════════════════════════════════ 3. LA RÉPARTITION EN PIÈCES
--
-- ⚠️ FAILLE SÉRIEUSE FERMÉE ICI — les tailles étaient déterministes.
-- La première version calculait les tailles par une fonction pure : à onze
-- joueurs, toujours [5, 3, 2]. Dès la manche 1 toute la table — donc le
-- coupable — connaissait les trois comptes par cœur. Or son SEUL risque est
-- d'annoncer un compte faux : il pouvait donc déclarer n'importe quelle pièce
-- gratuitement, et visait la plus peuplée, où le vivier de suspects fond deux
-- fois moins vite. Mesuré : l'enquête tombait de 73 % à 50 %.
--
-- On tire donc une COMPOSITION ALÉATOIRE de m en k parts ≥ 1 (méthode des
-- barres et des étoiles : on choisit k−1 coupures parmi m−1). Le coupable ne
-- connaît plus que les comptes qu'on lui montre. Coût mesuré sur le taux : nul.
create or replace function public.scrutin_game_alibi_sizes(p_m int, p_k int default 3)
returns int[] language plpgsql volatile set search_path to 'public' as $function$
declare
  v_k int := least(greatest(coalesce(p_k, 3), 1), greatest(p_m, 1));
  v_cuts int[];
  v_out int[] := '{}';
  v_prev int := 0;
  v_c int;
begin
  if p_m <= 0 then return '{}'; end if;
  if v_k <= 1 then return array[p_m]; end if;
  -- k−1 coupures distinctes dans [1, m−1], triées.
  select array_agg(x order by x) into v_cuts
    from (select x from generate_series(1, p_m - 1) x order by random() limit v_k - 1) s;
  foreach v_c in array v_cuts loop
    v_out := v_out || (v_c - v_prev);
    v_prev := v_c;
  end loop;
  return v_out || (p_m - v_prev);
end $function$;

-- ═══════════════════════════════════════════════════════ 4. LA DISTRIBUTION
--
-- Appelée à l'ouverture de CHAQUE manche d'enquête. Elle tire le coupable la
-- première fois, puis range les innocents dans les pièces et écrit le secret de
-- chacun.
--
-- ⚠️ LA MISE EN PLACE EST SERVEUR, ET C'EST LE POINT. Dans Unanimo, c'est le
-- client de l'hôte qui tire le thème et l'envoie. Le même chemin donnerait ici
-- la réponse à l'hôte : il saurait qui est le coupable. Rien de ce qui suit ne
-- transite par un navigateur.
--
-- ⚠️ CE QUE LE COUPABLE VOIT, ET POURQUOI PAS PLUS. On lui montre un CHOIX DE
-- CINQ NOMS tirés au sort, avec leur pièce et son compte. Il déclare l'une de
-- ces pièces, ou son propre faux souvenir. Pourquoi cinq et pourquoi tirés :
-- s'il choisissait dans TOUTE la table, il collerait systématiquement l'enfant
-- de huit ans à son alibi et gagnerait le duel final contre quelqu'un qui ne
-- sait pas se défendre. Mesuré : l'enquête tombe à 33,6 % si le leurre paraît
-- seulement deux fois plus suspect que lui. Le tirage lui laisse une vraie
-- décision chaque manche sans lui laisser choisir sa victime.
create or replace function public.scrutin_game_alibi_deal(p_round_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  v_round scrutin_game_rounds;
  v_room scrutin_game_rooms;
  v_ids uuid[];
  v_culprit uuid;
  v_inno uuid[];
  v_sizes int[];
  v_places text[];
  v_i int;
  v_j int;
  v_pos int := 1;
  v_slate jsonb;
begin
  select * into v_round from scrutin_game_rounds where id = p_round_id;
  select * into v_room from scrutin_game_rooms where id = v_round.room_id;

  -- Les joueurs de CETTE manche (le roster est fermé, mais on reste exact).
  select coalesce(array_agg(p.id order by p.created_at), '{}')
    into v_ids
    from scrutin_game_players p
   where p.room_id = v_room.id and p.joined_round <= v_round.round_no;
  if coalesce(array_length(v_ids, 1), 0) < 3 then return; end if;

  -- Le coupable : tiré UNE FOIS, à la première manche, et jamais retiré.
  select p.id into v_culprit
    from scrutin_game_players p
   where p.room_id = v_room.id and p.secret->>'role' = 'culprit'
   limit 1;
  if v_culprit is null then
    v_culprit := v_ids[1 + floor(random() * array_length(v_ids, 1))::int];
  end if;

  select coalesce(array_agg(x order by random()), '{}') into v_inno
    from unnest(v_ids) x where x <> v_culprit;

  v_sizes := scrutin_game_alibi_sizes(array_length(v_inno, 1), 3);

  -- Les lieux : des CLÉS, pas des libellés. La base garde ce qui a été joué,
  -- elle n'héberge pas un catalogue qu'il faudrait traduire en base — et qui le
  -- serait mal. Le client localise (src/lib/games/alibi/lieux.ts).
  select coalesce(array_agg(k order by random()), '{}') into v_places
    from unnest(array['cuisine','salon','cave','grenier','buanderie','veranda',
                      'jardin','garage','bibliotheque','couloir','terrasse','cellier']) k;
  v_places := v_places[1:array_length(v_sizes, 1)];

  -- L'énoncé de la manche est PUBLIC (il part vers tous les navigateurs, et
  -- `get_game_room` le renvoie même pour les manches passées) : il ne porte QUE
  -- les noms des pièces. Qui est où n'y figure jamais.
  update scrutin_game_rounds
     set prompt = jsonb_build_object('kind', 'alibi', 'places', to_jsonb(v_places))
   where id = p_round_id;

  -- Le secret de chaque innocent : sa pièce, et le nombre VRAI de ses occupants.
  -- C'est sa carte, et il n'a aucun choix à faire — il confirme, c'est tout.
  for v_j in 1..array_length(v_sizes, 1) loop
    for v_i in 1..v_sizes[v_j] loop
      update scrutin_game_players
         set secret = jsonb_build_object(
               'role', 'innocent', 'roundNo', v_round.round_no,
               'room', v_j - 1, 'place', v_places[v_j], 'count', v_sizes[v_j])
       where id = v_inno[v_pos];
      v_pos := v_pos + 1;
    end loop;
  end loop;

  -- Le choix du coupable : cinq noms tirés au sort, avec leur pièce et son
  -- compte. Plus son propre FAUX SOUVENIR — une pièce prise au hasard, avec son
  -- vrai compte : la seule information qu'il obtient sans rien décider.
  select coalesce(jsonb_agg(jsonb_build_object(
           'name', p.name,
           'room', (p.secret->>'room')::int,
           'place', p.secret->>'place',
           'count', (p.secret->>'count')::int) order by p.name), '[]'::jsonb)
    into v_slate
    from (select unnest(v_inno) id order by random() limit 5) s
    join scrutin_game_players p on p.id = s.id;

  v_j := 1 + floor(random() * array_length(v_sizes, 1))::int;
  update scrutin_game_players
     set secret = jsonb_build_object(
           'role', 'culprit', 'roundNo', v_round.round_no,
           'room', v_j - 1, 'place', v_places[v_j], 'count', v_sizes[v_j],
           'slate', v_slate)
   where id = v_culprit;
end $function$;

-- ═══════════════════════════════════════════════════════ 5. LE DÉPOUILLEMENT
--
-- ⚠️ FAILLE FATALE FERMÉE ICI — le bulletin manquant.
-- La règle « les comptes sont justes » est le cas par défaut. Un seul bulletin
-- manquant dans la pièce du coupable ramène le compte sur le nombre annoncé :
-- la pièce est déclarée nette et LE COUPABLE EST BLANCHI. Le coup ne demande
-- aucune habileté — « attends, vote pas tout de suite », ou simplement un enfant
-- distrait. Mesuré : l'enquête tombe à 9,0 %, c'est-à-dire EXACTEMENT le hasard,
-- et le vivier final revient à 11 sur 11 : le jeu n'apprend plus rien.
--
-- LE CORRECTIF, et ce n'est pas une béquille : le bulletin de l'innocent est
-- DÉTERMINISTE. Sa carte est pré-remplie, il n'a aucun choix, le serveur connaît
-- déjà (pièce, nombre). Ce que le serveur dépose, c'est exactement ce que le
-- joueur aurait déposé. Seul le coupable choisit — son bulletin, lui, n'est
-- jamais déposé d'office. Coût mesuré : entre 0,0 et +0,5 point.
create or replace function public.scrutin_game_alibi_reveal(p_round_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  v_round scrutin_game_rounds;
  v_room scrutin_game_rooms;
  v_places jsonb;
  v_rooms jsonb;
  v_suspects text[];
  v_prev text[];
  v_cleared text[];
  v_hunches jsonb;
begin
  select * into v_round from scrutin_game_rounds where id = p_round_id;
  select * into v_room from scrutin_game_rooms where id = v_round.room_id;
  v_places := coalesce(v_round.prompt->'places', '[]'::jsonb);

  -- Le dépôt d'office : tout innocent qui n'a rien envoyé voit son bulletin
  -- posé à sa place, tel que sa carte le dictait.
  insert into scrutin_game_entries (round_id, player_id, payload)
  select p_round_id, p.id,
         jsonb_build_object('room', (p.secret->>'room')::int, 'count', (p.secret->>'count')::int)
    from scrutin_game_players p
   where p.room_id = v_room.id
     and p.joined_round <= v_round.round_no
     and p.secret->>'role' = 'innocent'
     and p.secret ? 'room'
     and not exists (select 1 from scrutin_game_entries e
                      where e.round_id = p_round_id and e.player_id = p.id)
  on conflict (round_id, player_id) do nothing;

  -- Le dépouillement, pièce par pièce. Trois verdicts et rien d'autre :
  --   autant de bulletins que le nombre annoncé  -> LES COMPTES SONT JUSTES
  --   un de plus                                 -> IL Y EN A UN DE TROP
  --   un bulletin qui annonce un autre nombre    -> C'EST LUI
  with bull as (
    select p.name, (e.payload->>'room')::int as room, (e.payload->>'count')::int as cnt
      from scrutin_game_entries e
      join scrutin_game_players p on p.id = e.player_id
     where e.round_id = p_round_id and e.payload ? 'room'
  ),
  -- Le nombre ANNONCÉ par une pièce est celui que dit sa majorité : les
  -- innocents y sont tous d'accord, puisqu'ils lisent la même carte.
  majo as (
    select room, mode() within group (order by cnt) as said, count(*)::int as ballots
      from bull group by room
  ),
  verdict as (
    select m.room, m.said, m.ballots,
           coalesce(array_agg(b.name order by b.name) filter (where b.cnt <> m.said), '{}') as odd,
           coalesce(array_agg(b.name order by b.name), '{}') as everyone
      from majo m join bull b on b.room = m.room
     group by m.room, m.said, m.ballots
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'room', v.room,
           'place', v_places->(v.room),
           'said', v.said,
           'ballots', v.ballots,
           'names', to_jsonb(v.everyone),
           -- 'liar'  : quelqu'un a annoncé un autre nombre que ses colocataires
           -- 'extra' : il y a un bulletin de trop
           -- 'clean' : les comptes sont justes
           'verdict', case
                        when coalesce(array_length(v.odd, 1), 0) > 0
                             and v.ballots - array_length(v.odd, 1) = v.said then 'liar'
                        when v.ballots > v.said then 'extra'
                        else 'clean' end,
           'odd', to_jsonb(v.odd)) order by v.room), '[]'::jsonb)
    into v_rooms
    from verdict v;

  -- Les deux listes se DÉDUISENT du tableau ci-dessus plutôt que d'être
  -- recalculées : deux calculs de la même chose finissent toujours par différer.
  select coalesce(array_agg(distinct t.nm), '{}') into v_suspects
    from jsonb_array_elements(v_rooms) r,
         lateral jsonb_array_elements_text(
           case r->>'verdict' when 'liar' then r->'odd'
                              when 'extra' then r->'names'
                              else '[]'::jsonb end) t(nm);

  select coalesce(array_agg(distinct t.nm), '{}') into v_cleared
    from jsonb_array_elements(v_rooms) r,
         lateral jsonb_array_elements_text(
           case when r->>'verdict' = 'clean' then r->'names' else '[]'::jsonb end) t(nm);

  -- Le vivier se RESSERRE d'une manche à l'autre : c'est l'intersection, et
  -- c'est là que la déduction se fait. Une table qui n'utiliserait que le
  -- dernier dépouillement tombe de 54 % à 22 % — le croisement vaut 32 points.
  --
  -- ⚠️ LE PIÈGE, PAYÉ SUR UNE PARTIE DE TEST. La première version écrivait
  -- `select jsonb_array_elements_text(...) from (... order by round_no desc
  -- limit 1)` : le `limit 1` était censé désigner LA DERNIÈRE MANCHE, mais la
  -- fonction qui déplie le tableau est dans la LISTE DE SÉLECTION, donc la
  -- limite s'applique APRÈS l'expansion — elle ne gardait qu'UN SEUL NOM du
  -- vivier. Le jeu accusait alors un innocent, que la même manche déclarait
  -- blanchi par ailleurs : c'est cette contradiction qui a trahi la faute.
  -- On sépare les deux gestes : choisir la manche, PUIS déplier son tableau.
  select coalesce(array_agg(x.nm), '{}') into v_prev
    from (select r.result->'suspects' as s
            from scrutin_game_rounds r
           where r.room_id = v_room.id and r.round_no < v_round.round_no
             and r.result ? 'suspects'
           order by r.round_no desc
           limit 1) t,
         lateral jsonb_array_elements_text(t.s) x(nm);
  if coalesce(array_length(v_prev, 1), 0) > 0 and coalesce(array_length(v_suspects, 1), 0) > 0 then
    select coalesce(array_agg(x), '{}') into v_suspects
      from unnest(v_suspects) x where x = any(v_prev);
    -- Une intersection vide voudrait dire qu'on s'est trompé quelque part : on
    -- garde alors la lecture de la manche plutôt que d'effacer tout le monde.
    if coalesce(array_length(v_suspects, 1), 0) = 0 then
      select coalesce(array_agg(x), '{}') into v_suspects from unnest(v_prev) x;
    end if;
  end if;

  -- Le carnet : le soupçon secret que chacun a déposé. Il ne touche PAS au
  -- dépouillement — il n'est là que pour le score, et n'est révélé qu'à la fin.
  select coalesce(jsonb_object_agg(p.name, e.payload->>'hunch'), '{}'::jsonb)
    into v_hunches
    from scrutin_game_entries e
    join scrutin_game_players p on p.id = e.player_id
   where e.round_id = p_round_id and e.payload ? 'hunch' and e.payload->>'hunch' <> '';

  update scrutin_game_rounds
     set result = jsonb_build_object(
           'rule', 'alibi-v1',
           'rooms', v_rooms,
           'suspects', to_jsonb(v_suspects),
           'cleared', to_jsonb(v_cleared),
           'hunches', v_hunches)
   where id = p_round_id;
end $function$;

-- ═══════════════════════════════════════════════════════════ 6. LES BRANCHES
--
-- Trois verbes génériques apprennent l'existence d'un second jeu. Le dispatch
-- par `game` est celui qui existait déjà dans `game_reveal` : le verbe reste
-- générique, les règles restent au jeu.

-- `game_submit` était ENTIÈREMENT écrit pour Unanimo (il normalise des mots).
-- On l'ouvre : chaque jeu range ce qu'il veut dans `payload`, borné par le
-- déclencheur de la table (objet plat, 2 ko).
create or replace function public.game_submit(p_token text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_p scrutin_game_players;
  v_room scrutin_game_rooms;
  v_round scrutin_game_rounds;
  v_max int;
  v_words jsonb;
  v_pay jsonb;
begin
  select * into v_p from scrutin_game_players where token = p_token;
  if v_p.id is null then return jsonb_build_object('status', 'invalid'); end if;
  select * into v_room from scrutin_game_rooms where id = v_p.room_id;
  select * into v_round from scrutin_game_rounds
   where room_id = v_room.id and round_no = v_room.round_no;
  if v_round.id is null then return jsonb_build_object('status', 'no_round'); end if;
  if v_round.phase <> 'contribution' then return jsonb_build_object('status', 'closed'); end if;
  if v_p.joined_round > v_room.round_no then return jsonb_build_object('status', 'waiting'); end if;

  if v_room.game = 'alibi' then
    -- Quatre champs, tous scalaires : la pièce, le nombre, le soupçon, et le
    -- nom accusé (dernière manche).
    -- On NE VALIDE PAS que le nombre corresponde à la pièce — annoncer un
    -- compte faux est précisément ce qui trahit le coupable. La règle est dans
    -- le dépouillement, pas dans la saisie.
    v_pay := jsonb_strip_nulls(jsonb_build_object(
      'room',   case when p_payload ? 'room'
                     then greatest(0, least(9, coalesce((p_payload->>'room')::int, 0))) end,
      'count',  case when p_payload ? 'count'
                     then greatest(0, least(99, coalesce((p_payload->>'count')::int, 0))) end,
      'hunch',  left(btrim(coalesce(p_payload->>'hunch', '')), 24),
      'accuse', left(btrim(coalesce(p_payload->>'accuse', '')), 24)));
    insert into scrutin_game_entries (round_id, player_id, payload)
    values (v_round.id, v_p.id, v_pay)
    on conflict (round_id, player_id) do update set payload = excluded.payload, submitted_at = now();
    update scrutin_game_rooms set last_active_at = now() where id = v_room.id;
    return jsonb_build_object('status', 'ok');
  end if;

  v_max := least(20, greatest(1, coalesce((v_room.settings->>'words')::int, 8)));

  with src as (
    select left(btrim(w.word), 40) as shown, scrutin_game_norm(w.word) as norm, w.ord
      from jsonb_array_elements_text(coalesce(p_payload->'words', '[]'::jsonb))
             with ordinality as w (word, ord)
  ),
  uniq as (
    select distinct on (norm) shown, norm, ord from src where norm <> '' order by norm, ord
  ),
  kept as (
    select shown, ord from uniq order by ord limit v_max
  )
  select coalesce(jsonb_agg(shown order by ord), '[]'::jsonb) into v_words from kept;

  insert into scrutin_game_entries (round_id, player_id, payload)
  values (v_round.id, v_p.id, jsonb_build_object('words', v_words))
  on conflict (round_id, player_id) do update set payload = excluded.payload, submitted_at = now();

  update scrutin_game_rooms set last_active_at = now() where id = v_room.id;
  return jsonb_build_object('status', 'ok', 'words', v_words);
end $function$;

-- `game_reveal` : on ajoute la branche du dépouillement d'Alibi.
create or replace function public.game_reveal(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_p scrutin_game_players;
  v_room scrutin_game_rooms;
  v_round scrutin_game_rounds;
  v_ok int;
begin
  select * into v_p from scrutin_game_players where token = p_token;
  if v_p.id is null or not v_p.is_host then return jsonb_build_object('status', 'forbidden'); end if;
  select * into v_room from scrutin_game_rooms where id = v_p.room_id for update;
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
  end if;

  update scrutin_game_rooms set last_active_at = now() where id = v_room.id;
  return jsonb_build_object('status', 'ok');
end $function$;

-- ═══════════════════════════════════════════════════════════ 7. L'ACCUSATION
--
-- La dernière manche n'a ni pièce ni carte : un seul nom, secret, à la
-- PLURALITÉ SIMPLE. Une seule méthode de vote dans tout le jeu — les autres
-- (approbation, jugement majoritaire, Condorcet) ont leur place sur /methodes,
-- pas dans une soirée où l'on découvre déjà une règle.
--
-- LE SCORE. Personne n'est éliminé, personne ne finit sous zéro, et il n'y a
-- qu'un seul classement : ce n'est pas un jeu à camps.
--   le carnet     : +2 par manche où ton soupçon nommait le coupable
--   l'accusation  : +10 si elle le nomme
--   le coupable   : +2 par manche où la pièce en trop comptait au moins deux
--                   personnes (il s'est couvert), et +10 s'il n'est pas le nom
--                   le plus accusé.
-- Un innocent parfait plafonne à 18, le coupable aussi : les deux rôles jouent
-- la même partie.
create or replace function public.scrutin_game_alibi_verdict(p_round_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  v_round scrutin_game_rounds;
  v_room scrutin_game_rooms;
  v_culprit text;
  v_votes jsonb;
  v_top text[];
  v_hit boolean;
  v_scores jsonb;
  v_rounds int;
begin
  select * into v_round from scrutin_game_rounds where id = p_round_id;
  select * into v_room from scrutin_game_rooms where id = v_round.room_id;

  select p.name into v_culprit from scrutin_game_players p
   where p.room_id = v_room.id and p.secret->>'role' = 'culprit' limit 1;

  select coalesce(jsonb_object_agg(t.name, t.n), '{}'::jsonb) into v_votes
    from (select e.payload->>'accuse' as name, count(*)::int as n
            from scrutin_game_entries e
           where e.round_id = p_round_id and coalesce(e.payload->>'accuse', '') <> ''
           group by 1) t;

  select coalesce(array_agg(k), '{}') into v_top
    from jsonb_each(v_votes) x(k, v)
   where (v::text)::int = (select max((value::text)::int) from jsonb_each(v_votes));
  v_hit := v_culprit = any(v_top);

  -- Manches d'enquête où la pièce en trop comptait au moins deux personnes :
  -- c'est la mesure de ce que le coupable a réussi à se couvrir.
  select count(*)::int into v_rounds
    from scrutin_game_rounds r
   where r.room_id = v_room.id and r.round_no < v_round.round_no
     and jsonb_array_length(coalesce(r.result->'suspects', '[]'::jsonb)) >= 2;

  -- Le carnet, manche par manche.
  with carnet as (
    select k as name, count(*)::int as justes
      from scrutin_game_rounds r,
           lateral jsonb_each_text(coalesce(r.result->'hunches', '{}'::jsonb)) h(k, v)
     where r.room_id = v_room.id and r.round_no < v_round.round_no and v = v_culprit
     group by k
  ),
  accus as (
    select p.name, (e.payload->>'accuse' = v_culprit) as juste
      from scrutin_game_entries e join scrutin_game_players p on p.id = e.player_id
     where e.round_id = p_round_id
  )
  select coalesce(jsonb_object_agg(p.name, s.pts), '{}'::jsonb) into v_scores
    from scrutin_game_players p
    left join lateral (
      select case
               when p.name = v_culprit
                 then 2 * v_rounds + (case when v_hit then 0 else 10 end)
               else 2 * coalesce((select justes from carnet c where c.name = p.name), 0)
                    + (case when coalesce((select juste from accus a where a.name = p.name), false) then 10 else 0 end)
             end as pts) s on true
   where p.room_id = v_room.id;

  update scrutin_game_players p
     set score = greatest(0, coalesce((v_scores->>p.name)::int, 0))
   where p.room_id = v_room.id;

  update scrutin_game_rounds
     set result = jsonb_build_object(
           'rule', 'alibi-v1',
           'final', true,
           'culprit', v_culprit,
           'votes', v_votes,
           'accused', to_jsonb(v_top),
           -- `hit` et `size` : les deux seuls chiffres dont on a besoin pour
           -- lire le taux de résolution sur les VRAIES parties. Le simulateur
           -- annonce 54 % à onze joueurs en tranchant le duel à pile ou face,
           -- ce qu'une vraie table ne fait pas : c'est un plancher, et c'est ici
           -- qu'on saura de combien on l'a dépassé.
           'hit', v_hit,
           'size', (select count(*) from scrutin_game_players where room_id = v_room.id),
           'scores', v_scores)
   where id = p_round_id;
end $function$;

-- `game_next_round` : la distribution d'Alibi s'accroche à l'ouverture de
-- chaque manche d'enquête. La dernière (l'accusation) n'en a pas.
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
  if v_p.id is null or not v_p.is_host then return jsonb_build_object('status', 'forbidden'); end if;
  select * into v_room from scrutin_game_rooms where id = v_p.room_id for update;

  select * into v_cur from scrutin_game_rounds
   where room_id = v_room.id and round_no = v_room.round_no;
  if v_cur.id is not null and v_cur.phase <> 'reveal' then
    return jsonb_build_object('status', 'not_revealed');
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

  if v_room.game = 'alibi' and v_next < v_room.rounds_total then
    select id into v_id from scrutin_game_rounds
     where room_id = v_room.id and round_no = v_next;
    perform scrutin_game_alibi_deal(v_id);
  end if;

  return jsonb_build_object('status', 'ok', 'roundNo', v_next);
end $function$;

-- ═════════════════════════════════════════════════════ 8. LA RPC D'ÉTAT
--
-- Deux changements, et un seul est propre à Alibi.
--
-- (a) `mine` lisait `payload->'words'` EN DUR — un héritage d'Unanimo. Tout
--     autre jeu recevait `null`, sans que rien ne le signale. On aiguille.
-- (b) `me.secret` : le secret du joueur sort ICI, et NULLE PART AILLEURS. Il est
--     déjà sous le jeton (`v_me` n'est renseigné que si `p_token` correspond),
--     et il n'apparaît ni dans `players`, ni dans `round`, ni dans `result`.
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
   where p.room_id = v_room.id and (v_room.round_no = 0 or p.joined_round <= v_room.round_no);
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
            else jsonb_build_object('name', v_me.name, 'isHost', v_me.is_host,
                                    'score', v_me.score, 'joinedRound', v_me.joined_round,
                                    -- LE SEUL ENDROIT OÙ UN SECRET SORT.
                                    'secret', v_me.secret)
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

-- ═══════════════════════════════════════════════════════════════ 9. LES DROITS
--
-- ⚠️ Le `grant` ne suffit pas : PUBLIC détient l'EXECUTE par défaut sur toute
-- fonction. Le `revoke` vient AVANT, et dans cet ordre.
revoke all on function public.scrutin_game_alibi_sizes(int, int) from public, anon, authenticated;
revoke all on function public.scrutin_game_alibi_deal(uuid) from public, anon, authenticated;
revoke all on function public.scrutin_game_alibi_reveal(uuid) from public, anon, authenticated;
revoke all on function public.scrutin_game_alibi_verdict(uuid) from public, anon, authenticated;

revoke all on function public.game_join(text, text) from public;
revoke all on function public.game_submit(text, jsonb) from public;
revoke all on function public.game_reveal(text) from public;
revoke all on function public.game_next_round(text, jsonb) from public;
revoke all on function public.get_game_room(text, text) from public;

grant execute on function public.game_join(text, text) to anon, authenticated;
grant execute on function public.game_submit(text, jsonb) to anon, authenticated;
grant execute on function public.game_reveal(text) to anon, authenticated;
grant execute on function public.game_next_round(text, jsonb) to anon, authenticated;
grant execute on function public.get_game_room(text, text) to anon, authenticated;
