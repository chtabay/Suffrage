-- CORRIGER UN MEMBRE, ET AFFECTER UN SEGMENT À PLUSIEURS D'UN COUP.
--
-- POURQUOI. La page des membres n'avait que deux verbes : ajouter et supprimer.
-- Corriger une faute d'un caractère dans une adresse — le cas le plus banal d'un
-- import de quarante lignes — imposait donc de SUPPRIMER la personne et de
-- recoller sa ligne. En cascade, elle perdait ses segments, son pont de compte,
-- son jeton personnel `/m/<token>` déjà envoyé par email, et sa date de
-- consentement était réécrite à aujourd'hui. Trois gestes destructeurs pour une
-- lettre.
--
-- `updateMember` existait pourtant depuis toujours, sans un seul appelant.

-- ------------------------------------------------- 1. le pont de compte
--
-- LE TROU QUE LA CORRECTION OUVRIRAIT SI ON NE LE FERMAIT PAS.
--
-- `scrutin_member_links` relie un membre à un COMPTE, et il n'est créé que sur
-- un email VÉRIFIÉ (`link_my_memberships`). Changer l'adresse d'un membre sans
-- rien faire d'autre laisserait donc le lien intact : l'ancien titulaire de
-- l'adresse continuerait de voir les consultations de ce membre dans son
-- compte, et de pouvoir y répondre à sa place.
--
-- Le lien se refait tout seul, et c'est le point : la personne qui possède
-- désormais cette adresse le recréera à sa prochaine connexion, sur email
-- vérifié. On coupe donc sans rien demander à personne.
--
-- `after update of email` : le déclencheur ne s'arme que sur la colonne qui
-- change le titre, pas sur un changement de nom ou de poids.
create or replace function public.scrutin_members_email_changed()
returns trigger language plpgsql set search_path to 'public' as $function$
begin
  if new.email is distinct from old.email then
    delete from scrutin_member_links where member_id = old.id;
  end if;
  return new;
end $function$;

drop trigger if exists scrutin_members_email_changed_t on public.scrutin_members;
create trigger scrutin_members_email_changed_t
  after update of email on public.scrutin_members
  for each row execute function public.scrutin_members_email_changed();

-- ------------------------------------------- 2. l'affectation en lot
--
-- POURQUOI UNE FONCTION ET PAS UNE BOUCLE. Ranger douze personnes dans un
-- segment coûtait douze écritures réseau, une par personne — trois clics
-- chacune, soit trente-six pour un geste qu'on fait à chaque nouvelle saison.
-- Le fondateur a tranché que la gestion d'un groupe doit rester FAISABLE SEUL
-- et que ce sera le cas majoritaire : quand une seule personne fait tout, le
-- coût dominant n'est plus la coordination, c'est la répétition.
--
-- La propriété est vérifiée EN BASE, pas confiée à l'appelant : la fonction est
-- SECURITY DEFINER, donc elle ne peut pas s'appuyer sur la RLS de l'appelant —
-- une policy est évaluée avec les droits de celui qui appelle, et une
-- sous-requête sur une table protégée répondrait « non » en silence.
--
-- Idempotente : réaffecter quelqu'un qui l'est déjà ne fait rien, et ne compte
-- pas. Le nombre rendu est celui des rattachements RÉELLEMENT créés.
create or replace function public.assign_segment_bulk(p_segment_id uuid, p_member_ids uuid[])
returns int language plpgsql security definer set search_path to 'public' as $function$
declare v_space uuid; v_n int;
begin
  if auth.uid() is null or p_member_ids is null or array_length(p_member_ids, 1) is null then
    return 0;
  end if;

  -- Le segment appartient-il à un groupe que j'anime ?
  select s.space_id into v_space
    from scrutin_segments s
    join scrutin_spaces sp on sp.id = s.space_id
   where s.id = p_segment_id and sp.owner_id = auth.uid();
  if v_space is null then return 0; end if;

  -- On n'affecte QUE des membres du même groupe : sans ce filtre, un identifiant
  -- glissé dans le tableau ferait entrer quelqu'un d'un autre groupe dans un
  -- segment — donc dans le public d'une consultation.
  insert into scrutin_member_segments (member_id, segment_id)
  select m.id, p_segment_id
    from scrutin_members m
   where m.id = any(p_member_ids) and m.space_id = v_space
  on conflict (member_id, segment_id) do nothing;

  get diagnostics v_n = row_count;
  return v_n;
end $function$;

-- ⚠️ Le `grant to authenticated` NE SUFFIT PAS : PUBLIC détient l'EXECUTE par
-- défaut sur toute fonction. Le `revoke` vient AVANT, et dans cet ordre.
revoke all on function public.assign_segment_bulk(uuid, uuid[]) from public, anon;
grant execute on function public.assign_segment_bulk(uuid, uuid[]) to authenticated;
