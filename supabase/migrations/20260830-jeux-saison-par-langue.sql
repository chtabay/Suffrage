-- BANALO A AUTANT DE FOULES QUE DE LANGUES, ET LA SAISON LES MÉLANGEAIT.
--
-- ⚠️ LE FAIT DE BASE : `scrutin_banalo_etat(jeton, jour, LANGUE)` classe un
-- joueur parmi ceux qui ont répondu DANS SA LANGUE. Mesuré sur la journée 1 :
-- **7 votants en français, 1 en pidgin**. Le barème de saison, lui, donne 26
-- points au premier quelle que soit la foule — c'est voulu, une place doit valoir
-- la même chose partout — mais il additionnait ensuite ces points dans UN SEUL
-- classement Banalo. Être premier de deux pidginophones y valait donc autant
-- qu'être premier de trois mille francophones, et le classement cessait de dire
-- quoi que ce soit.
--
-- La sortie n'est pas de tordre le barème : c'est de comparer les gens à la
-- foule où ils ont joué. **Le classement Banalo se fait par langue**, et toutes
-- les langues sont consultables quelle que soit celle de l'interface.
--
-- ⚠️ ET IL N'Y A PLUS DE CLASSEMENT BANALO « TOUTES LANGUES ». Il n'a jamais été
-- une compétition honnête : c'est la somme de quatre compétitions distinctes.
-- « Tous les jeux » reste, lui, un grand total assumé — il additionne des jeux
-- ET des langues, et son objet est de récompenser qui joue à tout, pas de
-- départager des égaux.
--
-- ═══════════════════════════════════════ ET UN DÉFAUT PLUS GRAVE, TROUVÉ EN
--                                          MESURANT : ON POUVAIT MAGASINER SA
--                                          LANGUE APRÈS AVOIR VU SON RÉSULTAT.
--
-- La clé de `scrutin_banalo_results` est `(user_id, jour)`, donc une journée
-- jouée dans DEUX langues ne garde qu'une ligne — et le `on conflict do update`
-- laissait gagner la DERNIÈRE traitée. Vu sur un vrai jeton : journée 1 jouée en
-- français à 13 h 05 puis en pidgin à 19 h 57, la ligne gardée porte `pcm`.
-- Autrement dit : on répond en français, on lit « 6ᵉ sur 7 », on rejoue en
-- pidgin, et on écrase son résultat par un premier rang.
--
-- ⚠️ DÉSORMAIS LA PREMIÈRE LANGUE JOUÉE GAGNE. Le `do update` ne s'applique plus
-- qu'à la MÊME langue — un autre idiome ne peut plus écraser —, et les journées
-- sont traitées dans l'ordre où elles ont été jouées. On garde donc une ligne
-- par journée (une journée de Banalo, un résultat : jouer la même question dans
-- quatre langues ne doit pas rapporter quatre fois) et c'est celle du premier
-- essai, le seul qui n'ait pas pu être choisi en connaissance de cause.

-- ═══════════════════════════════════════ 1. la première langue jouée gagne
create or replace function public.scrutin_banalo_rattacher(p_jeton text)
returns int language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_n   int  := 0;
  v_ligne record;
  v_etat jsonb;
begin
  -- ⚠️ PAS DE `return 0` ICI. Un refus doit se voir : rendre « 0 rattaché » à un
  -- appel non authentifié serait indiscernable d'un navigateur vierge, et
  -- l'écran afficherait « c'est gardé » sans que rien ne le soit.
  if v_uid is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if coalesce(p_jeton, '') !~ '^[a-z0-9]{10,40}$' then
    raise exception 'invalid' using errcode = '22023';
  end if;

  -- ⚠️ ORDRE CHRONOLOGIQUE, ET CE N'EST PAS COSMÉTIQUE : c'est ce qui fait que
  -- la PREMIÈRE langue jouée occupe la ligne. Sans lui, l'ordre dépendrait du
  -- plan d'exécution.
  for v_ligne in
    select jour, langue, min(cree_le) as quand
      from scrutin_banalo_reponses where jeton = p_jeton
     group by jour, langue order by min(cree_le)
  loop
    v_etat := scrutin_banalo_etat(p_jeton, v_ligne.jour, v_ligne.langue);
    -- ⚠️ ON SAUTE CE QUI N'A PAS DE NOTE, PLUS CE QUI MANQUE DE MONDE. Voir
    -- l'en-tête de `20260824-banalo-historique.sql` : `assez` ne veut plus dire
    -- « il existe un score ».
    continue when v_etat->>'points' is null;
    insert into scrutin_banalo_results
           (user_id, jour, langue, format, points, mieux, rang, sur, exaequo, cree_le)
    values (v_uid, v_ligne.jour, v_ligne.langue, 'nombre',
            (v_etat->>'points')::numeric, (v_etat->>'partmieux')::int,
            (v_etat->>'rang')::int, (v_etat->>'votants')::int, (v_etat->>'exaequo')::int,
            v_ligne.quand)
    on conflict (user_id, jour) do update
       set points = excluded.points, mieux = excluded.mieux,
           rang = excluded.rang, sur = excluded.sur, exaequo = excluded.exaequo,
           format = excluded.format
       -- ⚠️ LA GARDE QUI FERME LE MAGASINAGE DE LANGUE. Une autre langue ne peut
       -- plus écraser la ligne : elle est simplement ignorée. La même langue,
       -- elle, se recalcule — parce que la FOULE bouge, pas la réponse.
       where scrutin_banalo_results.langue = excluded.langue;
    v_n := v_n + 1;
  end loop;

  for v_ligne in
    select jour, langue, theme, min(cree_le) as quand
      from scrutin_banalo_mots where jeton = p_jeton
     group by jour, langue, theme order by min(cree_le)
  loop
    v_etat := scrutin_banalo_mots_etat(p_jeton, v_ligne.jour, v_ligne.langue, v_ligne.theme);
    continue when v_etat->>'points' is null;
    insert into scrutin_banalo_results
           (user_id, jour, langue, format, points, mieux, rang, sur, exaequo, cree_le)
    values (v_uid, v_ligne.jour, v_ligne.langue, 'mots',
            (v_etat->>'points')::numeric, (v_etat->>'partmieux')::int,
            (v_etat->>'rang')::int, (v_etat->>'votants')::int, (v_etat->>'exaequo')::int,
            v_ligne.quand)
    on conflict (user_id, jour) do update
       set points = excluded.points, mieux = excluded.mieux,
           rang = excluded.rang, sur = excluded.sur, exaequo = excluded.exaequo,
           format = excluded.format
       where scrutin_banalo_results.langue = excluded.langue;
    v_n := v_n + 1;
  end loop;

  return v_n;
end $function$;

-- ═══════════════════════════════════════ 2. les journées, filtrées par langue
--
-- ⚠️ LA LANGUE NE FILTRE QUE BANALO. Cinq sur cinq n'en a pas — on y nomme des
-- pays, pas des mots — donc ses journées comptent dans toutes les vues. Passer
-- une langue à `pays` n'aurait aucun sens et n'en a aucun effet.
drop function if exists public.scrutin_jeux_saison_journees(text, text);
create or replace function public.scrutin_jeux_saison_journees(
  p_jeu text, p_saison text, p_langue text
) returns table (user_id uuid, jeu text, rang int, exaequo int)
language sql stable security definer set search_path to 'public' as $function$
  select r.user_id, 'banalo'::text, r.rang, r.exaequo
    from scrutin_banalo_results r
   where (p_jeu = 'tout' or p_jeu = 'banalo')
     and (p_langue is null or r.langue = p_langue)
     and scrutin_jeux_saison_de(r.cree_le) = p_saison
  union all
  select r.user_id, 'pays'::text, j.rang::int, j.exaequo::int
    from scrutin_game_pays_results r
    cross join lateral (
      select count(*) filter (where t.essais < r.essais) + 1 as rang,
             count(*) filter (where t.essais = r.essais)     as exaequo
        from scrutin_game_pays_results t where t.jour = r.jour
    ) j
   where (p_jeu = 'tout' or p_jeu = 'pays')
     -- Les lignes anonymes entrent dans la FOULE (le `lateral` ci-dessus ne
     -- filtre rien) mais pas dans le classement : elles n'ont pas de compte.
     and r.user_id is not null
     and scrutin_jeux_saison_de(r.cree_le) = p_saison;
$function$;
revoke all on function public.scrutin_jeux_saison_journees(text, text, text) from public, anon, authenticated;

drop function if exists public.scrutin_jeux_saison_table(text, text);
create or replace function public.scrutin_jeux_saison_table(p_jeu text, p_saison text, p_langue text)
returns table (user_id uuid, pseudo text, points numeric, journees int, gagnees int, place bigint)
language sql stable security definer set search_path to 'public' as $function$
  select c.user_id, p.pseudo,
         round(sum(scrutin_jeux_points(c.rang, c.exaequo)), 1) as points,
         count(*)::int as journees,
         count(*) filter (where c.rang = 1)::int as gagnees,
         row_number() over (
           order by sum(scrutin_jeux_points(c.rang, c.exaequo)) desc,
                    count(*) filter (where c.rang = 1) desc,
                    p.pseudo
         ) as place
    from scrutin_jeux_saison_journees(p_jeu, p_saison, p_langue) c
    join scrutin_jeux_pseudos p on p.user_id = c.user_id and p.bloque_le is null
   group by c.user_id, p.pseudo;
$function$;
revoke all on function public.scrutin_jeux_saison_table(text, text, text) from public, anon, authenticated;

-- ═══════════════════════════════════════ 3. la vue d'écran
--
-- ⚠️ ELLE REND AUSSI LES LANGUES PRÉSENTES DANS LA SAISON, pour que l'écran ne
-- propose pas quatre onglets dont trois sont vides. Quatre langues fixes seraient
-- un mensonge poli : à onze joueurs, seul le français a une foule.
drop function if exists public.scrutin_jeux_saison(text, text);
create or replace function public.scrutin_jeux_saison(p_jeu text, p_saison text, p_langue text)
returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_max constant int := 10;
  -- Jamais « 1er sur 1 » : le même refus que partout (`VOTANTS_MIN` 2,
  -- `INSCRITS_MIN` 2, `COURBE_MIN` 50, `minimumClasses` 2).
  v_min_classes constant int := 2;
  -- Au plus un podium ; jamais autant de médailles que de joueurs.
  v_podium constant int := 3;
  v_uid uuid := auth.uid();
  v_saison text := coalesce(p_saison, scrutin_jeux_saison_de(now()));
  -- ⚠️ LA LANGUE N'EST LUE QUE POUR BANALO. Sur `pays` et sur `tout`, la porter
  -- filtrerait un jeu qui n'a pas de langue et couperait le grand total en
  -- quatre sans que personne ne l'ait demandé.
  v_langue text := case when p_jeu = 'banalo' then nullif(p_langue, '') end;
  v_joueurs int;
  v_assez boolean;
  v_out jsonb;
begin
  if p_jeu is null or p_jeu not in ('banalo', 'pays', 'tout') then
    return jsonb_build_object('status', 'refus');
  end if;
  if v_saison !~ '^\d{4}-\d{2}$' then
    return jsonb_build_object('status', 'refus');
  end if;
  if v_langue is not null and v_langue !~ '^[a-z]{2,3}$' then
    return jsonb_build_object('status', 'refus');
  end if;

  select count(*) into v_joueurs from scrutin_jeux_saison_table(p_jeu, v_saison, v_langue);
  v_assez := v_joueurs >= v_min_classes;

  select jsonb_build_object(
    'status', 'ok',
    'saison', v_saison,
    'langue', v_langue,
    'courante', v_saison = scrutin_jeux_saison_de(now()),
    'joueurs', v_joueurs,
    'minimumClasses', v_min_classes,
    -- ⚠️ COMBIEN DE MÉDAILLES SERAIENT DÉCERNÉES AUJOURD'HUI. Toujours au moins
    -- une de moins qu'il n'y a de classés : sans ça, « tout le monde en a une »
    -- et le trophée ne vaut plus rien — pour toujours, puisqu'il est gelé.
    'medailles', least(v_podium, greatest(v_joueurs - 1, 0)),
    -- Les langues où Banalo a été joué cette saison, la plus fréquentée d'abord.
    'langues', (select coalesce(jsonb_agg(jsonb_build_object('code', l.langue, 'journees', l.n)
                                          order by l.n desc, l.langue), '[]'::jsonb)
                  from (select r.langue, count(*) as n
                          from scrutin_banalo_results r
                         where scrutin_jeux_saison_de(r.cree_le) = v_saison
                         group by r.langue) l),
    -- ⚠️ MES POINTS SORTENT MÊME SOUS LE PLANCHER, et ils se comptent sur les
    -- JOURNÉES, pas sur la table du classement — celle-ci exige un pseudo, et
    -- « 0 point » à quelqu'un qui a joué dix journées sans en avoir posé un
    -- serait faux au lieu d'être incitatif. Un classement vide doit répondre
    -- « et moi ? », pas « et tout le monde ? ».
    'mesPoints', (select coalesce(round(sum(scrutin_jeux_points(c.rang, c.exaequo)), 1), 0)
                    from scrutin_jeux_saison_journees(p_jeu, v_saison, v_langue) c
                   where c.user_id = v_uid),
    'mesJournees', (select count(*) from scrutin_jeux_saison_journees(p_jeu, v_saison, v_langue) c
                     where c.user_id = v_uid),
    'lignes', case when v_assez then
                (select coalesce(jsonb_agg(jsonb_build_object(
                          'place', t.place, 'pseudo', t.pseudo, 'points', t.points,
                          'journees', t.journees, 'gagnees', t.gagnees,
                          'moi', t.user_id = v_uid
                        ) order by t.place), '[]'::jsonb)
                   from scrutin_jeux_saison_table(p_jeu, v_saison, v_langue) t where t.place <= v_max)
              else '[]'::jsonb end,
    'moi', case when v_assez then
             (select jsonb_build_object('place', t.place, 'pseudo', t.pseudo, 'points', t.points,
                                        'journees', t.journees, 'gagnees', t.gagnees)
                from scrutin_jeux_saison_table(p_jeu, v_saison, v_langue) t where t.user_id = v_uid)
           end
  ) into v_out;

  return v_out;
end $function$;

-- ═══════════════════════════════════════ 4. le palmarès porte la langue
--
-- ⚠️ UNE MÉDAILLE DOIT ÊTRE CELLE DU CLASSEMENT OÙ L'ON A CONCOURU. Geler un
-- podium « Banalo toutes langues » alors que l'écran ne montre plus ce
-- classement décernerait un trophée pour une compétition à laquelle personne
-- n'a participé. La clé devient donc `(saison, jeu, langue, user_id)`, avec la
-- chaîne vide pour les portées sans langue (`tout`, `pays`).
--
-- Le changement de clé est gratuit ici : la table ne contient AUCUNE ligne au
-- moment du dépôt — la première clôture a lieu le 1er du mois prochain.
alter table public.scrutin_jeux_palmares
  add column if not exists langue text not null default '';
alter table public.scrutin_jeux_palmares
  drop constraint if exists scrutin_jeux_palmares_langue_check;
alter table public.scrutin_jeux_palmares
  add constraint scrutin_jeux_palmares_langue_check
  check (langue = '' or langue ~ '^[a-z]{2,3}$');
alter table public.scrutin_jeux_palmares
  drop constraint if exists scrutin_jeux_palmares_pkey;
alter table public.scrutin_jeux_palmares
  add constraint scrutin_jeux_palmares_pkey primary key (saison, jeu, langue, user_id);

-- ⚠️ ET LA CLÔTURE GÈLE UNE SAISON PAR LANGUE JOUÉE, plus une pour `tout` et une
-- pour `pays`. Elle ne gèle PAS de « Banalo toutes langues » : ce classement
-- n'existe plus à l'écran, et un trophée sans classement est un trophée sans
-- sens.
create or replace function public.scrutin_jeux_saison_cloturer() returns int
language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_courante text := scrutin_jeux_saison_de(now());
  v_max constant int := 10;
  v_saison text;
  v_portee record;
  v_joueurs int;
  v_ecrites int;
  v_n int := 0;
begin
  for v_saison in
    select distinct s from (
      select scrutin_jeux_saison_de(cree_le) as s from scrutin_banalo_results
      union all
      select scrutin_jeux_saison_de(cree_le) from scrutin_game_pays_results
    ) x
    where s < v_courante
  loop
    for v_portee in
      select 'tout'::text as jeu, ''::text as langue
      union all
      select 'pays', ''
      union all
      -- Une portée Banalo par langue effectivement jouée cette saison-là.
      select 'banalo', r.langue
        from scrutin_banalo_results r
       where scrutin_jeux_saison_de(r.cree_le) = v_saison
       group by r.langue
    loop
      continue when exists (
        select 1 from scrutin_jeux_palmares p
         where p.saison = v_saison and p.jeu = v_portee.jeu and p.langue = v_portee.langue
      );
      select count(*) into v_joueurs
        from scrutin_jeux_saison_table(v_portee.jeu, v_saison, nullif(v_portee.langue, ''));
      continue when v_joueurs = 0;
      insert into scrutin_jeux_palmares
             (saison, jeu, langue, user_id, place, points, journees, gagnees, joueurs)
      select v_saison, v_portee.jeu, v_portee.langue,
             t.user_id, t.place, t.points, t.journees, t.gagnees, v_joueurs
        from scrutin_jeux_saison_table(v_portee.jeu, v_saison, nullif(v_portee.langue, '')) t
       where t.place <= v_max
      on conflict do nothing;
      get diagnostics v_ecrites = row_count;
      v_n := v_n + v_ecrites;
    end loop;
  end loop;
  return v_n;
end $function$;

-- ═══════════════════════════════════════ 5. la salle des trophées
create or replace function public.scrutin_jeux_trophees(p_saisons int)
returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_n int := least(greatest(coalesce(p_saisons, 6), 1), 24);
  v_podium constant int := 3;
  v_out jsonb;
begin
  select coalesce(jsonb_agg(x order by x->>'saison' desc), '[]'::jsonb) into v_out
    from (
      select jsonb_build_object(
               'saison', s.saison,
               'jeux', (
                 select coalesce(jsonb_agg(jsonb_build_object(
                          'jeu', g.jeu,
                          'langue', nullif(g.langue, ''),
                          'joueurs', g.joueurs,
                          -- Combien cette saison-là a décerné, gelé avec elle.
                          'medailles', least(v_podium, greatest(g.joueurs - 1, 0)),
                          'podium', (
                            select coalesce(jsonb_agg(jsonb_build_object(
                                     'place', p.place, 'pseudo', ps.pseudo,
                                     'points', p.points, 'journees', p.journees,
                                     'moi', p.user_id = v_uid
                                   ) order by p.place), '[]'::jsonb)
                              from scrutin_jeux_palmares p
                              join scrutin_jeux_pseudos ps
                                on ps.user_id = p.user_id and ps.bloque_le is null
                             where p.saison = g.saison and p.jeu = g.jeu and p.langue = g.langue
                               and p.place <= least(v_podium, greatest(g.joueurs - 1, 0))
                          ),
                          -- Ma ligne de cette saison, même hors du podium.
                          'moi', (
                            select jsonb_build_object('place', p.place, 'points', p.points,
                                                      'journees', p.journees)
                              from scrutin_jeux_palmares p
                             where p.saison = g.saison and p.jeu = g.jeu
                               and p.langue = g.langue and p.user_id = v_uid
                          )
                        ) order by case g.jeu when 'tout' then 0 when 'banalo' then 1 else 2 end,
                                   g.langue),
                        '[]'::jsonb)
                   from (select distinct saison, jeu, langue, joueurs from scrutin_jeux_palmares
                          where saison = s.saison) g
               )
             ) as x
        from (select distinct saison from scrutin_jeux_palmares
               order by saison desc limit v_n) s
    ) y;

  return jsonb_build_object('status', 'ok', 'saisons', v_out);
end $function$;

-- ═══════════════════════════════════════════════════════════════ les droits
--
-- ⚠️ `revoke` AVANT `grant` : Postgres donne à PUBLIC un droit d'exécution par
-- défaut sur toute fonction créée — et une signature qui change en crée une
-- NEUVE, donc les droits de l'ancienne ne la protègent pas.
revoke all on function public.scrutin_jeux_saison(text, text, text) from public, anon, authenticated;
revoke all on function public.scrutin_jeux_trophees(int) from public, anon, authenticated;
revoke all on function public.scrutin_jeux_saison_cloturer() from public, anon, authenticated;
grant execute on function public.scrutin_jeux_saison(text, text, text) to anon, authenticated;
grant execute on function public.scrutin_jeux_trophees(int) to anon, authenticated;
