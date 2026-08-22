-- LE CLASSEMENT SUR LA DURÉE OUVRE DÈS LA PREMIÈRE JOURNÉE.
--
-- ⚠️ LE PLANCHER DE CINQ JOURNÉES ÉTAIT IMPOSSIBLE À SATISFAIRE, ET C'EST
-- MESURÉ. Au moment où il a été écrit, Banalo du jour en était à sa journée 3 et
-- Cinq sur cinq à sa journée 5 : personne au monde ne pouvait avoir cinq
-- journées CLASSABLES (une journée jouée seul n'a pas de position). Le
-- classement affichait donc « 0 joueur classé » à tout le monde, tous les jours,
-- sans exception possible — une porte dont la clé n'existe pas.
--
-- Ce n'est pas « un plancher trop haut » : c'est une fonctionnalité dont le
-- métier est de faire revenir, et qui ne rendait rien à personne. Le rang et le
-- classement sont une RÉCOMPENSE ; une récompense qu'on ne peut pas atteindre
-- n'encourage rien.
--
-- ⚠️ CE QUE LE PLANCHER ACHETAIT RESTE VRAI, ET ON LE PAIE AUTREMENT. Le motif
-- écrit était « sinon une seule journée chanceuse prend la tête » — c'est exact,
-- et ça le restera. Mais ce dépôt règle ce genre de chose en MONTRANT, pas en
-- fermant : l'effectif de journées est déjà affiché à côté de chaque moyenne
-- (« sur 1 » se lit), et la règle sous la carte le redit. C'est exactement le
-- chemin qu'a suivi `assez` chez Banalo du jour — il a cessé de commander ce qui
-- est CALCULÉ pour ne plus commander que ce qui est DIT.
--
-- ⚠️ IL RESTE UN PLANCHER, ET IL PORTE SUR LES JOUEURS, PAS SUR LES JOURNÉES.
-- Un classement d'UNE ligne est le « 1er sur 1 » que ce produit refuse partout
-- (`VOTANTS_MIN` 2, `INSCRITS_MIN` 2, `COURBE_MIN` 50) : une ligne unique avec
-- son propre score ne se lit pas comme un classement, elle se lit comme un
-- tableau cassé. Sous deux joueurs classés, on ne rend donc aucune ligne — et
-- l'écran DIT pourquoi, parce qu'une absence sans un mot se lit comme une panne.
--
-- ⚠️ ET LA MOYENNE AFFICHÉE RESTE LA MOYENNE BRUTE. Un lissage bayésien vers 50
-- (la parade classique au petit échantillon) a été envisagé et écarté : il
-- ferait du nombre montré une grandeur QUI N'EST PLUS « X % ont fait mieux »,
-- c'est-à-dire un second vocabulaire sur une page qui n'en connaît qu'un — la
-- raison même pour laquelle la courbe retourne son AXE plutôt que son CHIFFRE.
-- Et sur des journées 3 et 5, il tasserait tout le monde entre 35 et 45, ce qui
-- se lirait comme un classement à égalité générale. À rouvrir sur des données
-- réelles si la tête de liste devient une suite de « sur 1 ».
create or replace function public.scrutin_jeux_cumul(
  p_jour_banalo int, p_jour_pays int, p_jeu text
) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_max constant int := 10;
  -- Une journée suffit : le classement est une récompense, pas un examen d'entrée.
  v_min_journees constant int := 1;
  -- Mais jamais « 1er sur 1 » : un classement à une ligne se lit comme une panne.
  v_min_classes constant int := 2;
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
  -- ⚠️ LE PLANCHER DE JOUEURS SE CALCULE UNE FOIS ET GARDE LES DEUX SORTIES.
  -- `lignes` ET `moi` doivent tomber ensemble : ma ligne isolée sous un titre
  -- « sur trente journées » est le même tableau cassé qu'une liste d'un élément.
  assez as (select count(*) >= v_min_classes as ok from classement),
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
    'minimum', v_min_journees,
    'minimumClasses', v_min_classes,
    -- ⚠️ MES JOURNÉES CLASSABLES, SANS LE PLANCHER : c'est la seule façon de
    -- dire « il vous en manque une » plutôt que « personne n'est classé ».
    'mesJournees', (select count(*)
                      from scrutin_jeux_centiles(p_jour_banalo, p_jour_pays, 0) c
                     where c.user_id = v_uid and (p_jeu = 'tout' or c.jeu = p_jeu)),
    'lignes',  (select coalesce(jsonb_agg(jsonb_build_object(
                          'place', place, 'pseudo', pseudo, 'moyenne', moyenne,
                          'journees', journees, 'moi', user_id = v_uid
                        ) order by place), '[]'::jsonb)
                  from classement where place <= v_max and (select ok from assez)),
    -- Ma ligne sort même hors de la tête de liste : un classement où l'on ne se
    -- trouve pas est un classement qui parle des autres.
    'moi',     (select jsonb_build_object('place', place, 'pseudo', pseudo,
                                          'moyenne', moyenne, 'journees', journees)
                  from classement where user_id = v_uid and (select ok from assez)),
    'avant',   (select place from alors where user_id = v_uid and (select ok from assez))
  ) into v_out;

  return v_out;
end $function$;
