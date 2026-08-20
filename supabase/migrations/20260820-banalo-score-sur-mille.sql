-- LE SCORE DE BANALO DU JOUR PASSE SUR MILLE, EN ENTIERS.
--
-- ⚠️ CE N'EST PAS UN CHANGEMENT DE BARÈME. La courbe ne bouge pas d'un cheveu :
-- `1000 − 1000·log₁₀(facteur)` est exactement `10 − 10·log₁₀(facteur)` multiplié
-- par cent. « 8,75 sur 10 » et « 875 sur 1000 » sont la MÊME valeur, au même
-- palier près — mesuré, les deux rendent 188 scores distincts sur 214 joueurs,
-- 775 sur 2 000, 944 sur 20 000, avec des paquets d'ex aequo identiques. La base
-- et la résolution sont deux choses séparées, et seule la présentation change.
--
-- ⚠️ CE QUI CHANGE VRAIMENT, C'EST QU'IL N'Y A PLUS DE DÉCIMALE. Et la décimale
-- avait déjà coûté deux défauts sur ce seul écran : un facteur rendu « ×1.6 »
-- avec un point anglais au milieu d'un écran français, et un score affiché tantôt
-- « 8,7 » tantôt « 8,75 » selon que le centième tombait juste. Un entier n'a ni
-- séparateur décimal, ni largeur variable, ni convention par langue. Le type de
-- retour devient donc `int`, et l'égalité — dont dépend le rang — est exacte par
-- construction, là où `numeric` ne faisait que la garantir.
--
-- ⚠️ POURQUOI PAS SUR CENT. Mesuré aussi, et c'est une vraie perte : cent
-- paliers au lieu de mille font remonter les ex aequo médians de 28 à 259 sur
-- 20 000 joueurs, et le plus gros paquet hors zéro de 0,3 % à 2,0 %. Sur cent,
-- on refabrique en petit le problème que les cinq paliers posaient en grand.
--
-- ⚠️ ET PAS SUR DIX MILLE NON PLUS. Une décimale de plus ferait descendre les ex
-- aequo médians de 28 à 6 — un gain réel mais imperceptible, payé par un score à
-- cinq chiffres que personne ne lit d'un coup d'œil. Aux tailles de foule qu'on
-- verra d'abord (quelques centaines), mille paliers laissent déjà chaque joueur
-- seul sur son score.
--
-- Les repères deviennent : ×1,25 → 903 · ×2 → 699 · ×5 → 301 · ×10 → 0. Et
-- l'énoncé affiché sous l'écart suit : « mille points, moins mille par facteur
-- dix d'écart ».

-- `numeric` → `int` : `create or replace` ne sait pas changer un type de retour.
drop function if exists public.scrutin_banalo_points(double precision);

create function public.scrutin_banalo_points(p_facteur double precision)
returns int language sql immutable as $function$
  select case
           -- Les cas impossibles AVANT toute arithmétique : `-Infinity` ne se
           -- caste pas, il ne faut pas laisser le calcul y arriver.
           when p_facteur is null
             or p_facteur <> p_facteur                       -- NaN
             or p_facteur = 'Infinity'::double precision
             or p_facteur >= 10 then 0
           -- Le facteur ne descend jamais sous 1 par construction ; la borne est
           -- là pour qu'une entrée aberrante ne rende pas plus que le maximum.
           when p_facteur <= 1 then 1000
           else round(1000 - 1000 * log(p_facteur))::int
         end;
$function$;

create or replace function public.scrutin_banalo_etat(
  p_jeton text, p_jour int, p_langue text
) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_min_score    constant int := 5;
  v_min_position constant int := 20;
  v_votants  int;
  v_mediane  double precision;
  v_mienne   double precision;
  v_facteur  double precision;
  v_points   int;
  v_meilleurs int;
  v_exaequo   int;
begin
  select count(*),
         -- `percentile_disc` rend une valeur OBSERVÉE, jamais interpolée : c'est
         -- ce qui permet à `bareme.ts` de s'accorder au caractère près.
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
    -- On confirme le dépôt sans inventer une note que la foule ne porte pas.
    return jsonb_build_object('status', 'ok', 'repondu', true, 'votants', v_votants,
                              'mienne', v_mienne, 'assez', false);
  end if;

  v_facteur := scrutin_banalo_facteur(v_mienne, v_mediane);
  v_points  := scrutin_banalo_points(v_facteur);

  -- Le rang se compte sur la valeur AFFICHÉE — ici l'entier lui-même. « Même
  -- score » et « même rang » sont donc la même chose, sans arrondi à surveiller.
  select count(*) filter (where scrutin_banalo_points(scrutin_banalo_facteur(reponse, v_mediane)) > v_points),
         count(*) filter (where scrutin_banalo_points(scrutin_banalo_facteur(reponse, v_mediane)) = v_points)
    into v_meilleurs, v_exaequo
    from scrutin_banalo_reponses
   where jour = p_jour and langue = p_langue;

  return jsonb_build_object(
    'status',  'ok',
    'repondu', true,
    'assez',   true,
    'votants', v_votants,
    'mienne',  v_mienne,
    'mediane', v_mediane,
    'facteur', v_facteur,
    'points',  v_points,
    -- Rang OLYMPIQUE : à score égal, même rang. Sinon deux joueurs identiques
    -- sont départagés par l'ordre d'arrivée, et c'est le fuseau qu'on récompense.
    'rang',    v_meilleurs + 1,
    'exaequo', v_exaequo,
    -- ⚠️ AUCUN « +1 » ICI. La part est ce qu'on met DEVANT le rang parce qu'elle
    -- ne bouge pas quand la foule grandit.
    'partmieux', case when v_votants >= v_min_position
                      then round((100.0 * v_meilleurs) / v_votants)::int end,
    'position',  v_votants >= v_min_position
  );
end $function$;

-- ⚠️ LE `drop` A EMPORTÉ LES DROITS AVEC LA FONCTION, et Postgres redonne
-- l'EXECUTE à PUBLIC sur toute fonction créée. Sans ce `revoke`, un simple
-- changement de type de retour ouvrirait le barème à `anon`.
revoke all on function public.scrutin_banalo_points(double precision) from public, anon, authenticated;
revoke all on function public.scrutin_banalo_etat(text, int, text) from public, anon, authenticated;
grant execute on function public.scrutin_banalo_etat(text, int, text) to anon, authenticated;
