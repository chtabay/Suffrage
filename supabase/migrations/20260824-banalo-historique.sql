-- L'HISTORIQUE PERSONNEL — et la réparation de ce qui l'empêchait d'exister.
--
-- ══ 1. LE DÉFAUT ═══════════════════════════════════════════════════════════
--
-- ⚠️ `scrutin_banalo_rattacher` SAUTAIT LES JOURNÉES OÙ `assez` EST FAUX, et
-- depuis le 22 août c'est un bug pur. La garde était juste quand `assez` voulait
-- dire « il existe une note » : sous cinq votants, la base ne calculait rien et
-- il n'y avait rien à ranger. `20260822-banalo-sans-plancher.sql` a retourné cet
-- arbitrage — le score sort dès la première réponse — et `assez` a changé de
-- métier : il ne commande plus ce qui est CALCULÉ, seulement ce qui est DIT
-- (la réserve sous le score). La garde, elle, est restée.
--
-- Conséquence : un joueur qui répondait à une journée jeune obtenait bien son
-- score à l'écran, mais cette journée n'entrait JAMAIS dans son compte — donc ni
-- dans sa moyenne, ni dans son historique, et surtout elle ouvrait un TROU dans
-- sa série de compte. Le commentaire de 2026-08-20 (« une journée dont la foule
-- est encore trop mince n'a pas de score ») décrivait un monde qui n'existe
-- plus. La garde devient donc : on range ce qui a une note, on saute ce qui n'en
-- a pas.
--
-- ══ 2. CE QU'ON GARDE EN PLUS : LE CENTILE ═════════════════════════════════
--
-- ⚠️ LE SCORE SUR 100 N'EST PAS COMPARABLE D'UN FORMAT À L'AUTRE, ET LE RÉSUMÉ
-- DE COMPTE LE PRÉSENTAIT COMME S'IL L'ÉTAIT. C'est la décision déjà écrite dans
-- `CLAUDE.md` : « le jour où le résumé de compte devra dire quelque chose de
-- juste, c'est le CENTILE qu'il faudra y mettre, pas l'un des deux scores ».
-- Mesuré sur deux journées de mots opposées, à 3 000 joueurs : le maximum
-- ATTEIGNABLE du sur-100 vaut 67,8 sur un thème serré et 13,7 sur un thème
-- ouvert. « Moyenne : 35 » mélangeait donc des journées où 35 était hors
-- d'atteinte par le haut et d'autres où c'était un résultat médiocre.
--
-- Le centile, lui, est un RANG : il veut dire la même chose tous les jours et
-- dans les deux formats. On stocke `mieux` — le pourcentage de joueurs qui ont
-- fait mieux, exactement ce que l'écran affiche — et il est donc MEILLEUR QUAND
-- IL EST PETIT. ⚠️ Le maximum de `points` devient le MINIMUM de `mieux` : c'est
-- le sens qui s'inverse, et c'est exactement le genre de détail qu'un
-- copier-coller retourne en silence (voir l'en-tête de `20260820-banalo-compte.sql`,
-- qui prévenait déjà pour Cinq sur cinq).
--
-- ⚠️ IL EST NULLABLE, ET IL DOIT L'ÊTRE. Une journée où l'on est seul votant n'a
-- pas de position (`v_min_position` vaut 2), et les lignes rangées avant cette
-- migration n'en ont pas non plus. Un `0` par défaut voudrait dire « personne
-- n'a fait mieux », c'est-à-dire premier de la journée : le repli le plus
-- flatteur possible sur une donnée absente.
--
-- Le sur-100 reste stocké : c'est la seule grandeur qui existait avant, on ne
-- réécrit pas l'histoire, et il redevient utile le jour où l'on voudra rendre
-- une journée chiffrée seule.
alter table public.scrutin_banalo_results
  add column if not exists mieux int check (mieux >= 0 and mieux <= 100);

-- ══════════════════════════════════════════ 3. le rattachement, réparé
--
-- ⚠️ ELLE RECALCULE, ELLE NE RECOPIE PAS : les scores viennent de
-- `scrutin_banalo_etat` et `scrutin_banalo_mots_etat`, les mêmes fonctions que
-- l'écran. Personne ne peut s'inventer un palmarès.
--
-- ⚠️ ET L'`update` RESTE INCONDITIONNEL. Ce qui bouge n'est pas la réponse mais
-- la FOULE : garder le maximum figerait le score d'une journée à l'instant où le
-- joueur s'est connecté.
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
    -- ⚠️ ON SAUTE CE QUI N'A PAS DE NOTE, PLUS CE QUI MANQUE DE MONDE. Voir
    -- l'en-tête : `assez` ne veut plus dire « il existe un score ».
    continue when v_etat->>'points' is null;
    insert into scrutin_banalo_results (user_id, jour, langue, format, points, mieux)
    values (v_uid, v_ligne.jour, v_ligne.langue, 'nombre',
            (v_etat->>'points')::numeric, (v_etat->>'partmieux')::int)
    on conflict (user_id, jour) do update
       set points = excluded.points, mieux = excluded.mieux,
           langue = excluded.langue, format = excluded.format;
    v_n := v_n + 1;
  end loop;

  for v_ligne in
    select distinct jour, langue, theme from scrutin_banalo_mots where jeton = p_jeton
  loop
    v_etat := scrutin_banalo_mots_etat(p_jeton, v_ligne.jour, v_ligne.langue, v_ligne.theme);
    continue when v_etat->>'points' is null;
    insert into scrutin_banalo_results (user_id, jour, langue, format, points, mieux)
    values (v_uid, v_ligne.jour, v_ligne.langue, 'mots',
            (v_etat->>'points')::numeric, (v_etat->>'partmieux')::int)
    on conflict (user_id, jour) do update
       set points = excluded.points, mieux = excluded.mieux,
           langue = excluded.langue, format = excluded.format;
    v_n := v_n + 1;
  end loop;

  return v_n;
end $function$;

-- ══════════════════════════════════════════════════ 4. le bilan, en centiles
--
-- ⚠️ LES CLÉS CHANGENT DE NOM, ET C'EST VOULU. `moyenne` et `meilleur`
-- portaient le sur-100 ; les garder en y mettant un centile aurait changé le
-- SENS d'un chiffre sans changer sa forme — l'écran aurait continué d'afficher
-- « meilleur : 3 » en croyant montrer un score, alors que 3 veut dire « 3 % ont
-- fait mieux », c'est-à-dire un excellent résultat. Renommer force l'écran à se
-- mettre à jour au lieu de mentir en silence.
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
    select jour, points, mieux from public.scrutin_banalo_results where user_id = v_uid
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
    -- ⚠️ LE MEILLEUR CENTILE EST LE PLUS PETIT. `mieux` compte les joueurs qui
    -- ont fait mieux : zéro veut dire premier de la journée.
    'centileMoyen',   (select round(avg(mieux)) from mes where mieux is not null),
    'centileMeilleur',(select min(mieux) from mes where mieux is not null),
    'serie',    coalesce((select longueur from derniere), 0),
    'serieFin', (select fin from derniere)
  ) into v_out;
  return v_out;
end $function$;

-- ══════════════════════════════════════════════════════ 5. l'historique
--
-- La liste des journées d'un compte, la plus récente d'abord.
--
-- ⚠️ ELLE NE REND NI MOT NI RÉPONSE, seulement le numéro de journée, son format,
-- sa langue et le centile. Le LIBELLÉ de la journée — le thème ou la question —
-- n'a pas à descendre d'ici : `programmeDe(jour)` le calcule dans le navigateur,
-- dans la langue de l'écran, et c'est déjà public. Le faire voyager doublerait
-- une source de vérité pour rien.
--
-- ⚠️ ET ELLE SURVIT À LA PURGE DES RÉPONSES. `scrutin_banalo_results` n'est
-- purgée par rien — c'est ce qui permet une série de plus de trente jours, et la
-- politique de confidentialité le dit déjà (« si vous choisissez de rattacher
-- vos résultats à un compte… »). Il n'y a donc rien à réécrire ici.
--
-- Le plafond est là pour qu'une page ne devienne pas illisible ni coûteuse ; il
-- est très au-dessus de ce qu'un joueur accumule en un an.
create or replace function public.scrutin_banalo_historique(p_max int default 400)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_out jsonb;
begin
  if v_uid is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'jour', jour, 'format', format, 'langue', langue,
           'points', points, 'mieux', mieux
         ) order by jour desc), '[]'::jsonb)
    into v_out
    from (select jour, format, langue, points, mieux
            from public.scrutin_banalo_results
           where user_id = v_uid
           order by jour desc
           limit greatest(1, least(coalesce(p_max, 400), 400))) t;

  return jsonb_build_object('status', 'ok', 'journees', v_out);
end $function$;

-- ══════════════════════════════════════════════════════════════ 6. les droits
--
-- ⚠️ LE `revoke` VIENT AVANT LE `grant` : PUBLIC détient l'EXECUTE par défaut.
revoke all on function public.scrutin_banalo_rattacher(text) from public, anon, authenticated;
revoke all on function public.scrutin_banalo_moi() from public, anon, authenticated;
revoke all on function public.scrutin_banalo_historique(int) from public, anon, authenticated;

grant execute on function public.scrutin_banalo_rattacher(text) to authenticated;
grant execute on function public.scrutin_banalo_moi() to authenticated;
grant execute on function public.scrutin_banalo_historique(int) to authenticated;
