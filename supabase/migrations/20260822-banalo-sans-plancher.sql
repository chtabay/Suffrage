-- LE SCORE SORT DÈS LA PREMIÈRE RÉPONSE — le plancher de cinq votants tombe.
--
-- Il gardait le score, la position et la forme de la journée derrière un
-- effectif minimum : sous cinq réponses, l'écran disait « vous êtes 3 pour
-- l'instant » et ne notait rien. L'arbitrage est retourné : à trois joueurs le
-- score n'est pas SIGNIFICATIF, mais il n'est pas GÊNANT non plus — et le taire
-- coûtait plus cher qu'il ne protégeait. Le joueur qui ouvre une journée jeune
-- déposait sa réponse et n'obtenait rien en retour, c'est-à-dire exactement
-- l'inverse de ce qu'un jeu quotidien doit rendre au moment du dépôt.
--
-- ⚠️ `assez` NE DISPARAÎT PAS, IL CHANGE DE MÉTIER. La clé reste, avec la même
-- définition (`votants >= 5`) — mais elle ne commande plus ce qui est CALCULÉ,
-- seulement ce qui est DIT. L'écran s'en sert pour deux choses et deux
-- seulement : poser la réserve sous le score (« la médiane repose sur très peu
-- de monde »), et choisir l'offre de bas de page — sous le plancher, c'est
-- l'INVITATION qui sert, pas le partage d'un résultat que rien n'appuie encore.
--
-- La conserver règle aussi le décalage de déploiement : la migration s'applique
-- à la main AVANT que le code ne parte, et un écran de la version précédente
-- lit `assez` comme un verrou. Tant qu'elle vaut encore false sous cinq
-- votants, cet écran se comporte exactement comme aujourd'hui.
--
-- ⚠️ CE QUE ÇA OUVRE, ET C'EST ASSUMÉ : SUR UNE JOURNÉE À DEUX RÉPONSES, ON PEUT
-- REMONTER À CELLE DE L'AUTRE. `percentile_disc` rend une valeur RÉELLE de
-- l'échantillon : à deux votants la médiane est l'une des deux réponses, et le
-- score suffit à retrouver le facteur, donc le nombre. Trois raisons de
-- l'accepter : c'est un NOMBRE, pas du texte libre ; le jeu est anonyme, donc
-- il n'y a personne à qui l'attribuer ; et la seule garde vraiment structurante
-- du format « mots » — ne jamais diffuser le mot d'un autre joueur — n'est PAS
-- touchée ici, les libellés des barres restent scellés comme avant.
--
-- Ce qui ne bouge pas non plus : le second plancher, celui de la POSITION
-- (`v_min_position`, 20). « 3e sur 7 » reste du bruit ; le rang et le centile
-- continuent de se taire en dessous. Et le scellement par `v_close` reste
-- entier : la médiane, l'écart, la répartition et les libellés de mots
-- n'arrivent toujours qu'à la clôture.

-- ──────────────────────────────────────────────────────── le format chiffré
create or replace function public.scrutin_banalo_etat(
  p_jeton text, p_jour int, p_langue text
) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  -- ⚠️ N'EST PLUS UN VERROU, C'EST UNE RÉSERVE. Voir l'en-tête : en dessous, on
  -- note quand même, on le dit simplement.
  v_min_score    constant int := 5;
  v_min_position constant int := 20;
  v_plafond  constant double precision := 10;
  -- Au plus 30 barres : au-delà, elles font moins de 10 px sur un téléphone.
  v_barres_max constant int := 30;
  -- ⚠️ MÊME VALEUR QUE `ORIGINE` DANS `jour.ts`.
  v_origine  constant timestamp := timestamp '2026-08-20 11:30';
  v_close    boolean;
  v_votants  int;
  v_mediane  double precision;
  v_mienne   double precision;
  v_facteur  double precision;
  v_classant double precision;
  v_points   numeric;
  v_meilleurs int;
  v_exaequo   int;
  -- La répartition.
  v_bas   double precision;
  v_haut  double precision;
  v_etendue double precision;
  v_pas   double precision;
  v_gauche double precision;
  v_n     int;
  v_seaux jsonb;
  v_repartition jsonb;
begin
  v_close := now() >= ((v_origine + make_interval(days => p_jour)) at time zone 'Europe/Paris');

  select count(*),
         percentile_disc(0.5) within group (order by reponse)
    into v_votants, v_mediane
    from scrutin_banalo_reponses
   where jour = p_jour and langue = p_langue;

  select reponse into v_mienne
    from scrutin_banalo_reponses
   where jeton = p_jeton and jour = p_jour and langue = p_langue;

  if v_mienne is null then
    return jsonb_build_object('status', 'ok', 'repondu', false, 'votants', v_votants);
  end if;

  -- ⚠️ PLUS D'ARRÊT ICI. Le premier joueur du jour est sa propre médiane et
  -- marque donc 100 : ce n'est pas un exploit, c'est une tautologie, et la
  -- réserve affichée sous le score le dit. Le calcul, lui, est sûr — `v_votants`
  -- vaut au moins 1 dès qu'on a répondu, donc aucune division par zéro.
  v_facteur  := scrutin_banalo_facteur(v_mienne, v_mediane);
  v_points   := scrutin_banalo_points(v_facteur);
  v_classant := least(v_facteur, v_plafond);

  select count(*) filter (where least(scrutin_banalo_facteur(reponse, v_mediane), v_plafond) < v_classant),
         count(*) filter (where least(scrutin_banalo_facteur(reponse, v_mediane), v_plafond) = v_classant)
    into v_meilleurs, v_exaequo
    from scrutin_banalo_reponses
   where jour = p_jour and langue = p_langue;

  -- LA RÉPARTITION, ET SEULEMENT SUR UNE JOURNÉE CLOSE.
  if v_close then
    select percentile_disc(0.01) within group (order by reponse),
           percentile_disc(0.99) within group (order by reponse)
      into v_bas, v_haut
      from scrutin_banalo_reponses
     where jour = p_jour and langue = p_langue;

    -- `reponse > 0` est garanti par `scrutin_banalo_repondre` : log10 est sûr.
    v_etendue := log(10, v_haut::numeric)::double precision - log(10, v_bas::numeric)::double precision;
    v_pas := case
               when v_etendue <= 5  then 1.0 / 6
               when v_etendue <= 10 then 1.0 / 3
               when v_etendue <= 15 then 0.5
               when v_etendue <= 30 then 1
               -- Journée absurdement étalée : on élargit jusqu'à tenir, en
               -- gardant un nombre entier de décades par barre.
               else ceil(v_etendue / v_barres_max)
             end;
    v_gauche := floor(log(10, v_bas::numeric)::double precision / v_pas) * v_pas;
    -- ⚠️ `greatest(…, 1)` : une journée où tout le monde répond le même nombre
    -- donne une étendue nulle, donc zéro barre — et un histogramme vide. C'est
    -- devenu le cas ORDINAIRE depuis que le plancher est tombé : à un seul
    -- votant, le bas et le haut sont la même réponse.
    v_n := greatest(
             round((ceil(log(10, v_haut::numeric)::double precision / v_pas) * v_pas - v_gauche) / v_pas)::int,
             1);

    with idx as (
      select least(greatest(floor((log(10, reponse::numeric)::double precision - v_gauche) / v_pas)::int, 0),
                   v_n - 1) as i
        from scrutin_banalo_reponses
       where jour = p_jour and langue = p_langue
    ), cpt as (
      select i, count(*) as n from idx group by i
    )
    select coalesce(jsonb_agg(coalesce(cpt.n, 0) order by g.i), '[]'::jsonb)
      into v_seaux
      from generate_series(0, v_n - 1) g(i)
      left join cpt on cpt.i = g.i;

    v_repartition := jsonb_build_object(
      'gauche', v_gauche,
      'pas',    v_pas,
      'seaux',  v_seaux,
      'mien',   least(greatest(floor((log(10, v_mienne::numeric)::double precision - v_gauche) / v_pas)::int, 0), v_n - 1),
      'foule',  least(greatest(floor((log(10, v_mediane::numeric)::double precision - v_gauche) / v_pas)::int, 0), v_n - 1)
    );
  end if;

  return jsonb_build_object(
    'status',  'ok',
    'repondu', true,
    -- ⚠️ CALCULÉ, PLUS CONSTANT. Ce n'est plus « y a-t-il un score ? » mais
    -- « ce score s'appuie-t-il sur assez de monde ? ».
    'assez',   v_votants >= v_min_score,
    'close',   v_close,
    'votants', v_votants,
    'mienne',  v_mienne,
    -- ⚠️ SCELLÉES TANT QUE LA JOURNÉE EST OUVERTE. Le score, le rang et la part
    -- sortent tout de suite — c'est la récompense immédiate ; la médiane,
    -- l'écart et la répartition attendent la clôture.
    'mediane', case when v_close then v_mediane end,
    'facteur', case when v_close then v_facteur end,
    'repartition', v_repartition,
    'points',  v_points,
    'rang',    v_meilleurs + 1,
    'exaequo', v_exaequo,
    'partmieux', case when v_votants >= v_min_position
                      then round((100.0 * v_meilleurs) / v_votants)::int end,
    'position',  v_votants >= v_min_position
  );
end $function$;

-- ──────────────────────────────────────────────────────────── le format mots
create or replace function public.scrutin_banalo_mots_etat(
  p_jeton text, p_jour int, p_langue text, p_theme text
) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  -- Même changement de métier que pour le format chiffré : une réserve, pas un
  -- verrou.
  v_min_score    constant int := 5;
  v_min_position constant int := 20;
  v_top constant int := 10;
  -- ⚠️ MÊME VALEUR QUE `ORIGINE` DANS `jour.ts`.
  v_origine  constant timestamp := timestamp '2026-08-20 11:30';
  v_close     boolean;
  v_votants   int;
  v_cases     int;
  v_total     bigint;
  v_meilleurs int;
  v_exaequo   int;
  v_detail    jsonb;
  v_barres    jsonb;
  v_distincts int;
  v_couverture numeric;
begin
  v_close := now() >= ((v_origine + make_interval(days => p_jour)) at time zone 'Europe/Paris');

  select count(distinct jeton), coalesce(max(rang), 0)
    into v_votants, v_cases
    from scrutin_banalo_mots
   where jour = p_jour and langue = p_langue and theme = p_theme;

  if not exists (select 1 from scrutin_banalo_mots
                  where jeton = p_jeton and jour = p_jour and langue = p_langue and theme = p_theme) then
    return jsonb_build_object('status', 'ok', 'repondu', false, 'votants', v_votants);
  end if;

  -- ⚠️ LE MOT RESTE, L'EFFECTIF PART. Un joueur doit voir ce qui a réellement
  -- été enregistré — mot du thème écarté, doublons pliés — sinon il ne sait pas
  -- ce qu'il a joué. C'est le CHIFFRE à côté qui se recopie, pas le mot.
  select coalesce(jsonb_agg(jsonb_build_object(
           'mot', m.mot,
           'joueurs', case when v_close then e.n end,
           'part', case when v_close and v_votants > 0 then round((100.0 * e.n) / v_votants, 1) end
         ) order by m.rang), '[]'::jsonb),
         coalesce(sum(e.n), 0)
    into v_detail, v_total
    from scrutin_banalo_mots m
    join lateral (
      select count(distinct x.jeton) as n
        from scrutin_banalo_mots x
       where x.jour = p_jour and x.langue = p_langue and x.theme = p_theme and x.norme = m.norme
    ) e on true
   where m.jeton = p_jeton and m.jour = p_jour and m.langue = p_langue and m.theme = p_theme;

  -- ⚠️ PLUS D'ARRÊT ICI NON PLUS. Seul joueur de la journée, on est sa propre
  -- foule : chaque mot vaut 100 % et le total fait 100 points. Tautologie, pas
  -- exploit — et la réserve sous le score le dit.
  with eff as (
    select norme, count(distinct jeton) as n
      from scrutin_banalo_mots
     where jour = p_jour and langue = p_langue and theme = p_theme
     group by norme
  ), totaux as (
    select m.jeton, sum(e.n) as t
      from scrutin_banalo_mots m
      join eff e on e.norme = m.norme
     where m.jour = p_jour and m.langue = p_langue and m.theme = p_theme
     group by m.jeton
  )
  select count(*) filter (where t > v_total), count(*) filter (where t = v_total)
    into v_meilleurs, v_exaequo
    from totaux;

  -- LA FORME DE LA JOURNÉE — dès le dépôt. Ce sont des hauteurs anonymes : le
  -- libellé, lui, reste scellé jusqu'à la clôture, et n'est JAMAIS rendu pour
  -- le mot d'un autre joueur (`20260822-banalo-mots-concentration.sql`).
  with eff as (
    select norme, count(distinct jeton) as n
      from scrutin_banalo_mots
     where jour = p_jour and langue = p_langue and theme = p_theme
     group by norme
  ), miens as (
    -- L'orthographe du joueur, une par forme normalisée.
    select norme, min(mot) as mot
      from scrutin_banalo_mots
     where jeton = p_jeton and jour = p_jour and langue = p_langue and theme = p_theme
     group by norme
  ), classe as (
    select e.n,
           (mi.norme is not null) as mien,
           mi.mot,
           row_number() over (order by e.n desc, e.norme) as rang
      from eff e
      left join miens mi on mi.norme = e.norme
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'part', round((100.0 * n) / v_votants, 1),
      'mien', mien,
      'mot', case when v_close and mien then mot end
    ) order by rang) filter (where rang <= v_top), '[]'::jsonb),
    count(*)::int,
    case when v_votants > 0 and v_cases > 0
         then round((100.0 * coalesce(sum(n) filter (where rang <= v_cases), 0))
                    / (v_votants::numeric * v_cases), 1) end
    into v_barres, v_distincts, v_couverture
    from classe;

  return jsonb_build_object(
    'status',  'ok',
    'repondu', true,
    'assez',   v_votants >= v_min_score,
    'close',   v_close,
    'votants', v_votants,
    'cases',   v_cases,
    'grille',  v_detail,
    'total',   v_total,
    'concentration', jsonb_build_object(
      'barres', v_barres,
      'distincts', v_distincts,
      'couverture', v_couverture,
      'cases', v_cases
    ),
    'points',  case when v_votants > 0 and v_cases > 0
                    then round((100.0 * v_total) / (v_votants::numeric * v_cases), 1) end,
    'rang',    v_meilleurs + 1,
    'exaequo', v_exaequo,
    'partmieux', case when v_votants >= v_min_position
                      then round((100.0 * v_meilleurs) / v_votants)::int end,
    'position',  v_votants >= v_min_position
  );
end $function$;

-- ⚠️ Le `revoke` avant le `grant` : Postgres donne à PUBLIC un droit d'exécution
-- par défaut sur toute fonction.
revoke all on function public.scrutin_banalo_etat(text, int, text) from public, anon, authenticated;
grant execute on function public.scrutin_banalo_etat(text, int, text) to anon, authenticated;
revoke all on function public.scrutin_banalo_mots_etat(text, int, text, text) from public, anon, authenticated;
grant execute on function public.scrutin_banalo_mots_etat(text, int, text, text) to anon, authenticated;
