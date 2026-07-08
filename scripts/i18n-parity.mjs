// Garde-fou i18n : vérifie que TOUS les messages/*.json ont EXACTEMENT le même
// jeu de clés ET les mêmes variables d'interpolation ({name}, {count}, plural…).
// Échoue (exit 1) à la moindre divergence → branché sur `npm run build`.
// Les langues ne doivent différer QUE par les libellés, jamais par la structure.
// Les locales sont auto-découvertes : ajouter messages/<loc>.json suffit à l'inclure.
import { readFileSync, readdirSync } from "fs";

const MSG_DIR = new URL("../messages/", import.meta.url);
const LOCALES = readdirSync(MSG_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.slice(0, -5))
  .sort();

const flatten = (obj, prefix = "", acc = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, acc);
    else acc[key] = v;
  }
  return acc;
};

// Variables d'interpolation RÉELLES d'une valeur ICU. On retire d'abord les
// sous-messages de pluriel/select (`one {votant}`, `other {# adoptées}`…) qui sont
// du texte traduisible — sinon on les confondrait avec des variables — puis on
// extrait les noms d'arguments restants ({name}, {count, plural…}).
const vars = (s) => {
  const cleaned = String(s).replace(/\b(zero|one|two|few|many|other|=\d+)\s*\{[^{}]*\}/g, " ");
  return [...new Set([...cleaned.matchAll(/\{(\w+)/g)].map((m) => m[1]))].sort().join(",");
};

const data = Object.fromEntries(
  LOCALES.map((l) => [
    l,
    flatten(JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf8"))),
  ]),
);

const allKeys = [...new Set(LOCALES.flatMap((l) => Object.keys(data[l])))].sort();
const errors = [];

for (const key of allKeys) {
  const present = LOCALES.filter((l) => key in data[l]);
  for (const l of LOCALES) if (!present.includes(l)) errors.push(`${l.toUpperCase()} manque la clé : ${key}`);
  // Variables identiques entre toutes les langues qui possèdent la clé.
  const ref = vars(data[present[0]][key]);
  for (const l of present.slice(1)) {
    const cur = vars(data[l][key]);
    if (cur !== ref) errors.push(`${key} : variables différentes (${present[0]}=[${ref}] vs ${l}=[${cur}])`);
  }
}

if (errors.length) {
  console.error(`✗ i18n : ${errors.length} problème(s) sur ${allKeys.length} clés\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ i18n : parité OK — ${allKeys.length} clés × ${LOCALES.length} langues (clés + variables alignées)`);
