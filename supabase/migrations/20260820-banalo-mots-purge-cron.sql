-- LA PURGE DU FORMAT « MOTS », PLANIFIÉE.
--
-- ⚠️ `scrutin_banalo_mots_purge` est arrivée avec la table et RIEN NE
-- L'APPELAIT. C'est la troisième fois que ce dépôt pose une fonction de purge
-- sans son cron — d'où la règle : une durée non annoncée est une durée qui
-- n'existe pas, et une durée annoncée que personne n'applique est pire.
--
-- Trente jours, le même chiffre que le format chiffré, et il est déjà écrit dans
-- la politique de confidentialité (« Les jeux quotidiens n'ont pas de salle :
-- la réponse d'un joueur, le numéro de la journée et un identifiant tiré au
-- hasard par son navigateur — jamais un compte — sont conservés 30 jours »).
-- La phrase couvre les deux formats sans retouche.
--
-- 03 h 47 UTC : six minutes après la purge des nombres, pour ne pas lancer deux
-- balayages sur la même minute.
select cron.schedule('scrutin-banalo-mots-purge', '47 3 * * *',
                     $$select public.scrutin_banalo_mots_purge(30);$$);
