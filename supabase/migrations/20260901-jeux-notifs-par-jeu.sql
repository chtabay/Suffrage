-- UNE NOTIFICATION PAR JOUR **ET PAR JEU**, PAS UNE PAR JOUR.
--
-- LE SOCLE DE LA VEILLE COMPTAIT LE JOUEUR, PAS LE JEU. Son registre était
-- `(user_id, genre, repere)` : deux jeux quotidiens qui clôturent le même jour
-- se seraient donc marché dessus — la clôture de Banalo aurait consommé le
-- créneau, et celle de Cinq sur cinq n'aurait jamais été envoyée, sans que rien
-- ne le signale. C'est le plafond de l'étude (« une par jour et par joueur »)
-- appliqué à la mauvaise granularité : elle a été écrite quand un seul jeu
-- notifiait.
--
-- ⚠️ LE PLAFOND DEVIENT UNE GARANTIE DE BASE, PAS UNE CONVENTION DE CODE. Deux
-- index le portent, et ils ne disent PAS la même chose :
--
--   · la clé primaire `(user_id, jeu, genre, repere)` empêche d'envoyer DEUX
--     FOIS LE MÊME ÉVÉNEMENT — le cron passe toutes les heures, sans elle un
--     joueur recevrait la clôture de sa journée à chaque passage ;
--   · l'index `(user_id, jeu, jour_civil)` empêche d'envoyer DEUX ÉVÉNEMENTS
--     DIFFÉRENTS le même jour pour le même jeu — une médaille et une clôture
--     tombent toutes deux le 1er du mois, et deux notifications d'affilée sont
--     exactement le mode de défaillance que l'étude a écarté.
--
-- La première seule laisserait passer le doublé ; la seconde seule laisserait
-- repartir la même clôture le lendemain. Il faut les deux.
--
-- ⚠️ ET LE SECOND INDEX EST CE QUI FORCE LA FUSION. Puisque la base refuse la
-- deuxième, la fonction de décision doit CHOISIR : pour un jeu et un jour, elle
-- retient l'événement le plus fort et replie les autres dans son texte. « Août
-- est fini : 1er en français. Et votre journée n° 12 est close » est une
-- notification ; deux notifications sont un harcèlement poli.
--
-- ⚠️ `jour_civil` EST LU À PARIS, comme la saison — et pour la même raison qu'on
-- ne stocke pas un décalage : une frontière de jour est cent fois plus grossière
-- qu'un envoi, et se tromper d'une heure sur un PLAFOND ne coûte rien, là où se
-- tromper d'une heure sur l'ENVOI réveille quelqu'un. Ce n'est pas une copie de
-- l'origine du calendrier : on ne traduit aucun numéro de journée.

-- La table vient d'être créée et ne contient aucune ligne : changer sa clé est
-- gratuit aujourd'hui, et ne le sera plus dès la première notification envoyée.
alter table public.scrutin_jeux_notifs_envoyees
  add column if not exists jeu text not null default 'banalo';
alter table public.scrutin_jeux_notifs_envoyees
  alter column jeu drop default;

-- ⚠️ `tout` N'EST PAS UN JEU, ET N'EN EST PAS UN ICI NON PLUS. Le classement
-- « tous les jeux » existe à l'écran, mais une médaille cumulée se lit dans la
-- salle des trophées ; la notifier à part ajouterait une troisième notification
-- le 1er du mois pour une grandeur dérivée. On notifie ce qu'on a JOUÉ.
alter table public.scrutin_jeux_notifs_envoyees
  drop constraint if exists scrutin_jeux_notifs_envoyees_jeu_check;
alter table public.scrutin_jeux_notifs_envoyees
  add constraint scrutin_jeux_notifs_envoyees_jeu_check
  check (jeu in ('banalo', 'pays'));

alter table public.scrutin_jeux_notifs_envoyees
  add column if not exists jour_civil date not null
  default (now() at time zone 'Europe/Paris')::date;

alter table public.scrutin_jeux_notifs_envoyees
  drop constraint if exists scrutin_jeux_notifs_envoyees_pkey;
alter table public.scrutin_jeux_notifs_envoyees
  add constraint scrutin_jeux_notifs_envoyees_pkey
  primary key (user_id, jeu, genre, repere);

create unique index if not exists scrutin_jeux_notifs_envoyees_jour_idx
  on public.scrutin_jeux_notifs_envoyees (user_id, jeu, jour_civil);

-- ═══════════════════════════════════ les réglages restent PAR GENRE
--
-- ⚠️ ET PAS PAR (JEU × GENRE), délibérément. La matrice serait de trois par jeu
-- et le catalogue grandit — un troisième jeu quotidien est en chantier. Surtout,
-- elle ne servirait presque à rien : la règle 4 de l'étude veut qu'on ne
-- notifie QUE ceux qui ont joué la journée close, donc un jeu auquel on ne joue
-- pas ne notifie déjà jamais. Le seul cas qu'elle couvrirait est « je joue aux
-- deux mais je ne veux les nouvelles que d'un seul » — on l'ajoutera le jour où
-- quelqu'un le demande, pas avant.
comment on table public.scrutin_jeux_notifs_reglages is
  'Réglages de notification par COMPTE et par GENRE (journee, hebdo, saison). '
  'Pas par jeu : la règle « seulement à qui a joué la journée close » scope déjà '
  'chaque notification au jeu concerné.';
