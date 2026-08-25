-- LA PORTE MONTRE LE HAUT DU CLASSEMENT DE LA SAISON
--
-- Demandé : « dans la page de catalogue, il manque un petit aperçu du
-- classement général / points consolidé pour donner envie d'ouvrir les
-- classements ». L'index `/games/quotidien` y était un lien à deux lignes de
-- texte, identique tous les jours : rien à y voir, donc aucune raison de le
-- toucher — le défaut déjà payé par la mention de Placet (« elle était discrète
-- parce qu'elle n'avait rien à dire »).
--
-- ⚠️ ÇA PASSE PAR `scrutin_jeux_porte` ET PAS PAR UN SECOND APPEL. L'en-tête de
-- `20260909` l'écrit noir sur blanc : « la porte ne faisait AUCUN aller-retour,
-- lui en faire faire deux la ralentirait là où l'on veut entrer vite ». On
-- ajoute donc une CLÉ au jsonb rendu, ce qui ne change pas la signature — donc
-- pas de `drop`, donc pas d'ambiguïté PostgREST, et un client déployé qui ignore
-- la clé continue de marcher.
--
-- ⚠️ ON NE RECALCULE RIEN : le haut du classement sort de
-- `scrutin_jeux_saison_table`, la même fonction que l'écran des classements.
-- Recopier ici un `sum(scrutin_jeux_points(...))` ferait un second barème qui
-- dérive du premier — et le premier est celui qui GÈLE les trophées, lesquels ne
-- se recalculent pas. La table n'a aucun `grant` (`revoke ... from public, anon,
-- authenticated`) : elle n'est appelable que depuis une fonction `security
-- definer`, ce que celle-ci est.
--
-- ⚠️ MÊME PLANCHER DE DEUX QUE PARTOUT (`VOTANTS_MIN`, `INSCRITS_MIN`,
-- `minimumClasses`) : un aperçu d'UNE ligne est le « 1er sur 1 » que ce produit
-- refuse — une récompense servie à quelqu'un qui n'a battu personne. Sous le
-- plancher la clé rend `null` et la carte de la porte reste ce qu'elle était.
--
-- ⚠️ ET C'EST LA PORTÉE `tout`, JAMAIS UN JEU. C'est le seul classement dont
-- l'objet est de récompenser qui joue aux DEUX ; en montrer un seul depuis une
-- page qui les propose tous les deux désignerait un favori. Pas de langue non
-- plus : `scrutin_jeux_saison` n'en lit une que pour `banalo`.

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
  -- L'APERÇU DE LA SAISON. Trois lignes au plus : c'est une vitrine posée sous
  -- deux vignettes de jeu, pas un tableau — le tableau est à un tap de là.
  v_tete constant int := 3;
  v_min_classes constant int := 2;
  v_saison text := scrutin_jeux_saison_de(now());
  v_uid uuid := auth.uid();
  v_classes int;
  v_apercu jsonb := null;
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

  -- ── L'aperçu du classement de la saison ───────────────────────────────
  --
  -- ⚠️ `moi` SORT MÊME QUAND JE SUIS DANS LA TÊTE DE LISTE, et c'est l'écran qui
  -- décide de le montrer ou non — exactement le partage de `scrutin_jeux_saison`
  -- et de `ListeDuTableau` : la base rend, l'écran coupe. Le faire ici
  -- obligerait à recopier la règle de repêchage à deux endroits.
  select count(*) into v_classes
    from scrutin_jeux_saison_table('tout', v_saison, null);
  if v_classes >= v_min_classes then
    select jsonb_build_object(
             'saison', v_saison,
             'joueurs', v_classes,
             'lignes', (select coalesce(jsonb_agg(jsonb_build_object(
                                 'place', t.place, 'pseudo', t.pseudo,
                                 'points', t.points, 'moi', t.user_id = v_uid
                               ) order by t.place), '[]'::jsonb)
                          from scrutin_jeux_saison_table('tout', v_saison, null) t
                         where t.place <= v_tete),
             'moi', (select jsonb_build_object('place', t.place, 'pseudo', t.pseudo,
                                               'points', t.points)
                       from scrutin_jeux_saison_table('tout', v_saison, null) t
                      where t.user_id = v_uid))
      into v_apercu;
  end if;

  return jsonb_build_object('status', 'ok', 'banalo', v_banalo, 'pays', v_pays,
                            'saison', v_apercu);
end $function$;

-- ⚠️ `revoke` AVANT `grant` : Postgres donne à PUBLIC un droit d'exécution par
-- défaut sur toute fonction créée. `anon` en a besoin — c'est précisément le
-- joueur sans compte que cette fonction sert, et le classement de saison se
-- REGARDE sans compte (il faut un compte pour y FIGURER, pas pour le lire).
revoke all on function public.scrutin_jeux_porte(text, int, text, text, text, int)
  from public, anon, authenticated;
grant execute on function public.scrutin_jeux_porte(text, int, text, text, text, int)
  to anon, authenticated;

-- ═══════════════════════════════════════ vérification, puis on annule tout
do $$
declare
  v jsonb;
  v_saison text := scrutin_jeux_saison_de(now());
  v_classes int;
begin
  select count(*) into v_classes from scrutin_jeux_saison_table('tout', v_saison, null);

  -- 1. la porte rend toujours ses deux jeux, et maintenant une clé `saison`
  v := scrutin_jeux_porte(null, null, 'fr', null, null, null);
  if v->>'status' is distinct from 'ok' then
    raise exception '1. la porte ne répond plus ok : %', v;
  end if;
  if not (v ? 'banalo' and v ? 'pays' and v ? 'saison') then
    raise exception '1b. une clé manque : %', v;
  end if;

  -- 2. l'aperçu suit le plancher de deux classés
  if v_classes >= 2 then
    if v->'saison' = 'null'::jsonb or v->'saison' is null then
      raise exception '2. % classés et pas d''aperçu', v_classes;
    end if;
    if (v->'saison'->>'joueurs')::int <> v_classes then
      raise exception '2b. effectif annoncé % pour % classés',
        v->'saison'->>'joueurs', v_classes;
    end if;
    -- ⚠️ L'INVARIANT DU TABLEAU DU JOUR, APPLIQUÉ ICI : jamais plus de lignes
    -- que la tête demandée, et jamais une ligne sans pseudo — la jointure sur
    -- `scrutin_jeux_pseudos` est ce qui garantit qu'un nom retiré disparaît.
    if jsonb_array_length(v->'saison'->'lignes') > 3 then
      raise exception '2c. % lignes pour une tête de 3',
        jsonb_array_length(v->'saison'->'lignes');
    end if;
    if exists (select 1 from jsonb_array_elements(v->'saison'->'lignes') l
                where l->>'pseudo' is null or l->>'points' is null) then
      raise exception '2d. une ligne sans pseudo ou sans points : %', v->'saison'->'lignes';
    end if;
    -- 3. l'ordre est celui du classement, et il descend
    if exists (select 1 from jsonb_array_elements(v->'saison'->'lignes')
                       with ordinality as e(l, i)
                where (e.l->>'place')::int <> e.i) then
      raise exception '3. les places ne suivent pas l''ordre : %', v->'saison'->'lignes';
    end if;
  else
    raise notice 'moins de deux classés (%) : l''aperçu doit être null', v_classes;
    if v->'saison' <> 'null'::jsonb then
      raise exception '2e. aperçu servi sous le plancher : %', v->'saison';
    end if;
  end if;

  -- 4. `anon` peut lire l'aperçu : le classement se REGARDE sans compte.
  set local role anon;
  v := scrutin_jeux_porte(null, null, 'fr', null, null, null);
  if v->>'status' is distinct from 'ok' then
    raise exception '4. anon ne peut plus appeler la porte : %', v;
  end if;
  if v_classes >= 2 and (v->'saison'->>'joueurs')::int <> v_classes then
    raise exception '4b. anon ne voit pas le classement : %', v->'saison';
  end if;
  -- ⚠️ ET IL N'A AUCUNE LIGNE « moi » : `auth.uid()` est nul, donc `moi` doit
  -- être absent et aucune ligne ne doit se déclarer sienne.
  if v_classes >= 2 then
    if v->'saison'->'moi' is not null and v->'saison'->'moi' <> 'null'::jsonb then
      raise exception '4c. anon a une ligne « moi » : %', v->'saison'->'moi';
    end if;
    if exists (select 1 from jsonb_array_elements(v->'saison'->'lignes') l
                where (l->>'moi')::boolean) then
      raise exception '4d. anon se reconnaît dans une ligne : %', v->'saison'->'lignes';
    end if;
  end if;
  reset role;

  raise exception 'VÉRIFICATION OK (% classés) — on annule', v_classes;
end $$;
