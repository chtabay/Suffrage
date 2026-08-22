-- LA SAISON : un mois de points, remis à zéro, et des trophées qui restent.
--
-- LE MANQUE. Le classement sur la durée est une MOYENNE sur trente journées
-- glissantes. Deux défauts pour un jeu quotidien : il n'a ni début ni fin, donc
-- rien à gagner ; et une moyenne PUNIT la journée en plus — jouer un jour de
-- moins bonne forme fait baisser un chiffre, alors que le produit veut qu'on
-- revienne. Une saison qui cumule des POINTS fait l'inverse : chaque journée
-- jouée ajoute, jamais ne retranche.
--
-- ⚠️ LE BARÈME PORTE SUR LA PLACE, PAS SUR LE CENTILE, ET LE CENTILE A ÉTÉ
-- ESSAYÉ PUIS ÉCARTÉ — MESURÉ. Une table indexée sur le centile donne à la même
-- place des valeurs très différentes selon la foule : la 2ᵉ place vaut 8 points
-- à 3 joueurs et 25 à 3 000, parce que `round(100 × 1/3000)` vaut 0. À trois
-- mille joueurs, les SEIZE premiers touchent tous le maximum et la forme F1
-- disparaît exactement là où elle sert le plus. Un centile normalise le CHAMP,
-- pas la PLACE — et c'est la place qu'un joueur regarde.
--
-- LE BARÈME, DONC, EN DEUX MORCEAUX :
--
--  1. LES POINTS DE PLACE, table fixe sur vingt rangs, de forme Formule 1 :
--     25 · 18 · 15 · 12 · 10 · 8 · 7 · 6 · 5 · 4 · 4 · 3 · 3 · 3 · 2 · 2 · 2 ·
--     2 · 2 · 2. Une place vaut la même chose quelle que soit la foule — la
--     contrainte demandée — et le rapport 1ᵉ/2ᵉ vaut 1,37× contre 1,39 en F1.
--
--  2. UN POINT DE PRÉSENCE, pour TOUTE journée jouée, y compris une journée
--     jouée seul (pas de position). ⚠️ C'EST LE RÉGLAGE QUI DÉCIDE DE TOUT, et
--     il est mesuré : trente journées de présence pure font 30 points contre 26
--     pour une victoire unique. **La présence bat le coup de chance**,
--     structurellement, sans aucun plancher — c'est la réponse au défaut qu'on
--     assumait encore la veille (« un joueur d'une seule journée passe devant un
--     habitué »). Et un habitué toujours 3ᵉ marque 480 quand un vainqueur
--     sporadique en marque 260 : le régulier gagne, sans que le talent cesse de
--     payer.
--
-- ⚠️ LES EX AEQUO SE PARTAGENT LES PLACES QU'ILS OCCUPENT, et ce n'est pas un
-- détail : le nombre d'essais de Cinq sur cinq et la somme de voix de Banalo
-- sont de petits entiers, donc l'égalité n'est pas un cas rare mais LE CAS
-- NORMAL. Trois joueurs en tête occupent les places 1, 2 et 3 : chacun touche
-- (25+18+15)/3 = 19,3, plus la présence. Rien n'est créé, rien n'est perdu — le
-- budget d'une journée ne dépend pas des égalités.
--
-- ⚠️ LE PARTAGE OLYMPIQUE (tout le paquet touche la place haute) A ÉTÉ MESURÉ ET
-- ÉCARTÉ : sur une foule simulée de trois mille joueurs il distribue 490 points
-- au lieu de 191, une inflation de ×2,6, et le plus gros paquet du top 20
-- comptait 46 joueurs. C'est le même effondrement que celui du barème par
-- centile, par l'autre bout.
--
-- ⚠️ LE DÉPARTAGE AU TEMPS A ÉTÉ ÉCARTÉ AUSSI, et le dépôt avait déjà écrit
-- pourquoi pour Banalo : « ça récompenserait la frappe plutôt que la
-- représentation, et se contourne avec deux appareils ». Sur Cinq sur cinq c'est
-- pire — on joue une fois pour trouver le pays, on rejoue en 1 essai et 8
-- secondes — donc un départage au temps récompenserait exactement cette
-- manœuvre. Le partage, lui, la dilue : dix joueurs à égalité en tête touchent
-- 12 points chacun, pas 26.
--
-- ⚠️ ET LE PARTAGE IMPOSE UNE DÉCIMALE, exactement comme le score de Banalo du
-- jour : « la base est de la présentation, la décimale porte la résolution ». Le
-- classement se calcule sur la valeur exacte ; l'affichage n'en est qu'un résumé.

-- ═════════════════════════════════════════════════════════ 1. le barème
--
-- Une seule place au monde où ce tableau est écrit. Le changer change la saison
-- EN COURS pour tout le monde, y compris rétroactivement : à ne faire qu'entre
-- deux saisons, jamais au milieu — et jamais après qu'un palmarès l'a gelé.
create or replace function public.scrutin_jeux_points(p_rang int, p_exaequo int)
returns numeric
language sql immutable set search_path to 'public' as $function$
  select 1 + case when p_rang is null then 0 else
    coalesce((
      select sum(t.points)::numeric
        from unnest(array[25,18,15,12,10,8,7,6,5,4,4,3,3,3,2,2,2,2,2,2])
             with ordinality as t(points, place)
       where t.place >= p_rang
         and t.place <  p_rang + greatest(coalesce(p_exaequo, 1), 1)
    ), 0) / greatest(coalesce(p_exaequo, 1), 1)
  end;
$function$;
revoke all on function public.scrutin_jeux_points(int, int) from public, anon, authenticated;

-- ═════════════════════════════════════════════════════════ 2. la saison
--
-- ⚠️ UN MOIS CIVIL, LU SUR `cree_le`, HEURE DE PARIS. Le fuseau n'est pas une
-- évidence : c'est le même choix explicite que la charnière de 11 h 30 de Banalo
-- du jour (`jour.ts`), assumé pour un produit d'abord français. Une frontière de
-- MOIS est de toute façon cent fois plus grossière qu'une frontière de journée.
--
-- ⚠️ ET CE N'EST PAS UNE TROISIÈME COPIE DE L'ORIGINE DU CALENDRIER. On ne
-- traduit AUCUN numéro de journée en date : on lit l'horodatage que les tables
-- portent déjà. Les deux copies de `ORIGINE` (`jour.ts` et
-- `20260820-banalo-mediane-scellee.sql`) restent deux.
create or replace function public.scrutin_jeux_saison_de(p_moment timestamptz) returns text
language sql stable set search_path to 'public' as $function$
  select to_char(p_moment at time zone 'Europe/Paris', 'YYYY-MM');
$function$;
revoke all on function public.scrutin_jeux_saison_de(timestamptz) from public, anon, authenticated;

-- ═══════════════════════════════════════ 3. les journées d'une saison
--
-- ⚠️ ELLE GARDE LES JOURNÉES SANS POSITION, contrairement à
-- `scrutin_jeux_centiles` qui les jette. Là-bas on calcule une MOYENNE de
-- centiles, et une journée sans centile n'y a pas sa place ; ici on compte des
-- points, et « j'étais là » vaut un point. Deux besoins, deux fonctions.
--
-- ⚠️ BANALO LIT SON RANG, CINQ SUR CINQ LE RECALCULE, et c'est asymétrique pour
-- une bonne raison : le rang de Banalo dépend de réponses qui s'effacent à
-- trente jours, donc il faut l'avoir gardé (`20260828-banalo-garder-le-rang`) ;
-- celui de Cinq sur cinq se déduit pour toujours d'un nombre d'essais, donc le
-- stocker serait une copie qui finirait par mentir.
create or replace function public.scrutin_jeux_saison_journees(p_jeu text, p_saison text)
returns table (user_id uuid, jeu text, rang int, exaequo int)
language sql stable security definer set search_path to 'public' as $function$
  select r.user_id, 'banalo'::text, r.rang, r.exaequo
    from scrutin_banalo_results r
   where (p_jeu = 'tout' or p_jeu = 'banalo')
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
revoke all on function public.scrutin_jeux_saison_journees(text, text) from public, anon, authenticated;

-- ═══════════════════════════════════════ 4. le classement d'une saison
--
-- ⚠️ LE DÉPARTAGE EST CELUI DE LA FORMULE 1 : à points égaux, le nombre de
-- JOURNÉES GAGNÉES. Il tient en une ligne à l'écran, et il récompense le sommet
-- après le volume. On ne départage PAS au nombre de journées jouées : ce serait
-- une seconde règle, inverse de celle du classement en moyenne (« à moyenne
-- égale, le plus assidu devant »), sur la même page.
create or replace function public.scrutin_jeux_saison_table(p_jeu text, p_saison text)
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
    from scrutin_jeux_saison_journees(p_jeu, p_saison) c
    join scrutin_jeux_pseudos p on p.user_id = c.user_id and p.bloque_le is null
   group by c.user_id, p.pseudo;
$function$;
revoke all on function public.scrutin_jeux_saison_table(text, text) from public, anon, authenticated;

-- La vue d'écran. Même forme que `scrutin_jeux_cumul` : lisible SANS compte, il
-- en faut un pour y FIGURER.
create or replace function public.scrutin_jeux_saison(p_jeu text, p_saison text)
returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_max constant int := 10;
  -- Jamais « 1er sur 1 » : le même refus que partout (`VOTANTS_MIN` 2,
  -- `INSCRITS_MIN` 2, `COURBE_MIN` 50, `minimumClasses` 2).
  v_min_classes constant int := 2;
  -- ⚠️ LES MÉDAILLES ONT LEUR PROPRE PLANCHER, PLUS HAUT. Un podium sur trois
  -- joueurs distribue une médaille à tout le monde : ce n'est plus une
  -- récompense, c'est un lot de consolation — et ça la dévalue POUR TOUJOURS,
  -- puisqu'un trophée, contrairement à un classement, ne se recalcule jamais.
  v_min_medailles constant int := 5;
  v_uid uuid := auth.uid();
  v_saison text := coalesce(p_saison, scrutin_jeux_saison_de(now()));
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

  select count(*) into v_joueurs from scrutin_jeux_saison_table(p_jeu, v_saison);
  v_assez := v_joueurs >= v_min_classes;

  select jsonb_build_object(
    'status', 'ok',
    'saison', v_saison,
    'courante', v_saison = scrutin_jeux_saison_de(now()),
    'joueurs', v_joueurs,
    'minimumClasses', v_min_classes,
    'minimumMedailles', v_min_medailles,
    -- ⚠️ MES POINTS SORTENT MÊME SOUS LE PLANCHER, et ils se comptent sur les
    -- JOURNÉES, pas sur la table du classement — celle-ci exige un pseudo, et
    -- « 0 point » à quelqu'un qui a joué dix journées sans en avoir posé un
    -- serait faux au lieu d'être incitatif. Un classement vide doit répondre
    -- « et moi ? », pas « et tout le monde ? ».
    'mesPoints', (select coalesce(round(sum(scrutin_jeux_points(c.rang, c.exaequo)), 1), 0)
                    from scrutin_jeux_saison_journees(p_jeu, v_saison) c
                   where c.user_id = v_uid),
    'mesJournees', (select count(*) from scrutin_jeux_saison_journees(p_jeu, v_saison) c
                     where c.user_id = v_uid),
    'lignes', case when v_assez then
                (select coalesce(jsonb_agg(jsonb_build_object(
                          'place', t.place, 'pseudo', t.pseudo, 'points', t.points,
                          'journees', t.journees, 'gagnees', t.gagnees,
                          'moi', t.user_id = v_uid
                        ) order by t.place), '[]'::jsonb)
                   from scrutin_jeux_saison_table(p_jeu, v_saison) t where t.place <= v_max)
              else '[]'::jsonb end,
    'moi', case when v_assez then
             (select jsonb_build_object('place', t.place, 'pseudo', t.pseudo, 'points', t.points,
                                        'journees', t.journees, 'gagnees', t.gagnees)
                from scrutin_jeux_saison_table(p_jeu, v_saison) t where t.user_id = v_uid)
           end
  ) into v_out;

  return v_out;
end $function$;
revoke all on function public.scrutin_jeux_saison(text, text) from public, anon, authenticated;

-- ══════════════════════════════════════════════ 5. le palmarès, GELÉ
--
-- ⚠️ UN TROPHÉE NE SE RECALCULE PAS, SINON CE N'EST PAS UN TROPHÉE. Le
-- classement en cours se relit à chaque appel ; une médaille, non — elle doit
-- survivre à la purge des réponses, à un changement de barème, et au fait que le
-- mois d'après existe. D'où une table écrite UNE FOIS, à la clôture.
create table if not exists public.scrutin_jeux_palmares (
  saison   text not null check (saison ~ '^\d{4}-\d{2}$'),
  jeu      text not null check (jeu in ('banalo', 'pays', 'tout')),
  user_id  uuid not null references auth.users(id) on delete cascade,
  place    int  not null check (place >= 1),
  points   numeric(8,1) not null check (points >= 0),
  journees int  not null check (journees >= 0),
  gagnees  int  not null default 0 check (gagnees >= 0),
  -- L'effectif de la saison, figé avec elle : c'est lui qui dit si des médailles
  -- ont été décernées, et « 3ᵉ sur 4 » ne veut pas dire « 3ᵉ sur 400 ».
  joueurs  int  not null check (joueurs >= 0),
  cree_le  timestamptz not null default now(),
  primary key (saison, jeu, user_id)
);
alter table public.scrutin_jeux_palmares enable row level security;
-- Aucune policy : tout passe par les fonctions `security definer`.
revoke all on table public.scrutin_jeux_palmares from anon, authenticated;

-- ⚠️ LE PSEUDO N'EST PAS FIGÉ AVEC LE TROPHÉE, ET C'EST DÉLIBÉRÉ. Le geler
-- retirerait à la Régie sa prise : un nom retiré par la modération continuerait
-- de s'afficher dans la salle des trophées, pour toujours, alors que la
-- contrepartie écrite du pseudo permanent est justement qu'on puisse l'y
-- retirer. La médaille appartient au COMPTE, le nom est celui du moment — et un
-- joueur qui change de pseudo retrouve ses trophées sous son nouveau nom.
-- Conséquence assumée : un podium peut afficher 1ᵉ et 3ᵉ sans 2ᵉ si ce nom-là a
-- été bloqué. Le trou est honnête ; renuméroter serait un mensonge.

-- La clôture. Idempotente, appelée toutes les heures : elle gèle toute saison
-- TERMINÉE qui ne l'est pas encore.
--
-- ⚠️ TOUTES LES HEURES, ET LE SQL TRANCHE — pas « le 1er à 00 h 05 ». `pg_cron`
-- planifie en UTC et Paris passe de UTC+1 à UTC+2 : une planification fixe
-- traverserait la frontière du mois deux fois par an. Même motif que
-- `scrutin-game-purge` et que la charnière de 11 h 30.
create or replace function public.scrutin_jeux_saison_cloturer() returns int
language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_courante text := scrutin_jeux_saison_de(now());
  v_max constant int := 10;
  v_saison text;
  v_jeu text;
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
    foreach v_jeu in array array['banalo', 'pays', 'tout'] loop
      continue when exists (
        select 1 from scrutin_jeux_palmares p where p.saison = v_saison and p.jeu = v_jeu
      );
      select count(*) into v_joueurs from scrutin_jeux_saison_table(v_jeu, v_saison);
      continue when v_joueurs = 0;
      insert into scrutin_jeux_palmares (saison, jeu, user_id, place, points, journees, gagnees, joueurs)
      select v_saison, v_jeu, t.user_id, t.place, t.points, t.journees, t.gagnees, v_joueurs
        from scrutin_jeux_saison_table(v_jeu, v_saison) t
       where t.place <= v_max
      on conflict do nothing;
      get diagnostics v_ecrites = row_count;
      v_n := v_n + v_ecrites;
    end loop;
  end loop;
  return v_n;
end $function$;
revoke all on function public.scrutin_jeux_saison_cloturer() from public, anon, authenticated;

select cron.unschedule('scrutin-jeux-saison-cloture')
 where exists (select 1 from cron.job where jobname = 'scrutin-jeux-saison-cloture');
select cron.schedule('scrutin-jeux-saison-cloture', '23 * * * *',
                     $cron$select public.scrutin_jeux_saison_cloturer();$cron$);

-- ═══════════════════════════════════════ 6. la salle des trophées
--
-- ⚠️ ELLE SE LIT SANS COMPTE, comme les classements. Une salle des trophées
-- fermée à qui n'en a pas ne donne aucune raison d'en créer un : c'est justement
-- en voyant qu'il y a du monde derrière qu'on a envie d'y entrer.
create or replace function public.scrutin_jeux_trophees(p_saisons int)
returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_n int := least(greatest(coalesce(p_saisons, 6), 1), 24);
  v_min_medailles constant int := 5;
  v_out jsonb;
begin
  select coalesce(jsonb_agg(x order by x->>'saison' desc), '[]'::jsonb) into v_out
    from (
      select jsonb_build_object(
               'saison', s.saison,
               'jeux', (
                 select coalesce(jsonb_agg(jsonb_build_object(
                          'jeu', g.jeu,
                          'joueurs', g.joueurs,
                          -- ⚠️ LE PODIUM EST VIDE SOUS LE PLANCHER DE MÉDAILLES,
                          -- mais la saison EXISTE quand même : le palmarès garde
                          -- la trace, l'écran ne décerne rien.
                          'podium', case when g.joueurs >= v_min_medailles then (
                            select coalesce(jsonb_agg(jsonb_build_object(
                                     'place', p.place, 'pseudo', ps.pseudo,
                                     'points', p.points, 'journees', p.journees,
                                     'moi', p.user_id = v_uid
                                   ) order by p.place), '[]'::jsonb)
                              from scrutin_jeux_palmares p
                              join scrutin_jeux_pseudos ps
                                on ps.user_id = p.user_id and ps.bloque_le is null
                             where p.saison = g.saison and p.jeu = g.jeu and p.place <= 3
                          ) else '[]'::jsonb end,
                          -- Ma ligne de cette saison, même hors du podium.
                          'moi', (
                            select jsonb_build_object('place', p.place, 'points', p.points,
                                                      'journees', p.journees)
                              from scrutin_jeux_palmares p
                             where p.saison = g.saison and p.jeu = g.jeu and p.user_id = v_uid
                          )
                        ) order by case g.jeu when 'tout' then 0 when 'banalo' then 1 else 2 end),
                        '[]'::jsonb)
                   from (select distinct saison, jeu, joueurs from scrutin_jeux_palmares
                          where saison = s.saison) g
               )
             ) as x
        from (select distinct saison from scrutin_jeux_palmares
               order by saison desc limit v_n) s
    ) y;

  return jsonb_build_object('status', 'ok', 'minimumMedailles', v_min_medailles,
                            'saisons', v_out);
end $function$;
revoke all on function public.scrutin_jeux_trophees(int) from public, anon, authenticated;

-- ═══════════════════════════════════════════════════════════════ les droits
--
-- ⚠️ `revoke` AVANT `grant` : Postgres donne à PUBLIC un droit d'exécution par
-- défaut sur toute fonction. Piège déjà payé deux fois ici. Les fonctions
-- internes (barème, saison, journées, table, clôture) ne sont accordées à
-- PERSONNE : elles ne sont appelées que depuis les deux `security definer`
-- ci-dessous, et depuis le cron.
grant execute on function public.scrutin_jeux_saison(text, text) to anon, authenticated;
grant execute on function public.scrutin_jeux_trophees(int) to anon, authenticated;
