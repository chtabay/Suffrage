-- LE RANG DE BANALO DU JOUR SE CALCULE SANS ARRONDI.
--
-- ⚠️ CORRECTION D'UNE DÉCISION PRISE À L'ENVERS. Les trois migrations
-- précédentes classaient sur le score ARRONDI, avec un raisonnement qui semblait
-- prudent : « même score affiché, même rang », pour que l'écran ne se contredise
-- pas quand deux amis comparent leurs téléphones.
--
-- C'était payer trop cher. Arrondir AVANT de compter jette de l'information
-- réelle — deux joueurs dont les réponses diffèrent vraiment sont déclarés
-- identiques — pour éviter une surprise purement cosmétique. Le rang est la
-- chose PRÉCISE ; le score affiché n'est qu'un résumé lisible de cette chose.
-- C'est le résumé qui doit s'effacer devant le rang, pas l'inverse.
--
-- ⚠️ ON CLASSE DONC SUR LE FACTEUR, PAS SUR LES POINTS. Le score est une
-- fonction strictement décroissante du facteur : classer par facteur croissant
-- et par points décroissants donnent le MÊME ordre, mais le facteur n'a subi
-- aucun arrondi. Deux joueurs sont alors ex aequo si et seulement si leur écart
-- à la médiane est exactement le même — c'est-à-dire s'ils ont donné la même
-- réponse, ou les deux réponses symétriques (÷k et ×k), qui méritent l'égalité
-- puisque tout le barème est bâti sur elle.
--
-- ⚠️ LE `least(…, 10)` N'EST PAS UNE PRÉCAUTION, C'EST LE PAQUET DES ZÉROS. Sans
-- lui, un joueur à ×50 passerait devant un joueur à ×500 alors que l'écran
-- affiche 0,0 aux deux : on classerait des fautes de frappe. Le plafonnement
-- rétablit l'unique égalité VOULUE du barème, et la seule.

create or replace function public.scrutin_banalo_etat(
  p_jeton text, p_jour int, p_langue text
) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_min_score    constant int := 5;
  v_min_position constant int := 20;
  -- Au-delà de ce facteur, tout le monde est à zéro et personne n'est départagé.
  v_plafond  constant double precision := 10;
  v_votants  int;
  v_mediane  double precision;
  v_mienne   double precision;
  v_facteur  double precision;
  v_classant double precision;
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

  v_facteur  := scrutin_banalo_facteur(v_mienne, v_mediane);
  v_points   := scrutin_banalo_points(v_facteur);
  v_classant := least(v_facteur, v_plafond);

  -- Petit facteur = meilleur. Aucun arrondi n'entre ici.
  select count(*) filter (where least(scrutin_banalo_facteur(reponse, v_mediane), v_plafond) < v_classant),
         count(*) filter (where least(scrutin_banalo_facteur(reponse, v_mediane), v_plafond) = v_classant)
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
    -- Rang OLYMPIQUE : à écart égal, même rang.
    'rang',    v_meilleurs + 1,
    'exaequo', v_exaequo,
    -- ⚠️ AUCUN « +1 » ICI. La part est ce qu'on met DEVANT le rang parce qu'elle
    -- ne bouge pas quand la foule grandit.
    'partmieux', case when v_votants >= v_min_position
                      then round((100.0 * v_meilleurs) / v_votants)::int end,
    'position',  v_votants >= v_min_position
  );
end $function$;

revoke all on function public.scrutin_banalo_etat(text, int, text) from public, anon, authenticated;
grant execute on function public.scrutin_banalo_etat(text, int, text) to anon, authenticated;
