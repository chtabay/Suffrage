-- LA GRILLE MARCHÉ CESSE D'ÊTRE UNIQUEMENT PUBLIQUE.
--
-- POURQUOI. La demande d'origine était de voir, au même endroit, « les sondages
-- publics, ceux auxquels on participe, ceux accessibles par les cercles
-- auxquels on appartient ». La première livraison n'a rendu que la première
-- colonne : les consultations de cercle n'apparaissaient nulle part dans la
-- grille, alors qu'elles sont précisément ce que le connecté peut voir et que
-- personne d'autre ne voit.
--
-- LA LIGNE QU'ON NE FRANCHIT PAS. On n'élargit PAS `get_public_polls`. Sa clause
-- `visibility = 'public' and moderation_status = 'approved'` est sa propriété de
-- sûreté : c'est une fonction SECURITY DEFINER exécutable par `anon`, et y
-- ajouter des lignes non publiques serait exactement la façon dont une fuite
-- s'écrit. Deux publics, deux fonctions — celle-ci n'est ouverte qu'à
-- `authenticated` et ne rend jamais que les convocations de l'appelant.
--
-- L'UNITÉ DE LA CARTE EST LA SUITE, PAS LA QUESTION. Une AG à huit résolutions
-- est UNE chose à faire, pas huit cartes. La carte porte donc le titre de la
-- suite, le nom du cercle, et l'avancement « n / total » — le seul signal
-- honnête, celui de la §4 de docs/participant-spec.md : le temps qui reste et
-- « ai-je répondu ».

-- ------------------------------------------------------- épingler une suite
--
-- POURQUOI UNE SECONDE TABLE plutôt qu'une ligne dans `scrutin_pins`. Celle-ci
-- est clée sur un SCRUTIN ; une suite de questions n'en est pas un. Faire porter
-- l'épingle d'une suite par l'une de ses questions serait une convention
-- invisible, vraie nulle part dans le schéma et à réapprendre à chaque lecture.
-- Deux faits distincts, deux tables — et `get_my_pins`, qui tentait de rendre
-- une épingle de scrutin comme une épingle de cercle, disparaît plus bas.
create table if not exists public.scrutin_event_pins (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.scrutin_events(id) on delete cascade,
  pinned_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create index if not exists scrutin_event_pins_user_idx
  on public.scrutin_event_pins (user_id, pinned_at desc);

alter table public.scrutin_event_pins enable row level security;

-- Comme pour `scrutin_pins` : épingler ne donne aucun droit, c'est un
-- marque-page. L'intéressé écrit le sien, et lui seul le lit.
drop policy if exists event_pins_self on public.scrutin_event_pins;
create policy event_pins_self on public.scrutin_event_pins
  for all to public
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Bascule par MON jeton de convoqué — le client ne manipule que celui-là.
--
-- L'invariant d'accès de Guillaume s'applique ici comme sur `toggle_pin` : on
-- n'épingle que ce à quoi on a accès. Le titre exigé est le rattachement
-- (`scrutin_member_links`, donc email vérifié), pas la simple détention du
-- jeton : c'est le même titre que celui qui fait entrer la carte dans la
-- grille, donc rien d'épinglable qui ne soit déjà visible. Et le refus rend le
-- MÊME `false` qu'un jeton inexistant — pas d'oracle de validité.
create or replace function public.toggle_circle_pin(p_member_token text)
returns boolean language plpgsql security definer set search_path to 'public' as $function$
declare v_event uuid; v_exists boolean;
begin
  if auth.uid() is null then return false; end if;

  select em.event_id into v_event
    from scrutin_event_members em
    join scrutin_member_links ml on ml.member_id = em.member_id
   where em.token = p_member_token and ml.user_id = auth.uid()
   limit 1;
  if v_event is null then return false; end if;

  select exists (select 1 from scrutin_event_pins
                  where user_id = auth.uid() and event_id = v_event)
    into v_exists;
  if v_exists then
    delete from scrutin_event_pins where user_id = auth.uid() and event_id = v_event;
    return false;
  end if;
  insert into scrutin_event_pins (user_id, event_id) values (auth.uid(), v_event)
    on conflict do nothing;
  return true;
end $function$;

-- ⚠️ Le `grant to authenticated` NE SUFFIT PAS : Postgres donne à `PUBLIC` un
-- droit d'exécution par défaut sur toute fonction. Sans le `revoke`, `anon`
-- pouvait appeler celle-ci — sans rien en tirer (`auth.uid()` est nul, la
-- jointure ne rend rien), mais la garde ne tenait alors qu'à un seul fil.
-- Vérifié après coup : `anon` → « permission denied », `authenticated` → ses
-- 2 cartes. Sans danger pour le chemin serveur, qui n'appelle pas ces deux-là.
revoke execute on function public.toggle_circle_pin(text) from public, anon;
grant execute on function public.toggle_circle_pin(text) to authenticated;

-- --------------------------------------------------- mes cartes de cercle
--
-- Ce que l'appelant peut voir et que personne d'autre ne voit. Jamais de
-- bulletin : l'avancement vient de l'émargement quand la suite est scellée, du
-- rattachement du bulletin sinon — la même règle que `get_my_feed`, pour que
-- les deux surfaces ne puissent pas se contredire.
--
-- Les brouillons sont exclus : une suite non ouverte n'est pas une chose à
-- faire, et son existence même n'a pas à fuiter avant sa convocation.
--
-- PAS DE PAGINATION, et c'est délibéré : le nombre de sollicitations d'un cercle
-- est déjà borné par `solicit_per_day`. Le plafond de 200 est un garde-fou, pas
-- une page ; l'appelant sait combien il en a demandé et peut le dire.
create or replace function public.get_my_circle_cards(p_limit integer default 100)
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select coalesce(jsonb_agg(row_to_json(x) order by x.sort_at desc), '[]'::jsonb) from (
    select
      em.token,
      e.title,
      s.name as circle,
      e.secret_ballot,
      e.audience_label,
      e.status,
      e.closes_at,
      coalesce(e.opens_at, e.created_at) as sort_at,
      (select count(*) from scrutin_polls p where p.event_id = e.id) as questions,
      (select count(*) from scrutin_polls p
        where p.event_id = e.id
          and case when e.secret_ballot
                then exists (select 1 from scrutin_event_signins g
                              where g.poll_id = p.id and g.event_member_id = em.id)
                else exists (select 1 from scrutin_ballots b
                              where b.poll_id = p.id and b.event_member_id = em.id)
              end) as answered,
      exists (select 1 from scrutin_event_pins ep
               where ep.event_id = e.id and ep.user_id = auth.uid()) as pinned
    from scrutin_member_links ml
    join scrutin_members m on m.id = ml.member_id
    join scrutin_event_members em on em.member_id = m.id
    join scrutin_events e on e.id = em.event_id
    join scrutin_spaces s on s.id = m.space_id
    where ml.user_id = auth.uid()
      and e.status in ('open', 'closed')
    order by coalesce(e.opens_at, e.created_at) desc
    limit least(coalesce(p_limit, 100), 200)
  ) x;
$function$;

revoke execute on function public.get_my_circle_cards(integer) from public, anon;
grant execute on function public.get_my_circle_cards(integer) to authenticated;

-- ------------------------------------------------------------ nettoyage
--
-- `get_my_pins` rendait une liste à part pour l'onglet « Épinglés ». Les deux
-- sortes de cartes vivant désormais dans la MÊME grille, cet onglet n'est plus
-- qu'un filtre sur `pinned` : la fonction n'a plus d'appelant, et une fonction
-- SECURITY DEFINER sans appelant est une surface d'attaque sans contrepartie.
--
-- Sa branche « cercle » n'avait d'ailleurs jamais pu s'allumer : elle rendait
-- une épingle de SCRUTIN sous les habits d'une consultation de cercle, alors
-- qu'aucun écran n'offrait d'épingler un scrutin de cercle — le membre ne voit
-- que son jeton de convoqué, jamais le jeton du scrutin.
drop function if exists public.get_my_pins();
