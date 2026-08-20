-- BANALO DU JOUR — garder ses résultats quand on a un compte.
--
-- Le jeu se joue SANS COMPTE, et cela ne change pas : on répond, on est noté, on
-- voit son rang, sans rien créer. Ce qu'un compte ajoute est ce qu'un navigateur
-- ne sait pas faire — retrouver sa série sur un autre appareil, et garder une
-- trace au-delà des trente jours de conservation des réponses.
--
-- ⚠️ LE COMPTE EST CELUI DE PLACET, et c'est l'intention. Quelqu'un qui vient
-- pour deux minutes de jeu repart avec un compte qui sert aussi à organiser de
-- vrais votes. Le bloc d'écran le dit en toutes lettres, comme celui de Cinq sur
-- cinq. Rien n'est demandé pour jouer.
--
-- ═════════════════════════════════════════ ce qui change par rapport à Cinq sur cinq
--
-- 1. ⚠️ LE CLIENT N'ENVOIE AUCUN SCORE. `scrutin_game_pays_save` prend un LOT de
--    résultats calculés dans le navigateur, parce que là-bas la partie vit dans
--    le navigateur et nulle part ailleurs. Ici, les réponses sont DÉJÀ en base,
--    rangées sous un jeton anonyme : le rattachement n'a donc qu'à dire « ce
--    jeton, c'est moi », et le serveur recalcule tout avec les mêmes fonctions
--    que l'écran. Personne ne peut s'inventer un score.
--
-- 2. ⚠️ UN SCORE PEUT MONTER OU DESCENDRE, ET L'`update` EST DONC INCONDITIONNEL.
--    Cinq sur cinq garde le MEILLEUR essai (« un résultat plus mauvais n'écrase
--    pas un meilleur ») parce qu'on peut rejouer une journée. Ici on ne dépose
--    qu'une fois : ce qui bouge n'est pas la réponse mais la FOULE, donc la
--    dernière valeur calculée est la vraie. Garder le maximum figerait le score
--    d'une journée à l'instant où le joueur s'est connecté.
--
-- 3. ⚠️ TRENTE JOURS EN AMONT, ET C'EST ASSUMÉ. Les réponses brutes s'effacent ;
--    quelqu'un qui se connecte après quarante jours ne récupère que les trente
--    derniers. Le résumé, lui, ne se purge pas — c'est ce qui permet une série
--    plus longue que la conservation des réponses. La politique de
--    confidentialité dit désormais les deux.

-- ══════════════════════════════════════════════════════════════ 1. la table
create table if not exists public.scrutin_banalo_results (
  user_id uuid not null references auth.users (id) on delete cascade,
  jour    int  not null check (jour >= 1),
  langue  text not null check (langue in ('fr', 'en', 'es', 'pcm')),
  format  text not null check (format in ('nombre', 'mots')),
  -- Le score affiché, au dixième — la même valeur que l'écran, pas une autre.
  points  numeric(4,1) not null check (points between 0 and 100),
  cree_le timestamptz not null default now(),
  primary key (user_id, jour)
);

-- ⚠️ RLS ACTIVE ET AUCUNE POLICY, comme les autres tables de jeu : il n'existe
-- aucun chemin de lecture ou d'écriture directe, pour personne. Tout passe par
-- les fonctions ci-dessous. On ne peut pas oublier de fermer une porte qui
-- n'existe pas.
alter table public.scrutin_banalo_results enable row level security;
revoke all on table public.scrutin_banalo_results from anon, authenticated;

-- ═══════════════════════════════════════════════════════════ 2. la série
--
-- ⚠️ ELLE MARCHE SANS COMPTE, ET C'EST VOLONTAIRE. La leçon est écrite dans
-- `pays/local.ts` : « un jeu quotidien doit donner la sensation de revenir DÈS
-- le deuxième jour, et quelqu'un qui n'a rien à garder n'a aucune raison de
-- créer un compte ». La série vit donc d'abord sous le jeton anonyme ; le compte
-- ne fait que la rendre durable et portable.
--
-- ⚠️ ELLE SE COMPTE DEPUIS LA DERNIÈRE JOURNÉE JOUÉE, jamais depuis « aujourd'hui ».
-- La base ne connaît ni le fuseau du joueur ni la charnière de 11 h 30 : c'est
-- l'écran qui sait si la série est vivante (dernière journée = aujourd'hui ou
-- hier) ou déjà rompue. Faire deviner la date à la base serait la faire mentir
-- une heure par jour, deux fois par an.
create or replace function public.scrutin_banalo_serie(p_jeton text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare v_out jsonb;
begin
  if coalesce(p_jeton, '') !~ '^[a-z0-9]{10,40}$' then
    return jsonb_build_object('jours', 0, 'fin', null);
  end if;

  with mes as (
    -- Les DEUX formats comptent pour la même série : c'est une habitude
    -- quotidienne, pas deux collections séparées.
    select distinct jour from scrutin_banalo_reponses where jeton = p_jeton
    union
    select distinct jour from scrutin_banalo_mots     where jeton = p_jeton
  ),
  -- Les journées consécutives forment un groupe quand `jour - rang` est
  -- constant : l'astuce classique, et la seule qui tienne en une requête.
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

-- ═════════════════════════════════════════════════════════ 3. le rattachement
--
-- Appelée à CHAQUE connexion, avec le jeton du navigateur. Idempotente : la
-- répéter ne coûte qu'un aller-retour, et c'est ce qui permet de ne pas avoir à
-- retenir « ai-je déjà rattaché cet appareil ? ».
--
-- ⚠️ ELLE RECALCULE, ELLE NE RECOPIE PAS. Les scores viennent de
-- `scrutin_banalo_etat` et `scrutin_banalo_mots_etat` — les mêmes fonctions que
-- l'écran. Une journée dont la foule est encore trop mince n'a pas de score :
-- on ne la range pas, et le prochain appel la prendra.
create or replace function public.scrutin_banalo_rattacher(p_jeton text)
returns int language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_n   int  := 0;
  v_ligne record;
  v_etat jsonb;
begin
  -- ⚠️ PAS DE `return 0` ICI. Un refus doit se voir : rendre « 0 rattaché » à un
  -- appel non authentifié serait indiscernable d'un navigateur vierge, et
  -- l'écran afficherait « c'est gardé » sans que rien ne le soit.
  if v_uid is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if coalesce(p_jeton, '') !~ '^[a-z0-9]{10,40}$' then
    raise exception 'invalid' using errcode = '22023';
  end if;

  for v_ligne in
    select distinct jour, langue from scrutin_banalo_reponses where jeton = p_jeton
  loop
    v_etat := scrutin_banalo_etat(p_jeton, v_ligne.jour, v_ligne.langue);
    continue when coalesce((v_etat->>'assez')::boolean, false) is not true;
    insert into scrutin_banalo_results (user_id, jour, langue, format, points)
    values (v_uid, v_ligne.jour, v_ligne.langue, 'nombre', (v_etat->>'points')::numeric)
    on conflict (user_id, jour) do update
       set points = excluded.points, langue = excluded.langue, format = excluded.format;
    v_n := v_n + 1;
  end loop;

  for v_ligne in
    select distinct jour, langue, theme from scrutin_banalo_mots where jeton = p_jeton
  loop
    v_etat := scrutin_banalo_mots_etat(p_jeton, v_ligne.jour, v_ligne.langue, v_ligne.theme);
    continue when coalesce((v_etat->>'assez')::boolean, false) is not true;
    insert into scrutin_banalo_results (user_id, jour, langue, format, points)
    values (v_uid, v_ligne.jour, v_ligne.langue, 'mots', (v_etat->>'points')::numeric)
    on conflict (user_id, jour) do update
       set points = excluded.points, langue = excluded.langue, format = excluded.format;
    v_n := v_n + 1;
  end loop;

  return v_n;
end $function$;

-- ══════════════════════════════════════════════════════════════ 4. mon bilan
--
-- ⚠️ « MEILLEUR » EST UN MAXIMUM ICI, un MINIMUM chez Cinq sur cinq. Là-bas on
-- compte des essais, et moins il y en a, mieux c'est ; ici on compte des points.
-- Deux jeux, deux sens — c'est exactement le genre de détail qu'un copier-coller
-- inverse en silence.
create or replace function public.scrutin_banalo_moi()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_out jsonb;
begin
  if v_uid is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with mes as (
    select jour, points from public.scrutin_banalo_results where user_id = v_uid
  ),
  suites as (
    select jour, jour - row_number() over (order by jour) as groupe from mes
  ),
  derniere as (
    select max(jour) as fin, count(*) as longueur
      from suites group by groupe order by fin desc limit 1
  )
  select jsonb_build_object(
    'parties',  (select count(*) from mes),
    'moyenne',  (select round(avg(points), 1) from mes),
    'meilleur', (select max(points) from mes),
    'serie',    coalesce((select longueur from derniere), 0),
    'serieFin', (select fin from derniere)
  ) into v_out;
  return v_out;
end $function$;

-- ══════════════════════════════════════════════════════════════ 5. les droits
--
-- ⚠️ LE `revoke` VIENT AVANT LE `grant` : PUBLIC détient l'EXECUTE par défaut.
revoke all on function public.scrutin_banalo_serie(text) from public, anon, authenticated;
revoke all on function public.scrutin_banalo_rattacher(text) from public, anon, authenticated;
revoke all on function public.scrutin_banalo_moi() from public, anon, authenticated;

-- La série marche SANS compte : `anon` doit pouvoir la lire.
grant execute on function public.scrutin_banalo_serie(text) to anon, authenticated;
-- Le reste demande une session, et les fonctions le vérifient elles-mêmes.
grant execute on function public.scrutin_banalo_rattacher(text) to authenticated;
grant execute on function public.scrutin_banalo_moi() to authenticated;
