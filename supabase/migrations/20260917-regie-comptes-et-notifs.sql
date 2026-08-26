-- LA RÉGIE VOIT ENFIN QUI EST ABONNÉ AUX NOTIFICATIONS.
--
-- Demandé : « en Régie serait-il possible de voir les comptes créés avec
-- application des notifs ? ». La question est venue d'un défaut qu'on ne
-- pouvait pas diagnostiquer depuis l'écran — la tournée répondait « 0 visé »
-- toutes les heures et rien ne le montrait nulle part.
--
-- ⚠️ ELLE NE PASSE PAS PAR `scrutin_admin_list_users`, ET C'EST UN CONSTAT :
-- cette fonction-là FILTRE sur `raw_user_meta_data ? 'lang'` ou l'existence
-- d'un scrutin, d'un espace, d'un événement ou d'un rôle d'admin. Un compte créé
-- DEPUIS UN JEU — la seule porte que les joueurs empruntent — n'a rien de tout
-- ça : il n'apparaît donc pas dans l'onglet « Personnes ». La Régie ne pouvait
-- littéralement pas voir ses joueurs.
--
-- ⚠️ ON LISTE DONC PAR L'USAGE DES JEUX, pas par la table des comptes : un
-- abonnement, un pseudo, une journée de Banalo ou une partie de Cinq sur cinq.
-- C'est ce qui fait entrer les joueurs, et ce qui laisse dehors les comptes de
-- scrutin qui n'ont jamais joué.
--
-- ⚠️ ET LES TROIS GENRES SONT VRAIS PAR DÉFAUT, comme partout : `s'abonner EST
-- le consentement`. Un compte sans ligne de réglages reçoit tout, et c'est ce
-- que l'écran doit montrer — lire `null` comme « éteint » ferait croire à un
-- refus qui n'a pas eu lieu.
create or replace function public.scrutin_admin_notifs(p_max int default 200)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare v jsonb;
begin
  if not public.scrutin_is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', t.id,
           'email', t.email,
           'creeLe', t.cree_le,
           'pseudo', t.pseudo,
           'bloque', t.bloque,
           -- Combien d'appareils de ce compte sont abonnés. Zéro = il n'a jamais
           -- accordé la permission, ou il l'a retirée dans son navigateur.
           'appareils', t.appareils,
           'journee', t.journee,
           'hebdo', t.hebdo,
           'saison', t.saison,
           -- La dernière notification RÉELLEMENT envoyée. `null` sur un compte
           -- abonné est le signal qui manquait : la tournée ne l'a jamais atteint.
           'derniereNotif', t.derniere,
           'journees', t.journees
         ) order by t.appareils desc, t.cree_le), '[]'::jsonb)
    into v
    from (
      select u.id, coalesce(u.email, '') as email, u.created_at as cree_le,
             p.pseudo, p.bloque_le is not null as bloque,
             (select count(*) from scrutin_push_subscriptions s where s.user_id = u.id) as appareils,
             coalesce(r.journee, true) as journee,
             coalesce(r.hebdo,   true) as hebdo,
             coalesce(r.saison,  true) as saison,
             (select max(e.cree_le) from scrutin_jeux_notifs_envoyees e where e.user_id = u.id) as derniere,
             (select count(*) from scrutin_banalo_results b where b.user_id = u.id)
           + (select count(*) from scrutin_game_pays_results g where g.user_id = u.id) as journees
        from auth.users u
        left join scrutin_jeux_pseudos p on p.user_id = u.id
        left join scrutin_jeux_notifs_reglages r on r.user_id = u.id
       where exists (select 1 from scrutin_push_subscriptions s where s.user_id = u.id)
          or p.user_id is not null
          or exists (select 1 from scrutin_banalo_results b where b.user_id = u.id)
          or exists (select 1 from scrutin_game_pays_results g where g.user_id = u.id)
       order by u.created_at desc
       limit greatest(1, least(coalesce(p_max, 200), 500))
    ) t;

  return jsonb_build_object('status', 'ok', 'comptes', v);
end $function$;

-- ⚠️ `revoke ... from public` NE RETIRE PAS LE DROIT DE `anon` : Supabase pose
-- des privilèges PAR DÉFAUT sur les fonctions du schéma public, il faut le
-- NOMMER. Cette fonction rend des ADRESSES E-MAIL : la garde d'admin est dans le
-- corps, mais le droit d'exécution ne doit pas non plus traîner.
revoke all on function public.scrutin_admin_notifs(int) from public, anon, authenticated;
grant execute on function public.scrutin_admin_notifs(int) to authenticated;
