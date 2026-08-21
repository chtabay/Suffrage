-- LA POSITION SORT DÈS LA DEUXIÈME RÉPONSE — le plancher de vingt tombe.
--
-- ⚠️ LE MOTIF ÉCRIT ÉTAIT « 3e sur 7 n'est pas un rang, c'est du bruit ». Il
-- part pour la même raison que le plancher de score avant lui : ce qu'il
-- protégeait valait moins que ce qu'il coûtait. Sur la vraie journée 2, à six
-- votants, la carte du joueur se réduisait à « 9 voix » et rien d'autre —
-- aucune échelle, alors que « 2e sur 6 » en donne une, grossière mais vraie.
-- Et le format « mots » a d'autant plus besoin de cette ancre que sa somme
-- dépend du nombre de votants et de la nature du thème : elle ne se lit pas
-- seule.
--
-- ⚠️ DEUX, ET PAS UN. Seul votant de la journée, on est « 1er sur 1 » avec 0 %
-- de joueurs devant : ce n'est pas un classement, c'est une tautologie — la
-- même que le 100 du premier arrivé sur le format chiffré. La phrase de l'écran
-- (« votre position apparaît à partir de N réponses ») ne s'affiche donc plus
-- que pour celui qui ouvre la journée.
--
-- ⚠️ CE QUE ÇA REND EST GROSSIER, ET C'EST ASSUMÉ. À six votants le centile
-- avance par pas de 17 points, et le RANG BRUT empire mécaniquement quand la
-- foule grandit — c'est précisément pourquoi l'écran met la part devant le rang
-- (`CLAUDE.md`, « la part passe devant le rang »). Un chiffre grossier qui dit
-- où l'on est vaut mieux qu'une case vide.
--
-- Le plancher de SCORE, lui, est déjà tombé (`20260822-banalo-sans-plancher.sql`)
-- et `assez` (5) garde son métier : la réserve sous le score, et le choix entre
-- inviter et partager.

-- ──────────────────────────────────────────────────────── le format chiffré
create or replace function public.scrutin_banalo_etat(
  p_jeton text, p_jour int, p_langue text
) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  -- Une réserve à afficher, pas un verrou — voir `20260822-banalo-sans-plancher.sql`.
  v_min_score    constant int := 5;
  -- ⚠️ DEUX : en dessous on serait « 1er sur 1 ». Voir l'en-tête.
  v_min_position constant int := 2;
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
  -- Une réserve à afficher, pas un verrou — voir `20260822-banalo-sans-plancher.sql`.
  v_min_score    constant int := 5;
  -- ⚠️ DEUX : en dessous on serait « 1er sur 1 ». Voir l'en-tête.
  v_min_position constant int := 2;
  v_top constant int := 10;
  -- ⚠️ EN DESSOUS DE DEUX JOUEURS, UN MOT NE VAUT RIEN. Même constante que la
  -- salle, où elle s'écrit `p_shared >= 2`.
  v_min_partage  constant int := 2;
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
  select count(distinct jeton), coalesce(max(rang), 0)
    into v_votants, v_cases
    from scrutin_banalo_mots
   where jour = p_jour and langue = p_langue and theme = p_theme;

  if not exists (select 1 from scrutin_banalo_mots
                  where jeton = p_jeton and jour = p_jour and langue = p_langue and theme = p_theme) then
    return jsonb_build_object('status', 'ok', 'repondu', false, 'votants', v_votants);
  end if;

  -- LA GRILLE DU JOUEUR. ⚠️ `joueurs` EST L'EFFECTIF RÉEL, celui du joueur
  -- compris : c'est ce qui permet à l'écran de reconnaître un mot que personne
  -- d'autre n'a écrit. Ce que ce mot RAPPORTE, en revanche, est zéro — voir la
  -- somme juste en dessous.
  select coalesce(jsonb_agg(jsonb_build_object(
           'mot', m.mot,
           'joueurs', e.n,
           'part', case when v_votants > 0 then round((100.0 * e.n) / v_votants, 1) end
         ) order by m.rang), '[]'::jsonb),
         coalesce(sum(case when e.n >= v_min_partage then e.n else 0 end), 0)
    into v_detail, v_total
    from scrutin_banalo_mots m
    join lateral (
      select count(distinct x.jeton) as n
        from scrutin_banalo_mots x
       where x.jour = p_jour and x.langue = p_langue and x.theme = p_theme and x.norme = m.norme
    ) e on true
   where m.jeton = p_jeton and m.jour = p_jour and m.langue = p_langue and m.theme = p_theme;

  -- LE CLASSEMENT, sur la MÊME règle pour tout le monde.
  with eff as (
    select norme, count(distinct jeton) as n
      from scrutin_banalo_mots
     where jour = p_jour and langue = p_langue and theme = p_theme
     group by norme
  ), totaux as (
    select m.jeton, sum(case when e.n >= v_min_partage then e.n else 0 end) as t
      from scrutin_banalo_mots m
      join eff e on e.norme = m.norme
     where m.jour = p_jour and m.langue = p_langue and m.theme = p_theme
     group by m.jeton
  )
  select count(*) filter (where t > v_total), count(*) filter (where t = v_total)
    into v_meilleurs, v_exaequo
    from totaux;

  -- LA FORME DE LA JOURNÉE — inchangée. Elle décrit la journée, pas le score :
  -- un mot donné par une seule personne reste un mot de la journée.
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
      -- ⚠️ LA SEULE GARDE QUI RESTE, ET ELLE NE S'OUVRE JAMAIS : le libellé
      -- d'une barre ne sort que si le mot est CELUI DU JOUEUR. Les mots des
      -- autres restent muets pour toujours — hauteur, jamais nom.
      'mot', case when mien then mot end
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
