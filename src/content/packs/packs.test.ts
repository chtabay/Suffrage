// PARITÉ DES PAQUETS — le garde-fou que le contrôle i18n ne peut pas faire.
//
// ⚠️ POURQUOI CE TEST EXISTE. Les textes d'un paquet vivent hors de
// `messages/*.json`, parce que leurs clés sont lues par une VARIABLE
// (`beat.key`) : le contrôle de parité du dépôt ne voit que les appels écrits
// en clair, et une halte manquante en pidgin ne se découvrirait qu'à l'écran,
// en pleine soirée, sous la forme d'un panneau vide. Ces quelques lignes
// tiennent le même rôle pour les paquets.
import assert from "node:assert/strict";
import { test } from "node:test";
import { PACK_KEYS, packTexts } from "./index";

const LOCALES = ["fr", "en", "es", "pcm"] as const;

/** Aplatit un objet en chemins pointés, pour comparer des ensembles de clés. */
function flat(o: unknown, pre = ""): string[] {
  if (typeof o !== "object" || o === null) return [pre];
  return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) =>
    flat(v, pre ? `${pre}.${k}` : k),
  );
}

/** Les variables ICU réellement présentes — pas les mots des branches de pluriel. */
function vars(s: string): string[] {
  return [...new Set([...s.matchAll(/\{\s*([A-Za-z_]\w*)\s*(?:\}|,)/g)].map((m) => m[1]))]
    .filter((v) => !["plural", "select", "selectordinal"].includes(v))
    .sort();
}

for (const pack of PACK_KEYS) {
  const fr = packTexts(pack, "fr") as unknown as Record<string, unknown>;
  const frKeys = flat(fr).sort();

  test(`paquet ${pack} : mêmes clés dans les quatre langues`, () => {
    for (const locale of LOCALES) {
      assert.deepEqual(flat(packTexts(pack, locale)).sort(), frKeys, `clés en ${locale}`);
    }
  });

  test(`paquet ${pack} : mêmes variables ICU dans les quatre langues`, () => {
    const walk = (a: unknown, b: unknown, path: string) => {
      if (typeof a === "string") {
        assert.deepEqual(vars(String(b)), vars(a), `variables de ${path}`);
        return;
      }
      if (typeof a === "object" && a !== null) {
        for (const k of Object.keys(a as Record<string, unknown>)) {
          walk((a as Record<string, unknown>)[k], (b as Record<string, unknown>)?.[k], `${path}.${k}`);
        }
      }
    };
    for (const locale of LOCALES) {
      walk(fr, packTexts(pack, locale) as unknown as Record<string, unknown>, `${pack}/${locale}`);
    }
  });

  test(`paquet ${pack} : aucune valeur vide`, () => {
    const walk = (v: unknown, path: string) => {
      if (typeof v === "string") {
        assert.ok(v.trim().length > 0, `valeur vide : ${path}`);
        return;
      }
      if (typeof v === "object" && v !== null) {
        for (const k of Object.keys(v as Record<string, unknown>)) {
          walk((v as Record<string, unknown>)[k], `${path}.${k}`);
        }
      }
    };
    for (const locale of LOCALES) walk(packTexts(pack, locale), `${pack}/${locale}`);
  });
}
