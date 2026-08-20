-- ═══════════════════════════════════════════════════════════════════════════
-- LE SOCLE — `game_join` : quatre correctifs, avant les échecs collaboratifs.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `game_join` est PARTAGÉE par tous les jeux. Trois de ses comportements ont été
-- écrits pour des salles de douze personnes et ne tiennent pas à huit cents ;
-- le quatrième est un défaut simple. On les corrige EN UNE FOIS, avant d'écrire
-- la première ligne des échecs collaboratifs — voir docs/echecs-spec.md §4.
create or replace function public.game_join(p_code text, p_name text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_room scrutin_game_rooms;
  v_name text := left(btrim(coalesce(p_name, '')), 24);
  v_base text;
  v_token text;
  v_joined int;
  v_count int;
  v_cap int;
  v_try int;
  v_large boolean;
begin
  if v_name = '' then return jsonb_build_object('status', 'no_name'); end if;

  -- ⚠️ CORRECTIF 1 — PLUS DE `for update`. Il sérialisait TOUTES les arrivées
  -- sur la ligne salle : à douze personnes c'est invisible, à huit cents qui
  -- scannent le même QR code projeté sur un écran, c'est un point de
  -- sérialisation unique. Rien ici n'en avait besoin — l'unicité du pseudo est
  -- tenue par un INDEX, et le plafond est une soupape, pas un invariant : deux
  -- arrivées simultanées qui le franchissent d'une unité ne cassent rien.
  select * into v_room from scrutin_game_rooms
   where code = upper(btrim(coalesce(p_code, '')));
  if v_room.id is null then return jsonb_build_object('status', 'not_found'); end if;

  -- Le roster se ferme au lancement pour les jeux de rôle : laisser entrer
  -- quelqu'un en cours de partie lui donnerait une carte pré-remplie, donc un
  -- renseignement gratuit au coupable.
  -- ⚠️ CORRECTIF 2 — `fantome` MANQUAIT à cette liste. Sa spec et ses libellés
  -- (`join.errStarted`, en quatre langues) annonçaient un roster fermé, et il ne
  -- l'était pas : on pouvait entrer en pleine partie et recevoir un rôle.
  if v_room.game in ('alibi', 'rodeurs', 'fantome') and v_room.status <> 'lobby' then
    return jsonb_build_object('status', 'started');
  end if;

  -- ⚠️ CORRECTIF 3 — LE PLAFOND EST UNE CAPACITÉ TECHNIQUE, PAS UNE RÈGLE DU
  -- JEU. Pour les jeux de soirée, soixante est déjà au-delà de toute maison.
  -- Les échecs collaboratifs interdisent par contrat toute limite arbitraire :
  -- le nombre ci-dessous est une soupape anti-emballement, à relever quand la
  -- voie de lecture agrégée aura été éprouvée EN CHARGE. Mesuré à ce jour :
  -- l'état agrégé pèse 294 octets, constant quel que soit l'effectif — mais
  -- rien n'a encore été testé au-delà d'une cinquantaine de joueurs, et il faut
  -- le dire plutôt que de laisser croire l'inverse.
  v_large := (v_room.game = 'echecs');
  v_cap := case when v_large then 2000 else 60 end;
  select count(*) into v_count from scrutin_game_players where room_id = v_room.id;
  if v_count >= v_cap then return jsonb_build_object('status', 'full'); end if;

  v_joined := case when v_room.status = 'lobby' then 1 else v_room.round_no + 1 end;

  -- ⚠️ CORRECTIF 4 — LA COLLISION DE PSEUDOS. À douze joueurs, « ce prénom est
  -- déjà pris » est une information utile et on la garde. À huit cents, « Tom »
  -- est pris avant le dixième arrivant, et le refus devient un MUR D'ENTRÉE POUR
  -- DES INNOCENTS. On désambiguïse donc pour les grandes tablées seulement.
  v_base := v_name;
  for v_try in 1 .. 40 loop
    begin
      insert into scrutin_game_players (room_id, name, joined_round)
      values (v_room.id, v_name, v_joined)
      returning token into v_token;
      exit;
    exception when unique_violation then
      v_token := null;
      if not v_large then return jsonb_build_object('status', 'name_taken'); end if;
      v_name := left(v_base, 19) || ' (' || (v_try + 1)::text || ')';
    end;
  end loop;
  if v_token is null then return jsonb_build_object('status', 'name_taken'); end if;

  update scrutin_game_rooms set last_active_at = now() where id = v_room.id;
  return jsonb_build_object('status', 'ok', 'token', v_token, 'name', v_name, 'joinedRound', v_joined);
end $function$;
