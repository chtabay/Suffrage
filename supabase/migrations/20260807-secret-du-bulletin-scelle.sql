-- LE BULLETIN SCELLÉ NE TENAIT PAS CONTRE L'ANIMATEUR.
--
-- Placet promet au votant, par écrit et en quatre langues (`Livret.sealedExplain`),
-- que personne ne pourra relier sa réponse à lui. Quatre chemins la démentaient.
-- Aucun n'a jamais été exploité — les cercles n'ont jamais servi en vrai — mais
-- c'est une promesse faite AVANT le vote, et elle doit tenir contre celui qui a
-- le plus de moyens de la briser : l'animateur du cercle lui-même.
--
-- ┌── 1. LE DÉPOUILLEMENT EN DIRECT ───────────────────────────────────────────
-- │ `get_event_results` (chemin VOTANT) refuse tant que la consultation n'est
-- │ pas close. `get_event_results_owner` (chemin ANIMATEUR) ne testait JAMAIS le
-- │ statut, et `event_results_payload` renvoyait 'closed' en dur. L'animateur
-- │ d'une consultation scellée OUVERTE lisait donc le dépouillement en direct —
-- │ et l'éditeur donne un bouton « copier le lien » PAR CONVOQUÉ. Envoyer le
-- │ lien à une seule personne, recharger, et la variation d'une voix EST le
-- │ bulletin de cette personne. Le seuil de 5 ne protégeait que le PREMIER
-- │ affichage, jamais les écarts suivants.
-- └───────────────────────────────────────────────────────────────────────────
-- ┌── 2. LE SEUIL COMPTAIT DES BULLETINS, PAS DES PERSONNES ───────────────────
-- │ Une consultation scellée de 5 questions à laquelle UNE SEULE personne
-- │ répond produit 5 bulletins : le seuil de 5 était franchi, et chaque question
-- │ s'affichait avec exactement un bulletin — la totalité des réponses d'un
-- │ individu identifiable. Et une question ajoutée en cours de route héritait du
-- │ seuil franchi par ses voisines.
-- └───────────────────────────────────────────────────────────────────────────
-- ┌── 3. LE SCEAU POSÉ À LA MAIN CONTOURNAIT TOUT ─────────────────────────────
-- │ `circle_audience_guard` n'est appelée que par `set_poll_audience` et
-- │ `open_circle_consultation`, donc par le seul parcours `/new?espace=`.
-- │ L'éditeur ouvre par `updateEvent({status:'open'})`, un `update` nu.
-- │ Convoquer 2 personnes, cocher « scellé », ouvrir : deux personnes étaient
-- │ dépouillées comme si l'anonymat tenait. Une garde d'interface ne suffit pas
-- │ ici — il faut un DÉCLENCHEUR, que tous les chemins traversent.
-- └───────────────────────────────────────────────────────────────────────────
-- ┌── 4. LA SOUSTRACTION ENTRE DEUX CONSULTATIONS ─────────────────────────────
-- │ Deux publics scellés dont l'un est contenu dans l'autre à une personne
-- │ près : les deux passent le seuil de 5, et la différence des dépouillements
-- │ rend le bulletin de cette personne. Agréger le dépouillement n'y change
-- │ RIEN — la différence de deux agrégats reste la contribution d'un individu.
-- │
-- │ PORTÉE VOLONTAIREMENT ÉTROITE, et voici pourquoi. Refuser tout écart de 1 à
-- │ 4 interdirait « consulter tout le cercle, puis un segment de 9 sur 12 »,
-- │ qui est un usage parfaitement légitime et fréquent. On refuse donc la seule
-- │ forme qui n'a AUCUN usage légitime : un public strictement contenu dans un
-- │ autre à UNE OU DEUX personnes près. Personne ne consulte « tout le cercle
-- │ sauf Marie ». L'écart de 3 ou 4 reste ouvert, et c'est une décision de
-- │ produit consignée, pas un oubli.
-- └───────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════ 1 et 2 — le dépouillement
--
-- ⚠️ CE QU'ON NE TOUCHE PAS. Le champ `status` du PAYLOAD garde la valeur
-- 'closed' quand les résultats sont servis : ce n'est pas le statut de la
-- consultation, c'est un drapeau de contrat qui dit « voici les résultats », et
-- trois écrans le lisent ainsi. Le rendre égal au vrai statut priverait de
-- résultats en direct les consultations NOMINATIVES ouvertes — où l'animateur a
-- de toute façon le droit de voir qui a répondu quoi, et le votant en est averti
-- avant de voter. La garde neuve est au-dessus, et elle ne vise que le scellé.
create or replace function public.event_results_payload(p_event_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_event scrutin_events; v_resolutions jsonb; v_min constant int := 5; v_signers int;
begin
  select * into v_event from scrutin_events where id = p_event_id;
  if not found then return jsonb_build_object('status', 'invalid'); end if;

  -- (1) En scellé : AUCUN dépouillement avant la clôture. Sans cette ligne,
  -- chaque rechargement pendant le vote est un delta d'une voix.
  if v_event.secret_ballot and v_event.status <> 'closed' then
    return jsonb_build_object('status', 'not_closed', 'title', v_event.title);
  end if;

  if v_event.secret_ballot then
    -- (2) Des PERSONNES, pas des bulletins. L'émargement est la seule trace qui
    -- compte des individus sans dire ce qu'ils ont répondu.
    select count(distinct g.event_member_id) into v_signers
      from scrutin_event_signins g
      join scrutin_polls p on p.id = g.poll_id
     where p.event_id = v_event.id;
    if v_signers < v_min then
      return jsonb_build_object('status', 'too_few', 'ballots', v_signers, 'min', v_min, 'title', v_event.title);
    end if;
  end if;

  select coalesce(jsonb_agg(obj order by ord), '[]'::jsonb) into v_resolutions
  from (
    select
      p.order_index as ord,
      jsonb_build_object(
        'id', p.id, 'token', p.token, 'question', p.question, 'description', p.description,
        'options', p.options, 'recipe', p.recipe, 'status', p.status,
        'order_index', p.order_index, 'closes_at', p.closes_at,
        'ballots', case
          -- (2 bis) Seuil PAR QUESTION : une question ajoutée en cours de route
          -- ne doit pas hériter du seuil franchi par ses voisines.
          when v_event.secret_ballot
               and (select count(distinct g.event_member_id) from scrutin_event_signins g
                     where g.poll_id = p.id) < v_min
            then '[]'::jsonb
          else coalesce((
            select jsonb_agg(jsonb_build_object(
              'ranking', b.ranking, 'grades', b.grades,
              'district', case when v_event.secret_ballot then 0 else b.district end,
              'weight', case when v_event.secret_ballot then 1 else coalesce(em.weight, 1) end)
              order by case when v_event.secret_ballot then random() else 0 end)
            from scrutin_ballots b
            left join scrutin_event_members em on em.id = b.event_member_id
            where b.poll_id = p.id
          ), '[]'::jsonb)
        end
      ) as obj
    from scrutin_polls p
    where p.event_id = v_event.id
  ) sub;

  return jsonb_build_object(
    'status', 'closed', 'title', v_event.title, 'quorum', v_event.quorum,
    'secret_ballot', v_event.secret_ballot,
    'convened', (select count(*) from scrutin_event_members where event_id = v_event.id),
    'resolutions', v_resolutions
  );
end $function$;

-- ═══════════════════════════════════ 3 et 4 — la garde à l'ouverture
--
-- UN DÉCLENCHEUR ET NON UNE GARDE D'INTERFACE : tous les chemins finissent par
-- écrire `status = 'open'`, y compris l'`update` nu de l'éditeur, qui ne passe
-- par aucune fonction gardée. C'est le seul endroit que personne ne contourne.
create or replace function public.scrutin_events_sealed_guard()
returns trigger language plpgsql set search_path to 'public' as $function$
declare
  v_min constant int := 5;
  -- Écart maximal REFUSÉ entre deux publics scellés emboîtés. Étroit à dessein :
  -- voir l'en-tête, point 4.
  v_gap constant int := 2;
  v_convened int;
  v_other record;
  v_mine int; v_theirs int;
begin
  -- Ne se déclenche qu'au PASSAGE à l'état ouvert-et-scellé : rouvrir la même
  -- consultation, ou modifier un champ sans rapport, ne doit rien réveiller.
  if not (new.secret_ballot and new.status = 'open') then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'open' and old.secret_ballot then return new; end if;

  select count(*) into v_convened from scrutin_event_members where event_id = new.id;
  if v_convened < v_min then
    raise exception 'sealed_needs_5' using
      detail = format('%s convoqué(s), minimum %s', v_convened, v_min);
  end if;

  -- Soustraction : un public strictement contenu dans un autre (ou le
  -- contenant), à v_gap personnes près, permet d'isoler ces personnes en
  -- comparant les deux dépouillements. On ne compare que sur les membres
  -- RATTACHÉS au cercle (member_id non nul) : une inscription libre n'appartient
  -- à aucun ensemble comparable.
  if new.space_id is not null then
    for v_other in
      select e.id, e.title from scrutin_events e
       where e.space_id = new.space_id and e.id <> new.id
         and e.secret_ballot and e.status in ('open', 'closed')
    loop
      select
        count(*) filter (where src = 'moi' and member_id not in (select member_id from scrutin_event_members where event_id = v_other.id and member_id is not null)),
        count(*) filter (where src = 'lui' and member_id not in (select member_id from scrutin_event_members where event_id = new.id and member_id is not null))
        into v_mine, v_theirs
      from (
        select 'moi'::text as src, member_id from scrutin_event_members where event_id = new.id and member_id is not null
        union all
        select 'lui'::text, member_id from scrutin_event_members where event_id = v_other.id and member_id is not null
      ) u;

      -- Emboîtement STRICT seulement : si les deux côtés ont des membres propres,
      -- la différence des dépouillements ne rend qu'un écart entre deux groupes,
      -- jamais un individu. C'est le cas du renouvellement ordinaire d'un cercle,
      -- qu'on ne doit surtout pas bloquer.
      if (v_theirs = 0 and v_mine between 1 and v_gap)
         or (v_mine = 0 and v_theirs between 1 and v_gap) then
        raise exception 'sealed_too_close' using
          detail = format('écart de %s avec « %s »', greatest(v_mine, v_theirs), v_other.title);
      end if;
    end loop;
  end if;

  return new;
end $function$;

-- ⚠️ DÉCLENCHEUR DIFFÉRÉ, et ce n'est pas un détail de forme. En `before insert`,
-- il CASSE le parcours `/new?espace=` : `set_poll_audience` insère l'événement
-- enveloppant `status = 'open'` et `secret_ballot = true` AVANT d'insérer les
-- convocations — le public vaut donc 0 à cet instant. Vérifié : la garde
-- immédiate refusait `set_poll_audience` avec « 0 convoqué(s), minimum 5 ».
-- Différée à la validation, elle voit l'état final et ne dépend plus de l'ordre
-- des écritures du appelant.
drop trigger if exists scrutin_events_sealed_guard_t on public.scrutin_events;
create constraint trigger scrutin_events_sealed_guard_t
  after insert or update on public.scrutin_events
  deferrable initially deferred
  for each row execute function public.scrutin_events_sealed_guard();

-- ═══════════════════════════════════ ce qu'on a RENONCÉ à poser, et pourquoi
--
-- Un plancher sur le retrait d'un convoqué (« ne pas tomber sous 5 sur une
-- consultation scellée ouverte ») semblait fermer un contournement en deux
-- gestes : ouvrir à 6, retirer 2.
--
-- Il est ÉCARTÉ, pour deux raisons dont la première est dirimante.
--
-- 1. Il casse le droit à l'effacement. `leave_circle` SUPPRIME la convocation
--    d'un membre qui quitte le cercle quand la consultation n'est pas close
--    (le bulletin scellé, lui, survit — il n'a jamais porté de nom). Un
--    plancher refuserait ce départ. Le droit de partir prime sur un seuil.
--    Vérifié : avec le plancher retiré, un départ fait bien passer une
--    consultation scellée ouverte de 5 à 4 convoqués.
-- 2. Il ne protège rien que le reste ne protège déjà. Le seuil qui compte au
--    dépouillement porte désormais sur les ÉMARGEANTS (correctif 2), pas sur
--    les convoqués : retirer des convoqués après l'ouverture n'abaisse pas le
--    seuil de lecture des résultats.
