-- LA FORME D'UNE JOURNÉE DE MOTS — la foule s'est-elle serrée, ou éparpillée ?
--
-- C'est le pendant, pour les mots, de la bande de répartition des nombres
-- (`20260821-banalo-repartition-du-jour.sql`). Et l'analogue n'est pas celui
-- qu'on croit : le diagramme des nombres montre une DISTRIBUTION de valeurs ; il
-- n'y a pas d'axe pour des mots. Ce qui se distribue, ici, c'est la
-- CONCENTRATION — la part des joueurs qui ont donné le mot n° 1, le n° 2, etc.
--
-- ⚠️ ET C'EST BIEN LA SIGNATURE DE LA JOURNÉE, mesuré en simulation à 3 000
-- joueurs et 6 cases. Sur un thème à évidence brutale, le premier mot est écrit
-- par 99 % des joueurs et les six premiers couvrent 58 % des réponses ; sur un
-- thème ouvert, le premier tombe à 23 % et les six premiers à 13 %. Un écart de
-- quatre entre journées — et il explique directement les scores du jour : sur un
-- thème serré tout le monde marque haut, sur un thème ouvert personne ne peut.
--
-- ─────────────────────────────────────────── ce qui sort, et ce qui ne sort pas
--
-- ⚠️ ON NE REND QUE LES MOTS DU JOUEUR LUI-MÊME. Les barres des autres sont
-- MUETTES : on rend leur hauteur, jamais leur libellé. Ce n'est pas une pudeur
-- de façade — nommer les mots les plus donnés reviendrait à DIFFUSER DU TEXTE
-- LIBRE ÉCRIT PAR DES JOUEURS À TOUS LES AUTRES, sur un jeu public, anonyme, et
-- dont la politique de confidentialité déclare une tranche d'âge « enfant ».
--
-- La justification écrite dans `CLAUDE.md` pour l'absence de tout bouton de
-- signalement repose sur le modèle de la SALLE : on entre par code, entre gens
-- qui se connaissent, la salle est jetable, tout s'efface en sept jours. Aucune
-- des trois propriétés ne tient ici. Ouvrir cette diffusion est donc une
-- décision de produit, pas un détail d'affichage — et le jour où elle se prend,
-- ce qu'il faudra ajouter est un plancher qui SUIT LA FOULE (`max(5, 5 % des
-- votants)`), calibré sur des journées réelles, pas un nombre choisi ici.
--
-- Les mots du joueur, eux, lui sont déjà rendus par la grille juste au-dessus :
-- les nommer sur les barres n'ajoute aucune surface, ça relie deux choses qu'il
-- a déjà sous les yeux.
--
-- ⚠️ ET SEULEMENT SUR UNE JOURNÉE CLOSE. Même règle que les parts : pendant la
-- journée, un classement des mots les plus donnés se recopie mot à mot. La garde
-- est déjà là — `v_close` existe depuis le scellement des parts, donc cette
-- migration n'ajoute AUCUNE copie de l'origine du calendrier. Il y en a déjà
-- trois, ça suffit.
--
-- ⚠️ L'ORTHOGRAPHE RENDUE EST CELLE DU JOUEUR, pas une forme canonique. Deux
-- joueurs qui écrivent « méduse » et « Méduses » comptent pour le même `norme` ;
-- la barre est commune, mais le libellé montré est celui qu'IL a tapé. Lui
-- rendre l'orthographe d'un autre serait lui faire douter de ce qu'il a écrit.

create or replace function public.scrutin_banalo_mots_etat(
  p_jeton text, p_jour int, p_langue text, p_theme text
) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_min_score    constant int := 5;
  v_min_position constant int := 20;
  -- Dix barres : au-delà, la traîne est plate et la bande devient un peigne
  -- illisible sur un téléphone.
  v_top constant int := 10;
  -- ⚠️ MÊME VALEUR QUE `ORIGINE` DANS `jour.ts`. Voir l'en-tête.
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
  v_concentration jsonb;
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

  -- LA CONCENTRATION, ET SEULEMENT SUR UNE JOURNÉE CLOSE.
  if v_close then
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
        -- ⚠️ LE LIBELLÉ NE SORT QUE POUR LES MOTS DU JOUEUR. Voir l'en-tête :
        -- nommer ceux des autres ouvrirait une diffusion de texte libre.
        'mot', case when mien then mot end
      ) order by rang) filter (where rang <= v_top), '[]'::jsonb),
      count(*)::int,
      -- Quelle part de TOUTES les réponses les `v_cases` premiers mots
      -- représentent : c'est le chiffre qui dit si la foule s'est serrée.
      case when v_votants > 0 and v_cases > 0
           then round((100.0 * coalesce(sum(n) filter (where rang <= v_cases), 0))
                      / (v_votants::numeric * v_cases), 1) end
      into v_barres, v_distincts, v_couverture
      from classe;

    v_concentration := jsonb_build_object(
      'barres', v_barres,
      'distincts', v_distincts,
      'couverture', v_couverture,
      'cases', v_cases
    );
  end if;

  return jsonb_build_object(
    'status',  'ok',
    'repondu', true,
    'assez',   true,
    'close',   v_close,
    'votants', v_votants,
    'cases',   v_cases,
    'grille',  v_detail,
    'total',   v_total,
    'concentration', v_concentration,
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
