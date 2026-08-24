-- L'EFFECTIF DU TABLEAU PROMETTAIT DES LIGNES QUI N'EXISTAIENT PAS.
--
-- Signalé : « quand j'ouvre la page de détail, je ne vois pas la liste des
-- classés de la veille alors qu'il est précisé que 2 personnes avaient laissé un
-- pseudo ». Vérifié en base sur la journée 4 : `scrutin_banalo_tableau` rendait
-- `inscrits: 2` et **une seule ligne**.
--
-- ⚠️ LA CAUSE N'EST PAS DANS LE TABLEAU, ELLE EST DANS LE JETON — et c'est la
-- moitié oubliée de `20260910-banalo-journee-suit-le-compte.sql`. Cette
-- migration-là avait posé la règle « le jeton se RÉSOUT avant tout le reste » et
-- l'avait appliquée aux deux fonctions d'ÉTAT. Le NOM, lui, est resté sur le
-- jeton brut du navigateur, côté dépôt comme côté lecture.
--
-- Conséquence, en deux temps, toutes deux observées sur les vraies lignes :
--
--   1. Un joueur connecté ouvre le jeu sur un SECOND appareil. Son état suit son
--      compte, donc l'écran d'après-partie s'affiche — et l'inscription d'office
--      dépose un nom sous le jeton BRUT de cet appareil-là. La journée 4 porte
--      donc DEUX lignes de nom pour le même compte (« Le duc »), sous deux
--      jetons.
--   2. Ce second jeton n'a aucune réponse. La liste du tableau joint
--      `scrutin_banalo_scores` sur le jeton : la ligne n'a pas de score, donc
--      elle ne sort pas. Mais `v_inscrits`, lui, comptait SANS cette jointure.
--
-- D'où « 2 inscrits, 1 ligne ». Sur un compte dont la réponse vit ailleurs, ça
-- va jusqu'à « 2 inscrits, 0 ligne » — le joueur ne voit AUCUN classement là où
-- l'écran lui annonce qu'il y a du monde.
--
-- Trois corrections, et il faut les trois : le client résout le jeton (hors de
-- ce fichier, `src/lib/db/banalo.ts`), l'effectif ne compte plus que ce que la
-- liste peut montrer, et un INDEX empêche un compte de tenir deux lignes.

-- ═════════════════════════════════ 1. l'effectif compte ce que la liste montre
--
-- ⚠️ C'EST UN INVARIANT, PAS UN RÉGLAGE : le nombre annoncé sous une liste doit
-- être le nombre de lignes que cette liste aurait sans sa coupe. Écrits
-- séparément, les deux dérivent — et c'est l'effectif qu'on croit, puisque c'est
-- lui qui est écrit en toutes lettres.
--
-- ⚠️ CINQ SUR CINQ N'AVAIT PAS LE DÉFAUT, ET C'EST VÉRIFIÉ, PAS SUPPOSÉ :
-- `scrutin_game_pays_tableau` compte déjà `where essais is not null and (...)`,
-- c'est-à-dire exactement le filtre de sa liste. Le tableau de Banalo est le
-- plus ancien des deux ; c'est lui qui n'avait pas reçu la leçon.
--
-- Le reste du corps est repris À L'IDENTIQUE de `20260907-jeux-un-seul-pseudo.sql`
-- (md5 relevé avant écriture). On ne réécrit pas une fonction de mémoire.
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
  -- ⚠️ LA MÊME JOINTURE QUE LA LISTE, ET C'EST TOUT LE CORRECTIF. Sans elle, un
  -- nom déposé sous un jeton qui n'a pas répondu était compté ici et absent
  -- là-bas.
  select count(*) into v_inscrits
    from nomme v
    join scrutin_banalo_scores(p_jour, p_langue, p_theme) s on s.jeton = v.jeton
   where v.nom_index is not null or v.libelle is not null;

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

-- ═══════════════════════════════════ 2. le ménage, avant la garde qui l'empêche
--
-- ⚠️ ON GARDE LA LIGNE QUI A UNE RÉPONSE, pas la plus ancienne : c'est celle-là
-- qui porte un score, donc la seule que la liste puisse montrer. À égalité, la
-- première déposée gagne — c'est l'ordre que le tableau utilise déjà pour
-- départager.
--
-- Mesuré avant d'écrire : UNE seule paire existe (journée 4, un compte, deux
-- jetons dont un sans réponse), et `scrutin_game_pays_noms` n'en a aucune.
with doublons as (
  select n.ctid,
         row_number() over (
           partition by n.jour, n.langue, n.user_id
           order by (exists (select 1 from scrutin_banalo_mots w
                              where w.jeton = n.jeton and w.jour = n.jour and w.langue = n.langue)
                  or exists (select 1 from scrutin_banalo_reponses r
                              where r.jeton = n.jeton and r.jour = n.jour and r.langue = n.langue)) desc,
                    n.cree_le
         ) as rang
    from scrutin_banalo_noms n
   where n.user_id is not null
)
delete from scrutin_banalo_noms n
 using doublons d
 where n.ctid = d.ctid and d.rang > 1;

-- ⚠️ LA GARDE EST UN INDEX, PAS UNE CONDITION D'ÉCRAN — la leçon mot pour mot de
-- `20260910`. Résoudre le jeton côté client répare l'affichage, pas la donnée :
-- un vieux client déployé, ou un client modifié, garderait son jeton brut et
-- déposerait une seconde ligne. Un compte tient UNE ligne par journée, point.
--
-- ⚠️ PARTIEL SUR `user_id is not null` : sans compte, il n'y a rien à recoller —
-- deux navigateurs anonymes SONT deux joueurs, et c'est tout ce que le jeu peut
-- en savoir.
create unique index if not exists banalo_noms_par_compte
  on public.scrutin_banalo_noms (jour, langue, user_id) where user_id is not null;

-- Cinq sur cinq n'a pas de colonne `langue` : son tableau est global (`20260908`).
create unique index if not exists pays_noms_par_compte
  on public.scrutin_game_pays_noms (jour, user_id) where user_id is not null;

-- ═════════════════════════════ 3. « déjà déposé » se dit, il ne se devine pas
--
-- ⚠️ SANS CE TEST, L'INDEX RÉPOND « pris ». Le gestionnaire d'`unique_violation`
-- cherche une ligne pour CE jeton ; l'index qu'on vient de poser porte sur le
-- COMPTE, donc aucune ligne ne correspond et le dépôt retombe sur « ce nom est
-- déjà porté aujourd'hui » — un message qui envoie le joueur en choisir un
-- autre, alors qu'il en a déjà un et que rien ne marchera. On le dit avant.
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

  -- ⚠️ UN COMPTE TIENT UNE SEULE LIGNE PAR JOURNÉE, quel que soit l'appareil.
  if v_uid is not null and exists (
    select 1 from scrutin_banalo_noms
     where jour = p_jour and langue = p_langue and user_id = v_uid
  ) then
    return jsonb_build_object('status', 'deja');
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

  -- ⚠️ UN COMPTE TIENT UNE SEULE LIGNE PAR JOURNÉE, quel que soit l'appareil.
  if v_uid is not null and exists (
    select 1 from scrutin_game_pays_noms where jour = p_jour and user_id = v_uid
  ) then
    return jsonb_build_object('status', 'deja');
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
