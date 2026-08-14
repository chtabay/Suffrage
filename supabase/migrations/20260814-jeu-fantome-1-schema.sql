-- ═══════════════════════════════════════════════════════════════════════════
-- LA NUIT DU FANTÔME — quatrième jeu de la salle. Étage 1 : le schéma.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Spec : docs/fantome-spec.md. C'est la V2 DU JEU DE SOIRÉE : elle remplacera
-- Rôdeurs (docs/rodeurs-spec.md) à la même entrée de catalogue au lancement.
--
-- LA RÈGLE : le gîte devient un manoir. Des appareils posés dans les pièces —
-- les PORTRAITS — affichent un code qui tourne ; les héritiers font leurs
-- rondes en le saisissant sur leur téléphone, ce qui écrit où ils étaient et
-- quand. UN Fantôme, à un instant tiré par le serveur, a 45 s pour hanter une
-- pièce. Le glas sonne une à trois minutes plus tard, on se réunit, on vote,
-- personne n'est éliminé.
--
-- ⚠️ CE QUE CE FICHIER NE FAIT PAS, ET POURQUOI — le simulateur a été réparé
-- (8 bugs, dont deux de sens opposé qui renversaient la conclusion de 40
-- points), et sa relecture adverse a tué deux pièces maîtresses du cadrage :
--
--   • PAS DE COLONNE, PAS D'INDICE « ALIBI DE PAPIER ». Marquer d'office celui
--     qui a des présences de borne sans aucun témoin humain NUIT au village
--     (42,7 % avec, 45,8 % sans) : il désigne un innocent 32,7 % des nuits
--     contre 3,4 % pour le Fantôme. C'est le troisième avatar de la même faute
--     sur ce chantier — un indice automatique frappe celui qui n'a pas de
--     traces, c'est-à-dire l'enfant qu'on vient de coucher. Si tu es tenté de
--     l'ajouter : c'est mesuré, et c'est non.
--
--   • PAS DE COMPTEUR « QUI T'A LAISSÉ TOMBER EN PLEINE RONDE ». Le levier
--     semblait rapporter +11 pt ; il était alimenté par un oracle (dans le
--     modèle, seul le Fantôme abandonnait jamais). Il suffit qu'un innocent
--     lâche UN CINQUIÈME de ce que lâche le Fantôme pour qu'il change de signe,
--     et −38,8 pt à parité. Avec des enfants de 8-12 ans, ce n'est pas une
--     hypothèse. `stints.aborted_at` existe pour l'écran du joueur, JAMAIS
--     pour alimenter un soupçon.
--
-- ✅ CE QU'IL FAUT EXPLOITER, ET QUI EST GRATUIT : le nombre de rondes MENÉES À
-- TERME départage les ex æquo au vote. L'information est déjà au registre, elle
-- n'ajoute aucune règle à expliquer, et elle rapporte +7 pt (le Fantôme en a
-- mécaniquement moins — il interrompt des rondes pour hanter). D'où
-- `stints.completed_at`, et l'index qui va avec.
--
-- ⚠️ LE PROBLÈME OUVERT, ÉCRIT ICI POUR QU'IL NE SE PERDE PAS : LE RELAIS. Un
-- écran se filme ; un Fantôme qui relaie gagne +40,9 pt, et AUCUN réglage ne
-- permet à la fois de tenir la barre et d'y résister. La posture est celle de
-- la v1 : on ne ferme pas techniquement, on rend social et coûteux. Le sceau
-- éphémère (90 s) et la ronde à deux en sont les deux seules parades.

-- ═════════════════════════════════════════ 1. TROIS COLONNES SUR LE SOCLE
--
-- `band` et `left_at` existent déjà (Rôdeurs). `photo_ok` est le choix
-- personnel du salon : « je préfère être derrière l'objectif ».
--   • null   = pas encore répondu (le salon pose la question à tout le monde) ;
--   • false  = derrière l'objectif.
-- Il ne coûte AUCUN point — le barème de ce dépôt n'a jamais de soustraction —
-- et se change en silence, sans confirmation, depuis n'importe quel écran :
-- c'est ce qui permet à un enfant de défaire en trois secondes ce qu'un adulte
-- a coché pour lui.
--
-- ⚠️ IL N'Y A AUCUN DROIT AU RETRAIT RÉTROACTIF, ET LE JEU DOIT LE DIRE. Une
-- photo déjà prise dort dans le navigateur de trois autres téléphones ; rien ne
-- relie une image aux personnes qu'elle contient, et rien ne circule entre
-- appareils. Le seul recours possible est social (un verbe de salle qui affiche
-- « … est passé derrière l'objectif, ne lève pas sa photo »). Promettre
-- l'effacement serait mentir.
alter table public.scrutin_game_players
  add column if not exists photo_ok boolean;

-- ═══════════════════════════════════════════════════ 2. LES BORNES (PORTRAITS)
--
-- Une borne = n'importe quel navigateur posé, branché, plein écran sur
-- /games/fantome/<code>/borne. Elle est un ÉCRAN-BALISE, JAMAIS UN GUICHET :
-- elle affiche un code qui tourne, tout se joue sur le téléphone du joueur.
-- Ce n'est pas une préférence, c'est une contrainte chiffrée — 11 joueurs × 3
-- rondes × 90 s = 49 min de borne-temps par manche contre 24 min de capacité si
-- les bornes étaient exclusives.
--
-- ⚠️ LE MATÉRIEL PÈSE PLUS QUE TOUS LES RÉGLAGES DU JEU : 3 bornes minimum,
-- 5 si possible (+12 pt), 2 bornes coûtent 18 pt. Et il faut DEUX POSTES DE
-- LECTURE par borne — à un seul, le jeu est disqualifié (26 %, la moitié des
-- rondes jamais jouées). Une vieille tablette dans un couloir étroit ne suffit
-- pas : deux personnes doivent pouvoir lire l'écran en même temps.
create table if not exists public.scrutin_game_bornes (
  id       uuid primary key default gen_random_uuid(),
  room_id  uuid not null references public.scrutin_game_rooms (id) on delete cascade,
  -- Clé de pièce (`cuisine`, `bibliotheque`…). Le PAQUET de scénario la
  -- rethème ; le moteur ne connaît que la clé.
  place    text not null,
  -- ⚠️ LE SECRET D'APPAIRAGE NE DOIT JAMAIS PASSER PAR L'URL. Le préparateur
  -- installe les bornes avant la partie — c'est accepté, préparer n'est pas
  -- animer — mais une URL porteuse du secret ferait de lui un ORACLE : il
  -- rouvrirait chaque borne sur son téléphone et lirait tous les codes de
  -- partout. Il est posé une fois dans le localStorage de la borne, et les
  -- codes sont calculés serveur pour la seule session appairée.
  -- ⚠️ PAS DE `gen_random_bytes` : il vient de pgcrypto, qui n'est PAS dans le
  -- `search_path` verrouillé de nos fonctions (`set search_path to 'public'`).
  -- Le défaut passait à la migration — search_path large — et explosait dès
  -- qu'une RPC insérait une borne. `gen_random_uuid` est du cœur de Postgres :
  -- deux tirages font 256 bits, largement de quoi tenir une soirée.
  secret   text not null default (replace(gen_random_uuid()::text, '-', '')
                               || replace(gen_random_uuid()::text, '-', '')),
  -- Dernier signe de vie. ⚠️ Une borne débranchée est traitée COMME UNE
  -- HANTISE au dépouillement (voir `hauntings.kind = 'panne'`) : sans cela, le
  -- trou physique redevient une NON-ACTION — gratuite, infalsifiable — et c'est
  -- exactement ce qui a tué deux mécaniques sur ce chantier.
  seen_at  timestamptz not null default now(),
  paired_at timestamptz,
  created_at timestamptz not null default now(),
  constraint scrutin_game_bornes_place_chk check (place ~ '^[a-z][a-z0-9_-]{1,24}$')
);

create unique index if not exists scrutin_game_bornes_uk
  on public.scrutin_game_bornes (room_id, place);
create index if not exists scrutin_game_bornes_seen_ix
  on public.scrutin_game_bornes (room_id, seen_at);

-- ═══════════════════════════════════════════════ 3. LES RONDES (PRÉSENCES)
--
-- ⚠️ UN INTERVALLE, PAS UNE PAIRE. `scrutin_game_meets` (Rôdeurs) modélise une
-- poignée de main entre deux joueurs ; ici il faut « X était devant la borne B
-- de t0 à t1 », ce qu'une table par paire ne sait pas dire. Les deux coexistent
-- et ne servent pas à la même chose : `stints` porte le LIEU, `meets` porte le
-- TÉMOIN (§4).
--
-- Une ronde est un mini-jeu de ~90 s sur le téléphone qui exige le code de la
-- borne au début, au milieu, à la fin — cadence ≤ 30 s, donc une escapade est
-- physiquement impossible. C'est aussi ce qui rend le geste de borne ROUTINIER,
-- donc non incriminant : si seul le Fantôme touchait une borne, être vu
-- pianoter devant un portrait suffirait à se griller dès la manche 1.
create table if not exists public.scrutin_game_stints (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.scrutin_game_rooms (id) on delete cascade,
  round_no   int not null,
  player_id  uuid not null references public.scrutin_game_players (id) on delete cascade,
  borne_id   uuid not null references public.scrutin_game_bornes (id) on delete cascade,
  -- `ronde` : la tâche ordinaire. `exorcisme` : réparer un portrait hanté.
  kind       text not null default 'ronde',
  -- `duo` : ce créneau attend un partenaire (une ronde sur trois). Le serveur
  -- N'APPARIE PERSONNE — l'appariement serveur a été prouvé combinatoirement
  -- infaisable à 7 joueurs sur 4 manches (105 partitions énumérées), et il
  -- offrait au Fantôme des certificats d'innocence gratuits. Partenaire libre.
  duo        boolean not null default false,
  -- ⚠️ HORODATAGE ABSOLU, jamais un décalage depuis le début de la manche :
  -- c'est ce qui n'interdit rien aux versions journée et semaine.
  started_at timestamptz not null default now(),
  -- Dernier code accepté : c'est LUI qui prouve la présence continue.
  beat_at    timestamptz not null default now(),
  -- ✅ MENÉE À TERME. Départage les ex æquo au vote (+7 pt, gratuit).
  completed_at timestamptz,
  -- Lâchée en route. ⚠️ POUR L'ÉCRAN DU JOUEUR SEULEMENT — ne jamais en faire
  -- un soupçon : mesuré, le levier change de signe dès qu'un innocent lâche un
  -- cinquième de ce que lâche le Fantôme.
  aborted_at timestamptz,
  constraint scrutin_game_stints_kind_chk check (kind in ('ronde', 'exorcisme')),
  constraint scrutin_game_stints_end_chk check (completed_at is null or aborted_at is null)
);

-- Un joueur ne tient qu'une ronde à la fois : l'index partiel refuse une
-- seconde ronde ouverte. C'est la ceinture contre le joueur qui ouvrirait trois
-- rondes à trois bornes depuis le canapé.
create unique index if not exists scrutin_game_stints_open_uk
  on public.scrutin_game_stints (room_id, player_id)
  where completed_at is null and aborted_at is null;
create index if not exists scrutin_game_stints_round_ix
  on public.scrutin_game_stints (room_id, round_no, player_id);
create index if not exists scrutin_game_stints_borne_ix
  on public.scrutin_game_stints (room_id, borne_id, started_at);
-- Le départage par rondes menées à terme, en une passe.
create index if not exists scrutin_game_stints_done_ix
  on public.scrutin_game_stints (room_id, player_id)
  where completed_at is not null;

-- ═════════════════════════════════════ 4. LES SIGNATURES CROISÉES (TÉMOINS)
--
-- La ronde à deux réutilise `scrutin_game_meets` TELLE QUELLE : son index
-- `least/greatest` interdit déjà la même poignée de main dans les deux sens
-- (sinon : deux arêtes pour une rencontre, donc un alibi DOUBLE offert à une
-- paire complice). `place` reçoit la clé de la borne.
--
-- L'arête ne s'écrit QUE si les deux ont signé dans le même tic. Et
-- l'anti-clique est recopié tel quel de `rodeurs_meet` : entre traîtres RIEN ne
-- s'écrit, ET L'ÉCRAN AFFICHE LE MÊME SUCCÈS. Mesuré 0,5 % en v1, en prod, ça
-- ne fuit rien.
--
-- ⚠️ p = 1/3, ET PAS POUR LA RAISON QU'ON CROYAIT. Sur les chiffres honnêtes,
-- une ronde sur trois fait BAISSER le village (2,4 ± 0,8 pt) — mais elle tient
-- mieux la BANDE 40-60 % (10 cellules sur 12 contre 6 pour p = 0, qui sort par
-- le HAUT). Le mécanisme de la perte est la SYNCHRONISATION : se donner
-- rendez-vous met les corps au même endroit au même moment, et l'attente
-- n'écrit rien — les suspects par hantise passent de 7,4 à 10,0 sur 11. Un jeu
-- où tout le monde est toujours possible partout n'a plus rien à déduire.
-- Au-delà, p ≥ 1/2 est disqualifiant (38 % / 30 % / 17 %).

-- ═══════════════════════════════════════════════════════ 5. LES HANTISES
--
-- ⚠️ LA CHARGE S'AMORCE SEULE, À UN INSTANT TIRÉ PAR LE SERVEUR. C'est LA
-- mesure qui a décidé du jeu : laisser le Fantôme choisir son instant donne
-- 19,5 % de victoires du village (il attend d'être couvert) ; une charge
-- instable de 45 s donne 54,8 %. Il n'a pas le temps de fabriquer un alibi.
--
-- ⚠️ L'INSTANT EST TIRÉ À LA CRÉATION DE LA MANCHE, PAS PAR UN CRON. Ce dépôt
-- n'a pas d'ordonnanceur pour les jeux, et un `pg_cron` par salle serait
-- absurde : `armed_at` est écrit une fois, et le client le découvre en sondant.
-- Une seule charge par tranche de manche — deux charges tirées indépendamment
-- se chevauchaient, et la seconde était perdue sans que le Fantôme y soit pour
-- rien (8 % de parties gagnées par étouffement, un artefact).
create table if not exists public.scrutin_game_hauntings (
  id        uuid primary key default gen_random_uuid(),
  room_id   uuid not null references public.scrutin_game_rooms (id) on delete cascade,
  round_no  int not null,
  -- `charge` : la hantise du Fantôme. `panne` : une borne a cessé de battre —
  -- elle produit le MÊME événement, pour que débrancher un appareil ne soit pas
  -- une non-action gratuite.
  kind      text not null default 'charge',
  seq       int not null,
  armed_at  timestamptz not null,
  -- La borne touchée, et l'instant réel de la saisie. Null = charge perdue :
  -- elle avance la jauge du testament (le village y gagne).
  borne_id  uuid references public.scrutin_game_bornes (id) on delete set null,
  done_at   timestamptz,
  -- ⚠️ LE GLAS EST DIFFÉRÉ DE 1 À 3 MIN, et ce n'est pas décoratif : un
  -- vacillement immédiat horodate publiquement le sabotage, et à 11 personnes
  -- dans 6 pièces celui qui sort de la pièce qui vient de vaciller est démasqué
  -- dès la manche 1. Le théâtre survit, le flagrant délit meurt.
  toll_at   timestamptz,
  constraint scrutin_game_hauntings_kind_chk check (kind in ('charge', 'panne'))
);

-- ⚠️ PAS DE `max(seq)+1` CALCULÉ DANS UNE RPC : avec onze téléphones qui
-- sondent en même temps, ça produit des violations d'unicité et des événements
-- SILENCIEUSEMENT perdus (leçon d'Unanimo). `seq` est posé à la création de la
-- manche, en une seule écriture.
create unique index if not exists scrutin_game_hauntings_uk
  on public.scrutin_game_hauntings (room_id, round_no, seq);
create index if not exists scrutin_game_hauntings_armed_ix
  on public.scrutin_game_hauntings (room_id, armed_at);

-- ══════════════════════════════════════════ 6. LES MISSIONS-PHOTO (TROPHÉES)
--
-- ⚠️ AUCUNE IMAGE N'ENTRE ICI, NI NULLE PART AILLEURS. La photo est prise par
-- `getUserMedia` + `canvas` — l'application appareil photo du téléphone n'est
-- JAMAIS lancée, donc aucun fichier n'est créé, aucune copie ne peut atterrir
-- dans la galerie, et il n'y a jamais eu d'EXIF (la source est une image
-- vidéo). Vérifié sur sources : avec `<input capture>`, Android est
-- indémontrable — Chromium garde un JPEG en clair jusqu'à une heure dans son
-- stockage privé, et l'app photo du constructeur peut écrire sa propre copie.
-- L'image vit dans le navigateur du joueur et y est effacée DÈS QUE SA VIGNETTE
-- D'ALBUM S'EST ÉTEINTE (une purge au démarrage ne s'exécuterait jamais : on
-- joue une fois, en vacances, et l'app n'est plus rouverte).
--
-- ⚠️ CE QUE CETTE TABLE APPREND AU SERVEUR, ET QU'IL FAUT ÉCRIRE DANS LA
-- POLITIQUE DE CONFIDENTIALITÉ AU LIEU DE LE NIER : qui a rempli quelle mission
-- et quand — à côté de `band`, la tranche d'âge déclarée et publique par
-- conception. Donc « un enfant de 8-12 ans a rempli la mission photo n° 9 à
-- 21 h 47 », conservé 7 jours comme le reste de la salle. Ce n'est pas une
-- image, mais ce n'est pas rien.
--
-- La photo est un TROPHÉE : elle rapporte des points, exige un corps, et ne
-- produit AUCUNE ligne d'enquête, aucun lieu, aucun témoin. Le contreseing
-- photo a été écarté — il n'ancre aucun lieu, donc il est strictement plus
-- faible que la borne, et il promeut l'enfant de 8 ans d'aide involontaire à
-- FAUX TÉMOIN NOMMÉ.
create table if not exists public.scrutin_game_photos (
  id        uuid primary key default gen_random_uuid(),
  room_id   uuid not null references public.scrutin_game_rooms (id) on delete cascade,
  round_no  int not null,
  player_id uuid not null references public.scrutin_game_players (id) on delete cascade,
  -- La carte tirée (`portrait_ancetre`, `six_pieds`…). Le libellé vit dans le
  -- PAQUET, hors i18n — comme les fiches méthodes, déjà en prod.
  card      text not null,
  taken_at  timestamptz,
  constraint scrutin_game_photos_card_chk check (card ~ '^[a-z][a-z0-9_-]{1,32}$')
);

create unique index if not exists scrutin_game_photos_uk
  on public.scrutin_game_photos (room_id, round_no, player_id);
create index if not exists scrutin_game_photos_card_ix
  on public.scrutin_game_photos (room_id, card);

-- ═══════════════════════════════════════════════════════════ 7. LA SERRURE
--
-- Comme tout le socle des jeux : RLS active, AUCUNE policy — le navigateur n'a
-- donc aucun chemin de lecture directe, tout passe par les RPC `security
-- definer`. Le `revoke` est une seconde serrure, au cas où un `grant … on all
-- tables` passerait un jour par là.
alter table public.scrutin_game_bornes    enable row level security;
alter table public.scrutin_game_stints    enable row level security;
alter table public.scrutin_game_hauntings enable row level security;
alter table public.scrutin_game_photos    enable row level security;
revoke all on table public.scrutin_game_bornes    from anon, authenticated;
revoke all on table public.scrutin_game_stints    from anon, authenticated;
revoke all on table public.scrutin_game_hauntings from anon, authenticated;
revoke all on table public.scrutin_game_photos    from anon, authenticated;
