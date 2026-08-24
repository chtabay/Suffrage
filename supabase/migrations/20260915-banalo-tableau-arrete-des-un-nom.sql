-- LE TABLEAU D'UNE JOURNÉE ARRÊTÉE SORT DÈS UN SEUL NOM.
--
-- Signalé : « dans la modale de détail du mot de la veille je ne vois pas le
-- classement des joueurs de la veille (même s'il n'y en a qu'un) ». Vérifié : la
-- journée 4 ne porte plus qu'UN inscrit depuis le ménage du 14, et le plancher
-- de deux retient les lignes. Le joueur ne voyait donc aucun tableau, ni dans le
-- résumé ni dans le tiroir — et rien ne lui disait pourquoi.
--
-- ⚠️ CE PLANCHER EST LE « 1er SUR 1 » QUE LE PRODUIT REFUSE PARTOUT
-- (`VOTANTS_MIN` 2, `INSCRITS_MIN` 2, `minimumClasses` 2, `COURBE_MIN` 50), et
-- on ne le retire PAS de la journée en cours. Ce qui change ici est la nature de
-- l'objet : sur la journée du jour, une liste d'une ligne est une RÉCOMPENSE
-- servie à quelqu'un qui n'a battu personne — une tautologie. Sur une journée
-- CLOSE, c'est un RELEVÉ : « voilà qui figurait au tableau ce jour-là ». Un
-- relevé d'une ligne est court, il n'est pas faux, et le taire laisse le joueur
-- devant un silence qu'il lit comme une panne.
--
-- ⚠️ LE PLANCHER DEVIENT DONC UN PARAMÈTRE, PAS UNE CONSTANTE RETIRÉE. L'écran
-- du jour continue d'appeler avec 2 — c'est le défaut de la fonction — et seule
-- la relecture de la veille demande 1. Une fonction qui n'aurait plus de
-- plancher du tout laisserait le prochain écran le refabriquer à sa façon.
--
-- ⚠️ ET AJOUTER UN PARAMÈTRE CRÉE UNE FONCTION, ÇA N'EN REMPLACE PAS UNE : sans
-- le `drop` de la version à quatre arguments, PostgREST se retrouve devant deux
-- candidates et rend une erreur d'ambiguïté — plus personne ne lit de tableau.
-- Payé le 06/09 sur `add_push_subscription`. Le client déployé, lui, ne casse
-- pas : il poste quatre clés, et PostgREST les fait correspondre à la nouvelle
-- fonction dont le cinquième argument a un défaut.
drop function if exists public.scrutin_banalo_tableau(text, int, text, text);

create or replace function public.scrutin_banalo_tableau(
  p_jeton text, p_jour int, p_langue text, p_theme text, p_min int default 2
) returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_max constant int := 10;
  -- ⚠️ BORNÉ À 1 : un tableau de zéro ligne n'existe pas, et un `p_min` négatif
  -- ou nul ferait passer le `if` sur une liste vide, donc rendre `lignes: []`
  -- avec un `moi` calculé sur rien.
  v_min constant int := greatest(coalesce(p_min, 2), 1);
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
  -- ⚠️ LA MÊME JOINTURE QUE LA LISTE : l'effectif annonce exactement ce que la
  -- liste peut montrer, sinon les deux dérivent (voir `20260914`).
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

revoke all on function public.scrutin_banalo_tableau(text, int, text, text, int)
  from public, anon, authenticated;
grant execute on function public.scrutin_banalo_tableau(text, int, text, text, int)
  to anon, authenticated;
