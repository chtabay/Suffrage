-- LA MÉDIANE DU JOUR NE SORT PLUS TANT QUE LA JOURNÉE EST OUVERTE.
--
-- ⚠️ LE TROU, ET IL ÉTAIT LARGE. Le dépouillement rendait `mediane` et
-- `facteur` dès la première réponse. Or `mediane` est LA RÉPONSE : un joueur qui
-- vient de jouer la lit, la poste dans une conversation de groupe, et tout le
-- monde marque 100. Répondre ne coûte rien — un jeton neuf s'obtient en vidant
-- son stockage — donc le prix de la solution était UNE réponse jetable.
--
-- C'est exactement l'attaque que `on conflict do nothing` était censé bloquer
-- (« répondre n'importe quoi, lire la médiane rendue et la redéposer »). On
-- avait fermé le re-dépôt sous le MÊME jeton, et laissé la médiane visible :
-- la même triche marchait avec un second jeton. La parade était à moitié faite.
--
-- ⚠️ ET RETIRER LA SEULE LIGNE « MÉDIANE » N'AURAIT RIEN FERMÉ. `facteur` est un
-- multiplicateur : médiane = ma réponse × facteur. Il part donc aussi.
--
-- ⚠️ CE QUI RESTE DÉDUCTIBLE, ET QU'ON ASSUME. Le score est une fonction
-- déterministe du rapport : 10^((100 − score)/100) rend le facteur, donc deux
-- candidats pour la médiane. Mesuré sur un cas réel — score 92,1 avec une
-- réponse de 1 000 000 donne 1 199 499 ou 833 681, la vraie étant 1 200 000.
-- Fermer ça exigerait de cacher le score, c'est-à-dire la récompense immédiate
-- qui fait revenir le joueur. On garde le score, et la différence de nature est
-- ce qui rend le choix défendable :
--
--   · la médiane est un secret DIFFUSABLE — un joueur la publie, mille en
--     profitent, sans rien faire ;
--   · l'inversion du score est un effort PAR TRICHEUR — il faut brûler une
--     réponse, inverser, deviner lequel des deux candidats, et recommencer avec
--     un jeton neuf.
--
-- La posture du dépôt est écrite depuis le début : « ce n'est pas un anti-triche
-- militaire, et se gâcher le jeu reste possible ».
--
-- ⚠️ L'ORIGINE DU CALENDRIER EST DUPLIQUÉE ICI, et c'est le prix à payer. Elle
-- vit dans `src/lib/games/banalo/jour.ts` (`ORIGINE`), et la base doit
-- maintenant savoir si une journée est close pour décider quoi rendre. Laisser
-- le client le déclarer serait offrir la médiane à qui ment. Les deux valeurs
-- doivent bouger ENSEMBLE — et `ORIGINE` ne bouge plus après publication, ce que
-- son propre commentaire dit déjà.
--
-- La journée N est ouverte de (ORIGINE + N−1 jours) 11 h 30 à (ORIGINE + N
-- jours) 11 h 30, heure de Paris. `at time zone` gère le changement d'heure ;
-- une soustraction fixe se tromperait d'une heure six mois par an.

create or replace function public.scrutin_banalo_etat(
  p_jeton text, p_jour int, p_langue text
) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_min_score    constant int := 5;
  v_min_position constant int := 20;
  v_plafond  constant double precision := 10;
  -- ⚠️ MÊME VALEUR QUE `ORIGINE` DANS `jour.ts`. Voir l'en-tête.
  v_origine  constant timestamp := timestamp '2026-08-20 11:30';
  v_close    boolean;
  v_votants  int;
  v_mediane  double precision;
  v_mienne   double precision;
  v_facteur  double precision;
  v_classant double precision;
  v_points   numeric;
  v_meilleurs int;
  v_exaequo   int;
begin
  v_close := now() >= ((v_origine + make_interval(days => p_jour)) at time zone 'Europe/Paris');

  select count(*),
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
    return jsonb_build_object('status', 'ok', 'repondu', true, 'votants', v_votants,
                              'mienne', v_mienne, 'assez', false, 'close', v_close);
  end if;

  v_facteur  := scrutin_banalo_facteur(v_mienne, v_mediane);
  v_points   := scrutin_banalo_points(v_facteur);
  v_classant := least(v_facteur, v_plafond);

  select count(*) filter (where least(scrutin_banalo_facteur(reponse, v_mediane), v_plafond) < v_classant),
         count(*) filter (where least(scrutin_banalo_facteur(reponse, v_mediane), v_plafond) = v_classant)
    into v_meilleurs, v_exaequo
    from scrutin_banalo_reponses
   where jour = p_jour and langue = p_langue;

  return jsonb_build_object(
    'status',  'ok',
    'repondu', true,
    'assez',   true,
    'close',   v_close,
    'votants', v_votants,
    'mienne',  v_mienne,
    -- ⚠️ SCELLÉES TANT QUE LA JOURNÉE EST OUVERTE. Le score, le rang et la part
    -- sortent tout de suite — c'est la récompense immédiate ; la médiane et
    -- l'écart attendent la clôture.
    'mediane', case when v_close then v_mediane end,
    'facteur', case when v_close then v_facteur end,
    'points',  v_points,
    'rang',    v_meilleurs + 1,
    'exaequo', v_exaequo,
    'partmieux', case when v_votants >= v_min_position
                      then round((100.0 * v_meilleurs) / v_votants)::int end,
    'position',  v_votants >= v_min_position
  );
end $function$;

revoke all on function public.scrutin_banalo_etat(text, int, text) from public, anon, authenticated;
grant execute on function public.scrutin_banalo_etat(text, int, text) to anon, authenticated;
