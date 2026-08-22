-- CINQ SUR CINQ COMPTE ENFIN SA FOULE.
--
-- LE MENSONGE QU'ON CORRIGE. `scrutin_game_pays_results` ne contenait que des
-- COMPTES : un joueur sans compte ne laissait aucune trace. Le « rang du jour »
-- affiché au joueur, le centile de la page commune et le classement sur la durée
-- se calculaient donc sur une poignée de comptes en se présentant comme des
-- classements parmi les joueurs. À deux comptes par journée, « 1er sur 2 »
-- pendant que trente personnes jouaient.
--
-- ⚠️ ET ÇA DEVIENT BLOQUANT AVEC LES SAISONS. Un barème par PLACE (25 · 18 · 15…)
-- n'a de sens que si la place veut dire quelque chose : être premier de trois
-- comptes ne vaut pas être premier de trois cents joueurs. Tant que la table
-- ignore la foule, une médaille de Cinq sur cinq ne récompense rien.
--
-- ⚠️ CE FICHIER RENVERSE UN POINT DE CONCEPTION ÉCRIT, ET C'EST DÉLIBÉRÉ.
-- `banalo/jeton.ts` dit noir sur blanc « Cinq sur cinq s'en passe fièrement », et
-- `pays/local.ts` promet « il n'y a pas de jeton stable, rien qui permette de
-- reconnaître ce navigateur d'un jour à l'autre côté serveur ». C'était vrai
-- tant que la base ne servait qu'au classement facultatif d'un compte. Ça cesse
-- de l'être le jour où le jeu prétend classer. Trois conséquences qui se paient
-- ensemble, dans le même commit : le commentaire de `pays/local.ts` devient
-- faux, celui de `banalo/jeton.ts` aussi, et **la politique de confidentialité
-- doit décrire ce jeton et sa durée** — en trois langues, comme pour le 30 et
-- pour le 7.
--
-- ⚠️ LE JETON EST LE MÊME MARCHÉ QUE CELUI DE BANALO, PAS UN PLUS GRAND : trente
-- caractères au hasard dans le navigateur, aucun compte, aucune adresse, aucune
-- empreinte. Deux navigateurs du même humain restent deux joueurs. Il ne voyage
-- qu'avec (jour, essais, secondes) et **il ne survit pas au rattachement** — dès
-- qu'un compte adopte la ligne, le jeton est effacé, pour qu'aucun identifiant
-- anonyme ne reste collé à une identité.
--
-- ⚠️ ET IL EST DISTINCT DE CELUI DE BANALO. Une clé partagée relierait les deux
-- jeux dans la base : « ce navigateur a joué à Banalo ET à Cinq sur cinq » est
-- une information que personne n'a demandée et qui ne sert à rien ici.

-- ═══════════════════════════════════════════════════════ 1. LA TABLE S'OUVRE
--
-- ⚠️ LA CLÉ PRIMAIRE TOMBE PARCE QU'ELLE NE PEUT PLUS TENIR : `user_id` devient
-- nullable, et une clé primaire n'accepte pas de colonne nulle. Elle est
-- remplacée par DEUX index uniques partiels, qui portent exactement la même
-- règle — une ligne par joueur et par journée — mais chacun pour sa population.
-- ⚠️ LA CLÉ PRIMAIRE TOMBE D'ABORD, ET L'ORDRE N'EST PAS COSMÉTIQUE : Postgres
-- refuse `drop not null` sur une colonne encore membre d'une clé primaire
-- (« column "user_id" is in a primary key »). Payé à la première tentative.
alter table public.scrutin_game_pays_results
  drop constraint if exists scrutin_game_pays_results_pkey;

alter table public.scrutin_game_pays_results
  alter column user_id drop not null;

alter table public.scrutin_game_pays_results
  add column if not exists jeton text;

-- La même forme que le jeton de Banalo : le `check` refuse tout le reste, donc
-- un client qui inventerait une clé de sa façon se fait renvoyer.
alter table public.scrutin_game_pays_results
  drop constraint if exists scrutin_game_pays_results_jeton_check;
alter table public.scrutin_game_pays_results
  add constraint scrutin_game_pays_results_jeton_check
  check (jeton is null or jeton ~ '^[a-z0-9]{10,40}$');

-- ⚠️ UNE LIGNE APPARTIENT TOUJOURS À QUELQU'UN. Sans cette garde, une ligne sans
-- compte NI jeton serait invisible à la purge (qui vise les anonymes) et
-- invisible au rattachement : elle compterait dans la foule pour toujours, sans
-- que personne ne puisse la réclamer ni l'effacer.
alter table public.scrutin_game_pays_results
  drop constraint if exists scrutin_game_pays_results_proprietaire_check;
alter table public.scrutin_game_pays_results
  add constraint scrutin_game_pays_results_proprietaire_check
  check (user_id is not null or jeton is not null);

create unique index if not exists scrutin_game_pays_results_compte_idx
  on public.scrutin_game_pays_results (user_id, jour) where user_id is not null;
create unique index if not exists scrutin_game_pays_results_jeton_idx
  on public.scrutin_game_pays_results (jeton, jour) where jeton is not null;

-- ══════════════════════════════════════════════════ 2. MA POSITION DU JOUR
--
-- ⚠️ ELLE S'OUVRE AUX ANONYMES, ET C'EST LA CONTREPARTIE DU JETON. Jusqu'ici
-- `scrutin_game_pays_rank` exigeait un compte : un joueur sans compte ne voyait
-- aucun rang. Maintenant qu'il ALIMENTE le classement, le lui cacher serait lui
-- prendre sa donnée sans rien rendre.
--
-- Le rang reste « olympique » : à égalité d'essais, tout le monde a le même
-- rang. Sinon deux joueurs à 7 essais seraient 4e et 5e selon l'ordre d'arrivée,
-- ce qui récompenserait le fuseau horaire plutôt que le jeu.
create or replace function public.scrutin_game_pays_position(p_jour int, p_jeton text)
returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_uid    uuid := auth.uid();
  v_essais int;
  v_out    jsonb;
begin
  if p_jour is null or p_jour < 1 then
    raise exception 'invalid' using errcode = '22023';
  end if;

  if v_uid is not null then
    select essais into v_essais from scrutin_game_pays_results
     where user_id = v_uid and jour = p_jour;
  elsif coalesce(p_jeton, '') ~ '^[a-z0-9]{10,40}$' then
    select essais into v_essais from scrutin_game_pays_results
     where jeton = p_jeton and jour = p_jour;
  end if;

  -- Pas de résultat pour cette journée : ce n'est pas une erreur, c'est « pas
  -- encore joué ». L'écran n'affiche alors simplement pas de rang.
  if v_essais is null then
    return jsonb_build_object('joueurs', (select count(*) from scrutin_game_pays_results
                                           where jour = p_jour),
                              'rang', null, 'essais', null, 'median', null);
  end if;

  select jsonb_build_object(
           'joueurs', count(*),
           'rang',    count(*) filter (where essais < v_essais) + 1,
           -- ⚠️ L'EFFECTIF DE MON PAQUET D'EX AEQUO, parce que le barème de
           -- saison en dépend : les ex aequo se PARTAGENT les places qu'ils
           -- occupent, donc « combien avons-nous fait pareil » vaut autant que
           -- « quelle place ». L'écran s'en sert aussi pour dire « 3e, à égalité
           -- avec 4 autres » plutôt qu'un « 3e » qui laisse croire à un solo.
           'exaequo', count(*) filter (where essais = v_essais),
           'essais',  v_essais,
           'median',  percentile_disc(0.5) within group (order by essais)
         )
    into v_out
    from scrutin_game_pays_results
   where jour = p_jour;

  return v_out;
end $function$;

-- ══════════════════════════════════════════ 3. DÉPOSER UNE PARTIE, AVEC OU SANS
--
-- ⚠️ UN SEUL CHEMIN POUR LES DEUX POPULATIONS, ET IL S'APPELLE À LA FIN DE
-- CHAQUE PARTIE. Un compte connecté écrit sous son `user_id` et sans jeton ; un
-- anonyme écrit sous son jeton. Personne n'écrit sous les deux : c'est ce qui
-- garantit qu'aucun identifiant anonyme ne reste attaché à une identité.
--
-- Il rend la POSITION dans la foulée, parce que c'est le moment où le joueur la
-- regarde et que le faire en deux appels doublerait l'aller-retour.
--
-- « Le meilleur gagne » : rejouer une journée n'empile pas et n'écrase pas un
-- meilleur résultat. Même règle que `scrutin_game_pays_save`, dont ce dépôt est
-- la version d'une seule journée.
create or replace function public.scrutin_game_pays_jouer(
  p_jour int, p_essais int, p_secondes int, p_jeton text
) returns jsonb
language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_jeton text;
begin
  if p_jour is null or p_jour < 1 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  if p_essais is null or p_essais not between 1 and 500 then
    raise exception 'invalid' using errcode = '22023';
  end if;

  -- ⚠️ LE JETON N'EST LU QUE SI L'ON N'EST PAS CONNECTÉ. Un compte qui en
  -- enverrait un quand même — parce que le navigateur en garde un d'avant —
  -- ne doit pas en semer la trace dans sa propre ligne.
  if v_uid is null then
    if coalesce(p_jeton, '') !~ '^[a-z0-9]{10,40}$' then
      raise exception 'invalid' using errcode = '22023';
    end if;
    v_jeton := p_jeton;
  end if;

  insert into scrutin_game_pays_results (user_id, jeton, jour, essais, secondes)
  values (v_uid, v_jeton, p_jour, p_essais,
          case when p_secondes between 0 and 86400 then p_secondes end);

  return scrutin_game_pays_position(p_jour, p_jeton);
exception
  when unique_violation then
    -- Déjà une ligne pour ce joueur et cette journée : on garde le meilleur.
    update scrutin_game_pays_results r
       set secondes = case when p_essais < r.essais
                           then case when p_secondes between 0 and 86400 then p_secondes end
                           else r.secondes end,
           essais   = least(r.essais, p_essais)
     where r.jour = p_jour
       and ((v_uid is not null and r.user_id = v_uid)
         or (v_uid is null and r.jeton = v_jeton));
    return scrutin_game_pays_position(p_jour, p_jeton);
end $function$;

-- ══════════════════════════════════════════════════════ 4. LE RATTACHEMENT
--
-- ⚠️ IL FUSIONNE, IL N'ÉCRASE PAS. Une même journée peut exister DEUX fois au
-- moment où l'on se connecte : la ligne anonyme écrite en jouant, et la ligne du
-- compte venue du lot que le navigateur avait gardé. On garde le meilleur des
-- deux, puis la ligne anonyme disparaît — sinon elle compterait une seconde fois
-- dans la foule, et le joueur se ferait concurrence à lui-même.
create or replace function public.scrutin_game_pays_rattacher(p_jeton text)
returns int language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_n   int  := 0;
begin
  -- ⚠️ PAS DE `return 0` ICI. Un refus doit se voir : rendre « 0 rattaché » à un
  -- appel non authentifié serait indiscernable d'un navigateur vierge.
  if v_uid is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if coalesce(p_jeton, '') !~ '^[a-z0-9]{10,40}$' then
    raise exception 'invalid' using errcode = '22023';
  end if;

  -- 1. Les journées que le compte a DÉJÀ : on remonte le meilleur des deux.
  update scrutin_game_pays_results c
     set secondes = case when a.essais < c.essais then a.secondes else c.secondes end,
         essais   = least(c.essais, a.essais)
    from scrutin_game_pays_results a
   where a.jeton = p_jeton and a.user_id is null
     and c.user_id = v_uid and c.jour = a.jour;

  -- 2. Puis la ligne anonyme s'efface — celles qui viennent d'être fusionnées
  --    comme celles que l'étape 3 va adopter sont distinguées par `exists`.
  delete from scrutin_game_pays_results a
   where a.jeton = p_jeton and a.user_id is null
     and exists (select 1 from scrutin_game_pays_results c
                  where c.user_id = v_uid and c.jour = a.jour);

  -- 3. Ce qui reste n'existe pas côté compte : on l'adopte, et le jeton part
  --    avec. Aucun identifiant anonyme ne reste collé à une identité.
  update scrutin_game_pays_results a
     set user_id = v_uid, jeton = null
   where a.jeton = p_jeton and a.user_id is null;
  get diagnostics v_n = row_count;

  return v_n;
end $function$;

-- ══════════════════════════════════════════════════════════════ 5. LA PURGE
--
-- ⚠️ ELLE NE VISE QUE LES LIGNES ANONYMES. Le résultat d'un COMPTE ne se purge
-- pas — c'est son historique, et c'est déjà la règle chez Banalo du jour (« le
-- résumé par compte ne se purge pas, contrairement aux réponses »).
--
-- ⚠️ ET LE 30 SE RÉPÈTE ENCORE UNE FOIS. Il vit déjà dans quatre commandes de
-- cron, dans le défaut de chaque fonction de purge et dans la politique de
-- confidentialité. On suit le motif plutôt que d'entamer un demi-refactor, mais
-- **le compte est à tenir à jour dans `CLAUDE.md`** : le changer d'un seul côté
-- transforme un engagement écrit en mensonge.
create or replace function public.scrutin_game_pays_purge(p_jours int default 30)
returns int language plpgsql volatile security definer set search_path to 'public' as $function$
declare v_n int;
begin
  delete from scrutin_game_pays_results
   where user_id is null
     and cree_le < now() - make_interval(days => greatest(coalesce(p_jours, 30), 1));
  get diagnostics v_n = row_count;
  return v_n;
end $function$;

select cron.unschedule('scrutin-game-pays-purge')
 where exists (select 1 from cron.job where jobname = 'scrutin-game-pays-purge');
select cron.schedule('scrutin-game-pays-purge', '35 3 * * *',
                     $cron$select public.scrutin_game_pays_purge(30);$cron$);

-- ══════════════════════════════ 6. LES CENTILES IGNORENT LES LIGNES ANONYMES
--
-- ⚠️ ELLES ENTRENT DANS LA FOULE, PAS DANS LE CLASSEMENT. `scrutin_jeux_centiles`
-- rend un `user_id` par journée classable ; depuis que la table porte des lignes
-- sans compte, elle en rendait avec `user_id` nul. Elles se faisaient jeter plus
-- loin par la jointure sur les pseudos, donc rien ne cassait — mais une ligne
-- qui ne peut mener à rien n'a pas à être calculée, et la prochaine fonction qui
-- lira cette table sans jointure n'aura pas la même chance.
--
-- Le CALCUL du centile, lui, porte bien sur toute la foule : c'est le `lateral`
-- ci-dessous, qui ne filtre rien. C'est exactement le but de ce fichier.
create or replace function public.scrutin_jeux_centiles(
  p_jour_banalo int, p_jour_pays int, p_recul int
) returns table (user_id uuid, jeu text, mieux int)
language sql stable security definer set search_path to 'public' as $function$
  select r.user_id, 'banalo'::text, r.mieux
    from scrutin_banalo_results r
   where r.mieux is not null
     and r.jour <= p_jour_banalo - p_recul
     and r.jour >  p_jour_banalo - p_recul - 30
  union all
  -- Cinq sur cinq ne STOCKE pas son centile : il se calcule à la lecture, sur la
  -- même définition — la part des joueurs de cette journée qui ont fait MOINS
  -- d'essais. Le plancher de deux joueurs est le même que partout ailleurs.
  select r.user_id, 'pays'::text,
         round((100.0 * j.meilleurs) / j.joueurs)::int
    from scrutin_game_pays_results r
    cross join lateral (
      select count(*) as joueurs,
             count(*) filter (where t.essais < r.essais) as meilleurs
        from scrutin_game_pays_results t where t.jour = r.jour
    ) j
   where r.user_id is not null
     and j.joueurs >= 2
     and r.jour <= p_jour_pays - p_recul
     and r.jour >  p_jour_pays - p_recul - 30;
$function$;
revoke all on function public.scrutin_jeux_centiles(int, int, int) from public, anon, authenticated;

-- ═══════════════════════════════════════════════════════════════ LES DROITS
--
-- ⚠️ `revoke` AVANT `grant` : PUBLIC détient l'EXECUTE par défaut sur toute
-- fonction créée. Piège déjà payé deux fois dans ce dépôt.
revoke all on function public.scrutin_game_pays_jouer(int, int, int, text)  from public, anon, authenticated;
revoke all on function public.scrutin_game_pays_position(int, text)         from public, anon, authenticated;
revoke all on function public.scrutin_game_pays_rattacher(text)             from public, anon, authenticated;
revoke all on function public.scrutin_game_pays_purge(int)                  from public, anon, authenticated;

-- Déposer et lire sa position s'ouvrent à `anon` : c'est tout l'objet du fichier.
grant execute on function public.scrutin_game_pays_jouer(int, int, int, text) to anon, authenticated;
grant execute on function public.scrutin_game_pays_position(int, text)        to anon, authenticated;
-- Le rattachement exige un compte, par construction.
grant execute on function public.scrutin_game_pays_rattacher(text)            to authenticated;
