-- LA BORNE DES ENTRÉES DE JEU S'ASSOUPLIT D'UN CRAN, ET D'UN SEUL.
--
-- Écrite pour Unanimo, elle exigeait un objet PLAT. Alibi a besoin de mettre la
-- liste des trois pièces dans l'énoncé de la manche — une liste de trois chaînes.
-- La borne l'a refusé, bruyamment, dès la première partie de test.
--
-- C'EST EXACTEMENT POUR ÇA QU'ELLE AVAIT ÉTÉ ÉCRITE AINSI. Sa première version
-- REMODELAIT sur une liste blanche de clés, en silence, et jetait l'emoji du
-- thème d'Unanimo sans que rien ne le signale. On l'avait alors changée pour
-- qu'elle REFUSE plutôt qu'elle ne rogne. Un an de dette évitée en une erreur
-- bruyante : quand elle bloque un usage légitime, on le voit tout de suite.
--
-- CE QU'ON GARDE ET POURQUOI. Le vrai risque était le VOLUME arbitraire glissé
-- sous une clé d'apparence anodine, et c'est la borne de 2 ko qui le ferme — la
-- platitude n'en était qu'une seconde ceinture. On autorise donc UN niveau : une
-- valeur peut être un scalaire, ou une liste de scalaires. Un objet imbriqué, ou
-- une liste qui contient autre chose que des scalaires, reste refusé.
create or replace function public.scrutin_game_json_bound(p jsonb, p_what text)
returns jsonb language plpgsql immutable set search_path to 'public' as $function$
begin
  if p is null then return '{}'::jsonb; end if;
  if jsonb_typeof(p) <> 'object' then
    raise exception 'game_% must be an object', p_what;
  end if;
  -- 2 ko : cent fois ce qu'un réglage de jeu ou un énoncé demande. C'est CETTE
  -- borne qui ferme le volume arbitraire.
  if length(p::text) > 2000 then
    raise exception 'game_% too large', p_what;
  end if;
  -- Aucun objet imbriqué.
  if exists (select 1 from jsonb_each(p) where jsonb_typeof(value) = 'object') then
    raise exception 'game_% must not nest objects', p_what;
  end if;
  -- Une liste, oui — mais de scalaires seulement.
  if exists (
    select 1
      from jsonb_each(p) kv
      where jsonb_typeof(kv.value) = 'array'
        and exists (select 1 from jsonb_array_elements(kv.value) el
                     where jsonb_typeof(el) in ('object', 'array'))
  ) then
    raise exception 'game_% lists must hold scalars only', p_what;
  end if;
  return p;
end $function$;

revoke all on function public.scrutin_game_json_bound(jsonb, text) from public, anon, authenticated;
