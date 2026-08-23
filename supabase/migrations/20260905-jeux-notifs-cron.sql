-- LE DÉCLENCHEUR : `pg_cron` appelle la route Next toutes les heures.
--
-- ⚠️ POURQUOI PAS LE CRON DE VERCEL. `vercel.json` en déclare déjà quatre, mais
-- le plan Hobby les plafonne à UN PAR JOUR — et une tournée quotidienne ne peut
-- satisfaire ni la charnière de 11 h 30 de Banalo, ni celle de minuit de Cinq
-- sur cinq, ni la règle « une heure raisonnable chez le joueur », qui exige de
-- repasser souvent. `pg_cron` tourne déjà six fois dans ce projet, à la minute
-- qu'on veut, et `pg_net` y est actif depuis `resolve-tick-every-2h`.
--
-- ⚠️ ET POURQUOI PAS TOUT EN SQL. Parce que la route est le SEUL endroit qui
-- puisse importer `jour.ts` et `calendrier.ts` — la source unique des deux
-- calendriers. Faire calculer le numéro de journée à la base ajouterait une
-- troisième copie de l'origine, ce que le dépôt interdit. Le cron ne décide
-- rien : il réveille.
--
-- ⚠️ LE SECRET SE LIT À L'EXÉCUTION, IL N'EST PAS FIGÉ DANS LA COMMANDE. Le
-- graver dans le `cron.job` obligerait à replanifier le jour où il tourne, et à
-- le garder à jour à deux endroits. On le lit dans `scrutin_config`, où il vit
-- déjà et d'où `notify_secret_ok` le lit aussi.
--
-- ⚠️ CONSÉQUENCE À CONNAÎTRE : l'en-tête `Authorization` transite par
-- `net.http_request_queue`, donc le secret y séjourne le temps de la purge de
-- `pg_net`. Ce n'est PAS une nouvelle classe d'exposition — le schéma `net`
-- n'est pas publié par PostgREST et n'est lisible que par `postgres` et
-- `service_role`, exactement le public qui peut déjà lire `scrutin_config`. À
-- rouvrir si l'un des deux s'ouvrait.
--
-- ⚠️ ET C'EST `NOTIFY_SECRET`, PAS UN SECRET DE PLUS. Il garde déjà les RPC de
-- notification ; lui faire garder aussi cette route évite d'en stocker un second
-- en base pour ne rien gagner. Sa portée s'élargit d'un cran, et c'est écrit.
--
-- ⚠️ LA MINUTE N'EST PAS RONDE (13) et c'est délibéré : cinq purges tournent
-- déjà entre 3 h 29 et 3 h 59, et la clôture de saison à la minute 23. Empiler
-- une tournée d'envois sur la même minute qu'un autre travail ferait deux pics
-- au lieu de deux creux.
select cron.unschedule('scrutin-jeux-notifs')
 where exists (select 1 from cron.job where jobname = 'scrutin-jeux-notifs');

select cron.schedule('scrutin-jeux-notifs', '13 * * * *', $cron$
  select net.http_post(
    url := 'https://placet.app/api/cron/jeux-notifs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' ||
        (select c.value from public.scrutin_config c where c.key = 'notify_secret')),
    body := '{}'::jsonb);
$cron$);
