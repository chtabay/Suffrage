-- BANALO DU JOUR, FORMAT « MOTS » — un thème, six cases, et la foule décide.
--
-- ═══════════════════════════════════════════════════ les quatre décisions de fond
--
-- 1. ⚠️ LE BARÈME EST CELUI DU CENTRE : une réponse rapporte d'autant plus que
--    d'AUTRES l'ont donnée. C'est la règle du Banalo de salon — être banal — et
--    c'est la même cible que le format chiffré, où l'on vise la médiane. Le
--    joueur n'a donc jamais à se demander quelle règle s'applique aujourd'hui.
--
--    ⚠️ ET C'EST CE QUI REND LE JEU RÉSISTANT À L'ENTENTE. L'étude proposait
--    l'inverse — récompenser la rareté, plancher à 1 % des joueurs. Mesuré :
--    sur trois cents joueurs, CINQ complices sur une réponse inventée gagnent la
--    journée d'emblée, personne ne fait mieux. « Rare mais confirmé par
--    plusieurs » est exactement ce qu'une petite entente fabrique, et aucune
--    forme de courbe ne l'en distingue. Au centre, quatre-vingt-dix complices
--    sur trois mille atterrissent au 85e centile : pour gagner, il faut ÊTRE la
--    foule.
--
-- 2. ⚠️ LE THÈME DÉCLARÉ FAIT PARTIE DE LA CLÉ DE FOULE, et c'est ce qui rend le
--    mot du thème excluable SANS que la base connaisse le calendrier.
--
--    Le problème : « mer » ne doit pas compter sur le thème « La mer », sinon le
--    mot le plus évident est aussi celui qui rapporte le plus — le bug que
--    `20260810-jeux-correctifs-avant-prod.sql` a déjà payé sur le jeu de salon.
--    Mais le calendrier (jour -> thème) vit en TypeScript, et le recopier en SQL
--    ferait deux sources de vérité.
--
--    La sortie : le client DÉCLARE le thème, la base l'utilise pour l'exclusion
--    ET pour grouper la foule. Un client qui mentirait sur le thème pour garder
--    le mot gratuit se retrouve seul dans son propre groupe, sous le plancher de
--    cinq votants, donc SANS SCORE. Le mensonge s'auto-punit ; aucune confiance
--    n'est requise, et rien n'est dupliqué.
--
-- 3. ⚠️ LE TEMPS EST MESURÉ ET NE CLASSE RIEN. Même posture que Cinq sur cinq,
--    dont `scrutin_game_pays_results` stocke `secondes` alors que le rang se
--    calcule `order by essais`. L'idée de départager les ex aequo au temps est
--    sérieuse — sur un thème trop concentré, la victoire est partagée par 14 %
--    du terrain — mais elle récompenserait la frappe plutôt que la
--    représentation, et se contourne avec deux appareils. On collecte donc la
--    donnée, on ne s'en sert pas, et on décidera sur des journées réelles.
--
-- 4. ⚠️ UNE RÉPONSE EST DÉFINITIVE, comme pour le format chiffré et pour la même
--    raison : le dépouillement rend les parts du moment ; si un second dépôt
--    écrasait le premier, il suffirait de lire les parts et de redéposer les
--    réponses les plus données. `on conflict do nothing`, jamais `do update`.

-- ══════════════════════════════════════════════════════════════════ 1. la table

create table if not exists public.scrutin_banalo_mots (
  jeton    text not null check (jeton ~ '^[a-z0-9]{10,40}$'),
  jour     int  not null check (jour between 1 and 100000),
  langue   text not null check (langue in ('fr', 'en', 'es', 'pcm')),
  -- Le libellé du thème dans SA langue de référence : il ne sert pas à afficher
  -- quoi que ce soit, seulement à grouper. Voir la décision 2.
  theme    text not null check (length(theme) between 1 and 60),
  rang     smallint not null check (rang between 1 and 8),
  -- Le mot tel que tapé, gardé pour l'afficher au joueur ; `norme` sert au
  -- comptage. Les deux, parce qu'on ne veut ni compter « Bateaux » à part de
  -- « bateau », ni renvoyer au joueur une forme qu'il n'a pas écrite.
  mot      text not null check (length(mot) between 1 and 40),
  norme    text not null check (length(norme) between 1 and 40),
  secondes int check (secondes is null or secondes between 0 and 86400),
  cree_le  timestamptz not null default now(),
  primary key (jeton, jour, langue, rang)
);

-- Deux fois le même mot dans la même grille ne compte qu'une fois : sans ça, on
-- remplirait six cases avec la réponse la plus évidente.
create unique index if not exists scrutin_banalo_mots_unicite_idx
  on public.scrutin_banalo_mots (jeton, jour, langue, norme);

-- Le comptage lit toujours par journée, langue ET thème.
create index if not exists scrutin_banalo_mots_foule_idx
  on public.scrutin_banalo_mots (jour, langue, theme, norme);

-- Pour la purge, qui balaie par date.
create index if not exists scrutin_banalo_mots_age_idx
  on public.scrutin_banalo_mots (cree_le);

-- ⚠️ RLS ACTIVE, AUCUNE POLICY : rien ne se lit ni ne s'écrit en direct.
alter table public.scrutin_banalo_mots enable row level security;

-- ═══════════════════════════════════════════════ 2. le dépouillement d'un joueur
--
-- Rend TOUT ce que l'écran affiche, pour que le navigateur n'ait rien à
-- recalculer — et donc rien à faire diverger.
--
-- ⚠️ LE RANG SE CALCULE SUR UN ENTIER, DONC SANS AUCUN ARRONDI. Le total d'un
-- joueur est la somme des effectifs de ses réponses ; deux joueurs sont ex aequo
-- si et seulement si ces sommes sont EXACTEMENT égales. C'est la même correction
-- que pour le format chiffré : le rang est la chose précise, le score affiché
-- n'en est qu'un résumé.
--
-- ⚠️ LE DIVISEUR EST LE NOMBRE DE CASES DU JOUR, PAS CELUI QU'ON A REMPLI. Sinon
-- déposer trois bonnes réponses au lieu de six donnerait une meilleure moyenne
-- qu'une grille complète — le score affiché contredirait le rang. On le lit donc
-- dans la table (le plus grand rang utilisé ce jour-là), jamais chez le client.
create or replace function public.scrutin_banalo_mots_etat(
  p_jeton text, p_jour int, p_langue text, p_theme text
) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_min_score    constant int := 5;
  v_min_position constant int := 20;
  v_votants   int;
  v_cases     int;
  v_total     bigint;
  v_meilleurs int;
  v_exaequo   int;
  v_detail    jsonb;
begin
  select count(distinct jeton), coalesce(max(rang), 0)
    into v_votants, v_cases
    from scrutin_banalo_mots
   where jour = p_jour and langue = p_langue and theme = p_theme;

  if not exists (select 1 from scrutin_banalo_mots
                  where jeton = p_jeton and jour = p_jour and langue = p_langue and theme = p_theme) then
    return jsonb_build_object('status', 'ok', 'repondu', false, 'votants', v_votants);
  end if;

  -- ⚠️ PAS DE TABLE TEMPORAIRE ICI : une fonction `stable` n'a pas le droit
  -- d'écrire, et Postgres refuse le `create table` comme l'`insert`. Les
  -- effectifs se recalculent donc en sous-requêtes — latérale pour ma grille,
  -- CTE pour le classement.
  select coalesce(jsonb_agg(jsonb_build_object(
           'mot', m.mot,
           'joueurs', e.n,
           -- La part est rendue prête à afficher : l'écran n'a rien à
           -- recalculer, donc rien à faire diverger.
           'part', case when v_votants > 0 then round((100.0 * e.n) / v_votants, 1) end
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
    return jsonb_build_object('status', 'ok', 'repondu', true, 'assez', false,
                              'votants', v_votants, 'cases', v_cases, 'grille', v_detail);
  end if;

  -- Le classement : sur le TOTAL, un entier, sans arrondi.
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
    'votants', v_votants,
    'cases',   v_cases,
    'grille',  v_detail,
    'total',   v_total,
    -- Le score affiché : la part MOYENNE des joueurs qui ont donné les mêmes
    -- réponses. « 51,3 » veut dire « en moyenne, 51,3 % des joueurs ont écrit
    -- ce que vous avez écrit » — une phrase, pas un réglage.
    'points',  case when v_votants > 0 and v_cases > 0
                    then round((100.0 * v_total) / (v_votants::numeric * v_cases), 1) end,
    'rang',    v_meilleurs + 1,
    'exaequo', v_exaequo,
    -- ⚠️ AUCUN « +1 » ICI : c'est ce qui rend la part stable quand la foule
    -- grandit, et c'est elle qu'on met devant le rang.
    'partmieux', case when v_votants >= v_min_position
                      then round((100.0 * v_meilleurs) / v_votants)::int end,
    'position',  v_votants >= v_min_position
  );
end $function$;

-- ═══════════════════════════════════════════════════════════════ 3. le dépôt
create or replace function public.scrutin_banalo_mots_repondre(
  p_jeton text, p_jour int, p_langue text, p_theme text,
  p_mots text[], p_secondes int default null
) returns jsonb
language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_theme_mots text[];
  v_brut  text;
  v_norme text;
  v_rang  smallint := 0;
begin
  if coalesce(p_jeton, '') !~ '^[a-z0-9]{10,40}$' then return jsonb_build_object('status', 'invalid'); end if;
  if p_langue is null or p_langue not in ('fr', 'en', 'es', 'pcm') then return jsonb_build_object('status', 'invalid'); end if;
  if p_jour is null or p_jour < 1 or p_jour > 100000 then return jsonb_build_object('status', 'invalid'); end if;
  if coalesce(trim(p_theme), '') = '' or length(p_theme) > 60 then return jsonb_build_object('status', 'invalid'); end if;
  if p_mots is null or array_length(p_mots, 1) is null or array_length(p_mots, 1) > 8 then
    return jsonb_build_object('status', 'invalid');
  end if;

  -- ⚠️ ON COMPARE AUX JETONS DU THÈME, PAS À LA CHAÎNE ENTIÈRE. Les thèmes
  -- portent un article — « La mer », « El mar » — donc `scrutin_game_norm('La
  -- mer')` vaut « la mer », et le joueur qui écrit « mer » ne serait PAS exclu.
  -- La leçon est déjà écrite dans `20260810-jeux-correctifs-avant-prod.sql`.
  v_theme_mots := string_to_array(scrutin_game_norm(p_theme), ' ');

  -- ⚠️ CETTE BOUCLE A UN DÉFAUT, corrigé par `20260820-banalo-mots-depot-unique`
  -- avant toute mise en ligne : un doublon écarté fait quand même avancer le
  -- rang, ce qui LAISSE DES TROUS dans la clé primaire — donc une place pour un
  -- second dépôt. Le fichier garde le corps tel qu'il a été appliqué ; ne pas le
  -- « corriger » ici, la migration suivante s'en charge.
  foreach v_brut in array p_mots loop
    v_norme := scrutin_game_norm(coalesce(v_brut, ''));
    continue when v_norme = '' or v_norme = any(v_theme_mots);
    v_rang := v_rang + 1;
    exit when v_rang > 8;
    insert into scrutin_banalo_mots (jeton, jour, langue, theme, rang, mot, norme, secondes)
    values (p_jeton, p_jour, p_langue, p_theme, v_rang,
            left(trim(coalesce(v_brut, '')), 40), v_norme,
            case when p_secondes between 0 and 86400 then p_secondes end)
    on conflict do nothing;
  end loop;

  return scrutin_banalo_mots_etat(p_jeton, p_jour, p_langue, p_theme);
end $function$;

-- ═══════════════════════════════════════════════════════════════ 4. la purge
--
-- Trente jours, comme le format chiffré, et pour la même raison : c'est la durée
-- annoncée dans la politique de confidentialité. Le chiffre vit aux MÊMES trois
-- endroits ; le changer d'un seul côté transforme un engagement en mensonge.
create or replace function public.scrutin_banalo_mots_purge(p_days int default 30)
returns int language plpgsql security definer set search_path to 'public' as $function$
declare v_n int;
begin
  delete from scrutin_banalo_mots
   where cree_le < now() - make_interval(days => greatest(coalesce(p_days, 30), 1));
  get diagnostics v_n = row_count;
  return v_n;
end $function$;

-- ═══════════════════════════════════════════════════════════════ 5. les droits
--
-- ⚠️ LE `revoke` VIENT AVANT LE `grant` : PUBLIC détient l'EXECUTE par défaut
-- sur toute fonction créée.
revoke all on function public.scrutin_banalo_mots_etat(text, int, text, text) from public, anon, authenticated;
revoke all on function public.scrutin_banalo_mots_repondre(text, int, text, text, text[], int) from public, anon, authenticated;
revoke all on function public.scrutin_banalo_mots_purge(int) from public, anon, authenticated;

-- Le jeu se joue SANS COMPTE : `anon` doit pouvoir déposer et lire.
grant execute on function public.scrutin_banalo_mots_etat(text, int, text, text) to anon, authenticated;
grant execute on function public.scrutin_banalo_mots_repondre(text, int, text, text, text[], int) to anon, authenticated;
