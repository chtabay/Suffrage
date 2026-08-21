-- LA RÉPARTITION D'UNE JOURNÉE CLOSE — où la foule s'est posée, et où on était.
--
-- La médiane révélée est un point ; elle ne dit pas si la foule était serrée
-- autour, ou étalée sur trois décades avec des tours aux nombres ronds. C'est le
-- compagnon naturel de `20260820-banalo-mediane-scellee.sql` : on vient de
-- rendre le nombre visible, voici le paysage dans lequel il se trouve.
--
-- ⚠️ ELLE NE SORT QUE SUR UNE JOURNÉE CLOSE, et c'est la seule chose qui la rend
-- sûre. Un histogramme des réponses est une carte au trésor : il montre la
-- bosse, donc la médiane, avec une précision qui ne dépend d'aucun raisonnement.
-- Rendu pendant la journée, il serait pire que la médiane elle-même.
--
-- ⚠️ ELLE VIT DANS `scrutin_banalo_etat` PLUTÔT QUE DANS UNE FONCTION À ELLE, et
-- c'est délibéré. Une fonction séparée devrait savoir, elle aussi, si la journée
-- est close — donc porter une TROISIÈME copie de `ORIGINE`, après `jour.ts` et
-- les deux migrations de scellement. Ici le calcul est déjà fait. Coût réel : un
-- passage d'agrégat de plus, et seulement sur l'appel de la journée précédente,
-- puisque la journée en cours est ouverte et ne rend rien.
--
-- ─────────────────────────────────────────────────── comment les seaux tombent
--
-- ⚠️ EN LOG, PAS EN LINÉAIRE, ET CE N'EST PAS UN GOÛT. Mesuré sur des journées
-- simulées : les réponses s'étalent sur 1,9 à 3,8 DÉCADES. Un axe linéaire
-- écraserait 99 % des joueurs dans la première barre et laisserait le reste vide.
-- C'est d'ailleurs la même échelle que le barème (`100 − 100·log₁₀`) : le jeu
-- pense déjà en facteurs, la répartition aussi.
--
-- ⚠️ LE PAS EST UNE FRACTION DE DÉCADE, PAS « l'étendue divisée par N ». Un pas
-- calculé sur l'étendue donnerait des bords de barre arbitraires, différents
-- chaque jour ; avec 1/6 de décade, les puissances de dix ET les demi-décades
-- tombent exactement sur des bords. Or c'est là que les gens répondent — mesuré,
-- une foule où la moitié répond en nombres ronds fait un PEIGNE : trois tours à
-- 10⁵·⁵, 10⁶, 10⁶·⁵, et du vide entre. Un pas décalé couperait chaque tour en
-- deux et rendrait le peigne illisible.
--
-- Le pas s'élargit si la journée est très étalée, en gardant l'alignement sur
-- les décades, pour que le nombre de barres reste tenable sur un téléphone :
-- 1/6 jusqu'à 5 décades, puis 1/3, 1/2, 1 — toujours 30 barres au plus.
--
-- ⚠️ LES QUEUES SONT REPLIÉES DANS LES BARRES DES BORDS, JAMAIS JETÉES. Les
-- bornes sont les 1er et 99e centiles (sinon un seul plaisantin à 10¹⁷ écrase
-- toute la journée dans une barre), mais les 2 % qui débordent sont comptés dans
-- la première et la dernière barre. Si on les jetait, la somme des barres ne
-- ferait plus le nombre de joueurs annoncé juste à côté, et l'écran se
-- contredirait lui-même.
--
-- `mien` et `foule` sont les INDEX de barre de ma réponse et de la médiane —
-- jamais des valeurs. L'écran n'a pas à re-chercher où placer les repères, et
-- ils tombent forcément sur une barre existante.

create or replace function public.scrutin_banalo_etat(
  p_jeton text, p_jour int, p_langue text
) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_min_score    constant int := 5;
  v_min_position constant int := 20;
  v_plafond  constant double precision := 10;
  -- Au plus 30 barres : au-delà, elles font moins de 10 px sur un téléphone.
  v_barres_max constant int := 30;
  -- ⚠️ MÊME VALEUR QUE `ORIGINE` DANS `jour.ts`. Voir l'en-tête.
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

  if v_votants < v_min_score then
    return jsonb_build_object('status', 'ok', 'repondu', true, 'votants', v_votants,
                              'mienne', v_mienne, 'assez', false, 'close', v_close);
  end if;

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
    -- `greatest(…, 1)` : une journée où tout le monde répond le même nombre
    -- donne une étendue nulle, donc zéro barre — et un histogramme vide.
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
    'assez',   true,
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

-- ⚠️ Le `revoke` avant le `grant` : Postgres donne à PUBLIC un droit d'exécution
-- par défaut sur toute fonction.
revoke all on function public.scrutin_banalo_etat(text, int, text) from public, anon, authenticated;
grant execute on function public.scrutin_banalo_etat(text, int, text) to anon, authenticated;
