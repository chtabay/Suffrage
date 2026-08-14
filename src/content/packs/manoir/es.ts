// PAQUET « LE MANOIR BARNABÉ » — les textes, en es.
//
// ⚠️ HORS i18n, ET C'EST DÉLIBÉRÉ. Un paquet de scénario est du CONTENU, pas de
// l'interface : ses clés sont lues par une variable (`beat.key`), et le
// contrôle de parité ne voit que les appels écrits en clair. Même choix que les
// fiches méthodes, déjà en production. Le test `packs.test.ts` couvre la parité
// de ces fichiers-là.
//
// Le paquet ne touche à AUCUNE règle et ne sait jamais qui est le Fantôme : il
// pose le décor, et rien d'autre.
export const MANOIR_ES = {
  "name": "La Mansión Barnabé",
  "tagline": "El testamento de un tío desaparecido en globo",
  "b1": {
    "title": "21:40 — La lectura del testamento",
    "body": "El notario ha dejado el sobre encima de la mesa y se ha disculpado: volverá mañana. Estáis solos en la mansión del tío Barnabé, y algo cruje en el piso de arriba."
  },
  "b2": {
    "title": "La mansión os ha oído",
    "body": "Los retratos han parpadeado todos a la vez. El tío Barnabé pintaba mal, pero pintaba mucho: hay ojos en cada habitación."
  },
  "b3": {
    "title": "22:10 — Los pasillos se alargan",
    "body": "Alguien juraría que la biblioteca estaba más cerca hace un rato. Seguid con vuestras rondas: el testamento no se rellena solo."
  },
  "b4": {
    "title": "Falta una página en el registro",
    "body": "El notario ya avisó: la mansión lo anota todo, pero anota lo que le enseñan. Quienes no se han puesto ante ningún retrato no han hecho nada malo — simplemente no han hecho nada."
  },
  "b5": {
    "title": "22:45 — Cambia el viento",
    "body": "Una puerta ha dado un portazo al fondo del pasillo, y nadie ha presumido de ello. Os queda poco tiempo antes de que vuelva el notario."
  },
  "b6": {
    "title": "Sacad vuestros aparatos",
    "body": "El tío Barnabé tenía un álbum. Le habría gustado que lo continuarais: está escrito en el testamento, justo antes de la cláusula sobre los gatos."
  },
  "b7": {
    "title": "23:30 — Última ronda",
    "body": "La mansión se calla. Es ahora o nunca: después de esta manga, se cierra el registro y se decide."
  },
  "b8": {
    "title": "Medianoche",
    "body": "El notario llama a la puerta. Alguien, en esta habitación, se ha pasado la noche haciendo huir a los demás."
  },
  "album": {
    "open": "EL ÁLBUM DE LA MANSIÓN",
    "openHint": "Coged vuestros teléfonos. Los miramos juntos, un reto cada vez.",
    "callOne": "{card}",
    "callTakers": "{n, plural, =0 {no lo ha intentado nadie} one {una persona lo ha intentado} other {# personas lo han intentado}}",
    "raise": "¡Levantad vuestras pantallas!",
    "gone": "Esta foto se ha ido con {name}.",
    "nextCard": "Siguiente",
    "skip": "Esta no la ha hecho nadie.",
    "behind": "{name} se ha puesto detrás del objetivo. Si {name} sale en tu foto, no la levantes.",
    "erased": "Borrada.",
    "done": "El álbum queda cerrado.",
    "doneHint": "Las fotos que el juego guardaba acaban de borrarse de este teléfono.",
    "none": "Nadie ha hecho ninguna foto esta noche. Aun así, nos acordaremos de la cara del tío Barnabé."
  }
} as const;
