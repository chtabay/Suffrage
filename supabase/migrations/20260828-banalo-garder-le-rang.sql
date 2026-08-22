-- BANALO DU JOUR GARDE SON RANG, PARCE QU'UN BARÈME PAR PLACE EN A BESOIN.
--
-- CE QUI MANQUAIT. `scrutin_banalo_results` gardait un CENTILE (`mieux`) et un
-- score, jamais un rang. C'était suffisant tant que le classement sur la durée
-- était une MOYENNE de centiles. Ça ne l'est plus : le barème de saison porte
-- sur la PLACE — 25 points au premier, 18 au deuxième — et un centile ne rend
-- pas la place.
--
-- ⚠️ ET UN CENTILE NE PEUT PAS EN TENIR LIEU, C'EST MESURÉ. Une table de points
-- indexée sur le centile donne à la même place des valeurs très différentes
-- selon la foule : la 2ᵉ place vaut 8 points à 3 joueurs et 25 à 3 000, parce
-- que `round(100 × 1/3000)` vaut 0 — à trois mille joueurs, les SEIZE premiers
-- touchent tous le maximum et la forme du barème s'effondre. Un centile
-- normalise le CHAMP, pas la PLACE, et c'est la place qu'un joueur regarde.
--
-- ⚠️ LE RANG EXISTAIT DÉJÀ, IL N'ÉTAIT SIMPLEMENT PAS GARDÉ. `scrutin_banalo_etat`
-- et `scrutin_banalo_mots_etat` rendent `rang`, `votants` ET `exaequo` depuis le
-- premier jour. On ne calcule donc rien de neuf : on écrit ce qui passait déjà.
--
-- ⚠️ `exaequo` N'EST PAS UN ORNEMENT. Le score des mots est une somme de voix et
-- celui du format chiffré un nombre à une décimale : les égalités sont fréquentes
-- chez l'un, rares chez l'autre, et le barème les fait PARTAGER les places
-- qu'elles occupent. Sans l'effectif du paquet, on ne peut pas calculer la part
-- de chacun — et un partage olympique (tout le monde touche la place haute)
-- distribuerait, mesuré sur une foule de trois mille, deux fois et demie le
-- budget d'une journée.

alter table public.scrutin_banalo_results
  add column if not exists rang    int check (rang is null or rang >= 1),
  add column if not exists sur     int check (sur is null or sur >= 1),
  add column if not exists exaequo int check (exaequo is null or exaequo >= 1);

-- ⚠️ LES TROIS COLONNES SONT NULLABLES, ET LES LIGNES D'AVANT RESTENT NULLES.
-- Le rang d'une journée passée ne se reconstitue pas depuis la ligne de résultat :
-- elle ne porte pas le jeton, donc rien ne dit QUELLE réponse de la foule était
-- la sienne. Ce n'est pas grave ici — cinq lignes en tout au moment du dépôt —
-- et surtout ça se répare tout seul : `scrutin_banalo_rattacher` recalcule
-- l'intégralité des journées du jeton à CHAQUE connexion, donc la prochaine
-- visite de chaque joueur remplit ses lignes, tant que ses réponses sont encore
-- en base. Passé la purge à trente jours, la journée n'aura jamais de rang, et
-- le barème lui donnera son point de présence — ce qui est exactement ce que
-- vaut « j'étais là, on ne sait plus où ».
--
-- ⚠️ ET UNE JOURNÉE JOUÉE EN DEUX LANGUES N'A QU'UNE LIGNE — comportement
-- préexistant, pas une nouveauté de ce fichier : la clé est `(user_id, jour)`,
-- pas `(user_id, jour, langue)`. La première insertion garde son horodatage, la
-- seconde ne fait qu'un `update`. Vu en vérifiant : un jeton réel avait joué la
-- journée 1 en français à 13 h 05 et en pidgin à 19 h 57. Sans conséquence pour
-- la saison — deux heures d'écart le même jour — mais ça se paie si l'on tente
-- un jour d'assertion ligne à ligne sur la langue.

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

  -- ⚠️ ON PORTE AUSSI L'HEURE RÉELLE DE LA RÉPONSE, et pas celle de ce
  -- rattachement. `cree_le` sert à ranger une journée dans sa SAISON : sans ça,
  -- quelqu'un qui joue tout août sans compte et s'inscrit le 2 septembre verrait
  -- trente journées d'août tomber dans la saison de septembre, et prendre la
  -- tête d'un mois auquel il n'a pas joué. Le `on conflict` ne la touche pas :
  -- un rattachement recalcule des points parce que la FOULE bouge, l'instant de
  -- la partie, lui, ne bouge jamais.
  for v_ligne in
    select jour, langue, min(cree_le) as quand
      from scrutin_banalo_reponses where jeton = p_jeton group by jour, langue
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
           langue = excluded.langue, format = excluded.format;
    v_n := v_n + 1;
  end loop;

  for v_ligne in
    select jour, langue, theme, min(cree_le) as quand
      from scrutin_banalo_mots where jeton = p_jeton group by jour, langue, theme
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
           langue = excluded.langue, format = excluded.format;
    v_n := v_n + 1;
  end loop;

  return v_n;
end $function$;
