-- BANALO DU JOUR — une question chiffrée par journée, notée contre la foule.
--
-- ═════════════════════════════════════════════════ les trois décisions de fond
--
-- 1. ⚠️ LA TABLE ACCEPTE DES RÉPONSES ANONYMES, et il n'y a pas le choix. Le
--    score d'un joueur est son écart à la MÉDIANE des autres : si seuls les
--    comptes connectés étaient enregistrés, la médiane serait bâtie sur une
--    poignée de gens et le jeu ne fonctionnerait pas au lancement. La clé est
--    donc un jeton tiré par le navigateur, pas un `user_id`.
--
--    Ce qu'on n'empêche PAS, et qu'on assume : quelqu'un peut vider son stockage
--    pour rejouer sous un autre jeton. Même posture que la route d'essai de Cinq
--    sur cinq — ce n'est pas un anti-triche militaire, et se gâcher le jeu reste
--    possible. Défendre coûterait un compte obligatoire, c'est-à-dire le péage
--    que le produit promet de ne pas mettre.
--
-- 2. ⚠️ UNE RÉPONSE EST DÉFINITIVE, ET C'EST STRUCTUREL. La fonction rend la
--    médiane du moment ; si un second dépôt écrasait le premier, n'importe qui
--    répondrait n'importe quoi, lirait la médiane, puis répondrait la médiane et
--    marquerait 10 tous les jours. Le `on conflict do nothing` n'est donc pas
--    une commodité, c'est la règle du jeu.
--
-- 3. ⚠️ LES DISTRIBUTIONS SONT SÉPARÉES PAR LANGUE. Les questions sont
--    LOCALISÉES — le français parle de la France, le pidgin du Nigeria — donc
--    quatre foules répondent à quatre questions différentes le même jour. La
--    médiane, l'effectif, le rang et la part se calculent sur `(jour, langue)`,
--    jamais sur `jour` seul. Une clé primaire à deux colonnes serait un bug
--    silencieux : les Espagnols entreraient dans la médiane des Français.
--
-- ══════════════════════════════════════════════════════════════════ 1. la table

create table if not exists public.scrutin_banalo_reponses (
  -- Jeton anonyme tiré par le navigateur. Pas un identifiant de personne : il
  -- ne sert qu'à recoudre « ma » réponse d'un jour à l'autre.
  jeton    text not null check (jeton ~ '^[a-z0-9]{10,40}$'),
  jour     int  not null check (jour between 1 and 100000),
  langue   text not null check (langue in ('fr', 'en', 'es', 'pcm')),
  -- Bornée des deux côtés : zéro et le négatif n'ont pas de sens pour une
  -- quantité, et au-delà de 10^18 on sort du domaine des doubles exacts.
  reponse  double precision not null check (reponse > 0 and reponse < 1e18),
  cree_le  timestamptz not null default now(),
  primary key (jeton, jour, langue)
);

-- La lecture se fait toujours par journée ET langue : sans cet index, chaque
-- dépôt balaierait toute la table pour calculer une médiane.
create index if not exists scrutin_banalo_reponses_jour_idx
  on public.scrutin_banalo_reponses (jour, langue);

-- Pour la purge, qui balaie par date.
create index if not exists scrutin_banalo_reponses_age_idx
  on public.scrutin_banalo_reponses (cree_le);

-- ⚠️ RLS ACTIVE, AUCUNE POLICY. Rien ne se lit ni ne s'écrit en direct : tout
-- passe par les fonctions `security definer` ci-dessous. Une table sans policy
-- et sans RLS serait ouverte ; avec RLS et sans policy, elle est fermée.
alter table public.scrutin_banalo_reponses enable row level security;

-- ═════════════════════════════════════════════════════════════════ 2. le barème
--
-- ⚠️ CETTE FONCTION EST L'AUTORITÉ, et `src/lib/games/banalo/bareme.ts` en est
-- la spécification exécutable — même partage que `scrutin_game_unanimo_points`
-- et `scoring.ts`, et le même risque : les deux ont DÉJÀ divergé une fois sur ce
-- dépôt. Toute correction ici doit être reportée là-bas, et l'inverse.
--
-- L'échelle est grossière exprès : le joueur doit pouvoir vérifier son score de
-- tête. « À moins de ×1,25 → 10 · ×2 → 6 · ×5 → 3 · ×10 → 1 · au-delà → 0. »
create or replace function public.scrutin_banalo_points(p_facteur double precision)
returns int language sql immutable as $function$
  select case
           when p_facteur is null or p_facteur = 'Infinity'::double precision then 0
           when p_facteur < 1.25 then 10
           when p_facteur < 2    then 6
           when p_facteur < 5    then 3
           when p_facteur < 10   then 1
           else 0
         end;
$function$;

-- L'écart en FACTEUR, dans les deux sens : ÷3 et ×3 valent pareil. Noter au
-- linéaire récompenserait systématiquement celui qui sous-estime, ce qui n'est
-- pas une compétence.
create or replace function public.scrutin_banalo_facteur(
  p_reponse double precision, p_reference double precision
) returns double precision language sql immutable as $function$
  select case
           when p_reponse is null or p_reponse <= 0 then 'Infinity'::double precision
           when p_reference is null or p_reference <= 0 then 'Infinity'::double precision
           when p_reponse >= p_reference then p_reponse / p_reference
           else p_reference / p_reponse
         end;
$function$;

-- ══════════════════════════════════════════════════════ 3. l'état d'une journée
--
-- Le cœur du calcul, partagé par le dépôt et la lecture. Rend TOUT ce que
-- l'écran affiche, pour que le navigateur n'ait rien à recalculer — et donc
-- rien à faire diverger.
--
-- ⚠️ DEUX PLANCHERS, ET ILS NE MESURENT PAS LA MÊME CHOSE.
--
--   · `v_min_score` (5) : en dessous, AUCUN score n'est rendu. Avec une seule
--     réponse, la médiane est la réponse elle-même : le premier joueur du jour
--     marquerait 10 sur 10 pour avoir écrit n'importe quoi. Ce n'est pas un
--     réglage de confort, c'est la limite en dessous de laquelle la note ne veut
--     rien dire.
--
--   · `v_min_position` (20) : en dessous, ni rang ni part. « 3e sur 7 » n'est
--     pas un rang, c'est du bruit — et il n'y a pas encore d'ex aequo à compter.
--
-- Entre les deux, on rend le score sans la position. Trois régimes, chacun avec
-- sa raison, et l'écran doit savoir dire les trois.
create or replace function public.scrutin_banalo_etat(
  p_jeton text, p_jour int, p_langue text
) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_min_score    constant int := 5;
  v_min_position constant int := 20;
  v_votants  int;
  v_mediane  double precision;
  v_mienne   double precision;
  v_facteur  double precision;
  v_points   int;
  v_meilleurs int;
  v_exaequo   int;
begin
  select count(*),
         -- `percentile_disc` rend une valeur OBSERVÉE, jamais interpolée : c'est
         -- ce qui permet à `bareme.ts` de s'accorder au caractère près.
         percentile_disc(0.5) within group (order by reponse)
    into v_votants, v_mediane
    from scrutin_banalo_reponses
   where jour = p_jour and langue = p_langue;

  select reponse into v_mienne
    from scrutin_banalo_reponses
   where jeton = p_jeton and jour = p_jour and langue = p_langue;

  if v_mienne is null then
    return jsonb_build_object('status', 'ok', 'repondu', false, 'votants', v_votants);
  end if;

  if v_votants < v_min_score then
    -- On confirme le dépôt sans inventer une note que la foule ne porte pas.
    return jsonb_build_object('status', 'ok', 'repondu', true, 'votants', v_votants,
                              'mienne', v_mienne, 'assez', false);
  end if;

  v_facteur := scrutin_banalo_facteur(v_mienne, v_mediane);
  v_points  := scrutin_banalo_points(v_facteur);

  select count(*) filter (where scrutin_banalo_points(scrutin_banalo_facteur(reponse, v_mediane)) > v_points),
         count(*) filter (where scrutin_banalo_points(scrutin_banalo_facteur(reponse, v_mediane)) = v_points)
    into v_meilleurs, v_exaequo
    from scrutin_banalo_reponses
   where jour = p_jour and langue = p_langue;

  return jsonb_build_object(
    'status',  'ok',
    'repondu', true,
    'assez',   true,
    'votants', v_votants,
    'mienne',  v_mienne,
    'mediane', v_mediane,
    'facteur', v_facteur,
    'points',  v_points,
    -- Rang OLYMPIQUE : à score égal, même rang. Sinon deux joueurs identiques
    -- sont départagés par l'ordre d'arrivée, et c'est le fuseau qu'on récompense.
    'rang',    v_meilleurs + 1,
    'exaequo', v_exaequo,
    -- ⚠️ AUCUN « +1 » ICI. La part est ce qu'on met DEVANT le rang parce qu'elle
    -- ne bouge pas quand la foule grandit ; avec le « +1 » du rang, la même
    -- performance passerait de 21 % à 20 % entre midi et le lendemain, ce qui
    -- lui retirerait sa seule raison d'être.
    'partmieux', case when v_votants >= v_min_position
                      then round((100.0 * v_meilleurs) / v_votants)::int end,
    'position',  v_votants >= v_min_position
  );
end $function$;

-- ═══════════════════════════════════════════════════════════════ 4. le dépôt
create or replace function public.scrutin_banalo_repondre(
  p_jeton text, p_jour int, p_langue text, p_reponse double precision
) returns jsonb
language plpgsql volatile security definer set search_path to 'public' as $function$
begin
  if coalesce(p_jeton, '') !~ '^[a-z0-9]{10,40}$' then
    return jsonb_build_object('status', 'invalid');
  end if;
  if p_langue is null or p_langue not in ('fr', 'en', 'es', 'pcm') then
    return jsonb_build_object('status', 'invalid');
  end if;
  if p_jour is null or p_jour < 1 or p_jour > 100000 then
    return jsonb_build_object('status', 'invalid');
  end if;
  if p_reponse is null or not (p_reponse > 0) or p_reponse >= 1e18 then
    return jsonb_build_object('status', 'invalid');
  end if;

  -- ⚠️ `do nothing`, JAMAIS `do update`. Voir la décision 2 de l'en-tête : un
  -- second dépôt après lecture de la médiane vaudrait 10 points tous les jours.
  insert into scrutin_banalo_reponses (jeton, jour, langue, reponse)
  values (p_jeton, p_jour, p_langue, p_reponse)
  on conflict (jeton, jour, langue) do nothing;

  return scrutin_banalo_etat(p_jeton, p_jour, p_langue);
end $function$;

-- ══════════════════════════════════════════════════════════════ 5. l'entretien
--
-- ⚠️ UNE TABLE SANS DURÉE DE CONSERVATION EST UNE TABLE SANS DURÉE DE
-- CONSERVATION. La leçon est déjà écrite dans `20260810-jeux-retention.sql` :
-- « une durée non annoncée est une durée qui n'existe pas ». On garde trente
-- jours — assez pour que la journée de la veille soit toujours lisible et pour
-- qu'un joueur retrouve sa série, largement moins qu'indéfiniment.
--
-- ⚠️ CE CHIFFRE DOIT ÊTRE ANNONCÉ DANS LA POLITIQUE DE CONFIDENTIALITÉ, comme
-- le 7 des salles de jeu. Tant qu'il ne l'est pas, l'engagement n'existe que
-- dans ce fichier.
create or replace function public.scrutin_banalo_purge(p_days int default 30)
returns int language plpgsql security definer set search_path to 'public' as $function$
declare v_n int;
begin
  delete from scrutin_banalo_reponses
   where cree_le < now() - make_interval(days => greatest(coalesce(p_days, 30), 1));
  get diagnostics v_n = row_count;
  return v_n;
end $function$;

-- ═══════════════════════════════════════════════════════════════ 6. les droits
--
-- ⚠️ LE `grant` NE SUFFIT PAS : PUBLIC détient l'EXECUTE par défaut sur toute
-- fonction créée. Le `revoke` vient donc AVANT, et dans cet ordre. Piège déjà
-- payé plusieurs fois dans ce dépôt.
revoke all on function public.scrutin_banalo_points(double precision) from public, anon, authenticated;
revoke all on function public.scrutin_banalo_facteur(double precision, double precision) from public, anon, authenticated;
revoke all on function public.scrutin_banalo_etat(text, int, text) from public, anon, authenticated;
revoke all on function public.scrutin_banalo_repondre(text, int, text, double precision) from public, anon, authenticated;
revoke all on function public.scrutin_banalo_purge(int) from public, anon, authenticated;

-- Le jeu se joue SANS COMPTE : `anon` doit pouvoir déposer et lire.
grant execute on function public.scrutin_banalo_etat(text, int, text) to anon, authenticated;
grant execute on function public.scrutin_banalo_repondre(text, int, text, double precision) to anon, authenticated;
-- Le barème et la purge ne sont appelés que depuis l'intérieur : personne d'autre.
