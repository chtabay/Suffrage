-- CINQ SUR CINQ A SON TABLEAU DU JOUR, comme Banalo.
--
-- Demandé tel quel : « il faut que Cinq sur cinq demande le nom, même
-- fonctionnement sur tous les jeux quotidiens ». Jusqu'ici seul Banalo avait un
-- tableau public quotidien ; Cinq sur cinq ne demandait de nom NULLE PART, donc
-- son joueur n'avait aucune raison de poser un pseudo et ne figurait nulle part
-- avant les classements de saison.
--
-- ⚠️ CETTE TABLE NAÎT SANS COLONNE DE TEXTE LIBRE, et c'est la leçon de
-- `20260907` appliquée d'emblée : chez Banalo il a fallu retirer `nom` après
-- coup, parce qu'un texte stocké à côté du pseudo de compte divergeait et
-- échappait à la prise de la Régie. Ici il n'y a que deux façons de se nommer —
-- un INDEX dans la liste fermée de 600 noms (sans compte), ou RIEN, ce qui veut
-- dire « mon nom est le pseudo de mon compte » et se résout à la lecture.
--
-- ⚠️ PAS DE COLONNE `langue`, CONTRAIREMENT À BANALO, et ce n'est pas un oubli.
-- Banalo classe par langue parce que sa foule EST par langue — on y marque en
-- répondant comme les autres, et les autres ne répondent pas la même chose en
-- espagnol. Cinq sur cinq cherche un PAYS : la réponse est la même partout, son
-- classement du jour est déjà global (`scrutin_game_pays_rank`), et le découper
-- par langue le réduirait sans rien dire de vrai. Les noms de la liste fermée
-- restent traduits — c'est l'INDEX qu'on stocke, l'écran l'affiche dans la
-- langue du lecteur.
create table if not exists public.scrutin_game_pays_noms (
  jour      int  not null check (jour >= 1 and jour <= 100000),
  jeton     text not null check (jeton ~ '^[a-z0-9]{10,40}$'),
  user_id   uuid references auth.users(id) on delete cascade,
  nom_index int check (nom_index >= 0 and nom_index < 10000),
  cree_le   timestamptz not null default now(),
  primary key (jour, jeton),
  -- Un index de la liste, ou un compte qui donnera son pseudo. Jamais ni l'un
  -- ni l'autre : ce serait une ligne sans nom au milieu d'un tableau de noms.
  constraint pays_nom_un_seul check (nom_index is not null or user_id is not null)
);
alter table public.scrutin_game_pays_noms enable row level security;
-- Aucune policy : tout passe par les fonctions `security definer`.
revoke all on table public.scrutin_game_pays_noms from anon, authenticated;

-- Deux joueurs ne portent pas le même nom de liste le même jour.
create unique index if not exists pays_noms_index_unique
  on public.scrutin_game_pays_noms (jour, nom_index) where nom_index is not null;

-- ═════════════════════════════════════════════════════════ déposer son nom
--
-- Même contrat que `scrutin_banalo_nom_deposer`, et la même fonction partagée
-- pour le pseudo : `scrutin_jeux_pseudo_resoudre` reprend celui du compte,
-- adopte le texte si le compte n'en a pas, et REFUSE si un modérateur l'a
-- retiré. La règle du nom vit à un seul endroit pour les deux jeux.
create or replace function public.scrutin_game_pays_nom_deposer(
  p_jour int, p_jeton text, p_index int, p_nom text
) returns jsonb language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_nom text := nullif(btrim(p_nom), '');
  v_res jsonb;
begin
  if coalesce(p_jeton, '') !~ '^[a-z0-9]{10,40}$' then
    return jsonb_build_object('status', 'refus');
  end if;
  -- ⚠️ PAS LES DEUX. Un client qui envoie index ET texte est cassé, et le lui
  -- dire vaut mieux que de choisir à sa place.
  if num_nonnulls(p_index, v_nom) > 1 then
    return jsonb_build_object('status', 'refus');
  end if;

  if p_index is null then
    v_res := public.scrutin_jeux_pseudo_resoudre(v_nom);
    if v_res->>'status' <> 'ok' then return v_res; end if;
  end if;

  begin
    insert into scrutin_game_pays_noms (jour, jeton, user_id, nom_index)
    values (p_jour, p_jeton, v_uid, p_index);
  exception
    when unique_violation then
      if exists (select 1 from scrutin_game_pays_noms
                  where jour = p_jour and jeton = p_jeton) then
        return jsonb_build_object('status', 'deja');
      end if;
      return jsonb_build_object('status', 'pris');
  end;

  return jsonb_build_object('status', 'ok');
end $function$;

-- ══════════════════════════════════════════════════════════ lire le tableau
--
-- ⚠️ LA JOINTURE VERS LE RÉSULTAT PASSE PAR LE JETON **OU** PAR LE COMPTE, et
-- c'est le piège de ce fichier. `scrutin_game_pays_rattacher` EFFACE le jeton de
-- la ligne de résultat quand un compte l'adopte : un joueur connecté a donc un
-- résultat sans jeton et un nom avec. Joindre sur le seul jeton ferait
-- disparaître du tableau exactement les joueurs qui ont un compte — ceux qui s'y
-- inscrivent sous leur pseudo.
--
-- ⚠️ ET ON PREND LE MEILLEUR ESSAI, pas « une » ligne. Entre le moment où un
-- anonyme joue et celui où il rattache, deux lignes peuvent coexister ; la
-- fusion en garde une, mais l'ordre n'est pas garanti pendant l'opération.
create or replace function public.scrutin_game_pays_tableau(
  p_jour int, p_jeton text
) returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare
  -- ⚠️ DIX ET DEUX, LES MÊMES QUE CHEZ BANALO, et pour les mêmes raisons : à
  -- vingt lignes la carte fait 700 px sur un téléphone de 390, et seul inscrit
  -- on serait « premier sur un ».
  v_max constant int := 10;
  v_min constant int := 2;
  v_inscrits int;
  v_inscrit boolean;
  v_bloque boolean;
  v_lignes jsonb;
  v_moi jsonb;
begin
  if coalesce(p_jeton, '') !~ '^[a-z0-9]{10,40}$' then
    return jsonb_build_object('status', 'refus');
  end if;

  with nomme as (
    select n.jeton, n.nom_index, n.cree_le,
           case
             when n.nom_index is not null then null
             when p.bloque_le is not null then null
             else p.pseudo
           end as libelle,
           e.essais
      from scrutin_game_pays_noms n
      left join scrutin_jeux_pseudos p on p.user_id = n.user_id
      left join lateral (
        select r.essais from scrutin_game_pays_results r
         where r.jour = n.jour
           and (r.jeton = n.jeton or (n.user_id is not null and r.user_id = n.user_id))
         order by r.essais
         limit 1
      ) e on true
     where n.jour = p_jour
  )
  select count(*) into v_inscrits
    from nomme where essais is not null and (nom_index is not null or libelle is not null);

  select exists(select 1 from scrutin_game_pays_noms where jour = p_jour and jeton = p_jeton)
    into v_inscrit;
  select exists(select 1 from scrutin_game_pays_noms n
                  join scrutin_jeux_pseudos p on p.user_id = n.user_id
                 where n.jour = p_jour and n.jeton = p_jeton
                   and n.nom_index is null and p.bloque_le is not null)
    into v_bloque;

  if v_inscrits < v_min then
    return jsonb_build_object('status', 'ok', 'inscrits', v_inscrits,
                              'inscrit', v_inscrit, 'bloque', v_bloque,
                              'lignes', '[]'::jsonb);
  end if;

  with nomme as (
    select n.jeton, n.nom_index, n.cree_le,
           case
             when n.nom_index is not null then null
             when p.bloque_le is not null then null
             else p.pseudo
           end as libelle,
           e.essais
      from scrutin_game_pays_noms n
      left join scrutin_jeux_pseudos p on p.user_id = n.user_id
      left join lateral (
        select r.essais from scrutin_game_pays_results r
         where r.jour = n.jour
           and (r.jeton = n.jeton or (n.user_id is not null and r.user_id = n.user_id))
         order by r.essais
         limit 1
      ) e on true
     where n.jour = p_jour
  ), inscrits as (
    -- ⚠️ LE MEILLEUR EST LE PLUS PETIT NOMBRE D'ESSAIS — l'inverse de Banalo, où
    -- le meilleur score est le plus grand. Le copier-coller retourne ça en
    -- silence, et le tableau se lirait à l'envers sans que rien ne le dise.
    --
    -- ⚠️ ET ON NE DÉPARTAGE PAS AU TEMPS. `secondes` est mesuré et ne classe
    -- rien : on joue une fois pour trouver le pays, on rejoue en 1 essai et
    -- 8 secondes. C'est la date du dépôt du nom qui stabilise l'ordre, comme
    -- chez Banalo.
    select v.jeton, v.nom_index, v.libelle, v.essais,
           row_number() over (order by v.essais, v.cree_le) as place
      from nomme v
     where v.essais is not null and (v.nom_index is not null or v.libelle is not null)
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'index', nom_index, 'nom', libelle, 'essais', essais, 'moi', jeton = p_jeton
    ) order by place) filter (where place <= v_max), '[]'::jsonb),
    -- ⚠️ LA LIGNE DU JOUEUR SORT MÊME HORS DE LA TÊTE DE LISTE : un tableau où
    -- l'on ne se trouve pas est un tableau qui parle des autres.
    (select jsonb_build_object('index', nom_index, 'nom', libelle, 'essais', essais, 'place', place)
       from inscrits where jeton = p_jeton and place > v_max)
    into v_lignes, v_moi
    from inscrits;

  return jsonb_build_object(
    'status', 'ok', 'inscrits', v_inscrits, 'inscrit', v_inscrit, 'bloque', v_bloque,
    'lignes', v_lignes, 'moi', v_moi
  );
end $function$;

-- ═══════════════════════════════════════════════════════════════ la purge
--
-- ⚠️ ELLE SE GREFFE SUR LA PURGE EXISTANTE PLUTÔT QUE D'EN CRÉER UNE. Le 30 vit
-- déjà dans `scrutin_game_pays_purge`, dans son cron et dans la politique de
-- confidentialité ; une fonction de plus avec son propre défaut et son propre
-- cron en ferait deux copies supplémentaires, et le compte est déjà tenu à la
-- main dans `CLAUDE.md`. Un seul appel, un seul nombre.
--
-- ⚠️ ET LES NOMS SE PURGENT MÊME DERRIÈRE UN COMPTE, contrairement aux
-- résultats. Un résultat de compte est un palmarès qu'on garde ; un nom au
-- tableau du jour est une PUBLICATION datée, et la promesse faite au joueur est
-- qu'elle ne vaut que pour sa journée. Même règle que `scrutin_banalo_noms`.
create or replace function public.scrutin_game_pays_purge(p_jours int default 30)
returns int language plpgsql volatile security definer set search_path to 'public' as $function$
declare v_n int; v_m int;
begin
  delete from scrutin_game_pays_results
   where user_id is null
     and cree_le < now() - make_interval(days => greatest(coalesce(p_jours, 30), 1));
  get diagnostics v_n = row_count;

  delete from scrutin_game_pays_noms
   where cree_le < now() - make_interval(days => greatest(coalesce(p_jours, 30), 1));
  get diagnostics v_m = row_count;

  return v_n + v_m;
end $function$;

-- ═══════════════════════════════════════════════════════════════ les droits
--
-- ⚠️ `revoke` AVANT `grant` : Postgres donne à PUBLIC un droit d'exécution par
-- défaut sur toute fonction créée. `scrutin_game_pays_purge` existait déjà et
-- garde les siens ; les deux nouvelles naissent nues.
revoke all on function public.scrutin_game_pays_nom_deposer(int, text, int, text) from public;
revoke all on function public.scrutin_game_pays_tableau(int, text) from public;
-- `anon` en a besoin : le tableau se lit et se signe sans compte, exactement
-- comme celui de Banalo — c'est le nom LIBRE qui exige un compte, pas la
-- présence.
grant execute on function public.scrutin_game_pays_nom_deposer(int, text, int, text) to anon, authenticated;
grant execute on function public.scrutin_game_pays_tableau(int, text) to anon, authenticated;
