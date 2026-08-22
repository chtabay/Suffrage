-- LE PLANCHER DE CINQ CLASSÉS POUR LES MÉDAILLES TOMBE.
--
-- ⚠️ C'ÉTAIT LA MÊME FAUTE QUE LE PLANCHER DE CINQ JOURNÉES, en plus doux — et
-- posée le lendemain de sa correction. Mesuré au moment du dépôt : **3 comptes
-- existent en tout** sur ce produit, dont 1 avec un pseudo. Exiger cinq joueurs
-- CLASSÉS pour décerner une médaille rendait donc la récompense inatteignable,
-- pas seulement rare. La différence avec le classement — une saison peut
-- légitimement ne rien décerner, un classement ne peut pas rester vide pour
-- toujours — atténue la faute, elle ne l'efface pas.
--
-- ⚠️ ET LE PLANCHER N'ACHETAIT RIEN. Ce qu'on voulait éviter est la TAUTOLOGIE :
-- trois joueurs et trois médailles, c'est-à-dire « tout le monde en a une », et
-- un trophée dévalué l'est pour toujours puisqu'il ne se recalcule jamais. Mais
-- ce défaut se règle exactement, sans nombre arbitraire : **on décerne toujours
-- une médaille de moins qu'il n'y a de classés**, plafonnée à trois. Comparé au
-- plancher de cinq, c'est IDENTIQUE dès cinq classés (3 médailles dans les deux
-- cas) et ça ne diffère qu'en dessous, là où le plancher ne donnait rien à des
-- gens qui avaient pourtant battu quelqu'un :
--
--     classés │ plancher à 5      │ une de moins que de joueurs
--     ────────┼───────────────────┼────────────────────────────
--        1    │ rien              │ rien  (1er sur 1 : tautologie)
--        2    │ rien              │ 1 médaille, 1 joueur sans
--        3    │ rien              │ 2 médailles, 1 joueur sans
--        4    │ rien              │ 3 médailles, 1 joueur sans
--        5    │ 3 médailles       │ 3 médailles
--        7    │ 3 médailles       │ 3 médailles
--
-- ⚠️ IL N'Y A DONC PLUS DE PLANCHER PROPRE AUX MÉDAILLES : il ne reste que le
-- DEUX universel de ce produit (`VOTANTS_MIN`, `INSCRITS_MIN`, `minimumClasses`,
-- et la tablée d'un seul membre). Deux, c'est le point où une comparaison
-- commence à exister — être premier de deux n'est pas une tautologie, être
-- premier de un en est une.
--
-- ⚠️ ET CE QUI RENDAIT LE PLANCHER TENTANT EST DÉJÀ RÉGLÉ AILLEURS : l'effectif
-- de la saison est FIGÉ avec le palmarès et affiché à côté de chaque podium.
-- « 🥇 sur 4 joueurs » se lit, et le lecteur juge. C'est le chemin qu'a suivi
-- `assez` chez Banalo du jour, puis le plancher de journées la veille : cesser
-- de fermer, commencer à montrer.

-- ═══════════════════════════════════════════ le classement de la saison
--
-- `minimumMedailles` (un seuil) devient `medailles` (un nombre) : combien
-- seraient décernées AUJOURD'HUI, au vu de l'effectif du moment. L'écran peut
-- alors dire quelque chose de vrai et de mouvant plutôt qu'une règle abstraite.
create or replace function public.scrutin_jeux_saison(p_jeu text, p_saison text)
returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_max constant int := 10;
  -- Jamais « 1er sur 1 » : le même refus que partout (`VOTANTS_MIN` 2,
  -- `INSCRITS_MIN` 2, `COURBE_MIN` 50, `minimumClasses` 2).
  v_min_classes constant int := 2;
  -- Au plus un podium ; jamais autant de médailles que de joueurs.
  v_podium constant int := 3;
  v_uid uuid := auth.uid();
  v_saison text := coalesce(p_saison, scrutin_jeux_saison_de(now()));
  v_joueurs int;
  v_assez boolean;
  v_out jsonb;
begin
  if p_jeu is null or p_jeu not in ('banalo', 'pays', 'tout') then
    return jsonb_build_object('status', 'refus');
  end if;
  if v_saison !~ '^\d{4}-\d{2}$' then
    return jsonb_build_object('status', 'refus');
  end if;

  select count(*) into v_joueurs from scrutin_jeux_saison_table(p_jeu, v_saison);
  v_assez := v_joueurs >= v_min_classes;

  select jsonb_build_object(
    'status', 'ok',
    'saison', v_saison,
    'courante', v_saison = scrutin_jeux_saison_de(now()),
    'joueurs', v_joueurs,
    'minimumClasses', v_min_classes,
    -- ⚠️ COMBIEN DE MÉDAILLES SERAIENT DÉCERNÉES AUJOURD'HUI. Toujours au moins
    -- une de moins qu'il n'y a de classés : sans ça, « tout le monde en a une »
    -- et le trophée ne vaut plus rien — pour toujours, puisqu'il est gelé.
    'medailles', least(v_podium, greatest(v_joueurs - 1, 0)),
    'mesPoints', (select coalesce(round(sum(scrutin_jeux_points(c.rang, c.exaequo)), 1), 0)
                    from scrutin_jeux_saison_journees(p_jeu, v_saison) c
                   where c.user_id = v_uid),
    'mesJournees', (select count(*) from scrutin_jeux_saison_journees(p_jeu, v_saison) c
                     where c.user_id = v_uid),
    'lignes', case when v_assez then
                (select coalesce(jsonb_agg(jsonb_build_object(
                          'place', t.place, 'pseudo', t.pseudo, 'points', t.points,
                          'journees', t.journees, 'gagnees', t.gagnees,
                          'moi', t.user_id = v_uid
                        ) order by t.place), '[]'::jsonb)
                   from scrutin_jeux_saison_table(p_jeu, v_saison) t where t.place <= v_max)
              else '[]'::jsonb end,
    'moi', case when v_assez then
             (select jsonb_build_object('place', t.place, 'pseudo', t.pseudo, 'points', t.points,
                                        'journees', t.journees, 'gagnees', t.gagnees)
                from scrutin_jeux_saison_table(p_jeu, v_saison) t where t.user_id = v_uid)
           end
  ) into v_out;

  return v_out;
end $function$;

-- ═════════════════════════════════════════════ la salle des trophées
--
-- ⚠️ LE PODIUM SE COUPE À L'EFFECTIF DE SA PROPRE SAISON, pas à un seuil global.
-- `joueurs` est figé dans le palmarès, donc une saison à quatre classés garde
-- pour toujours trois médailles, et une saison à deux en garde une — même si le
-- jeu compte trois mille joueurs l'année suivante.
create or replace function public.scrutin_jeux_trophees(p_saisons int)
returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_n int := least(greatest(coalesce(p_saisons, 6), 1), 24);
  v_podium constant int := 3;
  v_out jsonb;
begin
  select coalesce(jsonb_agg(x order by x->>'saison' desc), '[]'::jsonb) into v_out
    from (
      select jsonb_build_object(
               'saison', s.saison,
               'jeux', (
                 select coalesce(jsonb_agg(jsonb_build_object(
                          'jeu', g.jeu,
                          'joueurs', g.joueurs,
                          -- Combien cette saison-là a décerné, gelé avec elle.
                          'medailles', least(v_podium, greatest(g.joueurs - 1, 0)),
                          'podium', (
                            select coalesce(jsonb_agg(jsonb_build_object(
                                     'place', p.place, 'pseudo', ps.pseudo,
                                     'points', p.points, 'journees', p.journees,
                                     'moi', p.user_id = v_uid
                                   ) order by p.place), '[]'::jsonb)
                              from scrutin_jeux_palmares p
                              join scrutin_jeux_pseudos ps
                                on ps.user_id = p.user_id and ps.bloque_le is null
                             where p.saison = g.saison and p.jeu = g.jeu
                               and p.place <= least(v_podium, greatest(g.joueurs - 1, 0))
                          ),
                          -- Ma ligne de cette saison, même hors du podium.
                          'moi', (
                            select jsonb_build_object('place', p.place, 'points', p.points,
                                                      'journees', p.journees)
                              from scrutin_jeux_palmares p
                             where p.saison = g.saison and p.jeu = g.jeu and p.user_id = v_uid
                          )
                        ) order by case g.jeu when 'tout' then 0 when 'banalo' then 1 else 2 end),
                        '[]'::jsonb)
                   from (select distinct saison, jeu, joueurs from scrutin_jeux_palmares
                          where saison = s.saison) g
               )
             ) as x
        from (select distinct saison from scrutin_jeux_palmares
               order by saison desc limit v_n) s
    ) y;

  return jsonb_build_object('status', 'ok', 'saisons', v_out);
end $function$;

revoke all on function public.scrutin_jeux_saison(text, text) from public, anon, authenticated;
revoke all on function public.scrutin_jeux_trophees(int) from public, anon, authenticated;
grant execute on function public.scrutin_jeux_saison(text, text) to anon, authenticated;
grant execute on function public.scrutin_jeux_trophees(int) to anon, authenticated;
