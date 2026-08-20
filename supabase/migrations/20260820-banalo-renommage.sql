-- RENOMMAGE D'UNANIMO EN BANALO — côté base, le strict nécessaire.
--
-- POURQUOI CETTE MIGRATION EXISTE. Le slug du jeu n'est pas qu'une étiquette
-- d'affichage : il est ÉCRIT dans `scrutin_game_rooms.game` à la création, et
-- deux fonctions s'en servent pour aiguiller. Changer le slug côté application
-- sans toucher à la base ferait donc échouer le dépouillement en silence — la
-- manche passerait en `reveal` sans qu'aucun score ne soit calculé.
--
-- ⚠️ LES DEUX VALEURS SONT ACCEPTÉES, ET C'EST OBLIGATOIRE. Les salles créées
-- avant ce déploiement portent `game = 'unanimo'` et vivent jusqu'à SEPT JOURS
-- (`scrutin-game-purge`). N'accepter que la nouvelle valeur casserait leur
-- révélation. Passé une semaine, plus aucune ligne ne portera l'ancienne — la
-- purge fait le ménage toute seule, il n'y a donc rien à rejouer sur les données.
--
-- ⚠️ POURQUOI UN CORRECTIF EN PLACE PLUTÔT QU'UN `create or replace` RECOPIÉ.
-- `get_game_room` fait une centaine de lignes et chaque sondage l'appelle. En
-- recopier le corps dans ce fichier ferait deux choses désagréables : d'abord le
-- risque de faute de transcription sur la fonction la plus sollicitée du jeu ;
-- ensuite un DOUBLON de définition — le prochain qui modifiera `get_game_room`
-- dans une autre migration laisserait deux fichiers prétendant la définir, et
-- c'est la date du fichier qui trancherait. On lit donc la définition en place
-- et on n'y remplace qu'un motif.
--
-- Rejouable à blanc : sur une base vierge, les migrations antérieures créent les
-- deux fonctions avec l'ancien motif, que ce bloc retrouve. Et s'il ne le trouve
-- pas — parce qu'une migration future aura réécrit l'aiguillage — il LÈVE au
-- lieu de ne rien faire, ce qui est le seul comportement acceptable pour un
-- correctif qui ne se voit pas à l'œil.
--
-- Ce qui n'est PAS renommé, délibérément :
--   · `scrutin_game_unanimo_reveal` et `scrutin_game_unanimo_points` gardent leur
--     nom. Ce sont des identifiants Postgres internes, pas une désignation de
--     produit, et les renommer casserait le rejeu des migrations antérieures qui
--     les référencent.
--   · Les migrations déjà appliquées ne sont pas réécrites : un fichier de
--     migration est le PROCÈS-VERBAL de ce qui a tourné. Le corriger après coup
--     en ferait un faux.

do $$
declare
  r      record;
  v_def  text;
  v_neuf text;
  v_n    int := 0;
begin
  for r in
    select p.oid, p.proname
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('game_reveal', 'get_game_room')
  loop
    v_def  := pg_get_functiondef(r.oid);
    v_neuf := replace(v_def, 'v_room.game = ''unanimo''', 'v_room.game in (''unanimo'', ''banalo'')');
    if v_neuf = v_def then
      raise exception 'aiguillage introuvable dans % : la forme a changé, corriger à la main', r.proname;
    end if;
    execute v_neuf;
    v_n := v_n + 1;
  end loop;
  if v_n <> 2 then
    raise exception 'attendu 2 fonctions à corriger, traité %', v_n;
  end if;
end $$;
