-- RETENTION DES SALLES DE JEU.
--
-- `scrutin_game_purge(p_days default 7)` existait mais RIEN NE L'APPELAIT : les
-- salles, les joueurs et leurs prénoms s'accumulaient indéfiniment dans une
-- table écrivable par `anon`. Ce n'est pas qu'une question de volume — le
-- prénom saisi par un joueur est une donnée personnelle, et il est **figé dans
-- le `result` de chaque manche**. Sans effacement programmé, il n'y a pas de
-- durée de conservation, donc rien à annoncer dans la politique de
-- confidentialité — et une durée non annoncée est une durée qui n'existe pas.
--
-- Les quatre tables cascadent depuis `scrutin_game_rooms` (vérifié :
-- `confdeltype = 'c'` sur players, rounds, entries) : supprimer la salle efface
-- tout, y compris les prénoms figés dans les résultats.

-- La purge balaie par date : sans index elle lit toute la table à chaque heure.
create index if not exists scrutin_game_rooms_last_active_idx
  on public.scrutin_game_rooms (last_active_at);

-- Toutes les heures. Une partie dure une demi-heure ; sept jours laissent tout
-- le temps de revenir lire un résultat, et bornent la conservation à une durée
-- annonçable. Le chiffre vit à DEUX endroits — ici et dans la politique de
-- confidentialité (src/app/[locale]/confidentialite) : le changer d'un côté
-- sans l'autre transforme un engagement écrit en mensonge.
select cron.schedule('scrutin-game-purge', '17 * * * *',
                     $$select public.scrutin_game_purge(7);$$);

-- Hygiène : les trois fonctions de déclencheur posées par le correctif portent
-- l'EXECUTE par défaut de PUBLIC. Postgres refuse d'appeler une fonction
-- `returns trigger` hors déclencheur, donc le risque est nul — mais le reste du
-- lot ferme tout ce qui n'est pas une entrée publique, et une exception non
-- expliquée dans un audit coûte plus cher qu'un `revoke`.
revoke all on function public.scrutin_game_rooms_clean() from public, anon, authenticated;
revoke all on function public.scrutin_game_rounds_clean() from public, anon, authenticated;
revoke all on function public.scrutin_game_entries_bound() from public, anon, authenticated;

-- ⚠️ CE QU'ON NE FAIT PAS, ET POURQUOI. La revue demandait aussi un plafond de
-- création sur `game_create`. Écarté ici : le seul plafond exprimable en SQL est
-- GLOBAL (« N salles par heure, toutes origines confondues »), et un plafond
-- global sur une entrée ouverte à `anon` est lui-même l'arme — il suffit de le
-- saturer pour fermer le jeu à tout le monde. Un plafond par origine se pose en
-- bordure, pas en base. Et le trou n'est pas propre aux jeux : `create_poll`
-- est ouverte à `anon` dans les mêmes termes depuis l'origine du produit. À
-- traiter comme un sujet de plateforme, pas comme une rustine sur ce lot.
