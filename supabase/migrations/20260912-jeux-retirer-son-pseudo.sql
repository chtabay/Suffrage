-- RETIRER SON PSEUDO — la sortie qui n'existait pas.
--
-- ⚠️ LE PSEUDO DE COMPTE EST LE SEUL NOM DU PRODUIT QUI SURVIT À UNE JOURNÉE, et
-- jusqu'ici on ne pouvait QUE le poser. `scrutin_jeux_pseudo_poser` refuse moins
-- de deux caractères, donc l'effacer était impossible ; seule la Régie pouvait
-- le retirer, en posant `bloque_le`. Un joueur qui ne voulait plus figurer aux
-- classements publics n'avait aucun geste à faire. C'est la contrepartie qui
-- manquait à la ligne franchie le 25/08 (« un compte derrière chaque nom, et une
-- prise dans la Régie ») : la prise du modérateur existait, celle du joueur non.
--
-- ⚠️ ON SUPPRIME LA LIGNE, ON NE POSE PAS `bloque_le`. Ce champ dit « un
-- modérateur a retiré ce nom » — l'écran le raconte dans cette voix-là, et
-- reposer un pseudo lève le blocage. Confondre « je me retire » et « on m'a
-- retiré » ferait lire une sanction à quelqu'un qui vient de cliquer.
--
-- ⚠️ ET LES LIGNES DE TABLEAU DU JOUR PARTENT AVEC, ce qui n'est pas du zèle :
-- `scrutin_jeux_pseudo_resoudre` et les deux fonctions de tableau résolvent le
-- nom par `coalesce(p.pseudo, n.nom)` AVEC UNE JOINTURE SANS CONDITION — c'est
-- écrit, et c'est ce qui empêche un compte bloqué de retomber sur son ancien
-- texte libre. Supprimer la ligne de pseudo rend cette jointure vide : sans le
-- ménage ci-dessous, une ligne héritée republierait le texte libre qu'on vient
-- de retirer. Mesuré avant d'écrire : `scrutin_banalo_noms` porte AUJOURD'HUI
-- 0 ligne de texte libre et plus rien ne peut en créer (le dépôt insère
-- `nom = null` depuis le 07/09) — la garde est donc théorique, mais la colonne
-- existe encore et le prochain agent ne doit pas avoir à refaire ce calcul.
--
-- ⚠️ CE N'EST PAS UNE SUPPRESSION DE COMPTE. Les résultats restent, la série
-- reste, l'historique reste : ce qui part est le NOM PUBLIC. Le joueur continue
-- de jouer, de voir son rang et son centile — exactement ce qu'on écrit déjà
-- d'un pseudo bloqué (« on bloque un NOM, pas un joueur »).
--
-- ⚠️ CE QUI TOMBE AVEC, ET QU'IL FAUT SAVOIR : le classement de saison joint
-- `scrutin_jeux_pseudos`, donc on en disparaît ; le palmarès gelé aussi, puisque
-- « le pseudo n'est pas gelé avec la médaille » — un podium peut déjà montrer 1ᵉ
-- et 3ᵉ sans 2ᵉ, c'est écrit et assumé. Et la pastille de la barre se tait, elle
-- ne rend rien sans pseudo.
--
-- ⚠️ ON NE TOUCHE PAS AUX TABLÉES. Un groupe est une appartenance, pas une
-- publication : en sortir est un autre geste que retirer son nom. Le membre y
-- reste, sans libellé — et l'écran a désormais un mot pour ça, faute de quoi il
-- imprimerait une ligne vide.
create or replace function public.scrutin_jeux_pseudo_retirer()
returns jsonb language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_n int;
begin
  if v_uid is null then
    return jsonb_build_object('status', 'compte');
  end if;

  -- Le ménage AVANT la suppression du pseudo : voir l'en-tête. Les deux tables
  -- sont celles des tableaux du jour, l'une par jeu.
  delete from scrutin_banalo_noms where user_id = v_uid;
  delete from scrutin_game_pays_noms where user_id = v_uid;

  delete from scrutin_jeux_pseudos where user_id = v_uid;
  get diagnostics v_n = row_count;

  -- « aucun » n'est pas une erreur : c'est la réponse à qui n'en avait pas. Le
  -- replier sur « ok » ferait dire à l'écran qu'il vient de retirer quelque
  -- chose qui n'existait pas.
  return jsonb_build_object('status', case when v_n > 0 then 'ok' else 'aucun' end);
end $function$;

-- ⚠️ Le `revoke` vient AVANT le `grant`, et il NOMME `anon` : Supabase pose des
-- privilèges par défaut sur les fonctions du schéma public. Ici `anon` n'a de
-- toute façon rien à retirer — la fonction rend « compte » sans `auth.uid()` —
-- mais on ne laisse pas un droit d'exécution traîner sur une fonction qui
-- supprime des lignes.
revoke all on function public.scrutin_jeux_pseudo_retirer() from public, anon, authenticated;
grant execute on function public.scrutin_jeux_pseudo_retirer() to authenticated;
