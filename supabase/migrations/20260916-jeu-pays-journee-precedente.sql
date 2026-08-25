-- CINQ SUR CINQ PEUT RELIRE SA JOURNÉE PRÉCÉDENTE.
--
-- Demandé : « même chose dans 5 sur 5, un bouton pour avoir les données de la
-- journée précédente ». Le jeu n'avait AUCUNE relecture de la veille — ses trois
-- modales sont la méthode, l'intro du jour et les pictos. Une partie finie
-- disparaissait avec la journée.
--
-- ⚠️ ET IL N'A PAS BESOIN D'UNE FONCTION « DERNIÈRE JOURNÉE JOUÉE », contrairement
-- à Banalo. Là-bas les réponses vivent en base, donc seule la base sait quelle
-- journée ce joueur a jouée (`scrutin_banalo_derniere`). Ici le résumé des
-- victoires vit dans le navigateur (`placet.pays.resultats`, la seule mémoire
-- longue du jeu) : l'écran trouve tout seul la dernière journée gagnée avant
-- aujourd'hui, sans un aller-retour de plus.
--
-- Il ne manquait donc qu'une chose au tableau : le plancher en paramètre, comme
-- Banalo l'a reçu la veille.
--
-- ⚠️ LE « 1er SUR 1 » RESTE REFUSÉ SUR LA JOURNÉE EN COURS. Sur une journée
-- close c'est un RELEVÉ (« voilà qui figurait ce jour-là »), pas une récompense
-- servie à quelqu'un qui n'a battu personne. Seul l'écran de relecture demande 1.
--
-- ⚠️ AJOUTER UN PARAMÈTRE CRÉE UNE FONCTION, ÇA N'EN REMPLACE PAS UNE : sans le
-- `drop` de la version à deux arguments, PostgREST se retrouve devant deux
-- candidates et rend une ambiguïté — plus personne ne lit de tableau. Le client
-- déployé ne casse pas : il poste deux clés, et elles correspondent à la
-- nouvelle fonction dont le troisième argument a un défaut.
drop function if exists public.scrutin_game_pays_tableau(int, text);

create or replace function public.scrutin_game_pays_tableau(
  p_jour int, p_jeton text, p_min int default 2
) returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_max constant int := 10;
  -- Borné à 1 : un tableau de zéro ligne n'existe pas.
  v_min constant int := greatest(coalesce(p_min, 2), 1);
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
    -- ⚠️ LA LIGNE DU JOUEUR SORT MÊME HORS DE LA TÊTE DE LISTE.
    (select jsonb_build_object('index', nom_index, 'nom', libelle, 'essais', essais, 'place', place)
       from inscrits where jeton = p_jeton and place > v_max)
    into v_lignes, v_moi
    from inscrits;

  return jsonb_build_object(
    'status', 'ok', 'inscrits', v_inscrits, 'inscrit', v_inscrit, 'bloque', v_bloque,
    'lignes', v_lignes, 'moi', v_moi
  );
end $function$;

revoke all on function public.scrutin_game_pays_tableau(int, text, int)
  from public, anon, authenticated;
grant execute on function public.scrutin_game_pays_tableau(int, text, int)
  to anon, authenticated;
