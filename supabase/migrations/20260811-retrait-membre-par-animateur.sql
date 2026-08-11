-- LES DEUX SORTIES D'UN GROUPE DOIVENT LAISSER LA BASE DANS LE MÊME ÉTAT.
--
-- Il y a deux façons de quitter un groupe : l'intéressé s'en va (`leave_circle`)
-- ou l'animateur le retire. Le premier chemin fait TROIS gestes ; le second en
-- faisait UN — `delete from scrutin_members` en direct depuis le navigateur.
--
-- Ce qui manquait, vérifié en base :
--   • `scrutin_event_members.member_id` est ON DELETE SET NULL. La convocation
--     SURVIT donc au retrait, avec `name`, `email` et surtout `token` inchangés.
--   • `cast_event_ballot` identifie le votant par le SEUL jeton
--     (`select * into em from scrutin_event_members where token = p_token`) et
--     ne teste jamais l'appartenance au roster.
--   ⇒ La personne retirée CONTINUE DE VOTER dans toutes les consultations
--     ouvertes du groupe, avec le lien qu'elle a déjà reçu.
--   ⇒ Son nom et son adresse restent en base indéfiniment, et `leave_circle` ne
--     pourra plus les atteindre : elle apparie sur `member_id`, désormais nul.
--   ⇒ `convened` continue de la compter : « 18/24 ont émargé » où 24 inclut des
--     gens qui ne sont plus membres.
--
-- On rejoue donc LITTÉRALEMENT le corps de `leave_circle`, avec la même règle
-- sur les événements clos (anonymiser plutôt que supprimer : `scrutin_ballots`
-- est en ON DELETE CASCADE sur `event_member_id`, supprimer changerait le
-- résultat d'une assemblée déjà tenue) et la MÊME ROTATION DU JETON, qui est ce
-- qui coupe réellement l'accès.

create or replace function public.remove_member(p_member_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare m scrutin_members; v_owner uuid;
begin
  select * into m from scrutin_members where id = p_member_id;
  if not found then return jsonb_build_object('status', 'invalid'); end if;

  -- La garde de propriété est ICI et pas dans une policy : la fonction est
  -- `security definer`, elle traverse la RLS. C'est le seul rempart.
  select s.owner_id into v_owner from scrutin_spaces s where s.id = m.space_id;
  if v_owner is null or v_owner <> auth.uid() then
    return jsonb_build_object('status', 'forbidden');
  end if;

  -- Consultation CLOSE : on anonymise, on ne supprime pas — et on FAIT TOURNER
  -- LE JETON, sans quoi le lien déjà distribué continuerait d'ouvrir la page.
  update scrutin_event_members em
     set name = '—', email = null, member_id = null,
         token = encode(extensions.gen_random_bytes(9), 'hex')
    from scrutin_events e
   where e.id = em.event_id and em.member_id = m.id and e.status = 'closed';

  -- Consultation en cours : la convocation part vraiment. En scellé le bulletin
  -- porte `event_member_id` NULL : il survit, anonyme, et le décompte reste juste.
  delete from scrutin_event_members em
   using scrutin_events e
   where e.id = em.event_id and em.member_id = m.id and e.status <> 'closed';

  -- La file d'attente conserve nom + email : elle part avec le reste, sinon le
  -- retrait laisse derrière lui exactement ce qu'il prétend effacer.
  if m.email is not null then
    delete from scrutin_join_requests
     where space_id = m.space_id and lower(email) = lower(m.email);
  end if;

  delete from scrutin_members where id = m.id;
  return jsonb_build_object('status', 'ok');
end $function$;

revoke all on function public.remove_member(uuid) from public, anon;
grant execute on function public.remove_member(uuid) to authenticated;
