-- PREMIÈRE EXPÉRIENCE DE JEU : UNE SALLE GÉNÉRIQUE, UNANIMO PAR-DESSUS.
--
-- POURQUOI DE NOUVELLES TABLES, ET PAS `scrutin_polls`. La tentation était de
-- faire d'une manche d'Unanimo un scrutin : il y a un lien à partager, des
-- participants, des réponses secrètes, une clôture. Mais un scrutin de Placet
-- porte des OPTIONS FIGÉES (les bulletins les référencent par index) et une
-- MÉTHODE de dépouillement, quand une manche de jeu porte des réponses libres
-- écrites par les joueurs eux-mêmes et un score cumulé de partie en partie.
-- Détourner `options` en « mots proposés » aurait fait payer au jeu toutes les
-- gardes du vote (verrou de publication, seuil de dépouillement, émargement) et
-- aurait fait payer au vote la souplesse du jeu. Deux modèles, un seul dépôt.
--
-- CE QUI EST GÉNÉRIQUE, ET C'EST L'INTÉRÊT DU LOT : `scrutin_game_rooms`,
-- `scrutin_game_players`, `scrutin_game_rounds`, `scrutin_game_entries` et les
-- verbes `game_*` ne connaissent RIEN d'Unanimo. Une salle a un `game` (texte
-- libre validé par forme), des réglages en `jsonb`, des manches qui portent un
-- `prompt` en `jsonb` et des contributions en `payload` jsonb. Un futur
-- Loup-Garou réutilise la salle, les joueurs, l'entrée en cours de partie, les
-- phases, le secret des contributions et le contrôle par l'hôte ; il n'ajoute
-- que ses règles, comme `scrutin_game_unanimo_reveal` ici.
--
-- LE SECRET DES RÉPONSES EST STRUCTUREL, PAS DÉCLARATIF. Les quatre tables ont
-- la RLS active et AUCUNE policy : il n'existe donc aucun chemin de lecture
-- directe, pour personne. Tout passe par des fonctions `security definer`, et
-- `get_game_room` ne rend les réponses des autres qu'une fois la manche en
-- phase `reveal`. On ne peut pas oublier de fermer une porte qui n'existe pas.
--
-- ⚠️ Base OpenSM PARTAGÉE avec une autre application : une table `game_state`
-- lui appartient déjà. D'où le préfixe `scrutin_game_` sur tout, sans exception.

-- ══════════════════════════════════════════════════════════════════ 1. tables

create table if not exists public.scrutin_game_rooms (
  id uuid primary key default gen_random_uuid(),
  -- Slug du jeu ('unanimo'). Volontairement PAS une liste blanche : ajouter un
  -- jeu ne doit pas demander une migration.
  game text not null,
  -- Code de salle lu à voix haute dans une pièce : voir scrutin_game_code().
  code text not null unique,
  status text not null default 'lobby',
  -- Nombre de manches PRÉVU, jamais irréversible (game_set_rounds).
  rounds_total int not null default 5,
  -- 0 = personne n'a encore lancé la première manche.
  round_no int not null default 0,
  settings jsonb not null default '{}'::jsonb,
  -- Langue de la salle : elle décide de la langue des thèmes tirés côté client.
  locale text not null default 'fr',
  -- « Rejouer » ne recrée pas un groupe : l'hôte ouvre une salle neuve et
  -- l'ancienne pointe vers elle, si bien que les joueurs qui la regardent
  -- encore voient arriver la nouvelle partie sans qu'on leur repartage un lien.
  next_code text,
  created_at timestamptz not null default now(),
  -- Compte FACULTATIF : on joue sans s'inscrire. La colonne n'existe que pour
  -- qu'un habitué puisse un jour retrouver ses parties.
  created_by uuid references auth.users (id) on delete set null,
  last_active_at timestamptz not null default now(),
  constraint scrutin_game_rooms_game_chk check (game ~ '^[a-z][a-z0-9-]{1,30}$'),
  constraint scrutin_game_rooms_status_chk check (status in ('lobby', 'playing', 'ended')),
  constraint scrutin_game_rooms_rounds_chk check (rounds_total between 1 and 50)
);

create table if not exists public.scrutin_game_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.scrutin_game_rooms (id) on delete cascade,
  name text not null,
  -- Le jeton du joueur : son titre d'accès, gardé dans SON localStorage. C'est
  -- aussi ce qui authentifie l'hôte — pas de second secret à gérer.
  token text not null unique default encode(gen_random_bytes(12), 'hex'),
  is_host boolean not null default false,
  score int not null default 0,
  -- Manche à partir de laquelle ce joueur compte. Un retardataire commence à 0
  -- point et ne perturbe pas la manche en cours : « le retard fait partie du jeu ».
  joined_round int not null default 1,
  created_at timestamptz not null default now(),
  seen_at timestamptz not null default now()
);
-- Deux « Tom » dans une salle rendraient la révélation illisible.
create unique index if not exists scrutin_game_players_room_name_uk
  on public.scrutin_game_players (room_id, lower(name));
create index if not exists scrutin_game_players_room_idx
  on public.scrutin_game_players (room_id);

create table if not exists public.scrutin_game_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.scrutin_game_rooms (id) on delete cascade,
  round_no int not null,
  -- Ce qui est proposé aux joueurs. Unanimo : {"kind":"theme","text":"La mer","emoji":"🌊"}.
  -- Le thème est CHOISI PAR LE CLIENT DE L'HÔTE dans une liste locale et
  -- localisée : la base garde ce qui a été joué, elle n'héberge pas le
  -- catalogue (qui devrait alors être traduit en base, et le serait mal).
  prompt jsonb not null default '{}'::jsonb,
  phase text not null default 'contribution',
  -- Résultat FIGÉ au moment de la révélation. Recalculer à l'affichage
  -- laisserait deux clients afficher deux classements pour la même manche.
  result jsonb,
  started_at timestamptz not null default now(),
  revealed_at timestamptz,
  constraint scrutin_game_rounds_phase_chk check (phase in ('contribution', 'reveal')),
  constraint scrutin_game_rounds_uk unique (room_id, round_no)
);

create table if not exists public.scrutin_game_entries (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.scrutin_game_rounds (id) on delete cascade,
  player_id uuid not null references public.scrutin_game_players (id) on delete cascade,
  -- Unanimo : {"words":["Plage","Vague"]}. Générique : la forme appartient au jeu.
  payload jsonb not null default '{}'::jsonb,
  points int not null default 0,
  submitted_at timestamptz not null default now(),
  constraint scrutin_game_entries_uk unique (round_id, player_id)
);

-- RLS ACTIVE, AUCUNE POLICY : aucune lecture ni écriture directe n'est possible,
-- ni pour `anon`, ni pour un compte connecté. Le `revoke` est une seconde
-- serrure au cas où un `grant … on all tables` viendrait à repasser.
alter table public.scrutin_game_rooms enable row level security;
alter table public.scrutin_game_players enable row level security;
alter table public.scrutin_game_rounds enable row level security;
alter table public.scrutin_game_entries enable row level security;
revoke all on table public.scrutin_game_rooms from anon, authenticated;
revoke all on table public.scrutin_game_players from anon, authenticated;
revoke all on table public.scrutin_game_rounds from anon, authenticated;
revoke all on table public.scrutin_game_entries from anon, authenticated;

-- ═════════════════════════════════════════════════════ 2. outillage générique

-- Code de salle LU À VOIX HAUTE dans une pièce, puis tapé sur un téléphone.
-- L'alphabet retire tout ce qui s'entend ou se lit de deux façons : 0/O, 1/I/L,
-- 2/Z, 5/S, 8/B. Six caractères sur 25 symboles ≈ 2,4 × 10⁸ combinaisons.
create or replace function public.scrutin_game_code()
returns text language sql volatile set search_path to 'public' as $function$
  select string_agg(substr('ACDEFGHJKMNPQRTUVWXY34679', 1 + floor(random() * 25)::int, 1), '')
    from generate_series(1, 6);
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- NORMALISATION D'UN MOT — LA SEULE AUTORITÉ.
--
-- Elle vit ICI et nulle part ailleurs. Une seconde implémentation côté client
-- finirait par diverger d'un caractère, et deux joueurs verraient deux scores.
-- Le client ne fait qu'un dédoublonnage de confort dans sa propre liste.
--
-- Trois gestes, dans cet ordre :
--   1. minuscules et pliage des accents — « Plage » = « plage », « éclair » =
--      « eclair ». Pas d'extension `unaccent` sur cette base : `translate`.
--   2. tout ce qui n'est ni lettre ni chiffre devient une espace, les espaces se
--      réduisent — « porte-avions » = « porte avions » = « Porte  Avions ».
--   3. pluriel : on retire un « s » final SI le radical garde 4 caractères.
--      « plages »→« plage », « poissons »→« poisson », mais « bus » reste
--      « bus » et « mois » reste « mois » (radicaux trop courts). Le seuil est
--      un choix ASSUMÉ : sous 4, « mois » et « moi » fusionnent, ce qui est un
--      faux positif — bien plus grave dans un jeu qu'un faux négatif. Limite
--      connue et acceptée en V1 : « mer » et « mers » restent distincts.
-- Volontairement PAS de stemmer, PAS de dictionnaire, PAS de synonymes : la V1
-- doit être explicable en trois phrases à un joueur qui conteste un point.
create or replace function public.scrutin_game_norm(p_word text)
returns text language sql immutable set search_path to 'public' as $function$
  with a as (
    select translate(
             replace(replace(lower(coalesce(p_word, '')), 'œ', 'oe'), 'æ', 'ae'),
             'áàâäãåāéèêëēíìîïīóòôöõøōúùûüūýÿñçšž',
             'aaaaaaaeeeeeiiiiiooooooouuuuuyyncsz'
           ) as w
  ),
  b as (
    select btrim(regexp_replace(regexp_replace(w, '[^a-z0-9]+', ' ', 'g'), ' +', ' ')) as w from a
  )
  select case when w ~ '[^s]s$' and length(w) >= 5 then left(w, length(w) - 1) else w end from b;
$function$;

-- ══════════════════════════════════════════════════ 3. lecture de l'état (poll)

-- L'ÉTAT COMPLET DE LA SALLE POUR UN SPECTATEUR DONNÉ, en un appel.
--
-- Cette base n'a AUCUNE table publiée en réplication logique : le temps réel de
-- Supabase n'est pas activé, et les écrans qui suivent une consultation en
-- direct (LivretVote, EventEditor) se rafraîchissent déjà par `setInterval`. On
-- suit la même voie plutôt que d'allumer une infrastructure pour un jeu.
--
-- La fonction est le POINT DE COUPE DU SECRET : `mine` ne rend que MES mots, et
-- `result` n'existe qu'en phase `reveal`. Les autres joueurs n'apparaissent
-- pendant la contribution que par un booléen « a répondu » — c'est le
-- « 5/6 ont répondu », et ce n'est pas un scrutin : savoir QUI a fini fait
-- partie du jeu, savoir QUOI non.
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
      -- Présence : sert à afficher qui a lâché son téléphone, jamais à bloquer.
      -- Écrite au plus une fois par 15 s — six téléphones qui interrogent toutes
      -- les deux secondes n'ont pas à produire trois écritures par seconde.
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
             -- Classement stable : score, puis ordre d'arrivée.
             order by p.score desc, p.created_at
           ),
           '[]'::jsonb
         )
    into v_players
    from scrutin_game_players p
   where p.room_id = v_room.id;

  -- « Attendus » = ceux qui participent à CETTE manche (un retardataire n'est
  -- pas un absent, il n'est pas encore entré).
  select count(*) into v_expected
    from scrutin_game_players p
   where p.room_id = v_room.id and (v_room.round_no = 0 or p.joined_round <= v_room.round_no);
  select count(*) into v_submitted
    from scrutin_game_entries e
   where v_round.id is not null and e.round_id = v_round.id;

  -- Thèmes déjà joués : c'est le client de l'hôte qui tire le suivant, il a
  -- besoin de savoir ce qui est sorti pour ne pas se répéter.
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
                                    'score', v_me.score, 'joinedRound', v_me.joined_round)
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
                                else (select e.payload->'words' from scrutin_game_entries e
                                       where e.round_id = v_round.id and e.player_id = v_me.id)
                              end,
                      -- LE POINT DE COUPE : rien avant la révélation.
                      'result', case when v_round.phase = 'reveal' then v_round.result else null end)
             end
  );
end $function$;

-- ══════════════════════════════════════════════════ 4. entrer dans une partie

-- Ouvre une salle. L'hôte EST le premier joueur : son jeton de joueur lui sert
-- aussi de titre d'animateur, il n'y a pas de second secret à perdre.
create or replace function public.game_create(
  p_game text,
  p_name text,
  p_rounds int default 5,
  p_settings jsonb default '{}'::jsonb,
  p_locale text default 'fr'
) returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_code text;
  v_room uuid;
  v_token text;
  v_name text := left(btrim(coalesce(p_name, '')), 24);
  v_try int := 0;
begin
  if v_name = '' then return jsonb_build_object('status', 'no_name'); end if;
  if coalesce(p_game, '') !~ '^[a-z][a-z0-9-]{1,30}$' then return jsonb_build_object('status', 'invalid'); end if;

  loop
    v_try := v_try + 1;
    v_code := scrutin_game_code();
    exit when not exists (select 1 from scrutin_game_rooms where code = v_code);
    if v_try > 20 then return jsonb_build_object('status', 'invalid'); end if;
  end loop;

  insert into scrutin_game_rooms (game, code, rounds_total, settings, locale, created_by)
  values (p_game, v_code, least(greatest(coalesce(p_rounds, 5), 1), 50),
          coalesce(p_settings, '{}'::jsonb), left(coalesce(p_locale, 'fr'), 5), auth.uid())
  returning id into v_room;

  insert into scrutin_game_players (room_id, name, is_host)
  values (v_room, v_name, true)
  returning token into v_token;

  return jsonb_build_object('status', 'ok', 'code', v_code, 'token', v_token, 'name', v_name);
end $function$;

-- Rejoindre : un lien, un pseudo, c'est tout. Aucun compte.
--
-- LA DATE D'ENTRÉE EST LE CŒUR DE LA RÈGLE §5 : une partie n'a pas de liste
-- figée. Qui arrive alors qu'une manche court n'entre qu'à la suivante — il ne
-- peut donc ni voir la manche en cours ni la perturber — et commence à 0 point,
-- sans compensation.
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

-- ═══════════════════════════════════════════════ 5. contribuer (joueur)

-- Dépose (ou corrige) ma contribution de la manche en cours.
--
-- Le dédoublonnage et le plafond sont appliqués ICI, jamais côté client :
-- écrire « Plage » puis « plage » ne doit pas rapporter deux fois.
create or replace function public.game_submit(p_token text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_p scrutin_game_players;
  v_room scrutin_game_rooms;
  v_round scrutin_game_rounds;
  v_max int;
  v_words jsonb;
begin
  select * into v_p from scrutin_game_players where token = p_token;
  if v_p.id is null then return jsonb_build_object('status', 'invalid'); end if;
  select * into v_room from scrutin_game_rooms where id = v_p.room_id;
  select * into v_round from scrutin_game_rounds
   where room_id = v_room.id and round_no = v_room.round_no;
  if v_round.id is null then return jsonb_build_object('status', 'no_round'); end if;
  if v_round.phase <> 'contribution' then return jsonb_build_object('status', 'closed'); end if;
  if v_p.joined_round > v_room.round_no then return jsonb_build_object('status', 'waiting'); end if;

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

-- ═════════════════════════════════════════════════ 6. règles d'UNANIMO (le jeu)

-- LA RÈGLE DE SCORE, ISOLÉE DANS UNE FONCTION D'UNE LIGNE.
--
-- Règle OFFICIELLE d'Unanimo (Cocktail Games), vérifiée avant d'écrire : un mot
-- écrit par N joueurs rapporte N points À CHACUN d'eux ; un mot que personne
-- d'autre n'a écrit ne rapporte RIEN. Ce n'est pas « N-1 » : la marche entre
-- être seul (0) et être deux (2 chacun) est franche, et c'est elle qui pousse à
-- chercher l'évidence plutôt que l'astuce — le sel du jeu.
--
-- Pour changer de barème, il n'y a que cette fonction à remplacer. La variante
-- douce « un point par autre joueur » s'écrit `greatest(p_shared - 1, 0)`.
create or replace function public.scrutin_game_unanimo_points(p_shared int)
returns int language sql immutable as $function$
  select case when p_shared >= 2 then p_shared else 0 end;
$function$;

-- Dépouillement d'une manche d'Unanimo. Écrit le résultat FIGÉ dans la manche
-- et incrémente les scores cumulés. Appelée par `game_reveal`, jamais seule.
create or replace function public.scrutin_game_unanimo_reveal(p_round_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  v_round scrutin_game_rounds;
  v_theme text;
  v_words jsonb;
  -- Points de la manche, indexés par identifiant de joueur : c'est la SEULE
  -- source des trois écritures qui suivent (bulletins, scores cumulés,
  -- résultat figé). Un agrégat calculé trois fois finirait par différer.
  v_pts jsonb;
  v_pw jsonb;
  v_players jsonb;
begin
  select * into v_round from scrutin_game_rounds where id = p_round_id;
  v_theme := scrutin_game_norm(coalesce(v_round.prompt->>'text', ''));

  with raw as (
    -- `with ordinality` : l'ORDRE DE SAISIE du joueur. Il sert au dédoublonnage
    -- ci-dessous, et c'est le seul critère qui ne dépende pas d'une collation.
    select e.player_id, p.name as player_name, w.ord,
           left(btrim(w.word), 40) as shown, scrutin_game_norm(w.word) as norm
      from scrutin_game_entries e
      join scrutin_game_players p on p.id = e.player_id
      cross join lateral jsonb_array_elements_text(coalesce(e.payload->'words', '[]'::jsonb))
                   with ordinality as w (word, ord)
     where e.round_id = p_round_id
  ),
  -- Le thème lui-même ne compte pas (« éviter les termes de racine identique au
  -- mot de l'image », règle papier). Le dédoublonnage par joueur est une
  -- seconde ceinture : game_submit l'a déjà fait.
  --
  -- ⚠️ `order by … ord` ET PAS `… shown` : trancher entre « Plage », « plage » et
  -- « PLAGES » par l'ordre alphabétique fait dépendre le libellé affiché de la
  -- COLLATION de la base — le miroir TypeScript de cette règle
  -- (src/lib/games/unanimo/scoring.ts) donnait alors un autre mot que le SQL, et
  -- c'est un test qui l'a montré. On garde la forme que le joueur a écrite EN
  -- PREMIER : déterministe partout, et c'est aussi la plus naturelle.
  kept as (
    select distinct on (player_id, norm) player_id, player_name, shown, norm
      from raw
     where norm <> '' and norm <> v_theme
     order by player_id, norm, ord
  ),
  grouped as (
    select norm,
           count(*)::int as shared,
           -- Libellé affiché : la forme la plus écrite par le groupe.
           mode() within group (order by shown) as label,
           array_agg(player_name order by player_name) as players
      from kept
     group by norm
  )
  select
    -- L'ordre de la révélation : le plus partagé d'abord. À égalité, `norm` et
    -- non `label` — la forme normalisée est en ASCII minuscule, donc son ordre
    -- est le même dans toutes les collations.
    (select coalesce(jsonb_agg(jsonb_build_object(
              'label', g.label, 'norm', g.norm, 'count', g.shared,
              'points', scrutin_game_unanimo_points(g.shared),
              'players', to_jsonb(g.players)) order by g.shared desc, g.norm), '[]'::jsonb)
       from grouped g),
    (select coalesce(jsonb_object_agg(t.player_id::text, t.pts), '{}'::jsonb)
       from (select k.player_id, sum(scrutin_game_unanimo_points(g.shared))::int as pts
               from kept k join grouped g on g.norm = k.norm
              group by k.player_id) t),
    (select coalesce(jsonb_object_agg(t.player_id::text, t.ws), '{}'::jsonb)
       from (select k.player_id,
                    jsonb_agg(jsonb_build_object('label', k.shown, 'count', g.shared,
                                                 'points', scrutin_game_unanimo_points(g.shared))
                              order by g.shared desc, k.shown) as ws
               from kept k join grouped g on g.norm = k.norm
              group by k.player_id) t)
    into v_words, v_pts, v_pw;

  -- Tableau de la manche : la salle ENTIÈRE, y compris qui n'a rien envoyé (0
  -- point, `answered` faux) — c'est ce qui rend lisible une révélation à 4/6.
  -- Un retardataire encore hors jeu, lui, n'y figure pas.
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'name', p.name,
               'points', coalesce((v_pts->>p.id::text)::int, 0),
               'answered', exists (select 1 from scrutin_game_entries e
                                    where e.round_id = p_round_id and e.player_id = p.id),
               'words', coalesce(v_pw->p.id::text, '[]'::jsonb))
             order by coalesce((v_pts->>p.id::text)::int, 0) desc, p.name
           ), '[]'::jsonb)
    into v_players
    from scrutin_game_players p
   where p.room_id = v_round.room_id and p.joined_round <= v_round.round_no;

  update scrutin_game_entries e
     set points = coalesce((v_pts->>e.player_id::text)::int, 0)
   where e.round_id = p_round_id;

  update scrutin_game_players p
     set score = p.score + (v_pts->>p.id::text)::int
   where p.room_id = v_round.room_id and v_pts ? p.id::text;

  update scrutin_game_rounds
     set result = jsonb_build_object('rule', 'unanimo-official-v1', 'words', v_words, 'players', v_players)
   where id = p_round_id;
end $function$;

revoke all on function public.scrutin_game_unanimo_reveal(uuid) from public, anon, authenticated;

-- ═══════════════════════════════════════════════ 7. verbes de l'hôte (générique)

-- Lance la manche suivante. Le thème arrive du client de l'hôte (catalogue
-- local et localisé) ; la base ne fait que le graver dans la manche jouée.
--
-- IDEMPOTENCE DANS LE `where` : deux appuis sur « Manche suivante » depuis deux
-- onglets ne créent pas deux manches — le second ne trouve plus `round_no`
-- inchangé et ressort sans rien faire.
create or replace function public.game_next_round(p_token text, p_prompt jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_p scrutin_game_players;
  v_room scrutin_game_rooms;
  v_cur scrutin_game_rounds;
  v_next int;
begin
  select * into v_p from scrutin_game_players where token = p_token;
  if v_p.id is null or not v_p.is_host then return jsonb_build_object('status', 'forbidden'); end if;
  select * into v_room from scrutin_game_rooms where id = v_p.room_id for update;

  select * into v_cur from scrutin_game_rounds
   where room_id = v_room.id and round_no = v_room.round_no;
  -- On ne saute pas par-dessus une manche ouverte : il faut révéler d'abord.
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

  return jsonb_build_object('status', 'ok', 'roundNo', v_next);
end $function$;

-- Clôt les contributions et révèle. LE POINT LE PLUS IMPORTANT DU LOT :
-- l'hôte peut révéler SANS que tout le monde ait répondu. Un téléphone
-- abandonné, quelqu'un parti fumer, une connexion perdue, ou simplement
-- l'envie de ne pas jouer cette manche ne doivent pas figer la partie.
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

  -- Idempotence : la manche déjà révélée ne se re-dépouille pas (les scores
  -- seraient comptés deux fois).
  update scrutin_game_rounds set phase = 'reveal', revealed_at = now()
   where id = v_round.id and phase = 'contribution';
  get diagnostics v_ok = row_count;
  if v_ok = 0 then return jsonb_build_object('status', 'ok'); end if;

  -- Aiguillage par jeu : le verbe reste générique, les règles restent au jeu.
  if v_room.game = 'unanimo' then
    perform scrutin_game_unanimo_reveal(v_round.id);
  end if;

  update scrutin_game_rooms set last_active_at = now() where id = v_room.id;
  return jsonb_build_object('status', 'ok');
end $function$;

-- Rallonger ou raccourcir la partie. Un nombre de manches n'est JAMAIS
-- irréversible : « encore 3 manches » après la dernière est le cas normal.
-- On ne peut pas descendre sous les manches déjà jouées — elles ont eu lieu.
create or replace function public.game_set_rounds(p_token text, p_total int)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_p scrutin_game_players;
  v_room scrutin_game_rooms;
  v_total int;
  v_phase text;
begin
  select * into v_p from scrutin_game_players where token = p_token;
  if v_p.id is null or not v_p.is_host then return jsonb_build_object('status', 'forbidden'); end if;
  select * into v_room from scrutin_game_rooms where id = v_p.room_id for update;

  v_total := least(greatest(coalesce(p_total, v_room.rounds_total), greatest(v_room.round_no, 1)), 50);
  select phase into v_phase from scrutin_game_rounds
   where room_id = v_room.id and round_no = v_room.round_no;

  update scrutin_game_rooms
     set rounds_total = v_total,
         -- Rallonger une partie terminée la relance ; la raccourcir jusqu'à la
         -- manche courante (déjà révélée) la termine.
         status = case
                    when v_total > v_room.round_no and v_room.status = 'ended' then 'playing'
                    when v_total <= v_room.round_no and coalesce(v_phase, 'reveal') = 'reveal' then 'ended'
                    else v_room.status
                  end,
         last_active_at = now()
   where id = v_room.id;

  return jsonb_build_object('status', 'ok', 'roundsTotal', v_total);
end $function$;

create or replace function public.game_end(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_p scrutin_game_players;
begin
  select * into v_p from scrutin_game_players where token = p_token;
  if v_p.id is null or not v_p.is_host then return jsonb_build_object('status', 'forbidden'); end if;
  update scrutin_game_rooms set status = 'ended', last_active_at = now() where id = v_p.room_id;
  return jsonb_build_object('status', 'ok');
end $function$;

-- REJOUER SANS REPARTAGER. L'hôte ouvre une salle neuve, et l'ancienne pointe
-- vers elle : les téléphones encore ouverts sur la partie finie voient arriver
-- « nouvelle partie » et rejoignent d'un geste, avec leur pseudo. Sans ce
-- chaînage, rejouer voudrait dire refaire le tour de la table.
create or replace function public.game_replay(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_p scrutin_game_players;
  v_room scrutin_game_rooms;
  v_new jsonb;
begin
  select * into v_p from scrutin_game_players where token = p_token;
  if v_p.id is null or not v_p.is_host then return jsonb_build_object('status', 'forbidden'); end if;
  select * into v_room from scrutin_game_rooms where id = v_p.room_id for update;
  -- Déjà rejoué : on renvoie la même salle plutôt qu'une deuxième.
  if v_room.next_code is not null then
    return jsonb_build_object('status', 'ok', 'code', v_room.next_code, 'again', true);
  end if;

  v_new := game_create(v_room.game, v_p.name, v_room.rounds_total, v_room.settings, v_room.locale);
  if v_new->>'status' <> 'ok' then return v_new; end if;

  update scrutin_game_rooms set next_code = v_new->>'code' where id = v_room.id;
  return v_new;
end $function$;

-- ══════════════════════════════════════════════════════════ 8. entretien

-- Une salle de jeu est un objet JETABLE : personne ne revient sur la partie de
-- mardi. Sans ménage, la table grossit indéfiniment pour rien. Fonction prête,
-- volontairement PAS branchée sur un ordonnanceur ici : la planification est
-- une décision d'exploitation, elle se prend à part.
create or replace function public.scrutin_game_purge(p_days int default 7)
returns int language plpgsql security definer set search_path to 'public' as $function$
declare v_n int;
begin
  delete from scrutin_game_rooms
   where last_active_at < now() - make_interval(days => greatest(coalesce(p_days, 7), 1));
  get diagnostics v_n = row_count;
  return v_n;
end $function$;

revoke all on function public.scrutin_game_purge(int) from public, anon, authenticated;

-- ═════════════════════════════════════════════════════════════ 9. droits
--
-- ⚠️ Le `grant` ne suffit pas : PUBLIC détient l'EXECUTE par défaut sur toute
-- fonction. Le `revoke` vient AVANT, et dans cet ordre — même piège que
-- `assign_segment_bulk` (migration du 2026-08-08).
--
-- On joue SANS COMPTE : `anon` doit pouvoir exécuter les verbes de jeu. C'est
-- exactement ce que fait déjà le vote par lien (`cast_public_ballot`). La garde
-- n'est pas le rôle, c'est le JETON : sans jeton de joueur, aucun verbe n'agit.
revoke all on function public.get_game_room(text, text) from public;
revoke all on function public.game_create(text, text, int, jsonb, text) from public;
revoke all on function public.game_join(text, text) from public;
revoke all on function public.game_submit(text, jsonb) from public;
revoke all on function public.game_next_round(text, jsonb) from public;
revoke all on function public.game_reveal(text) from public;
revoke all on function public.game_set_rounds(text, int) from public;
revoke all on function public.game_end(text) from public;
revoke all on function public.game_replay(text) from public;
revoke all on function public.scrutin_game_norm(text) from public;
revoke all on function public.scrutin_game_code() from public, anon, authenticated;
revoke all on function public.scrutin_game_unanimo_points(int) from public;

grant execute on function public.get_game_room(text, text) to anon, authenticated;
grant execute on function public.game_create(text, text, int, jsonb, text) to anon, authenticated;
grant execute on function public.game_join(text, text) to anon, authenticated;
grant execute on function public.game_submit(text, jsonb) to anon, authenticated;
grant execute on function public.game_next_round(text, jsonb) to anon, authenticated;
grant execute on function public.game_reveal(text) to anon, authenticated;
grant execute on function public.game_set_rounds(text, int) to anon, authenticated;
grant execute on function public.game_end(text) to anon, authenticated;
grant execute on function public.game_replay(text) to anon, authenticated;
-- Utile au client pour EXPLIQUER un score contesté (« pourquoi Plage = plages »),
-- jamais pour décider : le dépouillement, lui, appelle la fonction en base.
grant execute on function public.scrutin_game_norm(text) to anon, authenticated;
grant execute on function public.scrutin_game_unanimo_points(int) to anon, authenticated;
