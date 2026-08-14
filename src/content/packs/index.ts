// LES PAQUETS DE SCÉNARIO — le résolveur.
//
// Un paquet habille le moteur : il rethème les pièces, parfume les consignes et
// pose des HALTES (de courtes annonces qui tombent en plein écran). Il ne
// touche à AUCUNE règle et ne sait jamais qui est le Fantôme — c'est ce qui
// rend le jeu rejouable, et ce qui permet au paquet 2 de coûter une semaine
// plutôt qu'un mois.
//
// ⚠️ CES TEXTES VIVENT HORS i18n, comme les fiches méthodes déjà en production :
// leurs clés sont lues par une variable (`beat.key`), et le contrôle de parité
// ne voit que les appels écrits en clair. `packs.test.ts` couvre leur parité.
//
// Ajouter un paquet = un dossier de quatre fichiers ici + une ligne dans
// `scrutin_game_fantome_packs`. Un VERBE D'EFFET nouveau, en revanche, est du
// travail moteur — c'est la règle qui empêche un paquet de devenir un langage.
import { MANOIR_FR } from "./manoir/fr";
import { MANOIR_EN } from "./manoir/en";
import { MANOIR_ES } from "./manoir/es";
import { MANOIR_PCM } from "./manoir/pcm";

export interface PackBeat {
  title: string;
  body: string;
}

export interface PackTexts {
  name: string;
  tagline: string;
  album: {
    open: string;
    openHint: string;
    callOne: string;
    callTakers: string;
    raise: string;
    gone: string;
    nextCard: string;
    skip: string;
    behind: string;
    erased: string;
    done: string;
    doneHint: string;
    none: string;
  };
  [key: string]: PackBeat | string | PackTexts["album"];
}

const PACKS: Record<string, Record<string, PackTexts>> = {
  manoir: {
    fr: MANOIR_FR as unknown as PackTexts,
    en: MANOIR_EN as unknown as PackTexts,
    es: MANOIR_ES as unknown as PackTexts,
    pcm: MANOIR_PCM as unknown as PackTexts,
  },
};

/** Les textes d'un paquet dans une langue. Repli : le paquet du manoir, en FR. */
export function packTexts(pack: string, locale: string): PackTexts {
  const byLocale = PACKS[pack] ?? PACKS.manoir;
  return byLocale[locale] ?? byLocale.en ?? byLocale.fr;
}

/** Une halte, par sa clé. `null` si le paquet ne la connaît pas. */
export function packBeat(pack: string, locale: string, key: string): PackBeat | null {
  const v = packTexts(pack, locale)[key];
  return v && typeof v === "object" && "title" in v ? (v as PackBeat) : null;
}

export const PACK_KEYS = Object.keys(PACKS);
