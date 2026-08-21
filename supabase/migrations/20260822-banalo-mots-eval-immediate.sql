-- CHACUN DE SES PROPRES MOTS DIT TOUT DE SUITE CE QU'IL A DONNÉ — comme en salle.
--
-- La demande est une demande de COHÉRENCE avec le jeu de groupe : « on score si
-- les autres ont répondu pareil, et pour chacune de nos réponses on voit ce qui
-- a bien marché ou pas ; on ne voit pas les autres propositions hors des six
-- qu'on a faites, pour ne pas les révéler à quelqu'un qui regarderait par-dessus
-- l'épaule ». Deux des trois exigences étaient déjà tenues : le barème note
-- l'accord avec la foule, et la grille est bâtie sur `where m.jeton = p_jeton`,
-- donc structurellement incapable de porter le mot d'un autre. Restait la
-- deuxième, bloquée par trois `case when v_close`.
--
-- ⚠️ ET LE VERROU PROTÉGEAIT MOINS QU'IL NE L'ANNONÇAIT. Le texte servi au
-- joueur disait « affichée maintenant, il suffirait de recopier vos mots pour
-- marquer autant que vous » — or LES MOTS SONT DÉJÀ AFFICHÉS EN CLAIR sur une
-- journée ouverte, et l'ont toujours été : une grille transmise remplissait
-- déjà les six cases du receveur, avec ou sans les parts. Ce que les parts
-- ajoutaient n'était pas la recopie, c'était le TRI entre deux grilles ou plus.
-- La phrase était donc fausse avant ce changement ; elle disparaît avec lui.
--
-- ⚠️ CE QUI RESTE SCELLÉ, ET POUR TOUJOURS : LE MOT D'UN AUTRE JOUEUR. Le
-- libellé des barres de concentration ne sort toujours que `when mien` — c'est
-- exactement la garde que la demande formule, et c'est la seule qui compte ici.
-- Nommer les mots les plus donnés diffuserait du texte libre écrit par des
-- joueurs à tous les autres, sur un jeu public, anonyme, dont la politique
-- déclare une tranche d'âge « enfant » (voir
-- `20260822-banalo-mots-concentration.sql`, dont l'en-tête reste vrai).
--
-- ⚠️ `joueurs` N'EST PAS DÉCORATIF À CÔTÉ DE `part`, ET C'EST LUI QUI PORTE LA
-- MARCHE DU JEU DE GROUPE. En salle, un mot que personne d'autre n'a écrit vaut
-- zéro, et il est montré estompé sous un titre qui le dit. Ici la part est
-- arrondie au dixième : à 10 000 votants, un seul joueur fait 0,0 % et deux
-- joueurs font 0,0 % aussi — la part ne sait plus distinguer « personne d'autre »
-- de « quelqu'un d'autre ». Pire, à 8 votants elle affiche 12,5 % pour un mot
-- que PERSONNE n'a partagé, puisqu'elle compte le joueur lui-même : lue seule,
-- elle ment. C'est `joueurs = 1` qui dit l'orphelin, et l'écran s'en sert pour
-- taire la part à cet endroit précis.
--
-- ─────────────────────────────────────── et le calendrier sort de cette fonction
--
-- ⚠️ PLUS RIEN DU FORMAT « MOTS » N'EST GARDÉ PAR L'HEURE, donc `v_origine` et
-- `v_close` disparaissent d'ici. Ce n'est pas du rangement : une copie de
-- l'origine du calendrier qui ne garde plus rien est un piège — le prochain
-- agent la lit et croit qu'un scellement existe. Il en restait TROIS
-- (`jour.ts`, `20260820-banalo-mediane-scellee.sql`, et celle-ci) ; il en reste
-- deux, et le format chiffré garde la sienne à bon droit puisque sa médiane,
-- elle, reste scellée jusqu'à la clôture. La clé `close` quitte la charge utile
-- du même coup : aucun écran ne la lisait.

create or replace function public.scrutin_banalo_mots_etat(
  p_jeton text, p_jour int, p_langue text, p_theme text
) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  -- Une réserve à afficher, pas un verrou — voir `20260822-banalo-sans-plancher.sql`.
  v_min_score    constant int := 5;
  v_min_position constant int := 20;
  v_top constant int := 10;
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

  -- LA GRILLE DU JOUEUR, ET ELLE DIT MAINTENANT CE QUE CHAQUE MOT A DONNÉ.
  -- ⚠️ `joueurs` COMPTE LE JOUEUR LUI-MÊME : un mot à 1 n'a été partagé par
  -- personne. C'est la marche que l'écran lit pour estomper la ligne, comme le
  -- fait la salle. Et le mot reste toujours rendu — le joueur doit voir ce qui a
  -- été enregistré (mot du thème écarté, doublons pliés).
  select coalesce(jsonb_agg(jsonb_build_object(
           'mot', m.mot,
           'joueurs', e.n,
           'part', case when v_votants > 0 then round((100.0 * e.n) / v_votants, 1) end
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

  -- LA FORME DE LA JOURNÉE — des hauteurs anonymes, et le libellé des SEULES
  -- barres du joueur.
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
