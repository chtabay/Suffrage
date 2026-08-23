-- QUI NOTIFIER, AVEC QUOI, ET UNE SEULE FOIS.
--
-- ⚠️ TOUT CE QUI DÉCIDE EST ICI, EN SQL, ET C'EST UN CHOIX D'ARCHITECTURE.
-- L'étude prévient que rien de ce chantier ne sera vérifiable dans le conteneur
-- de développement — « ni la permission, ni l'envoi, ni le rendu ». C'est la
-- première chose du dépôt qui partirait sans qu'aucun passage à l'écran ne
-- l'ait éprouvée. La parade est de rendre le NON-TESTABLE aussi mince que
-- possible : le côté Node se réduit à une boucle qui rend un texte et appelle
-- `webpush`, pendant que le choix des destinataires — le seul endroit où l'on
-- peut se tromper en silence — s'éprouve par bloc annulable comme le reste.
--
-- ⚠️ ET LE NUMÉRO DE JOURNÉE EST UN PARAMÈTRE, PAS UNE TROISIÈME COPIE DE
-- L'ORIGINE DU CALENDRIER. La règle qui tranche : **la base ne porte le
-- calendrier QUE là où un client menteur y gagnerait quelque chose.**
-- `scrutin_banalo_etat` doit le savoir parce qu'elle SCELLE la médiane — laisser
-- le client déclarer « la journée est close » offrirait la solution à qui ment.
-- Ici l'appelant est notre propre route de cron, porteuse de `CRON_SECRET`, et
-- ce qu'elle obtient est « envoie un push à des gens qui ont déjà ce résultat » :
-- mentir n'y rapporte rien. C'est aussi pourquoi `scrutin_banalo_mots_etat` a pu
-- PERDRE sa copie en août sans rien casser — elle avait cessé de sceller.
--
-- ⚠️ LE SECRET PASSE PAR `notify_secret_ok`, la garde que les scrutins utilisent
-- déjà. Un second contrôle écrit ici dériverait du premier le jour où l'un des
-- deux changerait.

-- ═══════════════════════════════ 1. LA RÉSERVATION, avant d'envoyer
--
-- ⚠️ ELLE EXISTE PARCE QU'UN COMPTE PEUT AVOIR PLUSIEURS APPAREILS. La fonction
-- de décision rend une ligne par (abonnement × jeu) : deux téléphones font deux
-- lignes, et il FAUT les deux — les deux doivent sonner. Mais le registre, lui,
-- ne doit s'écrire qu'UNE fois par (compte, jeu, événement), sinon le second
-- appareil se fait refuser et la moitié du travail semble avoir échoué.
--
-- D'où la séparation : on RÉSERVE une fois par compte et par jeu, puis on envoie
-- à tous ses appareils. Exactement `claim_poll_notification` du côté scrutins.
create or replace function public.scrutin_jeux_notifs_reserver(
  p_secret text, p_user uuid, p_jeu text, p_genre text, p_repere text
) returns boolean
language plpgsql volatile security definer set search_path to 'public' as $function$
declare v_n int;
begin
  if not notify_secret_ok(p_secret) then return false; end if;
  -- ⚠️ `on conflict do nothing` SANS cible : DEUX contraintes peuvent mordre —
  -- la clé primaire (même événement déjà envoyé) et l'index du jour (un autre
  -- événement de ce jeu est déjà parti aujourd'hui). Nommer l'une laisserait
  -- l'autre lever une exception et casser la boucle d'envoi.
  insert into scrutin_jeux_notifs_envoyees (user_id, jeu, genre, repere)
  values (p_user, p_jeu, p_genre, p_repere)
  on conflict do nothing;
  get diagnostics v_n = row_count;
  return v_n > 0;
end $function$;

-- ═══════════════════════════════════════════ 2. QUI, ET AVEC QUELLES DONNÉES
--
-- ⚠️ ELLE NE REND PAS DE TEXTE, ELLE REND DES DONNÉES. Une notification ne
-- traverse pas React : personne n'est là pour lire `messages/*.json`. Si le
-- texte était écrit ici, les quatre langues vivraient dans une fonction SQL,
-- hors du contrôle de parité — et la première clé oubliée s'afficherait sur le
-- téléphone d'un joueur, en anglais, sans que rien ne l'ait signalé. Le SQL
-- décide QUI et POURQUOI ; le rendu reste dans les fichiers de traduction.
create or replace function public.scrutin_jeux_notifs_a_envoyer(
  p_secret text, p_jour_banalo int, p_jour_pays int
) returns table (
  endpoint text, p256dh text, auth text,
  compte uuid, jeu text, genre text, repere text, langue text, donnees jsonb
)
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  -- ⚠️ LA JOURNÉE QUI VIENT DE SE CLORE EST LA PRÉCÉDENTE. L'appelant passe
  -- celle qui est OUVERTE — c'est ce que `numeroDuJour()` rend, et c'est ce que
  -- toutes les autres fonctions reçoivent. Se tromper d'un ici notifierait le
  -- résultat d'une journée encore en cours, donc un chiffre qui bouge encore.
  v_banalo_close constant int := p_jour_banalo - 1;
  v_pays_close   constant int := p_jour_pays - 1;
  -- La borne du plafond « une par jour et par jeu ». À Paris, comme la saison :
  -- se tromper d'une heure sur un PLAFOND ne coûte rien, là où s'en tromper sur
  -- l'ENVOI réveille quelqu'un.
  v_aujourdhui constant date := (now() at time zone 'Europe/Paris')::date;
  -- La saison qui vient de se clore : le mois du dernier jour du mois précédent.
  -- ⚠️ Surtout pas `now() - interval '1 month'`, qui saute février le 31 mars.
  v_saison_close constant text :=
    to_char(date_trunc('month', (now() at time zone 'Europe/Paris')) - interval '1 day', 'YYYY-MM');
  -- Règle 3 de l'étude : au plus tard de la charnière et d'une heure raisonnable
  -- chez le joueur. La charnière est déjà passée (le paramètre le dit) ; reste
  -- l'heure locale.
  v_heure_min constant int := 9;
  v_heure_max constant int := 21;
begin
  if not notify_secret_ok(p_secret) then return; end if;
  if p_jour_banalo is null or p_jour_pays is null then return; end if;

  return query
  with abonnes as (
    select s.endpoint, s.p256dh, s.auth, s.user_id,
           coalesce(nullif(s.langue, ''), 'fr') as langue
      from scrutin_push_subscriptions s
     where s.user_id is not null
       -- ⚠️ UN FUSEAU INCONNU RETOMBE SUR PARIS AU LIEU DE TOUT FAIRE ÉCHOUER.
       -- La contrainte de la table ne valide que les CARACTÈRES : « Europe/
       -- Atlantide » la passe, et `at time zone` lève alors une exception qui
       -- emporterait la tournée ENTIÈRE — un abonnement abîmé priverait tous les
       -- autres joueurs de leur notification.
       and extract(hour from (now() at time zone
             coalesce((select z.name from pg_timezone_names z where z.name = s.fuseau),
                      'Europe/Paris')))
           between v_heure_min and v_heure_max
  ),
  -- ⚠️ LES RÉGLAGES SONT UNE CTE À PART, ET C'EST UNE CORRECTION. La première
  -- version les portait sur l'ABONNEMENT et filtrait à la toute fin — donc APRÈS
  -- avoir retenu le genre le plus fort. Un joueur qui coupait « saison » ne
  -- recevait alors PLUS RIEN le 1er du mois : la médaille était choisie, puis
  -- jetée, et la clôture quotidienne qu'il voulait ne reprenait pas sa place.
  -- Trouvé par le bloc de vérification, pas à la relecture. Le filtre doit
  -- s'appliquer aux CANDIDATS, avant qu'on ne choisisse parmi eux.
  reglages as (
    select u.user_id,
           coalesce(r.journee, true) as journee,
           coalesce(r.hebdo,   true) as hebdo,
           coalesce(r.saison,  true) as saison
      from (select distinct s.user_id from scrutin_push_subscriptions s
             where s.user_id is not null) u
      left join scrutin_jeux_notifs_reglages r on r.user_id = u.user_id
  ),
  -- ── LES ÉVÉNEMENTS DU JOUR, TOUS GENRES ET TOUS JEUX CONFONDUS
  --
  -- ⚠️ RÈGLE 4 : seulement à qui a JOUÉ la journée close. Chaque événement part
  -- d'une ligne de résultat, jamais d'une liste de comptes — notifier un
  -- résultat à quelqu'un qui n'en a pas est un rappel déguisé, et c'est
  -- précisément ce que le §7 a refusé.
  evenements as (
    select r.user_id, 'banalo'::text as jeu, 'journee'::text as genre,
           v_banalo_close::text as repere,
           jsonb_build_object('jour', r.jour, 'mieux', r.mieux, 'rang', r.rang,
                              'sur', r.sur, 'format', r.format, 'langue', r.langue) as d,
           0 as tri
      from scrutin_banalo_results r
     where v_banalo_close >= 1 and r.jour = v_banalo_close
    union all
    select r.user_id, 'pays', 'journee', v_pays_close::text,
           jsonb_build_object('jour', r.jour, 'essais', r.essais,
                              'rang', j.rang, 'sur', j.joueurs),
           0
      from scrutin_game_pays_results r
      cross join lateral (
        select count(*) as joueurs,
               count(*) filter (where t.essais < r.essais) + 1 as rang
          from scrutin_game_pays_results t where t.jour = r.jour
      ) j
     where v_pays_close >= 1 and r.jour = v_pays_close and r.user_id is not null
    union all
    -- ── LA SAISON CLOSE. Elle vient du palmarès GELÉ, donc elle ne peut pas
    -- annoncer une place qui bougerait encore.
    select p.user_id, p.jeu, 'saison',
           p.saison || case when p.langue <> '' then ':' || p.langue else '' end,
           jsonb_build_object('saison', p.saison, 'langue', nullif(p.langue, ''),
                              'place', p.place, 'points', p.points, 'joueurs', p.joueurs,
                              'medaille', p.place <= least(3, greatest(p.joueurs - 1, 0))),
           -- Le tri porte la place : à plusieurs palmarès pour un même jeu (une
           -- langue chacun), on annonce le MEILLEUR.
           p.place
      from scrutin_jeux_palmares p
     where p.saison = v_saison_close and p.jeu in ('banalo', 'pays')
  ),
  -- Ce que le joueur a accepté de recevoir. Le filtre est ICI, pas à la fin.
  permis as (
    select e.* from evenements e
      join reglages g on g.user_id = e.user_id
     where (e.genre = 'journee' and g.journee)
        or (e.genre = 'hebdo'   and g.hebdo)
        or (e.genre = 'saison'  and g.saison)
  ),
  -- Un seul événement par (compte, jeu, genre) : le meilleur de son genre.
  meilleurs as (
    select distinct on (e.user_id, e.jeu, e.genre) e.*
      from permis e
     order by e.user_id, e.jeu, e.genre, e.tri
  ),
  -- ⚠️ ET UN SEUL PAR (COMPTE, JEU) : c'est le plafond, et c'est lui qui FORCE
  -- LA FUSION. La base refuse la seconde ligne du jour, donc on retient le plus
  -- fort — une médaille avant un résultat quotidien — et on emporte les données
  -- des autres pour que le texte puisse les replier. « Août est fini : 1er en
  -- français. Et votre journée n° 12 est close » est une notification ; deux
  -- notifications d'affilée sont un harcèlement poli.
  choix as (
    select distinct on (m.user_id, m.jeu) m.user_id, m.jeu, m.genre, m.repere,
           (select jsonb_object_agg(m2.genre, m2.d) from meilleurs m2
             where m2.user_id = m.user_id and m2.jeu = m.jeu) as donnees
      from meilleurs m
     order by m.user_id, m.jeu,
              case m.genre when 'saison' then 1 when 'hebdo' then 2 else 3 end
  )
  select a.endpoint, a.p256dh, a.auth, c.user_id, c.jeu, c.genre, c.repere, a.langue,
         c.donnees || jsonb_build_object('principal', c.genre)
    from choix c
    join abonnes a on a.user_id = c.user_id
     -- Un premier filtre, pas la garantie : `scrutin_jeux_notifs_reserver` est
     -- l'autorité, et c'est elle qui ferme la course entre deux passages du cron.
   where not exists (
       select 1 from scrutin_jeux_notifs_envoyees x
        where x.user_id = c.user_id and x.jeu = c.jeu
          and (x.jour_civil = v_aujourdhui or (x.genre = c.genre and x.repere = c.repere))
     );
end $function$;

-- ═══════════════════════════════════════════════════════════════ les droits
--
-- ⚠️ `revoke` AVANT `grant` : PUBLIC détient l'EXECUTE par défaut. Et ces
-- deux-là ne sont accordées à PERSONNE — ni `anon`, ni `authenticated` : elles
-- exigent `NOTIFY_SECRET`, que seul le serveur détient, et le passe-plat
-- s'exécute avec la clé de service. Un joueur qui pourrait les appeler lirait
-- les points d'abonnement push de tout le monde.
revoke all on function public.scrutin_jeux_notifs_reserver(text, uuid, text, text, text)
  from public, anon, authenticated;
revoke all on function public.scrutin_jeux_notifs_a_envoyer(text, int, int)
  from public, anon, authenticated;
