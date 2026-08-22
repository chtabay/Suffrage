-- LA COURBE DES SCORES DU FORMAT « MOTS » — et, du même coup, l'ordre de rejeu.
--
-- ══ 1. CE QU'ELLE AJOUTE ═══════════════════════════════════════════════════
--
-- Un joueur a demandé : « comment on sait si on est bien placés ? ». L'écran
-- répond déjà par un centile et un rang — mais un centile est un RANG, donc
-- uniforme par construction : il ne peut pas dire si la foule s'est serrée ou
-- éparpillée. Mesuré à 3 000 joueurs, la distribution des scores prend deux
-- formes INVERSES selon la nature du thème (bosse en haut / bosse en bas). Cette
-- densité-là, aucun chiffre de l'écran ne la porte.
--
-- ⚠️ ELLE N'EST AJOUTÉE QU'AU FORMAT « MOTS », ET C'EST DÉMONTRABLE. Côté
-- chiffré, `score = 100 − 100·log₁₀(facteur)` et le facteur est le rapport à la
-- médiane : l'histogramme des scores y est donc l'histogramme des réponses
-- REPLIÉ autour de la médiane. `RepartitionDuJour` montre déjà la version
-- dépliée, avec un axe portant de vrais nombres et DEUX repères — dont l'un
-- dégénérerait ici, la médiane valant 100 par construction. Ce serait un
-- doublon strict, en moins riche, sur un format qui ne sort qu'un jour sur sept.
--
-- ══ 2. CE QU'ELLE RÉPARE ═══════════════════════════════════════════════════
--
-- ⚠️ L'ORDRE D'APPLICATION ET L'ORDRE ALPHABÉTIQUE DIVERGENT. Six migrations
-- portent la date du 22/08 et ont été appliquées dans cet ordre :
--
--   1. -mots-concentration      4. -mots-eval-immediate
--   2. -mots-forme-immediate    5. -mots-orphelin-zero
--   3. -sans-plancher           6. -position-des-deux
--
-- Un tri par NOM de fichier rejoue `-sans-plancher` EN DERNIER. Sur une base
-- vierge, il redéfinirait donc les deux fonctions dans leur état du milieu de
-- journée, avec trois régressions silencieuses : `v_min_position` de retour à 20
-- (la position se tairait sous vingt réponses), le mot orphelin redevenu payant,
-- et la copie de l'origine du calendrier réintroduite dans la fonction des mots.
-- `-mots-forme-immediate` écrase de même `-mots-eval-immediate`.
--
-- Cette migration porte donc l'ÉTAT FINAL des deux fonctions et, datée du
-- lendemain, elle sort la dernière dans les deux ordres.
--
-- ⚠️ CONSÉQUENCE POUR LA SUITE : toute migration qui touchera encore l'une de
-- ces deux fonctions devra être datée du 24/08 ou plus tard. C'est exactement le
-- piège qu'on vient de fermer — et il se rouvre au premier fichier daté du 23
-- dont le nom commence par une lettre avant « c ».
--
-- Le corps de `scrutin_banalo_etat` est repris à l'octet près de
-- `20260822-banalo-position-des-deux.sql` : son empreinte ne doit pas bouger.

create or replace function public.scrutin_banalo_etat(
  p_jeton text, p_jour int, p_langue text
) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  -- Une réserve à afficher, pas un verrou — voir `20260822-banalo-sans-plancher.sql`.
  v_min_score    constant int := 5;
  -- ⚠️ DEUX : en dessous on serait « 1er sur 1 ». Voir l'en-tête.
  v_min_position constant int := 2;
  v_plafond  constant double precision := 10;
  -- Au plus 30 barres : au-delà, elles font moins de 10 px sur un téléphone.
  v_barres_max constant int := 30;
  -- ⚠️ MÊME VALEUR QUE `ORIGINE` DANS `jour.ts`.
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
  -- La répartition.
  v_bas   double precision;
  v_haut  double precision;
  v_etendue double precision;
  v_pas   double precision;
  v_gauche double precision;
  v_n     int;
  v_seaux jsonb;
  v_repartition jsonb;
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

  -- ⚠️ PLUS D'ARRÊT ICI. Le premier joueur du jour est sa propre médiane et
  -- marque donc 100 : ce n'est pas un exploit, c'est une tautologie, et la
  -- réserve affichée sous le score le dit. Le calcul, lui, est sûr — `v_votants`
  -- vaut au moins 1 dès qu'on a répondu, donc aucune division par zéro.
  v_facteur  := scrutin_banalo_facteur(v_mienne, v_mediane);
  v_points   := scrutin_banalo_points(v_facteur);
  v_classant := least(v_facteur, v_plafond);

  select count(*) filter (where least(scrutin_banalo_facteur(reponse, v_mediane), v_plafond) < v_classant),
         count(*) filter (where least(scrutin_banalo_facteur(reponse, v_mediane), v_plafond) = v_classant)
    into v_meilleurs, v_exaequo
    from scrutin_banalo_reponses
   where jour = p_jour and langue = p_langue;

  -- LA RÉPARTITION, ET SEULEMENT SUR UNE JOURNÉE CLOSE.
  if v_close then
    select percentile_disc(0.01) within group (order by reponse),
           percentile_disc(0.99) within group (order by reponse)
      into v_bas, v_haut
      from scrutin_banalo_reponses
     where jour = p_jour and langue = p_langue;

    -- `reponse > 0` est garanti par `scrutin_banalo_repondre` : log10 est sûr.
    v_etendue := log(10, v_haut::numeric)::double precision - log(10, v_bas::numeric)::double precision;
    v_pas := case
               when v_etendue <= 5  then 1.0 / 6
               when v_etendue <= 10 then 1.0 / 3
               when v_etendue <= 15 then 0.5
               when v_etendue <= 30 then 1
               -- Journée absurdement étalée : on élargit jusqu'à tenir, en
               -- gardant un nombre entier de décades par barre.
               else ceil(v_etendue / v_barres_max)
             end;
    v_gauche := floor(log(10, v_bas::numeric)::double precision / v_pas) * v_pas;
    -- ⚠️ `greatest(…, 1)` : une journée où tout le monde répond le même nombre
    -- donne une étendue nulle, donc zéro barre — et un histogramme vide. C'est
    -- devenu le cas ORDINAIRE depuis que le plancher est tombé : à un seul
    -- votant, le bas et le haut sont la même réponse.
    v_n := greatest(
             round((ceil(log(10, v_haut::numeric)::double precision / v_pas) * v_pas - v_gauche) / v_pas)::int,
             1);

    with idx as (
      select least(greatest(floor((log(10, reponse::numeric)::double precision - v_gauche) / v_pas)::int, 0),
                   v_n - 1) as i
        from scrutin_banalo_reponses
       where jour = p_jour and langue = p_langue
    ), cpt as (
      select i, count(*) as n from idx group by i
    )
    select coalesce(jsonb_agg(coalesce(cpt.n, 0) order by g.i), '[]'::jsonb)
      into v_seaux
      from generate_series(0, v_n - 1) g(i)
      left join cpt on cpt.i = g.i;

    v_repartition := jsonb_build_object(
      'gauche', v_gauche,
      'pas',    v_pas,
      'seaux',  v_seaux,
      'mien',   least(greatest(floor((log(10, v_mienne::numeric)::double precision - v_gauche) / v_pas)::int, 0), v_n - 1),
      'foule',  least(greatest(floor((log(10, v_mediane::numeric)::double precision - v_gauche) / v_pas)::int, 0), v_n - 1)
    );
  end if;

  return jsonb_build_object(
    'status',  'ok',
    'repondu', true,
    -- ⚠️ CALCULÉ, PLUS CONSTANT. Ce n'est plus « y a-t-il un score ? » mais
    -- « ce score s'appuie-t-il sur assez de monde ? ».
    'assez',   v_votants >= v_min_score,
    'close',   v_close,
    'votants', v_votants,
    'mienne',  v_mienne,
    -- ⚠️ SCELLÉES TANT QUE LA JOURNÉE EST OUVERTE. Le score, le rang et la part
    -- sortent tout de suite — c'est la récompense immédiate ; la médiane,
    -- l'écart et la répartition attendent la clôture.
    'mediane', case when v_close then v_mediane end,
    'facteur', case when v_close then v_facteur end,
    'repartition', v_repartition,
    'points',  v_points,
    'rang',    v_meilleurs + 1,
    'exaequo', v_exaequo,
    'partmieux', case when v_votants >= v_min_position
                      then round((100.0 * v_meilleurs) / v_votants)::int end,
    'position',  v_votants >= v_min_position
  );
end $function$;

-- ──────────────────────────────────────────────────────────── le format mots
create or replace function public.scrutin_banalo_mots_etat(
  p_jeton text, p_jour int, p_langue text, p_theme text
) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  -- Une réserve à afficher, pas un verrou — voir `20260822-banalo-sans-plancher.sql`.
  v_min_score    constant int := 5;
  -- ⚠️ DEUX : en dessous on serait « 1er sur 1 ». Voir l'en-tête.
  v_min_position constant int := 2;
  v_top constant int := 10;
  -- ⚠️ EN DESSOUS DE DEUX JOUEURS, UN MOT NE VAUT RIEN. Même constante que la
  -- salle, où elle s'écrit `p_shared >= 2`.
  v_min_partage  constant int := 2;
  v_votants   int;
  v_cases     int;
  v_total     bigint;
  v_meilleurs int;
  v_exaequo   int;
  v_detail    jsonb;
  v_barres    jsonb;
  v_distincts int;
  v_couverture numeric;
  -- La courbe des scores.
  v_bas   int;
  v_haut  int;
  v_n     int;
  v_pas   numeric;
  v_seaux jsonb;
begin
  select count(distinct jeton), coalesce(max(rang), 0)
    into v_votants, v_cases
    from scrutin_banalo_mots
   where jour = p_jour and langue = p_langue and theme = p_theme;

  if not exists (select 1 from scrutin_banalo_mots
                  where jeton = p_jeton and jour = p_jour and langue = p_langue and theme = p_theme) then
    return jsonb_build_object('status', 'ok', 'repondu', false, 'votants', v_votants);
  end if;

  -- LA GRILLE DU JOUEUR. ⚠️ `joueurs` EST L'EFFECTIF RÉEL, celui du joueur
  -- compris : c'est ce qui permet à l'écran de reconnaître un mot que personne
  -- d'autre n'a écrit. Ce que ce mot RAPPORTE, en revanche, est zéro — voir la
  -- somme juste en dessous.
  select coalesce(jsonb_agg(jsonb_build_object(
           'mot', m.mot,
           'joueurs', e.n,
           'part', case when v_votants > 0 then round((100.0 * e.n) / v_votants, 1) end
         ) order by m.rang), '[]'::jsonb),
         coalesce(sum(case when e.n >= v_min_partage then e.n else 0 end), 0)
    into v_detail, v_total
    from scrutin_banalo_mots m
    join lateral (
      select count(distinct x.jeton) as n
        from scrutin_banalo_mots x
       where x.jour = p_jour and x.langue = p_langue and x.theme = p_theme and x.norme = m.norme
    ) e on true
   where m.jeton = p_jeton and m.jour = p_jour and m.langue = p_langue and m.theme = p_theme;

  -- LE CLASSEMENT, sur la MÊME règle pour tout le monde.
  with eff as (
    select norme, count(distinct jeton) as n
      from scrutin_banalo_mots
     where jour = p_jour and langue = p_langue and theme = p_theme
     group by norme
  ), totaux as (
    select m.jeton, sum(case when e.n >= v_min_partage then e.n else 0 end) as t
      from scrutin_banalo_mots m
      join eff e on e.norme = m.norme
     where m.jour = p_jour and m.langue = p_langue and m.theme = p_theme
     group by m.jeton
  )
  select count(*) filter (where t > v_total), count(*) filter (where t = v_total),
         min(t), max(t)
    into v_meilleurs, v_exaequo, v_bas, v_haut
    from totaux;

  -- ── LA COURBE DES SCORES : où se posent les JOUEURS ────────────────────
  --
  -- ⚠️ CE N'EST PAS UN DOUBLON DU CENTILE, ET C'EST MESURÉ. Le centile est un
  -- rang, donc uniforme par construction : il ne peut PAS dire si la foule s'est
  -- serrée. Simulé à 3 000 joueurs sur deux journées de nature opposée, la même
  -- courbe prend deux formes inverses — bosse EN HAUT sur un thème serré
  -- (0/0/1/3/5/13/18/25/22/13 % des joueurs), bosse EN BAS sur un thème ouvert
  -- (11/19/18/13/14/11/8/3/1/0 %). Deux joueurs au 50e centile de ces deux
  -- journées ne sont pas du tout dans la même situation, et seule la densité le
  -- montre.
  --
  -- ⚠️ LE NOMBRE DE BARRES SUIT LA FOULE, et c'est mesuré aussi, sur la vraie
  -- journée 2 (11 joueurs, scores de 5 à 31) : 5 barres ne laissent AUCUN trou,
  -- 10 barres en laissent 4. Un histogramme troué se lit comme une panne.
  --
  -- ⚠️ AXE LINÉAIRE, PAS LOGARITHMIQUE. La bande des nombres est en log parce
  -- que des réponses s'étalent sur trois décades ; une somme d'effectifs est
  -- bornée par `votants × cases` et se lit droite.
  --
  -- Le seuil d'affichage n'est PAS ici : la fonction rend toujours la courbe, et
  -- c'est l'écran qui décide de la montrer. Même règle que le reste — `assez` ne
  -- commande plus ce qui est CALCULÉ, seulement ce qui est DIT.
  v_n := least(10, greatest(4, v_votants / 2));
  -- Tout le monde au même score : une seule barre, sinon zéro barre et un
  -- histogramme vide. Même garde que la bande des nombres.
  if v_haut <= v_bas then v_n := 1; end if;
  -- Bornes semi-ouvertes [bas ; haut + 1) : sans le +1, le meilleur score
  -- tomberait hors de la dernière barre et se ferait rabattre dedans par le
  -- `least`, ce qui marche mais masque l'intention.
  v_pas := (v_haut - v_bas + 1)::numeric / v_n;

  with eff as (
    select norme, count(distinct jeton) as n
      from scrutin_banalo_mots
     where jour = p_jour and langue = p_langue and theme = p_theme
     group by norme
  ), totaux as (
    select m.jeton, sum(case when e.n >= v_min_partage then e.n else 0 end) as t
      from scrutin_banalo_mots m
      join eff e on e.norme = m.norme
     where m.jour = p_jour and m.langue = p_langue and m.theme = p_theme
     group by m.jeton
  ), idx as (
    select least(greatest(floor((t - v_bas) / v_pas)::int, 0), v_n - 1) as i
      from totaux
  ), cpt as (
    select i, count(*) as n from idx group by i
  )
  select coalesce(jsonb_agg(coalesce(cpt.n, 0) order by g.i), '[]'::jsonb)
    into v_seaux
    from generate_series(0, v_n - 1) g(i)
    left join cpt on cpt.i = g.i;

  -- LA FORME DE LA JOURNÉE — inchangée. Elle décrit la journée, pas le score :
  -- un mot donné par une seule personne reste un mot de la journée.
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
    -- ⚠️ `mien` EST UN INDEX DE BARRE CALCULÉ ICI, jamais à l'écran : c'est la
    -- règle déjà écrite pour la bande des nombres, « sinon le repère finirait un
    -- jour à côté de la barre qui contient vraiment le joueur ».
    'courbe', jsonb_build_object(
      'bas',   v_bas,
      'haut',  v_haut,
      'seaux', v_seaux,
      'mien',  least(greatest(floor((v_total - v_bas) / v_pas)::int, 0), v_n - 1)
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
revoke all on function public.scrutin_banalo_etat(text, int, text) from public, anon, authenticated;
grant execute on function public.scrutin_banalo_etat(text, int, text) to anon, authenticated;
revoke all on function public.scrutin_banalo_mots_etat(text, int, text, text) from public, anon, authenticated;
grant execute on function public.scrutin_banalo_mots_etat(text, int, text, text) to anon, authenticated;
