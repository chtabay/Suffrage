-- LE PSEUDO DE COMPTE, ET LE CLASSEMENT SUR LA DURÉE.
--
-- ══ LA RÈGLE, TELLE QU'ELLE A ÉTÉ ARBITRÉE ═════════════════════════════════
--
-- **Tout le monde peut figurer au classement DU JOUR** — c'est le tableau du
-- jour, où l'on dépose un nom pris dans une liste fermée, sans compte
-- (`20260823-banalo-noms-et-tableau.sql`). **Il faut un COMPTE pour figurer aux
-- classements SUR LA DURÉE**, et c'est ce que cette migration ajoute.
--
-- ⚠️ ET CE N'EST PAS LA MÊME DÉCISION QUE LA PRÉCÉDENTE. Jusqu'ici, tout nom de
-- ce produit vivait dans un CONTEXTE et mourait avec lui : le nom du tableau
-- vit dans la journée, le nom du groupe vit dans le groupe, les deux se purgent.
-- `docs/amis-et-notifications.md` en faisait la propriété qui évitait les cinq
-- coûts du §5. Un classement CUMULÉ exige l'inverse : un nom qui survit aux
-- journées, sinon il n'y a rien à cumuler. On franchit donc la ligne — avec la
-- contrepartie qu'elle réclamait depuis le début : une PRISE POUR AGIR, ici la
-- Régie, et un compte derrière chaque nom.
--
-- ⚠️ CE QUI REND ÇA TENABLE : le pseudo n'est visible que dans les classements
-- des jeux, il n'y a AUCUN annuaire (on ne cherche pas un joueur), et il ne
-- devient visible que si le joueur en pose un. Qui n'en pose pas joue, garde ses
-- résultats, voit sa propre progression, et n'apparaît nulle part.
--
-- ⚠️ LIMITE CONNUE, ÉCRITE ICI POUR LA PROCHAINE FOIS : bloquer un pseudo LIBÈRE
-- la chaîne de caractères. La ligne est unique par compte, donc quand le joueur
-- en repose un, l'ancien redevient disponible pour quelqu'un d'autre. Une vraie
-- liste de chaînes bannies serait le remède ; à cette échelle, re-bloquer coûte
-- moins cher que de la maintenir.

-- ═══════════════════════════════════════════════════════════ 1. le pseudo
create table if not exists public.scrutin_jeux_pseudos (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  -- 2 à 20 caractères : assez pour un prénom et un chiffre, trop court pour une
  -- phrase — et c'est une phrase qui sert à harceler, pas un nom.
  pseudo    text not null check (length(btrim(pseudo)) between 2 and 20),
  cree_le   timestamptz not null default now(),
  -- La modération, en deux colonnes plutôt qu'un booléen : QUAND et PAR QUI.
  -- Un blocage sans trace est un blocage qu'on ne peut pas expliquer.
  bloque_le  timestamptz,
  bloque_par uuid references auth.users (id)
);

-- Deux pseudos qui ne diffèrent que par la casse ou les espaces feraient deux
-- lignes indistinctes dans un classement.
create unique index if not exists jeux_pseudo_unique
  on public.scrutin_jeux_pseudos (lower(btrim(pseudo)));

-- RLS active, AUCUNE policy : tout passe par les fonctions `security definer`.
alter table public.scrutin_jeux_pseudos enable row level security;
revoke all on table public.scrutin_jeux_pseudos from anon, authenticated;

-- ═══════════════════════════════════════════════════ 2. poser / lire son pseudo
--
-- `pris` : quelqu'un le porte déjà. `court` / `long` : hors bornes. Le blocage
-- éventuel est LEVÉ quand on en pose un nouveau — c'est le but : le joueur n'est
-- pas banni, son nom l'était.
create or replace function public.scrutin_jeux_pseudo_poser(p_pseudo text)
returns jsonb language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_net text;
begin
  if v_uid is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  -- ⚠️ ON NORMALISE LES ESPACES AVANT DE MESURER. « a          b » fait douze
  -- caractères et se lit « a b » : sans ça, la borne de longueur mesure du vide.
  v_net := btrim(regexp_replace(coalesce(p_pseudo, ''), '\s+', ' ', 'g'));
  -- Les caractères de contrôle ne s'affichent pas mais cassent une ligne.
  if v_net ~ '[[:cntrl:]]' then
    return jsonb_build_object('status', 'refus');
  end if;
  if length(v_net) < 2 then return jsonb_build_object('status', 'court'); end if;
  if length(v_net) > 20 then return jsonb_build_object('status', 'long'); end if;

  begin
    insert into scrutin_jeux_pseudos (user_id, pseudo) values (v_uid, v_net)
    on conflict (user_id) do update
       set pseudo = excluded.pseudo, bloque_le = null, bloque_par = null;
  exception when unique_violation then
    return jsonb_build_object('status', 'pris');
  end;

  return jsonb_build_object('status', 'ok', 'pseudo', v_net);
end $function$;

create or replace function public.scrutin_jeux_pseudo_moi()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare v_uid uuid := auth.uid(); v_out jsonb;
begin
  if v_uid is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select jsonb_build_object('pseudo', pseudo, 'bloque', bloque_le is not null)
    into v_out from scrutin_jeux_pseudos where user_id = v_uid;
  -- ⚠️ « PAS DE PSEUDO » N'EST PAS UN REFUS : on rend un objet vide, l'écran
  -- proposera d'en poser un.
  return coalesce(v_out, jsonb_build_object('pseudo', null, 'bloque', false));
end $function$;

-- ═══════════════════════════════════════════ 3. les centiles d'une fenêtre
--
-- ⚠️ LE CENTILE EST LA SEULE GRANDEUR QUI TRAVERSE LES DEUX JEUX. Un nombre
-- d'essais et une somme de voix ne s'additionnent pas ; le sur-100 de Banalo ne
-- veut même pas dire la même chose d'un thème à l'autre — son maximum
-- ATTEIGNABLE vaut 67,8 sur un thème serré et 13,7 sur un thème ouvert.
--
-- ⚠️ LA FENÊTRE EST DE 30 JOURS, ET CE N'EST **PAS** LE 30 DE LA CONSERVATION.
-- Celui-là vit dans `scrutin_banalo_purge`, son cron et la politique de
-- confidentialité, et il dit combien de temps on GARDE une réponse. Celui-ci dit
-- sur combien de journées on CLASSE, et il porte sur `scrutin_banalo_results`,
-- qui n'est purgée par rien. Les deux peuvent diverger sans que rien ne casse.
--
-- ⚠️ ET LE NUMÉRO DU JOUR VIENT DU CLIENT, un par jeu : les deux calendriers
-- n'ont ni la même origine ni la même charnière (11 h 30 pour Banalo, minuit
-- pour Cinq sur cinq), et la base ne connaît ni fuseau ni charnière.
--
-- `p_recul` décale la fenêtre vers le passé : 0 pour maintenant, 7 pour « il y a
-- une semaine ». C'est ce qui permet de dire une PROGRESSION sans stocker
-- d'historique de classement.
create or replace function public.scrutin_jeux_centiles(
  p_jour_banalo int, p_jour_pays int, p_recul int
) returns table (user_id uuid, jeu text, mieux int)
language sql stable security definer set search_path to 'public' as $function$
  select r.user_id, 'banalo'::text, r.mieux
    from scrutin_banalo_results r
   where r.mieux is not null
     and r.jour <= p_jour_banalo - p_recul
     and r.jour >  p_jour_banalo - p_recul - 30
  union all
  -- Cinq sur cinq ne STOCKE pas son centile : il se calcule à la lecture, sur la
  -- même définition — la part des joueurs de cette journée qui ont fait MOINS
  -- d'essais. Le plancher de deux joueurs est le même que partout ailleurs.
  select r.user_id, 'pays'::text,
         round((100.0 * j.meilleurs) / j.joueurs)::int
    from scrutin_game_pays_results r
    cross join lateral (
      select count(*) as joueurs,
             count(*) filter (where t.essais < r.essais) as meilleurs
        from scrutin_game_pays_results t where t.jour = r.jour
    ) j
   where j.joueurs >= 2
     and r.jour <= p_jour_pays - p_recul
     and r.jour >  p_jour_pays - p_recul - 30;
$function$;

-- ⚠️ ELLE N'EST DONNÉE À PERSONNE : elle rend les centiles de TOUS les comptes.
revoke all on function public.scrutin_jeux_centiles(int, int, int) from public, anon, authenticated;

-- ═══════════════════════════════════════════════ 4. le classement sur la durée
--
-- `p_jeu` : 'banalo', 'pays', ou 'tout'.
--
-- ⚠️ ICI LE RANG S'AFFICHE, ALORS QUE LE TABLEAU DU JOUR LE REFUSE — et la
-- différence est réelle, pas un revirement. Au jour, un vrai rang existe parmi
-- TOUS les joueurs (la carte de score l'affiche), donc un rang parmi les seuls
-- inscrits serait un mensonge. Sur la durée, aucun rang « vrai » n'existe : la
-- plupart des joueurs sont des jetons anonymes sans identité d'un jour à
-- l'autre. Le rang parmi les comptes classés est donc le SEUL qui existe — et
-- l'effectif est rendu avec, pour qu'on sache de quelle population on parle.
--
-- ⚠️ UN PLANCHER DE JOURNÉES, SINON UNE SEULE JOURNÉE CHANCEUSE PREND LA TÊTE.
-- Cinq dans la fenêtre : assez pour qu'un coup de chance se dilue, assez peu
-- pour qu'une semaine de jeu suffise. À égalité de moyenne, celui qui a joué le
-- PLUS passe devant — c'est la seule façon de ne pas récompenser le tri.
create or replace function public.scrutin_jeux_cumul(
  p_jour_banalo int, p_jour_pays int, p_jeu text
) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_max constant int := 10;
  v_min_journees constant int := 5;
  v_uid uuid := auth.uid();
  v_out jsonb;
begin
  if p_jeu is null or p_jeu not in ('banalo', 'pays', 'tout') then
    return jsonb_build_object('status', 'refus');
  end if;

  -- ⚠️ TOUT EN CTE, PAS EN TABLE TEMPORAIRE. Une `create temporary table` est une
  -- DDL : dans une fonction déclarée `stable`, c'est une promesse rompue, et ça
  -- casse au premier appel depuis une transaction en lecture seule. Un CTE se
  -- référence autant de fois qu'on veut dans la même requête.
  with classement as (
    select c.user_id, p.pseudo,
           round(avg(c.mieux), 1) as moyenne,
           count(*)::int as journees,
           row_number() over (order by avg(c.mieux), count(*) desc, p.pseudo) as place
      from scrutin_jeux_centiles(p_jour_banalo, p_jour_pays, 0) c
      join scrutin_jeux_pseudos p on p.user_id = c.user_id and p.bloque_le is null
     where p_jeu = 'tout' or c.jeu = p_jeu
     group by c.user_id, p.pseudo
    having count(*) >= v_min_journees
  ),
  -- LA PROGRESSION : la même chose, fenêtre reculée d'une semaine. Rien n'est
  -- stocké — on recalcule, et ça coûte deux agrégats sur des tables minuscules.
  alors as (
    select c.user_id,
           row_number() over (order by avg(c.mieux), count(*) desc) as place
      from scrutin_jeux_centiles(p_jour_banalo, p_jour_pays, 7) c
      join scrutin_jeux_pseudos p on p.user_id = c.user_id and p.bloque_le is null
     where p_jeu = 'tout' or c.jeu = p_jeu
     group by c.user_id
    having count(*) >= v_min_journees
  )
  select jsonb_build_object(
    'status',  'ok',
    'joueurs', (select count(*) from classement),
    'lignes',  (select coalesce(jsonb_agg(jsonb_build_object(
                          'place', place, 'pseudo', pseudo, 'moyenne', moyenne,
                          'journees', journees, 'moi', user_id = v_uid
                        ) order by place), '[]'::jsonb)
                  from classement where place <= v_max),
    -- Ma ligne sort même hors de la tête de liste : un classement où l'on ne se
    -- trouve pas est un classement qui parle des autres.
    'moi',     (select jsonb_build_object('place', place, 'pseudo', pseudo,
                                          'moyenne', moyenne, 'journees', journees)
                  from classement where user_id = v_uid),
    'avant',   (select place from alors where user_id = v_uid)
  ) into v_out;

  return v_out;
end $function$;

-- ══════════════════════════════════════════════════════════════ 5. la Régie
--
-- ⚠️ C'EST LA CONTREPARTIE DU PSEUDO PERSISTANT, et sans elle la décision ne
-- tient pas. Un nom lisible par tous les joueurs, qui survit aux journées, exige
-- quelqu'un pour en répondre — c'est le compte — et quelqu'un pour agir : la
-- Régie, gardée par l'allowlist `scrutin_is_platform_admin()` comme le reste.
create or replace function public.scrutin_admin_pseudos(p_max int default 200)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare v_out jsonb;
begin
  if not public.scrutin_is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'userId', user_id, 'pseudo', pseudo,
           'creeLe', cree_le, 'bloque', bloque_le is not null
         ) order by cree_le desc), '[]'::jsonb)
    into v_out
    from (select * from scrutin_jeux_pseudos
           order by cree_le desc
           limit greatest(1, least(coalesce(p_max, 200), 500))) t;
  return jsonb_build_object('status', 'ok', 'pseudos', v_out);
end $function$;

create or replace function public.scrutin_admin_pseudo_bloquer(p_user uuid, p_bloque boolean)
returns jsonb language plpgsql volatile security definer set search_path to 'public' as $function$
declare v_admin uuid := auth.uid();
begin
  if not public.scrutin_is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update scrutin_jeux_pseudos
     set bloque_le  = case when p_bloque then now() end,
         bloque_par = case when p_bloque then v_admin end
   where user_id = p_user;
  if not found then
    return jsonb_build_object('status', 'inconnu');
  end if;
  return jsonb_build_object('status', 'ok');
end $function$;

-- ══════════════════════════════════════════════════════════════ 6. les droits
--
-- ⚠️ Le `revoke` AVANT le `grant` : PUBLIC détient l'EXECUTE par défaut.
revoke all on function public.scrutin_jeux_pseudo_poser(text) from public, anon, authenticated;
revoke all on function public.scrutin_jeux_pseudo_moi() from public, anon, authenticated;
revoke all on function public.scrutin_jeux_cumul(int, int, text) from public, anon, authenticated;
revoke all on function public.scrutin_admin_pseudos(int) from public, anon, authenticated;
revoke all on function public.scrutin_admin_pseudo_bloquer(uuid, boolean) from public, anon, authenticated;

-- Poser un pseudo et lire le sien exigent un compte, les fonctions le vérifient.
grant execute on function public.scrutin_jeux_pseudo_poser(text) to authenticated;
grant execute on function public.scrutin_jeux_pseudo_moi() to authenticated;
-- ⚠️ LE CLASSEMENT SE LIT SANS COMPTE. Il faut un compte pour Y FIGURER, pas
-- pour le regarder : un classement qu'on ne peut pas voir avant de s'inscrire ne
-- donne aucune raison de s'inscrire.
grant execute on function public.scrutin_jeux_cumul(int, int, text) to anon, authenticated;
grant execute on function public.scrutin_admin_pseudos(int) to authenticated;
grant execute on function public.scrutin_admin_pseudo_bloquer(uuid, boolean) to authenticated;
