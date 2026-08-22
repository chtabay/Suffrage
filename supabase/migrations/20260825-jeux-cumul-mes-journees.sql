-- « ET MOI, POURQUOI JE N'Y SUIS PAS ? » — la question que le classement ne
-- savait pas entendre.
--
-- ⚠️ LE DÉFAUT EST VENU D'UN VRAI JOUEUR, SUR UN VRAI TÉLÉPHONE. Il pose son
-- pseudo, valide, et l'écran continue d'afficher « Personne n'est encore classé :
-- il faut avoir joué au moins 5 journées ». Rien n'est faux — il en avait quatre
-- — mais la phrase parle de TOUT LE MONDE là où il vient de poser une question
-- sur LUI. Sans un chiffre à lui, il ne peut pas distinguer « ça n'a pas marché »
-- de « il me manque une journée », et il conclut à la panne.
--
-- On rend donc son propre compte de journées classables, SANS le plancher. Ce
-- n'est pas une donnée de plus par confort : c'est ce qui transforme une
-- impasse en objectif.
--
-- ⚠️ ET IL EST RENDU MÊME QUAND LE JOUEUR N'EST PAS CLASSÉ, c'est tout l'intérêt.
-- `moi` reste nul sous le plancher ; `mesJournees` dit combien il en a.
create or replace function public.scrutin_jeux_cumul(
  p_jour_banalo int, p_jour_pays int, p_jeu text
) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_max constant int := 10;
  v_min_journees constant int := 5;
  v_uid uuid := auth.uid();
  v_out jsonb;
begin
  if p_jeu is null or p_jeu not in ('banalo', 'pays', 'tout') then
    return jsonb_build_object('status', 'refus');
  end if;

  -- ⚠️ TOUT EN CTE, PAS EN TABLE TEMPORAIRE. Une `create temporary table` est une
  -- DDL : dans une fonction déclarée `stable`, c'est une promesse rompue, et ça
  -- casse au premier appel depuis une transaction en lecture seule. Un CTE se
  -- référence autant de fois qu'on veut dans la même requête.
  with classement as (
    select c.user_id, p.pseudo,
           round(avg(c.mieux), 1) as moyenne,
           count(*)::int as journees,
           row_number() over (order by avg(c.mieux), count(*) desc, p.pseudo) as place
      from scrutin_jeux_centiles(p_jour_banalo, p_jour_pays, 0) c
      join scrutin_jeux_pseudos p on p.user_id = c.user_id and p.bloque_le is null
     where p_jeu = 'tout' or c.jeu = p_jeu
     group by c.user_id, p.pseudo
    having count(*) >= v_min_journees
  ),
  -- LA PROGRESSION : la même chose, fenêtre reculée d'une semaine. Rien n'est
  -- stocké — on recalcule, et ça coûte deux agrégats sur des tables minuscules.
  alors as (
    select c.user_id,
           row_number() over (order by avg(c.mieux), count(*) desc) as place
      from scrutin_jeux_centiles(p_jour_banalo, p_jour_pays, 7) c
      join scrutin_jeux_pseudos p on p.user_id = c.user_id and p.bloque_le is null
     where p_jeu = 'tout' or c.jeu = p_jeu
     group by c.user_id
    having count(*) >= v_min_journees
  )
  select jsonb_build_object(
    'status',  'ok',
    'joueurs', (select count(*) from classement),
    'minimum', v_min_journees,
    -- ⚠️ MES JOURNÉES CLASSABLES, SANS LE PLANCHER : c'est la seule façon de
    -- dire « il vous en manque une » plutôt que « personne n'est classé ».
    'mesJournees', (select count(*)
                      from scrutin_jeux_centiles(p_jour_banalo, p_jour_pays, 0) c
                     where c.user_id = v_uid and (p_jeu = 'tout' or c.jeu = p_jeu)),
    'lignes',  (select coalesce(jsonb_agg(jsonb_build_object(
                          'place', place, 'pseudo', pseudo, 'moyenne', moyenne,
                          'journees', journees, 'moi', user_id = v_uid
                        ) order by place), '[]'::jsonb)
                  from classement where place <= v_max),
    -- Ma ligne sort même hors de la tête de liste : un classement où l'on ne se
    -- trouve pas est un classement qui parle des autres.
    'moi',     (select jsonb_build_object('place', place, 'pseudo', pseudo,
                                          'moyenne', moyenne, 'journees', journees)
                  from classement where user_id = v_uid),
    'avant',   (select place from alors where user_id = v_uid)
  ) into v_out;

  return v_out;
end $function$;
