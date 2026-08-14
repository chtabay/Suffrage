// PAQUET « LE MANOIR BARNABÉ » — les textes, en en.
//
// ⚠️ HORS i18n, ET C'EST DÉLIBÉRÉ. Un paquet de scénario est du CONTENU, pas de
// l'interface : ses clés sont lues par une variable (`beat.key`), et le
// contrôle de parité ne voit que les appels écrits en clair. Même choix que les
// fiches méthodes, déjà en production. Le test `packs.test.ts` couvre la parité
// de ces fichiers-là.
//
// Le paquet ne touche à AUCUNE règle et ne sait jamais qui est le Fantôme : il
// pose le décor, et rien d'autre.
export const MANOIR_EN = {
  "name": "Barnaby Manor",
  "tagline": "The will of an uncle who vanished by balloon",
  "b1": {
    "title": "9.40 pm — The reading of the will",
    "body": "The solicitor laid the envelope on the table and made his excuses: he will come back tomorrow. You are alone in Uncle Barnaby's manor, and something is creaking upstairs."
  },
  "b2": {
    "title": "The manor has heard you",
    "body": "The portraits all flickered at once. Uncle Barnaby painted badly, but he painted a great deal: there are eyes in every room."
  },
  "b3": {
    "title": "10.10 pm — The corridors are getting longer",
    "body": "Someone would swear the library was nearer a moment ago. Keep up your watches: the will does not fill itself in."
  },
  "b4": {
    "title": "A page is missing from the register",
    "body": "The solicitor did warn you: the manor notes everything, but it notes what it is shown. Those who never stood at a portrait have done nothing wrong — they have simply done nothing."
  },
  "b5": {
    "title": "10.45 pm — The wind is turning",
    "body": "A door slammed at the far end of the corridor, and nobody has boasted about it. You have little time left before the solicitor comes back."
  },
  "b6": {
    "title": "Cameras at the ready",
    "body": "Uncle Barnaby kept an album. He would have liked you to carry it on — it is written in the will, just before the clause about the cats."
  },
  "b7": {
    "title": "11.30 pm — Last watch",
    "body": "The manor has gone quiet. It is now or never: after this round we close the register and we decide."
  },
  "b8": {
    "title": "Midnight",
    "body": "The solicitor is knocking at the door. Someone in this room has spent the whole evening sending the others running."
  },
  "album": {
    "open": "THE MANOR ALBUM",
    "openHint": "Hold on to your phones. We look at them together, one dare at a time.",
    "callOne": "{card}",
    "callTakers": "{n, plural, =0 {nobody tried this one} one {one person tried it} other {# people tried it}}",
    "raise": "Raise your screens!",
    "gone": "That photo has left with {name}.",
    "nextCard": "Next",
    "skip": "Nobody took this one.",
    "behind": "{name} was behind the lens. If {name} is in your photo, do not raise it.",
    "erased": "Erased.",
    "done": "The album is closed.",
    "doneHint": "The photos the game was keeping have just been erased from this phone.",
    "none": "Nobody took a photo tonight. We will remember the look on Uncle Barnaby's face all the same."
  }
} as const;
