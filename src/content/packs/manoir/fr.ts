// PAQUET « LE MANOIR BARNABÉ » — les textes, en fr.
//
// ⚠️ HORS i18n, ET C'EST DÉLIBÉRÉ. Un paquet de scénario est du CONTENU, pas de
// l'interface : ses clés sont lues par une variable (`beat.key`), et le
// contrôle de parité ne voit que les appels écrits en clair. Même choix que les
// fiches méthodes, déjà en production. Le test `packs.test.ts` couvre la parité
// de ces fichiers-là.
//
// Le paquet ne touche à AUCUNE règle et ne sait jamais qui est le Fantôme : il
// pose le décor, et rien d'autre.
export const MANOIR_FR = {
  "name": "Le Manoir Barnabé",
  "tagline": "Le testament d'un oncle disparu en ballon",
  "b1": {
    "title": "21 h 40 — La lecture du testament",
    "body": "Le notaire a posé l'enveloppe sur la table et s'est excusé : il repassera demain. Vous êtes seuls dans le manoir de l'oncle Barnabé, et quelque chose grince à l'étage."
  },
  "b2": {
    "title": "Le manoir vous a entendus",
    "body": "Les portraits ont vacillé tous en même temps. L'oncle Barnabé peignait mal, mais il peignait beaucoup : il y a des yeux dans chaque pièce."
  },
  "b3": {
    "title": "22 h 10 — Les couloirs s'allongent",
    "body": "Quelqu'un jurerait que la bibliothèque était plus près tout à l'heure. Continuez vos rondes : le testament ne se remplit pas tout seul."
  },
  "b4": {
    "title": "Une page manque au registre",
    "body": "Le notaire avait prévenu : le manoir note tout, mais il note ce qu'on lui montre. Ceux qui n'ont croisé aucun portrait n'ont rien fait de mal — ils n'ont simplement rien fait."
  },
  "b5": {
    "title": "22 h 45 — Le vent tourne",
    "body": "Une porte a claqué au fond du couloir, et personne ne s'en est vanté. Il vous reste peu de temps avant que le notaire ne revienne."
  },
  "b6": {
    "title": "Sortez vos appareils",
    "body": "L'oncle Barnabé tenait un album. Il aurait aimé que vous le continuiez — c'est écrit dans le testament, juste avant la clause sur les chats."
  },
  "b7": {
    "title": "23 h 30 — Dernière ronde",
    "body": "Le manoir se tait. C'est maintenant ou jamais : après cette manche, on ferme le registre et on décide."
  },
  "b8": {
    "title": "Minuit",
    "body": "Le notaire frappe à la porte. Quelqu'un, dans cette pièce, a passé la soirée à faire fuir les autres."
  },
  "album": {
    "open": "L'ALBUM DU MANOIR",
    "openHint": "Tenez vos téléphones. On les regarde ensemble, une consigne à la fois.",
    "callOne": "{card}",
    "callTakers": "{n, plural, =0 {personne ne s'y est essayé} one {une personne s'y est essayée} other {# personnes s'y sont essayées}}",
    "raise": "Levez vos écrans !",
    "gone": "Cette photo est repartie avec {name}.",
    "nextCard": "Suivante",
    "skip": "Personne n'a pris celle-ci.",
    "behind": "{name} est passé derrière l'objectif. Si {name} est sur ta photo, ne la lève pas.",
    "erased": "Effacée.",
    "done": "L'album est refermé.",
    "doneHint": "Les photos que le jeu gardait viennent d'être effacées de ce téléphone.",
    "none": "Personne n'a pris de photo cette nuit. On se rappellera quand même de la tête de l'oncle Barnabé."
  }
} as const;
