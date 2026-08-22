-- L'HISTORIQUE DE CINQ SUR CINQ — et son CENTILE, qui n'existait nulle part.
--
-- ══ POURQUOI ═══════════════════════════════════════════════════════════════
--
-- Les jeux quotidiens ont maintenant une page commune de résultats, et elle
-- montre une carte par jeu. Banalo savait déjà rendre ses journées
-- (`scrutin_banalo_historique`) ; Cinq sur cinq ne rendait qu'un RÉSUMÉ
-- (`scrutin_game_pays_me` : parties, moyenne, meilleur, série) et le rang d'UNE
-- journée à la fois. Il n'y avait aucun moyen de tracer une courbe.
--
-- ⚠️ ET LE CENTILE SE CALCULE ICI, PARCE QU'IL N'EST PAS STOCKÉ. Banalo range
-- `mieux` (le pourcentage de joueurs qui ont fait mieux) dans
-- `scrutin_banalo_results` ; Cinq sur cinq ne stocke que le nombre d'essais.
-- On le calcule donc à la lecture, sur la même définition — la part des joueurs
-- de cette journée qui ont fait MOINS d'essais. Les deux jeux rendent alors la
-- même grandeur, et c'est la SEULE qui se compare entre eux : un nombre
-- d'essais et une somme de voix ne s'additionnent pas, un sur-100 ne veut pas
-- dire la même chose d'un thème à l'autre, mais « 14 % ont fait mieux » veut
-- dire la même chose partout.
--
-- ⚠️ IL EST NULLABLE, ET IL DOIT L'ÊTRE. Une journée où l'on est seul joueur n'a
-- pas de position : `0` voudrait dire « premier », le repli le plus flatteur
-- possible sur une donnée absente. Même règle que la colonne `mieux` de Banalo.
--
-- ⚠️ ET RIEN DE NOMINATIF N'EN SORT, comme dans la migration d'origine : on rend
-- les journées d'UN joueur — le sien — et un effectif. Aucun chemin, ici, ne
-- sort l'identité d'un autre.
create or replace function public.scrutin_game_pays_historique(p_max int default 400)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare
  -- ⚠️ MÊME PLANCHER QUE PARTOUT AILLEURS : à un seul joueur, « 0 % ont fait
  -- mieux » est une tautologie, pas un centile.
  v_min_position constant int := 2;
  v_uid uuid := auth.uid();
  v_out jsonb;
begin
  if v_uid is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'jour', jour, 'essais', essais, 'mieux', mieux
         ) order by jour desc), '[]'::jsonb)
    into v_out
    from (
      select r.jour,
             r.essais,
             case when j.joueurs >= v_min_position
                  then round((100.0 * j.meilleurs) / j.joueurs)::int end as mieux
        from public.scrutin_game_pays_results r
        cross join lateral (
          select count(*) as joueurs,
                 count(*) filter (where t.essais < r.essais) as meilleurs
            from public.scrutin_game_pays_results t
           where t.jour = r.jour
        ) j
       where r.user_id = v_uid
       order by r.jour desc
       limit greatest(1, least(coalesce(p_max, 400), 400))
    ) t;

  return jsonb_build_object('status', 'ok', 'journees', v_out);
end $function$;

-- ⚠️ LE `revoke` VIENT AVANT LE `grant` : PUBLIC détient l'EXECUTE par défaut.
-- `anon` n'a rien à faire ici : la fonction exige un `auth.uid()`.
revoke all on function public.scrutin_game_pays_historique(int) from public, anon, authenticated;
grant execute on function public.scrutin_game_pays_historique(int) to authenticated;
