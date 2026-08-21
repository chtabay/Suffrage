-- LA FORME DE LA JOURNÉE SORT DÈS LE DÉPÔT, PLUS SEULEMENT À LA CLÔTURE.
--
-- ⚠️ LE DÉFAUT : L'ÉCRAN D'APRÈS-VOTE N'AVAIT RIEN À MONTRER. La demande était
-- d'avoir quelque chose de satisfaisant à proposer JUSTE APRÈS la réponse — et
-- la bande de concentration est faite pour ça. Posée sur la seule journée close
-- (`20260822-banalo-mots-concentration.sql`), elle arrivait un jour trop tard :
-- le joueur qui venait de déposer ses six mots voyait sa grille, une phrase de
-- scellement, et rien d'autre.
--
-- ⚠️ ET ELLE NE FUIT RIEN, PARCE QUE LE LIBELLÉ RESTE SCELLÉ. La bande ne rend
-- que des HAUTEURS et un drapeau « ce mot est le mien ». Le `mot` lui-même,
-- y compris celui du joueur, n'est rendu qu'à la clôture — et c'est lui, le
-- secret : la part d'un mot NOMMÉ se recopie (« écrivez plage, ça vaut 50 % »),
-- une hauteur anonyme ne se recopie pas.
--
-- Ce que le joueur apprend tout de suite est donc : la foule s'est-elle serrée
-- ou éparpillée, et combien de MES mots sont dans les dix plus donnés. Les deux
-- portent sur sa propre grille, qu'il peut de toute façon publier s'il veut ; ni
-- l'un ni l'autre ne nomme le mot d'un autre joueur.
--
-- ⚠️ LE PLANCHER DE CINQ VOTANTS RESTE, et c'est voulu : à trois joueurs,
-- « 90 % ont écrit ce mot » veut dire deux personnes et demie. La bande sort
-- exactement quand le score sort — même seuil, même raison.
--
-- Coût réel : un agrégat de plus par appel sur une journée en cours, sur les
-- lignes du jour uniquement. C'était déjà le cas pour le classement.

create or replace function public.scrutin_banalo_mots_etat(
  p_jeton text, p_jour int, p_langue text, p_theme text
) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
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

  if v_votants < v_min_score then
    return jsonb_build_object('status', 'ok', 'repondu', true, 'assez', false, 'close', v_close,
                              'votants', v_votants, 'cases', v_cases, 'grille', v_detail);
  end if;

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

  -- LA FORME DE LA JOURNÉE — dès le plancher de cinq votants, plus seulement à
  -- la clôture. Voir l'en-tête : ce sont des hauteurs anonymes.
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
      -- ⚠️ LE LIBELLÉ EST SCELLÉ COMME LES PARTS, ET MÊME POUR SES PROPRES MOTS.
      -- « plage vaut 50 % » se recopie ; une barre anonyme, non. Il n'arrive
      -- donc qu'à la clôture. Et jamais, à aucun moment, pour le mot d'un autre
      -- joueur — voir `20260822-banalo-mots-concentration.sql`.
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
    'assez',   true,
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
revoke all on function public.scrutin_banalo_mots_etat(text, int, text, text) from public, anon, authenticated;
grant execute on function public.scrutin_banalo_mots_etat(text, int, text, text) to anon, authenticated;
