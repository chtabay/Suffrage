-- ═══════════════════════════════════════════════════════════════════════════
-- RÔDEURS — troisième jeu de la salle Placet. Étage 1 : le schéma.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- LA RÈGLE, EN UNE PHRASE : chaque fois que quelqu'un tape ton code, tu as la
-- preuve que vous étiez ensemble ; trois d'entre vous sont des rôdeurs et
-- doivent, chaque manche, approcher une personne qu'ils ont vraiment croisée —
-- elle apprendra dans quelle pièce, et devra deviner lequel des gens qu'elle a
-- validés là-bas rôdait.
--
-- POURQUOI CE JEU EXISTE, ET CE QUI L'A DÉCIDÉ. Deux mécaniques concurrentes ont
-- été simulées puis attaquées, et sont mortes DE LA MÊME CAUSE : elles faisaient
-- produire au rôdeur un TROU — une tranche sans tampon, trois minutes de
-- silence. Or un trou est une NON-ACTION : gratuite, infalsifiable, et surtout
-- indistinguable de la vie réelle d'un gîte. Mesuré, le dégât était toujours le
-- même et il visait exactement le cas d'usage : l'enfant qu'on couche à la
-- manche 3 devenait un suspect permanent (44,2 % des accusations à tort pour
-- 18,2 % de la table, −15 points de taux).
--
-- Ici le rôdeur produit un ACTE POSITIF : il marque quelqu'un qu'il a réellement
-- validé. Trois conséquences, et ce sont elles qui font le jeu :
--   • il est dans le lot de sa victime PAR CONSTRUCTION, et ne peut pas
--     s'extraire de l'information qu'il produit ;
--   • le joueur passif n'apparaît nulle part : celui qui va se coucher sort du
--     jeu sans polluer l'enquête ;
--   • son meilleur coup, mesuré, est CONTRE-INTUITIF — aller où il y a du monde
--     et valider le plus possible. Se terrer coûte 8 points, jouer au hasard 31.
--     Dans un gîte avec quatre enfants, personne n'a intérêt à partir errer seul
--     dans le noir.
--
-- ⚠️ RÉSERVE HONNÊTE, à garder sous les yeux : le jeu CORRIGÉ n'a jamais été
-- simulé en entier. Les trois correctifs qui le sauvent ont été mesurés
-- isolément (le principal fait passer l'exploit de la clique de 0,5 % à 99,8 %,
-- au prix de 4 à 7 points sur le jeu normal), et la règle « quitter, c'est se
-- rendre » ne l'a pas été du tout. D'où l'instrumentation de l'étage 4 : le
-- résultat final écrit de quoi lire le vrai taux sur les vraies parties.

-- ═════════════════════════════════════════════ 1. DEUX COLONNES SUR LE SOCLE
--
-- `band` et `left_at` sont PUBLICS. Nier qu'on voit qui a huit ans dans une
-- pièce serait absurde, et un réglage caché coûterait plus qu'il ne rapporte
-- (mesuré ailleurs : annoncer que les petits ne rôdent pas fait passer le
-- village de 62 % à 86 % — donc on ne le cache pas, et on ne l'interdit pas).
--
-- Le rôle, le sceau, la mission et les complices vivent dans `secret jsonb`,
-- déjà posée par Alibi, et ne sortent QUE dans l'objet `me` de get_game_room.
alter table public.scrutin_game_players
  add column if not exists band text,
  add column if not exists left_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'scrutin_game_players_band_chk') then
    alter table public.scrutin_game_players
      add constraint scrutin_game_players_band_chk
      check (band is null or band in ('petit', 'moyen', 'grand'));
  end if;
end $$;

-- ═══════════════════════════════════════════════════════ 2. LES RENCONTRES
--
-- Le registre des poignées de main. C'est LA matière du jeu : l'alibi de chacun,
-- et la seule chose que le rôdeur ne peut pas inventer.
--
-- ⚠️ POURQUOI `scrutin_game_entries` NE SUFFIT PAS. Elle porte
-- `unique (round_id, player_id)` : une ligne par joueur et par manche. Un jeu de
-- rencontres en écrit une par poignée de main. Elle continuera de porter le
-- bulletin de confrontation, et rien d'autre.
create table if not exists public.scrutin_game_meets (
  id       uuid primary key default gen_random_uuid(),
  room_id  uuid not null references public.scrutin_game_rooms (id) on delete cascade,
  round_no int not null,
  -- `seen_by` a tapé le code de `seen`. Le rôle change la mission, JAMAIS la
  -- valeur d'alibi : les deux étaient là, et le registre les traite pareil.
  seen_by  uuid not null references public.scrutin_game_players (id) on delete cascade,
  seen     uuid not null references public.scrutin_game_players (id) on delete cascade,
  place    text not null,
  -- ⚠️ HORODATAGE ABSOLU, jamais un décalage depuis le début de la manche.
  -- C'est ce qui n'interdit rien aux versions journée et semaine : une partie
  -- d'une semaine, c'est le même schéma avec des fenêtres plus longues.
  at       timestamptz not null default now(),
  constraint scrutin_game_meets_self_chk check (seen_by <> seen),
  constraint scrutin_game_meets_place_chk check (place ~ '^[a-z][a-z0-9_-]{1,24}$')
);

-- ⚠️ LE `least/greatest` EST OBLIGATOIRE. Un index sur `(seen_by, seen)` nu
-- laisse passer la même poignée de main deux fois, une par sens : deux arêtes
-- pour une rencontre, donc un alibi DOUBLE offert à une paire complice.
create unique index if not exists scrutin_game_meets_pair_uk
  on public.scrutin_game_meets (room_id, round_no, least(seen_by, seen), greatest(seen_by, seen));
create index if not exists scrutin_game_meets_round_ix
  on public.scrutin_game_meets (room_id, round_no, at);
create index if not exists scrutin_game_meets_seen_ix
  on public.scrutin_game_meets (room_id, seen);
create index if not exists scrutin_game_meets_by_ix
  on public.scrutin_game_meets (room_id, seen_by);

-- ⚠️ PAS DE COLONNE `seq`. Un `max(seq)+1` calculé dans la RPC, avec onze
-- téléphones qui tapent en même temps, produit des violations d'unicité et des
-- tampons SILENCIEUSEMENT perdus. On ordonne par `(at, id)`.

-- ═══════════════════════════════════════════════════════════ 3. LES MARQUES
--
-- L'acte du rôdeur, un par manche. `published_at` à null après la clôture = la
-- victime s'est tue : le serveur publie alors la pièce ANONYMEMENT, dérivé à la
-- lecture, sans écriture supplémentaire. On a le droit de se taire ; on n'a pas
-- le pouvoir d'éteindre le registre.
create table if not exists public.scrutin_game_marks (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.scrutin_game_rooms (id) on delete cascade,
  round_no     int not null,
  rodeur_id    uuid not null references public.scrutin_game_players (id) on delete cascade,
  victim_id    uuid not null references public.scrutin_game_players (id) on delete cascade,
  -- La rencontre qui fonde la marque : la victime en vient, et le rôdeur y est
  -- partie prenante. C'est ce qui l'empêche de marquer quelqu'un qu'il n'a pas vu.
  meet_id      uuid not null references public.scrutin_game_meets (id) on delete cascade,
  -- La pièce ANNONCÉE. Vraie par défaut ; une fausse piste la déplace vers une
  -- autre pièce où le rôdeur était RÉELLEMENT (voir l'étage 3).
  place        text not null,
  faked        boolean not null default false,
  -- Posée d'office par le serveur : le rôdeur n'a rien fait. Ce n'est pas un
  -- plantage, c'est une punition mesurée — la passivité coûte 31 points.
  auto         boolean not null default false,
  published_at timestamptz,
  at           timestamptz not null default now(),
  constraint scrutin_game_marks_self_chk check (rodeur_id <> victim_id)
);
create unique index if not exists scrutin_game_marks_uk
  on public.scrutin_game_marks (room_id, round_no, rodeur_id);
create index if not exists scrutin_game_marks_victim_ix
  on public.scrutin_game_marks (room_id, victim_id);

-- ══════════════════════════════════════════════════════════ 4. LES MISSIONS
--
-- Une mission = un PATRON + des emplacements. Le texte n'est jamais stocké : il
-- est assemblé côté client depuis la clé i18n et les emplacements. Trente
-- patrons × quatre langues = ~120 chaînes courtes, pas 20 000 mots — et le jeu
-- se rejoue indéfiniment parce que le contenu naît des prénoms de la table.
--
-- LA MISSION SECRÈTE EST LE CURSEUR PRINCIPAL DU JEU, et il est mesuré :
--   part de la table ayant une raison de se taire → victoire du village
--     aucune       73,3 %
--     UN TIERS     58,9 %   ← le point de fonctionnement retenu
--     deux tiers   40,4 %
-- Trente-trois points d'amplitude sur une seule ligne de tirage.
--
-- ⚠️ JAMAIS DE MISSION SECRÈTE POUR LA BANDE `petit`. Un enfant de huit ans qui
-- ne peut pas expliquer son silence est le faux suspect parfait, et il n'a pas
-- les mots pour s'en sortir.
create table if not exists public.scrutin_game_missions (
  id        uuid primary key default gen_random_uuid(),
  room_id   uuid not null references public.scrutin_game_rooms (id) on delete cascade,
  round_no  int not null,
  player_id uuid not null references public.scrutin_game_players (id) on delete cascade,
  pattern   text not null,
  args      jsonb not null default '{}'::jsonb,
  is_secret boolean not null default false,
  done_at   timestamptz,
  -- Secrète, accomplie, mais le lot a été publié : le contrat est rompu, la
  -- mission ne rapporte rien. C'est le mobile de se taire, et il est mécanique.
  burned    boolean not null default false,
  points    int not null default 0
);
create unique index if not exists scrutin_game_missions_uk
  on public.scrutin_game_missions (room_id, round_no, player_id);
create index if not exists scrutin_game_missions_pl_ix
  on public.scrutin_game_missions (room_id, player_id);

-- ═════════════════════════════════════════════ 5. LE CATALOGUE DES PATRONS
--
-- Plat, lu par le générateur. En base parce que le générateur est en base ; les
-- LIBELLÉS, eux, vivent côté client dans les quatre langues — la base garde ce
-- qui a été joué, elle n'héberge pas un catalogue qu'il faudrait traduire ici.
create table if not exists public.scrutin_game_rodeurs_patterns (
  pattern      text primary key,
  band         text not null check (band in ('petit', 'moyen', 'grand')),
  needs_target boolean not null default false,
  needs_place  boolean not null default false,
  needs_n      boolean not null default false,
  n_min        int,
  n_max        int
);

-- ══════════════════════════════════════════════════════════════ 6. LES DROITS
--
-- RLS ACTIVE, AUCUNE POLICY — comme les quatre tables du socle : aucun chemin de
-- lecture directe n'existe, ni pour `anon`, ni pour un compte connecté. Le
-- `revoke` est une seconde serrure au cas où un `grant … on all tables`
-- viendrait à repasser. On n'oublie pas de fermer une porte qui n'a pas été
-- percée.
alter table public.scrutin_game_meets enable row level security;
alter table public.scrutin_game_marks enable row level security;
alter table public.scrutin_game_missions enable row level security;
alter table public.scrutin_game_rodeurs_patterns enable row level security;
revoke all on table public.scrutin_game_meets from anon, authenticated;
revoke all on table public.scrutin_game_marks from anon, authenticated;
revoke all on table public.scrutin_game_missions from anon, authenticated;
revoke all on table public.scrutin_game_rodeurs_patterns from anon, authenticated;
