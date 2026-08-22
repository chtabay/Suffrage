-- LA DERNIÈRE JOURNÉE CLOSE QU'UN JOUEUR A JOUÉE.
--
-- ══ POURQUOI ═══════════════════════════════════════════════════════════════
--
-- Un joueur a demandé : « est-ce qu'on est prévenu une fois la journée
-- terminée ? » La réponse est non, et c'est écrit :
-- il n'en existe aucune aujourd'hui. Le §7 de `docs/regularite-des-joueurs.md` a
-- écarté le RAPPEL quotidien — la permission ne se demande qu'une fois, un rappel
-- est du bruit pour qui a déjà joué, et la charnière de 11 h 30 n'est pas
-- l'horloge du joueur. ⚠️ Le §6, lui, ne dit PAS cela : il garde le push pour
-- les amis. Voir `docs/amis-et-notifications.md`.
--
-- Le jeu doit donc GARDER le résultat arrêté et le rendre quand le joueur
-- revient, quel que soit le jour où il revient. `JourneePrecedente` le faisait
-- déjà, mais sur `jour − 1` EN DUR : celui qui joue lundi et revient jeudi ne
-- voyait jamais comment lundi s'était terminé. Or c'est exactement lui que la
-- question vise — celui qui revient tous les jours, lui, a déjà tout vu.
--
-- ⚠️ « LA DERNIÈRE JOUÉE » NE SUFFIT PAS, IL FAUT « LA DERNIÈRE CLOSE ».
-- `scrutin_banalo_serie` rend déjà `fin`, le plus grand jour joué — mais s'en
-- servir ferait DISPARAÎTRE le bloc pour quelqu'un qui vient de jouer
-- aujourd'hui, alors qu'il avait joué la veille : `fin` vaudrait aujourd'hui, et
-- il n'y a rien à montrer d'une journée encore ouverte. D'où le `p_avant`, et
-- d'où une fonction à part plutôt qu'une clé de plus sur la série.
--
-- ⚠️ ET ELLE NE PEUT PAS DÉSIGNER UNE JOURNÉE PURGÉE. Elle lit les deux tables
-- de réponses, qui s'effacent à trente jours : le jour qu'elle rend a forcément
-- encore ses réponses, donc son état est calculable. Aucune borne d'âge à
-- ajouter — la purge en tient lieu, et une borne écrite en dur ici serait une
-- quatrième copie du 30.
--
-- ⚠️ ELLE NE REND QU'UN NUMÉRO. Pas de score, pas de mot, pas de réponse : le
-- reste passe par `scrutin_banalo_etat` / `scrutin_banalo_mots_etat`, qui savent
-- déjà ce qu'ils ont le droit de rendre et à quel moment.
create or replace function public.scrutin_banalo_derniere(p_jeton text, p_avant int)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare v_jour int;
begin
  -- Un jeton malformé n'est pas une erreur : c'est un navigateur vierge.
  if coalesce(p_jeton, '') !~ '^[a-z0-9]{10,40}$' or coalesce(p_avant, 0) < 2 then
    return jsonb_build_object('jour', null);
  end if;

  -- Les DEUX formats, comme la série : c'est une habitude quotidienne, pas deux
  -- collections séparées. Un joueur dont la dernière journée était chiffrée doit
  -- la retrouver même si les six d'avant étaient des mots.
  select max(j) into v_jour from (
    select max(jour) as j from scrutin_banalo_reponses
     where jeton = p_jeton and jour < p_avant
    union all
    select max(jour) from scrutin_banalo_mots
     where jeton = p_jeton and jour < p_avant
  ) t;

  return jsonb_build_object('jour', v_jour);
end $function$;

-- ⚠️ LE `revoke` VIENT AVANT LE `grant` : PUBLIC détient l'EXECUTE par défaut.
-- Et `anon` en a besoin — tout ceci marche SANS COMPTE, comme la série.
revoke all on function public.scrutin_banalo_derniere(text, int) from public, anon, authenticated;
grant execute on function public.scrutin_banalo_derniere(text, int) to anon, authenticated;
