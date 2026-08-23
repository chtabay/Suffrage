-- « 3e » NE VEUT RIEN DIRE SANS SON EFFECTIF.
--
-- ⚠️ DÉFAUT INTRODUIT LA VEILLE, EN ÉCRIVANT LE RÉCAPITULATIF. La charge utile de
-- la clôture de Cinq sur cinq portait `rang` et `exaequo` mais plus `sur` : la
-- première version l'avait, la réécriture qui a sorti les parties en CTE l'a
-- perdu. Le texte de la notification aurait annoncé « 3e » tout court, ce qui ne
-- se lit pas — c'est la même règle que partout ici, l'effectif accompagne
-- toujours le rang, sur la carte de score comme au tableau du jour.
--
-- ⚠️ ET ÇA NE SE SERAIT VU QU'À LA RÉCEPTION, sur un vrai téléphone. Ni `tsc`,
-- ni le contrôle de parité, ni un bloc de vérification qui ne regarde que les
-- destinataires n'auraient signalé une clé absente d'un objet JSON. C'est
-- exactement le risque que l'étude annonce pour ce chantier — d'où l'intérêt de
-- relire la charge utile en écrivant le texte, et pas après l'envoi.

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
  v_maintenant constant timestamp := now() at time zone 'Europe/Paris';
  v_aujourdhui constant date := v_maintenant::date;
  -- La saison qui vient de se clore : le mois du dernier jour du mois précédent.
  -- ⚠️ Surtout pas `now() - interval '1 month'`, qui saute février le 31 mars.
  v_saison_close constant text :=
    to_char(date_trunc('month', v_maintenant) - interval '1 day', 'YYYY-MM');
  -- La semaine ISO qui vient de se clore, et la fenêtre de trois jours qui la
  -- laisse partir. `IYYY-"W"IW` et non `YYYY-WW` : la seconde n'est pas la
  -- semaine ISO et se décale d'une unité une année sur sept.
  v_semaine_close constant text := to_char(v_maintenant - interval '7 days', 'IYYY-"W"IW');
  v_hebdo_ouvert constant boolean := extract(isodow from v_maintenant) <= 3;
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
  -- Les parties de Cinq sur cinq d'un compte, avec leur rang du jour. Sortie en
  -- CTE parce que la clôture ET l'hebdo en ont besoin, l'un par journée et
  -- l'autre agrégé : la recopier ferait dériver les deux.
  pays as (
    select r.user_id, r.jour, r.essais, r.cree_le,
           j.rang::int as rang, j.exaequo::int as exaequo, j.joueurs::int as sur
      from scrutin_game_pays_results r
      cross join lateral (
        select count(*)                                        as joueurs,
               count(*) filter (where t.essais < r.essais) + 1 as rang,
               count(*) filter (where t.essais = r.essais)     as exaequo
          from scrutin_game_pays_results t where t.jour = r.jour
      ) j
     where r.user_id is not null
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
    select p.user_id, 'pays', 'journee', v_pays_close::text,
           jsonb_build_object('jour', p.jour, 'essais', p.essais,
                              'rang', p.rang, 'exaequo', p.exaequo, 'sur', p.sur),
           0
      from pays p
     where v_pays_close >= 1 and p.jour = v_pays_close
    union all
    -- ── LE RÉCAPITULATIF DE LA SEMAINE ÉCOULÉE, PAR JEU.
    -- Un bilan de ce qui a eu lieu : aucun classement, aucune échéance.
    select r.user_id, 'banalo', 'hebdo', v_semaine_close,
           jsonb_build_object('semaine', v_semaine_close,
                              'journees', count(*),
                              'points', round(sum(scrutin_jeux_points(r.rang, r.exaequo)), 1),
                              'meilleur', min(r.mieux),
                              'moyen', round(avg(r.mieux))),
           0
      from scrutin_banalo_results r
     where v_hebdo_ouvert
       and to_char(r.cree_le at time zone 'Europe/Paris', 'IYYY-"W"IW') = v_semaine_close
     group by r.user_id
    union all
    select p.user_id, 'pays', 'hebdo', v_semaine_close,
           jsonb_build_object('semaine', v_semaine_close,
                              'journees', count(*),
                              'points', round(sum(scrutin_jeux_points(p.rang, p.exaequo)), 1),
                              -- ⚠️ CINQ SUR CINQ N'A PAS DE CENTILE STOCKÉ, et sa
                              -- grandeur parlante est le nombre d'ESSAIS — c'est
                              -- ce que le joueur regarde et ce que le partage dit.
                              'meilleur', min(p.essais)),
           0
      from pays p
     where v_hebdo_ouvert
       and to_char(p.cree_le at time zone 'Europe/Paris', 'IYYY-"W"IW') = v_semaine_close
     group by p.user_id
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
  -- fort — une médaille, puis un bilan de semaine, puis le résultat du jour — et
  -- on emporte les données des autres pour que le texte puisse les replier.
  -- « Août est fini : 1er en français. Et votre journée n° 12 est close » est une
  -- notification ; trois notifications d'affilée sont un harcèlement poli.
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
revoke all on function public.scrutin_jeux_notifs_a_envoyer(text, int, int)
  from public, anon, authenticated;
