-- ═══════════════════════════════════════════════════════════════════════════
-- REPRENDRE UNE PARTIE — la liste de ce qu'on a en cours, sans compte.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- LE PROBLÈME. Les jeux se jouent sans compte : le siège vit dans le
-- `localStorage` de l'appareil, sous `placet.game.<CODE>`. L'appareil sait donc
-- très bien où l'on a joué — mais aucun écran ne le lui demandait, et sans le
-- lien sous la main on ne retrouvait plus sa partie. Anodin pour une soirée
-- d'Alibi ; bloquant pour une partie d'échecs qui dure des jours.
--
-- ⚠️ ON PASSE LES JETONS, PAS SEULEMENT LES CODES, ET C'EST LA DÉCISION DE
-- SÉCURITÉ DE CETTE FONCTION. Une fonction qui prendrait une liste de CODES et
-- rendrait l'état des salles serait un guichet d'énumération : on essaie des
-- codes, on apprend lesquels existent, qui y joue et où ils en sont. En exigeant
-- le jeton du siège, on ne rend que des salles où l'appelant est RÉELLEMENT
-- assis — c'est-à-dire exactement ce que son propre `localStorage` contient
-- déjà. La fonction ne peut donc rien apprendre à personne.
--
-- ⚠️ ET ELLE NE REND AUCUN NOM. Ni celui des autres joueurs, ni le sien. Le
-- strict nécessaire pour dessiner une ligne « reprendre » : le jeu, le code,
-- l'état, et depuis quand ça n'a pas bougé.
--
-- ⚠️ LA PURGE FAIT LE MÉNAGE TOUTE SEULE. `scrutin-game-purge` supprime les
-- salles inactives depuis sept jours ; une salle disparue ne ressort tout
-- simplement pas d'ici, et l'écran retire la ligne. C'est pour ça que la
-- fonction rend une LISTE plutôt qu'un état par code : le client compare et
-- oublie ce qui n'est plus là.
create or replace function public.scrutin_game_mine(p_seats jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_out jsonb;
begin
  if jsonb_typeof(p_seats) <> 'array' then
    return '[]'::jsonb;
  end if;
  -- Plafond franc : un appareil qui a trente parties en cours n'existe pas, et
  -- une liste non bornée est une invitation à faire travailler la base pour rien.
  if jsonb_array_length(p_seats) > 30 then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(x order by x->>'lastActiveAt' desc), '[]'::jsonb)
    into v_out
    from (
      select jsonb_build_object(
               'game', r.game,
               'code', r.code,
               'status', r.status,
               'roundNo', r.round_no,
               'lastActiveAt', r.last_active_at
             ) as x
        from jsonb_array_elements(p_seats) as s
        join scrutin_game_players p
          on p.token = (s.value->>'token')
        join scrutin_game_rooms r
          on r.id = p.room_id
         and r.code = upper(btrim(coalesce(s.value->>'code', '')))
    ) t;

  return v_out;
end $function$;

-- ⚠️ LE `revoke` VIENT AVANT LE `grant` : Postgres donne à PUBLIC un droit
-- d'exécution par défaut sur toute fonction. Piège payé deux fois dans ce dépôt.
revoke all on function public.scrutin_game_mine(jsonb) from public, anon, authenticated;
grant execute on function public.scrutin_game_mine(jsonb) to anon, authenticated;
