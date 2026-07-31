-- Cercles — lien vers la conversation de groupe (WhatsApp).
--
-- POURQUOI. Un groupe WhatsApp a un lien d'invitation que son admin génère dans
-- l'app (infos du groupe → Inviter via un lien). Rien à voir avec l'API WhatsApp :
-- pas de compte Meta Business, pas de gabarit approuvé, pas de coût. On stocke
-- l'URL, on affiche un bouton. À noter que l'API officielle ne donne AUCUN accès
-- aux groupes — lire ou publier dans une conversation de groupe est hors de
-- portée, seul ce lien d'invitation l'est.
--
-- LA CONTRAINTE EST LE CŒUR DU SUJET. Ce bouton est lu par les membres comme
-- « notre groupe », donc comme un lien de confiance adossé au nom du cercle. Sans
-- liste blanche d'hôtes, un animateur peut y coller n'importe quelle adresse et
-- hameçonner ses propres membres avec la caution de Placet. La garde vit ICI et
-- pas seulement dans l'interface : une validation côté client se contourne en
-- appelant l'API REST directement.
--
-- Le `/` exigé juste après l'hôte empêche `chat.whatsapp.com.exemple-mechant.fr`
-- de passer, et `https://` en dur écarte les schémas exotiques (javascript:, data:).
--
-- ⚠️ PIÈGE : Postgres plafonne les quantificateurs bornés à 255. Une première
-- version écrite `{1,300}` rendait la regex INVALIDE — la contrainte rejetait donc
-- absolument tout, y compris les liens légitimes. Un test ne vérifiant que les URL
-- à refuser aurait affiché un sans-faute. Vérifié dans LES DEUX SENS : 3 liens
-- valides acceptés, 7 variantes malveillantes refusées.

alter table public.scrutin_spaces
  add column if not exists chat_url text;

alter table public.scrutin_spaces
  drop constraint if exists scrutin_spaces_chat_url_host;
alter table public.scrutin_spaces
  add constraint scrutin_spaces_chat_url_host check (
    chat_url is null
    or chat_url ~ '^https://(chat\.whatsapp\.com|wa\.me)/[^\s]{1,255}$'
  );

comment on column public.scrutin_spaces.chat_url is
  'Lien d''invitation à la conversation de groupe. Hôtes en liste blanche par contrainte CHECK : le bouton porte le nom du cercle, il ne doit pas pouvoir mener ailleurs. Jamais exposé publiquement — get_circle_info ne le renvoie pas, seuls les membres confirmés le voient via get_member_home.';

-- Le lien n'est servi qu'aux membres CONFIRMÉS. Il n'apparaît pas dans
-- get_circle_info : la page d'adhésion est publique, or un lien d'invitation
-- WhatsApp est un droit d'entrée au porteur — qui l'a, entre. Vérifié en `anon` :
-- la vitrine rend le nom, le pitch et l'engagement, jamais chat_url.
create or replace function public.get_member_home(p_token text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare m scrutin_members; s scrutin_spaces;
begin
  select * into m from scrutin_members where token = p_token;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  select * into s from scrutin_spaces where id = m.space_id;
  if not found then return jsonb_build_object('status', 'invalid'); end if;

  return jsonb_build_object(
    'status', 'ok', 'circle', s.name, 'pitch', s.pitch,
    'solicit_per_day', s.solicit_per_day,
    'chat_url', s.chat_url,
    'name', m.name, 'email', m.email,
    'self_joined', m.self_joined, 'consent_at', m.consent_at,
    'consultations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', e.title, 'status', e.status, 'secret_ballot', e.secret_ballot,
        'closes_at', e.closes_at,
        'token', em.token,
        'voted', case when e.secret_ballot
                   then exists (select 1 from scrutin_event_signins g
                                 join scrutin_polls p on p.id = g.poll_id
                                where p.event_id = e.id and g.event_member_id = em.id)
                   else exists (select 1 from scrutin_ballots b
                                 join scrutin_polls p on p.id = b.poll_id
                                where p.event_id = e.id and b.event_member_id = em.id)
                 end
      ) order by e.created_at desc)
      from scrutin_event_members em
      join scrutin_events e on e.id = em.event_id
      where em.member_id = m.id
    ), '[]'::jsonb)
  );
end $function$;

grant execute on function public.get_member_home(text) to anon, authenticated;
