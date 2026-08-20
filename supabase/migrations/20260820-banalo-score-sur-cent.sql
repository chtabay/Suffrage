-- LE SCORE DE BANALO DU JOUR SE FIXE SUR CENT, À UNE DÉCIMALE.
--
-- ⚠️ TROISIÈME MIGRATION DU JOUR SUR CETTE FONCTION, ET C'EST ASSUMÉ. Le barème
-- est passé de cinq paliers entiers à la courbe continue sur dix, puis sur mille
-- en entiers, puis ici sur cent à une décimale. Les migrations sont un REGISTRE :
-- on n'en réécrit pas une déjà appliquée, on en ajoute une. Les trois racontent
-- donc la même décision qui se précise, ce qui est la vérité.
--
-- ⚠️ ET CE N'EST TOUJOURS PAS UN CHANGEMENT DE BARÈME. `100 − 100·log₁₀(f)`
-- arrondi au dixième et `1000 − 1000·log₁₀(f)` arrondi à l'unité sont la MÊME
-- valeur : 87,5 et 875 ont exactement les mêmes paliers. Mesuré sur une foule
-- simulée, les deux rendent 188 scores distincts sur 214 joueurs, 775 sur 2 000,
-- 944 sur 20 000, avec des paquets d'ex aequo identiques au joueur près. La base
-- d'affichage et la résolution sont deux choses séparées.
--
-- ⚠️ CE QUI SERAIT UNE PERTE, EN REVANCHE, C'EST CENT SANS DÉCIMALE. Cent
-- paliers au lieu de mille font remonter les ex aequo médians de 28 à 259 sur
-- 20 000 joueurs, et le plus gros paquet hors zéro de 0,3 % à 2,0 % : on
-- refabriquerait en petit le problème que les cinq paliers posaient en grand. La
-- décimale n'est donc pas un ornement, c'est elle qui porte la résolution.
--
-- Deux décimales ne se justifiaient pas : elles ne gagnent que 28 → 6 ex aequo
-- médians à 20 000 joueurs, un gain réel mais imperceptible, payé par un chiffre
-- de plus à lire tous les jours.
--
-- Repères : ×1,25 → 90,3 · ×2 → 69,9 · ×5 → 30,1 · ×10 → 0.
--
-- `numeric` et non `double precision` : le rang se compte sur la valeur
-- AFFICHÉE, donc arrondie, et l'égalité doit être exacte. Deux joueurs au même
-- score affiché doivent avoir le même rang, sans quoi l'écran se contredit.

drop function if exists public.scrutin_banalo_points(double precision);

create function public.scrutin_banalo_points(p_facteur double precision)
returns numeric language sql immutable as $function$
  select case
           -- Les cas impossibles AVANT toute arithmétique : `-Infinity` ne se
           -- caste pas en `numeric`, il ne faut pas laisser le calcul y arriver.
           when p_facteur is null
             or p_facteur <> p_facteur                       -- NaN
             or p_facteur = 'Infinity'::double precision
             or p_facteur >= 10 then 0::numeric
           -- Le facteur ne descend jamais sous 1 par construction ; la borne est
           -- là pour qu'une entrée aberrante ne rende pas plus que le maximum.
           when p_facteur <= 1 then 100::numeric
           else round((100 - 100 * log(p_facteur))::numeric, 1)
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
  v_points   numeric;
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

  -- Le rang se compte sur la valeur affichée : « même score » et « même rang »
  -- sont donc la même chose, et l'égalité `numeric` est exacte.
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
