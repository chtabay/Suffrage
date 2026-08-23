-- UN SEUL NOM PAR COMPTE, ET LA RÉGIE LE TIENT PARTOUT.
--
-- Signalé par un joueur : « j'ai associé un pseudo sur mon compte (« Le duc »),
-- or après avoir renseigné le Banalo du jour il m'a été proposé de préciser un
-- pseudo, au lieu de le reprendre ». Vérifié en base, et c'est exactement ça :
-- son compte porte `Le duc` dans `scrutin_jeux_pseudos` depuis le 22/08, et il a
-- RETAPÉ `Le duc` dans `scrutin_banalo_noms` pour la journée 3.
--
-- Trois dépôts de nom coexistaient :
--   `scrutin_jeux_pseudos`          — le compte, permanent, PRISE RÉGIE
--   `scrutin_banalo_noms`           — une journée, texte libre, aucune prise
--   `scrutin_banalo_tablee_membres` — une tablée,  texte libre, aucune prise
--
-- ⚠️ ET LE TROISIÈME DÉFAUT EST LE PLUS GRAVE : LA PRISE DE LA RÉGIE NE
-- COUVRAIT QU'UN DES TROIS. `20260825-jeux-pseudo-et-cumul.sql` a franchi la
-- ligne du nom permanent en écrivant noir sur blanc la contrepartie qu'elle
-- réclamait — « un compte derrière chaque nom, ET UNE PRISE DANS LA RÉGIE pour
-- le retirer ». Or `scrutin_banalo_nom_deposer` ne regardait jamais `bloque_le` :
-- un pseudo retiré par un modérateur pouvait continuer à publier le MÊME texte
-- libre au tableau public, tous les jours, indéfiniment. La prise était un mur
-- avec une porte à côté.
--
-- Quatrième, mineur mais du même tonneau : deux règlements pour la même chose.
-- `pseudo` fait 2 à 20 caractères, espaces normalisés, caractères de contrôle
-- refusés ; `nom` faisait 1 à 24, sans rien de tout ça.
--
-- LA REPRISE : pour qui a un compte, le pseudo de compte EST le nom, partout.
-- Le tableau du jour et la tablée ne stockent plus de texte, ils stockent le
-- COMPTE, et le nom se résout à la lecture. Trois choses viennent avec, sans
-- qu'on ait à les écrire :
--   · un seul endroit où en changer ;
--   · la prise de la Régie atteint tous les tableaux d'un coup ;
--   · un nom retiré ne reste pas affiché sur les journées passées — c'est le
--     raisonnement déjà écrit pour le podium des saisons (« le pseudo n'est pas
--     gelé avec la médaille — le geler retirerait à la Régie sa prise »).
--
-- ⚠️ SANS COMPTE, RIEN NE CHANGE : liste fermée de 600 noms, par journée,
-- purgée à trente jours. C'est cette moitié-là qui portait la justification de
-- l'absence de modération, et on n'y touche pas.
--
-- Mesuré avant d'écrire : UNE seule ligne existe dans les deux tables réunies
-- (celle du signalement). La reprise est donc gratuite aujourd'hui ; elle ne le
-- sera plus dans un mois.

-- ═══════════════════════════════════════ 1. la règle du pseudo, en UN endroit
--
-- ⚠️ ELLE ÉTAIT SUR LE POINT D'EXISTER EN QUATRE EXEMPLAIRES. C'est le chemin
-- qu'avaient pris la règle du mot orphelin (appliquée à deux endroits le
-- 22 août) et le calcul des scores d'une journée (trois exemplaires avant d'être
-- sorti en base). On la coupe avant.
create or replace function public.scrutin_jeux_pseudo_net(p_pseudo text)
returns text language sql immutable set search_path to 'public' as $function$
  -- ⚠️ ON NORMALISE LES ESPACES AVANT DE MESURER. « a          b » fait douze
  -- caractères et se lit « a b » : sans ça, la borne de longueur mesure du vide.
  select btrim(regexp_replace(coalesce(p_pseudo, ''), '\s+', ' ', 'g'));
$function$;

/**
 * Le nom sous lequel CE compte figure, en adoptant `p_nom` s'il n'en a pas.
 *
 * Rend `{status, pseudo}`. `ok` porte le pseudo ; tout autre statut est un refus
 * que l'écran doit dire en toutes lettres.
 *
 * ⚠️ UN PSEUDO EXISTANT N'EST JAMAIS ÉCRASÉ PAR `p_nom`. C'est le cœur de la
 * correction : ce que le joueur tape pour aujourd'hui ne doit pas réécrire son
 * nom permanent — il doit être IGNORÉ au profit de celui qu'il a déjà posé. Un
 * client qui envoie encore du texte libre (le déployé, tant que le nouveau n'est
 * pas parti) obtient donc exactement le comportement demandé : on reprend son
 * pseudo.
 */
create or replace function public.scrutin_jeux_pseudo_resoudre(p_nom text)
returns jsonb language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_r   record;
  v_net text;
begin
  if v_uid is null then
    return jsonb_build_object('status', 'compte');
  end if;

  select pseudo, bloque_le into v_r from scrutin_jeux_pseudos where user_id = v_uid;

  if found then
    -- ⚠️ UN PSEUDO RETIRÉ NE SE REPUBLIE NULLE PART. C'est la prise qui
    -- manquait : sans ce test, le tableau du jour rouvrait au blocage une porte
    -- que la Régie croyait fermée.
    if v_r.bloque_le is not null then
      return jsonb_build_object('status', 'bloque');
    end if;
    return jsonb_build_object('status', 'ok', 'pseudo', v_r.pseudo);
  end if;

  -- Pas encore de pseudo : celui qu'on tape ici devient CELUI DU COMPTE.
  if p_nom is null then
    return jsonb_build_object('status', 'pseudo');
  end if;
  v_net := public.scrutin_jeux_pseudo_net(p_nom);
  -- Les caractères de contrôle ne s'affichent pas mais cassent une ligne.
  if v_net ~ '[[:cntrl:]]' then return jsonb_build_object('status', 'refus'); end if;
  if length(v_net) < 2  then return jsonb_build_object('status', 'court'); end if;
  if length(v_net) > 20 then return jsonb_build_object('status', 'long');  end if;

  begin
    insert into scrutin_jeux_pseudos (user_id, pseudo) values (v_uid, v_net);
  exception when unique_violation then
    return jsonb_build_object('status', 'pris');
  end;
  return jsonb_build_object('status', 'ok', 'pseudo', v_net);
end $function$;

-- `scrutin_jeux_pseudo_poser` reprend la normalisation partagée. Elle garde son
-- `do update`, elle : POSER un pseudo écrase le précédent — c'est son métier, et
-- c'est aussi ce qui lève un blocage.
create or replace function public.scrutin_jeux_pseudo_poser(p_pseudo text)
returns jsonb language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_net text;
begin
  if v_uid is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_net := public.scrutin_jeux_pseudo_net(p_pseudo);
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

-- ═══════════════════════════ 2. une ligne peut désormais n'avoir AUCUN libellé
--
-- « Ni index, ni texte » veut dire « mon nom est celui de mon compte ». La
-- contrainte exigeait exactement l'un des deux ; elle exige maintenant au plus
-- l'un des deux, et un compte quand il n'y en a aucun.
alter table public.scrutin_banalo_noms drop constraint if exists banalo_nom_un_seul;
alter table public.scrutin_banalo_noms add constraint banalo_nom_un_seul
  check (num_nonnulls(nom_index, nom) <= 1
         and (num_nonnulls(nom_index, nom) = 1 or user_id is not null));

alter table public.scrutin_banalo_tablee_membres drop constraint if exists banalo_tablee_nom_un_seul;
alter table public.scrutin_banalo_tablee_membres add constraint banalo_tablee_nom_un_seul
  check (num_nonnulls(nom_index, nom) <= 1
         and (num_nonnulls(nom_index, nom) = 1 or user_id is not null));

-- ═══════════════════════════════════ 3. les lignes déjà déposées se rattachent
--
-- ⚠️ ON ADOPTE LE TEXTE COMME PSEUDO QUAND LE COMPTE N'EN A PAS. C'est ce que le
-- joueur a écrit et voulu ; le jeter le ferait disparaître du tableau sans un
-- mot. Quand le compte a DÉJÀ un pseudo, on jette le texte : le pseudo gagne.
-- Et si le texte est déjà pris par un autre compte, la ligne garde son libellé
-- — une reprise ne doit renommer personne.
do $migration$
declare r record; v_net text;
begin
  for r in
    select n.jour, n.langue, n.jeton, n.user_id, n.nom
      from public.scrutin_banalo_noms n
     where n.user_id is not null and n.nom is not null
  loop
    if exists (select 1 from public.scrutin_jeux_pseudos p where p.user_id = r.user_id) then
      update public.scrutin_banalo_noms set nom = null
       where jour = r.jour and langue = r.langue and jeton = r.jeton;
    else
      v_net := public.scrutin_jeux_pseudo_net(r.nom);
      if length(v_net) between 2 and 20 and v_net !~ '[[:cntrl:]]'
         and not exists (select 1 from public.scrutin_jeux_pseudos p
                          where lower(btrim(p.pseudo)) = lower(v_net)) then
        insert into public.scrutin_jeux_pseudos (user_id, pseudo) values (r.user_id, v_net);
        update public.scrutin_banalo_noms set nom = null
         where jour = r.jour and langue = r.langue and jeton = r.jeton;
      end if;
    end if;
  end loop;

  for r in
    select m.tablee_id, m.jeton, m.user_id, m.nom
      from public.scrutin_banalo_tablee_membres m
     where m.user_id is not null and m.nom is not null
  loop
    if exists (select 1 from public.scrutin_jeux_pseudos p where p.user_id = r.user_id) then
      update public.scrutin_banalo_tablee_membres set nom = null
       where tablee_id = r.tablee_id and jeton = r.jeton;
    else
      v_net := public.scrutin_jeux_pseudo_net(r.nom);
      if length(v_net) between 2 and 20 and v_net !~ '[[:cntrl:]]'
         and not exists (select 1 from public.scrutin_jeux_pseudos p
                          where lower(btrim(p.pseudo)) = lower(v_net)) then
        insert into public.scrutin_jeux_pseudos (user_id, pseudo) values (r.user_id, v_net);
        update public.scrutin_banalo_tablee_membres set nom = null
         where tablee_id = r.tablee_id and jeton = r.jeton;
      end if;
    end if;
  end loop;
end $migration$;

-- ═══════════════════════════════════════════════ 4. déposer : les trois portes
--
-- Le contrat, désormais commun aux trois :
--   index seul  → liste fermée, avec ou sans compte. Inchangé.
--   rien        → « mon nom est mon pseudo de compte ». Exige un compte.
--   texte libre → routé vers le COMPTE, jamais stocké ici.
create or replace function public.scrutin_banalo_nom_deposer(
  p_jeton text, p_jour int, p_langue text, p_index int, p_nom text
) returns jsonb language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_nom text := nullif(btrim(p_nom), '');
  v_res jsonb;
begin
  if p_jeton !~ '^[a-z0-9]{10,40}$' or p_langue not in ('fr','en','es','pcm') then
    return jsonb_build_object('status', 'refus');
  end if;
  -- ⚠️ PAS LES DEUX. On ne « corrige » pas un appel qui envoie index ET texte :
  -- c'est un client cassé, et le lui dire vaut mieux que de choisir à sa place.
  if num_nonnulls(p_index, v_nom) > 1 then
    return jsonb_build_object('status', 'refus');
  end if;

  -- Ni l'un ni l'autre, ou du texte : dans les deux cas c'est le compte qui
  -- nomme. `resoudre` reprend le pseudo existant, ou adopte le texte.
  if p_index is null then
    v_res := public.scrutin_jeux_pseudo_resoudre(v_nom);
    if v_res->>'status' <> 'ok' then return v_res; end if;
  end if;

  begin
    insert into scrutin_banalo_noms (jour, langue, jeton, user_id, nom_index, nom)
    values (p_jour, p_langue, p_jeton, v_uid, p_index, null);
  exception
    when unique_violation then
      if exists (select 1 from scrutin_banalo_noms
                  where jour = p_jour and langue = p_langue and jeton = p_jeton) then
        return jsonb_build_object('status', 'deja');
      end if;
      return jsonb_build_object('status', 'pris');
  end;

  return jsonb_build_object('status', 'ok');
end $function$;

create or replace function public.scrutin_banalo_tablee_creer(
  p_jeton text, p_index int, p_nom text
) returns jsonb language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_max_par_jeton constant int := 10;
  v_uid  uuid := auth.uid();
  v_nom  text := nullif(btrim(p_nom), '');
  v_res  jsonb;
  v_code text;
  v_id   uuid;
begin
  if coalesce(p_jeton, '') !~ '^[a-z0-9]{10,40}$' then
    return jsonb_build_object('status', 'refus');
  end if;
  if num_nonnulls(p_index, v_nom) > 1 then
    return jsonb_build_object('status', 'refus');
  end if;
  if p_index is null then
    v_res := public.scrutin_jeux_pseudo_resoudre(v_nom);
    if v_res->>'status' <> 'ok' then return v_res; end if;
  end if;
  if (select count(*) from scrutin_banalo_tablee_membres where jeton = p_jeton) >= v_max_par_jeton then
    return jsonb_build_object('status', 'trop');
  end if;

  -- Le code se tire jusqu'à ce qu'il soit libre. À 2,8 × 10¹⁴ possibilités, la
  -- deuxième itération n'arrivera jamais ; la boucle est là par principe.
  loop
    v_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
    exit when not exists (select 1 from scrutin_banalo_tablees where code = v_code);
  end loop;

  insert into scrutin_banalo_tablees (code) values (v_code) returning id into v_id;
  insert into scrutin_banalo_tablee_membres (tablee_id, jeton, user_id, nom_index, nom)
  values (v_id, p_jeton, v_uid, p_index, null);

  return jsonb_build_object('status', 'ok', 'code', v_code);
end $function$;

create or replace function public.scrutin_banalo_tablee_rejoindre(
  p_jeton text, p_code text, p_index int, p_nom text
) returns jsonb language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  -- ⚠️ TRENTE, ET C'EST LA DÉFINITION DE L'OBJET. Une tablée est un groupe de
  -- gens qu'on connaît ; au-delà c'est un classement public, et il en existe
  -- déjà un — le tableau du jour, ouvert à tout le monde.
  v_max_membres constant int := 30;
  v_uid uuid := auth.uid();
  v_nom text := nullif(btrim(p_nom), '');
  v_res jsonb;
  v_id  uuid;
begin
  if coalesce(p_jeton, '') !~ '^[a-z0-9]{10,40}$'
     or coalesce(p_code, '') !~ '^[0-9a-f]{12}$' then
    return jsonb_build_object('status', 'refus');
  end if;
  if num_nonnulls(p_index, v_nom) > 1 then
    return jsonb_build_object('status', 'refus');
  end if;
  if p_index is null then
    v_res := public.scrutin_jeux_pseudo_resoudre(v_nom);
    if v_res->>'status' <> 'ok' then return v_res; end if;
  end if;

  select id into v_id from scrutin_banalo_tablees where code = p_code;
  if v_id is null then
    return jsonb_build_object('status', 'inconnue');
  end if;
  if exists (select 1 from scrutin_banalo_tablee_membres
              where tablee_id = v_id and jeton = p_jeton) then
    return jsonb_build_object('status', 'deja');
  end if;
  if (select count(*) from scrutin_banalo_tablee_membres where tablee_id = v_id) >= v_max_membres then
    return jsonb_build_object('status', 'pleine');
  end if;

  begin
    insert into scrutin_banalo_tablee_membres (tablee_id, jeton, user_id, nom_index, nom)
    values (v_id, p_jeton, v_uid, p_index, null);
  exception when unique_violation then
    return jsonb_build_object('status', 'pris');
  end;

  return jsonb_build_object('status', 'ok');
end $function$;

-- ═══════════════════════════════════════════════ 5. lire : le nom se RÉSOUT
--
-- ⚠️ ET UN PSEUDO RETIRÉ DISPARAÎT DES TABLEAUX, y compris des journées
-- passées. C'est la moitié qui donne son sens à la prise de la Régie : bloquer
-- un nom qui resterait affiché partout ne serait pas le retirer.
--
-- ⚠️ LE `left join` NE FILTRE PAS SUR `bloque_le`, ET C'EST DÉLIBÉRÉ. Écrit
-- `join ... and p.bloque_le is null`, un compte bloqué rend `p` vide, donc
-- `coalesce(p.pseudo, n.nom)` RETOMBE sur l'ancien texte libre d'une ligne
-- historique — et la porte qu'on vient de fermer se rouvre en silence sur les
-- seules lignes qui la connaissaient. On joint sans condition et on décide
-- ensuite, en trois cas nommés.
--
-- ⚠️ ET L'INDEX DE LA LISTE FERMÉE L'EMPORTE : un joueur connecté qui s'était
-- inscrit sous « Renard de minuit » garde ce nom-là. Sans ce premier cas, la
-- base rendrait un libellé (le pseudo) que l'écran n'affiche pas — il montre
-- l'index —, et les deux se contrediraient sans que rien ne le dise.
create or replace function public.scrutin_banalo_tableau(
  p_jeton text, p_jour int, p_langue text, p_theme text
) returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_max constant int := 10;
  v_min constant int := 2;
  v_inscrits int;
  v_inscrit boolean;
  v_bloque boolean;
  v_lignes jsonb;
  v_moi jsonb;
begin
  with nomme as (
    select n.jeton, n.nom_index, n.cree_le,
           case
             when n.nom_index is not null then null
             when p.bloque_le is not null then null
             else coalesce(p.pseudo, n.nom)
           end as libelle
      from scrutin_banalo_noms n
      left join scrutin_jeux_pseudos p on p.user_id = n.user_id
     where n.jour = p_jour and n.langue = p_langue
  )
  select count(*) into v_inscrits
    from nomme where nom_index is not null or libelle is not null;

  select exists(select 1 from scrutin_banalo_noms
                 where jour = p_jour and langue = p_langue and jeton = p_jeton)
    into v_inscrit;
  select exists(select 1 from scrutin_banalo_noms n
                  join scrutin_jeux_pseudos p on p.user_id = n.user_id
                 where n.jour = p_jour and n.langue = p_langue and n.jeton = p_jeton
                   and n.nom_index is null and p.bloque_le is not null)
    into v_bloque;

  if v_inscrits < v_min then
    return jsonb_build_object('status', 'ok', 'inscrits', v_inscrits,
                              'inscrit', v_inscrit, 'bloque', v_bloque,
                              'lignes', '[]'::jsonb);
  end if;

  with nomme as (
    select n.jeton, n.nom_index, n.cree_le,
           case
             when n.nom_index is not null then null
             when p.bloque_le is not null then null
             else coalesce(p.pseudo, n.nom)
           end as libelle
      from scrutin_banalo_noms n
      left join scrutin_jeux_pseudos p on p.user_id = n.user_id
     where n.jour = p_jour and n.langue = p_langue
  ), inscrits as (
    select v.jeton, v.nom_index, v.libelle, s.score,
           row_number() over (order by s.score desc, v.cree_le) as place
      from nomme v
      join scrutin_banalo_scores(p_jour, p_langue, p_theme) s on s.jeton = v.jeton
     where v.nom_index is not null or v.libelle is not null
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'index', nom_index, 'nom', libelle, 'score', score, 'moi', jeton = p_jeton
    ) order by place) filter (where place <= v_max), '[]'::jsonb),
    -- ⚠️ LA LIGNE DU JOUEUR SORT MÊME HORS DE LA TÊTE DE LISTE.
    (select jsonb_build_object('index', nom_index, 'nom', libelle, 'score', score, 'place', place)
       from inscrits where jeton = p_jeton and place > v_max)
    into v_lignes, v_moi
    from inscrits;

  return jsonb_build_object(
    'status', 'ok', 'inscrits', v_inscrits, 'inscrit', v_inscrit, 'bloque', v_bloque,
    'lignes', v_lignes, 'moi', v_moi
  );
end $function$;

create or replace function public.scrutin_banalo_tablee_du_jour(
  p_jeton text, p_jour int, p_langue text, p_theme text
) returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_joue boolean;
  v_out  jsonb;
begin
  if coalesce(p_jeton, '') !~ '^[a-z0-9]{10,40}$' then
    return jsonb_build_object('status', 'ok', 'tablees', '[]'::jsonb);
  end if;

  select exists (
    select 1 from scrutin_banalo_reponses
     where jeton = p_jeton and jour = p_jour and langue = p_langue and p_theme is null
    union all
    select 1 from scrutin_banalo_mots
     where jeton = p_jeton and jour = p_jour and langue = p_langue and theme = p_theme
  ) into v_joue;

  with miennes as (
    select t.id, t.code
      from scrutin_banalo_tablees t
      join scrutin_banalo_tablee_membres m on m.tablee_id = t.id
     where m.jeton = p_jeton
  ), membres as (
    select mi.id, mi.code, m.jeton, m.nom_index, m.cree_le,
           case
             when m.nom_index is not null then null
             when p.bloque_le is not null then null
             else coalesce(p.pseudo, m.nom)
           end as libelle,
           -- « A joué », TOUTES LANGUES CONFONDUES.
           exists (select 1 from scrutin_banalo_reponses r
                    where r.jeton = m.jeton and r.jour = p_jour)
        or exists (select 1 from scrutin_banalo_mots w
                    where w.jeton = m.jeton and w.jour = p_jour) as a_joue,
           -- Le score, seulement dans MA foule, et seulement si j'ai joué.
           case when v_joue then s.score end as score
      from miennes mi
      join scrutin_banalo_tablee_membres m on m.tablee_id = mi.id
      left join scrutin_jeux_pseudos p on p.user_id = m.user_id
      left join scrutin_banalo_scores(p_jour, p_langue, p_theme) s on s.jeton = m.jeton
  )
  select coalesce(jsonb_agg(x order by x->>'code'), '[]'::jsonb) into v_out from (
    select jsonb_build_object(
             'code', code,
             'membres', jsonb_agg(jsonb_build_object(
                 'index', nom_index, 'nom', libelle, 'joue', a_joue,
                 'score', score, 'moi', jeton = p_jeton
               ) order by a_joue desc, score desc nulls last, cree_le)
           ) as x
      from membres
      -- ⚠️ Un membre dont le pseudo est retiré ne s'affiche plus, comme au
      -- tableau. Il RESTE membre : la purge suit les données, pas la modération.
     where nom_index is not null or libelle is not null
     group by id, code
  ) t;

  return jsonb_build_object('status', 'ok', 'joue', v_joue, 'tablees', v_out);
end $function$;

-- ═══════════════════════════════════════════════════════════════ les droits
--
-- ⚠️ `revoke` AVANT `grant` : Postgres donne à PUBLIC un droit d'exécution par
-- défaut sur toute fonction créée. Piège déjà payé plusieurs fois ici.
--
-- ⚠️ `scrutin_jeux_pseudo_resoudre` N'EST PAS UNE PORTE PUBLIQUE : elle ÉCRIT un
-- pseudo de compte. Elle n'est appelée que par les trois fonctions de dépôt, qui
-- sont `security definer` — personne d'autre n'a à l'atteindre.
revoke all on function public.scrutin_jeux_pseudo_net(text) from public, anon, authenticated;
revoke all on function public.scrutin_jeux_pseudo_resoudre(text) from public, anon, authenticated;
