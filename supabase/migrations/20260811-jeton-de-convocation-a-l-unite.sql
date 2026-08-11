-- LE JETON DE CONVOCATION NE DESCEND PLUS EN MASSE.
--
-- LA BRÈCHE, vérifiée. `listConvened` rendait `token` pour CHAQUE convoqué : le
-- navigateur de l'animateur recevait les N jetons d'un coup. Or
-- `get_event_context(p_token)` est exécutable par PUBLIC et rend, pour le
-- porteur du jeton, un booléen `voted` calculé sur `scrutin_event_signins` dès
-- que la consultation est scellée :
--
--     'voted', case when ev.secret_ballot
--                then exists (select 1 from scrutin_event_signins s
--                              where s.poll_id = p.id and s.event_member_id = em.id)
--
-- Un appel par jeton reconstitue donc NOMINATIVEMENT la liste des émargeants
-- d'un bulletin scellé. C'est mot pour mot la brèche fermée le 2026-08-07 sur
-- `scrutin_members.token`, rouverte par la colonne sœur.
--
-- ⚠️ CE QUE L'ANCIEN COMMENTAIRE DISAIT, ET POURQUOI IL NE SUFFIT PAS. Il
-- écartait ce jeton au motif que « l'animateur a le droit de le distribuer
-- puisqu'il l'envoie ». C'est un argument sur le droit de DIFFUSER ; il ne dit
-- rien de l'ORACLE que la DÉTENTION ouvre. Distribuer un lien à une personne et
-- détenir les N liens ne sont pas le même pouvoir.
--
-- LA FORME DU CORRECTIF. On ne ferme pas l'oracle côté `get_event_context` : le
-- votant doit pouvoir lire « vous avez déjà répondu », c'est sa page. On coupe
-- l'ACCUMULATION : le jeton ne part plus avec la liste, il se demande à l'unité,
-- et la demande est REFUSÉE quand la consultation est scellée — là où vit la
-- promesse. Hors scellé, aucune promesse de secret n'a été faite et l'animateur
-- lit déjà les bulletins : rien à protéger, on rend le jeton.

create or replace function public.get_convocation_link(p_event_member_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare v_token text; v_sealed boolean; v_owner uuid;
begin
  select em.token, e.secret_ballot, s.owner_id
    into v_token, v_sealed, v_owner
    from scrutin_event_members em
    join scrutin_events e on e.id = em.event_id
    left join scrutin_spaces s on s.id = e.space_id
   where em.id = p_event_member_id;

  if v_token is null then return jsonb_build_object('status', 'invalid'); end if;

  -- `security definer` traverse la RLS : la garde de propriété est ici, et une
  -- consultation sans espace (scrutin hors groupe) n'a pas d'animateur à qui
  -- rendre quoi que ce soit.
  if v_owner is null or v_owner <> auth.uid() then
    return jsonb_build_object('status', 'forbidden');
  end if;

  if v_sealed then
    -- Le refus EST la fonctionnalité. Le lien part par courriel, écrit par la
    -- route d'envoi, qui ne le rend jamais au navigateur.
    return jsonb_build_object('status', 'sealed');
  end if;

  return jsonb_build_object('status', 'ok', 'token', v_token);
end $function$;

revoke all on function public.get_convocation_link(uuid) from public, anon;
grant execute on function public.get_convocation_link(uuid) to authenticated;
