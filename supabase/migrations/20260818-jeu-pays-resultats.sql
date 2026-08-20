-- ═══════════════════════════════════════════════════════════════════════════
-- CINQ SUR CINQ — garder ses résultats quand on a un compte.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Le jeu se joue SANS COMPTE, et cela ne change pas : la partie vit dans le
-- navigateur, l'API ne demande rien, et un joueur qui ne se connecte jamais ne
-- perd aucune fonctionnalité de jeu. Ce qu'un compte ajoute, c'est ce qu'un
-- navigateur ne sait pas faire : retrouver sa série sur un autre appareil, et
-- savoir où l'on se situe.
--
-- CE QU'ON STOCKE, ET RIEN D'AUTRE : le numéro de journée, le nombre d'essais,
-- la durée. Pas la liste des pays essayés — elle raconterait le raisonnement
-- d'une personne identifiée, pour un gain nul côté produit.
--
-- ⚠️ LE CLASSEMENT EST ANONYME, PAR CONSTRUCTION. `rang` rend une POSITION et un
-- effectif, jamais une liste de noms : il n'existe aucun chemin, dans cette
-- migration, qui sorte l'identité d'un autre joueur. Un tableau nominatif
-- demanderait un pseudo public et un consentement — c'est une décision produit,
-- pas un détail d'implémentation, et elle n'est pas prise ici.
--
-- Rejouable à blanc : tout est `if not exists` / `create or replace`, et les
-- `revoke` ne visent que des objets créés juste au-dessus.

-- ════════════════════════════════════════════════════════════ 1. LA TABLE
--
-- Une ligne par joueur et par journée. La clé primaire porte la règle : on ne
-- garde qu'un résultat par journée, et rejouer n'empile pas.
create table if not exists public.scrutin_game_pays_results (
  user_id  uuid not null references auth.users (id) on delete cascade,
  -- Numéro de journée depuis l'origine du jeu (voir `moteur.ts`), pas une date :
  -- c'est le même entier que celui qui choisit le puzzle, donc rien à réaccorder.
  jour     int  not null check (jour >= 1),
  essais   int  not null check (essais between 1 and 500),
  secondes int  check (secondes is null or secondes between 0 and 86400),
  cree_le  timestamptz not null default now(),
  primary key (user_id, jour)
);

-- Le classement du jour lit tous les résultats d'UNE journée : c'est le seul
-- accès qui ne passe pas par la clé primaire.
create index if not exists scrutin_game_pays_results_jour_idx
  on public.scrutin_game_pays_results (jour);

-- ⚠️ RLS ACTIVE ET AUCUNE POLICY — même choix que les quatre tables de salle.
-- Il n'existe donc AUCUN chemin de lecture ou d'écriture directe, pour personne :
-- ni `anon`, ni un compte connecté. Tout passe par les trois fonctions
-- ci-dessous. On ne peut pas oublier de fermer une porte qui n'existe pas.
alter table public.scrutin_game_pays_results enable row level security;
revoke all on table public.scrutin_game_pays_results from anon, authenticated;

-- ═════════════════════════════════════════════════════ 2. ENREGISTRER
--
-- Prend un LOT de résultats, parce que c'est la forme du besoin réel : quelqu'un
-- joue trois jours sans compte, puis se connecte. Le navigateur envoie alors ce
-- qu'il a gardé, et cette fonction le range.
--
-- Idempotente, et « le meilleur gagne » : renvoyer deux fois la même journée ne
-- crée rien, et un résultat plus mauvais n'écrase pas un meilleur. C'est ce qui
-- rend l'appel rejouable à chaque connexion sans y réfléchir.
create or replace function public.scrutin_game_pays_save(p_lot jsonb)
returns int language plpgsql security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_n   int  := 0;
begin
  -- ⚠️ PAS DE `return 0` ICI. Un refus doit se voir : rendre « 0 enregistré » à
  -- un appel non authentifié serait indiscernable d'un lot vide, et l'écran
  -- afficherait « c'est gardé » sans que rien ne le soit.
  if v_uid is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if jsonb_typeof(p_lot) <> 'array' then
    raise exception 'invalid' using errcode = '22023';
  end if;

  insert into public.scrutin_game_pays_results (user_id, jour, essais, secondes)
  select v_uid,
         (e ->> 'jour')::int,
         (e ->> 'essais')::int,
         nullif(e ->> 'secondes', '')::int
    from jsonb_array_elements(p_lot) as e
   where (e ->> 'jour') ~ '^[0-9]+$'
     and (e ->> 'essais') ~ '^[0-9]+$'
     and (e ->> 'jour')::int >= 1
     and (e ->> 'essais')::int between 1 and 500
  on conflict (user_id, jour) do update
     set essais   = least(public.scrutin_game_pays_results.essais, excluded.essais),
         secondes = case
                      when excluded.essais < public.scrutin_game_pays_results.essais
                      then excluded.secondes
                      else public.scrutin_game_pays_results.secondes
                    end;

  get diagnostics v_n = row_count;
  return v_n;
end $function$;

-- ═══════════════════════════════════════════════════════════ 3. MON BILAN
--
-- Ce que le joueur voit de lui-même : combien de journées trouvées, sa série en
-- cours, sa moyenne d'essais, son meilleur score.
--
-- LA SÉRIE SE COMPTE DEPUIS LA DERNIÈRE JOURNÉE JOUÉE, pas depuis aujourd'hui.
-- La fonction ne connaît pas le fuseau du joueur ni la date « du jour » côté
-- produit : c'est l'écran qui sait si la série est encore vivante (dernière
-- journée = aujourd'hui ou hier) ou déjà rompue. Faire deviner la date à la base
-- serait la faire mentir une heure par jour, deux fois par an.
create or replace function public.scrutin_game_pays_me()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_out jsonb;
begin
  if v_uid is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with mes as (
    select jour, essais
      from public.scrutin_game_pays_results
     where user_id = v_uid
  ),
  -- Les journées consécutives forment un groupe quand `jour - rang` est
  -- constant : l'astuce classique, et la seule qui tienne en une requête.
  suites as (
    select jour, jour - row_number() over (order by jour) as groupe
      from mes
  ),
  derniere as (
    select groupe, max(jour) as fin, count(*) as longueur
      from suites
     group by groupe
     order by fin desc
     limit 1
  )
  select jsonb_build_object(
    'parties',  (select count(*) from mes),
    'moyenne',  (select round(avg(essais), 1) from mes),
    'meilleur', (select min(essais) from mes),
    'serie',    coalesce((select longueur from derniere), 0),
    'serieFin', (select fin from derniere)
  ) into v_out;

  return v_out;
end $function$;

-- ══════════════════════════════════════════════════════ 4. MON RANG DU JOUR
--
-- Une position et un effectif. Rien qui nomme quiconque.
--
-- Le rang est « olympique » : à égalité d'essais, tout le monde a le même rang.
-- Sinon deux joueurs à 7 essais seraient 4e et 5e selon l'ordre d'arrivée, ce
-- qui récompenserait le fuseau horaire plutôt que le jeu.
create or replace function public.scrutin_game_pays_rank(p_jour int)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_uid    uuid := auth.uid();
  v_essais int;
  v_out    jsonb;
begin
  if v_uid is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select essais into v_essais
    from public.scrutin_game_pays_results
   where user_id = v_uid and jour = p_jour;

  -- Pas de résultat pour cette journée : ce n'est pas une erreur, c'est « pas
  -- encore joué ». L'écran n'affiche alors simplement pas de rang.
  if v_essais is null then
    return jsonb_build_object('joueurs', 0, 'rang', null, 'essais', null);
  end if;

  select jsonb_build_object(
           'joueurs', count(*),
           'rang',    count(*) filter (where essais < v_essais) + 1,
           'essais',  v_essais,
           'median',  percentile_disc(0.5) within group (order by essais)
         )
    into v_out
    from public.scrutin_game_pays_results
   where jour = p_jour;

  return v_out;
end $function$;

-- ═════════════════════════════════════════════════════════════ 5. LES DROITS
--
-- ⚠️ LE `grant` NE SUFFIT PAS : PUBLIC détient l'EXECUTE par défaut sur toute
-- fonction créée. Le `revoke` vient donc AVANT, et dans cet ordre. Piège déjà
-- payé deux fois dans ce dépôt.
revoke all on function public.scrutin_game_pays_save(jsonb)  from public, anon, authenticated;
revoke all on function public.scrutin_game_pays_me()         from public, anon, authenticated;
revoke all on function public.scrutin_game_pays_rank(int)    from public, anon, authenticated;

-- `anon` n'a rien à faire ici : les trois fonctions exigent un `auth.uid()`, et
-- un anonyme n'en a pas. Lui laisser l'exécution ne lui donnerait qu'une
-- exception — autant qu'il ne puisse pas appeler du tout.
grant execute on function public.scrutin_game_pays_save(jsonb) to authenticated;
grant execute on function public.scrutin_game_pays_me()        to authenticated;
grant execute on function public.scrutin_game_pays_rank(int)   to authenticated;
