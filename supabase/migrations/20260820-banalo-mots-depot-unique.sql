-- UN SEUL DÉPÔT PAR JOUR, ET LA CLÉ PRIMAIRE NE SUFFISAIT PAS.
--
-- ⚠️ DÉFAUT TROUVÉ PAR LA VÉRIFICATION, PAS À LA RELECTURE — et il vidait le
-- barème de sa substance.
--
-- La version d'origine comptait sur la clé `(jeton, jour, langue, rang)` pour
-- rendre une grille définitive. Elle ne le faisait pas, parce qu'un doublon
-- écarté FAISAIT QUAND MÊME AVANCER LE RANG. Une grille « sable, sables, SABLE,
-- bateau, poisson, crabe » se réduit à quatre mots — mais posés aux rangs 1, 4,
-- 5 et 6. Les rangs 2 et 3 restaient libres.
--
-- Conséquence : déposer une grille, LIRE LES PARTS que le dépouillement rend,
-- puis renvoyer une seconde grille qui se glisse dans les trous — avec les
-- réponses les plus données. Exactement ce que le `on conflict do nothing` du
-- format chiffré existe pour empêcher, et qui ne marchait pas ici.
--
-- ⚠️ LA GARDE IGNORE LE THÈME, ET C'EST VOULU. Sans ça, on déposerait une
-- première grille sous un thème inventé — donc dans une foule vide, sans risque
-- — uniquement pour voir ce que la fonction rend, puis la vraie grille sous le
-- bon thème.
--
-- On dédoublonne donc AVANT d'insérer, pour que les rangs soient contigus, et
-- surtout on refuse tout second dépôt du même jeton dans la journée. Le
-- `on conflict do nothing` reste, pour deux envois partis en même temps.
--
-- Rien n'avait été mis en ligne entre les deux migrations.

create or replace function public.scrutin_banalo_mots_repondre(
  p_jeton text, p_jour int, p_langue text, p_theme text,
  p_mots text[], p_secondes int default null
) returns jsonb
language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_theme_mots text[];
  v_normes     text[] := '{}';
  v_libelles   text[] := '{}';
  v_brut  text;
  v_norme text;
  i int;
begin
  if coalesce(p_jeton, '') !~ '^[a-z0-9]{10,40}$' then return jsonb_build_object('status', 'invalid'); end if;
  if p_langue is null or p_langue not in ('fr', 'en', 'es', 'pcm') then return jsonb_build_object('status', 'invalid'); end if;
  if p_jour is null or p_jour < 1 or p_jour > 100000 then return jsonb_build_object('status', 'invalid'); end if;
  if coalesce(trim(p_theme), '') = '' or length(p_theme) > 60 then return jsonb_build_object('status', 'invalid'); end if;
  if p_mots is null or array_length(p_mots, 1) is null or array_length(p_mots, 1) > 8 then
    return jsonb_build_object('status', 'invalid');
  end if;

  -- LA GARDE. Elle porte sur (jeton, jour, langue), sans le thème.
  if exists (select 1 from scrutin_banalo_mots
              where jeton = p_jeton and jour = p_jour and langue = p_langue) then
    return scrutin_banalo_mots_etat(p_jeton, p_jour, p_langue, p_theme);
  end if;

  -- ⚠️ CE FILTRE HÉRITE DU TROU CONNU DE LA NORMALISATION : le « s » final n'est
  -- retiré qu'à partir de cinq caractères, donc « mers » ne se replie pas sur
  -- « mer » et passe le filtre du thème. On ne le corrige pas — aucune règle
  -- courte ne plie les pluriels sans fusionner des mots différents, ce que la
  -- migration d'origine a déjà tranché. Et le barème du centre punit l'esquive
  -- tout seul : personne d'autre n'écrit « mers », donc sa part est nulle.
  -- Mesuré : 3,1 % contre 100 % pour les réponses évidentes.
  v_theme_mots := string_to_array(scrutin_game_norm(p_theme), ' ');

  foreach v_brut in array p_mots loop
    v_norme := scrutin_game_norm(coalesce(v_brut, ''));
    continue when v_norme = '' or v_norme = any(v_theme_mots) or v_norme = any(v_normes);
    v_normes   := v_normes   || v_norme;
    v_libelles := v_libelles || left(trim(coalesce(v_brut, '')), 40);
    exit when array_length(v_normes, 1) >= 8;
  end loop;

  for i in 1..coalesce(array_length(v_normes, 1), 0) loop
    insert into scrutin_banalo_mots (jeton, jour, langue, theme, rang, mot, norme, secondes)
    values (p_jeton, p_jour, p_langue, p_theme, i, v_libelles[i], v_normes[i],
            case when p_secondes between 0 and 86400 then p_secondes end)
    on conflict do nothing;
  end loop;

  return scrutin_banalo_mots_etat(p_jeton, p_jour, p_langue, p_theme);
end $function$;

-- ⚠️ Le `revoke` avant le `grant`, comme toujours.
revoke all on function public.scrutin_banalo_mots_repondre(text, int, text, text, text[], int) from public, anon, authenticated;
grant execute on function public.scrutin_banalo_mots_repondre(text, int, text, text, text[], int) to anon, authenticated;
