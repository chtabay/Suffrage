-- LE SCORE DE BANALO DU JOUR PASSE EN CONTINU — les cinq paliers fabriquaient
-- un classement qui ne classait rien.
--
-- ⚠️ MESURÉ, ET LE CHIFFRE EST SANS APPEL. Sur une foule simulée (estimations
-- log-normales d'écart-type ×3, plus 1 % d'absurdités), le barème en paliers
-- donne :
--
--       214 joueurs →  5 scores distincts · 100 % d'ex aequo · plus gros paquet 42 %
--     2 000 joueurs →  5 scores distincts · 100 % d'ex aequo · plus gros paquet 36 %
--    20 000 joueurs →  5 scores distincts · 100 % d'ex aequo · plus gros paquet 38 %
--
-- Cinq valeurs possibles : le rang et la part n'ont plus rien à mesurer, et un
-- joueur sur trois se retrouve dans le même paquet que 7 000 autres. Le rang
-- « 63e sur 214 » qu'on affichait était donc surtout une coïncidence de
-- comptage. Avec la courbe continue arrondie au centième :
--
--       214 joueurs → 188 scores distincts · plus gros paquet 2,3 %
--    20 000 joueurs → 944 scores distincts · plus gros paquet 4,7 %
--
-- Et le plus gros paquet restant est le ZÉRO — tous ceux qui ratent d'un facteur
-- dix ou plus. Celui-là doit rester groupé : « au-delà de ×10 » est une seule
-- information, et départager deux joueurs à ×50 et ×500 serait du bruit.
--
-- ⚠️ LA COURBE N'EST PAS UN NOUVEAU BARÈME, C'EST L'ANCIEN SANS LES MARCHES.
-- `10 − 10·log₁₀(facteur)` passe presque exactement par les repères qu'on
-- annonçait déjà : ×1,25 → 9,03 (contre 10), ×2 → 6,99 (contre 6), ×5 → 3,01
-- (contre 3), ×10 → 0 (contre 0). Rien n'a été retuné ; on a seulement cessé
-- d'écraser la valeur sur le bas de sa tranche.
--
-- Et elle s'énonce en une ligne, plus courte que les cinq paliers : **dix
-- points, moins dix par facteur dix d'écart.** C'est cette phrase qui part à
-- l'écran, là où le barème n'était expliqué nulle part.
--
-- ⚠️ L'ARRONDI AU CENTIÈME N'EST PAS COSMÉTIQUE : LE RANG SE CALCULE DESSUS.
-- Classer sur le flottant exact et n'afficher que deux décimales ferait
-- apparaître deux joueurs au même score avec deux rangs différents — l'écran se
-- contredirait tout seul. En arrondissant AVANT de compter, « même score
-- affiché » et « même rang » redeviennent la même chose. D'où `numeric` et non
-- `double precision` : l'égalité y est exacte, ce qu'une comparaison de
-- flottants ne garantit pas.

-- Le type de retour change (int → numeric) : `create or replace` ne sait pas le
-- faire, il faut passer par un `drop`. `scrutin_banalo_etat` l'appelle depuis du
-- plpgsql, qui résout le nom à l'exécution — rien ne casse entre les deux.
drop function if exists public.scrutin_banalo_points(double precision);

create function public.scrutin_banalo_points(p_facteur double precision)
returns numeric language sql immutable as $function$
  select case
           -- Les cas impossibles avant toute arithmétique : `-Infinity::numeric`
           -- lève, il ne faut donc surtout pas laisser le calcul y arriver.
           when p_facteur is null
             or p_facteur <> p_facteur                       -- NaN
             or p_facteur = 'Infinity'::double precision
             or p_facteur >= 10 then 0::numeric
           -- Le facteur ne descend jamais sous 1 par construction ; la borne est
           -- là pour qu'une entrée aberrante ne rende pas plus de 10 sur 10.
           when p_facteur <= 1 then 10::numeric
           else round((10 - 10 * log(p_facteur))::numeric, 2)
         end;
$function$;

-- L'état reprend le même calcul, avec `v_points` en `numeric` : le rang et les
-- ex aequo se comptent sur la valeur ARRONDIE, donc sur celle qui s'affiche.
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
    -- ne bouge pas quand la foule grandit ; avec le « +1 » du rang, la même
    -- performance passerait de 21 % à 20 % entre midi et le lendemain, ce qui
    -- lui retirerait sa seule raison d'être.
    'partmieux', case when v_votants >= v_min_position
                      then round((100.0 * v_meilleurs) / v_votants)::int end,
    'position',  v_votants >= v_min_position
  );
end $function$;

-- ⚠️ LE `drop` A EMPORTÉ LES DROITS AVEC LA FONCTION, et Postgres redonne
-- l'EXECUTE à PUBLIC sur toute fonction créée. Sans ce `revoke`, la nouvelle
-- `scrutin_banalo_points` serait appelable par `anon` alors que l'ancienne ne
-- l'était pas — une régression invisible, offerte par un simple changement de
-- type de retour.
revoke all on function public.scrutin_banalo_points(double precision) from public, anon, authenticated;
revoke all on function public.scrutin_banalo_etat(text, int, text) from public, anon, authenticated;
grant execute on function public.scrutin_banalo_etat(text, int, text) to anon, authenticated;
