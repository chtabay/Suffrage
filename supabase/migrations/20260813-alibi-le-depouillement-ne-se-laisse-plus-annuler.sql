-- ALIBI — LE DÉPOUILLEMENT NE SE LAISSE PLUS ANNULER, ET LE CARNET REDEVIENT SECRET.
--
-- Relecture indépendante du jeu (livré en 75a305e par une autre session). Trois
-- corrections, deux fonctions. Les deux premières ferment le MÊME trou par deux
-- bouts, et ce trou annulait l'enquête.
--
-- ═══════════ 1. LE BULLETIN D'OFFICE NE COUVRAIT QUE LES INNOCENTS
--
-- C'est le miroir exact de la faille n° 1 que la conception avait fermée. Elle
-- avait vu qu'un bulletin manquant CHEZ UN INNOCENT fait lire la pièce du
-- coupable comme nette et le blanchit. Elle n'a pas vu le bulletin manquant DU
-- COUPABLE. Reproduit à 7 joueurs, avant correctif :
--
--     cuisine dit 3, reçu 3 -> clean
--     cave    dit 2, reçu 2 -> clean
--     salon   dit 1, reçu 1 -> clean
--     suspects : []      blanchis : [J2..J7]   (six sur sept)
--
-- Le coupable est le seul absent de la liste des blanchis : la table le nomme par
-- élimination, dès la manche 1. Et ça ne demande aucune habileté — un téléphone
-- qui se verrouille, un enfant distrait, un hôte qui dépouille à 6/7.
--
-- LE DÉPÔT D'OFFICE VAUT DONC POUR TOUS LES RÔLES. Ce n'est pas une béquille et
-- ça ne retire au coupable aucun choix : la règle lui offre déjà « ou s'en tient
-- à son propre souvenir », et son faux souvenir est précisément ce que sa carte
-- porte (`secret->>'room'` / `'count'`). On dépose son option par défaut, pas une
-- décision qu'on prendrait à sa place.
--
-- ═══════════ 2. UNE PIÈCE QUI N'EXISTE PAS ANNULAIT LA MANCHE
--
-- `game_submit` borne l'index de pièce à 0–9 alors que la manche n'en porte que
-- trois, et le dépouillement groupait sur ce que le bulletin DIT sans jamais le
-- confronter au tableau des pièces. Reproduit : le coupable poste
-- `{"room": 7, "count": 1}`, une quatrième pièce SANS NOM apparaît, tout sort
-- « clean », `suspects` est vide, et `cleared` contient les sept joueurs — le
-- coupable compris. Mieux que s'abstenir : son nom y figure comme les autres.
--
-- LA BORNE VIT ICI, PAS À LA SAISIE, et c'est délibéré. Le dépouillement est
-- l'instrument de mesure du jeu ; il doit être juste quoi qu'on lui envoie, y
-- compris depuis un client qu'on n'a pas écrit. Un bulletin dont la pièce
-- n'existe pas n'est plus un bulletin : il est IGNORÉ, et le dépôt d'office
-- reprend la main comme si rien n'avait été déposé.
--
-- ⚠️ D'où la condition du dépôt : « aucun bulletin VALIDE », et non « aucun
-- bulletin ». L'ancienne (`not exists (entry)`) était défaite par n'importe
-- quelle ligne présente — y compris un simple soupçon sans pièce, qui est un
-- geste parfaitement légitime.
--
-- ═══════════ 3. LE CARNET N'ÉTAIT PAS SECRET
--
-- L'écran promet en quatre langues « Personne ne le verra avant la fin ». Or les
-- soupçons nominatifs étaient rangés dans le `result` de CHAQUE manche, et
-- `get_game_room` sert `result` en entier à quiconque connaît le code de la
-- salle. Un onglet réseau après la manche 1 donnait au coupable la liste de ceux
-- qui étaient sur sa piste.
--
-- On ne les FILTRE pas au service : on cesse de les écrire là. Ils vivent déjà
-- dans `scrutin_game_entries`, que personne d'autre ne reçoit jamais — c'est de
-- là que le verdict final les relit désormais, et c'est dans le résultat FINAL
-- qu'ils réapparaissent, là où l'écran avait promis qu'on les verrait.

create or replace function public.scrutin_game_alibi_reveal(p_round_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  v_round scrutin_game_rounds;
  v_room scrutin_game_rooms;
  v_places jsonb;
  v_np int;
  v_rooms jsonb;
  v_suspects text[];
  v_prev text[];
  v_cleared text[];
begin
  select * into v_round from scrutin_game_rounds where id = p_round_id;
  select * into v_room from scrutin_game_rooms where id = v_round.room_id;
  v_places := coalesce(v_round.prompt->'places', '[]'::jsonb);
  v_np := coalesce(jsonb_array_length(v_places), 0);

  -- LE DÉPÔT D'OFFICE, POUR TOUS LES RÔLES. La carte de chacun porte sa pièce et
  -- son compte ; l'innocent n'a aucun choix à faire, et le coupable a le droit de
  -- s'en tenir à son propre souvenir. Le `||` fusionne : un soupçon déjà déposé
  -- est conservé, seuls la pièce et le compte sont écrits.
  insert into scrutin_game_entries (round_id, player_id, payload)
  select p_round_id, p.id,
         jsonb_build_object('room', (p.secret->>'room')::int, 'count', (p.secret->>'count')::int)
    from scrutin_game_players p
   where p.room_id = v_room.id
     and p.joined_round <= v_round.round_no
     and p.secret ? 'room'
     and (p.secret->>'room')::int < v_np
     and not exists (
       select 1 from scrutin_game_entries e
        where e.round_id = p_round_id and e.player_id = p.id
          and e.payload ? 'room'
          and (e.payload->>'room')::int >= 0
          and (e.payload->>'room')::int < v_np)
  on conflict (round_id, player_id)
    do update set payload = scrutin_game_entries.payload || excluded.payload;

  with bull as (
    -- CEINTURE : une pièce hors du tableau de la manche n'est pas une pièce.
    select p.name, (e.payload->>'room')::int as room, (e.payload->>'count')::int as cnt
      from scrutin_game_entries e
      join scrutin_game_players p on p.id = e.player_id
     where e.round_id = p_round_id
       and e.payload ? 'room'
       and (e.payload->>'room')::int >= 0
       and (e.payload->>'room')::int < v_np
  ),
  majo as (
    select room, mode() within group (order by cnt) as said, count(*)::int as ballots
      from bull group by room
  ),
  verdict as (
    select m.room, m.said, m.ballots,
           coalesce(array_agg(b.name order by b.name) filter (where b.cnt <> m.said), '{}') as odd,
           coalesce(array_agg(b.name order by b.name), '{}') as everyone
      from majo m join bull b on b.room = m.room
     group by m.room, m.said, m.ballots
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'room', v.room,
           'place', v_places->(v.room),
           'said', v.said,
           'ballots', v.ballots,
           'names', to_jsonb(v.everyone),
           'verdict', case
                        when coalesce(array_length(v.odd, 1), 0) > 0
                             and v.ballots - array_length(v.odd, 1) = v.said then 'liar'
                        when v.ballots > v.said then 'extra'
                        else 'clean' end,
           'odd', to_jsonb(v.odd)) order by v.room), '[]'::jsonb)
    into v_rooms
    from verdict v;

  select coalesce(array_agg(distinct t.nm), '{}') into v_suspects
    from jsonb_array_elements(v_rooms) r,
         lateral jsonb_array_elements_text(
           case r->>'verdict' when 'liar' then r->'odd'
                              when 'extra' then r->'names'
                              else '[]'::jsonb end) t(nm);

  select coalesce(array_agg(distinct t.nm), '{}') into v_cleared
    from jsonb_array_elements(v_rooms) r,
         lateral jsonb_array_elements_text(
           case when r->>'verdict' = 'clean' then r->'names' else '[]'::jsonb end) t(nm);

  select coalesce(array_agg(x.nm), '{}') into v_prev
    from (select r.result->'suspects' as s
            from scrutin_game_rounds r
           where r.room_id = v_room.id and r.round_no < v_round.round_no
             and r.result ? 'suspects'
           order by r.round_no desc
           limit 1) t,
         lateral jsonb_array_elements_text(t.s) x(nm);

  -- LE VIVIER NE S'EFFACE JAMAIS. L'ancien ordre exigeait que la manche COURANTE
  -- ait des suspects pour que le repli s'applique : une manche muette écrivait
  -- donc `[]`, et le croisement des manches précédentes — que la spec chiffre à
  -- 32 points de taux de résolution — était perdu pour de bon.
  if coalesce(array_length(v_suspects, 1), 0) = 0 then
    v_suspects := v_prev;
  elsif coalesce(array_length(v_prev, 1), 0) > 0 then
    select coalesce(array_agg(x), '{}') into v_suspects
      from unnest(v_suspects) x where x = any(v_prev);
    if coalesce(array_length(v_suspects, 1), 0) = 0 then
      v_suspects := v_prev;
    end if;
  end if;

  -- ⚠️ PAS DE CARNET ICI. Ce `result` est servi à toute la salle dès la phase de
  -- révélation. Les soupçons vivent dans `scrutin_game_entries`, que personne
  -- d'autre ne reçoit ; `scrutin_game_alibi_verdict` les y relit.
  update scrutin_game_rounds
     set result = jsonb_build_object(
           'rule', 'alibi-v1',
           'rooms', v_rooms,
           'suspects', to_jsonb(v_suspects),
           'cleared', to_jsonb(v_cleared),
           -- ⚠️ LE VIVIER D'AVANT. Sans lui, l'écran ne peut PAS dire de combien
           -- on a resserré — et le client ne peut pas le calculer, puisque
           -- `get_game_room` ne sert que la manche courante. La phrase « vous
           -- étiez 6, vous êtes 3 » existait, traduite en quatre langues,
           -- alimentée par une valeur câblée à `null`. C'est pourtant le cœur du
           -- jeu : la spec chiffre ce croisement à 32 points de taux de
           -- résolution. La donnée est publique de toute façon — le vivier de la
           -- manche précédente a été affiché à toute la table.
           'previous', case when coalesce(array_length(v_prev, 1), 0) > 0
                            then to_jsonb(array_length(v_prev, 1)) else 'null'::jsonb end)
   where id = p_round_id;
end $function$;

revoke all on function public.scrutin_game_alibi_reveal(uuid) from public, anon, authenticated;

-- Le verdict relit les carnets là où ils ne fuient pas. `r.phase = 'reveal'`
-- conserve exactement l'ancien périmètre : seules comptent les manches qui ont
-- été dépouillées.
create or replace function public.scrutin_game_alibi_verdict(p_round_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  v_round scrutin_game_rounds;
  v_room scrutin_game_rooms;
  v_culprit text;
  v_votes jsonb;
  v_top text[];
  v_hit boolean;
  v_scores jsonb;
  v_rounds int;
begin
  select * into v_round from scrutin_game_rounds where id = p_round_id;
  select * into v_room from scrutin_game_rooms where id = v_round.room_id;

  select p.name into v_culprit from scrutin_game_players p
   where p.room_id = v_room.id and p.secret->>'role' = 'culprit' limit 1;

  select coalesce(jsonb_object_agg(t.name, t.n), '{}'::jsonb) into v_votes
    from (select e.payload->>'accuse' as name, count(*)::int as n
            from scrutin_game_entries e
           where e.round_id = p_round_id and coalesce(e.payload->>'accuse', '') <> ''
           group by 1) t;

  select coalesce(array_agg(k), '{}') into v_top
    from jsonb_each(v_votes) x(k, v)
   where (v::text)::int = (select max((value::text)::int) from jsonb_each(v_votes));
  v_hit := v_culprit = any(v_top);

  select count(*)::int into v_rounds
    from scrutin_game_rounds r
   where r.room_id = v_room.id and r.round_no < v_round.round_no
     and jsonb_array_length(coalesce(r.result->'suspects', '[]'::jsonb)) >= 2;

  with carnet as (
    select p.name, count(*)::int as justes
      from scrutin_game_entries e
      join scrutin_game_players p on p.id = e.player_id
      join scrutin_game_rounds r on r.id = e.round_id
     where r.room_id = v_room.id
       and r.round_no < v_round.round_no
       and r.phase = 'reveal'
       and e.payload->>'hunch' = v_culprit
     group by p.name
  ),
  accus as (
    select p.name, (e.payload->>'accuse' = v_culprit) as juste
      from scrutin_game_entries e join scrutin_game_players p on p.id = e.player_id
     where e.round_id = p_round_id
  )
  select coalesce(jsonb_object_agg(p.name, s.pts), '{}'::jsonb) into v_scores
    from scrutin_game_players p
    left join lateral (
      select case
               when p.name = v_culprit
                 then 2 * v_rounds + (case when v_hit then 0 else 10 end)
               else 2 * coalesce((select justes from carnet c where c.name = p.name), 0)
                    + (case when coalesce((select juste from accus a where a.name = p.name), false)
                            then 10 else 0 end)
             end as pts) s on true
   where p.room_id = v_room.id;

  update scrutin_game_players p
     set score = greatest(0, coalesce((v_scores->>p.name)::int, 0))
   where p.room_id = v_room.id;

  -- Les carnets rejoignent le résultat FINAL, où ils sont enfin à leur place :
  -- la partie est jouée, et l'écran promettait qu'on les verrait à la fin.
  update scrutin_game_rounds
     set result = jsonb_build_object(
           'rule', 'alibi-v1',
           'final', true,
           'culprit', v_culprit,
           'votes', v_votes,
           'accused', to_jsonb(v_top),
           'hit', v_hit,
           'size', (select count(*) from scrutin_game_players where room_id = v_room.id),
           'carnets', coalesce((
             select jsonb_object_agg(x.name, x.h)
               from (select p.name, jsonb_agg(e.payload->>'hunch' order by r.round_no) as h
                       from scrutin_game_entries e
                       join scrutin_game_players p on p.id = e.player_id
                       join scrutin_game_rounds r on r.id = e.round_id
                      where r.room_id = v_room.id and r.round_no < v_round.round_no
                        and coalesce(e.payload->>'hunch', '') <> ''
                      group by p.name) x), '{}'::jsonb),
           'scores', v_scores)
   where id = p_round_id;
end $function$;

revoke all on function public.scrutin_game_alibi_verdict(uuid) from public, anon, authenticated;
