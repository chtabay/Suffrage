-- LE TABLEAU DU JOUR — et le dépôt de nom qui y donne accès.
--
-- ══ LA RÈGLE ═══════════════════════════════════════════════════════════════
--
-- Pour figurer au tableau d'une journée, il faut SOIT un compte Placet — et
-- alors le nom est libre — SOIT déposer un nom PRIS DANS LA LISTE FERMÉE
-- (`src/content/banalo/noms.ts`). Qui ne fait ni l'un ni l'autre joue
-- normalement, voit son rang et son centile, et n'apparaît pas au tableau.
--
-- ⚠️ ON N'ENTRE AU TABLEAU QUE PAR UN GESTE. Personne n'y est inscrit sans
-- l'avoir voulu : c'est ce qui rend acceptable d'exposer le dernier autant que
-- le premier, puisque le dernier n'y est que s'il a choisi d'y être.
--
-- ⚠️ ET LE TEXTE LIBRE N'EXISTE QUE LÀ OÙ QUELQU'UN EN RÉPOND. Un champ de
-- pseudo sur un classement public n'est pas un champ d'identité : c'est un canal
-- de publication d'une ligne, adressé à tous les joueurs du jour. Par gravité
-- réelle : du harcèlement visant quelqu'un de précis (« Marie du CM2 pue ») ; des
-- données personnelles déposées sans malice par un enfant, sur un jeu dont la
-- politique déclare une tranche d'âge « enfant » ; puis seulement les insultes.
-- Un filtre ne règle que le troisième. Sans compte, la modération est
-- IMPOSSIBLE par construction — un jeton anonyme ne se bannit pas, on efface son
-- `localStorage` et on revient. D'où la règle, et d'où les deux CONTRAINTES
-- ci-dessous : elles tiennent l'invariant en base, pas dans du code d'écran.
--
-- ⚠️ LE NOM EST DÉPOSÉ PAR JOURNÉE, PAS UNE FOIS POUR LE COMPTE — et ça compte.
-- Il n'y a donc AUCUN profil, aucun nom permanent, rien à découvrir en dehors
-- d'une journée : la table se purge à trente jours comme les réponses. C'est ce
-- qui distingue ce tableau du « nom permanent et découvrable » que
-- `docs/regularite-des-joueurs.md` §5 donnait comme le vrai coût d'un système
-- d'amis. Un joueur qui veut le même nom tous les jours le redépose ; son
-- navigateur peut le lui pré-remplir, la base ne le garde pas.
--
-- ⚠️ ET LE TABLEAU NE MONTRE JAMAIS LES MOTS. Il rend un nom et un score, rien
-- d'autre. La garde du format « mots » — ne jamais rendre le mot d'un autre
-- joueur — n'est pas entamée d'un pouce.

create table if not exists public.scrutin_banalo_noms (
  jour      int  not null check (jour >= 1 and jour <= 100000),
  langue    text not null check (langue in ('fr', 'en', 'es', 'pcm')),
  jeton     text not null check (jeton ~ '^[a-z0-9]{10,40}$'),
  -- Le compte, s'il y en a un. C'est LUI la prise pour agir.
  user_id   uuid references auth.users(id) on delete cascade,
  -- Le rang du nom dans le vocabulaire fermé. ⚠️ ON STOCKE L'INDEX, PAS LE
  -- LIBELLÉ : un nom déposé en français s'afficherait en français à un
  -- anglophone du même tableau. L'index se rend dans la langue de qui REGARDE.
  nom_index int  check (nom_index >= 0 and nom_index < 10000),
  -- Le texte libre, réservé aux comptes.
  nom       text check (length(btrim(nom)) between 1 and 24),
  cree_le   timestamptz not null default now(),
  primary key (jour, langue, jeton),
  -- ⚠️ L'UN OU L'AUTRE, JAMAIS LES DEUX NI AUCUN.
  constraint banalo_nom_un_seul check (num_nonnulls(nom_index, nom) = 1),
  -- ⚠️ LA RÈGLE, EN CONTRAINTE : pas de texte libre sans compte. Une erreur
  -- d'écran ne peut pas la contourner, et c'est le seul endroit où je veux
  -- qu'elle vive.
  constraint banalo_nom_libre_exige_un_compte check (nom is null or user_id is not null)
);

-- ⚠️ DEUX NOMS IDENTIQUES LE MÊME JOUR FERAIENT DEUX LIGNES INDISTINCTES au
-- tableau. L'unicité est par journée et par langue — pas globale : rien
-- n'empêche « Renard de minuit » de revenir demain, porté par quelqu'un d'autre.
create unique index if not exists banalo_noms_index_unique
  on public.scrutin_banalo_noms (jour, langue, nom_index) where nom_index is not null;
create unique index if not exists banalo_noms_libre_unique
  on public.scrutin_banalo_noms (jour, langue, lower(btrim(nom))) where nom is not null;

alter table public.scrutin_banalo_noms enable row level security;
-- RLS active, AUCUNE policy : il n'existe aucun chemin de lecture directe, pour
-- personne. Tout passe par les deux fonctions `security definer`.
revoke all on table public.scrutin_banalo_noms from anon, authenticated;

-- ══════════════════════════════════════════════════════ 1. déposer son nom
--
-- Rend `{status}` : `ok`, `pris` (ce nom est déjà porté aujourd'hui), `compte`
-- (texte libre sans compte), ou `deja` (ce joueur a déjà déposé).
create or replace function public.scrutin_banalo_nom_deposer(
  p_jeton text, p_jour int, p_langue text, p_index int, p_nom text
) returns jsonb
language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_nom text := nullif(btrim(p_nom), '');
begin
  if p_jeton !~ '^[a-z0-9]{10,40}$' or p_langue not in ('fr','en','es','pcm') then
    return jsonb_build_object('status', 'refus');
  end if;
  -- ⚠️ L'UN OU L'AUTRE. On ne « corrige » pas un appel qui envoie les deux :
  -- c'est un client cassé, et le lui dire vaut mieux que de choisir à sa place.
  if num_nonnulls(p_index, v_nom) <> 1 then
    return jsonb_build_object('status', 'refus');
  end if;
  -- ⚠️ LA RÈGLE, RE-VÉRIFIÉE ICI : la contrainte de table la tiendrait de toute
  -- façon, mais elle rendrait une erreur Postgres illisible. On répond un statut.
  if v_nom is not null and v_uid is null then
    return jsonb_build_object('status', 'compte');
  end if;

  begin
    insert into scrutin_banalo_noms (jour, langue, jeton, user_id, nom_index, nom)
    values (p_jour, p_langue, p_jeton, v_uid, p_index, v_nom);
  exception
    when unique_violation then
      -- Deux cas, et l'appelant doit pouvoir les distinguer : le nom est pris
      -- par quelqu'un d'autre, ou c'est CE joueur qui a déjà déposé.
      if exists (select 1 from scrutin_banalo_noms
                  where jour = p_jour and langue = p_langue and jeton = p_jeton) then
        return jsonb_build_object('status', 'deja');
      end if;
      return jsonb_build_object('status', 'pris');
  end;

  return jsonb_build_object('status', 'ok');
end $function$;

-- ══════════════════════════════════════════════════════════ 2. lire le tableau
--
-- ⚠️ IL N'Y A PAS DE NUMÉRO DE RANG DANS CE TABLEAU, ET C'EST VOULU. Le rang
-- affiché serait soit celui parmi les INSCRITS — « 1er » alors que trente
-- joueurs ont fait mieux sans s'inscrire, c'est-à-dire un mensonge —, soit le
-- rang réel, et deux lignes voisines afficheraient « 3e » puis « 17e », ce qui
-- se lit comme un trou. La liste est ordonnée par score : l'ordre parle, et le
-- vrai rang du joueur est déjà sur sa carte de score, juste au-dessus.
--
-- `p_theme` nul = journée chiffrée ; sinon journée de mots.
create or replace function public.scrutin_banalo_tableau(
  p_jeton text, p_jour int, p_langue text, p_theme text
) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  -- ⚠️ DIX, ET C'EST UNE MESURE D'ÉCRAN, PAS UN GOÛT. Essayé à vingt : sur un
  -- téléphone de 390 px, la carte du tableau fait alors 700 px de haut et il
  -- faut la franchir entière pour atteindre le partage et l'offre de compte,
  -- qui sont les deux seules choses que l'après-partie a à demander. Et vingt
  -- noms qu'on ne connaît pas ne se lisent pas : un tableau de jeu quotidien
  -- répond à « où suis-je », pas à « qui sont les autres ». Dix gardent les
  -- deux bouts — la tête du classement, et ma ligne. Elle est ajoutée en plus
  -- si elle n'y est pas, voir plus bas.
  v_max constant int := 10;
  -- ⚠️ MÊME PLANCHER QUE LA POSITION (`v_min_position`), ET POUR LA MÊME RAISON :
  -- seul inscrit, on serait « premier sur un », ce qui est une tautologie, pas
  -- un classement.
  v_min constant int := 2;
  v_min_partage constant int := 2;
  v_inscrits int;
  -- ⚠️ « JE SUIS INSCRIT » NE SE DÉDUIT PAS DES LIGNES. Sous le plancher, la
  -- liste est vide : le seul inscrit de la journée serait alors indiscernable de
  -- quelqu'un qui n'a rien déposé, l'écran lui reproposerait le formulaire et la
  -- base répondrait « deja » à un joueur qui n'a rien demandé. Le drapeau est
  -- donc rendu à part, et sur les DEUX chemins de sortie.
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

  -- LES SCORES DE LA JOURNÉE, dans l'unité de son format. ⚠️ UNE UNION, PAS UN
  -- BRANCHEMENT : les deux branches sont mutuellement exclusives par `p_theme`,
  -- donc une seule rend des lignes. C'est plus court à lire qu'un `if`, et
  -- surtout ça garde le tableau dans UNE seule requête.
  with scores as (
    -- JOURNÉE CHIFFRÉE : le score du barème, calculé comme à l'écran.
    select b.jeton,
           scrutin_banalo_points(scrutin_banalo_facteur(b.reponse, med.m))::numeric as score
      from scrutin_banalo_reponses b
      cross join (select percentile_disc(0.5) within group (order by reponse) as m
                    from scrutin_banalo_reponses
                   where jour = p_jour and langue = p_langue) med
     where p_theme is null and b.jour = p_jour and b.langue = p_langue
    union all
    -- JOURNÉE DE MOTS : la somme des voix, un mot orphelin valant zéro — la
    -- même règle que partout ailleurs, et surtout la MÊME que l'écran du jour.
    select mm.jeton,
           sum(case when e.n >= v_min_partage then e.n else 0 end)::numeric
      from scrutin_banalo_mots mm
      join (select norme, count(distinct jeton) as n
              from scrutin_banalo_mots
             where jour = p_jour and langue = p_langue and theme = p_theme
             group by norme) e on e.norme = mm.norme
     where p_theme is not null and mm.jour = p_jour and mm.langue = p_langue
       and mm.theme = p_theme
     group by mm.jeton
  ), inscrits as (
    select n.jeton, n.nom_index, n.nom, s.score,
           row_number() over (order by s.score desc, n.cree_le) as place
      from scrutin_banalo_noms n
      join scores s on s.jeton = n.jeton
     where n.jour = p_jour and n.langue = p_langue
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'index', nom_index, 'nom', nom, 'score', score, 'moi', jeton = p_jeton
    ) order by place) filter (where place <= v_max), '[]'::jsonb),
    -- ⚠️ LA LIGNE DU JOUEUR SORT MÊME HORS DE LA TÊTE DE LISTE. Un tableau où
    -- l'on ne se trouve pas est un tableau qui parle des autres.
    (select jsonb_build_object('index', nom_index, 'nom', nom, 'score', score, 'place', place)
       from inscrits where jeton = p_jeton and place > v_max)
    into v_lignes, v_moi
    from inscrits;

  return jsonb_build_object(
    'status', 'ok',
    'inscrits', v_inscrits,
    'inscrit', v_inscrit,
    'lignes', v_lignes,
    'moi', v_moi
  );
end $function$;

-- ══════════════════════════════════════════════════════════════ 3. la purge
--
-- ⚠️ LES NOMS S'EFFACENT AVEC LES RÉPONSES, À TRENTE JOURS. C'est ce qui fait
-- qu'il n'existe aucun profil ni aucun nom permanent : le tableau d'une journée
-- meurt avec la journée. Le chiffre 30 vit aussi dans la politique de
-- confidentialité — le changer d'un seul côté transforme un engagement écrit en
-- mensonge.
create or replace function public.scrutin_banalo_noms_purge(p_jours int default 30)
returns int language plpgsql volatile security definer set search_path to 'public' as $function$
declare v_n int;
begin
  delete from scrutin_banalo_noms where cree_le < now() - make_interval(days => p_jours);
  get diagnostics v_n = row_count;
  return v_n;
end $function$;

-- ⚠️ Le `revoke` AVANT le `grant` : Postgres donne à PUBLIC un droit d'exécution
-- par défaut sur toute fonction.
revoke all on function public.scrutin_banalo_nom_deposer(text, int, text, int, text) from public, anon, authenticated;
revoke all on function public.scrutin_banalo_tableau(text, int, text, text) from public, anon, authenticated;
revoke all on function public.scrutin_banalo_noms_purge(int) from public, anon, authenticated;
grant execute on function public.scrutin_banalo_nom_deposer(text, int, text, int, text) to anon, authenticated;
grant execute on function public.scrutin_banalo_tableau(text, int, text, text) to anon, authenticated;

-- ⚠️ ET LE CRON, DANS LE MÊME FICHIER. C'est la QUATRIÈME fonction de purge de
-- ce dépôt, et les trois premières sont arrivées sans leur cron — d'où la règle
-- déjà écrite dans `20260820-banalo-mots-purge-cron.sql` : « une durée non
-- annoncée est une durée qui n'existe pas, et une durée annoncée que personne
-- n'applique est pire ». Le nom d'un joueur meurt donc avec sa journée.
--
-- 03 h 53 UTC : six minutes après la purge des mots, pour ne pas lancer deux
-- balayages sur la même minute.
select cron.schedule('scrutin-banalo-noms-purge', '53 3 * * *',
                     $$select public.scrutin_banalo_noms_purge(30);$$);
