-- LE SOCLE DES NOTIFICATIONS DES JEUX QUOTIDIENS — le modèle, pas encore l'envoi.
--
-- ⚠️ LA PLOMBERIE N'EST PAS À CONSTRUIRE, ELLE EXISTE : `web-push`, les clés
-- VAPID, `/api/notify/subscribe`, `/sw.js`, `src/lib/push.ts` et la table
-- `scrutin_push_subscriptions`, avec deux abonnements réels depuis juillet 2026.
-- Ce qui manquait, dit l'étude (`docs/amis-et-notifications.md` §4), c'est « le
-- déclencheur, le contenu, et la décision ». Ce fichier pose de quoi décider.
--
-- ⚠️ L'ABONNEMENT S'ACCROCHE AU COMPTE, PAS AU JETON, et c'est le §6 de
-- `docs/regularite-des-joueurs.md` : l'abonnement push vit dans le service
-- worker, le jeton dans le `localStorage`. Effacer ses données tue le jeton sans
-- tuer l'abonnement — le joueur recevrait « votre série » alors que l'écran lui
-- montre zéro. `scrutin_push_subscriptions.user_id` existe déjà pour ça.
--
-- ⚠️ ET LES RÉGLAGES SE POSENT AVANT LE SECOND TYPE, pas après. Une préférence
-- ajoutée quand deux notifications existent déjà oblige à décider
-- rétroactivement ce à quoi les abonnés d'hier avaient consenti. Les trois
-- genres sont donc déclarés d'emblée, même si un seul part pour commencer.

-- ═══════════════════════ 1. l'abonnement sait QUAND et DANS QUELLE LANGUE
--
-- ⚠️ LE FUSEAU N'EST PAS DU CONFORT, C'EST LA RÈGLE 3 DE L'ÉTUDE : on envoie au
-- PLUS TARD des deux — la charnière de 11 h 30 à Paris, ou une heure raisonnable
-- chez le joueur. Sans lui, la notification de clôture réveille New York à
-- 5 h 30. Un résultat arrêté reste vrai à n'importe quelle heure (c'est ce qui
-- rend la clôture moins risquée que le rappel que le §7 a refusé), mais « vrai »
-- ne veut pas dire « bienvenu à cinq heures et demie ».
--
-- ⚠️ ET LA LANGUE EST NÉCESSAIRE PARCE QUE LE TEXTE EST RENDU PAR LE SERVEUR.
-- Une notification ne traverse pas React : personne n'est là pour lire
-- `messages/*.json`. On garde donc la langue de l'abonnement, et le côté Node
-- rend la clé dans cette langue-là — ce qui laisse les quatre traductions sous
-- le contrôle de parité plutôt qu'en dur dans une route d'API.
--
-- ⚠️ LES DEUX COLONNES SONT NULLABLES, et c'est délibéré : la table est PARTAGÉE
-- avec les scrutins, dont les deux abonnements réels n'ont ni l'une ni l'autre.
-- Une colonne `not null` avec défaut leur inventerait un fuseau qu'ils n'ont
-- jamais déclaré.
alter table public.scrutin_push_subscriptions
  add column if not exists fuseau text,
  add column if not exists langue text;

alter table public.scrutin_push_subscriptions
  drop constraint if exists scrutin_push_subscriptions_langue_check;
alter table public.scrutin_push_subscriptions
  add constraint scrutin_push_subscriptions_langue_check
  check (langue is null or langue ~ '^[a-z]{2,3}$');

-- Le fuseau vient de `Intl.DateTimeFormat().resolvedOptions().timeZone` : une
-- clé de la base IANA, pas un décalage. ⚠️ Surtout PAS un nombre d'heures — un
-- décalage est faux la moitié de l'année dans tout pays qui change d'heure, et
-- c'est exactement le piège déjà payé par le cron de la charnière.
alter table public.scrutin_push_subscriptions
  drop constraint if exists scrutin_push_subscriptions_fuseau_check;
alter table public.scrutin_push_subscriptions
  add constraint scrutin_push_subscriptions_fuseau_check
  check (fuseau is null or (length(fuseau) between 3 and 64 and fuseau ~ '^[A-Za-z0-9_+/-]+$'));

-- ═══════════════════════════════ 2. les réglages, par compte et par genre
--
-- ⚠️ TROIS GENRES DÉCLARÉS D'EMBLÉE, UN SEUL ENVOYÉ POUR COMMENCER :
--
--   `journee` — à la charnière : votre journée est close, voici votre résultat
--               arrêté, et la question suivante est ouverte. C'est la seule qui
--               porte une information qu'on ne peut obtenir autrement.
--   `hebdo`   — un récapitulatif de la semaine.
--   `saison`  — la médaille de fin de mois. Rare, purement bonne, invisible
--               autrement : c'est le meilleur cadeau du lot.
--
-- ⚠️ ET ELLES SONT VRAIES PAR DÉFAUT. S'abonner EST le consentement — la
-- permission du navigateur ne se demande qu'une fois et un refus est quasi
-- définitif, donc quelqu'un qui vient de l'accorder ne l'a pas fait pour ne rien
-- recevoir. Les réglages servent à en RETIRER, pas à en ajouter.
create table if not exists public.scrutin_jeux_notifs_reglages (
  user_id uuid primary key references auth.users(id) on delete cascade,
  journee boolean not null default true,
  hebdo   boolean not null default true,
  saison  boolean not null default true,
  maj_le  timestamptz not null default now()
);
alter table public.scrutin_jeux_notifs_reglages enable row level security;
-- Aucune policy : tout passe par les fonctions `security definer`.
revoke all on table public.scrutin_jeux_notifs_reglages from anon, authenticated;

-- ═══════════════════════════════════ 3. le registre de ce qui est parti
--
-- ⚠️ UNE NOTIFICATION ENVOYÉE DEUX FOIS EST PIRE QUE PAS DE NOTIFICATION. Le cron
-- tourne toutes les heures (le SQL tranche, parce que `pg_cron` planifie en UTC
-- et que Paris change deux fois par an) : sans registre, un joueur recevrait la
-- clôture de sa journée à chaque passage. C'est le même motif que
-- `claim_poll_notification` du côté des scrutins.
--
-- La clé `(user_id, genre, repere)` porte la règle : `repere` est le numéro de
-- journée pour `journee`, la semaine ISO pour `hebdo`, la saison pour `saison`.
create table if not exists public.scrutin_jeux_notifs_envoyees (
  user_id uuid not null references auth.users(id) on delete cascade,
  genre   text not null check (genre in ('journee', 'hebdo', 'saison')),
  repere  text not null,
  cree_le timestamptz not null default now(),
  primary key (user_id, genre, repere)
);
alter table public.scrutin_jeux_notifs_envoyees enable row level security;
revoke all on table public.scrutin_jeux_notifs_envoyees from anon, authenticated;

-- ⚠️ ET IL SE PURGE, sinon il grossit d'une ligne par joueur et par jour pour
-- toujours. Trente jours suffisent : passé la charnière suivante, une clôture ne
-- se renvoie jamais. **Le 30 se répète donc une fois de plus** — il vit déjà
-- dans cinq commandes de cron, dans le défaut de chaque purge et dans la
-- politique de confidentialité. Le compte est tenu dans `CLAUDE.md`.
create or replace function public.scrutin_jeux_notifs_purge(p_jours int default 30)
returns int language plpgsql volatile security definer set search_path to 'public' as $function$
declare v_n int;
begin
  delete from scrutin_jeux_notifs_envoyees
   where cree_le < now() - make_interval(days => greatest(coalesce(p_jours, 30), 1));
  get diagnostics v_n = row_count;
  return v_n;
end $function$;

select cron.unschedule('scrutin-jeux-notifs-purge')
 where exists (select 1 from cron.job where jobname = 'scrutin-jeux-notifs-purge');
select cron.schedule('scrutin-jeux-notifs-purge', '29 3 * * *',
                     $cron$select public.scrutin_jeux_notifs_purge(30);$cron$);

-- ═══════════════════════════════════════ 4. lire et régler, depuis l'écran
--
-- ⚠️ LA LIGNE SE CRÉE À LA LECTURE, pas à l'inscription. Un compte qui n'a jamais
-- touché aux réglages n'a pas de ligne, et exiger qu'elle existe forcerait à
-- l'écrire au moment de la création du compte — donc à toucher un chemin qui n'a
-- rien à voir avec les jeux. Les défauts de la table portent la réponse.
create or replace function public.scrutin_jeux_notifs_reglages_lire()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_r record;
begin
  -- ⚠️ UN REFUS DOIT SE VOIR. Rendre « tout est activé » à un appel non
  -- authentifié serait indiscernable d'un vrai réglage, et l'écran afficherait
  -- trois interrupteurs allumés à quelqu'un qui n'a pas de compte.
  if v_uid is null then
    return jsonb_build_object('status', 'refus');
  end if;
  select * into v_r from scrutin_jeux_notifs_reglages where user_id = v_uid;
  return jsonb_build_object(
    'status',  'ok',
    'journee', coalesce(v_r.journee, true),
    'hebdo',   coalesce(v_r.hebdo,   true),
    'saison',  coalesce(v_r.saison,  true),
    -- Combien d'appareils de ce compte sont abonnés. Zéro = la permission n'a
    -- jamais été accordée (ou elle a été retirée), et l'écran doit alors
    -- proposer de s'abonner plutôt que des interrupteurs sans effet.
    'appareils', (select count(*) from scrutin_push_subscriptions s where s.user_id = v_uid)
  );
end $function$;

create or replace function public.scrutin_jeux_notifs_regler(p_genre text, p_actif boolean)
returns jsonb language plpgsql volatile security definer set search_path to 'public' as $function$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('status', 'refus');
  end if;
  if p_genre is null or p_genre not in ('journee', 'hebdo', 'saison') or p_actif is null then
    return jsonb_build_object('status', 'invalide');
  end if;

  -- ⚠️ TROIS BRANCHES ÉCRITES EN CLAIR, PAS UN `execute format(...)`. Le nom de
  -- colonne viendrait alors du client : c'est une injection, et la garde
  -- ci-dessus serait la seule chose entre lui et le schéma.
  insert into scrutin_jeux_notifs_reglages (user_id) values (v_uid)
  on conflict (user_id) do nothing;
  if p_genre = 'journee' then
    update scrutin_jeux_notifs_reglages set journee = p_actif, maj_le = now() where user_id = v_uid;
  elsif p_genre = 'hebdo' then
    update scrutin_jeux_notifs_reglages set hebdo = p_actif, maj_le = now() where user_id = v_uid;
  else
    update scrutin_jeux_notifs_reglages set saison = p_actif, maj_le = now() where user_id = v_uid;
  end if;

  return scrutin_jeux_notifs_reglages_lire();
end $function$;

-- ═══════════════════════════════════════════════════════════════ les droits
--
-- ⚠️ `revoke` AVANT `grant` : Postgres donne à PUBLIC un droit d'exécution par
-- défaut sur toute fonction créée. Piège déjà payé deux fois ici.
revoke all on function public.scrutin_jeux_notifs_purge(int) from public, anon, authenticated;
revoke all on function public.scrutin_jeux_notifs_reglages_lire() from public, anon, authenticated;
revoke all on function public.scrutin_jeux_notifs_regler(text, boolean) from public, anon, authenticated;
-- `anon` n'a rien à faire ici : les deux fonctions exigent un `auth.uid()`, et un
-- anonyme n'en a pas. Lui laisser l'exécution ne lui rendrait qu'un refus.
grant execute on function public.scrutin_jeux_notifs_reglages_lire() to authenticated;
grant execute on function public.scrutin_jeux_notifs_regler(text, boolean) to authenticated;
