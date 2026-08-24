-- ON PEUT ÉCRIRE SON NOM SANS COMPTE. C'EST UN RENVERSEMENT, PAS UN AJOUT.
--
-- Retour de terrain, urgent : « la proposition de pseudo prégénéré en cas
-- d'absence de compte ne fonctionne pas et les joueurs refusent ». La liste
-- fermée de 600 noms n'était pas une friction qu'on absorbe, c'était un REFUS :
-- on offrait « Renard de minuit » à quelqu'un qui voulait figurer sous son nom,
-- et il ne figurait pas du tout. Un tableau du jour dont personne ne veut est un
-- tableau vide, et c'est ce que mesurait déjà la base — 3 noms sur Banalo, 1 sur
-- Cinq sur cinq, pour 12 joueurs.
--
-- ⚠️ CE FICHIER DÉFAIT UNE DÉCISION ÉCRITE, ET IL FAUT DIRE CE QU'ELLE COÛTE
-- plutôt que de la retirer en silence. `20260823-banalo-noms-et-tableau.sql`
-- posait la règle en CONTRAINTE DE TABLE, et son raisonnement reste vrai mot
-- pour mot :
--
--   « Un champ de pseudo sur un classement public n'est pas un champ d'identité,
--     c'est un canal de publication d'une ligne, adressé à tous les joueurs du
--     jour. Par gravité réelle : du harcèlement visant quelqu'un de précis
--     (« Marie du CM2 pue ») ; des données personnelles déposées sans malice par
--     un enfant, sur un jeu dont la politique déclare une tranche d'âge
--     « enfant » ; puis seulement les insultes. Un filtre de gros mots ne règle
--     que le troisième. »
--
-- Rien de tout cela n'est réfuté ici. Ce qui a changé est l'autre plateau de la
-- balance : la règle avait un coût qu'on croyait payable et qui ne l'était pas.
-- Le propriétaire du dépôt tranche, explicitement : « pouvoir laisser un pseudo
-- libre doit être possible, nous verrons comment cela doit être éventuellement
-- modéré ». La politique de modération est donc REPORTÉE, pas décidée.
--
-- ⚠️ ET « REPORTÉE » N'EST PAS « ABSENTE ». Le §5 de `docs/regularite-des-joueurs.md`
-- fait reposer l'absence de tout signalement sur le modèle de la SALLE — on entre
-- par code, la salle est jetable, tout s'efface en sept jours. Le tableau du jour
-- ne tient qu'une de ces trois propriétés (l'effacement, à trente jours) : il est
-- PUBLIC. On ouvre donc le texte libre AVEC une prise, la plus petite qui rende
-- un retrait possible (§4 plus bas). Ce n'est pas un système de modération, c'est
-- ce sans quoi on ne pourrait rien retirer du tout.
--
-- ⚠️ CE QUI RESTE VRAI ET QU'ON N'A PAS RÉGLÉ : un jeton anonyme ne se bannit
-- pas — on efface son `localStorage` et on revient. On peut retirer un NOM, on ne
-- peut pas écarter une personne. La prise du §4 dit exactement ça et rien de
-- plus.
--
-- ⚠️ LA TABLÉE N'EST PAS DANS LE MÊME CAS, ET ELLE N'AURA PAS DE PRISE. Un
-- groupe s'entre par code, il est jetable, il s'efface quand ses membres n'ont
-- plus de réponse : les TROIS propriétés du modèle de salle y sont intactes, et
-- son nom n'est lu que par les gens qui vous ont invité. C'est le même
-- raisonnement qui autorise Alibi à faire taper des accusations nommées sans
-- bouton de signalement. On y ouvre le texte libre pour la même raison qu'au
-- tableau — le composant d'écran est partagé, et le joueur ne comprendrait pas
-- qu'on lui demande son nom ici et un animal là — mais le retrait ne le vise pas.
--
-- Mesuré avant d'écrire, comme le 07 : `scrutin_banalo_noms` porte 3 lignes et
-- ZÉRO texte libre, `scrutin_banalo_tablee_membres` 0 ligne,
-- `scrutin_game_pays_noms` 1 ligne. Le renversement est gratuit aujourd'hui.

-- ═══════════════════════════════════ 1. la règle du nom, toujours en UN endroit
--
-- ⚠️ ELLE ÉTAIT EN TRAIN DE REDEVENIR TRIPLE. `20260907` avait sorti la
-- normalisation dans `scrutin_jeux_pseudo_net` mais laissé les BORNES recopiées
-- dans `_resoudre` et `_poser` ; le nom libre sans compte en aurait fait une
-- troisième copie, et une quatrième le jour où un troisième jeu demanderait un
-- nom. C'est exactement le chemin qu'avaient pris la règle du mot orphelin et le
-- calcul des scores. On le coupe maintenant, pendant qu'il n'y a que deux
-- copies à réunir.
--
-- Rend `{status, nom}` : `ok` porte le nom normalisé ; `court`, `long` et
-- `refus` sont des refus que l'écran dit en toutes lettres.
create or replace function public.scrutin_jeux_nom_valide(p_nom text)
returns jsonb language plpgsql immutable set search_path to 'public' as $function$
declare v_net text;
begin
  if p_nom is null then return jsonb_build_object('status', 'refus'); end if;
  v_net := public.scrutin_jeux_pseudo_net(p_nom);
  -- Les caractères de contrôle ne s'affichent pas mais cassent une ligne.
  if v_net ~ '[[:cntrl:]]' then return jsonb_build_object('status', 'refus'); end if;
  if length(v_net) < 2  then return jsonb_build_object('status', 'court'); end if;
  if length(v_net) > 20 then return jsonb_build_object('status', 'long');  end if;
  return jsonb_build_object('status', 'ok', 'nom', v_net);
end $function$;

-- Les deux fonctions de pseudo reprennent la règle partagée. Leur comportement
-- ne change pas d'un caractère — c'est le même test, écrit une fois.
create or replace function public.scrutin_jeux_pseudo_resoudre(p_nom text)
returns jsonb language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_r   record;
  v_v   jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('status', 'compte');
  end if;

  select pseudo, bloque_le into v_r from scrutin_jeux_pseudos where user_id = v_uid;

  if found then
    -- ⚠️ UN PSEUDO RETIRÉ NE SE REPUBLIE NULLE PART.
    if v_r.bloque_le is not null then
      return jsonb_build_object('status', 'bloque');
    end if;
    return jsonb_build_object('status', 'ok', 'pseudo', v_r.pseudo);
  end if;

  -- Pas encore de pseudo : celui qu'on tape ici devient CELUI DU COMPTE.
  if p_nom is null then
    return jsonb_build_object('status', 'pseudo');
  end if;
  v_v := public.scrutin_jeux_nom_valide(p_nom);
  if v_v->>'status' <> 'ok' then return v_v; end if;

  begin
    insert into scrutin_jeux_pseudos (user_id, pseudo) values (v_uid, v_v->>'nom');
  exception when unique_violation then
    return jsonb_build_object('status', 'pris');
  end;
  return jsonb_build_object('status', 'ok', 'pseudo', v_v->>'nom');
end $function$;

create or replace function public.scrutin_jeux_pseudo_poser(p_pseudo text)
returns jsonb language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_v   jsonb;
begin
  if v_uid is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_v := public.scrutin_jeux_nom_valide(p_pseudo);
  if v_v->>'status' <> 'ok' then return v_v; end if;

  begin
    insert into scrutin_jeux_pseudos (user_id, pseudo) values (v_uid, v_v->>'nom')
    on conflict (user_id) do update
       set pseudo = excluded.pseudo, bloque_le = null, bloque_par = null;
  exception when unique_violation then
    return jsonb_build_object('status', 'pris');
  end;

  return jsonb_build_object('status', 'ok', 'pseudo', v_v->>'nom');
end $function$;

/**
 * Sous quel nom CE joueur figure, compte ou pas.
 *
 * ⚠️ C'EST LA FONCTION QUI PORTE LE RENVERSEMENT, ET ELLE EST SEULE À LE
 * PORTER. Les trois dépôts (tableau de Banalo, tableau de Cinq sur cinq, tablée)
 * appelaient `scrutin_jeux_pseudo_resoudre` et refusaient sur son `compte` ;
 * ils appellent maintenant celle-ci, et rien d'autre ne change chez eux. Écrire
 * le `if v_uid is null then ... else ...` dans les trois aurait produit trois
 * règles qui dérivent — le défaut que `20260907` venait de corriger.
 *
 * Rend `{status:'ok', pseudo}` pour un compte — la ligne ne stocke alors AUCUN
 * libellé, le nom se résout à la lecture — ou `{status:'ok', libre}` sans
 * compte, et c'est ce texte-là qui va dans la colonne `nom`.
 */
create or replace function public.scrutin_jeux_nom_resoudre(p_nom text)
returns jsonb language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_v jsonb;
begin
  if auth.uid() is not null then
    -- Avec un compte, RIEN NE CHANGE : le pseudo de compte est le nom, partout,
    -- et ce qu'on tape aujourd'hui ne l'écrase jamais (`20260907`).
    return public.scrutin_jeux_pseudo_resoudre(p_nom);
  end if;

  -- Sans compte, le texte est celui de CETTE journée (ou de CETTE tablée) : il
  -- ne devient le pseudo de personne, et il s'efface avec la ligne qui le porte.
  v_v := public.scrutin_jeux_nom_valide(p_nom);
  if v_v->>'status' <> 'ok' then return v_v; end if;
  return jsonb_build_object('status', 'ok', 'libre', v_v->>'nom');
end $function$;

revoke all on function public.scrutin_jeux_nom_valide(text) from public, anon, authenticated;
revoke all on function public.scrutin_jeux_nom_resoudre(text) from public, anon, authenticated;
-- ⚠️ AUCUN `grant` : les deux ne sont appelées que DEPUIS d'autres fonctions
-- `security definer`, qui s'exécutent avec les droits de leur propriétaire.
-- Les exposer offrirait à `anon` un moyen d'adopter un pseudo de compte hors de
-- tout dépôt.

-- ═══════════════════════════════════════════ 2. les tables acceptent le texte
--
-- ⚠️ ON RETIRE LA CONTRAINTE, PAS LA COLONNE NI L'INDEX. `nom` et
-- `banalo_noms_libre_unique` existent depuis le 23/08 et n'ont jamais porté une
-- ligne ; ils redeviennent simplement atteignables. `banalo_nom_un_seul` reste
-- tel quel : un index, OU un texte, OU un compte — jamais deux, jamais rien.
alter table public.scrutin_banalo_noms
  drop constraint if exists banalo_nom_libre_exige_un_compte;
alter table public.scrutin_banalo_tablee_membres
  drop constraint if exists banalo_tablee_nom_libre;

-- ⚠️ ET LES BORNES DE COLONNE S'ALIGNENT SUR LA RÈGLE. Elles disaient 1 à 24
-- quand la règle dit 2 à 20 — deux règlements pour la même chose, exactement le
-- quatrième défaut que `20260907` avait relevé sans le corriger ici. Une borne
-- de colonne est un filet, il ne doit pas être plus large que le sol.
alter table public.scrutin_banalo_noms
  drop constraint if exists scrutin_banalo_noms_nom_check;
alter table public.scrutin_banalo_noms
  add constraint scrutin_banalo_noms_nom_check
  check (length(btrim(nom)) between 2 and 20);
alter table public.scrutin_banalo_tablee_membres
  drop constraint if exists scrutin_banalo_tablee_membres_nom_check;
alter table public.scrutin_banalo_tablee_membres
  add constraint scrutin_banalo_tablee_membres_nom_check
  check (length(btrim(nom)) between 2 and 20);

-- Cinq sur cinq, lui, N'AVAIT PAS de colonne de texte : `20260908` l'avait
-- écartée d'emblée, en appliquant la leçon du 07. Elle naît donc ici, avec la
-- même forme que celle de Banalo.
alter table public.scrutin_game_pays_noms
  add column if not exists nom text;
alter table public.scrutin_game_pays_noms
  drop constraint if exists scrutin_game_pays_noms_nom_check;
alter table public.scrutin_game_pays_noms
  add constraint scrutin_game_pays_noms_nom_check
  check (length(btrim(nom)) between 2 and 20);
-- ⚠️ LA MÊME FORME QUE `banalo_nom_un_seul`, PAS L'ANCIENNE. L'ancienne disait
-- « un index ou un compte » : elle laisserait passer une ligne portant À LA FOIS
-- un index et un texte, c'est-à-dire deux noms dont l'écran n'en montre qu'un.
alter table public.scrutin_game_pays_noms
  drop constraint if exists pays_nom_un_seul;
alter table public.scrutin_game_pays_noms
  add constraint pays_nom_un_seul
  check (num_nonnulls(nom_index, nom) <= 1
         and (num_nonnulls(nom_index, nom) = 1 or user_id is not null));

-- Deux joueurs ne portent pas le même nom écrit le même jour — sinon deux lignes
-- indistinctes au tableau. Pas de `langue` ici : le tableau de Cinq sur cinq est
-- global, il n'est pas découpé par langue (`20260908`).
create unique index if not exists pays_noms_libre_unique
  on public.scrutin_game_pays_noms (jour, lower(btrim(nom))) where nom is not null;

-- ═════════════════════════════════════ 3. les trois dépôts, et la lecture
--
-- Une seule ligne change dans chacun : `pseudo_resoudre` devient
-- `nom_resoudre`, et le texte qu'elle rend descend dans la colonne `nom`. Les
-- corps sont repris À L'IDENTIQUE pour le reste — md5 relevé avant écriture,
-- comme pour `20260911`. On ne réécrit pas une fonction de mémoire.
create or replace function public.scrutin_banalo_nom_deposer(
  p_jeton text, p_jour int, p_langue text, p_index int, p_nom text
) returns jsonb language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_nom text := nullif(btrim(p_nom), '');
  v_res jsonb;
  v_libre text;
begin
  if p_jeton !~ '^[a-z0-9]{10,40}$' or p_langue not in ('fr','en','es','pcm') then
    return jsonb_build_object('status', 'refus');
  end if;
  -- ⚠️ PAS LES DEUX. On ne « corrige » pas un appel qui envoie index ET texte :
  -- c'est un client cassé, et le lui dire vaut mieux que de choisir à sa place.
  if num_nonnulls(p_index, v_nom) > 1 then
    return jsonb_build_object('status', 'refus');
  end if;

  -- Pas d'index : c'est le compte qui nomme, ou le texte libre. `nom_resoudre`
  -- tranche — et elle seule, pour que les trois dépôts ne divergent pas.
  if p_index is null then
    v_res := public.scrutin_jeux_nom_resoudre(v_nom);
    if v_res->>'status' <> 'ok' then return v_res; end if;
    v_libre := v_res->>'libre';
  end if;

  begin
    insert into scrutin_banalo_noms (jour, langue, jeton, user_id, nom_index, nom)
    values (p_jour, p_langue, p_jeton, v_uid, p_index, v_libre);
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

create or replace function public.scrutin_game_pays_nom_deposer(
  p_jour int, p_jeton text, p_index int, p_nom text
) returns jsonb language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_nom text := nullif(btrim(p_nom), '');
  v_res jsonb;
  v_libre text;
begin
  if coalesce(p_jeton, '') !~ '^[a-z0-9]{10,40}$' then
    return jsonb_build_object('status', 'refus');
  end if;
  -- ⚠️ PAS LES DEUX. Un client qui envoie index ET texte est cassé, et le lui
  -- dire vaut mieux que de choisir à sa place.
  if num_nonnulls(p_index, v_nom) > 1 then
    return jsonb_build_object('status', 'refus');
  end if;

  if p_index is null then
    v_res := public.scrutin_jeux_nom_resoudre(v_nom);
    if v_res->>'status' <> 'ok' then return v_res; end if;
    v_libre := v_res->>'libre';
  end if;

  begin
    insert into scrutin_game_pays_noms (jour, jeton, user_id, nom_index, nom)
    values (p_jour, p_jeton, v_uid, p_index, v_libre);
  exception
    when unique_violation then
      if exists (select 1 from scrutin_game_pays_noms
                  where jour = p_jour and jeton = p_jeton) then
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
  v_libre text;
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
    v_res := public.scrutin_jeux_nom_resoudre(v_nom);
    if v_res->>'status' <> 'ok' then return v_res; end if;
    v_libre := v_res->>'libre';
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
  values (v_id, p_jeton, v_uid, p_index, v_libre);

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
  v_libre text;
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
    v_res := public.scrutin_jeux_nom_resoudre(v_nom);
    if v_res->>'status' <> 'ok' then return v_res; end if;
    v_libre := v_res->>'libre';
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
    values (v_id, p_jeton, v_uid, p_index, v_libre);
  exception when unique_violation then
    return jsonb_build_object('status', 'pris');
  end;

  return jsonb_build_object('status', 'ok');
end $function$;

-- ⚠️ LE TABLEAU DE CINQ SUR CINQ NE SAVAIT PAS LIRE UN TEXTE, ET C'EST LE PIÈGE
-- DE CE FICHIER. Il résolvait `else p.pseudo` — juste tant que la table n'avait
-- pas de colonne `nom`. Sans cette ligne, un joueur sans compte déposerait son
-- nom, la base l'accepterait, et il n'apparaîtrait NULLE PART : `libelle` vaut
-- `null`, donc il est compté hors des inscrits et absent de la liste. Le dépôt
-- répondrait « ok » et l'écran montrerait un tableau où il ne figure pas.
-- Banalo, lui, faisait déjà `coalesce(p.pseudo, n.nom)` depuis le 07.
--
-- ⚠️ ET LE `left join` NE FILTRE TOUJOURS PAS SUR `bloque_le` : écrit
-- `join ... and p.bloque_le is null`, un compte bloqué rendrait la jointure vide
-- et `coalesce` retomberait sur le texte libre d'une ligne historique — la porte
-- qu'on ferme se rouvrirait sur les seules lignes qui la connaissent. On joint
-- sans condition et on tranche ensuite, en trois cas nommés.
create or replace function public.scrutin_game_pays_tableau(
  p_jour int, p_jeton text
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
  if coalesce(p_jeton, '') !~ '^[a-z0-9]{10,40}$' then
    return jsonb_build_object('status', 'refus');
  end if;

  with nomme as (
    select n.jeton, n.nom_index, n.cree_le,
           case
             when n.nom_index is not null then null
             when p.bloque_le is not null then null
             else coalesce(p.pseudo, n.nom)
           end as libelle,
           e.essais
      from scrutin_game_pays_noms n
      left join scrutin_jeux_pseudos p on p.user_id = n.user_id
      left join lateral (
        select r.essais from scrutin_game_pays_results r
         where r.jour = n.jour
           and (r.jeton = n.jeton or (n.user_id is not null and r.user_id = n.user_id))
         order by r.essais
         limit 1
      ) e on true
     where n.jour = p_jour
  )
  select count(*) into v_inscrits
    from nomme where essais is not null and (nom_index is not null or libelle is not null);

  select exists(select 1 from scrutin_game_pays_noms where jour = p_jour and jeton = p_jeton)
    into v_inscrit;
  select exists(select 1 from scrutin_game_pays_noms n
                  join scrutin_jeux_pseudos p on p.user_id = n.user_id
                 where n.jour = p_jour and n.jeton = p_jeton
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
           end as libelle,
           e.essais
      from scrutin_game_pays_noms n
      left join scrutin_jeux_pseudos p on p.user_id = n.user_id
      left join lateral (
        select r.essais from scrutin_game_pays_results r
         where r.jour = n.jour
           and (r.jeton = n.jeton or (n.user_id is not null and r.user_id = n.user_id))
         order by r.essais
         limit 1
      ) e on true
     where n.jour = p_jour
  ), inscrits as (
    -- ⚠️ LE MEILLEUR EST LE PLUS PETIT NOMBRE D'ESSAIS — l'inverse de Banalo, où
    -- le meilleur score est le plus grand. Le copier-coller retourne ça en
    -- silence, et le tableau se lirait à l'envers sans que rien ne le dise.
    --
    -- ⚠️ ET ON NE DÉPARTAGE PAS AU TEMPS. `secondes` est mesuré et ne classe
    -- rien : on joue une fois pour trouver le pays, on rejoue en 1 essai et
    -- 8 secondes. C'est la date du dépôt du nom qui stabilise l'ordre, comme
    -- chez Banalo.
    select v.jeton, v.nom_index, v.libelle, v.essais,
           row_number() over (order by v.essais, v.cree_le) as place
      from nomme v
     where v.essais is not null and (v.nom_index is not null or v.libelle is not null)
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'index', nom_index, 'nom', libelle, 'essais', essais, 'moi', jeton = p_jeton
    ) order by place) filter (where place <= v_max), '[]'::jsonb),
    -- ⚠️ LA LIGNE DU JOUEUR SORT MÊME HORS DE LA TÊTE DE LISTE : un tableau où
    -- l'on ne se trouve pas est un tableau qui parle des autres.
    (select jsonb_build_object('index', nom_index, 'nom', libelle, 'essais', essais, 'place', place)
       from inscrits where jeton = p_jeton and place > v_max)
    into v_lignes, v_moi
    from inscrits;

  return jsonb_build_object(
    'status', 'ok', 'inscrits', v_inscrits, 'inscrit', v_inscrit, 'bloque', v_bloque,
    'lignes', v_lignes, 'moi', v_moi
  );
end $function$;

-- ═══════════════════════════════════════════════ 4. la prise, et rien de plus
--
-- ⚠️ CE N'EST PAS UN SYSTÈME DE MODÉRATION, ET LE CONFONDRE AVEC UN SYSTÈME
-- SERAIT PIRE QUE DE N'EN AVOIR AUCUN. Il n'y a ni signalement, ni file, ni
-- notification, ni sanction : rien qui ressemble à ce que la Régie fait des
-- scrutins. Il y a DEUX verbes, réservés à l'allowlist `scrutin_admins`, qui
-- rendent un retrait possible. La politique — qui regarde, quand, sur quel
-- critère — est reportée, et c'est le propriétaire du dépôt qui la tranchera.
--
-- ⚠️ ON RETIRE UN NOM, PAS UN JOUEUR, et l'écart est réel : un jeton anonyme ne
-- se bannit pas, on efface son `localStorage` et on revient déposer le même
-- texte cinq minutes plus tard. Promettre autre chose ici serait mentir au
-- prochain agent.
--
-- ⚠️ ET ÇA NE TOUCHE PAS LES TABLÉES. Un nom de tablée n'est lu que par les gens
-- qui vous ont invité, on y entre par code, elle est jetable, elle s'efface avec
-- ses membres : les trois propriétés du modèle de salle y sont intactes, et ce
-- sont elles qui payent l'absence de modération partout ailleurs dans les jeux
-- de groupe. Ce qu'on ouvre ici est le PUBLIC, donc c'est le public qu'on
-- outille.

/**
 * Les noms écrits (sans compte) déposés aux deux tableaux publics, récents d'abord.
 *
 * ⚠️ ELLE SUIT LES CONVENTIONS DE LA RÉGIE, PAS LES MIENNES : préfixe
 * `scrutin_admin_`, refus par `raise exception 'forbidden'` (et non un statut
 * rendu), plafond borné des deux côtés. `scrutin_admin_pseudos` existe déjà
 * juste à côté, dans l'onglet « Jeux » ; une deuxième liste de noms qui se
 * lirait autrement inviterait à écrire deux écrans au lieu d'un.
 */
create or replace function public.scrutin_admin_noms_libres(p_max int default 200)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare v_out jsonb;
begin
  if not public.scrutin_is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'jeu', jeu, 'jour', jour, 'langue', langue,
           'nom', nom, 'creeLe', cree_le
         ) order by cree_le desc), '[]'::jsonb)
    into v_out
    from (
      select 'banalo-jour' as jeu, jour, langue, nom, cree_le
        from scrutin_banalo_noms where nom is not null
      union all
      -- Pas de langue chez Cinq sur cinq : son tableau est global (`20260908`).
      select 'pays', jour, null, nom, cree_le
        from scrutin_game_pays_noms where nom is not null
      order by cree_le desc
      limit greatest(1, least(coalesce(p_max, 200), 500))
    ) t;
  return jsonb_build_object('status', 'ok', 'noms', v_out);
end $function$;

/**
 * Retire un nom écrit des deux tableaux publics, partout où il figure.
 *
 * ⚠️ IL VISE LE TEXTE, PAS UNE LIGNE, et c'est délibéré : ce qu'un modérateur
 * juge est une CHAÎNE publiée (« Marie du CM2 pue »), et la même chaîne peut
 * avoir été redéposée chaque jour, sur les deux jeux, sous des jetons
 * différents. Retirer une ligne à la fois inviterait à en oublier une.
 *
 * ⚠️ ET ON SUPPRIME LA LIGNE, ON NE VIDE PAS LA COLONNE. La contrainte
 * `..._nom_un_seul` exige un index, un texte ou un compte : une ligne sans aucun
 * des trois n'existe pas — et n'aurait aucun sens, ce serait une place au
 * tableau sans nom pour la porter. C'est aussi ce que fait déjà
 * `scrutin_jeux_pseudo_retirer` (`20260912`) des lignes d'un pseudo de compte.
 *
 * ⚠️ LE JOUEUR N'EST PAS ÉCARTÉ, SA JOURNÉE NON PLUS. Sa réponse, son score, son
 * rang et sa série restent : ce qui part est la PUBLICATION de son nom. Il peut
 * en redéposer un — c'est la limite honnête de cette prise, et elle est écrite
 * en tête de section.
 */
create or replace function public.scrutin_admin_nom_libre_effacer(p_nom text)
returns jsonb language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_cle text;
  v_a int; v_b int;
begin
  if not public.scrutin_is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_cle := lower(btrim(coalesce(p_nom, '')));
  if v_cle = '' then
    return jsonb_build_object('status', 'refus');
  end if;

  delete from scrutin_banalo_noms where nom is not null and lower(btrim(nom)) = v_cle;
  get diagnostics v_a = row_count;
  delete from scrutin_game_pays_noms where nom is not null and lower(btrim(nom)) = v_cle;
  get diagnostics v_b = row_count;

  return jsonb_build_object('status', 'ok', 'efface', v_a + v_b);
end $function$;

-- ⚠️ `revoke ... from public` NE RETIRE PAS LE DROIT DE `anon` : Supabase pose
-- des privilèges PAR DÉFAUT sur les fonctions du schéma public, il faut le
-- NOMMER. Payé le 23/08 sur `scrutin_banalo_adopter`.
revoke all on function public.scrutin_admin_noms_libres(int) from public, anon, authenticated;
revoke all on function public.scrutin_admin_nom_libre_effacer(text) from public, anon, authenticated;
grant execute on function public.scrutin_admin_noms_libres(int) to authenticated;
grant execute on function public.scrutin_admin_nom_libre_effacer(text) to authenticated;
