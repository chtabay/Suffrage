-- LES PARTS DU FORMAT « MOTS » NE SORTENT PLUS TANT QUE LA JOURNÉE EST OUVERTE.
--
-- ⚠️ C'EST LE MÊME TROU QUE LA MÉDIANE, ET IL ÉTAIT PIRE. Le dépouillement
-- rendait, pour chacun de mes mots, combien de joueurs l'avaient écrit. Un
-- joueur qui vient de jouer lit donc « sable 71 %, plage 64 %, vague 58 % » et
-- poste ces six mots dans une conversation de groupe : tout le monde recopie et
-- marque en haut du classement. Là où la médiane demandait encore d'être
-- comprise (c'est un nombre, il faut savoir ce qu'on en fait), la grille se
-- recopie mot à mot, sans rien comprendre du tout.
--
-- Et le prix de la solution était le même : UNE grille jetable. Un jeton neuf
-- s'obtient en vidant son stockage, `20260820-banalo-mots-depot-unique.sql` ne
-- ferme que le second dépôt sous le MÊME jeton.
--
-- ⚠️ POURQUOI MAINTENANT, ALORS QUE C'ÉTAIT ÉCRIT « NON REFERMÉ ». Le coût
-- annoncé était que cette grille EST la récompense du format : la sceller, c'est
-- rendre une journée de mots muette. Ce coût vient de tomber — l'écran
-- `JourneePrecedente` sait désormais rendre à la clôture ce qui a été scellé
-- pendant la journée. La récompense n'est pas supprimée, elle est DÉCALÉE D'UN
-- JOUR, exactement comme la médiane. Et le format chiffré a déjà montré que le
-- score, la chaleur et le rang suffisent à tenir l'instant qui suit la réponse.
--
-- ⚠️ CE QUI RESTE DÉDUCTIBLE, ET QU'ON ASSUME. `points` est la part MOYENNE de
-- mes mots ; il reste rendu, comme le score du format chiffré. Il dit « vos six
-- mots valent 51,3 % en moyenne » et ne dit jamais LEQUEL porte le score : sans
-- ça, impossible de savoir quoi publier. Même différence de nature que pour la
-- médiane — la grille est un secret DIFFUSABLE (un joueur la publie, mille en
-- profitent), la moyenne est un indice qu'il faut retourner soi-même, une grille
-- brûlée à la fois.
--
-- `total` reste rendu aussi : c'est la valeur qui classe, et elle se déduit déjà
-- de `points` × `votants` × `cases`. Le sceller ne fermerait rien.
--
-- ⚠️ L'ORIGINE DU CALENDRIER EST DUPLIQUÉE ICI POUR LA SECONDE FOIS. Elle vit
-- dans `src/lib/games/banalo/jour.ts` (`ORIGINE`) et déjà dans
-- `20260820-banalo-mediane-scellee.sql`. Laisser le client déclarer qu'une
-- journée est close offrirait la grille à qui ment. Les trois valeurs bougent
-- ensemble — et `ORIGINE` ne bouge plus après publication.
--
-- La journée N est ouverte de (ORIGINE + N−1 jours) 11 h 30 à (ORIGINE + N
-- jours) 11 h 30, heure de Paris. `at time zone` gère le changement d'heure.
--
-- ⚠️ LE SCELLEMENT S'APPLIQUE AUSSI AU RETOUR « FOULE TROP MINCE ». Cette
-- branche rendait la grille elle aussi, et c'est le même trou : sous cinq
-- votants les parts ne veulent rien dire, mais elles se lisent quand même. Elle
-- suit donc la même règle, et une journée close, même maigre, finit par rendre
-- sa grille.
--
-- `scrutin_banalo_mots_repondre` n'est pas retouchée : elle rend le résultat de
-- `scrutin_banalo_mots_etat`, donc elle hérite du scellement.

create or replace function public.scrutin_banalo_mots_etat(
  p_jeton text, p_jour int, p_langue text, p_theme text
) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_min_score    constant int := 5;
  v_min_position constant int := 20;
  -- ⚠️ MÊME VALEUR QUE `ORIGINE` DANS `jour.ts`. Voir l'en-tête.
  v_origine  constant timestamp := timestamp '2026-08-20 11:30';
  v_close     boolean;
  v_votants   int;
  v_cases     int;
  v_total     bigint;
  v_meilleurs int;
  v_exaequo   int;
  v_detail    jsonb;
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

  return jsonb_build_object(
    'status',  'ok',
    'repondu', true,
    'assez',   true,
    'close',   v_close,
    'votants', v_votants,
    'cases',   v_cases,
    'grille',  v_detail,
    'total',   v_total,
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
