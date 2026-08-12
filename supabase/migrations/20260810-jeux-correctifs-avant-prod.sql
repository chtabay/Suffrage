-- CORRECTIFS AVANT MISE EN PRODUCTION DU JEU.
--
-- Le lot « jeux » a ete ecrit par un autre agent et n etait pas commite. Revue
-- avant de le pousser : deux defauts a corriger d abord, dont un qui vide le
-- jeu de sa regle. Le troisieme — l absence de duree de conservation — vit dans
-- `20260810-jeux-retention.sql`, parce qu il engage aussi la politique de
-- confidentialite et ne se relit pas dans le meme mouvement.
--
-- ⚠️ Le meme correctif existe cote TypeScript (src/lib/games/unanimo/scoring.ts,
-- `themeTokens`) : les deux implementations du bareme doivent bouger ENSEMBLE,
-- et un test les compare desormais sur la meme donnee.

-- ════════════════════════════════════════════ 1. LE MOT DU THEME RAPPORTAIT
--
-- La revelation excluait le theme par une comparaison de CHAINE ENTIERE :
--     where norm <> '' and norm <> v_theme
-- Or les themes portent un article — « La mer », « La montagne », « El mar ».
-- `scrutin_game_norm('La mer')` vaut donc « la mer », et le joueur qui ecrit
-- « mer » n est PAS exclu.
--
-- Consequence : le mot le plus evident du theme est aussi celui que tout le
-- monde ecrit, donc celui qui rapporte le MAXIMUM — a chaque manche, alors que
-- l ecran annonce en quatre langues que le theme ne compte pas. Ce n est pas un
-- detail de bareme : c est la regle du jeu qui tombe.
--
-- On compare desormais aux JETONS du theme. La fonction est reprise TELLE
-- QUELLE de la migration d origine : seules la declaration, le calcul des
-- jetons et le predicat d exclusion changent. Le bareme, l ordre de revelation
-- et les trois ecritures ne sont pas touches.
--
-- ⚠️ CE QU ON NE FAIT PAS, ET POURQUOI. La revue proposait d ajouter le pluriel
-- en -x a `scrutin_game_norm` (bateau/bateaux, animal/animaux). ECARTE : aucune
-- regle courte ne le fait juste. « bateaux » -> « bateau » demande eaux->eau,
-- « animaux » -> « animal » demande aux->al, et la meme regle rend « tuyaux »
-- -> « tuyal ». Une collation qui fusionne deux mots DIFFERENTS est pire que
-- deux formes qui ne se rejoignent pas : elle donne des points a quelqu un qui
-- n a pas ecrit le meme mot. On garde le -s seul, et l ecran dit ce que la
-- collation fait.

create or replace function public.scrutin_game_unanimo_reveal(p_round_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  v_round scrutin_game_rounds;
  v_theme text;
  v_theme_words text[];
  v_words jsonb;
  -- Points de la manche, indexés par identifiant de joueur : c'est la SEULE
  -- source des trois écritures qui suivent (bulletins, scores cumulés,
  -- résultat figé). Un agrégat calculé trois fois finirait par différer.
  v_pts jsonb;
  v_pw jsonb;
  v_players jsonb;
begin
  select * into v_round from scrutin_game_rounds where id = p_round_id;
  v_theme := scrutin_game_norm(coalesce(v_round.prompt->>'text', ''));
  -- Le thème entier reste exclu (on peut recopier « la mer »), et chacun de ses
  -- mots pleins avec lui. Les jetons de moins de trois lettres sont ignorés
  -- (« la », « el », « di ») : ils ne sont jamais une réponse plausible, et les
  -- exclure ne protégerait de rien tout en risquant d'écarter un mot légitime.
  select coalesce(array_agg(w), '{}'::text[]) || v_theme into v_theme_words
    from (select unnest(string_to_array(v_theme, ' ')) as w) s
   where length(w) >= 3;

  with raw as (
    -- `with ordinality` : l'ORDRE DE SAISIE du joueur. Il sert au dédoublonnage
    -- ci-dessous, et c'est le seul critère qui ne dépende pas d'une collation.
    select e.player_id, p.name as player_name, w.ord,
           left(btrim(w.word), 40) as shown, scrutin_game_norm(w.word) as norm
      from scrutin_game_entries e
      join scrutin_game_players p on p.id = e.player_id
      cross join lateral jsonb_array_elements_text(coalesce(e.payload->'words', '[]'::jsonb))
                   with ordinality as w (word, ord)
     where e.round_id = p_round_id
  ),
  -- Le thème lui-même ne compte pas (« éviter les termes de racine identique au
  -- mot de l'image », règle papier). Le dédoublonnage par joueur est une
  -- seconde ceinture : game_submit l'a déjà fait.
  --
  -- ⚠️ `order by … ord` ET PAS `… shown` : trancher entre « Plage », « plage » et
  -- « PLAGES » par l'ordre alphabétique fait dépendre le libellé affiché de la
  -- COLLATION de la base — le miroir TypeScript de cette règle
  -- (src/lib/games/unanimo/scoring.ts) donnait alors un autre mot que le SQL, et
  -- c'est un test qui l'a montré. On garde la forme que le joueur a écrite EN
  -- PREMIER : déterministe partout, et c'est aussi la plus naturelle.
  kept as (
    select distinct on (player_id, norm) player_id, player_name, shown, norm
      from raw
     where norm <> '' and not (norm = any(v_theme_words))
     order by player_id, norm, ord
  ),
  grouped as (
    select norm,
           count(*)::int as shared,
           -- Libellé affiché : la forme la plus écrite par le groupe.
           mode() within group (order by shown) as label,
           array_agg(player_name order by player_name) as players
      from kept
     group by norm
  )
  select
    -- L'ordre de la révélation : le plus partagé d'abord. À égalité, `norm` et
    -- non `label` — la forme normalisée est en ASCII minuscule, donc son ordre
    -- est le même dans toutes les collations.
    (select coalesce(jsonb_agg(jsonb_build_object(
              'label', g.label, 'norm', g.norm, 'count', g.shared,
              'points', scrutin_game_unanimo_points(g.shared),
              'players', to_jsonb(g.players)) order by g.shared desc, g.norm), '[]'::jsonb)
       from grouped g),
    (select coalesce(jsonb_object_agg(t.player_id::text, t.pts), '{}'::jsonb)
       from (select k.player_id, sum(scrutin_game_unanimo_points(g.shared))::int as pts
               from kept k join grouped g on g.norm = k.norm
              group by k.player_id) t),
    (select coalesce(jsonb_object_agg(t.player_id::text, t.ws), '{}'::jsonb)
       from (select k.player_id,
                    jsonb_agg(jsonb_build_object('label', k.shown, 'count', g.shared,
                                                 'points', scrutin_game_unanimo_points(g.shared))
                              order by g.shared desc, k.shown) as ws
               from kept k join grouped g on g.norm = k.norm
              group by k.player_id) t)
    into v_words, v_pts, v_pw;

  -- Tableau de la manche : la salle ENTIÈRE, y compris qui n'a rien envoyé (0
  -- point, `answered` faux) — c'est ce qui rend lisible une révélation à 4/6.
  -- Un retardataire encore hors jeu, lui, n'y figure pas.
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'name', p.name,
               'points', coalesce((v_pts->>p.id::text)::int, 0),
               'answered', exists (select 1 from scrutin_game_entries e
                                    where e.round_id = p_round_id and e.player_id = p.id),
               'words', coalesce(v_pw->p.id::text, '[]'::jsonb))
             order by coalesce((v_pts->>p.id::text)::int, 0) desc, p.name
           ), '[]'::jsonb)
    into v_players
    from scrutin_game_players p
   where p.room_id = v_round.room_id and p.joined_round <= v_round.round_no;

  update scrutin_game_entries e
     set points = coalesce((v_pts->>e.player_id::text)::int, 0)
   where e.round_id = p_round_id;

  update scrutin_game_players p
     set score = p.score + (v_pts->>p.id::text)::int
   where p.room_id = v_round.room_id and v_pts ? p.id::text;

  update scrutin_game_rounds
     set result = jsonb_build_object('rule', 'unanimo-official-v1', 'words', v_words, 'players', v_players)
   where id = p_round_id;
end $function$;


revoke all on function public.scrutin_game_unanimo_reveal(uuid) from public, anon, authenticated;

-- ════════════════════════════ 2. TROIS ENTREES PUBLIQUES ETAIENT NON BORNEES
--
-- `game_create` et `game_next_round` sont ouvertes a `anon` et recevaient
-- `p_settings` / `p_prompt` TELS QUELS du navigateur : n importe quel jsonb, de
-- n importe quelle taille, stocke puis resservi a tous les joueurs a chaque
-- sondage. Le reste du fichier borne tout — c est un oubli, pas un choix.
--
-- ON POSE DES DECLENCHEURS PLUTOT QUE DE REECRIRE LES RPC, et c est mieux : une
-- garde dans une fonction ne protege que cette fonction, un declencheur protege
-- la TABLE. Le jour ou un autre chemin ecrit une salle, il sera borne aussi.
--
-- ON BORNE LA FORME, PAS LE VOCABULAIRE. Premiere version ECARTEE, et le
-- pourquoi vaut d etre garde : elle remodelait `settings` et `prompt` sur une
-- LISTE BLANCHE DE CLES, ecrite sur les noms suggeres par la revue et non sur le
-- contrat reel du client. Deux fautes, vues a l ecran en jouant une partie :
--
--   1. `pickTheme` renvoie {kind, text, emoji} ; la liste gardait {text, icon,
--      key}. L emoji du theme etait JETE a chaque manche, alors que
--      `UnanimoRoom.tsx` le lit a deux endroits — la carte du theme affichait
--      le repli « 💡 ».
--   2. `scrutin_game_rooms` porte une colonne `game` : c est une table
--      GENERIQUE. Une liste blanche de cles y effacerait, en silence, les
--      reglages du PROCHAIN jeu.
--
-- La borne ci-dessous ne presume rien du jeu — un objet, plat, de taille
-- bornee — et elle REFUSE au lieu de rogner. C est le silence du remodelage qui
-- avait cache la premiere faute : une erreur se voit, une cle disparue non.
--
-- Le calibrage numerique disparait avec : `game_submit` clampe deja
-- `settings->>'words'` a [1,20] la ou il s en sert.

create or replace function public.scrutin_game_json_bound(p jsonb, p_what text)
returns jsonb language plpgsql immutable set search_path to 'public' as $function$
begin
  if p is null then return '{}'::jsonb; end if;
  if jsonb_typeof(p) <> 'object' then
    raise exception 'game_% must be an object', p_what;
  end if;
  -- 2 ko : cent fois ce qu un reglage de jeu ou un enonce demande.
  if length(p::text) > 2000 then
    raise exception 'game_% too large', p_what;
  end if;
  -- Pas d imbrication : c est par la qu on ferait entrer un volume arbitraire
  -- sous une cle d apparence anodine.
  if exists (select 1 from jsonb_each(p) where jsonb_typeof(value) in ('object', 'array')) then
    raise exception 'game_% must be flat', p_what;
  end if;
  return p;
end $function$;

create or replace function public.scrutin_game_rooms_clean()
returns trigger language plpgsql set search_path to 'public' as $function$
begin
  new.settings := scrutin_game_json_bound(new.settings, 'settings');
  return new;
end $function$;

drop trigger if exists scrutin_game_rooms_clean_t on public.scrutin_game_rooms;
create trigger scrutin_game_rooms_clean_t
  before insert or update of settings on public.scrutin_game_rooms
  for each row execute function public.scrutin_game_rooms_clean();

create or replace function public.scrutin_game_rounds_clean()
returns trigger language plpgsql set search_path to 'public' as $function$
begin
  new.prompt := scrutin_game_json_bound(new.prompt, 'prompt');
  return new;
end $function$;

drop trigger if exists scrutin_game_rounds_clean_t on public.scrutin_game_rounds;
create trigger scrutin_game_rounds_clean_t
  before insert or update of prompt on public.scrutin_game_rounds
  for each row execute function public.scrutin_game_rounds_clean();

-- Les mots d une manche : bornes a l ECRITURE. `game_submit` en garde 20 au
-- plus, mais il NORMALISE avant de couper — un tableau de 200 000 elements venu
-- d une RPC ouverte a `anon`, c est 200 000 expressions regulieres sur un seul
-- appel. Le delai d execution de PostgREST y met fin, mais rien ne doit pouvoir
-- s ECRIRE au-dela.
create or replace function public.scrutin_game_entries_bound()
returns trigger language plpgsql set search_path to 'public' as $function$
begin
  if jsonb_array_length(coalesce(new.payload->'words', '[]'::jsonb)) > 100 then
    raise exception 'game_words_too_many';
  end if;
  return new;
end $function$;

drop trigger if exists scrutin_game_entries_bound_t on public.scrutin_game_entries;
create trigger scrutin_game_entries_bound_t
  before insert or update on public.scrutin_game_entries
  for each row execute function public.scrutin_game_entries_bound();

-- ⚠️ CE BLOC A ÉTÉ FAUX PENDANT DEUX JOURS, et personne ne l'a vu.
-- Il révoquait les deux fonctions de la PREMIÈRE version de ce correctif, celle
-- qui remodelait sur une liste blanche de clés. Elles ont été remplacées par
-- `scrutin_game_json_bound` dans ce fichier même, mais ces deux lignes ne l'ont
-- pas suivi : un remplacement de texte qui n'a pas trouvé sa cible et n'a rien
-- dit. Or `revoke on function` sur une fonction inexistante LÈVE — le fichier ne
-- pouvait donc plus être rejoué à blanc, et la production n'a survécu que parce
-- qu'il avait été appliqué à la main, par morceaux.
revoke all on function public.scrutin_game_json_bound(jsonb, text) from public, anon, authenticated;
