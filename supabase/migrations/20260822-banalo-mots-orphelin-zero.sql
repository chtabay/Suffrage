-- UN MOT QUE PERSONNE D'AUTRE N'A ÉCRIT NE RAPPORTE RIEN — la règle d'Unanimo.
--
-- ⚠️ LE DÉFAUT : IL RAPPORTAIT UNE VOIX, LA SIENNE. `joueurs` compte le joueur
-- lui-même, donc un mot partagé par personne sortait à 1 et entrait dans la
-- somme pour 1. L'écran l'affichait même en toutes lettres — « 1 joueur » — ce
-- qui revenait à dire « vous marquez parce que vous avez répondu ». En salle
-- (`20260810-jeux-salle-et-unanimo.sql`, `scrutin_game_unanimo_reveal`), la règle
-- est écrite depuis le premier jour : `case when p_shared >= 2 then p_shared
-- else 0 end`. On la reprend telle quelle.
--
-- Ce que ça change, et ce que ça ne change pas :
--
--  · la SOMME du joueur perd une voix par mot orphelin ;
--  · le RANG et le CENTILE suivent, puisqu'ils se calculent sur la même somme
--    pour tout le monde — un joueur qui a trouvé cinq mots partagés passe
--    désormais devant un joueur qui en a trouvé cinq plus un mot à lui seul, ce
--    qui est exactement le sens du jeu ;
--  · le sur-100 stocké pour le résumé de compte suit aussi, c'est la même somme
--    divisée par `votants × cases` ;
--  · `joueurs` et `part` continuent d'être rendus TELS QUELS pour chaque mot,
--    effectif réel compris. L'écran en a besoin pour reconnaître l'orphelin
--    (`joueurs === 1`) et le dire : il affiche « personne d'autre » à la place du
--    chiffre, sans quoi la colonne ne s'additionnerait plus au score.
--
-- ⚠️ ET LA BANDE DE CONCENTRATION NE BOUGE PAS. Elle décrit la JOURNÉE — quelle
-- part des joueurs a donné le mot n° 1, le n° 2 — pas ce que le joueur marque.
-- Un mot donné par une seule personne reste un mot de la journée ; l'écarter de
-- la forme fausserait la couverture, qui sert à lire si la foule s'est serrée.

create or replace function public.scrutin_banalo_mots_etat(
  p_jeton text, p_jour int, p_langue text, p_theme text
) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  -- Une réserve à afficher, pas un verrou — voir `20260822-banalo-sans-plancher.sql`.
  v_min_score    constant int := 5;
  v_min_position constant int := 20;
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
revoke all on function public.scrutin_banalo_mots_etat(text, int, text, text) from public, anon, authenticated;
grant execute on function public.scrutin_banalo_mots_etat(text, int, text, text) to anon, authenticated;
