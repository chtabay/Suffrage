// PAQUET « LE MANOIR BARNABÉ » — les textes, en pcm.
//
// ⚠️ HORS i18n, ET C'EST DÉLIBÉRÉ. Un paquet de scénario est du CONTENU, pas de
// l'interface : ses clés sont lues par une variable (`beat.key`), et le
// contrôle de parité ne voit que les appels écrits en clair. Même choix que les
// fiches méthodes, déjà en production. Le test `packs.test.ts` couvre la parité
// de ces fichiers-là.
//
// Le paquet ne touche à AUCUNE règle et ne sait jamais qui est le Fantôme : il
// pose le décor, et rien d'autre.
export const MANOIR_PCM = {
  "name": "Uncle Barnaby Manor",
  "tagline": "Di will of one uncle wey hot-air balloon carry go",
  "b1": {
    "title": "9:40 p.m. — Dem dey read di will",
    "body": "Di lawyer drop di envelope for table come beg comot: e go pass tomorrow. Na una alone dey inside di manor of Uncle Barnaby, and something dey creak for upstairs."
  },
  "b2": {
    "title": "Di manor don hear una",
    "body": "All di portraits blink for di same time. Uncle Barnaby no sabi paint at all, but e paint plenty: eye dey inside every room."
  },
  "b3": {
    "title": "10:10 p.m. — Di corridors dey stretch",
    "body": "Pesin fit swear say di library bin dey near before. Make una continue una patrol: di will no go write imsef."
  },
  "b4": {
    "title": "One page miss for di register",
    "body": "Di lawyer bin warn una: di manor dey note everything, but na wetin dem show am e dey note. Pesin wey no cross any portrait no do anything bad — na just say dem no do anything."
  },
  "b5": {
    "title": "10:45 p.m. — Di wind don turn",
    "body": "One door slam for di end of di corridor, and nobody brag say na dem. Small time remain before di lawyer go come back."
  },
  "b6": {
    "title": "Bring out una phone",
    "body": "Uncle Barnaby bin dey keep one album. E for like make una continue am — dem write am inside di will, just before di clause about cat."
  },
  "b7": {
    "title": "11:30 p.m. — Last patrol",
    "body": "Di manor don quiet. Na now or never: after dis round, we go close di register come decide."
  },
  "b8": {
    "title": "Midnight",
    "body": "Di lawyer dey knock for door. Somebody inside dis room spend di whole night dey make people run comot."
  },
  "album": {
    "open": "DI ALBUM OF DI MANOR",
    "openHint": "Hold una phone. We go look dem together, one task at a time.",
    "callOne": "{card}",
    "callTakers": "{n, plural, =0 {nobody try am} one {one pesin try am} other {# people try am}}",
    "raise": "Raise una screen!",
    "gone": "Dis photo don comot with {name}.",
    "nextCard": "Next one",
    "skip": "Nobody take dis one.",
    "behind": "{name} bin dey behind di camera. If {name} dey your photo, no raise am.",
    "erased": "Dem don delete am.",
    "done": "Di album don close.",
    "doneHint": "Di photos wey di game bin dey keep, dem don delete dem from dis phone.",
    "none": "Nobody take photo dis night. But we go still remember Uncle Barnaby face."
  }
} as const;
