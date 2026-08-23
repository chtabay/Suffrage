-- L'ABONNEMENT PUSH DÉCLARE SON FUSEAU ET SA LANGUE — le chaînon manquant.
--
-- `20260831-jeux-notifications-socle.sql` a posé les deux colonnes sur
-- `scrutin_push_subscriptions`, et `scrutin_jeux_notifs_a_envoyer` les lit pour
-- décider l'heure d'envoi et la langue du texte. Mais RIEN NE LES REMPLISSAIT :
-- `add_push_subscription` n'en connaissait pas l'existence, donc tout abonnement
-- de jeu serait arrivé avec deux `null` — c'est-à-dire replié sur Paris et sur
-- le français, pour tout le monde. Les colonnes existaient, la route ne les
-- portait pas : un socle sans son chaînon.
--
-- ⚠️ AJOUTER DEUX PARAMÈTRES CRÉE UNE FONCTION, ÇA N'EN REMPLACE PAS UNE.
-- `create or replace` ne remplace qu'à signature identique ; avec deux
-- paramètres de plus on obtient une SURCHARGE, et PostgREST se retrouve devant
-- deux candidates pour un appel à six arguments — il rend alors une erreur
-- d'ambiguïté, et plus personne ne s'abonne, y compris côté scrutins. On
-- supprime donc l'ancienne explicitement.
drop function if exists public.add_push_subscription(text, text, text, text, uuid, text);

create or replace function public.add_push_subscription(
  p_secret     text,
  p_endpoint   text,
  p_p256dh     text,
  p_auth       text,
  p_user_id    uuid,
  p_poll_token text,
  p_fuseau     text default null,
  p_langue     text default null
) returns void language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_fuseau text;
  v_langue text;
begin
  if not public.notify_secret_ok(p_secret) then return; end if;

  -- ⚠️ UN FUSEAU INVENTÉ NE DOIT PAS ENTRER DANS LA TABLE. La contrainte de
  -- colonne ne valide que des CARACTÈRES : « Europe/Atlantide » la passe, et
  -- c'est `at time zone` qui lève, plus tard, au milieu de la tournée — donc
  -- un seul abonnement bancal priverait tous les autres de leur notification.
  -- La parade était déjà écrite côté lecture ; ici on ferme la porte d'entrée,
  -- ce qui est le bon endroit.
  select z.name into v_fuseau from pg_timezone_names z where z.name = p_fuseau;

  -- ⚠️ ET UNE LANGUE MALFORMÉE NE DOIT PAS COÛTER L'ABONNEMENT. Sans ce filtre,
  -- la contrainte de colonne lèverait et la RPC échouerait ENTIÈREMENT : le
  -- joueur aurait accordé la permission du navigateur — qui ne se redemande
  -- pas — pour se retrouver sans ligne en base. On garde l'abonnement, on jette
  -- la valeur douteuse : `null` veut dire « pas déclaré », et le rendu retombe
  -- alors sur le français, ce qui est un défaut, pas une panne.
  if p_langue ~ '^[a-z]{2,3}$' then v_langue := p_langue; end if;

  insert into public.scrutin_push_subscriptions(endpoint, p256dh, auth, user_id, poll_token, fuseau, langue)
  values (p_endpoint, p_p256dh, p_auth, p_user_id, p_poll_token, v_fuseau, v_langue)
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh, auth = excluded.auth,
        user_id = coalesce(excluded.user_id, scrutin_push_subscriptions.user_id),
        poll_token = coalesce(excluded.poll_token, scrutin_push_subscriptions.poll_token),
        -- ⚠️ `coalesce` ET PAS UNE AFFECTATION SÈCHE, dans les deux sens : un
        -- abonnement de scrutin qui se ré-enregistre n'envoie ni fuseau ni
        -- langue, et écraserait ceux qu'un abonnement de jeu vient de poser sur
        -- le MÊME point d'abonnement — c'est le même appareil, le même
        -- navigateur, la même ligne. À l'inverse, une valeur fournie gagne
        -- toujours : c'est ainsi qu'un joueur qui change la langue de
        -- l'interface, ou qui voyage, met sa ligne à jour sans rien demander.
        fuseau = coalesce(excluded.fuseau, scrutin_push_subscriptions.fuseau),
        langue = coalesce(excluded.langue, scrutin_push_subscriptions.langue);
end $function$;

-- ⚠️ `revoke` AVANT `grant`, et surtout : LA NOUVELLE FONCTION N'HÉRITE DE RIEN.
-- Les droits vivent sur l'OID, pas sur le nom — la surcharge naît donc avec le
-- seul `EXECUTE` que Postgres donne d'office à PUBLIC. `anon` en a besoin, lui :
-- le passe-plat Node appelle avec la clé anonyme et se garde par le secret.
revoke all on function public.add_push_subscription(text, text, text, text, uuid, text, text, text) from public;
grant execute on function public.add_push_subscription(text, text, text, text, uuid, text, text, text)
  to anon, authenticated, service_role;
