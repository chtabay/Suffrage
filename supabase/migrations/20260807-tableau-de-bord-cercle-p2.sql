-- LE RATIO D'ÉMARGEMENT — débloqué par le correctif du bulletin scellé.
--
-- POURQUOI IL ARRIVE MAINTENANT ET PAS AVANT. Ce chiffre était écrit dans la
-- spécification depuis le début, et délibérément retenu : tant que le
-- dépouillement d'une consultation scellée restait lisible PENDANT le vote, un
-- compteur de participation disait à l'animateur le moment exact où envoyer un
-- lien individuel et relire l'écart. Il n'outillait pas un tableau de bord, il
-- outillait une attaque. `20260807-secret-du-bulletin-scelle.sql` a fermé ce
-- chemin ; le chiffre devient affichable.
--
-- CE QU'IL EST, ET CE QU'IL N'EST PAS. `signed` compte des ÉMARGEMENTS — le
-- fait d'avoir participé, jamais ce qui a été répondu. C'est exactement l'objet
-- de `scrutin_event_signins`, créée pour que le bulletin scellé puisse exister :
-- une trace qui compte des personnes sans rien dire de leur vote.
--
-- AUCUN NOM N'EN SORT. Ni ici, ni ailleurs : la liste nominative des
-- non-répondants reste interdite — sur un résultat unanime, elle attribue
-- nommément le même vote à chacun.
--
-- LE PLANCHER D'AFFICHAGE EST CÔTÉ ÉCRAN, PAS ICI, et c'est voulu : en scellé,
-- le ratio n'est montré qu'à partir de 5 convoqués (« 2/3 » sur trois personnes
-- est déjà une désignation partielle). La RPC rend la donnée brute au seul
-- propriétaire du cercle ; c'est la vue qui décide de la taire. Un jour où une
-- autre surface l'utilisera, elle devra reprendre la même règle — elle est
-- écrite dans le composant, à côté du rendu.

create or replace function public.get_space_event_stats(p_space_id uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select coalesce(jsonb_object_agg(e.id, jsonb_build_object(
    'questions', (select count(*) from scrutin_polls p where p.event_id = e.id),
    'convened',  (select count(*) from scrutin_event_members em where em.event_id = e.id),
    -- En scellé, le bulletin est écrit SANS identité : seul l'émargement compte
    -- des personnes. Hors scellé, le bulletin porte le convoqué et fait foi.
    -- Un `count(distinct …)` des deux côtés : une consultation à plusieurs
    -- questions ne doit pas compter la même personne une fois par question.
    'signed', case when e.secret_ballot
                then (select count(distinct g.event_member_id)
                        from scrutin_event_signins g
                        join scrutin_polls p on p.id = g.poll_id
                       where p.event_id = e.id)
                else (select count(distinct b.event_member_id)
                        from scrutin_ballots b
                        join scrutin_polls p on p.id = b.poll_id
                       where p.event_id = e.id and b.event_member_id is not null)
              end
  )), '{}'::jsonb)
  from scrutin_events e
  join scrutin_spaces s on s.id = e.space_id
  where e.space_id = p_space_id
    and (s.owner_id = auth.uid() or e.owner_id = auth.uid());
$function$;

-- Le `revoke` reste indispensable et vient AVANT le `grant` : `create or replace`
-- conserve les droits existants, mais on ne se fie pas à ça.
revoke all on function public.get_space_event_stats(uuid) from public, anon;
grant execute on function public.get_space_event_stats(uuid) to authenticated;
