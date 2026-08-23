-- UNE JOURNÉE DE BANALO SUIT LE COMPTE, PLUS SEULEMENT LE NAVIGATEUR.
--
-- Signalé par un joueur : « je me suis connecté sur un autre appareil avec le
-- même compte, je n'ai pas retrouvé ce que j'avais joué aux jeux du jour ».
-- Vérifié : son compte portait bien tout (Banalo 1-4, Cinq sur cinq 1-6), mais
-- `scrutin_banalo_etat` et `scrutin_banalo_mots_etat` ne regardent JAMAIS
-- `auth.uid()` — elles ne connaissent que le jeton, qui est propre au
-- navigateur. Sur le second appareil, le jeu annonçait donc « vous n'avez pas
-- encore joué ».
--
-- ⚠️ ET CE N'EST PAS QU'UN DÉFAUT D'AFFICHAGE : LE JEU LAISSAIT RÉPONDRE UNE
-- SECONDE FOIS. Les deux réponses comptaient alors dans la foule — la médiane
-- du format chiffré et les parts des mots sont calculées sur les lignes, pas
-- sur les comptes. Un joueur à deux appareils pesait double. La journée 4 porte
-- d'ailleurs trois jetons pour des dépôts à 11 h 55, 14 h 19 et 14 h 33.
--
-- LA RÉPARATION tient en une idée : **le jeton se RÉSOUT avant tout le reste**.
-- Les réponses gagnent une colonne `user_id`, et une fonction rend « le jeton
-- sous lequel CE joueur a joué cette journée » — celui du navigateur s'il a
-- déjà répondu, sinon celui que son compte a utilisé ailleurs.
--
-- ⚠️ LES DEUX GROSSES FONCTIONS D'ÉTAT NE SONT PAS TOUCHÉES, et c'est délibéré :
-- 133 et 195 lignes de calcul de médiane, de rangs, de bandes et de scellement.
-- Les réécrire pour y insérer une ligne, c'est prendre le risque d'une dérive
-- silencieuse sur du code qu'aucun test ne couvre. Elles reçoivent le jeton
-- résolu depuis l'extérieur, et ne savent même pas que quelque chose a changé.

-- ═══════════════════════════════════════════ 1. les réponses portent le compte
alter table public.scrutin_banalo_reponses
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.scrutin_banalo_mots
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- ⚠️ LA GARDE EST UN INDEX, PAS UNE CONDITION D'ÉCRAN. Résoudre le jeton côté
-- client suffit à réparer l'affichage, pas à protéger la foule : un client
-- modifié garderait son propre jeton et répondrait deux fois. C'est la base qui
-- doit refuser.
create unique index if not exists banalo_reponse_par_compte
  on public.scrutin_banalo_reponses (user_id, jour, langue) where user_id is not null;

-- ⚠️ LE FORMAT « MOTS » A UNE LIGNE PAR MOT, donc la clé porte le RANG. Sans
-- lui, l'index n'autoriserait qu'un seul mot par journée et le dépôt casserait
-- au deuxième — le genre de contrainte qui paraît juste et qui interdit le jeu.
create unique index if not exists banalo_mots_par_compte
  on public.scrutin_banalo_mots (user_id, jour, langue, rang) where user_id is not null;

create index if not exists banalo_reponses_compte on public.scrutin_banalo_reponses (user_id);
create index if not exists banalo_mots_compte     on public.scrutin_banalo_mots (user_id);

-- ═════════════════════════════════════════════ 2. « quel est MON jeton ce jour »
--
-- ⚠️ LE NAVIGATEUR L'EMPORTE QUAND IL A DÉJÀ RÉPONDU. Sans cette priorité, un
-- joueur qui a joué anonymement ici puis s'est connecté verrait sa réponse
-- locale remplacée par celle d'un autre appareil — on lui prendrait la partie
-- qu'il vient de faire.
create or replace function public.scrutin_banalo_mon_jeton(
  p_jeton text, p_jour int, p_langue text
) returns text language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_uid   uuid := auth.uid();
  v_autre text;
begin
  if coalesce(p_jeton, '') !~ '^[a-z0-9]{10,40}$' then return p_jeton; end if;

  if exists (select 1 from scrutin_banalo_reponses
              where jeton = p_jeton and jour = p_jour and langue = p_langue)
     or exists (select 1 from scrutin_banalo_mots
                 where jeton = p_jeton and jour = p_jour and langue = p_langue)
  then
    return p_jeton;
  end if;

  if v_uid is null then return p_jeton; end if;

  select r.jeton into v_autre from scrutin_banalo_reponses r
   where r.user_id = v_uid and r.jour = p_jour and r.langue = p_langue limit 1;
  if v_autre is not null then return v_autre; end if;

  select m.jeton into v_autre from scrutin_banalo_mots m
   where m.user_id = v_uid and m.jour = p_jour and m.langue = p_langue limit 1;
  return coalesce(v_autre, p_jeton);
end $function$;

-- ═══════════════════════════════ 3. adopter les réponses déjà faites sur ce jeton
--
-- ⚠️ ON NE DEVINE RIEN. Les lignes déjà en base n'ont pas de compte, et rien ne
-- permet de retrouver à qui elles appartiennent : `rattacher` lisait le jeton
-- pour écrire un résumé, sans jamais marquer les lignes. On les marque donc au
-- moment où le joueur revient avec SON jeton — c'est exact, pas déduit.
--
-- ⚠️ ET ON N'ÉCRASE JAMAIS UN COMPTE DÉJÀ POSÉ (`user_id is null`) : deux
-- comptes sur le même navigateur ne doivent pas se voler leurs journées.
create or replace function public.scrutin_banalo_adopter(p_jeton text)
returns jsonb language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_a int; v_b int;
begin
  if v_uid is null then return jsonb_build_object('status', 'refus'); end if;
  if coalesce(p_jeton, '') !~ '^[a-z0-9]{10,40}$' then
    return jsonb_build_object('status', 'invalid');
  end if;

  -- ⚠️ UNE JOURNÉE DÉJÀ JOUÉE PAR CE COMPTE AILLEURS N'EST PAS ADOPTÉE : l'index
  -- unique la refuserait et emporterait toute l'adoption. On saute la ligne en
  -- conflit plutôt que de perdre les autres.
  update scrutin_banalo_reponses r set user_id = v_uid
   where r.jeton = p_jeton and r.user_id is null
     and not exists (select 1 from scrutin_banalo_reponses x
                      where x.user_id = v_uid and x.jour = r.jour and x.langue = r.langue);
  get diagnostics v_a = row_count;

  update scrutin_banalo_mots m set user_id = v_uid
   where m.jeton = p_jeton and m.user_id is null
     and not exists (select 1 from scrutin_banalo_mots x
                      where x.user_id = v_uid and x.jour = m.jour
                        and x.langue = m.langue and x.rang = m.rang);
  get diagnostics v_b = row_count;

  return jsonb_build_object('status', 'ok', 'reponses', v_a, 'mots', v_b);
end $function$;

-- ═════════════════════════════════════════ 4. répondre : résoudre, puis marquer
create or replace function public.scrutin_banalo_repondre(
  p_jeton text, p_jour int, p_langue text, p_reponse double precision
) returns jsonb language plpgsql volatile security definer set search_path to 'public' as $function$
declare v_jeton text;
begin
  if coalesce(p_jeton, '') !~ '^[a-z0-9]{10,40}$' then
    return jsonb_build_object('status', 'invalid');
  end if;
  if p_langue is null or p_langue not in ('fr', 'en', 'es', 'pcm') then
    return jsonb_build_object('status', 'invalid');
  end if;
  if p_jour is null or p_jour < 1 or p_jour > 100000 then
    return jsonb_build_object('status', 'invalid');
  end if;
  if p_reponse is null or not (p_reponse > 0) or p_reponse >= 1e18 then
    return jsonb_build_object('status', 'invalid');
  end if;

  -- ⚠️ SI CE COMPTE A DÉJÀ RÉPONDU AILLEURS, `v_jeton` EST CELUI DE L'AUTRE
  -- APPAREIL : le `on conflict do nothing` ne fait alors rien et l'on rend
  -- l'état de la vraie réponse. C'est ce qui referme le double vote — et c'est
  -- aussi ce qui rend la médiane sûre, exactement comme le `do nothing`
  -- d'origine le faisait pour un second envoi du même navigateur.
  v_jeton := public.scrutin_banalo_mon_jeton(p_jeton, p_jour, p_langue);

  insert into scrutin_banalo_reponses (jeton, jour, langue, reponse, user_id)
  values (v_jeton, p_jour, p_langue, p_reponse, auth.uid())
  on conflict (jeton, jour, langue) do nothing;

  return scrutin_banalo_etat(v_jeton, p_jour, p_langue);
end $function$;

-- ⚠️ `p_secondes` GARDE SON DÉFAUT. Le retirer ne « remplace » pas la fonction :
-- Postgres refuse (« cannot remove parameter defaults from existing function »),
-- et le contourner par un `drop` créerait une fonction NUE dont les droits ne
-- sont pas hérités — plus personne ne pourrait déposer ses mots.
create or replace function public.scrutin_banalo_mots_repondre(
  p_jeton text, p_jour int, p_langue text, p_theme text, p_mots text[],
  p_secondes int default null
) returns jsonb language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_theme_mots text[];
  v_normes     text[] := '{}';
  v_libelles   text[] := '{}';
  v_brut  text;
  v_norme text;
  v_jeton text;
  i int;
begin
  if coalesce(p_jeton, '') !~ '^[a-z0-9]{10,40}$' then return jsonb_build_object('status', 'invalid'); end if;
  if p_langue is null or p_langue not in ('fr', 'en', 'es', 'pcm') then return jsonb_build_object('status', 'invalid'); end if;
  if p_jour is null or p_jour < 1 or p_jour > 100000 then return jsonb_build_object('status', 'invalid'); end if;
  if coalesce(trim(p_theme), '') = '' or length(p_theme) > 60 then return jsonb_build_object('status', 'invalid'); end if;
  if p_mots is null or array_length(p_mots, 1) is null or array_length(p_mots, 1) > 8 then
    return jsonb_build_object('status', 'invalid');
  end if;

  -- Le jeton d'abord : la garde « ai-je déjà déposé » porte alors sur le
  -- JOUEUR, plus sur le navigateur.
  v_jeton := public.scrutin_banalo_mon_jeton(p_jeton, p_jour, p_langue);

  if exists (select 1 from scrutin_banalo_mots
              where jeton = v_jeton and jour = p_jour and langue = p_langue) then
    return scrutin_banalo_mots_etat(v_jeton, p_jour, p_langue, p_theme);
  end if;

  v_theme_mots := string_to_array(scrutin_game_norm(p_theme), ' ');

  foreach v_brut in array p_mots loop
    v_norme := scrutin_game_norm(coalesce(v_brut, ''));
    continue when v_norme = '' or v_norme = any(v_theme_mots) or v_norme = any(v_normes);
    v_normes   := v_normes   || v_norme;
    v_libelles := v_libelles || left(trim(coalesce(v_brut, '')), 40);
    exit when array_length(v_normes, 1) >= 8;
  end loop;

  for i in 1..coalesce(array_length(v_normes, 1), 0) loop
    insert into scrutin_banalo_mots (jeton, jour, langue, theme, rang, mot, norme, secondes, user_id)
    values (v_jeton, p_jour, p_langue, p_theme, i, v_libelles[i], v_normes[i],
            case when p_secondes between 0 and 86400 then p_secondes end, auth.uid())
    on conflict do nothing;
  end loop;

  return scrutin_banalo_mots_etat(v_jeton, p_jour, p_langue, p_theme);
end $function$;

-- ══════════════════════════════════════════════ 5. la série suit le compte aussi
--
-- ⚠️ SANS ÇA, LA SÉRIE REPART À ZÉRO SUR UN SECOND APPAREIL. La carte de compte
-- s'en tirait par un `max` entre la série du jeton et celle du compte, mais
-- l'écran de jeu, lui, n'a que celle-ci.
create or replace function public.scrutin_banalo_serie(p_jeton text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare v_uid uuid := auth.uid(); v_out jsonb;
begin
  if coalesce(p_jeton, '') !~ '^[a-z0-9]{10,40}$' and v_uid is null then
    return jsonb_build_object('jours', 0, 'fin', null);
  end if;

  with mes as (
    select distinct jour from scrutin_banalo_reponses
     where jeton = p_jeton or (v_uid is not null and user_id = v_uid)
    union
    select distinct jour from scrutin_banalo_mots
     where jeton = p_jeton or (v_uid is not null and user_id = v_uid)
  ),
  suites as (
    select jour, jour - row_number() over (order by jour) as groupe from mes
  ),
  derniere as (
    select max(jour) as fin, count(*) as longueur
      from suites group by groupe order by fin desc limit 1
  )
  select jsonb_build_object(
    'jours', coalesce((select longueur from derniere), 0),
    'fin',   (select fin from derniere)
  ) into v_out;
  return v_out;
end $function$;

-- ═══════════════════════════════════════════════════════════════════ les droits
--
-- ⚠️ `revoke` AVANT `grant` : Postgres donne à PUBLIC un droit d'exécution par
-- défaut sur toute fonction créée. Les fonctions déjà existantes gardent le
-- leur ; les deux nouvelles naissent nues.
revoke all on function public.scrutin_banalo_mon_jeton(text, int, text) from public;
grant execute on function public.scrutin_banalo_mon_jeton(text, int, text) to anon, authenticated;

-- ⚠️ `adopter` ÉCRIT un compte sur des lignes : elle exige `auth.uid()`, donc
-- `anon` n'en tirerait qu'un refus — mais on le lui retire quand même, et il
-- faut le NOMMER. `revoke ... from public` ne suffit pas : Supabase pose des
-- privilèges PAR DÉFAUT qui accordent l'exécution à `anon` sur toute fonction
-- créée dans le schéma public. Vu à l'application : `anon=X` restait après le
-- `revoke from public`.
revoke all on function public.scrutin_banalo_adopter(text) from public, anon;
grant execute on function public.scrutin_banalo_adopter(text) to authenticated;
