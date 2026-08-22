-- LA TABLÉE — la couche sociale des jeux quotidiens, SANS graphe d'amis.
--
-- ══ CE QUE C'EST, ET CE QUE ÇA N'EST PAS ═══════════════════════════════════
--
-- On n'est pas ami AVEC QUELQU'UN, on est DANS UNE TABLÉE. Il n'y a donc ni
-- demande, ni acceptation, ni blocage, ni annuaire : on rejoint par lien, on
-- voit qui a joué aujourd'hui, et la tablée meurt avec sa purge.
--
-- ⚠️ C'EST CE QUI ÉVITE LES CINQ COÛTS QUE `docs/regularite-des-joueurs.md` §5
-- A REFUSÉ DE PAYER. L'étude `docs/amis-et-notifications.md` les a décomposés :
-- ils viennent de l'IDENTITÉ PERMANENTE et de l'ANNUAIRE, pas du lien social.
-- Ici le nom vit dans la TABLÉE — exactement comme le nom du tableau du jour vit
-- dans la JOURNÉE — et les trois propriétés qui rendent l'absence de modération
-- tenable sont conservées les trois : on entre par code, l'objet est jetable,
-- tout s'efface. NYT Games, le comparable le plus proche, s'ajoute lui aussi par
-- lien d'invitation à code, jamais par pseudo cherchable.
--
-- ⚠️ ET LA TABLÉE N'A PAS DE NOM. C'est délibéré : un nom de tablée serait du
-- texte libre affiché à tous ses membres, donc une surface de modération de plus,
-- et il faudrait alors décider s'il exige un compte — ce qui mettrait une
-- friction sur la moitié « invitation », c'est-à-dire précisément celle dont le
-- produit a besoin à onze joueurs. Une tablée se reconnaît aux gens qui y sont ;
-- on la rejoint par lien, donc on n'a jamais à la nommer pour y entrer.
--
-- ⚠️ LA RÈGLE DU NOM EST CELLE DU TABLEAU DU JOUR, MOT POUR MOT : liste fermée
-- de 600 noms sans compte, texte libre seulement derrière un compte. Un champ de
-- pseudo libre n'est pas un champ d'identité, c'est un canal de publication vers
-- tous les autres membres — et sans compte il n'y a personne pour en répondre,
-- un jeton anonyme ne se bannissant pas.

-- ═══════════════════════════════════════════════════════════ 1. les tables
create table if not exists public.scrutin_banalo_tablees (
  id      uuid primary key default gen_random_uuid(),
  -- Le code voyage dans un LIEN, jamais tapé à la main : pas besoin d'un
  -- alphabet sans ambiguïté, mais besoin qu'il ne se devine pas. 12 chiffres
  -- hexadécimaux font 2,8 × 10¹⁴ possibilités.
  code    text not null unique check (code ~ '^[0-9a-f]{12}$'),
  cree_le timestamptz not null default now()
);

create table if not exists public.scrutin_banalo_tablee_membres (
  tablee_id uuid not null references public.scrutin_banalo_tablees (id) on delete cascade,
  jeton     text not null check (jeton ~ '^[a-z0-9]{10,40}$'),
  -- Le compte, s'il y en a un. C'est LUI la prise pour agir sur un texte libre.
  user_id   uuid references auth.users (id) on delete cascade,
  -- ⚠️ ON STOCKE L'INDEX, PAS LE LIBELLÉ : un nom déposé en français
  -- s'afficherait en français à un anglophone de la même tablée.
  nom_index int check (nom_index >= 0 and nom_index < 10000),
  nom       text check (length(btrim(nom)) between 1 and 24),
  cree_le   timestamptz not null default now(),
  primary key (tablee_id, jeton),
  -- ⚠️ L'UN OU L'AUTRE, JAMAIS LES DEUX NI AUCUN.
  constraint banalo_tablee_nom_un_seul check (num_nonnulls(nom_index, nom) = 1),
  -- ⚠️ LA RÈGLE, EN CONTRAINTE : pas de texte libre sans compte. Une erreur
  -- d'écran ne peut pas la contourner.
  constraint banalo_tablee_nom_libre check (nom is null or user_id is not null)
);

-- Deux noms identiques dans la même tablée feraient deux lignes indistinctes.
create unique index if not exists banalo_tablee_index_unique
  on public.scrutin_banalo_tablee_membres (tablee_id, nom_index) where nom_index is not null;
create unique index if not exists banalo_tablee_libre_unique
  on public.scrutin_banalo_tablee_membres (tablee_id, lower(btrim(nom))) where nom is not null;
create index if not exists banalo_tablee_membres_jeton
  on public.scrutin_banalo_tablee_membres (jeton);

-- RLS active, AUCUNE policy : aucun chemin de lecture directe, pour personne.
alter table public.scrutin_banalo_tablees enable row level security;
alter table public.scrutin_banalo_tablee_membres enable row level security;
revoke all on table public.scrutin_banalo_tablees from anon, authenticated;
revoke all on table public.scrutin_banalo_tablee_membres from anon, authenticated;

-- ══════════════════════════════════════ 2. les scores d'une journée, EN UN SEUL ENDROIT
--
-- ⚠️ TROISIÈME COPIE ÉVITÉE. Le calcul « quel score chaque jeton a-t-il fait ce
-- jour-là » vivait déjà dans les deux fonctions d'état ET dans
-- `scrutin_banalo_tableau`. La tablée en aurait fait une troisième — et c'est
-- exactement ce qui dérive : la règle du mot orphelin (rien si personne d'autre
-- ne l'a écrit) a déjà dû être appliquée à deux endroits le 22 août. On la sort
-- donc ici, et `scrutin_banalo_tableau` est réécrite plus bas pour s'en servir.
--
-- ⚠️ ELLE N'EST DONNÉE À PERSONNE. Elle rend les scores de TOUS les jetons d'une
-- journée : appelable directement, elle dirait qui a fait quoi. Seules les
-- fonctions `security definer` d'à côté l'appellent, et elles s'exécutent avec
-- les droits du propriétaire.
create or replace function public.scrutin_banalo_scores(p_jour int, p_langue text, p_theme text)
returns table (jeton text, score numeric)
language sql stable security definer set search_path to 'public' as $function$
  -- JOURNÉE CHIFFRÉE : le score du barème, calculé comme à l'écran.
  select b.jeton,
         scrutin_banalo_points(scrutin_banalo_facteur(b.reponse, med.m))::numeric
    from scrutin_banalo_reponses b
    cross join (select percentile_disc(0.5) within group (order by reponse) as m
                  from scrutin_banalo_reponses
                 where jour = p_jour and langue = p_langue) med
   where p_theme is null and b.jour = p_jour and b.langue = p_langue
  union all
  -- JOURNÉE DE MOTS : la somme des voix, un mot orphelin valant zéro.
  select mm.jeton,
         sum(case when e.n >= 2 then e.n else 0 end)::numeric
    from scrutin_banalo_mots mm
    join (select norme, count(distinct jeton) as n
            from scrutin_banalo_mots
           where jour = p_jour and langue = p_langue and theme = p_theme
           group by norme) e on e.norme = mm.norme
   where p_theme is not null and mm.jour = p_jour and mm.langue = p_langue
     and mm.theme = p_theme
   group by mm.jeton;
$function$;

revoke all on function public.scrutin_banalo_scores(int, text, text) from public, anon, authenticated;

-- ══════════════════════════════════════════════════ 3. le tableau du jour, refactorisé
--
-- Même comportement qu'au 23/08, à ceci près qu'il tire ses scores de
-- `scrutin_banalo_scores` au lieu d'en porter sa propre copie.
create or replace function public.scrutin_banalo_tableau(
  p_jeton text, p_jour int, p_langue text, p_theme text
) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  -- ⚠️ DIX, ET C'EST UNE MESURE D'ÉCRAN, PAS UN GOÛT. À vingt, la carte fait
  -- 700 px sur un téléphone de 390 et il faut la franchir entière pour atteindre
  -- le partage et l'offre de compte.
  v_max constant int := 10;
  -- ⚠️ MÊME PLANCHER QUE LA POSITION : seul inscrit, on serait « premier sur un ».
  v_min constant int := 2;
  v_inscrits int;
  -- ⚠️ « JE SUIS INSCRIT » NE SE DÉDUIT PAS DES LIGNES : sous le plancher la
  -- liste est vide, et le seul inscrit serait indiscernable de qui n'a rien
  -- déposé. Rendu à part, sur les DEUX chemins de sortie.
  v_inscrit boolean;
  v_lignes jsonb;
  v_moi jsonb;
begin
  select count(*) into v_inscrits
    from scrutin_banalo_noms where jour = p_jour and langue = p_langue;
  select exists(select 1 from scrutin_banalo_noms
                 where jour = p_jour and langue = p_langue and jeton = p_jeton)
    into v_inscrit;
  if v_inscrits < v_min then
    return jsonb_build_object('status', 'ok', 'inscrits', v_inscrits,
                              'inscrit', v_inscrit, 'lignes', '[]'::jsonb);
  end if;

  with inscrits as (
    select n.jeton, n.nom_index, n.nom, s.score,
           row_number() over (order by s.score desc, n.cree_le) as place
      from scrutin_banalo_noms n
      join scrutin_banalo_scores(p_jour, p_langue, p_theme) s on s.jeton = n.jeton
     where n.jour = p_jour and n.langue = p_langue
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'index', nom_index, 'nom', nom, 'score', score, 'moi', jeton = p_jeton
    ) order by place) filter (where place <= v_max), '[]'::jsonb),
    -- ⚠️ LA LIGNE DU JOUEUR SORT MÊME HORS DE LA TÊTE DE LISTE.
    (select jsonb_build_object('index', nom_index, 'nom', nom, 'score', score, 'place', place)
       from inscrits where jeton = p_jeton and place > v_max)
    into v_lignes, v_moi
    from inscrits;

  return jsonb_build_object(
    'status', 'ok', 'inscrits', v_inscrits, 'inscrit', v_inscrit,
    'lignes', v_lignes, 'moi', v_moi
  );
end $function$;

-- ═══════════════════════════════════════════════════════════ 4. créer une tablée
--
-- Rend `{status, code}`. `trop` si ce navigateur en a déjà beaucoup — un garde
-- contre la création en boucle, pas une limite de produit.
create or replace function public.scrutin_banalo_tablee_creer(
  p_jeton text, p_index int, p_nom text
) returns jsonb
language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_max_par_jeton constant int := 10;
  v_uid  uuid := auth.uid();
  v_code text;
  v_id   uuid;
begin
  if coalesce(p_jeton, '') !~ '^[a-z0-9]{10,40}$' then
    return jsonb_build_object('status', 'refus');
  end if;
  -- ⚠️ L'UN OU L'AUTRE. On ne « corrige » pas un client qui envoie les deux.
  if num_nonnulls(p_index, p_nom) <> 1 then
    return jsonb_build_object('status', 'refus');
  end if;
  -- ⚠️ LA RÈGLE, RE-VÉRIFIÉE ICI : la contrainte de table la tiendrait de toute
  -- façon, mais elle rendrait une erreur Postgres illisible.
  if p_nom is not null and v_uid is null then
    return jsonb_build_object('status', 'compte');
  end if;
  if (select count(*) from scrutin_banalo_tablee_membres where jeton = p_jeton) >= v_max_par_jeton then
    return jsonb_build_object('status', 'trop');
  end if;

  -- Le code se tire jusqu'à ce qu'il soit libre. À 2,8 × 10¹⁴ possibilités, la
  -- deuxième itération n'arrivera jamais ; la boucle est là par principe.
  loop
    v_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
    exit when not exists (select 1 from scrutin_banalo_tablees where code = v_code);
  end loop;

  insert into scrutin_banalo_tablees (code) values (v_code) returning id into v_id;
  insert into scrutin_banalo_tablee_membres (tablee_id, jeton, user_id, nom_index, nom)
  values (v_id, p_jeton, v_uid, p_index, btrim(p_nom));

  return jsonb_build_object('status', 'ok', 'code', v_code);
end $function$;

-- ═════════════════════════════════════════════════════════ 5. rejoindre une tablée
--
-- `inconnue` (code faux ou tablée purgée), `deja` (déjà dedans), `pris` (ce nom
-- est porté par quelqu'un d'autre ici), `compte` (texte libre sans compte),
-- `pleine`, `refus`.
create or replace function public.scrutin_banalo_tablee_rejoindre(
  p_jeton text, p_code text, p_index int, p_nom text
) returns jsonb
language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  -- ⚠️ TRENTE, ET C'EST LA DÉFINITION DE L'OBJET. Une tablée est un groupe de
  -- gens qu'on connaît ; au-delà c'est un classement public, et il en existe
  -- déjà un — le tableau du jour, ouvert à tout le monde.
  v_max_membres constant int := 30;
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if coalesce(p_jeton, '') !~ '^[a-z0-9]{10,40}$'
     or coalesce(p_code, '') !~ '^[0-9a-f]{12}$' then
    return jsonb_build_object('status', 'refus');
  end if;
  if num_nonnulls(p_index, p_nom) <> 1 then
    return jsonb_build_object('status', 'refus');
  end if;
  if p_nom is not null and v_uid is null then
    return jsonb_build_object('status', 'compte');
  end if;

  select id into v_id from scrutin_banalo_tablees where code = p_code;
  if v_id is null then
    return jsonb_build_object('status', 'inconnue');
  end if;
  if exists (select 1 from scrutin_banalo_tablee_membres
              where tablee_id = v_id and jeton = p_jeton) then
    return jsonb_build_object('status', 'deja');
  end if;
  if (select count(*) from scrutin_banalo_tablee_membres where tablee_id = v_id) >= v_max_membres then
    return jsonb_build_object('status', 'pleine');
  end if;

  begin
    insert into scrutin_banalo_tablee_membres (tablee_id, jeton, user_id, nom_index, nom)
    values (v_id, p_jeton, v_uid, p_index, btrim(p_nom));
  exception when unique_violation then
    return jsonb_build_object('status', 'pris');
  end;

  return jsonb_build_object('status', 'ok');
end $function$;

-- ═══════════════════════════════════════════════════ 6. mes tablées, aujourd'hui
--
-- ⚠️ RIEN NE SORT TANT QUE JE N'AI PAS JOUÉ. Le score d'un ami ne divulgue pas
-- la réponse du jour — il est relatif à la foule — mais il ANCRE, et le §5 l'a
-- écrit : « ça met une pression que le jeu ne demande pas ». La garde est ICI,
-- en base, et pas seulement dans l'écran : `joue` faux ⇒ aucun score ne part.
--
-- ⚠️ ET LA PRÉSENCE N'EST PAS LE SCORE. Un membre qui a joué dans une AUTRE
-- langue apparaît comme ayant joué, sans chiffre : sa foule n'est pas la mienne,
-- donc son score ne se compare pas au mien. L'effacer serait un mensonge —
-- l'écran dirait « n'a pas joué » de quelqu'un qui a joué.
create or replace function public.scrutin_banalo_tablee_du_jour(
  p_jeton text, p_jour int, p_langue text, p_theme text
) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_joue boolean;
  v_out  jsonb;
begin
  if coalesce(p_jeton, '') !~ '^[a-z0-9]{10,40}$' then
    return jsonb_build_object('status', 'ok', 'tablees', '[]'::jsonb);
  end if;

  select exists (
    select 1 from scrutin_banalo_reponses
     where jeton = p_jeton and jour = p_jour and langue = p_langue and p_theme is null
    union all
    select 1 from scrutin_banalo_mots
     where jeton = p_jeton and jour = p_jour and langue = p_langue and theme = p_theme
  ) into v_joue;

  with miennes as (
    select t.id, t.code
      from scrutin_banalo_tablees t
      join scrutin_banalo_tablee_membres m on m.tablee_id = t.id
     where m.jeton = p_jeton
  ), membres as (
    select mi.id, mi.code, m.jeton, m.nom_index, m.nom, m.cree_le,
           -- « A joué », TOUTES LANGUES CONFONDUES.
           exists (select 1 from scrutin_banalo_reponses r
                    where r.jeton = m.jeton and r.jour = p_jour)
        or exists (select 1 from scrutin_banalo_mots w
                    where w.jeton = m.jeton and w.jour = p_jour) as a_joue,
           -- Le score, seulement dans MA foule, et seulement si j'ai joué.
           case when v_joue then s.score end as score
      from miennes mi
      join scrutin_banalo_tablee_membres m on m.tablee_id = mi.id
      left join scrutin_banalo_scores(p_jour, p_langue, p_theme) s on s.jeton = m.jeton
  )
  select coalesce(jsonb_agg(x order by x->>'code'), '[]'::jsonb) into v_out from (
    select jsonb_build_object(
             'code', code,
             'membres', jsonb_agg(jsonb_build_object(
                 'index', nom_index, 'nom', nom, 'joue', a_joue,
                 'score', score, 'moi', jeton = p_jeton
               ) order by a_joue desc, score desc nulls last, cree_le)
           ) as x
      from membres group by id, code
  ) t;

  return jsonb_build_object('status', 'ok', 'joue', v_joue, 'tablees', v_out);
end $function$;

-- ══════════════════════════════════════════════════════════════ 7. la purge
--
-- ⚠️ ELLE SUIT LES DONNÉES, ELLE NE COMPTE PAS LES JOURS. Une tablée s'efface
-- quand plus AUCUN de ses membres n'a de réponse en base — et comme les réponses
-- se purgent à trente jours, cela veut dire « personne n'y a joué depuis trente
-- jours », sans qu'aucune durée nouvelle ne soit écrite nulle part. C'est ce qui
-- évite une cinquième copie du 30. Le `cree_le` protège la tablée qu'on vient de
-- créer et dont le fondateur n'a pas encore joué.
create or replace function public.scrutin_banalo_tablees_purge(p_jours int default 30)
returns int language plpgsql volatile security definer set search_path to 'public' as $function$
declare v_n int;
begin
  delete from scrutin_banalo_tablees t
   where t.cree_le < now() - make_interval(days => p_jours)
     and not exists (
       select 1 from scrutin_banalo_tablee_membres m
        where m.tablee_id = t.id
          and (exists (select 1 from scrutin_banalo_reponses r where r.jeton = m.jeton)
            or exists (select 1 from scrutin_banalo_mots w where w.jeton = m.jeton))
     );
  get diagnostics v_n = row_count;
  return v_n;
end $function$;

-- ══════════════════════════════════════════════════════════════ 8. les droits
--
-- ⚠️ Le `revoke` AVANT le `grant` : PUBLIC détient l'EXECUTE par défaut.
revoke all on function public.scrutin_banalo_tablee_creer(text, int, text) from public, anon, authenticated;
revoke all on function public.scrutin_banalo_tablee_rejoindre(text, text, int, text) from public, anon, authenticated;
revoke all on function public.scrutin_banalo_tablee_du_jour(text, int, text, text) from public, anon, authenticated;
revoke all on function public.scrutin_banalo_tablees_purge(int) from public, anon, authenticated;

-- Tout marche SANS COMPTE : `anon` en a besoin.
grant execute on function public.scrutin_banalo_tablee_creer(text, int, text) to anon, authenticated;
grant execute on function public.scrutin_banalo_tablee_rejoindre(text, text, int, text) to anon, authenticated;
grant execute on function public.scrutin_banalo_tablee_du_jour(text, int, text, text) to anon, authenticated;

-- ⚠️ ET LE CRON, DANS LE MÊME FICHIER — cinquième fonction de purge du dépôt, et
-- les trois premières sont arrivées sans le leur. 03 h 59 UTC : six minutes après
-- la purge des noms.
select cron.schedule('scrutin-banalo-tablees-purge', '59 3 * * *',
                     $$select public.scrutin_banalo_tablees_purge(30);$$);
