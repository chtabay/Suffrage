-- Trou PRÉEXISTANT (sans rapport avec les cercles), repéré à l'annexe de
-- docs/cercles-spec.md et corrigé ici.
--
-- POURQUOI. `scrutin_polls_update_owner` n'avait pas de `with_check` : pour un
-- UPDATE, Postgres réutilise alors le `using`, qui ne vérifie que la PROPRIÉTÉ du
-- scrutin. Et la policy RESTRICTIVE `scrutin_polls_insert_private` ne couvre que
-- INSERT. Conséquence : un propriétaire pouvait publier son scrutin d'un simple
-- `update scrutin_polls set visibility = 'public'`, en contournant les QUATRE
-- garde-fous de `set_poll_visibility()` :
--   1. refus de publier une liste de propositions non figée (`status='proposals'`)
--   2. refus d'un scrutin masqué par la modération
--   3. plafond de 5 publications par 24 h
--   4. journal de publication (`scrutin_publish_log`)
-- Le commentaire de `src/lib/db/polls.ts` affirmait déjà cette protection : le
-- code documentait un invariant que la base ne tenait pas.
--
-- POURQUOI UN DÉCLENCHEUR ET NON UNE POLICY. Une policy RESTRICTIVE sur UPDATE ne
-- peut pas exprimer la règle : `WITH CHECK` ne voit que la ligne NOUVELLE, donc
-- « visibility = 'private' » interdirait aussi de clore un scrutin déjà public.
-- La règle porte sur le CHANGEMENT, pas sur l'état — il faut voir OLD et NEW.
--
-- LE CRITÈRE. Toutes les fonctions légitimes (`set_poll_visibility`,
-- `scrutin_admin_moderate`…) sont SECURITY DEFINER et s'exécutent donc sous
-- `postgres`, tandis qu'un UPDATE venu du navigateur s'exécute sous
-- `anon`/`authenticated`. Vérifié dans `src/` : aucun code client n'écrit
-- `visibility`, il n'est que lu — la publication passe par la RPC.
--
-- VÉRIFIÉ EN BASE, en empruntant l'identité d'un propriétaire authentifié
-- (`request.jwt.claims` + `set role authenticated`) :
--   modification légitime du propriétaire      -> passe
--   `set visibility='public'` en direct        -> refusé, visibilité inchangée
--   set_poll_visibility(public) puis (privé)   -> ok, ok, journal alimenté

create or replace function public.scrutin_polls_guard_visibility()
returns trigger language plpgsql set search_path to 'public' as $function$
begin
  if new.visibility is distinct from old.visibility
     and current_user in ('anon', 'authenticated') then
    raise exception 'visibility_change_forbidden'
      using hint = 'La visibilité se change par set_poll_visibility(), qui vérifie la liste figée, la modération et le plafond de publication.';
  end if;
  return new;
end $function$;

drop trigger if exists scrutin_polls_visibility_guard on public.scrutin_polls;
create trigger scrutin_polls_visibility_guard
  before update on public.scrutin_polls
  for each row execute function public.scrutin_polls_guard_visibility();

-- Et on rend explicite le `with_check` manquant. Le comportement implicite était
-- déjà celui-ci, mais une policy d'écriture dont la clause de contrôle est nulle
-- est un piège à relecture : on croit lire une garde, il n'y en a pas.
drop policy if exists scrutin_polls_update_owner on public.scrutin_polls;
create policy scrutin_polls_update_owner on public.scrutin_polls
  for update to public
  using (created_by = auth.uid())
  with check (created_by = auth.uid());
