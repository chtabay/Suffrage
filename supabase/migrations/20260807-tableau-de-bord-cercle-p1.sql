-- TABLEAU DE BORD DE CERCLE, LOT P1 — deux agrégats, aucune donnée de bulletin.
--
-- POURQUOI. Le P0 a fait de /espaces/<id> une page qui gouverne, mais deux de
-- ses chiffres n'étaient dérivables de rien : le nombre de questions d'une
-- consultation, et l'effectif réellement convoqué. Résultat, une ligne annonçait
-- « public non enregistré » sans jamais pouvoir dire à combien de personnes elle
-- s'adressait — or `audience_label` n'est écrit que par le parcours `/new`, donc
-- il vaut NULL pour TOUTE consultation née de l'éditeur.
--
-- CE QUE CES DEUX FONCTIONS NE FONT PAS, et c'est le point : elles ne touchent
-- ni `scrutin_ballots` ni `scrutin_event_signins`. Le ratio d'émargement
-- (« 18/24 ont répondu ») est délibérément REMIS À PLUS TARD, parce qu'il est
-- dangereux tant que le dépouillement d'une consultation scellée reste lisible
-- PENDANT le vote : `get_event_results_owner` ne teste pas le statut et
-- `event_results_payload` renvoie 'closed' en dur. Un compteur de participation
-- dirait alors à l'animateur le moment exact où envoyer un lien individuel et
-- relire l'écart — et la variation d'une voix EST le bulletin de cette personne.
-- L'ordre n'est pas négociable : la garde d'abord, le chiffre ensuite.

-- ------------------------------------------------- agrégats par consultation
--
-- Réservée au propriétaire du cercle (ou de l'événement). Renvoie un objet
-- indexé par identifiant de consultation, pour que l'écran fasse une seule
-- requête au lieu d'une par ligne.
--
-- `convened` est le nombre de convoqués, pas un taux de réponse : c'est la
-- taille d'un public que l'animateur a lui-même choisi. Il ne dit rien d'un
-- bulletin, et aucun seuil ne s'y applique.
create or replace function public.get_space_event_stats(p_space_id uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select coalesce(jsonb_object_agg(e.id, jsonb_build_object(
    'questions', (select count(*) from scrutin_polls p where p.event_id = e.id),
    'convened',  (select count(*) from scrutin_event_members em where em.event_id = e.id)
  )), '{}'::jsonb)
  from scrutin_events e
  join scrutin_spaces s on s.id = e.space_id
  where e.space_id = p_space_id
    and (s.owner_id = auth.uid() or e.owner_id = auth.uid());
$function$;

-- ⚠️ `grant to authenticated` NE SUFFIT PAS : Postgres donne à PUBLIC un droit
-- d'exécution par défaut sur toute fonction. Le `revoke` vient donc AVANT, et
-- dans cet ordre. Piège déjà payé sur `get_my_circle_cards` le 2026-08-06.
revoke all on function public.get_space_event_stats(uuid) from public, anon;
grant execute on function public.get_space_event_stats(uuid) to authenticated;

-- ------------------------------------------- demandes d'adhésion en attente
--
-- POURQUOI UN ÂGE ET PAS SEULEMENT UN COMPTE. « 3 en attente » ne discrimine
-- rien : ce sont soit trois clics d'il y a deux minutes — rien à faire — soit
-- trois confirmations perdues à 70 h de la péremption, et la fenêtre est de
-- 72 h (`expires_at default now() + interval '72 hours'`). L'information
-- actionnable est l'ÂGE DE LA PLUS ANCIENNE, pas le nombre.
--
-- JAMAIS UN NOM, JAMAIS UNE ADRESSE. `scrutin_join_requests` a la RLS active et
-- ZÉRO policy, délibérément : la file contient des adresses NON confirmées, et
-- en rendre une rouvrirait l'oracle d'appartenance que ce zéro-policy protège
-- (« telle personne a demandé à rejoindre tel cercle »). Un horodatage
-- n'identifie personne.
create or replace function public.get_space_join_pending(p_space_id uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select jsonb_build_object(
    'count', count(*)::int,
    'oldest_at', min(r.created_at)
  )
  from scrutin_join_requests r
  join scrutin_spaces s on s.id = r.space_id
  where r.space_id = p_space_id
    and s.owner_id = auth.uid()
    and r.confirmed_at is null
    and r.expires_at > now();
$function$;

revoke all on function public.get_space_join_pending(uuid) from public, anon;
grant execute on function public.get_space_join_pending(uuid) to authenticated;
