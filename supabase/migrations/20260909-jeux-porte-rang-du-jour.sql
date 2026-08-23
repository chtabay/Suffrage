-- LA PORTE `/games` MONTRE LA PLACE DU JOUEUR SUR CHAQUE CARTE QUOTIDIENNE.
--
-- Demandé : « ajoute sur la carte de chaque jeu quotidien le classement du
-- joueur ». Jusqu'ici la porte ne parlait que des JEUX ; elle ne disait rien de
-- CE joueur, alors que c'est la page par laquelle il entre tous les jours.
--
-- ⚠️ UNE SEULE FONCTION POUR LES DEUX JEUX, ET C'EST LA RAISON D'ÊTRE DU
-- FICHIER. Les briques existaient — `scrutin_game_pays_position` est légère, et
-- côté Banalo le rang se calcule sur `scrutin_banalo_scores` — mais les appeler
-- séparément ferait DEUX allers-retours au chargement d'une page qui, jusqu'à
-- présent, n'en faisait aucun. Une porte doit s'ouvrir vite.
--
-- ⚠️ ET ELLE MARCHE SANS COMPTE, par les jetons. C'est la moitié qui compte : un
-- habitué sans compte est exactement celui à qui la porte n'avait rien à dire,
-- et « 12e sur 83 aujourd'hui » est un chiffre à lui, vrai, qui change tous les
-- jours. Le classement de saison, lui, exige un compte ET un pseudo — il reste
-- affiché par `RangJeux` dans la barre de Placet.
--
-- ⚠️ LES DEUX JETONS SONT DISTINCTS ET LE RESTENT. `games/jeton.ts` en tient un
-- par jeu pour que la base ne puisse pas relier « ce navigateur a joué aux
-- deux ». Les passer ensemble ICI ne les relie pas davantage : la fonction ne
-- les écrit nulle part, elle lit et rend deux réponses indépendantes.
create or replace function public.scrutin_jeux_porte(
  p_jeton_banalo text,
  p_jour_banalo  int,
  p_langue       text,
  p_theme        text,
  p_jeton_pays   text,
  p_jour_pays    int
) returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_score numeric;
  v_essais int;
  v_banalo jsonb := jsonb_build_object('joue', false, 'rang', null, 'sur', null);
  v_pays   jsonb := jsonb_build_object('joue', false, 'rang', null, 'sur', null);
begin
  -- ── Banalo du jour ────────────────────────────────────────────────────
  --
  -- ⚠️ LE RANG SE CALCULE DANS LA FOULE DE SA LANGUE, comme partout chez
  -- Banalo : on y marque en répondant comme les autres, et les autres ne
  -- répondent pas la même chose en espagnol.
  if coalesce(p_jeton_banalo, '') ~ '^[a-z0-9]{10,40}$'
     and p_jour_banalo is not null and p_langue in ('fr','en','es','pcm') then
    select s.score into v_score
      from scrutin_banalo_scores(p_jour_banalo, p_langue, p_theme) s
     where s.jeton = p_jeton_banalo;
    if v_score is not null then
      select jsonb_build_object(
               'joue', true,
               -- Le meilleur score de Banalo est le PLUS GRAND : on compte ceux
               -- qui font mieux, donc STRICTEMENT au-dessus.
               'rang', count(*) filter (where s.score > v_score) + 1,
               'sur',  count(*))
        into v_banalo
        from scrutin_banalo_scores(p_jour_banalo, p_langue, p_theme) s;
    end if;
  end if;

  -- ── Cinq sur cinq ─────────────────────────────────────────────────────
  --
  -- ⚠️ ICI LE MEILLEUR EST LE PLUS PETIT NOMBRE D'ESSAIS. La comparaison
  -- s'inverse, et le copier-coller la retourne en silence : le joueur lirait
  -- « 71e sur 83 » pour une victoire en trois coups.
  --
  -- ⚠️ ET LA LIGNE D'UN COMPTE N'A PLUS DE JETON : `scrutin_game_pays_rattacher`
  -- l'efface en adoptant la partie. On regarde donc le compte D'ABORD, le jeton
  -- ensuite — sinon un joueur connecté ne se verrait jamais.
  if p_jour_pays is not null then
    if auth.uid() is not null then
      select r.essais into v_essais from scrutin_game_pays_results r
       where r.user_id = auth.uid() and r.jour = p_jour_pays;
    end if;
    if v_essais is null and coalesce(p_jeton_pays, '') ~ '^[a-z0-9]{10,40}$' then
      select r.essais into v_essais from scrutin_game_pays_results r
       where r.jeton = p_jeton_pays and r.jour = p_jour_pays;
    end if;
    if v_essais is not null then
      select jsonb_build_object(
               'joue', true,
               'rang', count(*) filter (where r.essais < v_essais) + 1,
               'sur',  count(*))
        into v_pays
        from scrutin_game_pays_results r
       where r.jour = p_jour_pays;
    end if;
  end if;

  return jsonb_build_object('status', 'ok', 'banalo', v_banalo, 'pays', v_pays);
end $function$;

-- ⚠️ `revoke` AVANT `grant` : Postgres donne à PUBLIC un droit d'exécution par
-- défaut sur toute fonction créée. `anon` en a besoin — c'est précisément le
-- joueur sans compte que cette fonction sert.
revoke all on function public.scrutin_jeux_porte(text, int, text, text, text, int) from public;
grant execute on function public.scrutin_jeux_porte(text, int, text, text, text, int) to anon, authenticated;
